import type {
    CuttingPattern,
    PatternCut,
    DetailedCut,
    CutInstruction,
    CuttingStockResult,
    BarSegment,
} from "@/types/CuttingStock";
import type { Bin } from "./types";

/**
 * Converts between bin representation and cutting patterns
 */
export class PatternConverter {
    /**
     * Convert bins to cutting patterns
     */
    binsToPatterns(bins: Bin[]): CuttingPattern[] {
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

            // Use actual bin length (waste pieces have variable length)
            const barLength = bin.totalLength;
            const usedLength = barLength - bin.remaining;

            return {
                id: bin.isWastePiece ? `waste_pattern_${index + 1} ` : `swap_pattern_${index + 1} `,
                cuts: Array.from(cutMap.values()),
                waste: bin.remaining,
                utilization: (usedLength / barLength) * 100,
                standardBarLength: barLength,
            };
        });
    }

    /**
     * Convert cutting patterns back to bins (for greedy+swap hybrid)
     * This allows us to start optimization from greedy's solution
     */
    patternsToBins(patterns: CuttingPattern[], allSegments: BarSegment[]): Bin[] {
        // Create a map of segmentId to full segment data
        const segmentMap = new Map<string, BarSegment>();
        for (const segment of allSegments) {
            segmentMap.set(segment.segmentId, segment);
        }

        return patterns.map((pattern, index) => {
            const segments: BarSegment[] = [];

            // Reconstruct segments from pattern cuts
            for (const cut of pattern.cuts) {
                const fullSegment = segmentMap.get(cut.segmentId);
                if (fullSegment) {
                    // Add segment 'count' times
                    for (let i = 0; i < cut.count; i++) {
                        segments.push(fullSegment);
                    }
                }
            }

            const isWaste = pattern.id.includes('waste');
            const bin: Bin = {
                id: pattern.id,
                segments,
                remaining: pattern.waste,
                totalLength: pattern.standardBarLength,
                isWastePiece: isWaste,
            };

            return bin;
        });
    }

    /**
     * Generate detailed cutting instructions
     */
    generateDetailedCuts(patterns: CuttingPattern[], bins?: Bin[]): DetailedCut[] {
        return patterns.map((pattern, index) => {
            let currentPosition = 0;
            const cuts: CutInstruction[] = [];
            const bin = bins?.[index];

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
    calculateSummary(patterns: CuttingPattern[], totalCuts: number, newBarsUsed?: number, wastePiecesUsed?: number) {
        const totalBars = patterns.length;

        // Separate waste calculation: new bars vs reused pieces
        let wasteFromNewBars = 0;
        let wasteFromReusedPieces = 0;

        patterns.forEach((pattern) => {
            const isWasteBin = pattern.id.startsWith('waste_pattern_');
            if (isWasteBin) {
                wasteFromReusedPieces += pattern.waste;
            } else {
                wasteFromNewBars += pattern.waste;
            }
        });

        const totalWaste = wasteFromNewBars + wasteFromReusedPieces;

        const avgUtilization =
            totalBars > 0
                ? patterns.reduce((sum, p) => sum + p.utilization, 0) / totalBars
                : 0;

        // Calculate total material length (accounting for different bar lengths)
        const totalMaterialLength = patterns.reduce((sum, p) => sum + p.standardBarLength, 0);

        return {
            totalStandardBars: totalBars,
            newBarsUsed: newBarsUsed ?? totalBars,
            wastePiecesReused: wastePiecesUsed ?? 0,
            totalWasteLength: Math.round(totalWaste * 1000) / 1000,
            wasteFromNewBars: Math.round(wasteFromNewBars * 1000) / 1000,
            wasteFromReusedPieces: Math.round(wasteFromReusedPieces * 1000) / 1000,
            totalWastePercentage:
                totalMaterialLength > 0
                    ? Math.round((totalWaste / totalMaterialLength) * 10000) / 100
                    : 0,
            averageUtilization: Math.round(avgUtilization * 100) / 100,
            patternCount: patterns.length,
            totalCutsProduced: totalCuts,
        };
    }

    /**
     * Create empty result
     */
    createEmptyResult(dia: number, startTime: number): CuttingStockResult {
        return {
            algorithm: "swap",
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
