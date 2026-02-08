# Cutting Stock Table Display Format

## Updated Table Structure

The cutting patterns table now displays **all cuts that fit in a single 12m bar**, grouped by their original BarCode.

### Example Display

```
┌────────┬─────────────────────────────────────────────┬───────────┬──────────────┐
│ Bar #  │ Cuts (BarCode → Length)                     │ Waste (m) │ Utilization  │
├────────┼─────────────────────────────────────────────┼───────────┼──────────────┤
│   1    │ 1/B1/12 → 5.750m                           │   0.500   │   95.83%     │
│        │ 2/S1/16 → 4.200m                           │           │              │
│        │ 3/D1/10 → 1.550m                           │           │              │
│        │ Total: 11.500m                              │           │              │
├────────┼─────────────────────────────────────────────┼───────────┼──────────────┤
│   2    │ 1/B1/12 → 5.750m ×2                        │   0.500   │   95.83%     │
│        │ Total: 11.500m                              │           │              │
├────────┼─────────────────────────────────────────────┼───────────┼──────────────┤
│   3    │ 4/M1/8 → 3.200m                            │   0.300   │   97.50%     │
│        │ 5/T1/12 → 4.500m                           │           │              │
│        │ 6/R1/10 → 4.000m                           │           │              │
│        │ Total: 11.700m                              │           │              │
└────────┴─────────────────────────────────────────────┴───────────┴──────────────┘
```

## Features

### 1. BarCode Display

- Shows the **original BarCode** (e.g., `1/B1/12`, `2/S1/16`)
- **Not** the segment ID (e.g., `1/B1/12_seg_0`)

### 2. Cutting Length

- Shows the **actual cutting length** for each BarCode
- Format: `BarCode → Length` (e.g., `1/B1/12 → 5.750m`)

### 3. Multiple Cuts per Bar

- If multiple different BarCodes fit in one 12m bar, they are **all listed**
- Each cut is shown on a separate line within the same cell

### 4. Quantity Indicator

- If the same BarCode appears multiple times in one bar: `×2`, `×3`, etc.
- Example: `1/B1/12 → 5.750m ×2` means two cuts of 5.750m from BarCode 1/B1/12

### 5. Lap Indicator

- Segments that require lap joints show a **LAP** badge
- Example: `1/B1/12 → 5.750m [LAP]`

### 6. Total Length

- Shows the **total length used** in that bar
- Only displayed when multiple different cuts are in the same bar

### 7. Visual Enhancements

- **Color-coded waste**: Red for high waste (>1m), green for low waste
- **Utilization bar**: Visual progress bar showing utilization percentage
- **Hover effects**: Rows highlight on hover for better readability

## Real-World Example

### Scenario: Dia 12 with 5 different cutting requirements

**Input Data:**

```
BarCode    | Cutting Length | Quantity
1/B1/12    | 5.750m        | 10
2/S1/12    | 4.200m        | 8
3/D1/12    | 3.150m        | 12
4/M1/12    | 2.500m        | 15
5/T1/12    | 1.800m        | 20
```

**Greedy Algorithm Output:**

```
Bar #1: 1/B1/12 → 5.750m
        2/S1/12 → 4.200m
        5/T1/12 → 1.800m
        Total: 11.750m | Waste: 0.250m | Utilization: 97.92%

Bar #2: 1/B1/12 → 5.750m
        3/D1/12 → 3.150m
        3/D1/12 → 3.150m (×2 total)
        Total: 12.050m | Waste: -0.050m | Utilization: 100%

Bar #3: 2/S1/12 → 4.200m
        2/S1/12 → 4.200m (×2 total)
        4/M1/12 → 2.500m
        Total: 10.900m | Waste: 1.100m | Utilization: 90.83%
```

## Benefits

1. **Clear Identification**: Easy to see which BarCodes are cut from each bar
2. **Material Tracking**: Can track material usage per BarCode
3. **Workshop Instructions**: Workers can easily understand cutting patterns
4. **Quality Control**: Easy to verify cuts against requirements
5. **Inventory Management**: Track which bars produce which components

## Technical Implementation

### Grouping Logic

```typescript
// Groups cuts by parent BarCode
const groups = new Map<string, { length: number; count: number }>();

for (const cut of cuts) {
  const existing = groups.get(cut.barCode);
  if (existing) {
    existing.count += cut.quantity;
  } else {
    groups.set(cut.barCode, {
      length: cut.length,
      count: cut.quantity
    });
  }
}
```

### Display Format

- **BarCode**: Blue, monospace font for easy reading
- **Arrow**: Visual separator (→)
- **Length**: Bold, 3 decimal places
- **Quantity**: Gray badge when > 1
- **Lap**: Orange badge when applicable
- **Total**: Shown at bottom when multiple cuts

This format provides maximum clarity for construction workers and project managers!
