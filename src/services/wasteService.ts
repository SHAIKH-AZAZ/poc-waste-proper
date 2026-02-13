import { prisma } from "@/lib/prisma";
import { getMongoDb } from "@/lib/mongodb";
import { WASTE_MIN_LENGTH_MM } from "@/constants/config";

export class WasteService {
    /**
     * Process waste items: save valid items to MongoDB (origins) and PostgreSQL (inventory)
     */
    static async processWasteItems(
        wasteItems: any[],
        sheetId: number,
        projectId: number
    ) {
        if (!wasteItems || wasteItems.length === 0) return;

        const db = await getMongoDb();
        const wasteOriginsCollection = db.collection("waste_origins");

        const validWasteItems = wasteItems.filter(
            (item) => item.length >= WASTE_MIN_LENGTH_MM
        );

        if (validWasteItems.length > 0) {
            console.log(
                `[WasteService] Saving ${validWasteItems.length} valid waste items (>= ${WASTE_MIN_LENGTH_MM}mm)`
            );

            // 1. Batch insert into MongoDB (Origins)
            const mongoDocs = validWasteItems.map((item) => ({
                projectId,
                sheetId,
                sourceBarNumber: item.sourceBarNumber,
                sourcePatternId: item.sourcePatternId,
                cutsOnSourceBar: item.cutsOnSourceBar,
                createdAt: new Date(),
            }));

            const mongoRes = await wasteOriginsCollection.insertMany(mongoDocs);
            const insertedIds = mongoRes.insertedIds;

            // 2. Batch insert into PostgreSQL (Inventory)
            const pgData = validWasteItems.map((item, index) => ({
                projectId,
                sourceSheetId: sheetId,
                dia: item.dia,
                length: item.length,
                sourceBarNumber: item.sourceBarNumber,
                sourcePatternId: item.sourcePatternId,
                mongoCutsOriginId: insertedIds[index].toString(),
                status: "available",
            }));

            await prisma.wasteInventory.createMany({
                data: pgData,
            });

            console.log(
                `[WasteService] Successfully batch saved ${validWasteItems.length} waste items`
            );
        } else {
            console.log(`[WasteService] No waste items met the minimum length criteria`);
        }
    }

    /**
     * Deep cleanup of waste inventory and usage records
     */
    static async cleanupWaste(sheetId: number, dia?: number) {
        // 1. Find all waste items produced by THIS sheet and diameter
        const wasteFromThisSheet = await prisma.wasteInventory.findMany({
            where: {
                sourceSheetId: sheetId,
                dia: dia ? dia : undefined,
            },
            select: { id: true, status: true },
        });

        const wasteIds = wasteFromThisSheet.map((w) => w.id);

        if (wasteIds.length > 0) {
            // 2. Find any usage records WHERE this waste was used (could be in THIS or OTHER sheets)
            // Delete usage records where waste from THIS sheet was used
            const deletedUsages = await prisma.wasteUsage.deleteMany({
                where: {
                    wasteId: { in: wasteIds },
                },
            });
            console.log(
                `[WasteService] Deleted ${deletedUsages.count} usage records for waste produced by this sheet`
            );

            // 3. Delete the waste inventory records themselves
            const deletedWasteCount = await prisma.wasteInventory.deleteMany({
                where: {
                    id: { in: wasteIds },
                },
            });
            console.log(
                `[WasteService] Deleted ${deletedWasteCount.count} waste inventory records produced by sheet ${sheetId}`
            );
        }

        // 4. Clean up usage records where OTHER waste was used IN THIS SHEET
        // This removes the "self-reuse" indicator from the UI for the current sheet

        // FIRST: Find those inward usages so we know which waste pieces to revert
        const inwardUsages = await prisma.wasteUsage.findMany({
            where: {
                usedInSheetId: sheetId,
                waste: {
                    dia: dia ? dia : undefined,
                },
            },
            select: { wasteId: true },
        });

        if (inwardUsages.length > 0) {
            // SECOND: Mark the original waste pieces back as 'available'
            await prisma.wasteInventory.updateMany({
                where: {
                    id: { in: inwardUsages.map((u) => u.wasteId) },
                },
                data: {
                    status: "available",
                },
            });
            console.log(
                `[WasteService] Reverted ${inwardUsages.length} waste pieces back to 'available' status`
            );

            // THIRD: Delete the inward usage records
            const deletedInwardUsages = await prisma.wasteUsage.deleteMany({
                where: {
                    usedInSheetId: sheetId,
                    waste: {
                        dia: dia ? dia : undefined,
                    },
                },
            });
            console.log(
                `[WasteService] Deleted ${deletedInwardUsages.count} inward usage records`
            );
        }
    }
}
