// Smart greedy with look-ahead for better combinations
console.log("=== Smart Greedy with Look-Ahead ===");

const STANDARD_LENGTH = 12.0;

// Create segments
const segments = [];
for (let i = 0; i < 40; i++) segments.push({ length: 6, type: '6m', instance: i });
for (let i = 0; i < 40; i++) segments.push({ length: 4, type: '4m', instance: i });
for (let i = 0; i < 40; i++) segments.push({ length: 2, type: '2m', instance: i });

// Group by length for smarter allocation
const segmentGroups = {
    6: segments.filter(s => s.length === 6),
    4: segments.filter(s => s.length === 4),
    2: segments.filter(s => s.length === 2)
};

console.log("Available segments:", Object.keys(segmentGroups).map(k => `${segmentGroups[k].length}×${k}m`).join(', '));

const bins = [];

// Smart allocation: Try to find optimal combinations first
while (segmentGroups[6].length > 0 || segmentGroups[4].length > 0 || segmentGroups[2].length > 0) {
    const newBin = {
        id: bins.length + 1,
        cuts: [],
        usedLength: 0,
        remainingLength: STANDARD_LENGTH
    };

    // Try optimal combinations first
    // 1. Try 6 + 4 + 2 = 12 (perfect fit)
    if (segmentGroups[6].length > 0 && segmentGroups[4].length > 0 && segmentGroups[2].length > 0) {
        newBin.cuts.push(segmentGroups[6].pop());
        newBin.cuts.push(segmentGroups[4].pop());
        newBin.cuts.push(segmentGroups[2].pop());
        newBin.usedLength = 12;
        newBin.remainingLength = 0;
    }
    // 2. Try 6 + 2 + 2 + 2 = 12 (perfect fit)
    else if (segmentGroups[6].length > 0 && segmentGroups[2].length >= 3) {
        newBin.cuts.push(segmentGroups[6].pop());
        newBin.cuts.push(segmentGroups[2].pop());
        newBin.cuts.push(segmentGroups[2].pop());
        newBin.cuts.push(segmentGroups[2].pop());
        newBin.usedLength = 12;
        newBin.remainingLength = 0;
    }
    // 3. Try 4 + 4 + 4 = 12 (perfect fit)
    else if (segmentGroups[4].length >= 3) {
        newBin.cuts.push(segmentGroups[4].pop());
        newBin.cuts.push(segmentGroups[4].pop());
        newBin.cuts.push(segmentGroups[4].pop());
        newBin.usedLength = 12;
        newBin.remainingLength = 0;
    }
    // 4. Try 4 + 2 + 2 + 2 + 2 = 12 (perfect fit)
    else if (segmentGroups[4].length > 0 && segmentGroups[2].length >= 4) {
        newBin.cuts.push(segmentGroups[4].pop());
        newBin.cuts.push(segmentGroups[2].pop());
        newBin.cuts.push(segmentGroups[2].pop());
        newBin.cuts.push(segmentGroups[2].pop());
        newBin.cuts.push(segmentGroups[2].pop());
        newBin.usedLength = 12;
        newBin.remainingLength = 0;
    }
    // 5. Try 2 + 2 + 2 + 2 + 2 + 2 = 12 (perfect fit)
    else if (segmentGroups[2].length >= 6) {
        for (let i = 0; i < 6; i++) {
            newBin.cuts.push(segmentGroups[2].pop());
        }
        newBin.usedLength = 12;
        newBin.remainingLength = 0;
    }
    // 6. Fallback combinations
    else if (segmentGroups[6].length > 0 && segmentGroups[4].length > 0) {
        newBin.cuts.push(segmentGroups[6].pop());
        newBin.cuts.push(segmentGroups[4].pop());
        newBin.usedLength = 10;
        newBin.remainingLength = 2;
    }
    else if (segmentGroups[6].length > 0) {
        newBin.cuts.push(segmentGroups[6].pop());
        newBin.usedLength = 6;
        newBin.remainingLength = 6;
    }
    else if (segmentGroups[4].length > 0) {
        newBin.cuts.push(segmentGroups[4].pop());
        newBin.usedLength = 4;
        newBin.remainingLength = 8;
    }
    else if (segmentGroups[2].length > 0) {
        newBin.cuts.push(segmentGroups[2].pop());
        newBin.usedLength = 2;
        newBin.remainingLength = 10;
    }
    else {
        break; // No more segments
    }

    bins.push(newBin);
}

console.log(`Smart Greedy - Bins used: ${bins.length}`);
console.log(`Total waste: ${bins.reduce((sum, bin) => sum + bin.remainingLength, 0).toFixed(3)}m`);
console.log(`Average utilization: ${(bins.reduce((sum, bin) => sum + bin.usedLength, 0) / (bins.length * STANDARD_LENGTH) * 100).toFixed(1)}%`);

console.log("\nFirst 10 bins:");
bins.slice(0, 10).forEach(bin => {
    const cutTypes = bin.cuts.map(c => c.type).join(' + ');
    console.log(`Bin ${bin.id}: [${cutTypes}] = ${bin.usedLength}m used, ${bin.remainingLength}m waste`);
});

const perfectBins = bins.filter(bin => bin.remainingLength === 0);
console.log(`\nPerfect bins (0 waste): ${perfectBins.length}`);
console.log(`Efficiency vs optimal: ${(40 / bins.length * 100).toFixed(1)}%`);