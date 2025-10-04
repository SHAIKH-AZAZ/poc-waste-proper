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
    const subBarsRequired = Math.ceil(cuttingLength / this.STANDARD_LENGTH);
    const lapsRequired = Math.floor(cuttingLength / this.STANDARD_LENGTH);

    // Calculate optimal segment distribution
    const segmentLengths = this.calculateOptimalSegments(
      cuttingLength,
      lapLength,
      subBarsRequired,
      lapsRequired
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
   */
  private calculateOptimalSegments(
    totalLength: number,
    lapLength: number,
    subBars: number,
    laps: number
  ): number[] {
    const segments: number[] = [];
    let remainingLength = totalLength;

    for (let i = 0; i < subBars; i++) {
      if (i === subBars - 1) {
        // Last segment gets remaining length
        segments.push(Math.max(0.1, remainingLength)); // Minimum 10cm
      } else {
        // Calculate segment length considering lap overlap
        // Each segment except last needs to account for lap
        const segmentLength = Math.min(
          this.STANDARD_LENGTH,
          remainingLength + lapLength / 2
        );
        segments.push(segmentLength);
        remainingLength -= segmentLength - lapLength / 2;
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
   */
  createSegments(
    barCode: string,
    subBarInfo: SubBarInfo,
    quantity: number,
    lapLength: number
  ): BarSegment[] {
    const segments: BarSegment[] = [];

    subBarInfo.segmentLengths.forEach((length, index) => {
      const hasLapStart = index > 0;
      const hasLapEnd = index < subBarInfo.segmentLengths.length - 1;

      const effectiveLength =
        length +
        (hasLapStart ? lapLength / 2 : 0) +
        (hasLapEnd ? lapLength / 2 : 0);

      segments.push({
        segmentId: `${barCode}_seg_${index}`,
        parentBarCode: barCode,
        segmentIndex: index,
        length: length,
        quantity: quantity,
        hasLapStart,
        hasLapEnd,
        effectiveLength: Math.min(effectiveLength, this.STANDARD_LENGTH),
      });
    });

    return segments;
  }
}
