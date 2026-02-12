# MultiBarCalculator Logic

This utility handles the logic for splitting cutting requirements that exceed the standard stock length (12m). It calculates the number of bars needed and the precise cutting lengths for each segment, accounting for lap overlaps.

## Core Concept: "Effective Length"

When joining multiple bars, each overlap (lap) consumes material length without adding to the total effective span.

*   **Standard Bar Length:** 12m
*   **Lap Length:** Variable (e.g., 1m)
*   **Effective Length per Bar:** $12m - Lap Length$

### The Rule
*   **First & Middle Bars:** Effectively contribute $(12m - Lap)$ to the total span.
*   **Last Bar:** Contributes its full remaining length (up to 12m), as it needs no lap at the end.

---

## Example: 45m Requirement (1m Lap)

**Goal:** Create a continuous 45m bar.
**Constraints:** 12m stock bars, 1m lap length.

### Step 1: Calculate Requirements
*   **Effective Length per Bar:** $12m - 1m = 11m$
*   **Target:** 45m

We fill the target with "Effective Lengths":
1.  **Bar 1:** 11m effective (1m remaining for lap)
2.  **Bar 2:** +11m effective = 22m total
3.  **Bar 3:** +11m effective = 33m total
4.  **Bar 4:** Needed for the remaining $45 - 33 = 12m$

**Result:** 4 Bars Required.

### Step 2: Cutting Instructions

| Bar Order | Role | Effective Length (Span) | Lap Needed (Overlap) | **Actual Cut Length** |
| :--- | :--- | :--- | :--- | :--- |
| **1** | Start | 11.0m | 1.0m (End) | **12.0m** |
| **2** | Middle | 11.0m | 1.0m (End) | **12.0m** |
| **3** | Middle | 11.0m | 1.0m (End) | **12.0m** |
| **4** | End | 12.0m | 0.0m | **12.0m** |

*   **Total Material Used:** $4 \times 12m = 48m$
*   **Total Laps:** $3 \times 1m = 3m$
*   **Net Span:** $48m - 3m = 45m$ (Matches Goal)

---

## Code Explanation

This section maps the logic above to the actual functions in `src/utils/multiBarCalculator.ts`.

### 1. `calculateMultiBarRequirement`
Determines **how many bars** are needed.

```typescript
// Effective length is what actually contributes to the span
const effectiveLengthPerBar = this.STANDARD_LENGTH - lapLength; 

// How many "effective lengths" fit into the cutting length?
// Formula: (Target - 12) / Effective + 1
const subBarsRequired = Math.ceil(
  (cuttingLength - this.STANDARD_LENGTH) / effectiveLengthPerBar + 1
);
```

### 2. `calculateOptimalSegments`
Determines the **Effective Length** for each segment (the "Span" column in the table above).

```typescript
for (let i = 0; i < subBars; i++) {
  if (i === subBars - 1) {
    // Last segment: uses remaining length (No lap at end)
    segments.push(Math.min(remainingLength, this.STANDARD_LENGTH));
  } else {
    // All other segments: use effective length
    // e.g., for 12m bar with 1m lap, this pushes 11m
    segments.push(effectiveLengthPerBar);
    remainingLength -= effectiveLengthPerBar;
  }
}
```

### 3. `createSegments`
Converts **Effective Length** to **Actual Cutting Length** (the "Actual Cut Length" column).

```typescript
subBarInfo.segmentLengths.forEach((length, index) => {
  const isLastSegment = index === subBarInfo.segmentLengths.length - 1;

  // Last segment has NO lap, others have lap
  const segmentLapLength = isLastSegment ? 0 : lapLength;

  // Effective length (Span)
  const effectiveLength = length;
  
  // Cutting Length = Effective Length + Lap Length
  // e.g., 11m + 1m = 12m (The actual bar size to cut)
  const cuttingLength = effectiveLength + segmentLapLength;

  segments.push({
    // ...
    length: Math.min(cuttingLength, this.STANDARD_LENGTH), // Final cut length
    // ...
  });
});
```
