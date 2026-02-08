"use client";
import React, { useState } from "react";
import { motion } from "motion/react";
import type { CuttingStockResult } from "@/types/CuttingStock";

interface AdvancedCuttingStockResultsProps {
  results: CuttingStockResult[];
  isLoading: boolean;
  fileName: string;
  selectedDia: number;
  progress: Record<string, { stage: string; percentage: number }>;
  onRunAlgorithm: (algorithm: string) => void;
}

interface AlgorithmInfo {
  name: string;
  key: string;
  description: string;
  bestFor: string;
  complexity: string;
  expectedQuality: string;
}

const ALGORITHMS: AlgorithmInfo[] = [
  {
    name: "Adaptive Selection",
    key: "adaptive",
    description: "Automatically selects the best algorithm based on dataset characteristics",
    bestFor: "Production use - optimal balance of speed and quality",
    complexity: "Variable",
    expectedQuality: "Best Available"
  },
  {
    name: "Improved Greedy (Smart)",
    key: "improved-greedy",
    description: "Smart greedy with look-ahead for optimal combinations - solves 6m+4m+2m waste problem",
    bestFor: "Fast processing with much better results than standard greedy",
    complexity: "O(n log n)",
    expectedQuality: "Excellent"
  },
  {
    name: "Branch & Bound",
    key: "branch-bound", 
    description: "Exhaustive search with intelligent pruning for guaranteed optimal solutions",
    bestFor: "Small datasets requiring optimal solutions",
    complexity: "Exponential",
    expectedQuality: "Optimal"
  },
  {
    name: "True Dynamic Programming",
    key: "true-dynamic",
    description: "State space exploration with memoization for near-optimal solutions",
    bestFor: "Medium datasets with quality priority",
    complexity: "Exponential",
    expectedQuality: "Near-Optimal"
  },
  {
    name: "Standard Greedy (FFD)",
    key: "greedy",
    description: "First Fit Decreasing - has the 6m+4m+2m waste problem you identified",
    bestFor: "Comparison baseline - shows the allocation problem",
    complexity: "O(n log n)",
    expectedQuality: "Fair"
  },
  {
    name: "Legacy Dynamic",
    key: "dynamic",
    description: "Pattern-based greedy selection (not true DP)",
    bestFor: "Comparison baseline",
    complexity: "O(n²)",
    expectedQuality: "Fair"
  }
];

export default function AdvancedCuttingStockResults({
  results,
  isLoading,
  fileName,
  selectedDia,
  progress,
  onRunAlgorithm
}: AdvancedCuttingStockResultsProps) {
  const [selectedResult, setSelectedResult] = useState<CuttingStockResult | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "patterns" | "details">("overview");

  // Find best result (minimum bars, then minimum waste)
  const bestResult = results.length > 0 ? 
    results.reduce((best, current) => {
      if (current.totalBarsUsed < best.totalBarsUsed) return current;
      if (current.totalBarsUsed === best.totalBarsUsed && current.totalWaste < best.totalWaste) return current;
      return best;
    }) : null;

  const getQualityColor = (result: CuttingStockResult) => {
    if (!bestResult) return "text-gray-600";
    
    if (result.totalBarsUsed === bestResult.totalBarsUsed) {
      return "text-green-600 font-bold";
    } else if (result.totalBarsUsed <= bestResult.totalBarsUsed + 1) {
      return "text-blue-600";
    } else if (result.totalBarsUsed <= bestResult.totalBarsUsed + 2) {
      return "text-yellow-600";
    } else {
      return "text-red-600";
    }
  };

  const getQualityLabel = (result: CuttingStockResult) => {
    if (!bestResult) return "Unknown";
    
    if (result.totalBarsUsed === bestResult.totalBarsUsed) {
      return "Optimal";
    } else if (result.totalBarsUsed <= bestResult.totalBarsUsed + 1) {
      return "Excellent";
    } else if (result.totalBarsUsed <= bestResult.totalBarsUsed + 2) {
      return "Good";
    } else {
      return "Fair";
    }
  };

  const formatTime = (ms: number) => {
    if (ms < 1000) return `${Math.round(ms)}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  return (
    <div className="w-full max-w-7xl mx-auto p-6 bg-white border border-gray-200 rounded-xl shadow-lg mb-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            Advanced Cutting Stock Optimization
          </h2>
          <p className="text-gray-600">
            Diameter {selectedDia}mm • File: {fileName}
          </p>
        </div>
        
        {bestResult && (
          <div className="text-right">
            <div className="text-2xl font-bold text-green-600">
              {bestResult.totalBarsUsed} bars
            </div>
            <div className="text-sm text-gray-600">
              {bestResult.totalWaste.toFixed(3)}m waste
            </div>
          </div>
        )}
      </div>

      {/* Algorithm Selection */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-3">Available Algorithms</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {ALGORITHMS.map((alg) => {
            const hasResult = results.some(r => r.algorithm === alg.key);
            const isRunning = progress[alg.key]?.percentage > 0 && progress[alg.key]?.percentage < 100;
            const currentProgress = progress[alg.key];

            return (
              <motion.div
                key={alg.key}
                className={`p-4 border rounded-lg cursor-pointer transition-all ${
                  hasResult 
                    ? "border-green-300 bg-green-50" 
                    : isRunning 
                    ? "border-blue-300 bg-blue-50"
                    : "border-gray-300 bg-gray-50 hover:border-gray-400"
                }`}
                whileHover={{ scale: 1.02 }}
                onClick={() => !hasResult && !isRunning && onRunAlgorithm(alg.key)}
              >
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold text-gray-800">{alg.name}</h4>
                  {hasResult && <span className="text-green-600 text-sm">✓ Complete</span>}
                  {isRunning && (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                      <span className="text-blue-600 text-sm">{currentProgress.percentage}%</span>
                    </div>
                  )}
                </div>
                
                <p className="text-sm text-gray-600 mb-2">{alg.description}</p>
                
                <div className="text-xs text-gray-500">
                  <div><strong>Best for:</strong> {alg.bestFor}</div>
                  <div><strong>Quality:</strong> {alg.expectedQuality}</div>
                </div>

                {isRunning && (
                  <div className="mt-2">
                    <div className="text-xs text-blue-600 mb-1">{currentProgress.stage}</div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${currentProgress.percentage}%` }}
                      />
                    </div>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Results Comparison */}
      {results.length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-3">Results Comparison</h3>
          
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-gray-300">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-300 px-4 py-2 text-left">Algorithm</th>
                  <th className="border border-gray-300 px-4 py-2 text-center">Bars Used</th>
                  <th className="border border-gray-300 px-4 py-2 text-center">Total Waste</th>
                  <th className="border border-gray-300 px-4 py-2 text-center">Avg Utilization</th>
                  <th className="border border-gray-300 px-4 py-2 text-center">Execution Time</th>
                  <th className="border border-gray-300 px-4 py-2 text-center">Quality</th>
                  <th className="border border-gray-300 px-4 py-2 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {results
                  .sort((a, b) => {
                    if (a.totalBarsUsed !== b.totalBarsUsed) {
                      return a.totalBarsUsed - b.totalBarsUsed;
                    }
                    return a.totalWaste - b.totalWaste;
                  })
                  .map((result, index) => (
                    <tr key={`${result.algorithm}-${index}`} className="hover:bg-gray-50">
                      <td className="border border-gray-300 px-4 py-2">
                        <div>
                          <div className="font-medium">{ALGORITHMS.find(a => a.key === result.algorithm)?.name || result.algorithm}</div>
                          <div className="text-sm text-gray-500">{result.algorithm}</div>
                        </div>
                      </td>
                      <td className={`border border-gray-300 px-4 py-2 text-center font-bold ${getQualityColor(result)}`}>
                        {result.totalBarsUsed}
                        {result === bestResult && <span className="ml-1 text-green-600">👑</span>}
                      </td>
                      <td className="border border-gray-300 px-4 py-2 text-center">
                        {result.totalWaste.toFixed(3)}m
                        <div className="text-sm text-gray-500">
                          ({result.summary.totalWastePercentage.toFixed(1)}%)
                        </div>
                      </td>
                      <td className="border border-gray-300 px-4 py-2 text-center">
                        {result.averageUtilization.toFixed(1)}%
                      </td>
                      <td className="border border-gray-300 px-4 py-2 text-center">
                        {formatTime(result.executionTime)}
                      </td>
                      <td className={`border border-gray-300 px-4 py-2 text-center font-medium ${getQualityColor(result)}`}>
                        {getQualityLabel(result)}
                      </td>
                      <td className="border border-gray-300 px-4 py-2 text-center">
                        <button
                          onClick={() => setSelectedResult(result)}
                          className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors text-sm"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Detailed Result View */}
      {selectedResult && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="border border-gray-300 rounded-lg p-6 bg-gray-50"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800">
              {ALGORITHMS.find(a => a.key === selectedResult.algorithm)?.name || selectedResult.algorithm} - Detailed Results
            </h3>
            <button
              onClick={() => setSelectedResult(null)}
              className="text-gray-500 hover:text-gray-700 text-xl"
            >
              ×
            </button>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-gray-300 mb-4">
            {[
              { key: "overview", label: "Overview" },
              { key: "patterns", label: "Cutting Patterns" },
              { key: "details", label: "Detailed Cuts" }
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as "overview" | "patterns" | "details")}
                className={`px-4 py-2 font-medium ${
                  activeTab === tab.key
                    ? "border-b-2 border-blue-500 text-blue-600"
                    : "text-gray-600 hover:text-gray-800"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          {activeTab === "overview" && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded border">
                <div className="text-2xl font-bold text-blue-600">{selectedResult.totalBarsUsed}</div>
                <div className="text-sm text-gray-600">Standard Bars Used</div>
              </div>
              <div className="bg-white p-4 rounded border">
                <div className="text-2xl font-bold text-red-600">{selectedResult.totalWaste.toFixed(3)}m</div>
                <div className="text-sm text-gray-600">Total Waste</div>
              </div>
              <div className="bg-white p-4 rounded border">
                <div className="text-2xl font-bold text-green-600">{selectedResult.averageUtilization.toFixed(1)}%</div>
                <div className="text-sm text-gray-600">Avg Utilization</div>
              </div>
              <div className="bg-white p-4 rounded border">
                <div className="text-2xl font-bold text-purple-600">{formatTime(selectedResult.executionTime)}</div>
                <div className="text-sm text-gray-600">Execution Time</div>
              </div>
            </div>
          )}

          {activeTab === "patterns" && (
            <div className="space-y-4">
              {selectedResult.patterns.map((pattern, index) => (
                <div key={pattern.id} className="bg-white p-4 rounded border">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium">Bar #{index + 1}</h4>
                    <div className="text-sm text-gray-600">
                      Waste: {pattern.waste.toFixed(3)}m | Utilization: {pattern.utilization.toFixed(1)}%
                    </div>
                  </div>
                  <div className="space-y-1">
                    {pattern.cuts.map((cut, cutIndex) => (
                      <div key={cutIndex} className="text-sm">
                        <span className="font-mono">{cut.segmentId}</span>: 
                        {cut.count}× {cut.length.toFixed(3)}m
                        {cut.lapLength > 0 && <span className="text-blue-600"> (lap: {cut.lapLength.toFixed(3)}m)</span>}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === "details" && (
            <div className="space-y-4">
              {selectedResult.detailedCuts.map((detail) => (
                <div key={detail.patternId} className="bg-white p-4 rounded border">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium">Bar #{detail.barNumber}</h4>
                    <div className="text-sm text-gray-600">
                      Waste: {detail.waste.toFixed(3)}m | Utilization: {detail.utilization.toFixed(1)}%
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-100">
                          <th className="px-2 py-1 text-left">Position</th>
                          <th className="px-2 py-1 text-left">BarCode</th>
                          <th className="px-2 py-1 text-left">Length</th>
                          <th className="px-2 py-1 text-left">Lap</th>
                        </tr>
                      </thead>
                      <tbody>
                        {detail.cuts.map((cut, cutIndex) => (
                          <tr key={cutIndex} className="border-t">
                            <td className="px-2 py-1">{cut.position.toFixed(3)}m</td>
                            <td className="px-2 py-1 font-mono">{cut.barCode}</td>
                            <td className="px-2 py-1">{cut.length.toFixed(3)}m</td>
                            <td className="px-2 py-1">
                              {cut.hasLap ? `${cut.lapLength.toFixed(3)}m` : "None"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      )}

      {/* Loading State */}
      {isLoading && results.length === 0 && (
        <div className="text-center py-8">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Initializing optimization algorithms...</p>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && results.length === 0 && (
        <div className="text-center py-8">
          <p className="text-gray-600 mb-4">Select algorithms above to start optimization</p>
          <p className="text-sm text-gray-500">
            Tip: Start with &quot;Adaptive Selection&quot; for automatic algorithm selection
          </p>
        </div>
      )}
    </div>
  );
}