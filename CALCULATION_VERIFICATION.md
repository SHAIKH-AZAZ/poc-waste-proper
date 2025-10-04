# Calculation Verification

## Test Case: 90m Cutting Length with 1m Lap

### Input

```
SI no: 1
Label: 20
Dia: 20
Total Bars: 10
Cutting Length: 90m
Lap Length: 1m
Element: Column
```

### Expected Calculation

#### Step 1: Calculate Sub-bars

```
Formula: n >= (cuttingLength - 12) / (12 - lapLength) + 1
n >= (90 - 12) / (12 - 1) + 1
n >= 78 / 11 + 1
n >= 7.09 + 1
n >= 8.09
n = 9 bars (round up)
```

#### Step 2: Calculate Laps

```
Laps = n - 1 = 9 - 1 = 8 laps
```

#### Step 3: Calculate Segment Lengths

```
Effective length per bar (except last) = 12 - 1 = 11m

Segment 0: 11m (effective)
Segment 1: 11m (effective)
Segment 2: 11m (effective)
Segment 3: 11m (effective)
Segment 4: 11m (effective)
Segment 5: 11m (effective)
Segment 6: 11m (effective)
Segment 7: 11m (effective)
Segment 8: 90 - (8 × 11) = 90 - 88 = 2m (last segment)

Total: 8 × 11 + 2 = 90m ✅
```

#### Step 4: Material Calculation

```
Total material = 9 bars × 12m = 108m
Effective length = 90m
Waste = 108 - 90 = 18m
```

#### Step 5: Lap Information

```
Segments 0-7: Have lap at end (lapLength = 1m)
Segment 8: NO lap (last segment, lapLength = 0)
```

### Expected Excel Export

```
Bar# | BarCode  | Length (m) | Lap Length (m) | Waste (m) | Utilization (%)
-----|----------|------------|----------------|-----------|----------------
1    | 1/20/20  | 11.000     | 1.000          | 1.000     | 91.67
2    | 1/20/20  | 11.000     | 1.000          | 1.000     | 91.67
3    | 1/20/20  | 11.000     | 1.000          | 1.000     | 91.67
4    | 1/20/20  | 11.000     | 1.000          | 1.000     | 91.67
5    | 1/20/20  | 11.000     | 1.000          | 1.000     | 91.67
6    | 1/20/20  | 11.000     | 1.000          | 1.000     | 91.67
7    | 1/20/20  | 11.000     | 1.000          | 1.000     | 91.67
8    | 1/20/20  | 11.000     | 1.000          | 1.000     | 91.67
9    | 1/20/20  | 2.000      | 0              | 10.000    | 16.67

(Pattern repeats 10 times for 10 bars)
```

### Summary for 10 Bars

```
Total segments: 9 segments × 10 bars = 90 segments
Total standard bars: 90 bars (12m each)
Total material: 90 × 12m = 1,080m
Total effective: 10 × 90m = 900m
Total waste: 1,080 - 900 = 180m
Average utilization: 900/1,080 = 83.33%
```

## Test Case 2: 15m Cutting Length with 0.5m Lap

### Input

```
Cutting Length: 15m
Lap Length: 0.5m
```

### Expected Calculation

#### Step 1: Calculate Sub-bars

```
n >= (15 - 12) / (12 - 0.5) + 1
n >= 3 / 11.5 + 1
n >= 0.26 + 1
n >= 1.26
n = 2 bars
```

#### Step 2: Calculate Segment Lengths

```
Segment 0: 11.5m (12 - 0.5)
Segment 1: 15 - 11.5 = 3.5m (last segment)

Total: 11.5 + 3.5 = 15m ✅
```

#### Step 3: Material & Waste

```
Material: 2 × 12m = 24m
Effective: 15m
Waste: 24 - 15 = 9m
```

#### Step 4: Lap Information

```
Segment 0: lapLength = 0.5m (has lap at end)
Segment 1: lapLength = 0 (last segment, no lap)
```

## Test Case 3: 8m Cutting Length (Single Bar)

### Input

```
Cutting Length: 8m
Lap Length: 0.5m (not used for single bar)
```

### Expected Calculation

#### Step 1: Check if Multi-bar

```
8m <= 12m → Single bar, no multi-bar calculation needed
```

#### Step 2: Result

```
Sub-bars: 1
Laps: 0
Segment 0: 8m (no lap)
Material: 12m
Effective: 8m
Waste: 12 - 8 = 4m
```

## Implementation Verification

### Key Points to Verify

1. ✅ **Sub-bar calculation**: Uses formula `n >= (L - 12) / (12 - lap) + 1`
2. ✅ **Segment lengths**: All except last = `12 - lapLength`
3. ✅ **Last segment**: Gets remaining length, NO lap
4. ✅ **Lap marking**: All segments except last have `lapLength > 0`
5. ✅ **Material calculation**: `n × 12m`
6. ✅ **Waste calculation**: `(n × 12) - cuttingLength`

### Files Updated

- `src/utils/multiBarCalculator.ts` - Correct sub-bar and segment calculation
- `src/algorithms/greedyCuttingStock.ts` - Correct lap marking
- `src/algorithms/dynamicCuttingStock.ts` - Correct lap marking

The implementation now correctly handles:

- Multi-bar cuts with proper lap logic
- Last segment has no lap
- Correct material and waste calculation
- Proper lap length display in Excel export
