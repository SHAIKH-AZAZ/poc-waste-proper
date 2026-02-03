import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { prisma } from "@/lib/prisma";
import { getMongoDb } from "@/lib/mongodb";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const projectIdParam = formData.get("projectId") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    console.log(`[Upload] Processing file: ${file.name}, size: ${file.size} bytes`);

    // Parse Excel file
    const arrayBuffer = await file.arrayBuffer();
    const data = Buffer.from(arrayBuffer);
    const workbook = XLSX.read(data, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(sheet, { defval: "" });

    console.log(`[Upload] Parsed ${jsonData.length} rows from Excel`);

    let projectId: number;
    let sheetNumber: number;

    if (projectIdParam) {
      // Adding sheet to existing project
      projectId = parseInt(projectIdParam);
      
      // Get next sheet number
      const lastSheet = await prisma.sheet.findFirst({
        where: { projectId },
        orderBy: { sheetNumber: "desc" },
      });
      sheetNumber = (lastSheet?.sheetNumber || 0) + 1;
    } else {
      // Create new project with first sheet
      const project = await prisma.project.create({
        data: {
          name: file.name.replace(".xlsx", "").replace(".xls", ""),
          status: "active",
        },
      });
      projectId = project.id;
      sheetNumber = 1;
      console.log(`[Upload] Created project in PostgreSQL: ${projectId}`);
    }

    // ============================================
    // Create Sheet in PostgreSQL
    // ============================================
    const newSheet = await prisma.sheet.create({
      data: {
        projectId,
        sheetNumber,
        fileName: file.name,
        fileSize: file.size,
        status: "uploaded",
      },
    });

    console.log(`[Upload] Created sheet #${sheetNumber} in PostgreSQL: ${newSheet.id}`);

    // ============================================
    // Store Raw Excel Data in MongoDB
    // ============================================
    const db = await getMongoDb();
    const excelDataCollection = db.collection("excel_data");

    const mongoResult = await excelDataCollection.insertOne({
      projectId,
      sheetId: newSheet.id,
      sheetNumber,
      fileName: file.name,
      data: jsonData,
      uploadedAt: new Date(),
      version: 1,
    });

    console.log(`[Upload] Stored data in MongoDB: ${mongoResult.insertedId}`);

    // ============================================
    // Update Sheet with MongoDB Reference
    // ============================================
    await prisma.sheet.update({
      where: { id: newSheet.id },
      data: {
        mongoDataId: mongoResult.insertedId.toString(),
      },
    });

    console.log(`[Upload] Updated sheet with MongoDB reference`);

    return NextResponse.json({
      success: true,
      projectId,
      sheetId: newSheet.id,
      sheetNumber,
      mongoDataId: mongoResult.insertedId.toString(),
      fileName: file.name,
      recordCount: jsonData.length,
      data: jsonData,
      message: "File uploaded successfully",
    });
  } catch (err: unknown) {
    console.error("[Upload] Error:", err);
    const errorMessage = err instanceof Error ? err.message : "Failed to process file";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
