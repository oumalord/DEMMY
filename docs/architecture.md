# RentFlow Architecture

## Application Layers

- Web and mobile PWA: React dashboard with role-specific workspaces for tenants, caretakers, owners, and super admins.
- API gateway: Express REST API with JWT authentication, RBAC, Swagger, audit logging, payment and notification adapters, and WebSocket events.
- Data layer: PostgreSQL stores normalized operational data. Redis is optional for sessions, cache, rate limiting, realtime fanout, and idempotency locks.
- AI service: FastAPI microservice exposes late payment prediction, maintenance forecasting, expense forecasting, and financial insight endpoints.
- Integrations: M-Pesa Daraja, Stripe, PayPal, bank transfers, Twilio, SendGrid, Firebase Cloud Messaging, WhatsApp Business, smart meters, smart gates, IoT, and CCTV adapters.

## Security Model

- JWT access tokens with short expiry and refresh-token rotation.
- MFA support, email verification, SMS verification, password reset tokens, device fingerprinting, and trusted-device state.
- RBAC guards at API route level and organization scoping for multi-tenant isolation.
- Audit logs for authentication, payment, maintenance, expense approval, admin, and security events.
- Production requirements: TLS, encrypted secrets, WAF/rate limits, database backups, key rotation, secure object storage, GDPR data export/deletion workflows.

## Mobile and Offline

The frontend includes a PWA manifest. Add a service worker for offline queues covering maintenance drafts, pending messages, receipts, and cached lease documents. Sync write operations with idempotency keys once connectivity returns.

## Deployment

For local development, run the Node.js API and Vite frontend with npm scripts. For production, deploy the web frontend to Vercel, deploy the API as a standard Node.js service, keep PostgreSQL on Neon, and route all traffic through HTTPS. Build the Android package with Capacitor and publish it through Google Play Console. Redis is optional and should only be added when the deployed workload needs it.
