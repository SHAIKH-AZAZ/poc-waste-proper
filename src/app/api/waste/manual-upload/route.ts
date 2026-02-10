import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { WASTE_MIN_LENGTH_MM } from "@/constants/config";

// POST - Manually add waste to inventory (user-uploaded waste)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      projectId,
      wasteItems,
    }: {
      projectId: number;
      wasteItems: {
        dia: number;
        length: number;
        quantity: number;
      }[];
    } = body;

    if (!projectId || !wasteItems || wasteItems.length === 0) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Validate all items
    const invalidItems = wasteItems.filter(
      (item) => item.dia <= 0 || item.length < WASTE_MIN_LENGTH_MM || item.quantity <= 0
    );

    if (invalidItems.length > 0) {
      return NextResponse.json(
        { error: `Invalid items: All must have dia > 0, length >= ${WASTE_MIN_LENGTH_MM}mm, quantity > 0` },
        { status: 400 }
      );
    }



    // For manual uploads, we need a sourceSheetId. 
    // We'll use 0 as a special marker for manual uploads, but Prisma requires a valid sheet.
    // Better approach: Create a virtual "Manual Upload" sheet for this project if it doesn't exist
    
    // Find or create a "Manual Upload" sheet for this project
    let manualSheet = await prisma.sheet.findFirst({
      where: {
        projectId,
        fileName: "Manual Waste Upload",
      },
    });

    if (!manualSheet) {
      // Get the highest sheet number for this project
      const lastSheet = await prisma.sheet.findFirst({
        where: { projectId },
        orderBy: { sheetNumber: "desc" },
      });

      const nextSheetNumber = (lastSheet?.sheetNumber || 0) + 1;

      manualSheet = await prisma.sheet.create({
        data: {
          projectId,
          sheetNumber: nextSheetNumber,
          fileName: "Manual Waste Upload",
          status: "completed",
        },
      });
    }

    // Create waste items in database
    const wasteData = [];
    let totalCreated = 0;
    
    for (const item of wasteItems) {
      // Create multiple entries if quantity > 1
      for (let i = 0; i < item.quantity; i++) {
        wasteData.push({
          projectId,
          sourceSheetId: manualSheet.id,
          dia: item.dia,
          length: item.length,
          sourceBarNumber: 0, // Manual upload
          sourcePatternId: "manual-upload",
          mongoCutsOriginId: null, // No origin data for manual uploads
          status: "available",
        });
        totalCreated++;
      }
    }

    if (wasteData.length > 0) {
      await prisma.wasteInventory.createMany({
        data: wasteData,
      });
    }

    // Return empty array for createdWaste as we don't need the IDs immediately
    const createdWaste: any[] = [];

    return NextResponse.json({
      success: true,
      created: totalCreated,
      waste: createdWaste,
      message: `Successfully added ${totalCreated} waste piece${totalCreated !== 1 ? 's' : ''} to inventory`,
    });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Failed to add waste";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
