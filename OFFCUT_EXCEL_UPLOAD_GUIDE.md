# OFFCUT Excel Upload Guide

## Overview
Upload waste materials (OFFCUT) directly from Excel files. This feature allows you to bulk import existing waste inventory without manual data entry.

## How to Use

### Step 1: Navigate to Waste Upload
1. Go to your project page
2. Click on "Waste Inventory" tab
3. Click "Upload Waste Materials" button (green button with recycle icon)

### Step 2: Select Excel Upload Mode
1. Modal opens with two tabs: "Excel Upload" and "Manual Entry"
2. "Excel Upload" is selected by default
3. Click "Choose Excel File" button

### Step 3: Select Your OFFCUT File
1. Browse and select your Excel file (.xlsx or .xls)
2. File will upload automatically
3. System will parse and validate the data

### Step 4: Review Results
- Success message shows how many pieces were added
- Any validation errors are displayed
- Inventory refreshes automatically

## Excel File Format

### Required Columns

Your Excel file must have these columns (case-insensitive):

| Column Name | Description | Example | Rules |
|-------------|-------------|---------|-------|
| **Dia** or **Diameter** | Rebar diameter in mm | 16 | Must be > 0 |
| **Length** or **Cutting Length** | Piece length in mm | 4983 | Must be ≥ 2000mm |
| **Repetition** (Optional) | Number of pieces | 43 | Defaults to 1 if omitted |

### Example Excel Format with Repetition

```
| Dia | Cutting Length | Repetition |
|-----|----------------|------------|
| 16  | 4983           | 43         |
| 20  | 3000           | 25         |
| 16  | 4500           | 10         |
| 25  | 2200           | 5          |
```

**Result**: 43 + 25 + 10 + 5 = **83 waste pieces** created

### Example Excel Format without Repetition

```
| Dia | Length |
|-----|--------|
| 16  | 2500   |
| 20  | 3000   |
| 16  | 4500   |
| 25  | 2200   |
```

**Result**: **4 waste pieces** created (1 of each row)

### Alternative Column Names

The system automatically detects these variations:
- **Diameter columns**: "Dia", "Diameter", "DIA", "DIAMETER"
- **Length columns**: "Length", "Cutting Length", "SIZE", "length", "size"
- **Repetition columns**: "Repetition", "Repeat", "Quantity", "Qty", "Count", "No", "Number"

## Validation Rules

### Automatic Validation
✅ Diameter must be > 0
✅ Length must be ≥ 2000mm (2 meters)
✅ Repetition must be > 0 (defaults to 1 if omitted)
✅ Empty rows are automatically skipped
✅ Invalid rows are reported but don't stop the upload

### What Happens to Invalid Data
- Valid rows are imported
- Invalid rows are skipped
- You'll see a summary:
  - "Created: X pieces" (successfully imported)
  - "Skipped: Y rows" (validation errors)
  - List of specific errors (first 10 shown)

## Example Files

### Example 1: With Repetition (Recommended)
```excel
Dia | Cutting Length | Repetition
16  | 4983           | 43
20  | 3500           | 25
25  | 2800           | 10
16  | 5200           | 15
```
**Result**: 43 + 25 + 10 + 15 = **93 pieces** added

### Example 2: Without Repetition
```excel
Dia | Length
16  | 2500
16  | 3000
20  | 2800
20  | 4000
25  | 2200
```
**Result**: **5 pieces** added (1 of each row)

### Example 3: Mixed Valid/Invalid with Repetition
```excel
Dia | Length | Repetition
16  | 2500   | 10     ← Valid (creates 10 pieces)
20  | 1500   | 5      ← Invalid (too short, skipped)
25  | 3000   | 20     ← Valid (creates 20 pieces)
0   | 2500   | 5      ← Invalid (dia = 0, skipped)
16  | 4500   | 15     ← Valid (creates 15 pieces)
```
**Result**: 10 + 20 + 15 = **45 pieces** added, 2 rows skipped

### Example 4: Real-World OFFCUT with Repetition
```excel
Diameter | Cutting Length | Qty
16       | 4983           | 43
16       | 5234           | 28
20       | 3012           | 35
20       | 4123           | 22
25       | 2567           | 18
25       | 3456           | 12
```
**Result**: 43 + 28 + 35 + 22 + 18 + 12 = **158 pieces** added

## Common Issues & Solutions

### Issue: "Excel file is empty"
**Solution**: Make sure your Excel file has data rows (not just headers)

### Issue: "No valid waste items found"
**Solution**: 
- Check that lengths are ≥ 2000mm
- Check that diameters are > 0
- Verify column names match expected format

### Issue: "Invalid diameter" or "Invalid length"
**Solution**:
- Ensure values are numbers (not text)
- Remove any units (mm, m, etc.) from cells
- Check for empty cells

### Issue: File won't upload
**Solution**:
- Verify file format is .xlsx or .xls
- Check file isn't corrupted
- Try saving as a new Excel file

## Tips & Best Practices

### ✅ Do's
- Use simple column names: "Dia", "Cutting Length", "Repetition"
- Include Repetition column to avoid duplicate rows
- Keep data in first sheet of workbook
- Use numbers only (no text, no units)
- Measure lengths in millimeters
- Double-check measurements before upload
- Keep a backup of your Excel file
- Use Repetition for multiple identical pieces

### ❌ Don'ts
- Don't include units in cells (e.g., "2500mm")
- Don't use formulas (convert to values first)
- Don't merge cells
- Don't add extra header rows
- Don't use special characters in numbers

## After Upload

### What Happens Next
1. ✅ Waste pieces are added to inventory
2. ✅ Status is set to "available"
3. ✅ Pieces are grouped by diameter
4. ✅ Source is marked as "OFFCUT Upload"
5. ✅ Ready for reuse in calculations

### Viewing Uploaded Waste
1. Stay on Waste Inventory tab
2. Click on diameter card (e.g., "Dia 16mm")
3. See all pieces including OFFCUT uploads
4. OFFCUT pieces show:
   - Source: Your Excel filename
   - Bar #: 0 (indicates upload)
   - Status: Available

## Advanced Features

### Multiple Uploads
- You can upload multiple OFFCUT files
- Each upload is tracked separately
- All pieces go into the same inventory
- Duplicates are allowed (they're separate pieces)

### Large Files
- System handles hundreds of rows
- Upload may take a few seconds for large files
- Progress is shown during upload
- Validation happens in real-time

### Error Recovery
- Partial uploads are saved
- If 50 rows are valid and 10 invalid, the 50 are saved
- You can fix invalid rows and re-upload
- No risk of data loss

## Comparison: Excel vs Manual Entry

| Feature | Excel Upload | Manual Entry |
|---------|--------------|--------------|
| Speed | Fast (bulk) | Slower (one-by-one) |
| Best for | Many pieces | Few pieces |
| Data source | Existing spreadsheet | New data |
| Validation | Automatic | Real-time |
| Error handling | Batch report | Immediate |
| Quantity field | One per row | Supported |

## Sample Excel Template

Download or create an Excel file with this structure:

**With Repetition (Recommended):**
```
Sheet1:
┌─────┬────────────────┬────────────┐
│ Dia │ Cutting Length │ Repetition │
├─────┼────────────────┼────────────┤
│ 16  │ 4983           │ 43         │
│ 20  │ 3500           │ 25         │
│ 25  │ 2800           │ 10         │
│ 16  │ 5200           │ 15         │
└─────┴────────────────┴────────────┘
```

**Without Repetition (Simple):**
```
Sheet1:
┌─────┬────────┐
│ Dia │ Length │
├─────┼────────┤
│ 16  │ 2500   │
│ 16  │ 3000   │
│ 20  │ 2800   │
│ 20  │ 4000   │
│ 25  │ 2200   │
│ 25  │ 3500   │
└─────┴────────┘
```

## Troubleshooting

### Upload Fails Completely
1. Check file format (.xlsx or .xls)
2. Verify file isn't password-protected
3. Try opening file in Excel to check for corruption
4. Save as new file and try again
5. Check browser console for errors

### Some Rows Skipped
1. Review error messages
2. Check skipped rows in Excel
3. Fix validation issues
4. Re-upload just the fixed rows

### Wrong Data Imported
1. Check column order in Excel
2. Verify first row is headers
3. Ensure no merged cells
4. Check for hidden rows

## FAQ

**Q: Can I upload the same file twice?**
A: Yes, but it will create duplicate entries. Each row becomes a separate waste piece.

**Q: What if my Excel has more than 3 columns?**
A: Only Dia, Length, and Repetition columns are used. Extra columns are ignored.

**Q: What if I don't have a Repetition column?**
A: That's fine! Each row will create 1 piece. Add Repetition column to avoid duplicate rows.

**Q: Can I mix rows with and without repetition values?**
A: Yes! Rows without repetition values default to 1 piece.

**Q: Can I use meters instead of millimeters?**
A: No, always use millimeters. 2.5m should be entered as 2500.

**Q: What's the maximum file size?**
A: Typically up to 10MB or ~10,000 rows. Larger files may be slow.

**Q: Can I edit uploaded waste later?**
A: Not directly. You'd need to delete and re-upload.

**Q: Does it work with Google Sheets?**
A: Yes, but export to Excel format (.xlsx) first.

**Q: What if I have quantity information?**
A: Use the Repetition column! Example: Dia 16, Length 4983, Repetition 43 creates 43 pieces.

## Support

If you encounter issues:
1. Check this guide first
2. Verify Excel format matches examples
3. Try with a small test file (3-5 rows)
4. Check browser console for technical errors
5. Contact support with:
   - Screenshot of error
   - Sample of your Excel file
   - Number of rows in file

## Summary

✅ **Quick Upload**: Bulk import from Excel
✅ **Flexible Format**: Auto-detects column names
✅ **Smart Validation**: Skips invalid, imports valid
✅ **Error Reporting**: Clear feedback on issues
✅ **Immediate Availability**: Ready for reuse instantly

The Excel upload feature makes it easy to import existing waste inventory from spreadsheets, saving time compared to manual entry.
