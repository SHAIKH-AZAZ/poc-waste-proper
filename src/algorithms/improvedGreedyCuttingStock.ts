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

interface Bin {
  id: string;
  cuts: PatternCut[];
  usedLength: number;
  remainingLength: number;
}

export class ImprovedGreedyCuttingStock {
  private readonly STANDARD_LENGTH = 12.0;
  private preprocessor = new CuttingStockPreprocessor();

  solve(requests: MultiBarCuttingRequest[], dia: number): CuttingStockResult {
    const startTime = performance.now();

    // Filter by diameter
    const diaRequests = this.preprocessor.filterByDia(requests, dia);

    if (diaRequests.length === 0) {
      return this.createEmptyResult(dia, startTime);
    }

    // Extract segments with unique identifiers
    const allSegments = this.preprocessor.extractAllSegmentsForGreedy(diaRequests);

    // Apply Smart Greedy algorithm with look-ahead
    const bins = this.smartGreedyWithLookAhead(allSegments);

    // Convert bins to patterns
    const patterns = this.binsToPatterns(bins);

    // Generate detailed cuts
    const detailedCuts = this.generateDetailedCuts(patterns);

    // Calculate summary
    const summary = this.calculateSummary(patterns, allSegments.length);

    const executionTime = performance.now() - startTime;

    return {
      algorithm: "improved-greedy",
      dia,
      patterns,
      totalBarsUsed: bins.length,
      totalWaste: summary.totalWasteLength,
      averageUtilization: summary.averageUtilization,
      executionTime,
      summary,
      detailedCuts,
    };
  }

  /**
   * Smart Greedy algorithm with look-ahead for optimal combinations
   * Solves the 6m+4m+2m waste problem by finding perfect combinations first
   */
  private smartGreedyWithLookAhead(segments: BarSegment[]): Bin[] {
    const bins: Bin[] = [];

    // Group segments by length for smarter allocation
    const segmentGroups = this.groupSegmentsByLength(segments);
    
    console.log(`[ImprovedGreedy] Processing ${segments.length} segments in ${segmentGroups.size} length groups`);

    while (this.hasRemainingSegments(segmentGroups)) {
      const newBin = this.createNewBin();
      
      // Try to find optimal combinations that minimize waste
      if (this.tryOptimalCombinations(newBin, segmentGroups)) {
        bins.push(newBin);
      } else {
        // Fallback to best fit if no optimal combination found
        if (this.tryBestFitCombination(newBin, segmentGroups)) {
          bins.push(newBin);
        } else {
          break; // No more segments can be placed
        }
      }
    }

    return bins;
  }

  /**
   * Group segments by length, handling multi-bar constraints
   */
  private groupSegmentsByLength(segments: BarSegment[]): Map<number, BarSegment[]> {
    const groups = new Map<number, BarSegment[]>();

    for (const segment of segments) {
      const length = Math.round(segment.length * 1000) / 1000; // Round to 3 decimal places
      
      if (!groups.has(length)) {
        groups.set(length, []);
      }
      groups.get(length)!.push(segment);
    }

    return groups;
  }

  /**
   * Try optimal combinations that result in zero or minimal waste
   * This is the key method that solves the 6m+4m+2m problem
   */
  private tryOptimalCombinations(bin: Bin, segmentGroups: Map<number, BarSegment[]>): boolean {
    const lengths = Array.from(segmentGroups.keys()).sort((a, b) => b - a);
    
    // Try perfect fit combinations first (sum = 12.0m exactly)
    
    // Try 3-segment combinations (like 6+4+2=12)
    for (let i = 0; i < lengths.length; i++) {
      const len1 = lengths[i];
      const group1 = segmentGroups.get(len1)!;
      if (group1.length === 0) continue;

      for (let j = i; j < lengths.length; j++) {
        const len2 = lengths[j];
        const group2 = segmentGroups.get(len2)!;
        const needed2 = (i === j) ? 2 : 1;
        if (group2.length < needed2) continue;

        for (let k = j; k < lengths.length; k++) {
          const len3 = lengths[k];
          const group3 = segmentGroups.get(len3)!;
          const needed3 = (i === k ? 1 : 0) + (j === k ? 1 : 0) + 1;
          if (group3.length < needed3) continue;

          const totalLength = len1 + len2 + len3;
          
          // Perfect fit found!
          if (Math.abs(totalLength - this.STANDARD_LENGTH) < 0.01) {
            if (this.canAddCombination(bin, [group1[0], group2[0], group3[0]])) {
              this.addSegmentToBin(bin, group1, segmentGroups);
              this.addSegmentToBin(bin, group2, segmentGroups);
              this.addSegmentToBin(bin, group3, segmentGroups);
              return true;
            }
          }
        }
      }
    }

    // Try 2-segment combinations
    for (let i = 0; i < lengths.length; i++) {
      const len1 = lengths[i];
      const group1 = segmentGroups.get(len1)!;
      if (group1.length === 0) continue;

      for (let j = i; j < lengths.length; j++) {
        const len2 = lengths[j];
        const group2 = segmentGroups.get(len2)!;
        const needed2 = (i === j) ? 2 : 1;
        if (group2.length < needed2) continue;

        const totalLength = len1 + len2;
        
        if (Math.abs(totalLength - this.STANDARD_LENGTH) < 0.01) {
          if (this.canAddCombination(bin, [group1[0], group2[0]])) {
            this.addSegmentToBin(bin, group1, segmentGroups);
            this.addSegmentToBin(bin, group2, segmentGroups);
            return true;
          }
        }
      }
    }

    // Try 4-segment combinations (for smaller pieces)
    for (let i = 0; i < lengths.length; i++) {
      const len1 = lengths[i];
      const group1 = segmentGroups.get(len1)!;
      if (group1.length === 0 || len1 > 6) continue; // Only for smaller segments

      for (let j = i; j < lengths.length; j++) {
        const len2 = lengths[j];
        const group2 = segmentGroups.get(len2)!;
        const needed2 = (i === j) ? 2 : 1;
        if (group2.length < needed2) continue;

        for (let k = j; k < lengths.length; k++) {
          const len3 = lengths[k];
          const group3 = segmentGroups.get(len3)!;
          const needed3 = (i === k ? 1 : 0) + (j === k ? 1 : 0) + 1;
          if (group3.length < needed3) continue;

          for (let l = k; l < lengths.length; l++) {
            const len4 = lengths[l];
            const group4 = segmentGroups.get(len4)!;
            const needed4 = (i === l ? 1 : 0) + (j === l ? 1 : 0) + (k === l ? 1 : 0) + 1;
            if (group4.length < needed4) continue;

            const totalLength = len1 + len2 + len3 + len4;
            
            if (Math.abs(totalLength - this.STANDARD_LENGTH) < 0.01) {
              if (this.canAddCombination(bin, [group1[0], group2[0], group3[0], group4[0]])) {
                this.addSegmentToBin(bin, group1, segmentGroups);
                this.addSegmentToBin(bin, group2, segmentGroups);
                this.addSegmentToBin(bin, group3, segmentGroups);
                this.addSegmentToBin(bin, group4, segmentGroups);
                return true;
              }
            }
          }
        }
      }
    }

    return false; // No optimal combination found
  }

  /**
   * Check if a combination of segments can be added (multi-bar constraint)
   */
  private canAddCombination(bin: Bin, segments: BarSegment[]): boolean {
    for (const segment of segments) {
      if (!this.canAddSegmentToBin(bin, segment)) {
        return false;
      }
    }
    return true;
  }

  /**
   * Try best fit combination when no optimal combination is available
   */
  private tryBestFitCombination(bin: Bin, segmentGroups: Map<number, BarSegment[]>): boolean {
    const lengths = Array.from(segmentGroups.keys()).sort((a, b) => b - a);
    
    // Find the largest segment that fits
    for (const length of lengths) {
      const group = segmentGroups.get(length)!;
      
      if (group.length > 0 && length <= bin.remainingLength) {
        if (this.canAddSegmentToBin(bin, group[0])) {
          this.addSegmentToBin(bin, group, segmentGroups);
          
          // Try to fill remaining space with smaller segments
          this.fillRemainingSpace(bin, segmentGroups);
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Fill remaining space in bin with smaller segments
   */
  private fillRemainingSpace(bin: Bin, segmentGroups: Map<number, BarSegment[]>): void {
    const lengths = Array.from(segmentGroups.keys()).sort((a, b) => a - b); // Ascending for filling
    
    for (const length of lengths) {
      const group = segmentGroups.get(length)!;
      
      while (group.length > 0 && length <= bin.remainingLength - 0.01) {
        if (!this.canAddSegmentToBin(bin, group[0])) {
          break; // Multi-bar constraint prevents adding
        }
        this.addSegmentToBin(bin, group, segmentGroups);
      }
    }
  }

  /**
   * Check if segment can be added to bin (considering multi-bar constraints)
   */
  private canAddSegmentToBin(bin: Bin, segment: BarSegment): boolean {
    // Check space
    if (bin.remainingLength < segment.length + 0.01) {
      return false;
    }

    // Check multi-bar constraint
    const hasSameParentInstance = bin.cuts.some(
      (cut) => cut.parentBarCode === segment.parentBarCode
    );
    
    return !hasSameParentInstance;
  }

  /**
   * Add segment to bin and update tracking
   */
  private addSegmentToBin(bin: Bin, group: BarSegment[], segmentGroups: Map<number, BarSegment[]>): void {
    const segment = group.pop()!;
    
    bin.cuts.push({
      segmentId: segment.segmentId,
      parentBarCode: segment.parentBarCode,
      length: segment.length,
      count: 1,
      segmentIndex: segment.segmentIndex,
      lapLength: segment.lapLength,
    });

    bin.usedLength += segment.length;
    bin.remainingLength = this.STANDARD_LENGTH - bin.usedLength;

    // Clean up empty groups
    if (group.length === 0) {
      segmentGroups.delete(segment.length);
    }
  }

  /**
   * Check if there are remaining segments to process
   */
  private hasRemainingSegments(segmentGroups: Map<number, BarSegment[]>): boolean {
    for (const group of segmentGroups.values()) {
      if (group.length > 0) {
        return true;
      }
    }
    return false;
  }

  /**
   * Create new empty bin
   */
  private createNewBin(): Bin {
    return {
      id: `bin_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      cuts: [],
      usedLength: 0,
      remainingLength: this.STANDARD_LENGTH,
    };
  }

  /**
   * Convert bins to cutting patterns
   */
  private binsToPatterns(bins: Bin[]): CuttingPattern[] {
    return bins.map((bin, index) => ({
      id: `pattern_${index + 1}`,
      cuts: bin.cuts,
      waste: bin.remainingLength,
      utilization: (bin.usedLength / this.STANDARD_LENGTH) * 100,
      standardBarLength: this.STANDARD_LENGTH,
    }));
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
          const hasLap = cut.lapLength > 0;
          
          cuts.push({
            barCode: cut.parentBarCode.replace(/_instance_\d+$/, ''),
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

  /**
   * Calculate summary statistics
   */
  private calculateSummary(patterns: CuttingPattern[], totalCuts: number) {
    const totalBars = patterns.length;
    const totalWaste = patterns.reduce((sum, p) => sum + p.waste, 0);
    const avgUtilization =
      totalBars > 0 ? patterns.reduce((sum, p) => sum + p.utilization, 0) / totalBars : 0;

    return {
      totalStandardBars: totalBars,
      newBarsUsed: totalBars,                          // All bars are new (no waste reuse in greedy)
      wastePiecesReused: 0,                           // Greedy doesn't reuse waste
      totalWasteLength: Math.round(totalWaste * 1000) / 1000,
      wasteFromNewBars: Math.round(totalWaste * 1000) / 1000,  // All waste is from new bars
      wasteFromReusedPieces: 0,                       // No reused pieces
      totalWastePercentage:
        totalBars > 0
          ? Math.round((totalWaste / (totalBars * this.STANDARD_LENGTH)) * 10000) / 100
          : 0,
      averageUtilization: Math.round(avgUtilization * 100) / 100,
      patternCount: patterns.length,
      totalCutsProduced: totalCuts,
    };
  }

  /**
   * Create empty result for no data
   */
  private createEmptyResult(dia: number, startTime: number): CuttingStockResult {
    return {
      algorithm: "improved-greedy",
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