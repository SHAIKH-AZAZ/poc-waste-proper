"use client";
import { useState, useMemo } from "react";
import { HeadDemo } from "@/components/customs/Heading";
import ExcelUploader from "@/components/customs/ExcelUploader";
import ExcelPreviewTable from "@/components/customs/ExcelPreviewTable";
import ExcelFormatGuide from "@/components/customs/ExcelFormatGuide";
import DiaFilter from "@/components/customs/DiaFilter";
import FileInfoCard from "@/components/customs/FileInfoCard";
import { clearData, downloadResults } from "@/utils/dataUtils";
import { transformToDisplayFormat, filterDisplayDataByDia } from "@/utils/barCodeUtils";
import type { BarCuttingRaw, BarCuttingDisplay } from "@/types/BarCuttingRow";

export default function Home() {
  const [fileName, setFileName] = useState<string>("");
  const [parsedData, setParsedData] = useState<BarCuttingRaw[] | null>(null);
  const [displayData, setDisplayData] = useState<BarCuttingDisplay[] | null>(null);
  const [selectedDia, setSelectedDia] = useState<number | null>(null);

  const handleClearData = () => {
    clearData(setParsedData, setFileName);
    setDisplayData(null);
    setSelectedDia(null);
  };

  const handleDataParsed = (data: BarCuttingRaw[], name: string) => {
    setParsedData(data);
    const transformed = transformToDisplayFormat(data);
    setDisplayData(transformed);
    setFileName(name);
    setSelectedDia(null); // Reset filter when new data is loaded
  };

  // Filter display data based on selected Dia
  const filteredDisplayData = useMemo(() => {
    if (!displayData) return null;
    if (selectedDia === null) return displayData;
    return filterDisplayDataByDia(displayData, selectedDia);
  }, [displayData, selectedDia]);

  const handleDownloadResults = () => {
    if (filteredDisplayData) {
      const downloadFileName = selectedDia
        ? `${fileName.replace('.xlsx', '').replace('.xls', '')}_Dia_${selectedDia}.json`
        : `${fileName.replace('.xlsx', '').replace('.xls', '')}.json`;
      downloadResults(filteredDisplayData, downloadFileName);
    }
  };

  return (
    <div className="flex flex-col items-center mx-auto mt-10">
      <div>
        <HeadDemo />
      </div>

      {/* Excel Format Guide */}
      <ExcelFormatGuide />

      {/* {uploading data} */}
      <ExcelUploader onDataParsed={handleDataParsed} />

      {/* Parsed Data Preview */}

      {/* File info card */}
      {displayData && fileName && (
        <FileInfoCard
          fileName={fileName}
          rows={filteredDisplayData || displayData}
          headers={Object.keys(displayData[0] || {})}
          jsonData={filteredDisplayData || displayData}
          clearData={handleClearData}
          downloadResults={handleDownloadResults}
          selectedDia={selectedDia}
          totalRows={displayData.length}
          datasetSizeInfo={{
            fileSizeMB: 1.2, // optional: calculate dynamically
            estimatedMemoryUsageMB:
              (filteredDisplayData || displayData).length *
              Object.keys(displayData[0] || {}).length *
              0.001,
            isLargeDataset: (filteredDisplayData || displayData).length > 500,
            isVeryLargeDataset: (filteredDisplayData || displayData).length > 2000,
          }}
        />
      )}

      {/* Dia Filter */}
      {displayData && (
        <DiaFilter
          data={displayData}
          selectedDia={selectedDia}
          onDiaSelect={setSelectedDia}
        />
      )}

      {/* Filtered Data Preview */}
      {filteredDisplayData && <ExcelPreviewTable data={filteredDisplayData} selectedDia={selectedDia} />}
    </div>
  );
}
