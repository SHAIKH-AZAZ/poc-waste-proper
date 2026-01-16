"use client";
import React from "react";
import { getUniqueDiaFromDisplay, getDisplayDiaSummary } from "@/utils/barCodeUtils";
import ClientOnly from "../ui/ClientOnly";
import type { BarCuttingDisplay } from "@/types/BarCuttingRow";
import { IconFilter, IconDownload, IconLoader, IconSum, IconRuler2, IconLayoutList } from "@tabler/icons-react";

interface DiaFilterProps {
  data: BarCuttingDisplay[];
  selectedDia: number | null;
  onDiaSelect: (dia: number | null) => void;
  onDownloadAll?: () => void;
  isDownloadingAll?: boolean;
}

export default function DiaFilter({ data, selectedDia, onDiaSelect, onDownloadAll, isDownloadingAll = false }: DiaFilterProps) {
  const uniqueDias = getUniqueDiaFromDisplay(data);

  if (uniqueDias.length === 0) return null;

  return (
    <ClientOnly>
      <div className="w-full max-w-7xl mx-auto bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden ring-1 ring-slate-100 mb-8 animate-fade-in">
        {/* Header */}
        <div className="bg-white border-b border-slate-100 px-6 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600 border border-blue-100">
              <IconFilter size={20} />
            </div>
            Filter by Diameter
          </h3>

          {onDownloadAll && uniqueDias.length > 1 && (
            <button
              onClick={onDownloadAll}
              disabled={isDownloadingAll}
              className={`px-4 py-2 rounded-xl font-semibold transition-all duration-200 flex items-center gap-2 shadow-lg shadow-purple-500/20 text-sm
                ${isDownloadingAll
                  ? "bg-slate-100 text-slate-400 cursor-not-allowed shadow-none border border-slate-200"
                  : "bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:from-purple-700 hover:to-indigo-700 active:scale-95"
                }`}
            >
              {isDownloadingAll ? (
                <>
                  <IconLoader size={18} className="animate-spin" />
                  <span>Generating Report...</span>
                </>
              ) : (
                <>
                  <IconDownload size={18} />
                  <span>Download All Dias</span>
                </>
              )}
            </button>
          )}
        </div>

        <div className="p-6">
          {/* Filter Buttons Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-6">
            {/* Show All Button */}
            <button
              onClick={() => onDiaSelect(null)}
              className={`col-span-2 px-4 py-3 rounded-xl font-medium transition-all duration-200 border flex flex-col items-center justify-center relative overflow-hidden group
                ${selectedDia === null
                  ? "bg-blue-50 border-blue-200 text-blue-700 shadow-sm"
                  : "bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                }`}
            >
              <span className="text-sm font-bold relative z-10">Show All</span>
              <span className={`text-xs mt-0.5 relative z-10 ${selectedDia === null ? "text-blue-600" : "text-slate-400"}`}>
                {data.length} total rows
              </span>
              {selectedDia === null && (
                <div className="absolute inset-0 bg-blue-100/50 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              )}
            </button>

            {/* Individual Dia Buttons */}
            {uniqueDias.map((dia) => {
              const summary = getDisplayDiaSummary(data, dia);
              const isSelected = selectedDia === dia;

              return (
                <button
                  key={dia}
                  onClick={() => onDiaSelect(dia)}
                  className={`px-3 py-2.5 rounded-xl font-medium transition-all duration-200 border flex flex-col items-center justify-center relative overflow-hidden group
                    ${isSelected
                      ? "bg-green-50 border-green-200 text-green-700 shadow-sm ring-1 ring-green-200"
                      : "bg-white border-slate-200 text-slate-600 hover:border-green-200 hover:bg-green-50/30"
                    }`}
                >
                  <span className="text-sm font-bold relative z-10">Dia {dia}mm</span>
                  <span className={`text-xs mt-0.5 relative z-10 ${isSelected ? "text-green-600" : "text-slate-400"}`}>
                    {summary.rowCount} rows
                  </span>
                </button>
              );
            })}
          </div>

          {/* Summary for selected Dia */}
          {selectedDia && (
            <div className="animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-5 relative overflow-hidden">
                {/* Decorative background element */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>

                <h4 className="font-semibold text-slate-700 mb-4 flex items-center gap-2">
                  <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center text-green-700">
                    <IconSum size={14} stroke={3} />
                  </div>
                  Summary for Dia {selectedDia}mm
                </h4>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  {(() => {
                    const summary = getDisplayDiaSummary(data, selectedDia);
                    return (
                      <>
                        <div className="text-center md:text-left">
                          <div className="flex items-center justify-center md:justify-start gap-1 mb-1 text-slate-500">
                            <IconLayoutList size={14} />
                            <p className="text-xs uppercase tracking-wider font-medium">Rows</p>
                          </div>
                          <p className="text-xl font-bold text-slate-800">{summary.rowCount}</p>
                        </div>
                        <div className="text-center md:text-left">
                          <div className="flex items-center justify-center md:justify-start gap-1 mb-1 text-slate-500">
                            <IconLayoutList size={14} />
                            <p className="text-xs uppercase tracking-wider font-medium">Total Bars</p>
                          </div>
                          <p className="text-xl font-bold text-slate-800">{summary.totalBars}</p>
                        </div>
                        <div className="text-center md:text-left">
                          <div className="flex items-center justify-center md:justify-start gap-1 mb-1 text-slate-500">
                            <IconRuler2 size={14} />
                            <p className="text-xs uppercase tracking-wider font-medium">Total Cut Length</p>
                          </div>
                          <p className="text-xl font-bold text-slate-800 font-mono tracking-tight">{summary.totalCuttingLength}m</p>
                        </div>
                        <div className="text-center md:text-left">
                          <div className="flex items-center justify-center md:justify-start gap-1 mb-1 text-slate-500">
                            <IconRuler2 size={14} />
                            <p className="text-xs uppercase tracking-wider font-medium">Total Lap Length</p>
                          </div>
                          <p className="text-xl font-bold text-slate-800 font-mono tracking-tight">{summary.totalLapLength}m</p>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </ClientOnly>
  );
}