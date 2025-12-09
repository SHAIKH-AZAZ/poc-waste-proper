# Export Buttons Guide

## 📥 Where to Find Export Buttons

### Button 1: Download Results (FileInfoCard)
**Location:** Top section, after uploading Excel file

```
┌─────────────────────────────────────────────────────────────┐
│  📂 File: construction_data.xlsx                            │
│                                                              │
│  150 rows, 6 columns                                        │
│  JSON Records: 150                                          │
│                                                              │
│  [Clear]  [⬇ Download Results]  ← THIS BUTTON              │
└─────────────────────────────────────────────────────────────┘
```

**What it exports:**
- The display data (with BarCodes)
- Filtered by selected Dia (if any)
- Format: JSON

**Example filename:** `construction_data_Dia_12.json`

**Content:**
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

---

### Button 2: Export Results (Cutting Stock Results)
**Location:** Top of Cutting Stock Optimization Results section

```
┌─────────────────────────────────────────────────────────────┐
│  📐 Cutting Stock Optimization Results  [📥 Export Results] │← THIS BUTTON
│                                                              │
│  ┌──────────────────┐  ┌──────────────────┐               │
│  │ Greedy Algorithm │  │ Dynamic Prog.    │               │
│  │ Bars: 45         │  │ Bars: 43         │               │
│  │ Waste: 12.5m     │  │ Waste: 10.2m     │               │
│  └──────────────────┘  └──────────────────┘               │
└─────────────────────────────────────────────────────────────┘
```

**What it exports:**
- Both algorithm results (Greedy + Dynamic)
- All cutting patterns
- Detailed cuts for each bar
- Comparison statistics
- Format: JSON

**Example filename:** `cutting_stock_construction_data_dia_12.json`

**Content:**
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
      "patterns": [...],
      "detailedCuts": [...]
    },
    "dynamic": {
      "algorithm": "dynamic",
      "dia": 12,
      "totalBarsUsed": 43,
      "totalWaste": 10.2,
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

---

### Button 3: Export CSV (Per Algorithm)
**Location:** In each algorithm's detailed view (when expanded)

```
┌─────────────────────────────────────────────────────────────┐
│  Greedy Algorithm - Details ▼                [📄 Export CSV]│← THIS BUTTON
│                                                              │
│  Total Bars: 45    Total Waste: 12.5m    Waste %: 2.3%     │
│                                                              │
│  Cutting Patterns (12m Standard Bars):                      │
│  ┌──────┬─────────────────────┬──────────┬──────────────┐  │
│  │ Bar# │ Cuts                │ Waste    │ Utilization  │  │
│  ├──────┼─────────────────────┼──────────┼──────────────┤  │
│  │  1   │ 1/B1/12 → 5.750m   │ 0.500m   │ 95.83%       │  │
│  │      │ 2/S1/16 → 4.200m   │          │              │  │
│  └──────┴─────────────────────┴──────────┴──────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

**What it exports:**
- Bar-by-bar cutting instructions
- Workshop-ready format
- One algorithm at a time
- Format: CSV (Excel-compatible)

**Example filename:** `cutting_instructions_greedy_construction_data_dia_12.csv`

**Content (CSV):**
```csv
Bar Number,BarCode,Segment ID,Length (m),Position (m),Has Lap,Waste (m),Utilization (%)
1,1/B1/12,1/B1/12_seg_0,5.750,0.000,No,0.500,95.83
1,2/S1/16,2/S1/16_seg_0,4.200,5.750,No,0.500,95.83
2,1/B1/12,1/B1/12_seg_0,5.750,0.000,No,0.500,95.83
2,1/B1/12,1/B1/12_seg_0,5.750,5.750,No,0.500,95.83
3,3/D1/10,3/D1/10_seg_0,3.150,0.000,No,0.300,97.50
3,3/D1/10,3/D1/10_seg_0,3.150,3.150,No,0.300,97.50
3,3/D1/10,3/D1/10_seg_0,3.150,6.300,No,0.300,97.50
```

---

## 🎯 When to Use Each Export

### Use "Download Results" when:
- ✅ You want the transformed data with BarCodes
- ✅ You need to share the filtered data
- ✅ You want to import into another system
- ✅ You need the original cutting requirements

### Use "Export Results" when:
- ✅ You want to compare both algorithms
- ✅ You need complete optimization analysis
- ✅ You want to save the calculation results
- ✅ You need detailed cutting patterns
- ✅ You want to document the optimization

### Use "Export CSV" when:
- ✅ You need workshop cutting instructions
- ✅ You want to print for workers
- ✅ You need Excel-compatible format
- ✅ You want bar-by-bar details
- ✅ You need one specific algorithm's results

---

## 📊 Export Comparison Table

| Feature | Download Results | Export Results | Export CSV |
|---------|-----------------|----------------|------------|
| **Format** | JSON | JSON | CSV |
| **Contains** | Display data | Algorithm results | Cutting instructions |
| **Algorithms** | N/A | Both (Greedy + Dynamic) | One at a time |
| **Use Case** | Data sharing | Analysis & documentation | Workshop instructions |
| **File Size** | Small | Large | Medium |
| **Excel Compatible** | No (JSON) | No (JSON) | Yes (CSV) |
| **Human Readable** | Medium | Low | High |
| **Machine Readable** | High | High | Medium |

---

## 💡 Pro Tips

### Tip 1: Sequential Export Workflow
```
1. Upload Excel file
2. Select Dia filter (e.g., Dia 12)
3. Wait for algorithms to complete
4. Export Results (JSON) - Save complete analysis
5. Export CSV (Greedy) - For workshop
6. Export CSV (Dynamic) - For comparison
```

### Tip 2: File Naming Convention
All exports include:
- Original filename
- Dia value (if filtered)
- Algorithm name (for CSV)
- Timestamp (for Results JSON)

Examples:
- `construction_data_Dia_12.json`
- `cutting_stock_construction_data_dia_12.json`
- `cutting_instructions_greedy_construction_data_dia_12.csv`
- `cutting_instructions_dynamic_construction_data_dia_12.csv`

### Tip 3: CSV Import to Excel
The CSV export can be opened directly in Excel:
1. Double-click the CSV file
2. Excel opens with proper columns
3. Use for printing or further analysis

### Tip 4: JSON Import to Other Systems
The JSON exports can be imported into:
- Database systems
- Other web applications
- Python/R for analysis
- Custom reporting tools

---

## 🔄 Complete Export Workflow Example

### Scenario: Construction Project with Multiple Diameters

**Step 1:** Upload Excel file with 500 rows, 5 different diameters

**Step 2:** Click "Download Results" → Get all data with BarCodes
```
File: project_data.json (all 500 rows)
```

**Step 3:** Select "Dia 12" filter → Algorithms run automatically

**Step 4:** Click "Export Results" → Get optimization analysis
```
File: cutting_stock_project_data_dia_12.json
Contains: Both algorithms, comparison, all patterns
```

**Step 5:** Expand "Greedy Algorithm" → Click "Export CSV"
```
File: cutting_instructions_greedy_project_data_dia_12.csv
Use: Give to workshop for cutting Dia 12 bars
```

**Step 6:** Expand "Dynamic Programming" → Click "Export CSV"
```
File: cutting_instructions_dynamic_project_data_dia_12.csv
Use: Compare with greedy, choose best approach
```

**Step 7:** Repeat for other diameters (Dia 16, Dia 10, etc.)

**Result:** Complete documentation for entire project!

---

## 📁 Export File Structure

### Display Data Export (JSON)
```
project_data_Dia_12.json
├─ Array of objects
│  ├─ BarCode: "1/B1/12"
│  ├─ Dia: 12
│  ├─ Total Bars: 50
│  ├─ Cutting Length: 5.750
│  ├─ Lap Length: 0.480
│  └─ Element: "Column"
```

### Cutting Stock Export (JSON)
```
cutting_stock_project_data_dia_12.json
├─ exportDate: "2025-01-04T10:30:00.000Z"
├─ fileName: "project_data.xlsx"
├─ results
│  ├─ greedy
│  │  ├─ algorithm: "greedy"
│  │  ├─ totalBarsUsed: 45
│  │  ├─ patterns: [...]
│  │  └─ detailedCuts: [...]
│  └─ dynamic
│     ├─ algorithm: "dynamic"
│     ├─ totalBarsUsed: 43
│     ├─ patterns: [...]
│     └─ detailedCuts: [...]
└─ comparison
   ├─ barsSaved: 2
   ├─ wasteSaved: 2.3
   └─ utilizationImprovement: 0.3
```

### Cutting Instructions Export (CSV)
```
cutting_instructions_greedy_project_data_dia_12.csv
├─ Header Row
│  └─ Bar Number, BarCode, Segment ID, Length (m), Position (m), Has Lap, Waste (m), Utilization (%)
└─ Data Rows
   ├─ 1, 1/B1/12, 1/B1/12_seg_0, 5.750, 0.000, No, 0.500, 95.83
   ├─ 1, 2/S1/16, 2/S1/16_seg_0, 4.200, 5.750, No, 0.500, 95.83
   └─ ...
```

---

This guide covers all export functionality in your cutting stock application!
