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
        wasteData.waste.forEach((w: { id: number; dia: number; length: number; sourceSheetId?: number; sourceSheet?: { id: number; sheetNumber: number; fileName: string } }) => {
          // Exclude waste from current sheet
          const sourceId = w.sourceSheetId || w.sourceSheet?.id;
          if (sourceId === parseInt(sheetId)) return;
          
          if (!wasteByDia[w.dia]) wasteByDia[w.dia] = [];
          wasteByDia[w.dia].push({
            id: String(w.id),
            projectId: parseInt(projectId),
            sourceSheetId: sourceId || 0,
            sourceSheetName: w.sourceSheet?.fileName || "",
            sourceBarNumber: 0,
            sourcePatternId: "",
            cutsOnSourceBar: [],
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
        // Check if waste is available for this dia
        const wasteForDia = availableWaste.find((w) => w.dia === dia);
        console.log(`[Sheet] Checking waste for dia ${dia}:`, wasteForDia);
        
        if (wasteForDia && wasteForDia.pieces.length > 0) {
          // Show waste prompt if there's available waste from OTHER sheets
          setWasteForCurrentDia(wasteForDia.pieces);
          setShowWastePrompt(true);
        } else {
          // No waste available, run calculation directly
          runCalculation(dia, false, []);
        }
      }
    },
    [displayData, availableWaste, sheetInfo]
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
      }).filter((w): w is NonNullable<typeof w> => w !== null && w.length >= 2000) || [];

      console.log(`[Sheet] Waste items >= 2m: ${wasteItems.length}`);

      // Mark used waste pieces as used
      if (usedWastePieces && usedWastePieces.length > 0) {
        console.log(`[Sheet] Marking ${usedWastePieces.length} waste pieces as used`);
        for (const waste of usedWastePieces) {
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href={`/project/${projectId}`}
            className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 mb-4"
          >
            <IconArrowLeft className="w-4 h-4" />
            Back to Project
          </Link>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center">
              <span className="text-xl font-bold text-blue-600">#{sheetInfo?.sheetNumber}</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{sheetInfo?.fileName}</h1>
              <p className="text-gray-500">Sheet #{sheetInfo?.sheetNumber} • {sheetInfo?.status}</p>
            </div>
          </div>
        </div>

        {/* Error */}
        {calculationError && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700">{calculationError}</p>
          </div>
        )}

        {/* Waste Prompt Modal */}
        {showWastePrompt && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                  <IconRecycle className="w-5 h-5 text-green-600" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900">Reuse Waste from Previous Sheets?</h2>
              </div>

              <p className="text-gray-600 mb-4">
                Available waste pieces for Dia {selectedDia}mm:
              </p>

              <div className="bg-gray-50 rounded-lg p-4 mb-4 max-h-48 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500">
                      <th className="pb-2">Length</th>
                      <th className="pb-2">Source</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {wasteForCurrentDia.slice(0, 10).map((w, i) => (
                      <tr key={i}>
                        <td className="py-2 font-medium">{formatLength(w.length)}</td>
                        <td className="py-2 text-gray-600">Sheet #{w.sourceSheetId}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {wasteForCurrentDia.length > 10 && (
                  <p className="text-sm text-gray-500 mt-2">+{wasteForCurrentDia.length - 10} more pieces</p>
                )}
              </div>

              <div className="bg-blue-50 rounded-lg p-3 mb-6">
                <p className="text-sm text-blue-800">
                  <strong>Total:</strong> {wasteForCurrentDia.length} pieces,{" "}
                  {formatLength(wasteForCurrentDia.reduce((sum, w) => sum + w.length, 0))} available
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => runCalculation(selectedDia!, false, [])}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  No, Use New Bars Only
                </button>
                <button
                  onClick={() => runCalculation(selectedDia!, true, wasteForCurrentDia)}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
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
          <div className="w-full max-w-7xl mx-auto p-4 bg-green-50 border border-green-200 rounded-xl shadow-sm mb-6">
            <div className="flex items-center gap-2">
              <IconRecycle className="w-5 h-5 text-green-600" />
              <span className="text-green-700 font-medium">
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
