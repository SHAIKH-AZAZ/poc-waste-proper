import type {
  MultiBarCuttingRequest,
  BarSegment,
  CuttingStockResult,
  CuttingPattern,
  PatternCut,
  DetailedCut,
  CutInstruction,
} from "@/types/CuttingStock";
import { CuttingStockPreprocessor } from "@/utils/cuttingStockPreprocessor";
import { GreedyCuttingStock } from "./greedyCuttingStock";

interface DPState {
  remainingSegments: Map<string, number>; // segmentId -> count
  barsUsed: number;
  patterns: CuttingPattern[];
}

export class DynamicCuttingStock {
  private readonly STANDARD_LENGTH = 12.0;
  private preprocessor = new CuttingStockPreprocessor();
  private memo: Map<string, DPState> = new Map();
  private readonly MAX_ITERATIONS = 10000; // Prevent infinite loops

  solve(requests: MultiBarCuttingRequest[], dia: number): CuttingStockResult {
    const startTime = performance.now();

    // Filter by diameter
    const diaRequests = this.preprocessor.filterByDia(requests, dia);

    if (diaRequests.length === 0) {
      return this.createEmptyResult(dia, startTime);
    }

    // Extract segments
    const allSegments = this.preprocessor.extractAllSegments(diaRequests);

    // For large datasets, use greedy as fallback
    if (allSegments.length > 200) {
      console.warn(
        "Dataset too large for DP, using optimized greedy approach"
      );
      return this.optimizedGreedyFallback(diaRequests, dia, startTime);
    }

    // Generate feasible patterns
    const feasiblePatterns = this.generateFeasiblePatterns(allSegments);

    // Solve using dynamic programming
    const result = this.dpSolve(allSegments, feasiblePatterns);

    // Generate detailed cuts
    const detailedCuts = this.generateDetailedCuts(result.patterns);

    // Calculate summary
    const summary = this.calculateSummary(result.patterns, allSegments.length);

    const executionTime = performance.now() - startTime;

    return {
      algorithm: "dynamic",
      dia,
      patterns: result.patterns,
      totalBarsUsed: result.barsUsed,
      totalWaste: summary.totalWasteLength,
      averageUtilization: summary.averageUtilization,
      executionTime,
      summary,
      detailedCuts,
    };
  }

  /**
   * Generate all feasible cutting patterns
   */
  private generateFeasiblePatterns(segments: BarSegment[]): CuttingPattern[] {
    const patterns: CuttingPattern[] = [];
    const uniqueSegments = this.getUniqueSegments(segments);

    // Generate patterns using recursive enumeration
    this.generatePatternsRecursive(
      uniqueSegments,
      [],
      0,
      this.STANDARD_LENGTH,
      patterns,
      0,
      5 // Max depth to prevent explosion
    );

    return patterns;
  }

  /**
   * Get unique segment types
   */
  private getUniqueSegments(segments: BarSegment[]): BarSegment[] {
    const uniqueMap = new Map<string, BarSegment>();

    for (const segment of segments) {
      if (!uniqueMap.has(segment.segmentId)) {
        uniqueMap.set(segment.segmentId, segment);
      }
    }

    return Array.from(uniqueMap.values());
  }

  /**
   * Recursively generate cutting patterns
   */
  private generatePatternsRecursive(
    availableSegments: BarSegment[],
    currentCuts: PatternCut[],
    currentLength: number,
    remainingLength: number,
    patterns: CuttingPattern[],
    depth: number,
    maxDepth: number
  ): void {
    if (depth >= maxDepth || remainingLength < 0.1) {
      if (currentCuts.length > 0) {
        patterns.push(this.createPattern(currentCuts, remainingLength));
      }
      return;
    }

    // Try adding each segment type
    for (let i = 0; i < availableSegments.length; i++) {
      const segment = availableSegments[i];

      if (segment.effectiveLength <= remainingLength) {
        // Find existing cut or create new one
        const existingCutIndex = currentCuts.findIndex(
          (c) => c.segmentId === segment.segmentId
        );

        if (existingCutIndex >= 0) {
          currentCuts[existingCutIndex].count++;
        } else {
          currentCuts.push({
            segmentId: segment.segmentId,
            parentBarCode: segment.parentBarCode,
            length: segment.length,
            count: 1,
            segmentIndex: segment.segmentIndex,
          });
        }

        // Recurse
        this.generatePatternsRecursive(
          availableSegments.slice(i),
          currentCuts,
          currentLength + segment.effectiveLength,
          remainingLength - segment.effectiveLength,
          patterns,
          depth + 1,
          maxDepth
        );

        // Backtrack
        if (existingCutIndex >= 0) {
          currentCuts[existingCutIndex].count--;
          if (currentCuts[existingCutIndex].count === 0) {
            currentCuts.splice(existingCutIndex, 1);
          }
        } else {
          currentCuts.pop();
        }
      }
    }
  }

  /**
   * Create pattern from cuts
   */
  private createPattern(
    cuts: PatternCut[],
    remainingLength: number
  ): CuttingPattern {
    const usedLength = this.STANDARD_LENGTH - remainingLength;
    return {
      id: `pattern_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      cuts: cuts.map((c) => ({ ...c })),
      waste: remainingLength,
      utilization: (usedLength / this.STANDARD_LENGTH) * 100,
      standardBarLength: this.STANDARD_LENGTH,
    };
  }

  /**
   * Solve using dynamic programming
   */
  private dpSolve(
    segments: BarSegment[],
    patterns: CuttingPattern[]
  ): DPState {
    // Count segments needed
    const segmentCounts = new Map<string, number>();
    for (const segment of segments) {
      const count = segmentCounts.get(segment.segmentId) || 0;
      segmentCounts.set(segment.segmentId, count + 1);
    }

    // Initialize DP
    const initialState: DPState = {
      remainingSegments: segmentCounts,
      barsUsed: 0,
      patterns: [],
    };

    // Use iterative approach with priority queue
    const bestState = this.iterativeDP(initialState, patterns);

    return bestState;
  }

  /**
   * Iterative DP to avoid stack overflow
   */
  private iterativeDP(
    initialState: DPState,
    patterns: CuttingPattern[]
  ): DPState {
    const queue: DPState[] = [initialState];
    let bestState: DPState = initialState;
    let iterations = 0;

    while (queue.length > 0 && iterations < this.MAX_ITERATIONS) {
      iterations++;
      const currentState = queue.shift()!;

      // Check if all segments satisfied
      if (this.isStateSatisfied(currentState)) {
        if (
          !bestState ||
          currentState.barsUsed < bestState.barsUsed ||
          bestState.barsUsed === 0
        ) {
          bestState = currentState;
        }
        continue;
      }

      // Try applying each pattern
      for (const pattern of patterns) {
        const nextState = this.tryApplyPattern(currentState, pattern);
        if (nextState) {
          queue.push(nextState);
        }
      }

      // Sort queue by bars used (best first)
      queue.sort((a, b) => a.barsUsed - b.barsUsed);

      // Keep only best states to prevent memory overflow
      if (queue.length > 100) {
        queue.splice(100);
      }
    }

    return bestState;
  }

  /**
   * Check if all segments are satisfied
   */
  private isStateSatisfied(state: DPState): boolean {
    for (const count of state.remainingSegments.values()) {
      if (count > 0) return false;
    }
    return true;
  }

  /**
   * Try to apply pattern to current state
   */
  private tryApplyPattern(
    state: DPState,
    pattern: CuttingPattern
  ): DPState | null {
    const newRemaining = new Map(state.remainingSegments);
    let canApply = true;

    // Check if pattern can be applied
    for (const cut of pattern.cuts) {
      const remaining = newRemaining.get(cut.segmentId) || 0;
      if (remaining < cut.count) {
        canApply = false;
        break;
      }
      newRemaining.set(cut.segmentId, remaining - cut.count);
    }

    if (!canApply) return null;

    return {
      remainingSegments: newRemaining,
      barsUsed: state.barsUsed + 1,
      patterns: [...state.patterns, pattern],
    };
  }

  /**
   * Optimized greedy fallback for large datasets
   */
  private optimizedGreedyFallback(
    requests: MultiBarCuttingRequest[],
    dia: number,
    _startTime: number
  ): CuttingStockResult {
    // Use greedy algorithm as fallback
    // Import is handled at module level
    const greedy = new GreedyCuttingStock();
    const result = greedy.solve(requests, dia);
    result.algorithm = "dynamic"; // Mark as dynamic (fallback)
    return result;
  }

  /**
   * Generate detailed cutting instructions
   */
  private generateDetailedCuts(patterns: CuttingPattern[]): DetailedCut[] {
    return patterns.map((pattern, index) => {
      let currentPosition = 0;
      const cuts: CutInstruction[] = [];

      for (const cut of pattern.cuts) {
        for (let i = 0; i < cut.count; i++) {
          cuts.push({
            barCode: cut.parentBarCode,
            segmentId: cut.segmentId,
            length: cut.length,
            quantity: 1,
            position: currentPosition,
            segmentIndex: cut.segmentIndex,
            hasLap: cut.segmentIndex > 0,
          });
          currentPosition += cut.length;
        }
      }

      return {
        patternId: pattern.id,
        barNumber: index + 1,
        cuts,
        waste: pattern.waste,
        utilization: pattern.utilization,
      };
    });
  }

  /**
   * Calculate summary statistics
   */
  private calculateSummary(patterns: CuttingPattern[], totalCuts: number) {
    const totalBars = patterns.length;
    const totalWaste = patterns.reduce((sum, p) => sum + p.waste, 0);
    const avgUtilization =
      totalBars > 0
        ? patterns.reduce((sum, p) => sum + p.utilization, 0) / totalBars
        : 0;

    return {
      totalStandardBars: totalBars,
      totalWasteLength: Math.round(totalWaste * 1000) / 1000,
      totalWastePercentage:
        totalBars > 0
          ? Math.round(
              (totalWaste / (totalBars * this.STANDARD_LENGTH)) * 10000
            ) / 100
          : 0,
      averageUtilization: Math.round(avgUtilization * 100) / 100,
      patternCount: patterns.length,
      totalCutsProduced: totalCuts,
    };
  }

  /**
   * Create empty result
   */
  private createEmptyResult(
    dia: number,
    startTime: number
  ): CuttingStockResult {
    return {
      algorithm: "dynamic",
      dia,
      patterns: [],
      totalBarsUsed: 0,
      totalWaste: 0,
      averageUtilization: 0,
      executionTime: performance.now() - startTime,
      summary: {
        totalStandardBars: 0,
        totalWasteLength: 0,
        totalWastePercentage: 0,
        averageUtilization: 0,
        patternCount: 0,
        totalCutsProduced: 0,
      },
      detailedCuts: [],
    };
  }
}
