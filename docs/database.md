# RentFlow Database

Use **PostgreSQL** for RentFlow.

Why PostgreSQL:

- RentFlow data is relational: users, properties, units, leases, payments, expenses, maintenance, reports, messages, and audit logs all connect to each other.
- PostgreSQL supports transactions for rent payments, leases, expense approvals, and receipts.
- It has strong indexing, JSONB fields for flexible metadata, and works well for SaaS multi-tenant systems.
- It is easy to run locally with Docker and deploy later on AWS RDS, Azure Database for PostgreSQL, Google Cloud SQL, Supabase, Neon, or Railway.

## Local Setup With Docker

From the project root:

```powershell
cd "C:\Users\Sir. Lord's\Documents\DEMMY"
docker compose up -d postgres redis
```

The database URL is:

```text
postgres://rentflow:rentflow_dev_password@localhost:5432/rentflow
```

Docker Compose automatically loads:

```text
database/schema.sql
database/seed.sql
```

## Local Setup With Installed PostgreSQL On Windows

Your machine already appears to have PostgreSQL installed as a Windows service. Use this path if Docker is not available:

```powershell
cd "C:\Users\Sir. Lord's\Documents\DEMMY"
.\scripts\setup-local-postgres.ps1
```

If you want to use PostgreSQL 18 instead of 17:

```powershell
.\scripts\setup-local-postgres.ps1 -PostgresBin "C:\Program Files\PostgreSQL\18\bin"
```

The script creates:

```text
Database: rentflow
User: rentflow
Password: rentflow_dev_password
```

## Backend Environment

Create `backend/.env`:

```env
PORT=4000
JWT_SECRET=change-this-before-production
DATABASE_URL=postgres://rentflow:rentflow_dev_password@localhost:5432/rentflow
REDIS_URL=redis://localhost:6379
AI_SERVICE_URL=http://localhost:7000
```

## Build And Run Backend

```powershell
cd "C:\Users\Sir. Lord's\Documents\DEMMY"
node node_modules\typescript\bin\tsc -p backend\tsconfig.json
cd backend
node dist/server.js
```

Open:

```text
http://localhost:4000/health
http://localhost:4000/docs
```

If the database is connected, `/health` returns:

```json
{
  "database": {
    "connected": true,
    "database": "rentflow"
  }
}
```

## Important Files

- `database/schema.sql`: all PostgreSQL tables, enums, indexes.
- `database/seed.sql`: demo organization, users, properties, units, leases, payments, maintenance, messages.
- `backend/src/db.ts`: PostgreSQL connection pool.
- `backend/src/repositories.ts`: database queries used by the API.
- `backend/src/server.ts`: Express routes connected to PostgreSQL with demo fallback.

## Demo Login

```json
{
  "email": "owner@rentflow.app",
  "password": "RentFlow@2026"
}
```
