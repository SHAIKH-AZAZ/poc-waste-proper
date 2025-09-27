// ExcelUploader.tsx
"use client";
import React, { useState } from "react";
import FileUpload from "./FileUpload";
import { sanitizeExcelData } from "@/utils/sanitizeData";

interface ExcelUploaderProps {
  onDataParsed: (data: any[], fileName: string) => void;
}

export default function ExcelUploader({ onDataParsed }: ExcelUploaderProps) {
  const [loading, setLoading] = useState(false);

  const handleFileUpload = async (file: File) => {
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Upload failed");
      const result = await res.json();
      const sanitizeData = sanitizeExcelData(result.data);
      onDataParsed(sanitizeData, file.name);
      console.log(result.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return <FileUpload onFileUpload={handleFileUpload} isLoading={loading} />;
}
