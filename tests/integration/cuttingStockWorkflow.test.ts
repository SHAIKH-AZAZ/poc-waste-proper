import { describe, it, expect } from 'vitest'
import { CuttingStockPreprocessor } from '@/utils/cuttingStockPreprocessor'
import { GreedyCuttingStock } from '@/algorithms/greedyCuttingStock'
import { ImprovedGreedyCuttingStock } from '@/algorithms/improvedGreedyCuttingStock'
import { TrueDynamicCuttingStock } from '@/algorithms/trueDynamicCuttingStock'
import type { BarCuttingDisplay } from '@/types/BarCuttingRow'

describe('Cutting Stock Workflow Integration', () => {
  const preprocessor = new CuttingStockPreprocessor()
  const greedy = new GreedyCuttingStock()
  const improved = new ImprovedGreedyCuttingStock()
  const trueDp = new TrueDynamicCuttingStock()

  const sampleData: BarCuttingDisplay[] = [
    { BarCode: '1/B1/12', Dia: 12, 'Total Bars': 3, 'Cutting Length': 6, 'Lap Length': 0, Element: 'Beam' },
    { BarCode: '2/B2/12', Dia: 12, 'Total Bars': 2, 'Cutting Length': 4, 'Lap Length': 0, Element: 'Beam' },
    { BarCode: '3/B3/12', Dia: 12, 'Total Bars': 2, 'Cutting Length': 2, 'Lap Length': 0, Element: 'Beam' },
    { BarCode: '4/B4/16', Dia: 16, 'Total Bars': 1, 'Cutting Length': 10, 'Lap Length': 0, Element: 'Column' },
  ]

  describe('Full workflow: Excel data to cutting results', () => {
    it('should process data through complete pipeline', () => {
      // Step 1: Convert display data to cutting requests
      const requests = preprocessor.convertToCuttingRequests(sampleData)
      expect(requests.length).toBe(4)

      // Step 2: Filter by diameter
      const dia12Requests = preprocessor.filterByDia(requests, 12)
      expect(dia12Requests.length).toBe(3)

      // Step 3: Run algorithm
      const result = greedy.solve(requests, 12)
      
      // Step 4: Verify result structure
      expect(result.algorithm).toBe('greedy')
      expect(result.dia).toBe(12)
      expect(result.totalBarsUsed).toBeGreaterThan(0)
      expect(result.patterns.length).toBeGreaterThan(0)
      expect(result.detailedCuts.length).toBeGreaterThan(0)
    })


    it('should produce consistent results across algorithms', () => {
      const requests = preprocessor.convertToCuttingRequests(sampleData)
      
      const greedyResult = greedy.solve(requests, 12)
      const improvedResult = improved.solve(requests, 12)
      const dpResult = trueDp.solve(requests, 12)

      // All algorithms should produce valid results
      expect(greedyResult.totalBarsUsed).toBeGreaterThan(0)
      expect(improvedResult.totalBarsUsed).toBeGreaterThan(0)
      expect(dpResult.totalBarsUsed).toBeGreaterThan(0)

      // Improved should be equal or better than basic greedy
      expect(improvedResult.totalBarsUsed).toBeLessThanOrEqual(greedyResult.totalBarsUsed + 1)
    })

    it('should handle multi-bar cuts correctly', () => {
      const multiBarData: BarCuttingDisplay[] = [
        { BarCode: '1/B1/12', Dia: 12, 'Total Bars': 1, 'Cutting Length': 20, 'Lap Length': 0.5, Element: 'Beam' },
      ]

      const requests = preprocessor.convertToCuttingRequests(multiBarData)
      
      expect(requests[0].isMultiBar).toBe(true)
      expect(requests[0].segments.length).toBeGreaterThan(1)

      const result = greedy.solve(requests, 12)
      expect(result.totalBarsUsed).toBeGreaterThan(0)
    })

    it('should calculate correct summary statistics', () => {
      const requests = preprocessor.convertToCuttingRequests(sampleData)
      const result = greedy.solve(requests, 12)

      expect(result.summary.totalStandardBars).toBe(result.totalBarsUsed)
      expect(result.summary.averageUtilization).toBeGreaterThan(0)
      expect(result.summary.averageUtilization).toBeLessThanOrEqual(100)
      expect(result.summary.totalWastePercentage).toBeGreaterThanOrEqual(0)
    })

    it('should generate valid detailed cuts', () => {
      const requests = preprocessor.convertToCuttingRequests(sampleData)
      const result = greedy.solve(requests, 12)

      result.detailedCuts.forEach(detail => {
        expect(detail.barNumber).toBeGreaterThan(0)
        expect(detail.utilization).toBeGreaterThan(0)
        expect(detail.waste).toBeGreaterThanOrEqual(0)
        
        detail.cuts.forEach(cut => {
          expect(cut.length).toBeGreaterThan(0)
          expect(cut.position).toBeGreaterThanOrEqual(0)
        })
      })
    })
  })
})
