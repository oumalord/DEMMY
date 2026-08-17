# RentFlow Setup Guide - Neon PostgreSQL (No Docker)

This guide sets up RentFlow to use Neon.com PostgreSQL without Docker.

## Prerequisites

- Node.js 18+ installed
- npm or yarn
- Redis running locally (optional for development, required for production)
- Neon.com PostgreSQL database

## Step 1: Initialize Neon Database

Your Neon database is at: `ep-round-frog-aylyv6uk-pooler.c-5.us-east-2.aws.neon.tech`

### Option A: Using Neon SQL Editor (Easiest)

1. Go to your Neon dashboard
2. Click "SQL Editor"
3. Copy the contents of `database/schema.sql`
4. Paste into the SQL Editor and run
5. Copy the contents of `database/seed.sql`
6. Paste into the SQL Editor and run

### Option B: Using psql CLI

```bash
# Connect to your Neon database
psql "postgresql://neondb_owner:npg_nGWSs5OCjl9U@ep-round-frog-aylyv6uk-pooler.c-5.us-east-2.aws.neon.tech/neondb?sslmode=require"

# Run schema
\i database/schema.sql

# Run seed
\i database/seed.sql

# Exit
\q
```

## Step 2: Start Redis (if using locally)

```bash
# Using Docker for just Redis
docker run -d -p 6379:6379 redis:7-alpine

# Or install Redis locally and run:
redis-server
```

## Step 3: Install Dependencies

```bash
# Install backend dependencies
cd backend
npm install
cd ..

# Install frontend dependencies
cd frontend
npm install
cd ..
```

## Step 4: Start the Backend

```bash
cd backend
npm run dev
```

You should see:
```
Server running on port 4000
Connected to database: neondb
```

## Step 5: Start the Frontend

In a new terminal:

```bash
cd frontend
npm run dev
```

You should see:
```
VITE v4.x.x  ready in xxx ms

➜  Local:   http://localhost:5173/
➜  press h to show help
```

## Step 6: Open the App

Open your browser to: **http://localhost:5173**

## Test Users

Sign in with any of these accounts (password: "password"):

- `tenant@test.com` - Tenant role
- `caretaker@test.com` - Management role
- `owner@test.com` - Owner role
- `admin@test.com` - Admin role

## Creating Your First Property

1. Sign in as `owner@test.com`
2. Go to **Properties** tab
3. Click **Add listing**
4. Fill in property details and units
5. Click **Create listing**
6. Refresh the page to confirm it persists in Neon ✅

## Environment Variables

### Backend (`backend/.env`)

```env
DATABASE_URL=postgresql://user:password@host/database?sslmode=require
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-secret-key
AI_SERVICE_URL=http://localhost:7000
PORT=4000
NODE_ENV=development
```

### Frontend (`frontend/.env`)

```env
VITE_API_URL=http://localhost:4000
```

## Troubleshooting

### Database Connection Error

- Verify `DATABASE_URL` in `backend/.env` is correct
- Ensure Neon database is active (check Neon dashboard)
- Check that schema and seed have been applied

### CORS Errors

- Frontend is trying to reach `http://localhost:4000`
- Ensure backend is running and accessible
- Check `VITE_API_URL` in `frontend/.env`

### Port Already in Use

```bash
# Kill process using port 4000
npx kill-port 4000

# Kill process using port 5173
npx kill-port 5173

# Kill process using port 6379 (Redis)
npx kill-port 6379
```

## Going to Production

Before deploying:

1. Set strong `JWT_SECRET` in environment variables
2. Use `NODE_ENV=production`
3. Set `VITE_API_URL` to your production API domain
4. Use a managed Redis service (e.g., Redis Cloud)
5. Enable SSL/TLS for all connections
6. Set up proper error logging

## Quick Start (One Liner)

After database setup:

```bash
# Terminal 1: Backend
cd backend && npm install && npm run dev

# Terminal 2: Frontend  
cd frontend && npm install && npm run dev
```

Then open: http://localhost:5173
