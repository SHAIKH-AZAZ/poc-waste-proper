import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getMongoDb } from "@/lib/mongodb";

const prisma = new PrismaClient();

// GET all projects
export async function GET() {
  try {
    console.log("[Projects] Fetching all projects");

    const projects = await prisma.project.findMany({
      include: {
        sheets: {
          select: {
            id: true,
            sheetNumber: true,
            fileName: true,
            status: true,
            uploadedAt: true,
            _count: {
              select: {
                results: true,
              },
            },
          },
          orderBy: { sheetNumber: "asc" },
        },
        _count: {
          select: {
            wasteInventory: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    console.log(`[Projects] Found ${projects.length} projects`);

    // Calculate summary for each project
    const projectsWithSummary = projects.map((p) => ({
      ...p,
      sheetCount: p.sheets.length,
      totalCalculations: p.sheets.reduce((sum, s) => sum + s._count.results, 0),
      wasteCount: p._count.wasteInventory,
    }));

    return NextResponse.json({
      success: true,
      projects: projectsWithSummary,
    });
  } catch (err: unknown) {
    console.error("[Projects] Error:", err);
    const errorMessage =
      err instanceof Error ? err.message : "Failed to fetch projects";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

// POST - Create new project
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, description } = body;

    if (!name) {
      return NextResponse.json({ error: "Project name required" }, { status: 400 });
    }

    console.log(`[Projects] Creating project: ${name}`);

    const project = await prisma.project.create({
      data: {
        name,
        description: description || null,
        status: "active",
      },
    });

    console.log(`[Projects] Created project: ${project.id}`);

    return NextResponse.json({
      success: true,
      project,
    });
  } catch (err: unknown) {
    console.error("[Projects] Error:", err);
    const errorMessage =
      err instanceof Error ? err.message : "Failed to create project";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

// DELETE project
export async function DELETE(req: NextRequest) {
  try {
    const projectId = req.nextUrl.searchParams.get("projectId");

    if (!projectId) {
      return NextResponse.json({ error: "projectId required" }, { status: 400 });
    }

    console.log(`[Projects] Deleting project: ${projectId}`);

    // Get project with sheets to find MongoDB references
    const project = await prisma.project.findUnique({
      where: { id: parseInt(projectId) },
      include: {
        sheets: true,
      },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Delete from PostgreSQL (cascades to sheets, results, waste)
    await prisma.project.delete({
      where: { id: parseInt(projectId) },
    });

    console.log(`[Projects] Deleted project from PostgreSQL`);

    // Delete from MongoDB
    const db = await getMongoDb();

    // Delete all excel data for this project
    await db.collection("excel_data").deleteMany({
      projectId: parseInt(projectId),
    });
    console.log(`[Projects] Deleted excel data from MongoDB`);

    // Delete all calculation results
    await db.collection("calculation_results").deleteMany({
      projectId: parseInt(projectId),
    });
    console.log(`[Projects] Deleted calculation results from MongoDB`);

    // Delete waste origins
    await db.collection("waste_origins").deleteMany({
      projectId: parseInt(projectId),
    });
    console.log(`[Projects] Deleted waste origins from MongoDB`);

    return NextResponse.json({
      success: true,
      message: "Project deleted successfully",
    });
  } catch (err: unknown) {
    console.error("[Projects] Error:", err);
    const errorMessage =
      err instanceof Error ? err.message : "Failed to delete project";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
