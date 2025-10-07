import { track } from "@vercel/analytics";

// Custom analytics events for cutting stock optimization
export const analytics = {
  // File upload events
  fileUploaded: (fileName: string, rowCount: number, fileSize: number) => {
    track("file_uploaded", {
      fileName: fileName.replace(/[^a-zA-Z0-9.-]/g, ""), // Remove sensitive info
      rowCount,
      fileSize,
      timestamp: new Date().toISOString(),
    });
  },

  // Algorithm execution events
  algorithmExecuted: (
    algorithm: string,
    dia: number,
    segmentCount: number,
    executionTime: number,
    barsUsed: number,
    wasteAmount: number,
    utilization: number
  ) => {
    track("algorithm_executed", {
      algorithm,
      dia,
      segmentCount,
      executionTime: Math.round(executionTime),
      barsUsed,
      wasteAmount: Math.round(wasteAmount * 1000) / 1000,
      utilization: Math.round(utilization * 100) / 100,
      timestamp: new Date().toISOString(),
    });
  },

  // Results download events
  resultsDownloaded: (
    format: "json" | "excel",
    algorithm: string,
    dia: number,
    barsCount: number
  ) => {
    track("results_downloaded", {
      format,
      algorithm,
      dia,
      barsCount,
      timestamp: new Date().toISOString(),
    });
  },

  // Diameter selection events
  diameterSelected: (dia: number, totalRows: number) => {
    track("diameter_selected", {
      dia,
      totalRows,
      timestamp: new Date().toISOString(),
    });
  },

  // Error tracking
  algorithmError: (algorithm: string, error: string, segmentCount: number) => {
    track("algorithm_error", {
      algorithm,
      error: error.substring(0, 100), // Limit error message length
      segmentCount,
      timestamp: new Date().toISOString(),
    });
  },

  // Performance tracking
  performanceMetric: (
    metric: "large_dataset_warning" | "memory_usage" | "processing_time",
    value: number,
    context?: string
  ) => {
    track("performance_metric", {
      metric,
      value,
      context: context || "none",
      timestamp: new Date().toISOString(),
    });
  },

  // Feature usage
  featureUsed: (
    feature: "excel_upload" | "dia_filter" | "results_comparison" | "export_all_dias" | "advanced_algorithms",
    details?: string
  ) => {
    track("feature_used", {
      feature,
      details: details || "none",
      timestamp: new Date().toISOString(),
    });
  },
};