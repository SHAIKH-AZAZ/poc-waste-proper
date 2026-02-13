import { GreedyCuttingStock } from "@/algorithms/greedyCuttingStock";
import { ChunkedOptimization } from "@/algorithms/chunkedOptimization";
import { SwapOptimization } from "@/algorithms/swapOptimization";
import type { MultiBarCuttingRequest, CuttingStockResult, WastePiece } from "@/types/CuttingStock";

export interface WorkerMessage {
    type: "greedy" | "dynamic" | "chunked" | "swap";
    requests: MultiBarCuttingRequest[];
    dia: number;
    wastePieces?: WastePiece[];  // Available waste pieces to reuse
}

export interface WorkerResponse {
    type: "greedy" | "dynamic" | "true-dynamic" | "branch-and-bound" | "adaptive" | "improved-greedy" | "chunked" | "swap";
    result?: CuttingStockResult | CuttingStockResult[];
    error?: string;
    progress?: {
        stage: string;
        percentage: number;
    };
}

// Helper to send progress updates
function sendProgress(type: "greedy" | "dynamic" | "chunked" | "swap", stage: string, percentage: number) {
    const response: WorkerResponse = {
        type,
        progress: { stage, percentage },
    };
    self.postMessage(response);
}

// Listen for messages from main thread
self.onmessage = async (event: MessageEvent<WorkerMessage>) => {
    const { type, requests, dia, wastePieces } = event.data;

    console.log(`[Worker ${type}] Starting calculation for dia ${dia} with ${requests.length} requests`);
    if (wastePieces && wastePieces.length > 0) {
        console.log(`[Worker ${type}] Using ${wastePieces.length} waste pieces for reuse`);
    }

    try {
        let result: CuttingStockResult | CuttingStockResult[];

        switch (type) {
            case "greedy":
                sendProgress(type, "Preprocessing data...", 10);
                const greedy = new GreedyCuttingStock();
                sendProgress(type, "Sorting segments...", 30);
                sendProgress(type, "Running First Fit Decreasing...", 50);
                result = greedy.solve(requests, dia, wastePieces);
                sendProgress(type, "Generating results...", 90);
                break;

            case "dynamic":
                try {
                    console.log(`[Worker dynamic] ========================================`);
                    console.log(`[Worker dynamic] Starting SWAP optimization for dia ${dia}`);
                    console.log(`[Worker dynamic] Requests: ${requests.length}`);
                    console.log(`[Worker dynamic] ========================================`);
                    sendProgress(type, "Preprocessing data...", 10);
                    // Use SwapOptimization for better results
                    const swapForDynamic = new SwapOptimization();
                    result = swapForDynamic.solve(requests, dia, wastePieces, (stage, percentage) => {
                        sendProgress(type, stage, percentage);
                    });
                    // Override algorithm name to "dynamic" for display
                    (result as CuttingStockResult).algorithm = "dynamic";
                    console.log(`[Worker dynamic] ========================================`);
                    console.log(`[Worker dynamic] SWAP Complete, bars used: ${(result as CuttingStockResult).totalBarsUsed}`);
                    console.log(`[Worker dynamic] ========================================`);
                } catch (dynamicError) {
                    console.error(`[Worker dynamic] Error in dynamic algorithm:`, dynamicError);
                    throw dynamicError;
                }
                break;

            case "chunked":
                console.log(`[Worker chunked] Starting chunked optimization for dia ${dia}`);
                const chunked = new ChunkedOptimization();
                result = chunked.solve(requests, dia, wastePieces, (stage, percentage) => {
                    sendProgress(type, stage, percentage);
                });
                console.log(`[Worker chunked] Complete, bars used: ${(result as CuttingStockResult).totalBarsUsed}`);
                break;

            case "swap":
                console.log(`[Worker swap] Starting swap optimization for dia ${dia}`);
                const swap = new SwapOptimization();
                result = swap.solve(requests, dia, wastePieces, (stage, percentage) => {
                    sendProgress(type, stage, percentage);
                });
                break;

            default:
                throw new Error(`Unknown algorithm type: ${type}`);
        }

        console.log(`[Worker ${type}] Calculation complete`);
        if (Array.isArray(result)) {
            console.log(`[Worker ${type}] Generated ${result.length} solutions`);
        } else {
            console.log(`[Worker ${type}] Bars used: ${result.totalBarsUsed}`);
        }

        // Send final result back to main thread
        sendProgress(type, "Complete", 100);
        const response: WorkerResponse = {
            type,
            result,
        };
        self.postMessage(response);
    } catch (error) {
        console.error(`[Worker ${type}] Error:`, error);
        // Send error back to main thread
        const response: WorkerResponse = {
            type,
            error: error instanceof Error ? error.message : "Unknown error",
        };
        self.postMessage(response);
    }
};
