"use client";

import React, { useState } from "react";
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
  IconLoader,
  IconChartBar,
  IconTrendingDown,
  IconRecycle,
  IconChevronDown,
  IconX,
} from "@tabler/icons-react";
import ClientOnly from "../ui/ClientOnly";

import type { BarCuttingDisplay } from "@/types/BarCuttingRow";

// Type for a single Excel row
export type ExcelRow = BarCuttingDisplay;

interface ReusedPieceInfo {
  dia: number;
  usedInSheetName: string;
  sourceBarNumber: number;
  recoveredLength: number;
}

interface SheetWasteStats {
  v1WastePercentage: number;
  currentWastePercentage: number;
  currentVersion: number;
  totalWasteLength: number;
  diasProcessed: number;
  reusedPiecesBreakdown: ReusedPieceInfo[];
}

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
  wasteStats?: SheetWasteStats | null;
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
  wasteStats = null,
}) => {
  const [showReuseModal, setShowReuseModal] = useState(false);


  if (!fileName) return null;

  return (
    <div className="card-surface mb-[18px] w-full overflow-hidden">
      {/* top stripe */}
      <div className="h-[3px] bg-gradient-to-r from-accent to-sky" />

      <div className="p-6">
        {/* File Header */}
        <div className="mb-6 flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-accent/20 bg-accent/[0.08] text-accent">
            <IconFileSpreadsheet size={28} stroke={1.5} />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="truncate font-display text-[18px] font-bold tracking-[-0.02em]" title={fileName}>
              {fileName}
            </h3>
            <p className="mt-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-ink-3">Excel Workbook</p>
          </div>
          {datasetSizeInfo && (
            <div className={`rounded-full px-2.5 py-1 font-mono text-[10px] font-bold ${datasetSizeInfo.isVeryLargeDataset
              ? "bg-rose-500/10 text-rose-600"
              : datasetSizeInfo.isLargeDataset
                ? "bg-amber-500/15 text-amber-700"
                : "bg-grass/10 text-grass"
              }`}>
              {datasetSizeInfo.fileSizeMB.toFixed(1)} MB
            </div>
          )}
        </div>

        {rows.length > 0 ? (
          <>
            {/* Stats Grid */}
            <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { Icon: IconDatabase, label: "Rows", node: (
                  <><ClientOnly fallback={<span>{rows.length}</span>}><AnimatedNumber value={rows.length} /></ClientOnly>{selectedDia && <span className="ml-1 font-body text-xs text-ink-3">/ {totalRows}</span>}</>
                ), color: "text-ink" },
                { Icon: IconColumns, label: "Columns", node: <ClientOnly fallback={<span>{headers.length}</span>}><AnimatedNumber value={headers.length} /></ClientOnly>, color: "text-ink" },
                { Icon: IconCode, label: "JSON Records", node: <ClientOnly fallback={<span>{jsonData.length}</span>}><AnimatedNumber value={jsonData.length} /></ClientOnly>, color: "text-accent" },
                ...(datasetSizeInfo ? [{ Icon: IconCpu, label: "Mem Usage", node: <>~{datasetSizeInfo.estimatedMemoryUsageMB.toFixed(0)}<span className="ml-0.5 font-body text-xs text-ink-3">MB</span></>, color: "text-ink-2" }] : []),
              ].map((c) => (
                <div key={c.label} className="rounded-[13px] border border-[var(--color-line)] bg-canvas p-3">
                  <div className="mb-1 flex items-center gap-1.5">
                    <c.Icon size={13} className="text-ink-3" />
                    <p className="font-mono text-[9px] font-bold uppercase tracking-[0.1em] text-ink-3">{c.label}</p>
                  </div>
                  <div className={`font-display text-[21px] font-extrabold tracking-[-0.03em] ${c.color}`}>{c.node}</div>
                </div>
              ))}
            </div>

            {/* Waste Stats (versioned) */}
            {wasteStats && (
              <div className="mb-6 border border-slate-100 rounded-xl overflow-hidden">
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 px-4 py-2.5 flex items-center gap-2 border-b border-slate-100">
                  <IconChartBar size={16} className="text-emerald-600" />
                  <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">
                    Waste Analysis
                  </span>
                  {wasteStats.currentVersion > 1 && (
                    <span className="ml-auto text-xs bg-emerald-100 text-emerald-700 font-bold px-2 py-0.5 rounded-full">
                      v{wasteStats.currentVersion}
                    </span>
                  )}
                </div>

                <div className="p-3">
                  {wasteStats.currentVersion <= 1 ? (
                    /* Single version: no reuse yet */
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-green-50 p-3 rounded-xl border border-green-100">
                        <div className="flex items-center gap-1.5 mb-1">
                          <IconChartBar size={13} className="text-green-500" />
                          <p className="text-xs text-green-600 font-medium uppercase tracking-wider">Waste %</p>
                        </div>
                        <div className="flex items-baseline gap-1">
                          <span className="text-xl font-bold text-green-700">
                            <ClientOnly fallback={<span>{wasteStats.currentWastePercentage.toFixed(1)}</span>}>
                              <AnimatedNumber value={parseFloat(wasteStats.currentWastePercentage.toFixed(1))} />
                            </ClientOnly>
                          </span>
                          <span className="text-xs text-green-500">%</span>
                        </div>
                        <p className="text-xs text-green-400 mt-0.5">v1 · baseline</p>
                      </div>
                      <div className="bg-indigo-50 p-3 rounded-xl border border-indigo-100">
                        <div className="flex items-center gap-1.5 mb-1">
                          <IconChartBar size={13} className="text-indigo-500" />
                          <p className="text-xs text-indigo-600 font-medium uppercase tracking-wider">Utilization</p>
                        </div>
                        <div className="flex items-baseline gap-1">
                          <span className="text-xl font-bold text-indigo-700">
                            <ClientOnly fallback={<span>{(100 - wasteStats.currentWastePercentage).toFixed(1)}</span>}>
                              <AnimatedNumber value={parseFloat((100 - wasteStats.currentWastePercentage).toFixed(1))} />
                            </ClientOnly>
                          </span>
                          <span className="text-xs text-indigo-500">%</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* Multi-version: show improvement */
                    <div className="space-y-3">
                      <div className="grid grid-cols-3 gap-2 items-center">
                        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-center">
                          <p className="text-xs text-slate-500 font-medium mb-1">v1 Baseline</p>
                          <p className="text-lg font-bold text-slate-600">
                            {wasteStats.v1WastePercentage.toFixed(1)}
                            <span className="text-xs font-normal">%</span>
                          </p>
                        </div>
                        <div className="flex flex-col items-center gap-1">
                          <IconTrendingDown size={18} className="text-emerald-500" />
                          <span className="text-xs text-emerald-600 font-bold">
                            ▼{(wasteStats.v1WastePercentage - wasteStats.currentWastePercentage).toFixed(1)}%
                          </span>
                        </div>
                        <div className="bg-emerald-50 p-2.5 rounded-xl border border-emerald-200 text-center">
                          <p className="text-xs text-emerald-600 font-medium mb-1">v{wasteStats.currentVersion} Current</p>
                          <p className="text-lg font-bold text-emerald-700">
                            {wasteStats.currentWastePercentage.toFixed(1)}
                            <span className="text-xs font-normal">%</span>
                          </p>
                        </div>
                      </div>
                      <p className="text-xs text-slate-400 text-center">
                        Waste reduced by reusing this sheet's offcuts in later sheets
                      </p>
                    </div>
                  )}

                  {/* Reuse Breakdown — opens in overlay */}
                  {wasteStats.reusedPiecesBreakdown.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setShowReuseModal(true)}
                      className="mt-3 w-full flex items-center gap-1.5 cursor-pointer text-xs font-semibold text-emerald-700 hover:text-emerald-800 transition-colors"
                    >
                      <IconRecycle size={14} className="text-emerald-600" />
                      {wasteStats.reusedPiecesBreakdown.length} bar offcut{wasteStats.reusedPiecesBreakdown.length > 1 ? "s" : ""} reused from this sheet
                      <IconChevronDown size={13} className="ml-auto text-slate-400" />
                    </button>
                  )}
                </div>
              </div>
            )}

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
                className="flex flex-1 items-center justify-center gap-2 rounded-full border border-[var(--color-line-2)] px-4 py-3 font-body text-[14px] font-bold text-ink-2 transition-all hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
              >
                <IconTrash size={18} />
                Clear
              </button>

              <button
                onClick={downloadResults}
                disabled={isDownloading}
                className={`flex flex-[2] items-center justify-center gap-2 rounded-full px-4 py-3 font-body text-[14px] font-bold text-white transition-all ${isDownloading
                    ? "cursor-not-allowed bg-ink-3"
                    : "bg-accent shadow-[0_8px_24px_rgba(99,102,241,0.34)] hover:-translate-y-0.5 hover:bg-accent-deep"
                  }`}
              >
                {isDownloading ? (
                  <>
                    <IconLoader size={18} className="animate-spin" />
                    <span>Generating…</span>
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

      {/* Reuse Breakdown Overlay */}
      {showReuseModal && wasteStats && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-fade-in"
          onClick={() => setShowReuseModal(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col overflow-hidden ring-1 ring-slate-100"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-emerald-50 to-green-50">
              <div className="w-9 h-9 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-600 flex-shrink-0">
                <IconRecycle size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-bold text-slate-900">Waste Reused from This Sheet</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {wasteStats.reusedPiecesBreakdown.length} bar offcut{wasteStats.reusedPiecesBreakdown.length > 1 ? "s" : ""} consumed by later sheets
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowReuseModal(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors flex-shrink-0"
              >
                <IconX size={18} />
              </button>
            </div>

            {/* List */}
            <div className="overflow-y-auto p-4 space-y-1.5">
              {wasteStats.reusedPiecesBreakdown.map((piece, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 text-sm text-slate-600 bg-slate-50 rounded-lg px-3 py-2 border border-slate-100"
                >
                  <span className="font-semibold text-slate-700">Dia {piece.dia}</span>
                  <span className="text-slate-300">·</span>
                  <span>Bar #{piece.sourceBarNumber}</span>
                  <span className="text-slate-300">→</span>
                  <span className="text-emerald-600 font-semibold">{piece.recoveredLength.toFixed(3)}m</span>
                  <span className="text-slate-400 text-xs">used in</span>
                  <span className="font-medium text-slate-700 truncate ml-auto max-w-[160px]" title={piece.usedInSheetName}>
                    {piece.usedInSheetName}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FileInfoCard;
