import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import { GreedyCuttingStock } from '../src/algorithms/greedyCuttingStock';
import { CuttingStockPreprocessor } from '../src/utils/cuttingStockPreprocessor';

// Basic CLI logger
const logInfo = (msg: string) => console.log(`[INFO] ${msg}`);
const logError = (msg: string) => console.error(`[ERROR] ${msg}`);

async function main() {
    const args = process.argv.slice(2);
    
    if (args.length < 1 || args.includes('--help') || args.includes('-h')) {
        console.log(`
Usage:
  npx tsx cli/index.ts <path-to-input.json> [output.json]

Example:
  npx tsx cli/index.ts input.json result.json

The input JSON should be an array of objects containing (DisplayData format):
  - BarCode: string
  - Dia: number
  - "Total Bars": number
  - "Cutting Length": number
  - "Lap Length": number
  - Element: string
        `);
        process.exit(0);
    }

    const inputPath = resolve(process.cwd(), args[0]);
    const outputPath = args[1] ? resolve(process.cwd(), args[1]) : undefined;

    logInfo(`Reading input from: ${inputPath}`);
    let rawData;
    try {
        const fileContent = readFileSync(inputPath, 'utf8');
        rawData = JSON.parse(fileContent);
    } catch (error: any) {
        logError(`Failed to read or parse input JSON: ${error.message}`);
        process.exit(1);
    }

    if (!Array.isArray(rawData)) {
        logError("Input JSON must be an array of objects.");
        process.exit(1);
    }

    logInfo(`Loaded ${rawData.length} rows of data. Preprocessing...`);
    
    try {
        const preprocessor = new CuttingStockPreprocessor();
        
        // Group by diameter first
        const groupedByDia = rawData.reduce((acc: any, row: any) => {
            // Note: Use 'Dia' for diameter as per type BarCuttingRow in the application
            const dia = row.Dia;
            if (!acc[dia]) acc[dia] = [];
            acc[dia].push(row);
            return acc;
        }, {});

        const results: Record<string, any> = {};
        const optimizer = new GreedyCuttingStock();
        
        // Import XLSX dynamically to avoid missing dependency crashing script outright if unavailable
        const XLSX = require('xlsx');
        const workbook = XLSX.utils.book_new();
        
        for (const diaStr in groupedByDia) {
            const dia = parseInt(diaStr, 10);
            logInfo(`Processing Diameter: ${dia} (${groupedByDia[diaStr].length} items)`);
            
            // Generate Requests
            const requests = preprocessor.convertToCuttingRequests(groupedByDia[diaStr]);
            logInfo(`  -> Converted to ${requests.length} cutting requests`);
            
            // Run algorithm with requests and current dia
            const result = optimizer.solve(requests, dia);
            results[diaStr] = result;
            
            logInfo(`  -> [DIA ${dia}] Total Bars Used: ${result.totalBarsUsed}`);
            logInfo(`  -> [DIA ${dia}] Total Waste: ${result.totalWaste}m`);
            logInfo(`  -> [DIA ${dia}] Utilization: ${result.averageUtilization}%`);
            logInfo(`  -> [DIA ${dia}] Patterns Computed: ${result.patterns.length}`);
            logInfo(`  -> [DIA ${dia}] Execution Time: ${result.executionTime}ms`);

            // Excel Sheet construction for this dia
            const headers = [
              "Bar #", "Bar Length (m)", "BarCode", "Format Cut (m)", "Lap Length (m)", "Waste (m)", "Utilization (%)"
            ];
            const sheetData: (string | number)[][] = [headers];

            for (const detail of result.detailedCuts) {
                // Group cuts
                const cutGroups = new Map<string, any>();
                for (const cut of detail.cuts) {
                    const existing = cutGroups.get(cut.barCode);
                    if (existing) {
                        existing.count += cut.quantity || 1;
                    } else {
                        cutGroups.set(cut.barCode, { ...cut, count: cut.quantity || 1 });
                    }
                }
                
                const uniqueCuts = Array.from(cutGroups.values());
                const barLength = detail.wasteSource ? (detail.wasteSource.originalLength / 1000) : 12.0;

                uniqueCuts.forEach((c, index) => {
                    const row: (string | number)[] = [];
                    // Bar details only on first line
                    if (index === 0) {
                        row.push(detail.barNumber);
                        row.push(barLength);
                    } else {
                        row.push("");
                        row.push("");
                    }
                    
                    row.push(c.barCode);
                    row.push(c.length - (c.lapLength || 0)); // Effective Length
                    row.push(c.lapLength || 0);

                    if (index === 0) {
                        row.push(detail.waste);
                        row.push(detail.utilization);
                    } else {
                        row.push("");
                        row.push("");
                    }
                    sheetData.push(row);
                });
            }
            
            const worksheet = XLSX.utils.aoa_to_sheet(sheetData);
            worksheet["!cols"] = [ { wch: 8 }, { wch: 14 }, { wch: 20 }, { wch: 18 }, { wch: 15 }, { wch: 12 }, { wch: 15 } ];
            XLSX.utils.book_append_sheet(workbook, worksheet, `Dia ${dia}`);
        }

        if (outputPath) {
            logInfo(`Writing output to: ${outputPath}`);
            
            // Excel Export
            const excelPath = outputPath.replace('.json', '.xlsx');
            XLSX.writeFile(workbook, excelPath);
            logInfo(`Saved XLSX to: ${excelPath}`);

            // JSON Export
            // Write to a temporary file first (atomic write)
            const tmpPath = `${outputPath}.tmp`;
            writeFileSync(tmpPath, JSON.stringify(results, null, 2), 'utf8');
            
            // Rename to final path
            import('fs').then(fs => {
                fs.renameSync(tmpPath, outputPath);
                
                // Create a .done flag file so other programs know it finished
                const donePath = `${outputPath}.done`;
                writeFileSync(donePath, new Date().toISOString(), 'utf8');
                logInfo(`Created completion flag: ${donePath}`);
                logInfo("Success!");
            });
        } else {
            console.log(JSON.stringify(results, null, 2));
        }

    } catch (error: any) {
        logError(`Processing failed: ${error.message}`);
        if(error.stack) console.error(error.stack);
        process.exit(1);
    }
}

main();
