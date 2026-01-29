import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getMongoDb } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { CuttingStockPreprocessor } from "@/utils/cuttingStockPreprocessor";
import { GreedyCuttingStock } from "@/algorithms/greedyCuttingStock";
import { TrueDynamicCuttingStock } from "@/algorithms/trueDynamicCuttingStock";
import { sanitizeExcelData } from "@/utils/sanitizeData";
import { WASTE_MIN_LENGTH_MM } from "@/constants/config";
import type { CuttingStockResult, WastePiece, DetailedCut } from "@/types/CuttingStock";

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      sheetId,
      dia,
      wastePieces,
      saveToDb = true,
    }: {
      sheetId: number;
      dia: number;
      wastePieces?: WastePiece[]; // Provided by client if they chose to reuse
      saveToDb?: boolean;
    } = body;

    if (!sheetId || dia === undefined) {
      return NextResponse.json(
        { error: "Missing required fields: sheetId, dia" },
        { status: 400 }
      );
    }

    // 1. Fetch Sheet Data
    const sheet = await prisma.sheet.findUnique({
      where: { id: sheetId },
      select: { projectId: true },
    });

    if (!sheet) {
      return NextResponse.json({ error: "Sheet not found" }, { status: 404 });
    }

    // Fetch raw Excel data from Mongo
    const db = await getMongoDb();
    const excelCollection = db.collection("excel_data");
    const excelRecord = await excelCollection.findOne({ sheetId: sheetId });

    if (!excelRecord || !excelRecord.data) {
      return NextResponse.json(
        { error: "No Excel data found for this sheet" },
        { status: 404 }
      );
    }

    // 2. Preprocess Data
    const sanitizedData = sanitizeExcelData(excelRecord.data);
    
    // Filter by diameter
    const displayData = sanitizedData.filter((row: any) => String(row.Dia) === String(dia));

    if (displayData.length === 0) {
       return NextResponse.json({ 
           success: true, 
           results: { greedy: null, dynamic: null },
           message: "No rows found for this diameter"
       });
    }

    const preprocessor = new CuttingStockPreprocessor();
    const request = preprocessor.convertToCuttingRequests(displayData);

    // 3. Run Algorithms
    
    // Greedy
    const greedyAlgo = new GreedyCuttingStock();
    // Assuming Greedy supports wastePieces in solve() or has a wrapper. 
    // Checking previous steps, the client called runBoth which called different workers.
    // The serverAlgorithmManager called /algorithms/greedy/route.ts which instantiated GreedyCuttingStock.
    // I am effectively replacing /algorithms/greedy/route.ts here.
    const greedyResult = greedyAlgo.solve(request, dia, wastePieces);

    // Dynamic
    // For large datasets, TrueDynamic switches to Column Generation internally.
    const dynamicAlgo = new TrueDynamicCuttingStock();
    const dynamicResult = dynamicAlgo.solve(request, dia); // Does not ignore waste, just doesn't use it.

    // 4. Compare Results
    let bestResult: CuttingStockResult | null = null;
    let bestAlgorithm: string = "";

    const greedyValid = greedyResult && greedyResult.totalBarsUsed > 0;
    const dynamicValid = dynamicResult && dynamicResult.totalBarsUsed > 0;

    if (greedyValid && dynamicValid) {
      // Prioritize FEWER NEW BARS
      // Note: totalBarsUsed in Greedy accounts for Used Waste + New Bars? 
      // Usually totalBarsUsed = All Inputs.
      // We want to minimize NEW bars.
      
      const greedyNew = greedyResult.summary.newBarsUsed ?? greedyResult.totalBarsUsed;
      const dynamicNew = dynamicResult.summary.newBarsUsed ?? dynamicResult.totalBarsUsed;

      if (greedyNew < dynamicNew) {
        bestResult = greedyResult;
        bestAlgorithm = "greedy";
      } else if (dynamicNew < greedyNew) {
        bestResult = dynamicResult;
        bestAlgorithm = "dynamic";
      } else {
        // Tie-break: Total Bars (if waste reuse made a difference)
        if (greedyResult.totalBarsUsed < dynamicResult.totalBarsUsed) {
            bestResult = greedyResult;
            bestAlgorithm = "greedy";
        } else if (dynamicResult.totalBarsUsed < greedyResult.totalBarsUsed) {
            bestResult = dynamicResult;
            bestAlgorithm = "dynamic";
        } else {
            // Tie-break: Waste
            if (greedyResult.totalWaste <= dynamicResult.totalWaste) {
                bestResult = greedyResult;
                bestAlgorithm = "greedy";
            } else {
                bestResult = dynamicResult;
                bestAlgorithm = "dynamic";
            }
        }
      }
    } else if (greedyValid) {
      bestResult = greedyResult;
      bestAlgorithm = "greedy";
    } else if (dynamicValid) {
      bestResult = dynamicResult;
      bestAlgorithm = "dynamic";
    }

    if (!bestResult) {
        return NextResponse.json({ error: "Algorithms failed to produce a valid result" }, { status: 500 });
    }

    console.log(`[Calculate] Winner: ${bestAlgorithm} (${bestResult.totalBarsUsed} bars)`);

    // 5. Handling Saving and Waste
    let pgResultId = undefined;
    
    if (saveToDb) {
        // --- SAVE TO DB LOGIC ---
        // (Similar to previous implementation steps)
        
        // A. Delete Existing Results
        const existingResult = await prisma.calculationResult.findUnique({
            where: { sheetId_dia: { sheetId, dia } }
        });

        if (existingResult) {
            await prisma.calculationResult.delete({ where: { id: existingResult.id } });
            if (existingResult.mongoResultId) {
                 const resultsCollection = db.collection("calculation_results");
                 await resultsCollection.deleteOne({ _id: new ObjectId(existingResult.mongoResultId) });
            }

            // Cleanup Waste Produced by Old Result
            const wasteProduced = await prisma.wasteInventory.findMany({
                where: { sourceSheetId: sheetId, dia: dia },
                select: { id: true }
            });
            const wasteIds = wasteProduced.map(w => w.id);
            if (wasteIds.length > 0) {
                await prisma.wasteUsage.deleteMany({ where: { wasteId: { in: wasteIds } } });
                await prisma.wasteInventory.deleteMany({ where: { id: { in: wasteIds } } });
            }

            // Revert Waste Used by Old Result (if any)
            const inwardUsages = await prisma.wasteUsage.findMany({
                where: { usedInSheetId: sheetId, waste: { dia: dia } },
                select: { wasteId: true }
            });
            
            if (inwardUsages.length > 0) {
                await prisma.wasteInventory.updateMany({
                    where: { id: { in: inwardUsages.map(u => u.wasteId) } },
                    data: { status: "available" }
                });
                await prisma.wasteUsage.deleteMany({
                    where: { usedInSheetId: sheetId, waste: { dia: dia } }
                });
            }
        }
    
        // B. Save New Result
        const resultsCollection = db.collection("calculation_results");
        const mongoResult = await resultsCollection.insertOne({
          projectId: sheet.projectId,
          sheetId,
          algorithm: bestAlgorithm,
          dia,
          patterns: bestResult.patterns,
          detailedCuts: bestResult.detailedCuts,
          summary: bestResult.summary,
          createdAt: new Date(),
        });
    
        const wastePiecesReused = bestResult.detailedCuts?.filter(c => c.isFromWaste).length || 0;
        
        const pgResult = await prisma.calculationResult.create({
          data: {
            sheetId,
            algorithm: bestAlgorithm,
            dia,
            totalBarsUsed: bestResult.totalBarsUsed,
            wastePiecesReused: wastePiecesReused,
            totalWaste: bestResult.totalWaste,
            averageUtilization: bestResult.averageUtilization,
            executionTime: bestResult.executionTime,
            mongoResultId: mongoResult.insertedId.toString(),
          },
        });
        pgResultId = pgResult.id;
    
        // C. Create New Waste (Output)
        const wasteToCreate = [];
        if (bestResult.detailedCuts) {
            for (const cut of bestResult.detailedCuts) {
                 const isFromWaste = cut.isFromWaste || (cut.patternId && cut.patternId.startsWith("waste_"));
                 if (!isFromWaste) {
                     const wasteLength = Math.round(cut.waste * 1000); 
                     if (wasteLength >= WASTE_MIN_LENGTH_MM) {
                         wasteToCreate.push({
                             dia: dia,
                             length: wasteLength,
                             sourceBarNumber: cut.barNumber,
                             sourcePatternId: cut.patternId,
                             cutsOnSourceBar: cut.cuts?.map((c: any) => ({
                                 barCode: c.barCode,
                                 length: Math.round(c.length * 1000),
                                 element: ""
                             })) || []
                         });
                     }
                 }
            }
        }
    
        if (wasteToCreate.length > 0) {
            const wasteOriginsCollection = db.collection("waste_origins");
            for (const item of wasteToCreate) {
                 const originResult = await wasteOriginsCollection.insertOne({
                    projectId: sheet.projectId,
                    sheetId,
                    sourceBarNumber: item.sourceBarNumber,
                    sourcePatternId: item.sourcePatternId,
                    cutsOnSourceBar: item.cutsOnSourceBar,
                    createdAt: new Date(),
                 });
    
                 await prisma.wasteInventory.create({
                     data: {
                         projectId: sheet.projectId,
                         sourceSheetId: sheetId,
                         dia: item.dia,
                         length: item.length,
                         sourceBarNumber: item.sourceBarNumber, // barNumber
                         sourcePatternId: item.sourcePatternId || "",
                         mongoCutsOriginId: originResult.insertedId.toString(),
                         status: "available"
                     }
                 });
            }
        }
    
        // D. Mark Used Waste (Input)
        // Only if wastePieces provided
        if (wastePieces && wastePieces.length > 0) {
            const actuallyUsedWasteIds = new Set<string>();
            bestResult.detailedCuts?.forEach(cut => {
                 if (cut.isFromWaste && cut.wasteSource?.wasteId) {
                     actuallyUsedWasteIds.add(cut.wasteSource.wasteId);
                 }
            });

            if (actuallyUsedWasteIds.size > 0) {
                 for (const wasteIdStr of actuallyUsedWasteIds) {
                     const wasteId = parseInt(wasteIdStr);
                     const cutDetail = bestResult.detailedCuts?.find(c => 
                        c.isFromWaste && c.wasteSource?.wasteId === wasteIdStr
                     );
                     
                     if (cutDetail) {
                         await prisma.wasteInventory.update({
                             where: { id: wasteId },
                             data: { status: "used" }
                         });

                         await prisma.wasteUsage.create({
                             data: {
                                 wasteId: wasteId,
                                 usedInSheetId: sheetId,
                                 usedForBarCode: "multiple", 
                                 cutLength: Math.round((cutDetail.wasteSource?.originalLength || 0)),
                                 remainingLength: 0,
                                 remainingStatus: "discarded"
                             }
                         });
                     }
                 }
            }
        }
    
        await prisma.sheet.update({
            where: { id: sheetId },
            data: { status: "calculated" }
        });

    } else {
        // --- PATCH FOR PREVIEW (Net Waste) ---
        // If !saveToDb (e.g. Export), we want to show if the *simulated* waste matches *real* used waste.
        // Heuristic: Match by SheetId + Dia + BarNumber.
        
        // Fetch existing waste for this sheet/dia
        const existingWaste = await prisma.wasteInventory.findMany({
            where: { sourceSheetId: sheetId, dia: dia },
            include: { usages: { include: { usedInSheet: true } } }
        });
        
        const wasteMap = new Map();
        existingWaste.forEach(w => wasteMap.set(w.sourceBarNumber, w));
        
        // Patch Greedy
        if (greedyResult && greedyResult.detailedCuts) {
            patchRecovery(greedyResult.detailedCuts, wasteMap, sheetId);
        }
        // Patch Dynamic
        if (dynamicResult && dynamicResult.detailedCuts) {
            patchRecovery(dynamicResult.detailedCuts, wasteMap, sheetId);
        }
    }

    return NextResponse.json({
        success: true,
        resultId: pgResultId,
        algorithm: bestAlgorithm,
        results: {
            greedy: greedyResult,
            dynamic: dynamicResult
        }
    });

  } catch (err: unknown) {
    console.error("[Calculate] Error:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Error" }, { status: 500 });
  }
}

function patchRecovery(cuts: DetailedCut[], wasteMap: Map<number, any>, currentSheetId: number) {
    let totalRecoveredLength = 0;
    cuts.forEach(cut => {
        const waste = wasteMap.get(cut.barNumber);
        if (waste && waste.status === 'used' && waste.usages.length > 0) {
            const usage = waste.usages[0];
            const isSelfUsage = usage.usedInSheetId === currentSheetId;
            
            if (!isSelfUsage) {
                const recoverAmount = waste.length / 1000;
                cut.isWasteRecovered = true;
                cut.recoveredAmount = recoverAmount;
                cut.recoveredWasteInfo = {
                    usedInSheet: usage.usedInSheet?.fileName || `Sheet #${usage.usedInSheetId}`,
                    wasteId: waste.id.toString()
                };
                cut.originalWaste = cut.waste;
                cut.waste = Math.max(0, cut.waste - recoverAmount);
                totalRecoveredLength += recoverAmount;
            }
        }
    });
    return totalRecoveredLength;
}
