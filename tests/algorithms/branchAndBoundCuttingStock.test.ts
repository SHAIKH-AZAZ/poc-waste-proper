import { describe, it, expect } from 'vitest'
import { BranchAndBoundCuttingStock } from '@/algorithms/branchAndBoundCuttingStock'
import type { MultiBarCuttingRequest } from '@/types/CuttingStock'

describe('BranchAndBoundCuttingStock', () => {
  const bb = new BranchAndBoundCuttingStock()

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
      const result = bb.solve([], 12)
      expect(result.totalBarsUsed).toBe(0)
      expect(result.algorithm).toBe('branch-and-bound')
    })

    it('should find optimal solution for small dataset', () => {
      const requests = [
        createRequest('1/B1/12', 6, 1, 12),
        createRequest('2/B2/12', 6, 1, 12),
      ]
      const result = bb.solve(requests, 12)
      
      // 6+6=12, optimal is 1 bar
      expect(result.totalBarsUsed).toBe(1)
    })


    it('should handle single segment', () => {
      const requests = [createRequest('1/B1/12', 8, 1, 12)]
      const result = bb.solve(requests, 12)
      
      expect(result.totalBarsUsed).toBe(1)
      expect(result.totalWaste).toBeCloseTo(4, 1)
    })

    it('should use heuristic for large datasets', () => {
      // Create a large dataset that triggers heuristic
      const requests = Array.from({ length: 10 }, (_, i) =>
        createRequest(`${i}/B${i}/12`, 3, 4, 12)
      )
      const result = bb.solve(requests, 12)
      
      expect(result.totalBarsUsed).toBeGreaterThan(0)
      expect(result.executionTime).toBeGreaterThanOrEqual(0)
    })

    it('should generate valid patterns', () => {
      const requests = [
        createRequest('1/B1/12', 4, 2, 12),
        createRequest('2/B2/12', 4, 1, 12),
      ]
      const result = bb.solve(requests, 12)
      
      expect(result.patterns.length).toBeGreaterThan(0)
      result.patterns.forEach(pattern => {
        expect(pattern.waste).toBeGreaterThanOrEqual(0)
        expect(pattern.utilization).toBeGreaterThan(0)
        expect(pattern.utilization).toBeLessThanOrEqual(100)
      })
    })
  })
})
