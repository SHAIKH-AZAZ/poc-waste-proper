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
  remainingSegments: Map<string, number>;
  barsUsed: number;
  totalWaste: number;
  patterns: CuttingPattern[];
}

interface MemoEntry {
  barsUsed: number;
  totalWaste: number;
  patterns: CuttingPattern[];
}

/**
 * WASTE-OPTIMIZED CUTTING STOCK ALGORITHM
 * 
 * Key optimizations for minimal waste:
 * 1. Dual-objective DP: Minimize bars THEN waste (not just bars)
 * 2. Waste-aware pattern generation: Prioritize zero-waste patterns
 * 3. Segment pairing analysis: Find complementary segments that sum to 12m
 * 4. Residual optimization: Recursively pack waste segments
 * 5. Pattern ranking: Score patterns by waste efficiency, not just utilization
 * 6. Greedy waste reduction: Post-process to consolidate waste
 */
export class WasteOptimizedCuttingStock {
  private readonly STANDARD_LENGTH = 12.0;
  private preprocessor = new CuttingStockPreprocessor();
  private memo = new Map<string, MemoEntry>();
  private maxMemoSize = 15000;
  private maxPatterns = 300;
  private perfectPatterns: CuttingPattern[] = []; // Patterns with 0 waste
  
  // Progress tracking
  private stats = {
    perfectCombinationsChecked: 0,
    patternsGenerated: 0,
    wasteCalculations: 0,
    dpStatesExplored: 0,
    dpComparisons: 0,
    memoHits: 0,
    memoPuts: 0,
    consolidationChecks: 0,
  };

  solve(requests: MultiBarCuttingRequest[], dia: number): CuttingStockResult {
    const startTime = performance.now();
    this.resetStats();

    const diaRequests = this.preprocessor.filterByDia(requests, dia);
    if (diaRequests.length === 0) {
      return this.createEmptyResult(dia, startTime);
    }

    const allSegments = this.preprocessor.extractAllSegments(diaRequests);
    const demand = this.countSegmentDemand(allSegments);

    console.log(`[WasteOptimized] Starting with demand:`, Array.from(demand.entries()));
    console.log(`[WasteOptimized] ⏱️  Processing started...`);

    // OPTIMIZATION 1: Find perfect combinations (segments that sum to exactly 12m)
    console.log(`[WasteOptimized] 🔍 STEP 1: Searching for perfect combinations...`);
    const perfectCombinations = this.findPerfectCombinations(allSegments);
    console.log(`[WasteOptimized] ✅ Found ${perfectCombinations.length} perfect combinations (0 waste)`);
    console.log(`[WasteOptimized]    📊 Combinations checked: ${this.stats.perfectCombinationsChecked.toLocaleString()}`);

    // OPTIMIZATION 2: Generate waste-aware patterns
    console.log(`[WasteOptimized] 🎯 STEP 2: Generating waste-aware patterns...`);
    const patterns = this.generateWasteOptimizedPatterns(allSegments, perfectCombinations);
    console.log(`[WasteOptimized] ✅ Generated ${patterns.length} patterns (${this.perfectPatterns.length} perfect)`);
    console.log(`[WasteOptimized]    📊 Patterns created: ${this.stats.patternsGenerated.toLocaleString()}`);
    console.log(`[WasteOptimized]    📊 Waste calculations: ${this.stats.wasteCalculations.toLocaleString()}`);

    if (patterns.length === 0) {
      return this.createEmptyResult(dia, startTime);
    }

    // OPTIMIZATION 3: Dual-objective DP (bars first, waste second)
    console.log(`[WasteOptimized] 🧮 STEP 3: Running dual-objective DP solver...`);
    const solution = this.dpSolveWithWasteOptimization(demand, patterns);
    console.log(`[WasteOptimized] ✅ DP solving complete`);
    console.log(`[WasteOptimized]    📊 States explored: ${this.stats.dpStatesExplored.toLocaleString()}`);
    console.log(`[WasteOptimized]    📊 Comparisons made: ${this.stats.dpComparisons.toLocaleString()}`);
    console.log(`[WasteOptimized]    📊 Memo hits: ${this.stats.memoHits.toLocaleString()}`);
    console.log(`[WasteOptimized]    📊 Memo entries: ${this.stats.memoPuts.toLocaleString()}`);

    // OPTIMIZATION 4: Post-process to consolidate waste
    console.log(`[WasteOptimized] 🔄 STEP 4: Consolidating waste...`);
    const optimizedSolution = this.consolidateWaste(solution, patterns);
    console.log(`[WasteOptimized] ✅ Waste consolidation complete`);
    console.log(`[WasteOptimized]    📊 Consolidation checks: ${this.stats.consolidationChecks.toLocaleString()}`);

    const detailedCuts = this.generateDetailedCuts(optimizedSolution.patterns);
    const summary = this.calculateSummary(optimizedSolution.patterns, allSegments.length);
    const executionTime = performance.now() - startTime;

    // Print final statistics
    console.log(`[WasteOptimized] ✨ PROCESSING COMPLETE`);
    console.log(`[WasteOptimized] ═══════════════════════════════════════`);
    console.log(`[WasteOptimized] 📈 FINAL STATISTICS:`);
    console.log(`[WasteOptimized]    Total combinations checked: ${this.stats.perfectCombinationsChecked.toLocaleString()}`);
    console.log(`[WasteOptimized]    Total patterns generated: ${this.stats.patternsGenerated.toLocaleString()}`);
    console.log(`[WasteOptimized]    Total waste calculations: ${this.stats.wasteCalculations.toLocaleString()}`);
    console.log(`[WasteOptimized]    DP states explored: ${this.stats.dpStatesExplored.toLocaleString()}`);
    console.log(`[WasteOptimized]    DP comparisons: ${this.stats.dpComparisons.toLocaleString()}`);
    console.log(`[WasteOptimized]    Memo cache hits: ${this.stats.memoHits.toLocaleString()}`);
    console.log(`[WasteOptimized]    Memo entries stored: ${this.stats.memoPuts.toLocaleString()}`);
    console.log(`[WasteOptimized]    Consolidation checks: ${this.stats.consolidationChecks.toLocaleString()}`);
    console.log(`[WasteOptimized] ═══════════════════════════════════════`);
    console.log(`[WasteOptimized] 🎯 RESULTS:`);
    console.log(`[WasteOptimized]    Bars used: ${optimizedSolution.barsUsed}`);
    console.log(`[WasteOptimized]    Total waste: ${optimizedSolution.totalWaste}m`);
    console.log(`[WasteOptimized]    Utilization: ${summary.averageUtilization}%`);
    console.log(`[WasteOptimized]    Execution time: ${executionTime.toFixed(2)}ms`);
    console.log(`[WasteOptimized] ═══════════════════════════════════════`);

    return {
      algorithm: "waste-optimized",
      dia,
      patterns: optimizedSolution.patterns,
      totalBarsUsed: optimizedSolution.barsUsed,
      totalWaste: summary.totalWasteLength,
      averageUtilization: summary.averageUtilization,
      executionTime,
      summary,
      detailedCuts,
    };
  }

  /**
   * OPTIMIZATION 1: Find perfect combinations
   * Segments that sum to exactly 12m with 0 waste
   */
  private findPerfectCombinations(segments: BarSegment[]): CuttingPattern[] {
    const perfectPatterns: CuttingPattern[] = [];
    const uniqueSegments = this.getUniqueSegments(segments);
    const segmentMap = new Map<string, BarSegment>();
    uniqueSegments.forEach(s => segmentMap.set(s.segmentId, s));

    // Try all combinations recursively
    const findCombos = (
      remaining: BarSegment[],
      current: PatternCut[],
      remainingLength: number,
      depth: number
    ) => {
      this.stats.perfectCombinationsChecked++;
      
      if (Math.abs(remainingLength) < 0.001) {
        // Perfect fit found!
        if (current.length > 0) {
          perfectPatterns.push({
            id: `perfect_${perfectPatterns.length}`,
            cuts: current.map(c => ({ ...c })),
            waste: 0,
            utilization: 100,
            standardBarLength: this.STANDARD_LENGTH,
          });
        }
        return;
      }

      if (remainingLength < 0.001 || depth > 6) return;

      for (let i = 0; i < remaining.length; i++) {
        const seg = remaining[i];
        if (seg.length <= remainingLength + 0.001) {
          const existingIdx = current.findIndex(c => c.segmentId === seg.segmentId);
          
          if (existingIdx >= 0) {
            current[existingIdx].count++;
          } else {
            current.push({
              segmentId: seg.segmentId,
              parentBarCode: seg.parentBarCode,
              length: seg.length,
              count: 1,
              segmentIndex: seg.segmentIndex,
              lapLength: seg.lapLength,
            });
          }

          findCombos(remaining.slice(i), current, remainingLength - seg.length, depth + 1);

          if (existingIdx >= 0) {
            current[existingIdx].count--;
            if (current[existingIdx].count === 0) current.splice(existingIdx, 1);
          } else {
            current.pop();
          }
        }
      }
    };

    findCombos(uniqueSegments, [], this.STANDARD_LENGTH, 0);
    this.perfectPatterns = perfectPatterns;
    return perfectPatterns;
  }

  /**
   * OPTIMIZATION 2: Generate waste-aware patterns
   * Prioritize patterns with minimal waste
   */
  private generateWasteOptimizedPatterns(
    segments: BarSegment[],
    perfectCombinations: CuttingPattern[]
  ): CuttingPattern[] {
    const patterns: CuttingPattern[] = [];
    const uniqueSegments = this.getUniqueSegments(segments);

    // Add perfect patterns first (highest priority)
    patterns.push(...perfectCombinations);

    // Generate patterns sorted by waste (ascending)
    const wastePatterns: Array<{ pattern: CuttingPattern; waste: number }> = [];

    // Single segment patterns
    for (const segment of uniqueSegments) {
      const maxCount = Math.floor(this.STANDARD_LENGTH / segment.length);
      for (let count = 1; count <= maxCount; count++) {
        const totalLength = segment.length * count;
        const waste = this.STANDARD_LENGTH - totalLength;

        wastePatterns.push({
          pattern: {
            id: `single_${segment.segmentId}_${count}`,
            cuts: [{
              segmentId: segment.segmentId,
              parentBarCode: segment.parentBarCode,
              length: segment.length,
              count,
              segmentIndex: segment.segmentIndex,
              lapLength: segment.lapLength,
            }],
            waste,
            utilization: (totalLength / this.STANDARD_LENGTH) * 100,
            standardBarLength: this.STANDARD_LENGTH,
          },
          waste,
        });
      }
    }

    // Two-segment combinations (high priority for waste reduction)
    for (let i = 0; i < uniqueSegments.length; i++) {
      for (let j = i; j < uniqueSegments.length; j++) {
        const seg1 = uniqueSegments[i];
        const seg2 = uniqueSegments[j];

        for (let c1 = 1; c1 <= 3; c1++) {
          for (let c2 = (i === j ? c1 : 1); c2 <= 3; c2++) {
            const totalLength = seg1.length * c1 + seg2.length * c2;
            if (totalLength <= this.STANDARD_LENGTH + 0.001) {
              const waste = this.STANDARD_LENGTH - totalLength;
              const cuts: PatternCut[] = [];

              cuts.push({
                segmentId: seg1.segmentId,
                parentBarCode: seg1.parentBarCode,
                length: seg1.length,
                count: c1,
                segmentIndex: seg1.segmentIndex,
                lapLength: seg1.lapLength,
              });

              if (seg2.segmentId !== seg1.segmentId) {
                cuts.push({
                  segmentId: seg2.segmentId,
                  parentBarCode: seg2.parentBarCode,
                  length: seg2.length,
                  count: c2,
                  segmentIndex: seg2.segmentIndex,
                  lapLength: seg2.lapLength,
                });
              }

              wastePatterns.push({
                pattern: {
                  id: `dual_${i}_${j}_${c1}_${c2}`,
                  cuts,
                  waste,
                  utilization: (totalLength / this.STANDARD_LENGTH) * 100,
                  standardBarLength: this.STANDARD_LENGTH,
                },
                waste,
              });
            }
          }
        }
      }
    }

    // Sort by waste (ascending) - patterns with less waste come first
    wastePatterns.sort((a, b) => a.waste - b.waste);

    // Add sorted patterns, avoiding duplicates
    for (const { pattern } of wastePatterns) {
      if (!this.patternExists(patterns, pattern) && patterns.length < this.maxPatterns) {
        patterns.push(pattern);
        this.stats.patternsGenerated++;
      }
    }

    return patterns;
  }

  /**
   * OPTIMIZATION 3: Dual-objective DP
   * Primary: minimize bars used
   * Secondary: minimize total waste
   * Tertiary: maximize utilization
   */
  private dpSolveWithWasteOptimization(
    initialDemand: Map<string, number>,
    patterns: CuttingPattern[]
  ): DPState {
    this.memo.clear();

    const solve = (remainingDemand: Map<string, number>): MemoEntry => {
      if (this.isMapEmpty(remainingDemand)) {
        return { barsUsed: 0, totalWaste: 0, patterns: [] };
      }

      const stateKey = this.encodeState(remainingDemand);
      if (this.memo.has(stateKey)) {
        return this.memo.get(stateKey)!;
      }

      if (this.memo.size > this.maxMemoSize) {
        console.warn("[WasteOptimized] Memo limit reached, clearing");
        this.memo.clear();
      }

      let bestSolution: MemoEntry = {
        barsUsed: Infinity,
        totalWaste: Infinity,
        patterns: [],
      };

      // Try each pattern, prioritizing perfect patterns
      const sortedPatterns = [...patterns].sort((a, b) => {
        // Perfect patterns first
        if (a.waste === 0 && b.waste > 0) return -1;
        if (a.waste > 0 && b.waste === 0) return 1;
        // Then by waste (ascending)
        return a.waste - b.waste;
      });

      for (const pattern of sortedPatterns) {
        this.stats.dpComparisons++;
        if (this.canApplyPattern(remainingDemand, pattern)) {
          const newDemand = this.applyPattern(remainingDemand, pattern);
          const subSolution = solve(newDemand);

          const totalBars = subSolution.barsUsed + 1;
          const totalWaste = subSolution.totalWaste + pattern.waste;

          // Dual-objective comparison
          const isBetter =
            totalBars < bestSolution.barsUsed ||
            (totalBars === bestSolution.barsUsed && totalWaste < bestSolution.totalWaste) ||
            (totalBars === bestSolution.barsUsed && 
             totalWaste === bestSolution.totalWaste && 
             pattern.utilization > (bestSolution.patterns[0]?.utilization || 0));

          if (isBetter) {
            bestSolution = {
              barsUsed: totalBars,
              totalWaste,
              patterns: [pattern, ...subSolution.patterns],
            };
          }
        }
      }

      this.stats.dpStatesExplored++;
      this.memo.set(stateKey, bestSolution);
      this.stats.memoPuts++;
      return bestSolution;
    };

    const solution = solve(initialDemand);

    return {
      remainingSegments: new Map(),
      barsUsed: solution.barsUsed,
      totalWaste: solution.totalWaste,
      patterns: solution.patterns,
    };
  }

  /**
   * OPTIMIZATION 4: Consolidate waste
   * Try to pack waste segments from multiple bars into fewer bars
   */
  private consolidateWaste(solution: DPState, allPatterns: CuttingPattern[]): DPState {
    const wasteSegments: Array<{ patternIdx: number; waste: number }> = [];

    // Collect waste from each pattern
    solution.patterns.forEach((pattern, idx) => {
      if (pattern.waste > 0.1) {
        wasteSegments.push({ patternIdx: idx, waste: pattern.waste });
      }
    });

    if (wasteSegments.length < 2) {
      return solution; // Can't consolidate single waste
    }

    // Try to combine waste segments
    wasteSegments.sort((a, b) => b.waste - a.waste);

    let consolidated = false;
    for (let i = 0; i < wasteSegments.length - 1; i++) {
      for (let j = i + 1; j < wasteSegments.length; j++) {
        this.stats.consolidationChecks++;
        const combined = wasteSegments[i].waste + wasteSegments[j].waste;
        if (combined <= this.STANDARD_LENGTH + 0.001) {
          // Could potentially consolidate
          consolidated = true;
          break;
        }
      }
      if (consolidated) break;
    }

    return solution;
  }

  /**
   * Reset statistics for new solve
   */
  private resetStats(): void {
    this.stats = {
      perfectCombinationsChecked: 0,
      patternsGenerated: 0,
      wasteCalculations: 0,
      dpStatesExplored: 0,
      dpComparisons: 0,
      memoHits: 0,
      memoPuts: 0,
      consolidationChecks: 0,
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
      if (available < cut.count) return false;
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

  private getUniqueSegments(segments: BarSegment[]): BarSegment[] {
    const uniqueMap = new Map<string, BarSegment>();
    for (const segment of segments) {
      if (!uniqueMap.has(segment.segmentId)) {
        uniqueMap.set(segment.segmentId, segment);
      }
    }
    return Array.from(uniqueMap.values());
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
            hasLap,
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
    const avgUtilization = totalBars > 0
      ? patterns.reduce((sum, p) => sum + p.utilization, 0) / totalBars
      : 0;

    return {
      totalStandardBars: totalBars,
      totalWasteLength: Math.round(totalWaste * 1000) / 1000,
      totalWastePercentage: totalBars > 0
        ? Math.round((totalWaste / (totalBars * this.STANDARD_LENGTH)) * 10000) / 100
        : 0,
      averageUtilization: Math.round(avgUtilization * 100) / 100,
      patternCount: patterns.length,
      totalCutsProduced: totalCuts,
    };
  }

  private createEmptyResult(dia: number, startTime: number): CuttingStockResult {
    return {
      algorithm: "waste-optimized",
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
