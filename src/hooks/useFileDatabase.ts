import { useState, useCallback } from "react";
import type { CuttingStockResult } from "@/types/CuttingStock";

interface Project {
  id: number;
  name: string;
  fileName?: string;
  fileSize?: number;
  uploadDate: Date;
  status: string;
  mongoDataId?: string;
  resultCount: number;
  results?: CalculationResult[];
}

interface CalculationResult {
  id: number;
  algorithm: string;
  dia: number;
  totalBarsUsed: number;
  totalWaste: number;
  averageUtilization: number;
  executionTime: number;
  createdAt: Date;
  patterns?: any[];
  detailedCuts?: any[];
}

export function useFileDatabase() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [results, setResults] = useState<CalculationResult[]>([]);
  const [excelData, setExcelData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch all projects
  const fetchProjects = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      console.log("[useFileDatabase] Fetching projects");
      const response = await fetch("/api/projects");
      const data = await response.json();

      if (data.success) {
        console.log(`[useFileDatabase] Fetched ${data.projects.length} projects`);
        setProjects(data.projects);
      } else {
        throw new Error(data.error || "Failed to fetch projects");
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Failed to fetch projects";
      console.error("[useFileDatabase] Error fetching projects:", errorMsg);
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  }, []);

  // Upload file
  const uploadFile = useCallback(async (file: File) => {
    setLoading(true);
    setError(null);
    try {
      console.log(`[useFileDatabase] Uploading file: ${file.name}`);
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData
      });

      const data = await response.json();

      if (data.success) {
        console.log(`[useFileDatabase] File uploaded successfully, projectId: ${data.projectId}`);
        // Refresh projects list
        await fetchProjects();
        return data.projectId;
      } else {
        throw new Error(data.error || "Failed to upload file");
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Failed to upload file";
      console.error("[useFileDatabase] Error uploading file:", errorMsg);
      setError(errorMsg);
      return null;
    } finally {
      setLoading(false);
    }
  }, [fetchProjects]);

  // Save result
  const saveResult = useCallback(
    async (
      projectId: number,
      algorithm: string,
      dia: number,
      result: CuttingStockResult
    ) => {
      setLoading(true);
      setError(null);
      try {
        console.log(`[useFileDatabase] Saving result for project ${projectId}, algorithm: ${algorithm}`);
        const response = await fetch("/api/results", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            projectId,
            algorithm,
            dia,
            result
          })
        });

        const data = await response.json();

        if (data.success) {
          console.log(`[useFileDatabase] Result saved successfully, resultId: ${data.resultId}`);
          // Refresh projects to update status
          await fetchProjects();
          return data.resultId;
        } else {
          throw new Error(data.error || "Failed to save result");
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Failed to save result";
        console.error("[useFileDatabase] Error saving result:", errorMsg);
        setError(errorMsg);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [fetchProjects]
  );

  // Fetch results for project
  const fetchResults = useCallback(
    async (projectId: number, algorithm?: string) => {
      setLoading(true);
      setError(null);
      try {
        console.log(`[useFileDatabase] Fetching results for project ${projectId}`);
        let url = `/api/results?projectId=${projectId}`;
        if (algorithm) {
          url += `&algorithm=${algorithm}`;
        }

        const response = await fetch(url);
        const data = await response.json();

        if (data.success) {
          console.log(`[useFileDatabase] Fetched ${data.results.length} results`);
          setResults(data.results);
        } else {
          throw new Error(data.error || "Failed to fetch results");
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Failed to fetch results";
        console.error("[useFileDatabase] Error fetching results:", errorMsg);
        setError(errorMsg);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // Fetch Excel data
  const fetchExcelData = useCallback(
    async (mongoDataId: string) => {
      setLoading(true);
      setError(null);
      try {
        console.log(`[useFileDatabase] Fetching excel data for mongoDataId: ${mongoDataId}`);
        const response = await fetch(`/api/excel-data?mongoDataId=${mongoDataId}`);
        const data = await response.json();

        if (data.success) {
          console.log(`[useFileDatabase] Fetched ${data.data.length} rows`);
          setExcelData(data.data);
        } else {
          throw new Error(data.error || "Failed to fetch excel data");
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Failed to fetch excel data";
        console.error("[useFileDatabase] Error fetching excel data:", errorMsg);
        setError(errorMsg);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // Delete project
  const deleteProject = useCallback(
    async (projectId: number) => {
      setLoading(true);
      setError(null);
      try {
        console.log(`[useFileDatabase] Deleting project ${projectId}`);
        const response = await fetch(`/api/projects?projectId=${projectId}`, {
          method: "DELETE"
        });

        const data = await response.json();

        if (data.success) {
          console.log(`[useFileDatabase] Project deleted successfully`);
          await fetchProjects();
          return true;
        } else {
          throw new Error(data.error || "Failed to delete project");
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Failed to delete project";
        console.error("[useFileDatabase] Error deleting project:", errorMsg);
        setError(errorMsg);
        return false;
      } finally {
        setLoading(false);
      }
    },
    [fetchProjects]
  );

  return {
    projects,
    results,
    excelData,
    loading,
    error,
    fetchProjects,
    uploadFile,
    saveResult,
    fetchResults,
    fetchExcelData,
    deleteProject
  };
}
