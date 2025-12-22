// Core types for cutting stock problem

export interface SubBarInfo {
  subBarsRequired: number;     // ceil(length/12)
  lapsRequired: number;        // floor(length/12)
  totalMaterialLength: number; // Including lap overlaps
  segmentLengths: number[];    // Length of each segment
  lapPositions: number[];      // Where laps occur
}

export interface BarSegment {
  segmentId: string;           // Unique identifier
  parentBarCode: string;       // Original bar code
  segmentIndex: number;        // Position (0, 1, 2, ...)
  length: number;              // Actual cutting length
  quantity: number;            // How many needed
  hasLapStart: boolean;        // Lap at beginning
  hasLapEnd: boolean;          // Lap at end
  effectiveLength: number;     // Length including laps
  lapLength: number;           // Actual lap length from input data
}

export interface MultiBarCuttingRequest {
  barCode: string;
  originalLength: number;      // Original required length
  quantity: number;            // How many of these cuts needed
  dia: number;                 // Diameter for grouping
  element: string;             // Structural element
  lapLength: number;           // Lap overlap length
  
  // Calculated fields
  isMultiBar: boolean;         // Whether > 12m
  subBarInfo: SubBarInfo;      // Multi-bar calculations
  segments: BarSegment[];      // Individual segments to cut
}

export interface CuttingPattern {
  id: string;
  cuts: PatternCut[];
  waste: number;               // Remaining length
  utilization: number;         // Percentage used (0-100)
  standardBarLength: number;   // 12m
}

export interface PatternCut {
  segmentId: string;
  parentBarCode: string;
  length: number;
  count: number;               // How many of this cut in pattern
  segmentIndex: number;
  lapLength: number;           // Lap length for this cut (0 if no lap)
}

export interface CuttingBin {
  id: string;
  patterns: CuttingPattern[];
  usedLength: number;
  remainingLength: number;
  cuts: PatternCut[];
  utilization: number;
}

export interface CuttingStockResult {
  algorithm: 'greedy' | 'dynamic' | 'true-dynamic' | 'branch-and-bound' | 'column-generation' | 'heuristic' | 'adaptive' | 'improved-greedy';
  dia: number;
  patterns: CuttingPattern[];
  totalBarsUsed: number;
  totalWaste: number;
  averageUtilization: number;
  executionTime: number;
  summary: CuttingSummary;
  detailedCuts: DetailedCut[];
}

export interface CuttingSummary {
  totalStandardBars: number;
  totalWasteLength: number;
  totalWastePercentage: number;
  averageUtilization: number;
  patternCount: number;
  totalCutsProduced: number;
}

export interface DetailedCut {
  patternId: string;
  barNumber: number;
  cuts: CutInstruction[];
  waste: number;
  utilization: number;
  isFromWaste?: boolean;
  wasteSource?: {
    wasteId: string;
    sourceSheetId: number;
    sourceBarNumber: number;
    originalLength: number;
  };
}

export interface CutInstruction {
  barCode: string;
  segmentId: string;
  length: number;
  quantity: number;
  position: number;           // Position on the bar
  segmentIndex: number;
  hasLap: boolean;
  lapLength: number;          // Actual lap length (0 if no lap)
}


// ============================================
// WASTE TRACKING TYPES
// ============================================

export interface WastePiece {
  id: string;
  projectId: number;
  
  // Origin tracking
  sourceSheetId: number;
  sourceSheetName: string;
  sourceBarNumber: number;      // Which 12m standard bar (Bar #1, #2, etc.)
  sourcePatternId: string;
  
  // What cuts were made on that bar (that produced this waste)
  cutsOnSourceBar: WasteOriginCut[];
  
  // Waste details
  dia: number;
  length: number;               // in mm
  status: "available" | "used" | "discarded";
  
  // If used
  usedInSheetId?: number;
  usedInSheetName?: string;
  usedForBarCode?: string;
  
  createdAt: Date;
}

export interface WasteOriginCut {
  barCode: string;
  length: number;               // in mm
  element: string;
}

export interface WasteUsageRecord {
  wasteId: string;
  sourceSheetId: number;
  sourceSheetName: string;
  sourceBarNumber: number;
  wasteLength: number;          // Original waste piece length
  cutsOnSourceBar: WasteOriginCut[];
  
  // What it was used for
  usedForBarCode: string;
  cutLength: number;
  remainingLength: number;
  remainingStatus: "discarded" | "added_to_inventory";
}

export interface CuttingStockResultWithWaste extends CuttingStockResult {
  // Waste reuse tracking
  wasteUsage: WasteUsageRecord[];
  newBarsUsed: number;          // Only new 12m bars
  wastePiecesReused: number;    // Count of waste pieces used
  totalWasteSaved: number;      // mm saved by reusing waste
  
  // New waste generated
  newWasteGenerated: WastePiece[];
}

export interface AvailableWaste {
  dia: number;
  pieces: WastePiece[];
  totalLength: number;          // Total available length in mm
  totalPieces: number;
}
