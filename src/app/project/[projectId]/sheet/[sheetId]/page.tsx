"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { IconArrowLeft, IconRecycle } from "@tabler/icons-react";
import ExcelPreviewTable from "@/components/customs/ExcelPreviewTable";
import DiaFilter from "@/components/customs/DiaFilter";
import FileInfoCard from "@/components/customs/FileInfoCard";
import CuttingStockResults from "@/components/customs/CuttingStockResults";
import { transformToDisplayFormat, filterDisplayDataByDia } from "@/utils/barCodeUtils";
import { CuttingStockPreprocessor } from "@/utils/cuttingStockPreprocessor";
import { getWorkerManager } from "@/utils/workerManager";
import { sanitizeExcelData } from "@/utils/sanitizeData";
import type { BarCuttingDisplay } from "@/types/BarCuttingRow";
import type { CuttingStockResult, WastePiece } from "@/types/CuttingStock";
import { exportAllDiasToExcel } from "@/utils/exportAllDias";
import { WASTE_MIN_LENGTH_MM } from "@/constants/config";

interface AvailableWasteForDia {
  dia: number;
  pieces: WastePiece[];
  totalLength: number;
  totalPieces: number;
}

export default function SheetPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  const sheetId = params.sheetId as string;

  const [sheetInfo, setSheetInfo] = useState<{
    sheetNumber: number;
    fileName: string;
    status: string;
  } | null>(null);
  const [displayData, setDisplayData] = useState<BarCuttingDisplay[] | null>(null);
  const [selectedDia, setSelectedDia] = useState<number | null>(null);
  const [greedyResult, setGreedyResult] = useState<CuttingStockResult | null>(null);
  const [dynamicResult, setDynamicResult] = useState<CuttingStockResult | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [greedyProgress, setGreedyProgress] = useState({ stage: "", percentage: 0 });
  const [dynamicProgress, setDynamicProgress] = useState({ stage: "", percentage: 0 });
  const [calculationError, setCalculationError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Waste reuse state
  const [availableWaste, setAvailableWaste] = useState<AvailableWasteForDia[]>([]);
  const [showWastePrompt, setShowWastePrompt] = useState(false);
  const [useWaste, setUseWaste] = useState(false);
  const [wasteForCurrentDia, setWasteForCurrentDia] = useState<WastePiece[]>([]);

  // Download all state
  const [isDownloadingAll, setIsDownloadingAll] = useState(false);

  // Load sheet data
  const loadSheetData = useCallback(async () => {
    setLoading(true);
    try {
      // Get sheet info
      const sheetsRes = await fetch(`/api/sheets?projectId=${projectId}`);
      const sheetsData = await sheetsRes.json();
      if (sheetsData.success) {
        const sheet = sheetsData.sheets.find((s: { id: number }) => s.id === parseInt(sheetId));
        if (sheet) {
          setSheetInfo({
            sheetNumber: sheet.sheetNumber,
            fileName: sheet.fileName,
            status: sheet.status,
          });

          // Load Excel data from MongoDB
          if (sheet.mongoDataId) {
            const excelRes = await fetch(`/api/excel-data?mongoDataId=${sheet.mongoDataId}`);
            const excelData = await excelRes.json();
            if (excelData.success) {
              const sanitizedData = sanitizeExcelData(excelData.data);
              const transformed = transformToDisplayFormat(sanitizedData);
              setDisplayData(transformed);
            }
          }
        }
      }

      // Load available waste for this project (exclude waste from current sheet)
      const wasteRes = await fetch(`/api/waste?projectId=${projectId}&status=available`);
      const wasteData = await wasteRes.json();
      if (wasteData.success && wasteData.waste) {
        // Filter out waste from current sheet and group by dia
        const wasteByDia: Record<number, WastePiece[]> = {};
        wasteData.waste.forEach((w: { 
          id: number; 
          dia: number; 
          length: number; 
          sourceSheetId?: number; 
          sourceBarNumber?: number;
          sourceSheet?: { id: number; sheetNumber: number; fileName: string };
          cutsOnSourceBar?: { barCode: string; length: number; element: string }[];
        }) => {
          // Exclude waste from current sheet
          const sourceId = w.sourceSheetId || w.sourceSheet?.id;
          if (sourceId === parseInt(sheetId)) return;
          
          if (!wasteByDia[w.dia]) wasteByDia[w.dia] = [];
          wasteByDia[w.dia].push({
            id: String(w.id),
            projectId: parseInt(projectId),
            sourceSheetId: sourceId || 0,
            sourceSheetNumber: w.sourceSheet?.sheetNumber || 0,
            sourceSheetName: w.sourceSheet?.fileName || `Sheet #${w.sourceSheet?.sheetNumber}`,
            sourceBarNumber: w.sourceBarNumber || 0,
            sourcePatternId: "",
            cutsOnSourceBar: w.cutsOnSourceBar || [],
            dia: w.dia,
            length: w.length,
            status: "available",
            createdAt: new Date(),
          });
        });

        const grouped: AvailableWasteForDia[] = Object.entries(wasteByDia).map(([dia, pieces]) => ({
          dia: parseInt(dia),
          pieces,
          totalLength: pieces.reduce((sum, p) => sum + p.length, 0),
          totalPieces: pieces.length,
        }));

        setAvailableWaste(grouped);
        console.log(`[Sheet] Loaded ${grouped.length} dia groups with available waste:`, grouped);
      } else {
        console.log(`[Sheet] No waste data or empty:`, wasteData);
      }
    } catch (err) {
      setCalculationError(err instanceof Error ? err.message : "Failed to load sheet data");
    } finally {
      setLoading(false);
    }
  }, [projectId, sheetId]);

  useEffect(() => {
    loadSheetData();
  }, [loadSheetData]);

  // Filter display data
  const filteredDisplayData = useMemo(() => {
    if (!displayData) return null;
    if (selectedDia === null) return displayData;
    return filterDisplayDataByDia(displayData, selectedDia);
  }, [displayData, selectedDia]);

  // Handle Dia selection
  const handleDiaSelect = useCallback(
    async (dia: number | null) => {
      setSelectedDia(dia);
      setGreedyResult(null);
      setDynamicResult(null);
      setGreedyProgress({ stage: "", percentage: 0 });
      setDynamicProgress({ stage: "", percentage: 0 });
      setCalculationError(null);
      setUseWaste(false);

      if (dia !== null && displayData) {
        // STEP 1: Check if result already exists in database
        try {
          const existingRes = await fetch(`/api/results?sheetId=${sheetId}`);
          const existingData = await existingRes.json();
          
          if (existingData.success && existingData.results) {
            const existingResult = existingData.results.find(
              (r: { dia: number }) => r.dia === dia
            );
            
            if (existingResult) {
              console.log(`[Sheet] Found existing result for dia ${dia} in database`);
              // Load existing result - convert to CuttingStockResult format
              const loadedResult: CuttingStockResult = {
                algorithm: existingResult.algorithm,
                dia: existingResult.dia,
                patterns: existingResult.patterns || [],
                totalBarsUsed: existingResult.totalBarsUsed,
                totalWaste: existingResult.totalWaste,
                averageUtilization: existingResult.averageUtilization,
                executionTime: existingResult.executionTime,
                summary: existingResult.summary || {
                  totalStandardBars: existingResult.totalBarsUsed,
                  totalWasteLength: existingResult.totalWaste,
                  totalWastePercentage: 0,
                  averageUtilization: existingResult.averageUtilization,
                  patternCount: existingResult.patterns?.length || 0,
                  totalCutsProduced: 0,
                },
                detailedCuts: existingResult.detailedCuts || [],
              };
              
              // Set as the result for the winning algorithm
              if (existingResult.algorithm === "greedy") {
                setGreedyResult(loadedResult);
              } else {
                setDynamicResult(loadedResult);
              }
              
              // Check if waste was used (by looking at detailedCuts)
              const usedWasteCount = loadedResult.detailedCuts?.filter(
                (d) => d.isFromWaste
              ).length || 0;
              if (usedWasteCount > 0) {
                setUseWaste(true);
                setWasteForCurrentDia([]); // We don't have the original waste pieces, just indicate it was used
              }
              
              return; // Don't recalculate
            }
          }
        } catch (err) {
          console.error(`[Sheet] Error checking existing results:`, err);
          // Continue to calculation if check fails
        }

        // STEP 2: No existing result - check for available waste
        try {
          const wasteRes = await fetch(`/api/waste?projectId=${projectId}&status=available`);
          const wasteData = await wasteRes.json();
          
          let freshWasteForDia: WastePiece[] = [];
          
          if (wasteData.success && wasteData.waste) {
            // Filter out waste from current sheet and get only matching dia
            freshWasteForDia = wasteData.waste
              .filter((w: { 
                dia: number; 
                sourceSheetId?: number; 
                sourceSheet?: { id: number };
              }) => {
                const sourceId = w.sourceSheetId || w.sourceSheet?.id;
                return w.dia === dia && sourceId !== parseInt(sheetId);
              })
              .map((w: { 
                id: number; 
                dia: number; 
                length: number; 
                sourceSheetId?: number; 
                sourceBarNumber?: number;
                sourceSheet?: { id: number; sheetNumber: number; fileName: string };
                cutsOnSourceBar?: { barCode: string; length: number; element: string }[];
              }) => ({
                id: String(w.id),
                projectId: parseInt(projectId),
                sourceSheetId: w.sourceSheetId || w.sourceSheet?.id || 0,
                sourceSheetNumber: w.sourceSheet?.sheetNumber || 0,
                sourceSheetName: w.sourceSheet?.fileName || `Sheet #${w.sourceSheet?.sheetNumber}`,
                sourceBarNumber: w.sourceBarNumber || 0,
                sourcePatternId: "",
                cutsOnSourceBar: w.cutsOnSourceBar || [],
                dia: w.dia,
                length: w.length,
                status: "available" as const,
                createdAt: new Date(),
              }));
            
            console.log(`[Sheet] Fresh waste check for dia ${dia}: ${freshWasteForDia.length} pieces available`);
          }

          if (freshWasteForDia.length > 0) {
            // Show waste prompt if there's available waste from OTHER sheets
            setWasteForCurrentDia(freshWasteForDia);
            setShowWastePrompt(true);
          } else {
            // No waste available, run calculation directly
            console.log(`[Sheet] No waste available for dia ${dia}, running with new bars only`);
            runCalculation(dia, false, []);
          }
        } catch (err) {
          console.error(`[Sheet] Error checking waste:`, err);
          // On error, just run without waste
          runCalculation(dia, false, []);
        }
      }
    },
    [displayData, sheetInfo, projectId, sheetId]
  );

  // Run calculation
  const runCalculation = async (dia: number, withWaste: boolean, wastePieces: WastePiece[]) => {
    if (!displayData) return;

    setIsCalculating(true);
    setShowWastePrompt(false);
    setUseWaste(withWaste);

    try {
      const preprocessor = new CuttingStockPreprocessor();
      const requests = preprocessor.convertToCuttingRequests(displayData);

      console.log(`[Sheet] Starting calculation for dia ${dia}, useWaste: ${withWaste}`);
      if (withWaste) {
        console.log(`[Sheet] Available waste pieces: ${wastePieces.length}`);
        wastePieces.forEach((w, i) => console.log(`  [${i}] ${w.length}mm from sheet ${w.sourceSheetId}`));
      }

      // Run both algorithms with waste pieces if enabled
      const workerManager = getWorkerManager();
      const { greedy: greedyRes, dynamic: dynamicRes } = await workerManager.runBoth(
        requests, 
        dia, 
        {
          greedy: (stage, percentage) => setGreedyProgress({ stage, percentage }),
          dynamic: (stage, percentage) => setDynamicProgress({ stage, percentage }),
        },
        withWaste ? wastePieces : undefined
      );

      console.log("[Sheet] Calculation complete");
      setGreedyResult(greedyRes);
      setDynamicResult(dynamicRes);

      // Save results (best algorithm only)
      await saveResults(dia, greedyRes, dynamicRes, withWaste ? wastePieces : undefined);
    } catch (error) {
      console.error("[Sheet] Calculation error:", error);
      setCalculationError(error instanceof Error ? error.message : "Calculation failed");
    } finally {
      setIsCalculating(false);
    }
  };

  // Save results to database
  const saveResults = async (
    dia: number,
    greedyRes: CuttingStockResult | null,
    dynamicRes: CuttingStockResult | null,
    usedWastePieces?: WastePiece[]
  ) => {
    try {
      // Extract waste items from the best result
      const bestResult = greedyRes && dynamicRes
        ? greedyRes.totalBarsUsed <= dynamicRes.totalBarsUsed ? greedyRes : dynamicRes
        : greedyRes || dynamicRes;

      console.log(`[Sheet] Best result detailedCuts:`, bestResult?.detailedCuts?.length || 0);

      // Find which waste pieces were ACTUALLY used by the algorithm
      const actuallyUsedWasteIds = new Set<string>();
      bestResult?.detailedCuts?.forEach((cut) => {
        if (cut.isFromWaste && cut.wasteSource?.wasteId) {
          actuallyUsedWasteIds.add(cut.wasteSource.wasteId);
        }
      });
      console.log(`[Sheet] Actually used waste pieces: ${actuallyUsedWasteIds.size}`);

      // Extract waste from each bar's cutting pattern (only from NEW bars, not reused waste)
      const wasteItems = bestResult?.detailedCuts?.map((cut, index) => {
        // Check if this cut is from a waste piece (waste pieces have pattern IDs starting with "waste_")
        const isFromWaste = cut.patternId?.startsWith("waste_") || 
          (cut as { isFromWaste?: boolean }).isFromWaste;
        
        // Convert waste from meters to mm
        const wasteLength = Math.round(cut.waste * 1000);
        console.log(`[Sheet] Bar #${cut.barNumber || index + 1}: waste = ${wasteLength}mm ${isFromWaste ? "(from reused waste)" : "(from new bar)"}`);
        
        // Only track waste from new bars (waste from reused pieces is typically too small)
        if (isFromWaste) return null;
        
        return {
          dia,
          length: wasteLength,
          sourceBarNumber: cut.barNumber || index + 1,
          sourcePatternId: cut.patternId || `pattern-${index}`,
          cutsOnSourceBar: cut.cuts?.map((c) => ({
            barCode: c.barCode,
            length: Math.round(c.length * 1000), // Convert to mm
            element: "",
          })) || [],
        };
      }).filter((w): w is NonNullable<typeof w> => w !== null && w.length >= WASTE_MIN_LENGTH_MM) || [];

      console.log(`[Sheet] Waste items >= 2m: ${wasteItems.length}`);

      // Mark ONLY the actually used waste pieces as used (not all available ones)
      if (usedWastePieces && usedWastePieces.length > 0 && actuallyUsedWasteIds.size > 0) {
        const piecesToMark = usedWastePieces.filter(w => actuallyUsedWasteIds.has(w.id));
        console.log(`[Sheet] Marking ${piecesToMark.length} of ${usedWastePieces.length} waste pieces as used`);
        
        for (const waste of piecesToMark) {
          try {
            await fetch("/api/waste", {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                wasteId: parseInt(waste.id),
                usedInSheetId: parseInt(sheetId),
                usedForBarCode: "multiple",
                cutLength: waste.length,
                remainingLength: 0,
                remainingStatus: "discarded",
              }),
            });
          } catch (err) {
            console.error(`[Sheet] Failed to mark waste ${waste.id} as used:`, err);
          }
        }
      }

      const response = await fetch("/api/results", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sheetId: parseInt(sheetId),
          dia,
          greedyResult: greedyRes,
          dynamicResult: dynamicRes,
          wasteItems,
        }),
      });

      const data = await response.json();
      if (data.success) {
        console.log(`[Sheet] Saved ${data.algorithm} result. Waste saved: ${wasteItems.length} pieces`);
        // Reload waste data after saving
        loadSheetData();
      } else {
        console.error(`[Sheet] Failed to save:`, data.error);
      }
    } catch (err) {
      console.error("[Sheet] Error saving results:", err);
    }
  };

  const formatLength = (mm: number) => `${(mm / 1000).toFixed(2)}m`;

  // Download all dias
  const handleDownloadAllDias = useCallback(async () => {
    if (!displayData || !sheetInfo) return;

    setIsDownloadingAll(true);
    try {
      await exportAllDiasToExcel(displayData, sheetInfo.fileName, () => {});
    } catch (error) {
      console.error("[Sheet] Error downloading all dias:", error);
      setCalculationError(error instanceof Error ? error.message : "Failed to download");
    } finally {
      setIsDownloadingAll(false);
    }
  }, [displayData, sheetInfo]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-500">Loading sheet data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href={`/project/${projectId}`}
            className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 transition-colors mb-4 group"
          >
            <IconArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            Back to Project
          </Link>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20">
              <span className="text-2xl font-bold text-white">#{sheetInfo?.sheetNumber}</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{sheetInfo?.fileName}</h1>
              <p className="text-slate-500 mt-1">Sheet #{sheetInfo?.sheetNumber} • <span className="capitalize">{sheetInfo?.status}</span></p>
            </div>
          </div>
        </div>

        {/* Error */}
        {calculationError && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-red-600 text-lg">!</span>
            </div>
            <p className="text-red-700">{calculationError}</p>
          </div>
        )}

        {/* Waste Prompt Modal */}
        {showWastePrompt && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 p-6 animate-in fade-in zoom-in duration-200">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-emerald-400 to-green-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
                  <IconRecycle className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Reuse Waste?</h2>
                  <p className="text-sm text-slate-500">Available waste for Dia {selectedDia}mm</p>
                </div>
              </div>

              <div className="bg-slate-50 rounded-xl p-4 mb-4 max-h-48 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-slate-500">
                      <th className="pb-2 font-medium">Length</th>
                      <th className="pb-2 font-medium">Source Sheet</th>
                      <th className="pb-2 font-medium">From Bar #</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {wasteForCurrentDia.slice(0, 10).map((w, i) => (
                      <tr key={i}>
                        <td className="py-2.5 font-semibold text-slate-900">{formatLength(w.length)}</td>
                        <td className="py-2.5 text-slate-600">
                          <div>Sheet #{w.sourceSheetNumber || w.sourceSheetId}</div>
                          {w.sourceSheetName && <div className="text-xs text-slate-400 truncate max-w-[120px]">{w.sourceSheetName}</div>}
                        </td>
                        <td className="py-2.5 text-slate-600">Bar #{w.sourceBarNumber || "?"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {wasteForCurrentDia.length > 10 && (
                  <p className="text-sm text-slate-500 mt-3 text-center">+{wasteForCurrentDia.length - 10} more pieces</p>
                )}
              </div>

              <div className="bg-blue-50 rounded-xl p-4 mb-6 border border-blue-100">
                <p className="text-sm text-blue-800">
                  <span className="font-bold">{wasteForCurrentDia.length}</span> pieces available,{" "}
                  <span className="font-bold">{formatLength(wasteForCurrentDia.reduce((sum, w) => sum + w.length, 0))}</span> total length
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => runCalculation(selectedDia!, false, [])}
                  className="flex-1 px-4 py-3 border-2 border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 transition-all font-medium"
                >
                  Use New Bars Only
                </button>
                <button
                  onClick={() => runCalculation(selectedDia!, true, wasteForCurrentDia)}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-xl hover:from-emerald-600 hover:to-green-700 transition-all font-medium shadow-lg shadow-emerald-500/20"
                >
                  Yes, Reuse Waste
                </button>
              </div>
            </div>
          </div>
        )}

        {/* File Info */}
        {displayData && sheetInfo && (
          <FileInfoCard
            fileName={sheetInfo.fileName}
            rows={filteredDisplayData || displayData}
            headers={Object.keys(displayData[0] || {})}
            jsonData={filteredDisplayData || displayData}
            clearData={() => {}}
            downloadResults={() => {}}
            selectedDia={selectedDia}
            totalRows={displayData.length}
            datasetSizeInfo={{
              fileSizeMB: 1,
              estimatedMemoryUsageMB: displayData.length * 0.001,
              isLargeDataset: displayData.length > 500,
              isVeryLargeDataset: displayData.length > 2000,
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

        {/* Waste Usage Indicator */}
        {useWaste && selectedDia && (
          <div className="w-full max-w-7xl mx-auto p-4 bg-gradient-to-r from-emerald-50 to-green-50 border border-emerald-200 rounded-xl shadow-sm mb-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
                <IconRecycle className="w-4 h-4 text-emerald-600" />
              </div>
              <span className="text-emerald-700 font-medium">
                Using {wasteForCurrentDia.length} waste pieces from previous sheets
              </span>
            </div>
          </div>
        )}

        {/* Results */}
        {selectedDia && (
          <CuttingStockResults
            greedyResult={greedyResult}
            dynamicResult={dynamicResult}
            isLoading={isCalculating}
            fileName={sheetInfo?.fileName || ""}
            greedyProgress={greedyProgress}
            dynamicProgress={dynamicProgress}
          />
        )}

        {/* Data Preview */}
        {filteredDisplayData && <ExcelPreviewTable data={filteredDisplayData} selectedDia={selectedDia} />}
      </div>
    </div>
  );
}
