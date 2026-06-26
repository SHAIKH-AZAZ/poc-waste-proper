"use client";
import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  IconFile,
  IconTrash,
  IconUpload,
  IconArrowLeft,
  IconPackage,
  IconRefresh,
  IconEye,
  IconRecycle,
  IconInfoCircle,
  IconChevronLeft,
  IconChevronRight,
  IconChevronsLeft,
  IconChevronsRight,
} from "@tabler/icons-react";
import DashboardAnalytics from "./components/DashboardAnalytics";
import WasteUploadModal from "@/components/customs/WasteUploadModal";

interface Sheet {
  id: number;
  sheetNumber: number;
  fileName: string;
  fileSize: number | null;
  status: string;
  uploadedAt: string;
  mongoDataId: string | null;
  _count: {
    results: number;
    wasteProduced: number;
  };
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
  sourceBarNumber: number;
  sourceSheet: {
    id: number;
    sheetNumber: number;
    fileName: string;
  };
  cutsOnSourceBar: { barCode: string; length: number; element: string }[];
  usages?: {
    usedInSheet: {
      id: number;
      sheetNumber: number;
      fileName: string;
    };
    usedForBarCode: string;
    cutLength: number;
  }[];
}

interface WasteSummary {
  totalPieces: number;
  availablePieces: number;
  usedPieces: number;
  totalAvailableLength: number;
  byDia: Record<number, { available: number; used: number; totalLength: number }>;
}

export default function ProjectPage() {
  const params = useParams();
  const projectId = params.projectId as string;

  const [projectName, setProjectName] = useState("");
  const [sheets, setSheets] = useState<Sheet[]>([]);
  const [waste, setWaste] = useState<WasteItem[]>([]);
  const [wasteSummary, setWasteSummary] = useState<WasteSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"sheets" | "waste" | "dashboard">("sheets");
  const [selectedWasteDia, setSelectedWasteDia] = useState<number | null>(null);
  const [selectedWasteStatus, setSelectedWasteStatus] = useState<string | null>(null);
  const [showWasteUploadModal, setShowWasteUploadModal] = useState(false);

  // Waste Pagination State
  const [currentWastePage, setCurrentWastePage] = useState(1);
  const [wasteItemsPerPage, setWasteItemsPerPage] = useState(50);

  const fetchProjectData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Parallelize requests for better performance
      const [sheetsRes, wasteRes, projectsRes] = await Promise.all([
        fetch(`/api/sheets?projectId=${projectId}`),
        // Initial load: Only fetch summary/SQL data, skip heavy Mongo lookups
        fetch(`/api/waste?projectId=${projectId}&summaryOnly=true`),
        fetch("/api/projects")
      ]);

      const [sheetsData, wasteData, projectsData] = await Promise.all([
        sheetsRes.json(),
        wasteRes.json(),
        projectsRes.json()
      ]);

      // Handle Sheets Response
      if (sheetsData.success) {
        setSheets(sheetsData.sheets);
      }

      // Handle Waste Response
      if (wasteData.success) {
        setWaste(wasteData.waste);
        setWasteSummary(wasteData.summary);
      }

      // Handle Projects Response
      if (projectsData.success) {
        const project = projectsData.projects.find((p: { id: number }) => p.id === parseInt(projectId));
        if (project) {
          setProjectName(project.name);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch project data");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  // Lazy load detailed waste data (with Mongo origins) when needed
  const fetchWasteDetails = async (dia: number) => {
    try {
      // Check if we already have details for this dia (optimization)
      const existingItems = waste.filter(w => w.dia === dia);
      const hasDetails = existingItems.some(w => w.cutsOnSourceBar && w.cutsOnSourceBar.length > 0);

      // If we simply have empty source bars, it might be that there ARE no cuts, or we haven't fetched them.
      // But typically "summaryOnly" returns empty arrays.
      // To be safe, we just fetch if we are in a "summary" state (which we can assume if we haven't fetched details yet).
      // A simpler check: just fetch it. The API is now fast enough for a single dia.

      const res = await fetch(`/api/waste?projectId=${projectId}&dia=${dia}`); // full fetch for this dia
      const data = await res.json();

      if (data.success) {
        // Merge new detailed items into existing waste state
        setWaste(prev => {
          const otherDiaWaste = prev.filter(w => w.dia !== dia);
          return [...otherDiaWaste, ...data.waste];
        });
      }
    } catch (err) {
      console.error("Failed to load waste details", err);
    }
  };

  useEffect(() => {
    fetchProjectData();
  }, [fetchProjectData]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("projectId", projectId);

      const res = await fetch("/api/sheets", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (data.success) {
        fetchProjectData();
      } else {
        throw new Error(data.error || "Failed to upload sheet");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload sheet");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const deleteSheet = async (sheetId: number) => {
    if (!confirm("Are you sure you want to delete this sheet and all its calculations?")) {
      return;
    }

    try {
      const res = await fetch(`/api/sheets?sheetId=${sheetId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        fetchProjectData();
      } else {
        throw new Error(data.error || "Failed to delete sheet");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete sheet");
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatLength = (mm: number) => {
    return `${(mm / 1000).toFixed(2)}m`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "calculated":
      case "completed":
        return "bg-emerald-100 text-emerald-700 ring-1 ring-emerald-600/20";
      case "uploaded":
        return "bg-amber-100 text-amber-700 ring-1 ring-amber-600/20";
      case "available":
        return "bg-blue-100 text-blue-700 ring-1 ring-blue-600/20";
      case "used":
        return "bg-slate-100 text-slate-600 ring-1 ring-slate-500/20";
      default:
        return "bg-slate-100 text-slate-600 ring-1 ring-slate-500/20";
    }
  };

  // Filter waste by selected diameter and status
  const filteredWaste = waste.filter(item => {
    const diaMatch = selectedWasteDia ? item.dia === selectedWasteDia : true;
    const statusMatch = selectedWasteStatus ? item.status === selectedWasteStatus : true;
    return diaMatch && statusMatch;
  });

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentWastePage(1);
  }, [selectedWasteDia, selectedWasteStatus]);

  // Pagination Logic
  const totalWastePages = Math.ceil(filteredWaste.length / wasteItemsPerPage);
  const paginatedWaste = filteredWaste.slice(
    (currentWastePage - 1) * wasteItemsPerPage,
    currentWastePage * wasteItemsPerPage
  );

  const goToWastePage = (page: number) => {
    const p = Math.max(1, Math.min(page, totalWastePages));
    setCurrentWastePage(p);
  };

  return (
    <div className="mx-auto max-w-[1120px] px-4 pt-8">
        {/* Header card */}
        <div className="relative mb-[18px] overflow-hidden rounded-[20px] border border-accent/[0.14] bg-gradient-to-br from-accent/[0.05] to-sky/[0.02] px-[26px] py-[22px]">
          <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-accent to-sky" />
          <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-[radial-gradient(circle,rgba(14,165,233,0.1),transparent_70%)]" />
          <Link
            href="/projects"
            className="group mb-4 inline-flex items-center gap-[7px] font-body text-[12.5px] font-semibold text-accent transition-colors hover:text-accent-deep"
          >
            <IconArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-1" />
            Back to Projects
          </Link>
          <div className="flex items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-[18px]">
              <div className="flex h-[62px] w-[62px] shrink-0 items-center justify-center rounded-[18px] bg-gradient-to-br from-accent to-sky shadow-[0_12px_28px_rgba(99,102,241,0.32)]">
                <IconPackage className="h-7 w-7 text-white" stroke={1.5} />
              </div>
              <div className="min-w-0">
                <h1 className="font-display text-[clamp(1.6rem,2.8vw,2.2rem)] font-extrabold tracking-[-0.04em]">{projectName || `Project #${projectId}`}</h1>
                <p className="mt-1.5 font-body text-[13.5px] text-ink-2">
                  {sheets.length} sheets · {wasteSummary?.availablePieces || 0} offcuts available
                </p>
              </div>
            </div>
            <div className="flex shrink-0 gap-2.5">
              <button
                onClick={fetchProjectData}
                disabled={loading}
                className="flex items-center gap-2 rounded-full border border-[var(--color-line)] bg-white px-4 py-2.5 text-ink-2 transition-colors hover:text-ink"
              >
                <IconRefresh className={`h-5 w-5 ${loading ? "animate-spin" : ""}`} />
              </button>
              <label className="flex cursor-pointer items-center gap-2 rounded-full bg-accent px-[18px] py-2.5 pl-[15px] font-body text-[14px] font-bold text-white shadow-[0_6px_18px_rgba(99,102,241,0.3)] transition-all hover:-translate-y-0.5 hover:bg-accent-deep">
                <IconUpload className="h-5 w-5" />
                {uploading ? "Uploading…" : "Upload Sheet"}
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileUpload}
                  disabled={uploading}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* Tabs */}
        <div className="mb-6 inline-flex w-fit gap-[3px] rounded-[14px] border border-[var(--color-line)] bg-[rgba(241,243,248,0.9)] p-1">
          <button
            onClick={() => setActiveTab("sheets")}
            className={`flex items-center gap-2 rounded-[10px] px-5 py-2.5 font-body text-[13.5px] font-bold transition-all ${activeTab === "sheets" ? "bg-white text-ink shadow-[0_1px_3px_rgba(0,0,0,0.1)]" : "text-ink-2 hover:text-ink"}`}
          >
            Sheets
            <span className="rounded-full bg-accent/[0.12] px-2 py-0.5 font-mono text-[9.5px] font-bold text-accent">{sheets.length}</span>
          </button>
          <button
            onClick={() => {
              setActiveTab("waste");
              setSelectedWasteDia(null);
              setSelectedWasteStatus(null);
            }}
            className={`flex items-center gap-2 rounded-[10px] px-5 py-2.5 font-body text-[13.5px] font-bold transition-all ${activeTab === "waste" ? "bg-white text-ink shadow-[0_1px_3px_rgba(0,0,0,0.1)]" : "text-ink-2 hover:text-ink"}`}
          >
            Offcut Inventory
            <span className="rounded-full bg-grass/[0.14] px-2 py-0.5 font-mono text-[9.5px] font-bold text-grass">{wasteSummary?.availablePieces || 0}</span>
          </button>
          <button
            onClick={() => setActiveTab("dashboard")}
            className={`rounded-[10px] px-5 py-2.5 font-body text-[13.5px] font-bold transition-all ${activeTab === "dashboard" ? "bg-white text-ink shadow-[0_1px_3px_rgba(0,0,0,0.1)]" : "text-ink-2 hover:text-ink"}`}
          >
            Dashboard
          </button>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-16">
            <div className="flex flex-col items-center gap-4">
              <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-slate-500">Loading project data...</p>
            </div>
          </div>
        )}

        {/* Sheets Tab */}
        {!loading && activeTab === "sheets" && (
          <div className="space-y-4">
            {sheets.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-2xl border-2 border-dashed border-slate-200">
                <IconFile className="w-16 h-16 mx-auto text-slate-300 mb-4" />
                <h3 className="text-lg font-semibold text-slate-900 mb-2">No sheets yet</h3>
                <p className="text-slate-500 mb-6 max-w-sm mx-auto">Upload your first Excel sheet to start optimizing</p>
                <label className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors cursor-pointer font-medium">
                  <IconUpload className="w-5 h-5" />
                  Upload Sheet
                  <input type="file" accept=".xlsx,.xls" onChange={handleFileUpload} disabled={uploading} className="hidden" />
                </label>
              </div>
            ) : (
              sheets.map((sheet) => (
                <div key={sheet.id} className="group bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-lg hover:border-blue-200 transition-all duration-300">
                  <div className="p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-start gap-4">
                      {/* Sheet Icon/Number Badge */}
                      {(sheet.fileName.toLowerCase().includes('offcut') || 
                        sheet.fileName.toLowerCase().includes('waste') ||
                        sheet.fileName.toLowerCase().includes('manual waste upload')) ? (
                        <div className="w-12 h-12 bg-gradient-to-br from-amber-100 to-orange-100 rounded-xl flex items-center justify-center border border-amber-200 shadow-sm flex-shrink-0">
                          <IconRecycle className="w-6 h-6 text-amber-600" />
                        </div>
                      ) : (
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl flex items-center justify-center border border-indigo-100 shadow-sm flex-shrink-0">
                          <span className="text-lg font-bold text-indigo-600">#{sheet.sheetNumber}</span>
                        </div>
                      )}
                      <div className="min-w-0">
                        <Link href={`/project/${projectId}/sheet/${sheet.id}`} className="block">
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-slate-900 text-lg hover:text-blue-600 transition-colors truncate">
                              {sheet.fileName}
                            </h3>
                            {/* Waste Only Marker */}
                            {(sheet.fileName.toLowerCase().includes('offcut') || 
                              sheet.fileName.toLowerCase().includes('waste') ||
                              sheet.fileName.toLowerCase().includes('manual waste upload')) && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gradient-to-r from-amber-100 to-orange-100 text-amber-700 text-xs font-bold rounded-full border border-amber-200 shadow-sm flex-shrink-0">
                                <IconRecycle className="w-3 h-3" />
                                WASTE ONLY
                              </span>
                            )}
                          </div>
                        </Link>
                        <div className="flex flex-wrap items-center gap-3 mt-1.5 text-sm text-slate-500">
                          <span className="flex items-center gap-1.5 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100">
                            <IconFile size={14} className="text-slate-400" />
                            {formatDate(sheet.uploadedAt)}
                          </span>
                          {/* Show different stats for waste-only sheets */}
                          {(sheet.fileName.toLowerCase().includes('offcut') || 
                            sheet.fileName.toLowerCase().includes('waste') ||
                            sheet.fileName.toLowerCase().includes('manual waste upload')) ? (
                            <>
                              <span className="hidden sm:inline text-slate-300">|</span>
                              <span className="flex items-center gap-1.5 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-100">
                                <IconRecycle size={14} className="text-amber-600" />
                                <span className="font-semibold text-amber-700">{sheet._count.wasteProduced}</span> waste pieces
                              </span>
                            </>
                          ) : (
                            <>
                              <span className="hidden sm:inline text-slate-300">|</span>
                              <span className="flex items-center gap-1">
                                <span className="font-semibold text-slate-700">{sheet._count.results}</span> calculations
                              </span>
                              <span className="hidden sm:inline text-slate-300">|</span>
                              <span className="flex items-center gap-1">
                                <span className="font-semibold text-slate-700">{sheet._count.wasteProduced}</span> waste pieces
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto mt-2 sm:mt-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-50">
                      <span className={`px-2.5 py-1 text-xs font-semibold rounded-full border ${sheet.status === 'calculated' || sheet.status === 'completed'
                        ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                        : "bg-slate-50 text-slate-600 border-slate-100"
                        }`}>
                        {sheet.status}
                      </span>

                      <div className="h-6 w-px bg-slate-200 mx-1 hidden sm:block"></div>

                      <Link
                        href={`/project/${projectId}/sheet/${sheet.id}`}
                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                        title="View Sheet"
                      >
                        <IconEye className="w-5 h-5" />
                      </Link>
                      <button
                        onClick={() => deleteSheet(sheet.id)}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                        title="Delete Sheet"
                      >
                        <IconTrash className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  {/* Results Summary Grid */}
                  {sheet.results && sheet.results.length > 0 && (
                    <div className="px-6 pb-6 mt-[-4px]">
                      <div className="bg-slate-50/50 rounded-xl p-4 border border-slate-100">
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                          Calculation Results
                        </p>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6 gap-3">
                          {sheet.results.map((result) => (
                            <Link
                              key={result.id}
                              href={`/project/${projectId}/sheet/${sheet.id}`}
                              className="group/card flex flex-col bg-white p-3 rounded-lg border border-slate-200 shadow-[0_2px_4px_rgba(0,0,0,0.02)] hover:shadow-md hover:border-blue-300 transition-all cursor-pointer"
                            >
                              <div className="flex justify-between items-start mb-2">
                                <span className="font-bold text-slate-800 text-sm group-hover/card:text-blue-700 transition-colors">
                                  Dia {result.dia}
                                </span>
                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-tight ${result.algorithm.toLowerCase().includes('dynamic')
                                  ? 'bg-purple-100 text-purple-700'
                                  : 'bg-blue-100 text-blue-700'
                                  }`}>
                                  {result.algorithm.substring(0, 3)}
                                </span>
                              </div>
                              <div className="mt-auto">
                                <div className="text-xs text-slate-500 font-medium">
                                  <span className="text-slate-900 font-bold">{result.totalBarsUsed}</span> bars
                                </div>
                              </div>
                            </Link>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* Waste Upload Modal */}
        {showWasteUploadModal && (
          <WasteUploadModal
            projectId={projectId}
            onClose={() => setShowWasteUploadModal(false)}
            onSuccess={() => {
              fetchProjectData();
              setShowWasteUploadModal(false);
            }}
          />
        )}

        {/* Waste Tab */}
        {!loading && activeTab === "waste" && (
          <div className="space-y-6">
            {/* Upload Waste Button */}
            <div className="flex justify-end">
              <button
                onClick={() => setShowWasteUploadModal(true)}
                className="flex items-center gap-2 rounded-full bg-grass px-5 py-2.5 font-body text-[14px] font-bold text-white shadow-[0_6px_18px_rgba(16,185,129,0.3)] transition-all hover:-translate-y-0.5 hover:bg-[#059669]"
              >
                <IconRecycle className="h-5 w-5" />
                Upload Waste Materials
              </button>
            </div>

            {/* Waste Summary */}
            {wasteSummary && (
              <div className="grid grid-cols-2 gap-[14px] md:grid-cols-4">
                {[
                  { v: wasteSummary.totalPieces, l: "Total pieces", c: "#6366f1", status: null as string | null, active: selectedWasteStatus === null },
                  { v: wasteSummary.availablePieces, l: "Available", c: "#10b981", status: "available", active: selectedWasteStatus === "available" },
                  { v: wasteSummary.usedPieces, l: "Reused", c: "#6b7280", status: "used", active: selectedWasteStatus === "used" },
                  { v: formatLength(wasteSummary.totalAvailableLength), l: "Available length", c: "#a855f7", status: undefined, active: false },
                ].map((t) => {
                  const clickable = t.status !== undefined;
                  return (
                    <button
                      key={t.l}
                      onClick={clickable ? () => setSelectedWasteStatus(t.active ? null : t.status as string | null) : undefined}
                      className={`card-surface relative overflow-hidden p-5 text-left transition-all ${clickable ? "hover:-translate-y-0.5 hover:shadow-[var(--shadow-card-h)]" : ""} ${t.active ? "ring-2 ring-accent/30" : ""}`}
                    >
                      <div className="absolute -bottom-2.5 -right-2.5 h-[72px] w-[72px] rounded-full opacity-[0.07]" style={{ background: t.c }} />
                      <p className="font-display text-[32px] font-extrabold tracking-[-0.04em]" style={{ color: t.c }}>{t.v}</p>
                      <p className="mt-1 font-body text-[13px] text-ink-2">{t.l}</p>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Available offcuts by diameter */}
            {wasteSummary && Object.keys(wasteSummary.byDia).length > 0 && (
              <div className="card-surface p-6">
                <div className="mb-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                  <h3 className="font-display text-[18px] font-bold tracking-[-0.02em]">Available offcuts by diameter</h3>
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex gap-[3px] rounded-[10px] border border-[var(--color-line)] bg-[rgba(241,243,248,0.9)] p-1">
                      {[
                        { k: null as string | null, label: "All" },
                        { k: "available", label: "Available" },
                        { k: "used", label: "Used" },
                      ].map((o) => (
                        <button
                          key={o.label}
                          onClick={() => setSelectedWasteStatus(o.k)}
                          className={`rounded-[7px] px-3 py-1 font-body text-[11px] font-bold transition-all ${selectedWasteStatus === o.k ? "bg-white text-ink shadow-[0_1px_3px_rgba(0,0,0,0.1)]" : "text-ink-2 hover:text-ink"}`}
                        >
                          {o.label}
                        </button>
                      ))}
                    </div>
                    {(selectedWasteDia || selectedWasteStatus) && (
                      <button
                        onClick={() => {
                          setSelectedWasteDia(null);
                          setSelectedWasteStatus(null);
                        }}
                        className="rounded-full bg-accent/[0.08] px-2.5 py-1 font-body text-[11px] font-bold text-accent transition-colors hover:bg-accent hover:text-white"
                      >
                        Clear filters
                      </button>
                    )}
                  </div>
                </div>
                <div className="flex flex-col gap-3.5">
                  {(() => {
                    const entries = Object.entries(wasteSummary.byDia);
                    const maxAvail = Math.max(1, ...entries.map(([, d]) => d.available));
                    const PAL = ["#6366f1", "#0ea5e9", "#10b981", "#f59e0b", "#a855f7", "#f97316", "#f43f5e"];
                    const PAL2 = ["#818cf8", "#38bdf8", "#34d399", "#fbbf24", "#c084fc", "#fb923c", "#fb7185"];
                    return entries.map(([diaString, data], i) => {
                      const dia = parseInt(diaString);
                      const isSelected = selectedWasteDia === dia;
                      const pct = Math.max(12, (data.available / maxAvail) * 100);
                      return (
                        <button
                          key={dia}
                          onClick={() => {
                            if (isSelected) setSelectedWasteDia(null);
                            else {
                              setSelectedWasteDia(dia);
                              fetchWasteDetails(dia);
                            }
                          }}
                          className={`flex items-center gap-4 rounded-xl px-2 py-1.5 text-left transition-colors ${isSelected ? "bg-accent/[0.06]" : "hover:bg-canvas"}`}
                        >
                          <div className="flex w-[74px] shrink-0 items-center gap-2">
                            <span className="h-[11px] w-[11px] rounded-full" style={{ background: PAL[i % PAL.length] }} />
                            <span className="font-mono text-[13px] font-bold">Ø{dia}</span>
                          </div>
                          <div className="relative h-[30px] flex-1 overflow-hidden rounded-lg bg-[#f1f3f8]">
                            <div className="anim-grow-w flex h-full items-center rounded-lg pl-3" style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${PAL[i % PAL.length]}, ${PAL2[i % PAL2.length]})` }}>
                              <span className="font-mono text-[11px] font-bold text-white">{data.available} pcs</span>
                            </div>
                          </div>
                          <div className="w-[130px] shrink-0 text-right font-body text-[12.5px] text-ink-2">
                            <span className="font-display font-bold text-ink">{formatLength(data.totalLength)}</span> available
                          </div>
                          <div className="w-[70px] shrink-0 text-right font-body text-[12px] text-ink-3">{data.used} used</div>
                        </button>
                      );
                    });
                  })()}
                </div>
              </div>
            )}

            {/* Waste List */}
            {selectedWasteDia ? (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-5 border-b border-slate-100 flex justify-between items-center">
                  <h3 className="font-semibold text-slate-900">
                    Waste Inventory Details
                    <span className="ml-2 text-blue-600">(Dia {selectedWasteDia}mm)</span>
                    {selectedWasteStatus && <span className="ml-2 text-emerald-600">({selectedWasteStatus === 'available' ? 'Available Only' : 'Used Only'})</span>}
                  </h3>
                  <span className="text-xs text-slate-500 font-medium">Showing {filteredWaste.length} pieces</span>
                </div>
                {filteredWaste.length === 0 ? (
                  <div className="p-12 text-center text-slate-500">
                    <IconRecycle className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                    {`No waste pieces found for Dia ${selectedWasteDia}mm ${selectedWasteStatus ? `with status ${selectedWasteStatus}` : ''}.`}
                  </div>
                ) : (
                  <>
                    <div className="overflow-x-auto max-h-[650px] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
                      <table className="w-full text-sm border-separate border-spacing-0">
                        <thead className="sticky top-0 z-20">
                          <tr className="bg-white/70 backdrop-blur-md sticky top-0 z-20">
                            <th className="px-6 py-3.5 text-left text-[11px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-100 first:pl-8">ID</th>
                            <th className="px-6 py-3.5 text-left text-[11px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-100">Dia</th>
                            <th className="px-6 py-3.5 text-left text-[11px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-100">Length</th>
                            <th className="px-6 py-3.5 text-left text-[11px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-100">Source Sheet</th>
                            <th className="px-6 py-3.5 text-left text-[11px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-100">Origin (Bars)</th>
                            <th className="px-6 py-3.5 text-left text-[11px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-100">Used In</th>
                            <th className="px-6 py-3.5 text-right text-[11px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-100 last:pr-8">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {paginatedWaste.map((item, idx) => (
                            <tr
                              key={item.id}
                              className={`group transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'} hover:bg-blue-50/40`}
                            >
                              <td className="px-6 py-4 first:pl-8">
                                <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-mono text-[10px] font-bold border border-slate-200 group-hover:bg-white transition-colors">
                                  W-{item.id}
                                </span>
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-2">
                                  <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                                  <span className="font-semibold text-slate-700">{item.dia}mm</span>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <span className="font-bold text-indigo-600 tabular-nums">
                                  {formatLength(item.length)}
                                </span>
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex flex-col gap-0.5">
                                  <div className="text-slate-900 font-semibold text-xs flex items-center gap-1.5">
                                    <IconFile size={12} className="text-slate-400" />
                                    Sheet #{item.sourceSheet.sheetNumber}
                                  </div>
                                  <div className="text-[10px] text-slate-400 font-medium truncate max-w-[150px]" title={item.sourceSheet.fileName}>
                                    {item.sourceSheet.fileName}
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex flex-col gap-1">
                                  <div className="text-slate-700 font-medium text-xs">Bar #{item.sourceBarNumber}</div>
                                  {item.cutsOnSourceBar && item.cutsOnSourceBar.length > 0 && (
                                    <div className="flex flex-wrap gap-1">
                                      {item.cutsOnSourceBar.slice(0, 2).map((cut, i) => (
                                        <span key={i} className="text-[9px] px-1.5 bg-white border border-slate-200 rounded text-slate-500 font-medium">
                                          {formatLength(cut.length)}
                                        </span>
                                      ))}
                                      {item.cutsOnSourceBar.length > 2 && (
                                        <span className="text-[9px] text-slate-400 font-medium">
                                          +{item.cutsOnSourceBar.length - 2} more
                                        </span>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                {item.status === 'used' && item.usages && item.usages.length > 0 ? (
                                  <div className="flex flex-col gap-0.5">
                                    <div className="text-slate-900 font-semibold text-xs flex items-center gap-1.5">
                                      <IconRecycle size={12} className="text-emerald-500" />
                                      Sheet #{item.usages[0].usedInSheet.sheetNumber}
                                    </div>
                                    <Link
                                      href={`/project/${projectId}/sheet/${item.usages[0].usedInSheet.id}`}
                                      className="text-[10px] text-blue-500 hover:text-blue-700 hover:underline font-medium truncate max-w-[150px]"
                                      title={item.usages[0].usedInSheet.fileName}
                                    >
                                      {item.usages[0].usedInSheet.fileName}
                                    </Link>
                                  </div>
                                ) : (
                                  <span className="text-slate-300 text-xs">-</span>
                                )}
                              </td>
                              <td className="px-6 py-4 text-right last:pr-8">
                                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${item.status === 'available'
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                                  : 'bg-slate-100 text-slate-500 border-slate-200'
                                  }`}>
                                  {item.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Waste Pagination Footer */}
                    <div className="bg-slate-50 border-t border-slate-100 px-6 py-3 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-500 font-medium">Rows:</span>
                          <select
                            value={wasteItemsPerPage}
                            onChange={(e) => {
                              setWasteItemsPerPage(Number(e.target.value));
                              setCurrentWastePage(1);
                            }}
                            className="bg-white border border-slate-200 text-slate-700 text-xs rounded shadow-sm focus:ring-blue-500 focus:border-blue-500 py-1 pl-2 pr-6"
                          >
                            <option value={10}>10</option>
                            <option value={20}>20</option>
                            <option value={50}>50</option>
                            <option value={100}>100</option>
                          </select>
                        </div>
                        <span className="text-xs text-slate-400 hidden sm:inline">
                          {Math.min((currentWastePage - 1) * wasteItemsPerPage + 1, filteredWaste.length)}–
                          {Math.min(currentWastePage * wasteItemsPerPage, filteredWaste.length)} of {filteredWaste.length}
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => goToWastePage(1)}
                          disabled={currentWastePage === 1}
                          className="p-1 rounded hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed text-slate-500 transition-all active:scale-95"
                        >
                          <IconChevronsLeft size={16} />
                        </button>
                        <button
                          onClick={() => goToWastePage(currentWastePage - 1)}
                          disabled={currentWastePage === 1}
                          className="p-1 rounded hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed text-slate-500 transition-all active:scale-95"
                        >
                          <IconChevronLeft size={16} />
                        </button>

                        <span className="px-3 text-xs font-semibold text-slate-700">
                          {currentWastePage} <span className="text-slate-400 font-normal">/ {totalWastePages}</span>
                        </span>

                        <button
                          onClick={() => goToWastePage(currentWastePage + 1)}
                          disabled={currentWastePage === totalWastePages}
                          className="p-1 rounded hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed text-slate-500 transition-all active:scale-95"
                        >
                          <IconChevronRight size={16} />
                        </button>
                        <button
                          onClick={() => goToWastePage(totalWastePages)}
                          disabled={currentWastePage === totalWastePages}
                          className="p-1 rounded hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed text-slate-500 transition-all active:scale-95"
                        >
                          <IconChevronsRight size={16} />
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-slate-200 border-dashed p-12 text-center">
                <IconInfoCircle className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                <h3 className="text-lg font-medium text-slate-900">Select a Diameter</h3>
                <p className="text-slate-500 mt-1">Click on a diameter card above to view its detailed waste inventory.</p>
              </div>
            )}
          </div>
        )}

        {/* Dashboard Tab */}
        {!loading && activeTab === "dashboard" && (
          <DashboardAnalytics sheets={sheets} waste={waste} formatLength={formatLength} />
        )}
    </div>
  );
}
