'use client';

import { useState, useEffect } from 'react';
import { Sidebar } from './ui/sidebar';
import { ChatInterface } from './ChatInterface';
import { UrlInputDialog, TextInputDialog } from './InputDialogs';

// Local storage keys
const CHAT_HISTORY_KEY = 'aiStudyPartner_chatHistory';
const ACTIVE_CHAT_KEY = 'aiStudyPartner_activeChat';

export function MainAppWrapper() {
  const [contentType, setContentType] = useState('lecture');
  const [chatHistory, setChatHistory] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Dialog states
  const [urlDialogOpen, setUrlDialogOpen] = useState(false);
  const [textDialogOpen, setTextDialogOpen] = useState(false);
  const [dialogSource, setDialogSource] = useState('url'); // 'url' or 'youtube'
  
  // Load chat history from localStorage on component mount
  useEffect(() => {
    try {
      const savedChatHistory = localStorage.getItem(CHAT_HISTORY_KEY);
      const savedActiveChat = localStorage.getItem(ACTIVE_CHAT_KEY);
      
      if (savedChatHistory) {
        const parsedHistory = JSON.parse(savedChatHistory);
        setChatHistory(parsedHistory);
        
        // If there's an active chat, load its messages
        if (savedActiveChat !== null) {
          const chatIndex = parseInt(savedActiveChat, 10);
          if (parsedHistory[chatIndex]) {
            setActiveChat(chatIndex);
            setContentType(parsedHistory[chatIndex].type);
            setMessages(parsedHistory[chatIndex].messages || []);
          }
        }
      }
    } catch (error) {
      console.error('Error loading chat history from localStorage:', error);
    }
  }, []);
  
  // Save chat history to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(chatHistory));
      if (activeChat !== null) {
        localStorage.setItem(ACTIVE_CHAT_KEY, activeChat.toString());
      }
    } catch (error) {
      console.error('Error saving chat history to localStorage:', error);
    }
  }, [chatHistory, activeChat]);
  
  // Create a new chat
  const handleCreateNew = (type) => {
    setContentType(type);
    setActiveChat(null);
    setMessages([]);
  };
  
  // Select an existing chat
  const handleSelectChat = (index) => {
    setActiveChat(index);
    const chat = chatHistory[index];
    setContentType(chat.type);
    setMessages(chat.messages || []);
  };
  
  // Clear current chat
  const handleClearChat = () => {
    if (activeChat !== null) {
      // Remove from chat history
      const updatedHistory = [...chatHistory];
      updatedHistory.splice(activeChat, 1);
      setChatHistory(updatedHistory);
      
      // Update active chat index
      if (updatedHistory.length === 0) {
        setActiveChat(null);
        setMessages([]);
        localStorage.removeItem(ACTIVE_CHAT_KEY);
      } else {
        const newActiveIndex = Math.min(activeChat, updatedHistory.length - 1);
        setActiveChat(newActiveIndex);
        setContentType(updatedHistory[newActiveIndex].type);
        setMessages(updatedHistory[newActiveIndex].messages || []);
      }
    } else {
      // Just clear the current messages if we're in a new unsaved chat
      setMessages([]);
    }
  };
  
  // Handle URL submission
  const handleUrlSubmit = async (url) => {
    setLoading(true);
    
    try {
      // Check if it's a YouTube URL
      const isYouTubeURL = url.includes('youtube.com') || url.includes('youtu.be');
      
      // Add user message with a more specific format for YouTube
      let userMessage = '';
      if (isYouTubeURL) {
        userMessage = `Summarize this YouTube ${contentType}: ${url}`;
      } else {
        userMessage = `Summarize this ${contentType} from URL: ${url}`;
      }
      
      const newMessages = [...messages, { role: 'user', content: userMessage }];
      setMessages(newMessages);
      
      // Show a more specific loading message for YouTube videos
      if (isYouTubeURL) {
        // Create temporary loading message
        const tempLoadingId = Date.now();
        setMessages([
          ...newMessages, 
          { 
            role: 'assistant', 
            content: 'Fetching and analyzing YouTube video content. This may take a moment...', 
            id: tempLoadingId,
            isLoading: true
          }
        ]);
      }
      
      // API request
      const response = await fetch('http://localhost:5000/api/summarize/url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url,
          type: contentType
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get summary');
      }
      
      const result = await response.json();
      
      // Remove the temporary loading message if it exists
      setMessages(prevMessages => 
        prevMessages.filter(msg => !msg.isLoading)
      );
      
      // Add AI response
      const updatedMessages = [...newMessages, { role: 'assistant', content: result.summary }];
      setMessages(updatedMessages);
      
      // Set the chat title based on whether it's a YouTube video
      let chatTitle = '';
      if (isYouTubeURL) {
        // Extract video title if available in the summary
        const titleMatch = result.summary.match(/Title: (.*?)(?:\n|$)/);
        chatTitle = titleMatch 
          ? `YouTube: ${titleMatch[1]}` 
          : `YouTube ${contentType.charAt(0).toUpperCase() + contentType.slice(1)}`;
      } else {
        chatTitle = `${contentType.charAt(0).toUpperCase() + contentType.slice(1)} from URL`;
      }
      
      // Add to chat history if this is a new chat
      if (activeChat === null) {
        const newChat = {
          type: contentType,
          title: chatTitle,
          messages: updatedMessages,
          timestamp: new Date().toISOString()
        };
        const newHistory = [...chatHistory, newChat];
        setChatHistory(newHistory);
        setActiveChat(newHistory.length - 1);
      } else {
        // Update existing chat
        const updatedHistory = [...chatHistory];
        updatedHistory[activeChat] = {
          ...updatedHistory[activeChat],
          messages: updatedMessages,
          title: chatTitle,
          timestamp: new Date().toISOString()
        };
        setChatHistory(updatedHistory);
      }
    } catch (error) {
      console.error('Error:', error);
      
      // Remove any temporary loading messages
      setMessages(prevMessages => 
        prevMessages.filter(msg => !msg.isLoading)
      );
      
      // Add error message
      setMessages([...messages, 
        { role: 'user', content: `Summarize this ${contentType} from URL: ${url}` }, 
        { role: 'assistant', content: `Error: ${error.message || 'Failed to generate summary. Please try again.'}` }
      ]);
    } finally {
      setLoading(false);
    }
  };
  
  // Handle file upload
  const handleFileUpload = async (file) => {
    setLoading(true);
    
    try {
      // Add user message
      const userMessage = `Summarize this ${contentType} from file: ${file.name}`;
      const newMessages = [...messages, { role: 'user', content: userMessage }];
      setMessages(newMessages);
      
      // Prepare form data
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', contentType);
      
      // API request
      const response = await fetch('http://localhost:5000/api/summarize/upload', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error('Failed to get summary');
      }
      
      const result = await response.json();
      
      // Add AI response
      const updatedMessages = [...newMessages, { role: 'assistant', content: result.summary }];
      setMessages(updatedMessages);
      
      // Add to chat history if this is a new chat
      if (activeChat === null) {
        const newChat = {
          type: contentType,
          title: `${contentType.charAt(0).toUpperCase() + contentType.slice(1)} from ${file.name}`,
          messages: updatedMessages,
          timestamp: new Date().toISOString()
        };
        const newHistory = [...chatHistory, newChat];
        setChatHistory(newHistory);
        setActiveChat(newHistory.length - 1);
      } else {
        // Update existing chat
        const updatedHistory = [...chatHistory];
        updatedHistory[activeChat] = {
          ...updatedHistory[activeChat],
          messages: updatedMessages,
          timestamp: new Date().toISOString()
        };
        setChatHistory(updatedHistory);
      }
    } catch (error) {
      console.error('Error:', error);
      setMessages([...messages, 
        { role: 'user', content: `Summarize this ${contentType} from file: ${file.name}` }, 
        { role: 'assistant', content: 'Error: Failed to generate summary. Please try again.' }
      ]);
    } finally {
      setLoading(false);
    }
  };
  
  // Handle text input
  const handleTextSubmit = async (text) => {
    setLoading(true);
    
    try {
      // Add user message
      const userMessage = `Summarize this ${contentType} text:\n${text.substring(0, 100)}...`;
      const newMessages = [...messages, { role: 'user', content: userMessage }];
      setMessages(newMessages);
      
      // API request
      const response = await fetch('http://localhost:5000/api/summarize/text', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          type: contentType
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to get summary');
      }
      
      const result = await response.json();
      
      // Add AI response
      const updatedMessages = [...newMessages, { role: 'assistant', content: result.summary }];
      setMessages(updatedMessages);
      
      // Add to chat history if this is a new chat
      if (activeChat === null) {
        const newChat = {
          type: contentType,
          title: `${contentType.charAt(0).toUpperCase() + contentType.slice(1)} from text`,
          messages: updatedMessages,
          timestamp: new Date().toISOString()
        };
        const newHistory = [...chatHistory, newChat];
        setChatHistory(newHistory);
        setActiveChat(newHistory.length - 1);
      } else {
        // Update existing chat
        const updatedHistory = [...chatHistory];
        updatedHistory[activeChat] = {
          ...updatedHistory[activeChat],
          messages: updatedMessages,
          timestamp: new Date().toISOString()
        };
        setChatHistory(updatedHistory);
      }
    } catch (error) {
      console.error('Error:', error);
      setMessages([...messages, 
        { role: 'user', content: `Summarize this ${contentType} text` }, 
        { role: 'assistant', content: 'Error: Failed to generate summary. Please try again.' }
      ]);
    } finally {
      setLoading(false);
    }
  };
  
  const handleSendMessage = async (message) => {
    // Add user message
    const newMessages = [...messages, { role: 'user', content: message }];
    setMessages(newMessages);
    
    // Add a loading message
    const tempLoadingId = Date.now();
    setMessages([
      ...newMessages, 
      { 
        role: 'assistant', 
        content: 'Thinking...', 
        id: tempLoadingId,
        isLoading: true
      }
    ]);
    
    // Update chat history to save the user message immediately
    if (activeChat !== null) {
      const updatedHistory = [...chatHistory];
      updatedHistory[activeChat] = {
        ...updatedHistory[activeChat],
        messages: newMessages,
        timestamp: new Date().toISOString()
      };
      setChatHistory(updatedHistory);
    }
    
    try {
      // Send the user message to the server for processing
      const response = await fetch('http://localhost:5000/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          contentType,
          history: messages.map(msg => ({
            role: msg.role,
            content: msg.content
          }))
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to get response');
      }
      
      const result = await response.json();
      
      // Remove the loading message
      setMessages(prevMessages => 
        prevMessages.filter(msg => !msg.isLoading)
      );
      
      // Add AI response
      const aiResponse = result.response || "I couldn't generate a specific answer to your question. Is there something else you'd like to know about the summary?";
      const updatedMessages = [...newMessages, { role: 'assistant', content: aiResponse }];
      setMessages(updatedMessages);
      
      // Update chat history
      if (activeChat !== null) {
        const updatedHistory = [...chatHistory];
        updatedHistory[activeChat] = {
          ...updatedHistory[activeChat],
          messages: updatedMessages,
          timestamp: new Date().toISOString()
        };
        setChatHistory(updatedHistory);
      } else if (newMessages.length > 0) {
        // Create a new chat entry if we don't have one yet
        // Extract a title from the first summary if available
        let chatTitle = `New ${contentType} conversation`;
        
        // Check if there's a summary in the messages to extract a better title
        const summaryMessage = messages.find(msg => 
          msg.role === 'assistant' && msg.content && msg.content.length > 100
        );
        
        if (summaryMessage) {
          // Try to extract a title from the summary
          const titleMatch = summaryMessage.content.match(/^#\s*(.*?)(?:\n|$)/m) ||  // Markdown title
                            summaryMessage.content.match(/^(.*?)(?:\n|$)/); // First line
                            
          if (titleMatch && titleMatch[1]) {
            chatTitle = titleMatch[1].trim();
          } else {
            // Try to extract something meaningful from the content
            const contentLines = summaryMessage.content.split('\n').filter(line => line.trim());
            if (contentLines.length > 0) {
              // Use the first non-empty line that's not too long
              for (const line of contentLines) {
                const cleanLine = line.replace(/^[#\-*>\s]+/, '').trim();
                if (cleanLine && cleanLine.length < 50) {
                  chatTitle = cleanLine;
                  break;
                }
              }
            }
          }
        }
        
        const newChat = {
          type: contentType,
          title: chatTitle,
          messages: updatedMessages,
          timestamp: new Date().toISOString()
        };
        const newHistory = [...chatHistory, newChat];
        setChatHistory(newHistory);
        setActiveChat(newHistory.length - 1);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      
      // Remove the loading message
      setMessages(prevMessages => 
        prevMessages.filter(msg => !msg.isLoading)
      );
      
      // Add a simpler generic error message with suggestion to try again
      const responseContent = "I'm sorry, I couldn't process your question at this time. This might be due to a connection issue or server error. Please try asking again, or try a different question about the content.";
      
      const updatedMessages = [...newMessages, { 
        role: 'assistant', 
        content: responseContent
      }];
      setMessages(updatedMessages);
      
      // Update chat history
      if (activeChat !== null) {
        const updatedHistory = [...chatHistory];
        updatedHistory[activeChat] = {
          ...updatedHistory[activeChat],
          messages: updatedMessages,
          timestamp: new Date().toISOString()
        };
        setChatHistory(updatedHistory);
      }
    }
  };
  
  // Function to open URL dialog
  const handleUrlDialogOpen = (source = 'url') => {
    setDialogSource(source);
    setUrlDialogOpen(true);
  };
  
  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <Sidebar 
        onCreateNew={handleCreateNew}
        chatHistory={chatHistory}
        activeChat={activeChat}
        onSelectChat={handleSelectChat}
      />
      
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        <ChatInterface 
          messages={messages}
          onSendMessage={handleSendMessage}
          loading={loading}
          onUpload={handleFileUpload}
          onUrlInput={handleUrlDialogOpen}
          onTextInput={() => setTextDialogOpen(true)}
          contentType={contentType}
          onClearChat={handleClearChat}
        />
      </div>
      
      {/* Dialogs */}
      <UrlInputDialog 
        open={urlDialogOpen} 
        onOpenChange={setUrlDialogOpen} 
        onSubmit={handleUrlSubmit}
        contentType={contentType}
        defaultYouTube={dialogSource === 'youtube'}
      />
      
      <TextInputDialog 
        open={textDialogOpen} 
        onOpenChange={setTextDialogOpen} 
        onSubmit={handleTextSubmit}
        contentType={contentType}
      />
    </div>
  );
} 