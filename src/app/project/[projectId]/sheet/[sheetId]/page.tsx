"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { IconArrowLeft, IconRecycle, IconX, IconRefresh, IconBolt, IconDeviceFloppy, IconAlertTriangle } from "@tabler/icons-react";
import ExcelPreviewTable from "@/components/customs/ExcelPreviewTable";
import DiaFilter from "@/components/customs/DiaFilter";
import FileInfoCard from "@/components/customs/FileInfoCard";
import CuttingStockResults from "@/components/customs/CuttingStockResults";
import { transformToDisplayFormat, filterDisplayDataByDia, getUniqueDiaFromDisplay } from "@/utils/barCodeUtils";
import { CuttingStockPreprocessor } from "@/utils/cuttingStockPreprocessor";
import { getWorkerManager } from "@/utils/workerManager";
import { sanitizeExcelData } from "@/utils/sanitizeData";
import type { BarCuttingDisplay } from "@/types/BarCuttingRow";
import type { CuttingStockResult, WastePiece } from "@/types/CuttingStock";
import { exportAllDiasToExcel, exportSavedResultsToExcel } from "@/utils/exportAllDias";
import type { SavedDiaResult } from "@/utils/exportAllDias";
import { WASTE_MIN_LENGTH_MM } from "@/constants/config";
import { compressData } from "@/utils/compression";

interface AvailableWasteForDia {
  dia: number;
  pieces: WastePiece[];
  totalLength: number;
  totalPieces: number;
}

interface ReusedPieceInfo {
  dia: number;
  usedInSheetName: string;
  sourceBarNumber: number;
  recoveredLength: number; // meters
}

export interface SheetWasteStats {
  v1WastePercentage: number;
  currentWastePercentage: number;
  currentVersion: number;
  totalWasteLength: number; // meters
  diasProcessed: number;
  reusedPiecesBreakdown: ReusedPieceInfo[];
}

// Reconstruct a CuttingStockResult from a saved DB result row (enriched with patterns/detailedCuts/summary)
function reconstructResultFromDb(r: any): CuttingStockResult {
  return {
    algorithm: r.algorithm,
    dia: r.dia,
    patterns: r.patterns || [],
    totalBarsUsed: r.totalBarsUsed,
    totalWaste: Number(r.totalWaste),
    averageUtilization: Number(r.averageUtilization),
    executionTime: Number(r.executionTime),
    summary: r.summary || {
      totalStandardBars: r.totalBarsUsed,
      totalWasteLength: Number(r.totalWaste),
      totalWastePercentage: 0,
      averageUtilization: Number(r.averageUtilization),
      patternCount: r.patterns?.length || 0,
      totalCutsProduced: 0,
    },
    detailedCuts: r.detailedCuts || [],
  };
}

function buildWasteStatsFromDbResults(
  dbResults: any[],
  generatedWaste: any[]
): SheetWasteStats | null {
  if (!dbResults?.length) return null;

  let v1TotalWaste = 0, currentTotalWaste = 0, totalStockLen = 0;

  for (const r of dbResults) {
    const stockLen = Number(r.totalStockLength) || (Number(r.totalBarsUsed) * 12);
    const baseline = r.baselineWaste != null ? Number(r.baselineWaste) : Number(r.totalWaste);
    const current = Number(r.totalWaste);
    v1TotalWaste += baseline;
    currentTotalWaste += current;
    totalStockLen += stockLen;
  }

  if (totalStockLen === 0) return null;

  const reusedBreakdown: ReusedPieceInfo[] = [];
  // Version = baseline (v1) + one per distinct downstream sheet that reused this
  // sheet's offcuts (not per individual piece — that would inflate the number).
  const consumingSheets = new Set<string>();
  generatedWaste?.forEach((w: any) => {
    if (w.status === "used" && Array.isArray(w.usages)) {
      w.usages.forEach((u: any) => {
        const isSelf = String(u.usedInSheetId) === String(w.sourceSheetId);
        if (!isSelf) {
          consumingSheets.add(String(u.usedInSheetId));
          reusedBreakdown.push({
            dia: w.dia,
            usedInSheetName: u.usedInSheet?.fileName ?? "another sheet",
            sourceBarNumber: w.sourceBarNumber ?? 0,
            recoveredLength: (u.cutLength ?? 0) / 1000,
          });
        }
      });
    }
  });

  return {
    v1WastePercentage: (v1TotalWaste / totalStockLen) * 100,
    currentWastePercentage: (currentTotalWaste / totalStockLen) * 100,
    currentVersion: consumingSheets.size + 1,
    totalWasteLength: currentTotalWaste,
    diasProcessed: dbResults.length,
    reusedPiecesBreakdown: reusedBreakdown,
  };
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
  const [resultsFromCache, setResultsFromCache] = useState(false);

  // Waste reuse state
  const [availableWaste, setAvailableWaste] = useState<AvailableWasteForDia[]>([]);
  const [showWastePrompt, setShowWastePrompt] = useState(false);
  const [useWaste, setUseWaste] = useState(false);
  const [wasteForCurrentDia, setWasteForCurrentDia] = useState<WastePiece[]>([]);

  // Live Waste Tracking
  const [generatedWaste, setGeneratedWaste] = useState<any[]>([]);
  const [patchedGreedyResult, setPatchedGreedyResult] = useState<CuttingStockResult | null>(null);
  const [patchedDynamicResult, setPatchedDynamicResult] = useState<CuttingStockResult | null>(null);

  // Download all state
  const [isDownloadingAll, setIsDownloadingAll] = useState(false);
  const [showDownloadWastePrompt, setShowDownloadWastePrompt] = useState(false);
  const [downloadAvailableWaste, setDownloadAvailableWaste] = useState<WastePiece[]>([]);
  const [sheetWasteStats, setSheetWasteStats] = useState<SheetWasteStats | null>(null);

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
          const sourceId = w.sourceSheetId || w.sourceSheet?.id;
          // if (String(sourceId) === String(sheetId)) return;

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

      // Load waste GENERATED by this sheet (for live tracking)
      const generatedWasteRes = await fetch(`/api/waste?projectId=${projectId}&sourceSheetId=${sheetId}`);
      const generatedWasteData = await generatedWasteRes.json();
      const generatedWasteArray = generatedWasteData.success ? (generatedWasteData.waste ?? []) : [];
      setGeneratedWaste(generatedWasteArray);

      // Hydrate versioned waste stats from saved DB results
      try {
        const resultsRes = await fetch(`/api/results?sheetId=${sheetId}`, { cache: "no-store" });
        const resultsData = await resultsRes.json();
        if (resultsData.success && resultsData.results?.length > 0) {
          const stats = buildWasteStatsFromDbResults(resultsData.results, generatedWasteArray);
          if (stats) setSheetWasteStats(stats);
        }
      } catch {
        // Non-fatal: version display is optional
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
      setResultsFromCache(false);

      if (dia !== null && displayData) {
        // STEP 1: Check if result already exists in database
        try {
          console.log(`[Sheet] Checking for existing result for dia ${dia}...`);
          const existingRes = await fetch(`/api/results?sheetId=${sheetId}`, { cache: "no-store" });
          const existingData = await existingRes.json();

          console.log(`[Sheet] API response:`, existingData);

          if (existingData.success && existingData.results && existingData.results.length > 0) {
            const existingResult = existingData.results.find(
              (r: { dia: number }) => r.dia === dia
            );

            console.log(`[Sheet] Found result for dia ${dia}:`, existingResult ? "YES" : "NO");

            if (existingResult) {
              console.log(`[Sheet] Loading existing result for dia ${dia} from database`);
              console.log(`[Sheet] Result details:`, {
                algorithm: existingResult.algorithm,
                totalBarsUsed: existingResult.totalBarsUsed,
                wastePiecesReused: existingResult.wastePiecesReused,
                detailedCutsCount: existingResult.detailedCuts?.length || 0,
              });

              // Log waste info from detailedCuts
              const wasteBarCount = existingResult.detailedCuts?.filter(
                (d: { isFromWaste?: boolean }) => d.isFromWaste
              ).length || 0;
              console.log(`[Sheet] Bars from waste in detailedCuts: ${wasteBarCount}`);

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

              console.log(`[Sheet] Loaded existing result, skipping recalculation`);
              setResultsFromCache(true);
              return; // Don't recalculate
            }
          }
        } catch (err) {
          console.error(`[Sheet] Error checking existing results:`, err);
          // Continue to calculation if check fails
        }

        console.log(`[Sheet] No existing result found, proceeding to calculation...`);
        // STEP 2: No existing result - check for available waste
        try {
          const wasteRes = await fetch(`/api/waste?projectId=${projectId}&status=available`);
          const wasteData = await wasteRes.json();

          let freshWasteForDia: WastePiece[] = [];

          if (wasteData.success && wasteData.waste) {
            // Filter out waste from current sheet and get only matching dia
            freshWasteForDia = wasteData.waste
              .filter((w: { dia: number }) => w.dia === dia)
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

  // Patch result with live waste data
  const patchResultWithLiveWaste = useCallback((result: CuttingStockResult | null): CuttingStockResult | null => {
    if (!result || generatedWaste.length === 0) return result;

    // Clone result to avoid mutating state
    const patched = JSON.parse(JSON.stringify(result));

    // Filter waste produced by THIS sheet for this dia
    // generatedWaste contains all waste inventory items where sourceSheetId == this sheet
    const producedWaste = generatedWaste.filter(w => w.dia === result.dia);
    if (producedWaste.length === 0) return result;

    let totallyRecoveredLength = 0;

    // Create a map of produced waste by Bar Number
    // Logic: Each bar in the result produces at most one "main" waste piece.
    // The WasteInventory record has sourceBarNumber.
    const wasteBySourceBar = new Map<number, any>();
    producedWaste.forEach(w => {
      // We are looking for waste PRODUCED by this sheet that is now USED
      if (w.sourceBarNumber) {
        wasteBySourceBar.set(w.sourceBarNumber, w);
      }
    });

    // Iterate detailed cuts to patch WASTE OUTPUTS (Recovered Waste)
    patched.detailedCuts.forEach((cut: any, index: number) => {
      const barNum = cut.barNumber || index + 1;

      // Check if this cut produced a waste piece that is now used
      const producedWasteItem = wasteBySourceBar.get(barNum);

      if (producedWasteItem && producedWasteItem.status === 'used') {
        // This waste piece was reused!
        const wasteLengthM = producedWasteItem.length / 1000;

        // Mark as recovered in the UI
        cut.isWasteRecovered = true;
        cut.recoveredAmount = wasteLengthM;

        // Find where it was used
        const usage = producedWasteItem.usages && producedWasteItem.usages[0];
        cut.recoveredWasteInfo = {
          usedInSheet: usage?.usedInSheet?.fileName || `Sheet #${usage?.usedInSheetId || 'Unknown'}`,
          wasteId: producedWasteItem.id
        };

        // Subtract from Net Waste of this sheet
        // We don't change 'cut.waste' (the physical waste), but we can add a 'netWaste' property
        // or let the UI handle it. 
        // For the SUMMARY, we definitely want to subtract it.
        totallyRecoveredLength += wasteLengthM;
      }
    });

    // Update Summary Stats for Net Waste
    if (totallyRecoveredLength > 0) {
      patched.summary.originalTotalWaste = patched.summary.totalWasteLength; // Keep original for reference
      patched.summary.totalWasteLength = Math.max(0, patched.summary.totalWasteLength - totallyRecoveredLength);
      patched.totalWaste = Math.max(0, patched.totalWaste - totallyRecoveredLength);

      // Add explicit field for UI to show breakdown
      patched.summary.wasteRecovered = totallyRecoveredLength;

      // Recalculate Percentage
      const totalInputLength = patched.totalBarsUsed * 12; // Assuming 12m bars
      if (totalInputLength > 0) {
        patched.summary.totalWastePercentage = (patched.summary.totalWasteLength / totalInputLength) * 100;
      }
    }

    return patched;
  }, [generatedWaste]);

  // Update patched results when raw results or waste changes
  useEffect(() => {
    setPatchedGreedyResult(patchResultWithLiveWaste(greedyResult));
  }, [greedyResult, patchResultWithLiveWaste]);

  useEffect(() => {
    setPatchedDynamicResult(patchResultWithLiveWaste(dynamicResult));
  }, [dynamicResult, patchResultWithLiveWaste]);

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

  // Run exact pattern-search calculation
  const runTrueDynamic = async () => {
    if (!displayData || !selectedDia) return;

    // Warning for large datasets
    if (displayData.length > 50) {
      if (!confirm(`Warning: You have ${displayData.length} items. Pattern DP cutting-stock search is extremely computationally expensive. \n\nIt works best for < 50 items. For larger datasets, it may hang your browser or crash. \n\nAre you sure you want to proceed?`)) {
        return;
      }
    }

    setIsCalculating(true);
    setDynamicProgress({ stage: "Starting pattern DP search...", percentage: 0 });

    try {
      const preprocessor = new CuttingStockPreprocessor();
      const requests = preprocessor.convertToCuttingRequests(displayData);

      const workerManager = getWorkerManager();
      const result = await workerManager.runTrueDynamic(
        requests,
        selectedDia,
        (stage, percentage) => setDynamicProgress({ stage, percentage })
      );

      setDynamicResult(result);
      // Save result (keeping existing greedy result)
      await saveResults(selectedDia, greedyResult, result, useWaste ? wasteForCurrentDia : undefined);

    } catch (error) {
      console.error("[Sheet] Pattern DP search error:", error);
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

      // Client-side Optimization: Determine winner to reduce payload size (Fix 413 Error)
      // Instead of sending both results, we only send the one that the server would favor anyway.
      let payloadGreedy = null;
      let payloadDynamic = null;

      if (greedyRes && dynamicRes) {
        // Logic must match Server's comparison logic exactly or be safe enough
        // Server prioritizes: 1. Fewer New Bars, 2. Fewer Total Bars, 3. Less Waste
        const greedyNew = greedyRes.summary.newBarsUsed ?? greedyRes.totalBarsUsed;
        const dynamicNew = dynamicRes.summary.newBarsUsed ?? dynamicRes.totalBarsUsed;

        if (greedyNew < dynamicNew) {
          payloadGreedy = greedyRes; // Greedy wins on new bars
        } else if (dynamicNew < greedyNew) {
          payloadDynamic = dynamicRes; // Dynamic wins on new bars
        } else {
          // New bars equal, check total bars
          if (greedyRes.totalBarsUsed < dynamicRes.totalBarsUsed) {
            payloadGreedy = greedyRes;
          } else if (dynamicRes.totalBarsUsed < greedyRes.totalBarsUsed) {
            payloadDynamic = dynamicRes;
          } else {
            // Total bars equal, check waste. Greedy wins ties.
            if (greedyRes.totalWaste <= dynamicRes.totalWaste) {
              payloadGreedy = greedyRes;
            } else {
              payloadDynamic = dynamicRes;
            }
          }
        }
      } else {
        payloadGreedy = greedyRes;
        payloadDynamic = dynamicRes;
      }

      console.log(`[Sheet] Optimizing Result Payload: Sending ${payloadGreedy ? 'Greedy' : 'Dynamic'} result only`);

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

      // Mark ONLY the actually used waste pieces as used (not all available ones).
      // One bulk request instead of a sequential PATCH per piece (big speedup on export).
      if (usedWastePieces && usedWastePieces.length > 0 && actuallyUsedWasteIds.size > 0) {
        const piecesToMark = usedWastePieces.filter(w => actuallyUsedWasteIds.has(w.id));
        console.log(`[Sheet] Marking ${piecesToMark.length} of ${usedWastePieces.length} waste pieces as used (bulk)`);

        if (piecesToMark.length > 0) {
          try {
            await fetch("/api/waste", {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                bulk: true,
                usages: piecesToMark.map(waste => ({
                  wasteId: parseInt(waste.id),
                  usedInSheetId: parseInt(sheetId),
                  usedForBarCode: "multiple",
                  cutLength: waste.length,
                  remainingLength: 0,
                  remainingStatus: "discarded",
                })),
              }),
            });
          } catch (err) {
            console.error(`[Sheet] Failed to bulk-mark waste as used:`, err);
          }
        }
      }



      const payload = {
        sheetId: parseInt(sheetId),
        dia,
        greedyResult: payloadGreedy,
        dynamicResult: payloadDynamic,
        wasteItems,
      };

      console.log(`[Sheet] Compressing payload...`);
      const compressedData = compressData(payload);
      console.log(`[Sheet] Payload compressed. Sending request...`);

      const response = await fetch("/api/results", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          compressed: true,
          data: compressedData
        }),
      });

      const data = await response.json();
      if (data.success) {
        console.log(`[Sheet] Saved ${data.algorithm} result. Waste saved: ${wasteItems.length} pieces`);
        // Reload waste data after saving
        loadSheetData();
      } else {
        console.error(`[Sheet] Failed to save:`, data.error);
        setCalculationError(`Saved Locally Only. Server Error: ${data.error}`);
      }
    } catch (err) {
      console.error("[Sheet] Error saving results:", err);
      setCalculationError(`Saved Locally Only. Network Error: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const formatLength = (mm: number) => `${(mm / 1000).toFixed(2)}m`;

  // Delete existing result and recalculate
  const handleRecalculate = useCallback(async () => {
    if (!selectedDia) return;

    try {
      // Delete existing result
      console.log(`[Sheet] Deleting existing result for dia ${selectedDia}...`);
      const deleteRes = await fetch(`/api/results?sheetId=${sheetId}&dia=${selectedDia}`, {
        method: "DELETE",
      });
      const deleteData = await deleteRes.json();
      console.log(`[Sheet] Delete response:`, deleteData);

      // Reset state and trigger recalculation
      setResultsFromCache(false);
      setGreedyResult(null);
      setDynamicResult(null);

      // Re-trigger the dia selection to run calculation
      const dia = selectedDia;
      setSelectedDia(null);
      setTimeout(() => {
        handleDiaSelect(dia);
      }, 100);
    } catch (err) {
      console.error(`[Sheet] Error deleting result:`, err);
      setCalculationError("Failed to delete existing result");
    }
  }, [selectedDia, sheetId, handleDiaSelect]);

  // Actually perform the all-dias export (called after the user chooses on the prompt)
  const performDownloadAllDias = useCallback(async (useReuse: boolean, waste: WastePiece[]) => {
    if (!displayData || !sheetInfo) return;

    setShowDownloadWastePrompt(false);
    setIsDownloadingAll(true);
    try {
      const diaResults = await exportAllDiasToExcel(
        displayData,
        sheetInfo.fileName,
        () => { },
        generatedWaste,
        useReuse ? waste : []
      );

      // Save each dia's results to DB and mark consumed waste as used
      for (const [dia, diaResult] of diaResults.entries()) {
        if (diaResult.error || (!diaResult.greedy && !diaResult.dynamic)) continue;
        const wasteForDia = useReuse ? waste.filter(w => w.dia === dia) : undefined;
        await saveResults(dia, diaResult.greedy ?? null, diaResult.dynamic ?? null, wasteForDia);
      }

      // Targeted refresh: update waste stats + generatedWaste without triggering full-page spinner
      try {
        const [resultsRes, genWasteRes] = await Promise.all([
          fetch(`/api/results?sheetId=${sheetId}`, { cache: "no-store" }),
          fetch(`/api/waste?projectId=${projectId}&sourceSheetId=${sheetId}`),
        ]);
        const [resultsData, genWasteData] = await Promise.all([
          resultsRes.json(),
          genWasteRes.json(),
        ]);
        const freshGenWaste = genWasteData.success ? (genWasteData.waste ?? []) : [];
        setGeneratedWaste(freshGenWaste);
        if (resultsData.success && resultsData.results?.length > 0) {
          const stats = buildWasteStatsFromDbResults(resultsData.results, freshGenWaste);
          if (stats) setSheetWasteStats(stats);
        }
      } catch {
        // Non-fatal
      }
    } catch (error) {
      console.error("[Sheet] Error downloading all dias:", error);
      setCalculationError(error instanceof Error ? error.message : "Failed to download");
    } finally {
      setIsDownloadingAll(false);
    }
  }, [displayData, sheetInfo, generatedWaste, sheetId, projectId]);

  // Re-download an already-calculated sheet from saved results (no recompute, no prompt, read-only)
  const downloadSavedResults = useCallback(async (savedRows: any[]) => {
    if (!sheetInfo) return;
    setIsDownloadingAll(true);
    try {
      const savedResults: SavedDiaResult[] = savedRows.map((r) => ({
        dia: r.dia,
        algorithm: r.algorithm,
        result: reconstructResultFromDb(r),
      }));
      await exportSavedResultsToExcel(savedResults, sheetInfo.fileName, generatedWaste);
    } catch (error) {
      console.error("[Sheet] Error re-downloading saved results:", error);
      setCalculationError(error instanceof Error ? error.message : "Failed to download");
    } finally {
      setIsDownloadingAll(false);
    }
  }, [sheetInfo, generatedWaste]);

  // Download all dias — prompts for waste reuse first (if any inventory exists)
  const handleDownloadAllDias = useCallback(async () => {
    if (!displayData || !sheetInfo) return;

    setIsDownloadingAll(true);

    // If the sheet is already calculated (saved results cover all diameters), re-download
    // from saved data without recomputing or prompting — keeps the plan stable.
    try {
      const uniqueDias = getUniqueDiaFromDisplay(displayData);
      const savedRes = await fetch(`/api/results?sheetId=${sheetId}`, { cache: "no-store" });
      const savedData = await savedRes.json();
      if (savedData.success && Array.isArray(savedData.results)) {
        const savedForSheet = savedData.results.filter(
          (r: { dia: number; detailedCuts?: unknown[] }) =>
            uniqueDias.includes(r.dia) && Array.isArray(r.detailedCuts) && r.detailedCuts.length > 0
        );
        const savedDias = new Set(savedForSheet.map((r: { dia: number }) => r.dia));
        const allCovered = uniqueDias.length > 0 && uniqueDias.every((d) => savedDias.has(d));
        if (allCovered) {
          await downloadSavedResults(savedForSheet);
          return;
        }
      }
    } catch (e) {
      console.warn("[Sheet] Could not check saved results, falling back to compute path:", e);
    }

    let availableWaste: WastePiece[] = [];
    try {
      const wasteRes = await fetch(`/api/waste?projectId=${projectId}&status=available`);
      const wasteData = await wasteRes.json();
      if (wasteData.success && Array.isArray(wasteData.waste)) {
        availableWaste = wasteData.waste
          // Exclude this sheet's OWN offcuts — only reuse other sheets' inventory.
          .filter((w: { sourceSheetId?: number; sourceSheet?: { id: number } }) => {
            const sourceId = w.sourceSheetId || w.sourceSheet?.id;
            return String(sourceId) !== String(sheetId);
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
      }
    } catch (e) {
      console.warn("[Sheet] Could not load waste inventory for export:", e);
    }

    // No inventory → just download with new bars only, no prompt
    if (availableWaste.length === 0) {
      await performDownloadAllDias(false, []);
      return;
    }

    // Inventory available → open prompt, let user decide
    setDownloadAvailableWaste(availableWaste);
    setShowDownloadWastePrompt(true);
    setIsDownloadingAll(false); // prompt is open; spinner resumes after the user picks
  }, [displayData, sheetInfo, projectId, sheetId, performDownloadAllDias, downloadSavedResults]);

  // Clear data (reset view)
  const handleClearData = useCallback(() => {
    setSelectedDia(null);
    setGreedyResult(null);
    setDynamicResult(null);
    setUseWaste(false);
    setCalculationError(null);
    setSheetWasteStats(null);
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-accent border-t-transparent" />
          <p className="text-ink-2">Loading sheet data…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1120px] px-4 pt-8">
        {/* Header card */}
        <div className="relative mb-[18px] overflow-hidden rounded-[20px] border border-accent/[0.14] bg-gradient-to-br from-accent/[0.05] to-sky/[0.03] px-[26px] py-[22px]">
          <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-accent to-sky" />
          <div className="pointer-events-none absolute -right-8 -top-8 h-[120px] w-[120px] rounded-full bg-[radial-gradient(circle,rgba(99,102,241,0.12),transparent_70%)]" />
          <Link
            href={`/project/${projectId}`}
            className="group mb-4 inline-flex items-center gap-[7px] font-body text-[12.5px] font-semibold text-accent transition-colors hover:text-accent-deep"
          >
            <IconArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-1" />
            Back to Project
          </Link>
          <div className="flex items-center gap-[18px]">
            <div className="flex h-[62px] w-[62px] shrink-0 items-center justify-center rounded-[18px] bg-gradient-to-br from-accent to-sky font-display text-[22px] font-extrabold text-white shadow-[0_12px_28px_rgba(99,102,241,0.32)]">
              #{sheetInfo?.sheetNumber}
            </div>
            <div>
              <h1 className="font-display text-[clamp(1.6rem,2.8vw,2.2rem)] font-extrabold tracking-[-0.04em]">{sheetInfo?.fileName}</h1>
              <div className="mt-1.5 flex flex-wrap items-center gap-2.5">
                <span className="font-body text-[13px] text-ink-2">Sheet #{sheetInfo?.sheetNumber}</span>
                <span className="h-1 w-1 shrink-0 rounded-full bg-ink-3" />
                <span className="rounded-full bg-grass/[0.14] px-2.5 py-[3px] font-mono text-[10px] font-bold uppercase tracking-[0.08em] text-[#059669]">{sheetInfo?.status}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Error */}
        {calculationError && (
          <div className="mb-[18px] flex items-center gap-3 rounded-[14px] border border-rose-200 bg-rose-50 p-4">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-600">
              <IconAlertTriangle size={18} />
            </div>
            <p className="font-body text-[13.5px] text-rose-700">{calculationError}</p>
          </div>
        )}

        {/* Waste Prompt Modal */}
        {showWastePrompt && (
          <div className="anim-fade-up fixed inset-0 z-[60] flex items-center justify-center bg-[rgba(15,17,23,0.45)] p-5 backdrop-blur-[6px]">
            <div className="w-full max-w-lg rounded-[24px] border border-[var(--color-line)] bg-white p-7 shadow-[0_30px_80px_rgba(0,0,0,0.3)]">
              <div className="mb-4 flex items-center gap-3.5">
                <div className="flex h-[46px] w-[46px] items-center justify-center rounded-[13px] bg-gradient-to-br from-grass to-[#059669] shadow-[0_8px_20px_rgba(16,185,129,0.3)]">
                  <IconRecycle className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h2 className="font-display text-[19px] font-extrabold tracking-[-0.03em]">Reuse offcuts?</h2>
                  <p className="font-body text-[12.5px] text-ink-2">Available offcut for Ø{selectedDia}mm</p>
                </div>
              </div>

              <div className="mb-4 max-h-48 overflow-y-auto rounded-[13px] border border-[var(--color-line)] bg-canvas p-4">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-ink-3">
                      <th className="pb-2">Length</th>
                      <th className="pb-2">Source Sheet</th>
                      <th className="pb-2">From Bar #</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--color-line)]">
                    {wasteForCurrentDia.map((w, i) => (
                      <tr key={i}>
                        <td className="py-2.5 font-display font-bold text-ink">{formatLength(w.length)}</td>
                        <td className="py-2.5 font-body text-ink-2">
                          <div>Sheet #{w.sourceSheetNumber || w.sourceSheetId}</div>
                          {w.sourceSheetName && <div className="max-w-[120px] truncate text-[11px] text-ink-3">{w.sourceSheetName}</div>}
                        </td>
                        <td className="py-2.5 font-body text-ink-2">Bar #{w.sourceBarNumber || "?"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mb-6 rounded-[13px] border border-accent/15 bg-accent/[0.06] p-4">
                <p className="font-body text-[13px] text-accent-deep">
                  <span className="font-bold">{wasteForCurrentDia.length}</span> pieces available,{" "}
                  <span className="font-bold">{formatLength(wasteForCurrentDia.reduce((sum, w) => sum + w.length, 0))}</span> total length
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => runCalculation(selectedDia!, false, [])}
                  className="flex-1 rounded-full border-[1.5px] border-[var(--color-line-2)] px-4 py-3 font-body text-[14px] font-bold text-ink-2 transition-all hover:bg-canvas hover:text-ink"
                >
                  Use New Bars Only
                </button>
                <button
                  onClick={() => runCalculation(selectedDia!, true, wasteForCurrentDia)}
                  className="flex-1 rounded-full bg-grass px-4 py-3 font-body text-[14px] font-bold text-white shadow-[0_8px_24px_rgba(16,185,129,0.34)] transition-all hover:-translate-y-0.5 hover:bg-[#059669]"
                >
                  Yes, Reuse Offcuts
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Download All Dias — Waste Prompt Modal */}
        {showDownloadWastePrompt && (
          <div className="anim-fade-up fixed inset-0 z-[60] flex items-center justify-center bg-[rgba(15,17,23,0.45)] p-5 backdrop-blur-[6px]">
            <div className="w-full max-w-lg rounded-[24px] border border-[var(--color-line)] bg-white p-7 shadow-[0_30px_80px_rgba(0,0,0,0.3)]">
              <div className="mb-4 flex items-start gap-3.5">
                <div className="flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-[13px] bg-gradient-to-br from-violet-x to-accent shadow-[0_8px_20px_rgba(168,85,247,0.3)]">
                  <IconRecycle className="h-6 w-6 text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="font-display text-[19px] font-extrabold tracking-[-0.03em]">Reuse offcuts for export?</h2>
                  <p className="font-body text-[12.5px] text-ink-2">Available inventory across all diameters</p>
                </div>
                <button
                  onClick={() => setShowDownloadWastePrompt(false)}
                  aria-label="Close"
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-ink-3 transition-colors hover:bg-canvas hover:text-ink"
                >
                  <IconX className="h-5 w-5" />
                </button>
              </div>

              <div className="mb-4 max-h-56 overflow-y-auto rounded-[13px] border border-[var(--color-line)] bg-canvas p-4">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-ink-3">
                      <th className="pb-2">Dia</th>
                      <th className="pb-2 text-center">Pieces</th>
                      <th className="pb-2 text-right">Total Length</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--color-line)]">
                    {(() => {
                      const groups = new Map<number, { count: number; totalMm: number }>();
                      downloadAvailableWaste.forEach((w) => {
                        const g = groups.get(w.dia) || { count: 0, totalMm: 0 };
                        g.count += 1;
                        g.totalMm += w.length;
                        groups.set(w.dia, g);
                      });
                      return Array.from(groups.entries())
                        .sort((a, b) => a[0] - b[0])
                        .map(([dia, g]) => (
                          <tr key={dia}>
                            <td className="py-2.5 font-display font-bold text-ink">Ø{dia}mm</td>
                            <td className="py-2.5 text-center font-body text-ink-2">{g.count}</td>
                            <td className="py-2.5 text-right font-mono text-ink-2">{formatLength(g.totalMm)}</td>
                          </tr>
                        ));
                    })()}
                  </tbody>
                </table>
              </div>

              <div className="mb-6 rounded-[13px] border border-violet-x/15 bg-violet-x/[0.07] p-4">
                <p className="font-body text-[13px] text-[#7e22ce]">
                  <span className="font-bold">{downloadAvailableWaste.length}</span> total pieces,{" "}
                  <span className="font-bold">{formatLength(downloadAvailableWaste.reduce((sum, w) => sum + w.length, 0))}</span> total length.
                  Reusing inventory recomputes each diameter with available offcuts first.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => performDownloadAllDias(false, [])}
                  className="flex-1 rounded-full border-[1.5px] border-[var(--color-line-2)] px-4 py-3 font-body text-[14px] font-bold text-ink-2 transition-all hover:bg-canvas hover:text-ink"
                >
                  Use New Bars Only
                </button>
                <button
                  onClick={() => performDownloadAllDias(true, downloadAvailableWaste)}
                  className="flex-1 rounded-full bg-accent px-4 py-3 font-body text-[14px] font-bold text-white shadow-[0_8px_24px_rgba(99,102,241,0.34)] transition-all hover:-translate-y-0.5 hover:bg-accent-deep"
                >
                  Yes, Reuse Offcuts
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
            clearData={handleClearData}
            downloadResults={handleDownloadAllDias}
            selectedDia={selectedDia}
            totalRows={displayData.length}
            isDownloading={isDownloadingAll}
            wasteStats={sheetWasteStats}
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
          />
        )}

        {/* Waste Usage Indicator */}
        {useWaste && selectedDia && (
          <div className="mb-[18px] rounded-[14px] border border-grass/20 bg-grass/[0.07] p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-grass/15">
                <IconRecycle className="h-4 w-4 text-grass" />
              </div>
              <span className="font-body text-[13.5px] font-semibold text-[#059669]">
                {resultsFromCache ? (
                  <span>
                    Reused <span className="font-bold">{
                      (patchedGreedyResult || greedyResult)?.detailedCuts.filter(d => (d as any).isFromWaste).length ||
                      (patchedDynamicResult || dynamicResult)?.detailedCuts.filter(d => (d as any).isFromWaste).length || 0
                    }</span> waste pieces from inventory
                  </span>
                ) : (
                  <span>
                    {wasteForCurrentDia.length} waste pieces available from previous sheets
                    {(patchedGreedyResult || greedyResult || patchedDynamicResult || dynamicResult) && (
                      <>
                        {" "}• <span className="font-bold">
                          {(patchedGreedyResult || greedyResult)?.detailedCuts.filter(d => (d as any).isFromWaste).length ||
                            (patchedDynamicResult || dynamicResult)?.detailedCuts.filter(d => (d as any).isFromWaste).length || 0}
                        </span> actually used
                      </>
                    )}
                  </span>
                )}
              </span>
            </div>
          </div>
        )}

        {/* Cached Results Indicator */}
        {selectedDia && resultsFromCache && (greedyResult || dynamicResult) && (
          <div className="mb-[18px] rounded-[14px] border border-accent/20 bg-accent/[0.06] p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/15 text-accent">
                  <IconDeviceFloppy size={16} />
                </div>
                <span className="font-body text-[13.5px] font-semibold text-accent">
                  Loaded saved results for Ø{selectedDia}
                </span>
              </div>
              <button
                onClick={handleRecalculate}
                className="flex items-center gap-1.5 rounded-full px-4 py-2 font-body text-[13px] font-bold text-accent transition-colors hover:bg-accent/10"
              >
                <IconRefresh size={14} /> Recalculate
              </button>
            </div>
          </div>
        )}

        {/* Results */}
        {selectedDia && (
          <CuttingStockResults
            greedyResult={patchedGreedyResult || greedyResult}
            dynamicResult={patchedDynamicResult || dynamicResult}
            isLoading={isCalculating}
            fileName={sheetInfo?.fileName || ""}
            greedyProgress={greedyProgress}
            dynamicProgress={dynamicProgress}
          />
        )}

        {/* Manual Advanced Trigger */}
        {selectedDia && !isCalculating && (greedyResult || dynamicResult) && (
          <div className="-mt-1 mb-6 flex justify-end">
            <button
              onClick={runTrueDynamic}
              className="flex items-center gap-1.5 font-body text-[12px] font-semibold text-ink-3 transition-colors hover:text-accent"
              title="Run exact cutting-stock pattern search (slow)"
            >
              <IconBolt size={13} /> Run exact cutting-stock search
            </button>
          </div>
        )}

        {/* Data Preview */}
        {filteredDisplayData && <ExcelPreviewTable data={filteredDisplayData} selectedDia={selectedDia} />}
    </div>
  );
}
