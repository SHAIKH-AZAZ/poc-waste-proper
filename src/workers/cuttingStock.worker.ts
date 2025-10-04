import { GreedyCuttingStock } from "@/algorithms/greedyCuttingStock";
import { DynamicCuttingStock } from "@/algorithms/dynamicCuttingStock";
import type { MultiBarCuttingRequest, CuttingStockResult } from "@/types/CuttingStock";

export interface WorkerMessage {
    type: "greedy" | "dynamic";
    requests: MultiBarCuttingRequest[];
    dia: number;
}

export interface WorkerResponse {
    type: "greedy" | "dynamic";
    result?: CuttingStockResult;
    error?: string;
    progress?: {
        stage: string;
        percentage: number;
    };
}

// Helper to send progress updates
function sendProgress(type: "greedy" | "dynamic", stage: string, percentage: number) {
    const response: WorkerResponse = {
        type,
        progress: { stage, percentage },
    };
    self.postMessage(response);
}

// Listen for messages from main thread
self.onmessage = (event: MessageEvent<WorkerMessage>) => {
    const { type, requests, dia } = event.data;

    console.log(`[Worker ${type}] Starting calculation for dia ${dia} with ${requests.length} requests`);

    try {
        let result: CuttingStockResult;

        if (type === "greedy") {
            sendProgress(type, "Preprocessing data...", 10);
            const greedy = new GreedyCuttingStock();

            sendProgress(type, "Sorting segments...", 30);
            sendProgress(type, "Running First Fit Decreasing...", 50);

            result = greedy.solve(requests, dia);
            console.log(`[Worker ${type}] Calculation complete, bars used: ${result.totalBarsUsed}`);

            sendProgress(type, "Generating results...", 90);
        } else {
            sendProgress(type, "Preprocessing data...", 10);
            console.log(`[Worker ${type}] Creating DynamicCuttingStock instance`);
            const dynamic = new DynamicCuttingStock();

            sendProgress(type, "Generating patterns...", 30);
            console.log(`[Worker ${type}] Calling solve method`);
            sendProgress(type, "Running dynamic programming...", 60);

            result = dynamic.solve(requests, dia);
            console.log(`[Worker ${type}] Calculation complete, bars used: ${result.totalBarsUsed}`);

            sendProgress(type, "Optimizing solution...", 90);
        }

        // Send final result back to main thread
        sendProgress(type, "Complete", 100);
        console.log(`[Worker ${type}] Sending result back to main thread`);
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
