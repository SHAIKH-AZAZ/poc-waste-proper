import type { BarCuttingRaw } from "@/types/BarCuttingRow";

/**
 * Validates if a row matches the BarCuttingRaw interface
 */
export function validateBarCuttingRow(row: unknown): row is BarCuttingRaw {
  if (!row || typeof row !== "object") return false;
  
  const obj = row as Record<string, unknown>;
  
  return (
    (typeof obj["SI no"] === "string" || typeof obj["SI no"] === "number") &&
    typeof obj["Label"] === "string" &&
    typeof obj["Dia"] === "number" &&
    typeof obj["Total Bars"] === "number" &&
    typeof obj["Cutting Length"] === "number" &&
    typeof obj["Lap Length"] === "number" &&
    typeof obj["No of lap"] === "number" &&
    typeof obj["Element"] === "string"
  );
}

/**
 * Validates an array of rows and returns only valid ones
 */
export function validateExcelData(data: unknown[]): BarCuttingRaw[] {
  return data.filter(validateBarCuttingRow);
}

/**
 * Formats numeric values according to interface specifications
 */
export function formatNumericValue(value: number, decimalPlaces: number = 0): number {
  if (isNaN(value)) return 0;
  return Math.round(value * Math.pow(10, decimalPlaces)) / Math.pow(10, decimalPlaces);
}

/**
 * Ensures data conforms to the exact interface structure
 */
export function enforceInterface(rawData: Record<string, unknown>[]): BarCuttingRaw[] {
  return rawData.map((row) => {
    const processedRow: BarCuttingRaw = {
      "SI no": (row["SI no"] || row["Sl no"] || row["SINo"] || "") as string | number,
      "Label": String(row["Label"] || row["label"] || "").trim(),
      "Dia": formatNumericValue(Number(row["Dia"] || 0)),
      "Total Bars": formatNumericValue(Number(row["Total Bars"] || 0)),
      "Cutting Length": formatNumericValue(Number(row["Cutting Length"] || 0), 3),
      "Lap Length": formatNumericValue(Number(row["Lap Length"] || 0), 3),
      "No of lap": formatNumericValue(Number(row["No of lap"] || 0)),
      "Element": String(row["Element"] || "").trim(),
    };

    return processedRow;
  });
}