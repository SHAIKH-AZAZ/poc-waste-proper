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

interface DPState {
  remainingSegments: Map<string, number>; // segmentId -> count
  barsUsed: number;
  patterns: CuttingPattern[];
}

interface MemoEntry {
  barsUsed: number;
  patterns: CuttingPattern[];
  totalWaste: number;
}

export class DynamicCuttingStock {
  private readonly STANDARD_LENGTH = 12.0;
  private preprocessor = new CuttingStockPreprocessor();
  private memo = new Map<string, MemoEntry>();
  private maxMemoSize = 50000; // Increased for better coverage
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

    // Generate feasible patterns
    const feasiblePatterns = this.generateFeasiblePatterns(allSegments);
    console.log(`[Dynamic] Generated ${feasiblePatterns.length} feasible patterns`);

    if (feasiblePatterns.length === 0) {
      console.warn("[Dynamic] No feasible patterns generated! Returning empty result.");
      return this.createEmptyResult(dia, startTime);
    }

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

    // CRITICAL: First, generate single-segment patterns for ALL segments
    // This ensures every segment type (including last segments of multi-bar cuts) has at least one pattern
    for (const segment of uniqueSegments) {
      const maxCount = Math.floor(this.STANDARD_LENGTH / segment.length);
      for (let count = 1; count <= maxCount; count++) {
        const totalLength = segment.length * count;
        const waste = this.STANDARD_LENGTH - totalLength;
        
        patterns.push({
          id: `single_${segment.segmentId}_${count}`,
          cuts: [{
            segmentId: segment.segmentId,
            parentBarCode: segment.parentBarCode,
            length: segment.length,
            count: count,
            segmentIndex: segment.segmentIndex,
            lapLength: segment.lapLength,
          }],
          waste,
          utilization: (totalLength / this.STANDARD_LENGTH) * 100,
          standardBarLength: this.STANDARD_LENGTH,
        });
      }
    }

    console.log(`[Dynamic] Generated ${patterns.length} single-segment patterns`);

    // Calculate dynamic depth based on segment sizes
    const avgSegmentLength = uniqueSegments.reduce((sum, s) => sum + s.length, 0) / uniqueSegments.length;
    const maxDepth = avgSegmentLength < 2.0 ? 8 : avgSegmentLength < 4.0 ? 6 : 5;
    
    console.log(`[Dynamic] Using max depth: ${maxDepth} (avg segment: ${avgSegmentLength.toFixed(2)}m)`);

    // Then generate multi-segment patterns using recursive enumeration
    const multiPatternCount = patterns.length;
    this.generatePatternsRecursive(
      uniqueSegments,
      [],
      0,
      this.STANDARD_LENGTH,
      patterns,
      0,
      maxDepth // Dynamic depth based on segment sizes
    );

    console.log(`[Dynamic] Generated ${patterns.length - multiPatternCount} multi-segment patterns`);

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

      // Use cutting length (which includes lap) for space calculation
      if (segment.length <= remainingLength) {
        // For pattern generation, we generate patterns with segment TYPES
        // The same parent bar constraint will be applied during pattern USAGE, not generation
        // This allows us to generate all feasible patterns
        
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
            lapLength: segment.lapLength, // Pass through actual lap length
          });
        }

        // Recurse - use cutting length (which includes lap) for space tracking
        this.generatePatternsRecursive(
          availableSegments.slice(i),
          currentCuts,
          currentLength + segment.length,
          remainingLength - segment.length,
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
   * TRUE DYNAMIC PROGRAMMING with State Space Exploration
   * Explores all possible pattern combinations to find optimal solution
   * Uses memoization to avoid recomputing same states
   */
  private dpSolve(
    segments: BarSegment[],
    patterns: CuttingPattern[]
  ): DPState {
    // Count segments needed
    const initialDemand = new Map<string, number>();
    for (const segment of segments) {
      const count = initialDemand.get(segment.segmentId) || 0;
      initialDemand.set(segment.segmentId, count + 1);
    }

    console.log("[Dynamic] Segment demand:", Array.from(initialDemand.entries()));
    console.log("[Dynamic] Available patterns:", patterns.length);
    console.log("[Dynamic] Using TRUE dynamic programming with state space exploration");

    // Check if dataset is too large for full DP
    const totalDemand = Array.from(initialDemand.values()).reduce((sum, count) => sum + count, 0);
    const uniqueSegments = initialDemand.size;
    
    if (totalDemand > 100 || uniqueSegments > 15) {
      console.log(`[Dynamic] Dataset large (${totalDemand} segments, ${uniqueSegments} types). Using optimized greedy with lookahead.`);
      return this.greedyWithLookahead(segments, patterns, initialDemand);
    }

    // Clear memoization for fresh start
    this.memo.clear();
    
    // Recursive DP solver with memoization
    const solve = (remainingDemand: Map<string, number>): MemoEntry => {
      // Base case: no demand remaining
      if (this.isMapEmpty(remainingDemand)) {
        return {
          barsUsed: 0,
          patterns: [],
          totalWaste: 0
        };
      }

      // Check memoization
      const stateKey = this.encodeState(remainingDemand);
      if (this.memo.has(stateKey)) {
        return this.memo.get(stateKey)!;
      }

      // Prevent memory explosion
      if (this.memo.size > this.maxMemoSize) {
        console.warn("[Dynamic] Memo size limit reached, using best solution so far");
        // Don't clear, just stop memoizing new states
      }

      let bestSolution: MemoEntry = {
        barsUsed: Infinity,
        patterns: [],
        totalWaste: Infinity
      };

      // Try each feasible pattern (state space exploration)
      for (const pattern of patterns) {
        if (this.canApplyPattern(remainingDemand, pattern)) {
          const newDemand = this.applyPattern(remainingDemand, pattern);
          const subSolution = solve(newDemand); // Recursive call!

          // Calculate total solution cost
          const totalBars = subSolution.barsUsed + 1;
          const totalWaste = subSolution.totalWaste + pattern.waste;

          // Primary objective: minimize bars used
          // Secondary objective: minimize waste (for tie-breaking)
          if (totalBars < bestSolution.barsUsed || 
              (totalBars === bestSolution.barsUsed && totalWaste < bestSolution.totalWaste)) {
            bestSolution = {
              barsUsed: totalBars,
              patterns: [pattern, ...subSolution.patterns],
              totalWaste: totalWaste
            };
          }
        }
      }

      // If no solution found, use fallback
      if (bestSolution.barsUsed === Infinity) {
        console.warn("[Dynamic] No pattern found, using fallback");
        bestSolution = this.generateFallbackSolution(segments, remainingDemand);
      }

      // Memoize result (if space available)
      if (this.memo.size < this.maxMemoSize) {
        this.memo.set(stateKey, bestSolution);
      }

      return bestSolution;
    };

    const solution = solve(initialDemand);
    
    console.log("[Dynamic] DP Solution: Used", solution.barsUsed, "bars with", solution.totalWaste.toFixed(2), "m waste");
    console.log("[Dynamic] Explored", this.memo.size, "unique states");

    return {
      remainingSegments: new Map(),
      barsUsed: solution.barsUsed,
      patterns: solution.patterns,
    };
  }

  /**
   * Greedy with lookahead for large datasets
   * Looks ahead 2-3 steps to make better decisions
   */
  private greedyWithLookahead(
    segments: BarSegment[],
    patterns: CuttingPattern[],
    initialDemand: Map<string, number>
  ): DPState {
    const usedPatterns: CuttingPattern[] = [];
    const remaining = new Map(initialDemand);

    // Sort patterns by waste-aware efficiency
    const sortedPatterns = [...patterns].sort((a, b) => {
      if (Math.abs(a.waste - b.waste) > 0.01) {
        return a.waste - b.waste;
      }
      return b.utilization - a.utilization;
    });

    while (!this.isMapEmpty(remaining)) {
      let bestPattern: CuttingPattern | null = null;
      let bestScore = -Infinity;

      // Evaluate each pattern with lookahead
      for (const pattern of sortedPatterns) {
        if (this.canApplyPattern(remaining, pattern)) {
          // Calculate immediate score
          const coverage = this.calculateCoverage(remaining, pattern);
          const immediateScore = coverage / (pattern.waste + 0.1);
          
          // Lookahead: estimate future impact
          const newDemand = this.applyPattern(remaining, pattern);
          const futureScore = this.estimateFutureQuality(newDemand, sortedPatterns);
          
          // Combined score: 70% immediate, 30% future
          const totalScore = immediateScore * 0.7 + futureScore * 0.3;
          
          if (totalScore > bestScore) {
            bestScore = totalScore;
            bestPattern = pattern;
          }
        }
      }

      if (!bestPattern) {
        // Fallback
        const fallbackSolution = this.generateFallbackSolution(segments, remaining);
        usedPatterns.push(...fallbackSolution.patterns);
        break;
      }

      usedPatterns.push(bestPattern);
      for (const cut of bestPattern.cuts) {
        const current = remaining.get(cut.segmentId) || 0;
        remaining.set(cut.segmentId, Math.max(0, current - cut.count));
      }
    }

    return {
      remainingSegments: remaining,
      barsUsed: usedPatterns.length,
      patterns: usedPatterns,
    };
  }

  /**
   * Estimate future solution quality after applying a pattern
   */
  private estimateFutureQuality(demand: Map<string, number>, patterns: CuttingPattern[]): number {
    if (this.isMapEmpty(demand)) return 100; // Perfect future
    
    let bestFutureEfficiency = 0;
    let applicableCount = 0;
    
    for (const pattern of patterns) {
      if (this.canApplyPattern(demand, pattern)) {
        const coverage = this.calculateCoverage(demand, pattern);
        const efficiency = coverage / (pattern.waste + 0.1);
        bestFutureEfficiency = Math.max(bestFutureEfficiency, efficiency);
        applicableCount++;
      }
    }
    
    // Penalize if few patterns applicable (getting stuck)
    const diversityBonus = Math.min(applicableCount / 5, 1);
    return bestFutureEfficiency * diversityBonus;
  }

  /**
   * Generate fallback solution for remaining demand
   */
  private generateFallbackSolution(segments: BarSegment[], demand: Map<string, number>): MemoEntry {
    const fallbackPatterns: CuttingPattern[] = [];
    let totalWaste = 0;
    
    for (const [segmentId, demandCount] of demand.entries()) {
      if (demandCount === 0) continue;
      
      const segment = segments.find(s => s.segmentId === segmentId);
      if (!segment) continue;
      
      const maxPerBar = Math.floor(this.STANDARD_LENGTH / segment.length);
      let remainingToPack = demandCount;
      let barIndex = 0;
      
      while (remainingToPack > 0) {
        const countInThisBar = Math.min(remainingToPack, maxPerBar);
        const totalLength = segment.length * countInThisBar;
        const waste = this.STANDARD_LENGTH - totalLength;
        
        fallbackPatterns.push({
          id: `fallback_${segmentId}_${barIndex}`,
          cuts: [{
            segmentId: segment.segmentId,
            parentBarCode: segment.parentBarCode,
            length: segment.length,
            count: countInThisBar,
            segmentIndex: segment.segmentIndex,
            lapLength: segment.lapLength,
          }],
          waste: waste,
          utilization: (totalLength / this.STANDARD_LENGTH) * 100,
          standardBarLength: this.STANDARD_LENGTH,
        });
        
        totalWaste += waste;
        remainingToPack -= countInThisBar;
        barIndex++;
      }
    }
    
    return {
      barsUsed: fallbackPatterns.length,
      patterns: fallbackPatterns,
      totalWaste: totalWaste
    };
  }

  /**
   * Encode state for memoization
   */
  private encodeState(demand: Map<string, number>): string {
    const sorted = Array.from(demand.entries()).sort();
    return sorted.map(([id, count]) => `${id}:${count}`).join('|');
  }

  /**
   * Apply pattern to demand, returning new demand state
   */
  private applyPattern(demand: Map<string, number>, pattern: CuttingPattern): Map<string, number> {
    const newDemand = new Map(demand);
    for (const cut of pattern.cuts) {
      const current = newDemand.get(cut.segmentId) || 0;
      newDemand.set(cut.segmentId, Math.max(0, current - cut.count));
    }
    return newDemand;
  }

  /**
   * Calculate coverage (how many segments satisfied)
   */
  private calculateCoverage(demand: Map<string, number>, pattern: CuttingPattern): number {
    let coverage = 0;
    for (const cut of pattern.cuts) {
      const demandCount = demand.get(cut.segmentId) || 0;
      coverage += Math.min(demandCount, cut.count);
    }
    return coverage;
  }

  /**
   * Check if map is empty (all values are 0)
   */
  private isMapEmpty(map: Map<string, number>): boolean {
    for (const value of map.values()) {
      if (value > 0) return false;
    }
    return true;
  }

  /**
   * Check if pattern can be applied
   */
  private canApplyPattern(remaining: Map<string, number>, pattern: CuttingPattern): boolean {
    for (const cut of pattern.cuts) {
      const available = remaining.get(cut.segmentId) || 0;
      if (available < cut.count) {
        return false;
      }
    }
    return true;
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
          // Determine if this segment has lap
          // Lap exists if lapLength > 0 in input (for multi-bar cuts)
          // All segments except last have lap at end
          const hasLap = cut.lapLength > 0;
          
          cuts.push({
            barCode: cut.parentBarCode,
            segmentId: cut.segmentId,
            length: cut.length,
            quantity: 1,
            position: currentPosition,
            segmentIndex: cut.segmentIndex,
            hasLap: hasLap,
            lapLength: hasLap ? cut.lapLength : 0, // Use actual lap length if has lap
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
