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

export class TrueDynamicCuttingStock {
  private readonly STANDARD_LENGTH = 12.0;
  private preprocessor = new CuttingStockPreprocessor();
  private memo = new Map<string, MemoEntry>();
  private maxMemoSize = 10000; // Prevent memory explosion
  private maxPatterns = 200; // Limit patterns for performance

  solve(requests: MultiBarCuttingRequest[], dia: number): CuttingStockResult {
    const startTime = performance.now();

    // Filter by diameter
    const diaRequests = this.preprocessor.filterByDia(requests, dia);

    if (diaRequests.length === 0) {
      return this.createEmptyResult(dia, startTime);
    }

    // Extract segments and count demand
    const allSegments = this.preprocessor.extractAllSegments(diaRequests);
    const demand = this.countSegmentDemand(allSegments);
    
    console.log(`[TrueDP] Starting with demand:`, Array.from(demand.entries()));

    // Check if dataset is too large for DP
    const totalDemand = Array.from(demand.values()).reduce((sum, count) => sum + count, 0);
    const uniqueSegments = demand.size;
    
    if (totalDemand > 50 || uniqueSegments > 10) {
      console.log(`[TrueDP] Dataset too large (${totalDemand} segments, ${uniqueSegments} types). Using Column Generation.`);
      return this.solveWithColumnGeneration(allSegments, dia, startTime);
    }

    // Generate feasible patterns
    const feasiblePatterns = this.generateOptimalPatterns(allSegments);
    console.log(`[TrueDP] Generated ${feasiblePatterns.length} patterns`);

    if (feasiblePatterns.length === 0) {
      return this.createEmptyResult(dia, startTime);
    }

    // Solve using true dynamic programming
    const solution = this.dpSolveWithStateSpace(demand, feasiblePatterns);

    // Generate detailed cuts
    const detailedCuts = this.generateDetailedCuts(solution.patterns);

    // Calculate summary
    const summary = this.calculateSummary(solution.patterns, allSegments.length);

    const executionTime = performance.now() - startTime;

    return {
      algorithm: "true-dynamic",
      dia,
      patterns: solution.patterns,
      totalBarsUsed: solution.barsUsed,
      totalWaste: summary.totalWasteLength,
      averageUtilization: summary.averageUtilization,
      executionTime,
      summary,
      detailedCuts,
    };
  }

  /**
   * TRUE DYNAMIC PROGRAMMING with State Space Exploration
   * Minimizes total bars used (which minimizes total waste)
   */
  private dpSolveWithStateSpace(
    initialDemand: Map<string, number>,
    patterns: CuttingPattern[]
  ): DPState {
    this.memo.clear();
    
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
        console.warn("[TrueDP] Memo size limit reached, clearing cache");
        this.memo.clear();
      }

      let bestSolution: MemoEntry = {
        barsUsed: Infinity,
        patterns: [],
        totalWaste: Infinity
      };

      // Try each feasible pattern
      for (const pattern of patterns) {
        if (this.canApplyPattern(remainingDemand, pattern)) {
          const newDemand = this.applyPattern(remainingDemand, pattern);
          const subSolution = solve(newDemand);

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

      // Memoize result
      this.memo.set(stateKey, bestSolution);
      return bestSolution;
    };

    const solution = solve(initialDemand);
    
    return {
      remainingSegments: new Map(),
      barsUsed: solution.barsUsed,
      patterns: solution.patterns
    };
  }

  /**
   * COLUMN GENERATION approach for larger datasets
   * Iteratively generates patterns and solves linear relaxation
   */
  private solveWithColumnGeneration(
    segments: BarSegment[],
    dia: number,
    startTime: number
  ): CuttingStockResult {
    const demand = this.countSegmentDemand(segments);
    console.log(`[ColumnGen] Starting with demand:`, Array.from(demand.entries()));

    // Start with basic patterns (one segment type per pattern)
    let patterns = this.generateBasicPatterns(segments);
    let iteration = 0;
    const maxIterations = 10;

    while (iteration < maxIterations) {
      console.log(`[ColumnGen] Iteration ${iteration + 1}, patterns: ${patterns.length}`);

      // Solve current problem with existing patterns
      const currentSolution = this.solveSetCover(demand, patterns);
      
      // Generate new pattern based on dual values (simplified)
      const newPattern = this.generateImprovedPattern(segments, currentSolution.patterns);
      
      if (!newPattern || this.patternExists(patterns, newPattern)) {
        console.log(`[ColumnGen] No improving pattern found, stopping`);
        break;
      }

      patterns.push(newPattern);
      iteration++;
    }

    // Final solve with all generated patterns
    const finalSolution = this.solveSetCover(demand, patterns);

    const detailedCuts = this.generateDetailedCuts(finalSolution.patterns);
    const summary = this.calculateSummary(finalSolution.patterns, segments.length);
    const executionTime = performance.now() - startTime;

    return {
      algorithm: "column-generation",
      dia,
      patterns: finalSolution.patterns,
      totalBarsUsed: finalSolution.barsUsed,
      totalWaste: summary.totalWasteLength,
      averageUtilization: summary.averageUtilization,
      executionTime,
      summary,
      detailedCuts,
    };
  }

  /**
   * SET COVER approach - treats cutting stock as set cover problem
   * Each pattern "covers" certain demand
   */
  private solveSetCover(
    demand: Map<string, number>,
    patterns: CuttingPattern[]
  ): DPState {
    // Greedy set cover approximation
    const usedPatterns: CuttingPattern[] = [];
    const remaining = new Map(demand);

    while (!this.isMapEmpty(remaining)) {
      let bestPattern: CuttingPattern | null = null;
      let bestRatio = -1;

      // Find pattern with best coverage-to-waste ratio
      for (const pattern of patterns) {
        if (this.canApplyPattern(remaining, pattern)) {
          const coverage = this.calculateCoverage(remaining, pattern);
          const efficiency = coverage / (pattern.waste + 0.1); // Add small constant to avoid division by zero
          
          if (efficiency > bestRatio) {
            bestRatio = efficiency;
            bestPattern = pattern;
          }
        }
      }

      if (!bestPattern) {
        console.warn("[SetCover] No applicable pattern found");
        break;
      }

      // Apply best pattern
      usedPatterns.push(bestPattern);
      for (const cut of bestPattern.cuts) {
        const current = remaining.get(cut.segmentId) || 0;
        remaining.set(cut.segmentId, Math.max(0, current - cut.count));
      }
    }

    return {
      remainingSegments: remaining,
      barsUsed: usedPatterns.length,
      patterns: usedPatterns
    };
  }

  /**
   * Generate optimal patterns using knapsack approach
   */
  private generateOptimalPatterns(segments: BarSegment[]): CuttingPattern[] {
    const patterns: CuttingPattern[] = [];
    const uniqueSegments = this.getUniqueSegments(segments);

    // Generate patterns using bounded knapsack
    const maxPatterns = Math.min(this.maxPatterns, 500);
    
    // Single segment patterns
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

    // Multi-segment patterns using knapsack
    this.generateKnapsackPatterns(uniqueSegments, patterns, maxPatterns);

    // Sort by waste (ascending) then by utilization (descending)
    patterns.sort((a, b) => {
      if (Math.abs(a.waste - b.waste) < 0.01) {
        return b.utilization - a.utilization;
      }
      return a.waste - b.waste;
    });

    return patterns.slice(0, maxPatterns);
  }

  /**
   * Generate patterns using knapsack dynamic programming
   */
  private generateKnapsackPatterns(
    segments: BarSegment[],
    patterns: CuttingPattern[],
    maxPatterns: number
  ): void {
    const capacity = Math.floor(this.STANDARD_LENGTH * 100); // Work in cm for precision
    const items = segments.map(seg => ({
      length: Math.floor(seg.length * 100),
      value: Math.floor(seg.length * 100), // Value = length (maximize utilization)
      segment: seg
    }));

    // DP table: dp[i][w] = maximum value using first i items with weight limit w
    const dp: number[][] = Array(items.length + 1).fill(null).map(() => Array(capacity + 1).fill(0));
    const keep: boolean[][] = Array(items.length + 1).fill(null).map(() => Array(capacity + 1).fill(false));

    // Fill DP table
    for (let i = 1; i <= items.length; i++) {
      const item = items[i - 1];
      for (let w = 0; w <= capacity; w++) {
        // Don't take item
        dp[i][w] = dp[i - 1][w];
        
        // Take item (if it fits)
        if (item.length <= w) {
          const valueWithItem = dp[i - 1][w - item.length] + item.value;
          if (valueWithItem > dp[i][w]) {
            dp[i][w] = valueWithItem;
            keep[i][w] = true;
          }
        }
      }
    }

    // Extract patterns from DP table
    for (let w = capacity; w >= capacity * 0.7 && patterns.length < maxPatterns; w--) {
      if (dp[items.length][w] > 0) {
        const pattern = this.extractKnapsackPattern(items, keep, w);
        if (pattern && !this.patternExists(patterns, pattern)) {
          patterns.push(pattern);
        }
      }
    }
  }

  /**
   * Extract pattern from knapsack DP solution
   */
  private extractKnapsackPattern(
    items: Array<{length: number, value: number, segment: BarSegment}>,
    keep: boolean[][],
    capacity: number
  ): CuttingPattern | null {
    const cuts: PatternCut[] = [];
    let i = items.length;
    let w = capacity;

    while (i > 0 && w > 0) {
      if (keep[i][w]) {
        const item = items[i - 1];
        
        // Find existing cut or create new one
        const existingCut = cuts.find(cut => cut.segmentId === item.segment.segmentId);
        if (existingCut) {
          existingCut.count++;
        } else {
          cuts.push({
            segmentId: item.segment.segmentId,
            parentBarCode: item.segment.parentBarCode,
            length: item.segment.length,
            count: 1,
            segmentIndex: item.segment.segmentIndex,
            lapLength: item.segment.lapLength,
          });
        }
        
        w -= item.length;
      }
      i--;
    }

    if (cuts.length === 0) return null;

    const totalLength = cuts.reduce((sum, cut) => sum + cut.length * cut.count, 0);
    const waste = this.STANDARD_LENGTH - totalLength;

    return {
      id: `knapsack_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      cuts,
      waste,
      utilization: (totalLength / this.STANDARD_LENGTH) * 100,
      standardBarLength: this.STANDARD_LENGTH,
    };
  }

  // Helper methods
  private countSegmentDemand(segments: BarSegment[]): Map<string, number> {
    const demand = new Map<string, number>();
    for (const segment of segments) {
      const count = demand.get(segment.segmentId) || 0;
      demand.set(segment.segmentId, count + 1);
    }
    return demand;
  }

  private encodeState(demand: Map<string, number>): string {
    const sorted = Array.from(demand.entries()).sort();
    return JSON.stringify(sorted);
  }

  private isMapEmpty(map: Map<string, number>): boolean {
    for (const value of map.values()) {
      if (value > 0) return false;
    }
    return true;
  }

  private canApplyPattern(demand: Map<string, number>, pattern: CuttingPattern): boolean {
    for (const cut of pattern.cuts) {
      const available = demand.get(cut.segmentId) || 0;
      if (available < cut.count) {
        return false;
      }
    }
    return true;
  }

  private applyPattern(demand: Map<string, number>, pattern: CuttingPattern): Map<string, number> {
    const newDemand = new Map(demand);
    for (const cut of pattern.cuts) {
      const current = newDemand.get(cut.segmentId) || 0;
      newDemand.set(cut.segmentId, Math.max(0, current - cut.count));
    }
    return newDemand;
  }

  private calculateCoverage(demand: Map<string, number>, pattern: CuttingPattern): number {
    let coverage = 0;
    for (const cut of pattern.cuts) {
      const demandCount = demand.get(cut.segmentId) || 0;
      coverage += Math.min(demandCount, cut.count);
    }
    return coverage;
  }

  private getUniqueSegments(segments: BarSegment[]): BarSegment[] {
    const uniqueMap = new Map<string, BarSegment>();
    for (const segment of segments) {
      if (!uniqueMap.has(segment.segmentId)) {
        uniqueMap.set(segment.segmentId, segment);
      }
    }
    return Array.from(uniqueMap.values());
  }

  private generateBasicPatterns(segments: BarSegment[]): CuttingPattern[] {
    const patterns: CuttingPattern[] = [];
    const uniqueSegments = this.getUniqueSegments(segments);

    for (const segment of uniqueSegments) {
      const maxCount = Math.floor(this.STANDARD_LENGTH / segment.length);
      for (let count = 1; count <= maxCount; count++) {
        const totalLength = segment.length * count;
        const waste = this.STANDARD_LENGTH - totalLength;
        
        patterns.push({
          id: `basic_${segment.segmentId}_${count}`,
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

    return patterns;
  }

  private generateImprovedPattern(
    segments: BarSegment[],
    currentPatterns: CuttingPattern[]
  ): CuttingPattern | null {
    // Simplified pattern improvement - find underutilized segments
    const segmentUsage = new Map<string, number>();
    
    for (const pattern of currentPatterns) {
      for (const cut of pattern.cuts) {
        const usage = segmentUsage.get(cut.segmentId) || 0;
        segmentUsage.set(cut.segmentId, usage + cut.count);
      }
    }

    // Find least used segments and try to combine them
    const uniqueSegments = this.getUniqueSegments(segments);
    const sortedByUsage = uniqueSegments.sort((a, b) => {
      const usageA = segmentUsage.get(a.segmentId) || 0;
      const usageB = segmentUsage.get(b.segmentId) || 0;
      return usageA - usageB;
    });

    // Try to create a pattern with underutilized segments
    const cuts: PatternCut[] = [];
    let remainingLength = this.STANDARD_LENGTH;

    for (const segment of sortedByUsage) {
      const maxCount = Math.floor(remainingLength / segment.length);
      if (maxCount > 0) {
        cuts.push({
          segmentId: segment.segmentId,
          parentBarCode: segment.parentBarCode,
          length: segment.length,
          count: Math.min(maxCount, 2), // Limit to 2 to allow mixing
          segmentIndex: segment.segmentIndex,
          lapLength: segment.lapLength,
        });
        remainingLength -= segment.length * Math.min(maxCount, 2);
      }
    }

    if (cuts.length === 0) return null;

    const totalLength = cuts.reduce((sum, cut) => sum + cut.length * cut.count, 0);
    const waste = this.STANDARD_LENGTH - totalLength;

    return {
      id: `improved_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      cuts,
      waste,
      utilization: (totalLength / this.STANDARD_LENGTH) * 100,
      standardBarLength: this.STANDARD_LENGTH,
    };
  }

  private patternExists(patterns: CuttingPattern[], newPattern: CuttingPattern): boolean {
    return patterns.some(pattern => {
      if (pattern.cuts.length !== newPattern.cuts.length) return false;
      
      const sortedExisting = [...pattern.cuts].sort((a, b) => a.segmentId.localeCompare(b.segmentId));
      const sortedNew = [...newPattern.cuts].sort((a, b) => a.segmentId.localeCompare(b.segmentId));
      
      return sortedExisting.every((cut, i) => 
        cut.segmentId === sortedNew[i].segmentId && cut.count === sortedNew[i].count
      );
    });
  }

  // Reuse existing methods from original implementation
  private generateDetailedCuts(patterns: CuttingPattern[]): DetailedCut[] {
    return patterns.map((pattern, index) => {
      let currentPosition = 0;
      const cuts: CutInstruction[] = [];

      for (const cut of pattern.cuts) {
        for (let i = 0; i < cut.count; i++) {
          const hasLap = cut.lapLength > 0;

          cuts.push({
            barCode: cut.parentBarCode,
            segmentId: cut.segmentId,
            length: cut.length,
            quantity: 1,
            position: currentPosition,
            segmentIndex: cut.segmentIndex,
            hasLap: hasLap,
            lapLength: hasLap ? cut.lapLength : 0,
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

  private createEmptyResult(dia: number, startTime: number): CuttingStockResult {
    return {
      algorithm: "true-dynamic",
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