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

interface Bin {
  segments: BarSegment[];
  remaining: number;
  id: string;
}

/**
 * Chunked Optimization Algorithm
 * 
 * Strategy:
 * 1. Divide segments into chunks of increasing sizes (100, 150, 200)
 * 2. Optimize each chunk using Best Fit Decreasing
 * 3. Collect "waste bins" (bins with significant remaining space)
 * 4. Try to merge waste bins across chunks
 * 5. Re-optimize merged results
 * 
 * This can find better solutions than single-pass algorithms because
 * it allows cross-chunk optimization opportunities.
 */
export class ChunkedOptimization {
  private readonly STANDARD_LENGTH = 12.0;
  private readonly WASTE_THRESHOLD = 1.0; // Bins with >1m remaining are candidates for merging
  private preprocessor = new CuttingStockPreprocessor();

  solve(
    requests: MultiBarCuttingRequest[], 
    dia: number, 
    _wastePieces?: WastePiece[],
    onProgress?: (stage: string, percentage: number) => void
  ): CuttingStockResult {
    const startTime = performance.now();
    console.log(`[Chunked] Starting optimization for dia ${dia}`);
    onProgress?.("Preprocessing data...", 5);

    // Filter by diameter
    const diaRequests = this.preprocessor.filterByDia(requests, dia);
    if (diaRequests.length === 0) {
      return this.createEmptyResult(dia, startTime);
    }

    // Extract all segments
    const allSegments = this.preprocessor.extractAllSegments(diaRequests);
    console.log(`[Chunked] Total segments: ${allSegments.length}`);

    // Sort by length descending
    const sortedSegments = [...allSegments].sort((a, b) => b.length - a.length);

    onProgress?.("Running chunked optimization...", 10);

    // Try different chunk sizes and keep the best result
    const chunkSizes = this.getChunkSizes(sortedSegments.length);
    console.log(`[Chunked] Will try chunk sizes: ${chunkSizes.join(", ")}`);

    let bestBins: Bin[] | null = null;
    let bestBinCount = Infinity;

    for (let i = 0; i < chunkSizes.length; i++) {
      const chunkSize = chunkSizes[i];
      const progress = 10 + (i / chunkSizes.length) * 60;
      onProgress?.(`Optimizing with chunk size ${chunkSize}...`, progress);

      const bins = this.optimizeWithChunkSize(sortedSegments, chunkSize);
      console.log(`[Chunked] Chunk size ${chunkSize}: ${bins.length} bins`);

      if (bins.length < bestBinCount) {
        bestBinCount = bins.length;
        bestBins = bins;
      }
    }

    // Final optimization pass - try to merge bins with waste
    onProgress?.("Merging and optimizing waste...", 75);
    if (bestBins) {
      bestBins = this.mergeWasteBins(bestBins);
      console.log(`[Chunked] After merge optimization: ${bestBins.length} bins`);
    }

    // Second merge pass for any remaining opportunities
    onProgress?.("Final optimization pass...", 85);
    if (bestBins) {
      bestBins = this.finalOptimizationPass(bestBins);
      console.log(`[Chunked] After final pass: ${bestBins.length} bins`);
    }

    onProgress?.("Generating results...", 95);

    // Convert to patterns
    const patterns = this.binsToPatterns(bestBins || []);
    const detailedCuts = this.generateDetailedCuts(patterns);
    const summary = this.calculateSummary(patterns, allSegments.length);

    const executionTime = performance.now() - startTime;
    console.log(`[Chunked] Complete in ${executionTime.toFixed(2)}ms, ${bestBins?.length || 0} bars`);

    onProgress?.("Complete", 100);

    return {
      algorithm: "chunked",
      dia,
      patterns,
      totalBarsUsed: bestBins?.length || 0,
      totalWaste: summary.totalWasteLength,
      averageUtilization: summary.averageUtilization,
      executionTime,
      summary,
      detailedCuts,
    };
  }

  /**
   * Determine chunk sizes based on total segment count
   */
  private getChunkSizes(totalSegments: number): number[] {
    if (totalSegments <= 100) {
      return [totalSegments]; // Small dataset, process all at once
    } else if (totalSegments <= 500) {
      return [50, 100, 150];
    } else if (totalSegments <= 2000) {
      return [100, 200, 300, 500];
    } else {
      return [200, 400, 600, 1000];
    }
  }

  /**
   * Optimize using a specific chunk size
   */
  private optimizeWithChunkSize(segments: BarSegment[], chunkSize: number): Bin[] {
    const allBins: Bin[] = [];
    
    // Process in chunks
    for (let i = 0; i < segments.length; i += chunkSize) {
      const chunk = segments.slice(i, i + chunkSize);
      const chunkBins = this.bestFitDecreasing(chunk, allBins);
      
      // Add new bins from this chunk
      for (const bin of chunkBins) {
        if (!allBins.includes(bin)) {
          allBins.push(bin);
        }
      }
    }

    return allBins;
  }

  /**
   * Best Fit Decreasing algorithm
   * Can optionally use existing bins
   */
  private bestFitDecreasing(segments: BarSegment[], existingBins: Bin[] = []): Bin[] {
    const bins = [...existingBins];

    for (const segment of segments) {
      let bestBinIndex = -1;
      let bestRemainingAfter = Infinity;

      // Find best fitting existing bin
      for (let i = 0; i < bins.length; i++) {
        const remainingAfter = bins[i].remaining - segment.length;
        if (remainingAfter >= 0 && remainingAfter < bestRemainingAfter) {
          bestBinIndex = i;
          bestRemainingAfter = remainingAfter;
        }
      }

      if (bestBinIndex >= 0) {
        bins[bestBinIndex].segments.push(segment);
        bins[bestBinIndex].remaining -= segment.length;
      } else {
        bins.push({
          segments: [segment],
          remaining: this.STANDARD_LENGTH - segment.length,
          id: `bin_${bins.length + 1}`,
        });
      }
    }

    return bins;
  }

  /**
   * Merge bins with significant waste
   * Try to combine segments from multiple "wasteful" bins into fewer bins
   */
  private mergeWasteBins(bins: Bin[]): Bin[] {
    // Separate bins into "full" (low waste) and "wasteful" (high waste)
    const fullBins: Bin[] = [];
    const wastefulBins: Bin[] = [];

    for (const bin of bins) {
      if (bin.remaining > this.WASTE_THRESHOLD) {
        wastefulBins.push(bin);
      } else {
        fullBins.push(bin);
      }
    }

    if (wastefulBins.length <= 1) {
      return bins; // Nothing to merge
    }

    console.log(`[Chunked] Found ${wastefulBins.length} wasteful bins to merge`);

    // Extract all segments from wasteful bins
    const wasteSegments: BarSegment[] = [];
    for (const bin of wastefulBins) {
      wasteSegments.push(...bin.segments);
    }

    // Sort by length descending
    wasteSegments.sort((a, b) => b.length - a.length);

    // Re-optimize these segments
    const reoptimizedBins = this.bestFitDecreasing(wasteSegments);

    console.log(`[Chunked] Merged ${wastefulBins.length} wasteful bins into ${reoptimizedBins.length} bins`);

    return [...fullBins, ...reoptimizedBins];
  }

  /**
   * Final optimization pass
   * Look for any remaining merge opportunities
   */
  private finalOptimizationPass(bins: Bin[]): Bin[] {
    // Sort bins by remaining space (most waste first)
    const sortedBins = [...bins].sort((a, b) => b.remaining - a.remaining);

    // Try to move segments from high-waste bins to fill low-waste bins
    for (let i = 0; i < sortedBins.length; i++) {
      const sourceBin = sortedBins[i];
      if (sourceBin.remaining < 0.5) continue; // Skip bins with little waste

      // Try to move each segment to a better bin
      for (let segIdx = sourceBin.segments.length - 1; segIdx >= 0; segIdx--) {
        const segment = sourceBin.segments[segIdx];

        // Find a bin where this segment fits better
        for (let j = i + 1; j < sortedBins.length; j++) {
          const targetBin = sortedBins[j];
          if (targetBin.remaining >= segment.length) {
            // Move segment
            sourceBin.segments.splice(segIdx, 1);
            sourceBin.remaining += segment.length;
            targetBin.segments.push(segment);
            targetBin.remaining -= segment.length;
            break;
          }
        }
      }
    }

    // Remove empty bins
    return sortedBins.filter(bin => bin.segments.length > 0);
  }

  /**
   * Convert bins to cutting patterns
   */
  private binsToPatterns(bins: Bin[]): CuttingPattern[] {
    return bins.map((bin, index) => {
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
        id: `chunked_pattern_${index + 1}`,
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
      algorithm: "chunked",
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
