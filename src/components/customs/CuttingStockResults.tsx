"use client";
import React from "react";
import type { CuttingStockResult, CutInstruction } from "@/types/CuttingStock";
import ClientOnly from "../ui/ClientOnly";
import {
  exportCuttingStockResults,
  exportCuttingInstructions,
} from "@/utils/cuttingStockExport";
import { exportToExcel } from "@/utils/excelExport";
import { IconScissors, IconFileSpreadsheet, IconFileCode, IconChartBar, IconClock, IconRecycle, IconRuler2, IconLayoutList } from "@tabler/icons-react";

interface CuttingStockResultsProps {
  greedyResult: CuttingStockResult | null;
  dynamicResult: CuttingStockResult | null;
  isLoading: boolean;
  fileName?: string;
  greedyProgress?: { stage: string; percentage: number };
  dynamicProgress?: { stage: string; percentage: number };
}

export default function CuttingStockResults({
  greedyResult,
  dynamicResult,
  isLoading,
  fileName = "data",
  greedyProgress = { stage: "", percentage: 0 },
  dynamicProgress = { stage: "", percentage: 0 },
}: CuttingStockResultsProps) {

  const handleExportAll = () => {
    exportCuttingStockResults(greedyResult, dynamicResult, fileName);
  };

  const handleExportExcel = () => {
    exportToExcel(greedyResult, dynamicResult, fileName);
  };
  if (isLoading) {
    return (
      <div className="w-full max-w-7xl mx-auto p-6 bg-white rounded-xl shadow-lg mb-6">
        <div className="py-8">
          <h3 className="text-xl font-bold text-gray-800 mb-6 text-center">
            Calculating Optimal Cutting Patterns...
          </h3>

          {/* Greedy Algorithm Progress */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-blue-700">Greedy Algorithm</span>
              <span className="text-sm font-medium text-blue-700">{greedyProgress.percentage}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
              <div
                className="bg-blue-500 h-full transition-all duration-300 ease-out"
                style={{ width: `${greedyProgress.percentage}%` }}
              />
            </div>
            {greedyProgress.stage && (
              <p className="text-xs text-gray-600 mt-1">{greedyProgress.stage}</p>
            )}
          </div>

          {/* Dynamic Programming Progress */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-green-700">Dynamic Programming</span>
              <span className="text-sm font-medium text-green-700">{dynamicProgress.percentage}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
              <div
                className="bg-green-500 h-full transition-all duration-300 ease-out"
                style={{ width: `${dynamicProgress.percentage}%` }}
              />
            </div>
            {dynamicProgress.stage && (
              <p className="text-xs text-gray-600 mt-1">{dynamicProgress.stage}</p>
            )}
          </div>

          <p className="text-center text-sm text-gray-500 mt-6">
            Running algorithms in parallel using Web Workers...
          </p>
        </div>
      </div>
    );
  }

  if (!greedyResult && !dynamicResult) {
    return null;
  }

  return (
    <ClientOnly>
      <div className="w-full max-w-7xl mx-auto space-y-6 mb-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 border border-indigo-100">
              <IconScissors size={24} />
            </div>
            Cutting Stock Optimization Results
          </h2>
          <div className="flex gap-2">
            <button
              onClick={handleExportExcel}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 font-medium shadow-sm active:scale-95"
            >
              <IconFileSpreadsheet size={18} /> Export Excel
            </button>
            <button
              onClick={handleExportAll}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 font-medium shadow-sm active:scale-95"
            >
              <IconFileCode size={18} /> Export JSON
            </button>
          </div>
        </div>

        {/* Comparison Summary */}
        {greedyResult && dynamicResult && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ComparisonCard
              title="Greedy Algorithm"
              result={greedyResult}
              color="blue"
            />
            <ComparisonCard
              title="Dynamic Programming"
              result={dynamicResult}
              color="green"
            />
          </div>
        )}

        {/* Detailed Results */}
        {greedyResult && (
          <DetailedResultCard title="Greedy Algorithm" result={greedyResult} />
        )}

        {dynamicResult && (
          <DetailedResultCard
            title="Dynamic Programming"
            result={dynamicResult}
          />
        )}
      </div>
    </ClientOnly>
  );
}

function ComparisonCard({
  title,
  result,
  color,
}: {
  title: string;
  result: CuttingStockResult;
  color: string;
}) {
  const bgColor = color === "blue" ? "bg-blue-50" : "bg-green-50";
  const borderColor =
    color === "blue" ? "border-blue-200" : "border-green-200";
  const textColor = color === "blue" ? "text-blue-800" : "text-green-800";

  return (
    <div className={`${bgColor} border ${borderColor} rounded-lg p-4`}>
      <h3 className={`font-bold ${textColor} mb-3`}>{title}</h3>
      <div className="space-y-2 text-sm">
        <div className="flex justify-between items-start">
          <span className="text-gray-600 flex items-center gap-1.5 mt-0.5"><IconLayoutList size={14} /> Stock Used:</span>
          <div className="flex flex-col items-end">
            <span className="font-bold">{result.totalBarsUsed} total</span>
            {result.detailedCuts.filter(d => (d as any).isFromWaste || d.patternId?.startsWith("waste_")).length > 0 && (
              <span className="text-[10px] text-gray-500 font-medium">
                ({result.totalBarsUsed - result.detailedCuts.filter(d => (d as any).isFromWaste || d.patternId?.startsWith("waste_")).length} new + <span className="text-purple-600">{result.detailedCuts.filter(d => (d as any).isFromWaste || d.patternId?.startsWith("waste_")).length} reused</span>)
              </span>
            )}
          </div>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600 flex items-center gap-1.5"><IconRecycle size={14} /> Net Waste:</span>
          <div className="flex flex-col items-end">
            <span className="font-bold">{(result as any).summary?.totalWasteLength?.toFixed(3) || result.totalWaste.toFixed(3)}m</span>
            {(result as any).summary?.wasteFromNewBars !== undefined && (result as any).summary?.wasteFromReusedPieces !== undefined && (
              <span className="text-[10px] text-gray-500 font-medium">
                ({(result as any).summary.wasteFromNewBars.toFixed(3)}m new + {(result as any).summary.wasteFromReusedPieces.toFixed(3)}m reused)
              </span>
            )}
          </div>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600 flex items-center gap-1.5"><IconChartBar size={14} /> Avg Utilization:</span>
          <span className="font-bold">
            {result.averageUtilization.toFixed(2)}%
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600 flex items-center gap-1.5"><IconClock size={14} /> Execution Time:</span>
          <span className="font-bold">
            {result.executionTime.toFixed(2)}ms
          </span>
        </div>
      </div>
    </div>
  );
}

function DetailedResultCard({
  title,
  result,
}: {
  title: string;
  result: CuttingStockResult;
}) {
  const [isExpanded, setIsExpanded] = React.useState(false);

  const handleExportInstructions = () => {
    exportCuttingInstructions(result, `${result.algorithm}_dia_${result.dia}`);
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-md">
      <div className="p-4">
        <div className="flex justify-between items-center">
          <div
            className="flex-1 cursor-pointer hover:bg-gray-50 transition-colors p-2 rounded"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-gray-800 text-lg">{title} - Details</h3>
              <span
                className={`transform transition-transform ${isExpanded ? "rotate-180" : ""}`}
              >
                ▼
              </span>
            </div>
          </div>
          <button
            onClick={handleExportInstructions}
            className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors"
          >
            📄 Export CSV
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="p-4 border-t border-gray-200">
          {/* Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
            <StatCard
              label="Stock Used"
              value={result.summary.totalStandardBars}
              subValue={
                result.detailedCuts.some(d => (d as any).isFromWaste)
                  ? `${result.detailedCuts.filter(d => (d as any).isFromWaste).length} reused`
                  : undefined
              }
            />
            <StatCard
              label="Total Waste"
              value={`${result.summary.totalWasteLength.toFixed(3)}m`}
            />
            <StatCard
              label="Waste %"
              value={`${result.summary.totalWastePercentage.toFixed(2)}%`}
            />
            <StatCard
              label="Patterns"
              value={result.summary.patternCount}
            />
            <StatCard
              label="Cuts Produced"
              value={result.summary.totalCutsProduced}
            />
            <StatCard
              label="Avg Utilization"
              value={`${result.summary.averageUtilization.toFixed(2)}%`}
            />
          </div>

          {/* Cutting Patterns Table */}

          {/* Cutting Patterns Table Container */}
          <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex justify-between items-center">
            <h4 className="font-bold text-slate-800 flex items-center gap-2">
              <span className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center text-blue-700 border border-blue-200">
                <IconScissors size={18} />
              </span>
              Cutting Patterns
              Cutting Patterns
            </h4>
            <span className="bg-white border border-slate-200 px-3 py-1 rounded-lg text-xs font-medium text-slate-600">
              {result.detailedCuts.length} items total
            </span>
          </div>

          <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
            <table className="min-w-full divide-y divide-slate-100 relative">
              <thead className="bg-slate-50/50 sticky top-0 z-10 backdrop-blur-sm shadow-sm">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider w-16">Bar #</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider w-32">Source</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Cuts Layout</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider w-32">Waste</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider w-40">Utilization</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {[...result.detailedCuts]
                  .sort((a, b) => {
                    // Sort: Reused waste FIRST, then by bar number
                    const aIsWaste = (a as any).isFromWaste || a.patternId?.startsWith("waste_");
                    const bIsWaste = (b as any).isFromWaste || b.patternId?.startsWith("waste_");
                    if (aIsWaste && !bIsWaste) return -1;
                    if (!aIsWaste && bIsWaste) return 1;
                    return a.barNumber - b.barNumber;
                  })
                  .map((detail, index) => {
                    // Calculate actual waste based on bar length
                    const barLength = detail.isFromWaste && detail.wasteSource
                      ? detail.wasteSource.originalLength / 1000
                      : 12.0;
                    const totalUsed = detail.cuts.reduce((sum, cut) =>
                      sum + cut.length, 0
                    );
                    // Fix floating point precision issues (e.g. -0.00000001 becoming -0.000)
                    let actualWaste = barLength - totalUsed;
                    if (Math.abs(actualWaste) < 0.0001) actualWaste = 0;

                    const actualUtilization = (totalUsed / barLength) * 100;

                    return (
                      <tr
                        key={index}
                        className="group hover:bg-slate-50/80 transition-colors"
                      >
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold shadow-sm border ${detail.isFromWaste
                            ? 'bg-purple-50 text-purple-700 border-purple-100'
                            : 'bg-blue-50 text-blue-700 border-blue-100'
                            }`}>
                            {detail.barNumber}
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {detail.isFromWaste && detail.wasteSource ? (
                            <div className="flex flex-col gap-1">
                              <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-purple-50 text-purple-700 rounded-md border border-purple-100 w-fit">
                                <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span>
                                <span className="text-xs font-semibold">Reused</span>
                              </div>
                              <div className="flex flex-col text-[10px] text-slate-500 leading-tight">
                                <span>Length: {(detail.wasteSource.originalLength / 1000).toFixed(2)}m</span>
                                <span>From: Sheet {detail.wasteSource.sourceSheetNumber || detail.wasteSource.sourceSheetId}</span>
                              </div>
                            </div>
                          ) : (
                            <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-blue-50 text-blue-700 rounded-md border border-blue-100">
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                              <span className="text-xs font-semibold">New 12m</span>
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <CutsDisplay cuts={detail.cuts} />
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          <div className="flex flex-col items-end gap-1">
                            <span className={`font-mono font-medium ${actualWaste > 1 ? 'text-red-600' : 'text-slate-600'}`}>
                              {actualWaste.toFixed(3)}m
                            </span>

                            {/* Recovery Indicator */}
                            {(detail as any).isWasteRecovered && (
                              <div className="flex flex-col gap-0.5 items-end">
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-green-100 text-green-700 border border-green-200">
                                  <IconRecycle size={10} className="mr-1" />
                                  ♻️ {(detail as any).recoveredAmount?.toFixed(2)}m reused
                                </span>
                                <span className="text-[10px] text-green-600 font-medium">
                                  in {(detail as any).recoveredWasteInfo?.usedInSheet || 'another sheet'}
                                </span>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          <div className="flex flex-col items-end gap-1">
                            <span className="font-bold text-slate-800 text-sm">
                              {actualUtilization.toFixed(1)}%
                            </span>
                            <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden border border-slate-100">
                              <div
                                className={`h-full rounded-full ${actualUtilization > 95 ? 'bg-gradient-to-r from-green-500 to-emerald-500' :
                                  actualUtilization > 85 ? 'bg-gradient-to-r from-yellow-400 to-amber-500' :
                                    'bg-gradient-to-r from-red-400 to-red-500'
                                  }`}
                                style={{ width: `${Math.min(actualUtilization, 100)}%` }}
                              />
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function CutsDisplay({ cuts }: { cuts: CutInstruction[] }) {
  // Group cuts by parent BarCode
  const groupedCuts = React.useMemo(() => {
    const groups = new Map<string, { length: number; lapLength: number; count: number }>();

    for (const cut of cuts) {
      const existing = groups.get(cut.barCode);
      if (existing) {
        existing.count += cut.quantity;
      } else {
        groups.set(cut.barCode, {
          length: cut.length,
          lapLength: cut.lapLength,
          count: cut.quantity,
        });
      }
    }

    return Array.from(groups.entries());
  }, [cuts]);

  // Calculate total length used
  // Note: cut.length already includes lap (cutting length = effective + lap)
  const totalUsed = React.useMemo(() => {
    return cuts.reduce((sum, cut) => sum + cut.length, 0);
  }, [cuts]);

  return (
    <div className="flex flex-wrap gap-2">
      {groupedCuts.map(([barCode, info], i) => {
        // Clean up barcode display: remove _instance_X suffix
        const cleanBarCode = barCode.replace(/_|instance|\[\d+\]|\d+$/g, '').replace(/\/+$/, '');
        // Or simpler: just take the part before _instance if it exists
        const displayBarCode = barCode.split('_instance')[0];

        return (
          <div key={i} className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm group hover:border-blue-300 hover:bg-blue-50/50 transition-colors">
            <span className="font-mono text-blue-600 font-semibold text-xs tracking-tight" title={barCode}>
              {displayBarCode}
            </span>
            <div className="flex flex-col leading-none gap-0.5">
              <span className="font-bold text-slate-700 text-xs">
                {(info.length - info.lapLength).toFixed(3)}m
              </span>
              {info.lapLength > 0 && (
                <span className="text-[10px] text-orange-600 font-medium bg-orange-50 px-1 rounded-sm">
                  +Lap
                </span>
              )}
            </div>
            {info.count > 1 && (
              <span className="ml-1 text-xs font-bold text-white bg-slate-400 px-1.5 py-0.5 rounded-md">
                ×{info.count}
              </span>
            )}
          </div>
        );
      })}
      {groupedCuts.length > 0 && (
        <div className="flex items-center ml-2">
          <span className="text-[10px] text-slate-400 bg-slate-50 px-2 py-1 rounded-full border border-slate-100">
            Total: {totalUsed.toFixed(3)}m
          </span>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, subValue }: { label: string; value: string | number; subValue?: string }) {
  return (
    <div className="bg-gray-50 border border-gray-200 rounded p-3 text-center">
      <div className="text-xs text-gray-600 mb-1">{label}</div>
      <div className="text-lg font-bold text-gray-800">{value}</div>
      {subValue && <div className="text-[10px] text-purple-600 font-medium">{subValue}</div>}
    </div>
  );
}
