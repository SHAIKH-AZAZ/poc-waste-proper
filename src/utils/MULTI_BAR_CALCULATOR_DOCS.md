# MultiBarCalculator.ts Explained

This document explains the logic behind `src/utils/multiBarCalculator.ts`. This utility class is responsible for splitting large cutting requirements (longer than standard 12m stock) into multiple manageable segments connected by lap joints.

## 🎯 Purpose

When a required bar length (e.g., 25m) exceeds the standard stock length (12m), it must be formed by joining multiple bars with overlaps (laps). This calculator determines:

1.  **How many bars** are needed.
2.  **How long** each bar should be cut.
3.  **Where the laps** are positioned.

## 🧮 Core Logic

### 1. The "Effective Length" Concept

A key concept is **Effective Length**. Because laps consume length for the overlap, a 12m bar does not contribute 12m to the total span if it has a lap.

*   **Standard Bar:** 12.0m
*   **Effective Length (with lap):** `12.0m - LapLength`

This means for every bar that needs to connect to the *next* bar, we lose some length to the lap.

### 2. Bar Splitting Rules

The calculation follows these rules:

*   **First Bar:** Maximum length (12m), contributes `12 - Lap` to the span.
*   **Middle Bars:** Maximum length (12m), contributes `12 - Lap` to the span.
*   **Last Bar:** Remaining length, contributes its full length (no lap at the end).

### 3. Formula for Number of Bars

To calculate the number of bars ($N$) required for a total length ($L$) with lap ($Lap$):

$$ N = \lceil \frac{L - 12}{12 - Lap} + 1 \rceil $$

Where:
*   $L - 12$: Remaining length after the first bar.
*   $12 - Lap$: Effective length of subsequent bars.

## 📝 Code Walkthrough

### `calculateMultiBarRequirement`

This is the main entry point.

```typescript
// Calculate effective length (what gets added to the total span per bar)
const effectiveLengthPerBar = this.STANDARD_LENGTH - lapLength;

// Calculate number of bars needed using the formula above
const subBarsRequired = Math.ceil(
  (cuttingLength - this.STANDARD_LENGTH) / effectiveLengthPerBar + 1
);
```

### `calculateOptimalSegments`

This helper function determines the **Effective Length** for each segment (the span it covers).

```typescript
// Loop through required number of bars
for (let i = 0; i < subBars; i++) {
  if (i === subBars - 1) {
    // LAST SEGMENT:
    // It takes whatever length is remaining.
    // No lap is needed at the end.
    segments.push(Math.min(remainingLength, this.STANDARD_LENGTH));
  } else {
    // ALL OTHER SEGMENTS (First & Middle):
    // They take the full effective length (12m - Lap).
    segments.push(effectiveLengthPerBar);
    remainingLength -= effectiveLengthPerBar;
  }
}
```

### `createSegments`

This function converts the "Effective Lengths" into actual **Cutting Instructions**.

*   **Input:** Effective Lengths (e.g., 11m, 11m, 5m for 28m total with 1m lap).
*   **Output:** Cutting Lengths (e.g., 12m, 12m, 5m).

```typescript
const isLastSegment = index === subBarInfo.segmentLengths.length - 1;

// Only last segment has NO lap at end. The rest need extra length for the lap.
const segmentLapLength = isLastSegment ? 0 : lapLength;

// Actual Cutting Length = Effective Span + Lap Length
// e.g., 11m effective + 1m lap = 12m physical cut
const cuttingLength = effectiveLength + segmentLapLength;
```

## 📊 Example: 45m Bar (1m Lap)

**Goal:** Create 45m continuous bar.
**Lap:** 1m.
**Effective Length:** `12m - 1m = 11m`.

| Bar # | Role | Effective Length (Span) | Lap Added (for connection) | **Total Cut Length** |
| :--- | :--- | :--- | :--- | :--- |
| **1** | Start | 11.0m | + 1.0m | **12.0m** |
| **2** | Middle | 11.0m | + 1.0m | **12.0m** |
| **3** | Middle | 11.0m | + 1.0m | **12.0m** |
| **4** | End | 12.0m | + 0.0m | **12.0m** |

*   **Total Span:** $11 + 11 + 11 + 12 = 45m$ ✅
*   **Total Material:** $12 + 12 + 12 + 12 = 48m$

## 📊 Example: 25.5m Bar (0.5m Lap)

**Goal:** Create 25.5m continuous bar.
**Lap:** 0.5m.
**Effective Length:** `12m - 0.5m = 11.5m`.

| Bar # | Role | Effective Length (Span) | Lap Added | **Total Cut Length** |
| :--- | :--- | :--- | :--- | :--- |
| **1** | Start | 11.5m | + 0.5m | **12.0m** |
| **2** | Middle | 11.5m | + 0.5m | **12.0m** |
| **3** | End | 2.5m | + 0.0m | **2.5m** |

*   **Total Span:** $11.5 + 11.5 + 2.5 = 25.5m$ ✅
*   **Total Material:** $12 + 12 + 2.5 = 26.5m$
