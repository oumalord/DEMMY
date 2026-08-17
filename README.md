# RentFlow

RentFlow is a modern full-stack rent management platform for tenants, management/property managers, owners/landlords, and super admins. It includes a responsive SaaS dashboard, REST API, PostgreSQL schema, AI service stubs, Swagger documentation, PWA/mobile support, and Docker deployment configuration.

## Stack

- Frontend: React, TypeScript, Vite, Tailwind-ready CSS architecture, Recharts, Framer Motion-ready layout patterns
- Backend: Node.js, Express, JWT, RBAC, Swagger/OpenAPI, WebSocket-ready service boundaries
- AI service: Python FastAPI for late-payment prediction, tenant risk, maintenance forecasting, and financial insights
- Data: PostgreSQL schema, Redis-ready caching, demo seed data
- DevOps: Docker Compose, health checks, environment samples

## Quick Start

```bash
npm install
npm run dev
```

## Database

Use PostgreSQL. The schema and seed data are in `database/schema.sql` and `database/seed.sql`.

On Windows, run:

```powershell
cd "C:\Users\Sir. Lord's\Documents\DEMMY"
.\scripts\setup-database.ps1
```

Full database notes are in `docs/database.md`.

Frontend: `http://localhost:5173`

Backend: `http://localhost:4000`

API docs: `http://localhost:4000/docs`

AI service: `http://localhost:7000/docs`

## Demo Accounts

| Role | Email | Password |
| --- | --- | --- |
| Tenant | tenant@rentflow.app | RentFlow@2026 |
| Caretaker | caretaker@rentflow.app | RentFlow@2026 |
| Owner | owner@rentflow.app | RentFlow@2026 |
| Super Admin | admin@rentflow.app | RentFlow@2026 |

## Production Notes

The codebase is intentionally modular. Replace mock payment adapters with M-Pesa Daraja, Stripe, PayPal, bank, and card provider credentials. Configure Twilio, SendGrid, Firebase Cloud Messaging, and WhatsApp Business in `backend/.env`. Enable HTTPS, rotate JWT secrets, connect object storage for maintenance media, and run database migrations before production.
