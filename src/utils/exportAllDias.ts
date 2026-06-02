import * as XLSX from "xlsx";
import type { BarCuttingDisplay } from "@/types/BarCuttingRow";
import type { CuttingStockResult, WastePiece } from "@/types/CuttingStock";
import { getUniqueDiaFromDisplay } from "./barCodeUtils";
import { CuttingStockPreprocessor } from "./cuttingStockPreprocessor";
import { getWorkerManager } from "./workerManager";

type SummaryCell = string | number;
type AlgorithmKey = "greedy" | "dynamic";

const STANDARD_BAR_LENGTH_M = 12.0;
const STANDARD_REPORT_DIAS = [8, 10, 12, 16, 20, 25, 32, 40];

interface DiaSummaryResult {
  dia: number;
  demandLength: number;
  greedy?: CuttingStockResult;
  dynamic?: CuttingStockResult;
  greedyFromInventory: number;
  dynamicFromInventory: number;
  bestAlgorithm?: string;
  error?: string;
}

/**
 * Export cutting stock results for all diameters to a single Excel file
 */
export async function exportAllDiasToExcel(
  displayData: BarCuttingDisplay[],
  fileName: string,
  onProgress?: (dia: number, current: number, total: number) => void,
  generatedWaste: any[] = [], // Optional generated waste for live tracking
  availableWaste: WastePiece[] = [] // Inventory to reuse (always-reuse on export)
): Promise<void> {
  const uniqueDias = getUniqueDiaFromDisplay(displayData);
  const preprocessor = new CuttingStockPreprocessor();
  const workerManager = getWorkerManager();
  const allRequests = preprocessor.convertToCuttingRequests(displayData);
  const diaResults = new Map<number, DiaSummaryResult>();

  // Create workbook
  const workbook = XLSX.utils.book_new();

  // Process each diameter
  for (let i = 0; i < uniqueDias.length; i++) {
    const dia = uniqueDias[i];
    onProgress?.(dia, i + 1, uniqueDias.length);
    const diaRequests = preprocessor.filterByDia(allRequests, dia);
    const demandLength = preprocessor.calculateTotalMaterial(diaRequests);

    try {
      // Always reuse inventory: feed this dia's available waste into the algorithms
      const wasteForDia = availableWaste.filter((w) => w.dia === dia);

      // Run both bar-cutting methods (with inventory reuse)
      let { greedy, dynamic } = await workerManager.runBoth(diaRequests, dia, undefined, wasteForDia);

      // Patch results with live waste data if available
      if (generatedWaste.length > 0) {
        greedy = patchResultWithLiveWaste(greedy, generatedWaste);
        dynamic = patchResultWithLiveWaste(dynamic, generatedWaste);
      }

      // Count waste pieces reused from inventory (input side) for each algorithm.
      const greedyFromInv = countFromInventory(greedy);
      const dynamicFromInv = countFromInventory(dynamic);
      const greedyNewBars = getNewBarCount(greedy, greedyFromInv);
      const dynamicNewBars = getNewBarCount(dynamic, dynamicFromInv);

      // Best-method label uses the same "New 12m Bars" basis shown in the Summary.
      const bestAlgorithm =
        greedyNewBars < dynamicNewBars
          ? "Greedy"
          : dynamicNewBars < greedyNewBars
          ? "Dynamic"
          : "Equal";

      diaResults.set(dia, {
        dia,
        demandLength,
        greedy,
        dynamic,
        greedyFromInventory: greedyFromInv,
        dynamicFromInventory: dynamicFromInv,
        bestAlgorithm,
      });

      // Add detailed sheets for this diameter. Tabs use plain "Greedy"/"Dynamic"
      // to match the UI buttons rather than internal algorithm IDs.
      addDiaSheet(workbook, greedy, `Dia ${dia} - Greedy`);
      addDiaSheet(workbook, dynamic, `Dia ${dia} - Dynamic`);
    } catch (error) {
      console.error(`Error processing dia ${dia}:`, error);
      const msg = error instanceof Error ? error.message : "Unknown error";
      diaResults.set(dia, {
        dia,
        demandLength,
        greedyFromInventory: 0,
        dynamicFromInventory: 0,
        error: msg,
      });
    }
  }

  const reportDias = getReportDias(uniqueDias);
  const summaryData = createSummaryData(fileName, uniqueDias.length, reportDias, diaResults);

  // Create summary sheet
  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);

  // Column widths for the stacked summary tables.
  summarySheet["!cols"] = [
    { wch: 8 },   // Dia
    { wch: 22 },  // Total Cutting Length
    { wch: 14 },  // New 12m Bars
    { wch: 18 },  // Total Stock Length
    { wch: 12 },  // Waste
    { wch: 10 },  // Waste %
    { wch: 14 },  // Utilization %
    { wch: 14 },  // From Inventory
    { wch: 23 },  // New Reusable Pcs
    { wch: 18 },  // New Reusable
    { wch: 18 },  // Largest Offcut
  ];
  XLSX.utils.book_append_sheet(workbook, summarySheet, "Summary");

  // Generate Excel file
  const excelFileName = `cutting_stock_all_dias_${fileName.replace(/\.[^/.]+$/, "")}.xlsx`;
  XLSX.writeFile(workbook, excelFileName);
}

function getReportDias(uniqueDias: number[]): number[] {
  const extraDias = uniqueDias.filter((dia) => !STANDARD_REPORT_DIAS.includes(dia));
  return [...STANDARD_REPORT_DIAS, ...extraDias.sort((a, b) => a - b)];
}

function createSummaryData(
  fileName: string,
  uniqueDiaCount: number,
  reportDias: number[],
  diaResults: Map<number, DiaSummaryResult>
): SummaryCell[][] {
  const summaryData: SummaryCell[][] = [
    ["CUTTING STOCK OPTIMIZATION - ALL DIAMETERS"],
    ["File:", fileName],
    ["Generated:", new Date().toLocaleString()],
    ["Diameters in File:", uniqueDiaCount],
    [],
    ...createAlgorithmSummaryTable("GREEDY SUMMARY", "greedy", reportDias, diaResults),
    [],
    ...createAlgorithmSummaryTable("DYNAMIC SUMMARY", "dynamic", reportDias, diaResults),
    [],
    ...createMethodComparisonTable(reportDias, diaResults),
  ];

  return summaryData;
}

function createAlgorithmSummaryTable(
  title: string,
  algorithm: AlgorithmKey,
  reportDias: number[],
  diaResults: Map<number, DiaSummaryResult>
): SummaryCell[][] {
  const rows: SummaryCell[][] = [
    [title],
    [
      "Dia",
      "Total Cutting Length (m)",
      "New 12m Bars",
      "Total Stock Length (m)",
      "Waste (m)",
      "Waste %",
      "Utilization %",
      "From Inventory",
      "New Reusable Pcs (>=1m)",
      "New Reusable (m)",
      "Largest Offcut (m)",
    ],
  ];

  const totals = {
    demandLength: 0,
    newBars: 0,
    stockLength: 0,
    wasteLength: 0,
    fromInventory: 0,
    reusablePieces: 0,
    reusableWasteLength: 0,
    largestOffcut: 0,
  };

  for (const dia of reportDias) {
    const diaResult = diaResults.get(dia);
    const result = getAlgorithmResult(diaResult, algorithm);

    if (!diaResult) {
      rows.push([dia, "", "", "", "", "", "", "", "", "", ""]);
      continue;
    }

    if (diaResult.error || !result) {
      rows.push([dia, roundValue(diaResult.demandLength), "ERROR", "", "", "", "", "", "", "", diaResult.error ?? "ERROR"]);
      continue;
    }

    const fromInventory = getFromInventory(diaResult, algorithm);
    const newBars = getNewBarCount(result, fromInventory);
    const stockLength = getTotalStockLength(result);
    const wasteLength = result.totalWaste;
    const wastePercentage = stockLength > 0 ? (wasteLength / stockLength) * 100 : 0;
    const utilizationPercentage = stockLength > 0 ? 100 - wastePercentage : 0;
    const reusablePieces = result.summary.reusablePieces ?? 0;
    const reusableWasteLength = result.summary.reusableWasteLength ?? 0;
    const largestOffcut = result.summary.largestOffcut ?? 0;

    totals.demandLength += diaResult.demandLength;
    totals.newBars += newBars;
    totals.stockLength += stockLength;
    totals.wasteLength += wasteLength;
    totals.fromInventory += fromInventory;
    totals.reusablePieces += reusablePieces;
    totals.reusableWasteLength += reusableWasteLength;
    totals.largestOffcut = Math.max(totals.largestOffcut, largestOffcut);

    rows.push([
      dia,
      roundValue(diaResult.demandLength),
      newBars,
      roundValue(stockLength),
      roundValue(wasteLength),
      roundValue(wastePercentage, 2),
      roundValue(utilizationPercentage, 2),
      fromInventory,
      reusablePieces,
      roundValue(reusableWasteLength),
      roundValue(largestOffcut),
    ]);
  }

  const totalWastePercentage =
    totals.stockLength > 0 ? (totals.wasteLength / totals.stockLength) * 100 : 0;
  const totalUtilization =
    totals.stockLength > 0 ? 100 - totalWastePercentage : 0;

  rows.push([
    "TOTAL",
    roundValue(totals.demandLength),
    totals.newBars,
    roundValue(totals.stockLength),
    roundValue(totals.wasteLength),
    roundValue(totalWastePercentage, 2),
    roundValue(totalUtilization, 2),
    totals.fromInventory,
    totals.reusablePieces,
    roundValue(totals.reusableWasteLength),
    roundValue(totals.largestOffcut),
  ]);

  return rows;
}

function createMethodComparisonTable(
  reportDias: number[],
  diaResults: Map<number, DiaSummaryResult>
): SummaryCell[][] {
  const rows: SummaryCell[][] = [
    ["METHOD COMPARISON"],
    ["Dia", "Best Method", "Greedy New 12m Bars", "Dynamic New 12m Bars", "Bars Saved by Dynamic", "Greedy Waste %", "Dynamic Waste %"],
  ];

  for (const dia of reportDias) {
    const diaResult = diaResults.get(dia);
    if (!diaResult) {
      rows.push([dia, "", "", "", "", "", ""]);
      continue;
    }

    const { greedy, dynamic } = diaResult;
    if (diaResult.error || !greedy || !dynamic) {
      rows.push([dia, diaResult.error ?? "ERROR", "", "", "", "", ""]);
      continue;
    }

    const greedyNewBars = getNewBarCount(greedy, diaResult.greedyFromInventory);
    const dynamicNewBars = getNewBarCount(dynamic, diaResult.dynamicFromInventory);
    const greedyStockLength = getTotalStockLength(greedy);
    const dynamicStockLength = getTotalStockLength(dynamic);
    const greedyWastePercentage =
      greedyStockLength > 0 ? (greedy.totalWaste / greedyStockLength) * 100 : 0;
    const dynamicWastePercentage =
      dynamicStockLength > 0 ? (dynamic.totalWaste / dynamicStockLength) * 100 : 0;

    rows.push([
      dia,
      diaResult.bestAlgorithm ?? "Equal",
      greedyNewBars,
      dynamicNewBars,
      greedyNewBars - dynamicNewBars,
      roundValue(greedyWastePercentage, 2),
      roundValue(dynamicWastePercentage, 2),
    ]);
  }

  return rows;
}

function getAlgorithmResult(
  diaResult: DiaSummaryResult | undefined,
  algorithm: AlgorithmKey
): CuttingStockResult | undefined {
  if (!diaResult) return undefined;
  return algorithm === "greedy" ? diaResult.greedy : diaResult.dynamic;
}

function getFromInventory(diaResult: DiaSummaryResult, algorithm: AlgorithmKey): number {
  return algorithm === "greedy"
    ? diaResult.greedyFromInventory
    : diaResult.dynamicFromInventory;
}

function countFromInventory(result: CuttingStockResult): number {
  return result.detailedCuts.filter(
    (d) => d.isFromWaste || d.patternId?.startsWith("waste_")
  ).length;
}

function getNewBarCount(result: CuttingStockResult, fromInventory: number): number {
  return result.summary.newBarsUsed ?? Math.max(0, result.totalBarsUsed - fromInventory);
}

function getTotalStockLength(result: CuttingStockResult): number {
  const patternLength = result.patterns.reduce((sum, pattern) => {
    return sum + (Number.isFinite(pattern.standardBarLength) ? pattern.standardBarLength : 0);
  }, 0);

  return patternLength > 0 ? patternLength : result.totalBarsUsed * STANDARD_BAR_LENGTH_M;
}

function roundValue(value: number, digits = 3): number {
  return parseFloat(value.toFixed(digits));
}

/**
 * Add a sheet for a specific diameter result
 */
function addDiaSheet(
  workbook: XLSX.WorkBook,
  result: CuttingStockResult,
  sheetName: string
): void {
  const STANDARD_BAR_LENGTH = 12.0;

  // Create header row - added "Source" column to show if bar is from waste inventory
  const headers = [
    "Bar #",
    "Source",
    "Bar Length (m)",
    "BarCode",
    "Effective Length (m)",
    "Lap Length (m)",
    "Waste (m)",
    "Waste (%)",
    "Utilization (%)",
  ];

  // Create data rows
  const data: (string | number)[][] = [headers];

  for (const detail of result.detailedCuts) {
    // Group cuts by BarCode
    const cutGroups = groupCutsByBarCode(detail.cuts);

    // Check if this bar is from waste inventory
    const detailWithWaste = detail as typeof detail & { 
      isFromWaste?: boolean; 
      wasteSource?: { 
        wasteId: string; 
        sourceSheetId: number;
        sourceSheetNumber?: number;
        sourceBarNumber: number; 
        originalLength: number; 
      } 
    };
    
    const isFromWaste = detailWithWaste.isFromWaste || detail.patternId?.startsWith("waste_");
    const wasteSource = detailWithWaste.wasteSource;
    
    // Determine bar length (waste pieces have different lengths)
    const barLength = wasteSource 
      ? wasteSource.originalLength / 1000  // Convert mm to m
      : STANDARD_BAR_LENGTH;

    // Calculate total used length and waste for this bar
    let totalUsedLength = 0;
    cutGroups.forEach((cut) => {
      totalUsedLength += cut.length;
    });
    const barWaste = barLength - totalUsedLength;
    const barUtilization = (totalUsedLength / barLength) * 100;

    // Source description
    const sourceDesc = isFromWaste 
      ? `Waste (Sheet #${wasteSource?.sourceSheetNumber || wasteSource?.sourceSheetId || "?"}, Bar #${wasteSource?.sourceBarNumber || "?"})`
      : "New 12m Bar";

    // Add each cut as a separate row
    cutGroups.forEach((cut, index) => {
      const row: (string | number)[] = [];

      // Bar # only on first cut
      if (index === 0) {
        row.push(detail.barNumber);
        row.push(sourceDesc);
        row.push(parseFloat(barLength.toFixed(3)));
      } else {
        row.push("");
        row.push("");
        row.push("");
      }

      // BarCode, Effective Length, and Lap Length for all cuts
      row.push(cut.barCode);
      // Effective length = cutting length - lap length
      row.push(parseFloat((cut.length - cut.lapLength).toFixed(3)));
      row.push(parseFloat(cut.lapLength.toFixed(3)));

      // Waste and Utilization only on first cut
      if (index === 0) {
        // If recovered, show text
        const isRecovered = (detail as any).isWasteRecovered;
        if (isRecovered) {
          row.push(`${parseFloat(barWaste.toFixed(3))} (Recovered)`);
        } else {
          row.push(parseFloat(barWaste.toFixed(3)));
        }
        
        row.push(parseFloat((100 - barUtilization).toFixed(2))); // Waste %
        row.push(parseFloat(barUtilization.toFixed(2)));
      } else {
        row.push("");
        row.push("");
        row.push("");
      }

      data.push(row);
    });
  }

  // Create worksheet
  const worksheet = XLSX.utils.aoa_to_sheet(data);
  worksheet["!cols"] = [
    { wch: 8 },   // Bar #
    { wch: 28 },  // Source
    { wch: 14 },  // Bar Length
    { wch: 25 },  // BarCode
    { wch: 18 },  // Effective Length
    { wch: 15 },  // Lap Length
    { wch: 12 },  // Waste
    { wch: 12 },  // Waste %
    { wch: 15 },  // Utilization
  ];

  // Truncate sheet name if too long (Excel limit is 31 characters)
  const truncatedName = sheetName.substring(0, 31);
  XLSX.utils.book_append_sheet(workbook, worksheet, truncatedName);
}

interface GroupedCut {
  barCode: string;
  length: number;
  lapLength: number;
}

/**
 * Group cuts by BarCode
 */
function groupCutsByBarCode(cuts: { barCode: string; length: number; lapLength: number; quantity: number }[]): GroupedCut[] {
  const groups = new Map<
    string,
    { barCode: string; length: number; lapLength: number; count: number }
  >();

  for (const cut of cuts) {
    const existing = groups.get(cut.barCode);
    if (existing) {
      existing.count += cut.quantity;
    } else {
      const lapLength = cut.lapLength || 0;
      groups.set(cut.barCode, {
        barCode: cut.barCode,
        length: cut.length,
        lapLength: parseFloat(lapLength.toFixed(3)),
        count: cut.quantity,
      });
    }
  }

  // Convert to array and expand by count
  const result: GroupedCut[] = [];
  for (const group of groups.values()) {
    for (let i = 0; i < group.count; i++) {
      result.push({
        barCode: group.barCode,
        length: group.length,
        lapLength: group.lapLength,
      });
    }
  }

  return result;
}

/**
 * Helper to patch result with live waste stats
 * (Duplicated from SheetPage logic for isolated export)
 */
function patchResultWithLiveWaste(result: CuttingStockResult, generatedWaste: any[]): CuttingStockResult {
  if (!result || generatedWaste.length === 0) return result;

  // Clone result deeply
  const patched = JSON.parse(JSON.stringify(result));
  
  // Filter waste for this dia
  const relevantWaste = generatedWaste.filter(w => w.dia === result.dia);
  if (relevantWaste.length === 0) return result;

  let totallyRecoveredLength = 0;
  
  // Map waste by Source Bar Number
  const wasteByBar = new Map<number, any>();
  relevantWaste.forEach(w => {
    if (w.status === 'used' && w.usages && w.usages.length > 0) {
      wasteByBar.set(w.sourceBarNumber, w);
    }
  });

  // Iterate detailed cuts and update
  patched.detailedCuts.forEach((cut: any, index: number) => {
    const barNum = cut.barNumber || index + 1;
    const recoveredWaste = wasteByBar.get(barNum);
    
    if (recoveredWaste) {
      // Calculate how much was recovered
      const recoveredAmount = recoveredWaste.usages.reduce((sum: number, u: any) => sum + (u.cutLength || 0), 0) / 1000;
      
      // CRITICAL FIX: Only subtract if source is DIFFERENT from the producing results
      // (Self-recovery shouldn't reduce net waste of the producer sheet)
      // Note: In exportAllDias, generatedWaste pieces are ALL from the same project, 
      // but we want to avoid "self-recovery" indicators if the usage was in the same sheet.
      // Since we don't have the current sheetId easily here, we skip the detailed indicator 
      // if it looks like a self-recovery (usage in same sheet as source).
      const isSelfRecovery = recoveredWaste.usages.some((u: any) => String(u.usedInSheetId) === String(recoveredWaste.sourceSheetId));

      if (!isSelfRecovery) {
        // Update cut properties
        cut.isWasteRecovered = true;
        cut.recoveredAmount = recoveredAmount; // m
        
        // Subtract from WASTE
        const originalWaste = cut.waste;
        cut.waste = Math.max(0, originalWaste - recoveredAmount);
        
        totallyRecoveredLength += recoveredAmount;
      }
    }
  });

  // Update Summary Stats
  patched.summary.totalWasteLength = Math.max(0, patched.summary.totalWasteLength - totallyRecoveredLength);
  patched.totalWaste = Math.max(0, patched.totalWaste - totallyRecoveredLength);
  
  // Recalculate Percentage
  const totalInputLength = patched.totalBarsUsed * 12; // Standard 12m
  if (totalInputLength > 0) {
    patched.summary.totalWastePercentage = (patched.summary.totalWasteLength / totalInputLength) * 100;
  }

  return patched;
}
