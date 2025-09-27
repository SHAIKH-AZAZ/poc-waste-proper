"use client";
import FileUpload from "@/components/customs/FileUpload";
import { useState } from "react";
import { handleFileUpload as uploadHandler } from "@/utils/fileHandlers";
import { HeadDemo } from "@/components/customs/Heading";
import ExcelUploader from "@/components/customs/ExcelUploader";

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [parsedData, setParsedData] = useState<any[] | null>(null);

  return (
    <div className="flex flex-col items-center mx-auto mt-10">
      <div>
        <HeadDemo />
      </div>


      {/* Excel Uploader */}
      <ExcelUploader onDataParsed={setParsedData} />

      {/* Parsed Data Preview */}
      <div className="p-6 max-w-md mx-auto mt-10">
        {parsedData && (
          <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto max-h-64">
            {JSON.stringify(parsedData, null, 2)}
          </pre>
        )}
      </div>
    </div>
  );
}
