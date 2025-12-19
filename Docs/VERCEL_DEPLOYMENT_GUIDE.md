# Vercel Deployment Guide - Database Configuration

## 🎯 Overview

For Vercel deployment, you need:
- **PostgreSQL**: Use Vercel Postgres, Supabase, or Neon (cloud-hosted)
- **MongoDB**: Use MongoDB Atlas (you already have this!)

---

## 📋 Option 1: Vercel Postgres (Easiest)

### Step 1: Create Vercel Postgres Database

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project (or create one)
3. Go to **Storage** tab
4. Click **Create Database** → **Postgres**
5. Follow the setup wizard
6. Vercel automatically adds `DATABASE_URL` to your environment variables

### Step 2: Update Prisma Schema

Your schema is already compatible! No changes needed.

### Step 3: Deploy

```bash
# Push to GitHub
git add .
git commit -m "Add database integration"
git push

# Vercel will auto-deploy
```

### Step 4: Run Prisma Migration on Vercel

After deployment, run:
```bash
npx vercel env pull .env.local
npx prisma migrate deploy
```

Or add to `package.json`:
```json
{
  "scripts": {
    "postinstall": "prisma generate",
    "vercel-build": "prisma generate && prisma migrate deploy && next build"
  }
}
```

---

## 📋 Option 2: Supabase (Free Tier Available)

### Step 1: Create Supabase Project

1. Go to [Supabase](https://supabase.com)
2. Create new project
3. Go to **Settings** → **Database**
4. Copy the **Connection string** (URI)

### Step 2: Get Connection String

```
postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
```

### Step 3: Add to Vercel Environment Variables

1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add:
   - `DATABASE_URL` = your Supabase connection string

---

## 📋 Option 3: Neon (Free Tier Available)

### Step 1: Create Neon Database

1. Go to [Neon](https://neon.tech)
2. Create new project
3. Copy the connection string

### Step 2: Get Connection String

```
postgresql://[user]:[password]@[host].neon.tech/[database]?sslmode=require
```

### Step 3: Add to Vercel Environment Variables

Same as Supabase - add `DATABASE_URL` in Vercel settings.

---

## 🔧 Vercel Environment Variables Setup

### Required Variables

Go to **Vercel Dashboard** → **Your Project** → **Settings** → **Environment Variables**

Add these:

| Variable | Value | Example |
|----------|-------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host:5432/db` |
| `MONGODB_URI` | MongoDB Atlas connection string | `mongodb+srv://user:pass@cluster.mongodb.net/cutting_stock` |
| `MONGODB_DB` | Database name | `cutting_stock` |

### Your MongoDB URL (Already Have)

```
MONGODB_URI=mongodb+srv://azazshaikh2703:azazshaikh2703@cluster0.u7dxgjm.mongodb.net/cutting_stock?retryWrites=true&w=majority
MONGODB_DB=cutting_stock
```

---

## 📝 Update package.json for Vercel

```json
{
  "scripts": {
    "dev": "next dev --webpack",
    "build": "prisma generate && next build",
    "start": "next start",
    "lint": "eslint",
    "postinstall": "prisma generate"
  }
}
```

---

## 🚀 Deployment Steps

### Step 1: Choose PostgreSQL Provider

| Provider | Free Tier | Best For |
|----------|-----------|----------|
| **Vercel Postgres** | 256MB | Easiest integration |
| **Supabase** | 500MB | More features |
| **Neon** | 512MB | Serverless |
| **Railway** | $5 credit | Simple setup |

### Step 2: Get Connection String

From your chosen provider, get the PostgreSQL connection string.

### Step 3: Add Environment Variables to Vercel

1. Go to Vercel Dashboard
2. Select your project
3. Go to Settings → Environment Variables
4. Add:
   - `DATABASE_URL` = PostgreSQL connection string
   - `MONGODB_URI` = MongoDB Atlas connection string
   - `MONGODB_DB` = `cutting_stock`

### Step 4: Update package.json

Add build script for Prisma:

```json
"build": "prisma generate && next build"
```

### Step 5: Push to GitHub

```bash
git add .
git commit -m "Configure for Vercel deployment"
git push
```

### Step 6: Deploy on Vercel

1. Go to [Vercel](https://vercel.com)
2. Import your GitHub repository
3. Vercel will auto-detect Next.js
4. Click Deploy

### Step 7: Run Database Migration

After first deployment:

```bash
# Option A: Using Vercel CLI
npx vercel env pull .env.production.local
DATABASE_URL="your-production-url" npx prisma migrate deploy

# Option B: Add to vercel.json
```

Or create `vercel.json`:

```json
{
  "buildCommand": "prisma generate && prisma migrate deploy && next build"
}
```

---

## 🔒 Security Notes

### MongoDB Atlas IP Whitelist

For Vercel (serverless), you need to allow all IPs:

1. Go to MongoDB Atlas → Network Access
2. Click "Add IP Address"
3. Add `0.0.0.0/0` (allow from anywhere)
4. This is required because Vercel uses dynamic IPs

### PostgreSQL SSL

Most cloud PostgreSQL providers require SSL. Your connection string should include:

```
?sslmode=require
```

Example:
```
postgresql://user:pass@host:5432/db?sslmode=require
```

---

## 📊 Recommended Setup for Your Project

### Best Choice: Supabase + MongoDB Atlas

**Why Supabase?**
- Free 500MB PostgreSQL
- Easy setup
- Good documentation
- Works great with Prisma

**Steps:**

1. **Create Supabase account** at https://supabase.com
2. **Create new project**
3. **Get connection string** from Settings → Database
4. **Add to Vercel** environment variables
5. **Deploy!**

---

## 🧪 Testing Before Deploy

### Local Test with Production Database

```bash
# Create .env.production.local
DATABASE_URL="your-supabase-url"
MONGODB_URI="your-mongodb-atlas-url"
MONGODB_DB="cutting_stock"

# Run with production env
npm run build
npm run start
```

---

## 📋 Checklist

Before deploying:

- [ ] PostgreSQL cloud database created (Supabase/Neon/Vercel Postgres)
- [ ] MongoDB Atlas IP whitelist set to `0.0.0.0/0`
- [ ] `DATABASE_URL` added to Vercel environment variables
- [ ] `MONGODB_URI` added to Vercel environment variables
- [ ] `MONGODB_DB` added to Vercel environment variables
- [ ] `package.json` build script updated
- [ ] Code pushed to GitHub
- [ ] Vercel project connected to GitHub repo

---

## 🚨 Common Issues

### Issue: "Can't reach database server"

**Solution:** Check connection string and SSL mode

### Issue: "MongoDB connection timeout"

**Solution:** Add `0.0.0.0/0` to MongoDB Atlas IP whitelist

### Issue: "Prisma client not generated"

**Solution:** Add `"postinstall": "prisma generate"` to package.json

### Issue: "Migration failed"

**Solution:** Run `npx prisma migrate deploy` manually after first deploy

---

## 🎯 Quick Setup (5 Minutes)

### 1. Create Supabase Database
- Go to https://supabase.com
- Create project
- Copy connection string

### 2. Add Vercel Environment Variables
```
DATABASE_URL = postgresql://postgres.[ref]:[pass]@aws-0-[region].pooler.supabase.com:6543/postgres
MONGODB_URI = mongodb+srv://azazshaikh2703:azazshaikh2703@cluster0.u7dxgjm.mongodb.net/cutting_stock?retryWrites=true&w=majority
MONGODB_DB = cutting_stock
```

### 3. Update package.json
```json
"build": "prisma generate && next build"
```

### 4. Push & Deploy
```bash
git add .
git commit -m "Configure for Vercel"
git push
```

### 5. Done! 🎉

---

## 📚 Resources

- [Vercel Postgres Docs](https://vercel.com/docs/storage/vercel-postgres)
- [Supabase Docs](https://supabase.com/docs)
- [Neon Docs](https://neon.tech/docs)
- [Prisma Deploy Guide](https://www.prisma.io/docs/guides/deployment/deployment-guides/deploying-to-vercel)
- [MongoDB Atlas Docs](https://www.mongodb.com/docs/atlas/)

