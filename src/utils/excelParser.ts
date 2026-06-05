import ExcelJS from "exceljs";

interface ExcelRow {
  [key: string]: string | number | boolean | null;
}

function worksheetToJson(worksheet: ExcelJS.Worksheet): ExcelRow[] {
  const headers: string[] = [];
  worksheet.getRow(1).eachCell({ includeEmpty: true }, (cell, col) => {
    headers[col - 1] = String(cell.value ?? "");
  });

  const rows: ExcelRow[] = [];
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const obj: ExcelRow = {};
    headers.forEach((header, i) => {
      if (!header) return;
      const cell = row.getCell(i + 1);
      const v = cell.value;
      if (v === null || v === undefined) obj[header] = "";
      else if (typeof v === "object" && "richText" in v)
        obj[header] = (v as ExcelJS.CellRichTextValue).richText.map((r) => r.text).join("");
      else if (typeof v === "object" && "result" in v)
        obj[header] = (v as ExcelJS.CellFormulaValue).result as string | number | boolean;
      else if (v instanceof Date) obj[header] = v.toISOString();
      else obj[header] = v as string | number | boolean;
    });
    rows.push(obj);
  });
  return rows;
}

export const parseExcelFile = async (file: File): Promise<ExcelRow[]> => {
  const arrayBuffer = await file.arrayBuffer();
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(arrayBuffer);
  return worksheetToJson(workbook.worksheets[0]);
};
