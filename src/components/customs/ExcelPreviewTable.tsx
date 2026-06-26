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
    <div className="card-surface flex h-[700px] w-full flex-col overflow-hidden">
      {/* Header */}
      <div className="flex flex-shrink-0 items-center justify-between border-b border-[var(--color-line)] px-6 py-4">
        <h2 className="flex items-center gap-2.5 font-display text-[17px] font-bold tracking-[-0.02em]">
          <span className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-accent/10 text-accent">
            <IconTable size={18} />
          </span>
          Excel Data Preview
          {selectedDia && (
            <span className="rounded-full bg-grass/[0.14] px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.08em] text-grass">
              Ø{selectedDia}
            </span>
          )}
        </h2>
        <div className="flex items-center gap-2 rounded-full border border-[var(--color-line)] bg-canvas px-3 py-1.5 font-body text-xs text-ink-3">
          <span className="font-display font-bold text-ink">{data.length}</span> rows
          <span className="mx-1 h-3 w-px bg-[var(--color-line-2)]" />
          <span className="font-display font-bold text-ink">{headers.length}</span> cols
        </div>
      </div>

      {/* Table Container - Flex grow to fill remaining height */}
      <div className="flex-1 overflow-auto scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-slate-50 relative">
        <table className="w-full border-collapse bg-white">
          <thead className="sticky top-0 z-20 bg-white/80 backdrop-blur-md">
            <tr>
              {/* Row Number Column Header */}
              <th className="sticky left-0 z-30 w-12 border-b border-r border-[var(--color-line)] bg-white/80 px-2 py-3 text-center font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-ink-3 backdrop-blur-md">
                #
              </th>
              {headers.map((header, i) => (
                <th
                  key={i}
                  className="whitespace-nowrap border-b border-r border-[var(--color-line)] bg-white/80 px-4 py-3 text-left font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-ink-3 backdrop-blur-md"
                  style={{ minWidth: `${columnWidths[i]}px` }}
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginatedData.map((row, i) => {
              const globalIndex = (currentPage - 1) * itemsPerPage + i + 1;
              return (
                <tr key={i} className="group border-b border-[var(--color-line)] transition-colors duration-150 hover:bg-accent/[0.04]">
                  {/* Row Number */}
                  <td className="sticky left-0 z-10 select-none border-r border-[var(--color-line)] bg-canvas px-2 py-2 text-center font-mono text-xs text-ink-3 group-hover:bg-accent/[0.04]">
                    {globalIndex}
                  </td>

                  {Object.values(row).map((val, j) => (
                    <td
                      key={j}
                      className={`whitespace-nowrap border-r border-[var(--color-line)] px-4 py-2.5 text-sm ${getColumnType(j) === "number"
                        ? "text-right font-mono text-ink-2"
                        : "text-left font-body font-medium text-ink"
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
      <div className="flex flex-shrink-0 items-center justify-between border-t border-[var(--color-line)] px-4 py-3 text-sm">

        {/* Left: Items per page */}
        <div className="flex items-center gap-2">
          <span className="font-body text-xs text-ink-3">Rows per page</span>
          <select
            value={itemsPerPage}
            onChange={(e) => {
              setItemsPerPage(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="rounded-lg border border-[var(--color-line-2)] bg-white px-2 py-1 font-body text-xs text-ink-2 outline-none focus:border-accent"
          >
            <option value={20}>20</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
            <option value={500}>500</option>
          </select>
        </div>

        {/* Center: Page Info */}
        <span className="hidden font-body text-xs text-ink-3 sm:inline">
          Showing {Math.min((currentPage - 1) * itemsPerPage + 1, data.length)} – {Math.min(currentPage * itemsPerPage, data.length)} of {data.length}
        </span>

        {/* Right: Navigation */}
        <div className="flex items-center gap-1">
          {[
            { fn: () => goToPage(1), dis: currentPage === 1, Ic: IconChevronsLeft, t: "First Page" },
            { fn: () => goToPage(currentPage - 1), dis: currentPage === 1, Ic: IconChevronLeft, t: "Previous Page" },
          ].map((b, i) => (
            <button key={i} onClick={b.fn} disabled={b.dis} title={b.t} className="rounded-full p-1.5 text-ink-2 transition-colors hover:bg-canvas disabled:opacity-30 disabled:hover:bg-transparent">
              <b.Ic size={17} />
            </button>
          ))}
          <div className="min-w-[3rem] px-2 text-center font-mono text-xs font-bold text-ink">
            {currentPage} <span className="font-normal text-ink-3">/ {totalPages}</span>
          </div>
          {[
            { fn: () => goToPage(currentPage + 1), dis: currentPage === totalPages, Ic: IconChevronRight, t: "Next Page" },
            { fn: () => goToPage(totalPages), dis: currentPage === totalPages, Ic: IconChevronsRight, t: "Last Page" },
          ].map((b, i) => (
            <button key={i} onClick={b.fn} disabled={b.dis} title={b.t} className="rounded-full p-1.5 text-ink-2 transition-colors hover:bg-canvas disabled:opacity-30 disabled:hover:bg-transparent">
              <b.Ic size={17} />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
