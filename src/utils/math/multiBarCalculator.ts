import type { SubBarInfo, BarSegment } from "@/types/CuttingStock";

export class MultiBarCalculator {
  private readonly STANDARD_LENGTH = 12.0; // meters

  /**
   * Calculate multi-bar requirements for cutting lengths > 12m
   */
  calculateMultiBarRequirement(
    cuttingLength: number,
    lapLength: number
  ): SubBarInfo {
    if (cuttingLength <= this.STANDARD_LENGTH) {
      // Single bar case
      return {
        subBarsRequired: 1,
        lapsRequired: 0,
        totalMaterialLength: cuttingLength,
        segmentLengths: [cuttingLength],
        lapPositions: [],
      };
    }

    // Multi-bar calculations
    // First bar contributes full 12m, subsequent bars contribute (12 - lapLength)
    // Formula: 12 + (n-1) × (12 - lapLength) >= cuttingLength
    // Solving for n: n >= (cuttingLength - 12) / (12 - lapLength) + 1
    const effectiveLengthPerBar = this.STANDARD_LENGTH - lapLength;
    const subBarsRequired = Math.ceil(
      (cuttingLength - this.STANDARD_LENGTH) / effectiveLengthPerBar + 1
    );

    // Number of laps = number of bars - 1
    const lapsRequired = subBarsRequired - 1;

    // Calculate optimal segment distribution
    const segmentLengths = this.calculateOptimalSegments(
      cuttingLength,
      lapLength,
      subBarsRequired
    );

    const lapPositions = this.calculateLapPositions(segmentLengths);
    const totalMaterialLength = this.calculateTotalMaterial(
      segmentLengths,
      lapLength,
      lapsRequired
    );

    return {
      subBarsRequired,
      lapsRequired,
      totalMaterialLength,
      segmentLengths,
      lapPositions,
    };
  }

  /**
   * Calculate optimal segment lengths considering lap overlaps
   * Returns the EFFECTIVE LENGTH of each segment (what goes into the bar for cutting)
   * Logic: Each segment except last = 12m - lapLength (effective cutting length)
   *        Last segment = remaining length needed
   */
  private calculateOptimalSegments(
    totalLength: number,
    lapLength: number,
    subBars: number
  ): number[] {
    const segments: number[] = [];
    const effectiveLengthPerBar = this.STANDARD_LENGTH - lapLength;
    let remainingLength = totalLength;

    for (let i = 0; i < subBars; i++) {
      if (i === subBars - 1) {
        // Last segment: use remaining length (no lap at end)
        // This is the actual cutting length for the last segment
        segments.push(Math.min(remainingLength, this.STANDARD_LENGTH));
      } else {
        // All other segments: effective cutting length = 12m - lapLength
        // This represents how much of the bar is used for the actual cut
        segments.push(effectiveLengthPerBar);
        remainingLength -= effectiveLengthPerBar;
      }
    }

    return segments;
  }

  /**
   * Calculate positions where laps occur
   */
  private calculateLapPositions(segmentLengths: number[]): number[] {
    const positions: number[] = [];
    let currentPosition = 0;

    for (let i = 0; i < segmentLengths.length - 1; i++) {
      currentPosition += segmentLengths[i];
      positions.push(currentPosition);
    }

    return positions;
  }

  /**
   * Calculate total material needed including laps
   */
  private calculateTotalMaterial(
    segments: number[],
    lapLength: number,
    laps: number
  ): number {
    const segmentTotal = segments.reduce((sum, length) => sum + length, 0);
    // Laps add material because of overlap
    const lapMaterial = laps * lapLength;
    return segmentTotal + lapMaterial;
  }

  /**
   * Create bar segments from cutting request
   * Logic: All segments except last have lap at end
   * Cutting length (for algorithm) = effective length + lap length
   * This represents the total space needed in the 12m bar
   */
  createSegments(
    barCode: string,
    subBarInfo: SubBarInfo,
    quantity: number,
    lapLength: number
  ): BarSegment[] {
    const segments: BarSegment[] = [];
    const isMultiBar = subBarInfo.subBarsRequired > 1;

    subBarInfo.segmentLengths.forEach((length, index) => {
      const isLastSegment = index === subBarInfo.segmentLengths.length - 1;

      // Only last segment has no lap at end
      // All other segments have lap at end (to connect to next segment)
      const hasLapEnd = isMultiBar && !isLastSegment;
      const hasLapStart = false; // Lap is at end, not start

      // Last segment has NO lap, all others have lap
      const segmentLapLength = isLastSegment ? 0 : lapLength;

      // Effective length: the segment length without lap
      const effectiveLength = length;

      // Cutting length: effective length + lap length (total space needed in bar)
      const cuttingLength = effectiveLength + segmentLapLength;

      segments.push({
        segmentId: `${barCode}_seg_${index}`,
        parentBarCode: barCode,
        segmentIndex: index,
        length: Math.min(cuttingLength, this.STANDARD_LENGTH), // Cutting length for algorithm
        quantity: quantity,
        hasLapStart,
        hasLapEnd,
        effectiveLength: Math.min(effectiveLength, this.STANDARD_LENGTH),
        lapLength: segmentLapLength, // 0 for last segment, actual lap length for others
        isFromMultiBar: isMultiBar, // Track if segment is part of a multi-bar (>12m) requiring lap joints
      });
    });

    return segments;
  }
}
