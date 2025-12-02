import { describe, it, expect } from 'vitest'
import { TrueDynamicCuttingStock } from '@/algorithms/trueDynamicCuttingStock'
import type { MultiBarCuttingRequest } from '@/types/CuttingStock'

describe('TrueDynamicCuttingStock', () => {
  const dp = new TrueDynamicCuttingStock()

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
      const result = dp.solve([], 12)
      expect(result.totalBarsUsed).toBe(0)
      expect(result.algorithm).toBe('true-dynamic')
    })

    it('should find optimal solution for small dataset', () => {
      const requests = [
        createRequest('1/B1/12', 5, 2, 12),
        createRequest('2/B2/12', 7, 1, 12),
      ]
      const result = dp.solve(requests, 12)
      
      // 5+7=12 (1 bar), 5 alone (1 bar) = 2 bars optimal
      expect(result.totalBarsUsed).toBe(2)
    })


    it('should minimize total bars used', () => {
      const requests = [
        createRequest('1/B1/12', 4, 3, 12),
      ]
      const result = dp.solve(requests, 12)
      
      // 3 segments of 4m = 12m, fits in 1 bar
      expect(result.totalBarsUsed).toBe(1)
    })

    it('should handle single segment', () => {
      const requests = [createRequest('1/B1/12', 10, 1, 12)]
      const result = dp.solve(requests, 12)
      
      expect(result.totalBarsUsed).toBe(1)
      expect(result.totalWaste).toBeCloseTo(2, 1)
    })

    it('should track execution time', () => {
      const requests = [createRequest('1/B1/12', 6, 2, 12)]
      const result = dp.solve(requests, 12)
      
      expect(result.executionTime).toBeGreaterThanOrEqual(0)
    })

    it('should generate detailed cuts', () => {
      const requests = [createRequest('1/B1/12', 6, 1, 12)]
      const result = dp.solve(requests, 12)
      
      expect(result.detailedCuts.length).toBeGreaterThan(0)
      expect(result.detailedCuts[0].cuts.length).toBeGreaterThan(0)
    })
  })
})
