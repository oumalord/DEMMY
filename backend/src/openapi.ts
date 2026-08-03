export const openApiDocument = {
  openapi: "3.0.3",
  info: {
    title: "RentFlow API",
    version: "1.0.0",
    description: "REST API for RentFlow rent management, payments, maintenance, analytics, AI insights, notifications, and platform administration."
  },
  servers: [{ url: "http://localhost:4000" }],
  components: {
    securitySchemes: {
      bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" }
    }
  },
  security: [{ bearerAuth: [] }],
  paths: {
    "/health": { get: { summary: "Health check", responses: { "200": { description: "OK" } } } },
    "/api/auth/login": { post: { summary: "Login with email and password", responses: { "200": { description: "JWT and user profile" } } } },
    "/api/dashboard": { get: { summary: "Role-aware dashboard metrics", responses: { "200": { description: "Dashboard summary" } } } },
    "/api/properties": { get: { summary: "List accessible properties", responses: { "200": { description: "Properties" } } } },
    "/api/units": { get: { summary: "List units", responses: { "200": { description: "Units" } } } },
    "/api/payments": { get: { summary: "List payments" }, post: { summary: "Create rent payment intent or record offline transfer" } },
    "/api/payment-accounts": { get: { summary: "List admin-configured M-Pesa and bank accounts" }, post: { summary: "Admin creates M-Pesa or bank collection account" } },
    "/api/payments/bank-debit": { post: { summary: "Tenant initiates bank-account rent debit" } },
    "/api/maintenance": { get: { summary: "List maintenance tickets" }, post: { summary: "Submit maintenance request with priority and media references" } },
    "/api/messages/threads": { get: { summary: "List inbuilt tenant and management chat groups" }, post: { summary: "Create a moderated property chat group" } },
    "/api/messages/threads/{threadId}": { get: { summary: "Read a chat thread and its messages" } },
    "/api/messages": { post: { summary: "Send an inbuilt group or support message with optional attachments" } },
    "/api/notifications": { post: { summary: "Send SMS, email, push, or WhatsApp notification" } },
    "/api/notifications/schedules": { get: { summary: "List recurring notification schedules" } },
    "/api/notifications/rent-reminder": { post: { summary: "Schedule rent reminders on the 1st of every month for rent due by the 5th" } },
    "/api/ai/insights": { get: { summary: "Retrieve AI late-payment, risk, expense, and maintenance predictions" } },
    "/api/admin/users": { get: { summary: "Admin user management", responses: { "200": { description: "Users" } } } },
    "/api/admin/audit-logs": { get: { summary: "Audit log search", responses: { "200": { description: "Audit logs" } } } }
  }
};
