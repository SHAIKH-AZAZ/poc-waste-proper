# Database Setup Guide - Complete Instructions

## ✅ Files Created

All database integration files have been created:

```
✅ docker-compose.yml              - PostgreSQL Docker setup
✅ .env.local                      - Environment variables
✅ prisma/schema.prisma            - Database schema
✅ src/lib/mongodb.ts              - MongoDB connection
✅ src/app/api/upload/route.ts     - Upload endpoint
✅ src/app/api/projects/route.ts   - Projects endpoint
✅ src/app/api/results/route.ts    - Results endpoint
✅ src/app/api/excel-data/route.ts - Excel data endpoint
✅ src/hooks/useFileDatabase.ts    - React hook
✅ package.json                    - Updated with dependencies
```

---

## 🚀 Setup Steps

### Step 1: Update .env.local with MongoDB URL

**File:** `.env.local`

Replace the MongoDB URL with your actual connection string:

```bash
# Current (placeholder):
MONGODB_URI="mongodb+srv://YOUR_USERNAME:YOUR_PASSWORD@YOUR_CLUSTER.mongodb.net/cutting_stock?retryWrites=true&w=majority"

# Replace with your actual URL:
MONGODB_URI="mongodb+srv://user:password@cluster.mongodb.net/cutting_stock?retryWrites=true&w=majority"
```

**Where to get it:**
- MongoDB Atlas → Your Cluster → Connect → Connection String
- Copy the full connection string
- Replace `<username>` and `<password>` with your credentials

---

### Step 2: Start PostgreSQL with Docker

**Prerequisites:**
- Docker installed and running

**Command:**
```bash
docker-compose up -d
```

**Verify it's running:**
```bash
docker ps
# Should see: cutting_stock_postgres container running
```

**Check logs:**
```bash
docker-compose logs postgres
# Should see: "database system is ready to accept connections"
```

---

### Step 3: Install Dependencies

```bash
npm install
```

**What it installs:**
- `@prisma/client` - PostgreSQL ORM
- `prisma` - Migration tool
- `mongodb` - MongoDB driver

**Time:** 3-5 minutes (depends on internet speed)

---

### Step 4: Create Database Tables

```bash
npx prisma migrate dev --name init
```

**What it does:**
1. Creates PostgreSQL tables (Project, CalculationResult)
2. Generates Prisma client
3. Creates migration file

**Output should show:**
```
✔ Your database has been created at postgresql://postgres:postgres@localhost:5432/cutting_stock
✔ Prisma schema loaded from prisma/schema.prisma
✔ Datasource "db": PostgreSQL database "cutting_stock" at "localhost:5432"
✔ Prisma Migrate created the following migration without detecting schema changes
```

---

### Step 5: Verify PostgreSQL Connection

```bash
npx prisma studio
```

**What it does:**
- Opens Prisma Studio (visual database browser)
- Shows Project and CalculationResult tables
- Confirms PostgreSQL is working

**Access:** http://localhost:5555

---

### Step 6: Start Development Server

```bash
npm run dev
```

**Output should show:**
```
> next dev --webpack
  ▲ Next.js 16.0.10
  - Local:        http://localhost:3000
```

---

## 🧪 Testing the Setup

### Test 1: Upload Excel File

1. Open http://localhost:3000
2. Upload an Excel file
3. Check console for logs:
   ```
   [Upload] Processing file: ...
   [Upload] Parsed X rows from Excel
   [Upload] Created project in PostgreSQL: 1
   [Upload] Stored data in MongoDB: ...
   ```

### Test 2: Verify PostgreSQL

```bash
npx prisma studio
# Should see Project record with your uploaded file
```

### Test 3: Verify MongoDB

```bash
# Using MongoDB Compass or mongosh:
db.excel_data.find()
# Should see your uploaded data
```

### Test 4: Run Calculation

1. Select a diameter
2. Run calculation
3. Check console for logs:
   ```
   [Results] Saving result for project 1, algorithm: greedy, dia: 12
   [Results] Stored detailed data in MongoDB: ...
   [Results] Stored metadata in PostgreSQL: 1
   ```

### Test 5: View Results

1. Check PostgreSQL:
   ```bash
   npx prisma studio
   # Should see CalculationResult record
   ```

2. Check MongoDB:
   ```bash
   db.calculation_results.find()
   # Should see patterns and detailed cuts
   ```

---

## 📊 Database Structure

### PostgreSQL Tables

**Projects Table:**
```
id              | name           | fileName      | status
1               | test_file      | test.xlsx     | completed
```

**CalculationResults Table:**
```
id | projectId | algorithm | dia | totalBarsUsed | mongoResultId
1  | 1         | greedy    | 12  | 5             | ObjectId(...)
```

### MongoDB Collections

**excel_data Collection:**
```json
{
  "_id": ObjectId(...),
  "projectId": 1,
  "fileName": "test.xlsx",
  "data": [
    { "BarCode": "...", "Dia": 12, ... },
    { "BarCode": "...", "Dia": 12, ... }
  ],
  "uploadedAt": ISODate(...),
  "version": 1
}
```

**calculation_results Collection:**
```json
{
  "_id": ObjectId(...),
  "projectId": 1,
  "algorithm": "greedy",
  "dia": 12,
  "patterns": [...],
  "detailedCuts": [...],
  "createdAt": ISODate(...)
}
```

---

## 🔍 Troubleshooting

### Issue: "MONGODB_URI is not defined"

**Solution:**
1. Check `.env.local` file exists
2. Verify `MONGODB_URI` is set
3. Restart dev server: `npm run dev`

### Issue: "connect ECONNREFUSED 127.0.0.1:5432"

**Solution:**
1. Check Docker is running: `docker ps`
2. Start PostgreSQL: `docker-compose up -d`
3. Wait 10 seconds for startup
4. Restart dev server

### Issue: "MongoDB connection timeout"

**Solution:**
1. Check MongoDB URL is correct
2. Verify IP whitelist in MongoDB Atlas
3. Check internet connection
4. Try connection string in MongoDB Compass first

### Issue: "Prisma client not generated"

**Solution:**
```bash
npx prisma generate
npm run dev
```

### Issue: "Table already exists"

**Solution:**
```bash
# Reset database (WARNING: deletes all data)
npx prisma migrate reset
```

---

## 📝 Environment Variables

**File:** `.env.local`

```bash
# PostgreSQL (Docker)
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/cutting_stock"

# MongoDB (Your URL)
MONGODB_URI="mongodb+srv://user:password@cluster.mongodb.net/cutting_stock?retryWrites=true&w=majority"
MONGODB_DB="cutting_stock"

# API
NEXT_PUBLIC_API_URL="http://localhost:3000"
```

---

## 🔄 Data Flow

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

## 🎯 Next Steps

### After Setup is Complete:

1. **Update page.tsx** to use database
   - Import `useFileDatabase` hook
   - Call `fetchProjects()` on mount
   - Call `saveResult()` after calculation

2. **Update ExcelUploader** component
   - Use `uploadFile()` instead of just parsing
   - Handle projectId response

3. **Add project management UI**
   - List all projects
   - Delete old projects
   - View project history

4. **Add result history UI**
   - View all calculations
   - Compare algorithms
   - Filter by diameter

---

## 📚 Useful Commands

```bash
# Start development server
npm run dev

# View database (Prisma Studio)
npx prisma studio

# View PostgreSQL logs
docker-compose logs postgres

# Stop PostgreSQL
docker-compose down

# Reset database (WARNING: deletes all data)
npx prisma migrate reset

# Generate Prisma client
npx prisma generate

# Check database connection
npx prisma db execute --stdin < query.sql
```

---

## ✅ Checklist

- [ ] MongoDB URL added to .env.local
- [ ] Docker installed and running
- [ ] `docker-compose up -d` executed
- [ ] `npm install` completed
- [ ] `npx prisma migrate dev --name init` executed
- [ ] `npm run dev` started
- [ ] Excel file uploaded successfully
- [ ] PostgreSQL shows Project record
- [ ] MongoDB shows excel_data record
- [ ] Calculation runs successfully
- [ ] PostgreSQL shows CalculationResult record
- [ ] MongoDB shows calculation_results record

---

## 🎉 You're Done!

Your database is now fully integrated! 

**What you have:**
- ✅ PostgreSQL for project metadata
- ✅ MongoDB for raw data and patterns
- ✅ 4 API routes for CRUD operations
- ✅ React hook for database operations
- ✅ Persistent data storage
- ✅ Full logging for debugging

**Next:** Update your React components to use the database! 🚀

