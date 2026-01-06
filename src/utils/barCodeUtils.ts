import type { BarCuttingRaw, BarCuttingDisplay } from "@/types/BarCuttingRow";

/**
 * Generates BarCode from SI no, Label, and Dia
 * Format: SI no/Label/Dia (e.g., "1/B1/12", "3/S1/16")
 */
export function generateBarCode(siNo: string | number, label: string, dia: number): string {
  const cleanSiNo = String(siNo).trim();
  const cleanLabel = String(label).trim();
  return `${cleanSiNo}/${cleanLabel}/${dia}`;
}

/**
 * Adds BarCode field to raw data
 */
export function addBarCodeToData(data: BarCuttingRaw[]): BarCuttingRaw[] {
  return data.map(row => ({
    ...row,
    "BarCode": generateBarCode(row["SI no"], row["Label"], row["Dia"])
  }));
}

/**
 * Transforms raw data to display format (removes SI no, Label, No of lap)
 */
export function transformToDisplayFormat(data: BarCuttingRaw[]): BarCuttingDisplay[] {
  return data.map(row => ({
    "BarCode": row["BarCode"] || generateBarCode(row["SI no"], row["Label"], row["Dia"]),
    "Dia": row["Dia"],
    "Total Bars": row["Total Bars"],
    "Cutting Length": row["Cutting Length"],
    "Lap Length": row["Lap Length"],
    "Element": row["Element"]
  }));
}

/**
 * Gets unique Dia values from display data
 */
export function getUniqueDiaFromDisplay(data: BarCuttingDisplay[]): number[] {
  const uniqueDias = new Set<number>();
  
  data.forEach(row => {
    if (row.Dia && row.Dia > 0) {
      uniqueDias.add(row.Dia);
    }
  });
  
  return Array.from(uniqueDias).sort((a, b) => a - b);
}

/**
 * Filters display data by Dia
 */
export function filterDisplayDataByDia(data: BarCuttingDisplay[], dia: number): BarCuttingDisplay[] {
  return data.filter(row => row.Dia === dia);
}

/**
 * Gets summary for display data
 * totalBars = sum of all "Total Bars" (repetitions)
 * totalCuttingLength = sum of (Total Bars × Cutting Length) for each row
 * totalLapLength = sum of (Total Bars × Lap Length) for each row
 */
export function getDisplayDiaSummary(data: BarCuttingDisplay[], dia: number) {
  const filteredData = filterDisplayDataByDia(data, dia);
  
  const totalBars = filteredData.reduce((sum, row) => sum + (row["Total Bars"] || 0), 0);
  const totalCuttingLength = filteredData.reduce((sum, row) => {
    const bars = row["Total Bars"] || 0;
    const cuttingLength = row["Cutting Length"] || 0;
    return sum + (bars * cuttingLength);
  }, 0);
  const totalLapLength = filteredData.reduce((sum, row) => {
    const bars = row["Total Bars"] || 0;
    const lapLength = row["Lap Length"] || 0;
    return sum + (bars * lapLength);
  }, 0);
  
  return {
    rowCount: filteredData.length,
    totalBars,
    totalCuttingLength: Math.round(totalCuttingLength * 1000) / 1000,
    totalLapLength: Math.round(totalLapLength * 1000) / 1000,
  };
}