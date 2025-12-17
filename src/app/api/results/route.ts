import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getMongoDb } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import type { CuttingStockResult } from "@/types/CuttingStock";

const prisma = new PrismaClient();

// POST - Save calculation result
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      projectId,
      algorithm,
      dia,
      result
    }: {
      projectId: number;
      algorithm: string;
      dia: number;
      result: CuttingStockResult;
    } = body;

    if (!projectId || !algorithm || !result) {
      return NextResponse.json(
        { error: "Missing required fields: projectId, algorithm, dia, result" },
        { status: 400 }
      );
    }

    console.log(`[Results] Saving result for project ${projectId}, algorithm: ${algorithm}, dia: ${dia}`);

    // ============================================
    // STEP 1: Store Detailed Data in MongoDB
    // ============================================
    const db = await getMongoDb();
    const resultsCollection = db.collection("calculation_results");

    const mongoResult = await resultsCollection.insertOne({
      projectId,
      algorithm,
      dia,
      patterns: result.patterns,
      detailedCuts: result.detailedCuts,
      createdAt: new Date()
    });

    console.log(`[Results] Stored detailed data in MongoDB: ${mongoResult.insertedId}`);

    // ============================================
    // STEP 2: Store Metadata in PostgreSQL
    // ============================================
    const pgResult = await prisma.calculationResult.create({
      data: {
        projectId,
        algorithm,
        dia,
        totalBarsUsed: result.totalBarsUsed,
        totalWaste: result.totalWaste,
        averageUtilization: result.averageUtilization,
        executionTime: result.executionTime,
        mongoResultId: mongoResult.insertedId.toString()
      }
    });

    console.log(`[Results] Stored metadata in PostgreSQL: ${pgResult.id}`);

    // ============================================
    // STEP 3: Update Project Status
    // ============================================
    await prisma.project.update({
      where: { id: projectId },
      data: { status: "completed" }
    });

    console.log(`[Results] Updated project status to completed`);

    return NextResponse.json({
      success: true,
      resultId: pgResult.id,
      mongoResultId: mongoResult.insertedId.toString(),
      message: "Result saved successfully"
    });

  } catch (err: unknown) {
    console.error("[Results] Error:", err);
    const errorMessage = err instanceof Error ? err.message : "Failed to save result";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

// GET - Fetch results for a project
export async function GET(req: NextRequest) {
  try {
    const projectId = req.nextUrl.searchParams.get("projectId");
    const algorithm = req.nextUrl.searchParams.get("algorithm");

    if (!projectId) {
      return NextResponse.json(
        { error: "projectId required" },
        { status: 400 }
      );
    }

    console.log(`[Results] Fetching results for project ${projectId}, algorithm: ${algorithm || "all"}`);

    // ============================================
    // STEP 1: Get Metadata from PostgreSQL
    // ============================================
    const where: any = { projectId: parseInt(projectId) };
    if (algorithm) {
      where.algorithm = algorithm;
    }

    const pgResults = await prisma.calculationResult.findMany({
      where,
      orderBy: { createdAt: "desc" }
    });

    console.log(`[Results] Found ${pgResults.length} results in PostgreSQL`);

    // ============================================
    // STEP 2: Get Detailed Data from MongoDB
    // ============================================
    const db = await getMongoDb();
    const resultsCollection = db.collection("calculation_results");

    const enrichedResults = await Promise.all(
      pgResults.map(async (pgResult) => {
        if (!pgResult.mongoResultId) {
          return pgResult;
        }

        const mongoData = await resultsCollection.findOne({
          _id: new ObjectId(pgResult.mongoResultId)
        });

        return {
          ...pgResult,
          patterns: mongoData?.patterns || [],
          detailedCuts: mongoData?.detailedCuts || []
        };
      })
    );

    console.log(`[Results] Enriched ${enrichedResults.length} results with MongoDB data`);

    return NextResponse.json({
      success: true,
      results: enrichedResults
    });

  } catch (err: unknown) {
    console.error("[Results] Error:", err);
    const errorMessage = err instanceof Error ? err.message : "Failed to fetch results";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
