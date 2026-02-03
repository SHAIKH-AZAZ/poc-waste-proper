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
  IconChartPie,
} from "@tabler/icons-react";
import DashboardAnalytics from "./components/DashboardAnalytics";

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/projects"
            className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 transition-colors mb-4 group"
          >
            <IconArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            Back to Projects
          </Link>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                <IconPackage className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">{projectName || `Project #${projectId}`}</h1>
                <p className="text-slate-500 mt-1">
                  {sheets.length} sheet(s) • {wasteSummary?.availablePieces || 0} waste pieces available
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={fetchProjectData}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition-all"
              >
                <IconRefresh className={`w-5 h-5 ${loading ? "animate-spin" : ""}`} />
              </button>
              <label className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all cursor-pointer shadow-lg shadow-blue-500/20 font-medium">
                <IconUpload className="w-5 h-5" />
                {uploading ? "Uploading..." : "Upload Sheet"}
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
        <div className="flex gap-2 mb-6 bg-slate-100/80 p-1.5 rounded-xl w-fit">
          <button
            onClick={() => setActiveTab("sheets")}
            className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === "sheets" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
              }`}
          >
            <span className="flex items-center gap-2">
              <IconFile className="w-4 h-4" />
              Sheets
              <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${activeTab === "sheets" ? "bg-slate-100/50 text-slate-700" : "bg-slate-200 text-slate-600"}`}>
                {sheets.length}
              </span>
            </span>
          </button>
          <button
            onClick={() => {
              setActiveTab("waste");
              setSelectedWasteDia(null);
              setSelectedWasteStatus(null);
            }}
            className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === "waste" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
              }`}
          >
            <span className="flex items-center gap-2">
              Waste Inventory
              <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${activeTab === "waste" ? "bg-slate-100/50 text-slate-700" : "bg-slate-200 text-slate-600"}`}>
                {wasteSummary?.availablePieces || 0}
              </span>
            </span>
          </button>
          <button
            onClick={() => setActiveTab("dashboard")}
            className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === "dashboard" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
              }`}
          >
            <span className="flex items-center gap-2">
              <IconChartPie className="w-4 h-4" />
              Dashboard
            </span>
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
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl flex items-center justify-center border border-indigo-100 shadow-sm flex-shrink-0">
                        <span className="text-lg font-bold text-indigo-600">#{sheet.sheetNumber}</span>
                      </div>
                      <div className="min-w-0">
                        <Link href={`/project/${projectId}/sheet/${sheet.id}`} className="block">
                          <h3 className="font-bold text-slate-900 text-lg hover:text-blue-600 transition-colors truncate pr-4">
                            {sheet.fileName}
                          </h3>
                        </Link>
                        <div className="flex flex-wrap items-center gap-3 mt-1.5 text-sm text-slate-500">
                          <span className="flex items-center gap-1.5 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100">
                            <IconFile size={14} className="text-slate-400" />
                            {formatDate(sheet.uploadedAt)}
                          </span>
                          <span className="hidden sm:inline text-slate-300">|</span>
                          <span className="flex items-center gap-1">
                            <span className="font-semibold text-slate-700">{sheet._count.results}</span> calculations
                          </span>
                          <span className="hidden sm:inline text-slate-300">|</span>
                          <span className="flex items-center gap-1">
                            <span className="font-semibold text-slate-700">{sheet._count.wasteProduced}</span> waste pieces
                          </span>
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

        {/* Waste Tab */}
        {!loading && activeTab === "waste" && (
          <div className="space-y-6">
            {/* Waste Summary */}
            {wasteSummary && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <button
                  onClick={() => setSelectedWasteStatus(null)}
                  className={`p-5 rounded-2xl border transition-all text-left ${selectedWasteStatus === null
                    ? "bg-white border-blue-400 ring-2 ring-blue-400/10 shadow-md"
                    : "bg-white border-slate-200 hover:border-blue-200 shadow-sm"
                    }`}
                >
                  <p className="text-3xl font-bold text-blue-600">{wasteSummary.totalPieces}</p>
                  <p className="text-sm text-slate-500 mt-1">Total Pieces</p>
                </button>
                <button
                  onClick={() => setSelectedWasteStatus(selectedWasteStatus === "available" ? null : "available")}
                  className={`p-5 rounded-2xl border transition-all text-left ${selectedWasteStatus === "available"
                    ? "bg-emerald-50 border-emerald-400 ring-2 ring-emerald-400/10 shadow-md"
                    : "bg-white border-slate-200 hover:border-emerald-200 shadow-sm"
                    }`}
                >
                  <p className="text-3xl font-bold text-emerald-600">{wasteSummary.availablePieces}</p>
                  <p className="text-sm text-slate-500 mt-1">Available</p>
                </button>
                <button
                  onClick={() => setSelectedWasteStatus(selectedWasteStatus === "used" ? null : "used")}
                  className={`p-5 rounded-2xl border transition-all text-left ${selectedWasteStatus === "used"
                    ? "bg-slate-50 border-slate-400 ring-2 ring-slate-400/10 shadow-md"
                    : "bg-white border-slate-200 hover:border-slate-300 shadow-sm"
                    }`}
                >
                  <p className="text-3xl font-bold text-slate-600">{wasteSummary.usedPieces}</p>
                  <p className="text-sm text-slate-500 mt-1">Used</p>
                </button>
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                  <p className="text-3xl font-bold text-purple-600">{formatLength(wasteSummary.totalAvailableLength)}</p>
                  <p className="text-sm text-slate-500 mt-1">Available Length</p>
                </div>
              </div>
            )}

            {/* Waste by Dia */}
            {wasteSummary && Object.keys(wasteSummary.byDia).length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                  <h3 className="font-semibold text-slate-900">Waste by Diameter</h3>
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Status Toggles */}
                    <div className="flex bg-slate-100 p-1 rounded-lg">
                      <button
                        onClick={() => setSelectedWasteStatus(null)}
                        className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${selectedWasteStatus === null
                          ? "bg-white text-slate-900 shadow-sm"
                          : "text-slate-500 hover:text-slate-700"
                          }`}
                      >
                        All
                      </button>
                      <button
                        onClick={() => setSelectedWasteStatus("available")}
                        className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${selectedWasteStatus === "available"
                          ? "bg-white text-emerald-600 shadow-sm"
                          : "text-slate-500 hover:text-slate-700"
                          }`}
                      >
                        Available
                      </button>
                      <button
                        onClick={() => setSelectedWasteStatus("used")}
                        className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${selectedWasteStatus === "used"
                          ? "bg-white text-slate-900 shadow-sm"
                          : "text-slate-500 hover:text-slate-700"
                          }`}
                      >
                        Used
                      </button>
                    </div>

                    {(selectedWasteDia || selectedWasteStatus) && (
                      <button
                        onClick={() => {
                          setSelectedWasteDia(null);
                          setSelectedWasteStatus(null);
                        }}
                        className="text-xs font-medium text-blue-600 hover:text-blue-700 bg-blue-50 px-2 py-1 rounded transition-colors"
                      >
                        Clear All Filters
                      </button>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                  {Object.entries(wasteSummary.byDia).map(([diaString, data]) => {
                    const dia = parseInt(diaString);
                    const isSelected = selectedWasteDia === dia;
                    return (
                      <button
                        key={dia}
                        onClick={() => {
                          if (isSelected) {
                            setSelectedWasteDia(null);
                          } else {
                            setSelectedWasteDia(dia);
                            fetchWasteDetails(dia);
                          }
                        }}
                        className={`p-4 rounded-xl border transition-all text-left ${isSelected
                          ? "bg-blue-50 border-blue-400 shadow-sm ring-1 ring-blue-400/20"
                          : "bg-gradient-to-br from-slate-50 to-slate-100/50 border-slate-200 hover:border-blue-200 hover:bg-white"
                          }`}
                      >
                        <div className={`text-lg font-bold ${isSelected ? "text-blue-700" : "text-slate-900"}`}>Dia {dia}mm</div>
                        <div className="text-sm text-slate-500">
                          <span className={`${isSelected ? "text-blue-600" : "text-emerald-600"} font-medium`}>{data.available}</span> available • {formatLength(data.totalLength)}
                        </div>
                      </button>
                    );
                  })}
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
                        {filteredWaste.map((item, idx) => (
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
    </div >
  );
}
