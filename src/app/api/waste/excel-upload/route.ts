import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { WASTE_MIN_LENGTH_MM } from "@/constants/config";
import * as XLSX from "xlsx";

export const dynamic = "force-dynamic";

// POST - Upload Excel file with waste materials (OFFCUT)
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

    // Parse Excel file
    const arrayBuffer = await file.arrayBuffer();
    const data = new Uint8Array(arrayBuffer);
    const workbook = XLSX.read(data, { type: "array" });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(sheet, { defval: "" }) as any[];

    if (jsonData.length === 0) {
      return NextResponse.json(
        { error: "Excel file is empty" },
        { status: 400 }
      );
    }

    // Expected columns: Dia, Length, Repetition (or similar variations)
    // Try to detect column names (case-insensitive)
    const firstRow = jsonData[0];
    const keys = Object.keys(firstRow).map(k => k.toLowerCase());
    
    const diaKey = keys.find(k => k.includes('dia') || k.includes('diameter')) || 
                   Object.keys(firstRow)[0]; // fallback to first column
    const lengthKey = keys.find(k => k.includes('length') || k.includes('size') || k.includes('cutting')) || 
                      Object.keys(firstRow)[1]; // fallback to second column
    const repetitionKey = keys.find(k => 
      k.includes('repetition') || 
      k.includes('repeat') || 
      k.includes('quantity') || 
      k.includes('qty') || 
      k.includes('count') ||
      k.includes('no') ||
      k.includes('number')
    );

    // Parse waste items from Excel
    const wasteItems: { dia: number; length: number; quantity: number }[] = [];
    const errors: string[] = [];

    jsonData.forEach((row, index) => {
      const rowNum = index + 2; // Excel row number (1-indexed + header)
      
      // Get values using detected keys
      const diaValue = row[Object.keys(firstRow).find(k => k.toLowerCase() === diaKey) || diaKey];
      const lengthValue = row[Object.keys(firstRow).find(k => k.toLowerCase() === lengthKey) || lengthKey];
      const repetitionValue = repetitionKey 
        ? row[Object.keys(firstRow).find(k => k.toLowerCase() === repetitionKey) || repetitionKey]
        : 1; // Default to 1 if no repetition column

      // Skip empty rows
      if (!diaValue && !lengthValue) return;

      const dia = parseFloat(diaValue);
      const length = parseFloat(lengthValue);
      const quantity = parseInt(repetitionValue) || 1; // Default to 1 if invalid

      // Validate
      if (isNaN(dia) || dia <= 0) {
        errors.push(`Row ${rowNum}: Invalid diameter "${diaValue}"`);
        return;
      }

      if (isNaN(length) || length < WASTE_MIN_LENGTH_MM) {
        errors.push(`Row ${rowNum}: Invalid length "${lengthValue}" (min: ${WASTE_MIN_LENGTH_MM}mm)`);
        return;
      }

      if (quantity <= 0) {
        errors.push(`Row ${rowNum}: Invalid repetition "${repetitionValue}" (must be > 0)`);
        return;
      }

      wasteItems.push({ dia, length, quantity });
    });

    if (errors.length > 0 && wasteItems.length === 0) {
      return NextResponse.json(
        { 
          error: "No valid waste items found", 
          details: errors.slice(0, 10) // Show first 10 errors
        },
        { status: 400 }
      );
    }

    // Find or create "OFFCUT Upload" sheet for this project
    let offcutSheet = await prisma.sheet.findFirst({
      where: {
        projectId: parseInt(projectId),
        fileName: { contains: "OFFCUT" },
      },
    });

    if (!offcutSheet) {
      // Get the highest sheet number for this project
      const lastSheet = await prisma.sheet.findFirst({
        where: { projectId: parseInt(projectId) },
        orderBy: { sheetNumber: "desc" },
      });

      const nextSheetNumber = (lastSheet?.sheetNumber || 0) + 1;

      offcutSheet = await prisma.sheet.create({
        data: {
          projectId: parseInt(projectId),
          sheetNumber: nextSheetNumber,
          fileName: file.name,
          fileSize: file.size,
          status: "completed",
        },
      });
    }

    // Create waste items in database
    const createdWaste = [];
    let totalPieces = 0;
    
    for (const item of wasteItems) {
      // Create multiple entries based on quantity/repetition
      for (let i = 0; i < item.quantity; i++) {
        const waste = await prisma.wasteInventory.create({
          data: {
            projectId: parseInt(projectId),
            sourceSheetId: offcutSheet.id,
            dia: item.dia,
            length: item.length,
            sourceBarNumber: 0, // Excel upload
            sourcePatternId: "offcut-upload",
            mongoCutsOriginId: null,
            status: "available",
          },
        });
        createdWaste.push(waste);
        totalPieces++;
      }
    }

    return NextResponse.json({
      success: true,
      created: totalPieces,
      rows: wasteItems.length,
      skipped: errors.length,
      waste: createdWaste,
      errors: errors.length > 0 ? errors.slice(0, 10) : undefined,
      message: `Successfully uploaded ${totalPieces} waste piece${totalPieces !== 1 ? 's' : ''} from ${wasteItems.length} row${wasteItems.length !== 1 ? 's' : ''} in ${file.name}`,
    });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Failed to upload waste Excel";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
