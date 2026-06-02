import * as XLSX from "xlsx-js-style";
import type { BarCuttingDisplay } from "@/types/BarCuttingRow";
import type { CuttingStockResult, WastePiece } from "@/types/CuttingStock";
import { getUniqueDiaFromDisplay } from "./barCodeUtils";
import { CuttingStockPreprocessor } from "./cuttingStockPreprocessor";
import {
  createVisualCuttingMethodSheet,
  getProjectNameFromFileName,
} from "./visualCuttingMethodSheet";
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
  const generatedAt = new Date();
  const projectName = getProjectNameFromFileName(fileName);

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
      addDiaSheet(workbook, greedy, `Dia ${dia} - Greedy`, projectName, generatedAt);
      addDiaSheet(workbook, dynamic, `Dia ${dia} - Dynamic`, projectName, generatedAt);
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
  applySummarySheetFormatting(summarySheet, reportDias, diaResults);
  XLSX.utils.book_append_sheet(workbook, summarySheet, "Summary");

  // Generate Excel file
  const excelFileName = `cutting_stock_all_dias_${fileName.replace(/\.[^/.]+$/, "")}.xlsx`;
  XLSX.writeFile(workbook, excelFileName, { cellStyles: true });
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

interface SummaryLayout {
  greedyTitleRow: number;
  greedyHeaderRow: number;
  greedyFirstDataRow: number;
  greedyTotalRow: number;
  dynamicTitleRow: number;
  dynamicHeaderRow: number;
  dynamicFirstDataRow: number;
  dynamicTotalRow: number;
  methodTitleRow: number;
  methodHeaderRow: number;
  methodFirstDataRow: number;
  methodLastDataRow: number;
}

const SUMMARY_COL_END = 10;
const METHOD_COL_END = 6;
const EPSILON = 0.000001;

const THIN_BORDER = {
  top: { style: "thin", color: { rgb: "B7C4D6" } },
  bottom: { style: "thin", color: { rgb: "B7C4D6" } },
  left: { style: "thin", color: { rgb: "B7C4D6" } },
  right: { style: "thin", color: { rgb: "B7C4D6" } },
};

const BASE_SUMMARY_STYLE = {
  alignment: { vertical: "center", wrapText: true },
  border: THIN_BORDER,
};

const MAIN_TITLE_STYLE = {
  ...BASE_SUMMARY_STYLE,
  font: { bold: true, color: { rgb: "FFFFFF" }, sz: 14 },
  fill: { patternType: "solid", fgColor: { rgb: "1F4E78" } },
  alignment: { horizontal: "center", vertical: "center", wrapText: true },
};

const SECTION_TITLE_STYLE = {
  ...BASE_SUMMARY_STYLE,
  font: { bold: true, color: { rgb: "FFFFFF" }, sz: 12 },
  fill: { patternType: "solid", fgColor: { rgb: "44546A" } },
  alignment: { horizontal: "center", vertical: "center", wrapText: true },
};

const HEADER_STYLE = {
  ...BASE_SUMMARY_STYLE,
  font: { bold: true, color: { rgb: "1F2937" } },
  fill: { patternType: "solid", fgColor: { rgb: "D9EAF7" } },
  alignment: { horizontal: "center", vertical: "center", wrapText: true },
};

const TOTAL_ROW_STYLE = {
  ...BASE_SUMMARY_STYLE,
  font: { bold: true, color: { rgb: "111827" } },
  fill: { patternType: "solid", fgColor: { rgb: "EAF2F8" } },
};

const WINNER_STYLE = {
  font: { bold: true, color: { rgb: "0F5132" } },
  fill: { patternType: "solid", fgColor: { rgb: "D9EAD3" } },
};

const WINNING_SECTION_STYLE = {
  ...BASE_SUMMARY_STYLE,
  font: { bold: true, color: { rgb: "FFFFFF" }, sz: 12 },
  fill: { patternType: "solid", fgColor: { rgb: "38761D" } },
  alignment: { horizontal: "center", vertical: "center", wrapText: true },
};

const TIE_STYLE = {
  font: { bold: true, color: { rgb: "7A4F01" } },
  fill: { patternType: "solid", fgColor: { rgb: "FFF2CC" } },
};

const TIE_SECTION_STYLE = {
  ...BASE_SUMMARY_STYLE,
  font: { bold: true, color: { rgb: "7A4F01" }, sz: 12 },
  fill: { patternType: "solid", fgColor: { rgb: "FFF2CC" } },
  alignment: { horizontal: "center", vertical: "center", wrapText: true },
};

function getSummaryLayout(reportDias: number[]): SummaryLayout {
  const greedyTitleRow = 5;
  const greedyHeaderRow = greedyTitleRow + 1;
  const greedyFirstDataRow = greedyHeaderRow + 1;
  const greedyTotalRow = greedyFirstDataRow + reportDias.length;
  const dynamicTitleRow = greedyTotalRow + 2;
  const dynamicHeaderRow = dynamicTitleRow + 1;
  const dynamicFirstDataRow = dynamicHeaderRow + 1;
  const dynamicTotalRow = dynamicFirstDataRow + reportDias.length;
  const methodTitleRow = dynamicTotalRow + 2;
  const methodHeaderRow = methodTitleRow + 1;
  const methodFirstDataRow = methodHeaderRow + 1;

  return {
    greedyTitleRow,
    greedyHeaderRow,
    greedyFirstDataRow,
    greedyTotalRow,
    dynamicTitleRow,
    dynamicHeaderRow,
    dynamicFirstDataRow,
    dynamicTotalRow,
    methodTitleRow,
    methodHeaderRow,
    methodFirstDataRow,
    methodLastDataRow: methodFirstDataRow + reportDias.length - 1,
  };
}

function applySummarySheetFormatting(
  worksheet: XLSX.WorkSheet,
  reportDias: number[],
  diaResults: Map<number, DiaSummaryResult>
): void {
  const layout = getSummaryLayout(reportDias);

  worksheet["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: SUMMARY_COL_END } },
    { s: { r: layout.greedyTitleRow, c: 0 }, e: { r: layout.greedyTitleRow, c: SUMMARY_COL_END } },
    { s: { r: layout.dynamicTitleRow, c: 0 }, e: { r: layout.dynamicTitleRow, c: SUMMARY_COL_END } },
    { s: { r: layout.methodTitleRow, c: 0 }, e: { r: layout.methodTitleRow, c: METHOD_COL_END } },
  ];

  worksheet["!rows"] = worksheet["!rows"] ?? [];
  worksheet["!rows"][0] = { hpt: 24 };
  worksheet["!rows"][layout.greedyTitleRow] = { hpt: 22 };
  worksheet["!rows"][layout.dynamicTitleRow] = { hpt: 22 };
  worksheet["!rows"][layout.methodTitleRow] = { hpt: 22 };
  worksheet["!rows"][layout.greedyHeaderRow] = { hpt: 38 };
  worksheet["!rows"][layout.dynamicHeaderRow] = { hpt: 38 };
  worksheet["!rows"][layout.methodHeaderRow] = { hpt: 38 };
  worksheet["!rows"][layout.greedyTotalRow + 1] = { hpt: 8 };
  worksheet["!rows"][layout.dynamicTotalRow + 1] = { hpt: 8 };

  applyStyleToRange(worksheet, 0, 0, 0, SUMMARY_COL_END, MAIN_TITLE_STYLE);
  applyStyleToRange(worksheet, 1, 0, 3, 1, {
    alignment: { vertical: "center", wrapText: true },
  });

  applyTableStyles(
    worksheet,
    layout.greedyTitleRow,
    layout.greedyHeaderRow,
    layout.greedyTotalRow,
    SUMMARY_COL_END
  );
  applyTableStyles(
    worksheet,
    layout.dynamicTitleRow,
    layout.dynamicHeaderRow,
    layout.dynamicTotalRow,
    SUMMARY_COL_END
  );
  applyTableStyles(
    worksheet,
    layout.methodTitleRow,
    layout.methodHeaderRow,
    layout.methodLastDataRow,
    METHOD_COL_END
  );

  highlightSummaryWinners(worksheet, reportDias, diaResults, layout);
}

function applyTableStyles(
  worksheet: XLSX.WorkSheet,
  titleRow: number,
  headerRow: number,
  lastRow: number,
  lastCol: number
): void {
  applyStyleToRange(worksheet, titleRow, 0, titleRow, lastCol, SECTION_TITLE_STYLE);
  applyStyleToRange(worksheet, headerRow, 0, headerRow, lastCol, HEADER_STYLE);
  applyStyleToRange(worksheet, titleRow + 1, 0, lastRow, lastCol, BASE_SUMMARY_STYLE);
  applyStyleToRange(worksheet, lastRow, 0, lastRow, lastCol, TOTAL_ROW_STYLE);
  applyStyleToRange(worksheet, headerRow + 1, 0, lastRow, 0, {
    alignment: { horizontal: "center", vertical: "center", wrapText: true },
  });
}

function highlightSummaryWinners(
  worksheet: XLSX.WorkSheet,
  reportDias: number[],
  diaResults: Map<number, DiaSummaryResult>,
  layout: SummaryLayout
): void {
  for (let i = 0; i < reportDias.length; i++) {
    const dia = reportDias[i];
    const diaResult = diaResults.get(dia);
    if (!diaResult?.greedy || !diaResult.dynamic || diaResult.error) continue;

    const greedyRow = layout.greedyFirstDataRow + i;
    const dynamicRow = layout.dynamicFirstDataRow + i;

    highlightMetricWinner(worksheet, greedyRow, dynamicRow, 2, "lower"); // New 12m Bars
    highlightMetricWinner(worksheet, greedyRow, dynamicRow, 3, "lower"); // Total Stock Length
    highlightMetricWinner(worksheet, greedyRow, dynamicRow, 4, "lower"); // Waste
    highlightMetricWinner(worksheet, greedyRow, dynamicRow, 5, "lower"); // Waste %
    highlightMetricWinner(worksheet, greedyRow, dynamicRow, 6, "higher"); // Utilization %
    highlightMetricWinner(worksheet, greedyRow, dynamicRow, 8, "higher"); // Reusable pieces
    highlightMetricWinner(worksheet, greedyRow, dynamicRow, 9, "higher"); // Reusable length
    highlightMetricWinner(worksheet, greedyRow, dynamicRow, 10, "higher"); // Largest offcut

    const methodRow = layout.methodFirstDataRow + i;
    const methodStyle = diaResult.bestAlgorithm === "Equal" ? TIE_STYLE : WINNER_STYLE;
    applyCellStyle(worksheet, methodRow, 1, methodStyle);
  }

  highlightMetricWinner(worksheet, layout.greedyTotalRow, layout.dynamicTotalRow, 2, "lower");
  highlightMetricWinner(worksheet, layout.greedyTotalRow, layout.dynamicTotalRow, 3, "lower");
  highlightMetricWinner(worksheet, layout.greedyTotalRow, layout.dynamicTotalRow, 4, "lower");
  highlightMetricWinner(worksheet, layout.greedyTotalRow, layout.dynamicTotalRow, 5, "lower");
  highlightMetricWinner(worksheet, layout.greedyTotalRow, layout.dynamicTotalRow, 6, "higher");
  highlightMetricWinner(worksheet, layout.greedyTotalRow, layout.dynamicTotalRow, 8, "higher");
  highlightMetricWinner(worksheet, layout.greedyTotalRow, layout.dynamicTotalRow, 9, "higher");
  highlightMetricWinner(worksheet, layout.greedyTotalRow, layout.dynamicTotalRow, 10, "higher");
  highlightOverallBestSection(worksheet, layout);
}

function highlightOverallBestSection(worksheet: XLSX.WorkSheet, layout: SummaryLayout): void {
  const winner = getOverallWinner(worksheet, layout);

  if (winner === "greedy") {
    applyStyleToRange(worksheet, layout.greedyTitleRow, 0, layout.greedyTitleRow, SUMMARY_COL_END, WINNING_SECTION_STYLE);
  } else if (winner === "dynamic") {
    applyStyleToRange(worksheet, layout.dynamicTitleRow, 0, layout.dynamicTitleRow, SUMMARY_COL_END, WINNING_SECTION_STYLE);
  } else {
    applyStyleToRange(worksheet, layout.greedyTitleRow, 0, layout.greedyTitleRow, SUMMARY_COL_END, TIE_SECTION_STYLE);
    applyStyleToRange(worksheet, layout.dynamicTitleRow, 0, layout.dynamicTitleRow, SUMMARY_COL_END, TIE_SECTION_STYLE);
  }
}

function getOverallWinner(
  worksheet: XLSX.WorkSheet,
  layout: SummaryLayout
): "greedy" | "dynamic" | "equal" {
  const comparisons: Array<{ col: number; direction: "lower" | "higher" }> = [
    { col: 2, direction: "lower" }, // New 12m Bars
    { col: 5, direction: "lower" }, // Waste %
    { col: 9, direction: "higher" }, // New Reusable length
  ];

  for (const comparison of comparisons) {
    const greedyValue = getNumericCellValue(worksheet, layout.greedyTotalRow, comparison.col);
    const dynamicValue = getNumericCellValue(worksheet, layout.dynamicTotalRow, comparison.col);
    if (!Number.isFinite(greedyValue) || !Number.isFinite(dynamicValue)) continue;
    if (Math.abs(greedyValue - dynamicValue) <= EPSILON) continue;

    const greedyWins =
      comparison.direction === "lower"
        ? greedyValue < dynamicValue
        : greedyValue > dynamicValue;
    return greedyWins ? "greedy" : "dynamic";
  }

  return "equal";
}

function highlightMetricWinner(
  worksheet: XLSX.WorkSheet,
  greedyRow: number,
  dynamicRow: number,
  col: number,
  direction: "lower" | "higher"
): void {
  const greedyValue = getNumericCellValue(worksheet, greedyRow, col);
  const dynamicValue = getNumericCellValue(worksheet, dynamicRow, col);
  if (!Number.isFinite(greedyValue) || !Number.isFinite(dynamicValue)) return;
  if (Math.abs(greedyValue - dynamicValue) <= EPSILON) return;

  const greedyWins =
    direction === "lower"
      ? greedyValue < dynamicValue
      : greedyValue > dynamicValue;
  applyCellStyle(worksheet, greedyWins ? greedyRow : dynamicRow, col, WINNER_STYLE);
}

function getNumericCellValue(worksheet: XLSX.WorkSheet, row: number, col: number): number {
  const cell = worksheet[XLSX.utils.encode_cell({ r: row, c: col })];
  return typeof cell?.v === "number" ? cell.v : Number(cell?.v);
}

function applyStyleToRange(
  worksheet: XLSX.WorkSheet,
  startRow: number,
  startCol: number,
  endRow: number,
  endCol: number,
  style: Record<string, any>
): void {
  for (let row = startRow; row <= endRow; row++) {
    for (let col = startCol; col <= endCol; col++) {
      applyCellStyle(worksheet, row, col, style);
    }
  }
}

function applyCellStyle(
  worksheet: XLSX.WorkSheet,
  row: number,
  col: number,
  style: Record<string, any>
): void {
  const cell = ensureCell(worksheet, row, col);
  cell.s = mergeCellStyles(cell.s, style);
}

function ensureCell(worksheet: XLSX.WorkSheet, row: number, col: number): XLSX.CellObject {
  const address = XLSX.utils.encode_cell({ r: row, c: col });
  if (!worksheet[address]) {
    worksheet[address] = { t: "s", v: "" };
  }
  return worksheet[address] as XLSX.CellObject;
}

function mergeCellStyles(...styles: Array<Record<string, any> | undefined>): Record<string, any> {
  const merged: Record<string, any> = {};

  for (const style of styles) {
    if (!style) continue;
    for (const [key, value] of Object.entries(style)) {
      if (isPlainObject(value)) {
        merged[key] = mergeCellStyles(merged[key], value);
      } else {
        merged[key] = value;
      }
    }
  }

  return merged;
}

function isPlainObject(value: unknown): value is Record<string, any> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Add a sheet for a specific diameter result
 */
function addDiaSheet(
  workbook: XLSX.WorkBook,
  result: CuttingStockResult,
  sheetName: string,
  projectName: string,
  generatedAt: Date
): void {
  const worksheet = createVisualCuttingMethodSheet(result, {
    projectName,
    generatedAt,
  });

  // Truncate sheet name if too long (Excel limit is 31 characters)
  const truncatedName = sheetName.substring(0, 31);
  XLSX.utils.book_append_sheet(workbook, worksheet, truncatedName);
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
