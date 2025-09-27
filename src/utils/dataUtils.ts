// dataUtils.ts
import { Dispatch, SetStateAction } from "react";

export function clearData(
  setParsedData: Dispatch<SetStateAction<any>>,
  setFileName: Dispatch<SetStateAction<string>>
): void {
  setParsedData(null);
  setFileName("");
}

/**
 * Downloads the provided data as a JSON file with the given filename.
 */
export function downloadResults(parsedData: any, fileName: string): void {
  if (!parsedData) return;
  const blob = new Blob([JSON.stringify(parsedData, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${fileName || "data"}.json`;
  link.click();
  URL.revokeObjectURL(url);
}
