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
  algorithm: 'greedy' | 'dynamic';
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
}

export interface CutInstruction {
  barCode: string;
  segmentId: string;
  length: number;
  quantity: number;
  position: number;           // Position on the bar
  segmentIndex: number;
  hasLap: boolean;
}
