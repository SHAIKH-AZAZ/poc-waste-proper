# Quick Guide: Upload Waste Materials

## Step-by-Step Instructions

### Step 1: Navigate to Waste Inventory
```
Projects → Select Project → Waste Inventory Tab
```

### Step 2: Click Upload Button
Look for the green "Upload Waste Materials" button with the recycle icon.

### Step 3: Fill in Waste Details

**For each waste piece, enter:**

| Field | Description | Example | Rules |
|-------|-------------|---------|-------|
| Diameter | Rebar diameter in mm | 16 | Must be > 0 |
| Length | Piece length in mm | 2500 | Must be ≥ 2000mm |
| Quantity | Number of pieces | 3 | Must be > 0 |

### Step 4: Add More Items (Optional)
Click "Add Another Waste Piece" to add different sizes.

### Step 5: Review Summary
Check the summary box showing:
- Total pieces count
- Total length in meters

### Step 6: Upload
Click "Upload X Pieces" button to save to inventory.

## Example Scenarios

### Scenario 1: Single Type Waste
You have 5 pieces of 16mm diameter, each 2.5m long:

```
Diameter: 16mm
Length: 2500mm
Quantity: 5
```

Result: 5 pieces added, 12.5m total

### Scenario 2: Mixed Waste
You have various leftover pieces:

```
Item 1:
- Diameter: 16mm
- Length: 2500mm
- Quantity: 3

Item 2:
- Diameter: 20mm
- Length: 3000mm
- Quantity: 2

Item 3:
- Diameter: 16mm
- Length: 4000mm
- Quantity: 1
```

Result: 6 pieces added, 16.5m total

### Scenario 3: Large Inventory
You're setting up initial inventory with 20+ pieces:

1. Add first item
2. Click "Add Another Waste Piece"
3. Repeat for each unique size
4. Use quantity field for duplicates
5. Upload all at once

## Tips & Best Practices

### ✅ Do's
- Measure lengths accurately
- Group identical pieces using quantity field
- Double-check diameter values
- Review summary before uploading
- Upload regularly to keep inventory current

### ❌ Don'ts
- Don't add pieces < 2m (system won't accept)
- Don't forget to set quantity for multiple pieces
- Don't mix different diameters in one entry
- Don't upload damaged/unusable pieces

## After Upload

Your waste pieces will:
- ✓ Appear in waste inventory immediately
- ✓ Be grouped by diameter
- ✓ Show "available" status
- ✓ Be ready for reuse in calculations
- ✓ Display "Manual Waste Upload" as source

## Viewing Uploaded Waste

1. Stay on Waste Inventory tab
2. Click on the diameter card (e.g., "Dia 16mm")
3. See all pieces including manually uploaded ones
4. Manually uploaded pieces show:
   - Source: "Manual Waste Upload"
   - Bar #: 0
   - Status: Available

## Common Questions

**Q: What's the minimum length I can upload?**
A: 2000mm (2 meters). This matches the system's reusable waste threshold.

**Q: Can I upload waste from different projects?**
A: Yes, but upload to the correct project. Each project has its own inventory.

**Q: Can I edit uploaded waste later?**
A: Currently no. Delete and re-upload if needed.

**Q: Will this waste be used automatically?**
A: No. You'll be prompted to choose whether to use waste when calculating sheets.

**Q: Can I upload hundreds of pieces at once?**
A: Yes, but consider using the quantity field for identical pieces to simplify entry.

**Q: What if I make a mistake?**
A: Close the modal and start over, or contact support to delete incorrect entries.

## Keyboard Shortcuts

- `Tab`: Move to next field
- `Enter`: Submit form (when on Upload button)
- `Esc`: Close modal

## Validation Messages

| Message | Meaning | Solution |
|---------|---------|----------|
| "Min: 2000mm" | Length too short | Increase to at least 2000mm |
| "All items must have valid..." | Invalid data | Check all fields are filled correctly |
| "Missing required fields" | Empty fields | Fill in all diameter, length, quantity |

## Success Indicators

After successful upload:
- ✓ Modal closes automatically
- ✓ Waste inventory refreshes
- ✓ New pieces appear in summary
- ✓ Diameter cards update counts
- ✓ Total available length increases

## Need Help?

If you encounter issues:
1. Check validation messages
2. Ensure all fields are filled
3. Verify lengths are ≥ 2000mm
4. Try refreshing the page
5. Check browser console for errors
