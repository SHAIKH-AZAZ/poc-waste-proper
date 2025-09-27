"use client";
import React from "react";

interface ExcelPreviewTableProps {
  data: any[];
  maxRows?: number; // optional preview row limit
}

export default function ExcelPreviewTable({ data }: ExcelPreviewTableProps) {
  if (!data || data.length === 0) return null;

  const headers = Object.keys(data[0]);

  // Calculate column width based on content
  const getColumnWidth = (index: number) => {
    const headerLength = headers[index]?.length || 0;
    let maxContentLength = headerLength;

    data.forEach((row) => {
      const cellContent = String(Object.values(row)[index] || "").length;
      maxContentLength = Math.max(maxContentLength, cellContent);
    });

    const minWidth = 80;
    const maxWidth = 180;
    return Math.max(minWidth, Math.min(maxWidth, maxContentLength * 8 + 20));
  };

  const getColumnType = (index: number) => {
    const header = headers[index]?.toLowerCase() || "";
    if (header.includes("dia") || header.includes("diameter")) return "number";
    if (
      header.includes("length") ||
      header.includes("bars") ||
      header.includes("lap")
    )
      return "number";
    return "text";
  };

  return (
    <div className="w-full max-w-7xl mx-auto p-4 bg-white rounded-xl shadow-lg mb-8">
      <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center text-center gap-2">
        <span className="text-2xl">📊</span> Excel Data Preview
      </h2>

      <div
        className="overflow-x-auto overflow-y-auto rounded-lg border-2 border-gray-200 shadow-md scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100"
        style={{ maxHeight: "600px" }}
      >
        <table className="border-collapse bg-white min-w-full">
          <thead className="bg-gradient-to-r from-gray-100 to-gray-200 sticky top-0 z-10 shadow-md">
            <tr>
              {headers.map((header, i) => (
                <th
                  key={i}
                  className="border-r border-gray-300 px-4 py-3 text-center font-bold text-gray-800 uppercase tracking-wide whitespace-nowrap"
                  style={{
                    minWidth: `${getColumnWidth(i)}px`,
                    width: `${getColumnWidth(i)}px`,
                  }}
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, i) => (
              <tr
                key={i}
                className={`${
                  i % 2 === 0 ? "bg-white" : "bg-gray-50"
                } hover:bg-blue-50 hover:shadow-sm transition-all duration-200 border-b border-gray-200`}
              >
                {Object.values(row).map((val, j) => (
                  <td
                    key={j}
                    className={`border-r border-gray-200 px-4 py-3 text-sm text-gray-700 whitespace-nowrap ${
                      getColumnType(j) === "number"
                        ? "text-right font-mono"
                        : "text-center"
                    }`}
                    style={{
                      minWidth: `${getColumnWidth(j)}px`,
                      width: `${getColumnWidth(j)}px`,
                    }}
                  >
                    {val !== undefined && val !== null && val !== ""
                      ? typeof val === "object"
                        ? JSON.stringify(val)
                        : val
                      : "—"}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex justify-between items-center text-sm text-gray-600">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1">
            <div className="w-3 h-3 bg-white border border-gray-300 rounded"></div>
            Total Rows: {data.length}
          </span>
          <span className="flex items-center gap-1">
            <div className="w-3 h-3 bg-gray-50 border border-gray-300 rounded"></div>
            Columns: {headers.length}
          </span>
        </div>
        <div className="text-xs text-gray-500">
          Scroll horizontally to view all columns
        </div>
      </div>
    </div>
  );
}
