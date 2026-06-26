"use client";
import React from "react";
import type { CuttingStockResult, CutInstruction } from "@/types/CuttingStock";
import ClientOnly from "../ui/ClientOnly";
import {
  exportCuttingStockResults,
  exportCuttingInstructions,
} from "@/utils/cuttingStockExport";
import { exportToExcel } from "@/utils/excelExport";
import { getAlgorithmInfo } from "@/constants/algorithmInfo";
import {
  IconFileSpreadsheet,
  IconFileCode,
  IconCheck,
  IconRecycle,
  IconChevronDown,
  IconArrowsSplit2,
} from "@tabler/icons-react";

interface CuttingStockResultsProps {
  greedyResult: CuttingStockResult | null;
  dynamicResult: CuttingStockResult | null;
  isLoading: boolean;
  fileName?: string;
  greedyProgress?: { stage: string; percentage: number };
  dynamicProgress?: { stage: string; percentage: number };
}

const PAL = ["#6366f1", "#0ea5e9", "#10b981", "#f59e0b", "#a855f7", "#f97316", "#f43f5e", "#22c55e"];
const PAL2 = ["#818cf8", "#38bdf8", "#34d399", "#fbbf24", "#c084fc", "#fb923c", "#fb7185", "#4ade80"];

const cleanCode = (barCode: string) => barCode.split("_instance")[0];

const utilColor = (u: number) => (u > 95 ? "#10b981" : u > 86 ? "#f59e0b" : "#f43f5e");

// pick winner: fewer new bars, then fewer total bars, then less waste
function pickWinner(g: CuttingStockResult | null, d: CuttingStockResult | null) {
  if (g && d) {
    const gNew = (g.summary as any).newBarsUsed ?? g.totalBarsUsed;
    const dNew = (d.summary as any).newBarsUsed ?? d.totalBarsUsed;
    if (gNew !== dNew) return gNew < dNew ? "greedy" : "dynamic";
    if (g.totalBarsUsed !== d.totalBarsUsed) return g.totalBarsUsed < d.totalBarsUsed ? "greedy" : "dynamic";
    return g.totalWaste <= d.totalWaste ? "greedy" : "dynamic";
  }
  return g ? "greedy" : "dynamic";
}

export default function CuttingStockResults({
  greedyResult,
  dynamicResult,
  isLoading,
  fileName = "data",
  greedyProgress = { stage: "", percentage: 0 },
  dynamicProgress = { stage: "", percentage: 0 },
}: CuttingStockResultsProps) {
  if (isLoading) {
    return (
      <div className="card-surface mb-[18px] p-7">
        <h3 className="mb-6 text-center font-display text-[18px] font-extrabold tracking-[-0.02em]">
          Calculating optimal cutting patterns…
        </h3>
        {[
          { p: greedyProgress, label: getAlgorithmInfo("greedy").shortName, c: "#0ea5e9" },
          { p: dynamicProgress, label: getAlgorithmInfo("dynamic").shortName, c: "#6366f1" },
        ].map((row) => (
          <div key={row.label} className="mb-5">
            <div className="mb-2 flex items-center justify-between font-mono text-[11px] font-bold" style={{ color: row.c }}>
              <span>{row.label}</span>
              <span>{row.p.percentage}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-[#f1f3f8]">
              <div className="h-full rounded-full transition-all duration-300" style={{ width: `${row.p.percentage}%`, background: row.c }} />
            </div>
            {row.p.stage && <p className="mt-1 font-body text-[11px] text-ink-3">{row.p.stage}</p>}
          </div>
        ))}
        <p className="mt-4 text-center font-body text-[12px] text-ink-3">Running both methods in parallel via Web Workers…</p>
      </div>
    );
  }

  if (!greedyResult && !dynamicResult) return null;

  const winner = pickWinner(greedyResult, dynamicResult);
  const best = winner === "greedy" ? greedyResult : dynamicResult;

  const algoCard = (result: CuttingStockResult | null, kind: "greedy" | "dynamic") => {
    if (!result) return null;
    const info = getAlgorithmInfo(result.algorithm);
    const isWinner = winner === kind;
    return (
      <div
        className="overflow-hidden rounded-[18px] border-[1.5px]"
        style={{
          background: isWinner ? "rgba(99,102,241,0.025)" : "#fff",
          borderColor: isWinner ? "rgba(99,102,241,0.38)" : "var(--color-line)",
          boxShadow: isWinner ? "0 12px 40px rgba(99,102,241,0.18), 0 2px 8px rgba(99,102,241,0.08)" : "var(--shadow-card)",
        }}
      >
        <div className="h-1" style={{ background: isWinner ? "linear-gradient(90deg,#6366f1,#0ea5e9)" : "transparent" }} />
        <div className="px-[22px] pb-[22px] pt-5">
          <div className="mb-5 flex items-start justify-between">
            <div>
              <div className="mb-[7px] font-mono text-[9px] font-bold uppercase tracking-[0.14em]" style={{ color: isWinner ? "#6366f1" : "#0ea5e9" }}>
                {isWinner ? "Recommended" : "First-fit decreasing"}
              </div>
              <div className="font-display text-[20px] font-bold tracking-[-0.03em]">{info.name}</div>
            </div>
            {isWinner && (
              <div className="mt-0.5 flex shrink-0 items-center gap-1.5 rounded-full bg-grass px-[11px] py-[5px] font-mono text-[9px] font-bold uppercase tracking-[0.1em] text-white">
                <IconCheck size={11} stroke={3} />
                Best
              </div>
            )}
          </div>
          <div className="flex border-t border-[var(--color-line)] pt-[18px]">
            {[
              { v: result.totalBarsUsed, l: "bars used", c: isWinner ? "#4f46e5" : "#0f1117" },
              { v: `${(result.summary?.totalWasteLength ?? result.totalWaste).toFixed(2)}m`, l: "total waste", c: "#0f1117" },
              { v: `${result.averageUtilization.toFixed(1)}%`, l: "avg util.", c: isWinner ? "#4f46e5" : "#0f1117" },
            ].map((s, i) => (
              <React.Fragment key={s.l}>
                {i > 0 && <div className="mx-1 w-px bg-[var(--color-line)]" />}
                <div className="flex-1 text-center">
                  <div className="font-display text-[32px] font-extrabold tracking-[-0.04em]" style={{ color: s.c }}>{s.v}</div>
                  <div className="mt-1 font-mono text-[8.5px] font-bold uppercase tracking-[0.1em] text-ink-3">{s.l}</div>
                </div>
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const tiles = best
    ? [
        { l: "Bars used", v: best.summary.totalStandardBars, sub: "new + reused", c: "#6366f1" },
        { l: "Total waste", v: `${best.summary.totalWasteLength.toFixed(2)}m`, sub: `${best.summary.totalWastePercentage.toFixed(1)}% of stock`, c: "#f43f5e" },
        { l: "Avg utilization", v: `${best.summary.averageUtilization.toFixed(1)}%`, sub: "across all bars", c: "#10b981" },
        { l: "Reusable pieces", v: best.summary.reusablePieces ?? 0, sub: "≥ 1m offcuts", c: "#a855f7" },
        { l: "Cuts produced", v: best.summary.totalCutsProduced, sub: "bar marks", c: "#0f1117" },
      ]
    : [];

  return (
    <ClientOnly>
      <div className="mb-[18px] flex flex-col gap-[14px]">
        {/* header */}
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2.5 font-display text-[20px] font-extrabold tracking-[-0.03em]">
            <span className="flex h-9 w-9 items-center justify-center rounded-[11px] bg-accent/10 text-accent">
              <IconArrowsSplit2 size={19} />
            </span>
            Optimization Results
          </h2>
          <div className="flex gap-2">
            <button
              onClick={() => exportToExcel(greedyResult, dynamicResult, fileName)}
              className="flex items-center gap-2 rounded-full bg-grass/10 px-[13px] py-2 font-body text-[12.5px] font-bold text-grass transition-colors hover:bg-grass hover:text-white"
            >
              <IconFileSpreadsheet size={15} /> Export Excel
            </button>
            <button
              onClick={() => exportCuttingStockResults(greedyResult, dynamicResult, fileName)}
              className="flex items-center gap-2 rounded-full bg-accent/[0.08] px-[13px] py-2 font-body text-[12.5px] font-bold text-accent transition-colors hover:bg-accent hover:text-white"
            >
              <IconFileCode size={15} /> Export JSON
            </button>
          </div>
        </div>

        {/* algorithm comparison */}
        {greedyResult && dynamicResult && (
          <div className="grid grid-cols-1 gap-[14px] md:grid-cols-2">
            {algoCard(greedyResult, "greedy")}
            {algoCard(dynamicResult, "dynamic")}
          </div>
        )}

        {/* stat tiles */}
        {best && (
          <div className="flex flex-wrap overflow-hidden rounded-2xl border border-[var(--color-line)] bg-white/80 backdrop-blur-md">
            {tiles.map((t, i) => (
              <div key={t.l} className={`min-w-[140px] flex-1 px-5 py-[18px] ${i < tiles.length - 1 ? "border-r border-[var(--color-line)]" : ""}`}>
                <div className="mb-2 font-mono text-[8.5px] font-bold uppercase tracking-[0.14em] text-ink-3">{t.l}</div>
                <div className="font-display text-[26px] font-extrabold tracking-[-0.04em]" style={{ color: t.c }}>{t.v}</div>
                <div className="mt-0.5 font-body text-[11px] text-ink-3">{t.sub}</div>
              </div>
            ))}
          </div>
        )}

        {/* cutting patterns viz */}
        {greedyResult && <PatternsCard result={greedyResult} title={getAlgorithmInfo(greedyResult.algorithm).name} defaultOpen={winner === "greedy"} />}
        {dynamicResult && <PatternsCard result={dynamicResult} title={getAlgorithmInfo(dynamicResult.algorithm).name} defaultOpen={winner === "dynamic"} />}
      </div>
    </ClientOnly>
  );
}

function PatternsCard({ result, title, defaultOpen }: { result: CuttingStockResult; title: string; defaultOpen: boolean }) {
  const [open, setOpen] = React.useState(defaultOpen);
  const [page, setPage] = React.useState(1);
  const [perPage, setPerPage] = React.useState(30);

  React.useEffect(() => setPage(1), [result]);

  // color map by bar-code
  const colorMap = React.useMemo(() => {
    const m = new Map<string, number>();
    let i = 0;
    for (const d of result.detailedCuts) for (const c of d.cuts) {
      const code = cleanCode(c.barCode);
      if (!m.has(code)) m.set(code, i++ % PAL.length);
    }
    return m;
  }, [result]);

  const legend = React.useMemo(() => Array.from(colorMap.entries()).slice(0, 8), [colorMap]);

  const sorted = React.useMemo(
    () =>
      [...result.detailedCuts].sort((a, b) => {
        const aW = (a as any).isFromWaste || a.patternId?.startsWith("waste_");
        const bW = (b as any).isFromWaste || b.patternId?.startsWith("waste_");
        if (aW && !bW) return -1;
        if (!aW && bW) return 1;
        return a.barNumber - b.barNumber;
      }),
    [result]
  );

  const total = sorted.length;
  const totalPages = Math.ceil(total / perPage);
  const start = (page - 1) * perPage;
  const slice = sorted.slice(start, start + perPage);

  return (
    <div className="card-surface overflow-hidden">
      {/* header */}
      <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center justify-between gap-3 px-[22px] py-[18px] text-left">
        <div className="flex items-center gap-[11px]">
          <span className="flex h-9 w-9 items-center justify-center rounded-[11px] bg-accent/10 text-accent">
            <IconArrowsSplit2 size={19} />
          </span>
          <div>
            <div className="font-display text-[17px] font-bold tracking-[-0.02em]">Cutting patterns · Ø{result.dia}mm</div>
            <div className="font-body text-[12px] text-ink-2">{title} · each bar drawn to scale — hatched tail is offcut</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={(e) => {
              e.stopPropagation();
              exportCuttingInstructions(result, `${result.algorithm}_dia_${result.dia}`);
            }}
            className="hidden items-center gap-1.5 rounded-full bg-grass/10 px-3 py-1.5 font-body text-[12px] font-bold text-grass transition-colors hover:bg-grass hover:text-white sm:flex"
          >
            <IconFileSpreadsheet size={13} /> CSV
          </button>
          <IconChevronDown size={20} className={`text-ink-3 transition-transform ${open ? "rotate-180" : ""}`} />
        </div>
      </button>

      {open && (
        <>
          {/* legend */}
          <div className="flex flex-wrap items-center gap-[14px] border-y border-[var(--color-line)] bg-canvas px-[22px] py-[13px]">
            <span className="font-mono text-[9.5px] font-bold uppercase tracking-[0.14em] text-ink-3">Bar marks</span>
            {legend.map(([code, ci]) => (
              <div key={code} className="flex items-center gap-1.5">
                <span className="h-[11px] w-[11px] rounded-[3px]" style={{ background: PAL[ci] }} />
                <span className="font-mono text-[11px] font-bold text-ink-2">{code}</span>
              </div>
            ))}
            <div className="flex items-center gap-1.5">
              <span className="h-[11px] w-[11px] rounded-[3px] bg-[repeating-linear-gradient(45deg,rgba(244,63,94,0.35)_0_3px,rgba(244,63,94,0.12)_3px_6px)]" />
              <span className="font-mono text-[11px] font-bold text-ink-2">OFFCUT</span>
            </div>
          </div>

          {/* bars */}
          <div className="px-[22px] pb-4 pt-2">
            {slice.map((detail, idx) => {
              const barLen = detail.isFromWaste && detail.wasteSource ? detail.wasteSource.originalLength / 1000 : 12.0;
              const used = detail.cuts.reduce((s, c) => s + c.length, 0);
              let waste = barLen - used;
              if (Math.abs(waste) < 0.0001) waste = 0;
              const util = (used / barLen) * 100;
              const reused = !!detail.isFromWaste;
              const recovered = (detail as any).isWasteRecovered;
              return (
                <div key={`bar-${detail.barNumber}-${idx}`} className="flex items-center gap-[14px] border-b border-[var(--color-line)] py-[14px] last:border-b-0">
                  {/* number + tag */}
                  <div className="flex w-[52px] shrink-0 flex-col items-center gap-1">
                    <div
                      className="flex h-9 w-9 items-center justify-center rounded-[11px] border font-display text-[15px] font-extrabold"
                      style={{
                        background: reused ? "rgba(168,85,247,0.1)" : "rgba(99,102,241,0.09)",
                        color: reused ? "#9333ea" : "#4f46e5",
                        borderColor: reused ? "rgba(168,85,247,0.2)" : "rgba(99,102,241,0.18)",
                      }}
                    >
                      {detail.barNumber}
                    </div>
                    <span className="font-mono text-[8px] font-bold tracking-[0.08em]" style={{ color: reused ? "#9333ea" : "#9aa1ac" }}>
                      {reused ? "REUSE" : "NEW"}
                    </span>
                  </div>
                  {/* stock label */}
                  <div className="w-[112px] shrink-0">
                    <div className="font-body text-[12px] font-bold text-ink">{reused ? `${barLen.toFixed(2)}m offcut` : "12.00m bar"}</div>
                    {reused && detail.wasteSource && (
                      <div className="mt-0.5 flex items-center gap-1 font-body text-[10px] text-grass">
                        <IconRecycle size={10} />
                        Sheet {detail.wasteSource.sourceSheetNumber || detail.wasteSource.sourceSheetId} · #{detail.wasteSource.sourceBarNumber || "?"}
                      </div>
                    )}
                  </div>
                  {/* to-scale bar */}
                  <div className="min-w-0 flex-1">
                    <div className="flex h-10 overflow-hidden rounded-[10px] border border-[var(--color-line)] bg-[#f1f3f8] shadow-[inset_0_1px_3px_rgba(0,0,0,0.05)]">
                      {detail.cuts.map((c: CutInstruction, ci) => {
                        const code = cleanCode(c.barCode);
                        const colorIdx = colorMap.get(code) ?? 0;
                        const w = (c.length / barLen) * 100;
                        return (
                          <div
                            key={ci}
                            title={`${code} · ${c.length.toFixed(2)}m`}
                            className="flex items-center justify-center overflow-hidden border-r-2 border-white/55"
                            style={{ width: `${w}%`, background: `linear-gradient(180deg, ${PAL[colorIdx]}, ${PAL2[colorIdx]})` }}
                          >
                            <span className="whitespace-nowrap font-mono text-[9.5px] font-bold text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.18)]">
                              {c.length >= 0.6 ? c.length.toFixed(2) : ""}
                            </span>
                          </div>
                        );
                      })}
                      {waste > 0 && (
                        <div
                          className="flex items-center justify-center overflow-hidden bg-[repeating-linear-gradient(45deg,rgba(244,63,94,0.26)_0_6px,rgba(244,63,94,0.09)_6px_12px)]"
                          style={{ width: `${(waste / barLen) * 100}%` }}
                        >
                          <span className="whitespace-nowrap font-mono text-[9px] font-bold text-[#e11d48]">{waste > 0.4 ? waste.toFixed(2) : ""}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  {/* util + waste */}
                  <div className="w-[90px] shrink-0 text-right">
                    <div className="font-display text-[16px] font-extrabold" style={{ color: recovered ? "#10b981" : utilColor(util) }}>
                      {util.toFixed(1)}%
                    </div>
                    <div className="mt-[5px] h-1 w-full overflow-hidden rounded-full bg-[#f1f3f8]">
                      <div className="h-full rounded-full" style={{ width: `${Math.min(util, 100)}%`, background: utilColor(util) }} />
                    </div>
                    <div className="mt-1 font-body text-[10px]" style={{ color: recovered ? "#10b981" : waste > 1 ? "#e11d48" : "#9aa1ac" }}>
                      {recovered ? "recovered ♻" : `${waste.toFixed(2)}m waste`}
                    </div>
                  </div>
                </div>
              );
            })}
            {slice.length === 0 && <div className="py-8 text-center font-body text-ink-3 italic">No patterns to display.</div>}
          </div>

          {/* pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-[var(--color-line)] px-[22px] py-3">
              <div className="flex items-center gap-3">
                <span className="font-body text-[12px] text-ink-3">Rows</span>
                <select
                  value={perPage}
                  onChange={(e) => {
                    setPerPage(Number(e.target.value));
                    setPage(1);
                  }}
                  className="rounded-lg border border-[var(--color-line-2)] bg-white px-2 py-1 font-body text-[12px] text-ink-2 outline-none"
                >
                  {[10, 30, 50, 100, 500].map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
                <span className="font-body text-[12px] text-ink-3">{start + 1}–{Math.min(start + perPage, total)} of {total}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="rounded-full border border-[var(--color-line)] px-3 py-1.5 font-body text-[12px] font-semibold text-ink-2 transition-colors hover:text-ink disabled:opacity-40"
                >
                  Prev
                </button>
                <span className="px-2 font-mono text-[12px] font-bold text-ink">{page} <span className="font-normal text-ink-3">/ {totalPages}</span></span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="rounded-full border border-[var(--color-line)] px-3 py-1.5 font-body text-[12px] font-semibold text-ink-2 transition-colors hover:text-ink disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
