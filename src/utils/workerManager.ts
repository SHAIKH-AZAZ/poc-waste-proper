import type { MultiBarCuttingRequest, CuttingStockResult, WastePiece } from "@/types/CuttingStock";
import type { WorkerMessage, WorkerResponse } from "@/workers/cuttingStock.worker";

export class WorkerManager {
  private greedyWorker: Worker | null = null;
  private dynamicWorker: Worker | null = null;

  /**
   * Initialize workers
   */
  private initWorkers(): void {
    if (typeof window === "undefined") return;

    try {
      // Create workers using URL constructor for Next.js compatibility
      this.greedyWorker = new Worker(
        new URL("@/workers/cuttingStock.worker.ts", import.meta.url),
        { type: "module" }
      );
      this.dynamicWorker = new Worker(
        new URL("@/workers/cuttingStock.worker.ts", import.meta.url),
        { type: "module" }
      );
    } catch (error) {
      console.error("Failed to initialize workers:", error);
    }
  }

  /**
   * Run greedy algorithm in worker
   */
  async runGreedy(
    requests: MultiBarCuttingRequest[],
    dia: number,
    onProgress?: (stage: string, percentage: number) => void,
    wastePieces?: WastePiece[]
  ): Promise<CuttingStockResult> {
    if (!this.greedyWorker) {
      this.initWorkers();
    }

    return new Promise((resolve, reject) => {
      if (!this.greedyWorker) {
        reject(new Error("Worker not available"));
        return;
      }

      const handleMessage = (event: MessageEvent<WorkerResponse>) => {
        if (event.data.type === "greedy") {
          // Handle progress updates
          if (event.data.progress) {
            onProgress?.(event.data.progress.stage, event.data.progress.percentage);
            return; // Don't resolve yet, wait for final result
          }

          // Handle final result
          if (event.data.result || event.data.error) {
            this.greedyWorker?.removeEventListener("message", handleMessage);
            this.greedyWorker?.removeEventListener("error", handleError);

            if (event.data.error) {
              reject(new Error(event.data.error));
            } else if (event.data.result) {
              // Handle both single result and array results
              const result = Array.isArray(event.data.result) ? event.data.result[0] : event.data.result;
              resolve(result);
            }
          }
        }
      };

      const handleError = (error: ErrorEvent) => {
        this.greedyWorker?.removeEventListener("message", handleMessage);
        this.greedyWorker?.removeEventListener("error", handleError);
        reject(error);
      };

      this.greedyWorker.addEventListener("message", handleMessage);
      this.greedyWorker.addEventListener("error", handleError);

      const message: WorkerMessage = {
        type: "greedy",
        requests,
        dia,
        wastePieces,
      };
      this.greedyWorker.postMessage(message);
    });
  }

  /**
   * Run dynamic algorithm in worker
   */
  async runDynamic(
    requests: MultiBarCuttingRequest[],
    dia: number,
    onProgress?: (stage: string, percentage: number) => void,
    wastePieces?: WastePiece[]
  ): Promise<CuttingStockResult> {
    if (!this.dynamicWorker) {
      this.initWorkers();
    }

    return new Promise((resolve, reject) => {
      if (!this.dynamicWorker) {
        reject(new Error("Worker not available"));
        return;
      }

      const handleMessage = (event: MessageEvent<WorkerResponse>) => {
        console.log("[WorkerManager] Dynamic message received:", event.data);
        if (event.data.type === "dynamic") {
          // Handle progress updates
          if (event.data.progress) {
            console.log(`[WorkerManager] Dynamic progress: ${event.data.progress.stage} - ${event.data.progress.percentage}%`);
            onProgress?.(event.data.progress.stage, event.data.progress.percentage);
            return; // Don't resolve yet, wait for final result
          }

          // Handle final result
          if (event.data.result || event.data.error) {
            this.dynamicWorker?.removeEventListener("message", handleMessage);
            this.dynamicWorker?.removeEventListener("error", handleError);

            if (event.data.error) {
              console.error("[WorkerManager] Dynamic error:", event.data.error);
              reject(new Error(event.data.error));
            } else if (event.data.result) {
              console.log("[WorkerManager] Dynamic result received:", event.data.result);
              // Handle both single result and array results
              const result = Array.isArray(event.data.result) ? event.data.result[0] : event.data.result;
              resolve(result);
            }
          }
        }
      };

      const handleError = (error: ErrorEvent) => {
        console.error("[WorkerManager] Dynamic worker error:", error);
        this.dynamicWorker?.removeEventListener("message", handleMessage);
        this.dynamicWorker?.removeEventListener("error", handleError);
        reject(error);
      };

      this.dynamicWorker.addEventListener("message", handleMessage);
      this.dynamicWorker.addEventListener("error", handleError);

      const message: WorkerMessage = {
        type: "dynamic",
        requests,
        dia,
        wastePieces,
      };
      console.log("[WorkerManager] Sending message to dynamic worker:", message);
      this.dynamicWorker.postMessage(message);
    });
  }

  /**
   * Run improved greedy algorithm in worker
   */
  async runImprovedGreedy(
    requests: MultiBarCuttingRequest[],
    dia: number,
    onProgress?: (stage: string, percentage: number) => void
  ): Promise<CuttingStockResult> {
    if (!this.greedyWorker) {
      this.initWorkers();
    }

    return new Promise((resolve, reject) => {
      if (!this.greedyWorker) {
        reject(new Error("Worker not available"));
        return;
      }

      const handleMessage = (event: MessageEvent<WorkerResponse>) => {
        if (event.data.type === "improved-greedy") {
          // Handle progress updates
          if (event.data.progress) {
            onProgress?.(event.data.progress.stage, event.data.progress.percentage);
            return;
          }

          // Handle final result
          if (event.data.result || event.data.error) {
            this.greedyWorker?.removeEventListener("message", handleMessage);
            this.greedyWorker?.removeEventListener("error", handleError);

            if (event.data.error) {
              reject(new Error(event.data.error));
            } else if (event.data.result) {
              const result = Array.isArray(event.data.result) ? event.data.result[0] : event.data.result;
              resolve(result);
            }
          }
        }
      };

      const handleError = (error: ErrorEvent) => {
        this.greedyWorker?.removeEventListener("message", handleMessage);
        this.greedyWorker?.removeEventListener("error", handleError);
        reject(error);
      };

      this.greedyWorker.addEventListener("message", handleMessage);
      this.greedyWorker.addEventListener("error", handleError);

      const message: WorkerMessage = {
        type: "improved-greedy",
        requests,
        dia,
      };
      this.greedyWorker.postMessage(message);
    });
  }

  /**
   * Run both algorithms in parallel
   */
  async runBoth(
    requests: MultiBarCuttingRequest[],
    dia: number,
    onProgress?: {
      greedy?: (stage: string, percentage: number) => void;
      dynamic?: (stage: string, percentage: number) => void;
    },
    wastePieces?: WastePiece[]
  ): Promise<{
    greedy: CuttingStockResult;
    dynamic: CuttingStockResult;
  }> {
    const [greedy, dynamic] = await Promise.all([
      this.runGreedy(requests, dia, onProgress?.greedy, wastePieces),
      this.runDynamic(requests, dia, onProgress?.dynamic, wastePieces),
    ]);

    return { greedy, dynamic };
  }

  /**
   * Terminate workers
   */
  terminate(): void {
    if (this.greedyWorker) {
      this.greedyWorker.terminate();
      this.greedyWorker = null;
    }
    if (this.dynamicWorker) {
      this.dynamicWorker.terminate();
      this.dynamicWorker = null;
    }
  }
}

// Singleton instance
let workerManagerInstance: WorkerManager | null = null;

export function getWorkerManager(): WorkerManager {
  if (!workerManagerInstance) {
    workerManagerInstance = new WorkerManager();
  }
  return workerManagerInstance;
}
