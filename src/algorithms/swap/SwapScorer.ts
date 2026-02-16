import type { Bin } from "./types";

/**
 * Handles waste quality calculations for optimizing waste reusability
 */
export class SwapScorer {
    /**
     * Calculate waste quality score based on reusability
     * Prioritizes creating larger waste pieces that can be reused
     * 
     * @param wasteLength - Waste length in mm
     * @returns Quality score (0-10, higher is better)
     */
    calculateWasteQuality(wasteLength: number): number {
        const wasteMm = wasteLength;

        // Unreusable waste (< 1m)
        if (wasteMm < 1000) return 0;

        // Excellent reusable waste (>= 2m)
        if (wasteMm >= 2000) return 10;

        // Medium waste (1m - 2m) - proportional score
        // 1000mm = 5, 1500mm = 7.5, 2000mm = 10
        return wasteMm / 200;
    }

    /**
     * Calculate total waste quality across all bins
     * Higher score means better waste distribution
     */
    calculateTotalWasteQuality(bins: Bin[]): number {
        return bins.reduce((total, bin) => {
            return total + this.calculateWasteQuality(bin.remaining * 1000);
        }, 0);
    }

    /**
     * Calculate total waste across all bins
     */
    calculateTotalWaste(bins: Bin[]): number {
        return bins.reduce((sum, bin) => sum + bin.remaining, 0);
    }
}
