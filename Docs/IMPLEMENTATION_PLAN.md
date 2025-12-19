# Database Implementation Plan - Step by Step

## 📋 What I Will Do

### Phase 1: Setup & Configuration
1. **Create Docker Compose file** for PostgreSQL
   - PostgreSQL 15 container
   - Volume for data persistence
   - Environment variables
   - Port 5432 exposed

2. **Create environment variables file** (.env.local)
   - PostgreSQL connection string
   - MongoDB connection string (you'll provide)
   - Database names

3. **Install dependencies**
   - `@prisma/client` - PostgreSQL ORM
   - `prisma` - Migration tool
   - `mongodb` - MongoDB driver

### Phase 2: Database Models
1. **Create Prisma schema** (prisma/schema.prisma)
   - `Project` model (file metadata)
   - `CalculationResult` model (result metrics)
   - Relationships and indexes

2. **Create MongoDB collections** (via API)
   - `excel_data` - Raw Excel data
   - `calculation_results` - Detailed patterns

### Phase 3: API Routes
1. **POST /api/upload** - Upload Excel file
   - Parse Excel
   - Save project to PostgreSQL
   - Save raw data to MongoDB
   - Return projectId + mongoDataId

2. **GET /api/projects** - List all projects
   - Query PostgreSQL
   - Return with result counts

3. **DELETE /api/projects** - Delete project
   - Delete from PostgreSQL (cascades)
   - Delete from MongoDB

4. **POST /api/results** - Save calculation results
   - Save metrics to PostgreSQL
   - Save patterns to MongoDB
   - Update project status

5. **GET /api/results** - Get results for project
   - Query PostgreSQL for metrics
   - Fetch MongoDB for detailed patterns
   - Combine and return

6. **GET /api/excel-data** - Get raw Excel data
   - Query MongoDB
   - Return raw data

### Phase 4: React Integration
1. **Create useFileDatabase hook** (src/hooks/useFileDatabase.ts)
   - `fetchProjects()` - Get all projects
   - `uploadFile()` - Upload Excel
   - `saveResult()` - Save calculation
   - `fetchResults()` - Get results
   - `fetchExcelData()` - Get raw data
   - `deleteProject()` - Delete project

2. **Update page.tsx** to use database
   - Load projects on mount
   - Save results after calculation
   - Persist data across sessions

### Phase 5: Testing
1. **Test upload flow**
   - Upload Excel → PostgreSQL + MongoDB
   - Verify data in both databases

2. **Test calculation flow**
   - Run calculation → Save to both databases
   - Verify metrics in PostgreSQL
   - Verify patterns in MongoDB

3. **Test retrieval flow**
   - Fetch projects → PostgreSQL
   - Fetch results → PostgreSQL + MongoDB
   - Verify combined data

---

## 🗂️ Files I Will Create

### Configuration Files
```
docker-compose.yml          # PostgreSQL Docker setup
.env.local                  # Environment variables
prisma/schema.prisma        # Database schema
src/lib/mongodb.ts          # MongoDB connection
```

### API Routes
```
src/app/api/upload/route.ts
src/app/api/projects/route.ts
src/app/api/results/route.ts
src/app/api/excel-data/route.ts
```

### React Code
```
src/hooks/useFileDatabase.ts
```

### Documentation
```
DATABASE_SETUP_GUIDE.md      # How to run everything
```

---

## 📊 Data Flow After Implementation

```
Current Flow (No Database):
Upload → Parse → Calculate → Display → Lost on refresh ❌

New Flow (With Database):
Upload → PostgreSQL + MongoDB → Calculate → PostgreSQL + MongoDB → Display → Persists ✅
```

---

## 🔄 Detailed Workflow

### Upload Excel
```
1. User uploads file
   ↓
2. /api/upload receives file
   ↓
3. Parse Excel with XLSX
   ↓
4. Create Project in PostgreSQL
   ├─ name, fileName, fileSize, uploadDate, status
   ↓
5. Store raw data in MongoDB
   ├─ projectId, fileName, data[], uploadedAt, version
   ↓
6. Update Project with mongoDataId
   ↓
7. Return projectId + mongoDataId
```

### Run Calculation
```
1. User selects diameter
   ↓
2. Fetch Excel data from MongoDB (via mongoDataId)
   ↓
3. Run algorithms in Web Workers
   ↓
4. /api/results receives results
   ├─ projectId, algorithm, dia, result
   ↓
5. Store metrics in PostgreSQL
   ├─ totalBarsUsed, totalWaste, averageUtilization, executionTime
   ├─ mongoResultId (reference)
   ↓
6. Store patterns in MongoDB
   ├─ patterns[], detailedCuts[]
   ↓
7. Update Project status to "completed"
   ↓
8. Return resultId
```

### View Results
```
1. /api/projects queries PostgreSQL
   ├─ Get all projects with result counts
   ↓
2. /api/results queries PostgreSQL + MongoDB
   ├─ Get metrics from PostgreSQL
   ├─ Get patterns from MongoDB
   ├─ Combine and return
   ↓
3. Display in UI
```

---

## 🗄️ PostgreSQL Schema

```
Projects Table:
├─ id (PK)
├─ name
├─ description
├─ fileName
├─ fileSize
├─ uploadDate
├─ status (uploaded, processing, completed)
├─ mongoDataId (reference to MongoDB)
├─ createdAt
├─ updatedAt

CalculationResults Table:
├─ id (PK)
├─ projectId (FK)
├─ algorithm
├─ dia
├─ totalBarsUsed
├─ totalWaste
├─ averageUtilization
├─ executionTime
├─ mongoResultId (reference to MongoDB)
├─ createdAt
```

---

## 🗄️ MongoDB Collections

```
excel_data Collection:
├─ _id (ObjectId)
├─ projectId
├─ fileName
├─ data[] (raw Excel rows)
├─ uploadedAt
├─ version

calculation_results Collection:
├─ _id (ObjectId)
├─ projectId
├─ algorithm
├─ dia
├─ patterns[]
├─ detailedCuts[]
├─ createdAt
```

---

## 🚀 Setup Instructions (What You'll Do)

### 1. PostgreSQL with Docker
```bash
# Copy docker-compose.yml to project root
# Run:
docker-compose up -d

# Verify:
docker ps  # Should see postgres container
```

### 2. Provide MongoDB URL
```bash
# You provide:
MONGODB_URI="mongodb+srv://..."
MONGODB_DB="cutting_stock"
```

### 3. Run Migrations
```bash
# I'll create schema, you run:
npx prisma migrate dev --name init
```

### 4. Start Development
```bash
npm run dev
# App will be ready with database integration
```

---

## ✅ What You Get After Implementation

### Persistent Data
- ✅ Projects saved across sessions
- ✅ Excel data archived
- ✅ Results stored permanently
- ✅ Can reload anytime

### Project Management
- ✅ List all uploaded files
- ✅ View upload dates
- ✅ See calculation status
- ✅ Delete old projects

### Result History
- ✅ View all calculations
- ✅ Compare algorithms
- ✅ Filter by diameter
- ✅ Export results

### Scalability
- ✅ Ready for multi-user (just add auth)
- ✅ Ready for analytics
- ✅ Ready for sharing
- ✅ Ready for production

---

## 📝 Summary of Changes to Existing Code

### page.tsx Changes
```typescript
// Add at top
import { useFileDatabase } from "@/hooks/useFileDatabase";

// In component
const { uploadFile, saveResult, fetchProjects } = useFileDatabase();

// On mount
useEffect(() => {
  fetchProjects();
}, []);

// After calculation
await saveResult(projectId, algorithm, dia, result);
```

### ExcelUploader.tsx Changes
```typescript
// Instead of just parsing:
const projectId = await uploadFile(file);
// Now also saves to database
```

### CuttingStockResults.tsx Changes
```typescript
// After calculation completes:
await saveResult(projectId, algorithm, dia, result);
// Now also saves to database
```

---

## 🎯 Order of Implementation

1. ✅ Create docker-compose.yml
2. ✅ Create .env.local
3. ✅ Install dependencies
4. ✅ Create Prisma schema
5. ✅ Create MongoDB client
6. ✅ Create API routes (upload, projects, results, excel-data)
7. ✅ Create useFileDatabase hook
8. ✅ Update page.tsx to use database
9. ✅ Test everything

---

## 🔍 What Happens Behind the Scenes

### When you upload a file:
```
Browser → /api/upload → Parse Excel → PostgreSQL (Project) + MongoDB (Data) → Return IDs
```

### When you run calculation:
```
Browser → Fetch from MongoDB → Calculate → /api/results → PostgreSQL (Metrics) + MongoDB (Patterns)
```

### When you view results:
```
Browser → /api/results → PostgreSQL (Metrics) + MongoDB (Patterns) → Combine → Display
```

---

## ✨ Benefits

- **Persistent**: Data survives page refresh
- **Organized**: Metadata in PostgreSQL, raw data in MongoDB
- **Fast**: Queries optimized for each database
- **Scalable**: Can add users/auth later
- **Flexible**: Excel schema varies, MongoDB handles it
- **Queryable**: PostgreSQL for dashboards/analytics

---

## ❓ Questions Before I Start?

1. Do you want me to proceed with all files?
2. Any specific naming conventions?
3. Any additional fields you want to track?
4. Should I add error handling/validation?
5. Should I add logging?

Let me know if this plan looks good, and I'll start implementing!

