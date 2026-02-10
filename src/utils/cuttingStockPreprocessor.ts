import type { BarCuttingDisplay } from "@/types/BarCuttingRow";
import type { MultiBarCuttingRequest, BarSegment } from "@/types/CuttingStock";
import { MultiBarCalculator } from "./multiBarCalculator";

export class CuttingStockPreprocessor {
  private calculator = new MultiBarCalculator();

  /**
   * Convert display data to cutting requests
   */
  convertToCuttingRequests(
    displayData: BarCuttingDisplay[]
  ): MultiBarCuttingRequest[] {
    return displayData.map((row) => {
      const cuttingLength = row["Cutting Length"];
      const lapLength = row["Lap Length"];
      const quantity = row["Total Bars"];

      const subBarInfo = this.calculator.calculateMultiBarRequirement(
        cuttingLength,
        lapLength
      );

      const segments = this.calculator.createSegments(
        row.BarCode,
        subBarInfo,
        quantity,
        lapLength
      );

      return {
        barCode: row.BarCode,
        originalLength: cuttingLength,
        quantity: quantity,
        dia: row.Dia,
        element: row.Element,
        lapLength: lapLength,
        isMultiBar: cuttingLength > 12,
        subBarInfo,
        segments,
      };
    });
  }

  /**
   * Filter requests by diameter
   */
  filterByDia(
    requests: MultiBarCuttingRequest[],
    dia: number
  ): MultiBarCuttingRequest[] {
    return requests.filter((req) => req.dia === dia);
  }

  /**
   * Extract all segments from requests
   */
  extractAllSegments(requests: MultiBarCuttingRequest[]): BarSegment[] {
    const allSegments: BarSegment[] = [];

    for (const request of requests) {
      // Expand segments by quantity
      for (let i = 0; i < request.quantity; i++) {
        allSegments.push(...request.segments);
      }
    }

    return allSegments;
  }

  /**
   * Group segments by similar lengths for better packing
   */
  groupSegmentsByLength(segments: BarSegment[]): Map<number, BarSegment[]> {
    const groups = new Map<number, BarSegment[]>();

    for (const segment of segments) {
      // Round to nearest 0.1m for grouping
      const roundedLength = Math.round(segment.length * 10) / 10;

      if (!groups.has(roundedLength)) {
        groups.set(roundedLength, []);
      }
      groups.get(roundedLength)!.push(segment);
    }

    return groups;
  }

  /**
   * Extract all segments with unique identifiers for greedy algorithm
   * This creates individual segment instances to avoid grouping issues
   */
  extractAllSegmentsForGreedy(requests: MultiBarCuttingRequest[]): BarSegment[] {
    const allSegments: BarSegment[] = [];

    for (const request of requests) {
      // Expand segments by quantity - create unique instances
      for (let i = 0; i < request.quantity; i++) {
        // Create unique segments for each bar instance
        const instanceSegments = request.segments.map(segment => ({
          ...segment,
          segmentId: `${segment.segmentId}_instance_${i}`, // Make segmentId unique
          parentBarCode: `${segment.parentBarCode}_instance_${i}`, // Make parent unique per instance
        }));
        allSegments.push(...instanceSegments);
      }
    }

    return allSegments;
  }

  /**
   * Sort segments by length (descending) for greedy algorithm
   */
  sortSegmentsByLength(segments: BarSegment[]): BarSegment[] {
    return [...segments].sort((a, b) => b.length - a.length);
  }

  /**
   * Calculate total material requirement
   */
  calculateTotalMaterial(requests: MultiBarCuttingRequest[]): number {
    return requests.reduce((total, req) => {
      return total + req.subBarInfo.totalMaterialLength * req.quantity;
    }, 0);
  }



  /**
   * Estimate minimum bars needed (lower bound)
   */
  estimateMinimumBars(requests: MultiBarCuttingRequest[]): number {
    const totalMaterial = this.calculateTotalMaterial(requests);
    return Math.ceil(totalMaterial / 12);
  }
}
