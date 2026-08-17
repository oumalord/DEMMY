# 🚀 Quick Setup: RentFlow + Neon

## Step 1: Deploy Database Schema to Neon (2 minutes)

Go to your **Neon Dashboard** → **SQL Editor** and run these two scripts:

### First, run this (schema.sql):
Copy everything from: `database/schema.sql`

### Then, run this (seed.sql):
Copy everything from: `database/seed.sql`

**That's it!** Your database is ready.

---

## Step 2: Start the Application (Local Dev)

### Option A: Quick Start Script (Windows)
```powershell
.\start.ps1
```

### Option B: Manual Start

**Terminal 1 - Backend:**
```powershell
cd backend
npm install
npm run dev
```

**Terminal 2 - Frontend:**
```powershell
cd frontend
npm install
npm run dev
```

---

## Step 3: Access the App

**Open in browser:** http://localhost:5173

**Sign in with:**
- Email: `owner@test.com`
- Password: `password`

---

## That's it! 🎉

Your app is now connected to **Neon PostgreSQL** with zero Docker overhead.

### Next Steps:
1. ✅ Click "Properties" tab
2. ✅ Click "Add listing"
3. ✅ Create your first property
4. ✅ Refresh page → Property persists in Neon ✅
5. ✅ Sign out and back in → Property still there ✅

### Test Users (all password: "password")
- `tenant@test.com` - Tenant
- `caretaker@test.com` - Management
- `owner@test.com` - Owner
- `admin@test.com` - Admin

### Environment Files
- `backend/.env` - Backend database connection
- `frontend/.env` - Frontend API URL

Both are already configured with your Neon connection!

**Happy building! 🚀**
