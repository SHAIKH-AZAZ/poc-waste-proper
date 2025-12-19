# Integration Guide - How to Use Database in Your App

## 🎯 Overview

This guide shows you how to integrate the database into your existing React components.

---

## 📝 Step 1: Update page.tsx

### Current Code (Without Database)
```typescript
export default function Home() {
  const [fileName, setFileName] = useState<string>("");
  const [displayData, setDisplayData] = useState<BarCuttingDisplay[] | null>(null);
  // ... other state
}
```

### Updated Code (With Database)
```typescript
"use client";
import { useState, useMemo, useCallback, useEffect } from "react";
import { useFileDatabase } from "@/hooks/useFileDatabase";
// ... other imports

export default function Home() {
  const [fileName, setFileName] = useState<string>("");
  const [displayData, setDisplayData] = useState<BarCuttingDisplay[] | null>(null);
  const [currentProjectId, setCurrentProjectId] = useState<number | null>(null);
  // ... other state

  // ============================================
  // NEW: Initialize database hook
  // ============================================
  const {
    projects,
    uploadFile,
    saveResult,
    fetchProjects,
    fetchResults,
    deleteProject
  } = useFileDatabase();

  // ============================================
  // NEW: Load projects on mount
  // ============================================
  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  // ============================================
  // UPDATED: handleDataParsed to save to database
  // ============================================
  const handleDataParsed = async (data: BarCuttingRaw[], name: string) => {
    // Existing code
    setParsedData(data);
    const transformed = transformToDisplayFormat(data);
    setDisplayData(transformed);
    setFileName(name);
    setSelectedDia(null);
    setGreedyResult(null);
    setDynamicResult(null);
    setGreedyProgress({ stage: "", percentage: 0 });
    setDynamicProgress({ stage: "", percentage: 0 });

    // NEW: Save to database
    if (currentProjectId === null) {
      console.log("[Page] Saving file to database...");
      // File is already saved by uploadFile in ExcelUploader
      // Just update local state
    }
  };

  // ============================================
  // UPDATED: handleDiaSelect to save results
  // ============================================
  const handleDiaSelect = useCallback(async (dia: number | null) => {
    setSelectedDia(dia);
    setGreedyResult(null);
    setDynamicResult(null);
    setGreedyProgress({ stage: "", percentage: 0 });
    setDynamicProgress({ stage: "", percentage: 0 });
    setCalculationError(null);

    if (dia !== null && displayData && currentProjectId) {
      setIsCalculating(true);
      
      try {
        const preprocessor = new CuttingStockPreprocessor();
        const requests = preprocessor.convertToCuttingRequests(displayData);
        
        console.log("[Page] Starting calculation with", requests.length, "requests for dia", dia);
        
        const workerManager = getWorkerManager();
        const { greedy: greedyRes, dynamic: dynamicRes } = await workerManager.runBoth(
          requests, 
          dia,
          {
            greedy: (stage, percentage) => {
              console.log("[Page] Greedy progress:", stage, percentage);
              setGreedyProgress({ stage, percentage });
            },
            dynamic: (stage, percentage) => {
              console.log("[Page] Dynamic progress:", stage, percentage);
              setDynamicProgress({ stage, percentage });
            }
          }
        );
        
        console.log("[Page] Calculation complete. Greedy:", greedyRes, "Dynamic:", dynamicRes);
        setGreedyResult(greedyRes);
        setDynamicResult(dynamicRes);

        // ============================================
        // NEW: Save results to database
        // ============================================
        console.log("[Page] Saving results to database...");
        
        // Save greedy result
        await saveResult(currentProjectId, "greedy", dia, greedyRes);
        console.log("[Page] Greedy result saved");

        // Save dynamic result
        await saveResult(currentProjectId, "dynamic", dia, dynamicRes);
        console.log("[Page] Dynamic result saved");

        // Fetch updated results
        await fetchResults(currentProjectId);
        console.log("[Page] Results fetched from database");

      } catch (error) {
        console.error("[Page] Error calculating cutting stock:", error);
        const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
        setCalculationError(errorMessage);
      } finally {
        setIsCalculating(false);
      }
    }
  }, [displayData, currentProjectId, saveResult, fetchResults]);

  // ... rest of component
}
```

---

## 📝 Step 2: Update ExcelUploader Component

### Current Code (Without Database)
```typescript
const handleFileUpload = async (acceptedFiles: File[]) => {
  const file = acceptedFiles[0];
  // Parse and return data
  const data = parseExcel(file);
  onDataParsed(data, file.name);
};
```

### Updated Code (With Database)
```typescript
import { useFileDatabase } from "@/hooks/useFileDatabase";

interface ExcelUploaderProps {
  onDataParsed: (data: BarCuttingRaw[], name: string, projectId: number) => void;
}

export default function ExcelUploader({ onDataParsed }: ExcelUploaderProps) {
  const { uploadFile } = useFileDatabase();
  const [uploading, setUploading] = useState(false);

  const handleFileUpload = async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    setUploading(true);

    try {
      // ============================================
      // NEW: Upload to database
      // ============================================
      const projectId = await uploadFile(file);
      
      if (!projectId) {
        throw new Error("Failed to upload file to database");
      }

      console.log("[ExcelUploader] File uploaded, projectId:", projectId);

      // Parse Excel locally
      const arrayBuffer = await file.arrayBuffer();
      const data = new Uint8Array(arrayBuffer);
      const workbook = XLSX.read(data, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(sheet, { defval: "" });

      // ============================================
      // NEW: Pass projectId to parent
      // ============================================
      onDataParsed(jsonData as BarCuttingRaw[], file.name, projectId);

    } catch (error) {
      console.error("[ExcelUploader] Error:", error);
      // Show error to user
    } finally {
      setUploading(false);
    }
  };

  return (
    // ... existing JSX
    // Add uploading state indicator
    {uploading && <div>Uploading to database...</div>}
  );
}
```

---

## 📝 Step 3: Update CuttingStockResults Component

### Current Code (Without Database)
```typescript
export default function CuttingStockResults({
  greedyResult,
  dynamicResult,
  isLoading,
  fileName
}: Props) {
  // Display results
}
```

### Updated Code (With Database)
```typescript
interface CuttingStockResultsProps {
  greedyResult: CuttingStockResult | null;
  dynamicResult: CuttingStockResult | null;
  isLoading: boolean;
  fileName: string;
  projectId: number;
  onResultsSaved?: () => void;
}

export default function CuttingStockResults({
  greedyResult,
  dynamicResult,
  isLoading,
  fileName,
  projectId,
  onResultsSaved
}: CuttingStockResultsProps) {
  const [saving, setSaving] = useState(false);
  const { saveResult } = useFileDatabase();

  const handleSaveResults = async () => {
    if (!greedyResult || !dynamicResult) return;

    setSaving(true);
    try {
      // Results are already saved in page.tsx
      // This is just for manual save if needed
      console.log("[Results] Results already saved to database");
      onResultsSaved?.();
    } finally {
      setSaving(false);
    }
  };

  return (
    // ... existing JSX
    // Add save button if needed
    {!isLoading && (
      <button onClick={handleSaveResults} disabled={saving}>
        {saving ? "Saving..." : "Save Results"}
      </button>
    )}
  );
}
```

---

## 🔄 Complete Data Flow

### 1. User Uploads File
```
User selects file
    ↓
ExcelUploader.handleFileUpload()
    ↓
uploadFile(file) → /api/upload
    ↓
PostgreSQL: Create Project
MongoDB: Store raw data
    ↓
Return projectId
    ↓
onDataParsed(data, name, projectId)
    ↓
page.tsx: setCurrentProjectId(projectId)
    ↓
Display data in table
```

### 2. User Selects Diameter
```
User clicks diameter
    ↓
handleDiaSelect(dia)
    ↓
Run algorithms in Web Workers
    ↓
Algorithms complete
    ↓
saveResult(projectId, "greedy", dia, greedyRes)
    ↓
/api/results → PostgreSQL + MongoDB
    ↓
saveResult(projectId, "dynamic", dia, dynamicRes)
    ↓
/api/results → PostgreSQL + MongoDB
    ↓
fetchResults(projectId)
    ↓
Display results
```

### 3. User Views Project History
```
fetchProjects()
    ↓
/api/projects → PostgreSQL
    ↓
Display all projects with result counts
    ↓
User clicks project
    ↓
fetchResults(projectId)
    ↓
/api/results → PostgreSQL + MongoDB
    ↓
Display results
```

---

## 🎯 Key Changes Summary

### In page.tsx
1. Import `useFileDatabase` hook
2. Call `fetchProjects()` on mount
3. Track `currentProjectId` state
4. Call `saveResult()` after calculation
5. Pass `projectId` to child components

### In ExcelUploader
1. Import `useFileDatabase` hook
2. Call `uploadFile()` instead of just parsing
3. Pass `projectId` to parent via `onDataParsed`
4. Show uploading state

### In CuttingStockResults
1. Accept `projectId` prop
2. Results are auto-saved from page.tsx
3. Optional: Add manual save button

---

## 💾 State Management

### Before (No Database)
```typescript
const [displayData, setDisplayData] = useState(null);
const [greedyResult, setGreedyResult] = useState(null);
const [dynamicResult, setDynamicResult] = useState(null);
// Data lost on refresh ❌
```

### After (With Database)
```typescript
const [displayData, setDisplayData] = useState(null);
const [greedyResult, setGreedyResult] = useState(null);
const [dynamicResult, setDynamicResult] = useState(null);
const [currentProjectId, setCurrentProjectId] = useState(null);

// Data persisted in database ✅
// Can reload anytime
// Can view history
```

---

## 🧪 Testing Integration

### Test 1: Upload File
1. Open app
2. Upload Excel file
3. Check console: `[ExcelUploader] File uploaded, projectId: 1`
4. Check PostgreSQL: `npx prisma studio` → Project record exists

### Test 2: Run Calculation
1. Select diameter
2. Check console: `[Page] Saving results to database...`
3. Check PostgreSQL: CalculationResult records exist
4. Check MongoDB: calculation_results collection has data

### Test 3: Reload Page
1. Refresh browser
2. Check console: `[useFileDatabase] Fetched X projects`
3. Projects list should show all previous uploads
4. Click project → Results should load from database

### Test 4: View History
1. Upload multiple files
2. Run calculations on different diameters
3. Check projects list
4. Each project should show result count
5. Click project → All results should load

---

## 🔍 Debugging

### Check Console Logs
```
[ExcelUploader] File uploaded, projectId: 1
[Page] Starting calculation...
[Page] Saving results to database...
[Page] Greedy result saved
[Page] Dynamic result saved
[Results] Fetched X results
```

### Check PostgreSQL
```bash
npx prisma studio
# View Project and CalculationResult tables
```

### Check MongoDB
```bash
# Using MongoDB Compass
db.excel_data.find()
db.calculation_results.find()
```

### Check Network Requests
```
Browser DevTools → Network tab
POST /api/upload
POST /api/results
GET /api/projects
GET /api/results
```

---

## ✅ Integration Checklist

- [ ] Import `useFileDatabase` in page.tsx
- [ ] Call `fetchProjects()` on mount
- [ ] Track `currentProjectId` state
- [ ] Update `handleDataParsed` to receive projectId
- [ ] Update `handleDiaSelect` to save results
- [ ] Update ExcelUploader to use `uploadFile()`
- [ ] Update ExcelUploader to pass projectId
- [ ] Update CuttingStockResults to accept projectId
- [ ] Test upload flow
- [ ] Test calculation flow
- [ ] Test reload persistence
- [ ] Test history viewing

---

## 🚀 Next Steps

1. **Update page.tsx** with database integration
2. **Update ExcelUploader** to use uploadFile()
3. **Update CuttingStockResults** to accept projectId
4. **Test all flows** (upload, calculate, reload, history)
5. **Add project management UI** (list, delete, view)
6. **Add result history UI** (compare, filter, export)

---

## 💡 Tips

1. **Keep console open** to see logs
2. **Use Prisma Studio** to verify data
3. **Check MongoDB Compass** for raw data
4. **Test reload** to verify persistence
5. **Check network tab** to see API calls

---

## 🎉 You're Ready!

All database files are created. Now integrate them into your React components using this guide!

Questions? Check DATABASE_SETUP_GUIDE.md for troubleshooting.

