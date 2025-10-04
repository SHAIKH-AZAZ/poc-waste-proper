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

export class GreedyCuttingStock {
  private readonly STANDARD_LENGTH = 12.0;
  private preprocessor = new CuttingStockPreprocessor();

  solve(requests: MultiBarCuttingRequest[], dia: number): CuttingStockResult {
    const startTime = performance.now();

    // Filter by diameter
    const diaRequests = this.preprocessor.filterByDia(requests, dia);

    if (diaRequests.length === 0) {
      return this.createEmptyResult(dia, startTime);
    }

    // Extract and sort segments
    const allSegments = this.preprocessor.extractAllSegments(diaRequests);
    const sortedSegments = this.preprocessor.sortSegmentsByLength(allSegments);

    // Apply First Fit Decreasing algorithm
    const bins = this.firstFitDecreasing(sortedSegments);

    // Convert bins to patterns
    const patterns = this.binsToPatterns(bins);

    // Generate detailed cuts
    const detailedCuts = this.generateDetailedCuts(patterns);

    // Calculate summary
    const summary = this.calculateSummary(patterns, allSegments.length);

    const executionTime = performance.now() - startTime;

    return {
      algorithm: "greedy",
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
   * First Fit Decreasing bin packing algorithm
   */
  private firstFitDecreasing(segments: BarSegment[]): Bin[] {
    const bins: Bin[] = [];

    for (const segment of segments) {
      let placed = false;

      // Try to place in existing bins (First Fit)
      for (const bin of bins) {
        if (this.canPlaceInBin(bin, segment)) {
          this.placeInBin(bin, segment);
          placed = true;
          break;
        }
      }

      // Create new bin if needed
      if (!placed) {
        const newBin = this.createNewBin();
        this.placeInBin(newBin, segment);
        bins.push(newBin);
      }
    }

    return bins;
  }

  /**
   * Check if segment can fit in bin
   */
  private canPlaceInBin(bin: Bin, segment: BarSegment): boolean {
    const requiredSpace = segment.effectiveLength;
    const tolerance = 0.01; // 1cm tolerance for cutting precision
    return bin.remainingLength >= requiredSpace + tolerance;
  }

  /**
   * Place segment in bin
   */
  private placeInBin(bin: Bin, segment: BarSegment): void {
    // Check if this segment type already exists in bin
    const existingCut = bin.cuts.find(
      (cut) => cut.segmentId === segment.segmentId
    );

    if (existingCut) {
      existingCut.count++;
    } else {
      bin.cuts.push({
        segmentId: segment.segmentId,
        parentBarCode: segment.parentBarCode,
        length: segment.length,
        count: 1,
        segmentIndex: segment.segmentIndex,
      });
    }

    bin.usedLength += segment.effectiveLength;
    bin.remainingLength = this.STANDARD_LENGTH - bin.usedLength;
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
      patterns.reduce((sum, p) => sum + p.utilization, 0) / totalBars;

    return {
      totalStandardBars: totalBars,
      totalWasteLength: Math.round(totalWaste * 1000) / 1000,
      totalWastePercentage:
        Math.round((totalWaste / (totalBars * this.STANDARD_LENGTH)) * 10000) /
        100,
      averageUtilization: Math.round(avgUtilization * 100) / 100,
      patternCount: patterns.length,
      totalCutsProduced: totalCuts,
    };
  }

  /**
   * Create empty result for no data
   */
  private createEmptyResult(
    dia: number,
    startTime: number
  ): CuttingStockResult {
    return {
      algorithm: "greedy",
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
