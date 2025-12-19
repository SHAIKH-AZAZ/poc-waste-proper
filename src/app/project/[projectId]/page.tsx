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
        return "bg-green-100 text-green-800";
      case "uploaded":
        return "bg-yellow-100 text-yellow-800";
      case "available":
        return "bg-blue-100 text-blue-800";
      case "used":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/projects"
            className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 mb-4"
          >
            <IconArrowLeft className="w-4 h-4" />
            Back to Projects
          </Link>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center">
                <IconPackage className="w-7 h-7 text-blue-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{projectName || `Project #${projectId}`}</h1>
                <p className="text-gray-500">
                  {sheets.length} sheet(s) • {wasteSummary?.availablePieces || 0} waste pieces available
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={fetchProjectData}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <IconRefresh className={`w-5 h-5 ${loading ? "animate-spin" : ""}`} />
              </button>
              <label className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors cursor-pointer">
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
        <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-lg w-fit">
          <button
            onClick={() => setActiveTab("sheets")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === "sheets" ? "bg-white text-gray-900 shadow-sm" : "text-gray-600 hover:text-gray-900"
            }`}
          >
            <span className="flex items-center gap-2">
              <IconFile className="w-4 h-4" />
              Sheets ({sheets.length})
            </span>
          </button>
          <button
            onClick={() => setActiveTab("waste")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === "waste" ? "bg-white text-gray-900 shadow-sm" : "text-gray-600 hover:text-gray-900"
            }`}
          >
            <span className="flex items-center gap-2">
              <IconRecycle className="w-4 h-4" />
              Waste Inventory ({wasteSummary?.availablePieces || 0})
            </span>
          </button>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}

        {/* Sheets Tab */}
        {!loading && activeTab === "sheets" && (
          <div className="space-y-4">
            {sheets.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
                <IconFile className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No sheets yet</h3>
                <p className="text-gray-500 mb-4">Upload your first Excel sheet to start</p>
              </div>
            ) : (
              sheets.map((sheet) => (
                <div key={sheet.id} className="bg-white rounded-xl border border-gray-200 p-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                        <span className="text-lg font-bold text-gray-600">#{sheet.sheetNumber}</span>
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{sheet.fileName}</h3>
                        <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                          <span>{formatDate(sheet.uploadedAt)}</span>
                          <span>•</span>
                          <span>{sheet._count.results} calculations</span>
                          <span>•</span>
                          <span>{sheet._count.wasteProduced} waste pieces</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(sheet.status)}`}>
                        {sheet.status}
                      </span>
                      <Link
                        href={`/project/${projectId}/sheet/${sheet.id}`}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <IconEye className="w-5 h-5" />
                      </Link>
                      <button
                        onClick={() => deleteSheet(sheet.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <IconTrash className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  {/* Results Summary */}
                  {sheet.results && sheet.results.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <p className="text-sm font-medium text-gray-700 mb-2">Calculation Results:</p>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        {sheet.results.map((result) => (
                          <div key={result.id} className="p-2 bg-gray-50 rounded-lg text-sm">
                            <div className="font-medium text-gray-900">Dia {result.dia}</div>
                            <div className="text-gray-500">
                              {result.totalBarsUsed} bars • {result.algorithm}
                            </div>
                          </div>
                        ))}
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
          <div>
            {/* Waste Summary */}
            {wasteSummary && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-white p-4 rounded-xl border border-gray-200 text-center">
                  <p className="text-2xl font-bold text-blue-600">{wasteSummary.totalPieces}</p>
                  <p className="text-sm text-gray-600">Total Pieces</p>
                </div>
                <div className="bg-white p-4 rounded-xl border border-gray-200 text-center">
                  <p className="text-2xl font-bold text-green-600">{wasteSummary.availablePieces}</p>
                  <p className="text-sm text-gray-600">Available</p>
                </div>
                <div className="bg-white p-4 rounded-xl border border-gray-200 text-center">
                  <p className="text-2xl font-bold text-gray-600">{wasteSummary.usedPieces}</p>
                  <p className="text-sm text-gray-600">Used</p>
                </div>
                <div className="bg-white p-4 rounded-xl border border-gray-200 text-center">
                  <p className="text-2xl font-bold text-purple-600">{formatLength(wasteSummary.totalAvailableLength)}</p>
                  <p className="text-sm text-gray-600">Available Length</p>
                </div>
              </div>
            )}

            {/* Waste by Dia */}
            {wasteSummary && Object.keys(wasteSummary.byDia).length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
                <h3 className="font-semibold text-gray-900 mb-4">Waste by Diameter</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {Object.entries(wasteSummary.byDia).map(([dia, data]) => (
                    <div key={dia} className="p-3 bg-gray-50 rounded-lg">
                      <div className="font-medium text-gray-900">Dia {dia}mm</div>
                      <div className="text-sm text-gray-500">
                        {data.available} available • {formatLength(data.totalLength)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Waste List */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="p-4 border-b border-gray-100">
                <h3 className="font-semibold text-gray-900">Waste Inventory Details</h3>
              </div>
              {waste.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  No waste pieces yet. Run calculations on sheets to generate waste inventory.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left font-medium text-gray-700">ID</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-700">Dia</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-700">Length</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-700">Source</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-700">Origin (Cuts Made)</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-700">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {waste.map((item) => (
                        <tr key={item.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 font-mono text-gray-600">W-{item.id}</td>
                          <td className="px-4 py-3">{item.dia}mm</td>
                          <td className="px-4 py-3 font-medium">{formatLength(item.length)}</td>
                          <td className="px-4 py-3">
                            <div className="text-gray-900">Sheet #{item.sourceSheet.sheetNumber}</div>
                            <div className="text-xs text-gray-500">{item.sourceSheet.fileName}</div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-gray-600">Bar #{item.sourceBarNumber}</div>
                            {item.cutsOnSourceBar && item.cutsOnSourceBar.length > 0 && (
                              <div className="text-xs text-gray-500 mt-1">
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
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(item.status)}`}>
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
