/**
 * CLI Bar Cutting Algorithm Runner
 * 
 * Usage:
 *   bun run cli/run.ts input.json output.json
 */

import * as fs from 'fs';
import * as path from 'path';
import type { BarCuttingDisplay } from './types/BarCuttingRow';
import type { CuttingStockResult } from './types/CuttingStock';
import { CuttingStockPreprocessor } from './utils/cuttingStockPreprocessor';
import { GreedyCuttingStock } from './algorithms/greedyCuttingStock';

// ─── Parse CLI args ───────────────────────────────────────────
const args = process.argv.slice(2);
const inputFile = args[0];
const jsonOutputFile = args[1] || null;

if (!inputFile) {
  console.error(`
╔══════════════════════════════════════════════════╗
║   Bar Cutting Algorithm — CLI Runner             ║
╠══════════════════════════════════════════════════╣
║                                                  ║
║  Usage:                                          ║
║    bun run cli/run.ts input.json output.json     ║
║                                                  ║
║  Input JSON format: array of objects with:       ║
║    BarCode, Dia, Total Bars, Cutting Length,     ║
║    Lap Length, Element                           ║
║                                                  ║
║  Generate sample data:                           ║
║    bun run cli/generateDataset.ts -o data.json   ║
║                                                  ║
╚══════════════════════════════════════════════════╝
`);
  process.exit(1);
}

// ─── Load input data ──────────────────────────────────────────
const resolvedPath = path.resolve(inputFile);
if (!fs.existsSync(resolvedPath)) {
  console.error(`✗ File not found: ${resolvedPath}`);
  process.exit(1);
}

const raw = fs.readFileSync(resolvedPath, 'utf-8');
let displayData: BarCuttingDisplay[];
try {
  displayData = JSON.parse(raw);
} catch {
  console.error('✗ Invalid JSON file');
  process.exit(1);
}

if (!Array.isArray(displayData) || displayData.length === 0) {
  console.error('✗ Input must be a non-empty JSON array');
  process.exit(1);
}

// ─── Preprocess ───────────────────────────────────────────────
const preprocessor = new CuttingStockPreprocessor();
const requests = preprocessor.convertToCuttingRequests(displayData);

// Get unique diameters
const dias = [...new Set(requests.map(r => r.dia))].sort((a, b) => a - b);

console.log('');
console.log('╔══════════════════════════════════════════════════╗');
console.log('║        Bar Cutting Stock Optimizer (Greedy)      ║');
console.log('╚══════════════════════════════════════════════════╝');
console.log('');
console.log(`  Input file : ${path.basename(resolvedPath)}`);
console.log(`  Total rows : ${displayData.length}`);
console.log(`  Diameters  : ${dias.map(d => `${d}mm`).join(', ')}`);
console.log('');

// ─── Solve per diameter ───────────────────────────────────────
const solver = new GreedyCuttingStock();
const allResults: CuttingStockResult[] = [];

let grandTotalBars = 0;
let grandTotalWaste = 0;
let grandTotalUsed = 0;

for (const dia of dias) {
  const diaRequests = requests.filter(r => r.dia === dia);
  const result = solver.solve(diaRequests, dia);
  allResults.push(result);

  const totalUsed = result.patterns.reduce((sum, p) => {
    const barLen = p.standardBarLength || 12;
    return sum + barLen;
  }, 0);

  grandTotalBars += result.totalBarsUsed;
  grandTotalWaste += result.totalWaste;
  grandTotalUsed += totalUsed;

  console.log(`  ┌─ Dia ${dia}mm ${'─'.repeat(38)}┐`);
  console.log(`  │  Bars used       : ${result.totalBarsUsed.toString().padStart(6)}`);
  console.log(`  │  Total waste     : ${result.totalWaste.toFixed(3).padStart(6)}m`);
  console.log(`  │  Utilization     : ${result.averageUtilization.toFixed(1).padStart(6)}%`);
  console.log(`  │  Patterns        : ${result.patterns.length.toString().padStart(6)}`);
  console.log(`  │  Execution time  : ${result.executionTime.toString().padStart(6)}ms`);

  // Show first 5 cutting patterns
  if (result.detailedCuts.length > 0) {
    console.log(`  │`);
    console.log(`  │  Cutting Instructions (first 5 bars):`);
    const cutsToShow = result.detailedCuts.slice(0, 5);
    for (const cut of cutsToShow) {
      const cutDescs = cut.cuts
        .map(c => `${c.barCode}@${c.length.toFixed(2)}m`)
        .join(' + ');
      console.log(`  │    Bar #${cut.barNumber}: [${cutDescs}] waste=${cut.waste.toFixed(3)}m`);
    }
    if (result.detailedCuts.length > 5) {
      console.log(`  │    ... and ${result.detailedCuts.length - 5} more bars`);
    }
  }
  console.log(`  └${'─'.repeat(48)}┘`);
  console.log('');
}

// ─── Grand totals ─────────────────────────────────────────────
const grandUtilization = grandTotalBars > 0
  ? ((grandTotalUsed - grandTotalWaste) / grandTotalUsed * 100)
  : 0;

console.log('  ═══════════════════════════════════════════════');
console.log(`    TOTAL BARS  : ${grandTotalBars}`);
console.log(`    TOTAL WASTE : ${grandTotalWaste.toFixed(3)}m`);
console.log(`    AVG UTIL    : ${grandUtilization.toFixed(1)}%`);
console.log('  ═══════════════════════════════════════════════');
console.log('');

// ─── JSON output ──────────────────────────────────────────────
if (jsonOutputFile) {
  const outPath = path.resolve(jsonOutputFile);
  fs.writeFileSync(outPath, JSON.stringify(allResults, null, 2));
  console.log(`  ✓ Results saved to ${outPath}`);
  console.log('');
}
