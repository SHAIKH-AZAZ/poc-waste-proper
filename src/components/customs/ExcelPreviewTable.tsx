"use client";
import React from "react";

import type { BarCuttingDisplay } from "@/types/BarCuttingRow";
import { IconTable } from "@tabler/icons-react";

interface ExcelPreviewTableProps {
  data: BarCuttingDisplay[];
  maxRows?: number; // optional preview row limit
  selectedDia?: number | null; // optional: to show filter status
}

export default function ExcelPreviewTable({ data, selectedDia }: ExcelPreviewTableProps) {
  if (!data || data.length === 0) return null;

  const headers = Object.keys(data[0]) as (keyof BarCuttingDisplay)[];

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
    if (header.includes("si no") || header.includes("label") || header.includes("element"))
      return "text";
    return "text";
  };

  function renderCell(val: string | number | object | null | unknown, header: string) {
    if (val === undefined || val === null || val === "" || Number.isNaN(val))
      return "—";
    if (typeof val === "object") return JSON.stringify(val);

    // Format float values for Cutting Length and Lap Length
    if ((header === "Cutting Length" || header === "Lap Length") && typeof val === "number") {
      return val.toFixed(3);
    }

    return val;
  }

  return (

    <div className="w-full max-w-7xl mx-auto bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden ring-1 ring-slate-100 flex flex-col h-[700px] animate-fade-in">
      {/* Header */}
      <div className="bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between flex-shrink-0">
        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600 border border-blue-100">
            <IconTable size={20} />
          </div>
          Excel Data Preview
          {selectedDia && (
            <span className="bg-green-50 text-green-700 px-2.5 py-1 rounded-full text-xs font-medium border border-green-100">
              Filtered: Dia {selectedDia}
            </span>
          )}
        </h2>
        <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
          <span className="font-semibold text-slate-700">{data.length}</span> rows
          <span className="w-px h-3 bg-slate-300 mx-1"></span>
          <span className="font-semibold text-slate-700">{headers.length}</span> columns
        </div>
      </div>

      {/* Table Container - Flex grow to fill remaining height */}
      <div className="flex-1 overflow-auto scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-slate-50 relative">
        <table className="border-collapse bg-white w-full">
          <thead className="bg-white/70 backdrop-blur-md sticky top-0 z-20">
            <tr>
              {/* Row Number Column Header */}
              <th className="sticky left-0 z-30 bg-white/70 backdrop-blur-md border-r border-b border-slate-200 w-12 px-2 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">
                #
              </th>
              {headers.map((header, i) => (
                <th
                  key={i}
                  className="border-r border-b border-slate-200 px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap bg-white/70 backdrop-blur-md"
                  style={{
                    minWidth: `${getColumnWidth(i)}px`,
                  }}
                >
                  <div className="flex items-center gap-1 group cursor-default">
                    {header}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.map((row, i) => (
              <tr
                key={i}
                className="group hover:bg-blue-50/50 transition-colors duration-150"
              >
                {/* Row Number */}
                <td className="sticky left-0 bg-slate-50 group-hover:bg-blue-50/50 border-r border-slate-100 font-mono text-xs text-slate-400 text-center py-2 px-2 select-none z-10">
                  {i + 1}
                </td>

                {Object.values(row).map((val, j) => (
                  <td
                    key={j}
                    className={`border-r border-slate-100 px-4 py-2.5 text-sm whitespace-nowrap ${getColumnType(j) === "number"
                      ? "text-right font-mono text-slate-600"
                      : "text-left text-slate-700 font-medium"
                      }`}
                  >
                    {renderCell(val, headers[j]) as React.ReactNode}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="bg-slate-50 border-t border-slate-100 px-4 py-2 text-xs text-slate-400 flex justify-center flex-shrink-0">
        Scroll safely • Data is strictly typed
      </div>
    </div>
  );
}
