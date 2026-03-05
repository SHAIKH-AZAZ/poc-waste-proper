import { writeFileSync } from 'fs';
import { resolve } from 'path';

const elements = ["Beam", "Column", "Slab", "Footing", "Retaining Wall"];
const diameters = [8, 10, 12, 16, 20, 25, 32];

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomElement<T>(arr: T[]): T {
  return arr[randomInt(0, arr.length - 1)];
}

function generateDataset(numItems: number) {
  const data = [];
  
  for (let i = 1; i <= numItems; i++) {
    const dia = randomElement(diameters);
    const element = randomElement(elements);
    
    // Cutting length between 1m and 15m (allow multi-bar)
    // Add some precision (e.g., 2 decimal places)
    const cuttingLength = Math.round((Math.random() * 14 + 1) * 10) / 10;
    
    // Lap length only if cutting length typically requires it, or just randomly assigning valid laps
    let lapLength = 0;
    if (cuttingLength > 12 || Math.random() > 0.8) {
       lapLength = Math.round(dia * 0.05 * 10) / 10; // Simple typical lap calculation approx
    }

    const qty = randomInt(1, 10);
    const totalBars = randomInt(1, 20); // The preprocessor typically uses Total Bars

    data.push({
      BarCode: `B${i}/${randomInt(1, 5)}`,
      Dia: dia,
      Qty: qty,
      "Total Bars": totalBars,
      "Cutting Length": cuttingLength,
      "Lap Length": lapLength,
      Element: element
    });
  }
  
  return data;
}

const numItems = parseInt(process.argv[2] || "500", 10);
const outputPath = resolve(process.cwd(), process.argv[3] || 'cli/large-dataset.json');

const dataset = generateDataset(numItems);

writeFileSync(outputPath, JSON.stringify(dataset, null, 2), 'utf8');

console.log(`Successfully generated ${numItems} records and saved to ${outputPath}`);
