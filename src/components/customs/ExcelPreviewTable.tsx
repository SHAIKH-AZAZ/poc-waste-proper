"use client";
import React, { useState, useMemo } from "react";

import type { BarCuttingDisplay } from "@/types/BarCuttingRow";
import {
  IconTable,
  IconChevronLeft,
  IconChevronRight,
  IconChevronsLeft,
  IconChevronsRight
} from "@tabler/icons-react";

interface ExcelPreviewTableProps {
  data: BarCuttingDisplay[];
  maxRows?: number; // optional preview row limit
  selectedDia?: number | null; // optional: to show filter status
}

export default function ExcelPreviewTable({ data, selectedDia }: ExcelPreviewTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);

  if (!data || data.length === 0) return null;

  const headers = Object.keys(data[0]) as (keyof BarCuttingDisplay)[];

  // Reset to page 1 if data changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [data]);

  // Calculate total pages
  const totalPages = Math.ceil(data.length / itemsPerPage);

  // Get current page data
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return data.slice(startIndex, startIndex + itemsPerPage);
  }, [data, currentPage, itemsPerPage]);

  // Calculate column width based on CONTENT of the CURRENT PAGE (or full data for stability? Full data prefers stability)
  // Let's use full data for stability so columns don't jitter between pages
  const columnWidths = useMemo(() => {
    return headers.map((header, index) => {
      const headerLength = header.length;
      let maxContentLength = headerLength;

      // Sample first 100 rows for performance if data is huge, or all if small
      const sampleData = data.slice(0, 100);
      sampleData.forEach((row) => {
        const cellContent = String(Object.values(row)[index] || "").length;
        maxContentLength = Math.max(maxContentLength, cellContent);
      });

      const minWidth = 80;
      const maxWidth = 180;
      return Math.max(minWidth, Math.min(maxWidth, maxContentLength * 8 + 20));
    });
  }, [data, headers]);

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

  // Pagination Handlers
  const goToPage = (page: number) => {
    const p = Math.max(1, Math.min(page, totalPages));
    setCurrentPage(p);
  };

  return (
    <div className="w-full max-w-7xl mx-auto bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden ring-1 ring-slate-100 flex flex-col h-[700px] animate-fade-in text-black">
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
          <span className="font-semibold text-slate-700">{data.length}</span> total rows
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
                    minWidth: `${columnWidths[i]}px`,
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
            {paginatedData.map((row, i) => {
              // Calculate global index
              const globalIndex = (currentPage - 1) * itemsPerPage + i + 1;
              return (
                <tr
                  key={i}
                  className="group hover:bg-blue-50/50 transition-colors duration-150"
                >
                  {/* Row Number */}
                  <td className="sticky left-0 bg-slate-50 group-hover:bg-blue-50/50 border-r border-slate-100 font-mono text-xs text-slate-400 text-center py-2 px-2 select-none z-10">
                    {globalIndex}
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
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="bg-slate-50 border-t border-slate-100 px-4 py-3 flex items-center justify-between flex-shrink-0 text-sm">

        {/* Left: Items per page */}
        <div className="flex items-center gap-2">
          <span className="text-slate-500">Rows per page:</span>
          <select
            value={itemsPerPage}
            onChange={(e) => {
              setItemsPerPage(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="bg-white border border-slate-300 text-slate-700 text-sm rounded-md focus:ring-blue-500 focus:border-blue-500 block p-1"
          >
            <option value={20}>20</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
            <option value={500}>500</option>
          </select>
        </div>

        {/* Center: Page Info */}
        <div className="flex items-center gap-4 text-slate-600">
          <span className="text-slate-400 hidden sm:inline">
            Showing {Math.min((currentPage - 1) * itemsPerPage + 1, data.length)} - {Math.min(currentPage * itemsPerPage, data.length)} of {data.length}
          </span>
        </div>

        {/* Right: Navigation */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => goToPage(1)}
            disabled={currentPage === 1}
            className="p-1 rounded-md hover:bg-white disabled:opacity-30 disabled:hover:bg-transparent text-slate-600 transition-colors"
            title="First Page"
          >
            <IconChevronsLeft size={18} />
          </button>
          <button
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage === 1}
            className="p-1 rounded-md hover:bg-white disabled:opacity-30 disabled:hover:bg-transparent text-slate-600 transition-colors"
            title="Previous Page"
          >
            <IconChevronLeft size={18} />
          </button>

          <div className="px-3 py-1 bg-white rounded-md border border-slate-200 text-slate-700 font-medium min-w-[3rem] text-center">
            {currentPage} <span className="text-slate-400 font-normal">/ {totalPages}</span>
          </div>

          <button
            onClick={() => goToPage(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="p-1 rounded-md hover:bg-white disabled:opacity-30 disabled:hover:bg-transparent text-slate-600 transition-colors"
            title="Next Page"
          >
            <IconChevronRight size={18} />
          </button>
          <button
            onClick={() => goToPage(totalPages)}
            disabled={currentPage === totalPages}
            className="p-1 rounded-md hover:bg-white disabled:opacity-30 disabled:hover:bg-transparent text-slate-600 transition-colors"
            title="Last Page"
          >
            <IconChevronsRight size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
