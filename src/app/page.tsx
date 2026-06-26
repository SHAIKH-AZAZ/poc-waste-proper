import Link from "next/link";
import {
  IconArrowRight,
  IconFile,
  IconUpload,
  IconRecycle,
  IconBolt,
  IconChartBar,
  IconDeviceFloppy,
} from "@tabler/icons-react";

const steps = [
  {
    no: "01",
    title: "Create a project",
    desc: "Group related sheets so they can share one pool of offcut inventory.",
    Icon: IconFile,
    tint: "rgba(99,102,241,0.1)",
    color: "#6366f1",
  },
  {
    no: "02",
    title: "Upload sheets",
    desc: "Drop in Excel bar-bending schedules. Every diameter is parsed automatically.",
    Icon: IconUpload,
    tint: "rgba(14,165,233,0.1)",
    color: "#0ea5e9",
  },
  {
    no: "03",
    title: "Optimize & export",
    desc: "Run both methods, reuse waste across sheets, export a site-ready cutting plan.",
    Icon: IconRecycle,
    tint: "rgba(16,185,129,0.1)",
    color: "#10b981",
  },
];

const features = [
  {
    title: "Cross-sheet waste reuse",
    desc: "Offcuts from one sheet automatically become stock for the next. Nothing goes to landfill if it can still be cut.",
    Icon: IconRecycle,
    tint: "rgba(16,185,129,0.1)",
    color: "#10b981",
  },
  {
    title: "Two optimisation methods",
    desc: "First-Fit Decreasing for speed, Swap Optimiser for minimum waste. Compare both and pick the winner.",
    Icon: IconBolt,
    tint: "rgba(245,158,11,0.1)",
    color: "#f59e0b",
  },
  {
    title: "Site-ready Excel export",
    desc: "Clean, labelled cutting schedules your bar-benders can read on the job without a laptop.",
    Icon: IconChartBar,
    tint: "rgba(14,165,233,0.1)",
    color: "#0ea5e9",
  },
  {
    title: "Persistent project history",
    desc: "Every result and offcut is saved. Reopen any sheet months later and re-run with updated inventory.",
    Icon: IconDeviceFloppy,
    tint: "rgba(99,102,241,0.1)",
    color: "#6366f1",
  },
];

// decorative hero device — hardcoded, purely visual
const heroBars = [
  { num: "1", segs: [["40%", "#6366f1", "3.84"], ["28%", "#0ea5e9", "2.71"], ["22%", "#10b981", "2.16"]], util: "95%", utilColor: "#10b981" },
  { num: "2", segs: [["50%", "#f59e0b", "4.81"], ["36%", "#6366f1", "3.51"]], util: "88%", utilColor: "#f59e0b" },
  { num: "3", segs: [["62%", "#a855f7", "3.20"], ["28%", "#0ea5e9", "1.44"]], util: "91%", utilColor: "#10b981" },
  { num: "4", segs: [["44%", "#10b981", "4.24"], ["31%", "#f59e0b", "2.95"], ["18%", "#6366f1", "1.77"]], util: "97%", utilColor: "#10b981" },
];

export default function Home() {
  return (
    <div className="mx-auto max-w-[1120px] px-4">
      {/* ── HERO ── */}
      <section className="grid grid-cols-1 items-center gap-14 py-12 lg:grid-cols-[1.1fr_0.9fr] lg:py-16">
        {/* left copy */}
        <div>
          <div className="mb-6 inline-flex items-center gap-2.5 font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-accent">
            <span className="inline-block h-[1.5px] w-[22px] shrink-0 rounded-sm bg-accent" />
            Rebar · Cutting Stock · Waste Reuse
          </div>
          <h1 className="mb-6 font-display text-[clamp(2.6rem,4.5vw,3.7rem)] font-extrabold leading-[0.95] tracking-[-0.05em]">
            Cut more bars<br />from every<br />length of steel.
          </h1>
          <p className="mb-8 max-w-[44ch] font-body text-[17px] leading-[1.72] text-ink-2">
            Optimal cutting patterns, cross-sheet offcut reuse, and site-ready Excel exports — so every meter of rebar earns its place on site.
          </p>
          <div className="mb-9 flex flex-wrap items-center gap-3">
            <Link
              href="/projects"
              className="flex items-center gap-2.5 rounded-full bg-accent px-[26px] py-3.5 font-body text-[15px] font-bold text-white shadow-[0_8px_24px_rgba(99,102,241,0.34)] transition-all hover:-translate-y-0.5 hover:bg-accent-deep"
            >
              View Projects
              <IconArrowRight className="h-4 w-4" stroke={2.2} />
            </Link>
            <Link
              href="/projects"
              className="rounded-full border-[1.5px] border-[var(--color-line-2)] bg-white px-6 py-3.5 font-body text-[15px] font-bold text-ink transition-all hover:-translate-y-0.5 hover:border-accent hover:text-accent"
            >
              New Project
            </Link>
          </div>
          {/* metrics pill */}
          <div className="inline-flex items-center rounded-2xl border border-[var(--color-line)] bg-white/80 px-5 py-3.5 backdrop-blur-md">
            {[
              ["214.6m", "recovered", "#6366f1"],
              ["92.4%", "utilization", "#10b981"],
              ["56", "offcuts", "#0ea5e9"],
            ].map(([v, l, c], i) => (
              <div key={l} className="flex items-center">
                {i > 0 && <div className="mr-[18px] h-[34px] w-px bg-[var(--color-line)]" />}
                <div className="pr-[18px] text-center">
                  <div className="font-display text-[21px] font-extrabold tracking-[-0.03em]" style={{ color: c }}>{v}</div>
                  <div className="mt-0.5 font-mono text-[9px] font-bold uppercase tracking-[0.1em] text-ink-3">{l}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* right device preview (decorative) */}
        <div className="relative">
          <div className="absolute -top-4 right-3.5 z-[2] flex items-center gap-[7px] rounded-full border border-[var(--color-line)] bg-white px-3.5 py-[7px] shadow-[var(--shadow-card)]">
            <span className="h-[7px] w-[7px] shrink-0 rounded-full bg-grass shadow-[0_0_0_3px_rgba(16,185,129,0.18)]" />
            <span className="font-mono text-[9.5px] font-bold tracking-[0.08em] text-[#059669]">OPTIMIZATION COMPLETE</span>
          </div>
          <div className="absolute -bottom-5 -left-4 z-[2] rounded-2xl bg-accent px-[18px] py-3 shadow-[0_12px_32px_rgba(99,102,241,0.38)]">
            <div className="mb-[3px] font-mono text-[8.5px] font-bold uppercase tracking-[0.12em] text-white/60">Waste saved</div>
            <div className="font-display text-2xl font-extrabold tracking-[-0.04em] text-white">−18.4m</div>
          </div>
          <div className="overflow-hidden rounded-[22px] border border-black/[0.09] bg-white shadow-[0_28px_80px_rgba(0,0,0,0.11),0_4px_16px_rgba(0,0,0,0.06)]">
            {/* chrome */}
            <div className="flex h-11 items-center gap-3 border-b border-black/[0.07] bg-canvas px-4">
              <div className="flex shrink-0 gap-[5px]">
                <div className="h-[11px] w-[11px] rounded-full bg-[#f43f5e]" />
                <div className="h-[11px] w-[11px] rounded-full bg-[#f59e0b]" />
                <div className="h-[11px] w-[11px] rounded-full bg-[#10b981]" />
              </div>
              <div className="flex flex-1 justify-center">
                <div className="rounded-[7px] border border-[var(--color-line)] bg-white px-3 py-1 font-mono text-[10px] font-bold text-ink-3">
                  GF-Columns.xlsx · Ø16mm
                </div>
              </div>
            </div>
            {/* body */}
            <div className="px-[18px] pb-[18px] pt-4">
              <div className="mb-3.5 flex flex-col gap-[7px]">
                {heroBars.map((bar) => (
                  <div key={bar.num} className="flex items-center gap-2">
                    <div className="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-[7px] border border-accent/20 bg-accent/[0.09] font-display text-[12px] font-extrabold text-accent-deep">
                      {bar.num}
                    </div>
                    <div className="flex h-[26px] flex-1 overflow-hidden rounded-[7px] border border-[var(--color-line)] bg-[#f1f3f8]">
                      {bar.segs.map(([w, c, lbl], i) => (
                        <div key={i} className="flex items-center justify-center border-r-[1.5px] border-white/50" style={{ width: w, background: c as string }}>
                          <span className="font-mono text-[8px] font-bold text-white">{lbl}</span>
                        </div>
                      ))}
                      <div className="flex-1 bg-[repeating-linear-gradient(45deg,rgba(244,63,94,0.26)_0_5px,rgba(244,63,94,0.08)_5px_10px)]" />
                    </div>
                    <div className="w-9 shrink-0 text-right font-display text-[12px] font-extrabold" style={{ color: bar.utilColor }}>{bar.util}</div>
                  </div>
                ))}
              </div>
              <div className="flex border-t border-[var(--color-line)] pt-3">
                {[["31", "bars", "#6366f1"], ["92.1%", "utilization", "#10b981"], ["2.4m", "offcut", "#f43f5e"]].map(([v, l, c], i) => (
                  <div key={l} className="flex flex-1 items-center justify-center">
                    {i > 0 && <div className="h-8 w-px bg-[var(--color-line)]" />}
                    <div className="flex-1 text-center">
                      <div className="font-display text-[17px] font-extrabold tracking-[-0.03em]" style={{ color: c }}>{v}</div>
                      <div className="mt-px font-mono text-[8px] font-bold uppercase tracking-[0.1em] text-ink-3">{l}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="pt-12">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <div className="mb-3.5 font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-accent">How it works</div>
            <h2 className="max-w-[28ch] font-display text-[clamp(1.7rem,3vw,2.5rem)] font-extrabold leading-[1.05] tracking-[-0.04em]">
              From bar-bending schedule to site-ready cutting plan.
            </h2>
          </div>
          <Link href="/projects" className="flex shrink-0 items-center gap-1.5 font-body text-[13.5px] font-semibold text-accent hover:text-accent-deep">
            Get started
            <IconArrowRight className="h-3.5 w-3.5" stroke={2.2} />
          </Link>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {steps.map((s) => (
            <div key={s.no} className="card-surface relative overflow-hidden p-7 transition-transform duration-200 hover:-translate-y-1 hover:shadow-[var(--shadow-card-h)]">
              <div className="pointer-events-none absolute -top-1 left-6 select-none font-mono text-[56px] font-bold leading-none text-black/[0.05]">{s.no}</div>
              <div className="relative">
                <div className="mb-[22px] flex h-[46px] w-[46px] items-center justify-center rounded-[14px]" style={{ background: s.tint, color: s.color }}>
                  <s.Icon className="h-5 w-5" stroke={1.8} />
                </div>
                <div className="mb-2.5 font-display text-[19px] font-bold tracking-[-0.025em]">{s.title}</div>
                <div className="font-body text-[14px] leading-[1.65] text-ink-2">{s.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
        {features.map((f) => (
          <div key={f.title} className="flex items-start gap-4 rounded-2xl border border-[var(--color-line)] bg-white/[0.82] p-5 backdrop-blur-md transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-card-h)]">
            <div className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-xl" style={{ background: f.tint, color: f.color }}>
              <f.Icon className="h-5 w-5" stroke={1.8} />
            </div>
            <div>
              <div className="mb-1.5 font-display text-[16px] font-bold tracking-[-0.02em]">{f.title}</div>
              <div className="font-body text-[13.5px] leading-[1.6] text-ink-2">{f.desc}</div>
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
