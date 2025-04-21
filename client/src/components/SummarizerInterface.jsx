'use client';

import { useState, useRef } from 'react';
import { useForm } from 'react-hook-form';

export default function SummarizerInterface() {
  const [contentType, setContentType] = useState('lecture');
  const [inputType, setInputType] = useState('url');
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const fileInputRef = useRef(null);
  
  const { register, handleSubmit, formState: { errors }, reset } = useForm();
  
  const handleTypeChange = (type) => {
    setContentType(type);
    setSummary('');
  };
  
  const handleInputTypeChange = (type) => {
    setInputType(type);
    reset();
    setSummary('');
  };
  
  const addToChat = (role, content) => {
    setChatHistory(prev => [...prev, { role, content }]);
  };
  
  const onSubmit = async (data) => {
    setLoading(true);
    setSummary('');
    
    try {
      let apiUrl = '';
      let formData = new FormData();
      let payload = {};
      
      if (inputType === 'url') {
        apiUrl = 'http://localhost:5000/api/summarize/url';
        payload = {
          url: data.url,
          type: contentType
        };
        
        addToChat('user', `Summarize this ${contentType}: ${data.url}`);
      } else if (inputType === 'upload') {
        apiUrl = 'http://localhost:5000/api/summarize/upload';
        formData.append('file', data.file[0]);
        formData.append('type', contentType);
        
        addToChat('user', `Summarize this ${contentType} from uploaded file: ${data.file[0].name}`);
      } else if (inputType === 'text') {
        apiUrl = 'http://localhost:5000/api/summarize/text';
        payload = {
          text: data.text,
          type: contentType
        };
        
        addToChat('user', `Summarize this ${contentType}:\n${data.text.substring(0, 100)}...`);
      }
      
      let response;
      
      if (inputType === 'upload') {
        response = await fetch(apiUrl, {
          method: 'POST',
          body: formData,
        });
      } else {
        response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });
      }
      
      if (!response.ok) {
        throw new Error('Failed to get summary');
      }
      
      const result = await response.json();
      setSummary(result.summary);
      addToChat('assistant', result.summary);
      reset();
    } catch (error) {
      console.error('Error:', error);
      setSummary('Error: Failed to generate summary. Please try again.');
      addToChat('assistant', 'Error: Failed to generate summary. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  // Add a new function to handle direct chat message submission
  const handleChatSubmit = async (event) => {
    event.preventDefault();
    const chatInput = document.getElementById('chatInput');
    if (!chatInput || !chatInput.value.trim()) return;
    
    const message = chatInput.value.trim();
    chatInput.value = '';
    
    // Add user message to chat history
    addToChat('user', message);
    
    setLoading(true);
    
    try {
      // Determine if this is likely a summarization request
      const isSummarizeRequest = 
        message.toLowerCase().includes('summarize') || 
        message.toLowerCase().includes('summary') ||
        message.length > 200;
      
      let endpoint = '/api/chat';
      let payload = {
        message: message,
        contentType: contentType,
        history: chatHistory
      };
      
      // If message is very long, treat it as direct content to summarize
      if (message.length > 500) {
        console.log('Long message detected, sending to summarize endpoint');
        endpoint = '/api/chat/summarize';
        payload = {
          text: message,
          type: contentType
        };
      }
      
      const response = await fetch(`http://localhost:5000${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get response');
      }
      
      const result = await response.json();
      addToChat('assistant', result.response);
      
    } catch (error) {
      console.error('Chat Error:', error);
      addToChat('assistant', 'I encountered an error processing your request. Please try again or phrase your question differently.');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="w-full max-w-4xl mx-auto p-4">
      <h1 className="text-3xl font-bold text-center mb-8">AI Content Summarizer</h1>
      
      {/* Content Type Selection */}
      <div className="flex justify-center space-x-4 mb-8">
        <button
          onClick={() => handleTypeChange('lecture')}
          className={`px-4 py-2 rounded-lg ${
            contentType === 'lecture'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
          }`}
        >
          Lecture
        </button>
        <button
          onClick={() => handleTypeChange('book')}
          className={`px-4 py-2 rounded-lg ${
            contentType === 'book'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
          }`}
        >
          Book
        </button>
        <button
          onClick={() => handleTypeChange('notes')}
          className={`px-4 py-2 rounded-lg ${
            contentType === 'notes'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
          }`}
        >
          Notes
        </button>
      </div>
      
      {/* Input Type Selection */}
      <div className="flex justify-center space-x-4 mb-8">
        <button
          onClick={() => handleInputTypeChange('url')}
          className={`px-4 py-2 rounded-lg ${
            inputType === 'url'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
          }`}
        >
          URL
        </button>
        <button
          onClick={() => handleInputTypeChange('upload')}
          className={`px-4 py-2 rounded-lg ${
            inputType === 'upload'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
          }`}
        >
          Upload File
        </button>
        <button
          onClick={() => handleInputTypeChange('text')}
          className={`px-4 py-2 rounded-lg ${
            inputType === 'text'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
          }`}
        >
          Direct Text
        </button>
      </div>
      
      {/* Input Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="mb-8">
        {inputType === 'url' && (
          <div className="mb-4">
            <label htmlFor="url" className="block mb-2 text-sm font-medium">
              Enter URL
            </label>
            <input
              id="url"
              type="text"
              placeholder={`Enter ${contentType} URL`}
              className="w-full p-2 border border-gray-300 rounded-lg dark:bg-gray-800 dark:border-gray-600"
              {...register('url', { required: 'URL is required' })}
            />
            {errors.url && (
              <p className="mt-1 text-red-600">{errors.url.message}</p>
            )}
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Supported URL types: YouTube videos and general web pages.
            </p>
          </div>
        )}
        
        {inputType === 'upload' && (
          <div className="mb-4">
            <label htmlFor="file" className="block mb-2 text-sm font-medium">
              Upload File
            </label>
            <input
              id="file"
              type="file"
              ref={fileInputRef}
              accept=".pdf,.txt,.doc,.docx,.rtf"
              className="w-full p-2 border border-gray-300 rounded-lg dark:bg-gray-800 dark:border-gray-600"
              {...register('file', { required: 'File is required' })}
            />
            {errors.file && (
              <p className="mt-1 text-red-600">{errors.file.message}</p>
            )}
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Supported file types: PDF, text files, and Word documents
            </p>
          </div>
        )}
        
        {inputType === 'text' && (
          <div className="mb-4">
            <label htmlFor="text" className="block mb-2 text-sm font-medium">
              Enter Text
            </label>
            <textarea
              id="text"
              rows="8"
              placeholder={`Enter ${contentType} text to summarize`}
              className="w-full p-2 border border-gray-300 rounded-lg dark:bg-gray-800 dark:border-gray-600"
              {...register('text', { required: 'Text is required' })}
            ></textarea>
            {errors.text && (
              <p className="mt-1 text-red-600">{errors.text.message}</p>
            )}
          </div>
        )}
        
        <button
          type="submit"
          disabled={loading}
          className="w-full py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400"
        >
          {loading ? 'Summarizing...' : 'Summarize'}
        </button>
      </form>
      
      {/* Results */}
      {summary && (
        <div className="mt-6 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
          <h2 className="text-xl font-semibold mb-2">Summary</h2>
          <div className="whitespace-pre-line">{summary}</div>
        </div>
      )}
      
      {/* Chat History */}
      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-4">Chat History</h2>
        <div className="flex flex-col space-y-4 mb-4">
          {chatHistory.map((message, index) => (
            <div
              key={index}
              className={`p-3 rounded-lg ${
                message.role === 'user'
                  ? 'bg-blue-100 text-blue-900 dark:bg-blue-900 dark:text-blue-100 ml-auto max-w-3xl'
                  : 'bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100 max-w-3xl'
              }`}
            >
              <p className="text-sm font-semibold mb-1">
                {message.role === 'user' ? 'You' : 'AI Assistant'}
              </p>
              <div className="whitespace-pre-line">{message.content}</div>
            </div>
          ))}
        </div>
        
        {/* Chat Input */}
        <form onSubmit={handleChatSubmit} className="flex items-center gap-2">
          <input
            id="chatInput"
            type="text"
            className="flex-grow p-2 border border-gray-300 rounded-lg dark:bg-gray-800 dark:border-gray-600"
            placeholder={chatHistory.length > 0 ? "Ask a follow-up question or paste text to summarize..." : "Start by summarizing content above, then chat here..."}
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400"
          >
            {loading ? 'Processing...' : 'Send'}
          </button>
        </form>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          Tip: Paste longer paragraphs into the chat to get a summary, or type "Summarize: [your text]"
        </p>
      </div>
    </div>
  );
} 