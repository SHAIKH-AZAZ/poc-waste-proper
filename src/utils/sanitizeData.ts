import type { BarCuttingRaw } from "@/types/BarCuttingRow";

export function sanitizeExcelData(rawData: any[]): BarCuttingRaw[] {
  return rawData
    .map((row) => {
      const sINo = Number(row["Sl no"]);
      const dia = Number(row["Dia"]);
      const totalBars = Number(row["Total Bars"]);
      const cuttingLength = Number(row["Cutting Length"]);
      const lapLength = Number(row["Lap Length"]);
      const noOfLap = Number(row["No of lap"]);
      const element = String(row["Element"] || "").trim();

      return {
        sINo,
        dia: isNaN(dia) ? 0 : dia,
        totalBars: isNaN(totalBars) ? 0 : totalBars,
        cuttingLength: isNaN(cuttingLength) ? 0 : cuttingLength,
        lapLength: isNaN(lapLength) ? 0 : lapLength,
        noOfLap: isNaN(noOfLap) ? 0 : noOfLap,
        element,
      };
    })
    .filter((row): row is BarCuttingRaw => row !== null);
}
