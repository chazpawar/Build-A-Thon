"use client";

import { useState, useRef } from "react";
import { ArrowRight, Upload, RefreshCw, Copy, Download, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Summarize() {
  const [inputText, setInputText] = useState("");
  const [summary, setSummary] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [showSummarySection, setShowSummarySection] = useState(false);
  const fileInputRef = useRef(null); // Ref for the file input
  const [copyButtonText, setCopyButtonText] = useState("COPY");

  const handleTextChange = (e) => {
    setInputText(e.target.value);
    if (uploadedFile) {
      // Clear file if user starts typing manually
      setUploadedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = ""; // Reset file input visually
      }
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setUploadedFile(file);
      setInputText(""); // Clear manual text input
      setIsLoading(true); // Show loading while reading file
      setShowSummarySection(false); // Hide summary section while reading new file
      setSummary(""); // Clear previous summary

      const reader = new FileReader();
      reader.onload = (event) => {
        setInputText(event.target.result);
        setIsLoading(false); // File reading finished
      };
      reader.onerror = () => {
        console.error("Error reading file");
        // Handle error state, maybe show a toast notification
        setIsLoading(false);
        setUploadedFile(null);
      };
      reader.readAsText(file);
    }
  };

  const handleSummarize = async () => {
    if (!inputText.trim() || isLoading) return;

    setIsLoading(true);
    setShowSummarySection(true); // Make summary section visible
    setSummary(""); // Clear previous summary before fetching new one

    // Simulate API call with timeout
    setTimeout(() => {
      // This is where you would call your actual summarization API
      // Example: const apiSummary = await fetchSummary(inputText);
      const mockSummary = `Summary of "${
        uploadedFile ? uploadedFile.name : "your text"
      }"...\n\nKey points:\n1. This is the first important insight derived from the provided content.\n2. Another crucial takeaway is highlighted here.\n3. Finally, the text concludes with this significant point.\n\nThe overall theme revolves around effective information distillation.`;

      setSummary(mockSummary);
      setIsLoading(false);
    }, 2000);
  };

  const handleReset = () => {
    setInputText("");
    setSummary("");
    setUploadedFile(null);
    setShowSummarySection(false);
    setIsLoading(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = ""; // Reset file input visually
    }
  };

  const handleCopyToClipboard = () => {
    navigator.clipboard.writeText(summary);
    setCopyButtonText("COPIED!");
    setTimeout(() => {
      setCopyButtonText("COPY");
    }, 2000);
    // Optional: Show a toast notification "Copied!"
  };

  const handleDownload = () => {
    const blob = new Blob([summary], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "summary.txt";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Regenerate would likely call handleSummarize again
  const handleRegenerate = () => {
    handleSummarize();
  };

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6 lg:p-8 space-y-8">
      {/* Input Section */}
      <div className="bg-white rounded-md shadow-none border-none p-6">
        <div className="space-y-6">
          <div className="bg-indigo-50 rounded-md p-4 flex items-center justify-center">
            <textarea
              value={inputText}
              onChange={handleTextChange}
              className="w-full h-48 bg-transparent border-0 text-indigo-900 placeholder-indigo-400 resize-y focus:ring-0 focus:outline-none"
              placeholder="Paste your text here..."
              disabled={isLoading && !showSummarySection} // Disable textarea while reading file
            ></textarea>
          </div>

          {uploadedFile && !isLoading && (
            <div className="bg-indigo-100 rounded-md p-3 flex items-center justify-between text-sm border border-indigo-200">
              <span className="text-indigo-800 font-medium truncate">
                File: {uploadedFile.name}
              </span>
              {/* Optional: Add a small clear button here if needed */}
            </div>
          )}

          <div className="flex flex-col justify-end sm:flex-row gap-4 items-center">
            <Button
              onClick={handleSummarize}
              disabled={!inputText.trim()}
              className="w-full sm:w-auto border-none shadow-none hover:text-indigo-700 bg-indigo-700 hover:bg-white cursor-pointer font-mono"
              size="lg"
            >
              SUMMARIZE
            </Button>

            <Button
              variant="secondary"
              size="lg"
              className="w-full sm:w-auto text-indigo-600 hover:bg-white hover:text-indigo-700 cursor-pointer font-mono"
              asChild
            >
              <label className="flex items-center justify-center gap-2">
                {uploadedFile ? "CHANGE FILE" : "UPLOAD FILE"}
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileUpload}
                  className="hidden"
                  accept=".txt,.pdf,.docx" // Adjust accepted file types as needed
                  disabled={isLoading}
                />
              </label>
            </Button>
          </div>
        </div>
      </div>

      {/* Summary Section - Conditionally Rendered */}
      {showSummarySection && (
        <div className="bg-white rounded-lg shadow-none border-none p-6 animate-fade-in">
          <div className="relative bg-indigo-50 rounded-md p-6 min-h-[200px]">
            {summary && !isLoading && (
              <Button
                onClick={handleCopyToClipboard}
                variant="secondary"
                size="sm"
                className="absolute top-2 right-2 text-indigo-600 hover:bg-white hover:text-indigo-700 cursor-pointer font-mono"
              >
                {copyButtonText}
              </Button>
            )}
            {isLoading ? (
              <div className="flex items-center justify-center h-full text-center py-10">
                <RefreshCw
                  size={24}
                  className="animate-spin text-indigo-500"
                />
                <span className="ml-3 text-indigo-600">
                  Generating your summary... please wait.
                </span>
              </div>
            ) : summary ? (
              <div className="whitespace-pre-line text-indigo-900 leading-relaxed">
                {summary}
              </div>
            ) : (
              <p className="text-indigo-400 italic text-center py-10">
                Something went wrong, or the summary is empty.
              </p>
            )}
          </div>

          {!isLoading && summary && (
            <div className="mt-6">
              <div className="flex flex-wrap justify-end gap-3">
                
                <Button
                  onClick={handleDownload}
                  variant="secondary"
                  size="lg"
                  className="w-full sm:w-auto text-indigo-600 hover:bg-white hover:text-indigo-700 cursor-pointer font-mono"
                >
                  DOWNLOAD
                </Button>
                <Button
                  onClick={handleRegenerate}
                  variant="secondary"
                  size="lg"
                  className="w-full sm:w-auto text-indigo-600 hover:bg-white hover:text-indigo-700 cursor-pointer font-mono"
                >
                  REGENERATE
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
      {/* Add a simple fade-in animation */}
      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in {
          animation: fadeIn 0.5s ease-out forwards;
        }
      `}</style>
    </div>
  );
}
