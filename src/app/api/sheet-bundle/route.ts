import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getMongoDb } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

// One round trip for the sheet page: sheet meta (Postgres) + its Excel rows (Mongo).
// Collapses the client's sheet→excel waterfall into a single request.
export async function GET(req: NextRequest) {
  try {
    const sheetId = req.nextUrl.searchParams.get("sheetId");
    if (!sheetId) {
      return NextResponse.json({ error: "sheetId required" }, { status: 400 });
    }

    const sheet = await prisma.sheet.findUnique({
      where: { id: parseInt(sheetId) },
      select: { id: true, sheetNumber: true, fileName: true, status: true, mongoDataId: true },
    });
    if (!sheet) {
      return NextResponse.json({ error: "Sheet not found" }, { status: 404 });
    }

    let excel: unknown[] = [];
    if (sheet.mongoDataId) {
      const db = await getMongoDb();
      const doc = await db
        .collection("excel_data")
        .findOne({ _id: new ObjectId(sheet.mongoDataId) }, { projection: { data: 1 } });
      excel = doc?.data ?? [];
    }

    return NextResponse.json({ success: true, sheet, excel });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to load sheet bundle";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
