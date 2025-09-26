import * as XLSX from "xlsx";

interface ExcelRow {
  [key: string]: string | number | boolean | null;
}

export const parseExcelFile = async (file: File): Promise<ExcelRow[]> => {
  return new Promise((resolve, rejects) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const Workbook = XLSX.read(data, { type: "array" });

        // get first sheet
        const sheetName = Workbook.SheetNames[0];
        const sheet = Workbook.Sheets[sheetName];

        // convert into json
        const jsonData = XLSX.utils.sheet_to_json(sheet, {
          defval: "",
        }) as ExcelRow[];
        resolve(jsonData);
      } catch (err) {
        rejects(err);
      }
    };
    reader.onerror = (err) => rejects(err);
    reader.readAsArrayBuffer(file);
  });
};
