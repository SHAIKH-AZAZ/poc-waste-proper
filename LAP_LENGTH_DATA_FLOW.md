# Lap Length Data Flow

## 📊 Overview

Lap length comes from the **original Excel input** and flows through the entire system to the final Excel export.

## 🔄 Complete Data Flow

### Step 1: Excel Input
```
Excel File:
┌────────┬────────┬──────┬────────────┬─────────────────┬─────────────┬─────────┐
│ SI no  │ Label  │ Dia  │ Total Bars │ Cutting Length  │ Lap Length  │ Element │
├────────┼────────┼──────┼────────────┼─────────────────┼─────────────┼─────────┤
│   1    │  B1    │  12  │     50     │     5.750       │    0.000    │ Column  │
│   2    │  S1    │  16  │     30     │     4.200       │    0.000    │ Beam    │
│   4    │  M1    │  12  │     20     │    15.500       │    0.480    │ Column  │
└────────┴────────┴──────┴────────────┴─────────────────┴─────────────┴─────────┘
```

**Key Points:**
- Row 1 & 2: Lap Length = 0 (single bar cuts, no lap needed)
- Row 4: Lap Length = 0.480 (multi-bar cut > 12m, lap needed)

### Step 2: Parse & Transform
```typescript
// src/utils/sanitizeData.ts
const lapLength = Number(row["Lap Length"] || 0);

return {
  "SI no": siNo,
  "Label": label,
  "Dia": dia,
  "Cutting Length": cuttingLength,
  "Lap Length": lapLength, // ← Preserved from Excel
  "Element": element,
  "BarCode": generateBarCode(siNo, label, dia)
};
```

### Step 3: Convert to Cutting Requests
```typescript
// src/utils/cuttingStockPreprocessor.ts
convertToCuttingRequests(displayData: BarCuttingDisplay[]): MultiBarCuttingRequest[] {
  return displayData.map((row) => {
    const cuttingLength = row["Cutting Length"];
    const lapLength = row["Lap Length"]; // ← Get from display data
    
    return {
      barCode: row.BarCode,
      originalLength: cuttingLength,
      lapLength: lapLength, // ← Store in request
      // ... other fields
    };
  });
}
```

### Step 4: Create Segments (Multi-Bar Calculation)
```typescript
// src/utils/multiBarCalculator.ts
createSegments(barCode: string, subBarInfo: SubBarInfo, quantity: number, lapLength: number): BarSegment[] {
  const segments: BarSegment[] = [];
  
  subBarInfo.segmentLengths.forEach((length, index) => {
    segments.push({
      segmentId: `${barCode}_seg_${index}`,
      parentBarCode: barCode,
      length: length,
      lapLength: lapLength, // ← Store actual lap length from input
      hasLapStart: index > 0,
      hasLapEnd: index < subBarInfo.segmentLengths.length - 1,
      // ... other fields
    });
  });
  
  return segments;
}
```

**Example for 15.5m cut with 0.480m lap:**
```
Segment 0: length=12.0m, lapLength=0.480, hasLapEnd=true
Segment 1: length=3.5m,  lapLength=0.480, hasLapStart=true
```

### Step 5: Greedy Algorithm - Create Pattern Cuts
```typescript
// src/algorithms/greedyCuttingStock.ts
private placeInBin(bin: Bin, segment: BarSegment): void {
  bin.cuts.push({
    segmentId: segment.segmentId,
    parentBarCode: segment.parentBarCode,
    length: segment.length,
    lapLength: segment.lapLength, // ← Pass through from segment
    segmentIndex: segment.segmentIndex,
    count: 1,
  });
}
```

### Step 6: Generate Cut Instructions
```typescript
// src/algorithms/greedyCuttingStock.ts
for (const cut of pattern.cuts) {
  // For multi-bar cuts, ALL segments have lap (to connect them)
  const hasLap = cut.segmentIndex >= 0 && cut.lapLength > 0;
  
  cuts.push({
    barCode: cut.parentBarCode,
    segmentId: cut.segmentId,
    length: cut.length,
    segmentIndex: cut.segmentIndex,
    hasLap: hasLap,
    lapLength: hasLap ? cut.lapLength : 0, // ← Use actual lap length if has lap
  });
}
```

**Logic:**
- If `lapLength > 0` in input: **ALL segments** have lap (to connect them together)
- If `lapLength = 0` in input: No lap (single bar or no lap needed)

### Step 7: Excel Export
```typescript
// src/utils/excelExport.ts
function groupCutsByBarCode(cuts: CutInstruction[]): GroupedCut[] {
  for (const cut of cuts) {
    const lapLength = cut.lapLength || 0; // ← Use actual value from cut instruction
    
    groups.set(cut.barCode, {
      barCode: cut.barCode,
      length: cut.length,
      lapLength: parseFloat(lapLength.toFixed(3)), // ← Export to Excel
    });
  }
}
```

## 📋 Example: Complete Flow

### Input Excel:
```
SI no: 4
Label: M1
Dia: 12
Cutting Length: 15.500m
Lap Length: 0.480m  ← INPUT VALUE
Element: Column
```

### After Processing:
```
BarCode: 4/M1/12
isMultiBar: true (15.5 > 12)
subBarsRequired: ceil(15.5/12) = 2
lapsRequired: floor(15.5/12) = 1
```

### Segments Created:
```
Segment 0:
  - segmentId: "4/M1/12_seg_0"
  - length: 12.0m
  - lapLength: 0.480m  ← FROM INPUT
  - hasLapStart: false
  - hasLapEnd: true (connects to segment 1)

Segment 1:
  - segmentId: "4/M1/12_seg_1"
  - length: 3.5m
  - lapLength: 0.480m  ← FROM INPUT
  - hasLapStart: true (connects to segment 0)
  - hasLapEnd: false
```

### In Cutting Pattern:
```
Bar #5:
  Cut 1: 4/M1/12_seg_0, length=12.0m, lapLength=0.480m (has lap at END)
  
Bar #6:
  Cut 1: 4/M1/12_seg_1, length=3.5m, lapLength=0.480m (has lap at START)
```

### Excel Export:
```
Bar# | BarCode       | Length | Lap Length | Waste | Utilization
5    | 4/M1/12       | 12.000 | 0.480      | 0.000 | 100%  ← ALL segments have lap
6    | 4/M1/12       | 3.500  | 0.480      | 8.500 | 29.17% ← ALL segments have lap
```

## ✅ Key Rules

### Rule 1: Source of Truth
- **Lap Length ALWAYS comes from Excel input**
- Never use hardcoded values (like 0.480)
- Never calculate lap length randomly

### Rule 2: When Lap Length is Used
- **Only for multi-bar cuts** (Cutting Length > 12m)
- If Lap Length = 0 in Excel, don't use it (even for multi-bar)
- Single bar cuts (≤ 12m) always have lapLength = 0

### Rule 3: Multi-Bar Lap Logic
```typescript
if (lapLength > 0 in input) {
  // ALL segments of multi-bar cut have lap
  // They need to be connected together
  lapLength = actual value from input (e.g., 0.480)
} else {
  // No lap needed
  lapLength = 0
}
```

**Why ALL segments have lap:**
- Segment 0 has lap at END (to connect to segment 1)
- Segment 1 has lap at START (to connect to segment 0)
- They overlap at the lap joint to form continuous 15.5m bar

### Rule 4: Excel Display
```
Lap Length Column:
- 0 = No lap joint needed
- 0.480 (or other value) = Lap joint required with this length
```

## 🔍 Verification

### To verify lap length is correct:

1. **Check Excel Input:**
   ```
   Row 4: Cutting Length = 15.5m, Lap Length = 0.480m
   ```

2. **Check Segments:**
   ```
   Segment 0: lapLength = 0.480
   Segment 1: lapLength = 0.480
   ```

3. **Check Cut Instructions:**
   ```
   Cut for seg_0: lapLength = 0.480 (has lap at END)
   Cut for seg_1: lapLength = 0.480 (has lap at START)
   ```

4. **Check Excel Export:**
   ```
   Bar with seg_0: Lap Length = 0.480 ✓ ALL segments have lap
   Bar with seg_1: Lap Length = 0.480 ✓ ALL segments have lap
   ```

## 🐛 Previous Issue

**Problem:** Hardcoded lap length
```typescript
// WRONG - Don't do this!
const lapLength = cut.hasLap ? 0.480 : 0; // ❌ Hardcoded value
```

**Solution:** Use actual value from input
```typescript
// CORRECT - Use actual value
const lapLength = cut.lapLength || 0; // ✅ From input data
```

## 📊 Data Structure Summary

```typescript
Excel Input
  ↓ (Lap Length: 0.480)
BarCuttingDisplay
  ↓ (Lap Length: 0.480)
MultiBarCuttingRequest
  ↓ (lapLength: 0.480)
BarSegment
  ↓ (lapLength: 0.480)
PatternCut
  ↓ (lapLength: 0.480)
CutInstruction
  ↓ (lapLength: 0 or 0.480 based on segmentIndex)
Excel Export
  ↓ (Lap Length: 0 or 0.480)
```

All lap lengths now come from the **original Excel input** and are preserved throughout the entire system! ✅
