"use client";
import FileUpload from "@/components/customs/FileUpload";
import { useState } from "react";
import { handleFileUpload as uploadHandler } from "@/utils/fileHandlers";
import { HeadDemo } from "@/components/customs/Heading";
import ExcelUploader from "@/components/customs/ExcelUploader";
import ExcelPreviewTable from "@/components/customs/ExcelPreviewTable";
import FileInfoCard, { ExcelRow } from "@/components/customs/FileInfoCard";
import { clearData, downloadResults } from "@/utils/dataUtils";

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [parsedData, setParsedData] = useState<any[] | null>(null);
  const handleClearData = () => clearData(setParsedData, setFileName);

  const handleDataParsed = (data: any[], name: string) => {
    setParsedData(data);
    setFileName(name);
  };
  const handleDownloadResults = () => {
    if (parsedData) downloadResults(parsedData, fileName);
  };

  return (
    <div className="flex flex-col items-center mx-auto mt-10">
      <div>
        <HeadDemo />
      </div>

      {/* {uploading data} */}
      <ExcelUploader onDataParsed={handleDataParsed} />

      {/* Parsed Data Preview */}

      {/* File info card */}
      {parsedData && fileName && (
        <FileInfoCard
          fileName={fileName}
          rows={parsedData}
          headers={Object.keys(parsedData[0] || {})}
          jsonData={parsedData}
          clearData={handleClearData}
          downloadResults={handleDownloadResults}
          datasetSizeInfo={{
            fileSizeMB: 1.2, // optional: calculate dynamically
            estimatedMemoryUsageMB:
              parsedData.length *
              Object.keys(parsedData[0] || {}).length *
              0.001,
            isLargeDataset: parsedData.length > 500,
            isVeryLargeDataset: parsedData.length > 2000,
          }}
        />
      )}

      {parsedData && <ExcelPreviewTable data={parsedData} />}
    </div>
  );
}
