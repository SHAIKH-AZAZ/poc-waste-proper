import { NextRequest, NextResponse } from "next/server";
import { getMongoDb } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export async function GET(req: NextRequest) {
  try {
    const mongoDataId = req.nextUrl.searchParams.get("mongoDataId");

    if (!mongoDataId) {
      return NextResponse.json(
        { error: "mongoDataId required" },
        { status: 400 }
      );
    }

    console.log(`[ExcelData] Fetching data for mongoDataId: ${mongoDataId}`);

    const db = await getMongoDb();
    const excelDataCollection = db.collection("excel_data");

    const data = await excelDataCollection.findOne({
      _id: new ObjectId(mongoDataId)
    });

    if (!data) {
      console.log(`[ExcelData] Data not found for mongoDataId: ${mongoDataId}`);
      return NextResponse.json(
        { error: "Data not found" },
        { status: 404 }
      );
    }

    console.log(`[ExcelData] Found data with ${data.data.length} rows`);

    return NextResponse.json({
      success: true,
      data: data.data,
      uploadedAt: data.uploadedAt,
      version: data.version,
      fileName: data.fileName
    });

  } catch (err: unknown) {
    console.error("[ExcelData] Error:", err);
    const errorMessage = err instanceof Error ? err.message : "Failed to fetch data";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
