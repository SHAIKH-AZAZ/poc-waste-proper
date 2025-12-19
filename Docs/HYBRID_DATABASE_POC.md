# Hybrid Database Strategy - POC (No Users)

## 🎯 Simplified Approach

Since this is a **POC with no users**, we only need:
- **PostgreSQL**: File metadata & project details
- **MongoDB**: Raw Excel data & calculation results

No authentication, no user management, just **file-centric storage**.

---

## 📊 Data Distribution

### PostgreSQL (File Metadata)
```
✅ Projects (file info, upload date, status)
✅ Calculation Results (metrics, summary)
✅ File References (links to MongoDB)
```

**Why PostgreSQL?**
- Structured file metadata
- Easy querying (list all projects, filter by date)
- Relationships between projects and results
- Good for dashboards/analytics

### MongoDB (Raw Data)
```
✅ Excel Raw Data (all rows, flexible schema)
✅ Detailed Patterns (nested structures)
✅ Cutting Details (variable fields)
✅ Historical Versions (versioning)
```

**Why MongoDB?**
- Excel data has variable columns
- Patterns are nested/complex
- Easy to store different Excel formats
- Good for archiving/versioning

---

## 🏗️ Simplified Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    React Frontend                       │
│  - Upload Excel                                         │
│  - View Projects                                        │
│  - Run Calculations                                     │
│  - View Results                                         │
└────────────────┬────────────────────────────────────────┘
                 │
        ┌────────┴────────┐
        │                 │
        ▼                 ▼
   PostgreSQL         MongoDB
   (Metadata)         (Raw Data)
        │                 │
   ┌────┴────┐       ┌────┴────┐
   │          │       │          │
   ▼          ▼       ▼          ▼
Projects  Results  ExcelData  Patterns
Metadata  Summary  (Raw)      (Detailed)
```

---

## 📋 Data Model

### PostgreSQL Schema (Simplified)

```sql
-- Projects table (file metadata)
CREATE TABLE projects (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  file_name VARCHAR(255),
  file_size INTEGER,
  upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  status VARCHAR(50),  -- 'uploaded', 'processing', 'completed'
  mongo_data_id VARCHAR(255),  -- Reference to MongoDB excel_data
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Calculation Results (metrics only)
CREATE TABLE calculation_results (
  id SERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  algorithm VARCHAR(50),
  dia INTEGER,
  total_bars_used INTEGER,
  total_waste DECIMAL(10, 3),
  average_utilization DECIMAL(5, 2),
  execution_time DECIMAL(10, 2),
  mongo_result_id VARCHAR(255),  -- Reference to MongoDB calculation_results
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_projects_upload_date ON projects(upload_date);
CREATE INDEX idx_results_project_id ON calculation_results(project_id);
CREATE INDEX idx_results_algorithm ON calculation_results(algorithm);
```

### MongoDB Collections (Simplified)

```javascript
// Excel Raw Data Collection
db.createCollection("excel_data", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["projectId", "data"],
      properties: {
        projectId: { bsonType: "int" },
        fileName: { bsonType: "string" },
        data: {
          bsonType: "array",
          items: { bsonType: "object" }  // Flexible schema
        },
        uploadedAt: { bsonType: "date" },
        version: { bsonType: "int" }
      }
    }
  }
});

// Calculation Results Collection
db.createCollection("calculation_results", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["projectId", "algorithm", "dia"],
      properties: {
        projectId: { bsonType: "int" },
        algorithm: { bsonType: "string" },
        dia: { bsonType: "int" },
        patterns: { bsonType: "array" },
        detailedCuts: { bsonType: "array" },
        createdAt: { bsonType: "date" }
      }
    }
  }
});
```

---

## 🔌 Implementation

### Step 1: Prisma Schema

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Project {
  id              Int     @id @default(autoincrement())
  name            String
  description     String?
  fileName        String?
  fileSize        Int?
  uploadDate      DateTime @default(now())
  status          String  @default("uploaded")  // uploaded, processing, completed
  mongoDataId     String?  // Reference to MongoDB excel_data
  results         CalculationResult[]
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@index([uploadDate])
}

model CalculationResult {
  id                  Int     @id @default(autoincrement())
  projectId           Int
  project             Project @relation(fields: [projectId], references: [id], onDelete: Cascade)
  algorithm           String
  dia                 Int
  totalBarsUsed       Int
  totalWaste          Decimal @db.Decimal(10, 3)
  averageUtilization  Decimal @db.Decimal(5, 2)
  executionTime       Decimal @db.Decimal(10, 2)
  mongoResultId       String?  // Reference to MongoDB calculation_results
  createdAt           DateTime @default(now())

  @@index([projectId])
  @@index([algorithm])
}
```

### Step 2: MongoDB Client

```typescript
// src/lib/mongodb.ts

import { MongoClient, Db } from "mongodb";

let cachedClient: MongoClient | null = null;
let cachedDb: Db | null = null;

export async function connectToDatabase() {
  if (cachedClient && cachedDb) {
    return { client: cachedClient, db: cachedDb };
  }

  const client = new MongoClient(process.env.MONGODB_URI!);
  await client.connect();

  const db = client.db(process.env.MONGODB_DB);

  cachedClient = client;
  cachedDb = db;

  return { client, db };
}

export async function getMongoDb() {
  const { db } = await connectToDatabase();
  return db;
}
```

### Step 3: API Route - Upload Excel

```typescript
// src/app/api/upload/route.ts

import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { PrismaClient } from "@prisma/client";
import { getMongoDb } from "@/lib/mongodb";

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "No file uploaded" },
        { status: 400 }
      );
    }

    // Parse Excel file
    const arrayBuffer = await file.arrayBuffer();
    const data = new Uint8Array(arrayBuffer);
    const workbook = XLSX.read(data, { type: "array" });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(sheet, { defval: "" });

    // ============================================
    // STEP 1: Create Project in PostgreSQL
    // ============================================
    const project = await prisma.project.create({
      data: {
        name: file.name.replace(".xlsx", ""),
        fileName: file.name,
        fileSize: file.size,
        status: "uploaded"
      }
    });

    // ============================================
    // STEP 2: Store Raw Excel Data in MongoDB
    // ============================================
    const db = await getMongoDb();
    const excelDataCollection = db.collection("excel_data");

    const mongoResult = await excelDataCollection.insertOne({
      projectId: project.id,
      fileName: file.name,
      data: jsonData,
      uploadedAt: new Date(),
      version: 1
    });

    // ============================================
    // STEP 3: Update Project with MongoDB Reference
    // ============================================
    await prisma.project.update({
      where: { id: project.id },
      data: {
        mongoDataId: mongoResult.insertedId.toString()
      }
    });

    return NextResponse.json({
      success: true,
      projectId: project.id,
      fileName: file.name,
      recordCount: jsonData.length,
      message: "File uploaded successfully"
    });

  } catch (err: unknown) {
    console.error(err);
    return NextResponse.json(
      { error: "Failed to process file" },
      { status: 500 }
    );
  }
}
```

### Step 4: API Route - Get Projects

```typescript
// src/app/api/projects/route.ts

import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// GET all projects
export async function GET(req: NextRequest) {
  try {
    const projects = await prisma.project.findMany({
      include: {
        results: {
          select: {
            id: true,
            algorithm: true,
            dia: true,
            totalBarsUsed: true,
            totalWaste: true
          }
        }
      },
      orderBy: { uploadDate: "desc" }
    });

    return NextResponse.json({
      success: true,
      projects: projects.map(p => ({
        ...p,
        resultCount: p.results.length
      }))
    });

  } catch (err: unknown) {
    console.error(err);
    return NextResponse.json(
      { error: "Failed to fetch projects" },
      { status: 500 }
    );
  }
}

// DELETE project
export async function DELETE(req: NextRequest) {
  try {
    const projectId = req.nextUrl.searchParams.get("projectId");

    if (!projectId) {
      return NextResponse.json(
        { error: "projectId required" },
        { status: 400 }
      );
    }

    // Delete from PostgreSQL (cascades to results)
    await prisma.project.delete({
      where: { id: parseInt(projectId) }
    });

    // Delete from MongoDB
    const db = await getMongoDb();
    const project = await prisma.project.findUnique({
      where: { id: parseInt(projectId) }
    });

    if (project?.mongoDataId) {
      await db.collection("excel_data").deleteOne({
        _id: new ObjectId(project.mongoDataId)
      });
    }

    return NextResponse.json({
      success: true,
      message: "Project deleted"
    });

  } catch (err: unknown) {
    console.error(err);
    return NextResponse.json(
      { error: "Failed to delete project" },
      { status: 500 }
    );
  }
}
```

### Step 5: API Route - Save Results

```typescript
// src/app/api/results/route.ts

import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getMongoDb } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import type { CuttingStockResult } from "@/types/CuttingStock";

const prisma = new PrismaClient();

// POST - Save calculation result
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      projectId,
      algorithm,
      dia,
      result
    }: {
      projectId: number;
      algorithm: string;
      dia: number;
      result: CuttingStockResult;
    } = body;

    if (!projectId || !algorithm || !result) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // ============================================
    // STEP 1: Store Detailed Data in MongoDB
    // ============================================
    const db = await getMongoDb();
    const resultsCollection = db.collection("calculation_results");

    const mongoResult = await resultsCollection.insertOne({
      projectId,
      algorithm,
      dia,
      patterns: result.patterns,
      detailedCuts: result.detailedCuts,
      createdAt: new Date()
    });

    // ============================================
    // STEP 2: Store Metadata in PostgreSQL
    // ============================================
    const pgResult = await prisma.calculationResult.create({
      data: {
        projectId,
        algorithm,
        dia,
        totalBarsUsed: result.totalBarsUsed,
        totalWaste: result.totalWaste,
        averageUtilization: result.averageUtilization,
        executionTime: result.executionTime,
        mongoResultId: mongoResult.insertedId.toString()
      }
    });

    // Update project status
    await prisma.project.update({
      where: { id: projectId },
      data: { status: "completed" }
    });

    return NextResponse.json({
      success: true,
      resultId: pgResult.id,
      message: "Result saved successfully"
    });

  } catch (err: unknown) {
    console.error(err);
    return NextResponse.json(
      { error: "Failed to save result" },
      { status: 500 }
    );
  }
}

// GET - Fetch results for a project
export async function GET(req: NextRequest) {
  try {
    const projectId = req.nextUrl.searchParams.get("projectId");
    const algorithm = req.nextUrl.searchParams.get("algorithm");

    if (!projectId) {
      return NextResponse.json(
        { error: "projectId required" },
        { status: 400 }
      );
    }

    // ============================================
    // STEP 1: Get Metadata from PostgreSQL
    // ============================================
    const where: any = { projectId: parseInt(projectId) };
    if (algorithm) {
      where.algorithm = algorithm;
    }

    const pgResults = await prisma.calculationResult.findMany({
      where,
      orderBy: { createdAt: "desc" }
    });

    // ============================================
    // STEP 2: Get Detailed Data from MongoDB
    // ============================================
    const db = await getMongoDb();
    const resultsCollection = db.collection("calculation_results");

    const enrichedResults = await Promise.all(
      pgResults.map(async (pgResult) => {
        if (!pgResult.mongoResultId) {
          return pgResult;
        }

        const mongoData = await resultsCollection.findOne({
          _id: new ObjectId(pgResult.mongoResultId)
        });

        return {
          ...pgResult,
          patterns: mongoData?.patterns || [],
          detailedCuts: mongoData?.detailedCuts || []
        };
      })
    );

    return NextResponse.json({
      success: true,
      results: enrichedResults
    });

  } catch (err: unknown) {
    console.error(err);
    return NextResponse.json(
      { error: "Failed to fetch results" },
      { status: 500 }
    );
  }
}
```

### Step 6: API Route - Get Excel Data

```typescript
// src/app/api/excel-data/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getMongoDb } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export async function GET(req: NextRequest) {
  try {
    const mongoDataId = req.nextUrl.searchParams.get("mongoDataId");

    if (!mongoDataId) {
      return NextResponse.json(
        { error: "mongoDataId required" },
        { status: 400 }
      );
    }

    const db = await getMongoDb();
    const excelDataCollection = db.collection("excel_data");

    const data = await excelDataCollection.findOne({
      _id: new ObjectId(mongoDataId)
    });

    if (!data) {
      return NextResponse.json(
        { error: "Data not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: data.data,
      uploadedAt: data.uploadedAt,
      version: data.version
    });

  } catch (err: unknown) {
    console.error(err);
    return NextResponse.json(
      { error: "Failed to fetch data" },
      { status: 500 }
    );
  }
}
```

### Step 7: React Hook - File Management

```typescript
// src/hooks/useFileDatabase.ts

import { useState, useCallback } from "react";
import type { CuttingStockResult } from "@/types/CuttingStock";

interface Project {
  id: number;
  name: string;
  fileName?: string;
  fileSize?: number;
  uploadDate: Date;
  status: string;
  mongoDataId?: string;
  resultCount: number;
}

interface CalculationResult {
  id: number;
  algorithm: string;
  dia: number;
  totalBarsUsed: number;
  totalWaste: number;
  averageUtilization: number;
  executionTime: number;
  createdAt: Date;
}

export function useFileDatabase() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [results, setResults] = useState<CalculationResult[]>([]);
  const [excelData, setExcelData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch all projects
  const fetchProjects = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/projects");
      const data = await response.json();
      if (data.success) {
        setProjects(data.projects);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch projects");
    } finally {
      setLoading(false);
    }
  }, []);

  // Upload file
  const uploadFile = useCallback(async (file: File) => {
    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData
      });

      const data = await response.json();
      if (data.success) {
        // Refresh projects list
        await fetchProjects();
        return data.projectId;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload file");
    }
  }, [fetchProjects]);

  // Save result
  const saveResult = useCallback(
    async (
      projectId: number,
      algorithm: string,
      dia: number,
      result: CuttingStockResult
    ) => {
      try {
        const response = await fetch("/api/results", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            projectId,
            algorithm,
            dia,
            result
          })
        });

        const data = await response.json();
        if (data.success) {
          // Refresh projects to update status
          await fetchProjects();
          return data.resultId;
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to save result");
      }
    },
    [fetchProjects]
  );

  // Fetch results for project
  const fetchResults = useCallback(
    async (projectId: number, algorithm?: string) => {
      setLoading(true);
      try {
        let url = `/api/results?projectId=${projectId}`;
        if (algorithm) {
          url += `&algorithm=${algorithm}`;
        }

        const response = await fetch(url);
        const data = await response.json();
        if (data.success) {
          setResults(data.results);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch results");
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // Fetch Excel data
  const fetchExcelData = useCallback(
    async (mongoDataId: string) => {
      setLoading(true);
      try {
        const response = await fetch(`/api/excel-data?mongoDataId=${mongoDataId}`);
        const data = await response.json();
        if (data.success) {
          setExcelData(data.data);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch excel data");
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // Delete project
  const deleteProject = useCallback(
    async (projectId: number) => {
      try {
        const response = await fetch(`/api/projects?projectId=${projectId}`, {
          method: "DELETE"
        });

        const data = await response.json();
        if (data.success) {
          await fetchProjects();
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to delete project");
      }
    },
    [fetchProjects]
  );

  return {
    projects,
    results,
    excelData,
    loading,
    error,
    fetchProjects,
    uploadFile,
    saveResult,
    fetchResults,
    fetchExcelData,
    deleteProject
  };
}
```

---

## 🔄 Data Flow

```
1. Upload Excel File
   ↓
   PostgreSQL: Create Project record
   MongoDB: Store raw Excel data
   ↓
   Return projectId + mongoDataId

2. Run Calculations
   ↓
   Fetch Excel data from MongoDB
   Run algorithms
   ↓
   PostgreSQL: Save result metrics
   MongoDB: Store detailed patterns
   ↓
   Update project status to "completed"

3. View Results
   ↓
   PostgreSQL: Get all projects (fast)
   PostgreSQL: Get result metrics (fast)
   MongoDB: Get detailed patterns (on demand)
   ↓
   Display in UI

4. Delete Project
   ↓
   PostgreSQL: Delete project + results (cascades)
   MongoDB: Delete excel_data + calculation_results
   ↓
   Clean up complete
```

---

## 📊 What Goes Where

| Data | Storage | Reason |
|------|---------|--------|
| **Project name** | PostgreSQL | Metadata, queryable |
| **File name** | PostgreSQL | Metadata, queryable |
| **Upload date** | PostgreSQL | Metadata, sortable |
| **Status** | PostgreSQL | Metadata, filterable |
| **Excel raw data** | MongoDB | Flexible schema, variable columns |
| **Result metrics** | PostgreSQL | Queryable, indexed |
| **Patterns** | MongoDB | Nested structures, complex |
| **Detailed cuts** | MongoDB | Variable fields, large |

---

## 🚀 Setup Steps

### 1. Install Dependencies
```bash
npm install @prisma/client prisma mongodb
npm install -D prisma
```

### 2. Environment Variables
```bash
# .env.local
DATABASE_URL="postgresql://user:password@localhost:5432/cutting_stock"
MONGODB_URI="mongodb+srv://user:password@cluster.mongodb.net/cutting_stock"
MONGODB_DB="cutting_stock"
```

### 3. Setup PostgreSQL
```bash
npx prisma init
# Copy schema from above
npx prisma migrate dev --name init
```

### 4. Create API Routes
```bash
# Copy all API routes from above
src/app/api/upload/route.ts
src/app/api/projects/route.ts
src/app/api/results/route.ts
src/app/api/excel-data/route.ts
```

### 5. Create React Hook
```bash
# Copy useFileDatabase.ts
src/hooks/useFileDatabase.ts
```

### 6. Update Main Component
```typescript
// src/app/page.tsx
import { useFileDatabase } from "@/hooks/useFileDatabase";

export default function Home() {
  const {
    projects,
    uploadFile,
    saveResult,
    fetchProjects,
    fetchResults
  } = useFileDatabase();

  useEffect(() => {
    fetchProjects();
  }, []);

  // Use in component...
}
```

---

## ✅ Benefits for POC

- ✅ **Simple**: No user management
- ✅ **Flexible**: Excel data varies, MongoDB handles it
- ✅ **Fast**: PostgreSQL for queries, MongoDB for storage
- ✅ **Scalable**: Can add users later without major changes
- ✅ **Persistent**: Data survives page refresh
- ✅ **Organized**: Metadata separate from raw data

---

## 🎯 Summary

**PostgreSQL stores:**
- Project metadata (name, file, upload date, status)
- Result metrics (bars used, waste %, execution time)
- References to MongoDB data

**MongoDB stores:**
- Raw Excel data (flexible schema)
- Detailed patterns (nested structures)
- Calculation details (variable fields)

**Connected via:**
- `mongoDataId` in Project
- `mongoResultId` in CalculationResult

This is **perfect for a POC** and scales beautifully when you add users later!

