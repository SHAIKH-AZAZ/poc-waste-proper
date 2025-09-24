// components/FileUpload.tsx
"use client";

import React, { useRef, useState } from "react";

interface FileUploadProps {
  onFileUpload: (file: File) => void;
  isLoading: boolean;
  acceptedFormats?: string; // optional: default to Excel
}

export default function FileUpload({
  onFileUpload,
  isLoading,
  acceptedFormats = ".xlsx,.xls",
}: FileUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFileName(file.name);
      onFileUpload(file);
    }
  };

  // Drag & drop handlers
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => setDragOver(false);

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      setFileName(file.name);
      onFileUpload(file);
    }
  };

  const handleClick = () => fileInputRef.current?.click();

  return (
    <div className="flex flex-col items-center">
      <div
        className={`w-full cursor-pointer flex flex-col items-center justify-center px-6 py-12 border-2 border-dashed rounded-xl
          transition-all duration-300 ease-in-out
          ${dragOver ? "border-blue-500 bg-blue-50" : "border-gray-300 bg-white"}
          hover:shadow-md`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        {/* Cloud Icon */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="w-12 h-12 text-blue-500 mb-3"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M7 16a4 4 0 01.88-7.9A5 5 0 1117 13h-1m-4 4V9m0 0l-3 3m3-3l3 3"
          />
        </svg>

        <span className="text-sm font-medium text-gray-700 mb-1">
          Click to upload or drag & drop
        </span>
        <span className="text-xs text-gray-500">
          Supports {acceptedFormats.replaceAll(",", ", ")} files
        </span>
      </div>

      <input
        type="file"
        ref={fileInputRef}
        accept={acceptedFormats}
        onChange={handleFileChange}
        disabled={isLoading}
        className="hidden"
      />

      {/* File Name Preview */}
      {fileName && !isLoading && (
        <p className="mt-3 text-sm text-gray-600">
          Selected File: <span className="font-medium text-gray-800">{fileName}</span>
        </p>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="flex justify-center mt-5">
          <div className="flex items-center space-x-2 text-blue-600">
            <span className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></span>
            <p className="text-sm font-medium">Loading your file...</p>
          </div>
        </div>
      )}
    </div>
  );
}
