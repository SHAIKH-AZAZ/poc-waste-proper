import type { CuttingStockResult } from "@/types/CuttingStock";

/**
 * Export cutting stock results to JSON
 */
export function exportCuttingStockResults(
  greedyResult: CuttingStockResult | null,
  dynamicResult: CuttingStockResult | null,
  fileName: string
): void {
  const exportData = {
    exportDate: new Date().toISOString(),
    fileName,
    results: {
      greedy: greedyResult,
      dynamic: dynamicResult,
    },
    comparison:
      greedyResult && dynamicResult
        ? {
            barsSaved: greedyResult.totalBarsUsed - dynamicResult.totalBarsUsed,
            wasteSaved: greedyResult.totalWaste - dynamicResult.totalWaste,
            utilizationImprovement:
              dynamicResult.averageUtilization -
              greedyResult.averageUtilization,
          }
        : null,
  };

  const blob = new Blob([JSON.stringify(exportData, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `cutting_stock_${fileName.replace(/\.[^/.]+$/, "")}_dia_${greedyResult?.dia || dynamicResult?.dia}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * Export cutting instructions to CSV
 */
export function exportCuttingInstructions(
  result: CuttingStockResult,
  fileName: string
): void {
  const csvRows: string[] = [];

  // Header
  csvRows.push(
    "Bar Number,BarCode,Segment ID,Length (m),Position (m),Has Lap,Waste (m),Utilization (%)"
  );

  // Data rows
  for (const detail of result.detailedCuts) {
    for (const cut of detail.cuts) {
      csvRows.push(
        [
          detail.barNumber,
          cut.barCode,
          cut.segmentId,
          cut.length.toFixed(3),
          cut.position.toFixed(3),
          cut.hasLap ? "Yes" : "No",
          detail.waste.toFixed(3),
          detail.utilization.toFixed(2),
        ].join(",")
      );
    }
  }

  const csvContent = csvRows.join("\n");
  const blob = new Blob([csvContent], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `cutting_instructions_${result.algorithm}_${fileName.replace(/\.[^/.]+$/, "")}_dia_${result.dia}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
