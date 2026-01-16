import { GreedyCuttingStock } from "@/algorithms/greedyCuttingStock";
import { DynamicCuttingStock } from "@/algorithms/dynamicCuttingStock";
import { TrueDynamicCuttingStock } from "@/algorithms/trueDynamicCuttingStock";
import { BranchAndBoundCuttingStock } from "@/algorithms/branchAndBoundCuttingStock";
import { AdaptiveCuttingStock } from "@/algorithms/adaptiveCuttingStock";
import { ImprovedGreedyCuttingStock } from "@/algorithms/improvedGreedyCuttingStock";
import { ChunkedOptimization } from "@/algorithms/chunkedOptimization";
import { SwapOptimization } from "@/algorithms/swapOptimization";
import type { MultiBarCuttingRequest, CuttingStockResult, WastePiece } from "@/types/CuttingStock";

export interface WorkerMessage {
    type: "greedy" | "dynamic" | "true-dynamic" | "branch-bound" | "adaptive" | "improved-greedy" | "chunked";
    requests: MultiBarCuttingRequest[];
    dia: number;
    wastePieces?: WastePiece[];  // Available waste pieces to reuse
}

export interface WorkerResponse {
    type: "greedy" | "dynamic" | "true-dynamic" | "branch-bound" | "adaptive" | "improved-greedy" | "chunked";
    result?: CuttingStockResult | CuttingStockResult[];
    error?: string;
    progress?: {
        stage: string;
        percentage: number;
    };
}

// Helper to send progress updates
function sendProgress(type: "greedy" | "dynamic" | "true-dynamic" | "branch-bound" | "adaptive" | "improved-greedy" | "chunked", stage: string, percentage: number) {
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

            case "true-dynamic":
                sendProgress(type, "Analyzing dataset...", 10);
                const trueDynamic = new TrueDynamicCuttingStock();
                sendProgress(type, "Generating optimal patterns...", 30);
                sendProgress(type, "State space exploration...", 50);
                sendProgress(type, "Finding optimal solution...", 70);
                result = trueDynamic.solve(requests, dia);
                sendProgress(type, "Finalizing results...", 90);
                break;

            case "branch-bound":
                sendProgress(type, "Initializing search tree...", 10);
                const branchBound = new BranchAndBoundCuttingStock();
                sendProgress(type, "Calculating bounds...", 30);
                sendProgress(type, "Exploring solution space...", 50);
                sendProgress(type, "Pruning suboptimal branches...", 70);
                result = branchBound.solve(requests, dia);
                sendProgress(type, "Verifying optimality...", 90);
                break;

            case "adaptive":
                sendProgress(type, "Analyzing dataset characteristics...", 10);
                const adaptive = new AdaptiveCuttingStock();
                sendProgress(type, "Selecting optimal algorithm...", 20);
                sendProgress(type, "Running recommended algorithms...", 40);
                sendProgress(type, "Comparing solutions...", 80);
                result = await adaptive.solve(requests, dia);
                sendProgress(type, "Generating recommendations...", 95);
                break;

            case "improved-greedy":
                sendProgress(type, "Analyzing segment combinations...", 10);
                const improvedGreedy = new ImprovedGreedyCuttingStock();
                sendProgress(type, "Finding optimal combinations...", 30);
                sendProgress(type, "Applying smart allocation...", 60);
                sendProgress(type, "Minimizing waste...", 80);
                result = improvedGreedy.solve(requests, dia);
                sendProgress(type, "Optimizing results...", 95);
                break;

            case "chunked":
                console.log(`[Worker chunked] Starting chunked optimization for dia ${dia}`);
                const chunked = new ChunkedOptimization();
                result = chunked.solve(requests, dia, wastePieces, (stage, percentage) => {
                    sendProgress(type, stage, percentage);
                });
                console.log(`[Worker chunked] Complete, bars used: ${(result as CuttingStockResult).totalBarsUsed}`);
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
