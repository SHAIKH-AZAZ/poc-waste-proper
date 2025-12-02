import { describe, it, expect } from 'vitest'
import { CuttingStockPreprocessor } from '@/utils/cuttingStockPreprocessor'
import type { BarCuttingDisplay } from '@/types/BarCuttingRow'

describe('CuttingStockPreprocessor', () => {
  const preprocessor = new CuttingStockPreprocessor()

  const createDisplayData = (
    barCode: string,
    dia: number,
    totalBars: number,
    cuttingLength: number,
    lapLength: number = 0
  ): BarCuttingDisplay => ({
    BarCode: barCode,
    Dia: dia,
    'Total Bars': totalBars,
    'Cutting Length': cuttingLength,
    'Lap Length': lapLength,
    Element: 'Test',
  })

  describe('convertToCuttingRequests', () => {
    it('should convert display data to cutting requests', () => {
      const displayData = [createDisplayData('1/B1/12', 12, 2, 10, 0.5)]
      const requests = preprocessor.convertToCuttingRequests(displayData)
      
      expect(requests.length).toBe(1)
      expect(requests[0].barCode).toBe('1/B1/12')
      expect(requests[0].quantity).toBe(2)
      expect(requests[0].dia).toBe(12)
    })

    it('should identify multi-bar cuts', () => {
      const displayData = [createDisplayData('1/B1/12', 12, 1, 20, 0.5)]
      const requests = preprocessor.convertToCuttingRequests(displayData)
      
      expect(requests[0].isMultiBar).toBe(true)
      expect(requests[0].segments.length).toBeGreaterThan(1)
    })

    it('should identify single-bar cuts', () => {
      const displayData = [createDisplayData('1/B1/12', 12, 1, 10, 0)]
      const requests = preprocessor.convertToCuttingRequests(displayData)
      
      expect(requests[0].isMultiBar).toBe(false)
      expect(requests[0].segments.length).toBe(1)
    })
  })


  describe('filterByDia', () => {
    it('should filter requests by diameter', () => {
      const displayData = [
        createDisplayData('1/B1/12', 12, 1, 10),
        createDisplayData('2/B2/16', 16, 1, 10),
        createDisplayData('3/B3/12', 12, 1, 8),
      ]
      const requests = preprocessor.convertToCuttingRequests(displayData)
      const filtered = preprocessor.filterByDia(requests, 12)
      
      expect(filtered.length).toBe(2)
      expect(filtered.every(r => r.dia === 12)).toBe(true)
    })

    it('should return empty array when no matching dia', () => {
      const displayData = [createDisplayData('1/B1/12', 12, 1, 10)]
      const requests = preprocessor.convertToCuttingRequests(displayData)
      const filtered = preprocessor.filterByDia(requests, 20)
      
      expect(filtered.length).toBe(0)
    })
  })

  describe('extractAllSegments', () => {
    it('should expand segments by quantity', () => {
      const displayData = [createDisplayData('1/B1/12', 12, 3, 10)]
      const requests = preprocessor.convertToCuttingRequests(displayData)
      const segments = preprocessor.extractAllSegments(requests)
      
      // 3 quantity * 1 segment = 3 total segments
      expect(segments.length).toBe(3)
    })

    it('should handle multi-bar segments', () => {
      const displayData = [createDisplayData('1/B1/12', 12, 2, 20, 0.5)]
      const requests = preprocessor.convertToCuttingRequests(displayData)
      const segments = preprocessor.extractAllSegments(requests)
      
      // 2 quantity * 2 segments per bar = 4 total segments
      expect(segments.length).toBe(4)
    })
  })

  describe('estimateMinimumBars', () => {
    it('should estimate minimum bars needed', () => {
      const displayData = [createDisplayData('1/B1/12', 12, 1, 24, 0.5)]
      const requests = preprocessor.convertToCuttingRequests(displayData)
      const estimate = preprocessor.estimateMinimumBars(requests)
      
      expect(estimate).toBeGreaterThanOrEqual(2)
    })
  })
})
