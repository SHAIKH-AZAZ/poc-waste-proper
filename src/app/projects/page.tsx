"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import {
  IconFile,
  IconTrash,
  IconEye,
  IconCalendar,
  IconDatabase,
  IconRefresh,
  IconPlus,
  IconPackage,
  IconChevronRight,
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
      case "calculated":
        return "bg-green-100 text-green-800";
      case "active":
        return "bg-blue-100 text-blue-800";
      case "uploaded":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Projects</h1>
            <p className="mt-1 text-gray-500">Manage your cutting stock projects with multiple sheets</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={fetchProjects}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
            >
              <IconRefresh className={`w-5 h-5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <IconPlus className="w-5 h-5" />
              New Project
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700">{error}</p>
            <button onClick={() => setError(null)} className="text-sm text-red-600 underline mt-1">
              Dismiss
            </button>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-gray-600">Loading projects...</span>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!loading && projects.length === 0 && (
          <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-gray-200">
            <IconDatabase className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No projects yet</h3>
            <p className="text-gray-500 mb-6">Create your first project to get started</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <IconPlus className="w-5 h-5" />
              Create Project
            </button>
          </div>
        )}

        {/* Projects List */}
        {!loading && projects.length > 0 && (
          <div className="space-y-6">
            {projects.map((project) => (
              <div
                key={project.id}
                className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
              >
                {/* Project Header */}
                <div className="p-5 border-b border-gray-100">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                        <IconPackage className="w-6 h-6 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">{project.name}</h3>
                        <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                          <span className="flex items-center gap-1">
                            <IconCalendar className="w-4 h-4" />
                            {formatDate(project.createdAt)}
                          </span>
                          <span className="flex items-center gap-1">
                            <IconFile className="w-4 h-4" />
                            {project.sheetCount} sheet(s)
                          </span>
                          <span className="flex items-center gap-1">
                            <IconDatabase className="w-4 h-4" />
                            {project.wasteCount} waste pieces
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(project.status)}`}>
                        {project.status}
                      </span>
                      <button
                        onClick={() => deleteProject(project.id)}
                        disabled={deleting === project.id}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                        title="Delete Project"
                      >
                        {deleting === project.id ? (
                          <div className="w-5 h-5 border-2 border-red-600 border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                          <IconTrash className="w-5 h-5" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Sheets List */}
                <div className="p-5">
                  {project.sheets.length === 0 ? (
                    <div className="text-center py-6 bg-gray-50 rounded-lg">
                      <p className="text-gray-500 mb-3">No sheets uploaded yet</p>
                      <Link
                        href={`/project/${project.id}`}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                      >
                        <IconPlus className="w-4 h-4" />
                        Upload First Sheet
                      </Link>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-medium text-gray-700">Sheets</h4>
                        <Link
                          href={`/project/${project.id}`}
                          className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                        >
                          View All <IconChevronRight className="w-4 h-4" />
                        </Link>
                      </div>
                      {project.sheets.slice(0, 3).map((sheet) => (
                        <div
                          key={sheet.id}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center border border-gray-200">
                              <span className="text-sm font-medium text-gray-600">#{sheet.sheetNumber}</span>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-900">{sheet.fileName}</p>
                              <p className="text-xs text-gray-500">{sheet._count.results} calculations</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getStatusColor(sheet.status)}`}>
                              {sheet.status}
                            </span>
                            <Link
                              href={`/project/${project.id}/sheet/${sheet.id}`}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            >
                              <IconEye className="w-4 h-4" />
                            </Link>
                          </div>
                        </div>
                      ))}
                      {project.sheets.length > 3 && (
                        <p className="text-sm text-gray-500 text-center pt-2">
                          +{project.sheets.length - 3} more sheets
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Project Footer */}
                <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 flex justify-between items-center">
                  <div className="text-sm text-gray-500">
                    {project.totalCalculations} total calculations
                  </div>
                  <Link
                    href={`/project/${project.id}`}
                    className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Open Project <IconChevronRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Stats Summary */}
        {!loading && projects.length > 0 && (
          <div className="mt-8 p-6 bg-white rounded-xl shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Summary</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <p className="text-2xl font-bold text-blue-600">{projects.length}</p>
                <p className="text-sm text-gray-600">Total Projects</p>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <p className="text-2xl font-bold text-green-600">
                  {projects.reduce((sum, p) => sum + p.sheetCount, 0)}
                </p>
                <p className="text-sm text-gray-600">Total Sheets</p>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <p className="text-2xl font-bold text-purple-600">
                  {projects.reduce((sum, p) => sum + p.totalCalculations, 0)}
                </p>
                <p className="text-sm text-gray-600">Total Calculations</p>
              </div>
              <div className="text-center p-4 bg-orange-50 rounded-lg">
                <p className="text-2xl font-bold text-orange-600">
                  {projects.reduce((sum, p) => sum + p.wasteCount, 0)}
                </p>
                <p className="text-sm text-gray-600">Waste Pieces</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Create Project Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Create New Project</h2>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Project Name</label>
              <input
                type="text"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                placeholder="e.g., Building A - Floor 1-5"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                autoFocus
              />
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setNewProjectName("");
                }}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={createProject}
                disabled={!newProjectName.trim() || creating}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {creating && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
                Create Project
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
