// ExcelUploader.tsx
"use client";
import React, { useState } from "react";
import FileUpload from "./FileUpload";

interface ExcelUploaderProps {
  onDataParsed: (data: any[]) => void;
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
      console.log(result.data);

      onDataParsed(result.data , file.name); // send data to parent component
      console.log(result.data);
      
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return <FileUpload onFileUpload={handleFileUpload} isLoading={loading} />;
}
