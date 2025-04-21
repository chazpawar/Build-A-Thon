'use client';

import { useState, useRef, useEffect } from 'react';
import { ScrollArea } from './ui/scroll-area';
import { Button } from './ui/button';
import { SendIcon, AlertCircleIcon, LoaderIcon, UploadIcon, LinkIcon, FileTextIcon, BookIcon, VideoIcon, YoutubeIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

// Function to format message content
function formatMessageContent(content) {
  if (!content) return '';
  
  // Check if this is an error message
  const isErrorMessage = typeof content === 'string' && content.startsWith('Error:');
  
  if (isErrorMessage) {
    return `<div class="error-message">
      <div class="error-icon">❌</div>
      <div class="error-content">${content.replace('Error:', '<strong>Error:</strong>')}</div>
    </div>`;
  }
  
  // Check if this is a failed transcript message with placeholder text
  const isFailedTranscript = typeof content === 'string' && 
    content.includes('Unable to retrieve the transcript for this video automatically');
  
  if (isFailedTranscript) {
    return `<div class="transcript-error">
      <div class="error-icon">⚠️</div>
      <div class="error-title"><strong>Transcript Retrieval Failed</strong></div>
      <div class="error-content">${content}</div>
      <div class="error-actions">
        <p class="error-tip">Tip: Try uploading a video file instead or providing text directly.</p>
      </div>
    </div>`;
  }
  
  // Replace YouTube metadata with formatted version
  let formattedContent = content;
  
  // Check if this is a YouTube summary (has Title, Author, etc.)
  const isYouTubeSummary = content.includes('Title:') && content.includes('Author:') && content.includes('Duration:');
  
  if (isYouTubeSummary) {
    // Extract and format the metadata
    const titleMatch = content.match(/Title: (.*?)(?:\n|$)/);
    const authorMatch = content.match(/Author: (.*?)(?:\n|$)/);
    const durationMatch = content.match(/Duration: (.*?)(?:\n|$)/);
    
    // Remove the metadata from the main content
    let mainContent = content.replace(/Title:.*\n/, '')
                           .replace(/Author:.*\n/, '')
                           .replace(/Duration:.*\n/, '')
                           .replace(/Transcript:\n/, '');
    
    // Create formatted HTML
    formattedContent = `<div class="youtube-summary">
      ${titleMatch ? `<div class="youtube-title"><strong>${titleMatch[1]}</strong></div>` : ''}
      ${authorMatch ? `<div class="youtube-author">By ${authorMatch[1]}</div>` : ''}
      ${durationMatch ? `<div class="youtube-duration">${durationMatch[1]}</div>` : ''}
      <div class="youtube-content">${mainContent}</div>
    </div>`;
  }
  
  // Handle Markdown-like formatting
  
  // Preserve code blocks before other processing
  const codeBlocks = [];
  formattedContent = formattedContent.replace(/```([\s\S]*?)```/g, (match) => {
    const index = codeBlocks.length;
    codeBlocks.push(match);
    return `__CODE_BLOCK_${index}__`;
  });
  
  // Bold text
  formattedContent = formattedContent.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  
  // Italic text
  formattedContent = formattedContent.replace(/\*(.*?)\*/g, '<em>$1</em>');
  
  // Headers
  formattedContent = formattedContent.replace(/^# (.*?)$/gm, '<h1 class="text-2xl font-bold my-4">$1</h1>');
  formattedContent = formattedContent.replace(/^## (.*?)$/gm, '<h2 class="text-xl font-bold my-3">$1</h2>');
  formattedContent = formattedContent.replace(/^### (.*?)$/gm, '<h3 class="text-lg font-bold my-2">$1</h3>');
  formattedContent = formattedContent.replace(/^#### (.*?)$/gm, '<h4 class="text-md font-bold my-2">$1</h4>');
  
  // Paragraphs - ensure proper spacing between paragraphs
  formattedContent = formattedContent.replace(/\n\n((?!<h|<ul|<ol|<li|<blockquote|<pre|<div).+?)\n\n/gs, '<p class="my-3">$1</p>');
  
  // Lists - wrap in proper list containers
  let hasUnorderedList = formattedContent.match(/^- (.*?)$/gm);
  let hasOrderedList = formattedContent.match(/^[0-9]+\. (.*?)$/gm);
  
  if (hasUnorderedList) {
    // Process unordered lists - first collect all consecutive items
    formattedContent = formattedContent.replace(
      /(^- .*?$(\n^- .*?$)*)/gm, 
      '<ul class="list-disc pl-6 my-3">$1</ul>'
    );
    // Then format individual items
    formattedContent = formattedContent.replace(/^- (.*?)$/gm, '<li class="my-1">$1</li>');
  }
  
  if (hasOrderedList) {
    // Process ordered lists - first collect all consecutive items
    formattedContent = formattedContent.replace(
      /(^[0-9]+\. .*?$(\n^[0-9]+\. .*?$)*)/gm, 
      '<ol class="list-decimal pl-6 my-3">$1</ol>'
    );
    // Then format individual items
    formattedContent = formattedContent.replace(/^[0-9]+\. (.*?)$/gm, '<li class="my-1">$1</li>');
  }
  
  // Restore code blocks
  codeBlocks.forEach((block, index) => {
    const code = block.replace(/```(?:(\w+))?\n([\s\S]*?)```/g, (_, lang, content) => {
      return `<pre class="bg-gray-100 dark:bg-gray-800 p-3 my-2 overflow-x-auto rounded-lg"><code>${content.trim()}</code></pre>`;
    });
    formattedContent = formattedContent.replace(`__CODE_BLOCK_${index}__`, code);
  });
  
  // Convert line breaks to <br> for remaining newlines
  formattedContent = formattedContent.replace(/\n/g, '<br>');
  
  return formattedContent;
}

export function ChatInterface({ messages, onSendMessage, loading, onUpload, onUrlInput, onTextInput, contentType, onClearChat }) {
  const [message, setMessage] = useState('');
  const endOfMessagesRef = useRef(null);
  const textAreaRef = useRef(null);
  const fileInputRef = useRef(null);

  const scrollToBottom = () => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (message.trim() && onSendMessage) {
      onSendMessage(message);
      setMessage('');
    }
  };

  const handleTextAreaChange = (e) => {
    setMessage(e.target.value);
    // Auto resize the textarea
    if (textAreaRef.current) {
      textAreaRef.current.style.height = 'auto';
      textAreaRef.current.style.height = `${Math.min(textAreaRef.current.scrollHeight, 150)}px`;
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0] && onUpload) {
      onUpload(e.target.files[0]);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header with controls */}
      {messages.length > 0 && (
        <div className="flex justify-between items-center px-4 py-2 border-b">
          <h3 className="text-lg font-medium">{contentType.charAt(0).toUpperCase() + contentType.slice(1)} Summary</h3>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={onClearChat}
            className="text-muted-foreground hover:text-destructive"
          >
            Clear Chat
          </Button>
        </div>
      )}
      
      {/* Message Area */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4 mb-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[70vh] text-center">
              <div className="mb-4 p-3 rounded-full bg-primary/10">
                {contentType === 'lecture' && <VideoIcon size={24} className="text-primary" />}
                {contentType === 'book' && <BookIcon size={24} className="text-primary" />}
                {contentType === 'notes' && <FileTextIcon size={24} className="text-primary" />}
              </div>
              <h3 className="text-lg font-medium mb-2">
                Start a new {contentType} summary
              </h3>
              <p className="text-muted-foreground max-w-md mb-8">
                Upload a file, paste a URL, or directly input text to generate an AI summary.
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                <Button 
                  variant="outline" 
                  className="flex items-center gap-2"
                  onClick={triggerFileUpload}
                >
                  <UploadIcon size={16} />
                  Upload File
                </Button>
                <Button 
                  variant="outline" 
                  className="flex items-center gap-2"
                  onClick={() => onUrlInput && onUrlInput('url')}
                >
                  <LinkIcon size={16} />
                  Enter URL
                </Button>
                <Button 
                  variant="outline" 
                  className="flex items-center gap-2"
                  onClick={() => onTextInput && onTextInput()}
                >
                  <FileTextIcon size={16} />
                  Input Text
                </Button>
                {contentType === 'lecture' && (
                  <Button 
                    variant="outline" 
                    className="flex items-center gap-2 bg-red-50 hover:bg-red-100 border-red-200"
                    onClick={() => onUrlInput && onUrlInput('youtube')}
                  >
                    <YoutubeIcon size={16} className="text-red-600" />
                    <span className="text-red-600">YouTube Video</span>
                  </Button>
                )}
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className="hidden"
                  accept={
                    contentType === 'lecture'
                      ? 'video/*,.mp4,.webm,.ogg,.avi'
                      : contentType === 'book'
                      ? '.pdf,.epub,.txt,.doc,.docx'
                      : '.txt,.doc,.docx,.pdf,.md'
                  }
                />
              </div>
            </div>
          ) : (
            messages.map((msg, index) => (
              <div
                key={index}
                className={cn(
                  "flex w-full",
                  msg.role === 'user' ? "justify-end" : "justify-start"
                )}
              >
                <div
                  className={cn(
                    "rounded-lg px-4 py-3 max-w-[85%]",
                    msg.role === 'user'
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  )}
                >
                  {msg.isLoading ? (
                    <div className="flex items-center gap-2">
                      <LoaderIcon className="animate-spin" size={16} />
                      <span>{msg.content}</span>
                    </div>
                  ) : (
                    <div
                      className="content-area"
                      dangerouslySetInnerHTML={{ 
                        __html: msg.role === 'assistant' 
                          ? formatMessageContent(msg.content)
                          : msg.content 
                      }}
                    />
                  )}
                </div>
              </div>
            ))
          )}
          {loading && !messages.some(msg => msg.isLoading) && (
            <div className="flex justify-start">
              <div className="bg-muted rounded-lg px-4 py-3 inline-flex items-center">
                <LoaderIcon className="animate-spin mr-2" size={16} />
                <span>Generating summary...</span>
              </div>
            </div>
          )}
          <div ref={endOfMessagesRef} />
        </div>
      </ScrollArea>

      {/* Input Area */}
      <div className="border-t p-4">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <textarea
            ref={textAreaRef}
            value={message}
            onChange={handleTextAreaChange}
            onKeyDown={handleKeyDown}
            placeholder={`Ask about this ${contentType} or type a new query...`}
            className="flex-1 min-h-[40px] max-h-[150px] p-2 border rounded-md resize-none focus:outline-none focus:ring-1 focus:ring-primary bg-background"
            disabled={loading}
          />
          <div className="flex flex-col gap-2">
            <Button 
              type="button" 
              variant="outline" 
              size="icon" 
              onClick={triggerFileUpload}
              disabled={loading}
            >
              <UploadIcon size={16} />
            </Button>
            <Button 
              type="submit" 
              variant="default" 
              size="icon" 
              disabled={!message.trim() || loading}
            >
              <SendIcon size={16} />
            </Button>
          </div>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
            accept={
              contentType === 'lecture'
                ? 'video/*,.mp4,.webm,.ogg,.avi'
                : contentType === 'book'
                ? '.pdf,.epub,.txt,.doc,.docx'
                : '.txt,.doc,.docx,.pdf,.md'
            }
          />
        </form>
      </div>
      
      {/* Add custom CSS for the YouTube summary display */}
      <style jsx global>{`
        .youtube-summary {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .youtube-title {
          font-size: 1.1rem;
          color: #0f0f0f;
        }
        .youtube-author {
          color: #606060;
          font-size: 0.9rem;
        }
        .youtube-duration {
          color: #606060;
          font-size: 0.9rem;
          margin-bottom: 12px;
        }
        .youtube-content {
          line-height: 1.5;
        }
        .content-area h1 {
          font-size: 1.5rem;
          font-weight: bold;
          margin: 12px 0 8px 0;
        }
        .content-area h2 {
          font-size: 1.25rem;
          font-weight: bold;
          margin: 10px 0 6px 0;
        }
        .content-area h3 {
          font-size: 1.1rem;
          font-weight: bold;
          margin: 8px 0 4px 0;
        }
        .content-area li {
          margin-left: 20px;
          list-style-type: disc;
        }
        .content-area ol li {
          list-style-type: decimal;
        }
        .content-area ul, .content-area ol {
          margin: 8px 0;
        }
        .content-area p {
          margin: 8px 0;
        }
        .content-area pre {
          background-color: #f5f5f5;
          padding: 12px;
          border-radius: 4px;
          overflow-x: auto;
          margin: 12px 0;
        }
        .dark .youtube-title {
          color: #ffffff;
        }
        .dark .youtube-author, .dark .youtube-duration {
          color: #aaaaaa;
        }
        .error-message {
          display: flex;
          flex-direction: column;
          gap: 8px;
          padding: 12px;
          background-color: #ffebee;
          border-radius: 8px;
          border-left: 4px solid #f44336;
        }
        
        .transcript-error {
          display: flex;
          flex-direction: column;
          gap: 8px;
          padding: 12px;
          background-color: #fff8e1;
          border-radius: 8px;
          border-left: 4px solid #ffc107;
        }
        
        .error-icon {
          font-size: 1.5rem;
          margin-bottom: 8px;
        }
        
        .error-title {
          font-size: 1.1rem;
          margin-bottom: 8px;
        }
        
        .error-tip {
          margin-top: 12px;
          font-style: italic;
          color: #666;
        }
        
        .dark .error-message {
          background-color: rgba(244, 67, 54, 0.1);
          border-left: 4px solid #f44336;
        }
        
        .dark .transcript-error {
          background-color: rgba(255, 193, 7, 0.1);
          border-left: 4px solid #ffc107;
        }
        
        .dark .error-tip {
          color: #aaa;
        }
      `}</style>
    </div>
  );
} 