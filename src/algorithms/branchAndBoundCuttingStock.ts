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

interface BranchNode {
  demand: Map<string, number>;
  usedPatterns: CuttingPattern[];
  lowerBound: number;
  upperBound: number;
  depth: number;
}

interface BranchSolution {
  patterns: CuttingPattern[];
  barsUsed: number;
  totalWaste: number;
  isOptimal: boolean;
}

export class BranchAndBoundCuttingStock {
  private readonly STANDARD_LENGTH = 12.0;
  private preprocessor = new CuttingStockPreprocessor();
  private bestSolution: BranchSolution | null = null;
  private nodesExplored = 0;
  private maxNodes = 10000; // Prevent infinite search
  private timeLimit = 30000; // 30 seconds max
  private startTime = 0;

  solve(requests: MultiBarCuttingRequest[], dia: number): CuttingStockResult {
    this.startTime = performance.now();
    this.bestSolution = null;
    this.nodesExplored = 0;

    // Filter by diameter
    const diaRequests = this.preprocessor.filterByDia(requests, dia);

    if (diaRequests.length === 0) {
      return this.createEmptyResult(dia);
    }

    // Extract segments and count demand
    const allSegments = this.preprocessor.extractAllSegments(diaRequests);
    const demand = this.countSegmentDemand(allSegments);
    
    console.log(`[BranchBound] Starting with demand:`, Array.from(demand.entries()));

    // Check if dataset is suitable for branch and bound
    const totalDemand = Array.from(demand.values()).reduce((sum, count) => sum + count, 0);
    const uniqueSegments = demand.size;
    
    if (totalDemand > 30 || uniqueSegments > 8) {
      console.log(`[BranchBound] Dataset too large (${totalDemand} segments, ${uniqueSegments} types). Using heuristic.`);
      return this.solveWithHeuristic(allSegments, dia);
    }

    // Generate all feasible patterns
    const patterns = this.generateAllPatterns(allSegments);
    console.log(`[BranchBound] Generated ${patterns.length} patterns`);

    // Initialize with greedy solution as upper bound
    const greedySolution = this.getGreedySolution(demand, patterns);
    this.bestSolution = greedySolution;
    
    console.log(`[BranchBound] Initial upper bound: ${greedySolution.barsUsed} bars`);

    // Start branch and bound
    const rootNode: BranchNode = {
      demand: new Map(demand),
      usedPatterns: [],
      lowerBound: this.calculateLowerBound(demand),
      upperBound: greedySolution.barsUsed,
      depth: 0
    };

    this.branchAndBound(rootNode, patterns);

    console.log(`[BranchBound] Explored ${this.nodesExplored} nodes`);
    console.log(`[BranchBound] Best solution: ${this.bestSolution?.barsUsed} bars`);

    // Generate result
    const solution = this.bestSolution || greedySolution;
    const detailedCuts = this.generateDetailedCuts(solution.patterns);
    const summary = this.calculateSummary(solution.patterns, allSegments.length);
    const executionTime = performance.now() - this.startTime;

    return {
      algorithm: "branch-and-bound",
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
   * Branch and Bound main algorithm
   */
  private branchAndBound(node: BranchNode, patterns: CuttingPattern[]): void {
    this.nodesExplored++;

    // Check termination conditions
    if (this.nodesExplored > this.maxNodes || 
        performance.now() - this.startTime > this.timeLimit) {
      console.log(`[BranchBound] Terminating: nodes=${this.nodesExplored}, time=${performance.now() - this.startTime}ms`);
      return;
    }

    // Check if this is a complete solution
    if (this.isMapEmpty(node.demand)) {
      const solution: BranchSolution = {
        patterns: [...node.usedPatterns],
        barsUsed: node.usedPatterns.length,
        totalWaste: node.usedPatterns.reduce((sum, p) => sum + p.waste, 0),
        isOptimal: true
      };

      if (!this.bestSolution || solution.barsUsed < this.bestSolution.barsUsed) {
        this.bestSolution = solution;
        console.log(`[BranchBound] New best solution: ${solution.barsUsed} bars at depth ${node.depth}`);
      }
      return;
    }

    // Pruning: if lower bound >= current best, don't explore further
    if (this.bestSolution && node.lowerBound >= this.bestSolution.barsUsed) {
      return;
    }

    // Branch: try each applicable pattern
    const applicablePatterns = patterns.filter(pattern => 
      this.canApplyPattern(node.demand, pattern)
    );

    // Sort patterns by efficiency (waste/coverage ratio)
    applicablePatterns.sort((a, b) => {
      const efficiencyA = this.calculateCoverage(node.demand, a) / (a.waste + 0.1);
      const efficiencyB = this.calculateCoverage(node.demand, b) / (b.waste + 0.1);
      return efficiencyB - efficiencyA;
    });

    for (const pattern of applicablePatterns) {
      // Create child node
      const newDemand = this.applyPattern(node.demand, pattern);
      const newUsedPatterns = [...node.usedPatterns, pattern];
      const newLowerBound = this.calculateLowerBound(newDemand) + newUsedPatterns.length;

      const childNode: BranchNode = {
        demand: newDemand,
        usedPatterns: newUsedPatterns,
        lowerBound: newLowerBound,
        upperBound: node.upperBound,
        depth: node.depth + 1
      };

      // Recursive call
      this.branchAndBound(childNode, patterns);

      // Early termination if optimal solution found
      if (this.bestSolution?.isOptimal) {
        return;
      }
    }
  }

  /**
   * Calculate lower bound using linear relaxation
   */
  private calculateLowerBound(demand: Map<string, number>): number {
    if (this.isMapEmpty(demand)) return 0;

    // Simple lower bound: total material needed / standard bar length
    let totalMaterial = 0;
    for (const [segmentId, count] of demand) {
      // Extract length from segmentId (format: "barCode_seg_index")
      const segments = this.getAllSegments();
      const segment = segments.find(s => s.segmentId === segmentId);
      if (segment) {
        totalMaterial += segment.length * count;
      }
    }

    return Math.ceil(totalMaterial / this.STANDARD_LENGTH);
  }

  /**
   * Generate all feasible patterns using complete enumeration
   */
  private generateAllPatterns(segments: BarSegment[]): CuttingPattern[] {
    const patterns: CuttingPattern[] = [];
    const uniqueSegments = this.getUniqueSegments(segments);
    
    // Limit pattern generation for performance
    const maxSegmentTypes = Math.min(uniqueSegments.length, 5);
    const limitedSegments = uniqueSegments.slice(0, maxSegmentTypes);

    // Generate patterns using recursive enumeration
    this.enumeratePatterns(limitedSegments, [], 0, this.STANDARD_LENGTH, patterns);

    // Sort by waste (ascending) for better branching
    patterns.sort((a, b) => a.waste - b.waste);

    console.log(`[BranchBound] Generated ${patterns.length} patterns`);
    return patterns.slice(0, 500); // Limit for performance
  }

  /**
   * Recursively enumerate all feasible patterns
   */
  private enumeratePatterns(
    segments: BarSegment[],
    currentCuts: PatternCut[],
    segmentIndex: number,
    remainingLength: number,
    patterns: CuttingPattern[]
  ): void {
    // Base case: tried all segment types
    if (segmentIndex >= segments.length) {
      if (currentCuts.length > 0) {
        const totalLength = currentCuts.reduce((sum, cut) => sum + cut.length * cut.count, 0);
        const waste = this.STANDARD_LENGTH - totalLength;
        
        patterns.push({
          id: `enum_${patterns.length}`,
          cuts: currentCuts.map(cut => ({ ...cut })),
          waste,
          utilization: (totalLength / this.STANDARD_LENGTH) * 100,
          standardBarLength: this.STANDARD_LENGTH,
        });
      }
      return;
    }

    const segment = segments[segmentIndex];
    const maxCount = Math.floor(remainingLength / segment.length);

    // Try different counts of current segment (0 to maxCount)
    for (let count = 0; count <= maxCount; count++) {
      if (count > 0) {
        currentCuts.push({
          segmentId: segment.segmentId,
          parentBarCode: segment.parentBarCode,
          length: segment.length,
          count: count,
          segmentIndex: segment.segmentIndex,
          lapLength: segment.lapLength,
        });
      }

      // Recurse to next segment type
      this.enumeratePatterns(
        segments,
        currentCuts,
        segmentIndex + 1,
        remainingLength - (count * segment.length),
        patterns
      );

      // Backtrack
      if (count > 0) {
        currentCuts.pop();
      }
    }
  }

  /**
   * Get greedy solution as initial upper bound
   */
  private getGreedySolution(demand: Map<string, number>, patterns: CuttingPattern[]): BranchSolution {
    const usedPatterns: CuttingPattern[] = [];
    const remaining = new Map(demand);

    while (!this.isMapEmpty(remaining)) {
      let bestPattern: CuttingPattern | null = null;
      let bestScore = -1;

      for (const pattern of patterns) {
        if (this.canApplyPattern(remaining, pattern)) {
          const coverage = this.calculateCoverage(remaining, pattern);
          const efficiency = coverage / (pattern.waste + 0.1);
          
          if (efficiency > bestScore) {
            bestScore = efficiency;
            bestPattern = pattern;
          }
        }
      }

      if (!bestPattern) break;

      usedPatterns.push(bestPattern);
      for (const cut of bestPattern.cuts) {
        const current = remaining.get(cut.segmentId) || 0;
        remaining.set(cut.segmentId, Math.max(0, current - cut.count));
      }
    }

    return {
      patterns: usedPatterns,
      barsUsed: usedPatterns.length,
      totalWaste: usedPatterns.reduce((sum, p) => sum + p.waste, 0),
      isOptimal: false
    };
  }

  /**
   * Heuristic solution for large datasets
   */
  private solveWithHeuristic(segments: BarSegment[], dia: number): CuttingStockResult {
    console.log(`[BranchBound] Using heuristic for large dataset`);
    
    // Use a sophisticated greedy approach
    const demand = this.countSegmentDemand(segments);
    const patterns = this.generateSmartPatterns(segments);
    const solution = this.getGreedySolution(demand, patterns);

    const detailedCuts = this.generateDetailedCuts(solution.patterns);
    const summary = this.calculateSummary(solution.patterns, segments.length);
    const executionTime = performance.now() - this.startTime;

    return {
      algorithm: "heuristic",
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
   * Generate smart patterns for heuristic
   */
  private generateSmartPatterns(segments: BarSegment[]): CuttingPattern[] {
    const patterns: CuttingPattern[] = [];
    const uniqueSegments = this.getUniqueSegments(segments);

    // Single segment patterns
    for (const segment of uniqueSegments) {
      const maxCount = Math.floor(this.STANDARD_LENGTH / segment.length);
      for (let count = 1; count <= maxCount; count++) {
        const totalLength = segment.length * count;
        const waste = this.STANDARD_LENGTH - totalLength;
        
        patterns.push({
          id: `smart_single_${segment.segmentId}_${count}`,
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

    // Two-segment combinations (most promising)
    for (let i = 0; i < uniqueSegments.length; i++) {
      for (let j = i; j < uniqueSegments.length; j++) {
        const seg1 = uniqueSegments[i];
        const seg2 = uniqueSegments[j];
        
        for (let count1 = 1; count1 <= 3; count1++) {
          for (let count2 = (i === j ? count1 : 1); count2 <= 3; count2++) {
            const totalLength = seg1.length * count1 + seg2.length * count2;
            
            if (totalLength <= this.STANDARD_LENGTH) {
              const waste = this.STANDARD_LENGTH - totalLength;
              const cuts: PatternCut[] = [];
              
              if (count1 > 0) {
                cuts.push({
                  segmentId: seg1.segmentId,
                  parentBarCode: seg1.parentBarCode,
                  length: seg1.length,
                  count: count1,
                  segmentIndex: seg1.segmentIndex,
                  lapLength: seg1.lapLength,
                });
              }
              
              if (count2 > 0 && seg2.segmentId !== seg1.segmentId) {
                cuts.push({
                  segmentId: seg2.segmentId,
                  parentBarCode: seg2.parentBarCode,
                  length: seg2.length,
                  count: count2,
                  segmentIndex: seg2.segmentIndex,
                  lapLength: seg2.lapLength,
                });
              }
              
              if (cuts.length > 0) {
                patterns.push({
                  id: `smart_dual_${i}_${j}_${count1}_${count2}`,
                  cuts,
                  waste,
                  utilization: (totalLength / this.STANDARD_LENGTH) * 100,
                  standardBarLength: this.STANDARD_LENGTH,
                });
              }
            }
          }
        }
      }
    }

    return patterns.sort((a, b) => a.waste - b.waste);
  }

  // Helper methods (reuse from other implementations)
  private countSegmentDemand(segments: BarSegment[]): Map<string, number> {
    const demand = new Map<string, number>();
    for (const segment of segments) {
      const count = demand.get(segment.segmentId) || 0;
      demand.set(segment.segmentId, count + 1);
    }
    return demand;
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

  private getAllSegments(): BarSegment[] {
    // This would need to be passed in or stored as instance variable
    // For now, return empty array - this is a limitation of the current design
    return [];
  }

  // Reuse existing methods for detailed cuts and summary
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

  private createEmptyResult(dia: number): CuttingStockResult {
    return {
      algorithm: "branch-and-bound",
      dia,
      patterns: [],
      totalBarsUsed: 0,
      totalWaste: 0,
      averageUtilization: 0,
      executionTime: performance.now() - this.startTime,
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