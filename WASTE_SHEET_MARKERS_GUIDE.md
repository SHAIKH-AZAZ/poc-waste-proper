# Waste Sheet Visual Markers Guide

## Overview
Waste-only sheets (OFFCUT files) are now automatically identified with visual markers to distinguish them from regular calculation sheets.

---

## Visual Indicators

### Regular Calculation Sheet
```
┌────────────────────────────────────────────────┐
│  ┌────┐                                        │
│  │ #1 │  BBS_converted_dia16.xlsx             │
│  └────┘                                        │
│  Blue Badge                                    │
│                                                │
│  📄 Feb 10, 10:42 PM                          │
│  5 calculations | 137 waste pieces            │
└────────────────────────────────────────────────┘
```

### Waste-Only Sheet (OFFCUT)
```
┌────────────────────────────────────────────────┐
│  ┌────┐                                        │
│  │ ♻️  │  OFFCUT L_T.xlsx  [♻️ WASTE ONLY]    │
│  └────┘                                        │
│  Amber Badge                                   │
│                                                │
│  📄 Feb 10, 10:42 PM                          │
│  ♻️ 10137 waste pieces                        │
└────────────────────────────────────────────────┘
```

---

## Detection Logic

Waste-only sheets are automatically identified by filename (case-insensitive):

### Triggers Waste Marker:
- ✅ Contains "**OFFCUT**"
- ✅ Contains "**waste**"
- ✅ Contains "**Manual Waste Upload**"

### Examples:
| Filename | Detected As |
|----------|-------------|
| OFFCUT L_T.xlsx | ♻️ Waste-Only |
| offcut_site_a.xlsx | ♻️ Waste-Only |
| Waste_Inventory.xlsx | ♻️ Waste-Only |
| waste_materials.xlsx | ♻️ Waste-Only |
| Manual Waste Upload | ♻️ Waste-Only |
| BBS_converted_dia16.xlsx | Regular Sheet |
| project_data.xlsx | Regular Sheet |

---

## Visual Differences

| Element | Regular Sheet | Waste-Only Sheet |
|---------|--------------|------------------|
| **Icon Badge** | #1 (Blue gradient) | ♻️ (Amber gradient) |
| **Badge Background** | Blue/Indigo | Amber/Orange |
| **Title Badge** | None | "WASTE ONLY" label |
| **Stats Display** | Calculations count | Waste pieces count |
| **Stats Color** | Slate gray | Amber/Orange |
| **Stats Icon** | None | ♻️ Recycle icon |

---

## Badge Components

### 1. Icon Badge (Left Side)
**Regular Sheet:**
- Background: Blue to Indigo gradient
- Content: Sheet number (#1, #2, etc.)
- Border: Indigo-100
- Size: 48×48px

**Waste-Only Sheet:**
- Background: Amber to Orange gradient
- Content: Recycle icon (♻️)
- Border: Amber-200
- Size: 48×48px

### 2. "WASTE ONLY" Label (Next to Title)
**Appearance:**
- Background: Amber-100 to Orange-100 gradient
- Text: Bold, uppercase "WASTE ONLY"
- Icon: Small recycle symbol
- Border: Amber-200
- Shadow: Subtle shadow
- Font size: Extra small (xs)

**Position:**
- Inline with filename
- Right side of title
- Flex-shrink to prevent overflow

### 3. Stats Display (Below Title)
**Regular Sheet:**
```
📄 Feb 10, 10:42 PM | 5 calculations | 137 waste pieces
```

**Waste-Only Sheet:**
```
📄 Feb 10, 10:42 PM | ♻️ 10137 waste pieces
```

---

## Color Scheme

### Regular Sheets
- Primary: Blue (#3B82F6)
- Secondary: Indigo (#6366F1)
- Background: Blue-50 to Indigo-50
- Border: Indigo-100

### Waste-Only Sheets
- Primary: Amber (#F59E0B)
- Secondary: Orange (#F97316)
- Background: Amber-100 to Orange-100
- Border: Amber-200
- Text: Amber-700

---

## User Benefits

### 1. Instant Recognition
- No need to read filename carefully
- Color-coded for quick scanning
- Icon provides immediate context

### 2. Reduced Confusion
- Clear distinction between sheet types
- Prevents accidental operations
- Better organization

### 3. Professional Appearance
- Consistent design language
- Polished UI/UX
- Industry-standard iconography

### 4. Improved Workflow
- Faster navigation
- Better inventory management
- Clear waste tracking

---

## Automatic Behavior

### On Upload
1. **Excel Upload (OFFCUT):**
   - File named "OFFCUT_*.xlsx"
   - Automatically gets waste markers
   - Shows in Sheets tab with amber badge

2. **Manual Waste Upload:**
   - Creates "Manual Waste Upload" sheet
   - Automatically gets waste markers
   - Shows in Sheets tab with amber badge

3. **Regular Sheet Upload:**
   - File named "BBS_*.xlsx" or similar
   - Shows as regular sheet
   - Blue badge with sheet number

### In Sheet List
- Waste sheets appear with amber styling
- Regular sheets appear with blue styling
- Both types can coexist in same project
- Sorting and filtering work normally

---

## Technical Implementation

### Detection Function
```typescript
const isWasteSheet = (fileName: string) => {
  const lowerName = fileName.toLowerCase();
  return lowerName.includes('offcut') || 
         lowerName.includes('waste') ||
         lowerName.includes('manual waste upload');
};
```

### Conditional Rendering
```typescript
{isWasteSheet(sheet.fileName) ? (
  // Amber badge with recycle icon
  <div className="bg-gradient-to-br from-amber-100 to-orange-100">
    <IconRecycle />
  </div>
) : (
  // Blue badge with sheet number
  <div className="bg-gradient-to-br from-blue-50 to-indigo-50">
    #{sheet.sheetNumber}
  </div>
)}
```

---

## Examples in Context

### Project with Mixed Sheets
```
Sheets Tab:

┌─────────────────────────────────────────────┐
│ #1  BBS_converted_dia16.xlsx               │
│     📄 Feb 10 | 5 calculations | 137 waste │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│ ♻️  OFFCUT L_T.xlsx  [♻️ WASTE ONLY]       │
│     📄 Feb 10 | ♻️ 10137 waste pieces      │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│ #2  BBS_waste_import_lap.xlsx              │
│     📄 Feb 10 | 3 calculations | 89 waste  │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│ ♻️  Manual Waste Upload  [♻️ WASTE ONLY]   │
│     📄 Feb 10 | ♻️ 45 waste pieces         │
└─────────────────────────────────────────────┘
```

---

## Customization

### To Add More Detection Keywords
Edit the detection logic in `src/app/project/[projectId]/page.tsx`:

```typescript
const isWasteSheet = 
  sheet.fileName.toLowerCase().includes('offcut') || 
  sheet.fileName.toLowerCase().includes('waste') ||
  sheet.fileName.toLowerCase().includes('manual waste upload') ||
  sheet.fileName.toLowerCase().includes('scrap') ||  // Add new keyword
  sheet.fileName.toLowerCase().includes('leftover'); // Add new keyword
```

### To Change Colors
Modify the Tailwind classes:
- `from-amber-100 to-orange-100` → Change gradient
- `text-amber-700` → Change text color
- `border-amber-200` → Change border color

---

## Accessibility

### Color Contrast
- Amber/Orange provides good contrast
- Text remains readable
- Icons supplement color coding

### Screen Readers
- Recycle icon has semantic meaning
- "WASTE ONLY" text is readable
- Stats are properly labeled

### Keyboard Navigation
- All interactive elements remain accessible
- Tab order is logical
- Focus states are visible

---

## FAQ

**Q: Can I manually mark a sheet as waste-only?**
A: Currently, it's based on filename. Rename the file to include "OFFCUT" or "waste".

**Q: What if my waste file has a different name?**
A: Include "offcut", "waste", or similar keywords in the filename.

**Q: Can I disable the markers?**
A: Not currently, but they only appear for waste-related filenames.

**Q: Do markers affect functionality?**
A: No, they're purely visual. All features work the same.

**Q: Can I have both types in one project?**
A: Yes! Projects can have both regular and waste-only sheets.

---

## Summary

✅ **Automatic Detection**: Based on filename keywords
✅ **Visual Distinction**: Amber badges and "WASTE ONLY" label
✅ **Clear Identification**: Recycle icons and color coding
✅ **Professional Design**: Consistent with app styling
✅ **User-Friendly**: Instant recognition, no confusion

The waste sheet markers provide clear visual identification, making it easy to distinguish between regular calculation sheets and waste-only inventory sheets at a glance.
