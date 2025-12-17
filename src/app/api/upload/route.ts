import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { PrismaClient } from "@prisma/client";
import { getMongoDb } from "@/lib/mongodb";

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "No file uploaded" },
        { status: 400 }
      );
    }

    console.log(`[Upload] Processing file: ${file.name}, size: ${file.size} bytes`);

    // Parse Excel file
    const arrayBuffer = await file.arrayBuffer();
    const data = new Uint8Array(arrayBuffer);
    const workbook = XLSX.read(data, { type: "array" });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(sheet, { defval: "" });

    console.log(`[Upload] Parsed ${jsonData.length} rows from Excel`);

    // ============================================
    // STEP 1: Create Project in PostgreSQL
    // ============================================
    const project = await prisma.project.create({
      data: {
        name: file.name.replace(".xlsx", "").replace(".xls", ""),
        fileName: file.name,
        fileSize: file.size,
        status: "uploaded"
      }
    });

    console.log(`[Upload] Created project in PostgreSQL: ${project.id}`);

    // ============================================
    // STEP 2: Store Raw Excel Data in MongoDB
    // ============================================
    const db = await getMongoDb();
    const excelDataCollection = db.collection("excel_data");

    const mongoResult = await excelDataCollection.insertOne({
      projectId: project.id,
      fileName: file.name,
      data: jsonData,
      uploadedAt: new Date(),
      version: 1
    });

    console.log(`[Upload] Stored data in MongoDB: ${mongoResult.insertedId}`);

    // ============================================
    // STEP 3: Update Project with MongoDB Reference
    // ============================================
    await prisma.project.update({
      where: { id: project.id },
      data: {
        mongoDataId: mongoResult.insertedId.toString()
      }
    });

    console.log(`[Upload] Updated project with MongoDB reference`);

    return NextResponse.json({
      success: true,
      projectId: project.id,
      mongoDataId: mongoResult.insertedId.toString(),
      fileName: file.name,
      recordCount: jsonData.length,
      data: jsonData,  // Return parsed data for frontend
      message: "File uploaded successfully"
    });

  } catch (err: unknown) {
    console.error("[Upload] Error:", err);
    const errorMessage = err instanceof Error ? err.message : "Failed to process file";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
