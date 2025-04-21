"use client";

import { useState, useRef, useEffect } from 'react';
import { 
  Send, Upload, History, Youtube, 
  FileText, MessageSquare, ChevronRight, 
  Trash2, Download, Copy, X, Bot, User 
} from 'lucide-react';
import axios from 'axios';
import ReactMarkdown from 'react-markdown'; 
import remarkGfm from 'remark-gfm'; 

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Dialog, DialogContent, DialogHeader, 
  DialogTitle, DialogFooter, DialogClose, DialogTrigger 
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"; 
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, 
  DropdownMenuTrigger, DropdownMenuSeparator 
} from "@/components/ui/dropdown-menu";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'; 

export default function ChatPage() {
  const [messages, setMessages] = useState([]); 
  const [loading, setLoading] = useState(false);
  const [loadingType, setLoadingType] = useState(null); 
  const [activeTab, setActiveTab] = useState("text");
  const [textInput, setTextInput] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [uploadedFilesInfo, setUploadedFilesInfo] = useState([]); 
  const [chatHistory, setChatHistory] = useState([]);
  const [selectedChatId, setSelectedChatId] = useState(null);
  const [isHistoryDialogOpen, setIsHistoryDialogOpen] = useState(false); 
  const [error, setError] = useState(null);
  
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const addMessage = (message) => {
    setMessages(prev => [...prev, { ...message, id: Date.now() }]);
  };

  const saveToHistory = (newMessages, title, type) => {
    const currentChatId = selectedChatId || Date.now();
    const existingChatIndex = chatHistory.findIndex(c => c.id === currentChatId);
    const newEntry = {
      id: currentChatId,
      title: title || `${type.charAt(0).toUpperCase() + type.slice(1)} Summary`,
      type: type,
      messages: newMessages,
      lastUpdated: Date.now()
    };

    let updatedHistory;
    if (existingChatIndex > -1) {
      updatedHistory = [...chatHistory];
      updatedHistory[existingChatIndex] = newEntry;
    } else {
      updatedHistory = [newEntry, ...chatHistory]; 
      setSelectedChatId(currentChatId); 
    }
    setChatHistory(updatedHistory);
  };

  const handleSendText = async () => {
    if (!textInput.trim()) return;
    
    const userMessage = { role: 'user', content: textInput, type: 'text' };
    const currentMessages = [...messages, userMessage];
    addMessage(userMessage);
    setLoading(true);
    setLoadingType('text');
    setTextInput("");
    setError(null); 
    
    try {
      const response = await axios.post(`${API_BASE_URL}/api/summarize/text`, {
        text: textInput,
        type: 'text' 
      });
      
      const aiResponse = { 
        role: 'assistant', 
        content: response.data.summary, 
        type: 'text' 
      };
      addMessage(aiResponse);
      saveToHistory([...currentMessages, aiResponse], `Text Summary (${textInput.substring(0, 20)}...)`, 'text');
      
    } catch (err) {
      console.error("Error processing text:", err); 
      const errorMsg = err.response?.data?.error || err.message || "Failed to process your text. Please try again.";
      setError(errorMsg);
      addMessage({ role: 'system', content: errorMsg, type: 'error' });
    } finally {
      setLoading(false);
      setLoadingType(null);
    }
  };

  const handleYoutubeSubmit = async () => {
    if (!youtubeUrl.trim() || (!youtubeUrl.includes('youtube.com') && !youtubeUrl.includes('youtu.be'))) {
      setError("Please enter a valid YouTube URL");
      return;
    }
    
    const userMessage = { role: 'user', content: `Summarize YouTube URL: ${youtubeUrl}`, type: 'youtube' };
    const currentMessages = [...messages, userMessage];
    addMessage(userMessage);
    setLoading(true);
    setLoadingType('youtube');
    setYoutubeUrl("");
    setError(null);
    
    try {
      const response = await axios.post(`${API_BASE_URL}/api/summarize/youtube`, {
        url: youtubeUrl
      });
      
      const aiResponse = { 
        role: 'assistant', 
        content: response.data.summary,
        type: 'youtube-summary',
        metadata: { 
          title: response.data.title,
          author: response.data.author,
          duration: response.data.duration,
        }
      };
      addMessage(aiResponse);
      saveToHistory([...currentMessages, aiResponse], response.data.title || 'YouTube Summary', 'youtube');
      
    } catch (err) {
      console.error("Error processing YouTube URL:", err); 
      const errorMsg = err.response?.data?.error || err.message || "Failed to process YouTube video. Please check the URL and try again.";
      setError(errorMsg);
      addMessage({ role: 'system', content: errorMsg, type: 'error' });
    } finally {
      setLoading(false);
      setLoadingType(null);
    }
  };

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    const newFilesInfo = files.map(file => ({ name: file.name, status: 'pending' }));
    setUploadedFilesInfo(prev => [...prev, ...newFilesInfo]);
    
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    setError(null); 

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const fileInfoIndex = uploadedFilesInfo.length + i; 

      const userMessage = { role: 'user', content: `Summarize uploaded file: ${file.name}`, type: 'file' };
      const currentMessages = [...messages, userMessage]; 
      addMessage(userMessage);
      setLoading(true);
      setLoadingType('file');
      setUploadedFilesInfo(prev => prev.map((info, idx) => idx === fileInfoIndex ? { ...info, status: 'processing' } : info));

      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('type', 'file'); 
        
        const response = await axios.post(`${API_BASE_URL}/api/summarize/upload`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        });
        
        const aiResponse = { 
          role: 'assistant', 
          content: response.data.summary,
          type: 'file',
          metadata: { 
            fileName: file.name
          }
        };
        addMessage(aiResponse);
        setUploadedFilesInfo(prev => prev.map((info, idx) => idx === fileInfoIndex ? { ...info, status: 'success' } : info));
        saveToHistory([...currentMessages, aiResponse], `${file.name} Summary`, 'file');
        
      } catch (err) {
        console.error(`Error processing file ${file.name}:`, err); 
        const errorMsg = err.response?.data?.error || err.message || `Failed to process file: ${file.name}`;
        setError(prevError => prevError ? `${prevError}\n${errorMsg}` : errorMsg); 
        addMessage({ 
          role: 'system', 
          content: `Error processing file: ${file.name}. ${err.response?.data?.error || 'Please try again.'}`, 
          type: 'error' 
        });
        setUploadedFilesInfo(prev => prev.map((info, idx) => idx === fileInfoIndex ? { ...info, status: 'error' } : info));
      } finally {
        if (i === files.length - 1) {
          setLoading(false);
          setLoadingType(null);
        }
      }
    }
  };

  const loadChat = (chatId) => {
    const chat = chatHistory.find(c => c.id === chatId);
    if (chat) {
      setMessages(chat.messages);
      setSelectedChatId(chatId);
      setIsHistoryDialogOpen(false); 
      setError(null); 
      setTextInput("");
      setYoutubeUrl("");
      setUploadedFilesInfo([]);
    }
  };

  const startNewChat = () => {
    setMessages([]);
    setSelectedChatId(null);
    setError(null);
    setTextInput("");
    setYoutubeUrl("");
    setUploadedFilesInfo([]);
    setActiveTab('text'); 
  };

  const deleteChat = (chatId, e) => {
    e.stopPropagation(); 
    const newHistory = chatHistory.filter(chat => chat.id !== chatId);
    setChatHistory(newHistory);
    if (selectedChatId === chatId) {
      startNewChat(); 
    }
  };

  const exportChat = () => {
    if (messages.length === 0) return;
    
    const markdown = messages.map(msg => {
      let header = '';
      if (msg.role === 'user') {
        header = `## User (${msg.type})`;
      } else if (msg.role === 'assistant') {
        header = `## AI Assistant (${msg.type})`;
        if (msg.metadata?.title) { 
          header += `\n**Title:** ${msg.metadata.title}\n**Author:** ${msg.metadata.author}`;
        }
        if (msg.metadata?.fileName) { 
          header += `\n**File:** ${msg.metadata.fileName}`;
        }
      } else if (msg.role === 'system') {
        header = `## System (${msg.type})`;
      }
      return `${header}\n${msg.content}\n\n`;
    }).join('');
    
    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const chatTitle = chatHistory.find(c => c.id === selectedChatId)?.title || 'chat';
    a.download = `${chatTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase()}-export-${new Date().toISOString().slice(0, 10)}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const copyToClipboard = (content) => {
    navigator.clipboard.writeText(content).then(() => {
      console.log('Copied to clipboard');
    }).catch(err => {
      console.error('Failed to copy text: ', err);
    });
  };
  
  return (
    <div className="flex flex-col h-screen bg-indigo-100 text-indigo-950">
      
      <header className="bg-white/80 backdrop-blur-md border-b border-gray-200 p-3 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <Dialog open={isHistoryDialogOpen} onOpenChange={setIsHistoryDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon" className="text-gray-600 hover:text-indigo-700">
                <History size={20} />
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
              </DialogHeader>
              <ScrollArea className="max-h-[60vh] -mr-4 pr-4 my-4"> 
                {chatHistory.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No history yet.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {chatHistory.sort((a, b) => b.lastUpdated - a.lastUpdated).map((chat) => ( 
                      <div 
                        key={chat.id} 
                        className={`flex items-start justify-between p-3 rounded-lg cursor-pointer transition-colors ${selectedChatId === chat.id ? 'bg-indigo-100' : 'hover:bg-gray-100'}`}
                        onClick={() => loadChat(chat.id)}
                      >
                        <div className="flex items-start gap-3 overflow-hidden">
                          <div className="mt-1 flex-shrink-0">
                            {chat.type === 'youtube' ? (
                              <Youtube size={16} className="text-red-600" />
                            ) : chat.type === 'file' ? (
                              <FileText size={16} className="text-blue-600" />
                            ) : (
                              <MessageSquare size={16} className="text-green-600" />
                            )}
                          </div>
                          <div className="overflow-hidden">
                            <h4 className="font-medium text-gray-800 text-sm truncate" title={chat.title}>{chat.title}</h4>
                            <p className="text-xs text-gray-500 mt-1">
                              {new Date(chat.lastUpdated).toLocaleString()}
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-gray-400 hover:text-red-600 flex-shrink-0 ml-2"
                          onClick={(e) => deleteChat(chat.id, e)}
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </DialogContent>
          </Dialog>

          <h1 className="text-lg font-semibold text-indigo-800">
            {selectedChatId ? (chatHistory.find(c => c.id === selectedChatId)?.title || 'Chat') : 'New Chat'}
          </h1>
        </div>
        
        <div className="flex items-center gap-2">
          {messages.length > 0 && (
            <Button 
              variant="outline" 
              onClick={exportChat} 
              size="sm"
              className="border-indigo-300 text-indigo-700 hover:bg-indigo-50"
            >
              <Download size={16} className="mr-1.5" />
              Export
            </Button>
          )}
          <Button 
            variant="outline" 
            onClick={startNewChat} 
            size="sm"
            className="border-gray-300 text-gray-700 hover:bg-gray-100"
          >
            <X size={16} className="mr-1.5" />
            Clear / New
          </Button>
        </div>
      </header>

      <ScrollArea className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="max-w-4xl mx-auto space-y-6 pb-4">
          {messages.length === 0 && !loading && (
            <div className="text-center py-16">
               <Bot size={48} className="mx-auto text-indigo-400 mb-4" />
              <h2 className="text-2xl font-semibold text-indigo-800 mb-2">AI Summarizer</h2>
              <p className="text-gray-600 max-w-md mx-auto">
                Paste text, upload a PDF, or enter a YouTube URL below to get started.
              </p>
            </div>
          )}

          {messages.map((message) => {
            if (message.role === 'user') {
              return (
                <div key={message.id} className="flex justify-end">
                  <div className="flex items-start gap-3 max-w-[200px] lg:max-w-[250px] flex-row-reverse">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center mt-1 bg-indigo-500 text-white">
                      <User size={18} />
                    </div>
                    <div className="bg-indigo-600 text-white rounded-lg rounded-br-none p-3 shadow-sm">
                      <div className="text-sm truncate">{message.content.substring(0, 50)}{message.content.length > 50 ? '...' : ''}</div>
                      <div className="text-xs text-indigo-200 mt-1">{message.type} input</div>
                    </div>
                  </div>
                </div>
              );
            } else if (message.role === 'assistant') {
              return (
                <div key={message.id} className="flex justify-center">
                  <div className="w-full max-w-2xl bg-white rounded-lg shadow-md p-6 relative">
                    {message.metadata && (
                      <div className="mb-4 pb-2 border-b border-gray-200 text-sm text-gray-600">
                        {message.type === 'youtube-summary' && message.metadata.title && (
                          <>
                            <p><strong>Source:</strong> YouTube</p>
                            <p><strong>Title:</strong> {message.metadata.title}</p>
                            {message.metadata.author && <p><strong>Author:</strong> {message.metadata.author}</p>}
                            {message.metadata.duration > 0 && (
                              <p><strong>Duration:</strong> {Math.floor(message.metadata.duration / 60)}m {message.metadata.duration % 60}s</p>
                            )}
                          </>
                        )}
                        {message.type === 'file' && message.metadata.fileName && (
                          <p><strong>Source File:</strong> {message.metadata.fileName}</p>
                        )}
                      </div>
                    )}
                    
                    <div className="text-left mb-6">
                      <h3 className="font-medium text-gray-800 mb-2">Summary</h3>
                      <div className="prose prose-sm max-w-none text-gray-700">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
                      </div>
                    </div>
                    
                    <div className="flex justify-end gap-2 mt-4 border-t border-gray-100 pt-4">
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="text-gray-600 hover:bg-gray-50 border-gray-200"
                        onClick={() => copyToClipboard(message.content)}
                      >
                        <Copy size={16} className="mr-1.5" />
                        COPY
                      </Button>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-gray-600 hover:bg-gray-50 border-gray-200"
                        onClick={() => {
                          const blob = new Blob([message.content], { type: 'text/plain' });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `summary-${new Date().toISOString().slice(0, 10)}.txt`;
                          document.body.appendChild(a);
                          a.click();
                          document.body.removeChild(a);
                          URL.revokeObjectURL(url);
                        }}
                      >
                        <Download size={16} className="mr-1.5" />
                        DOWNLOAD
                      </Button>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-indigo-600 hover:bg-indigo-50 border-indigo-200"
                        onClick={() => {
                          const userMessageIndex = messages.findIndex(msg => msg.id === message.id) - 1;
                          if (userMessageIndex >= 0) {
                            const userMessage = messages[userMessageIndex];
                            if (userMessage.type === 'text') {
                              setTextInput(userMessage.content);
                              setActiveTab('text');
                            } else if (userMessage.type === 'youtube') {
                              setYoutubeUrl(userMessage.content.replace('Summarize YouTube URL: ', ''));
                              setActiveTab('youtube');
                            }
                            setMessages(prev => prev.filter(msg => msg.id !== message.id && msg.id !== userMessage.id));
                          }
                        }}
                      >
                        REGENERATE
                      </Button>
                    </div>
                  </div>
                </div>
              );
            } else {
              return (
                <div key={message.id} className="flex justify-center">
                  <div className="w-full max-w-2xl bg-red-50 border border-red-200 rounded-lg p-4 text-left">
                    <p className="font-semibold text-red-800 mb-1">Error</p>
                    <p className="text-red-700 text-sm">{message.content}</p>
                  </div>
                </div>
              );
            }
          })}

          {loading && (
            <div className="flex justify-center">
              <div className="w-full max-w-2xl bg-white/50 backdrop-blur-sm border border-gray-100 rounded-lg p-6 shadow-sm">
                <div className="flex items-center justify-center gap-3">
                  <div className="h-5 w-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                  <span className="text-gray-700">Processing {loadingType}...</span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} /> 
        </div>
      </ScrollArea>
      
      <div className="bg-white border-t border-gray-200 p-4 md:p-6 sticky bottom-0">
        <div className="max-w-4xl mx-auto">
          {error && (
            <Alert variant="destructive" className="mb-4 relative"> 
               <Button variant="ghost" size="icon" className="absolute top-1 right-1 h-6 w-6 text-red-500 hover:bg-red-100" onClick={() => setError(null)}> 
                 <X size={16} />
               </Button>
              <AlertTitle>Error</AlertTitle>
              <AlertDescription className="whitespace-pre-wrap">
                {error}
              </AlertDescription>
            </Alert>
          )}

          <Tabs defaultValue="text" value={activeTab} onValueChange={setActiveTab} className="mb-2">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="text" disabled={loading}>
                <MessageSquare size={16} className="mr-1.5" /> Text
              </TabsTrigger>
              <TabsTrigger value="file" disabled={loading}>
                <FileText size={16} className="mr-1.5" /> PDF Upload
              </TabsTrigger>
              <TabsTrigger value="youtube" disabled={loading}>
                <Youtube size={16} className="mr-1.5" /> YouTube
              </TabsTrigger>
            </TabsList>
          </Tabs>
          
          <div>
            {activeTab === 'text' && (
              <div className="relative">
                <Textarea 
                  placeholder="Paste your text here to summarize..."
                  className="min-h-[100px] resize-none border-gray-300 focus-visible:ring-indigo-500 pr-28"
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendText();
                    }
                  }}
                  disabled={loading}
                />
                <Button 
                  onClick={handleSendText} 
                  disabled={!textInput.trim() || loading}
                  className="absolute bottom-3 right-3 bg-indigo-600 hover:bg-indigo-700 text-white"
                  size="sm"
                >
                  <Send size={16} className="mr-1.5" />
                  Summarize
                </Button>
              </div>
            )}
            
            {activeTab === 'file' && (
              <Card className="bg-gray-50 border-dashed border-2 border-gray-300 hover:border-indigo-400 transition-colors">
                <CardContent className="pt-6 text-center">
                  <Upload size={32} className="mx-auto text-gray-400 mb-3" />
                  <h3 className="text-gray-800 font-medium mb-1">Upload PDF Document</h3>
                  <p className="text-gray-600 text-sm mb-4">
                    Click button or drag & drop (Max 50MB)
                  </p>
                  
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf" 
                    className="hidden"
                    onChange={handleFileUpload}
                    disabled={loading}
                  />
                  
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={loading}
                    variant="outline"
                    className="border-gray-300 text-gray-700 hover:bg-gray-100"
                  >
                    {loading && loadingType === 'file' ? 'Processing...' : 'Select PDF File'}
                  </Button>
                  
                  {uploadedFilesInfo.length > 0 && (
                    <div className="mt-4 text-left text-xs space-y-1">
                      {uploadedFilesInfo.map((file, index) => (
                        <div key={index} className={`flex items-center justify-between p-1 rounded ${file.status === 'error' ? 'bg-red-100 text-red-700' : file.status === 'success' ? 'bg-green-100 text-green-700' : 'text-gray-600'}`}>
                          <span className="truncate" title={file.name}>{file.name}</span>
                          <Badge variant="outline" className={`ml-2 text-xs ${file.status === 'error' ? 'border-red-300' : file.status === 'success' ? 'border-green-300' : 'border-gray-300'}`}>{file.status}</Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
            
            {activeTab === 'youtube' && (
              <div className="flex gap-2 items-end">
                <div className="flex-1">
                   <label htmlFor="youtube-url" className="text-xs text-gray-600 mb-1 block">YouTube Video URL</label>
                  <Input
                    id="youtube-url"
                    placeholder="https://www.youtube.com/watch?v=..."
                    className="border-gray-300 focus-visible:ring-indigo-500"
                    value={youtubeUrl}
                    onChange={(e) => setYoutubeUrl(e.target.value)}
                    disabled={loading}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleYoutubeSubmit();
                      }
                    }}
                  />
                </div>
                <Button 
                  onClick={handleYoutubeSubmit} 
                  disabled={!youtubeUrl.trim() || loading}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white whitespace-nowrap"
                >
                  {loading && loadingType === 'youtube' ? (
                    <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Send size={16} />
                  )}
                  <span className="ml-1.5">Summarize</span>
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div> 
  );
}