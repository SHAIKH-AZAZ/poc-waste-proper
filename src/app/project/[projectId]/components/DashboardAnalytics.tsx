"use client";

import React from "react";
import { IconMenu2, IconRecycle, IconPercentage, IconBolt, IconChartPie } from "@tabler/icons-react";

interface Sheet {
  id: number;
  sheetNumber: number;
  fileName: string;
  fileSize: number | null;
  status: string;
  uploadedAt: string;
  mongoDataId: string | null;
  _count: { results: number; wasteProduced: number };
  results: {
    id: number;
    dia: number;
    algorithm: string;
    totalBarsUsed: number;
    wastePiecesReused: number;
    totalWaste: number;
    averageUtilization: number;
  }[];
}

interface WasteItem {
  id: number;
  dia: number;
  length: number;
  status: string;
  sourceSheet: { id: number; sheetNumber: number; fileName: string };
}

interface DashboardAnalyticsProps {
  sheets: Sheet[];
  waste: WasteItem[];
  formatLength: (mm: number) => string;
}

const stripExt = (n: string) => n.replace(/\.(xlsx|xls)$/i, "");

export default function DashboardAnalytics({ sheets, waste, formatLength }: DashboardAnalyticsProps) {
  // ── aggregate real data ──
  const calcSheets = sheets.filter((s) => s.results.length > 0);
  const totalBars = calcSheets.reduce((a, s) => a + s.results.reduce((b, r) => b + (Number(r.totalBarsUsed) || 0), 0), 0);
  const piecesReused = waste.filter((w) => w.status === "used").length;
  const recoveredMM = waste.filter((w) => w.status === "used").reduce((a, w) => a + w.length, 0);

  // bar-weighted average utilization across all results
  let utilWeight = 0;
  let barWeight = 0;
  calcSheets.forEach((s) =>
    s.results.forEach((r) => {
      const bars = Number(r.totalBarsUsed) || 0;
      utilWeight += (Number(r.averageUtilization) || 0) * bars;
      barWeight += bars;
    })
  );
  const avgUtil = barWeight > 0 ? utilWeight / barWeight : 0;

  if (totalBars === 0) {
    return (
      <div className="card-surface py-20 text-center">
        <IconChartPie className="mx-auto mb-4 h-16 w-16 text-ink-3/40" stroke={1.3} />
        <h3 className="font-display text-xl font-extrabold tracking-[-0.02em]">No analytics yet</h3>
        <p className="mx-auto mt-2 max-w-sm font-body text-ink-2">Run calculations on your sheets to see material composition and efficiency metrics.</p>
      </div>
    );
  }

  // per-sheet recovered offcut length (used waste sourced from that sheet)
  const recoveredBySheet = new Map<number, number>();
  waste.forEach((w) => {
    if (w.status === "used") recoveredBySheet.set(w.sourceSheet.id, (recoveredBySheet.get(w.sourceSheet.id) || 0) + w.length);
  });
  const recBars = sheets
    .map((s) => ({ label: `#${s.sheetNumber}`, file: stripExt(s.fileName), mm: recoveredBySheet.get(s.id) || 0 }))
    .sort((a, b) => b.mm - a.mm)
    .slice(0, 6);
  const maxRec = Math.max(1, ...recBars.map((b) => b.mm));

  // per-sheet utilization
  const utilRows = calcSheets
    .map((s) => {
      let uw = 0;
      let bw = 0;
      s.results.forEach((r) => {
        const bars = Number(r.totalBarsUsed) || 0;
        uw += (Number(r.averageUtilization) || 0) * bars;
        bw += bars;
      });
      return { label: s.fileName, pct: bw > 0 ? uw / bw : 0 };
    })
    .sort((a, b) => b.pct - a.pct)
    .slice(0, 6);

  const gradeColor = (p: number) => (p > 93 ? "#10b981" : p > 89 ? "#0ea5e9" : "#f59e0b");

  const tiles = [
    { v: totalBars, l: "Bars planned", Icon: IconMenu2, c: "#6366f1", tint: "rgba(99,102,241,0.12)" },
    { v: formatLength(recoveredMM), l: "Offcut recovered", Icon: IconRecycle, c: "#10b981", tint: "rgba(16,185,129,0.12)" },
    { v: `${avgUtil.toFixed(1)}%`, l: "Avg utilization", Icon: IconPercentage, c: "#0ea5e9", tint: "rgba(14,165,233,0.12)" },
    { v: piecesReused, l: "Pieces reused", Icon: IconBolt, c: "#a855f7", tint: "rgba(168,85,247,0.12)" },
  ];

  return (
    <div className="pb-4">
      {/* stat tiles */}
      <div className="mb-[18px] grid grid-cols-2 gap-[14px] lg:grid-cols-4">
        {tiles.map((t) => (
          <div key={t.l} className="card-surface relative overflow-hidden p-5">
            <div className="absolute -right-3.5 -top-3.5 h-16 w-16 rounded-full" style={{ background: t.tint }} />
            <div className="relative">
              <div className="mb-2.5" style={{ color: t.c }}>
                <t.Icon size={20} stroke={1.8} />
              </div>
              <div className="font-display text-[28px] font-extrabold tracking-[-0.03em]">{t.v}</div>
              <div className="mt-0.5 font-body text-[12.5px] text-ink-2">{t.l}</div>
            </div>
          </div>
        ))}
      </div>

      {/* charts */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.4fr_1fr]">
        {/* waste recovered per sheet */}
        <div className="card-surface p-6">
          <div className="font-display text-[17px] font-bold tracking-[-0.02em]">Waste recovered per sheet</div>
          <div className="mb-5 mt-1 font-body text-[12.5px] text-ink-2">Meters of offcut returned to inventory and reused downstream.</div>
          <div className="flex h-[180px] items-end gap-4 pt-2.5">
            {recBars.map((b, i) => (
              <div key={i} className="tipw flex h-full flex-1 flex-col items-center justify-end gap-2">
                <span className="font-mono text-[11px] font-bold text-grass">{b.mm > 0 ? formatLength(b.mm) : "—"}</span>
                <div className="relative w-full max-w-[46px]" style={{ height: `${Math.max(4, (b.mm / maxRec) * 100)}%` }}>
                  <div className="tip">{b.mm > 0 ? `${formatLength(b.mm)} recovered · ${b.file}` : `No offcut · ${b.file}`}</div>
                  <div className="anim-grow-h h-full w-full rounded-t-[7px] rounded-b-[3px] bg-gradient-to-b from-grass to-[#34d399]" />
                </div>
                <span className="font-body text-[11px] font-semibold text-ink-2">{b.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* utilization by sheet */}
        <div className="card-surface p-6">
          <div className="mb-[18px] font-display text-[17px] font-bold tracking-[-0.02em]">Utilization by sheet</div>
          <div className="flex flex-col gap-[15px]">
            {utilRows.map((u, i) => {
              const c = gradeColor(u.pct);
              return (
                <div key={i}>
                  <div className="mb-1.5 flex justify-between">
                    <span className="truncate font-body text-[12.5px] font-semibold">{u.label}</span>
                    <span className="ml-2 shrink-0 font-mono text-[12px] font-bold" style={{ color: c }}>{u.pct.toFixed(0)}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-[#f1f3f8]">
                    <div className="anim-grow-w h-full rounded-full" style={{ width: `${u.pct}%`, background: c }} />
                  </div>
                </div>
              );
            })}
            {utilRows.length === 0 && <p className="font-body text-[13px] text-ink-3">No calculated sheets yet.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
