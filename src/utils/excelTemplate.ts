import type { BarCuttingRaw } from "@/types/BarCuttingRow";

/**
 * Expected Excel column headers and their data types
 */
export const EXPECTED_HEADERS = {
  "SI no": "string | number",
  "Label": "string",
  "Dia": "number",
  "Total Bars": "number", 
  "Cutting Length": "float (3 decimal places)",
  "Lap Length": "float (3 decimal places)",
  "No of lap": "number",
  "Element": "string"
} as const;

/**
 * Sample data for Excel template
 */
export const SAMPLE_DATA: BarCuttingRaw[] = [
  {
    "SI no": "1",
    "Label": "Main Bar",
    "Dia": 12,
    "Total Bars": 50,
    "Cutting Length": 5.750,
    "Lap Length": 0.480,
    "No of lap": 2,
    "Element": "Column"
  },
  {
    "SI no": "2", 
    "Label": "Stirrup",
    "Dia": 16,
    "Total Bars": 30,
    "Cutting Length": 4.200,
    "Lap Length": 0.640,
    "No of lap": 1,
    "Element": "Beam"
  },
  {
    "SI no": "3",
    "Label": "Distribution Bar",
    "Dia": 10,
    "Total Bars": 75,
    "Cutting Length": 3.150,
    "Lap Length": 0.400,
    "No of lap": 3,
    "Element": "Slab"
  }
];

/**
 * Validates if Excel headers match expected format
 */
export function validateHeaders(headers: string[]): { isValid: boolean; missing: string[]; extra: string[] } {
  const expectedHeaders = Object.keys(EXPECTED_HEADERS);
  const missing = expectedHeaders.filter(header => !headers.includes(header));
  const extra = headers.filter(header => !expectedHeaders.includes(header));
  
  return {
    isValid: missing.length === 0,
    missing,
    extra
  };
}

/**
 * Gets user-friendly error message for header validation
 */
export function getHeaderValidationMessage(validation: ReturnType<typeof validateHeaders>): string {
  if (validation.isValid) return "Headers are valid";
  
  let message = "Excel headers don't match expected format.\n";
  
  if (validation.missing.length > 0) {
    message += `Missing columns: ${validation.missing.join(", ")}\n`;
  }
  
  if (validation.extra.length > 0) {
    message += `Unexpected columns: ${validation.extra.join(", ")}\n`;
  }
  
  message += `Expected columns: ${Object.keys(EXPECTED_HEADERS).join(", ")}`;
  
  return message;
}