"use client";

import React from "react";
import AnimatedNumber from "./AnimatedNumber";
import {
  IconFileSpreadsheet,
  IconDatabase,
  IconColumns,
  IconCode,
  IconCpu,
  IconAlertTriangle,
  IconBolt,
  IconTrash,
  IconDownload,
  IconLoader
} from "@tabler/icons-react";
import ClientOnly from "../ui/ClientOnly";

import type { BarCuttingDisplay } from "@/types/BarCuttingRow";

// Type for a single Excel row
export type ExcelRow = BarCuttingDisplay;

interface FileInfoCardProps {
  fileName: string;
  rows: BarCuttingDisplay[];
  headers: string[];
  jsonData: BarCuttingDisplay[];
  clearData: () => void;
  downloadResults: () => void;
  selectedDia?: number | null;
  totalRows?: number;
  datasetSizeInfo?: {
    fileSizeMB: number;
    estimatedMemoryUsageMB: number;
    isLargeDataset: boolean;
    isVeryLargeDataset: boolean;
  };
  isDownloading?: boolean;
}

const FileInfoCard: React.FC<FileInfoCardProps> = ({
  fileName,
  rows,
  headers,
  jsonData,
  clearData,
  downloadResults,
  selectedDia,
  totalRows,
  datasetSizeInfo,
  isDownloading = false,
}) => {


  if (!fileName) return null;

  return (
    <div className="max-w-xl mx-auto bg-white shadow-xl shadow-slate-200/50 rounded-2xl border border-slate-100 overflow-hidden mb-8 animate-fade-in ring-1 ring-slate-100">
      {/* Header Pattern Background */}
      <div className="h-2 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500"></div>

      <div className="p-6">
        {/* File Header */}
        <div className="flex items-start gap-4 mb-6">
          <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0 border border-blue-100 text-blue-600">
            <IconFileSpreadsheet size={28} stroke={1.5} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-bold text-slate-900 truncate" title={fileName}>
              {fileName}
            </h3>
            <p className="text-sm text-slate-500 mt-0.5">
              Excel Workbook
            </p>
          </div>
          {datasetSizeInfo && (
            <div className={`px-2.5 py-1 rounded-lg text-xs font-semibold border ${datasetSizeInfo.isVeryLargeDataset
              ? "bg-red-50 text-red-700 border-red-100"
              : datasetSizeInfo.isLargeDataset
                ? "bg-amber-50 text-amber-700 border-amber-100"
                : "bg-green-50 text-green-700 border-green-100"
              }`}>
              {datasetSizeInfo.fileSizeMB.toFixed(1)} MB
            </div>
          )}
        </div>

        {rows.length > 0 ? (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                <div className="flex items-center gap-1.5 mb-1">
                  <IconDatabase size={14} className="text-slate-400" />
                  <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Rows</p>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-xl font-bold text-slate-900">
                    <ClientOnly fallback={<span>{rows.length}</span>}>
                      <AnimatedNumber value={rows.length} />
                    </ClientOnly>
                  </span>
                  {selectedDia && (
                    <span className="text-xs text-slate-400 font-medium">/ {totalRows}</span>
                  )}
                </div>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                <div className="flex items-center gap-1.5 mb-1">
                  <IconColumns size={14} className="text-slate-400" />
                  <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Columns</p>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-xl font-bold text-slate-900">
                    <ClientOnly fallback={<span>{headers.length}</span>}>
                      <AnimatedNumber value={headers.length} />
                    </ClientOnly>
                  </span>
                </div>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                <div className="flex items-center gap-1.5 mb-1">
                  <IconCode size={14} className="text-slate-400" />
                  <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">JSON Records</p>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-xl font-bold text-indigo-600">
                    <ClientOnly fallback={<span>{jsonData.length}</span>}>
                      <AnimatedNumber value={jsonData.length} />
                    </ClientOnly>
                  </span>
                </div>
              </div>

              {datasetSizeInfo && (
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <div className="flex items-center gap-1.5 mb-1">
                    <IconCpu size={14} className="text-slate-400" />
                    <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Mem Usage</p>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-xl font-bold text-slate-700">
                      ~{datasetSizeInfo.estimatedMemoryUsageMB.toFixed(0)}
                    </span>
                    <span className="text-xs text-slate-400">MB</span>
                  </div>
                </div>
              )}
            </div>

            {/* Warnings */}
            {datasetSizeInfo?.isLargeDataset && (
              <div className={`flex items-center gap-2 p-3 rounded-xl text-sm mb-6 ${datasetSizeInfo.isVeryLargeDataset
                  ? "bg-red-50 text-red-700 border border-red-100"
                  : "bg-amber-50 text-amber-700 border border-amber-100"
                }`}>
                <span>{datasetSizeInfo.isVeryLargeDataset ? <IconAlertTriangle size={18} /> : <IconBolt size={18} />}</span>
                <span className="font-medium">
                  {datasetSizeInfo.isVeryLargeDataset
                    ? "Very large dataset. Performance may be impacted."
                    : "Large dataset. Optimization might take longer."}
                </span>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={clearData}
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-semibold
                hover:bg-red-50 hover:text-red-600 hover:border-red-100
                focus:outline-none focus:ring-2 focus:ring-red-100 transition-all duration-200 flex items-center justify-center gap-2"
              >
                <IconTrash size={18} />
                Clear
              </button>

              <button
                onClick={downloadResults}
                disabled={isDownloading}
                className={`flex-[2] px-4 py-2.5 rounded-xl font-semibold shadow-lg shadow-blue-500/20 text-white flex items-center justify-center gap-2 transition-all
                  ${isDownloading
                    ? "bg-slate-400 cursor-not-allowed shadow-none"
                    : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 active:scale-95"
                  }`}
              >
                {isDownloading ? (
                  <>
                    <IconLoader size={18} className="animate-spin" />
                    <span>Generating...</span>
                  </>
                ) : (
                  <>
                    <IconDownload size={18} />
                    <span>Download Results</span>
                  </>
                )}
              </button>
            </div>
          </>
        ) : (
          <div className="text-center py-8">
            <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3 text-slate-300">
              <IconFileSpreadsheet size={32} />
            </div>
            <p className="text-slate-500 italic">No data uploaded yet</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default FileInfoCard;
