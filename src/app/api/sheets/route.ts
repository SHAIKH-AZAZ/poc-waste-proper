import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { prisma } from "@/lib/prisma";
import { getMongoDb } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

function worksheetToJson(worksheet: ExcelJS.Worksheet): Record<string, unknown>[] {
  const headers: string[] = [];
  worksheet.getRow(1).eachCell({ includeEmpty: true }, (cell, col) => {
    headers[col - 1] = String(cell.value ?? "");
  });
  const rows: Record<string, unknown>[] = [];
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const obj: Record<string, unknown> = {};
    headers.forEach((header, i) => {
      if (!header) return;
      const cell = row.getCell(i + 1);
      const v = cell.value;
      if (v === null || v === undefined) obj[header] = "";
      else if (typeof v === "object" && "richText" in v)
        obj[header] = (v as ExcelJS.CellRichTextValue).richText.map((r) => r.text).join("");
      else if (typeof v === "object" && "result" in v)
        obj[header] = (v as ExcelJS.CellFormulaValue).result;
      else if (v instanceof Date) obj[header] = v.toISOString();
      else obj[header] = v;
    });
    rows.push(obj);
  });
  return rows;
}

// GET - Fetch all sheets for a project
export async function GET(req: NextRequest) {
  try {
    const projectId = req.nextUrl.searchParams.get("projectId");

    if (!projectId) {
      return NextResponse.json(
        { error: "projectId required" },
        { status: 400 }
      );
    }

    console.log(`[Sheets] Fetching sheets for project ${projectId}`);

    const sheets = await prisma.sheet.findMany({
      where: { projectId: parseInt(projectId) },
      include: {
        results: {
          select: {
            id: true,
            dia: true,
            algorithm: true,
            totalBarsUsed: true,
            wastePiecesReused: true,
            totalWaste: true,
            averageUtilization: true,
          },
        },
        _count: {
          select: {
            wasteProduced: true,
          },
        },
      },
      orderBy: { sheetNumber: "asc" },
    });

    console.log(`[Sheets] Found ${sheets.length} sheets`);

    return NextResponse.json({
      success: true,
      sheets,
    });
  } catch (err: unknown) {
    console.error("[Sheets] Error:", err);
    const errorMessage = err instanceof Error ? err.message : "Failed to fetch sheets";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

// POST - Create a new sheet (upload Excel to project)
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const projectId = formData.get("projectId") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    if (!projectId) {
      return NextResponse.json({ error: "projectId required" }, { status: 400 });
    }

    console.log(`[Sheets] Uploading sheet to project ${projectId}: ${file.name}`);

    // Parse Excel file
    const arrayBuffer = await file.arrayBuffer();
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(arrayBuffer);
    const jsonData = worksheetToJson(workbook.worksheets[0]);

    console.log(`[Sheets] Parsed ${jsonData.length} rows from Excel`);

    // Get next sheet number
    const lastSheet = await prisma.sheet.findFirst({
      where: { projectId: parseInt(projectId) },
      orderBy: { sheetNumber: "desc" },
    });
    const nextSheetNumber = (lastSheet?.sheetNumber || 0) + 1;

    // Create sheet in PostgreSQL
    const newSheet = await prisma.sheet.create({
      data: {
        projectId: parseInt(projectId),
        sheetNumber: nextSheetNumber,
        fileName: file.name,
        fileSize: file.size,
        status: "uploaded",
      },
    });

    console.log(`[Sheets] Created sheet #${nextSheetNumber} in PostgreSQL: ${newSheet.id}`);

    // Store Excel data in MongoDB
    const db = await getMongoDb();
    const excelDataCollection = db.collection("excel_data");

    const mongoResult = await excelDataCollection.insertOne({
      projectId: parseInt(projectId),
      sheetId: newSheet.id,
      sheetNumber: nextSheetNumber,
      fileName: file.name,
      data: jsonData,
      uploadedAt: new Date(),
      version: 1,
    });

    console.log(`[Sheets] Stored data in MongoDB: ${mongoResult.insertedId}`);

    // Update sheet with MongoDB reference
    await prisma.sheet.update({
      where: { id: newSheet.id },
      data: { mongoDataId: mongoResult.insertedId.toString() },
    });

    return NextResponse.json({
      success: true,
      sheet: {
        id: newSheet.id,
        sheetNumber: nextSheetNumber,
        fileName: file.name,
        mongoDataId: mongoResult.insertedId.toString(),
      },
      recordCount: jsonData.length,
      data: jsonData,
      message: "Sheet uploaded successfully",
    });
  } catch (err: unknown) {
    console.error("[Sheets] Error:", err);
    const errorMessage = err instanceof Error ? err.message : "Failed to upload sheet";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

// DELETE - Delete a sheet
export async function DELETE(req: NextRequest) {
  try {
    const sheetId = req.nextUrl.searchParams.get("sheetId");

    if (!sheetId) {
      return NextResponse.json({ error: "sheetId required" }, { status: 400 });
    }

    console.log(`[Sheets] Deleting sheet: ${sheetId}`);

    // Get sheet info first
    const sheet = await prisma.sheet.findUnique({
      where: { id: parseInt(sheetId) },
    });

    if (!sheet) {
      return NextResponse.json({ error: "Sheet not found" }, { status: 404 });
    }

    // Delete from PostgreSQL (cascades to results, waste)
    await prisma.sheet.delete({
      where: { id: parseInt(sheetId) },
    });

    console.log(`[Sheets] Deleted sheet from PostgreSQL`);

    // Delete from MongoDB
    if (sheet.mongoDataId) {
      const db = await getMongoDb();
      await db.collection("excel_data").deleteOne({
        _id: new ObjectId(sheet.mongoDataId),
      });
      await db.collection("calculation_results").deleteMany({
        sheetId: parseInt(sheetId),
      });
      console.log(`[Sheets] Deleted data from MongoDB`);
    }

    return NextResponse.json({
      success: true,
      message: "Sheet deleted successfully",
    });
  } catch (err: unknown) {
    console.error("[Sheets] Error:", err);
    const errorMessage = err instanceof Error ? err.message : "Failed to delete sheet";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
