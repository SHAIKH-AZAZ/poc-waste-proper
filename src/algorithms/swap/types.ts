import type { BarSegment, WastePiece } from "@/types/CuttingStock";

/**
 * Waste source information for bins created from waste pieces
 */
export interface WasteSourceInfo {
    wasteId: string;
    sourceSheetId: number;
    sourceSheetNumber?: number;
    sourceBarNumber: number;
    originalLength: number;
}

/**
 * Bin represents a single bar (12m standard or waste piece) that holds segments
 */
export interface Bin {
    segments: BarSegment[];
    remaining: number;
    id: string;
    totalLength: number;
    isWastePiece?: boolean;
    wasteSourceInfo?: WasteSourceInfo;
}

/**
 * Progress callback for reporting optimization status
 */
export type ProgressCallback = (stage: string, percentage: number) => void;
