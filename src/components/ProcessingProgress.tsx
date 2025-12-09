'use client'

import { useState, useEffect } from 'react'

export interface ProcessingStats {
  perfectCombinationsChecked: number
  patternsGenerated: number
  wasteCalculations: number
  dpStatesExplored: number
  dpComparisons: number
  memoHits: number
  memoPuts: number
  consolidationChecks: number
  currentStep: 'idle' | 'perfect' | 'patterns' | 'dp' | 'consolidation' | 'complete'
  progress: number
  totalTime: number
}

interface ProcessingProgressProps {
  stats: ProcessingStats
  isProcessing: boolean
  diameter?: number
  totalDiameters?: number
}

export function ProcessingProgress({
  stats,
  isProcessing,
  diameter,
  totalDiameters,
}: ProcessingProgressProps) {
  const [displayStats, setDisplayStats] = useState<ProcessingStats>(stats)

  useEffect(() => {
    setDisplayStats(stats)
  }, [stats])

  const stepLabels = {
    idle: 'Idle',
    perfect: '🔍 Finding Perfect Combinations',
    patterns: '🎯 Generating Patterns',
    dp: '🧮 Running DP Solver',
    consolidation: '🔄 Consolidating Waste',
    complete: '✨ Complete',
  }

  const getStepColor = (step: string) => {
    switch (step) {
      case 'perfect':
        return 'bg-blue-500'
      case 'patterns':
        return 'bg-green-500'
      case 'dp':
        return 'bg-yellow-500'
      case 'consolidation':
        return 'bg-cyan-500'
      case 'complete':
        return 'bg-emerald-500'
      default:
        return 'bg-gray-500'
    }
  }

  return (
    <div className="w-full space-y-4 p-4 bg-gradient-to-r from-slate-900 to-slate-800 rounded-lg border border-slate-700">
      {/* Main Progress Bar */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold text-white">
            {diameter && totalDiameters
              ? `Processing Dia ${diameter} (${diameter} of ${totalDiameters})`
              : 'Processing...'}
          </h3>
          <span className="text-sm font-mono text-slate-300">
            {displayStats.progress}%
          </span>
        </div>

        <div className="w-full bg-slate-700 rounded-full h-3 overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${getStepColor(
              displayStats.currentStep
            )}`}
            style={{ width: `${displayStats.progress}%` }}
          />
        </div>

        <p className="text-sm text-slate-300">
          {stepLabels[displayStats.currentStep as keyof typeof stepLabels]}
        </p>
      </div>

      {/* Statistics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Perfect Combinations */}
        <div className="bg-slate-700 rounded p-3 border border-blue-500/30">
          <p className="text-xs text-slate-400 mb-1">Perfect Combinations</p>
          <p className="text-lg font-mono font-bold text-blue-400">
            {displayStats.perfectCombinationsChecked.toLocaleString()}
          </p>
        </div>

        {/* Patterns Generated */}
        <div className="bg-slate-700 rounded p-3 border border-green-500/30">
          <p className="text-xs text-slate-400 mb-1">Patterns Generated</p>
          <p className="text-lg font-mono font-bold text-green-400">
            {displayStats.patternsGenerated.toLocaleString()}
          </p>
        </div>

        {/* Waste Calculations */}
        <div className="bg-slate-700 rounded p-3 border border-yellow-500/30">
          <p className="text-xs text-slate-400 mb-1">Waste Calculations</p>
          <p className="text-lg font-mono font-bold text-yellow-400">
            {displayStats.wasteCalculations.toLocaleString()}
          </p>
        </div>

        {/* DP States */}
        <div className="bg-slate-700 rounded p-3 border border-cyan-500/30">
          <p className="text-xs text-slate-400 mb-1">DP States Explored</p>
          <p className="text-lg font-mono font-bold text-cyan-400">
            {displayStats.dpStatesExplored.toLocaleString()}
          </p>
        </div>

        {/* DP Comparisons */}
        <div className="bg-slate-700 rounded p-3 border border-purple-500/30">
          <p className="text-xs text-slate-400 mb-1">DP Comparisons</p>
          <p className="text-lg font-mono font-bold text-purple-400">
            {displayStats.dpComparisons.toLocaleString()}
          </p>
        </div>

        {/* Memo Hits */}
        <div className="bg-slate-700 rounded p-3 border border-pink-500/30">
          <p className="text-xs text-slate-400 mb-1">Memo Cache Hits</p>
          <p className="text-lg font-mono font-bold text-pink-400">
            {displayStats.memoHits.toLocaleString()}
          </p>
        </div>

        {/* Memo Entries */}
        <div className="bg-slate-700 rounded p-3 border border-indigo-500/30">
          <p className="text-xs text-slate-400 mb-1">Memo Entries</p>
          <p className="text-lg font-mono font-bold text-indigo-400">
            {displayStats.memoPuts.toLocaleString()}
          </p>
        </div>

        {/* Consolidation Checks */}
        <div className="bg-slate-700 rounded p-3 border border-orange-500/30">
          <p className="text-xs text-slate-400 mb-1">Consolidation Checks</p>
          <p className="text-lg font-mono font-bold text-orange-400">
            {displayStats.consolidationChecks.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Execution Time */}
      <div className="bg-slate-700 rounded p-3 border border-slate-600">
        <div className="flex justify-between items-center">
          <span className="text-sm text-slate-300">Execution Time</span>
          <span className="text-lg font-mono font-bold text-slate-100">
            {displayStats.totalTime.toFixed(2)}ms
          </span>
        </div>
      </div>

      {/* Status Indicator */}
      {isProcessing && (
        <div className="flex items-center gap-2 text-sm text-slate-300">
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
          Processing in progress...
        </div>
      )}

      {!isProcessing && displayStats.currentStep === 'complete' && (
        <div className="flex items-center gap-2 text-sm text-emerald-400">
          <div className="w-2 h-2 bg-emerald-500 rounded-full" />
          Processing complete!
        </div>
      )}
    </div>
  )
}
