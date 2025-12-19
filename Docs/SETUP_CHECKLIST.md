# Setup Checklist - Step by Step

## ✅ Pre-Setup Checklist

- [ ] Docker installed and running
- [ ] Node.js 18+ installed
- [ ] MongoDB URL ready (from MongoDB Atlas or your provider)
- [ ] Terminal open in project directory
- [ ] All files created (15 files total)

---

## 🚀 Setup Steps

### Step 1: Update Environment Variables
**Time: 2 minutes**

- [ ] Open `.env.local` file
- [ ] Find line: `MONGODB_URI="mongodb+srv://YOUR_USERNAME:YOUR_PASSWORD@YOUR_CLUSTER.mongodb.net/cutting_stock?retryWrites=true&w=majority"`
- [ ] Replace with your actual MongoDB connection string
- [ ] Save file
- [ ] Verify MongoDB URL is correct

**Example:**
```
MONGODB_URI="mongodb+srv://user123:pass456@cluster0.abc123.mongodb.net/cutting_stock?retryWrites=true&w=majority"
```

---

### Step 2: Start PostgreSQL with Docker
**Time: 3-5 minutes**

- [ ] Open terminal in project root
- [ ] Run: `docker-compose up -d`
- [ ] Wait for container to start (10-15 seconds)
- [ ] Verify: `docker ps` (should see cutting_stock_postgres)
- [ ] Check logs: `docker-compose logs postgres`
- [ ] Look for: "database system is ready to accept connections"

**Commands:**
```bash
docker-compose up -d
docker ps
docker-compose logs postgres
```

---

### Step 3: Install Dependencies
**Time: 3-5 minutes**

- [ ] Run: `npm install`
- [ ] Wait for installation to complete
- [ ] Check for errors (should be none)
- [ ] Verify new packages installed:
  - [ ] @prisma/client
  - [ ] prisma
  - [ ] mongodb

**Command:**
```bash
npm install
```

**Verify:**
```bash
npm list @prisma/client prisma mongodb
```

---

### Step 4: Create Database Tables
**Time: 2-3 minutes**

- [ ] Run: `npx prisma migrate dev --name init`
- [ ] Wait for migration to complete
- [ ] Check output for success message
- [ ] Verify tables created in PostgreSQL

**Command:**
```bash
npx prisma migrate dev --name init
```

**Expected Output:**
```
✔ Your database has been created at postgresql://postgres:postgres@localhost:5432/cutting_stock
✔ Prisma schema loaded from prisma/schema.prisma
✔ Datasource "db": PostgreSQL database "cutting_stock" at "localhost:5432"
✔ Prisma Migrate created the following migration without detecting schema changes
```

---

### Step 5: Verify Database Connection
**Time: 2 minutes**

- [ ] Run: `npx prisma studio`
- [ ] Wait for Prisma Studio to open
- [ ] Browser should open at http://localhost:5555
- [ ] See Project and CalculationResult tables
- [ ] Tables should be empty (no data yet)
- [ ] Close Prisma Studio (Ctrl+C)

**Command:**
```bash
npx prisma studio
```

---

### Step 6: Start Development Server
**Time: 1-2 minutes**

- [ ] Run: `npm run dev`
- [ ] Wait for server to start
- [ ] Check output for: "Local: http://localhost:3000"
- [ ] Open browser to http://localhost:3000
- [ ] App should load without errors

**Command:**
```bash
npm run dev
```

**Expected Output:**
```
> next dev --webpack
  ▲ Next.js 16.0.10
  - Local:        http://localhost:3000
```

---

## 🧪 Testing Checklist

### Test 1: Upload Excel File
**Time: 5 minutes**

- [ ] Open http://localhost:3000
- [ ] Upload an Excel file
- [ ] Check browser console for logs:
  - [ ] `[Upload] Processing file: ...`
  - [ ] `[Upload] Parsed X rows from Excel`
  - [ ] `[Upload] Created project in PostgreSQL: 1`
  - [ ] `[Upload] Stored data in MongoDB: ...`
- [ ] File should appear in table
- [ ] No errors in console

**Verify in PostgreSQL:**
```bash
npx prisma studio
# Should see Project record
```

**Verify in MongoDB:**
```bash
# Using MongoDB Compass or mongosh
db.excel_data.find()
# Should see your uploaded data
```

---

### Test 2: Run Calculation
**Time: 5 minutes**

- [ ] Select a diameter from dropdown
- [ ] Wait for calculation to complete
- [ ] Check browser console for logs:
  - [ ] `[Page] Starting calculation...`
  - [ ] `[Page] Calculation complete...`
  - [ ] `[Page] Saving results to database...`
  - [ ] `[Results] Storing detailed data in MongoDB...`
  - [ ] `[Results] Stored metadata in PostgreSQL...`
- [ ] Results should display
- [ ] No errors in console

**Verify in PostgreSQL:**
```bash
npx prisma studio
# Should see CalculationResult record
```

**Verify in MongoDB:**
```bash
# Using MongoDB Compass or mongosh
db.calculation_results.find()
# Should see patterns and detailed cuts
```

---

### Test 3: Reload Page
**Time: 3 minutes**

- [ ] Refresh browser (F5 or Cmd+R)
- [ ] Check browser console for logs:
  - [ ] `[useFileDatabase] Fetching projects`
  - [ ] `[useFileDatabase] Fetched X projects`
- [ ] Projects should still be visible
- [ ] Data should persist
- [ ] No errors in console

---

### Test 4: View Project History
**Time: 3 minutes**

- [ ] Upload another Excel file
- [ ] Run calculation on different diameter
- [ ] Check projects list
- [ ] Should see multiple projects
- [ ] Each project should show result count
- [ ] Click on project to view results

---

## 📊 Verification Checklist

### PostgreSQL
- [ ] Docker container running: `docker ps`
- [ ] Database created: `npx prisma studio`
- [ ] Project table exists
- [ ] CalculationResult table exists
- [ ] Data appears after upload
- [ ] Data appears after calculation

### MongoDB
- [ ] Connection string in .env.local
- [ ] Can connect to MongoDB
- [ ] excel_data collection exists
- [ ] calculation_results collection exists
- [ ] Data appears after upload
- [ ] Data appears after calculation

### API Routes
- [ ] POST /api/upload works
- [ ] GET /api/projects works
- [ ] POST /api/results works
- [ ] GET /api/results works
- [ ] GET /api/excel-data works

### React Hook
- [ ] useFileDatabase hook loads
- [ ] fetchProjects() works
- [ ] uploadFile() works
- [ ] saveResult() works
- [ ] fetchResults() works

---

## 🔍 Debugging Checklist

If something doesn't work:

### Check 1: Environment Variables
- [ ] .env.local file exists
- [ ] MONGODB_URI is set correctly
- [ ] DATABASE_URL is set correctly
- [ ] No typos in URLs

### Check 2: Docker
- [ ] Docker is running: `docker ps`
- [ ] PostgreSQL container is running
- [ ] Container logs show no errors: `docker-compose logs postgres`
- [ ] Port 5432 is not in use

### Check 3: Dependencies
- [ ] npm install completed successfully
- [ ] No error messages during install
- [ ] node_modules folder exists
- [ ] package-lock.json exists

### Check 4: Database
- [ ] Prisma migrate completed: `npx prisma migrate dev --name init`
- [ ] Tables created in PostgreSQL
- [ ] Prisma Studio opens: `npx prisma studio`
- [ ] No migration errors

### Check 5: Dev Server
- [ ] npm run dev starts without errors
- [ ] Server runs on http://localhost:3000
- [ ] No TypeScript errors
- [ ] No console errors

### Check 6: API Routes
- [ ] Check Network tab in DevTools
- [ ] POST /api/upload returns 200
- [ ] GET /api/projects returns 200
- [ ] POST /api/results returns 200
- [ ] No 500 errors

---

## 📝 Common Issues & Solutions

### Issue: "MONGODB_URI is not defined"
**Solution:**
1. Check .env.local exists
2. Verify MONGODB_URI line is present
3. Restart dev server: `npm run dev`

### Issue: "connect ECONNREFUSED 127.0.0.1:5432"
**Solution:**
1. Check Docker is running: `docker ps`
2. Start PostgreSQL: `docker-compose up -d`
3. Wait 10 seconds
4. Restart dev server

### Issue: "MongoDB connection timeout"
**Solution:**
1. Check MongoDB URL is correct
2. Verify IP whitelist in MongoDB Atlas
3. Check internet connection
4. Test URL in MongoDB Compass first

### Issue: "Prisma client not generated"
**Solution:**
```bash
npx prisma generate
npm run dev
```

### Issue: "Table already exists"
**Solution:**
```bash
# WARNING: This deletes all data
npx prisma migrate reset
```

---

## ✅ Final Verification

Before moving to integration:

- [ ] Docker PostgreSQL running
- [ ] MongoDB connected
- [ ] npm install completed
- [ ] Prisma migrate executed
- [ ] Dev server running
- [ ] Excel file uploads successfully
- [ ] Data appears in PostgreSQL
- [ ] Data appears in MongoDB
- [ ] Calculation runs successfully
- [ ] Results saved to both databases
- [ ] Page reload persists data
- [ ] No errors in console

---

## 🎉 Ready for Integration!

If all checkboxes are checked, you're ready to:

1. Update page.tsx to use database
2. Update ExcelUploader to use uploadFile()
3. Update CuttingStockResults to save results
4. Test all flows

See INTEGRATION_GUIDE.md for code examples.

---

## 📞 Need Help?

1. **Check console logs** - Most errors are logged
2. **Check .env.local** - Verify URLs
3. **Check Docker** - Verify PostgreSQL is running
4. **Check network tab** - Verify API calls
5. **Read documentation** - All answers are there

---

## 🚀 Next Steps

After setup is complete:

1. [ ] Read INTEGRATION_GUIDE.md
2. [ ] Update page.tsx
3. [ ] Update ExcelUploader
4. [ ] Update CuttingStockResults
5. [ ] Test all flows
6. [ ] Add project management UI
7. [ ] Add result history UI

---

## ⏱️ Time Estimate

- Setup: 15-20 minutes
- Testing: 15-20 minutes
- Integration: 20-30 minutes
- **Total: 50-70 minutes**

---

## 🎊 Congratulations!

You've successfully set up the database integration! 🎉

Now integrate it into your app and start persisting data! 🚀

