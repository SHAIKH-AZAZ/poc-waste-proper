/**
 * Progress Emitter for real-time algorithm statistics
 * Allows algorithms to emit progress updates to UI components
 */

export interface ProgressStats {
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

type ProgressListener = (stats: ProgressStats) => void

class ProgressEmitter {
  private listeners: Set<ProgressListener> = new Set()
  private stats: ProgressStats = {
    perfectCombinationsChecked: 0,
    patternsGenerated: 0,
    wasteCalculations: 0,
    dpStatesExplored: 0,
    dpComparisons: 0,
    memoHits: 0,
    memoPuts: 0,
    consolidationChecks: 0,
    currentStep: 'idle',
    progress: 0,
    totalTime: 0,
  }

  /**
   * Subscribe to progress updates
   */
  subscribe(listener: ProgressListener): () => void {
    this.listeners.add(listener)
    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener)
    }
  }

  /**
   * Emit progress update to all listeners
   */
  private emit(): void {
    this.listeners.forEach(listener => listener(this.stats))
  }

  /**
   * Update stats and emit
   */
  updateStats(updates: Partial<ProgressStats>): void {
    this.stats = { ...this.stats, ...updates }
    this.emit()
  }

  /**
   * Set current step
   */
  setStep(step: ProgressStats['currentStep']): void {
    this.stats.currentStep = step
    this.emit()
  }

  /**
   * Increment perfect combinations counter
   */
  incrementPerfectCombinations(amount: number = 1): void {
    this.stats.perfectCombinationsChecked += amount
    this.emit()
  }

  /**
   * Increment patterns generated counter
   */
  incrementPatternsGenerated(amount: number = 1): void {
    this.stats.patternsGenerated += amount
    this.emit()
  }

  /**
   * Increment waste calculations counter
   */
  incrementWasteCalculations(amount: number = 1): void {
    this.stats.wasteCalculations += amount
    this.emit()
  }

  /**
   * Increment DP states explored counter
   */
  incrementDPStates(amount: number = 1): void {
    this.stats.dpStatesExplored += amount
    this.emit()
  }

  /**
   * Increment DP comparisons counter
   */
  incrementDPComparisons(amount: number = 1): void {
    this.stats.dpComparisons += amount
    this.emit()
  }

  /**
   * Increment memo hits counter
   */
  incrementMemoHits(amount: number = 1): void {
    this.stats.memoHits += amount
    this.emit()
  }

  /**
   * Increment memo entries counter
   */
  incrementMemoPuts(amount: number = 1): void {
    this.stats.memoPuts += amount
    this.emit()
  }

  /**
   * Increment consolidation checks counter
   */
  incrementConsolidationChecks(amount: number = 1): void {
    this.stats.consolidationChecks += amount
    this.emit()
  }

  /**
   * Update progress percentage
   */
  setProgress(progress: number): void {
    this.stats.progress = Math.min(100, Math.max(0, progress))
    this.emit()
  }

  /**
   * Update execution time
   */
  setTime(time: number): void {
    this.stats.totalTime = time
    this.emit()
  }

  /**
   * Reset all stats
   */
  reset(): void {
    this.stats = {
      perfectCombinationsChecked: 0,
      patternsGenerated: 0,
      wasteCalculations: 0,
      dpStatesExplored: 0,
      dpComparisons: 0,
      memoHits: 0,
      memoPuts: 0,
      consolidationChecks: 0,
      currentStep: 'idle',
      progress: 0,
      totalTime: 0,
    }
    this.emit()
  }

  /**
   * Get current stats
   */
  getStats(): ProgressStats {
    return { ...this.stats }
  }
}

// Export singleton instance
export const progressEmitter = new ProgressEmitter()
