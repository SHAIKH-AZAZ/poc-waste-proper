import type { BarCuttingRaw } from "@/types/BarCuttingRow";
import { generateBarCode } from "./barCodeUtils";

export function sanitizeExcelData(rawData: Record<string, unknown>[]): BarCuttingRaw[] {
  return rawData
    .map((row) => {
      // Handle SI no as string or number
      const siNo = row["SI no"] || row["Sl no"] || row["SINo"] || row["S.No"];
      
      // Parse numeric values
      const dia = Number(row["Dia"] || row["dia"] || 0);
      const totalBars = Number(row["Total Bars"] || row["total bars"] || 0);
      const cuttingLength = Number(row["Cutting Length"] || row["cutting length"] || 0);
      const lapLength = Number(row["Lap Length"] || row["lap length"] || 0);
      const noOfLap = Number(row["No of lap"] || row["no of lap"] || 0);
      
      // Handle label and element as strings
      const label = String(row["Label"] || row["label"] || "").trim();
      const element = String(row["Element"] || row["element"] || "").trim();

      // Validate required fields
      if (!siNo || isNaN(dia) || isNaN(totalBars)) {
        return null; // Skip invalid rows
      }

      const processedDia = isNaN(dia) ? 0 : Math.round(dia);
      
      return {
        "SI no": siNo,
        "Label": label,
        "Dia": processedDia,
        "Total Bars": isNaN(totalBars) ? 0 : Math.round(totalBars),
        "Cutting Length": isNaN(cuttingLength) ? 0 : Math.round(cuttingLength * 1000) / 1000, // Round to 3 decimal places
        "Lap Length": isNaN(lapLength) ? 0 : Math.round(lapLength * 1000) / 1000, // Round to 3 decimal places
        "No of lap": isNaN(noOfLap) ? 0 : Math.round(noOfLap),
        "Element": element,
        "BarCode": generateBarCode(siNo, label, processedDia), // Generate BarCode
      };
    })
    .filter((row): row is BarCuttingRaw => row !== null);
}
