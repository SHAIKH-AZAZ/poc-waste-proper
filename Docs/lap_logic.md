# Lap Logic & Multi-Bar Calculation

This document explains how the application handles reinforced steel bars that exceed the standard stock length (typically 12 meters). Since physical bars cannot be infinite, longer requirements must be constructed by joining multiple standard bars using "Lap Splices" (overlapping sections).

## Core Concept
When a structural element requires a continuous bar length $L_{req}$ that is greater than the standard stock length $L_{stock}$ (12m), it is split into multiple physical segments. These segments overlap by a specific "Lap Length" to ensure structural continuity.

## Implementation Details

*   **Logic Handler**: `src/utils/multiBarCalculator.ts`
*   **Class**: `MultiBarCalculator`

### 1. Calculation Formula

The number of physical bars ($N$) required for a cutting length $L_{cut}$ having a lap length $L_{lap}$ is calculated as:

$$ N \ge \frac{L_{cut} - 12}{12 - L_{lap}} + 1 $$

Where:
*   **First Bar**: Contributes full 12m.
*   **Subsequent Bars**: Contribute $(12 - L_{lap})$ meters because $L_{lap}$ amount is used for the overlap.

**Total Material Length:**
$$ L_{total} = \sum (\text{Segment Lengths}) + (\text{Number of Laps} \times L_{lap}) $$

### 2. Segment Splitting Logic

The `calculateOptimalSegments` function determines strictly how the long bar is sliced.

*   **Strategy**: Maximize the use of the 12m stock bars.
*   **Intermediate Segments**:
    *   These are full 12m bars.
    *   **Effective Length** (Structural contribution): $12 - L_{lap}$
    *   **Cutting Length** (Physical steel needed): $12$
*   **Last Segment**:
    *   This is the remainder.
    *   **Effective Length**: Remaining required length.
    *   **Cutting Length**: Remaining required length (No lap at the far end).

### 3. "Effective" vs "Cutting" Length

The system distinguishes between two length types to ensure accurate cutting stock optimization:

| Term | Definition | Used For |
|------|------------|----------|
| **Effective Length** | The length the segment adds to the structural span. | Structural Engineering / Quantity checks |
| **Cutting Length** | The actual physical length of steel needed from the stock. | **Cutting Optimization Algorithm** |

**Crucial Logic Rule:**
> **Cutting Length = Effective Length + Lap Length**
> *(Except for the very last segment in the chain, where Cutting Length = Effective Length)*

### 4. Example Scenario

**Requirement:**
*   **Total Length needed**: 20 meters
*   **Lap Length**: 1 meter (1000mm)
*   **Stock Length**: 12 meters

**Step-by-Step Calculation:**
1.  **First Segment**:
    *   We carry a full standard bar (12m).
    *   Since it must connect to the next piece, we lose 1m to the overlap.
    *   **Structural Contribution**: 11m.
    *   **Remaining Need**: $20m - 11m = 9m$.

2.  **Second (Last) Segment**:
    *   We need 9m more of structural length.
    *   Since it's the end, we just cut exactly 9m.
    *   **Structural Contribution**: 9m.

**Resulting Cutting Instructions:**
*   **Bar 1**: Cut at **12.00m** (overlaps 1m with Bar 2).
*   **Bar 2**: Cut at **9.00m** (overlaps 1m with Bar 1).

**Total Steel Used**: $12m + 9m = 21m$.
(20m structural + 1m lap).

### 5. Data Structure

In the code, this is transformed into `BarSegment` objects before optimization:

```typescript
// Segment 1 (The 12m bar)
{
    segmentId: "Bar_A_seg_0",
    length: 12.0,        // Cutting Length (Max)
    effectiveLength: 11.0,
    lapLength: 1.0,
    hasLapEnd: true      // Needs to overlap with next
}

// Segment 2 (The 9m bar)
{
    segmentId: "Bar_A_seg_1",
    length: 9.0,         // Cutting Length
    effectiveLength: 9.0,
    lapLength: 0,
    hasLapEnd: false     // End of chain
}
```
