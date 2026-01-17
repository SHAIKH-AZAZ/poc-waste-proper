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
} from "@tabler/icons-react";

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
  const [activeTab, setActiveTab] = useState<"sheets" | "waste">("sheets");

  const fetchProjectData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch sheets
      const sheetsRes = await fetch(`/api/sheets?projectId=${projectId}`);
      const sheetsData = await sheetsRes.json();
      if (sheetsData.success) {
        setSheets(sheetsData.sheets);
      }

      // Fetch waste inventory
      const wasteRes = await fetch(`/api/waste?projectId=${projectId}`);
      const wasteData = await wasteRes.json();
      if (wasteData.success) {
        setWaste(wasteData.waste);
        setWasteSummary(wasteData.summary);
      }

      // Get project name from projects list
      const projectsRes = await fetch("/api/projects");
      const projectsData = await projectsRes.json();
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
            onClick={() => setActiveTab("waste")}
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
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                  <p className="text-3xl font-bold text-blue-600">{wasteSummary.totalPieces}</p>
                  <p className="text-sm text-slate-500 mt-1">Total Pieces</p>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                  <p className="text-3xl font-bold text-emerald-600">{wasteSummary.availablePieces}</p>
                  <p className="text-sm text-slate-500 mt-1">Available</p>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                  <p className="text-3xl font-bold text-slate-600">{wasteSummary.usedPieces}</p>
                  <p className="text-sm text-slate-500 mt-1">Used</p>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                  <p className="text-3xl font-bold text-purple-600">{formatLength(wasteSummary.totalAvailableLength)}</p>
                  <p className="text-sm text-slate-500 mt-1">Available Length</p>
                </div>
              </div>
            )}

            {/* Waste by Dia */}
            {wasteSummary && Object.keys(wasteSummary.byDia).length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                <h3 className="font-semibold text-slate-900 mb-4">Waste by Diameter</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                  {Object.entries(wasteSummary.byDia).map(([dia, data]) => (
                    <div key={dia} className="p-4 bg-gradient-to-br from-slate-50 to-slate-100/50 rounded-xl border border-slate-200">
                      <div className="text-lg font-bold text-slate-900">Dia {dia}mm</div>
                      <div className="text-sm text-slate-500">
                        <span className="text-emerald-600 font-medium">{data.available}</span> available • {formatLength(data.totalLength)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Waste List */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-5 border-b border-slate-100">
                <h3 className="font-semibold text-slate-900">Waste Inventory Details</h3>
              </div>
              {waste.length === 0 ? (
                <div className="p-12 text-center text-slate-500">
                  <IconRecycle className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                  No waste pieces yet. Run calculations on sheets to generate waste inventory.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-5 py-4 text-left font-semibold text-slate-600">ID</th>
                        <th className="px-5 py-4 text-left font-semibold text-slate-600">Dia</th>
                        <th className="px-5 py-4 text-left font-semibold text-slate-600">Length</th>
                        <th className="px-5 py-4 text-left font-semibold text-slate-600">Source</th>
                        <th className="px-5 py-4 text-left font-semibold text-slate-600">Origin (Cuts Made)</th>
                        <th className="px-5 py-4 text-left font-semibold text-slate-600">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {waste.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-5 py-4 font-mono text-xs bg-slate-100 rounded">W-{item.id}</td>
                          <td className="px-5 py-4 font-semibold">{item.dia}mm</td>
                          <td className="px-5 py-4 font-bold text-blue-600">{formatLength(item.length)}</td>
                          <td className="px-5 py-4">
                            <div className="text-slate-900 font-medium">Sheet #{item.sourceSheet.sheetNumber}</div>
                            <div className="text-xs text-slate-500">{item.sourceSheet.fileName}</div>
                          </td>
                          <td className="px-5 py-4">
                            <div className="text-slate-600">Bar #{item.sourceBarNumber}</div>
                            {item.cutsOnSourceBar && item.cutsOnSourceBar.length > 0 && (
                              <div className="text-xs text-slate-400 mt-1">
                                {item.cutsOnSourceBar.slice(0, 3).map((cut, i) => (
                                  <span key={i}>
                                    {cut.barCode} ({formatLength(cut.length)})
                                    {i < Math.min(item.cutsOnSourceBar.length, 3) - 1 && ", "}
                                  </span>
                                ))}
                                {item.cutsOnSourceBar.length > 3 && ` +${item.cutsOnSourceBar.length - 3} more`}
                              </div>
                            )}
                          </td>
                          <td className="px-5 py-4">
                            <span className={`px-3 py-1.5 text-xs font-semibold rounded-lg ${getStatusColor(item.status)}`}>
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
          </div>
        )}
      </div>
    </div>
  );
}
