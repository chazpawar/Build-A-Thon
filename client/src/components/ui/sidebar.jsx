'use client';

import { useState } from 'react';
import { Button } from './button';
import { ScrollArea } from './scroll-area';
import { 
  FileTextIcon, 
  BookOpenIcon, 
  VideoIcon, 
  PlusCircleIcon,
  MessageSquareIcon,
  UploadIcon,
  LinkIcon,
  PenToolIcon,
  TrashIcon
} from 'lucide-react';

export function Sidebar({ chatHistory, onCreateNew, onSelectChat, activeChat }) {
  const [selected, setSelected] = useState('lecture');
  
  const handleSelect = (type) => {
    setSelected(type);
    if (onCreateNew) {
      onCreateNew(type);
    }
  };
  
  const typeIcons = {
    'book': <BookOpenIcon size={16} className="flex-shrink-0" />,
    'lecture': <VideoIcon size={16} className="flex-shrink-0" />,
    'notes': <FileTextIcon size={16} className="flex-shrink-0" />
  };
  
  // Organize chat history by date
  const organizeByDate = (history) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const yesterday = new Date(today - 86400000).getTime(); // Subtract one day in milliseconds
    
    const groups = {
      today: [],
      yesterday: [],
      older: []
    };
    
    history.forEach((chat, index) => {
      const chatDate = chat.timestamp ? new Date(chat.timestamp) : new Date();
      const chatTime = new Date(chatDate.getFullYear(), chatDate.getMonth(), chatDate.getDate()).getTime();
      
      if (chatTime >= today) {
        groups.today.push({ ...chat, index });
      } else if (chatTime >= yesterday) {
        groups.yesterday.push({ ...chat, index });
      } else {
        groups.older.push({ ...chat, index });
      }
    });
    
    return groups;
  };
  
  const groupedHistory = organizeByDate(chatHistory);
  
  const formatChatTitle = (chat) => {
    if (chat.title) {
      // Truncate long titles
      return chat.title.length > 26
        ? chat.title.substring(0, 24) + '...'
        : chat.title;
    }
    return `${chat.type.charAt(0).toUpperCase() + chat.type.slice(1)} summary`;
  };

  return (
    <div className="w-[260px] h-full bg-background border-r flex flex-col dark:bg-gray-950">
      <div className="px-3 py-4 border-b">
        <h2 className="font-semibold text-xl flex items-center gap-2">
          <MessageSquareIcon size={20} className="text-primary" />
          T3.chat
        </h2>
      </div>
      
      <div className="p-3 border-b">
        <Button 
          variant="default" 
          className="w-full justify-start gap-2"
          onClick={() => onCreateNew && onCreateNew(selected)}
        >
          <PlusCircleIcon size={16} />
          New Chat
        </Button>
      </div>
      
      <div className="p-3 border-b">
        <h3 className="text-sm font-medium mb-2">Content Type</h3>
        <div className="grid grid-cols-3 gap-1 mb-2">
          <Button 
            variant={selected === 'lecture' ? "default" : "outline"} 
            size="sm"
            className="flex gap-1 h-8"
            onClick={() => handleSelect('lecture')}
          >
            <VideoIcon size={14} />
            <span className="text-xs">Lecture</span>
          </Button>
          <Button 
            variant={selected === 'book' ? "default" : "outline"} 
            size="sm"
            className="flex gap-1 h-8"
            onClick={() => handleSelect('book')}
          >
            <BookOpenIcon size={14} />
            <span className="text-xs">Book</span>
          </Button>
          <Button 
            variant={selected === 'notes' ? "default" : "outline"} 
            size="sm"
            className="flex gap-1 h-8"
            onClick={() => handleSelect('notes')}
          >
            <FileTextIcon size={14} />
            <span className="text-xs">Notes</span>
          </Button>
        </div>
      </div>
      
      <div className="flex-1 overflow-auto">
        <ScrollArea className="h-[calc(100vh-250px)]">
          {chatHistory.length === 0 ? (
            <div className="text-muted-foreground text-sm p-3">
              No chat history yet
            </div>
          ) : (
            <div className="p-3 space-y-4">
              {/* Today's Chats */}
              {groupedHistory.today.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium mb-2 text-muted-foreground">Today</h3>
                  <div className="space-y-1">
                    {groupedHistory.today.map((chat) => (
                      <div
                        key={chat.index}
                        className={`flex items-center gap-2 p-2 rounded-md text-sm cursor-pointer hover:bg-muted transition-colors ${
                          activeChat === chat.index ? 'bg-muted/80 font-medium' : ''
                        }`}
                        onClick={() => onSelectChat && onSelectChat(chat.index)}
                      >
                        {typeIcons[chat.type] || <MessageSquareIcon size={16} className="flex-shrink-0" />}
                        <span className="truncate flex-1">
                          {formatChatTitle(chat)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Yesterday's Chats */}
              {groupedHistory.yesterday.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium mb-2 text-muted-foreground">Yesterday</h3>
                  <div className="space-y-1">
                    {groupedHistory.yesterday.map((chat) => (
                      <div
                        key={chat.index}
                        className={`flex items-center gap-2 p-2 rounded-md text-sm cursor-pointer hover:bg-muted transition-colors ${
                          activeChat === chat.index ? 'bg-muted/80 font-medium' : ''
                        }`}
                        onClick={() => onSelectChat && onSelectChat(chat.index)}
                      >
                        {typeIcons[chat.type] || <MessageSquareIcon size={16} className="flex-shrink-0" />}
                        <span className="truncate flex-1">
                          {formatChatTitle(chat)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Older Chats */}
              {groupedHistory.older.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium mb-2 text-muted-foreground">Older</h3>
                  <div className="space-y-1">
                    {groupedHistory.older.map((chat) => (
                      <div
                        key={chat.index}
                        className={`flex items-center gap-2 p-2 rounded-md text-sm cursor-pointer hover:bg-muted transition-colors ${
                          activeChat === chat.index ? 'bg-muted/80 font-medium' : ''
                        }`}
                        onClick={() => onSelectChat && onSelectChat(chat.index)}
                      >
                        {typeIcons[chat.type] || <MessageSquareIcon size={16} className="flex-shrink-0" />}
                        <span className="truncate flex-1">
                          {formatChatTitle(chat)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </ScrollArea>
      </div>
      
      <div className="p-3 border-t">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-medium">
            U
          </div>
          <div className="text-sm font-medium">User</div>
        </div>
      </div>
    </div>
  );
}