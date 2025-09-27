"use client";
import FileUpload from "@/components/customs/FileUpload";
import { useState } from "react";
import { handleFileUpload as uploadHandler } from "@/utils/fileHandlers";
import { HeadDemo } from "@/components/customs/Heading";
import ExcelUploader from "@/components/customs/ExcelUploader";

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [parsedData, setParsedData] = useState(null);

  return (
    <div className="flex flex-col items-center mx-auto mt-10">
      <div>
        <HeadDemo />
      </div>


      {/* Excel Uploader */}
      <ExcelUploader onDataParsed={setParsedData} />

      {/* Parsed Data Preview */}
      <div className="p-6 max-w-md mx-auto mt-10">
        <p>Total Rows : {parsedData?.length}</p>
        <p>Total Columns: {parsedData && parsedData.length > 0 ? Object.keys(parsedData[0]).length : 0}</p>
      </div>
    </div>
  );
}
