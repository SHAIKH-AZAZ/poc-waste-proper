"use client";
import { useState, useMemo, useCallback } from "react";
import { HeadDemo } from "@/components/customs/Heading";
import ExcelUploader from "@/components/customs/ExcelUploader";
import ExcelPreviewTable from "@/components/customs/ExcelPreviewTable";
import ExcelFormatGuide from "@/components/customs/ExcelFormatGuide";
import DiaFilter from "@/components/customs/DiaFilter";
import FileInfoCard from "@/components/customs/FileInfoCard";
import CuttingStockResults from "@/components/customs/CuttingStockResults";
import { clearData, downloadResults } from "@/utils/dataUtils";
import { transformToDisplayFormat, filterDisplayDataByDia } from "@/utils/barCodeUtils";
import { CuttingStockPreprocessor } from "@/utils/cuttingStockPreprocessor";
import { getWorkerManager } from "@/utils/workerManager";
import { exportAllDiasToExcel } from "@/utils/exportAllDias";
import type { BarCuttingRaw, BarCuttingDisplay } from "@/types/BarCuttingRow";
import type { CuttingStockResult } from "@/types/CuttingStock";

export default function Home() {
  const [fileName, setFileName] = useState<string>("");
  const [parsedData, setParsedData] = useState<BarCuttingRaw[] | null>(null);
  const [displayData, setDisplayData] = useState<BarCuttingDisplay[] | null>(null);
  const [selectedDia, setSelectedDia] = useState<number | null>(null);
  const [greedyResult, setGreedyResult] = useState<CuttingStockResult | null>(null);
  const [dynamicResult, setDynamicResult] = useState<CuttingStockResult | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [greedyProgress, setGreedyProgress] = useState({ stage: "", percentage: 0 });
  const [dynamicProgress, setDynamicProgress] = useState({ stage: "", percentage: 0 });
  const [calculationError, setCalculationError] = useState<string | null>(null);
  const [isDownloadingAll, setIsDownloadingAll] = useState(false);
  const [downloadAllProgress, setDownloadAllProgress] = useState({ current: 0, total: 0, dia: 0 });

  const handleClearData = () => {
    clearData(setParsedData, setFileName);
    setDisplayData(null);
    setSelectedDia(null);
    setGreedyResult(null);
    setDynamicResult(null);
    setGreedyProgress({ stage: "", percentage: 0 });
    setDynamicProgress({ stage: "", percentage: 0 });
  };

  const handleDataParsed = (data: BarCuttingRaw[], name: string) => {
    setParsedData(data);
    const transformed = transformToDisplayFormat(data);
    setDisplayData(transformed);
    setFileName(name);
    setSelectedDia(null);
    setGreedyResult(null);
    setDynamicResult(null);
    setGreedyProgress({ stage: "", percentage: 0 });
    setDynamicProgress({ stage: "", percentage: 0 });
  };

  // Filter display data based on selected Dia
  const filteredDisplayData = useMemo(() => {
    if (!displayData) return null;
    if (selectedDia === null) return displayData;
    return filterDisplayDataByDia(displayData, selectedDia);
  }, [displayData, selectedDia]);

  // Calculate cutting stock when Dia is selected
  const handleDiaSelect = useCallback(async (dia: number | null) => {
    setSelectedDia(dia);
    setGreedyResult(null);
    setDynamicResult(null);
    setGreedyProgress({ stage: "", percentage: 0 });
    setDynamicProgress({ stage: "", percentage: 0 });
    setCalculationError(null);

    if (dia !== null && displayData) {
      setIsCalculating(true);
      
      try {
        // Preprocess data
        const preprocessor = new CuttingStockPreprocessor();
        const requests = preprocessor.convertToCuttingRequests(displayData);
        
        console.log("[Page] Starting calculation with", requests.length, "requests for dia", dia);
        
        // Run both algorithms in Web Workers (parallel execution) with progress tracking
        const workerManager = getWorkerManager();
        const { greedy: greedyRes, dynamic: dynamicRes } = await workerManager.runBoth(
          requests, 
          dia,
          {
            greedy: (stage, percentage) => {
              console.log("[Page] Greedy progress:", stage, percentage);
              setGreedyProgress({ stage, percentage });
            },
            dynamic: (stage, percentage) => {
              console.log("[Page] Dynamic progress:", stage, percentage);
              setDynamicProgress({ stage, percentage });
            }
          }
        );
        
        console.log("[Page] Calculation complete. Greedy:", greedyRes, "Dynamic:", dynamicRes);
        setGreedyResult(greedyRes);
        setDynamicResult(dynamicRes);
      } catch (error) {
        console.error("[Page] Error calculating cutting stock:", error);
        const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
        setCalculationError(errorMessage);
      } finally {
        setIsCalculating(false);
      }
    }
  }, [displayData]);

  const handleDownloadResults = () => {
    if (filteredDisplayData) {
      const downloadFileName = selectedDia
        ? `${fileName.replace('.xlsx', '').replace('.xls', '')}_Dia_${selectedDia}.json`
        : `${fileName.replace('.xlsx', '').replace('.xls', '')}.json`;
      downloadResults(filteredDisplayData, downloadFileName);
    }
  };

  const handleDownloadAllDias = useCallback(async () => {
    if (!displayData) return;

    setIsDownloadingAll(true);
    setDownloadAllProgress({ current: 0, total: 0, dia: 0 });

    try {
      await exportAllDiasToExcel(
        displayData,
        fileName,
        (dia, current, total) => {
          setDownloadAllProgress({ dia, current, total });
        }
      );
    } catch (error) {
      console.error("[Page] Error downloading all dias:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to download all diameters";
      setCalculationError(errorMessage);
    } finally {
      setIsDownloadingAll(false);
      setDownloadAllProgress({ current: 0, total: 0, dia: 0 });
    }
  }, [displayData, fileName]);

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
          onDiaSelect={handleDiaSelect}
          onDownloadAll={handleDownloadAllDias}
          isDownloadingAll={isDownloadingAll}
        />
      )}

      {/* Download All Progress */}
      {isDownloadingAll && (
        <div className="w-full max-w-7xl mx-auto p-6 bg-purple-50 border border-purple-200 rounded-xl shadow-lg mb-6">
          <h3 className="text-lg font-bold text-purple-800 mb-4 flex items-center gap-2">
            <div className="w-5 h-5 border-3 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
            Processing All Diameters...
          </h3>
          <div className="mb-2">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-purple-700">
                Processing Dia {downloadAllProgress.dia} ({downloadAllProgress.current} of {downloadAllProgress.total})
              </span>
              <span className="text-sm font-medium text-purple-700">
                {downloadAllProgress.total > 0 
                  ? Math.round((downloadAllProgress.current / downloadAllProgress.total) * 100)
                  : 0}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
              <div 
                className="bg-purple-500 h-full transition-all duration-300 ease-out"
                style={{ 
                  width: `${downloadAllProgress.total > 0 
                    ? (downloadAllProgress.current / downloadAllProgress.total) * 100 
                    : 0}%` 
                }}
              />
            </div>
          </div>
          <p className="text-sm text-purple-600 mt-3">
            Running calculations for all diameters and generating Excel file...
          </p>
        </div>
      )}

      {/* Error Display */}
      {calculationError && (
        <div className="w-full max-w-7xl mx-auto p-6 bg-red-50 border border-red-200 rounded-xl shadow-lg mb-6">
          <div className="flex items-start gap-3">
            <span className="text-2xl">⚠️</span>
            <div>
              <h3 className="text-lg font-bold text-red-800 mb-2">Calculation Error</h3>
              <p className="text-red-700">{calculationError}</p>
              <button
                onClick={() => setCalculationError(null)}
                className="mt-3 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cutting Stock Results */}
      {selectedDia && (
        <CuttingStockResults
          greedyResult={greedyResult}
          dynamicResult={dynamicResult}
          isLoading={isCalculating}
          fileName={fileName}
          greedyProgress={greedyProgress}
          dynamicProgress={dynamicProgress}
        />
      )}

      {/* Filtered Data Preview */}
      {filteredDisplayData && <ExcelPreviewTable data={filteredDisplayData} selectedDia={selectedDia} />}
    </div>
  );
}
