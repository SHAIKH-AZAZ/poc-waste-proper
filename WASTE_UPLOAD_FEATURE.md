# Manual Waste Upload Feature

## Overview
This feature allows users to manually upload existing waste materials to the inventory without needing to calculate them from a sheet. This is useful when you have leftover materials from previous projects or external sources.

## How It Works

### 1. Access the Feature
- Navigate to any project page
- Click on the "Waste Inventory" tab
- Click the "Upload Waste Materials" button (green button with recycle icon)

### 2. Add Waste Items
The modal allows you to add multiple waste pieces with the following fields:

- **Diameter (mm)**: The diameter of the rebar (e.g., 16, 20, 25mm)
- **Length (mm)**: The length of the waste piece in millimeters
  - Minimum: 2000mm (2 meters)
  - This matches the system's minimum reusable waste threshold
- **Quantity**: How many pieces of this size you have

### 3. Add Multiple Items
- Click "Add Another Waste Piece" to add more items
- Each item can have different diameter, length, and quantity
- Remove items using the trash icon

### 4. Review Summary
The modal shows:
- Total number of pieces
- Total combined length

### 5. Upload
- Click "Upload X Pieces" to add them to inventory
- All pieces will be marked as "available" status
- They will immediately be available for reuse in calculations

## Technical Implementation

### API Endpoint
**POST** `/api/waste/manual-upload`

**Request Body:**
```json
{
  "projectId": 1,
  "wasteItems": [
    {
      "dia": 16,
      "length": 2500,
      "quantity": 3
    },
    {
      "dia": 20,
      "length": 3000,
      "quantity": 2
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "created": 5,
  "waste": [...],
  "message": "Successfully added 5 waste pieces to inventory"
}
```

### Database Structure
- Creates a virtual "Manual Waste Upload" sheet for the project (if it doesn't exist)
- All manually uploaded waste is linked to this sheet
- `sourceBarNumber` is set to 0 to indicate manual upload
- `sourcePatternId` is set to "manual-upload"
- `mongoCutsOriginId` is null (no origin data)

### Validation Rules
1. Diameter must be > 0
2. Length must be >= 2000mm (WASTE_MIN_LENGTH_MM constant)
3. Quantity must be > 0
4. All fields are required

## Usage in Calculations

Once uploaded, these waste pieces:
- Appear in the waste inventory with "available" status
- Are grouped by diameter in the waste summary
- Can be selected for reuse when calculating new sheets
- Follow the same reuse logic as calculated waste
- Show "Manual Waste Upload" as the source sheet

## Benefits

1. **Flexibility**: Add waste from any source, not just calculations
2. **Inventory Management**: Track all available materials in one place
3. **Cost Savings**: Reuse existing materials across projects
4. **Easy Input**: Simple form-based interface
5. **Bulk Upload**: Add multiple pieces at once

## Example Use Cases

1. **Leftover Materials**: Add unused bars from completed projects
2. **External Sources**: Track waste received from other sites
3. **Inventory Correction**: Manually adjust inventory levels
4. **Initial Setup**: Populate inventory when starting to use the system

## UI Components

### WasteUploadModal Component
- Location: `src/components/customs/WasteUploadModal.tsx`
- Features:
  - Dynamic form with add/remove items
  - Real-time validation
  - Summary calculation
  - Error handling
  - Responsive design

### Integration Points
- Project page waste tab
- Accessible via "Upload Waste Materials" button
- Refreshes waste inventory after successful upload

## Future Enhancements

Possible improvements:
1. Excel/CSV bulk import for large quantities
2. Barcode scanning for quick entry
3. Photo upload for documentation
4. Location/storage tracking
5. Expiry date tracking
6. Quality/condition notes
