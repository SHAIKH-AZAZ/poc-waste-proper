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
   * Solve using greedy pattern selection (simplified approach)
   * Select patterns that maximize utilization and satisfy demand
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

    console.log("[Dynamic] Segment demand:", Array.from(segmentCounts.entries()));
    console.log("[Dynamic] Available patterns:", patterns.length);

    // Sort patterns by utilization (best first)
    const sortedPatterns = [...patterns].sort((a, b) => b.utilization - a.utilization);

    const usedPatterns: CuttingPattern[] = [];
    const remaining = new Map(segmentCounts);

    // Greedy pattern selection
    while (!this.isMapEmpty(remaining)) {
      let bestPattern: CuttingPattern | null = null;
      let bestScore = -1;

      // Find pattern that satisfies most remaining demand
      for (const pattern of sortedPatterns) {
        if (this.canApplyPattern(remaining, pattern)) {
          const score = this.calculatePatternScore(remaining, pattern);
          if (score > bestScore) {
            bestScore = score;
            bestPattern = pattern;
          }
        }
      }

      if (!bestPattern) {
        console.warn("[Dynamic] No pattern found to satisfy remaining demand:", Array.from(remaining.entries()));
        break;
      }

      // Apply pattern
      usedPatterns.push(bestPattern);
      for (const cut of bestPattern.cuts) {
        const current = remaining.get(cut.segmentId) || 0;
        remaining.set(cut.segmentId, Math.max(0, current - cut.count));
      }
    }

    console.log("[Dynamic] Used", usedPatterns.length, "patterns");

    return {
      remainingSegments: remaining,
      barsUsed: usedPatterns.length,
      patterns: usedPatterns,
    };
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
   * Calculate pattern score (how much demand it satisfies)
   */
  private calculatePatternScore(remaining: Map<string, number>, pattern: CuttingPattern): number {
    let score = 0;
    for (const cut of pattern.cuts) {
      const demand = remaining.get(cut.segmentId) || 0;
      score += Math.min(demand, cut.count);
    }
    return score;
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
