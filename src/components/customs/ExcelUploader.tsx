// ExcelUploader.tsx
"use client";
import React, { useState } from "react";
import FileUpload from "./FileUpload";
import { sanitizeExcelData } from "@/utils/sanitizeData";
import { analytics } from "@/utils/analytics";

import { validateHeaders, getHeaderValidationMessage } from "@/utils/excelTemplate";
import type { BarCuttingRaw } from "@/types/BarCuttingRow";

interface ExcelUploaderProps {
  onDataParsed: (data: BarCuttingRaw[], fileName: string) => void;
}

export default function ExcelUploader({ onDataParsed }: ExcelUploaderProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileUpload = async (file: File) => {
    setLoading(true);
    setError(null);
    
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Upload failed");
      const result = await res.json();
      
      // Validate headers first
      if (result.data.length > 0) {
        const headers = Object.keys(result.data[0]);
        const headerValidation = validateHeaders(headers);
        
        if (!headerValidation.isValid) {
          throw new Error(getHeaderValidationMessage(headerValidation));
        }
      }
      
      // Process data through sanitization pipeline
      const finalData = sanitizeExcelData(result.data);
      
      if (finalData.length === 0) {
        throw new Error("No valid data found in Excel file. Please check column headers and data format.");
      }
      
      onDataParsed(finalData, file.name);
      
      // Track successful file processing
      analytics.fileUploaded(file.name, finalData.length, file.size);
      
      console.log("Processed data:", finalData);
      console.log("Original data:", result.data);
    } catch (err) {
      console.error("Upload error:", err);
      const errorMessage = err instanceof Error ? err.message : "Failed to process file";
      setError(errorMessage);
      
      // Track upload errors
      analytics.algorithmError("file_upload", errorMessage, 0);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <FileUpload onFileUpload={handleFileUpload} isLoading={loading} />
      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-700 text-sm font-medium">Error: {error}</p>
          <p className="text-red-600 text-xs mt-1">
            Expected columns: SI no, Label, Dia, Total Bars, Cutting Length, Lap Length, No of lap, Element
          </p>
        </div>
      )}
    </div>
  );
}
