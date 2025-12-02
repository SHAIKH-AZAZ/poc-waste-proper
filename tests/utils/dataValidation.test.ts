import { describe, it, expect } from 'vitest'
import {
  validateBarCuttingRow,
  formatNumericValue,
  enforceInterface,
} from '@/utils/dataValidation'

describe('dataValidation', () => {
  describe('validateBarCuttingRow', () => {
    it('should validate correct row', () => {
      const validRow = {
        'SI no': 1,
        'Label': 'B1',
        'Dia': 12,
        'Total Bars': 5,
        'Cutting Length': 10.5,
        'Lap Length': 0.5,
        'No of lap': 1,
        'Element': 'Beam',
        'BarCode': '1/B1/12',
      }
      expect(validateBarCuttingRow(validRow)).toBe(true)
    })

    it('should reject null', () => {
      expect(validateBarCuttingRow(null)).toBe(false)
    })

    it('should reject undefined', () => {
      expect(validateBarCuttingRow(undefined)).toBe(false)
    })

    it('should reject row with missing fields', () => {
      const invalidRow = {
        'SI no': 1,
        'Label': 'B1',
      }
      expect(validateBarCuttingRow(invalidRow)).toBe(false)
    })

    it('should reject row with wrong types', () => {
      const invalidRow = {
        'SI no': 1,
        'Label': 123, // Should be string
        'Dia': 12,
        'Total Bars': 5,
        'Cutting Length': 10.5,
        'Lap Length': 0.5,
        'No of lap': 1,
        'Element': 'Beam',
        'BarCode': '1/B1/12',
      }
      expect(validateBarCuttingRow(invalidRow)).toBe(false)
    })
  })


  describe('formatNumericValue', () => {
    it('should format integer values', () => {
      expect(formatNumericValue(10.7, 0)).toBe(11)
      expect(formatNumericValue(10.3, 0)).toBe(10)
    })

    it('should format decimal values', () => {
      expect(formatNumericValue(10.567, 2)).toBe(10.57)
      expect(formatNumericValue(10.123, 3)).toBe(10.123)
    })

    it('should handle NaN', () => {
      expect(formatNumericValue(NaN, 2)).toBe(0)
    })
  })

  describe('enforceInterface', () => {
    it('should enforce interface structure', () => {
      const rawData = [{
        'SI no': 1,
        'Label': 'B1',
        'Dia': 12,
        'Total Bars': 5,
        'Cutting Length': 10.5678,
        'Lap Length': 0.5123,
        'No of lap': 1,
        'Element': 'Beam',
      }]

      const result = enforceInterface(rawData)
      
      expect(result[0]['Cutting Length']).toBe(10.568)
      expect(result[0]['Lap Length']).toBe(0.512)
      expect(result[0].BarCode).toBe('1/B1/12')
    })

    it('should handle alternative field names', () => {
      const rawData = [{
        'Sl no': 2,
        'Label': 'S1',
        'Dia': 16,
        'Total Bars': 3,
        'Cutting Length': 8,
        'Lap Length': 0,
        'No of lap': 0,
        'Element': 'Slab',
      }]

      const result = enforceInterface(rawData)
      expect(result[0]['SI no']).toBe(2)
    })

    it('should handle missing values with defaults', () => {
      const rawData = [{}]
      const result = enforceInterface(rawData)
      
      expect(result[0]['Total Bars']).toBe(0)
      expect(result[0]['Cutting Length']).toBe(0)
    })
  })
})
