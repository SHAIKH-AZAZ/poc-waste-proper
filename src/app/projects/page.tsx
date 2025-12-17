"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { IconFile, IconTrash, IconEye, IconCalendar, IconDatabase, IconRefresh } from "@tabler/icons-react";

interface Project {
  id: number;
  name: string;
  fileName: string | null;
  fileSize: number | null;
  uploadDate: string;
  status: string;
  mongoDataId: string | null;
  resultCount: number;
  results: {
    id: number;
    algorithm: string;
    dia: number;
    totalBarsUsed: number;
    totalWaste: number;
  }[];
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<number | null>(null);

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

  const deleteProject = async (projectId: number) => {
    if (!confirm("Are you sure you want to delete this project? This action cannot be undone.")) {
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

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "N/A";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

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
        return "bg-green-100 text-green-800";
      case "processing":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-blue-100 text-blue-800";
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Uploaded Projects</h1>
            <p className="mt-1 text-gray-500">View and manage your uploaded Excel sheets</p>
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
            <Link
              href="/"
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <IconFile className="w-5 h-5" />
              Upload New
            </Link>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700">{error}</p>
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
            <p className="text-gray-500 mb-6">Upload your first Excel sheet to get started</p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <IconFile className="w-5 h-5" />
              Upload Excel Sheet
            </Link>
          </div>
        )}

        {/* Projects Grid */}
        {!loading && projects.length > 0 && (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <div
                key={project.id}
                className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
              >
                {/* Card Header */}
                <div className="p-5 border-b border-gray-100">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <IconFile className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 truncate max-w-[180px]">
                          {project.name}
                        </h3>
                        <p className="text-sm text-gray-500 truncate max-w-[180px]">
                          {project.fileName || "Unknown file"}
                        </p>
                      </div>
                    </div>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(project.status)}`}>
                      {project.status}
                    </span>
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-5 space-y-3">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <IconCalendar className="w-4 h-4" />
                    <span>{formatDate(project.uploadDate)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <IconDatabase className="w-4 h-4" />
                    <span>Size: {formatFileSize(project.fileSize)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <IconEye className="w-4 h-4" />
                    <span>{project.resultCount} calculation(s)</span>
                  </div>

                  {/* Results Summary */}
                  {project.results && project.results.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <p className="text-xs font-medium text-gray-500 mb-2">Recent Results:</p>
                      <div className="space-y-1">
                        {project.results.slice(0, 2).map((result) => (
                          <div key={result.id} className="text-xs text-gray-600 flex justify-between">
                            <span>Dia {result.dia} ({result.algorithm})</span>
                            <span>{result.totalBarsUsed} bars</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Card Footer */}
                <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 flex justify-between">
                  <Link
                    href={`/?projectId=${project.id}`}
                    className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    <IconEye className="w-4 h-4" />
                    View Details
                  </Link>
                  <button
                    onClick={() => deleteProject(project.id)}
                    disabled={deleting === project.id}
                    className="flex items-center gap-1 text-sm text-red-600 hover:text-red-700 font-medium disabled:opacity-50"
                  >
                    {deleting === project.id ? (
                      <div className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <IconTrash className="w-4 h-4" />
                    )}
                    Delete
                  </button>
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
                  {projects.filter((p) => p.status === "completed").length}
                </p>
                <p className="text-sm text-gray-600">Completed</p>
              </div>
              <div className="text-center p-4 bg-yellow-50 rounded-lg">
                <p className="text-2xl font-bold text-yellow-600">
                  {projects.filter((p) => p.status === "uploaded").length}
                </p>
                <p className="text-sm text-gray-600">Pending</p>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <p className="text-2xl font-bold text-purple-600">
                  {projects.reduce((sum, p) => sum + p.resultCount, 0)}
                </p>
                <p className="text-sm text-gray-600">Total Calculations</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
