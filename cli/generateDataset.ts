/**
 * Dataset Generator for Bar Cutting Algorithm
 * 
 * Usage:
 *   npx tsx cli/generateDataset.ts                     → prints to stdout
 *   npx tsx cli/generateDataset.ts -o dataset.json     → saves to file
 *   npx tsx cli/generateDataset.ts -n 50 -o data.json  → 50 entries
 *   npx tsx cli/generateDataset.ts --seed 42           → reproducible
 */

import * as fs from 'fs';
import * as path from 'path';

// ─── Parse CLI args ───────────────────────────────────────────
const args = process.argv.slice(2);

function getArg(flag: string, short?: string): string | undefined {
  const idx = args.indexOf(flag);
  const shortIdx = short ? args.indexOf(short) : -1;
  const foundIdx = idx !== -1 ? idx : shortIdx;
  return foundIdx !== -1 ? args[foundIdx + 1] : undefined;
}

const count = parseInt(getArg('-n', '--count') || '20', 10);
const outputFile = getArg('-o', '--output');
const seed = parseInt(getArg('--seed') || String(Date.now()), 10);

// ─── Seeded random ────────────────────────────────────────────
// Simple mulberry32 PRNG for reproducibility
function mulberry32(a: number) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

const random = mulberry32(seed);

function randInt(min: number, max: number): number {
  return Math.floor(random() * (max - min + 1)) + min;
}

function randFloat(min: number, max: number, decimals = 3): number {
  return parseFloat((random() * (max - min) + min).toFixed(decimals));
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(random() * arr.length)];
}

// ─── Configuration ────────────────────────────────────────────
const DIAS = [8, 10, 12, 16, 20, 25];

const ELEMENTS = [
  'Beam', 'Column', 'Slab', 'Footing', 'Staircase',
  'Lintel', 'Retaining Wall', 'Pile Cap', 'Raft', 'Shear Wall',
];

// Standard lap lengths by diameter (in meters) — IS 456 approximation
const LAP_LENGTHS: Record<number, number> = {
  8: 0.380,
  10: 0.475,
  12: 0.570,
  16: 0.760,
  20: 0.950,
  25: 1.250,
};

// ─── Generate dataset ─────────────────────────────────────────
interface DatasetRow {
  BarCode: string;
  Dia: number;
  'Total Bars': number;
  'Cutting Length': number;
  'Lap Length': number;
  Element: string;
}

const dataset: DatasetRow[] = [];

for (let i = 1; i <= count; i++) {
  const dia = pick(DIAS);
  const element = pick(ELEMENTS);
  const quantity = randInt(2, 30);

  // 85% chance: single bar (≤12m), 15% chance: multi-bar (>12m)
  const isMultiBar = random() < 0.15;
  const cuttingLength = isMultiBar
    ? randFloat(12.5, 24.0)
    : randFloat(1.0, 11.8);

  const lapLength = isMultiBar ? LAP_LENGTHS[dia] : 0;
  const label = `B${randInt(1, 99)}`;
  const barCode = `${i}/${label}/${dia}`;

  dataset.push({
    BarCode: barCode,
    Dia: dia,
    'Total Bars': quantity,
    'Cutting Length': cuttingLength,
    'Lap Length': lapLength,
    Element: element,
  });
}

// ─── Output ───────────────────────────────────────────────────
const json = JSON.stringify(dataset, null, 2);

if (outputFile) {
  const outPath = path.resolve(outputFile);
  fs.writeFileSync(outPath, json);
  console.log(`✓ Generated ${count} entries → ${outPath}`);
  console.log(`  Seed: ${seed}`);
} else {
  console.log(json);
}
