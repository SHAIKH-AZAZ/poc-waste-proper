# Excel Export Format Documentation

## 📊 Overview

The Excel export creates a `.xlsx` file with **3 sheets**:
1. **Greedy Algorithm** - Results from Greedy optimization
2. **Dynamic Programming** - Results from Dynamic Programming optimization
3. **Comparison** - Side-by-side comparison and recommendations

## 📋 Sheet 1 & 2: Algorithm Results

### Format: Vertical Layout (No Empty Cells)

Each bar's cuts are listed **vertically** (one cut per row), making it clean and easy to read.

### Column Structure:
```
Bar # | BarCode | Length (m) | Lap Length (m) | Waste (m) | Utilization (%)
```

### Example Data:

```
┌──────┬────────────┬────────────┬────────────────┬───────────┬─────────────────┐
│ Bar# │ BarCode    │ Length (m) │ Lap Length (m) │ Waste (m) │ Utilization (%) │
├──────┼────────────┼────────────┼────────────────┼───────────┼─────────────────┤
│  1   │ 1/B1/12    │   5.750    │      0         │   0.500   │     95.83       │
│      │ 2/S1/16    │   4.200    │      0         │           │                 │
│      │ 3/D1/10    │   1.550    │      0         │           │                 │
├──────┼────────────┼────────────┼────────────────┼───────────┼─────────────────┤
│  2   │ 4/M1/8     │   2.000    │      0         │   0.300   │     97.50       │
│      │ 5/T1/10    │   2.500    │      0         │           │                 │
│      │ 6/R1/12    │   2.300    │    0.480       │           │                 │
│      │ 7/P1/8     │   2.100    │      0         │           │                 │
│      │ 8/Q1/10    │   2.800    │      0         │           │                 │
├──────┼────────────┼────────────┼────────────────┼───────────┼─────────────────┤
│  3   │ 9/X1/12    │  12.000    │    0.480       │   0.000   │    100.00       │
└──────┴────────────┴────────────┴────────────────┴───────────┴─────────────────┘
```

### Key Features:

1. **Bar Number**
   - Shown only on the **first cut** of each bar
   - Empty for subsequent cuts of the same bar
   - Makes it easy to see which cuts belong to which bar

2. **BarCode**
   - Format: `SI no/Label/Dia` (e.g., `1/B1/12`)
   - Shows for **every cut**
   - Identifies the specific rebar requirement

3. **Length (m)**
   - Actual cutting length in meters
   - 3 decimal places precision
   - Shows for **every cut**

4. **Lap Length (m)**
   - `0` = No lap joint required
   - `0.480` (or other value) = Lap joint required with this length
   - Shows for **every cut**
   - Helps workers know which cuts need joining

5. **Waste (m)**
   - Remaining unused length from the 12m bar
   - Shown only on **first cut** of each bar
   - Empty for subsequent cuts

6. **Utilization (%)**
   - Percentage of bar used (0-100%)
   - Shown only on **first cut** of each bar
   - Empty for subsequent cuts

### Reading the Data:

**Bar #1:**
- Contains 3 cuts: `1/B1/12`, `2/S1/16`, `3/D1/10`
- Total used: 5.750 + 4.200 + 1.550 = 11.500m
- Waste: 0.500m (12.000 - 11.500)
- Utilization: 95.83%
- No lap joints needed (all lap lengths = 0)

**Bar #2:**
- Contains 5 cuts: `4/M1/8`, `5/T1/10`, `6/R1/12`, `7/P1/8`, `8/Q1/10`
- Total used: 2.000 + 2.500 + 2.300 + 2.100 + 2.800 = 11.700m
- Waste: 0.300m
- Utilization: 97.50%
- One lap joint: `6/R1/12` requires 0.480m lap

**Bar #3:**
- Contains 1 cut: `9/X1/12` (segment of multi-bar cut)
- Total used: 12.000m
- Waste: 0.000m
- Utilization: 100%
- Lap joint: 0.480m (ALL segments of multi-bar cuts have lap)

## 📊 Sheet 3: Comparison

### Part 1: Summary Comparison

```
┌──────────────────────────┬──────────────────┬─────────────────────┬────────────┐
│ Metric                   │ Greedy Algorithm │ Dynamic Programming │ Difference │
├──────────────────────────┼──────────────────┼─────────────────────┼────────────┤
│ Total Bars Used          │       45         │         43          │     -2     │
│ Total Waste (m)          │     12.500       │       10.200        │   -2.300   │
│ Average Utilization (%)  │     97.70        │       98.00         │   +0.30    │
│ Execution Time (ms)      │     45.20        │      320.50         │  +275.30   │
│ Pattern Count            │       45         │         43          │     -2     │
│ Waste Percentage (%)     │      2.30        │        2.00         │   -0.30    │
└──────────────────────────┴──────────────────┴─────────────────────┴────────────┘
```

### Part 2: Detailed Pattern Comparison

```
┌──────┬─────────────────────────────┬─────────────────────────────┬──────────────────┐
│ Bar# │ Greedy Cuts                 │ Dynamic Cuts                │ Difference       │
├──────┼─────────────────────────────┼─────────────────────────────┼──────────────────┤
│  1   │ 3 cuts, 0.500m waste       │ 3 cuts, 0.500m waste       │ 0.000m waste diff│
│  2   │ 5 cuts, 0.300m waste       │ 4 cuts, 0.200m waste       │ -0.100m waste diff│
│  3   │ 2 cuts, 0.800m waste       │ 3 cuts, 0.100m waste       │ -0.700m waste diff│
│ ...  │ ...                         │ ...                         │ ...              │
└──────┴─────────────────────────────┴─────────────────────────────┴──────────────────┘
```

### Part 3: Recommendation

```
┌─────────────────┬──────────────────────┬────────────────────────────────────────┐
│ Best Algorithm  │ Dynamic Programming  │ Saves 2 bars and 2.300m waste         │
└─────────────────┴──────────────────────┴────────────────────────────────────────┘
```

## 🎯 Use Cases

### For Workshop/Construction Site:
1. Open **Greedy Algorithm** or **Dynamic Programming** sheet
2. Print the sheet
3. Workers can see:
   - Which bar to cut (Bar #)
   - What to cut (BarCode)
   - How long to cut (Length)
   - Whether lap joint needed (Lap Length)
   - How much waste expected (Waste)

### For Project Management:
1. Open **Comparison** sheet
2. Review summary statistics
3. Choose best algorithm based on:
   - Material savings (bars used)
   - Waste reduction
   - Time constraints (execution time)

### For Quality Control:
1. Check each bar's utilization
2. Verify lap joints are properly marked
3. Ensure waste is within acceptable limits
4. Cross-reference with material orders

## 📥 Export Process

### Step 1: Select Diameter
Click on a Dia filter button (e.g., "Dia 12")

### Step 2: Wait for Calculation
Both algorithms run automatically

### Step 3: Export Excel
Click **"📊 Export Excel"** button

### Step 4: File Generated
File name: `cutting_stock_filename_dia_12.xlsx`

### Step 5: Open in Excel
- Double-click to open
- All 3 sheets available
- Ready to print or analyze

## 💡 Tips

### Printing:
- Set page orientation to **Landscape**
- Use **Fit to Page** for better readability
- Print **Greedy** or **Dynamic** sheet for workshop
- Print **Comparison** sheet for management

### Filtering in Excel:
- Use Excel's built-in filters on headers
- Filter by BarCode to find specific cuts
- Filter by Lap Length > 0 to see only lap joints
- Sort by Waste to find high-waste bars

### Calculations:
- Sum Waste column to verify total waste
- Average Utilization to check efficiency
- Count rows per Bar# to see cuts per bar

## 🔧 Technical Details

### File Format:
- **Extension:** `.xlsx`
- **Library:** SheetJS (xlsx)
- **Compatibility:** Excel 2007+, Google Sheets, LibreOffice

### Data Types:
- Bar #: Integer
- BarCode: Text
- Length: Number (3 decimals)
- Lap Length: Number (3 decimals)
- Waste: Number (3 decimals)
- Utilization: Number (2 decimals)

### Column Widths:
- Bar #: 8 characters
- BarCode: 15 characters
- Length: 12 characters
- Lap Length: 15 characters
- Waste: 12 characters
- Utilization: 15 characters

## 📋 Example Workflow

### Scenario: Construction project with Dia 12 rebars

1. **Upload Excel** with cutting requirements
2. **Select "Dia 12"** filter
3. **Wait** for algorithms to complete
4. **Click "Export Excel"**
5. **Open** `cutting_stock_project_dia_12.xlsx`
6. **Review Comparison** sheet → Dynamic saves 2 bars
7. **Print Dynamic Programming** sheet
8. **Give to workshop** for cutting
9. **Track progress** using Bar# column
10. **Verify** lap joints using Lap Length column

Result: Optimized cutting plan ready for execution!
