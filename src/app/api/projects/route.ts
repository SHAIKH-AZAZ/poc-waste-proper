import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getMongoDb } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

const prisma = new PrismaClient();

// GET all projects
export async function GET(req: NextRequest) {
  try {
    console.log("[Projects] Fetching all projects");

    const projects = await prisma.project.findMany({
      include: {
        results: {
          select: {
            id: true,
            algorithm: true,
            dia: true,
            totalBarsUsed: true,
            totalWaste: true,
            createdAt: true
          }
        }
      },
      orderBy: { uploadDate: "desc" }
    });

    console.log(`[Projects] Found ${projects.length} projects`);

    return NextResponse.json({
      success: true,
      projects: projects.map(p => ({
        ...p,
        resultCount: p.results.length
      }))
    });

  } catch (err: unknown) {
    console.error("[Projects] Error:", err);
    const errorMessage = err instanceof Error ? err.message : "Failed to fetch projects";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

// DELETE project
export async function DELETE(req: NextRequest) {
  try {
    const projectId = req.nextUrl.searchParams.get("projectId");

    if (!projectId) {
      return NextResponse.json(
        { error: "projectId required" },
        { status: 400 }
      );
    }

    console.log(`[Projects] Deleting project: ${projectId}`);

    // Get project to find MongoDB references
    const project = await prisma.project.findUnique({
      where: { id: parseInt(projectId) }
    });

    if (!project) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }

    // Delete from PostgreSQL (cascades to results)
    await prisma.project.delete({
      where: { id: parseInt(projectId) }
    });

    console.log(`[Projects] Deleted project from PostgreSQL`);

    // Delete from MongoDB
    const db = await getMongoDb();

    // Delete excel data
    if (project.mongoDataId) {
      await db.collection("excel_data").deleteOne({
        _id: new ObjectId(project.mongoDataId)
      });
      console.log(`[Projects] Deleted excel data from MongoDB`);
    }

    // Delete calculation results
    await db.collection("calculation_results").deleteMany({
      projectId: parseInt(projectId)
    });

    console.log(`[Projects] Deleted calculation results from MongoDB`);

    return NextResponse.json({
      success: true,
      message: "Project deleted successfully"
    });

  } catch (err: unknown) {
    console.error("[Projects] Error:", err);
    const errorMessage = err instanceof Error ? err.message : "Failed to delete project";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
