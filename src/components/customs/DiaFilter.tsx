"use client";
import { getUniqueDiaFromDisplay, getDisplayDiaSummary } from "@/utils/barCodeUtils";
import ClientOnly from "../ui/ClientOnly";
import type { BarCuttingDisplay } from "@/types/BarCuttingRow";
import { IconLayoutList, IconRuler2 } from "@tabler/icons-react";

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
      <div className="card-surface mb-[18px] overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-[9px] border-b border-[var(--color-line)] px-5 pb-3 pt-[13px]">
          <span className="h-1.5 w-1.5 rounded-full bg-accent" />
          <span className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-ink-3">Select Diameter</span>
        </div>

        {/* Chips */}
        <div className="flex flex-wrap gap-2 p-4">
          <button
            onClick={() => onDiaSelect(null)}
            className={`flex min-w-[92px] flex-col items-center gap-[3px] rounded-[13px] border-[1.5px] px-[18px] py-3 transition-all ${
              selectedDia === null
                ? "border-accent/60 bg-accent/[0.08]"
                : "border-[var(--color-line)] bg-white hover:border-accent hover:bg-accent/[0.06]"
            }`}
          >
            <span className={`font-display text-[20px] font-extrabold tracking-[-0.03em] ${selectedDia === null ? "text-accent-deep" : "text-ink"}`}>All</span>
            <span className={`font-mono text-[9px] font-bold tracking-[0.08em] ${selectedDia === null ? "text-accent" : "text-ink-3"}`}>{data.length} rows</span>
          </button>

          {uniqueDias.map((dia) => {
            const summary = getDisplayDiaSummary(data, dia);
            const isSelected = selectedDia === dia;
            return (
              <button
                key={dia}
                onClick={() => onDiaSelect(dia)}
                className={`flex min-w-[82px] flex-col items-center gap-[3px] rounded-[13px] border-[1.5px] px-[18px] py-3 transition-all ${
                  isSelected
                    ? "border-accent/60 bg-accent/[0.08]"
                    : "border-[var(--color-line)] bg-white hover:border-accent hover:bg-accent/[0.06]"
                }`}
              >
                <span className={`font-display text-[20px] font-extrabold tracking-[-0.03em] ${isSelected ? "text-accent-deep" : "text-ink"}`}>Ø{dia}</span>
                <span className={`font-mono text-[9px] font-bold tracking-[0.08em] ${isSelected ? "text-accent" : "text-ink-3"}`}>{summary.rowCount} rows</span>
              </button>
            );
          })}
        </div>

        {/* Summary for selected Dia */}
        {selectedDia && (
          <div className="px-4 pb-4">
            <div className="relative overflow-hidden rounded-[13px] border border-[var(--color-line)] bg-canvas p-5">
              <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-grass/[0.06] blur-2xl" />
              <h4 className="mb-4 font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-ink-3">Summary · Ø{selectedDia}mm</h4>
              <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
                {(() => {
                  const summary = getDisplayDiaSummary(data, selectedDia);
                  const cells = [
                    { Icon: IconLayoutList, label: "Rows", value: summary.rowCount },
                    { Icon: IconLayoutList, label: "Total Bars", value: summary.totalBars },
                    { Icon: IconRuler2, label: "Total Cut Length", value: `${summary.totalCuttingLength}m`, mono: true },
                    { Icon: IconRuler2, label: "Total Lap Length", value: `${summary.totalLapLength}m`, mono: true },
                  ];
                  return cells.map((c) => (
                    <div key={c.label}>
                      <div className="mb-1 flex items-center gap-1 text-ink-3">
                        <c.Icon size={13} />
                        <p className="font-mono text-[9px] font-bold uppercase tracking-[0.1em]">{c.label}</p>
                      </div>
                      <p className={`font-display text-[21px] font-extrabold tracking-[-0.03em] text-ink ${c.mono ? "font-mono" : ""}`}>{c.value}</p>
                    </div>
                  ));
                })()}
              </div>
            </div>
          </div>
        )}
      </div>
    </ClientOnly>
  );
}
