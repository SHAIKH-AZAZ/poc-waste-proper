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
}

export default function CuttingStockResults({
  greedyResult,
  dynamicResult,
  isLoading,
  fileName = "data",
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
        <div className="flex items-center justify-center py-12">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-gray-600 font-medium">
              Calculating optimal cutting patterns...
            </p>
          </div>
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
              </div>
            </div>
            <table className="min-w-full border border-gray-300 bg-white">
              <thead className="bg-gradient-to-r from-gray-100 to-gray-200">
                <tr>
                  <th className="border border-gray-300 px-3 py-2 text-center text-sm font-semibold text-gray-700 w-20">
                    Bar #
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
                {result.detailedCuts.map((detail, index) => (
                  <tr key={index} className="hover:bg-blue-50 transition-colors">
                    <td className="border border-gray-300 px-3 py-3 text-center">
                      <span className="inline-flex items-center justify-center w-8 h-8 bg-blue-100 text-blue-700 font-bold text-sm rounded-full">
                        {detail.barNumber}
                      </span>
                    </td>
                    <td className="border border-gray-300 px-4 py-3">
                      <CutsDisplay cuts={detail.cuts} />
                    </td>
                    <td className="border border-gray-300 px-3 py-3 text-right">
                      <span className={`font-semibold ${detail.waste > 1 ? 'text-red-600' : 'text-green-600'}`}>
                        {detail.waste.toFixed(3)}
                      </span>
                    </td>
                    <td className="border border-gray-300 px-3 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <span className="font-semibold text-gray-800">
                          {detail.utilization.toFixed(2)}%
                        </span>
                        <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className={`h-full ${detail.utilization > 95 ? 'bg-green-500' : detail.utilization > 85 ? 'bg-yellow-500' : 'bg-red-500'}`}
                            style={{ width: `${detail.utilization}%` }}
                          />
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
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
    const groups = new Map<string, { length: number; count: number; hasLap: boolean }>();
    
    for (const cut of cuts) {
      const existing = groups.get(cut.barCode);
      if (existing) {
        existing.count += cut.quantity;
      } else {
        groups.set(cut.barCode, {
          length: cut.length,
          count: cut.quantity,
          hasLap: cut.hasLap
        });
      }
    }
    
    return Array.from(groups.entries());
  }, [cuts]);

  // Calculate total length used
  const totalUsed = React.useMemo(() => {
    return cuts.reduce((sum, cut) => sum + cut.length * cut.quantity, 0);
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
              {info.length.toFixed(3)}m
            </span>
            {info.count > 1 && (
              <span className="text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                ×{info.count}
              </span>
            )}
          </div>
          {info.hasLap && (
            <span className="text-[10px] text-orange-700 bg-orange-100 px-1.5 py-0.5 rounded font-medium">
              LAP
            </span>
          )}
        </div>
      ))}
      {groupedCuts.length > 1 && (
        <div className="pt-1 mt-1 border-t border-gray-200">
          <span className="text-[10px] text-gray-500">
            Total: {totalUsed.toFixed(3)}m
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
