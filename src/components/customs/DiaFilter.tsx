"use client";
import React from "react";
import { getUniqueDiaFromDisplay, getDisplayDiaSummary } from "@/utils/barCodeUtils";
import ClientOnly from "../ui/ClientOnly";
import type { BarCuttingDisplay } from "@/types/BarCuttingRow";

interface DiaFilterProps {
  data: BarCuttingDisplay[];
  selectedDia: number | null;
  onDiaSelect: (dia: number | null) => void;
}

export default function DiaFilter({ data, selectedDia, onDiaSelect }: DiaFilterProps) {
  const uniqueDias = getUniqueDiaFromDisplay(data);

  if (uniqueDias.length === 0) return null;

  return (
    <ClientOnly>
      <div className="w-full max-w-7xl mx-auto p-4 bg-white rounded-xl shadow-lg mb-6">
        <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
          <span className="text-xl">🔍</span> Filter by Dia
        </h3>
      
      <div className="flex flex-wrap gap-3 mb-4">
        {/* Show All Button */}
        <button
          onClick={() => onDiaSelect(null)}
          className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
            selectedDia === null
              ? "bg-blue-600 text-white shadow-md"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          Show All ({data.length})
        </button>

        {/* Individual Dia Buttons */}
        {uniqueDias.map((dia) => {
          const summary = getDisplayDiaSummary(data, dia);
          const isSelected = selectedDia === dia;
          
          return (
            <button
              key={dia}
              onClick={() => onDiaSelect(dia)}
              className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 flex flex-col items-center ${
                isSelected
                  ? "bg-green-600 text-white shadow-md"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              <span className="text-sm font-bold">Dia {dia}</span>
              <span className="text-xs opacity-80">
                {summary.rowCount} rows, {summary.totalBars} bars
              </span>
            </button>
          );
        })}
      </div>

      {/* Summary for selected Dia */}
      {selectedDia && (
        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
          <h4 className="font-semibold text-green-800 mb-2">
            Summary for Dia {selectedDia}:
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            {(() => {
              const summary = getDisplayDiaSummary(data, selectedDia);
              return (
                <>
                  <div className="text-center">
                    <div className="font-bold text-green-700">{summary.rowCount}</div>
                    <div className="text-green-600">Rows</div>
                  </div>
                  <div className="text-center">
                    <div className="font-bold text-green-700">{summary.totalBars}</div>
                    <div className="text-green-600">Total Bars</div>
                  </div>
                  <div className="text-center">
                    <div className="font-bold text-green-700">{summary.totalCuttingLength}</div>
                    <div className="text-green-600">Total Cutting Length</div>
                  </div>
                  <div className="text-center">
                    <div className="font-bold text-green-700">{summary.totalLapLength}</div>
                    <div className="text-green-600">Total Lap Length</div>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}
      </div>
    </ClientOnly>
  );
}