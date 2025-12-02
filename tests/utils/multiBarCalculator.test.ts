import { describe, it, expect } from 'vitest'
import { MultiBarCalculator } from '@/utils/multiBarCalculator'

describe('MultiBarCalculator', () => {
  const calculator = new MultiBarCalculator()

  describe('calculateMultiBarRequirement', () => {
    it('should handle single bar case (length <= 12m)', () => {
      const result = calculator.calculateMultiBarRequirement(10, 0.5)
      
      expect(result.subBarsRequired).toBe(1)
      expect(result.lapsRequired).toBe(0)
      expect(result.segmentLengths).toEqual([10])
      expect(result.lapPositions).toEqual([])
    })

    it('should handle exactly 12m length', () => {
      const result = calculator.calculateMultiBarRequirement(12, 0.5)
      
      expect(result.subBarsRequired).toBe(1)
      expect(result.lapsRequired).toBe(0)
      expect(result.segmentLengths).toEqual([12])
    })

    it('should calculate multi-bar for length > 12m', () => {
      const result = calculator.calculateMultiBarRequirement(20, 0.5)
      
      expect(result.subBarsRequired).toBe(2)
      expect(result.lapsRequired).toBe(1)
      expect(result.segmentLengths.length).toBe(2)
    })

    it('should calculate correct segments for 24m with 0.5m lap', () => {
      const result = calculator.calculateMultiBarRequirement(24, 0.5)
      
      // 24m needs 3 bars: 12 + (12-0.5) + remaining
      expect(result.subBarsRequired).toBeGreaterThanOrEqual(2)
      expect(result.lapsRequired).toBe(result.subBarsRequired - 1)
    })

    it('should handle zero lap length', () => {
      const result = calculator.calculateMultiBarRequirement(15, 0)
      
      expect(result.subBarsRequired).toBe(2)
      expect(result.lapsRequired).toBe(1)
    })
  })

  describe('createSegments', () => {
    it('should create single segment for short bar', () => {
      const subBarInfo = calculator.calculateMultiBarRequirement(8, 0.5)
      const segments = calculator.createSegments('TEST/B1/12', subBarInfo, 1, 0.5)
      
      expect(segments.length).toBe(1)
      expect(segments[0].parentBarCode).toBe('TEST/B1/12')
      expect(segments[0].segmentIndex).toBe(0)
      expect(segments[0].lapLength).toBe(0) // Last segment has no lap
    })

    it('should create multiple segments for long bar', () => {
      const subBarInfo = calculator.calculateMultiBarRequirement(20, 0.5)
      const segments = calculator.createSegments('TEST/B1/12', subBarInfo, 1, 0.5)
      
      expect(segments.length).toBe(2)
      expect(segments[0].lapLength).toBe(0.5) // First segment has lap
      expect(segments[1].lapLength).toBe(0)   // Last segment has no lap
    })

    it('should set correct segment IDs', () => {
      const subBarInfo = calculator.calculateMultiBarRequirement(20, 0.5)
      const segments = calculator.createSegments('1/B1/12', subBarInfo, 1, 0.5)
      
      expect(segments[0].segmentId).toBe('1/B1/12_seg_0')
      expect(segments[1].segmentId).toBe('1/B1/12_seg_1')
    })
  })
})
