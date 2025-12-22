import * as XLSX from "xlsx";
import type { CuttingStockResult, CutInstruction } from "@/types/CuttingStock";

/**
 * Export cutting stock results to Excel with multiple sheets
 */
export function exportToExcel(
  greedyResult: CuttingStockResult | null,
  dynamicResult: CuttingStockResult | null,
  fileName: string
): void {
  if (!greedyResult && !dynamicResult) {
    console.error("No results to export");
    return;
  }

  // Create workbook
  const workbook = XLSX.utils.book_new();

  // Add Greedy Algorithm sheet
  if (greedyResult) {
    const greedySheet = createAlgorithmSheet(greedyResult);
    XLSX.utils.book_append_sheet(workbook, greedySheet, "Greedy Algorithm");
  }

  // Add Dynamic Programming sheet
  if (dynamicResult) {
    const dynamicSheet = createAlgorithmSheet(dynamicResult);
    XLSX.utils.book_append_sheet(workbook, dynamicSheet, "Dynamic Programming");
  }

  // Add Comparison sheet
  if (greedyResult && dynamicResult) {
    const comparisonSheet = createComparisonSheet(greedyResult, dynamicResult);
    XLSX.utils.book_append_sheet(workbook, comparisonSheet, "Comparison");
  }

  // Generate Excel file
  const excelFileName = `cutting_stock_${fileName.replace(/\.[^/.]+$/, "")}_dia_${greedyResult?.dia || dynamicResult?.dia}.xlsx`;
  XLSX.writeFile(workbook, excelFileName);
}

/**
 * Create sheet for algorithm results
 * Format: Each bar's cuts listed vertically (one cut per row)
 */
function createAlgorithmSheet(result: CuttingStockResult): XLSX.WorkSheet {
  // Create header row - added "Source" and "Bar Length" columns
  const headers = [
    "Bar #",
    "Source",
    "Bar Length (m)",
    "BarCode",
    "Effective Length (m)",
    "Lap Length (m)",
    "Waste (m)",
    "Utilization (%)",
  ];

  // Create data rows
  const data: (string | number)[][] = [headers];
  const STANDARD_BAR_LENGTH = 12.0;

  for (const detail of result.detailedCuts) {
    // Group cuts by BarCode to get unique cuts
    const cutGroups = groupCutsByBarCode(detail.cuts);

    // Check if this bar is from waste inventory
    const isFromWaste = detail.isFromWaste || detail.patternId?.startsWith("waste_");
    const wasteSource = detail.wasteSource;
    
    // Determine bar length (waste pieces have different lengths)
    const barLength = wasteSource 
      ? wasteSource.originalLength / 1000  // Convert mm to m
      : STANDARD_BAR_LENGTH;

    // Calculate total used length and waste for this bar
    // Note: cut.length already includes lap (cutting length = effective + lap)
    let totalUsedLength = 0;
    cutGroups.forEach((cut) => {
      totalUsedLength += cut.length;
    });
    const barWaste = barLength - totalUsedLength;
    const barUtilization = (totalUsedLength / barLength) * 100;

    // Source description
    const sourceDesc = isFromWaste 
      ? `Waste (Sheet ${wasteSource?.sourceSheetId || "?"}, Bar #${wasteSource?.sourceBarNumber || "?"})`
      : "New 12m Bar";

    // Add each cut as a separate row
    cutGroups.forEach((cut, index) => {
      const row: (string | number)[] = [];

      // Bar #, Source, Bar Length only on first cut
      if (index === 0) {
        row.push(detail.barNumber);
        row.push(sourceDesc);
        row.push(parseFloat(barLength.toFixed(3)));
      } else {
        row.push(""); // Empty for subsequent cuts
        row.push("");
        row.push("");
      }

      // BarCode, Effective Length, and Lap Length for all cuts
      row.push(cut.barCode);
      // Effective length = cutting length - lap length (since cut.length includes lap)
      row.push(parseFloat((cut.length - cut.lapLength).toFixed(3))); // Effective length
      row.push(parseFloat(cut.lapLength.toFixed(3))); // Lap length

      // Waste and Utilization only on first cut
      if (index === 0) {
        row.push(parseFloat(barWaste.toFixed(3)));
        row.push(parseFloat(barUtilization.toFixed(2)));
      } else {
        row.push(""); // Empty for subsequent cuts
        row.push(""); // Empty for subsequent cuts
      }

      data.push(row);
    });
  }

  // Create worksheet
  const worksheet = XLSX.utils.aoa_to_sheet(data);

  // Set column widths
  worksheet["!cols"] = [
    { wch: 8 },   // Bar #
    { wch: 28 },  // Source
    { wch: 14 },  // Bar Length
    { wch: 20 },  // BarCode
    { wch: 18 },  // Effective Length
    { wch: 15 },  // Lap Length
    { wch: 12 },  // Waste
    { wch: 15 },  // Utilization
  ];

  return worksheet;
}

interface GroupedCut {
  barCode: string;
  length: number;
  lapLength: number;
}

/**
 * Group cuts by BarCode and get lap length
 */
function groupCutsByBarCode(cuts: CutInstruction[]): GroupedCut[] {
  const groups = new Map<
    string,
    { barCode: string; length: number; lapLength: number; count: number }
  >();

  for (const cut of cuts) {
    const existing = groups.get(cut.barCode);
    if (existing) {
      existing.count += cut.quantity;
    } else {
      // Get lap length from cut data - use actual value from input
      // If lapLength is 0 or undefined, use 0 (no lap)
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
 * Create comparison sheet
 */
function createComparisonSheet(
  greedyResult: CuttingStockResult,
  dynamicResult: CuttingStockResult
): XLSX.WorkSheet {
  // Count waste pieces reused
  const greedyWasteReused = greedyResult.detailedCuts.filter(
    (d) => d.isFromWaste || d.patternId?.startsWith("waste_")
  ).length;
  const dynamicWasteReused = dynamicResult.detailedCuts.filter(
    (d) => d.isFromWaste || d.patternId?.startsWith("waste_")
  ).length;

  // Summary comparison
  const summaryData = [
    ["SUMMARY COMPARISON", "", "", ""],
    ["Metric", "Greedy Algorithm", "Dynamic Programming", "Difference"],
    [
      "Total Bars Used",
      greedyResult.totalBarsUsed,
      dynamicResult.totalBarsUsed,
      dynamicResult.totalBarsUsed - greedyResult.totalBarsUsed,
    ],
    [
      "New 12m Bars",
      greedyResult.totalBarsUsed - greedyWasteReused,
      dynamicResult.totalBarsUsed - dynamicWasteReused,
      (dynamicResult.totalBarsUsed - dynamicWasteReused) - (greedyResult.totalBarsUsed - greedyWasteReused),
    ],
    [
      "Waste Pieces Reused",
      greedyWasteReused,
      dynamicWasteReused,
      dynamicWasteReused - greedyWasteReused,
    ],
    [
      "Total Waste (m)",
      parseFloat(greedyResult.totalWaste.toFixed(3)),
      parseFloat(dynamicResult.totalWaste.toFixed(3)),
      parseFloat((dynamicResult.totalWaste - greedyResult.totalWaste).toFixed(3)),
    ],
    [
      "Average Utilization (%)",
      parseFloat(greedyResult.averageUtilization.toFixed(2)),
      parseFloat(dynamicResult.averageUtilization.toFixed(2)),
      parseFloat(
        (dynamicResult.averageUtilization - greedyResult.averageUtilization).toFixed(2)
      ),
    ],
    [
      "Execution Time (ms)",
      parseFloat(greedyResult.executionTime.toFixed(2)),
      parseFloat(dynamicResult.executionTime.toFixed(2)),
      parseFloat(
        (dynamicResult.executionTime - greedyResult.executionTime).toFixed(2)
      ),
    ],
    [
      "Pattern Count",
      greedyResult.summary.patternCount,
      dynamicResult.summary.patternCount,
      dynamicResult.summary.patternCount - greedyResult.summary.patternCount,
    ],
    [
      "Waste Percentage (%)",
      parseFloat(greedyResult.summary.totalWastePercentage.toFixed(2)),
      parseFloat(dynamicResult.summary.totalWastePercentage.toFixed(2)),
      parseFloat(
        (
          dynamicResult.summary.totalWastePercentage -
          greedyResult.summary.totalWastePercentage
        ).toFixed(2)
      ),
    ],
    [],
    ["DETAILED PATTERN COMPARISON", "", "", ""],
    ["Bar #", "Greedy Cuts", "Dynamic Cuts", "Difference"],
  ];

  // Detailed pattern comparison
  const maxBars = Math.max(
    greedyResult.detailedCuts.length,
    dynamicResult.detailedCuts.length
  );

  for (let i = 0; i < maxBars; i++) {
    const greedyBar = greedyResult.detailedCuts[i];
    const dynamicBar = dynamicResult.detailedCuts[i];

    const greedySource = greedyBar?.isFromWaste ? " [WASTE]" : "";
    const dynamicSource = dynamicBar?.isFromWaste ? " [WASTE]" : "";

    const greedyCuts = greedyBar
      ? `${greedyBar.cuts.length} cuts, ${greedyBar.waste.toFixed(3)}m waste${greedySource}`
      : "N/A";
    const dynamicCuts = dynamicBar
      ? `${dynamicBar.cuts.length} cuts, ${dynamicBar.waste.toFixed(3)}m waste${dynamicSource}`
      : "N/A";

    const difference =
      greedyBar && dynamicBar
        ? `${(dynamicBar.waste - greedyBar.waste).toFixed(3)}m waste diff`
        : "N/A";

    summaryData.push([i + 1, greedyCuts, dynamicCuts, difference]);
  }

  // Add recommendations
  summaryData.push([]);
  summaryData.push(["RECOMMENDATION", "", "", ""]);

  const barsSaved = greedyResult.totalBarsUsed - dynamicResult.totalBarsUsed;
  const wasteSaved = greedyResult.totalWaste - dynamicResult.totalWaste;

  if (barsSaved > 0) {
    summaryData.push([
      "Best Algorithm",
      "Dynamic Programming",
      `Saves ${barsSaved} bars and ${wasteSaved.toFixed(3)}m waste`,
      "",
    ]);
  } else if (barsSaved < 0) {
    summaryData.push([
      "Best Algorithm",
      "Greedy",
      `Saves ${Math.abs(barsSaved)} bars and ${Math.abs(wasteSaved).toFixed(3)}m waste`,
      "",
    ]);
  } else {
    summaryData.push([
      "Best Algorithm",
      "Both Equal",
      "Both algorithms produce same results",
      "",
    ]);
  }

  // Add note about waste reuse
  if (greedyWasteReused > 0 || dynamicWasteReused > 0) {
    summaryData.push([]);
    summaryData.push(["NOTE", "", "", ""]);
    summaryData.push([
      "Waste Reuse",
      greedyWasteReused > 0 ? `Greedy reused ${greedyWasteReused} waste pieces` : "Greedy: No waste reused",
      dynamicWasteReused > 0 ? `Dynamic reused ${dynamicWasteReused} waste pieces` : "Dynamic: No waste reused (not supported)",
      "",
    ]);
  }

  // Create worksheet
  const worksheet = XLSX.utils.aoa_to_sheet(summaryData);

  // Set column widths
  worksheet["!cols"] = [
    { wch: 25 },
    { wch: 35 },
    { wch: 35 },
    { wch: 25 },
  ];

  return worksheet;
}
