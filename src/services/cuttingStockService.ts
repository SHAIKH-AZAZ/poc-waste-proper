import { prisma } from "@/lib/prisma";
import { getMongoDb } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import type { CuttingStockResult } from "@/types/CuttingStock";

export class CuttingStockService {
    /**
     * Determine the best result between Greedy and Dynamic algorithms
     */
    static determineBestResult(
        greedyResult: CuttingStockResult | null,
        dynamicResult: CuttingStockResult | null
    ): { result: CuttingStockResult | null; algorithm: string } {
        let bestResult: CuttingStockResult | null = null;
        let bestAlgorithm: string = "";

        // Check if results are valid (0 bars means algorithm failed)
        const greedyValid = greedyResult && greedyResult.totalBarsUsed > 0;
        const dynamicValid = dynamicResult && dynamicResult.totalBarsUsed > 0;

        if (greedyValid && dynamicValid) {
            // Both valid - compare: fewer NEW bars = better (primary criterion for cost savings)
            const greedyNew = greedyResult!.summary.newBarsUsed ?? greedyResult!.totalBarsUsed;
            const dynamicNew = dynamicResult!.summary.newBarsUsed ?? dynamicResult!.totalBarsUsed;

            if (greedyNew < dynamicNew) {
                bestResult = greedyResult!;
                bestAlgorithm = "greedy";
            } else if (dynamicNew < greedyNew) {
                bestResult = dynamicResult!;
                bestAlgorithm = "dynamic";
            } else {
                // Same new bars, compare total bars (reused + new)
                if (greedyResult!.totalBarsUsed < dynamicResult!.totalBarsUsed) {
                    bestResult = greedyResult!;
                    bestAlgorithm = "greedy";
                } else if (dynamicResult!.totalBarsUsed < greedyResult!.totalBarsUsed) {
                    bestResult = dynamicResult!;
                    bestAlgorithm = "dynamic";
                } else {
                    // Same bars, compare waste (secondary criterion)
                    bestResult = greedyResult!.totalWaste <= dynamicResult!.totalWaste ? greedyResult! : dynamicResult!;
                    bestAlgorithm = greedyResult!.totalWaste <= dynamicResult!.totalWaste ? "greedy" : "dynamic";
                }
            }
        } else if (greedyValid) {
            bestResult = greedyResult!;
            bestAlgorithm = "greedy";
        } else if (dynamicValid) {
            bestResult = dynamicResult!;
            bestAlgorithm = "dynamic";
        }

        return { result: bestResult, algorithm: bestAlgorithm };
    }

    /**
     * Save calculation result to MongoDB and PostgreSQL
     */
    static async saveResult(
        projectId: number,
        sheetId: number,
        dia: number,
        bestResult: CuttingStockResult,
        algorithm: string
    ) {
        // 1. Check if result already exists
        const existingResult = await prisma.calculationResult.findUnique({
            where: {
                sheetId_dia: { sheetId, dia },
            },
        });

        if (existingResult) {
            return {
                skipped: true,
                resultId: existingResult.id,
                algorithm: existingResult.algorithm,
            };
        }

        // 2. Store Detailed Data in MongoDB
        const db = await getMongoDb();
        const resultsCollection = db.collection("calculation_results");

        const mongoResult = await resultsCollection.insertOne({
            projectId,
            sheetId,
            algorithm,
            dia,
            patterns: bestResult.patterns,
            detailedCuts: bestResult.detailedCuts,
            summary: bestResult.summary,
            createdAt: new Date(),
        });

        // 3. Store Metadata in PostgreSQL
        const wastePiecesReused = bestResult.detailedCuts?.filter(
            (cut) => cut.isFromWaste
        ).length || 0;

        const pgResult = await prisma.calculationResult.create({
            data: {
                sheetId,
                algorithm,
                dia,
                totalBarsUsed: bestResult.totalBarsUsed,
                wastePiecesReused,
                totalWaste: bestResult.totalWaste,
                averageUtilization: bestResult.averageUtilization,
                executionTime: bestResult.executionTime,
                mongoResultId: mongoResult.insertedId.toString(),
            },
        });

        // 4. Update Sheet Status
        await prisma.sheet.update({
            where: { id: sheetId },
            data: { status: "calculated" },
        });

        return {
            skipped: false,
            resultId: pgResult.id,
            mongoResultId: mongoResult.insertedId.toString(),
        };
    }

    /**
     * Fetch results for a sheet or project
     */
    static async getResults(sheetId?: number, projectId?: number) {
        // Build where clause
        let where = {};
        if (sheetId) {
            where = { sheetId };
        } else if (projectId) {
            const sheets = await prisma.sheet.findMany({
                where: { projectId },
                select: { id: true },
            });
            where = { sheetId: { in: sheets.map((s) => s.id) } };
        }

        const pgResults = await prisma.calculationResult.findMany({
            where,
            include: {
                sheet: {
                    select: {
                        id: true,
                        sheetNumber: true,
                        fileName: true,
                    },
                },
            },
            orderBy: { createdAt: "desc" },
        });

        // Get detailed data from MongoDB
        const db = await getMongoDb();
        const resultsCollection = db.collection("calculation_results");

        const enrichedResults = await Promise.all(
            pgResults.map(async (pgResult) => {
                if (!pgResult.mongoResultId) {
                    return pgResult;
                }

                try {
                    const mongoData = await resultsCollection.findOne({
                        _id: new ObjectId(pgResult.mongoResultId),
                    });

                    return {
                        ...pgResult,
                        patterns: mongoData?.patterns || [],
                        detailedCuts: mongoData?.detailedCuts || [],
                        summary: mongoData?.summary || null,
                    };
                } catch {
                    return pgResult;
                }
            })
        );

        return enrichedResults;
    }

    /**
     * Delete results (internal use for recalculation or explicit delete)
     */
    static async deleteResults(sheetId: number, dia?: number) {
        const where: { sheetId: number; dia?: number } = { sheetId };
        if (dia) where.dia = dia;

        // Get results to delete (for MongoDB cleanup)
        const resultsToDelete = await prisma.calculationResult.findMany({
            where,
            select: { id: true, mongoResultId: true },
        });

        // Delete from PostgreSQL
        await prisma.calculationResult.deleteMany({ where });

        // Delete from MongoDB
        const db = await getMongoDb();
        for (const result of resultsToDelete) {
            if (result.mongoResultId) {
                try {
                    await db.collection("calculation_results").deleteOne({
                        _id: new ObjectId(result.mongoResultId),
                    });
                } catch {
                    // Ignore invalid ObjectId
                }
            }
        }

        return resultsToDelete;
    }
}
