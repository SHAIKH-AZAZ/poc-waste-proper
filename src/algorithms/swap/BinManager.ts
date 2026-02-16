import type { BarSegment, WastePiece } from "@/types/CuttingStock";
import type { Bin, WasteSourceInfo } from "./types";

/**
 * Manages bin operations and constraints
 */
export class BinManager {
    private readonly STANDARD_LENGTH = 12.0;

    /**
     * Check if segment can fit in bin
     * Constraint: Segments from the same parent bar (multi-bar segments) cannot be in the same bin
     * (they need to be joined together with lap joints)
     */
    canPlaceInBin(bin: Bin, segment: BarSegment): boolean {
        // Check if there's enough space
        if (bin.remaining < segment.length) {
            return false;
        }

        // Check if any segment in this bin is from the same parent bar
        // Only apply constraint for multi-bar segments (those requiring lap joints)
        const hasSameParent = bin.segments.some(
            (seg) => seg.parentBarCode === segment.parentBarCode &&
                seg.isFromMultiBar && segment.isFromMultiBar
        );

        return !hasSameParent;
    }

    /**
     * Create bin from waste piece
     */
    createWasteBin(waste: WastePiece): Bin {
        const wasteInfo: WasteSourceInfo = {
            wasteId: waste.id,
            sourceSheetId: waste.sourceSheetId,
            sourceSheetNumber: waste.sourceSheetNumber,
            sourceBarNumber: waste.sourceBarNumber,
            originalLength: waste.length,
        };

        return {
            id: `waste_${waste.id}`,
            segments: [],
            remaining: waste.length / 1000,
            totalLength: waste.length / 1000,
            isWastePiece: true,
            wasteSourceInfo: wasteInfo,
        };
    }

    /**
     * Create a new standard 12m bin
     */
    createStandardBin(id: string): Bin {
        return {
            id,
            segments: [],
            remaining: this.STANDARD_LENGTH,
            totalLength: this.STANDARD_LENGTH,
            isWastePiece: false,
        };
    }

    /**
     * Place a segment in a bin
     */
    placeSegment(bin: Bin, segment: BarSegment): void {
        bin.segments.push(segment);
        bin.remaining -= segment.length;
    }

    /**
     * Remove a segment from a bin
     */
    removeSegment(bin: Bin, segment: BarSegment): boolean {
        const index = bin.segments.indexOf(segment);
        if (index >= 0) {
            bin.segments.splice(index, 1);
            bin.remaining += segment.length;
            return true;
        }
        return false;
    }

    /**
     * Shuffle array in place (Fisher-Yates algorithm)
     */
    shuffleArray<T>(array: T[]): void {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }
}
