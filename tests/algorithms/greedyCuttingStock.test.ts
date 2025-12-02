import { describe, it, expect } from 'vitest'
import { GreedyCuttingStock } from '@/algorithms/greedyCuttingStock'
import type { MultiBarCuttingRequest } from '@/types/CuttingStock'

describe('GreedyCuttingStock', () => {
  const greedy = new GreedyCuttingStock()

  const createRequest = (
    barCode: string,
    length: number,
    quantity: number,
    dia: number,
    lapLength: number = 0
  ): MultiBarCuttingRequest => ({
    barCode,
    originalLength: length,
    quantity,
    dia,
    element: 'Test',
    lapLength,
    isMultiBar: length > 12,
    subBarInfo: {
      subBarsRequired: length > 12 ? Math.ceil(length / 12) : 1,
      lapsRequired: length > 12 ? Math.ceil(length / 12) - 1 : 0,
      totalMaterialLength: length,
      segmentLengths: length > 12 ? [12, length - 12] : [length],
      lapPositions: [],
    },
    segments: [{
      segmentId: `${barCode}_seg_0`,
      parentBarCode: barCode,
      segmentIndex: 0,
      length: Math.min(length, 12),
      quantity,
      hasLapStart: false,
      hasLapEnd: false,
      effectiveLength: Math.min(length, 12),
      lapLength: 0,
    }],
  })

  describe('solve', () => {
    it('should return empty result for no requests', () => {
      const result = greedy.solve([], 12)
      
      expect(result.totalBarsUsed).toBe(0)
      expect(result.patterns.length).toBe(0)
      expect(result.algorithm).toBe('greedy')
    })


    it('should return empty result when no matching dia', () => {
      const requests = [createRequest('1/B1/12', 6, 2, 12)]
      const result = greedy.solve(requests, 16) // Different dia
      
      expect(result.totalBarsUsed).toBe(0)
    })

    it('should pack single segment efficiently', () => {
      const requests = [createRequest('1/B1/12', 6, 1, 12)]
      const result = greedy.solve(requests, 12)
      
      expect(result.totalBarsUsed).toBe(1)
      expect(result.dia).toBe(12)
    })

    it('should pack multiple segments into one bar when possible', () => {
      const requests = [
        createRequest('1/B1/12', 4, 1, 12),
        createRequest('2/B2/12', 4, 1, 12),
        createRequest('3/B3/12', 4, 1, 12),
      ]
      const result = greedy.solve(requests, 12)
      
      // 3 segments of 4m each = 12m total, should fit in 1 bar
      expect(result.totalBarsUsed).toBe(1)
    })

    it('should use multiple bars when segments exceed capacity', () => {
      const requests = [
        createRequest('1/B1/12', 7, 1, 12),
        createRequest('2/B2/12', 7, 1, 12),
      ]
      const result = greedy.solve(requests, 12)
      
      // 2 segments of 7m each = 14m total, needs 2 bars
      expect(result.totalBarsUsed).toBe(2)
    })

    it('should calculate utilization correctly', () => {
      const requests = [createRequest('1/B1/12', 6, 1, 12)]
      const result = greedy.solve(requests, 12)
      
      // 6m used out of 12m = 50% utilization
      expect(result.averageUtilization).toBeCloseTo(50, 0)
    })

    it('should calculate waste correctly', () => {
      const requests = [createRequest('1/B1/12', 10, 1, 12)]
      const result = greedy.solve(requests, 12)
      
      // 12m - 10m = 2m waste
      expect(result.totalWaste).toBeCloseTo(2, 1)
    })
  })
})
