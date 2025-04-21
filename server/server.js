const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const multer = require('multer');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const ytdl = require('ytdl-core');
const axios = require('axios');
const { YoutubeTranscript } = require('youtube-transcript');
const pdfParse = require('pdf-parse');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({ storage, limits: { fileSize: 50 * 1024 * 1024 } });

// Initialize with multiple API keys if available for rotation
let geminiApiKeys = (process.env.GEMINI_API_KEYS || process.env.GEMINI_API_KEY || 'YOUR_API_KEY_HERE').split(',');
let currentKeyIndex = 0;

// Initialize Gemini with first key
let genAI = new GoogleGenerativeAI(geminiApiKeys[0]);

// For tracking rate limits
const rateLimitTracker = {
  lastError: null,
  errorCount: 0,
  cooldownUntil: null,
  currentModel: "gemini-1.5-pro"
};

// Function to rotate API keys
function rotateApiKey() {
  currentKeyIndex = (currentKeyIndex + 1) % geminiApiKeys.length;
  genAI = new GoogleGenerativeAI(geminiApiKeys[currentKeyIndex]);
  console.log(`Rotated to API key ${currentKeyIndex + 1}/${geminiApiKeys.length}`);
  return currentKeyIndex;
}

// Extract YouTube video ID
function extractYoutubeVideoId(url) {
  const patterns = [
    /(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  
  return null;
}

// Get YouTube video details
async function getYoutubeVideoDetails(videoId) {
  try {
    const info = await ytdl.getInfo(videoId);
    return {
      title: info.videoDetails.title,
      author: info.videoDetails.author.name,
      lengthSeconds: parseInt(info.videoDetails.lengthSeconds) || 0,
      description: info.videoDetails.description
    };
  } catch (error) {
    console.log(`ytdl error: ${error.message}`);
    
    try {
      // Fallback to HTTP request
      const response = await axios.get(`https://www.youtube.com/watch?v=${videoId}`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });
      
      const html = response.data;
      const titleMatch = html.match(/<title>(.*?)<\/title>/);
      const title = titleMatch ? titleMatch[1].replace(' - YouTube', '') : 'Unknown Title';
      
      return {
        title,
        author: 'Unknown Author',
        lengthSeconds: 0,
        description: 'Description unavailable'
      };
    } catch (httpError) {
      return {
        title: `YouTube Video (ID: ${videoId})`,
        author: 'Unknown Author',
        lengthSeconds: 0,
        description: 'Description unavailable'
      };
    }
  }
}

// Get YouTube transcript
async function getYoutubeTranscript(videoId) {
  try {
    const transcriptItems = await YoutubeTranscript.fetchTranscript(videoId);
    
    if (transcriptItems && transcriptItems.length > 0) {
      return transcriptItems.map(item => item.text).join(' ');
    }
  } catch (error) {
    console.log(`Transcript API error: ${error.message}`);
  }
  
  try {
    // Second method using ytdl
    const info = await ytdl.getInfo(videoId);
    const captionTracks = info.player_response.captions?.playerCaptionsTracklistRenderer?.captionTracks;
    
    if (captionTracks && captionTracks.length > 0) {
      const englishTrack = captionTracks.find(track => 
        track.languageCode === 'en' || 
        track.name?.simpleText?.toLowerCase().includes('english')
      );
      
      const trackToUse = englishTrack || captionTracks[0];
      
      const response = await axios.get(trackToUse.baseUrl);
      const xmlContent = response.data;
      
      const textMatches = xmlContent.match(/<text[^>]*>(.*?)<\/text>/g);
      if (textMatches && textMatches.length > 0) {
        return textMatches
          .map(match => {
            const content = match.replace(/<[^>]+>/g, '');
            return content.replace(/&amp;/g, '&')
                         .replace(/&lt;/g, '<')
                         .replace(/&gt;/g, '>')
                         .replace(/&quot;/g, '"')
                         .replace(/&#39;/g, "'");
          })
          .join(' ');
      }
    }
  } catch (error) {
    console.log(`ytdl captions error: ${error.message}`);
  }
  
  // Fallback to video details
  try {
    const videoDetails = await getYoutubeVideoDetails(videoId);
    return `VIDEO METADATA (transcript unavailable):
Title: ${videoDetails.title}
Channel: ${videoDetails.author}
Description: ${videoDetails.description}

Note: This is metadata only. No transcript was available for this video.`;
  } catch (error) {
    return "TRANSCRIPT NOT AVAILABLE. Could not retrieve transcript for this video.";
  }
}

// Simple text summarization without AI (fallback method)
function createBasicSummary(text, type) {
  // Extract metadata if available
  let title = "Content Summary";
  const titleMatch = text.match(/Title:\s*([^\n]+)/);
  if (titleMatch) {
    title = titleMatch[1];
  }
  
  // For very short content, just return it
  if (text.length < 1000) {
    return `# ${title}\n\n${text}\n\n_Note: This content was short enough to present in full._`;
  }
  
  // For longer content, extract sentences and key points
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [];
  
  // Simple extraction of beginning, some middle, and end
  const beginning = sentences.slice(0, 3).join(' ');
  
  const middleStart = Math.floor(sentences.length / 2) - 1;
  const middle = sentences.slice(middleStart, middleStart + 3).join(' ');
  
  const end = sentences.slice(-3).join(' ');
  
  // Extract key phrases based on type
  let keyPoints = [];
  
  if (type === "lecture") {
    const possiblePoints = text.match(/important|key point|remember|note that|significant|crucial|essential|fundamental|critical|main concept/gi);
    if (possiblePoints && possiblePoints.length > 0) {
      keyPoints = [...new Set(possiblePoints)].slice(0, 5);
    }
  }
  
  return `# ${title} - Basic Summary

## Overview
This is a basic extractive summary created without AI due to API limitations.

## Beginning
${beginning}

## Middle Section
${middle}

## Ending
${end}

${keyPoints.length > 0 ? `## Possible Key Points\n- ${keyPoints.join('\n- ')}` : ''}

## Full Content Length
The original content is ${text.length} characters long.

_Note: This is a basic extraction summary created when AI summarization was unavailable. For better results, try again later or with a different API key._`;
}

// Summarize with Gemini or fallback to basic summary
async function summarizeWithGemini(text, type, isVideoMetadataOnly = false) {
  // Check for rate limit cooldown
  if (rateLimitTracker.cooldownUntil && new Date() < rateLimitTracker.cooldownUntil) {
    console.log(`In cooldown period until ${rateLimitTracker.cooldownUntil.toISOString()}`);
    return createBasicSummary(text, type);
  }
  
  // Handle very short content without API call
  if (text.length < 200) {
    return `# Quick Summary\n\n${text}\n\n_Note: This content was very brief, so it's presented in full._`;
  }
  
  // For rate-limited Gemini API, make shorter/fewer calls
  const MAX_RETRIES = geminiApiKeys.length > 1 ? geminiApiKeys.length : 2;
  
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(`Summarization attempt ${attempt}/${MAX_RETRIES} using key ${currentKeyIndex + 1}/${geminiApiKeys.length}`);

      // Make the prompt more concise to reduce token usage
      let prompt;
      
      if (type === "lecture") {
        if (isVideoMetadataOnly) {
          prompt = `Summarize this video metadata:\n${text}\n\nCreate a brief summary of what this video appears to be about.`;
        } else {
          prompt = `Summarize this lecture concisely:\n${text}\n\nCreate a structured summary with the main points and key concepts. Bold important terms with ** **.`;
        }
      } else if (type === "book") {
        prompt = `Summarize this book content briefly:\n${text}\n\nInclude main themes and key points.`;
      } else if (type === "notes") {
        prompt = `Organize these notes concisely:\n${text}\n\nCreate a clear structure with the main points.`;
      }
      
      // Use a more conservative model if facing rate limits
      const modelName = rateLimitTracker.errorCount > 2 ? "gemini-1.0-pro" : "gemini-1.5-pro";
      rateLimitTracker.currentModel = modelName;
      
      const model = genAI.getGenerativeModel({ model: modelName });
      
      // FIXED APPROACH: Use startChat() instead of direct generateContent for more consistent results
      // This avoids the data field vs text field issue
      const chat = model.startChat({
        generationConfig: {
          temperature: 0.4,
          maxOutputTokens: 2048,
        }
      });

      const result = await chat.sendMessage(prompt);
      
      // Reset rate limit tracking on success
      rateLimitTracker.errorCount = 0;
      rateLimitTracker.cooldownUntil = null;
      
      const responseText = result.response.text();
      console.log(`Generated response: ${responseText.length} chars`);
      
      // Format response
      if (isVideoMetadataOnly) {
        return `# Summary Based on Limited Metadata\n\n_Note: This summary was created using only the video's metadata, as a transcript was unavailable._\n\n${responseText}`;
      }
      
      return responseText;
    } catch (error) {
      console.error(`API error: ${error.message}`);
      
      // Check for rate limit errors
      if (error.message.includes("429") || error.message.includes("quota") || 
          error.message.includes("rate limit") || error.message.includes("exceeded")) {
        
        rateLimitTracker.lastError = error.message;
        rateLimitTracker.errorCount++;
        
        // If we have multiple API keys, rotate to the next one
        if (geminiApiKeys.length > 1) {
          rotateApiKey();
          // Brief delay before retrying with new key
          await new Promise(resolve => setTimeout(resolve, 500));
          continue;
        } else {
          // Set a cooldown period if we keep hitting rate limits
          const cooldownMinutes = Math.min(30, Math.pow(2, rateLimitTracker.errorCount - 1));
          rateLimitTracker.cooldownUntil = new Date(Date.now() + cooldownMinutes * 60 * 1000);
          console.log(`Setting API cooldown for ${cooldownMinutes} minutes until ${rateLimitTracker.cooldownUntil.toISOString()}`);
          
          // Return basic summary as fallback
          return createBasicSummary(text, type);
        }
      }
      
      // For other errors, try one more attempt with rotated key if available
      if (attempt < MAX_RETRIES && geminiApiKeys.length > 1) {
        rotateApiKey();
        await new Promise(resolve => setTimeout(resolve, 1000)); 
      }
    }
  }
  
  // If all attempts fail, return basic summary
  return createBasicSummary(text, type);
}

// Handle YouTube videos
app.post('/api/summarize/youtube', async (req, res) => {
  try {
    const { url } = req.body;
    
    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }
    
    const videoId = extractYoutubeVideoId(url);
    if (!videoId) {
      return res.status(400).json({ error: 'Invalid YouTube URL' });
    }
    
    console.log(`Processing YouTube video: ${videoId}`);
    
    // Get video details and transcript
    let videoDetails, transcript;
    
    try {
      [videoDetails, transcript] = await Promise.all([
        getYoutubeVideoDetails(videoId),
        getYoutubeTranscript(videoId)
      ]);
    } catch (error) {
      console.error(`Error fetching video data: ${error.message}`);
      return res.status(500).json({ error: 'Failed to fetch video data' });
    }
    
    // Combine metadata with transcript
    const content = `Title: ${videoDetails.title}
Author: ${videoDetails.author}
Duration: ${Math.floor(videoDetails.lengthSeconds / 60)} minutes ${videoDetails.lengthSeconds % 60} seconds

${transcript.includes("TRANSCRIPT NOT AVAILABLE") || transcript.includes("VIDEO METADATA") ? transcript : "Transcript:\n" + transcript}`;
    
    const isMetadataOnly = transcript.includes("TRANSCRIPT NOT AVAILABLE") || transcript.includes("VIDEO METADATA");
    
    // For short videos (shorter than 10 minutes), we can generate a summary quickly
    const isShortVideo = videoDetails.lengthSeconds < 600; // 10 minutes
    
    // Try to get a summary
    const summary = await summarizeWithGemini(content, 'lecture', isMetadataOnly);
    
    return res.json({ 
      success: true, 
      summary,
      title: videoDetails.title,
      author: videoDetails.author,
      duration: videoDetails.lengthSeconds
    });
  } catch (error) {
    console.error(`YouTube summarization error: ${error.message}`);
    return res.status(500).json({ 
      error: 'Failed to summarize YouTube video',
      message: error.message
    });
  }
});

// Handle URL summarization
app.post('/api/summarize/url', async (req, res) => {
  try {
    const { url, type } = req.body;
    
    if (!url || !type) {
      return res.status(400).json({ error: 'URL and type are required' });
    }
    
    const videoId = extractYoutubeVideoId(url);
    
    if (videoId) {
      try {
        console.log(`Processing YouTube URL: ${videoId}`);
        
        // Get video details and transcript
        let videoDetails, transcript;
        
        try {
          [videoDetails, transcript] = await Promise.all([
            getYoutubeVideoDetails(videoId),
            getYoutubeTranscript(videoId)
          ]);
        } catch (error) {
          videoDetails = {
            title: 'Unknown Title',
            author: 'Unknown Author',
            lengthSeconds: 0,
            description: 'Description unavailable'
          };
          transcript = "Unable to retrieve transcript for this video.";
        }
        
        // Combine metadata with transcript
        const contentWithContext = `Title: ${videoDetails.title}
Author: ${videoDetails.author}
Duration: ${Math.floor(videoDetails.lengthSeconds / 60)} minutes ${videoDetails.lengthSeconds % 60} seconds

${transcript.includes("TRANSCRIPT NOT AVAILABLE") || transcript.includes("VIDEO METADATA") ? transcript : "Transcript:\n" + transcript}`;
        
        const isMetadataOnly = transcript.includes("TRANSCRIPT NOT AVAILABLE") || transcript.includes("VIDEO METADATA");
        
        // Generate summary
        const summary = await summarizeWithGemini(contentWithContext, type, isMetadataOnly);
        
        return res.json({ summary, title: videoDetails.title });
      } catch (error) {
        console.error(`YouTube processing error: ${error.message}`);
        return res.status(500).json({ 
          error: `Failed to process YouTube video: ${error.message}`,
          summary: "Could not process this YouTube video. Please try another video or contact support."
        });
      }
    } else {
      // Handle non-YouTube URLs
      try {
        const response = await axios.get(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
          },
          timeout: 10000
        });
        
        const htmlContent = response.data.toString();
        
        // Extract text content from HTML
        const content = htmlContent
          .replace(/<head>[\s\S]*?<\/head>/gi, '')
          .replace(/<nav[\s\S]*?<\/nav>/gi, '')
          .replace(/<script[\s\S]*?<\/script>/gi, '')
          .replace(/<style[\s\S]*?<\/style>/gi, '')
          .replace(/<[^>]*>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
        
        // Limit content length for processing
        const trimmedContent = content.length > 15000 ? 
          content.substring(0, 15000) + '... (content truncated for processing)' :
          content;
        
        const summary = await summarizeWithGemini(`URL: ${url}\n\n${trimmedContent}`, type);
        return res.json({ summary });
      } catch (fetchError) {
        const summary = await summarizeWithGemini(`URL: ${url}\n\nCould not fetch content from this URL.`, type);
        return res.json({ summary });
      }
    }
  } catch (error) {
    console.error(`URL summarization error: ${error.message}`);
    return res.status(500).json({ 
      error: 'Failed to process URL',
      summary: "Error processing this URL. Please try again or use a different method."
    });
  }
});

// Handle file uploads
app.post('/api/summarize/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    const { type } = req.body;
    
    if (!type) {
      return res.status(400).json({ error: 'Type is required' });
    }
    
    const filePath = req.file.path;
    const mimeType = req.file.mimetype;
    
    let content = '';
    
    if (mimeType === 'application/pdf') {
      try {
        const dataBuffer = fs.readFileSync(filePath);
        const data = await pdfParse(dataBuffer);
        content = data.text;
        content = `Title: ${req.file.originalname}\n\n${content}`;
      } catch (error) {
        fs.unlinkSync(filePath);
        return res.status(500).json({ error: 'Failed to process PDF file' });
      }
    } else {
      try {
        content = fs.readFileSync(filePath, 'utf8');
        content = `Title: ${req.file.originalname}\n\n${content}`;
      } catch (error) {
        fs.unlinkSync(filePath);
        return res.status(500).json({ error: 'Failed to read file content' });
      }
    }
    
    // Limit content size
    if (content.length > 20000) {
      content = content.substring(0, 20000) + "... (content truncated for processing)";
    }
    
    const summary = await summarizeWithGemini(content, type);
    
    fs.unlinkSync(filePath);
    
    return res.json({ summary });
  } catch (error) {
    console.error(`Upload processing error: ${error.message}`);
    return res.status(500).json({ error: 'Failed to process upload' });
  }
});

// Handle text summarization
app.post('/api/summarize/text', async (req, res) => {
  try {
    const { text, type } = req.body;
    
    if (!text || !type) {
      return res.status(400).json({ error: 'Text and type are required' });
    }
    
    // Limit text size
    const limitedText = text.length > 15000 ? 
      text.substring(0, 15000) + "... (content truncated for processing)" : 
      text;
    
    const summary = await summarizeWithGemini(limitedText, type);
    
    return res.json({ summary });
  } catch (error) {
    console.error(`Text summarization error: ${error.message}`);
    return res.status(500).json({ error: 'Failed to summarize text' });
  }
});

// Handle chat
app.post('/api/chat', async (req, res) => {
  try {
    const { message, contentType, history } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }
    
    // For short messages, just return a simple response if we're in cooldown
    if (rateLimitTracker.cooldownUntil && new Date() < rateLimitTracker.cooldownUntil && message.length < 200) {
      return res.json({ 
        response: "I'm currently operating with limited capabilities due to API rate limits. I can help with basic questions, but for complex processing or summarization, please try again later."
      });
    }
    
    // Check if this is a direct summarization request
    if ((message.toLowerCase().includes('summarize') || message.toLowerCase().includes('summary')) && message.length > 200) {
      try {
        const summary = await summarizeWithGemini(message, contentType || "text");
        return res.json({ response: summary });
      } catch (error) {
        console.error(`Chat summarization error: ${error.message}`);
        // Continue with normal chat if summarization fails
      }
    }
    
    // Get previous summaries from chat history
    const summaries = history.filter(msg => 
      msg.role === 'assistant' && 
      msg.content && 
      msg.content.length > 100
    );
    
    // If no summary and long message, treat as summarization
    if (summaries.length === 0 && message.length > 500) {
      try {
        const summary = await summarizeWithGemini(message, "text");
        return res.json({ response: summary });
      } catch (error) {
        console.error(`Chat summarization error: ${error.message}`);
        return res.json({ 
          response: "I couldn't generate a summary for your text due to technical limitations. Could you try sharing a shorter piece of content or try again later?"
        });
      }
    }
    
    // If no summary history, inform the user
    if (summaries.length === 0) {
      return res.json({ 
        response: "I don't have any previous summary to reference. Would you like me to summarize some content for you? You can share a YouTube link, upload a document, or paste text to summarize."
      });
    }
    
    // If we're in API cooldown, provide a simple response
    if (rateLimitTracker.cooldownUntil && new Date() < rateLimitTracker.cooldownUntil) {
      return res.json({ 
        response: "I'm currently operating with limited capabilities due to API rate limits. I can see you've shared content that I've summarized before. If you have questions about that content, please keep them simple and specific, or try again later when full service is restored."
      });
    }
    
    try {
      // Format chat history for the model
      const latestSummary = summaries[summaries.length - 1].content;
      
      // Create a simplified prompt instead of using the full chat history
      const prompt = `Based on this summary: "${latestSummary.substring(0, 1000)}...", 
      answer this question: "${message}"
      
      Only use information from the summary. If the answer isn't in the summary, say so.`;
      
      // Use a more conservative model if facing rate limits
      const modelName = rateLimitTracker.errorCount > 2 ? "gemini-1.0-pro" : "gemini-1.5-pro";
      
      const model = genAI.getGenerativeModel({ model: modelName });
      
      // FIX: Use chat interface instead of direct content generation
      const chat = model.startChat({
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1024,
        }
      });
      
      const result = await chat.sendMessage(prompt);
      const responseText = result.response.text();
      
      // Reset rate limit tracking on success
      rateLimitTracker.errorCount = 0;
      rateLimitTracker.cooldownUntil = null;
      
      return res.json({ response: responseText });
    } catch (error) {
      console.error(`Chat error: ${error.message}`);
      
      // Check for rate limit errors
      if (error.message.includes("429") || error.message.includes("quota") || 
          error.message.includes("rate limit") || error.message.includes("exceeded")) {
        
        rateLimitTracker.lastError = error.message;
        rateLimitTracker.errorCount++;
        
        // If we have multiple API keys, try a different one
        if (geminiApiKeys.length > 1) {
          rotateApiKey();
          
          // Simple response without API call
          return res.json({ 
            response: "I encountered a temporary issue. Let me try to answer based on what I recall: " +
                     "The summary you're asking about covered key points about " + 
                     (contentType === "lecture" ? "a lecture" : contentType === "book" ? "a book" : "some content") + 
                     ". Could you ask a more specific question about a particular aspect of it?"
          });
        } else {
          // Set a cooldown period
          const cooldownMinutes = Math.min(30, Math.pow(2, rateLimitTracker.errorCount - 1));
          rateLimitTracker.cooldownUntil = new Date(Date.now() + cooldownMinutes * 60 * 1000);
          
          return res.json({ 
            response: "I'm currently experiencing technical limitations due to API usage limits. " +
                     "I can help with basic questions, but for more complex processing, please try again later. " +
                     "If you have a specific question about the content I summarized earlier, please make it as clear and direct as possible."
          });
        }
      }
      
      // For other errors, provide a fallback response
      return res.json({ 
        response: "I'm having trouble processing your question right now. Could you try asking in a different way or try again later?"
      });
    }
  } catch (error) {
    console.error(`Chat error: ${error.message}`);
    return res.json({ 
      response: "Sorry, I encountered an error while processing your message. Please try again later."
    });
  }
});

// Direct chat summarization endpoint
app.post('/api/chat/summarize', async (req, res) => {
  try {
    const { text, type = 'text' } = req.body;
    
    if (!text) {
      return res.status(400).json({ 
        error: 'Text is required',
        response: "Please provide some text for me to summarize."
      });
    }
    
    // If we're in API cooldown, use the basic summarizer
    if (rateLimitTracker.cooldownUntil && new Date() < rateLimitTracker.cooldownUntil) {
      const basicSummary = createBasicSummary(text, type);
      return res.json({ 
        success: true,
        response: basicSummary
      });
    }
    
    // Limit text size
    const limitedText = text.length > 15000 ? 
      text.substring(0, 15000) + "... (content truncated for processing)" : 
      text;
    
    const summary = await summarizeWithGemini(limitedText, type);
    
    return res.json({ 
      success: true,
      response: summary
    });
  } catch (error) {
    console.error(`Direct chat summarization error: ${error.message}`);
    
    // Provide a fallback summary
    const basicSummary = createBasicSummary(text.substring(0, 10000), type);
    
    return res.json({ 
      success: true,
      response: basicSummary
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    rateLimiting: {
      inCooldown: rateLimitTracker.cooldownUntil ? true : false,
      cooldownUntil: rateLimitTracker.cooldownUntil,
      currentModel: rateLimitTracker.currentModel,
      errorCount: rateLimitTracker.errorCount
    }
  });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
