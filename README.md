# RentFlow

RentFlow is a modern full-stack rent management platform for tenants, management/property managers, owners/landlords, and super admins. It includes a responsive SaaS dashboard, REST API, PostgreSQL schema, AI service stubs, Swagger documentation, PWA/mobile support, and Capacitor Android support.

## Stack

- Frontend: React, TypeScript, Vite, Tailwind-ready CSS architecture, Recharts, Framer Motion-ready layout patterns
- Backend: Node.js, Express, JWT, RBAC, Swagger/OpenAPI, WebSocket-ready service boundaries
- AI service: Python FastAPI for late-payment prediction, tenant risk, maintenance forecasting, and financial insights
- Data: PostgreSQL schema, Redis-ready caching, demo seed data
- Deployment: Vercel web frontend, standard Node.js API hosting, Neon PostgreSQL

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


## Production Notes

The codebase is intentionally modular. Deploy the frontend as a Vite/Capacitor build, deploy the backend as a standard Node.js service with `npm run build` followed by `npm start`, and keep PostgreSQL on Neon. Replace mock payment adapters with M-Pesa Daraja, Stripe, PayPal, bank, and card provider credentials. Configure Twilio, SendGrid, Firebase Cloud Messaging, and WhatsApp Business in the backend environment. Enable HTTPS, rotate JWT secrets, connect object storage for maintenance media, and run database migrations before production.

For Android distribution, run `npm run build` in `frontend`, then `npx cap sync android` and build the Android app with Android Studio for Google Play Console.
