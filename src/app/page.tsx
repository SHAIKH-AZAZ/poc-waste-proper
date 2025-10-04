"use client";
import { useState, useMemo } from "react";
import { HeadDemo } from "@/components/customs/Heading";
import ExcelUploader from "@/components/customs/ExcelUploader";
import ExcelPreviewTable from "@/components/customs/ExcelPreviewTable";
import ExcelFormatGuide from "@/components/customs/ExcelFormatGuide";
import DiaFilter from "@/components/customs/DiaFilter";
import FileInfoCard from "@/components/customs/FileInfoCard";
import { clearData, downloadResults } from "@/utils/dataUtils";
import { filterDataByDia } from "@/utils/dataFilters";
import type { BarCuttingRaw } from "@/types/BarCuttingRow";

export default function Home() {
  const [fileName, setFileName] = useState<string>("");
  const [parsedData, setParsedData] = useState<BarCuttingRaw[] | null>(null);
  const [selectedDia, setSelectedDia] = useState<number | null>(null);

  const handleClearData = () => {
    clearData(setParsedData, setFileName);
    setSelectedDia(null);
  };

  const handleDataParsed = (data: BarCuttingRaw[], name: string) => {
    setParsedData(data);
    setFileName(name);
    setSelectedDia(null); // Reset filter when new data is loaded
  };

  // Filter data based on selected Dia
  const filteredData = useMemo(() => {
    if (!parsedData) return null;
    if (selectedDia === null) return parsedData;
    return filterDataByDia(parsedData, selectedDia);
  }, [parsedData, selectedDia]);

  const handleDownloadResults = () => {
    if (filteredData) {
      const downloadFileName = selectedDia
        ? `${fileName.replace('.xlsx', '').replace('.xls', '')}_Dia_${selectedDia}.json`
        : `${fileName.replace('.xlsx', '').replace('.xls', '')}.json`;
      downloadResults(filteredData, downloadFileName);
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
      {parsedData && fileName && (
        <FileInfoCard
          fileName={fileName}
          rows={filteredData || parsedData}
          headers={Object.keys(parsedData[0] || {})}
          jsonData={filteredData || parsedData}
          clearData={handleClearData}
          downloadResults={handleDownloadResults}
          selectedDia={selectedDia}
          totalRows={parsedData.length}
          datasetSizeInfo={{
            fileSizeMB: 1.2, // optional: calculate dynamically
            estimatedMemoryUsageMB:
              (filteredData || parsedData).length *
              Object.keys(parsedData[0] || {}).length *
              0.001,
            isLargeDataset: (filteredData || parsedData).length > 500,
            isVeryLargeDataset: (filteredData || parsedData).length > 2000,
          }}
        />
      )}

      {/* Dia Filter */}
      {parsedData && (
        <DiaFilter
          data={parsedData}
          selectedDia={selectedDia}
          onDiaSelect={setSelectedDia}
        />
      )}

      {/* Filtered Data Preview */}
      {filteredData && <ExcelPreviewTable data={filteredData} selectedDia={selectedDia} />}
    </div>
  );
}
