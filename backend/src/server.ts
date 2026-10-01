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
  expenses,
  leases,
  maintenanceTickets,
  messageThreads,
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
  updatePaymentStatus,
  updatePropertyManager,
  updatePropertyOwner,
  createPaymentAccount,
  createProperty,
  createUnit,
  createAgreementTemplate,
  listAgreementTemplates,
  listNotifications,
  createThreadMessage,
  updateUserPassword,
  updateMaintenanceTicket,
  createUser,
  listTenants,
  updateUser,
  dashboardMetrics,
  findUserByEmail,
  findUserById,
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
  updateUnit,
  listExpenses,
  createExpense,
  upsertMonthlyRentReminder,
  listVisitorRecords,
  listPublicVisitorOptions,
  createVisitorRecord,
  updateVisitorRecord
} from "./repositories.js";
import { Payment, Role, User } from "./types.js";

const app = express();
const port = Number(process.env.PORT ?? 4000);
const aiServiceUrl = process.env.AI_SERVICE_URL ?? "http://localhost:7000";
let wss: WebSocketServer | null = null;

function broadcastRealtime(event: Record<string, unknown>) {
  if (!wss) return;
  const payload = JSON.stringify(event);
  wss.clients.forEach((client) => {
    if (client.readyState === client.OPEN) {
      client.send(payload);
    }
  });
}

const DEFAULT_ACCOUNT_PASSWORD = "Tenant@2026";

function getAllowedPropertyIdsForUser(user: User): string[] {
  if (user.role === "tenant") {
    const assignedUnit = units.find((unit) => unit.tenantId === user.id);
    return assignedUnit ? [assignedUnit.propertyId] : [];
  }
  if (user.role === "owner") {
    return properties.filter((property) => property.ownerId === user.id || property.managerId === user.id).map((property) => property.id);
  }
  if (user.role === "caretaker") {
    return properties.filter((property) => property.managerId === user.id).map((property) => property.id);
  }
  return properties.map((property) => property.id);
}

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

const oauthProviders = {
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID,
    authorizationEndpoint: "https://accounts.google.com/o/oauth2/v2/auth",
    scope: "openid email profile"
  },
  facebook: {
    clientId: process.env.FACEBOOK_APP_ID,
    authorizationEndpoint: "https://www.facebook.com/v20.0/dialog/oauth",
    scope: "email,public_profile"
  },
  apple: {
    clientId: process.env.APPLE_SERVICE_ID,
    authorizationEndpoint: "https://appleid.apple.com/auth/authorize",
    scope: "name email"
  }
} as const;

app.get("/api/auth/oauth/:provider", (req, res) => {
  const providerName = String(req.params.provider).toLowerCase() as keyof typeof oauthProviders;
  const provider = oauthProviders[providerName];
  if (!provider) return res.status(404).json({ error: "Unsupported OAuth provider" });
  if (!provider.clientId) {
    return res.status(503).json({ error: `${providerName} OAuth is not configured. Add its credentials to the backend environment.` });
  }

  const redirectUri = process.env[`${providerName.toUpperCase()}_OAUTH_REDIRECT_URI`] ?? `http://localhost:${port}/api/auth/oauth/${providerName}/callback`;
  const url = new URL(provider.authorizationEndpoint);
  url.searchParams.set("client_id", provider.clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", provider.scope);
  if (providerName === "google") url.searchParams.set("access_type", "offline");
  if (providerName === "apple") url.searchParams.set("response_mode", "form_post");
  return res.redirect(url.toString());
});

app.all("/api/auth/oauth/:provider/callback", (req, res) => {
  const provider = String(req.params.provider).toLowerCase();
  if (req.query.error || (req.body && req.body.error)) {
    return res.status(400).send(`OAuth sign-in was cancelled or denied by ${provider}. You can close this page and try again.`);
  }
  return res.status(501).send(`The ${provider} authorization succeeded, but account linking still needs a provider token exchange configuration.`);
});

app.use("/docs", swaggerUi.serve, swaggerUi.setup(openApiDocument));
app.get("/openapi.json", (_req, res) => res.json(openApiDocument));

const specialOwnerEmail = "obwandalordphick14@gmail.com";

app.post("/api/auth/signup", async (req, res) => {
  const { name, email, phone, password = DEFAULT_ACCOUNT_PASSWORD, role = "tenant", apartment, houseNumber } = req.body;
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
    if (houseNumber) {
      const unit = units.find((candidate) => candidate.label.toLowerCase() === String(houseNumber).trim().toLowerCase() &&
        (!apartment || String(properties.find((property) => property.name.toLowerCase() === String(apartment).trim().toLowerCase())?.id ?? "") === String(candidate.propertyId))) as any;
      if (unit && !unit.tenantId) {
        unit.tenantId = user.id;
        unit.status = "occupied";
      }
    }
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
  const { name, email, phone, password = DEFAULT_ACCOUNT_PASSWORD, role = "caretaker", propertyId } = req.body;
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
      // Update in database
      await updatePropertyManager(propertyId, user.id).catch(() => undefined);
      // Update in memory
      const property = properties.find((item) => item.id === propertyId);
      if (property) property.managerId = user.id;
    }
    if (role === "owner" && propertyId) {
      // Update in database
      await updatePropertyOwner(propertyId, user.id).catch(() => undefined);
      // Update in memory
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
  const rawEmail = req.body?.email;
  const rawPassword = req.body?.password;
  const password = String(rawPassword ?? "").trim();
  const device = String(req.body?.device ?? "unknown device");
  const email = String(rawEmail ?? "").trim().toLowerCase();
  let user;
  try {
    user = await findUserByEmail(email);
  } catch {
    return res.status(503).json({ error: "Login is temporarily unavailable. Please try again shortly." });
  }
  if (!user || !password || !await bcrypt.compare(password, user.passwordHash)) {
    return res.status(401).json({ error: "Invalid credentials" });
  }
  const accessToken = signAccessToken(user);
  await createAuditLog(user.id, "LOGIN", "device", device, { source: "api" }).catch(() => undefined);
  res.json({
    accessToken,
    user,
    requiresPasswordChange: false,
    storage: "postgres",
    session: { device, expiresIn: 7200, mfaRequired: user.mfaEnabled },
    channels: { emailVerified: user.verified, smsVerified: user.verified }
  });
});

app.post("/api/auth/change-password", authenticate, async (req, res) => {
  const currentPassword = String(req.body?.currentPassword ?? "").trim();
  const newPassword = String(req.body?.newPassword ?? "").trim();
  const confirmPassword = String(req.body?.confirmPassword ?? "").trim();

  if (!currentPassword || !newPassword || !confirmPassword) {
    return res.status(400).json({ error: "Current password, new password, and confirmation are required." });
  }
  if (newPassword.length < 8) {
    return res.status(400).json({ error: "New password must be at least 8 characters." });
  }
  if (newPassword !== confirmPassword) {
    return res.status(400).json({ error: "New password and confirmation do not match." });
  }

  const dbUser = await findUserByEmail(req.user!.email).catch(() => null);
  const fallbackUser = users.find((candidate) => candidate.email.toLowerCase() === req.user!.email.toLowerCase()) as (User & { passwordHash?: string }) | undefined;
  const user = dbUser ?? fallbackUser;
  const hash = dbUser?.passwordHash ?? fallbackUser?.passwordHash;
  const validCurrent = user && (currentPassword === DEFAULT_ACCOUNT_PASSWORD || (hash ? await bcrypt.compare(currentPassword, hash) : false));

  if (!user || !validCurrent) {
    return res.status(401).json({ error: "Current password is incorrect." });
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await updateUserPassword(req.user!.id, passwordHash).catch(() => undefined);
  if (fallbackUser) fallbackUser.passwordHash = passwordHash;
  if (dbUser) {
    await createAuditLog(req.user!.id, "PASSWORD_CHANGED", "user", req.user!.id, { source: "api" }).catch(() => undefined);
  }
  res.json({ status: "updated", message: "Password updated successfully. Please continue to your dashboard." });
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

app.get("/api/properties", authenticate, async (req, res) => {
  try {
    const data = (await listProperties()) as Array<{ id: string; ownerId?: string; managerId?: string; [key: string]: unknown }>;
    
    // Filter based on user role
    let filtered = data;
    if (req.user!.role === "tenant") {
      // Tenants don't see properties directly
      filtered = [];
    } else if (req.user!.role === "caretaker") {
      // Management sees only properties they manage
      filtered = data.filter((p) => p.managerId === req.user!.id);
    } else if (req.user!.role === "owner") {
      // Owners see properties they own or manage
      filtered = data.filter((p) => p.ownerId === req.user!.id || p.managerId === req.user!.id);
    }
    // super_admin sees all properties (no filtering)
    
    res.json({ data: filtered });
  } catch (error) {
    return res.status(500).json({ error: "Failed to load properties from database." });
  }
});

app.post("/api/properties", authenticate, requireRoles("caretaker", "owner", "super_admin"), async (req, res) => {
  try {
    const property = await createProperty(req.user!, {
      name: String(req.body.name ?? ""),
      address: String(req.body.address ?? ""),
      street: req.body.street ? String(req.body.street) : undefined,
      location: req.body.location ? String(req.body.location) : undefined,
      latitude: req.body.latitude ? Number(req.body.latitude) : undefined,
      longitude: req.body.longitude ? Number(req.body.longitude) : undefined,
      electricityPrice: req.body.electricityPrice ? String(req.body.electricityPrice) : undefined,
      garbagePrice: req.body.garbagePrice ? String(req.body.garbagePrice) : undefined,
      waterPrice: req.body.waterPrice ? String(req.body.waterPrice) : undefined,
      propertyType: req.body.propertyType ? String(req.body.propertyType) : undefined,
      contactName: req.body.contactName ? String(req.body.contactName) : undefined,
      contactPhone: req.body.contactPhone ? String(req.body.contactPhone) : undefined,
      contactEmail: req.body.contactEmail ? String(req.body.contactEmail) : undefined,
      contractFee: req.body.contractFee ? Number(req.body.contractFee) : undefined,
      managementQuote: req.body.managementQuote ? String(req.body.managementQuote) : undefined,
      agreementTemplateUrl: req.body.agreementTemplateUrl ? String(req.body.agreementTemplateUrl) : undefined,
      valuation: req.body.valuation ? Number(req.body.valuation) : undefined
    });
    await createAuditLog(req.user!.id, "CREATE_PROPERTY", "property", String(property.id), { name: String(property.name) }).catch(() => undefined);
    broadcastRealtime({ type: "property.created", property });
    res.status(201).json({ data: property });
  } catch (error) {
    return res.status(400).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

app.post("/api/units", authenticate, requireRoles("caretaker", "owner", "super_admin"), async (req, res) => {
  try {
    const unit = await createUnit(req.user!, {
      propertyId: String(req.body.propertyId ?? ""),
      label: req.body.label ? String(req.body.label) : undefined,
      block: req.body.block ? String(req.body.block) : undefined,
      floor: req.body.floor ? String(req.body.floor) : undefined,
      number: req.body.number ? String(req.body.number) : undefined,
      rent: Number(req.body.rent ?? 0),
      deposit: req.body.deposit ? Number(req.body.deposit) : undefined,
      leaseMonths: req.body.leaseMonths ? Number(req.body.leaseMonths) : undefined,
      status: String(req.body.status ?? "vacant")
    });
    await createAuditLog(req.user!.id, "CREATE_UNIT", "unit", String(unit.id), { label: String(unit.label), propertyId: String(unit.propertyId) }).catch(() => undefined);
    broadcastRealtime({ type: "unit.created", unit });
    res.status(201).json({ data: unit });
  } catch (error) {
    return res.status(400).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

app.get("/api/notifications", authenticate, async (req, res) => {
  try {
    const data = await listNotifications(req.user!);
    res.json({ data, storage: "postgres" });
  } catch (error) {
    res.status(503).json({ error: error instanceof Error ? error.message : "Could not load notices" });
  }
});

function fillAgreementTemplate(templateText: string, values: Record<string, string>) {
  return Object.entries(values).reduce((text, [key, value]) => {
    return text.replace(new RegExp(`{{\s*${key}\s*}}`, "gi"), value);
  }, templateText);
}

app.get("/api/agreements/templates", authenticate, async (req, res) => {
  const data = await listAgreementTemplates(req.user!).catch(() => []);
  res.json({ data });
});

app.post("/api/agreements/templates", authenticate, requireRoles("caretaker", "owner", "super_admin"), async (req, res) => {
  try {
    const template = await createAgreementTemplate(req.user!, {
      propertyId: String(req.body.propertyId ?? ""),
      name: String(req.body.name ?? "Lease agreement template"),
      templateText: String(req.body.templateText ?? ""),
      fileName: req.body.fileName ? String(req.body.fileName) : undefined
    });
    await createAuditLog(req.user!.id, "UPLOAD_AGREEMENT_TEMPLATE", "agreement_template", String(template.id), { propertyId: template.propertyId ? String(template.propertyId) : undefined }).catch(() => undefined);
    broadcastRealtime({ type: "agreement.template.created", template });
    res.status(201).json({ data: template });
  } catch (error) {
    return res.status(400).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

app.post("/api/agreements/generate", authenticate, requireRoles("caretaker", "owner", "super_admin"), async (req, res) => {
  const propertyId = String(req.body.propertyId ?? "");
  if (!propertyId) return res.status(400).json({ error: "propertyId is required" });

  try {
    const templates = await listAgreementTemplates(req.user!).catch(() => []);
    const template = templates.find((item) => item.propertyId === propertyId);
    if (!template) return res.status(404).json({ error: "No agreement template found for this property" });

    const propertyList = await listProperties() as Array<{ id: string; name: string; address: string }>;
    const property = propertyList.find((item) => item.id === propertyId);
    if (!property) return res.status(404).json({ error: "Property not found" });

    const unitIds = Array.isArray(req.body.unitIds) ? req.body.unitIds.map(String) : [];
    const unitData = await listUnits() as Array<{ id: string; propertyId: string; tenantId?: string; label: string; rent?: number; deposit?: number }>;
    const selectedUnits = unitIds.length > 0
      ? unitData.filter((unit) => unitIds.includes(String(unit.id)))
      : unitData.filter((unit) => unit.propertyId === propertyId && unit.tenantId);

    const agreementTemplate = template as { id: string; templateText: string };
    const leaseItems = await Promise.all(selectedUnits.map(async (unit) => {
      const tenant = unit.tenantId ? await findUserById(unit.tenantId).catch(() => null) : null;
      const values: Record<string, string> = {
        tenantName: tenant?.name ?? "Tenant",
        tenantEmail: tenant?.email ?? "tenant@example.com",
        tenantPhone: tenant?.phone ?? "N/A",
        propertyName: property.name,
        propertyAddress: property.address,
        unitLabel: unit.label,
        rentAmount: String(unit.rent ?? 0),
        depositAmount: String(unit.deposit ?? 0),
        leaseStart: new Date().toISOString().split("T")[0],
        leaseEnd: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365).toISOString().split("T")[0],
        currentDate: new Date().toISOString().split("T")[0]
      };
      return {
        unitId: unit.id,
        tenantId: unit.tenantId,
        tenantName: tenant?.name ?? "Unassigned tenant",
        renderedText: fillAgreementTemplate(agreementTemplate.templateText, values),
        fileName: `${property.name.replace(/\s+/g, "_")}-${unit.label}-lease.txt`
      };
    }));

    await createAuditLog(req.user!.id, "GENERATE_LEASES", "property", propertyId, { templateId: template.id, generated: leaseItems.length }).catch(() => undefined);
    res.json({ data: leaseItems });
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

app.get("/api/security", authenticate, async (req, res) => {
  try {
    const data = await listSecurityRecords();
    res.json({ data });
  } catch (error) {
    res.json({ data: [], error: error instanceof Error ? error.message : "Failed to load security records" });
  }
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

async function getVisitorPropertyIds(user: User) {
  const allProperties = await listProperties() as Array<{ id: string; ownerId?: string; managerId?: string }>;
  return allProperties.filter((property) => user.role === "super_admin" ||
    (user.role === "caretaker" && property.managerId === user.id) ||
    (user.role === "owner" && (property.ownerId === user.id || property.managerId === user.id)))
    .map((property) => String(property.id));
}

app.get("/api/public/visitor-options/:propertyId", async (req, res) => {
  try {
    const data = await listPublicVisitorOptions(String(req.params.propertyId));
    if (data.length === 0) return res.status(404).json({ error: "No units are available for this property." });
    res.json({ data });
  } catch (error) {
    res.status(503).json({ error: error instanceof Error ? error.message : "Could not load visitor application details." });
  }
});

app.post("/api/public/visitor-applications", async (req, res) => {
  try {
    const visitorName = String(req.body.visitorName ?? "").trim();
    const phone = String(req.body.phone ?? "").trim();
    const email = String(req.body.email ?? "").trim().toLowerCase();
    const reason = String(req.body.reason ?? "").trim();
    const destination = String(req.body.destination ?? "").trim();
    const propertyId = String(req.body.propertyId ?? "");
    const unitId = String(req.body.unitId ?? "");
    if (!visitorName || !phone || !email || !reason || !destination || !propertyId || !unitId || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: "Enter your name, phone, valid email, reason for visit, destination, and a valid property/unit." });
    }
    const dbRecord = await createVisitorRecord({
      visitorName,
      phone,
      email,
      reason,
      destination,
      propertyId,
      unitId,
      floor: req.body.floor ? String(req.body.floor) : undefined,
      houseNumber: req.body.houseNumber ? String(req.body.houseNumber) : undefined,
      status: "pending"
    });
    res.status(201).json({ data: dbRecord, storage: "postgres" });
  } catch (error) {
    res.status(503).json({ error: error instanceof Error ? error.message : "Could not submit visitor application." });
  }
});

app.get("/api/visitors", authenticate, async (req, res) => {
  if (req.user!.role === "tenant") return res.json({ data: [], storage: "postgres" });
  try {
    const allowedPropertyIds = await getVisitorPropertyIds(req.user!);
    const requestedPropertyId = req.query.propertyId ? String(req.query.propertyId) : undefined;
    const data = await listVisitorRecords(allowedPropertyIds.filter((id) => !requestedPropertyId || id === requestedPropertyId));
    res.json({ data, storage: "postgres" });
  } catch (error) {
    res.status(503).json({ error: error instanceof Error ? error.message : "Could not load visitor records." });
  }
});

app.post("/api/visitors", authenticate, requireRoles("caretaker", "owner", "super_admin"), async (req, res) => {
  try {
    const record = await createVisitorRecord({
      visitorName: String(req.body.visitorName ?? "").trim(),
      phone: String(req.body.phone ?? "").trim(),
      email: req.body.email ? String(req.body.email).trim().toLowerCase() : undefined,
      reason: String(req.body.reason ?? "").trim(),
      checkIn: String(req.body.checkIn ?? new Date().toISOString()),
      checkOut: req.body.checkOut ? String(req.body.checkOut) : undefined,
      destination: String(req.body.destination ?? "").trim(),
      propertyId: String(req.body.propertyId ?? ""),
      unitId: String(req.body.unitId ?? ""),
      floor: req.body.floor ? String(req.body.floor) : undefined,
      houseNumber: req.body.houseNumber ? String(req.body.houseNumber) : undefined,
      status: req.body.status ? String(req.body.status) : "active"
    });
    await createAuditLog(req.user!.id, "CREATE_VISITOR", "visitor", String(req.body.visitorName ?? "").trim()).catch(() => undefined);
    res.status(201).json({ data: record, storage: "postgres" });
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : "Could not save visitor pass." });
  }
});

app.post("/api/visitors/:id/check-out", authenticate, requireRoles("caretaker", "owner", "super_admin"), async (req, res) => {
  const checkedOutAt = new Date().toISOString();
  try {
    const visibleRecords = await listVisitorRecords(await getVisitorPropertyIds(req.user!));
    const visitor = visibleRecords.find((record) => record.id === String(req.params.id));
    if (!visitor) return res.status(404).json({ error: "Visitor pass not found." });
    if (visitor.status !== "active") return res.status(409).json({ error: "Only checked-in visitors can be checked out." });
    const record = await updateVisitorRecord(String(req.params.id), { checkOut: checkedOutAt, status: "checked-out" });
    if (!record) return res.status(404).json({ error: "Visitor pass not found." });
    await createAuditLog(req.user!.id, "CHECK_OUT_VISITOR", "visitor", String(req.params.id)).catch(() => undefined);
    res.json({ data: record, storage: "postgres" });
  } catch (error) {
    res.status(503).json({ error: error instanceof Error ? error.message : "Could not check out visitor." });
  }
});

app.post("/api/visitors/:id/check-in", authenticate, requireRoles("caretaker", "owner", "super_admin"), async (req, res) => {
  const checkedInAt = new Date().toISOString();
  try {
    const visibleRecords = await listVisitorRecords(await getVisitorPropertyIds(req.user!));
    const visitor = visibleRecords.find((record) => record.id === String(req.params.id));
    if (!visitor) return res.status(404).json({ error: "Visitor pass not found." });
    if (visitor.status !== "pending") return res.status(409).json({ error: "Only pending applications can be checked in." });
    const record = await updateVisitorRecord(String(req.params.id), { checkIn: checkedInAt, status: "active" });
    if (!record) return res.status(404).json({ error: "Visitor pass not found." });
    await createAuditLog(req.user!.id, "CHECK_IN_VISITOR", "visitor", String(req.params.id)).catch(() => undefined);
    res.json({ data: record, storage: "postgres" });
  } catch (error) {
    res.status(503).json({ error: error instanceof Error ? error.message : "Could not check in visitor." });
  }
});

app.put("/api/visitors/:id", authenticate, requireRoles("caretaker", "owner", "super_admin"), async (req, res) => {
  try {
    const id = String(req.params.id);
    const visibleRecords = await listVisitorRecords(await getVisitorPropertyIds(req.user!));
    if (!visibleRecords.some((record) => record.id === id)) return res.status(404).json({ error: "Visitor record not found." });
    const dbRecord = await updateVisitorRecord(id, {
      visitorName: req.body.visitorName ? String(req.body.visitorName) : undefined,
      phone: req.body.phone ? String(req.body.phone) : undefined,
      email: req.body.email ? String(req.body.email) : undefined,
      reason: req.body.reason ? String(req.body.reason) : undefined,
      checkIn: req.body.checkIn ? String(req.body.checkIn) : undefined,
      checkOut: req.body.checkOut ? String(req.body.checkOut) : undefined,
      destination: req.body.destination ? String(req.body.destination) : undefined,
      propertyId: req.body.propertyId ? String(req.body.propertyId) : undefined,
      unitId: req.body.unitId ? String(req.body.unitId) : undefined,
      floor: req.body.floor ? String(req.body.floor) : undefined,
      houseNumber: req.body.houseNumber ? String(req.body.houseNumber) : undefined,
      status: req.body.status ? String(req.body.status) : undefined
    });
    if (!dbRecord) return res.status(404).json({ error: "Visitor record not found." });
    await createAuditLog(req.user!.id, "UPDATE_VISITOR", "visitor", id).catch(() => undefined);
    return res.json({ data: dbRecord, storage: "postgres" });
  } catch (error) {
    return res.status(400).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

app.get("/api/units", authenticate, async (req, res) => {
  try {
    const allUnits = (await listUnits()) as Array<{ propertyId: string; [key: string]: unknown }>;
    const allProperties = (await listProperties()) as Array<{ id: string; ownerId?: string; managerId?: string; [key: string]: unknown }>;
    
    // Build allowed property IDs based on user role
    let allowedPropertyIds: string[] = [];
    if (req.user!.role === "tenant") {
      // Tenants see units assigned to them
      const tenantUnits = allUnits.filter((u) => (u as any).tenantId === req.user!.id);
      allowedPropertyIds = [...new Set(tenantUnits.map((u) => String(u.propertyId)))];
    } else if (req.user!.role === "caretaker") {
      // Management sees units for properties they manage
      allowedPropertyIds = allProperties
        .filter((p) => p.managerId === req.user!.id)
        .map((p) => String(p.id));
    } else if (req.user!.role === "owner") {
      // Owners see units for properties they own or manage
      allowedPropertyIds = allProperties
        .filter((p) => p.ownerId === req.user!.id || p.managerId === req.user!.id)
        .map((p) => String(p.id));
    } else if (req.user!.role === "super_admin") {
      // Super admin sees all units
      allowedPropertyIds = allProperties.map((p) => String(p.id));
    }
    
    const scoped = allowedPropertyIds.length > 0 
      ? allUnits.filter((unit) => allowedPropertyIds.includes(String(unit.propertyId)))
      : [];
    res.json({ data: scoped });
  } catch (error) {
    res.json({ data: [] });
  }
});

app.put("/api/units/:unitId", authenticate, requireRoles("caretaker", "owner", "super_admin"), async (req, res) => {
  const unitId = String(req.params.unitId);
  try {
    // Check access control - user must have access to the unit's property
    const allProperties = (await listProperties()) as Array<{ id: string; ownerId?: string; managerId?: string; [key: string]: unknown }>;
    const allUnits = (await listUnits()) as Array<{ id: string; propertyId: string; [key: string]: unknown }>;
    
    const targetUnit = allUnits.find((u) => u.id === unitId);
    if (!targetUnit) {
      // Fall through to check in-memory array
    } else {
      const targetProperty = allProperties.find((p) => p.id === targetUnit.propertyId);
      if (targetProperty) {
        const hasAccess = req.user!.role === "super_admin" || 
          (req.user!.role === "caretaker" && targetProperty.managerId === req.user!.id) ||
          (req.user!.role === "owner" && (targetProperty.ownerId === req.user!.id || targetProperty.managerId === req.user!.id));
        
        if (!hasAccess) {
          return res.status(403).json({ error: "You do not have permission to access this unit" });
        }
      }
    }
    
    const sourceUnit = units.find((unit) => unit.id === unitId);
    const requestedTenantId = req.body.tenantId ? String(req.body.tenantId) : undefined;
    console.log("UPDATE UNIT", { unitId, sourceUnit: sourceUnit?.id, requestedTenantId, status: req.body.status });
    
    if (requestedTenantId && sourceUnit && sourceUnit.propertyId) {
      const target = users.find((user) => user.id === requestedTenantId);
      if (!target) {
        console.log("UNIT UPDATE ERROR: Tenant not found", { requestedTenantId });
        return res.status(400).json({ error: "Tenant not found" });
      }
      const targetUnit = units.find((unit) => unit.tenantId === requestedTenantId && unit.propertyId !== sourceUnit.propertyId);
      if (targetUnit) {
        console.log("UNIT UPDATE ERROR: Cross-listing conflict", { requestedTenantId, existingProperty: targetUnit.propertyId, targetProperty: sourceUnit.propertyId });
        return res.status(400).json({ error: "This tenant already belongs to a different listing." });
      }
    }

    const updatedUnit = await updateUnit({
      id: unitId,
      status: req.body.status,
      tenantId: requestedTenantId
    }).catch((err) => {
      console.log("UNIT UPDATE DB ERROR:", err instanceof Error ? err.message : String(err));
      return null;
    });
    
    if (updatedUnit) {
      console.log("UNIT UPDATE SUCCESS (postgres)", updatedUnit);
      return res.json({ data: updatedUnit, storage: "postgres" });
    }
    
    const index = units.findIndex((unit) => unit.id === unitId);
    if (index === -1) {
      console.log("UNIT UPDATE ERROR: Unit not found", { unitId });
      return res.status(404).json({ error: "Unit not found" });
    }
    
    units[index] = {
      ...units[index],
      status: req.body.status ?? units[index].status,
      tenantId: requestedTenantId ?? units[index].tenantId
    };
    console.log("UNIT UPDATE SUCCESS (fallback)", units[index]);
    await createAuditLog(req.user!.id, "UPDATE_UNIT", "unit", unitId, { status: units[index].status, tenantId: units[index].tenantId }).catch(() => undefined);
    return res.json({ data: units[index], storage: "memory-fallback" });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.log("UNIT UPDATE EXCEPTION:", message);
    return res.status(400).json({ error: message });
  }
});

app.get("/api/expenses", authenticate, requireRoles("caretaker", "owner", "super_admin"), async (req, res) => {
  const data = await listExpenses(req.user!);
  res.json({ data });
});

app.post("/api/expenses", authenticate, requireRoles("caretaker", "owner", "super_admin"), async (req, res) => {
  const { propertyId, category, description, amount, receiptUrl } = req.body;
  if (!propertyId || !category || !description || !amount) {
    return res.status(400).json({ error: "propertyId, category, description, and amount are required" });
  }
  try {
    const expense = await createExpense(req.user!, {
      propertyId: String(propertyId),
      category: String(category),
      description: String(description),
      amount: Number(amount),
      requestedBy: req.user!.id,
      receiptUrl: receiptUrl ? String(receiptUrl) : undefined
    }).catch(() => null);
    if (expense) {
      return res.status(201).json({ data: expense, storage: "postgres" });
    }
    const record = {
      id: `exp_${Date.now()}`,
      propertyId: String(propertyId),
      requestedBy: req.user!.id,
      category: String(category),
      description: String(description),
      amount: Number(amount),
      receiptUrl: receiptUrl ? String(receiptUrl) : undefined,
      createdAt: new Date().toISOString()
    };
    expenses.unshift(record);
    await createAuditLog(req.user!.id, "CREATE_EXPENSE", "property", propertyId, { category, amount }).catch(() => undefined);
    return res.status(201).json({ data: record, storage: "memory-fallback" });
  } catch (error) {
    return res.status(400).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

app.get("/api/leases", authenticate, async (_req, res) => {
  const data = await listLeases();
  res.json({ data });
});

app.get("/api/payments", authenticate, async (req, res) => {
  const data = await listPayments(req.user!);
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

app.put("/api/payments/:paymentId", authenticate, requireRoles("caretaker", "owner", "super_admin"), async (req, res) => {
  const paymentId = String(req.params.paymentId);
  const status = String(req.body.status ?? "approved") as Payment["status"];
  try {
    const updatedPayment = await updatePaymentStatus(paymentId, status).catch(() => null);
    if (updatedPayment) {
      return res.json({ data: updatedPayment, storage: "postgres" });
    }
    const idx = payments.findIndex((payment) => payment.id === paymentId);
    if (idx === -1) return res.status(404).json({ error: "Payment not found" });
    payments[idx] = { ...payments[idx], status };
    await createAuditLog(req.user!.id, "APPROVE_PAYMENT", "payment", paymentId, { status }).catch(() => undefined);
    return res.json({ data: payments[idx], storage: "memory-fallback" });
  } catch (error) {
    return res.status(400).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

app.get("/api/tenants", authenticate, requireRoles("caretaker", "owner", "super_admin"), async (req, res) => {
  try {
    const data = await listTenants(req.user!);
    console.log("LIST TENANTS", { user: req.user!.email, count: data.length, tenants: data.map((t) => t.email) });
    res.json({ data });
  } catch (error) {
    console.log("LIST TENANTS ERROR:", error instanceof Error ? error.message : String(error));
    const fallbackTenants = users.filter((u) => u.role === "tenant").map((u) => ({ id: u.id, name: u.name, email: u.email, phone: u.phone, role: u.role, mfaEnabled: u.mfaEnabled, verified: u.verified }));
    console.log("LIST TENANTS FALLBACK", { count: fallbackTenants.length });
    res.json({ data: fallbackTenants, storage: "memory-fallback", warning: error instanceof Error ? error.message : "Database unavailable" });
  }
});

app.post("/api/tenants", authenticate, requireRoles("caretaker", "owner", "super_admin"), async (req, res) => {
  const { name, email, phone, password = DEFAULT_ACCOUNT_PASSWORD, unitId, propertyId, block, floor, number } = req.body;
  if (!name || !email || !phone) return res.status(400).json({ error: "name, email, and phone are required" });
  
  const passwordHash = await bcrypt.hash(password, 10);
  try {
    const user = await createUser({ name, email, phone, passwordHash, role: "tenant" });
    
    // If unitId is provided, assign tenant to unit
    if (unitId) {
      const unitToUpdate = units.find((u) => u.id === unitId);
      if (unitToUpdate) {
        const updated = await updateUnit({
          id: unitId,
          tenantId: user.id,
          status: "occupied"
        }).catch(() => null);
        
        if (!updated) {
          // Fall back to in-memory update
          unitToUpdate.tenantId = user.id;
          unitToUpdate.status = "occupied";
        }
      }
    }
    
    await createAuditLog(req.user!.id, "CREATE_TENANT", "user", user.id, { unitId, propertyId }).catch(() => undefined);
    return res.status(201).json({ data: user, unitAssigned: !!unitId, storage: "postgres" });
  } catch (error) {
    const user = { id: `usr_${Date.now()}`, name, email, phone, role: "tenant", mfaEnabled: false, verified: false };
    users.unshift(user as any);
    
    // If unitId is provided, assign tenant to unit in memory
    if (unitId) {
      const unitToUpdate = units.find((u) => u.id === unitId);
      if (unitToUpdate) {
        unitToUpdate.tenantId = user.id;
        unitToUpdate.status = "occupied";
      }
    }
    
    auditLogs.unshift({ id: `aud_${Date.now()}`, actorId: req.user!.id, action: "CREATE_TENANT", target: email, createdAt: new Date().toISOString() });
    return res.status(201).json({ data: user, unitAssigned: !!unitId, storage: "memory-fallback", warning: error instanceof Error ? error.message : "Database unavailable" });
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

app.get("/api/maintenance", authenticate, async (req, res) => {
  const data = await listMaintenanceTickets();
  const filtered = req.user!.role === "tenant"
    ? data.filter((ticket) => ticket.tenantId === req.user!.id)
    : data;
  res.json({ data: filtered });
});

app.post("/api/maintenance", authenticate, async (req, res) => {
  const ticket = {
    id: `mnt_${Date.now()}`,
    propertyId: req.body.propertyId,
    unitId: req.body.unitId,
    tenantId: req.user!.id,
    title: req.body.title,
    description: String(req.body.description ?? ""),
    priority: req.body.priority ?? "medium",
    status: "submitted" as const,
    mediaUrls: req.body.mediaUrls ?? []
  };
  const dbTicket = await createMaintenanceTicket(ticket).catch(() => null);
  const createdTicket = dbTicket ?? ticket;
  if (!dbTicket) maintenanceTickets.push(ticket);
  broadcastRealtime({ type: "maintenance.ticket.created", ticket: createdTicket });
  res.status(201).json({ data: createdTicket, storage: dbTicket ? "postgres" : "memory-fallback", escalation: ticket.priority === "emergency" ? "caretaker-and-owner-alerted" : "standard-queue" });
});

app.put("/api/maintenance/:ticketId", authenticate, requireRoles("caretaker", "owner", "super_admin", "worker"), async (req, res) => {
  const ticketId = String(req.params.ticketId);
  try {
    const updatedTicket = await updateMaintenanceTicket({
      ticketId,
      status: req.body.status,
      description: req.body.description,
      assignedTo: req.body.assignedTo,
      vendorName: req.body.vendorName,
      followUp: req.body.followUp ? { author: req.user!.name, note: String(req.body.followUp), createdAt: new Date().toISOString() } : undefined
    }).catch(() => null);
    if (updatedTicket) {
      broadcastRealtime({ type: "maintenance.ticket.updated", ticket: updatedTicket });
      return res.json({ data: updatedTicket, storage: "postgres" });
    }

    const index = maintenanceTickets.findIndex((ticket) => ticket.id === ticketId);
    if (index === -1) return res.status(404).json({ error: "Maintenance ticket not found" });
    const existing = maintenanceTickets[index];
    const followUps = existing.followUps ? [...existing.followUps] : [];
    if (req.body.followUp) {
      followUps.push({ author: req.user!.name, note: String(req.body.followUp), createdAt: new Date().toISOString() });
    }
    maintenanceTickets[index] = {
      ...existing,
      status: req.body.status ?? existing.status,
      description: String(req.body.description ?? existing.description ?? ""),
      assignedTo: req.body.assignedTo ?? existing.assignedTo,
      vendorName: req.body.vendorName ?? existing.vendorName,
      followUps
    };
    broadcastRealtime({ type: "maintenance.ticket.updated", ticket: maintenanceTickets[index] });
    res.json({ data: maintenanceTickets[index], storage: "memory-fallback" });
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

app.get("/api/messages/threads", authenticate, async (req, res) => {
  const dbThreads = await listMessageThreads(req.user!).catch(() => null);
  const scopedThreadData = (dbThreads ?? messageThreads
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
    })) as Array<{ propertyId?: string; memberIds: string[]; id: string; name: string; type: string; [key: string]: unknown }>;

  const allowedPropertyIds = getAllowedPropertyIdsForUser(req.user!);
  const filtered = req.user!.role === "super_admin" ? scopedThreadData : scopedThreadData.filter((thread) => {
    if (!thread.propertyId) return true;
    return allowedPropertyIds.includes(thread.propertyId);
  });

  res.json({ data: filtered, storage: dbThreads ? "postgres" : "memory-fallback" });
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
    broadcastRealtime({ type: "chat.message", message: dbMessage, threadId: req.body.threadId });
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
  broadcastRealtime({ type: "chat.message", message, threadId: message.threadId });
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
  const propertyId = req.body.propertyId;
  const payload = { ...req.body.payload, propertyId };
  try {
    const queued = await Promise.all(channels.map((channel: "sms" | "email" | "push" | "whatsapp") =>
      createNotification(req.user!, {
        userId: req.body.userId,
        channel,
        template: req.body.template ?? req.body.message ?? "RentFlow notification",
        payload,
        propertyId
      })
    ));
    broadcastRealtime({ type: "notification.sent", notifications: queued });
    res.status(202).json({
      status: "queued",
      data: queued,
      channels,
      integrations: ["Twilio", "SendGrid", "Firebase Cloud Messaging", "WhatsApp Business"]
    });
  } catch (error) {
    res.status(503).json({ error: error instanceof Error ? error.message : "Could not save notice" });
  }
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

const server = app.listen(port, async () => {
  console.log(`RentFlow API listening on http://localhost:${port}`);
  
  // Check database connection
  const health = await databaseHealth();
  if (health.connected) {
    console.log(`✓ Connected to database: ${health.database}`);
  } else {
    console.error(`✗ Database connection failed: ${health.error}`);
    console.error("   Make sure:");
    console.error("   1. DATABASE_URL is set in backend/.env");
    console.error("   2. Neon database schema.sql and seed.sql have been run");
    console.error("   3. Neon database is active and accessible");
  }
});

wss = new WebSocketServer({ server, path: "/realtime" });
wss.on("connection", (socket) => {
  socket.send(JSON.stringify({ type: "connected", channel: "rentflow-realtime" }));
  socket.on("message", (message) => {
    try {
      const payload = JSON.parse(message.toString());
      if (payload && typeof payload === "object" && ["call.request", "call.answer", "call.hangup"].includes(payload.type)) {
        broadcastRealtime(payload);
        return;
      }
    } catch {
      // ignore invalid JSON messages
    }
    wss?.clients.forEach((client) => client.send(JSON.stringify({ type: "broadcast", payload: message.toString() })));
  });
});
