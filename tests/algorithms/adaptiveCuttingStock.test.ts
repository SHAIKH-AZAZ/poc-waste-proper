import { describe, it, expect } from 'vitest'
import { AdaptiveCuttingStock } from '@/algorithms/adaptiveCuttingStock'
import type { MultiBarCuttingRequest } from '@/types/CuttingStock'

describe('AdaptiveCuttingStock', () => {
  const adaptive = new AdaptiveCuttingStock()

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
    it('should return empty result for no requests', async () => {
      const results = await adaptive.solve([], 12)
      expect(results.length).toBe(1)
      expect(results[0].totalBarsUsed).toBe(0)
    })

    it('should auto-select algorithm for small dataset', async () => {
      const requests = [
        createRequest('1/B1/12', 6, 2, 12),
        createRequest('2/B2/12', 4, 1, 12),
      ]
      const results = await adaptive.solve(requests, 12)
      
      expect(results.length).toBeGreaterThan(0)
      expect(results[0].totalBarsUsed).toBeGreaterThan(0)
    })


    it('should return sorted results by quality', async () => {
      const requests = [
        createRequest('1/B1/12', 5, 3, 12),
        createRequest('2/B2/12', 7, 2, 12),
      ]
      const results = await adaptive.solve(requests, 12)
      
      // Results should be sorted by bars used (ascending)
      for (let i = 1; i < results.length; i++) {
        expect(results[i].totalBarsUsed).toBeGreaterThanOrEqual(results[i-1].totalBarsUsed)
      }
    })

    it('should handle different diameters', async () => {
      const requests = [
        createRequest('1/B1/12', 6, 1, 12),
        createRequest('2/B2/16', 6, 1, 16),
      ]
      
      const results12 = await adaptive.solve(requests, 12)
      const results16 = await adaptive.solve(requests, 16)
      
      expect(results12[0].dia).toBe(12)
      expect(results16[0].dia).toBe(16)
    })
  })

  describe('getAlgorithmComparison', () => {
    it('should compare algorithm results', async () => {
      const requests = [createRequest('1/B1/12', 6, 2, 12)]
      const results = await adaptive.solve(requests, 12)
      
      const comparison = adaptive.getAlgorithmComparison(results)
      
      expect(comparison.best).toBeDefined()
      expect(comparison.comparison.length).toBeGreaterThan(0)
      expect(comparison.recommendation).toBeTruthy()
    })

    it('should throw error for empty results', () => {
      expect(() => adaptive.getAlgorithmComparison([])).toThrow()
    })
  })
})
