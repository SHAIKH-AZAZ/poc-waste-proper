import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getMongoDb } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import type { CuttingStockResult } from "@/types/CuttingStock";
import { WASTE_MIN_LENGTH_MM } from "@/constants/config";

const prisma = new PrismaClient();

// POST - Save the BEST calculation result (compares greedy vs dynamic)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      sheetId,
      dia,
      greedyResult,
      dynamicResult,
      wasteItems,
    }: {
      sheetId: number;
      dia: number;
      greedyResult: CuttingStockResult | null;
      dynamicResult: CuttingStockResult | null;
      wasteItems?: {
        dia: number;
        length: number;
        sourceBarNumber: number;
        sourcePatternId: string;
        cutsOnSourceBar: { barCode: string; length: number; element: string }[];
      }[];
    } = body;

    if (!sheetId || dia === undefined) {
      return NextResponse.json(
        { error: "Missing required fields: sheetId, dia" },
        { status: 400 }
      );
    }

    // Get sheet info
    const sheet = await prisma.sheet.findUnique({
      where: { id: sheetId },
      select: { projectId: true },
    });

    if (!sheet) {
      return NextResponse.json({ error: "Sheet not found" }, { status: 404 });
    }

    console.log(`[Results] Processing results for sheet ${sheetId}, dia: ${dia}`);

    // ============================================
    // STEP 1: Determine the BEST algorithm
    // ============================================
    let bestResult: CuttingStockResult | null = null;
    let bestAlgorithm: string = "";

    // Check if results are valid (0 bars means algorithm failed)
    const greedyValid = greedyResult && greedyResult.totalBarsUsed > 0;
    const dynamicValid = dynamicResult && dynamicResult.totalBarsUsed > 0;

    console.log(`[Results] Greedy: ${greedyResult?.totalBarsUsed || 0} bars (valid: ${greedyValid})`);
    console.log(`[Results] Dynamic: ${dynamicResult?.totalBarsUsed || 0} bars (valid: ${dynamicValid})`);

    if (greedyValid && dynamicValid) {
      // Both valid - compare: fewer bars = better (primary criterion)
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
    } else if (greedyValid) {
      // Only greedy is valid
      bestResult = greedyResult!;
      bestAlgorithm = "greedy";
    } else if (dynamicValid) {
      // Only dynamic is valid
      bestResult = dynamicResult!;
      bestAlgorithm = "dynamic";
    }

    if (bestResult) {
      console.log(`[Results] Best algorithm: ${bestAlgorithm} (${bestResult.totalBarsUsed} bars, ${bestResult.totalWaste}mm waste)`);
    }

    if (!bestResult) {
      return NextResponse.json({ error: "No valid results provided (both algorithms returned 0 bars)" }, { status: 400 });
    }

    // ============================================
    // STEP 2: Check if result already exists
    // ============================================
    const existingResult = await prisma.calculationResult.findUnique({
      where: {
        sheetId_dia: { sheetId, dia },
      },
    });

    if (existingResult) {
      console.log(`[Results] Result already exists for sheet ${sheetId}, dia ${dia}`);
      return NextResponse.json({
        success: true,
        skipped: true,
        resultId: existingResult.id,
        algorithm: existingResult.algorithm,
        message: "Result already exists",
      });
    }

    // ============================================
    // STEP 3: Store Detailed Data in MongoDB
    // ============================================
    const db = await getMongoDb();
    const resultsCollection = db.collection("calculation_results");

    const mongoResult = await resultsCollection.insertOne({
      projectId: sheet.projectId,
      sheetId,
      algorithm: bestAlgorithm,
      dia,
      patterns: bestResult.patterns,
      detailedCuts: bestResult.detailedCuts,
      summary: bestResult.summary,
      createdAt: new Date(),
    });

    console.log(`[Results] Stored in MongoDB: ${mongoResult.insertedId}`);

    // ============================================
    // STEP 4: Store Metadata in PostgreSQL
    // ============================================
    const pgResult = await prisma.calculationResult.create({
      data: {
        sheetId,
        algorithm: bestAlgorithm,
        dia,
        totalBarsUsed: bestResult.totalBarsUsed,
        wastePiecesReused: 0, // Will be updated if waste was used
        totalWaste: bestResult.totalWaste,
        averageUtilization: bestResult.averageUtilization,
        executionTime: bestResult.executionTime,
        mongoResultId: mongoResult.insertedId.toString(),
      },
    });

    console.log(`[Results] Stored in PostgreSQL: ${pgResult.id}`);

    // ============================================
    // STEP 5: Save Waste to Inventory (>= 2m only)
    // ============================================
    console.log(`[Results] Received ${wasteItems?.length || 0} waste items to process`);
    
    if (wasteItems && wasteItems.length > 0) {
      const wasteOriginsCollection = db.collection("waste_origins");
      let savedWasteCount = 0;

      for (const item of wasteItems) {
        console.log(`[Results] Processing waste: dia=${item.dia}, length=${item.length}mm`);
        // Only save waste >= minimum threshold
        if (item.length >= WASTE_MIN_LENGTH_MM) {
          // Store origin in MongoDB
          const originResult = await wasteOriginsCollection.insertOne({
            projectId: sheet.projectId,
            sheetId,
            sourceBarNumber: item.sourceBarNumber,
            sourcePatternId: item.sourcePatternId,
            cutsOnSourceBar: item.cutsOnSourceBar,
            createdAt: new Date(),
          });

          // Store in PostgreSQL
          await prisma.wasteInventory.create({
            data: {
              projectId: sheet.projectId,
              sourceSheetId: sheetId,
              dia: item.dia,
              length: item.length,
              sourceBarNumber: item.sourceBarNumber,
              sourcePatternId: item.sourcePatternId,
              mongoCutsOriginId: originResult.insertedId.toString(),
              status: "available",
            },
          });

          savedWasteCount++;
        }
      }

      console.log(`[Results] Saved ${savedWasteCount} waste items (discarded ${wasteItems.length - savedWasteCount} < 2m)`);
    }

    // ============================================
    // STEP 6: Update Sheet Status
    // ============================================
    await prisma.sheet.update({
      where: { id: sheetId },
      data: { status: "calculated" },
    });

    return NextResponse.json({
      success: true,
      resultId: pgResult.id,
      algorithm: bestAlgorithm,
      mongoResultId: mongoResult.insertedId.toString(),
      comparison: {
        greedy: greedyResult ? { bars: greedyResult.totalBarsUsed, waste: greedyResult.totalWaste } : null,
        dynamic: dynamicResult ? { bars: dynamicResult.totalBarsUsed, waste: dynamicResult.totalWaste } : null,
        winner: bestAlgorithm,
      },
      message: `Saved ${bestAlgorithm} result (best of both)`,
    });
  } catch (err: unknown) {
    console.error("[Results] Error:", err);
    const errorMessage = err instanceof Error ? err.message : "Failed to save result";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

// GET - Fetch results for a sheet
export async function GET(req: NextRequest) {
  try {
    const sheetId = req.nextUrl.searchParams.get("sheetId");
    const projectId = req.nextUrl.searchParams.get("projectId");

    if (!sheetId && !projectId) {
      return NextResponse.json(
        { error: "sheetId or projectId required" },
        { status: 400 }
      );
    }

    console.log(`[Results] Fetching results for sheet: ${sheetId || "all"}, project: ${projectId || "N/A"}`);

    // Build where clause
    let where = {};
    if (sheetId) {
      where = { sheetId: parseInt(sheetId) };
    } else if (projectId) {
      // Get all sheets for project first
      const sheets = await prisma.sheet.findMany({
        where: { projectId: parseInt(projectId) },
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

    console.log(`[Results] Found ${pgResults.length} results`);

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

    return NextResponse.json({
      success: true,
      results: enrichedResults,
    });
  } catch (err: unknown) {
    console.error("[Results] Error:", err);
    const errorMessage = err instanceof Error ? err.message : "Failed to fetch results";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}


// DELETE - Delete results for a sheet/dia to allow recalculation
export async function DELETE(req: NextRequest) {
  try {
    const sheetId = req.nextUrl.searchParams.get("sheetId");
    const dia = req.nextUrl.searchParams.get("dia");

    if (!sheetId) {
      return NextResponse.json({ error: "sheetId required" }, { status: 400 });
    }

    console.log(`[Results] Deleting results for sheet ${sheetId}, dia: ${dia || "all"}`);

    // Build where clause
    const where: { sheetId: number; dia?: number } = {
      sheetId: parseInt(sheetId),
    };
    if (dia) {
      where.dia = parseInt(dia);
    }

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

    console.log(`[Results] Deleted ${resultsToDelete.length} results`);

    return NextResponse.json({
      success: true,
      deleted: resultsToDelete.length,
      message: `Deleted ${resultsToDelete.length} results`,
    });
  } catch (err: unknown) {
    console.error("[Results] Error:", err);
    const errorMessage = err instanceof Error ? err.message : "Failed to delete results";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
