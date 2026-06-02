import * as XLSX from "xlsx-js-style";
import { getAlgorithmInfo } from "@/constants/algorithmInfo";
import type { CuttingStockResult } from "@/types/CuttingStock";
import {
  createVisualCuttingMethodSheet,
  getProjectNameFromFileName,
} from "./visualCuttingMethodSheet";

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
  const projectName = getProjectNameFromFileName(fileName);
  const generatedAt = new Date();

  // Add first-fit cutting-stock sheet
  if (greedyResult) {
    const greedySheet = createVisualCuttingMethodSheet(greedyResult, {
      projectName,
      generatedAt,
    });
    XLSX.utils.book_append_sheet(
      workbook,
      greedySheet,
      toExcelSheetName(getAlgorithmInfo(greedyResult.algorithm).excelSheetName)
    );
  }

  // Add optimized cutting-stock sheet
  if (dynamicResult) {
    const dynamicSheet = createVisualCuttingMethodSheet(dynamicResult, {
      projectName,
      generatedAt,
    });
    XLSX.utils.book_append_sheet(
      workbook,
      dynamicSheet,
      toExcelSheetName(getAlgorithmInfo(dynamicResult.algorithm).excelSheetName)
    );
  }

  // Add Comparison sheet
  if (greedyResult && dynamicResult) {
    const comparisonSheet = createComparisonSheet(greedyResult, dynamicResult);
    XLSX.utils.book_append_sheet(workbook, comparisonSheet, "Comparison");
  }

  // Generate Excel file
  const excelFileName = `cutting_stock_${fileName.replace(/\.[^/.]+$/, "")}_dia_${greedyResult?.dia || dynamicResult?.dia}.xlsx`;
  XLSX.writeFile(workbook, excelFileName, { cellStyles: true });
}

/**
 * Create comparison sheet
 */
function createComparisonSheet(
  greedyResult: CuttingStockResult,
  dynamicResult: CuttingStockResult
): XLSX.WorkSheet {
  const greedyLabel = getAlgorithmInfo(greedyResult.algorithm).shortName;
  const dynamicLabel = getAlgorithmInfo(dynamicResult.algorithm).shortName;

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
    ["Metric", greedyLabel, dynamicLabel, "Difference"],
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
      "Waste from New Bars (m)",
      parseFloat(((greedyResult.summary as any).wasteFromNewBars ?? greedyResult.totalWaste).toFixed(3)),
      parseFloat(((dynamicResult.summary as any).wasteFromNewBars ?? dynamicResult.totalWaste).toFixed(3)),
      parseFloat((((dynamicResult.summary as any).wasteFromNewBars ?? dynamicResult.totalWaste) - 
                  ((greedyResult.summary as any).wasteFromNewBars ?? greedyResult.totalWaste)).toFixed(3)),
    ],
    [
      "Waste from Reused Pieces (m)",
      parseFloat(((greedyResult.summary as any).wasteFromReusedPieces ?? 0).toFixed(3)),
      parseFloat(((dynamicResult.summary as any).wasteFromReusedPieces ?? 0).toFixed(3)),
      parseFloat((((dynamicResult.summary as any).wasteFromReusedPieces ?? 0) - 
                  ((greedyResult.summary as any).wasteFromReusedPieces ?? 0)).toFixed(3)),
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
    // Reusable-waste metrics: distinguish algorithms even when bar count is identical.
    [
      "Reusable Pieces (≥1m)",
      greedyResult.summary.reusablePieces ?? 0,
      dynamicResult.summary.reusablePieces ?? 0,
      (dynamicResult.summary.reusablePieces ?? 0) - (greedyResult.summary.reusablePieces ?? 0),
    ],
    [
      "Reusable Waste (m)",
      parseFloat((greedyResult.summary.reusableWasteLength ?? 0).toFixed(3)),
      parseFloat((dynamicResult.summary.reusableWasteLength ?? 0).toFixed(3)),
      parseFloat(((dynamicResult.summary.reusableWasteLength ?? 0) - (greedyResult.summary.reusableWasteLength ?? 0)).toFixed(3)),
    ],
    [
      "Reusable % of Waste",
      parseFloat((greedyResult.summary.reusablePercentage ?? 0).toFixed(2)),
      parseFloat((dynamicResult.summary.reusablePercentage ?? 0).toFixed(2)),
      parseFloat(((dynamicResult.summary.reusablePercentage ?? 0) - (greedyResult.summary.reusablePercentage ?? 0)).toFixed(2)),
    ],
    [
      "Largest Single Offcut (m)",
      parseFloat((greedyResult.summary.largestOffcut ?? 0).toFixed(3)),
      parseFloat((dynamicResult.summary.largestOffcut ?? 0).toFixed(3)),
      parseFloat(((dynamicResult.summary.largestOffcut ?? 0) - (greedyResult.summary.largestOffcut ?? 0)).toFixed(3)),
    ],
    [],
    ["DETAILED PATTERN COMPARISON", "", "", ""],
    ["Bar #", `${greedyLabel} Cuts`, `${dynamicLabel} Cuts`, "Difference"],
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
      "Best Method",
      dynamicLabel,
      `Saves ${barsSaved} bars and ${wasteSaved.toFixed(3)}m waste`,
      "",
    ]);
  } else if (barsSaved < 0) {
    summaryData.push([
      "Best Method",
      greedyLabel,
      `Saves ${Math.abs(barsSaved)} bars and ${Math.abs(wasteSaved).toFixed(3)}m waste`,
      "",
    ]);
  } else {
    summaryData.push([
      "Best Method",
      "Both Equal",
      "Both bar-cutting methods produce same results",
      "",
    ]);
  }

  // Add note about waste reuse
  if (greedyWasteReused > 0 || dynamicWasteReused > 0) {
    summaryData.push([]);
    summaryData.push(["NOTE", "", "", ""]);
    summaryData.push([
      "Waste Reuse",
      greedyWasteReused > 0 ? `${greedyLabel} reused ${greedyWasteReused} waste pieces` : `${greedyLabel}: No waste reused`,
      dynamicWasteReused > 0 ? `${dynamicLabel} reused ${dynamicWasteReused} waste pieces` : `${dynamicLabel}: No waste reused`,
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

function toExcelSheetName(name: string): string {
  const safeName = name.replace(/[\\/?*\[\]:]/g, "").trim();
  return (safeName || "Algorithm").slice(0, 31);
}
