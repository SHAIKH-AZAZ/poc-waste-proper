# Excel Data Flow & Export Process

## 📥 Input: Excel File Upload

### Step 1: Excel File Structure
Your Excel file should have these columns:

```
┌────────┬────────┬──────┬────────────┬─────────────────┬─────────────┬───────────┬─────────┐
│ SI no  │ Label  │ Dia  │ Total Bars │ Cutting Length  │ Lap Length  │ No of lap │ Element │
├────────┼────────┼──────┼────────────┼─────────────────┼─────────────┼───────────┼─────────┤
│   1    │  B1    │  12  │     50     │     5.750       │    0.480    │     2     │ Column  │
│   2    │  S1    │  16  │     30     │     4.200       │    0.640    │     1     │ Beam    │
│   3    │  D1    │  10  │     75     │     3.150       │    0.400    │     3     │ Slab    │
│   4    │  M1    │  12  │     20     │    15.500       │    0.480    │     0     │ Column  │
└────────┴────────┴──────┴────────────┴─────────────────┴─────────────┴───────────┴─────────┘
```

### Step 2: Upload & Parse
```
Excel File (.xlsx/.xls)
    ↓
FileUpload Component (drag/drop)
    ↓
ExcelUploader Component
    ↓
POST /api/upload (server-side)
    ↓
XLSX.read() → Parses Excel to JSON
    ↓
Returns: Raw JSON data
```

**Example Raw JSON:**
```json
[
  {
    "SI no": 1,
    "Label": "B1",
    "Dia": 12,
    "Total Bars": 50,
    "Cutting Length": 5.75,
    "Lap Length": 0.48,
    "No of lap": 2,
    "Element": "Column"
  },
  {
    "SI no": 2,
    "Label": "S1",
    "Dia": 16,
    "Total Bars": 30,
    "Cutting Length": 4.2,
    "Lap Length": 0.64,
    "No of lap": 1,
    "Element": "Beam"
  }
]
```

### Step 3: Data Transformation
```
Raw JSON
    ↓
sanitizeExcelData() → Validates & cleans data
    ↓
addBarCodeToData() → Generates BarCode (SI no/Label/Dia)
    ↓
transformToDisplayFormat() → Creates display structure
```

**Transformed Data:**
```json
[
  {
    "BarCode": "1/B1/12",
    "Dia": 12,
    "Total Bars": 50,
    "Cutting Length": 5.750,
    "Lap Length": 0.480,
    "Element": "Column"
  },
  {
    "BarCode": "2/S1/16",
    "Dia": 16,
    "Total Bars": 30,
    "Cutting Length": 4.200,
    "Lap Length": 0.640,
    "Element": "Beam"
  }
]
```

### Step 4: Multi-Bar Calculation (for lengths > 12m)
```
Row 4: Cutting Length = 15.5m (> 12m)
    ↓
MultiBarCalculator.calculateMultiBarRequirement()
    ↓
Sub-bars required: ceil(15.5/12) = 2 bars
Laps required: floor(15.5/12) = 1 lap
    ↓
Segments created:
  - Segment 0: 12m (with lap at end)
  - Segment 1: 3.5m (with lap at start)
```

## 📤 Output: Export Options

### Export Option 1: Display Data (JSON)
**Button:** "Download Results" in FileInfoCard

**What it exports:**
- The transformed display data (with BarCodes)
- Filtered by selected Dia (if any)

**Example Export:**
```json
[
  {
    "BarCode": "1/B1/12",
    "Dia": 12,
    "Total Bars": 50,
    "Cutting Length": 5.750,
    "Lap Length": 0.480,
    "Element": "Column"
  }
]
```

**File name:** `filename_Dia_12.json` or `filename.json`

### Export Option 2: Cutting Stock Results (JSON)
**Button:** "Export Results" in CuttingStockResults

**What it exports:**
- Both Greedy and Dynamic algorithm results
- Comparison statistics
- All cutting patterns
- Detailed cuts for each bar

**Example Export:**
```json
{
  "exportDate": "2025-01-04T10:30:00.000Z",
  "fileName": "construction_data.xlsx",
  "results": {
    "greedy": {
      "algorithm": "greedy",
      "dia": 12,
      "totalBarsUsed": 45,
      "totalWaste": 12.5,
      "averageUtilization": 97.7,
      "executionTime": 45.2,
      "patterns": [
        {
          "id": "pattern_1",
          "cuts": [
            {
              "segmentId": "1/B1/12_seg_0",
              "parentBarCode": "1/B1/12",
              "length": 5.750,
              "count": 2
            }
          ],
          "waste": 0.500,
          "utilization": 95.83
        }
      ],
      "detailedCuts": [
        {
          "patternId": "pattern_1",
          "barNumber": 1,
          "cuts": [
            {
              "barCode": "1/B1/12",
              "segmentId": "1/B1/12_seg_0",
              "length": 5.750,
              "quantity": 1,
              "position": 0,
              "hasLap": false
            },
            {
              "barCode": "1/B1/12",
              "segmentId": "1/B1/12_seg_0",
              "length": 5.750,
              "quantity": 1,
              "position": 5.750,
              "hasLap": false
            }
          ],
          "waste": 0.500,
          "utilization": 95.83
        }
      ]
    },
    "dynamic": {
      "algorithm": "dynamic",
      "dia": 12,
      "totalBarsUsed": 43,
      "totalWaste": 10.2,
      "averageUtilization": 98.0,
      "executionTime": 320.5,
      "patterns": [...],
      "detailedCuts": [...]
    }
  },
  "comparison": {
    "barsSaved": 2,
    "wasteSaved": 2.3,
    "utilizationImprovement": 0.3
  }
}
```

**File name:** `cutting_stock_filename_dia_12.json`

### Export Option 3: Cutting Instructions (CSV)
**Button:** "Export CSV" in each algorithm's detailed view

**What it exports:**
- Bar-by-bar cutting instructions
- Workshop-ready format
- Easy to print and use on-site

**Example CSV:**
```csv
Bar Number,BarCode,Segment ID,Length (m),Position (m),Has Lap,Waste (m),Utilization (%)
1,1/B1/12,1/B1/12_seg_0,5.750,0.000,No,0.500,95.83
1,1/B1/12,1/B1/12_seg_0,5.750,5.750,No,0.500,95.83
2,2/S1/16,2/S1/16_seg_0,4.200,0.000,No,0.300,97.50
2,3/D1/10,3/D1/10_seg_0,3.150,4.200,No,0.300,97.50
2,3/D1/10,3/D1/10_seg_0,3.150,7.350,No,0.300,97.50
3,4/M1/12,4/M1/12_seg_0,12.000,0.000,Yes,0.020,99.83
3,4/M1/12,4/M1/12_seg_1,3.500,0.000,Yes,0.020,99.83
```

**File name:** `cutting_instructions_greedy_filename_dia_12.csv`

## 🔄 Complete Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         EXCEL FILE UPLOAD                            │
└─────────────────────────────────────────────────────────────────────┘
                                  ↓
┌─────────────────────────────────────────────────────────────────────┐
│  STEP 1: Parse Excel → Raw JSON                                     │
│  - XLSX.read() converts Excel to JSON                               │
│  - Preserves all columns and data types                             │
└─────────────────────────────────────────────────────────────────────┘
                                  ↓
┌─────────────────────────────────────────────────────────────────────┐
│  STEP 2: Sanitize & Validate                                        │
│  - Convert types (strings to numbers)                               │
│  - Round Cutting Length & Lap Length to 3 decimals                  │
│  - Validate required fields                                         │
└─────────────────────────────────────────────────────────────────────┘
                                  ↓
┌─────────────────────────────────────────────────────────────────────┐
│  STEP 3: Generate BarCode                                           │
│  - Combine: SI no + "/" + Label + "/" + Dia                         │
│  - Example: "1/B1/12", "2/S1/16"                                    │
└─────────────────────────────────────────────────────────────────────┘
                                  ↓
┌─────────────────────────────────────────────────────────────────────┐
│  STEP 4: Transform to Display Format                                │
│  - Remove SI no, Label, No of lap columns                           │
│  - Keep: BarCode, Dia, Total Bars, Cutting Length, Lap Length,     │
│          Element                                                     │
└─────────────────────────────────────────────────────────────────────┘
                                  ↓
┌─────────────────────────────────────────────────────────────────────┐
│  STEP 5: Display in Table                                           │
│  - Show all data                                                     │
│  - Filter by Dia when selected                                      │
└─────────────────────────────────────────────────────────────────────┘
                                  ↓
┌─────────────────────────────────────────────────────────────────────┐
│  STEP 6: User Selects Dia Filter                                    │
│  - Triggers cutting stock calculation                               │
└─────────────────────────────────────────────────────────────────────┘
                                  ↓
┌─────────────────────────────────────────────────────────────────────┐
│  STEP 7: Multi-Bar Calculation (if length > 12m)                    │
│  - Calculate sub-bars: ceil(length/12)                              │
│  - Calculate laps: floor(length/12)                                 │
│  - Create segments with lap positions                               │
└─────────────────────────────────────────────────────────────────────┘
                                  ↓
┌─────────────────────────────────────────────────────────────────────┐
│  STEP 8: Run Optimization Algorithms                                │
│  - Greedy (First Fit Decreasing)                                    │
│  - Dynamic Programming                                               │
│  - Both run in parallel                                              │
└─────────────────────────────────────────────────────────────────────┘
                                  ↓
┌─────────────────────────────────────────────────────────────────────┐
│  STEP 9: Display Results                                            │
│  - Comparison summary                                                │
│  - Detailed cutting patterns                                         │
│  - Bar-by-bar instructions                                          │
└─────────────────────────────────────────────────────────────────────┘
                                  ↓
┌─────────────────────────────────────────────────────────────────────┐
│  STEP 10: Export Options                                            │
│  ├─ Export Results (JSON) - Full algorithm results                  │
│  ├─ Export CSV - Workshop cutting instructions                      │
│  └─ Download Results (JSON) - Display data                          │
└─────────────────────────────────────────────────────────────────────┘
```

## 📋 Export Functions Explained

### 1. `downloadResults()` - Display Data Export
**Location:** `src/utils/dataUtils.ts`

```typescript
export function downloadResults(parsedData: any, fileName: string): void {
  // Creates JSON blob from display data
  const blob = new Blob([JSON.stringify(parsedData, null, 2)], {
    type: "application/json",
  });
  
  // Creates download link
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${fileName || "data"}.json`;
  link.click();
  URL.revokeObjectURL(url);
}
```

**Use case:** Export the transformed display data (with BarCodes)

### 2. `exportCuttingStockResults()` - Algorithm Results Export
**Location:** `src/utils/cuttingStockExport.ts`

```typescript
export function exportCuttingStockResults(
  greedyResult: CuttingStockResult | null,
  dynamicResult: CuttingStockResult | null,
  fileName: string
): void {
  const exportData = {
    exportDate: new Date().toISOString(),
    fileName,
    results: {
      greedy: greedyResult,
      dynamic: dynamicResult,
    },
    comparison: {
      barsSaved: greedyResult.totalBarsUsed - dynamicResult.totalBarsUsed,
      wasteSaved: greedyResult.totalWaste - dynamicResult.totalWaste,
      utilizationImprovement: dynamicResult.averageUtilization - greedyResult.averageUtilization,
    }
  };
  
  // Creates JSON blob
  const blob = new Blob([JSON.stringify(exportData, null, 2)], {
    type: "application/json",
  });
  
  // Downloads file
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `cutting_stock_${fileName}_dia_${greedyResult?.dia}.json`;
  link.click();
  URL.revokeObjectURL(url);
}
```

**Use case:** Export complete optimization results with comparison

### 3. `exportCuttingInstructions()` - CSV Workshop Export
**Location:** `src/utils/cuttingStockExport.ts`

```typescript
export function exportCuttingInstructions(
  result: CuttingStockResult,
  fileName: string
): void {
  const csvRows: string[] = [];
  
  // Header
  csvRows.push(
    "Bar Number,BarCode,Segment ID,Length (m),Position (m),Has Lap,Waste (m),Utilization (%)"
  );
  
  // Data rows
  for (const detail of result.detailedCuts) {
    for (const cut of detail.cuts) {
      csvRows.push([
        detail.barNumber,
        cut.barCode,
        cut.segmentId,
        cut.length.toFixed(3),
        cut.position.toFixed(3),
        cut.hasLap ? "Yes" : "No",
        detail.waste.toFixed(3),
        detail.utilization.toFixed(2),
      ].join(","));
    }
  }
  
  // Create CSV blob
  const csvContent = csvRows.join("\n");
  const blob = new Blob([csvContent], { type: "text/csv" });
  
  // Download
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `cutting_instructions_${result.algorithm}_${fileName}_dia_${result.dia}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
```

**Use case:** Export workshop-ready cutting instructions in CSV format

## 🎯 Summary

### Input (Excel)
- **Format:** .xlsx or .xls
- **Columns:** SI no, Label, Dia, Total Bars, Cutting Length, Lap Length, No of lap, Element
- **Rows:** Your construction data (200-5000+ rows supported)

### Processing
1. Parse Excel to JSON
2. Validate and sanitize data
3. Generate BarCodes
4. Transform to display format
5. Calculate multi-bar requirements (if needed)
6. Run optimization algorithms (when Dia selected)

### Output (Exports)
1. **Display Data JSON** - Transformed data with BarCodes
2. **Cutting Stock JSON** - Complete optimization results
3. **Cutting Instructions CSV** - Workshop-ready format

All exports are **client-side** (no server upload), ensuring data privacy and fast downloads!
