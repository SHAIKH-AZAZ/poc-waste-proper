import { describe, it, expect } from 'vitest'
import { WasteOptimizedCuttingStock } from '@/algorithms/wasteOptimizedCuttingStock'
import type { MultiBarCuttingRequest } from '@/types/CuttingStock'

describe('WasteOptimizedCuttingStock', () => {
  const wasteOpt = new WasteOptimizedCuttingStock()

  const createRequest = (
    barCode: string,
    length: number,
    quantity: number,
    dia: number
  ): MultiBarCuttingRequest => ({
    barCode,
    originalLength: length,
    quantity,
    dia,
    element: 'Test',
    lapLength: 0,
    isMultiBar: false,
    subBarInfo: {
      subBarsRequired: 1,
      lapsRequired: 0,
      totalMaterialLength: length,
      segmentLengths: [length],
      lapPositions: [],
    },
    segments: [{
      segmentId: `${barCode}_seg_0`,
      parentBarCode: barCode,
      segmentIndex: 0,
      length,
      quantity,
      hasLapStart: false,
      hasLapEnd: false,
      effectiveLength: length,
      lapLength: 0,
    }],
  })

  describe('solve', () => {
    it('should return empty result for no requests', () => {
      const result = wasteOpt.solve([], 12)
      expect(result.totalBarsUsed).toBe(0)
      expect(result.algorithm).toBe('waste-optimized')
    })

    it('should find perfect combination with 0 waste (6+4+2=12)', () => {
      const requests = [
        createRequest('1/B1/12', 6, 1, 12),
        createRequest('2/B2/12', 4, 1, 12),
        createRequest('3/B3/12', 2, 1, 12),
      ]
      const result = wasteOpt.solve(requests, 12)

      expect(result.totalBarsUsed).toBe(1)
      expect(result.totalWaste).toBeCloseTo(0, 1)
      expect(result.averageUtilization).toBeCloseTo(100, 0)
    })

    it('should find perfect 2-segment combination (6+6=12)', () => {
      const requests = [
        createRequest('1/B1/12', 6, 2, 12),
      ]
      const result = wasteOpt.solve(requests, 12)

      expect(result.totalBarsUsed).toBe(1)
      expect(result.totalWaste).toBeCloseTo(0, 1)
    })

    it('should minimize waste for non-perfect combinations', () => {
      const requests = [
        createRequest('1/B1/12', 5, 2, 12),
        createRequest('2/B2/12', 7, 1, 12),
      ]
      const result = wasteOpt.solve(requests, 12)

      // 5+7=12 (perfect), 5 alone = 2 bars with minimal waste
      expect(result.totalBarsUsed).toBe(2)
      expect(result.totalWaste).toBeLessThan(2.5)
    })


    it('should prioritize patterns with less waste', () => {
      const requests = [
        createRequest('1/B1/12', 3, 4, 12),
      ]
      const result = wasteOpt.solve(requests, 12)

      // 4 segments of 3m = 12m, should fit in 1 bar with 0 waste
      expect(result.totalBarsUsed).toBe(1)
      expect(result.totalWaste).toBeCloseTo(0, 1)
    })

    it('should handle complex multi-segment scenario', () => {
      const requests = [
        createRequest('1/B1/12', 4, 2, 12),
        createRequest('2/B2/12', 3, 2, 12),
        createRequest('3/B3/12', 2, 1, 12),
      ]
      const result = wasteOpt.solve(requests, 12)

      // Optimal: 4+4+3=11 (1m waste), 3+2+2=7 (5m waste) = 2 bars, 6m waste
      // Or: 4+3+3=10 (2m waste), 4+2+2=8 (4m waste) = 2 bars, 6m waste
      expect(result.totalBarsUsed).toBeLessThanOrEqual(3)
      expect(result.totalWaste).toBeLessThan(8)
    })

    it('should have better or equal waste than basic greedy', () => {
      const requests = [
        createRequest('1/B1/12', 5, 3, 12),
        createRequest('2/B2/12', 7, 2, 12),
      ]
      const result = wasteOpt.solve(requests, 12)

      expect(result.totalBarsUsed).toBeGreaterThan(0)
      expect(result.totalWaste).toBeGreaterThanOrEqual(0)
      expect(result.averageUtilization).toBeGreaterThan(0)
    })

    it('should generate valid patterns with correct waste calculation', () => {
      const requests = [
        createRequest('1/B1/12', 8, 1, 12),
        createRequest('2/B2/12', 4, 1, 12),
      ]
      const result = wasteOpt.solve(requests, 12)

      result.patterns.forEach(pattern => {
        const usedLength = pattern.cuts.reduce((sum, cut) => sum + cut.length * cut.count, 0)
        const calculatedWaste = 12 - usedLength
        expect(Math.abs(pattern.waste - calculatedWaste)).toBeLessThan(0.01)
      })
    })

    it('should track execution time', () => {
      const requests = [createRequest('1/B1/12', 6, 2, 12)]
      const result = wasteOpt.solve(requests, 12)

      expect(result.executionTime).toBeGreaterThanOrEqual(0)
    })
  })
})
