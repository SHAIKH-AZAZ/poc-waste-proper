import type { BarCuttingRaw } from "@/types/BarCuttingRow";

/**
 * Gets unique Dia values from the dataset
 */
export function getUniqueDiaValues(data: BarCuttingRaw[]): number[] {
  const uniqueDias = new Set<number>();
  
  data.forEach(row => {
    if (row.Dia && row.Dia > 0) {
      uniqueDias.add(row.Dia);
    }
  });
  
  return Array.from(uniqueDias).sort((a, b) => a - b);
}

/**
 * Filters data by specific Dia value
 */
export function filterDataByDia(data: BarCuttingRaw[], dia: number): BarCuttingRaw[] {
  return data.filter(row => row.Dia === dia);
}

/**
 * Gets summary statistics for a specific Dia
 */
export function getDiaSummary(data: BarCuttingRaw[], dia: number) {
  const filteredData = filterDataByDia(data, dia);
  
  const totalBars = filteredData.reduce((sum, row) => sum + (row["Total Bars"] || 0), 0);
  const totalCuttingLength = filteredData.reduce((sum, row) => sum + (row["Cutting Length"] || 0), 0);
  const totalLapLength = filteredData.reduce((sum, row) => sum + (row["Lap Length"] || 0), 0);
  
  return {
    rowCount: filteredData.length,
    totalBars,
    totalCuttingLength: Math.round(totalCuttingLength * 1000) / 1000,
    totalLapLength: Math.round(totalLapLength * 1000) / 1000,
  };
}