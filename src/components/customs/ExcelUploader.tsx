"use client";

import React, { useState } from "react";
import FileUpload from "./FileUpload";
import { parseExcelFile } from "@/utils/excelParser";

interface ExcelUploaderProps {
  onDataParsed: (data: any[]) => void;
}

export default function ExcelUploader({ onDataParsed }: ExcelUploaderProps) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any[] | null>(null);

  const handleFileUpload = async (file: File) => {
    setLoading(true);
    try {
      const json = await parseExcelFile(file);
      setData(json);
      onDataParsed(json);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };
  return (
  <div>
    <FileUpload onFileUpload={handleFileUpload} isLoading={loading}>
      {data && (
        <div className="mt-6">
          <h2 className="font-bold mb-2"></h2>
          <pre className="font-bold mb-2 rounded text-sm overflow-auto max-h-64">
            {JSON.stringify(data, null, 2)}
          </pre>
        </div>
      )}
    </FileUpload>
  </div>)
}
