'use client'

import { useState } from 'react'
import { ProcessingProgress } from '@/components/ProcessingProgress'
import { useProcessingProgress } from '@/hooks/useProcessingProgress'
import { WasteOptimizedCuttingStock } from '@/algorithms/wasteOptimizedCuttingStock'
import { CuttingStockPreprocessor } from '@/utils/cuttingStockPreprocessor'
import { progressEmitter } from '@/utils/progressEmitter'
import type { BarCuttingDisplay } from '@/types/BarCuttingRow'

export default function DemoPage() {
  const { stats, isProcessing } = useProcessingProgress()
  const [results, setResults] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  // Sample data
  const sampleData: BarCuttingDisplay[] = [
    { BarCode: '1/B1/12', Dia: 12, 'Total Bars': 1, 'Cutting Length': 6, 'Lap Length': 0, Element: 'Beam' },
    { BarCode: '2/B2/12', Dia: 12, 'Total Bars': 1, 'Cutting Length': 4, 'Lap Length': 0, Element: 'Beam' },
    { BarCode: '3/B3/12', Dia: 12, 'Total Bars': 1, 'Cutting Length': 2, 'Lap Length': 0, Element: 'Beam' },
    { BarCode: '4/B4/16', Dia: 16, 'Total Bars': 2, 'Cutting Length': 5, 'Lap Length': 0, Element: 'Column' },
    { BarCode: '4/B4/16', Dia: 16, 'Total Bars': 2, 'Cutting Length': 5, 'Lap Length': 0, Element: 'Column' },
    { BarCode: '4/B4/16', Dia: 16, 'Total Bars': 2, 'Cutting Length': 5, 'Lap Length': 0, Element: 'Column' },
    { BarCode: '4/B4/16', Dia: 16, 'Total Bars': 2, 'Cutting Length': 5, 'Lap Length': 0, Element: 'Column' },
    { BarCode: '4/B4/16', Dia: 16, 'Total Bars': 2, 'Cutting Length': 5, 'Lap Length': 0, Element: 'Column' },
    { BarCode: '4/B4/16', Dia: 16, 'Total Bars': 2, 'Cutting Length': 5, 'Lap Length': 0, Element: 'Column' },
    { BarCode: '5/B5/16', Dia: 16, 'Total Bars': 1, 'Cutting Length': 7, 'Lap Length': 0, Element: 'Column' },
  ]

  const handleProcess = async () => {
    try {
      setError(null)
      setResults(null)
      progressEmitter.reset()

      const preprocessor = new CuttingStockPreprocessor()
      const requests = preprocessor.convertToCuttingRequests(sampleData)

      const optimizer = new WasteOptimizedCuttingStock()

      // Process each diameter
      const allResults: any[] = []
      const diameters = [12, 16]

      for (let i = 0; i < diameters.length; i++) {
        const dia = diameters[i]
        progressEmitter.updateStats({
          currentStep: 'idle',
          progress: (i / diameters.length) * 100,
        })

        const result = await optimizer.solve(requests, dia)
        allResults.push(result)

        progressEmitter.updateStats({
          progress: ((i + 1) / diameters.length) * 100,
        })
      }

      progressEmitter.setStep('complete')
      progressEmitter.setProgress(100)
      setResults(allResults)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      progressEmitter.setStep('idle')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 to-slate-900 p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold text-white">
            Waste-Optimized Cutting Stock
          </h1>
          <p className="text-slate-400">
            Real-time calculation tracking and optimization
          </p>
        </div>

        {/* Progress Display */}
        <ProcessingProgress
          stats={stats}
          isProcessing={isProcessing}
          diameter={12}
          totalDiameters={2}
        />

        {/* Control Button */}
        <div className="flex justify-center">
          <button
            onClick={handleProcess}
            disabled={isProcessing}
            className={`px-8 py-3 rounded-lg font-semibold text-white transition-all ${
              isProcessing
                ? 'bg-slate-600 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 active:scale-95'
            }`}
          >
            {isProcessing ? (
              <span className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Processing...
              </span>
            ) : (
              'Start Optimization'
            )}
          </button>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-900/20 border border-red-500 rounded-lg p-4 text-red-300">
            <p className="font-semibold">Error</p>
            <p className="text-sm">{error}</p>
          </div>
        )}

        {/* Results Display */}
        {results && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-white">Results</h2>

            {results.map((result: any, idx: number) => (
              <div
                key={idx}
                className="bg-slate-800 border border-slate-700 rounded-lg p-6 space-y-4"
              >
                <div className="flex justify-between items-center">
                  <h3 className="text-xl font-semibold text-white">
                    Diameter {result.dia}mm
                  </h3>
                  <span className="text-sm text-slate-400">
                    {result.algorithm}
                  </span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {/* Bars Used */}
                  <div className="bg-slate-700 rounded p-4 border border-emerald-500/30">
                    <p className="text-xs text-slate-400 mb-1">Bars Used</p>
                    <p className="text-2xl font-bold text-emerald-400">
                      {result.totalBarsUsed}
                    </p>
                  </div>

                  {/* Total Waste */}
                  <div className="bg-slate-700 rounded p-4 border border-red-500/30">
                    <p className="text-xs text-slate-400 mb-1">Total Waste</p>
                    <p className="text-2xl font-bold text-red-400">
                      {result.totalWaste.toFixed(2)}m
                    </p>
                  </div>

                  {/* Utilization */}
                  <div className="bg-slate-700 rounded p-4 border border-blue-500/30">
                    <p className="text-xs text-slate-400 mb-1">Utilization</p>
                    <p className="text-2xl font-bold text-blue-400">
                      {result.averageUtilization.toFixed(1)}%
                    </p>
                  </div>

                  {/* Execution Time */}
                  <div className="bg-slate-700 rounded p-4 border border-yellow-500/30">
                    <p className="text-xs text-slate-400 mb-1">Time</p>
                    <p className="text-2xl font-bold text-yellow-400">
                      {result.executionTime.toFixed(2)}ms
                    </p>
                  </div>
                </div>

                {/* Patterns */}
                <div className="bg-slate-700 rounded p-4">
                  <p className="text-sm font-semibold text-white mb-3">
                    Cutting Patterns ({result.patterns.length})
                  </p>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {result.patterns.map((pattern: any, pidx: number) => (
                      <div
                        key={pidx}
                        className="bg-slate-600 rounded p-2 text-xs text-slate-300 flex justify-between"
                      >
                        <span>Pattern {pidx + 1}</span>
                        <span className="text-slate-400">
                          Waste: {pattern.waste.toFixed(2)}m | Util: {pattern.utilization.toFixed(1)}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Summary */}
                <div className="bg-slate-700 rounded p-4 grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                  <div>
                    <p className="text-slate-400">Total Bars</p>
                    <p className="font-semibold text-white">
                      {result.summary.totalStandardBars}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-400">Waste Length</p>
                    <p className="font-semibold text-white">
                      {result.summary.totalWasteLength.toFixed(2)}m
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-400">Waste %</p>
                    <p className="font-semibold text-white">
                      {result.summary.totalWastePercentage.toFixed(2)}%
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-400">Avg Utilization</p>
                    <p className="font-semibold text-white">
                      {result.summary.averageUtilization.toFixed(1)}%
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-400">Pattern Count</p>
                    <p className="font-semibold text-white">
                      {result.summary.patternCount}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-400">Total Cuts</p>
                    <p className="font-semibold text-white">
                      {result.summary.totalCutsProduced}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Sample Data Info */}
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Sample Data</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-slate-300">
              <thead className="text-slate-400 border-b border-slate-700">
                <tr>
                  <th className="text-left py-2 px-3">BarCode</th>
                  <th className="text-left py-2 px-3">Dia</th>
                  <th className="text-left py-2 px-3">Total Bars</th>
                  <th className="text-left py-2 px-3">Cutting Length</th>
                  <th className="text-left py-2 px-3">Element</th>
                </tr>
              </thead>
              <tbody>
                {sampleData.map((row, idx) => (
                  <tr key={idx} className="border-b border-slate-700">
                    <td className="py-2 px-3">{row.BarCode}</td>
                    <td className="py-2 px-3">{row.Dia}mm</td>
                    <td className="py-2 px-3">{row['Total Bars']}</td>
                    <td className="py-2 px-3">{row['Cutting Length']}m</td>
                    <td className="py-2 px-3">{row.Element}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Info Section */}
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 space-y-4">
          <h3 className="text-lg font-semibold text-white">How It Works</h3>
          <div className="space-y-3 text-sm text-slate-300">
            <div className="flex gap-3">
              <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0 text-white text-xs font-bold">
                1
              </div>
              <div>
                <p className="font-semibold text-white">Perfect Combinations</p>
                <p className="text-slate-400">
                  Searches for segments that sum to exactly 12m (0% waste)
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0 text-white text-xs font-bold">
                2
              </div>
              <div>
                <p className="font-semibold text-white">Pattern Generation</p>
                <p className="text-slate-400">
                  Creates cutting patterns ranked by waste (lowest first)
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="w-6 h-6 rounded-full bg-yellow-500 flex items-center justify-center flex-shrink-0 text-white text-xs font-bold">
                3
              </div>
              <div>
                <p className="font-semibold text-white">DP Solving</p>
                <p className="text-slate-400">
                  Minimizes bars first, then waste using dynamic programming
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="w-6 h-6 rounded-full bg-cyan-500 flex items-center justify-center flex-shrink-0 text-white text-xs font-bold">
                4
              </div>
              <div>
                <p className="font-semibold text-white">Consolidation</p>
                <p className="text-slate-400">
                  Attempts to combine waste from multiple bars
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
