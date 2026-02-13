import type { Bin, ProgressCallback } from "../types";
import type { SwapScorer } from "../SwapScorer";
import type { BinManager } from "../BinManager";

/**
 * Base interface for all swap optimization strategies
 */
export interface SwapStrategy {
    /**
     * Execute the swap strategy on the given bins
     * @param bins - Current bin configuration
     * @param scorer - Scoring utility for evaluating swaps
     * @param binManager - Bin management utility
     * @param onProgress - Optional progress callback
     * @returns Optimized bins after applying strategy
     */
    execute(
        bins: Bin[],
        scorer: SwapScorer,
        binManager: BinManager,
        onProgress?: ProgressCallback
    ): Bin[];
}
