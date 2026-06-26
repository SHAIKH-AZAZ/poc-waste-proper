import * as XLSX from "xlsx-js-style";
import type {
  CutInstruction,
  CuttingStockResult,
  DetailedCut,
} from "@/types/CuttingStock";

interface VisualCuttingMethodSheetOptions {
  projectName: string;
  generatedAt?: Date;
}

interface VisualSegment {
  type: "cut" | "waste" | "recovered";
  label: string;
  length: number;
}

interface PatternGroup {
  key: string;
  firstBarNumber: number;
  repetition: number;
  barLength: number;
  sourceDescription: string;
  segments: VisualSegment[];
}

const CELL_WIDTH_PX = 210;
const SERIAL_COLUMN_WIDTH_PX = 60;
const START_COLUMN = 1; // Start visual content from Excel column B.
const BAR_CELL_START_COLUMN = START_COLUMN + 1;
const LEFT_MARGIN_WIDTH_PX = 24;
const DEFAULT_CUT_FILL = "FCD5B4";
const DIA_CUT_FILLS: Record<number, string> = {
  "8": "D5A6BD",
  "10": "B6D7A8",
  "12": "C9DAF8",
  "16": "FFE599",
  "20": "D9D2E9",
  "25": "D9B8F0",
  "32": "B7D7DB",
  "40": "F4CCCC",
};
const WASTE_FILL = "FFFFFF";
const RECOVERED_FILL = "B7E1CD";
const BORDER_COLOR = "000000";

const THIN_BLACK_BORDER = {
  top: { style: "thin", color: { rgb: BORDER_COLOR } },
  bottom: { style: "thin", color: { rgb: BORDER_COLOR } },
  left: { style: "thin", color: { rgb: BORDER_COLOR } },
  right: { style: "thin", color: { rgb: BORDER_COLOR } },
};

const META_STYLE = {
  font: { bold: true, sz: 12 },
  alignment: { vertical: "center", wrapText: true },
};

const TITLE_STYLE = {
  font: { bold: true, sz: 11 },
  alignment: { vertical: "center", wrapText: true },
};

const WASTE_STYLE = {
  fill: { patternType: "solid", fgColor: { rgb: WASTE_FILL } },
  border: THIN_BLACK_BORDER,
  alignment: { vertical: "top", wrapText: true },
};

const RECOVERED_STYLE = {
  fill: { patternType: "solid", fgColor: { rgb: RECOVERED_FILL } },
  border: THIN_BLACK_BORDER,
  font: { color: { rgb: "1A5C38" }, bold: true },
  alignment: { vertical: "top", wrapText: true },
};

export function createVisualCuttingMethodSheet(
  result: CuttingStockResult,
  options: VisualCuttingMethodSheetOptions,
): XLSX.WorkSheet {
  const groups = buildPatternGroups(result);
  const gridColumns = getGridColumnCount(groups);
  const worksheet: XLSX.WorkSheet = {};
  const cutStyle = createCutStyle(result.dia);

  setCell(
    worksheet,
    1,
    START_COLUMN + 1,
    `Project name: ${options.projectName}`,
    META_STYLE,
  );
  setCell(
    worksheet,
    2,
    START_COLUMN + 1,
    `Date: ${formatExportDate(options.generatedAt ?? new Date())}`,
    META_STYLE,
  );

  let row = 5;
  const segmentRows: { r: number; hasRecovered: boolean }[] = [];

  if (groups.length === 0) {
    setCell(
      worksheet,
      row,
      START_COLUMN,
      "No cutting patterns available",
      TITLE_STYLE,
    );
  }

  for (const group of groups) {
    setCell(worksheet, row, START_COLUMN, group.firstBarNumber, TITLE_STYLE);
    setCell(
      worksheet,
      row,
      START_COLUMN + 1,
      formatBarDescription(result.dia, group),
      TITLE_STYLE,
    );
    setCell(
      worksheet,
      row,
      START_COLUMN + 2,
      `${group.repetition} Repetition`,
      TITLE_STYLE,
    );
    row += 1;

    let col = BAR_CELL_START_COLUMN;
    let rowHasRecovered = false;

    group.segments.forEach((segment) => {
      let style: Record<string, any>;
      if (segment.type === "recovered") {
        style = RECOVERED_STYLE;
        rowHasRecovered = true;
      } else if (segment.type === "waste") {
        style = WASTE_STYLE;
      } else {
        style = cutStyle;
      }
      // Barcode on line 1, length on line 2. The line break only renders with
      // wrapText on; columns are wide enough that nothing wraps except this break.
      const text = `${segment.label}\n(${formatMeters(segment.length)} m)`;
      setCell(worksheet, row, col, text, style);
      col += 1;
    });

    segmentRows.push({ r: row, hasRecovered: rowHasRecovered });

    row += 3;
  }

  // Bar rows need enough height to show the 2-line (barcode / length) cells;
  // recovered cells add a 3rd line for the source sheet name.
  if (segmentRows.length > 0) {
    const rowList: XLSX.RowInfo[] = [];
    for (const { r, hasRecovered } of segmentRows) {
      rowList[r] = { hpt: hasRecovered ? 48 : 30 };
    }
    worksheet["!rows"] = rowList;
  }

  const dataColumnCount = Math.max(
    3,
    gridColumns + BAR_CELL_START_COLUMN - START_COLUMN,
  );
  worksheet["!cols"] = [
    { wpx: LEFT_MARGIN_WIDTH_PX },
    { wpx: SERIAL_COLUMN_WIDTH_PX },
    ...Array.from({ length: Math.max(0, dataColumnCount - 1) }, () => ({
      wpx: CELL_WIDTH_PX,
    })),
  ];
  worksheet["!ref"] = XLSX.utils.encode_range({
    s: { r: 0, c: 0 },
    e: {
      r: Math.max(row - 1, 5),
      c: START_COLUMN + dataColumnCount - 1,
    },
  });

  return worksheet;
}

export function getProjectNameFromFileName(fileName: string): string {
  const withoutPath = fileName.split(/[\\/]/).pop() ?? fileName;
  const withoutExtension = withoutPath.replace(/\.[^/.]+$/, "").trim();
  return withoutExtension || "Waste";
}

function buildPatternGroups(result: CuttingStockResult): PatternGroup[] {
  const groups: PatternGroup[] = [];
  const groupsByKey = new Map<string, PatternGroup>();

  result.detailedCuts.forEach((detail, index) => {
    const barLength = getBarLength(result, detail, index);
    const expandedCuts = expandCuts(detail.cuts);
    const usedLength = expandedCuts.reduce((sum, cut) => sum + cut.length, 0);
    const wasteLength = Math.max(0, roundValue(barLength - usedLength));
    const isFromWaste =
      detail.isFromWaste || detail.patternId?.startsWith("waste_") || false;
    const isWasteRecovered = (detail as any).isWasteRecovered === true;
    const usedInSheetName: string = (detail as any).usedInSheetName ?? "";
    const recoveredAmount: number = (detail as any).recoveredAmount ?? 0;

    const wasteSegments: VisualSegment[] = [];
    if (isWasteRecovered && recoveredAmount > 0) {
      const sheetLabel = usedInSheetName
        ? `RECOVERED\n→ ${usedInSheetName}`
        : "RECOVERED";
      wasteSegments.push({
        type: "recovered",
        label: sheetLabel,
        length: roundValue(recoveredAmount),
      });
      const remaining = Math.max(0, roundValue(wasteLength - recoveredAmount));
      if (remaining > 0.001) {
        wasteSegments.push({
          type: "waste",
          label: "Waste",
          length: remaining,
        });
      }
    } else {
      wasteSegments.push({
        type: "waste",
        label: "Waste",
        length: wasteLength,
      });
    }

    const segments: VisualSegment[] = [
      ...expandedCuts.map((cut) => ({
        type: "cut" as const,
        label: normalizeBarCode(cut.barCode),
        length: roundValue(cut.length),
      })),
      ...wasteSegments,
    ];
    const key = createGroupKey(isFromWaste, barLength, segments);
    const existing = groupsByKey.get(key);

    if (existing) {
      existing.repetition += 1;
      return;
    }

    const group: PatternGroup = {
      key,
      firstBarNumber: detail.barNumber,
      repetition: 1,
      barLength: roundValue(barLength),
      sourceDescription: getSourceDescription(detail),
      segments,
    };

    groupsByKey.set(key, group);
    groups.push(group);
  });

  return groups;
}

function expandCuts(cuts: CutInstruction[]): CutInstruction[] {
  const expanded: CutInstruction[] = [];

  for (const cut of [...cuts].sort((a, b) => a.position - b.position)) {
    const quantity = Math.max(1, cut.quantity || 1);
    for (let i = 0; i < quantity; i++) {
      expanded.push(cut);
    }
  }

  return expanded;
}

function getBarLength(
  result: CuttingStockResult,
  detail: DetailedCut,
  index: number,
): number {
  if (detail.wasteSource?.originalLength) {
    return detail.wasteSource.originalLength / 1000;
  }

  const patternLength = result.patterns[index]?.standardBarLength;
  if (Number.isFinite(patternLength) && patternLength > 0) {
    return patternLength;
  }

  const usedLength = detail.cuts.reduce(
    (sum, cut) => sum + cut.length * Math.max(1, cut.quantity || 1),
    0,
  );
  return usedLength + Math.max(0, detail.waste);
}

function getSourceDescription(detail: DetailedCut): string {
  const source = detail.wasteSource;
  if (!source) return "";

  const sheet = source.sourceSheetNumber || source.sourceSheetId || "?";
  const bar = source.sourceBarNumber || "?";
  return `, Waste source: Sheet #${sheet}, Bar #${bar}`;
}

function normalizeBarCode(barCode: string): string {
  return barCode.replace(/_instance_\d+$/, "");
}

function createGroupKey(
  isFromWaste: boolean,
  barLength: number,
  segments: VisualSegment[],
): string {
  return JSON.stringify({
    source: isFromWaste ? "waste" : "new",
    barLength: roundValue(barLength),
    segments: segments.map((segment) => ({
      type: segment.type,
      label: segment.label,
      length: roundValue(segment.length),
    })),
  });
}

function getGridColumnCount(groups: PatternGroup[]): number {
  const maxSegments = groups.reduce(
    (max, group) => Math.max(max, group.segments.length),
    0,
  );
  return Math.max(1, maxSegments);
}

function formatBarDescription(dia: number, group: PatternGroup): string {
  return `${dia} mm dia (Bar length - ${formatMeters(group.barLength)} m${group.sourceDescription})`;
}

function createCutStyle(dia: number): Record<string, any> {
  return {
    fill: {
      patternType: "solid",
      fgColor: { rgb: DIA_CUT_FILLS[dia] ?? DEFAULT_CUT_FILL },
    },
    border: THIN_BLACK_BORDER,
    alignment: { vertical: "top", wrapText: true },
  };
}

function formatMeters(value: number): string {
  const rounded = roundValue(value);
  return rounded.toFixed(3).replace(/\.?0+$/, "");
}

function formatExportDate(date: Date): string {
  const day = pad2(date.getDate());
  const month = pad2(date.getMonth() + 1);
  const year = date.getFullYear();
  const hours24 = date.getHours();
  const period = hours24 >= 12 ? "PM" : "AM";
  const hours12 = hours24 % 12 || 12;
  const minutes = pad2(date.getMinutes());
  const seconds = pad2(date.getSeconds());

  return `${day}/${month}/${year} ${pad2(hours12)}:${minutes}:${seconds} ${period}`;
}

function pad2(value: number): string {
  return value.toString().padStart(2, "0");
}

function roundValue(value: number, digits = 3): number {
  return parseFloat(value.toFixed(digits));
}

function setCell(
  worksheet: XLSX.WorkSheet,
  row: number,
  col: number,
  value: string | number,
  style?: Record<string, any>,
): void {
  const cell = ensureCell(worksheet, row, col);
  cell.v = value;
  cell.t = typeof value === "number" ? "n" : "s";

  if (style) {
    cell.s = mergeCellStyles(cell.s, style);
  }
}

function ensureCell(
  worksheet: XLSX.WorkSheet,
  row: number,
  col: number,
): XLSX.CellObject {
  const address = XLSX.utils.encode_cell({ r: row, c: col });
  if (!worksheet[address]) {
    worksheet[address] = { t: "s", v: "" };
  }
  return worksheet[address] as XLSX.CellObject;
}

function mergeCellStyles(
  ...styles: Array<Record<string, any> | undefined>
): Record<string, any> {
  const merged: Record<string, any> = {};

  for (const style of styles) {
    if (!style) continue;
    for (const [key, value] of Object.entries(style)) {
      if (isPlainObject(value)) {
        merged[key] = mergeCellStyles(merged[key], value);
      } else {
        merged[key] = value;
      }
    }
  }

  return merged;
}

function isPlainObject(value: unknown): value is Record<string, any> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
