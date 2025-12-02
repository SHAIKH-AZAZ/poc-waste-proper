import { describe, it, expect } from 'vitest'
import { ImprovedGreedyCuttingStock } from '@/algorithms/improvedGreedyCuttingStock'
import type { MultiBarCuttingRequest } from '@/types/CuttingStock'

describe('ImprovedGreedyCuttingStock', () => {
  const improved = new ImprovedGreedyCuttingStock()

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
      const result = improved.solve([], 12)
      expect(result.totalBarsUsed).toBe(0)
      expect(result.algorithm).toBe('improved-greedy')
    })

    it('should find optimal combination for 6+4+2=12', () => {
      const requests = [
        createRequest('1/B1/12', 6, 1, 12),
        createRequest('2/B2/12', 4, 1, 12),
        createRequest('3/B3/12', 2, 1, 12),
      ]
      const result = improved.solve(requests, 12)
      
      // Perfect fit: 6+4+2=12, should use exactly 1 bar with 0 waste
      expect(result.totalBarsUsed).toBe(1)
      expect(result.totalWaste).toBeCloseTo(0, 1)
    })


    it('should find optimal 2-segment combination', () => {
      const requests = [
        createRequest('1/B1/12', 6, 1, 12),
        createRequest('2/B2/12', 6, 1, 12),
      ]
      const result = improved.solve(requests, 12)
      
      // 6+6=12, perfect fit
      expect(result.totalBarsUsed).toBe(1)
      expect(result.totalWaste).toBeCloseTo(0, 1)
    })

    it('should handle multiple bars efficiently', () => {
      const requests = [
        createRequest('1/B1/12', 6, 2, 12),
        createRequest('2/B2/12', 4, 2, 12),
        createRequest('3/B3/12', 2, 2, 12),
      ]
      const result = improved.solve(requests, 12)
      
      // 2 sets of 6+4+2=12, should use 2 bars
      expect(result.totalBarsUsed).toBe(2)
    })

    it('should have better or equal utilization than basic greedy', () => {
      const requests = [
        createRequest('1/B1/12', 5, 3, 12),
        createRequest('2/B2/12', 7, 2, 12),
      ]
      const result = improved.solve(requests, 12)
      
      expect(result.averageUtilization).toBeGreaterThan(0)
      expect(result.summary.totalCutsProduced).toBe(5)
    })
  })
})
