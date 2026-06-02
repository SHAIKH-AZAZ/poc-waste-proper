/**
 * Bounded Knapsack DP — bar-by-bar cutting stock optimization.
 *
 * Faithful TypeScript port of the C# POC algorithm (Form1.cs RunDynamicProgrammingAlgorithm):
 *
 *   1. Convert standardBarLength to mm (12 → 12,000)
 *   2. Group pieces by cutting length → Dictionary<int, (Group, TotalBars)>
 *   3. WHILE pieces remain:
 *      a. Build DP table:
 *         dp[0] = []  (base case: 0 length, no pieces)
 *
 *         FOR each unique piece length P with count C:
 *           Copy dp → currentDp
 *           FOR each existing state S in dp:
 *             FOR count = 1 to C:
 *               newLength = S + P × count
 *               IF newLength > barLength: BREAK
 *               IF newLength not in currentDp OR currentDp[newLength] has more pieces:
 *                 currentDp[newLength] = dp[S] + [P repeated 'count' times]
 *           dp = currentDp
 *
 *      b. Find bestLength = MAX key in dp where key ≤ barLength
 *      c. bestCombination = dp[bestLength]  (list of piece lengths)
 *      d. Record cuts, subtract used pieces from remainingPieces
 *      e. Calculate wastage = barLength - bestLength
 *
 * Key properties:
 *   - Works ONE BAR AT A TIME (fast, deterministic, scales to thousands of pieces)
 *   - Maximizes utilization per bar (bounded knapsack = least waste per bar)
 *   - Supports waste-inventory reuse: tries waste bins before new 12m bars
 */

import type {
  MultiBarCuttingRequest,
  BarSegment,
  CuttingStockResult,
  CuttingPattern,
  PatternCut,
  DetailedCut,
  CutInstruction,
  WastePiece,
} from "@/types/CuttingStock";
import { CuttingStockPreprocessor } from "@/utils/cuttingStockPreprocessor";

// ── Internal types ───────────────────────────────────────────────────────

/** A group of segments that share the same cutting length */
interface PieceType {
  lengthMm: number;       // cutting length in mm (integer key for DP)
  lengthM: number;        // cutting length in meters (for output)
  remaining: number;      // how many are still unplaced
  segments: BarSegment[]; // actual segment objects (for bar-code metadata)
}

/** One chosen piece in a DP solution: "use `count` pieces of `lengthMm`" */
interface DPPiece {
  lengthMm: number;
  count: number;
}

/** DP table entry: a reachable total-length state and how we got there */
interface DPEntry {
  pieces: DPPiece[];
  totalLength: number;  // sum of all piece lengths (mm)
}

/** A completed bar after the knapsack loop */
interface CompletedBin {
  cuts: { pieceType: PieceType; count: number }[];
  usedMm: number;
  wasteMm: number;
  barLengthMm: number;
  isWaste: boolean;
  wasteSource?: WastePiece;
}

// ── Algorithm ────────────────────────────────────────────────────────────

export class BoundedKnapsackCuttingStock {
  private readonly STANDARD_LENGTH_M = 12.0;
  private readonly STANDARD_LENGTH_MM = 12_000;
  private preprocessor = new CuttingStockPreprocessor();

  solve(
    requests: MultiBarCuttingRequest[],
    dia: number,
    wastePieces?: WastePiece[],
    maxTimeMs: number = 90_000
  ): CuttingStockResult {
    const startTime = performance.now();
    const deadline = startTime + maxTimeMs;

    // Step 1: filter by diameter
    const diaRequests = this.preprocessor.filterByDia(requests, dia);
    if (diaRequests.length === 0) {
      return this.createEmptyResult(dia, startTime);
    }

    // Step 2: extract individual segments, group by cutting length
    const allSegments = this.preprocessor.extractAllSegmentsForGreedy(diaRequests);
    const pieceTypes = this.groupByLength(allSegments);

    console.log(
      `[BoundedKnapsack] Dia ${dia}: ${allSegments.length} segments, ` +
      `${pieceTypes.length} unique lengths`
    );

    // Available waste pieces for this dia (sorted largest first)
    const availableWaste = wastePieces
      ? [...wastePieces].filter(w => w.dia === dia).sort((a, b) => b.length - a.length)
      : [];

    // ── Step 3: bar-by-bar knapsack loop ─────────────────────────────────
    const bins: CompletedBin[] = [];

    while (this.hasRemaining(pieceTypes)) {
      // Deadline guard
      if (performance.now() > deadline) {
        console.warn(`[BoundedKnapsack] Time budget exceeded, packing remaining 1-per-bar`);
        break;
      }

      // 3a. Choose bar source: try a waste piece first, else new 12m bar
      let barLengthMm = this.STANDARD_LENGTH_MM;
      let usedWastePiece: WastePiece | undefined;

      for (let wi = 0; wi < availableWaste.length; wi++) {
        const wp = availableWaste[wi];
        // Can at least one remaining piece fit in this waste piece?
        if (pieceTypes.some(pt => pt.remaining > 0 && pt.lengthMm <= wp.length)) {
          barLengthMm = wp.length;
          usedWastePiece = wp;
          availableWaste.splice(wi, 1);
          break;
        }
      }

      // 3b. Build DP table for this bar
      const best = this.knapsackOnBar(pieceTypes, barLengthMm);

      if (!best || best.totalLength === 0) {
        // Safety: nothing fits (shouldn't happen), prevent infinite loop
        console.warn(`[BoundedKnapsack] Nothing fits on ${barLengthMm}mm bar, breaking`);
        break;
      }

      // 3c. Record cuts, subtract used pieces
      const binCuts: CompletedBin["cuts"] = [];
      for (const chosen of best.pieces) {
        const pt = pieceTypes.find(p => p.lengthMm === chosen.lengthMm);
        if (pt) {
          pt.remaining -= chosen.count;
          binCuts.push({ pieceType: pt, count: chosen.count });
        }
      }

      // 3d. Record wastage
      bins.push({
        cuts: binCuts,
        usedMm: best.totalLength,
        wasteMm: barLengthMm - best.totalLength,
        barLengthMm,
        isWaste: !!usedWastePiece,
        wasteSource: usedWastePiece,
      });
    }

    // Fallback for pieces remaining after deadline
    for (const pt of pieceTypes) {
      while (pt.remaining > 0) {
        bins.push({
          cuts: [{ pieceType: pt, count: 1 }],
          usedMm: pt.lengthMm,
          wasteMm: this.STANDARD_LENGTH_MM - pt.lengthMm,
          barLengthMm: this.STANDARD_LENGTH_MM,
          isWaste: false,
        });
        pt.remaining--;
      }
    }

    console.log(`[BoundedKnapsack] Packed ${allSegments.length} segments into ${bins.length} bars`);

    // ── Convert to CuttingStockResult ────────────────────────────────────
    const patterns = this.binsToPatterns(bins);
    const detailedCuts = this.generateDetailedCuts(bins, allSegments);
    const summary = this.calculateSummary(bins, allSegments.length);
    const executionTime = performance.now() - startTime;

    return {
      algorithm: "dynamic",
      dia,
      patterns,
      totalBarsUsed: bins.length,
      totalWaste: summary.totalWasteLength,
      averageUtilization: summary.averageUtilization,
      executionTime,
      summary,
      detailedCuts,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  CORE: Bounded Knapsack DP for ONE bar
  // ═══════════════════════════════════════════════════════════════════════
  //
  // Exact match to the C# DP logic:
  //   dp[0] = []
  //   FOR each piece type (P, C):
  //     currentDp = copy(dp)
  //     FOR each state S in dp:
  //       FOR count = 1..C:
  //         newLen = S + P*count
  //         IF newLen > barLength: BREAK
  //         IF newLen not in currentDp OR fewer pieces: update
  //     dp = currentDp
  //   bestLength = max(dp.keys where ≤ barLength)
  //   return dp[bestLength]

  private knapsackOnBar(pieceTypes: PieceType[], barLengthMm: number): DPEntry | null {
    let dp = new Map<number, DPEntry>();
    dp.set(0, { pieces: [], totalLength: 0 });

    for (const pt of pieceTypes) {
      if (pt.remaining <= 0) continue;

      // Copy dp → currentDp  (C#: "Copy dp → currentDp")
      const currentDp = new Map(dp);

      // FOR each existing state S in dp
      for (const [stateLen, stateEntry] of dp) {
        // FOR count = 1 to C
        for (let count = 1; count <= pt.remaining; count++) {
          const newLen = stateLen + pt.lengthMm * count;

          // IF newLength > barLength: BREAK
          if (newLen > barLengthMm) break;

          // IF newLength not in currentDp OR currentDp[newLength] has more pieces
          const existing = currentDp.get(newLen);
          if (!existing || this.countPieces(existing) > this.countPieces(stateEntry) + count) {
            // currentDp[newLength] = dp[S] + [P repeated 'count' times]
            const newPieces = stateEntry.pieces.map(p => ({ ...p }));
            const samePiece = newPieces.find(p => p.lengthMm === pt.lengthMm);
            if (samePiece) {
              samePiece.count += count;
            } else {
              newPieces.push({ lengthMm: pt.lengthMm, count });
            }
            currentDp.set(newLen, { pieces: newPieces, totalLength: newLen });
          }
        }
      }

      // dp = currentDp
      dp = currentDp;
    }

    // bestLength = MAX key in dp where key ≤ barLength
    let bestLen = 0;
    for (const key of dp.keys()) {
      if (key <= barLengthMm && key > bestLen) {
        bestLen = key;
      }
    }

    return bestLen > 0 ? (dp.get(bestLen) ?? null) : null;
  }

  private countPieces(entry: DPEntry): number {
    return entry.pieces.reduce((sum, p) => sum + p.count, 0);
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  OUTPUT CONVERSION
  // ═══════════════════════════════════════════════════════════════════════

  private groupByLength(segments: BarSegment[]): PieceType[] {
    const map = new Map<number, PieceType>();
    for (const seg of segments) {
      const mm = Math.round(seg.length * 1000);
      let pt = map.get(mm);
      if (!pt) {
        pt = { lengthMm: mm, lengthM: seg.length, remaining: 0, segments: [] };
        map.set(mm, pt);
      }
      pt.remaining++;
      pt.segments.push(seg);
    }
    // Sort descending by length (largest pieces first — better DP coverage)
    return Array.from(map.values()).sort((a, b) => b.lengthMm - a.lengthMm);
  }

  private hasRemaining(pts: PieceType[]): boolean {
    return pts.some(p => p.remaining > 0);
  }

  private binsToPatterns(bins: CompletedBin[]): CuttingPattern[] {
    return bins.map((bin, index) => {
      const cuts: PatternCut[] = bin.cuts.map(c => ({
        segmentId: c.pieceType.segments[0]?.segmentId || `seg_${c.pieceType.lengthMm}`,
        parentBarCode: c.pieceType.segments[0]?.parentBarCode || "",
        length: c.pieceType.lengthM,
        count: c.count,
        segmentIndex: 0,
        lapLength: c.pieceType.segments[0]?.lapLength || 0,
      }));

      const barLengthM = bin.barLengthMm / 1000;

      return {
        id: bin.isWaste ? `waste_pattern_${index + 1}` : `knapsack_pattern_${index + 1}`,
        cuts,
        waste: bin.wasteMm / 1000,
        utilization: barLengthM > 0 ? ((bin.usedMm / 1000) / barLengthM) * 100 : 0,
        standardBarLength: barLengthM,
      };
    });
  }

  private generateDetailedCuts(bins: CompletedBin[], allSegments: BarSegment[]): DetailedCut[] {
    // Pool of segments to assign real bar-code metadata from
    const segmentPool = [...allSegments];

    return bins.map((bin, index) => {
      const cuts: CutInstruction[] = [];
      let position = 0;

      for (const c of bin.cuts) {
        for (let i = 0; i < c.count; i++) {
          // Find a matching segment from the pool by cutting length
          const segIdx = segmentPool.findIndex(
            s => Math.round(s.length * 1000) === c.pieceType.lengthMm
          );
          const seg = segIdx >= 0 ? segmentPool.splice(segIdx, 1)[0] : null;

          cuts.push({
            barCode: seg?.parentBarCode || `unknown_${c.pieceType.lengthMm}`,
            segmentId: seg?.segmentId || `seg_${c.pieceType.lengthMm}_${i}`,
            length: c.pieceType.lengthM,
            quantity: 1,
            position,
            segmentIndex: seg?.segmentIndex || 0,
            hasLap: (seg?.lapLength || 0) > 0,
            lapLength: seg?.lapLength || 0,
          });
          position += c.pieceType.lengthM;
        }
      }

      const barLengthM = bin.barLengthMm / 1000;

      return {
        patternId: bin.isWaste ? `waste_pattern_${index + 1}` : `knapsack_pattern_${index + 1}`,
        barNumber: index + 1,
        cuts,
        waste: bin.wasteMm / 1000,
        utilization: barLengthM > 0 ? ((bin.usedMm / 1000) / barLengthM) * 100 : 0,
        isFromWaste: bin.isWaste,
        wasteSource: bin.wasteSource
          ? {
              wasteId: bin.wasteSource.id,
              sourceSheetId: bin.wasteSource.sourceSheetId,
              sourceSheetNumber: bin.wasteSource.sourceSheetNumber,
              sourceBarNumber: bin.wasteSource.sourceBarNumber,
              originalLength: bin.wasteSource.length,
            }
          : undefined,
      };
    });
  }

  private calculateSummary(bins: CompletedBin[], totalCuts: number) {
    const totalBars = bins.length;
    const newBars = bins.filter(b => !b.isWaste).length;
    const wasteBars = bins.filter(b => b.isWaste).length;

    const totalWasteM = bins.reduce((s, b) => s + b.wasteMm, 0) / 1000;

    // Total material purchased (meters)
    const totalMaterialM = bins.reduce((s, b) => s + b.barLengthMm / 1000, 0);

    const avgUtilization = totalBars > 0
      ? bins.reduce((s, b) => {
          const barM = b.barLengthMm / 1000;
          return s + ((b.usedMm / 1000) / barM) * 100;
        }, 0) / totalBars
      : 0;

    // Reusable waste — offcuts >= 1m from new bars only
    const WASTE_MIN_MM = 1000;
    const reusableOffcuts = bins.filter(b => !b.isWaste && b.wasteMm >= WASTE_MIN_MM);
    const reusableWasteM = reusableOffcuts.reduce((s, b) => s + b.wasteMm / 1000, 0);
    const largestOffcutM = bins.reduce((m, b) => Math.max(m, b.wasteMm / 1000), 0);

    return {
      totalStandardBars: totalBars,
      newBarsUsed: newBars,
      wastePiecesReused: wasteBars,
      totalWasteLength: Math.round(totalWasteM * 1000) / 1000,
      totalWastePercentage: totalMaterialM > 0
        ? Math.round((totalWasteM / totalMaterialM) * 10000) / 100
        : 0,
      averageUtilization: Math.round(avgUtilization * 100) / 100,
      patternCount: totalBars,
      totalCutsProduced: totalCuts,
      reusablePieces: reusableOffcuts.length,
      reusableWasteLength: Math.round(reusableWasteM * 1000) / 1000,
      reusablePercentage: totalWasteM > 0
        ? Math.round((reusableWasteM / totalWasteM) * 10000) / 100
        : 0,
      largestOffcut: Math.round(largestOffcutM * 1000) / 1000,
    };
  }

  private createEmptyResult(dia: number, startTime: number): CuttingStockResult {
    return {
      algorithm: "dynamic",
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
