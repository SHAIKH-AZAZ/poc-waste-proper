/**
 * CLI Bar Cutting Algorithm Runner
 * 
 * Usage:
 *   npm run cli:run -- input.json output.json --algorithm greedy
 */

import * as fs from 'fs';
import * as path from 'path';
import type { BarCuttingDisplay } from './types/BarCuttingRow';
import type { CuttingStockResult } from './types/CuttingStock';
import { CuttingStockPreprocessor } from './utils/cuttingStockPreprocessor';
import { GreedyCuttingStock } from './algorithms/greedyCuttingStock';
import { ImprovedGreedyCuttingStock } from './algorithms/improvedGreedyCuttingStock';
import { TrueDynamicCuttingStock } from './algorithms/trueDynamicCuttingStock';
import { BranchAndBoundCuttingStock } from './algorithms/branchAndBoundCuttingStock';
import { WasteOptimizedCuttingStock } from './algorithms/wasteOptimizedCuttingStock';
import { AdaptiveCuttingStock } from './algorithms/adaptiveCuttingStock';
import { ChunkedOptimization } from './algorithms/chunkedOptimization';
import { SwapOptimization } from './algorithms/swapOptimization';
import { BoundedKnapsackCuttingStock } from './algorithms/boundedKnapsackCuttingStock';

type AlgorithmKey =
  | 'adaptive'
  | 'greedy'
  | 'dynamic'
  | 'bounded-knapsack'
  | 'improved-greedy'
  | 'chunked'
  | 'swap'
  | 'true-dynamic'
  | 'branch-and-bound'
  | 'waste-optimized';

type SolverResult = CuttingStockResult | CuttingStockResult[] | Promise<CuttingStockResult | CuttingStockResult[]>;

interface Solver {
  solve(requests: ReturnType<CuttingStockPreprocessor["convertToCuttingRequests"]>, dia: number): SolverResult;
}

const ALGORITHMS: Record<AlgorithmKey, () => Solver> = {
  adaptive: () => new AdaptiveCuttingStock() as Solver,
  greedy: () => new GreedyCuttingStock() as Solver,
  dynamic: () => new SwapOptimization() as Solver,
  'bounded-knapsack': () => new BoundedKnapsackCuttingStock() as Solver,
  'improved-greedy': () => new ImprovedGreedyCuttingStock() as Solver,
  chunked: () => new ChunkedOptimization() as Solver,
  swap: () => new SwapOptimization() as Solver,
  'true-dynamic': () => new TrueDynamicCuttingStock() as Solver,
  'branch-and-bound': () => new BranchAndBoundCuttingStock() as Solver,
  'waste-optimized': () => new WasteOptimizedCuttingStock() as Solver,
};

const SUPPORTED_ALGORITHMS = Object.keys(ALGORITHMS) as AlgorithmKey[];

// ─── Parse CLI args ───────────────────────────────────────────
const args = process.argv.slice(2);
const positional: string[] = [];
let requestedAlgorithm = 'greedy';

for (let i = 0; i < args.length; i++) {
  const arg = args[i];

  if (arg === '--algorithm' || arg === '-a') {
    const value = args[i + 1];
    if (!value) {
      console.error('✗ Missing value for --algorithm');
      process.exit(1);
    }
    requestedAlgorithm = value;
    i++;
    continue;
  }

  if (arg.startsWith('--algorithm=')) {
    requestedAlgorithm = arg.slice('--algorithm='.length);
    continue;
  }

  positional.push(arg);
}

const inputFile = positional[0];
const jsonOutputFile = positional[1] || null;

if (!inputFile) {
  console.error(`
╔══════════════════════════════════════════════════╗
║   Bar Cutting Algorithm — CLI Runner             ║
╠══════════════════════════════════════════════════╣
║                                                  ║
║  Usage:                                          ║
║    npm run cli:run -- input.json output.json     ║
║    npm run cli:run -- input.json -a swap         ║
║    npm run cli:run -- input.json --algorithm dp  ║
║                                                  ║
║  Input JSON format: array of objects with:       ║
║    BarCode, Dia, Total Bars, Cutting Length,     ║
║    Lap Length, Element                           ║
║                                                  ║
║  Algorithms:                                     ║
║    ${SUPPORTED_ALGORITHMS.join(', ')}
║                                                  ║
║  Generate sample data:                           ║
║    npm run cli:generate -- -o data.json          ║
║                                                  ║
╚══════════════════════════════════════════════════╝
`);
  process.exit(1);
}

if (requestedAlgorithm === 'dp') {
  requestedAlgorithm = 'true-dynamic';
}

if (!SUPPORTED_ALGORITHMS.includes(requestedAlgorithm as AlgorithmKey)) {
  console.error(`✗ Unknown algorithm: ${requestedAlgorithm}`);
  console.error(`  Supported algorithms: ${SUPPORTED_ALGORITHMS.join(', ')}`);
  process.exit(1);
}

const algorithmKey = requestedAlgorithm as AlgorithmKey;

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
console.log('║          Bar Cutting Stock Optimizer             ║');
console.log('╚══════════════════════════════════════════════════╝');
console.log('');
console.log(`  Input file : ${path.basename(resolvedPath)}`);
console.log(`  Algorithm  : ${algorithmKey}`);
console.log(`  Total rows : ${displayData.length}`);
console.log(`  Diameters  : ${dias.map(d => `${d}mm`).join(', ')}`);
console.log('');

// ─── Solve per diameter ───────────────────────────────────────
const solver = ALGORITHMS[algorithmKey]();
const allResults: CuttingStockResult[] = [];

let grandTotalBars = 0;
let grandTotalWaste = 0;
let grandTotalUsed = 0;

async function solveAllDias() {
  for (const dia of dias) {
    const diaRequests = requests.filter(r => r.dia === dia);
    const rawResults = await solver.solve(diaRequests, dia);
    const results = Array.isArray(rawResults) ? rawResults : [rawResults];

    for (const result of results) {
      allResults.push(result);
      const totalUsed = result.patterns.reduce((sum, p) => {
        const barLen = p.standardBarLength || 12;
        return sum + barLen;
      }, 0);

      grandTotalBars += result.totalBarsUsed;
      grandTotalWaste += result.totalWaste;
      grandTotalUsed += totalUsed;

      console.log(`  ┌─ Dia ${dia}mm / ${result.algorithm} ${'─'.repeat(Math.max(1, 35 - result.algorithm.length))}┐`);
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
}

solveAllDias().catch((error) => {
  console.error('✗ CLI run failed');
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
