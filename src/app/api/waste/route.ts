import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getMongoDb } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { WASTE_MIN_LENGTH_MM } from "@/constants/config";

const prisma = new PrismaClient();

// GET - Fetch waste inventory for a project
export async function GET(req: NextRequest) {
  try {
    const projectId = req.nextUrl.searchParams.get("projectId");
    const dia = req.nextUrl.searchParams.get("dia");
    const status = req.nextUrl.searchParams.get("status");
    const sourceSheetId = req.nextUrl.searchParams.get("sourceSheetId");

    if (!projectId) {
      return NextResponse.json(
        { error: "projectId required" },
        { status: 400 }
      );
    }

    console.log(`[Waste] Fetching waste for project ${projectId}, dia: ${dia || "all"}, status: ${status || "all"}, sourceSheet: ${sourceSheetId || "all"}`);

    // Build where clause
    const where: {
      projectId: number;
      dia?: number;
      status?: string;
      sourceSheetId?: number;
    } = {
      projectId: parseInt(projectId),
    };

    if (dia) {
      where.dia = parseInt(dia);
    }

    if (status) {
      where.status = status;
    }

    if (sourceSheetId) {
      where.sourceSheetId = parseInt(sourceSheetId);
    }

    // Get waste from PostgreSQL
    const wasteItems = await prisma.wasteInventory.findMany({
      where,
      include: {
        sourceSheet: {
          select: {
            id: true,
            sheetNumber: true,
            fileName: true,
          },
        },
        usages: {
          include: {
            usedInSheet: {
              select: {
                id: true,
                sheetNumber: true,
                fileName: true,
              },
            },
          },
        },
      },
      orderBy: [{ dia: "asc" }, { length: "desc" }],
    });

    console.log(`[Waste] Found ${wasteItems.length} waste items`);

    // Get origin details from MongoDB
    const db = await getMongoDb();
    const wasteOriginsCollection = db.collection("waste_origins");

    const enrichedWaste = await Promise.all(
      wasteItems.map(async (item) => {
        let cutsOnSourceBar: { barCode: string; length: number; element: string }[] = [];

        if (item.mongoCutsOriginId) {
          try {
            const originData = await wasteOriginsCollection.findOne({
              _id: new ObjectId(item.mongoCutsOriginId),
            });
            if (originData) {
              cutsOnSourceBar = originData.cutsOnSourceBar || [];
            }
          } catch {
            // Ignore invalid ObjectId
          }
        }

        return {
          ...item,
          cutsOnSourceBar,
        };
      })
    );

    // Calculate summary
    const summary = {
      totalPieces: wasteItems.length,
      availablePieces: wasteItems.filter((w) => w.status === "available").length,
      usedPieces: wasteItems.filter((w) => w.status === "used").length,
      totalAvailableLength: wasteItems
        .filter((w) => w.status === "available")
        .reduce((sum, w) => sum + w.length, 0),
      byDia: {} as Record<number, { available: number; used: number; totalLength: number }>,
    };

    // Group by dia
    wasteItems.forEach((w) => {
      if (!summary.byDia[w.dia]) {
        summary.byDia[w.dia] = { available: 0, used: 0, totalLength: 0 };
      }
      if (w.status === "available") {
        summary.byDia[w.dia].available++;
        summary.byDia[w.dia].totalLength += w.length;
      } else if (w.status === "used") {
        summary.byDia[w.dia].used++;
      }
    });

    return NextResponse.json({
      success: true,
      waste: enrichedWaste,
      summary,
    });
  } catch (err: unknown) {
    console.error("[Waste] Error:", err);
    const errorMessage = err instanceof Error ? err.message : "Failed to fetch waste";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

// POST - Add waste to inventory (called after calculation)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      projectId,
      sheetId,
      wasteItems,
    }: {
      projectId: number;
      sheetId: number;
      wasteItems: {
        dia: number;
        length: number;
        sourceBarNumber: number;
        sourcePatternId: string;
        cutsOnSourceBar: { barCode: string; length: number; element: string }[];
      }[];
    } = body;

    if (!projectId || !sheetId || !wasteItems) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    console.log(`[Waste] Adding ${wasteItems.length} waste items for sheet ${sheetId}`);

    // Filter waste >= minimum threshold
    const validWaste = wasteItems.filter((w) => w.length >= WASTE_MIN_LENGTH_MM);
    console.log(`[Waste] ${validWaste.length} items >= 2m (discarding ${wasteItems.length - validWaste.length} smaller pieces)`);

    const db = await getMongoDb();
    const wasteOriginsCollection = db.collection("waste_origins");

    const createdWaste = [];

    for (const item of validWaste) {
      // Store origin details in MongoDB
      const mongoResult = await wasteOriginsCollection.insertOne({
        projectId,
        sheetId,
        sourceBarNumber: item.sourceBarNumber,
        sourcePatternId: item.sourcePatternId,
        cutsOnSourceBar: item.cutsOnSourceBar,
        createdAt: new Date(),
      });

      // Create waste in PostgreSQL
      const waste = await prisma.wasteInventory.create({
        data: {
          projectId,
          sourceSheetId: sheetId,
          dia: item.dia,
          length: item.length,
          sourceBarNumber: item.sourceBarNumber,
          sourcePatternId: item.sourcePatternId,
          mongoCutsOriginId: mongoResult.insertedId.toString(),
          status: "available",
        },
      });

      createdWaste.push(waste);
    }

    console.log(`[Waste] Created ${createdWaste.length} waste items`);

    return NextResponse.json({
      success: true,
      created: createdWaste.length,
      discarded: wasteItems.length - validWaste.length,
      waste: createdWaste,
    });
  } catch (err: unknown) {
    console.error("[Waste] Error:", err);
    const errorMessage = err instanceof Error ? err.message : "Failed to add waste";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

// PATCH - Mark waste as used
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      wasteId,
      usedInSheetId,
      usedForBarCode,
      cutLength,
      remainingLength,
      remainingStatus,
    }: {
      wasteId: number;
      usedInSheetId: number;
      usedForBarCode: string;
      cutLength: number;
      remainingLength: number;
      remainingStatus: "discarded" | "added_to_inventory";
    } = body;

    console.log(`[Waste] Marking waste ${wasteId} as used for ${usedForBarCode}`);

    // Update waste status
    await prisma.wasteInventory.update({
      where: { id: wasteId },
      data: { status: "used" },
    });

    // Create usage record
    const usage = await prisma.wasteUsage.create({
      data: {
        wasteId,
        usedInSheetId,
        usedForBarCode,
        cutLength,
        remainingLength,
        remainingStatus,
      },
    });

    // If remaining >= minimum threshold, add as new waste
    if (remainingStatus === "added_to_inventory" && remainingLength >= WASTE_MIN_LENGTH_MM) {
      const originalWaste = await prisma.wasteInventory.findUnique({
        where: { id: wasteId },
      });

      if (originalWaste) {
        await prisma.wasteInventory.create({
          data: {
            projectId: originalWaste.projectId,
            sourceSheetId: usedInSheetId,
            dia: originalWaste.dia,
            length: remainingLength,
            sourceBarNumber: originalWaste.sourceBarNumber,
            sourcePatternId: `recut-${wasteId}`,
            status: "available",
          },
        });
        console.log(`[Waste] Created new waste from remaining ${remainingLength}mm`);
      }
    }

    return NextResponse.json({
      success: true,
      usage,
    });
  } catch (err: unknown) {
    console.error("[Waste] Error:", err);
    const errorMessage = err instanceof Error ? err.message : "Failed to update waste";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
