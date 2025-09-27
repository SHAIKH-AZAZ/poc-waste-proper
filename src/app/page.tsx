"use client";
import FileUpload from "@/components/customs/FileUpload";
import { useState } from "react";
import { handleFileUpload as uploadHandler } from "@/utils/fileHandlers";
import { HeadDemo } from "@/components/customs/Heading";
import ExcelUploader from "@/components/customs/ExcelUploader";
import ExcelPreviewTable from "@/components/customs/ExcelPreviewTable";


export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [parsedData, setParsedData] = useState<any[] | null>(null);

  return (
    <div className="flex flex-col items-center mx-auto mt-10">
      <div>
        <HeadDemo />
      </div>

      {/* Parsed Data Preview */}
      <ExcelUploader onDataParsed={setParsedData} />

      {parsedData && <ExcelPreviewTable data={parsedData}  />}
    </div>
  );
}
