import type {
  MultiBarCuttingRequest,
  BarSegment,
  CuttingStockResult,
  WastePiece,
} from "@/types/CuttingStock";
import { CuttingStockPreprocessor } from "@/utils/cuttingStockPreprocessor";
import type { Bin } from "./swap/types";
import { SwapScorer } from "./swap/SwapScorer";
import { BinManager } from "./swap/BinManager";
import { PatternConverter } from "./swap/PatternConverter";

/**
 * Swap Optimization Algorithm
 * 
 * Strategy:
 * 1. Start with a good initial solution (Best Fit Decreasing)
 * 2. Iteratively try swapping cuts between bars
 * 3. Accept swaps that reduce total waste or bar count
 * 4. Continue until no improvement found
 * 
 * Types of swaps:
 * - 1-1 swap: Move one cut from bar A to bar B
 * - 2-2 swap: Exchange two cuts between bars
 * - Consolidation: Combine segments from multiple bars into fewer bars
 */
export class SwapOptimization {
  private readonly STANDARD_LENGTH = 12.0;
  private readonly MAX_ITERATIONS_PHASE1 = 100; // Reduced from 1000
  private readonly MAX_ITERATIONS_PHASE3 = 50;  // Reduced from 500
  private readonly MAX_PASSES = 3; // Multi-pass optimization

  // Extracted utilities
  private preprocessor = new CuttingStockPreprocessor();
  private scorer = new SwapScorer();
  private binManager = new BinManager();
  private patternConverter = new PatternConverter();

  solve(
    requests: MultiBarCuttingRequest[],
    dia: number,
    wastePieces?: WastePiece[],
    onProgress?: (stage: string, percentage: number) => void
  ): CuttingStockResult {
    const startTime = performance.now();

    console.log(`[Swap] Starting swap optimization for dia ${dia}`);
    if (wastePieces && wastePieces.length > 0) {
      console.log(`[Swap] Received ${wastePieces.length} waste pieces for reuse:`);
      wastePieces.forEach((w, i) => {
        console.log(`  [${i}] ${w.length}mm from sheet ${w.sourceSheetId}, bar #${w.sourceBarNumber}`);
      });
    } else {
      console.log(`[Swap] No waste pieces provided - using new bars only`);
    }
    onProgress?.("Preprocessing data...", 5);

    // Filter by diameter
    const diaRequests = this.preprocessor.filterByDia(requests, dia);
    if (diaRequests.length === 0) {
      return this.patternConverter.createEmptyResult(dia, startTime);
    }

    // Extract all segments with unique identifiers (critical for same-parent constraint)
    const allSegments = this.preprocessor.extractAllSegmentsForGreedy(diaRequests);
    console.log(`[Swap] Total segments: ${allSegments.length}`);

    onProgress?.("Creating initial solution...", 10);

    // Create initial solution using Best Fit Decreasing with waste reuse
    const sortedSegments = [...allSegments].sort((a, b) => b.length - a.length);
    let bins = this.bestFitDecreasing(sortedSegments, wastePieces);

    const initialBinCount = bins.length;
    const initialWaste = this.scorer.calculateTotalWaste(bins);
    const initialWasteBins = bins.filter(b => b.isWastePiece).length;
    const initialNewBars = bins.filter(b => !b.isWastePiece).length;
    console.log(`[Swap] Initial solution: ${initialBinCount} bins (${initialNewBars} new + ${initialWasteBins} waste), ${initialWaste.toFixed(3)}m waste`);

    // Log bin distribution for debugging
    const binSegmentCounts = bins.map(b => b.segments.length).sort((a, b) => a - b);
    const singleSegmentBins = bins.filter(b => b.segments.length === 1).length;
    console.log(`[Swap] Bin segment distribution: min=${binSegmentCounts[0]}, max=${binSegmentCounts[binSegmentCounts.length - 1]}, single-segment bins=${singleSegmentBins}`);

    onProgress?.("Running swap optimization...", 20);

    // Multi-pass optimization: Run phases multiple times until no improvement
    let previousBinCount = bins.length;
    let pass = 0;

    while (pass < this.MAX_PASSES) {
      pass++;
      console.log(`[Swap] ========== PASS ${pass} ==========`);

      // Phase 1: 1-1 Swaps (move single cuts between bars)
      bins = this.oneToOneSwaps(bins, onProgress);
      console.log(`[Swap] After 1-1 swaps: ${bins.length} bins, ${this.scorer.calculateTotalWaste(bins).toFixed(3)}m waste`);

      onProgress?.("Consolidating bars...", 50);

      // Phase 2: Consolidation (try to empty bars by moving all cuts)
      bins = this.consolidateBars(bins, onProgress);
      console.log(`[Swap] After consolidation: ${bins.length} bins, ${this.scorer.calculateTotalWaste(bins).toFixed(3)}m waste`);

      onProgress?.("Running 2-way swaps...", 70);

      // Phase 3: 2-2 Swaps (exchange cuts between bars)
      bins = this.twoToTwoSwaps(bins, onProgress);
      console.log(`[Swap] After 2-2 swaps: ${bins.length} bins, ${this.scorer.calculateTotalWaste(bins).toFixed(3)}m waste`);

      // Check if we made progress
      if (bins.length >= previousBinCount) {
        console.log(`[Swap] No improvement in pass ${pass}, stopping`);
        break;
      }
      previousBinCount = bins.length;
    }

    onProgress?.("Final optimization...", 85);

    // Phase 4: Final cleanup - remove empty bins
    bins = bins.filter(bin => bin.segments.length > 0);

    const finalBinCount = bins.length;
    const finalWaste = this.scorer.calculateTotalWaste(bins);
    const finalWasteBins = bins.filter(b => b.isWastePiece).length;
    const finalNewBars = bins.filter(b => !b.isWastePiece).length;
    const improvement = initialBinCount - finalBinCount;

    // Calculate waste quality metrics
    const initialWasteQuality = this.scorer.calculateTotalWasteQuality(bins);
    const wasteOver2m = bins.filter(b => b.remaining >= 2.0).length;
    const wasteUnder1m = bins.filter(b => b.remaining < 1.0).length;

    console.log(`[Swap] Optimization complete:`);
    console.log(`  Initial: ${initialBinCount} bins (${initialNewBars} new + ${initialWasteBins} waste), ${initialWaste.toFixed(3)}m waste`);
    console.log(`  Final: ${finalBinCount} bins (${finalNewBars} new + ${finalWasteBins} waste), ${finalWaste.toFixed(3)}m waste`);
    console.log(`  Improvement: ${improvement} bars saved (${((improvement / initialBinCount) * 100).toFixed(2)}%)`);
    console.log(`  Waste Quality: ${wasteOver2m} bins with >=2m waste (reusable), ${wasteUnder1m} bins with <1m waste (unusable)`);

    onProgress?.("Generating results...", 95);

    // Convert to patterns
    const patterns = this.patternConverter.binsToPatterns(bins);
    const detailedCuts = this.patternConverter.generateDetailedCuts(patterns, bins);
    const summary = this.patternConverter.calculateSummary(patterns, allSegments.length, finalNewBars, finalWasteBins);

    const executionTime = performance.now() - startTime;
    console.log(`[Swap] Complete in ${executionTime.toFixed(2)}ms`);

    onProgress?.("Complete", 100);

    return {
      algorithm: "swap",
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
   * Best Fit Decreasing - initial solution with waste reuse
   * Priority: 1) Existing bins, 2) Waste pieces, 3) New 12m bars
   * Uses Best Fit strategy (tightest fit) instead of First Fit for better initial packing
   */
  private bestFitDecreasing(segments: BarSegment[], wastePieces?: WastePiece[]): Bin[] {
    const bins: Bin[] = [];

    // Create bins from available waste pieces (sorted by length descending for better fit)
    const availableWasteBins: Bin[] = [];
    if (wastePieces && wastePieces.length > 0) {
      const sortedWaste = [...wastePieces].sort((a, b) => b.length - a.length);
      for (const waste of sortedWaste) {
        availableWasteBins.push(this.binManager.createWasteBin(waste));
      }
      console.log(`[Swap] Created ${availableWasteBins.length} waste bins from inventory`);
    }

    for (const segment of segments) {
      let bestBinIndex = -1;
      let bestRemainingAfter = Infinity;
      let bestIsWaste = false;

      // 1. Try to place in existing active bins (Best Fit - tightest fit)
      for (let i = 0; i < bins.length; i++) {
        if (this.binManager.canPlaceInBin(bins[i], segment)) {
          const remainingAfter = bins[i].remaining - segment.length;
          // Prefer tighter fits (less remaining space)
          if (remainingAfter < bestRemainingAfter) {
            bestBinIndex = i;
            bestRemainingAfter = remainingAfter;
            bestIsWaste = false;
          }
        }
      }

      // 2. Also check waste bins for best fit
      for (let i = 0; i < availableWasteBins.length; i++) {
        const wasteBin = availableWasteBins[i];
        if (this.binManager.canPlaceInBin(wasteBin, segment)) {
          const remainingAfter = wasteBin.remaining - segment.length;
          // Prefer waste bins if they provide a tighter fit
          if (remainingAfter < bestRemainingAfter) {
            bestBinIndex = i;
            bestRemainingAfter = remainingAfter;
            bestIsWaste = true;
          }
        }
      }

      if (bestBinIndex >= 0) {
        if (bestIsWaste) {
          // Use waste bin
          const wasteBin = availableWasteBins[bestBinIndex];
          wasteBin.segments.push(segment);
          wasteBin.remaining -= segment.length;
          bins.push(wasteBin);
          availableWasteBins.splice(bestBinIndex, 1);
          console.log(`[Swap] Placed segment in waste piece (${wasteBin.wasteSourceInfo?.originalLength}mm from sheet ${wasteBin.wasteSourceInfo?.sourceSheetId})`);
        } else {
          // Use existing bin
          bins[bestBinIndex].segments.push(segment);
          bins[bestBinIndex].remaining -= segment.length;
        }
      } else {
        // 3. Create new 12m bar if needed
        bins.push({
          segments: [segment],
          remaining: this.STANDARD_LENGTH - segment.length,
          id: `bin_${bins.length + 1}`,
          totalLength: this.STANDARD_LENGTH,
          isWastePiece: false,
        });
      }
    }

    return bins;
  }

  // canPlaceInBin and createWasteBin are delegated to this.binManager
  // to avoid duplication and ensure consistent behavior across all phases.

  /**
   * Phase 1: Try moving single cuts between bars
   * Goal: Reduce number of bins by consolidating segments
   * Strategy: Prioritize moves that empty source bins and reduce total waste
   */
  private oneToOneSwaps(
    bins: Bin[],
    onProgress?: (stage: string, percentage: number) => void
  ): Bin[] {
    let improved = true;
    let iteration = 0;
    let totalSwaps = 0;

    // Stalemate detection
    let stallCount = 0;
    let minBinCount = bins.length;
    let minWaste = this.scorer.calculateTotalWaste(bins);

    console.log(`[Swap] Phase 1: Starting 1-1 swaps with ${bins.length} bins`);

    while (improved && iteration < this.MAX_ITERATIONS_PHASE1) {
      improved = false;
      iteration++;
      let swapsThisIteration = 0;

      // Track moved segments to prevent cycles/thrashing within the same iteration
      const movedSegments = new Set<string>();

      const progress = 20 + (iteration / this.MAX_ITERATIONS_PHASE1) * 30;
      if (iteration % 5 === 0) { // Only update progress every 5 iterations to reduce spam
        onProgress?.(`1-1 swaps (iteration ${iteration})...`, progress);
      }

      // Sort bins by segment count (prioritize emptying small bins)
      bins.sort((a, b) => a.segments.length - b.segments.length);

      // Early termination: if no single-segment bins, unlikely to make progress
      const singleSegmentBins = bins.filter((b) => b.segments.length === 1).length;
      if (iteration > 1 && singleSegmentBins === 0) {
        console.log(`[Swap] Phase 1 - No single-segment bins remaining, terminating early`);
        break;
      }

      // Try moving each segment to a different bin
      for (let i = 0; i < bins.length; i++) {
        const sourceBin = bins[i];
        if (sourceBin.segments.length === 0) continue;

        for (let segIdx = 0; segIdx < sourceBin.segments.length; segIdx++) {
          const segment = sourceBin.segments[segIdx];

          // Skip if already moved this iteration
          if (movedSegments.has(segment.segmentId)) continue;

          // Find the BEST target bin for this segment
          let bestTargetIdx = -1;
          let bestScore = -Infinity;

          // Try moving to each other bin
          for (let j = 0; j < bins.length; j++) {
            if (i === j) continue;

            const targetBin = bins[j];

            // Check if segment fits in target bin (space + constraint check)
            if (targetBin.remaining >= segment.length) {
              // Check same-parent constraint (only for multi-bar segments)
              const hasSameParent = targetBin.segments.some(
                (seg) => seg.parentBarCode === segment.parentBarCode &&
                  seg.isFromMultiBar && segment.isFromMultiBar
              );
              if (hasSameParent) continue;

              // Calculate benefit score for this move
              const wouldEmptySource = sourceBin.segments.length === 1;

              // Calculate utilization changes
              const targetUtilBefore =
                (targetBin.totalLength - targetBin.remaining) /
                targetBin.totalLength;

              const targetUtilAfter =
                (targetBin.totalLength - (targetBin.remaining - segment.length)) /
                targetBin.totalLength;

              // Calculate how "tight" the fit is (prefer tighter fits)
              const tightness =
                1.0 -
                (targetBin.remaining - segment.length) / targetBin.totalLength;

              // Calculate waste quality changes
              const targetWasteQualityBefore = this.scorer.calculateWasteQuality(targetBin.remaining * 1000);
              const targetWasteQualityAfter = this.scorer.calculateWasteQuality((targetBin.remaining - segment.length) * 1000);
              const wasteQualityDelta = targetWasteQualityAfter - targetWasteQualityBefore;

              // Score calculation:
              let score = 0;

              if (wouldEmptySource) {
                // HIGHEST PRIORITY: Emptying a bin
                score += 10000;

                // Bonus if target waste quality improves
                score += wasteQualityDelta * 50;
              } else {
                // For non-emptying moves, we need a good reason:
                // 1. Target bin becomes very full (>95% utilization)
                if (targetUtilAfter > 0.95) {
                  score += 1000 * (targetUtilAfter - 0.95); // Bonus for near-full bins
                }

                // 2. Tight fit (minimal waste after placement)
                if (tightness > 0.90) {
                  score += 500 * (tightness - 0.90); // Bonus for tight fits
                }

                // 3. Target improvement (but only if significant)
                const targetImprovement = targetUtilAfter - targetUtilBefore;
                if (targetImprovement > 0.05) {
                  // At least 5% improvement
                  score += 100 * targetImprovement;
                }

                // 4. Waste quality improvement (NEW - prioritize creating reusable waste)
                if (wasteQualityDelta > 0) {
                  // Reward moves that improve waste reusability
                  score += 200 * wasteQualityDelta;
                }
              }

              // Only consider moves with positive score
              if (score > bestScore && score > 0) {
                bestScore = score;
                bestTargetIdx = j;
              }
            }
          }

          // Execute the best move found
          if (bestTargetIdx >= 0) {
            const targetBin = bins[bestTargetIdx];

            // Move segment
            sourceBin.segments.splice(segIdx, 1);
            sourceBin.remaining += segment.length;
            targetBin.segments.push(segment);
            targetBin.remaining -= segment.length;

            movedSegments.add(segment.segmentId);

            improved = true;
            swapsThisIteration++;
            totalSwaps++;
            segIdx--; // Adjust index after removal
          }
        }
      }

      if (swapsThisIteration > 0) {
        console.log(
          `[Swap] Phase 1 - Iteration ${iteration}: ${swapsThisIteration} swaps made`
        );
      } else if (iteration === 1) {
        console.log(`[Swap] Phase 1 - No swaps possible in first iteration`);
      }

      // CHECK FOR STALEMATE
      const currentBinCount = bins.filter(b => b.segments.length > 0).length; // Filter empty bins just in case
      const currentWaste = this.scorer.calculateTotalWaste(bins);

      // If we reduced bins or reduced waste significantly (> 0.1m), reset counter
      if (currentBinCount < minBinCount || currentWaste < minWaste - 0.1) {
        stallCount = 0;
        minBinCount = currentBinCount;
        minWaste = currentWaste;
      } else {
        stallCount++;
      }

      if (stallCount >= 5) {
        console.log(`[Swap] Phase 1 - Stalemate detected (no improvement for 5 iterations), stopping early.`);
        break;
      }
    }

    console.log(`[Swap] Phase 1 Complete:`);
    console.log(`  - Total iterations: ${iteration}`);
    console.log(`  - Total swaps: ${totalSwaps}`);

    if (totalSwaps === 0) {
      console.log(`  - WARNING: No swaps made! Initial solution may already be optimal or constraints too restrictive.`);
    }

    return bins;
  }

  /**
   * Phase 2: Try to consolidate bars (empty some bars completely)
   */
  private consolidateBars(
    bins: Bin[],
    onProgress?: (stage: string, percentage: number) => void
  ): Bin[] {
    console.log(`[Swap] Phase 2: Starting consolidation with ${bins.length} bins`);

    // Sort bins by number of segments (try to empty small bins first)
    const sortedBins = [...bins].sort((a, b) => a.segments.length - b.segments.length);

    let binsEmptied = 0;
    let totalMoves = 0;
    let attemptedBins = 0;

    for (let i = 0; i < sortedBins.length; i++) {
      const progress = 50 + (i / sortedBins.length) * 20;
      // onProgress?.(`Consolidating bar ${i + 1}/${sortedBins.length}...`, progress); 
      // Reduced spam: only update every 50 bars
      if (i % 50 === 0) {
        onProgress?.(`Consolidating bar ${i + 1}/${bins.length}...`, progress);
      }

      const sourceBin = sortedBins[i];
      if (sourceBin.segments.length === 0) continue;

      attemptedBins++;
      const initialSegmentCount = sourceBin.segments.length;

      // Try to move ALL segments from this bin to other bins
      const segmentsToMove = [...sourceBin.segments];
      let allMoved = true;

      for (const segment of segmentsToMove) {
        let moved = false;

        // Find a bin that can fit this segment
        for (let j = 0; j < sortedBins.length; j++) {
          if (i === j) continue;

          const targetBin = sortedBins[j];
          if (targetBin.remaining >= segment.length) {
            // Check same-parent constraint (only for multi-bar segments)
            const hasSameParent = targetBin.segments.some(
              (seg) => seg.parentBarCode === segment.parentBarCode &&
                seg.isFromMultiBar && segment.isFromMultiBar
            );
            if (hasSameParent) continue;

            // Move segment
            const segIdx = sourceBin.segments.indexOf(segment);
            if (segIdx >= 0) {
              sourceBin.segments.splice(segIdx, 1);
              sourceBin.remaining += segment.length;
              targetBin.segments.push(segment);
              targetBin.remaining -= segment.length;
              moved = true;
              totalMoves++;
              break;
            }
          }
        }

        if (!moved) {
          allMoved = false;
          break;
        }
      }

      if (allMoved) {
        binsEmptied++;
        console.log(`[Swap] Phase 2: Successfully emptied bin ${sourceBin.id} (had ${initialSegmentCount} segments)`);
      }
    }

    // Remove empty bins
    const finalBins = sortedBins.filter(bin => bin.segments.length > 0);

    console.log(`[Swap] Phase 2 Complete:`);
    console.log(`  - Bins attempted: ${attemptedBins}`);
    console.log(`  - Bins emptied: ${binsEmptied}`);
    console.log(`  - Total moves: ${totalMoves}`);
    console.log(`  - Bins before: ${bins.length}, after: ${finalBins.length}`);

    return finalBins;
  }

  /**
   * Phase 3: Try swapping pairs of cuts between bars
   * Goal: Find better combinations by exchanging segments
   * Strategy: Create opportunities for consolidation by redistributing segments optimally
   */
  /**
   * Phase 3: Try swapping pairs of cuts between bars
   * Goal: Find better combinations by exchanging segments
   * Strategy: Create opportunities for consolidation by redistributing segments optimally
   * UPDATED: Uses First Improvement with Batched execution for higher throughput
   */
  private twoToTwoSwaps(
    bins: Bin[],
    onProgress?: (stage: string, percentage: number) => void
  ): Bin[] {
    let improved = true;
    let iteration = 0;
    let totalSwaps = 0;
    const MAX_SWAPS_PER_PASS = 1000; // Limit total work per pass to avoid freezing

    console.log(`[Swap] Phase 3: Starting 2-2 swaps with ${bins.length} bins`);

    while (improved && iteration < this.MAX_ITERATIONS_PHASE3) {
      improved = false;
      iteration++;
      let swapsThisIteration = 0;

      const progress = 70 + (iteration / this.MAX_ITERATIONS_PHASE3) * 15;
      onProgress?.(`2-2 swaps (iteration ${iteration})...`, progress);

      // Process bins in consistent order for deterministic results
      // Note: Removed randomization to ensure same input always produces same output
      const binIndices = Array.from({ length: bins.length }, (_, i) => i);
      // this.shuffleArray(binIndices);  // Disabled - causes non-deterministic results

      // Iterate through random bin pairs
      for (let i = 0; i < binIndices.length - 1; i++) {
        const bin1Idx = binIndices[i];
        const bin1 = bins[bin1Idx];

        // Skip full processing for bins that are "perfectly packed" (>99.9%)
        const util1 = (bin1.totalLength - bin1.remaining) / bin1.totalLength;
        if (util1 > 0.999) continue;

        for (let j = i + 1; j < binIndices.length; j++) {
          const bin2Idx = binIndices[j];
          const bin2 = bins[bin2Idx];

          const util2 = (bin2.totalLength - bin2.remaining) / bin2.totalLength;
          if (util2 > 0.999) continue; // Skip perfect bins

          // Try swapping segments between bin1 and bin2
          let swapFoundForPair = false;

          // Iterate through segments
          for (let seg1Idx = 0; seg1Idx < bin1.segments.length; seg1Idx++) {
            if (swapFoundForPair) break; // Move to next bin pair after a swap

            for (let seg2Idx = 0; seg2Idx < bin2.segments.length; seg2Idx++) {
              const seg1 = bin1.segments[seg1Idx];
              const seg2 = bin2.segments[seg2Idx];

              // Skip similar length swaps (waste of time)
              if (Math.abs(seg1.length - seg2.length) < 0.05) continue;

              // Check feasibility
              const bin1AfterSwap = bin1.remaining + seg1.length - seg2.length;
              const bin2AfterSwap = bin2.remaining + seg2.length - seg1.length;

              if (bin1AfterSwap >= -0.001 && bin2AfterSwap >= -0.001) { // Floating point tolerance
                // Check constraints
                const bin1HasSameParent = bin1.segments.some((seg, idx) => idx !== seg1Idx && seg.parentBarCode === seg2.parentBarCode);
                if (bin1HasSameParent) continue;

                const bin2HasSameParent = bin2.segments.some((seg, idx) => idx !== seg2Idx && seg.parentBarCode === seg1.parentBarCode);
                if (bin2HasSameParent) continue;

                // Calculate Score
                const util1After = (bin1.totalLength - bin1AfterSwap) / bin1.totalLength;
                const util2After = (bin2.totalLength - bin2AfterSwap) / bin2.totalLength;

                // Goal: make bins either filled (>95%) or empty (0%)
                // We also reward variance increase (one gets fuller, one gets emptier)

                const utilBeforeSum = (util1 * util1) + (util2 * util2);
                const utilAfterSum = (util1After * util1After) + (util2After * util2After);

                // If sum of squares increases, variance has increased (good for bin packing)
                const score = utilAfterSum - utilBeforeSum;

                // First Improvement Threshold
                // Only take swaps that significantly improve the state
                if (score > 0.0001) {
                  // Execute Swap IMMEDIATELY
                  bin1.segments[seg1Idx] = seg2;
                  bin2.segments[seg2Idx] = seg1;
                  bin1.remaining = bin1AfterSwap;
                  bin2.remaining = bin2AfterSwap;

                  swapsThisIteration++;
                  totalSwaps++;
                  improved = true;
                  swapFoundForPair = true;
                  break; // Break inner loop
                }
              }
            }
          }
        }
      }

      if (swapsThisIteration > 0) {
        // console.log(`[Swap] Phase 3 - Iteration ${iteration}: ${swapsThisIteration} swaps executed`);
      }

      if (totalSwaps >= MAX_SWAPS_PER_PASS) {
        console.log(`[Swap] Phase 3 hit safety limit of ${MAX_SWAPS_PER_PASS} swaps`);
        break;
      }
    }

    console.log(`[Swap] Phase 3 Complete: ${totalSwaps} swaps executed`);
    return bins;
  }

  private shuffleArray(array: any[]) {
    this.binManager.shuffleArray(array);
  }
}
