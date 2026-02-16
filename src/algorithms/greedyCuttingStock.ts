import type {
  MultiBarCuttingRequest,
  BarSegment,
  CuttingStockResult,
  CuttingPattern,
  PatternCut,
  DetailedCut,
  CutInstruction,
  WastePiece,
  WasteUsageRecord,
} from "@/types/CuttingStock";
import { CuttingStockPreprocessor } from "@/utils/cuttingStockPreprocessor";

interface Bin {
  id: string;
  cuts: PatternCut[];
  usedLength: number;
  remainingLength: number;
  totalLength: number;          // Total length of this bin (12m for new, variable for waste)
  isWastePiece?: boolean;       // True if this bin is from waste inventory
  wasteSourceInfo?: {           // Info about the waste piece used
    wasteId: string;
    sourceSheetId: number;
    sourceSheetNumber?: number;
    sourceBarNumber: number;
    originalLength: number;
  };
}

export class GreedyCuttingStock {
  private readonly STANDARD_LENGTH = 12.0;
  private preprocessor = new CuttingStockPreprocessor();
  private wasteUsageRecords: WasteUsageRecord[] = [];

  solve(requests: MultiBarCuttingRequest[], dia: number, wastePieces?: WastePiece[]): CuttingStockResult {
    const startTime = performance.now();
    this.wasteUsageRecords = [];

    // Filter by diameter
    const diaRequests = this.preprocessor.filterByDia(requests, dia);

    if (diaRequests.length === 0) {
      return this.createEmptyResult(dia, startTime);
    }

    // Extract and sort segments with unique identifiers for greedy algorithm
    const allSegments = this.preprocessor.extractAllSegmentsForGreedy(diaRequests);
    const sortedSegments = this.preprocessor.sortSegmentsByLength(allSegments);

    // Apply First Fit Decreasing algorithm with waste reuse
    const bins = this.firstFitDecreasingWithWaste(sortedSegments, wastePieces);

    // Count new bars vs waste pieces used
    const newBarsUsed = bins.filter(b => !b.isWastePiece).length;
    const wastePiecesUsed = bins.filter(b => b.isWastePiece).length;

    console.log(`[Greedy] Used ${newBarsUsed} new bars + ${wastePiecesUsed} waste pieces = ${bins.length} total`);

    // Convert bins to patterns
    const patterns = this.binsToPatterns(bins);

    // Generate detailed cuts
    const detailedCuts = this.generateDetailedCuts(patterns, bins);

    // Calculate summary
    const summary = this.calculateSummary(patterns, allSegments.length, newBarsUsed, wastePiecesUsed);

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
   * First Fit Decreasing bin packing algorithm with waste reuse
   * Priority: 1) Existing bins, 2) Waste pieces, 3) New 12m bars
   */
  private firstFitDecreasingWithWaste(segments: BarSegment[], wastePieces?: WastePiece[]): Bin[] {
    const bins: Bin[] = [];

    // Create bins from available waste pieces (sorted by length descending for better fit)
    const availableWasteBins: Bin[] = [];
    if (wastePieces && wastePieces.length > 0) {
      const sortedWaste = [...wastePieces].sort((a, b) => b.length - a.length);
      for (const waste of sortedWaste) {
        availableWasteBins.push(this.createWasteBin(waste));
      }
      console.log(`[Greedy] Created ${availableWasteBins.length} waste bins from inventory`);
    }

    for (const segment of segments) {
      let placed = false;

      // 1. Try to place in existing active bins (First Fit)
      for (const bin of bins) {
        if (this.canPlaceInBin(bin, segment)) {
          this.placeInBin(bin, segment);
          placed = true;
          break;
        }
      }

      // 2. Try to place in available waste bins (prioritize waste reuse)
      if (!placed) {
        for (let i = 0; i < availableWasteBins.length; i++) {
          const wasteBin = availableWasteBins[i];
          if (this.canPlaceInBin(wasteBin, segment)) {
            this.placeInBin(wasteBin, segment);
            // Move waste bin to active bins
            bins.push(wasteBin);
            availableWasteBins.splice(i, 1);
            placed = true;
            console.log(`[Greedy] Placed segment in waste piece (${wasteBin.wasteSourceInfo?.originalLength}mm from sheet ${wasteBin.wasteSourceInfo?.sourceSheetId})`);
            break;
          }
        }
      }

      // 3. Create new 12m bar if needed
      if (!placed) {
        const newBin = this.createNewBin();
        this.placeInBin(newBin, segment);
        bins.push(newBin);
      }
    }

    return bins;
  }

  /**
   * First Fit Decreasing bin packing algorithm (legacy, no waste)
   */
  private firstFitDecreasing(segments: BarSegment[]): Bin[] {
    return this.firstFitDecreasingWithWaste(segments, undefined);
  }

  /**
   * Check if segment can fit in bin
   * Constraint: Only multi-bar segments (requiring lap joints) from the same
   * parent bar cannot be in the same bin — they need separate bars for joining.
   * Regular segments with the same parentBarCode CAN share a bin.
   */
  private canPlaceInBin(bin: Bin, segment: BarSegment): boolean {
    // Use cutting length (which includes lap) for space calculation
    const requiredSpace = segment.length;

    // Check if there's enough space (allow exact fits)
    if (bin.remainingLength < requiredSpace) {
      return false;
    }

    // Same-parent constraint only applies to multi-bar segments
    if (segment.isFromMultiBar) {
      const hasSameParent = bin.cuts.some(
        (cut) => cut.parentBarCode === segment.parentBarCode
      );
      if (hasSameParent) return false;
    }

    return true;
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
        lapLength: segment.lapLength, // Pass through actual lap length
      });
    }

    // Use cutting length (which includes lap) for space tracking
    bin.usedLength += segment.length;
    // Use the bin's actual total length (not always 12m for waste pieces)
    bin.remainingLength = bin.totalLength - bin.usedLength;
  }

  /**
   * Create new empty bin (12m standard bar)
   */
  private createNewBin(): Bin {
    return {
      id: `bin_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      cuts: [],
      usedLength: 0,
      remainingLength: this.STANDARD_LENGTH,
      totalLength: this.STANDARD_LENGTH,
      isWastePiece: false,
    };
  }

  /**
   * Create bin from waste piece
   */
  private createWasteBin(waste: WastePiece): Bin {
    const lengthInMeters = waste.length / 1000; // Convert mm to meters
    return {
      id: `waste_${waste.id}_${Date.now()}`,
      cuts: [],
      usedLength: 0,
      remainingLength: lengthInMeters,
      totalLength: lengthInMeters,  // Track actual waste piece length
      isWastePiece: true,
      wasteSourceInfo: {
        wasteId: waste.id,
        sourceSheetId: waste.sourceSheetId,
        sourceSheetNumber: waste.sourceSheetNumber,
        sourceBarNumber: waste.sourceBarNumber,
        originalLength: waste.length,
      },
    };
  }

  /**
   * Convert bins to cutting patterns
   */
  private binsToPatterns(bins: Bin[]): CuttingPattern[] {
    return bins.map((bin, index) => {
      const barLength = bin.isWastePiece && bin.wasteSourceInfo
        ? bin.wasteSourceInfo.originalLength / 1000
        : this.STANDARD_LENGTH;

      return {
        id: bin.isWastePiece ? `waste_pattern_${index + 1}` : `pattern_${index + 1}`,
        cuts: bin.cuts,
        waste: bin.remainingLength,
        utilization: (bin.usedLength / barLength) * 100,
        standardBarLength: barLength,
      };
    });
  }

  /**
   * Generate detailed cutting instructions
   */
  private generateDetailedCuts(patterns: CuttingPattern[], bins?: Bin[]): DetailedCut[] {
    return patterns.map((pattern, index) => {
      let currentPosition = 0;
      const cuts: CutInstruction[] = [];
      const bin = bins?.[index];

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

      const detailedCut: DetailedCut = {
        patternId: pattern.id,
        barNumber: index + 1,
        cuts,
        waste: pattern.waste,
        utilization: pattern.utilization,
        isFromWaste: bin?.isWastePiece ?? false,
        wasteSource: bin?.wasteSourceInfo,
      };

      return detailedCut;
    });
  }

  /**
   * Calculate summary statistics
   */
  private calculateSummary(patterns: CuttingPattern[], totalCuts: number, newBarsUsed?: number, wastePiecesUsed?: number) {
    const totalBars = patterns.length;
    const totalWaste = patterns.reduce((sum, p) => sum + p.waste, 0);
    const avgUtilization = totalBars > 0
      ? patterns.reduce((sum, p) => sum + p.utilization, 0) / totalBars
      : 0;

    // Calculate total material length (accounting for different bar lengths)
    const totalMaterialLength = patterns.reduce((sum, p) => sum + p.standardBarLength, 0);

    return {
      totalStandardBars: totalBars,
      newBarsUsed: newBarsUsed ?? totalBars,
      wastePiecesReused: wastePiecesUsed ?? 0,
      totalWasteLength: Math.round(totalWaste * 1000) / 1000,
      totalWastePercentage: totalMaterialLength > 0
        ? Math.round((totalWaste / totalMaterialLength) * 10000) / 100
        : 0,
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
