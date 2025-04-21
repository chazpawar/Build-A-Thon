'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { LinkIcon, FileTextIcon, YoutubeIcon } from 'lucide-react';

export function UrlInputDialog({ open, onOpenChange, onSubmit, contentType, defaultYouTube = false }) {
  const [url, setUrl] = useState('');
  const [isYouTubeUrl, setIsYouTubeUrl] = useState(defaultYouTube);
  
  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setUrl('');
      setIsYouTubeUrl(defaultYouTube);
    }
  }, [open, defaultYouTube]);
  
  // Check if the URL is a YouTube URL
  useEffect(() => {
    const isYouTube = url.includes('youtube.com') || url.includes('youtu.be');
    setIsYouTubeUrl(isYouTube);
  }, [url]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (url.trim()) {
      onSubmit(url);
      setUrl('');
      onOpenChange(false);
    }
  };
  
  // Helper function to handle paste from clipboard
  const handlePasteYouTube = async () => {
    try {
      const clipboardText = await navigator.clipboard.readText();
      if (clipboardText.includes('youtube.com') || clipboardText.includes('youtu.be')) {
        setUrl(clipboardText);
      }
    } catch (err) {
      console.error('Failed to read clipboard:', err);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isYouTubeUrl ? (
              <>
                <YoutubeIcon size={18} className="text-red-600" />
                <span>Enter YouTube URL for {contentType}</span>
              </>
            ) : (
              <>
                <LinkIcon size={18} />
                <span>Enter URL for {contentType} content</span>
              </>
            )}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="py-4">
            <div className="mb-4">
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder={isYouTubeUrl ? "https://www.youtube.com/watch?v=..." : "https://example.com"}
                className={`w-full p-2 border rounded-md ${isYouTubeUrl ? 'border-red-300' : ''}`}
                autoFocus
                required
              />
              {isYouTubeUrl && (
                <p className="text-sm text-muted-foreground mt-1">
                  YouTube URL detected. We'll extract and analyze the video content.
                </p>
              )}
            </div>
            
            <div className="flex justify-center">
              <Button 
                type="button" 
                variant="outline" 
                onClick={handlePasteYouTube}
                className="flex items-center gap-2"
              >
                <YoutubeIcon size={16} className="text-red-600" />
                <span>Paste YouTube URL from Clipboard</span>
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={!url.trim()}
              className={isYouTubeUrl ? 'bg-red-600 hover:bg-red-700' : ''}
            >
              {isYouTubeUrl ? 'Analyze YouTube Video' : 'Submit'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function TextInputDialog({ open, onOpenChange, onSubmit, contentType }) {
  const [text, setText] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (text.trim()) {
      onSubmit(text);
      setText('');
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileTextIcon size={18} />
            Enter {contentType} text for summarization
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="py-4">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={`Enter your ${contentType} content here...`}
              className="w-full p-2 border rounded-md resize-none h-[250px]"
              autoFocus
              required
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!text.trim()}>
              Submit
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
} 