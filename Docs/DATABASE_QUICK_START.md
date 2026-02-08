# Database Integration - Quick Start Guide

## 🚀 5-Minute Setup (PostgreSQL + Prisma)

### Step 1: Install Dependencies (1 min)

```bash
npm install @prisma/client
npm install -D prisma
npm install dotenv
```

### Step 2: Setup Database (1 min)

```bash
# Create .env.local
echo 'DATABASE_URL="postgresql://postgres:password@localhost:5432/cutting_stock"' > .env.local

# Or use Supabase
echo 'DATABASE_URL="postgresql://[user]:[password]@[host]:[port]/[database]"' > .env.local
```

### Step 3: Initialize Prisma (1 min)

```bash
npx prisma init
```

### Step 4: Create Schema (1 min)

Replace `prisma/schema.prisma` with:

```prisma
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
  cuttingData     CuttingData[]
  results         CalculationResult[]
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}

model CuttingData {
  id              Int     @id @default(autoincrement())
  projectId       Int
  project         Project @relation(fields: [projectId], references: [id], onDelete: Cascade)
  dia             Int
  totalBars       Int
  cuttingLength   Decimal @db.Decimal(10, 3)
  lapLength       Decimal @db.Decimal(10, 3)
  element         String
  barcode         String
  createdAt       DateTime @default(now())

  @@index([projectId])
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
  patterns            Json
  detailedCuts        Json
  createdAt           DateTime @default(now())

  @@index([projectId])
}
```

### Step 5: Run Migration (1 min)

```bash
npx prisma migrate dev --name init
```

---

## 📝 Create API Routes

### 1. Save Results (`src/app/api/results/route.ts`)

```typescript
import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { projectId, algorithm, dia, result } = body;

    const saved = await prisma.calculationResult.create({
      data: {
        projectId,
        algorithm,
        dia,
        totalBarsUsed: result.totalBarsUsed,
        totalWaste: result.totalWaste,
        averageUtilization: result.averageUtilization,
        patterns: result.patterns,
        detailedCuts: result.detailedCuts
      }
    });

    return NextResponse.json({ success: true, id: saved.id });
  } catch (error) {
    return NextResponse.json({ error: "Failed to save" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const projectId = req.nextUrl.searchParams.get("projectId");
    
    const results = await prisma.calculationResult.findMany({
      where: { projectId: parseInt(projectId!) },
      orderBy: { createdAt: "desc" }
    });

    return NextResponse.json({ success: true, results });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}
```

### 2. Create Project (`src/app/api/projects/route.ts`)

```typescript
import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  try {
    const { name, description } = await req.json();

    const project = await prisma.project.create({
      data: { name, description }
    });

    return NextResponse.json({ success: true, project });
  } catch (error) {
    return NextResponse.json({ error: "Failed to create" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const projects = await prisma.project.findMany({
      orderBy: { createdAt: "desc" }
    });

    return NextResponse.json({ success: true, projects });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}
```

---

## 🎯 Update React Component

### Save Results After Calculation

```typescript
// In page.tsx, after calculation completes

const handleCalculationComplete = async (
  greedyRes: any,
  dynamicRes: any,
  dia: number
) => {
  if (!currentProject) return;

  try {
    // Save greedy result
    await fetch("/api/results", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectId: currentProject,
        algorithm: "greedy",
        dia,
        result: greedyRes
      })
    });

    // Save dynamic result
    await fetch("/api/results", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectId: currentProject,
        algorithm: "dynamic",
        dia,
        result: dynamicRes
      })
    });

    console.log("Results saved!");
  } catch (error) {
    console.error("Failed to save:", error);
  }
};
```

---

## 🧪 Test It

```bash
# 1. Start dev server
npm run dev

# 2. Open browser
# http://localhost:3000

# 3. Create project
curl -X POST http://localhost:3000/api/projects \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Project"}'

# 4. Upload file and run calculation
# (Use UI)

# 5. Check database
npx prisma studio
```

---

## 📊 Database Options Comparison

| Option | Setup Time | Cost | Best For |
|--------|-----------|------|----------|
| **PostgreSQL Local** | 5 min | Free | Development |
| **PostgreSQL Cloud** | 2 min | $5-50/mo | Production |
| **Supabase** | 2 min | Free-$25/mo | Quick start |
| **MongoDB** | 3 min | Free-$57/mo | Flexible schema |
| **Firebase** | 2 min | Free-$25/mo | Real-time |

---

## 🔗 Connection Strings

### PostgreSQL Local
```
postgresql://postgres:password@localhost:5432/cutting_stock
```

### Supabase
```
postgresql://postgres.[project]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
```

### MongoDB
```
mongodb+srv://[user]:[password]@[cluster].mongodb.net/[database]
```

### Firebase
```
# Use Firebase SDK instead of connection string
```

---

## 🎓 Next Steps

1. ✅ Setup database
2. ✅ Create API routes
3. ✅ Update React component
4. ✅ Test saving/loading
5. 📖 Read full guide: `DATABASE_INTEGRATION_GUIDE.md`
6. 🔐 Add authentication
7. 📈 Add analytics
8. 🚀 Deploy to production

---

## 💡 Common Issues

### Issue: "DATABASE_URL not found"
```bash
# Solution: Create .env.local
echo 'DATABASE_URL="postgresql://..."' > .env.local
```

### Issue: "Connection refused"
```bash
# Solution: Start PostgreSQL
brew services start postgresql
# or
sudo service postgresql start
```

### Issue: "Prisma client not generated"
```bash
# Solution: Generate client
npx prisma generate
```

### Issue: "Migration failed"
```bash
# Solution: Reset database
npx prisma migrate reset
```

---

## 📚 Resources

- [Prisma Docs](https://www.prisma.io/docs/)
- [PostgreSQL Docs](https://www.postgresql.org/docs/)
- [Supabase Docs](https://supabase.com/docs)
- [Next.js API Routes](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)

---

## ✨ You're Done!

Your cutting stock application now has:
- ✅ Persistent data storage
- ✅ Project management
- ✅ Result history
- ✅ Multi-session support

Next: Add authentication and deploy! 🚀
