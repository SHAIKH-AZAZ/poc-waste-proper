# Greedy Algorithm - Complete Code Explanation

## 📋 Table of Contents
1. [Class Structure](#class-structure)
2. [Main solve() Method](#main-solve-method)
3. [First Fit Decreasing Algorithm](#first-fit-decreasing-algorithm)
4. [Constraint Checking](#constraint-checking)
5. [Bin Management](#bin-management)
6. [Result Generation](#result-generation)
7. [Complete Flow Diagram](#complete-flow-diagram)

---

## 🏗️ Class Structure

### File: `src/algorithms/greedyCuttingStock.ts`

```typescript
export class GreedyCuttingStock {
  private readonly STANDARD_LENGTH = 12.0;
  private preprocessor = new CuttingStockPreprocessor();
  
  // Main methods:
  // - solve()
  // - firstFitDecreasing()
  // - canPlaceInBin()
  // - placeInBin()
  // - createNewBin()
  // - binsToPatterns()
  // - generateDetailedCuts()
  // - calculateSummary()
}
```

### Key Components

**Constants:**
- `STANDARD_LENGTH = 12.0` - Standard bar length in meters

**Dependencies:**
- `CuttingStockPreprocessor` - Handles data preprocessing

**Data Structures:**
- `Bin` - Represents a 12m bar with cuts
- `CuttingPattern` - Final cutting pattern
- `CuttingStockResult` - Complete result object

---

## 🎯 Main solve() Method

### Complete Code

```typescript
solve(requests: MultiBarCuttingRequest[], dia: number): CuttingStockResult {
  const startTime = performance.now();

  // Step 1: Filter by diameter
  const diaRequests = this.preprocessor.filterByDia(requests, dia);

  if (diaRequests.length === 0) {
    return this.createEmptyResult(dia, startTime);
  }

  // Step 2: Extract and sort segments
  const allSegments = this.preprocessor.extractAllSegmentsForGreedy(diaRequests);
  const sortedSegments = this.preprocessor.sortSegmentsByLength(allSegments);

  // Step 3: Apply First Fit Decreasing
  const bins = this.firstFitDecreasing(sortedSegments);

  // Step 4: Convert to patterns
  const patterns = this.binsToPatterns(bins);

  // Step 5: Generate detailed cuts
  const detailedCuts = this.generateDetailedCuts(patterns);

  // Step 6: Calculate summary
  const summary = this.calculateSummary(patterns, allSegments.length);

  const executionTime = performance.now() - startTime;

  return {
    algorithm: "greedy",
    dia,
    patterns,
    totalBarsUsed: bins.length,
    totalWaste: summary.totalWasteLength,
    averageUtilization: summary.averageUtilization,
    executionTime,
    summary,
    detailedCuts,
  };
}
```

### Step-by-Step Breakdown

#### Step 1: Filter by Diameter
```typescript
const diaRequests = this.preprocessor.filterByDia(requests, dia);
```

**What it does:**
- Filters cutting requests to only include selected diameter
- Example: If user selects 12mm, only 12mm bars are processed

**Input:**
```typescript
requests = [
  { barCode: "1/B1/12", dia: 12, ... },
  { barCode: "2/B2/16", dia: 16, ... },
  { barCode: "3/B3/12", dia: 12, ... }
]
dia = 12
```

**Output:**
```typescript
diaRequests = [
  { barCode: "1/B1/12", dia: 12, ... },
  { barCode: "3/B3/12", dia: 12, ... }
]
```


#### Step 2: Extract and Sort Segments
```typescript
const allSegments = this.preprocessor.extractAllSegmentsForGreedy(diaRequests);
const sortedSegments = this.preprocessor.sortSegmentsByLength(allSegments);
```

**What extractAllSegmentsForGreedy() does:**
- Expands segments by quantity
- Creates unique identifiers for each instance
- Handles multi-bar segments

**Example:**
```typescript
// Input: 55m bar, quantity=2
diaRequests = [{
  barCode: "1/B1/12",
  quantity: 2,
  segments: [
    { segmentId: "1/B1/12_seg_0", length: 12 },
    { segmentId: "1/B1/12_seg_1", length: 12 },
    { segmentId: "1/B1/12_seg_2", length: 12 },
    { segmentId: "1/B1/12_seg_3", length: 12 },
    { segmentId: "1/B1/12_seg_4", length: 9 }
  ]
}]

// Output: 10 segments (5 segments × 2 instances)
allSegments = [
  { segmentId: "1/B1/12_seg_0_instance_0", parentBarCode: "1/B1/12_instance_0", length: 12 },
  { segmentId: "1/B1/12_seg_1_instance_0", parentBarCode: "1/B1/12_instance_0", length: 12 },
  { segmentId: "1/B1/12_seg_2_instance_0", parentBarCode: "1/B1/12_instance_0", length: 12 },
  { segmentId: "1/B1/12_seg_3_instance_0", parentBarCode: "1/B1/12_instance_0", length: 12 },
  { segmentId: "1/B1/12_seg_4_instance_0", parentBarCode: "1/B1/12_instance_0", length: 9 },
  { segmentId: "1/B1/12_seg_0_instance_1", parentBarCode: "1/B1/12_instance_1", length: 12 },
  { segmentId: "1/B1/12_seg_1_instance_1", parentBarCode: "1/B1/12_instance_1", length: 12 },
  { segmentId: "1/B1/12_seg_2_instance_1", parentBarCode: "1/B1/12_instance_1", length: 12 },
  { segmentId: "1/B1/12_seg_3_instance_1", parentBarCode: "1/B1/12_instance_1", length: 12 },
  { segmentId: "1/B1/12_seg_4_instance_1", parentBarCode: "1/B1/12_instance_1", length: 9 }
]
```

**What sortSegmentsByLength() does:**
- Sorts segments in descending order (largest first)
- Uses `effectiveLength` for comparison

**Code:**
```typescript
sortSegmentsByLength(segments: BarSegment[]): BarSegment[] {
  return [...segments].sort((a, b) => b.effectiveLength - a.effectiveLength);
}
```

**Example:**
```typescript
// Before sorting
[3m, 8m, 5m, 12m, 2m, 9m]

// After sorting (descending)
[12m, 9m, 8m, 5m, 3m, 2m]
```


---

## 🔄 First Fit Decreasing Algorithm

### Complete Code

```typescript
private firstFitDecreasing(segments: BarSegment[]): Bin[] {
  const bins: Bin[] = [];

  for (const segment of segments) {
    let placed = false;

    // Try to place in existing bins (First Fit)
    for (const bin of bins) {
      if (this.canPlaceInBin(bin, segment)) {
        this.placeInBin(bin, segment);
        placed = true;
        break; // ← FIRST FIT: Stop at first bin that works
      }
    }

    // Create new bin if needed
    if (!placed) {
      const newBin = this.createNewBin();
      this.placeInBin(newBin, segment);
      bins.push(newBin);
    }
  }

  return bins;
}
```

### Detailed Explanation

#### Loop Through Each Segment
```typescript
for (const segment of segments) {
```
- Processes segments in sorted order (largest first)
- Each segment must be placed in a bin

#### Try Existing Bins First
```typescript
for (const bin of bins) {
  if (this.canPlaceInBin(bin, segment)) {
    this.placeInBin(bin, segment);
    placed = true;
    break; // ← CRITICAL: First Fit stops here
  }
}
```

**Key Points:**
1. Checks bins in order (oldest first)
2. Uses `canPlaceInBin()` to check constraints
3. **Breaks immediately** when first fit found (not best fit)
4. Sets `placed = true` to skip bin creation

#### Create New Bin if Needed
```typescript
if (!placed) {
  const newBin = this.createNewBin();
  this.placeInBin(newBin, segment);
  bins.push(newBin);
}
```

**When this happens:**
- No existing bin has space
- Multi-bar constraint prevents placement
- Creates fresh 12m bar

### Example Execution

```typescript
// Input segments (sorted): [12m, 9m, 8m, 5m, 3m, 2m]

// Process 12m
bins = []
→ No bins available
→ Create Bin 1, place 12m
bins = [Bin1: [12m], remaining: 0m]

// Process 9m
bins = [Bin1: 0m remaining]
→ Bin1: Can't fit (0m < 9m)
→ Create Bin 2, place 9m
bins = [Bin1: [12m], Bin2: [9m], remaining: 3m]

// Process 8m
bins = [Bin1: 0m, Bin2: 3m]
→ Bin1: Can't fit (0m < 8m)
→ Bin2: Can't fit (3m < 8m)
→ Create Bin 3, place 8m
bins = [Bin1: [12m], Bin2: [9m], Bin3: [8m], remaining: 4m]

// Process 5m
bins = [Bin1: 0m, Bin2: 3m, Bin3: 4m]
→ Bin1: Can't fit (0m < 5m)
→ Bin2: Can't fit (3m < 5m)
→ Bin3: Can't fit (4m < 5m)
→ Create Bin 4, place 5m
bins = [Bin1: [12m], Bin2: [9m], Bin3: [8m], Bin4: [5m], remaining: 7m]

// Process 3m
bins = [Bin1: 0m, Bin2: 3m, Bin3: 4m, Bin4: 7m]
→ Bin1: Can't fit (0m < 3m)
→ Bin2: CAN FIT! (3m = 3m) ✅
→ Place in Bin2, BREAK
bins = [Bin1: [12m], Bin2: [9m, 3m], Bin3: [8m], Bin4: [5m]]

// Process 2m
bins = [Bin1: 0m, Bin2: 0m, Bin3: 4m, Bin4: 7m]
→ Bin1: Can't fit (0m < 2m)
→ Bin2: Can't fit (0m < 2m)
→ Bin3: CAN FIT! (4m > 2m) ✅
→ Place in Bin3, BREAK
bins = [Bin1: [12m], Bin2: [9m, 3m], Bin3: [8m, 2m], Bin4: [5m]]

// Final result
Bin1: [12m] - 0m waste
Bin2: [9m, 3m] - 0m waste
Bin3: [8m, 2m] - 2m waste
Bin4: [5m] - 7m waste
```


---

## 🔒 Constraint Checking

### canPlaceInBin() Method

```typescript
private canPlaceInBin(bin: Bin, segment: BarSegment): boolean {
  // Use cutting length (which includes lap) for space calculation
  const requiredSpace = segment.length;
  const tolerance = 0; // 1cm tolerance for cutting precision
  
  // Check if there's enough space
  if (bin.remainingLength < requiredSpace + tolerance) {
    return false;
  }
  
  // Check if any cut in this bin is from the same parent bar INSTANCE
  // Now that we have unique parentBarCode per instance, this works correctly
  const hasSameParentInstance = bin.cuts.some(
    (cut) => cut.parentBarCode === segment.parentBarCode
  );
  
  return !hasSameParentInstance;
}
```

### Constraint 1: Space Check

```typescript
if (bin.remainingLength < requiredSpace + tolerance) {
  return false;
}
```

**What it checks:**
- Does the bin have enough remaining space?
- Includes tolerance for cutting precision

**Example:**
```typescript
// Bin has 4m remaining, segment needs 5m
bin.remainingLength = 4.0
segment.length = 5.0
tolerance = 0

4.0 < 5.0 + 0 → true
return false // Can't fit
```

```typescript
// Bin has 4m remaining, segment needs 3m
bin.remainingLength = 4.0
segment.length = 3.0
tolerance = 0

4.0 < 3.0 + 0 → false
// Continue to next check
```

### Constraint 2: Multi-Bar Check

```typescript
const hasSameParentInstance = bin.cuts.some(
  (cut) => cut.parentBarCode === segment.parentBarCode
);

return !hasSameParentInstance;
```

**What it checks:**
- Are there any segments from the same parent bar already in this bin?
- Prevents segments that need to be joined from being in same bin

**Example:**
```typescript
// Bin contains segment from "1/B1/12_instance_0"
bin.cuts = [
  { parentBarCode: "1/B1/12_instance_0", ... }
]

// Trying to place another segment from same parent
segment.parentBarCode = "1/B1/12_instance_0"

hasSameParentInstance = bin.cuts.some(
  cut => cut.parentBarCode === "1/B1/12_instance_0"
) // → true

return !true // → false (Can't place)
```

```typescript
// Bin contains segment from "1/B1/12_instance_0"
bin.cuts = [
  { parentBarCode: "1/B1/12_instance_0", ... }
]

// Trying to place segment from different parent
segment.parentBarCode = "1/B1/12_instance_1"

hasSameParentInstance = bin.cuts.some(
  cut => cut.parentBarCode === "1/B1/12_instance_1"
) // → false

return !false // → true (Can place)
```

### Why Multi-Bar Constraint Matters

```
55m continuous beam split into 5 segments:

Segment 0 ──LAP── Segment 1 ──LAP── Segment 2 ──LAP── Segment 3 ──LAP── Segment 4

These segments will be JOINED on-site, so they must come from DIFFERENT bars!

❌ WRONG:
Bar 1: [Segment 0, Segment 1] ← Can't join if from same bar!

✅ CORRECT:
Bar 1: [Segment 0]
Bar 2: [Segment 1]
Bar 3: [Segment 2]
Bar 4: [Segment 3]
Bar 5: [Segment 4]
```


---

## 📦 Bin Management

### Bin Data Structure

```typescript
interface Bin {
  id: string;                    // Unique identifier
  cuts: PatternCut[];            // Segments in this bin
  usedLength: number;            // Total length used
  remainingLength: number;       // Space left
}
```

### createNewBin() Method

```typescript
private createNewBin(): Bin {
  return {
    id: `bin_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    cuts: [],
    usedLength: 0,
    remainingLength: this.STANDARD_LENGTH,
  };
}
```

**What it does:**
- Creates a fresh 12m bar
- Generates unique ID using timestamp + random string
- Initializes empty cuts array
- Sets full 12m capacity

**Example:**
```typescript
newBin = {
  id: "bin_1704123456789_a3f9k2x",
  cuts: [],
  usedLength: 0,
  remainingLength: 12.0
}
```

### placeInBin() Method

```typescript
private placeInBin(bin: Bin, segment: BarSegment): void {
  // For greedy algorithm, each segment is placed individually
  // Don't group by segmentId since each instance should be tracked separately
  bin.cuts.push({
    segmentId: segment.segmentId,
    parentBarCode: segment.parentBarCode,
    length: segment.length,
    count: 1, // Always 1 since we're placing individual segments
    segmentIndex: segment.segmentIndex,
    lapLength: segment.lapLength, // Pass through actual lap length
  });

  // Use cutting length (which includes lap) for space tracking
  bin.usedLength += segment.length;
  bin.remainingLength = this.STANDARD_LENGTH - bin.usedLength;
}
```

**Step-by-Step:**

1. **Add segment to cuts array**
```typescript
bin.cuts.push({
  segmentId: segment.segmentId,
  parentBarCode: segment.parentBarCode,
  length: segment.length,
  count: 1,
  segmentIndex: segment.segmentIndex,
  lapLength: segment.lapLength,
});
```

2. **Update used length**
```typescript
bin.usedLength += segment.length;
```

3. **Calculate remaining space**
```typescript
bin.remainingLength = this.STANDARD_LENGTH - bin.usedLength;
```

**Example:**
```typescript
// Before placing 8m segment
bin = {
  id: "bin_1",
  cuts: [],
  usedLength: 0,
  remainingLength: 12.0
}

// Place 8m segment
segment = { length: 8.0, ... }

// After placing
bin = {
  id: "bin_1",
  cuts: [
    { length: 8.0, count: 1, ... }
  ],
  usedLength: 8.0,
  remainingLength: 4.0
}

// Place 3m segment
segment = { length: 3.0, ... }

// After placing
bin = {
  id: "bin_1",
  cuts: [
    { length: 8.0, count: 1, ... },
    { length: 3.0, count: 1, ... }
  ],
  usedLength: 11.0,
  remainingLength: 1.0
}
```


---

## 📊 Result Generation

### binsToPatterns() Method

```typescript
private binsToPatterns(bins: Bin[]): CuttingPattern[] {
  return bins.map((bin, index) => ({
    id: `pattern_${index + 1}`,
    cuts: bin.cuts,
    waste: bin.remainingLength,
    utilization: (bin.usedLength / this.STANDARD_LENGTH) * 100,
    standardBarLength: this.STANDARD_LENGTH,
  }));
}
```

**What it does:**
- Converts internal Bin objects to CuttingPattern format
- Calculates waste and utilization for each pattern
- Assigns sequential pattern IDs

**Example:**
```typescript
// Input bins
bins = [
  { id: "bin_1", cuts: [8m, 4m], usedLength: 12, remainingLength: 0 },
  { id: "bin_2", cuts: [6m, 5m], usedLength: 11, remainingLength: 1 },
  { id: "bin_3", cuts: [3m, 2m], usedLength: 5, remainingLength: 7 }
]

// Output patterns
patterns = [
  {
    id: "pattern_1",
    cuts: [8m, 4m],
    waste: 0,
    utilization: 100,
    standardBarLength: 12
  },
  {
    id: "pattern_2",
    cuts: [6m, 5m],
    waste: 1,
    utilization: 91.67,
    standardBarLength: 12
  },
  {
    id: "pattern_3",
    cuts: [3m, 2m],
    waste: 7,
    utilization: 41.67,
    standardBarLength: 12
  }
]
```

### generateDetailedCuts() Method

```typescript
private generateDetailedCuts(patterns: CuttingPattern[]): DetailedCut[] {
  return patterns.map((pattern, index) => {
    let currentPosition = 0;
    const cuts: CutInstruction[] = [];

    for (const cut of pattern.cuts) {
      for (let i = 0; i < cut.count; i++) {
        // Determine if this segment has lap
        const hasLap = cut.lapLength > 0;
        
        cuts.push({
          barCode: cut.parentBarCode.replace(/_instance_\d+$/, ''),
          segmentId: cut.segmentId,
          length: cut.length,
          quantity: 1,
          position: currentPosition,
          segmentIndex: cut.segmentIndex,
          hasLap: hasLap,
          lapLength: hasLap ? cut.lapLength : 0,
        });
        currentPosition += cut.length;
      }
    }

    return {
      patternId: pattern.id,
      barNumber: index + 1,
      cuts,
      waste: pattern.waste,
      utilization: pattern.utilization,
    };
  });
}
```

**What it does:**
- Creates detailed cutting instructions for each bar
- Tracks position of each cut on the bar
- Removes instance suffix from barCode for display
- Identifies which cuts have lap joints

**Example:**
```typescript
// Input pattern
pattern = {
  id: "pattern_1",
  cuts: [
    { parentBarCode: "1/B1/12_instance_0", length: 8, lapLength: 0.5 },
    { parentBarCode: "2/B2/16_instance_0", length: 4, lapLength: 0 }
  ]
}

// Output detailed cut
detailedCut = {
  patternId: "pattern_1",
  barNumber: 1,
  cuts: [
    {
      barCode: "1/B1/12",           // Instance suffix removed
      segmentId: "1/B1/12_seg_0",
      length: 8,
      quantity: 1,
      position: 0,                   // Starts at 0m
      segmentIndex: 0,
      hasLap: true,                  // Has lap (0.5m)
      lapLength: 0.5
    },
    {
      barCode: "2/B2/16",
      segmentId: "2/B2/16_seg_0",
      length: 4,
      quantity: 1,
      position: 8,                   // Starts at 8m
      segmentIndex: 0,
      hasLap: false,                 // No lap
      lapLength: 0
    }
  ],
  waste: 0,
  utilization: 100
}
```

**Position Tracking:**
```typescript
let currentPosition = 0;

// First cut: 8m
position = 0
currentPosition += 8 → currentPosition = 8

// Second cut: 4m
position = 8
currentPosition += 4 → currentPosition = 12

Visual:
[0m────8m────12m]
 ↑     ↑     ↑
 Cut1  Cut2  End
```


### calculateSummary() Method

```typescript
private calculateSummary(patterns: CuttingPattern[], totalCuts: number) {
  const totalBars = patterns.length;
  const totalWaste = patterns.reduce((sum, p) => sum + p.waste, 0);
  const avgUtilization =
    patterns.reduce((sum, p) => sum + p.utilization, 0) / totalBars;

  return {
    totalStandardBars: totalBars,
    totalWasteLength: Math.round(totalWaste * 1000) / 1000,
    totalWastePercentage:
      Math.round((totalWaste / (totalBars * this.STANDARD_LENGTH)) * 10000) / 100,
    averageUtilization: Math.round(avgUtilization * 100) / 100,
    patternCount: patterns.length,
    totalCutsProduced: totalCuts,
  };
}
```

**Calculations:**

1. **Total Bars**
```typescript
const totalBars = patterns.length;
// Simply count the patterns (each pattern = 1 bar)
```

2. **Total Waste**
```typescript
const totalWaste = patterns.reduce((sum, p) => sum + p.waste, 0);
// Sum up waste from all patterns
```

3. **Average Utilization**
```typescript
const avgUtilization = patterns.reduce((sum, p) => sum + p.utilization, 0) / totalBars;
// Average of all pattern utilizations
```

4. **Waste Percentage**
```typescript
totalWastePercentage = (totalWaste / (totalBars × 12m)) × 100
```

**Example:**
```typescript
patterns = [
  { waste: 0, utilization: 100 },
  { waste: 1, utilization: 91.67 },
  { waste: 7, utilization: 41.67 }
]
totalCuts = 6

// Calculations
totalBars = 3
totalWaste = 0 + 1 + 7 = 8m
avgUtilization = (100 + 91.67 + 41.67) / 3 = 77.78%
totalWastePercentage = (8 / (3 × 12)) × 100 = 22.22%

// Result
summary = {
  totalStandardBars: 3,
  totalWasteLength: 8.0,
  totalWastePercentage: 22.22,
  averageUtilization: 77.78,
  patternCount: 3,
  totalCutsProduced: 6
}
```

---

## 🔄 Complete Flow Diagram

```
┌─────────────────────────────────────────────────────────┐
│                    solve() Method                       │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│ Step 1: Filter by Diameter                              │
│ ─────────────────────────────────────────────────────── │
│ Input: All requests                                     │
│ Output: Requests for selected diameter only            │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│ Step 2: Extract & Sort Segments                         │
│ ─────────────────────────────────────────────────────── │
│ extractAllSegmentsForGreedy():                          │
│   - Expand by quantity                                  │
│   - Create unique instance IDs                          │
│   - Handle multi-bar segments                           │
│                                                          │
│ sortSegmentsByLength():                                 │
│   - Sort descending (largest first)                     │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│ Step 3: First Fit Decreasing                            │
│ ─────────────────────────────────────────────────────── │
│ For each segment (in sorted order):                     │
│   ┌─────────────────────────────────────────────────┐  │
│   │ Try existing bins                                │  │
│   │   ┌─────────────────────────────────────────┐   │  │
│   │   │ canPlaceInBin()?                        │   │  │
│   │   │   - Check space                         │   │  │
│   │   │   - Check multi-bar constraint          │   │  │
│   │   └─────────────────────────────────────────┘   │  │
│   │                                                  │  │
│   │   If YES:                                        │  │
│   │   ┌─────────────────────────────────────────┐   │  │
│   │   │ placeInBin()                            │   │  │
│   │   │   - Add to cuts array                   │   │  │
│   │   │   - Update usedLength                   │   │  │
│   │   │   - Update remainingLength              │   │  │
│   │   └─────────────────────────────────────────┘   │  │
│   │   BREAK (First Fit)                              │  │
│   │                                                  │  │
│   │   If NO (no bin fits):                           │  │
│   │   ┌─────────────────────────────────────────┐   │  │
│   │   │ createNewBin()                          │   │  │
│   │   │   - Create fresh 12m bar                │   │  │
│   │   │   - placeInBin()                        │   │  │
│   │   └─────────────────────────────────────────┘   │  │
│   └─────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│ Step 4: Convert to Patterns                             │
│ ─────────────────────────────────────────────────────── │
│ binsToPatterns():                                       │
│   - Convert Bin → CuttingPattern                       │
│   - Calculate waste & utilization                      │
│   - Assign pattern IDs                                 │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│ Step 5: Generate Detailed Cuts                          │
│ ─────────────────────────────────────────────────────── │
│ generateDetailedCuts():                                 │
│   - Create cutting instructions                        │
│   - Track positions on bar                             │
│   - Identify lap joints                                │
│   - Remove instance suffixes                           │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│ Step 6: Calculate Summary                               │
│ ─────────────────────────────────────────────────────── │
│ calculateSummary():                                     │
│   - Total bars used                                    │
│   - Total waste                                        │
│   - Waste percentage                                   │
│   - Average utilization                                │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│                Return CuttingStockResult                │
│ ─────────────────────────────────────────────────────── │
│ {                                                       │
│   algorithm: "greedy",                                  │
│   dia: 12,                                              │
│   patterns: [...],                                      │
│   totalBarsUsed: 3,                                     │
│   totalWaste: 8.0,                                      │
│   averageUtilization: 77.78,                            │
│   executionTime: 45.2,                                  │
│   summary: {...},                                       │
│   detailedCuts: [...]                                   │
│ }                                                       │
└─────────────────────────────────────────────────────────┘
```


---

## 🎯 Complete Example with Code Execution

### Input Data

```typescript
requests = [
  {
    barCode: "1/B1/12",
    dia: 12,
    quantity: 1,
    segments: [
      { segmentId: "1/B1/12_seg_0", length: 8, lapLength: 0 },
      { segmentId: "1/B1/12_seg_1", length: 6, lapLength: 0 }
    ]
  },
  {
    barCode: "2/B2/12",
    dia: 12,
    quantity: 1,
    segments: [
      { segmentId: "2/B2/12_seg_0", length: 5, lapLength: 0 }
    ]
  },
  {
    barCode: "3/B3/12",
    dia: 12,
    quantity: 1,
    segments: [
      { segmentId: "3/B3/12_seg_0", length: 4, lapLength: 0 },
      { segmentId: "3/B3/12_seg_1", length: 3, lapLength: 0 },
      { segmentId: "3/B3/12_seg_2", length: 2, lapLength: 0 }
    ]
  }
]
dia = 12
```

### Execution Trace

#### Step 1: Filter by Diameter
```typescript
diaRequests = requests.filter(r => r.dia === 12)
// All requests have dia=12, so all are kept
```

#### Step 2: Extract Segments
```typescript
allSegments = [
  { segmentId: "1/B1/12_seg_0_instance_0", parentBarCode: "1/B1/12_instance_0", length: 8 },
  { segmentId: "1/B1/12_seg_1_instance_0", parentBarCode: "1/B1/12_instance_0", length: 6 },
  { segmentId: "2/B2/12_seg_0_instance_0", parentBarCode: "2/B2/12_instance_0", length: 5 },
  { segmentId: "3/B3/12_seg_0_instance_0", parentBarCode: "3/B3/12_instance_0", length: 4 },
  { segmentId: "3/B3/12_seg_1_instance_0", parentBarCode: "3/B3/12_instance_0", length: 3 },
  { segmentId: "3/B3/12_seg_2_instance_0", parentBarCode: "3/B3/12_instance_0", length: 2 }
]
```

#### Step 3: Sort Segments
```typescript
sortedSegments = [8, 6, 5, 4, 3, 2]
```

#### Step 4: First Fit Decreasing

**Process 8m segment:**
```typescript
bins = []
placed = false

// No bins available
if (!placed) {
  newBin = createNewBin()
  // newBin = { id: "bin_1", cuts: [], usedLength: 0, remainingLength: 12 }
  
  placeInBin(newBin, segment_8m)
  // newBin = { id: "bin_1", cuts: [8m], usedLength: 8, remainingLength: 4 }
  
  bins.push(newBin)
}

bins = [
  { id: "bin_1", cuts: [8m], usedLength: 8, remainingLength: 4 }
]
```

**Process 6m segment:**
```typescript
placed = false

// Try bin_1
canPlaceInBin(bin_1, segment_6m)
  // Space check: 4 < 6 → false
  // return false

// No bin fits
if (!placed) {
  newBin = createNewBin()
  placeInBin(newBin, segment_6m)
  bins.push(newBin)
}

bins = [
  { id: "bin_1", cuts: [8m], usedLength: 8, remainingLength: 4 },
  { id: "bin_2", cuts: [6m], usedLength: 6, remainingLength: 6 }
]
```

**Process 5m segment:**
```typescript
placed = false

// Try bin_1
canPlaceInBin(bin_1, segment_5m)
  // Space check: 4 < 5 → false
  // return false

// Try bin_2
canPlaceInBin(bin_2, segment_5m)
  // Space check: 6 >= 5 → true
  // Multi-bar check: "2/B2/12_instance_0" not in bin → true
  // return true

placeInBin(bin_2, segment_5m)
placed = true
break // First Fit!

bins = [
  { id: "bin_1", cuts: [8m], usedLength: 8, remainingLength: 4 },
  { id: "bin_2", cuts: [6m, 5m], usedLength: 11, remainingLength: 1 }
]
```

**Process 4m segment:**
```typescript
placed = false

// Try bin_1
canPlaceInBin(bin_1, segment_4m)
  // Space check: 4 >= 4 → true
  // Multi-bar check: "3/B3/12_instance_0" not in bin → true
  // return true

placeInBin(bin_1, segment_4m)
placed = true
break // First Fit!

bins = [
  { id: "bin_1", cuts: [8m, 4m], usedLength: 12, remainingLength: 0 },
  { id: "bin_2", cuts: [6m, 5m], usedLength: 11, remainingLength: 1 }
]
```

**Process 3m segment:**
```typescript
placed = false

// Try bin_1
canPlaceInBin(bin_1, segment_3m)
  // Space check: 0 < 3 → false
  // return false

// Try bin_2
canPlaceInBin(bin_2, segment_3m)
  // Space check: 1 < 3 → false
  // return false

// No bin fits
if (!placed) {
  newBin = createNewBin()
  placeInBin(newBin, segment_3m)
  bins.push(newBin)
}

bins = [
  { id: "bin_1", cuts: [8m, 4m], usedLength: 12, remainingLength: 0 },
  { id: "bin_2", cuts: [6m, 5m], usedLength: 11, remainingLength: 1 },
  { id: "bin_3", cuts: [3m], usedLength: 3, remainingLength: 9 }
]
```

**Process 2m segment:**
```typescript
placed = false

// Try bin_1
canPlaceInBin(bin_1, segment_2m)
  // Space check: 0 < 2 → false
  // return false

// Try bin_2
canPlaceInBin(bin_2, segment_2m)
  // Space check: 1 < 2 → false
  // return false

// Try bin_3
canPlaceInBin(bin_3, segment_2m)
  // Space check: 9 >= 2 → true
  // Multi-bar check: "3/B3/12_instance_0" already in bin!
  // return false (Multi-bar constraint violated)

// No bin fits
if (!placed) {
  newBin = createNewBin()
  placeInBin(newBin, segment_2m)
  bins.push(newBin)
}

bins = [
  { id: "bin_1", cuts: [8m, 4m], usedLength: 12, remainingLength: 0 },
  { id: "bin_2", cuts: [6m, 5m], usedLength: 11, remainingLength: 1 },
  { id: "bin_3", cuts: [3m], usedLength: 3, remainingLength: 9 },
  { id: "bin_4", cuts: [2m], usedLength: 2, remainingLength: 10 }
]
```

#### Step 5: Convert to Patterns
```typescript
patterns = [
  { id: "pattern_1", cuts: [8m, 4m], waste: 0, utilization: 100 },
  { id: "pattern_2", cuts: [6m, 5m], waste: 1, utilization: 91.67 },
  { id: "pattern_3", cuts: [3m], waste: 9, utilization: 25 },
  { id: "pattern_4", cuts: [2m], waste: 10, utilization: 16.67 }
]
```

#### Step 6: Calculate Summary
```typescript
summary = {
  totalStandardBars: 4,
  totalWasteLength: 20.0,
  totalWastePercentage: 41.67,
  averageUtilization: 58.33,
  patternCount: 4,
  totalCutsProduced: 6
}
```

### Final Result

```typescript
result = {
  algorithm: "greedy",
  dia: 12,
  patterns: [
    { id: "pattern_1", cuts: [8m, 4m], waste: 0, utilization: 100 },
    { id: "pattern_2", cuts: [6m, 5m], waste: 1, utilization: 91.67 },
    { id: "pattern_3", cuts: [3m], waste: 9, utilization: 25 },
    { id: "pattern_4", cuts: [2m], waste: 10, utilization: 16.67 }
  ],
  totalBarsUsed: 4,
  totalWaste: 20.0,
  averageUtilization: 58.33,
  executionTime: 2.5,
  summary: { ... },
  detailedCuts: [ ... ]
}
```

**Note:** The multi-bar constraint prevented 3m and 2m from being in the same bin, even though there was space. This is correct because they're from the same parent bar (3/B3/12) and need to be joined together!

---

## 🔑 Key Takeaways

1. **Sorting is Critical**: Largest segments first leads to better packing
2. **First Fit is Fast**: Stops at first bin that works (not best bin)
3. **Multi-Bar Constraint**: Prevents segments from same parent being together
4. **Greedy Trade-off**: Speed vs optimality (fast but not perfect)
5. **Instance Tracking**: Unique IDs prevent constraint violations
6. **Position Tracking**: Detailed cuts show exact cutting positions
7. **Waste Calculation**: Remaining length after all cuts placed

The Greedy Algorithm provides an excellent balance of speed and quality for real-world cutting stock optimization!
