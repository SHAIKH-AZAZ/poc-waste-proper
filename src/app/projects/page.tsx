"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import {
  IconTrash,
  IconCalendar,
  IconFile,
  IconRecycle,
  IconRefresh,
  IconPlus,
  IconChevronRight,
  IconArrowRight,
  IconBox,
} from "@tabler/icons-react";

interface Sheet {
  id: number;
  sheetNumber: number;
  fileName: string;
  status: string;
  uploadedAt: string;
  _count: {
    results: number;
  };
}

interface Project {
  id: number;
  name: string;
  description: string | null;
  status: string;
  createdAt: string;
  sheets: Sheet[];
  sheetCount: number;
  totalCalculations: number;
  wasteCount: number;
}

// [bg, fg] token pairs matching the mockup palette
function statusStyle(s: string): [string, string] {
  switch (s) {
    case "active":
      return ["rgba(99,102,241,0.12)", "#4f46e5"];
    case "calculated":
    case "completed":
      return ["rgba(16,185,129,0.14)", "#059669"];
    case "uploaded":
      return ["rgba(245,158,11,0.16)", "#b45309"];
    default:
      return ["rgba(0,0,0,0.06)", "#6b7280"];
  }
}

const isWasteSheet = (name: string) => {
  const n = name.toLowerCase();
  return n.includes("offcut") || n.includes("waste");
};

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [creating, setCreating] = useState(false);

  const fetchProjects = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/projects");
      const data = await res.json();
      if (data.success) {
        setProjects(data.projects);
      } else {
        throw new Error(data.error || "Failed to fetch projects");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch projects");
    } finally {
      setLoading(false);
    }
  };

  const createProject = async () => {
    if (!newProjectName.trim()) return;

    setCreating(true);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newProjectName.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setShowCreateModal(false);
        setNewProjectName("");
        fetchProjects();
      } else {
        throw new Error(data.error || "Failed to create project");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create project");
    } finally {
      setCreating(false);
    }
  };

  const deleteProject = async (projectId: number) => {
    if (!confirm("Are you sure you want to delete this project and all its sheets? This action cannot be undone.")) {
      return;
    }

    setDeleting(projectId);
    try {
      const res = await fetch(`/api/projects?projectId=${projectId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        setProjects(projects.filter((p) => p.id !== projectId));
      } else {
        throw new Error(data.error || "Failed to delete project");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete project");
    } finally {
      setDeleting(null);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  const summary = [
    { label: "Projects", value: projects.length, color: "#6366f1" },
    { label: "Sheets", value: projects.reduce((s, p) => s + p.sheetCount, 0), color: "#0ea5e9" },
    { label: "Calculations", value: projects.reduce((s, p) => s + p.totalCalculations, 0), color: "#a855f7" },
    { label: "Offcuts tracked", value: projects.reduce((s, p) => s + p.wasteCount, 0), color: "#10b981" },
  ];

  return (
    <div className="mx-auto max-w-[1120px] px-4 pt-10">
      {/* Header */}
      <div className="mb-7 flex items-end justify-between gap-4">
        <div>
          <div className="mb-2.5 flex items-center gap-2.5 font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-accent">
            <span className="inline-block h-[1.5px] w-5 rounded-sm bg-accent" />
            Workspace
          </div>
          <h1 className="font-display text-[clamp(2rem,3.4vw,2.7rem)] font-extrabold leading-none tracking-[-0.04em]">Projects</h1>
          <p className="mt-2.5 font-body text-[14.5px] text-ink-2">
            Group related sheets, share offcut inventory across them, export site-ready plans.
          </p>
        </div>
        <div className="flex shrink-0 gap-2.5">
          <button
            onClick={fetchProjects}
            disabled={loading}
            className="flex items-center gap-2 rounded-full border border-[var(--color-line)] bg-white px-4 py-2.5 font-body text-[14px] font-semibold text-ink-2 transition-colors hover:text-ink disabled:opacity-50"
          >
            <IconRefresh className={`h-[18px] w-[18px] ${loading ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 rounded-full bg-accent px-[18px] py-2.5 pl-[15px] font-body text-[14px] font-bold text-white shadow-[0_6px_18px_rgba(99,102,241,0.3)] transition-all hover:-translate-y-0.5 hover:bg-accent-deep"
          >
            <IconPlus className="h-4 w-4" stroke={2.2} />
            New Project
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 p-4">
          <p className="text-rose-700">{error}</p>
          <button onClick={() => setError(null)} className="mt-1 text-sm text-rose-600 underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent border-t-transparent" />
            <span className="text-ink-2">Loading projects…</span>
          </div>
        </div>
      )}

      {/* Empty */}
      {!loading && projects.length === 0 && (
        <div className="card-surface py-16 text-center">
          <IconBox className="mx-auto mb-4 h-16 w-16 text-ink-3/50" stroke={1.4} />
          <h3 className="font-display text-lg font-bold text-ink">No projects yet</h3>
          <p className="mb-6 mt-1 text-ink-2">Create your first project to get started</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 rounded-full bg-accent px-6 py-3 font-bold text-white transition-colors hover:bg-accent-deep"
          >
            <IconPlus className="h-5 w-5" />
            Create Project
          </button>
        </div>
      )}

      {!loading && projects.length > 0 && (
        <>
          {/* Summary bar */}
          <div className="card-surface mb-6 flex overflow-hidden">
            {summary.map((m) => (
              <div key={m.label} className="relative flex-1 overflow-hidden border-r border-[var(--color-line)] px-[26px] py-[22px] last:border-r-0">
                <div className="absolute -bottom-2.5 -right-2.5 h-[72px] w-[72px] rounded-full opacity-[0.07]" style={{ background: m.color }} />
                <div className="mb-2.5 font-mono text-[9.5px] font-bold uppercase tracking-[0.16em] text-ink-3">{m.label}</div>
                <div className="font-display text-[34px] font-extrabold tracking-[-0.04em]" style={{ color: m.color }}>{m.value}</div>
              </div>
            ))}
          </div>

          {/* Project cards */}
          <div className="flex flex-col gap-4">
            {projects.map((project) => {
              const [sb, sf] = statusStyle(project.status);
              return (
                <div
                  key={project.id}
                  className="card-surface overflow-hidden transition-all duration-200 hover:-translate-y-[3px] hover:border-accent/25 hover:shadow-[var(--shadow-card-h)]"
                >
                  <div className="flex items-center justify-between gap-4 px-6 py-[22px]">
                    <div className="flex min-w-0 items-center gap-4">
                      <div className="flex h-[50px] w-[50px] shrink-0 items-center justify-center rounded-[14px] border border-accent/20 bg-accent/[0.08]">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                          <path d="M3 7.5 12 3l9 4.5M3 7.5 12 12m-9-4.5V16.5L12 21m0-9 9-4.5M12 12v9m9-13.5V16.5L12 21" stroke="#6366f1" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2.5">
                          <h3 className="whitespace-nowrap font-display text-[20px] font-bold tracking-[-0.025em]">{project.name}</h3>
                          <span className="rounded-full px-2.5 py-[3px] font-mono text-[9.5px] font-bold uppercase tracking-[0.1em]" style={{ background: sb, color: sf }}>
                            {project.status}
                          </span>
                        </div>
                        <div className="mt-[7px] flex items-center gap-4 font-body text-[13px] text-ink-2">
                          <span className="flex items-center gap-1.5"><IconCalendar className="h-3.5 w-3.5" />{formatDate(project.createdAt)}</span>
                          <span className="flex items-center gap-1.5"><IconFile className="h-3.5 w-3.5" />{project.sheetCount} sheets</span>
                          <span className="flex items-center gap-1.5 text-grass"><IconRecycle className="h-3.5 w-3.5" />{project.wasteCount} offcuts</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <Link
                        href={`/project/${project.id}`}
                        className="group/btn flex items-center gap-1.5 rounded-full bg-accent/[0.08] px-3.5 py-[9px] font-body text-[13px] font-bold text-accent transition-colors hover:bg-accent hover:text-white"
                      >
                        Open
                        <IconChevronRight className="h-3.5 w-3.5" />
                      </Link>
                      <button
                        onClick={() => deleteProject(project.id)}
                        disabled={deleting === project.id}
                        className="flex h-[34px] w-[34px] items-center justify-center rounded-[10px] text-ink-3 transition-colors hover:bg-rose-500/[0.08] hover:text-rose-500 disabled:opacity-50"
                        title="Delete project"
                      >
                        {deleting === project.id ? (
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-rose-500 border-t-transparent" />
                        ) : (
                          <IconTrash className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Sheets sub-panel */}
                  <div className="px-6 pb-[18px]">
                    {project.sheets.length === 0 ? (
                      <div className="rounded-[13px] border border-dashed border-accent/25 bg-accent/[0.025] px-4 py-5 text-center">
                        <p className="mb-3 text-[13px] text-ink-2">No sheets uploaded yet</p>
                        <Link
                          href={`/project/${project.id}`}
                          className="inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-[13px] font-bold text-white transition-colors hover:bg-accent-deep"
                        >
                          <IconPlus className="h-4 w-4" />
                          Upload First Sheet
                        </Link>
                      </div>
                    ) : (
                      <div className="rounded-[13px] border border-[var(--color-line)] bg-canvas px-4 py-3.5">
                        <div className="mb-[11px] flex items-center justify-between">
                          <span className="flex items-center gap-1.5 font-mono text-[9.5px] font-bold uppercase tracking-[0.16em] text-ink-3">
                            <span className="h-1.5 w-1.5 rounded-full bg-accent" />Sheets
                          </span>
                          <Link href={`/project/${project.id}`} className="font-body text-[12px] font-semibold text-accent hover:text-accent-deep">
                            View all →
                          </Link>
                        </div>
                        <div className="flex flex-col gap-[7px]">
                          {project.sheets.slice(0, 3).map((sheet) => {
                            const [shb, shf] = statusStyle(sheet.status);
                            const waste = isWasteSheet(sheet.fileName);
                            return (
                              <Link
                                key={sheet.id}
                                href={`/project/${project.id}/sheet/${sheet.id}`}
                                className="flex items-center justify-between rounded-[10px] border border-[var(--color-line)] bg-white px-3 py-[9px] transition-all hover:translate-x-0.5 hover:border-accent/40"
                              >
                                <div className="flex items-center gap-[11px]">
                                  <div
                                    className="flex h-[30px] w-[30px] items-center justify-center rounded-lg font-mono text-[11px] font-bold"
                                    style={{
                                      background: waste ? "rgba(245,158,11,0.14)" : "rgba(99,102,241,0.1)",
                                      color: waste ? "#b45309" : "#4f46e5",
                                    }}
                                  >
                                    {waste ? "♻" : `#${sheet.sheetNumber}`}
                                  </div>
                                  <div>
                                    <div className="font-body text-[13.5px] font-semibold">{sheet.fileName}</div>
                                    <div className="font-body text-[11.5px] text-ink-3">{sheet._count.results} calculations</div>
                                  </div>
                                </div>
                                <span className="rounded-full px-2 py-[3px] font-mono text-[9px] font-bold uppercase tracking-[0.08em]" style={{ background: shb, color: shf }}>
                                  {sheet.status}
                                </span>
                              </Link>
                            );
                          })}
                          {project.sheets.length > 3 && (
                            <p className="pt-1 text-center text-[12px] text-ink-3">+{project.sheets.length - 3} more sheets</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div
          onClick={() => setShowCreateModal(false)}
          className="anim-fade-up fixed inset-0 z-[60] flex items-center justify-center bg-[rgba(15,17,23,0.45)] p-5 backdrop-blur-[6px]"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-[440px] rounded-[24px] border border-[var(--color-line)] bg-white p-7 shadow-[0_30px_80px_rgba(0,0,0,0.3)]"
          >
            <div className="mb-5 flex items-center gap-3.5">
              <div className="flex h-[46px] w-[46px] items-center justify-center rounded-[13px] bg-gradient-to-br from-accent to-sky shadow-[0_8px_20px_rgba(99,102,241,0.32)]">
                <IconBox className="h-[22px] w-[22px] text-white" stroke={1.6} />
              </div>
              <div>
                <div className="font-display text-[19px] font-extrabold tracking-[-0.03em]">New Project</div>
                <div className="font-body text-[12.5px] text-ink-2">Group sheets that should share offcut inventory.</div>
              </div>
            </div>
            <label className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-ink-3">Project name</label>
            <input
              type="text"
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && createProject()}
              placeholder="e.g. Tower C — Cores 5–8"
              autoFocus
              className="mt-2 w-full rounded-xl border-[1.5px] border-[var(--color-line-2)] bg-canvas px-[15px] py-3.5 font-body text-[14.5px] outline-none focus:border-accent focus:bg-white"
            />
            <div className="mt-[22px] flex justify-end gap-2.5">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setNewProjectName("");
                }}
                className="rounded-full px-[18px] py-[11px] font-body text-[14px] font-semibold text-ink-2 transition-colors hover:bg-[#f1f3f8] hover:text-ink"
              >
                Cancel
              </button>
              <button
                onClick={createProject}
                disabled={!newProjectName.trim() || creating}
                className="flex items-center gap-2 rounded-full bg-accent px-[22px] py-[11px] font-body text-[14px] font-bold text-white shadow-[0_6px_18px_rgba(99,102,241,0.32)] transition-colors hover:bg-accent-deep disabled:opacity-50"
              >
                {creating && <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />}
                Create Project
                <IconArrowRight className="h-4 w-4" stroke={2.2} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
