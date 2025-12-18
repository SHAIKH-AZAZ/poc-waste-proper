"use client";
import { Suspense, useState, useMemo, useCallback, useEffect } from "react";
import { useSearchParams } from "next/navigation";
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
import { sanitizeExcelData } from "@/utils/sanitizeData";
import type { BarCuttingRaw, BarCuttingDisplay } from "@/types/BarCuttingRow";
import type { CuttingStockResult } from "@/types/CuttingStock";

function HomeContent() {
  const searchParams = useSearchParams();
  const projectId = searchParams.get("projectId");

  const [fileName, setFileName] = useState<string>("");
  const [, setParsedData] = useState<BarCuttingRaw[] | null>(null);
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
  const [isLoadingProject, setIsLoadingProject] = useState(false);
  const [currentProjectId, setCurrentProjectId] = useState<number | null>(null);
  const [resultsFromCache, setResultsFromCache] = useState(false);

  // Load project data when projectId is in URL
  useEffect(() => {
    const loadProjectData = async () => {
      if (!projectId) return;

      setIsLoadingProject(true);
      setCalculationError(null);

      try {
        // First, get project info
        const projectRes = await fetch("/api/projects");
        const projectData = await projectRes.json();
        
        if (!projectData.success) {
          throw new Error("Failed to fetch projects");
        }

        const project = projectData.projects.find((p: { id: number }) => p.id === parseInt(projectId));
        
        if (!project) {
          throw new Error(`Project with ID ${projectId} not found`);
        }

        if (!project.mongoDataId) {
          throw new Error("Project has no associated data");
        }

        // Fetch Excel data from MongoDB
        const excelRes = await fetch(`/api/excel-data?mongoDataId=${project.mongoDataId}`);
        const excelData = await excelRes.json();

        if (!excelData.success) {
          throw new Error(excelData.error || "Failed to fetch Excel data");
        }

        console.log(`[Page] Loaded project ${projectId} with ${excelData.data.length} rows`);

        // Process the data
        const sanitizedData = sanitizeExcelData(excelData.data);
        const transformed = transformToDisplayFormat(sanitizedData);

        setParsedData(sanitizedData);
        setDisplayData(transformed);
        setFileName(project.fileName || project.name);
        setCurrentProjectId(parseInt(projectId));
        setSelectedDia(null);
        setGreedyResult(null);
        setDynamicResult(null);

      } catch (err) {
        console.error("[Page] Error loading project:", err);
        setCalculationError(err instanceof Error ? err.message : "Failed to load project");
      } finally {
        setIsLoadingProject(false);
      }
    };

    loadProjectData();
  }, [projectId]);

  const handleClearData = () => {
    clearData(setParsedData, setFileName);
    setDisplayData(null);
    setSelectedDia(null);
    setGreedyResult(null);
    setDynamicResult(null);
    setGreedyProgress({ stage: "", percentage: 0 });
    setDynamicProgress({ stage: "", percentage: 0 });
  };

  const handleDataParsed = (data: BarCuttingRaw[], name: string, projectId?: number) => {
    setParsedData(data);
    const transformed = transformToDisplayFormat(data);
    setDisplayData(transformed);
    setFileName(name);
    setSelectedDia(null);
    setGreedyResult(null);
    setDynamicResult(null);
    setGreedyProgress({ stage: "", percentage: 0 });
    setDynamicProgress({ stage: "", percentage: 0 });
    // Set project ID so calculations can be saved
    if (projectId) {
      setCurrentProjectId(projectId);
      console.log(`[Page] New upload - Project ID set to: ${projectId}`);
    }
  };

  // Filter display data based on selected Dia
  const filteredDisplayData = useMemo(() => {
    if (!displayData) return null;
    if (selectedDia === null) return displayData;
    return filterDisplayDataByDia(displayData, selectedDia);
  }, [displayData, selectedDia]);

  // Save calculation result to database
  const saveResultToDatabase = useCallback(async (
    algorithm: string,
    dia: number,
    result: CuttingStockResult
  ) => {
    if (!currentProjectId) {
      console.log("[Page] No project ID, skipping save");
      return;
    }

    try {
      const response = await fetch("/api/results", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: currentProjectId,
          algorithm,
          dia,
          result
        })
      });

      const data = await response.json();
      if (data.success) {
        console.log(`[Page] Saved ${algorithm} result to database:`, data.resultId);
      } else {
        console.error(`[Page] Failed to save ${algorithm} result:`, data.error);
      }
    } catch (err) {
      console.error(`[Page] Error saving ${algorithm} result:`, err);
    }
  }, [currentProjectId]);

  // Load saved results from database
  const loadSavedResults = useCallback(async (dia: number): Promise<{ greedy: CuttingStockResult | null; dynamic: CuttingStockResult | null }> => {
    if (!currentProjectId) return { greedy: null, dynamic: null };

    try {
      const response = await fetch(`/api/results?projectId=${currentProjectId}`);
      const data = await response.json();
      
      if (!data.success || !data.results) {
        return { greedy: null, dynamic: null };
      }

      // Find results for this specific dia
      const greedyResult = data.results.find(
        (r: { algorithm: string; dia: number }) => r.algorithm === "greedy" && r.dia === dia
      );
      const dynamicResult = data.results.find(
        (r: { algorithm: string; dia: number }) => r.algorithm === "dynamic" && r.dia === dia
      );

      // Convert database format to CuttingStockResult format
      const convertToResult = (
        dbResult: {
          algorithm?: string;
          dia?: number;
          totalBarsUsed: number;
          totalWaste: string | number;
          averageUtilization: string | number;
          executionTime: string | number;
          patterns?: unknown[];
          detailedCuts?: unknown[];
        },
        algorithm: "greedy" | "dynamic",
        diaValue: number
      ): CuttingStockResult | null => {
        if (!dbResult) return null;

        const totalBars = dbResult.totalBarsUsed;
        const totalWaste = parseFloat(String(dbResult.totalWaste));
        const avgUtil = parseFloat(String(dbResult.averageUtilization));
        const patterns = (dbResult.patterns || []) as CuttingStockResult["patterns"];
        const detailedCuts = (dbResult.detailedCuts || []) as CuttingStockResult["detailedCuts"];

        return {
          algorithm,
          dia: diaValue,
          totalBarsUsed: totalBars,
          totalWaste,
          averageUtilization: avgUtil,
          executionTime: parseFloat(String(dbResult.executionTime)),
          patterns,
          detailedCuts,
          summary: {
            totalStandardBars: totalBars,
            totalWasteLength: totalWaste,
            totalWastePercentage: totalBars > 0 ? (totalWaste / (totalBars * 12000)) * 100 : 0,
            averageUtilization: avgUtil,
            patternCount: patterns.length,
            totalCutsProduced: detailedCuts.reduce(
              (sum, d) => sum + (d.cuts?.length || 0),
              0
            ),
          },
        };
      };

      return {
        greedy: convertToResult(greedyResult, "greedy", dia),
        dynamic: convertToResult(dynamicResult, "dynamic", dia),
      };
    } catch (err) {
      console.error("[Page] Error loading saved results:", err);
      return { greedy: null, dynamic: null };
    }
  }, [currentProjectId]);

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
        // First, try to load saved results from database
        if (currentProjectId) {
          console.log(`[Page] Checking for saved results for dia ${dia}...`);
          const savedResults = await loadSavedResults(dia);
          
          if (savedResults.greedy || savedResults.dynamic) {
            console.log("[Page] Found saved results, loading from database");
            setGreedyResult(savedResults.greedy);
            setDynamicResult(savedResults.dynamic);
            setResultsFromCache(true);
            setIsCalculating(false);
            return; // Don't run calculation, use saved results
          }
          setResultsFromCache(false);
          console.log("[Page] No saved results found, running calculation...");
        }

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

        // Auto-save results to database if project is loaded
        if (currentProjectId) {
          if (greedyRes) {
            await saveResultToDatabase("greedy", dia, greedyRes);
          }
          if (dynamicRes) {
            await saveResultToDatabase("dynamic", dia, dynamicRes);
          }
        }
      } catch (error) {
        console.error("[Page] Error calculating cutting stock:", error);
        const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
        setCalculationError(errorMessage);
      } finally {
        setIsCalculating(false);
      }
    }
  }, [displayData, currentProjectId, saveResultToDatabase, loadSavedResults]);

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

      {/* Loading Project Indicator */}
      {isLoadingProject && (
        <div className="w-full max-w-7xl mx-auto p-6 bg-blue-50 border border-blue-200 rounded-xl shadow-lg mb-6">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 border-3 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-blue-700 font-medium">Loading project data...</span>
          </div>
        </div>
      )}

      {/* Project Info Banner */}
      {currentProjectId && !isLoadingProject && (
        <div className="w-full max-w-7xl mx-auto p-4 bg-green-50 border border-green-200 rounded-xl shadow-sm mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-green-600">✓</span>
              <span className="text-green-700 font-medium">
                Viewing Project #{currentProjectId}: {fileName}
              </span>
            </div>
            <button
              onClick={() => {
                window.history.pushState({}, "", "/");
                setCurrentProjectId(null);
                handleClearData();
              }}
              className="text-sm text-green-600 hover:text-green-700 underline"
            >
              Upload New File
            </button>
          </div>
        </div>
      )}

      {/* Excel Format Guide */}
      {!currentProjectId && <ExcelFormatGuide />}

      {/* {uploading data} */}
      {!currentProjectId && <ExcelUploader onDataParsed={handleDataParsed} />}

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

      {/* Cached Results Indicator */}
      {selectedDia && resultsFromCache && (greedyResult || dynamicResult) && (
        <div className="w-full max-w-7xl mx-auto p-3 bg-blue-50 border border-blue-200 rounded-xl shadow-sm mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-blue-500">💾</span>
              <span className="text-blue-700 text-sm">
                Loaded saved results for Dia {selectedDia}
              </span>
            </div>
            <button
              onClick={() => {
                setResultsFromCache(false);
                setGreedyResult(null);
                setDynamicResult(null);
                // Re-trigger calculation
                const dia = selectedDia;
                setSelectedDia(null);
                setTimeout(() => {
                  setSelectedDia(dia);
                }, 100);
              }}
              className="text-xs text-blue-600 hover:text-blue-800 underline"
            >
              Recalculate
            </button>
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

// Loading fallback for Suspense
function HomeLoading() {
  return (
    <div className="flex flex-col items-center mx-auto mt-10">
      <div className="w-full max-w-7xl mx-auto p-6 bg-gray-50 border border-gray-200 rounded-xl shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 border-3 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-gray-600 font-medium">Loading...</span>
        </div>
      </div>
    </div>
  );
}

// Main export wrapped in Suspense for useSearchParams
export default function Home() {
  return (
    <Suspense fallback={<HomeLoading />}>
      <HomeContent />
    </Suspense>
  );
}
