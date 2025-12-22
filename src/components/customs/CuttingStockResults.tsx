"use client";
import React from "react";
import type { CuttingStockResult, CutInstruction } from "@/types/CuttingStock";
import ClientOnly from "../ui/ClientOnly";
import {
  exportCuttingStockResults,
  exportCuttingInstructions,
} from "@/utils/cuttingStockExport";
import { exportToExcel } from "@/utils/excelExport";

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
            <span className="text-2xl">📐</span> Cutting Stock Optimization
            Results
          </h2>
          <div className="flex gap-2">
            <button
              onClick={handleExportExcel}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
            >
              <span>📊</span> Export Excel
            </button>
            <button
              onClick={handleExportAll}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <span>📥</span> Export JSON
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
        <div className="flex justify-between">
          <span className="text-gray-600">Standard Bars Used:</span>
          <span className="font-bold">{result.totalBarsUsed}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Total Waste:</span>
          <span className="font-bold">{result.totalWaste.toFixed(3)}m</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Avg Utilization:</span>
          <span className="font-bold">
            {result.averageUtilization.toFixed(2)}%
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Execution Time:</span>
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
              label="Total Bars"
              value={result.summary.totalStandardBars}
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
          <div className="overflow-x-auto">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold text-gray-700">
                Cutting Patterns (12m Standard Bars):
              </h4>
              <span className="text-xs text-gray-500">
                {result.detailedCuts.length} bars total
              </span>
            </div>
            
            {/* Legend */}
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex flex-wrap gap-4 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-blue-700 font-semibold">1/B1/12</span>
                  <span className="text-gray-500">= BarCode</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-gray-400">→</span>
                  <span className="font-bold text-gray-800">5.750m</span>
                  <span className="text-gray-500">= Cutting Length</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">×2</span>
                  <span className="text-gray-500">= Quantity</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-orange-700 bg-orange-100 px-1.5 py-0.5 rounded font-medium">LAP</span>
                  <span className="text-gray-500">= Requires lap joint</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded text-[10px] font-medium">
                    ♻️ Waste
                  </span>
                  <span className="text-gray-500">= From waste inventory</span>
                </div>
              </div>
            </div>
            <table className="min-w-full border border-gray-300 bg-white">
              <thead className="bg-gradient-to-r from-gray-100 to-gray-200">
                <tr>
                  <th className="border border-gray-300 px-3 py-2 text-center text-sm font-semibold text-gray-700 w-20">
                    Bar #
                  </th>
                  <th className="border border-gray-300 px-3 py-2 text-center text-sm font-semibold text-gray-700 w-28">
                    Source
                  </th>
                  <th className="border border-gray-300 px-4 py-2 text-left text-sm font-semibold text-gray-700">
                    Cuts (BarCode → Length)
                  </th>
                  <th className="border border-gray-300 px-3 py-2 text-right text-sm font-semibold text-gray-700 w-28">
                    Waste (m)
                  </th>
                  <th className="border border-gray-300 px-3 py-2 text-right text-sm font-semibold text-gray-700 w-32">
                    Utilization
                  </th>
                </tr>
              </thead>
              <tbody>
                {result.detailedCuts.map((detail, index) => {
                  // Calculate actual waste based on bar length
                  const barLength = detail.isFromWaste && detail.wasteSource 
                    ? detail.wasteSource.originalLength / 1000 
                    : 12.0;
                  const totalUsed = detail.cuts.reduce((sum, cut) => 
                    sum + cut.length, 0
                  );
                  const actualWaste = barLength - totalUsed;
                  const actualUtilization = (totalUsed / barLength) * 100;

                  return (
                    <tr 
                      key={index} 
                      className={`hover:bg-blue-50 transition-colors ${detail.isFromWaste ? 'bg-purple-50/50' : ''}`}
                    >
                      <td className="border border-gray-300 px-3 py-3 text-center">
                        <span className={`inline-flex items-center justify-center w-8 h-8 font-bold text-sm rounded-full ${
                          detail.isFromWaste 
                            ? 'bg-purple-100 text-purple-700' 
                            : 'bg-blue-100 text-blue-700'
                        }`}>
                          {detail.barNumber}
                        </span>
                      </td>
                      <td className="border border-gray-300 px-3 py-3 text-center">
                        {detail.isFromWaste && detail.wasteSource ? (
                          <div className="flex flex-col items-center gap-1">
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs font-medium">
                              ♻️ Waste
                            </span>
                            <span className="text-[10px] text-gray-500">
                              Sheet #{detail.wasteSource.sourceSheetNumber || detail.wasteSource.sourceSheetId}, Bar #{detail.wasteSource.sourceBarNumber}
                            </span>
                            <span className="text-[10px] text-gray-400">
                              ({(detail.wasteSource.originalLength / 1000).toFixed(2)}m)
                            </span>
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                            🆕 New 12m
                          </span>
                        )}
                      </td>
                      <td className="border border-gray-300 px-4 py-3">
                        <CutsDisplay cuts={detail.cuts} />
                      </td>
                      <td className="border border-gray-300 px-3 py-3 text-right">
                        <span className={`font-semibold ${actualWaste > 1 ? 'text-red-600' : 'text-green-600'}`}>
                          {actualWaste.toFixed(3)}
                        </span>
                      </td>
                      <td className="border border-gray-300 px-3 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <span className="font-semibold text-gray-800">
                            {actualUtilization.toFixed(2)}%
                          </span>
                          <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div 
                              className={`h-full ${actualUtilization > 95 ? 'bg-green-500' : actualUtilization > 85 ? 'bg-yellow-500' : 'bg-red-500'}`}
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
    <div className="space-y-1.5">
      {groupedCuts.map(([barCode, info], i) => (
        <div key={i} className="flex items-center gap-2 py-0.5">
          <div className="flex items-center gap-1.5 flex-1">
            <span className="font-mono text-blue-700 font-semibold text-xs">
              {barCode}
            </span>
            <span className="text-gray-400">→</span>
            <span className="font-bold text-gray-800 text-xs">
              {(info.length - info.lapLength).toFixed(3)}m
            </span>
            {info.lapLength > 0 && (
              <span className="text-[10px] text-orange-700 bg-orange-100 px-1.5 py-0.5 rounded font-medium">
                +{info.lapLength.toFixed(3)}m lap
              </span>
            )}
            {info.count > 1 && (
              <span className="text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                ×{info.count}
              </span>
            )}
          </div>
        </div>
      ))}
      {groupedCuts.length > 1 && (
        <div className="pt-1 mt-1 border-t border-gray-200">
          <span className="text-[10px] text-gray-500">
            Total used: {totalUsed.toFixed(3)}m
          </span>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-gray-50 border border-gray-200 rounded p-3 text-center">
      <div className="text-xs text-gray-600 mb-1">{label}</div>
      <div className="text-lg font-bold text-gray-800">{value}</div>
    </div>
  );
}
