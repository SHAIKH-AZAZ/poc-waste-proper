import type {
  MultiBarCuttingRequest,
  BarSegment,
  CuttingStockResult,
  CuttingPattern,
  PatternCut,
  DetailedCut,
  CutInstruction,
  WastePiece,
} from "@/types/CuttingStock";
import { CuttingStockPreprocessor } from "@/utils/cuttingStockPreprocessor";

/**
 * Dynamic Cutting Stock Algorithm
 * Uses Best Fit Decreasing (BFD) approach - places each segment in the bin
 * that will have the least remaining space after placement.
 * This typically produces better results than First Fit Decreasing (FFD).
 */
export class DynamicCuttingStock {
  private readonly STANDARD_LENGTH = 12.0;
  private preprocessor = new CuttingStockPreprocessor();

  solve(requests: MultiBarCuttingRequest[], dia: number, _wastePieces?: WastePiece[]): CuttingStockResult {
    const startTime = performance.now();
    console.log(`[Dynamic] Starting BFD solve for dia ${dia} with ${requests.length} requests`);

    // Filter by diameter
    const diaRequests = this.preprocessor.filterByDia(requests, dia);
    console.log(`[Dynamic] Filtered to ${diaRequests.length} requests for dia ${dia}`);

    if (diaRequests.length === 0) {
      return this.createEmptyResult(dia, startTime);
    }

    // Extract all segments
    const allSegments = this.preprocessor.extractAllSegments(diaRequests);
    console.log(`[Dynamic] Extracted ${allSegments.length} segments`);

    // Sort segments by length descending (largest first)
    const sortedSegments = [...allSegments].sort((a, b) => b.length - a.length);

    // Best Fit Decreasing algorithm
    const bins: { segments: BarSegment[]; remaining: number }[] = [];

    for (const segment of sortedSegments) {
      // Find the bin with the least remaining space that can still fit this segment
      let bestBinIndex = -1;
      let bestRemainingAfter = Infinity;

      for (let i = 0; i < bins.length; i++) {
        const remainingAfter = bins[i].remaining - segment.length;
        if (remainingAfter >= 0 && remainingAfter < bestRemainingAfter) {
          bestBinIndex = i;
          bestRemainingAfter = remainingAfter;
        }
      }

      if (bestBinIndex >= 0) {
        // Place in best fitting bin
        bins[bestBinIndex].segments.push(segment);
        bins[bestBinIndex].remaining -= segment.length;
      } else {
        // Create new bin
        bins.push({
          segments: [segment],
          remaining: this.STANDARD_LENGTH - segment.length,
        });
      }
    }

    console.log(`[Dynamic] BFD created ${bins.length} bins`);

    // Convert bins to patterns
    const patterns = this.binsToPatterns(bins);

    // Generate detailed cuts
    const detailedCuts = this.generateDetailedCuts(patterns);

    // Calculate summary
    const summary = this.calculateSummary(patterns, allSegments.length);

    const executionTime = performance.now() - startTime;
    console.log(`[Dynamic] Complete in ${executionTime.toFixed(2)}ms, ${bins.length} bars used`);

    return {
      algorithm: "dynamic",
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
   * Convert bins to cutting patterns
   */
  private binsToPatterns(bins: { segments: BarSegment[]; remaining: number }[]): CuttingPattern[] {
    return bins.map((bin, index) => {
      // Group segments by segmentId for the pattern
      const cutMap = new Map<string, PatternCut>();

      for (const segment of bin.segments) {
        const existing = cutMap.get(segment.segmentId);
        if (existing) {
          existing.count++;
        } else {
          cutMap.set(segment.segmentId, {
            segmentId: segment.segmentId,
            parentBarCode: segment.parentBarCode,
            length: segment.length,
            count: 1,
            segmentIndex: segment.segmentIndex,
            lapLength: segment.lapLength,
          });
        }
      }

      const usedLength = this.STANDARD_LENGTH - bin.remaining;
      
      return {
        id: `bfd_pattern_${index + 1}`,
        cuts: Array.from(cutMap.values()),
        waste: bin.remaining,
        utilization: (usedLength / this.STANDARD_LENGTH) * 100,
        standardBarLength: this.STANDARD_LENGTH,
      };
    });
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
          ? Math.round((totalWaste / (totalBars * this.STANDARD_LENGTH)) * 10000) / 100
          : 0,
      averageUtilization: Math.round(avgUtilization * 100) / 100,
      patternCount: patterns.length,
      totalCutsProduced: totalCuts,
    };
  }

  /**
   * Create empty result
   */
  private createEmptyResult(dia: number, startTime: number): CuttingStockResult {
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
