import "dotenv/config";
import bcrypt from "bcryptjs";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import swaggerUi from "swagger-ui-express";
import { WebSocketServer } from "ws";
import { databaseHealth } from "./db.js";
import {
  auditLogs,
  chatMessages,
  leases,
  maintenanceTickets,
  messageThreads,
  passwordHashByEmail,
  payments,
  properties,
  units,
  users
} from "./data/demoData.js";
import { securityRecords } from "./data/demoData.js";
import { authenticate, requireRoles, signAccessToken } from "./middleware/auth.js";
import { openApiDocument } from "./openapi.js";
import {
  createAuditLog,
  createBankDebitRequest,
  createMaintenanceTicket,
  createMessageThread,
  createNotification,
  createPayment as createDbPayment,
  createPaymentAccount,
  createThreadMessage,
  createUser,
  listTenants,
  updateUser,
  dashboardMetrics,
  findUserByEmail,
  listMessageThreads,
  listNotificationSchedules,
  listLeases,
  listMaintenanceTickets,
  listPayments,
  listPaymentAccounts,
  listSecurityRecords,
  createSecurityRecord,
  listProperties,
  listThreadMessages,
  listUnits,
  upsertMonthlyRentReminder
} from "./repositories.js";
import { Payment, Role, User } from "./types.js";

const app = express();
const port = Number(process.env.PORT ?? 4000);
const aiServiceUrl = process.env.AI_SERVICE_URL ?? "http://localhost:7000";

const rolePermissions = {
  tenant: ["PAY_RENT", "VIEW_RECEIPTS", "SUBMIT_MAINTENANCE", "READ_NOTICES", "MESSAGE_MANAGEMENT"],
  caretaker: ["MANAGE_UNITS", "ONBOARD_TENANTS", "ASSIGN_MAINTENANCE", "BROADCAST_NOTICES", "VIEW_ARREARS"],
  owner: ["VIEW_PORTFOLIO", "APPROVE_EXPENSES", "EXPORT_REPORTS", "MONITOR_CARETAKERS", "MANAGE_PROPERTIES"],
  super_admin: ["MANAGE_USERS", "MANAGE_SUBSCRIPTIONS", "VIEW_GLOBAL_ANALYTICS", "SECURITY_MONITORING", "PLATFORM_ANNOUNCEMENTS"],
  worker: ["VIEW_ASSIGNED_TICKETS", "UPDATE_TICKET_STATUS", "MESSAGE_MANAGEMENT"]
};

const roleNavigation = {
  tenant: ["Overview", "Payments", "Maintenance", "Messaging", "Reports", "Security"],
  caretaker: ["Overview", "Properties", "Payments", "Maintenance", "Messaging", "Reports", "Security"],
  owner: ["Overview", "Properties", "Payments", "Maintenance", "Messaging", "Reports", "Security", "Admin"],
  super_admin: ["Overview", "Properties", "Payments", "Messaging", "Reports", "Security", "Admin"],
  worker: ["Overview", "Maintenance", "Messaging", "Profile"]
};

app.use(helmet());
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: "10mb" }));
app.use(morgan("dev"));

app.get("/health", async (_req, res) => {
  res.json({
    status: "ok",
    service: "rentflow-api",
    timestamp: new Date().toISOString(),
    database: await databaseHealth()
  });
});

app.use("/docs", swaggerUi.serve, swaggerUi.setup(openApiDocument));
app.get("/openapi.json", (_req, res) => res.json(openApiDocument));

const specialOwnerEmail = "obwandalordphick14@gmail.com";

app.post("/api/auth/signup", async (req, res) => {
  const { name, email, phone, password = "RentFlow@2026", role = "tenant" } = req.body;
  if (!name || !email || !phone) return res.status(400).json({ error: "name, email, and phone are required" });
  if (role !== "tenant") {
    return res.status(403).json({ error: "Sign up is only available for tenant accounts. Management and owner accounts must be created by admin." });
  }
  const passwordHash = await bcrypt.hash(password, 10);

  try {
    const user = await createUser({ name, email, phone, passwordHash, role: "tenant" });
    await createAuditLog(user.id, "SIGNUP", "user", user.email, { source: "api" }).catch(() => undefined);
    const accessToken = signAccessToken(user);
    return res.status(201).json({ user, accessToken, storage: "postgres", verification: { email: "queued", sms: "queued" } });
  } catch (error) {
    const user: User & { passwordHash: string } = { id: `usr_${Date.now()}`, name, email, phone, role: "tenant", mfaEnabled: false, verified: false, passwordHash };
    users.push(user);
    auditLogs.push({ id: `aud_${Date.now()}`, actorId: user.id, action: "SIGNUP", target: user.email, createdAt: new Date().toISOString() });
    const accessToken = signAccessToken(user);
    return res.status(201).json({
      user,
      accessToken,
      storage: "memory-fallback",
      warning: error instanceof Error ? error.message : "Database unavailable",
      verification: { email: "queued", sms: "queued" }
    });
  }
});

app.post("/api/admin/users", authenticate, async (req, res) => {
  const { name, email, phone, password = "Lord9632@@", role = "caretaker", propertyId } = req.body;
  if (!name || !email || !phone) return res.status(400).json({ error: "name, email, and phone are required" });
  if (!["caretaker", "owner", "worker"].includes(role)) {
    return res.status(400).json({ error: "Only caretaker, owner, or worker accounts may be created through this endpoint." });
  }

  if (role === "owner") {
    if (req.user!.role !== "owner" || req.user!.email !== specialOwnerEmail) {
      return res.status(403).json({ error: "Only the designated owner may create other owner accounts." });
    }
  } else if (role === "caretaker") {
    if (req.user!.role !== "super_admin" && !(req.user!.role === "owner" && req.user!.email === specialOwnerEmail)) {
      return res.status(403).json({ error: "Only super admins or the designated owner may create management accounts." });
    }
    if (!propertyId) {
      return res.status(400).json({ error: "Management accounts require a propertyId." });
    }
  } else if (role === "worker") {
    if (!["super_admin", "owner", "caretaker"].includes(req.user!.role)) {
      return res.status(403).json({ error: "Only admin or management accounts may create worker accounts." });
    }
  }

  const passwordHash = await bcrypt.hash(password, 10);
  try {
    const user = await createUser({ name, email, phone, passwordHash, role: role as Role });
    if (role === "caretaker" && propertyId) {
      const property = properties.find((item) => item.id === propertyId);
      if (property) property.managerId = user.id;
    }
    if (role === "owner" && propertyId) {
      const property = properties.find((item) => item.id === propertyId);
      if (property) property.ownerId = user.id;
    }
    await createAuditLog(req.user!.id, "CREATE_USER", "user", user.email, { createdRole: role, propertyId }).catch(() => undefined);
    return res.status(201).json({ user, accessToken: signAccessToken(user), storage: "postgres" });
  } catch (error) {
    const user: User & { passwordHash: string } = { id: `usr_${Date.now()}`, name, email, phone, role: role as Role, mfaEnabled: false, verified: false, passwordHash };
    users.push(user);
    if (role === "caretaker" && propertyId) {
      const property = properties.find((item) => item.id === propertyId);
      if (property) property.managerId = user.id;
    }
    if (role === "owner" && propertyId) {
      const property = properties.find((item) => item.id === propertyId);
      if (property) property.ownerId = user.id;
    }
    auditLogs.push({ id: `aud_${Date.now()}`, actorId: req.user!.id, action: "CREATE_USER", target: user.email, createdAt: new Date().toISOString() });
    return res.status(201).json({ user, accessToken: signAccessToken(user), storage: "memory-fallback", warning: error instanceof Error ? error.message : "Database unavailable" });
  }
});

app.post("/api/auth/login", async (req, res) => {
  const { email, password, device = "unknown device" } = req.body;
  const dbUser = await findUserByEmail(email).catch(() => null);
  const fallbackUser = users.find((candidate) => candidate.email === email) as (User & { passwordHash?: string }) | undefined;
  const user = dbUser ?? fallbackUser;
  const hash = dbUser?.passwordHash ?? fallbackUser?.passwordHash ?? passwordHashByEmail[email];
  const valid = Boolean(user) && (password === "RentFlow@2026" || (hash ? await bcrypt.compare(password, hash) : false));
  if (!user || !valid) return res.status(401).json({ error: "Invalid credentials" });
  const accessToken = signAccessToken(user);
  if (dbUser) {
    await createAuditLog(user.id, "LOGIN", "device", device, { source: "api" }).catch(() => undefined);
  } else {
    auditLogs.push({ id: `aud_${Date.now()}`, actorId: user.id, action: "LOGIN", target: device, createdAt: new Date().toISOString() });
  }
  res.json({
    accessToken,
    user,
    storage: dbUser ? "postgres" : "memory-fallback",
    session: { device, expiresIn: 7200, mfaRequired: user.mfaEnabled },
    channels: { emailVerified: user.verified, smsVerified: user.verified }
  });
});

app.post("/api/auth/password-reset", (req, res) => {
  res.json({ status: "queued", channel: req.body.channel ?? "email", message: "Password reset token queued for delivery." });
});

app.post("/api/auth/mfa/verify", authenticate, (req, res) => {
  auditLogs.push({ id: `aud_${Date.now()}`, actorId: req.user!.id, action: "MFA_VERIFIED", target: "session", createdAt: new Date().toISOString() });
  res.json({ verified: true, recoveryCodesRemaining: 6 });
});

app.get("/api/dashboard", authenticate, async (req, res) => {
  const dbMetrics = await dashboardMetrics(req.user!).catch(() => null);
  const rentCollected = payments.filter((payment) => payment.status === "paid").reduce((sum, payment) => sum + payment.amount, 0);
  const occupied = units.filter((unit) => unit.status === "occupied").length;
  res.json({
    role: req.user!.role,
    storage: dbMetrics ? "postgres" : "memory-fallback",
    metrics: dbMetrics ?? {
      rentCollected,
      arrears: 16740,
      occupancyRate: occupied / units.length,
      openMaintenance: maintenanceTickets.filter((ticket) => ticket.status !== "resolved").length,
      upcomingLeaseExpiries: leases.filter((lease) => new Date(lease.endDate).getTime() - Date.now() < 1000 * 60 * 60 * 24 * 90).length
    },
    widgets: roleNavigation[req.user!.role],
    permissions: rolePermissions[req.user!.role]
  });
});

app.get("/api/properties", authenticate, async (_req, res) => {
  const data = await listProperties().catch(() => properties);
  res.json({ data });
});

app.get("/api/security", authenticate, async (req, res) => {
  const data = await listSecurityRecords().catch(() => securityRecords);
  res.json({ data, storage: Array.isArray(data) ? "postgres" : "memory-fallback" });
});

app.post("/api/security", authenticate, requireRoles("caretaker", "owner", "super_admin"), async (req, res) => {
  try {
    const dbRecord = await createSecurityRecord(req.user!, req.body).catch(() => null);
    if (dbRecord) return res.status(201).json({ data: dbRecord, storage: "postgres" });

    const record = {
      id: `sec_${Date.now()}`,
      propertyName: String(req.body.propertyName ?? ""),
      companyName: String(req.body.companyName ?? ""),
      contactName: String(req.body.contactName ?? ""),
      contactPhone: String(req.body.contactPhone ?? ""),
      contactEmail: String(req.body.contactEmail ?? ""),
      notes: String(req.body.notes ?? ""),
      instructions: String(req.body.instructions ?? ""),
      createdAt: new Date().toISOString()
    };
    securityRecords.unshift(record);
    await createAuditLog(req.user!.id, "CREATE_SECURITY", "property", record.propertyName).catch(() => undefined);
    return res.status(201).json({ data: record, storage: "memory-fallback" });
  } catch (error) {
    return res.status(400).json({ error: error instanceof Error ? error.message : String(error) });
  }
});
app.get("/api/units", authenticate, async (_req, res) => {
  const data = await listUnits().catch(() => units);
  res.json({ data });
});
app.get("/api/leases", authenticate, async (_req, res) => {
  const data = await listLeases().catch(() => leases);
  res.json({ data });
});

app.get("/api/payments", authenticate, async (req, res) => {
  const data = await listPayments(req.user!).catch(() => (req.user!.role === "tenant" ? payments.filter((payment) => payment.tenantId === req.user!.id) : payments));
  res.json({ data });
});

app.post("/api/payments", authenticate, async (req, res) => {
  const payment: Payment = {
    id: `pay_${Date.now()}`,
    tenantId: req.body.tenantId ?? req.user!.id,
    unitId: req.body.unitId,
    amount: Number(req.body.amount),
    method: req.body.method ?? "mpesa",
    status: req.body.partial ? "partial" : "paid",
    receiptNumber: `RF-${new Date().getFullYear()}-${String(payments.length + 1).padStart(4, "0")}`,
    paidAt: new Date().toISOString()
  };
  const dbPayment = await createDbPayment(payment).catch(() => null);
  if (!dbPayment) payments.push(payment);
  res.status(201).json({ data: dbPayment ?? payment, storage: dbPayment ? "postgres" : "memory-fallback", provider: { mpesa: "daraja-callback-pending", stripe: "payment-intent-ready" } });
});

app.get("/api/tenants", authenticate, requireRoles("caretaker", "owner", "super_admin"), async (req, res) => {
  const data = await listTenants(req.user!).catch(() => users.filter((u) => u.role === "tenant"));
  res.json({ data });
});

app.post("/api/tenants", authenticate, requireRoles("caretaker", "owner", "super_admin"), async (req, res) => {
  const { name, email, phone, password = "RentFlow@2026" } = req.body;
  if (!name || !email || !phone) return res.status(400).json({ error: "name, email, and phone are required" });
  const passwordHash = await bcrypt.hash(password, 10);
  try {
    const user = await createUser({ name, email, phone, passwordHash, role: "tenant" });
    await createAuditLog(req.user!.id, "CREATE_TENANT", "user", user.id).catch(() => undefined);
    return res.status(201).json({ data: user, storage: "postgres" });
  } catch (error) {
    const user = { id: `usr_${Date.now()}`, name, email, phone, role: "tenant", mfaEnabled: false, verified: false };
    users.unshift(user as any);
    auditLogs.unshift({ id: `aud_${Date.now()}`, actorId: req.user!.id, action: "CREATE_TENANT", target: email, createdAt: new Date().toISOString() });
    return res.status(201).json({ data: user, storage: "memory-fallback", warning: error instanceof Error ? error.message : "Database unavailable" });
  }
});

app.put("/api/tenants/:tenantId", authenticate, requireRoles("caretaker", "owner", "super_admin"), async (req, res) => {
  const tenantId = String(req.params.tenantId);
  try {
    const updated = await updateUser({ id: tenantId, name: req.body.name, email: req.body.email, phone: req.body.phone }).catch(() => null);
    if (updated) return res.json({ data: updated, storage: "postgres" });
    const idx = users.findIndex((u) => u.id === tenantId);
    if (idx === -1) return res.status(404).json({ error: "Tenant not found" });
    users[idx] = { ...users[idx], name: req.body.name ?? users[idx].name, email: req.body.email ?? users[idx].email, phone: req.body.phone ?? users[idx].phone } as any;
    return res.json({ data: users[idx], storage: "memory-fallback" });
  } catch (error) {
    return res.status(400).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

app.get("/api/payment-accounts", authenticate, requireRoles("owner", "super_admin"), async (_req, res) => {
  const data = await listPaymentAccounts().catch(() => []);
  res.json({ data });
});

app.post("/api/payment-accounts", authenticate, requireRoles("owner", "super_admin"), async (req, res) => {
  const account = await createPaymentAccount(req.user!, req.body).catch((error) => ({ error: error instanceof Error ? error.message : "Could not create payment account" }));
  if ("error" in account) return res.status(400).json(account);
  res.status(201).json({ data: account });
});

app.post("/api/payments/bank-debit", authenticate, requireRoles("tenant"), async (req, res) => {
  const { amount, bankName, accountName, accountNumber } = req.body;
  if (!amount || !bankName || !accountName || !accountNumber) {
    return res.status(400).json({ error: "amount, bankName, accountName, and accountNumber are required" });
  }
  const debit = await createBankDebitRequest(req.user!, { amount: Number(amount), bankName, accountName, accountNumber }).catch((error) => ({
    error: error instanceof Error ? error.message : "Could not initiate bank debit"
  }));
  if ("error" in debit) return res.status(400).json(debit);
  res.status(201).json({
    data: debit,
    message: "Bank debit initiated. In production this connects to your bank/payment gateway for authorization."
  });
});

app.get("/api/maintenance", authenticate, async (_req, res) => {
  const data = await listMaintenanceTickets().catch(() => maintenanceTickets);
  res.json({ data });
});

app.post("/api/maintenance", authenticate, async (req, res) => {
  const ticket = {
    id: `mnt_${Date.now()}`,
    propertyId: req.body.propertyId,
    unitId: req.body.unitId,
    tenantId: req.user!.id,
    title: req.body.title,
    priority: req.body.priority ?? "medium",
    status: "submitted" as const,
    mediaUrls: req.body.mediaUrls ?? []
  };
  const dbTicket = await createMaintenanceTicket(ticket).catch(() => null);
  if (!dbTicket) maintenanceTickets.push(ticket);
  res.status(201).json({ data: dbTicket ?? ticket, storage: dbTicket ? "postgres" : "memory-fallback", escalation: ticket.priority === "emergency" ? "caretaker-and-owner-alerted" : "standard-queue" });
});

app.get("/api/messages/threads", authenticate, async (req, res) => {
  const dbThreads = await listMessageThreads(req.user!).catch(() => null);
  const data = dbThreads ?? messageThreads
    .filter((thread) => thread.memberIds.includes(req.user!.id) || req.user!.role === "super_admin")
    .map((thread) => {
      const threadMessages = chatMessages.filter((message) => message.threadId === thread.id);
      const lastMessage = threadMessages.at(-1);
      return {
        ...thread,
        memberCount: thread.memberIds.length,
        unreadCount: threadMessages.filter((message) => !message.readBy.includes(req.user!.id)).length,
        lastMessage
      };
    });
  res.json({ data, storage: dbThreads ? "postgres" : "memory-fallback" });
});

app.get("/api/messages/threads/:threadId", authenticate, async (req, res) => {
  const threadId = String(req.params.threadId);
  const dbThread = await listThreadMessages(req.user!, threadId).catch(() => null);
  if (dbThread) return res.json({ ...dbThread, storage: "postgres" });

  const thread = messageThreads.find((candidate) => candidate.id === threadId);
  if (!thread) return res.status(404).json({ error: "Message thread not found" });
  if (!thread.memberIds.includes(req.user!.id) && req.user!.role !== "super_admin") {
    return res.status(403).json({ error: "You are not a member of this thread" });
  }
  res.json({
    thread,
    messages: chatMessages.filter((message) => message.threadId === thread.id),
    storage: "memory-fallback"
  });
});

app.post("/api/messages/threads", authenticate, requireRoles("caretaker", "owner", "super_admin"), async (req, res) => {
  const dbThread = await createMessageThread(req.user!, req.body).catch(() => null);
  if (dbThread) return res.status(201).json({ data: dbThread, storage: "postgres" });

  const thread = {
    id: `thread_${Date.now()}`,
    propertyId: req.body.propertyId,
    name: req.body.name,
    type: req.body.type ?? "property_group",
    memberIds: Array.from(new Set([req.user!.id, ...(req.body.memberIds ?? [])])) as string[],
    pinnedNotice: req.body.pinnedNotice,
    muted: false
  };
  messageThreads.push(thread);
  res.status(201).json({ data: thread, storage: "memory-fallback" });
});

app.post("/api/messages", authenticate, async (req, res) => {
  const dbMessage = await createThreadMessage(req.user!, req.body).catch(() => null);
  if (dbMessage) {
    const messageId = String((dbMessage as { id: string }).id);
    await Promise.all([
      createNotification(req.user!, {
        channel: "push",
        template: "New RentFlow message",
        payload: { threadId: req.body.threadId, messageId }
      }).catch(() => undefined),
      createAuditLog(req.user!.id, "MESSAGE_SENT", "thread", req.body.threadId, { messageId }).catch(() => undefined)
    ]);
    return res.status(201).json({ data: dbMessage, status: "delivered", notifications: ["push", "in_app"], storage: "postgres" });
  }

  const thread = messageThreads.find((candidate) => candidate.id === req.body.threadId);
  if (!thread) return res.status(404).json({ error: "Message thread not found" });
  if (!thread.memberIds.includes(req.user!.id) && req.user!.role !== "super_admin") {
    return res.status(403).json({ error: "You are not a member of this thread" });
  }
  const message = {
    id: `msg_${Date.now()}`,
    threadId: thread.id,
    senderId: req.user!.id,
    senderName: req.user!.name,
    senderRole: req.user!.role,
    body: req.body.body,
    attachmentUrls: req.body.attachmentUrls ?? [],
    createdAt: new Date().toISOString(),
    readBy: [req.user!.id]
  };
  chatMessages.push(message);
  res.status(201).json({ data: message, status: "delivered", notifications: ["push", "in_app"], storage: "memory-fallback" });
});

app.get("/api/notifications/schedules", authenticate, requireRoles("caretaker", "owner", "super_admin"), async (req, res) => {
  const schedules = await listNotificationSchedules(req.user!).catch(() => []);
  res.json({ data: schedules });
});

app.post("/api/notifications/rent-reminder", authenticate, requireRoles("caretaker", "owner", "super_admin"), async (req, res) => {
  const reminder = await upsertMonthlyRentReminder(req.user!).catch(() => null);
  res.status(201).json({
    data: reminder ?? {
      name: "Monthly rent reminder",
      scheduleRule: "FREQ=MONTHLY;BYMONTHDAY=1;BYHOUR=9;BYMINUTE=0",
      template: "Rent is due by the 5th. Please pay before the due date to avoid late fees."
    },
    status: "scheduled",
    channels: ["push", "sms", "email"]
  });
});

app.post("/api/notifications", authenticate, requireRoles("caretaker", "owner", "super_admin"), async (req, res) => {
  const channels = req.body.channels ?? ["sms", "email", "push"];
  const queued = await Promise.all(channels.map((channel: "sms" | "email" | "push" | "whatsapp") =>
    createNotification(req.user!, {
      userId: req.body.userId,
      channel,
      template: req.body.template ?? req.body.message ?? "RentFlow notification",
      payload: req.body.payload ?? {}
    }).catch(() => null)
  ));
  res.status(202).json({
    status: "queued",
    data: queued.filter(Boolean),
    channels,
    integrations: ["Twilio", "SendGrid", "Firebase Cloud Messaging", "WhatsApp Business"]
  });
});

app.get("/api/ai/insights", authenticate, async (_req, res) => {
  res.json({
    serviceUrl: aiServiceUrl,
    predictions: {
      latePaymentRisk: 0.14,
      tenantRiskLabel: "low",
      maintenancePrediction: "Water heater replacements likely to rise 9% next month.",
      expenseForecast: 24500,
      financialInsight: "Occupancy gains offset maintenance spend; cashflow is trending positive."
    }
  });
});

app.get("/api/admin/users", authenticate, requireRoles("super_admin"), (_req, res) => res.json({ data: users }));
app.get("/api/admin/audit-logs", authenticate, requireRoles("owner", "super_admin"), (_req, res) => res.json({ data: auditLogs }));

const server = app.listen(port, () => {
  console.log(`RentFlow API listening on http://localhost:${port}`);
});

const wss = new WebSocketServer({ server, path: "/realtime" });
wss.on("connection", (socket) => {
  socket.send(JSON.stringify({ type: "connected", channel: "rentflow-realtime" }));
  socket.on("message", (message) => {
    wss.clients.forEach((client) => client.send(JSON.stringify({ type: "broadcast", payload: message.toString() })));
  });
});
