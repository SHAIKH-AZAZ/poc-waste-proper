'use client'

import { useState, useEffect } from 'react'
import { progressEmitter, type ProgressStats } from '@/utils/progressEmitter'

/**
 * Hook to track processing progress in React components
 */
export function useProcessingProgress() {
  const [stats, setStats] = useState<ProgressStats>(progressEmitter.getStats())
  const [isProcessing, setIsProcessing] = useState(false)

  useEffect(() => {
    // Subscribe to progress updates
    const unsubscribe = progressEmitter.subscribe(newStats => {
      setStats(newStats)
      setIsProcessing(newStats.currentStep !== 'idle' && newStats.currentStep !== 'complete')
    })

    return unsubscribe
  }, [])

  return {
    stats,
    isProcessing,
    reset: () => progressEmitter.reset(),
  }
}
