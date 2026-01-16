import * as XLSX from "xlsx";
import type { BarCuttingDisplay } from "@/types/BarCuttingRow";
import type { CuttingStockResult } from "@/types/CuttingStock";
import { getUniqueDiaFromDisplay } from "./barCodeUtils";
import { CuttingStockPreprocessor } from "./cuttingStockPreprocessor";
import { getWorkerManager } from "./workerManager";

/**
 * Export cutting stock results for all diameters to a single Excel file
 */
export async function exportAllDiasToExcel(
  displayData: BarCuttingDisplay[],
  fileName: string,
  onProgress?: (dia: number, current: number, total: number) => void
): Promise<void> {
  const uniqueDias = getUniqueDiaFromDisplay(displayData);
  const preprocessor = new CuttingStockPreprocessor();
  const workerManager = getWorkerManager();

  // Create workbook
  const workbook = XLSX.utils.book_new();

  // Add summary sheet
  const summaryData: (string | number)[][] = [
    ["CUTTING STOCK OPTIMIZATION - ALL DIAMETERS"],
    ["File:", fileName],
    ["Generated:", new Date().toLocaleString()],
    ["Total Diameters:", uniqueDias.length],
    [],
    ["Dia", "Greedy Bars", "Greedy Waste (m)", "Greedy Waste (%)", "Greedy Waste Reused", "Dynamic Bars", "Dynamic Waste (m)", "Dynamic Waste (%)", "Best Algorithm"],
  ];

  // Process each diameter
  for (let i = 0; i < uniqueDias.length; i++) {
    const dia = uniqueDias[i];
    onProgress?.(dia, i + 1, uniqueDias.length);

    try {
      // Preprocess data for this diameter
      const requests = preprocessor.convertToCuttingRequests(displayData);

      // Run both algorithms
      const { greedy, dynamic } = await workerManager.runBoth(requests, dia);

      // Add to summary
      const bestAlgorithm =
        greedy.totalBarsUsed < dynamic.totalBarsUsed
          ? "Greedy"
          : dynamic.totalBarsUsed < greedy.totalBarsUsed
          ? "Dynamic"
          : "Equal";

      // Count waste pieces reused in greedy result
      const greedyWasteReused = greedy.detailedCuts.filter(
        (d) => (d as { isFromWaste?: boolean }).isFromWaste || d.patternId?.startsWith("waste_")
      ).length;

      summaryData.push([
        dia,
        greedy.totalBarsUsed,
        parseFloat(greedy.totalWaste.toFixed(3)),
        parseFloat(greedy.summary.totalWastePercentage.toFixed(2)),
        greedyWasteReused,
        dynamic.totalBarsUsed,
        parseFloat(dynamic.totalWaste.toFixed(3)),
        parseFloat(dynamic.summary.totalWastePercentage.toFixed(2)),
        bestAlgorithm,
      ]);

      // Add detailed sheets for this diameter
      addDiaSheet(workbook, greedy, `Dia ${dia} - Greedy`);
      addDiaSheet(workbook, dynamic, `Dia ${dia} - Dynamic`);
    } catch (error) {
      console.error(`Error processing dia ${dia}:`, error);
      summaryData.push([
        dia,
        "ERROR",
        "ERROR",
        "ERROR",
        "ERROR",
        error instanceof Error ? error.message : "Unknown error",
      ]);
    }
  }

  // Create summary sheet
  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
  summarySheet["!cols"] = [
    { wch: 8 },
    { wch: 15 },
    { wch: 18 },
    { wch: 20 },
    { wch: 15 },
    { wch: 18 },
    { wch: 18 },
    { wch: 18 },
    { wch: 20 },
  ];
  XLSX.utils.book_append_sheet(workbook, summarySheet, "Summary");

  // Generate Excel file
  const excelFileName = `cutting_stock_all_dias_${fileName.replace(/\.[^/.]+$/, "")}.xlsx`;
  XLSX.writeFile(workbook, excelFileName);
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
        row.push(parseFloat(barWaste.toFixed(3)));
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
