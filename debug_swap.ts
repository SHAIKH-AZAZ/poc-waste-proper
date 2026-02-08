
import { SwapOptimization } from "./src/algorithms/swapOptimization";
import { CuttingStockPreprocessor } from "./src/utils/cuttingStockPreprocessor";
import { BarCuttingDisplay } from "./src/types/BarCuttingRow";

const swap = new SwapOptimization();
const preprocessor = new CuttingStockPreprocessor();

// Generate random complex data
const randomData: BarCuttingDisplay[] = [];
for (let i = 0; i < 20; i++) {
    // Generate random length between 1m and 8m
    const length = Math.floor(Math.random() * 7000 + 1000) / 1000; 
    randomData.push({
        "BarCode": `R_${i}`,
        "Dia": 16,
        "Total Bars": Math.floor(Math.random() * 5 + 1),
        "Cutting Length": length,
        "Lap Length": 0,
        "Element": "Rand"
    });
}

// Add some specifically tricky standard lengths
randomData.push({ "BarCode": "T1", "Dia": 16, "Total Bars": 5, "Cutting Length": 6.1, "Lap Length": 0, "Element": "Trick" });
randomData.push({ "BarCode": "T2", "Dia": 16, "Total Bars": 5, "Cutting Length": 5.9, "Lap Length": 0, "Element": "Trick" });

console.log(`Generated ${randomData.length} request types`);

const requests = preprocessor.convertToCuttingRequests(randomData);
const totalLength = preprocessor.calculateTotalMaterial(requests);
console.log(`Total Material: ${totalLength.toFixed(2)}m`);
console.log(`Lower Bound Bars: ${Math.ceil(totalLength / 12)}`);

console.log("Running optimization...");
const result = swap.solve(requests, 16);

console.log("------------------------------------------------");
console.log(`Final Result: ${result.totalBarsUsed} bars used`);
console.log(`Total Waste: ${result.totalWaste.toFixed(3)} m`);
console.log(`Efficiency: ${result.averageUtilization.toFixed(2)}%`);
console.log("------------------------------------------------");
