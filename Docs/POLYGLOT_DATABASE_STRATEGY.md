# Polyglot Database Strategy - PostgreSQL + MongoDB

## 🎯 Overview

Using **PostgreSQL for structured data** and **MongoDB for flexible/document data** is a proven pattern called "Polyglot Persistence". This gives you the best of both worlds.

---

## 📊 Data Distribution Strategy

### PostgreSQL (Structured Data)
```
✅ Projects (project metadata)
✅ Users (authentication, profiles)
✅ Calculation Results (structured metrics)
✅ Relationships & Transactions
```

**Why PostgreSQL?**
- Strong relationships (User → Project → Results)
- ACID transactions
- Complex queries
- Data integrity
- Perfect for metadata

### MongoDB (Flexible Data)
```
✅ Excel Raw Data (flexible schema)
✅ Cutting Data (variable fields)
✅ Detailed Patterns (nested structures)
✅ Historical Data (versioning)
```

**Why MongoDB?**
- Flexible schema (Excel data varies)
- Nested documents (patterns, cuts)
- Easy versioning
- Fast writes
- Perfect for raw/unstructured data

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    React Frontend                       │
│  - Upload Excel                                         │
│  - Create Projects                                      │
│  - Run Calculations                                     │
│  - View Results                                         │
└────────────────┬────────────────────────────────────────┘
                 │
        ┌────────┴────────┐
        │                 │
        ▼                 ▼
   PostgreSQL         MongoDB
   (Structured)       (Flexible)
        │                 │
   ┌────┴────┐       ┌────┴────┐
   │          │       │          │
   ▼          ▼       ▼          ▼
 Users    Projects  RawData   Patterns
 Results  Metadata  CuttingData HistoricalData
```

---

## 📋 Data Model

### PostgreSQL Schema

```sql
-- Users table
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Projects table
CREATE TABLE projects (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  excel_file_name VARCHAR(255),
  mongo_data_id VARCHAR(255),  -- Reference to MongoDB
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Calculation Results (metadata only)
CREATE TABLE calculation_results (
  id SERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES projects(id),
  algorithm VARCHAR(50),
  dia INTEGER,
  total_bars_used INTEGER,
  total_waste DECIMAL(10, 3),
  average_utilization DECIMAL(5, 2),
  execution_time DECIMAL(10, 2),
  mongo_result_id VARCHAR(255),  -- Reference to MongoDB
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_projects_user_id ON projects(user_id);
CREATE INDEX idx_results_project_id ON calculation_results(project_id);
```

### MongoDB Collections

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
          items: {
            bsonType: "object",
            properties: {
              siNo: { bsonType: "string" },
              label: { bsonType: "string" },
              dia: { bsonType: "int" },
              totalBars: { bsonType: "int" },
              cuttingLength: { bsonType: "double" },
              lapLength: { bsonType: "double" },
              noOfLap: { bsonType: "int" },
              element: { bsonType: "string" },
              barcode: { bsonType: "string" }
            }
          }
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
        metadata: {
          bsonType: "object",
          properties: {
            totalBarsUsed: { bsonType: "int" },
            totalWaste: { bsonType: "double" },
            averageUtilization: { bsonType: "double" },
            executionTime: { bsonType: "double" }
          }
        },
        createdAt: { bsonType: "date" }
      }
    }
  }
});

// Historical Data Collection (for versioning)
db.createCollection("data_history", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      properties: {
        projectId: { bsonType: "int" },
        version: { bsonType: "int" },
        data: { bsonType: "object" },
        changedAt: { bsonType: "date" },
        changedBy: { bsonType: "string" }
      }
    }
  }
});
```

---

## 🔌 Implementation

### Step 1: Install Dependencies

```bash
npm install @prisma/client prisma
npm install mongodb mongoose
npm install dotenv
```

### Step 2: Environment Variables

```bash
# .env.local

# PostgreSQL
DATABASE_URL="postgresql://user:password@localhost:5432/cutting_stock"

# MongoDB
MONGODB_URI="mongodb+srv://user:password@cluster.mongodb.net/cutting_stock"
MONGODB_DB="cutting_stock"
```

### Step 3: Prisma Schema (PostgreSQL)

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id        Int     @id @default(autoincrement())
  email     String  @unique
  name      String?
  projects  Project[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model Project {
  id              Int     @id @default(autoincrement())
  userId          Int
  user            User    @relation(fields: [userId], references: [id], onDelete: Cascade)
  name            String
  description     String?
  excelFileName   String?
  mongoDataId     String?  // Reference to MongoDB excel_data
  results         CalculationResult[]
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@index([userId])
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

### Step 4: MongoDB Client Setup

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

### Step 5: API Route - Upload Excel (Hybrid)

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
    const projectId = formData.get("projectId") as string;
    const userId = formData.get("userId") as string;

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
    // STEP 1: Create/Get Project in PostgreSQL
    // ============================================
    let project;
    if (projectId) {
      project = await prisma.project.findUnique({
        where: { id: parseInt(projectId) }
      });
    } else {
      project = await prisma.project.create({
        data: {
          userId: parseInt(userId),
          name: file.name.replace(".xlsx", ""),
          description: `Uploaded on ${new Date().toLocaleDateString()}`,
          excelFileName: file.name
        }
      });
    }

    if (!project) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }

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
      mongoDataId: mongoResult.insertedId.toString(),
      recordCount: jsonData.length
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

### Step 6: API Route - Save Results (Hybrid)

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
      metadata: {
        totalBarsUsed: result.totalBarsUsed,
        totalWaste: result.totalWaste,
        averageUtilization: result.averageUtilization,
        executionTime: result.executionTime
      },
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

    return NextResponse.json({
      success: true,
      resultId: pgResult.id,
      mongoResultId: mongoResult.insertedId.toString()
    });

  } catch (err: unknown) {
    console.error(err);
    return NextResponse.json(
      { error: "Failed to save result" },
      { status: 500 }
    );
  }
}

// GET - Fetch results with details
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

### Step 7: API Route - Get Excel Data

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

### Step 8: React Hook - Hybrid Database

```typescript
// src/hooks/useHybridDatabase.ts

import { useState, useCallback } from "react";
import type { CuttingStockResult } from "@/types/CuttingStock";

interface Project {
  id: number;
  name: string;
  mongoDataId?: string;
  createdAt: Date;
}

interface CalculationResult {
  id: number;
  algorithm: string;
  dia: number;
  totalBarsUsed: number;
  mongoResultId?: string;
  createdAt: Date;
}

export function useHybridDatabase(userId: number) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [results, setResults] = useState<CalculationResult[]>([]);
  const [excelData, setExcelData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch projects from PostgreSQL
  const fetchProjects = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/projects?userId=${userId}`);
      const data = await response.json();
      if (data.success) {
        setProjects(data.projects);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch projects");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Create project in PostgreSQL
  const createProject = useCallback(
    async (name: string, description?: string) => {
      try {
        const response = await fetch("/api/projects", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId, name, description })
        });
        const data = await response.json();
        if (data.success) {
          setProjects([data.project, ...projects]);
          return data.project;
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to create project");
      }
    },
    [userId, projects]
  );

  // Save result (hybrid: metadata in PostgreSQL, details in MongoDB)
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
          return data.resultId;
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to save result");
      }
    },
    []
  );

  // Fetch results from PostgreSQL + MongoDB
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

  // Fetch Excel data from MongoDB
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

  return {
    projects,
    results,
    excelData,
    loading,
    error,
    fetchProjects,
    createProject,
    saveResult,
    fetchResults,
    fetchExcelData
  };
}
```

---

## 🎯 Data Flow Diagram

```
┌─────────────────────────────────────────────────────────┐
│                    React Component                      │
│  1. Upload Excel                                        │
│  2. Create Project                                      │
│  3. Run Calculations                                    │
│  4. Save Results                                        │
└────────────────┬────────────────────────────────────────┘
                 │
        ┌────────┴────────┐
        │                 │
        ▼                 ▼
   /api/upload        /api/results
        │                 │
        ├─────────────────┤
        │                 │
        ▼                 ▼
   PostgreSQL         MongoDB
        │                 │
   ┌────┴────┐       ┌────┴────┐
   │          │       │          │
   ▼          ▼       ▼          ▼
 Project   Result   ExcelData  Patterns
 Metadata  Metadata  (Raw)     (Detailed)
           (Metrics)
```

---

## 📊 Comparison: PostgreSQL vs MongoDB

| Data Type | Storage | Reason |
|-----------|---------|--------|
| **Users** | PostgreSQL | Relational, authentication |
| **Projects** | PostgreSQL | Structured metadata |
| **Result Metrics** | PostgreSQL | Queryable, indexed |
| **Excel Raw Data** | MongoDB | Flexible schema, versioning |
| **Patterns** | MongoDB | Nested structures, complex |
| **Detailed Cuts** | MongoDB | Variable fields, large |
| **History** | MongoDB | Versioning, audit trail |

---

## ✅ Benefits of Hybrid Approach

### PostgreSQL Benefits
- ✅ Strong relationships (User → Project → Result)
- ✅ ACID transactions
- ✅ Complex queries
- ✅ Data integrity
- ✅ Efficient indexing

### MongoDB Benefits
- ✅ Flexible schema (Excel data varies)
- ✅ Nested documents (patterns, cuts)
- ✅ Easy versioning
- ✅ Fast writes
- ✅ Horizontal scaling

### Combined Benefits
- ✅ Best of both worlds
- ✅ Structured + Flexible
- ✅ Relational + Document
- ✅ Queryable + Scalable
- ✅ Transactional + Flexible

---

## 🚀 Setup Steps

### 1. Install Dependencies
```bash
npm install @prisma/client prisma mongodb
npm install -D prisma
```

### 2. Setup Environment
```bash
# .env.local
DATABASE_URL="postgresql://user:password@localhost:5432/cutting_stock"
MONGODB_URI="mongodb+srv://user:password@cluster.mongodb.net/cutting_stock"
MONGODB_DB="cutting_stock"
```

### 3. Create Prisma Schema
```bash
npx prisma init
# Copy schema from above
npx prisma migrate dev --name init
```

### 4. Create MongoDB Collections
```bash
# Use MongoDB Compass or mongosh
# Run collection creation scripts from above
```

### 5. Create API Routes
```bash
# Copy API routes from above
# src/app/api/upload/route.ts
# src/app/api/results/route.ts
# src/app/api/excel-data/route.ts
```

### 6. Create React Hook
```bash
# Copy useHybridDatabase.ts
# src/hooks/useHybridDatabase.ts
```

---

## 💡 Query Examples

### Get Project with Excel Data
```typescript
// Fetch from PostgreSQL
const project = await prisma.project.findUnique({
  where: { id: 1 }
});

// Fetch from MongoDB
const excelData = await db.collection("excel_data").findOne({
  _id: new ObjectId(project.mongoDataId)
});

// Combined result
const fullProject = {
  ...project,
  excelData: excelData.data
};
```

### Get Results with Details
```typescript
// Fetch metadata from PostgreSQL
const results = await prisma.calculationResult.findMany({
  where: { projectId: 1 }
});

// Fetch details from MongoDB
const detailedResults = await Promise.all(
  results.map(async (r) => ({
    ...r,
    patterns: (await db.collection("calculation_results").findOne({
      _id: new ObjectId(r.mongoResultId)
    }))?.patterns
  }))
);
```

---

## 🔐 Security Considerations

### Data Isolation
```typescript
// Always verify user owns project
const project = await prisma.project.findUnique({
  where: { id: projectId }
});

if (project?.userId !== session.user.id) {
  throw new Error("Unauthorized");
}
```

### MongoDB Validation
```typescript
// Use schema validation in MongoDB
db.createCollection("excel_data", {
  validator: { /* schema */ }
});
```

---

## 📈 Scaling Strategy

### PostgreSQL Scaling
- ✅ Read replicas for queries
- ✅ Connection pooling
- ✅ Indexes on foreign keys
- ✅ Partitioning for large tables

### MongoDB Scaling
- ✅ Sharding for large collections
- ✅ Replication sets
- ✅ Indexes on frequently queried fields
- ✅ TTL indexes for old data

---

## ✨ Summary

**Hybrid Database Strategy:**
- PostgreSQL: Structured data (Users, Projects, Metrics)
- MongoDB: Flexible data (Excel, Patterns, History)
- Connected via IDs (mongoDataId, mongoResultId)
- Best performance + flexibility
- Easy to scale independently

This is a **production-ready approach** used by companies like Uber, Netflix, and Airbnb!

