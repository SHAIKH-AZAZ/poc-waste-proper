import { describe, it, expect } from 'vitest'
import {
  generateBarCode,
  addBarCodeToData,
  transformToDisplayFormat,
  getUniqueDiaFromDisplay,
  filterDisplayDataByDia,
} from '@/utils/barCodeUtils'
import type { BarCuttingRaw, BarCuttingDisplay } from '@/types/BarCuttingRow'

describe('barCodeUtils', () => {
  describe('generateBarCode', () => {
    it('should generate barcode from SI no, Label, and Dia', () => {
      expect(generateBarCode(1, 'B1', 12)).toBe('1/B1/12')
      expect(generateBarCode('3', 'S1', 16)).toBe('3/S1/16')
    })

    it('should handle string SI no', () => {
      expect(generateBarCode('10', 'A1', 20)).toBe('10/A1/20')
    })

    it('should trim whitespace', () => {
      expect(generateBarCode(' 1 ', ' B1 ', 12)).toBe('1/B1/12')
    })
  })

  describe('addBarCodeToData', () => {
    it('should add BarCode field to raw data', () => {
      const rawData: BarCuttingRaw[] = [{
        'SI no': 1,
        'Label': 'B1',
        'Dia': 12,
        'Total Bars': 5,
        'Cutting Length': 10.5,
        'Lap Length': 0.5,
        'No of lap': 0,
        'Element': 'Beam',
        'BarCode': ''
      }]

      const result = addBarCodeToData(rawData)
      expect(result[0].BarCode).toBe('1/B1/12')
    })
  })

  describe('transformToDisplayFormat', () => {
    it('should transform raw data to display format', () => {
      const rawData: BarCuttingRaw[] = [{
        'SI no': 1,
        'Label': 'B1',
        'Dia': 12,
        'Total Bars': 5,
        'Cutting Length': 10.5,
        'Lap Length': 0.5,
        'No of lap': 1,
        'Element': 'Beam',
        'BarCode': '1/B1/12'
      }]

      const result = transformToDisplayFormat(rawData)
      
      expect(result[0]).toEqual({
        'BarCode': '1/B1/12',
        'Dia': 12,
        'Total Bars': 5,
        'Cutting Length': 10.5,
        'Lap Length': 0.5,
        'Element': 'Beam'
      })
    })
  })

  describe('getUniqueDiaFromDisplay', () => {
    it('should return unique Dia values sorted', () => {
      const data: BarCuttingDisplay[] = [
        { BarCode: '1/B1/12', Dia: 12, 'Total Bars': 1, 'Cutting Length': 10, 'Lap Length': 0, Element: 'Beam' },
        { BarCode: '2/B2/16', Dia: 16, 'Total Bars': 1, 'Cutting Length': 10, 'Lap Length': 0, Element: 'Beam' },
        { BarCode: '3/B3/12', Dia: 12, 'Total Bars': 1, 'Cutting Length': 10, 'Lap Length': 0, Element: 'Beam' },
      ]

      const result = getUniqueDiaFromDisplay(data)
      expect(result).toEqual([12, 16])
    })
  })

  describe('filterDisplayDataByDia', () => {
    it('should filter data by Dia', () => {
      const data: BarCuttingDisplay[] = [
        { BarCode: '1/B1/12', Dia: 12, 'Total Bars': 1, 'Cutting Length': 10, 'Lap Length': 0, Element: 'Beam' },
        { BarCode: '2/B2/16', Dia: 16, 'Total Bars': 1, 'Cutting Length': 10, 'Lap Length': 0, Element: 'Beam' },
      ]

      const result = filterDisplayDataByDia(data, 12)
      expect(result.length).toBe(1)
      expect(result[0].Dia).toBe(12)
    })
  })
})
