# Download All Diameters Feature

## Overview
Added functionality to calculate and export cutting stock results for ALL diameters in a single Excel file.

## Features

### 1. Download All Button
- Located in the Dia Filter section
- Only appears when there are 2+ diameters
- Purple button with icon: "📊 Download All Dias"
- Shows loading state during processing

### 2. Progress Tracking
- Real-time progress bar showing current diameter being processed
- Shows "Processing Dia X (Y of Z)"
- Percentage completion indicator
- Purple-themed progress display

### 3. Excel Export Structure

**Summary Sheet:**
- Overview of all diameters
- Comparison table with columns:
  - Dia
  - Greedy Bars
  - Greedy Waste (m)
  - Dynamic Bars
  - Dynamic Waste (m)
  - Best Algorithm

**Individual Sheets:**
- One sheet per diameter per algorithm
- Format: "Dia 8 - Greedy", "Dia 10 - Dynamic", etc.
- Same detailed format as single-dia export
- Columns: Bar #, BarCode, Effective Length, Lap Length, Waste, Utilization

### 4. Processing Flow

1. User clicks "Download All Dias" button
2. System gets all unique diameters from data
3. For each diameter:
   - Preprocesses data
   - Runs both algorithms in parallel (Web Workers)
   - Adds results to Excel workbook
   - Updates progress bar
4. Generates single Excel file with all results
5. Auto-downloads file

### 5. File Naming
Format: `cutting_stock_all_dias_[original_filename].xlsx`

Example: `cutting_stock_all_dias_project_data.xlsx`

## Benefits

1. **Time Saving** - Process all diameters at once
2. **Comprehensive** - All results in one file
3. **Comparison** - Easy to compare across diameters
4. **Professional** - Summary sheet for quick overview
5. **Organized** - Separate sheets for each dia/algorithm

## User Experience

### Before Processing
- Button shows: "📊 Download All Dias"
- Enabled and clickable

### During Processing
- Button shows: "Processing All Dias..." with spinner
- Button disabled (gray)
- Progress card appears showing:
  - Current diameter being processed
  - Progress bar (X of Y)
  - Percentage complete
  - Status message

### After Processing
- Excel file automatically downloads
- Progress card disappears
- Button returns to normal state
- Success!

## Technical Details

### Files Created/Modified
- `src/utils/exportAllDias.ts` - Export logic
- `src/components/customs/DiaFilter.tsx` - Download button
- `src/app/page.tsx` - State management and handlers

### Performance
- Uses Web Workers for parallel processing
- Each diameter processed sequentially
- Both algorithms (Greedy + Dynamic) run in parallel per diameter
- Typical time: 1-3 seconds per diameter

### Error Handling
- Errors shown in red banner
- Failed diameters marked as "ERROR" in summary
- Processing continues for remaining diameters
- Partial results still exported

## Example Output

### Summary Sheet
```
Dia | Greedy Bars | Greedy Waste | Dynamic Bars | Dynamic Waste | Best Algorithm
8   | 45          | 12.5m        | 43           | 10.2m         | Dynamic
10  | 67          | 18.3m        | 65           | 16.1m         | Dynamic
12  | 89          | 24.7m        | 87           | 22.4m         | Dynamic
```

### Individual Sheets
- Dia 8 - Greedy (detailed cutting patterns)
- Dia 8 - Dynamic (detailed cutting patterns)
- Dia 10 - Greedy (detailed cutting patterns)
- Dia 10 - Dynamic (detailed cutting patterns)
- ... and so on

## Use Cases

1. **Project Planning** - Get complete material requirements
2. **Cost Estimation** - Compare waste across all diameters
3. **Algorithm Comparison** - See which algorithm performs better per diameter
4. **Documentation** - Single file for project records
5. **Client Reports** - Professional presentation of results

## Future Enhancements

1. **Cancellation** - Allow user to cancel mid-process
2. **Selective Export** - Choose which diameters to include
3. **Format Options** - PDF, CSV, or JSON export
4. **Email Integration** - Send results via email
5. **Cloud Storage** - Save to Google Drive/Dropbox
