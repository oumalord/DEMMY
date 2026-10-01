import { query, mapUser } from "./db.js";
import { Expense, MaintenanceTicket, Payment, Role, User } from "./types.js";

export interface UserWithPassword extends User {
  passwordHash: string;
}

export async function findUserByEmail(email: string): Promise<UserWithPassword | null> {
  const result = await query<Record<string, unknown>>(
    `select id, name, email, phone, role, mfa_enabled, email_verified_at, sms_verified_at, password_hash
     from users
     where lower(email) = lower($1)
     limit 1`,
    [email]
  );
  const row = result.rows[0];
  return row ? { ...mapUser(row), passwordHash: String(row.password_hash) } : null;
}

export async function findUserById(id: string): Promise<User | null> {
  const result = await query<Record<string, unknown>>(
    `select id, name, email, phone, role, mfa_enabled, email_verified_at, sms_verified_at
     from users
     where id = $1
     limit 1`,
    [id]
  );
  return result.rows[0] ? mapUser(result.rows[0]) : null;
}

export async function listTenants(user: User) {
  const organization = await query<{ organization_id: string }>("select organization_id from users where id = $1", [user.id]);
  const organizationId = organization.rows[0]?.organization_id;
  if (!organizationId) throw new Error("User organization not found.");

  const result = await query(
    `select id, name, email, phone, role, mfa_enabled, email_verified_at, sms_verified_at
     from users
     where organization_id = $1 and role = 'tenant'
     order by name asc`,
    [organizationId]
  );
  return result.rows.map((row) => ({
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    role: row.role,
    mfaEnabled: Boolean(row.mfa_enabled),
    verified: Boolean(row.email_verified_at || row.sms_verified_at)
  }));
}

export async function updateUser(input: { id: string; name?: string; email?: string; phone?: string; }) {
  const existing = await query<Record<string, unknown>>(
    `select id, name, email, phone, role, mfa_enabled, email_verified_at, sms_verified_at
     from users
     where id = $1
     limit 1`,
    [input.id]
  );
  if (!existing.rows[0]) throw new Error("User not found.");
  const row = existing.rows[0];
  const name = input.name ?? String(row.name);
  const email = input.email ?? String(row.email);
  const phone = input.phone ?? String(row.phone);

  const result = await query(
    `update users
     set name = $1,
         email = $2,
         phone = $3
     where id = $4
     returning id, name, email, phone, role, mfa_enabled, email_verified_at, sms_verified_at`,
    [name, email, phone, input.id]
  );
  const updated = result.rows[0];
  return {
    id: updated.id,
    name: updated.name,
    email: updated.email,
    phone: updated.phone,
    role: updated.role,
    mfaEnabled: Boolean(updated.mfa_enabled),
    verified: Boolean(updated.email_verified_at || updated.sms_verified_at)
  };
}

export async function updateUserPassword(userId: string, passwordHash: string) {
  const result = await query(
    `update users
     set password_hash = $2,
         updated_at = now()
     where id = $1
     returning id, email`,
    [userId, passwordHash]
  );
  if (!result.rows[0]) throw new Error("User not found");
  return result.rows[0];
}

export async function createUser(input: {
  name: string;
  email: string;
  phone: string;
  role: Role;
  passwordHash: string;
}): Promise<User> {
  const organization = await query<{ id: string }>("select id from organizations order by created_at asc limit 1");
  const organizationId = organization.rows[0]?.id;
  if (!organizationId) throw new Error("No organization exists. Run database/seed.sql first.");

  const result = await query<Record<string, unknown>>(
    `insert into users (organization_id, name, email, phone, password_hash, role)
     values ($1, $2, $3, $4, $5, $6)
     returning id, name, email, phone, role, mfa_enabled, email_verified_at, sms_verified_at`,
    [organizationId, input.name, input.email, input.phone, input.passwordHash, input.role]
  );
  return mapUser(result.rows[0]);
}

export async function createAuditLog(actorId: string | null, action: string, targetType: string, targetId: string, metadata = {}) {
  await query(
    `insert into audit_logs (organization_id, actor_id, action, target_type, target_id, metadata)
     values ((select organization_id from users where id = $1), $1, $2, $3, $4, $5::jsonb)`,
    [actorId, action, targetType, targetId, JSON.stringify(metadata)]
  );
}

export async function listProperties() {
  const result = await query(
    `select p.id,
            p.owner_id as "ownerId",
            p.manager_id as "managerId",
            p.name,
            p.address,
            p.street,
            p.location,
            p.latitude,
            p.longitude,
            p.electricity_price as "electricityPrice",
            p.garbage_price as "garbagePrice",
            p.water_price as "waterPrice",
            p.contract_fee as "contractFee",
            p.management_quote as "managementQuote",
            p.agreement_template_url as "agreementTemplateUrl",
            p.valuation,
            count(u.id)::int as units,
            coalesce(avg(case when u.status = 'occupied' then 1 else 0 end), 0)::float as "occupancyRate"
     from properties p
     left join units u on u.property_id = p.id
     group by p.id
     order by p.created_at desc`
  );
  return result.rows;
}

export async function createProperty(user: User, input: {
  name: string;
  address: string;
  street?: string;
  location?: string;
  latitude?: number;
  longitude?: number;
  electricityPrice?: string;
  garbagePrice?: string;
  waterPrice?: string;
  propertyType?: string;
  contactName?: string;
  contactPhone?: string;
  contactEmail?: string;
  contractFee?: number;
  managementQuote?: string;
  agreementTemplateUrl?: string;
  valuation?: number;
}) {
  const organization = await query<{ organization_id: string }>("select organization_id from users where id = $1", [user.id]);
  const organizationId = organization.rows[0]?.organization_id;
  if (!organizationId) throw new Error("User organization not found.");

  const result = await query(
    `insert into properties (
       organization_id, owner_id, manager_id, name, address, street, location, latitude, longitude,
       electricity_price, garbage_price, water_price, property_type, contact_name, contact_phone, contact_email,
       contract_fee, management_quote, agreement_template_url, valuation
     )
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)
     returning id,
               owner_id as "ownerId",
               manager_id as "managerId",
               name,
               address,
               street,
               location,
               latitude,
               longitude,
               electricity_price as "electricityPrice",
               garbage_price as "garbagePrice",
               water_price as "waterPrice",
               property_type as "propertyType",
               contact_name as "contactName",
               contact_phone as "contactPhone",
               contact_email as "contactEmail",
               contract_fee as "contractFee",
               management_quote as "managementQuote",
               agreement_template_url as "agreementTemplateUrl",
               valuation`,
    [organizationId, user.id, user.id, input.name, input.address, input.street ?? null, input.location ?? null,
      input.latitude ?? null, input.longitude ?? null, input.electricityPrice ?? null, input.garbagePrice ?? null,
      input.waterPrice ?? null, input.propertyType ?? null, input.contactName ?? null, input.contactPhone ?? null, input.contactEmail ?? null,
      input.contractFee ?? null, input.managementQuote ?? null, input.agreementTemplateUrl ?? null,
      input.valuation ?? 0]
  );
  return result.rows[0];
}

export async function updatePropertyManager(propertyId: string, managerId: string) {
  const result = await query(
    `update properties
     set manager_id = $2
     where id = $1
     returning id, owner_id as "ownerId", manager_id as "managerId"`,
    [propertyId, managerId]
  );
  return result.rows[0] ?? null;
}

export async function updatePropertyOwner(propertyId: string, ownerId: string) {
  const result = await query(
    `update properties
     set owner_id = $2
     where id = $1
     returning id, owner_id as "ownerId", manager_id as "managerId"`,
    [propertyId, ownerId]
  );
  return result.rows[0] ?? null;
}

export async function listUnits() {
  const result = await query(
    `select id,
            property_id as "propertyId",
            label,
            block,
            floor,
            number,
            bedrooms,
            rent_amount::float as rent,
            deposit_amount::float as deposit,
            status,
            tenant_id as "tenantId"
     from units
     order by label asc`
  );
  return result.rows;
}

export async function createUnit(user: User, input: {
  propertyId: string;
  label?: string;
  block?: string;
  floor?: string;
  number?: string;
  rent: number;
  deposit?: number;
  leaseMonths?: number;
  status?: string;
}) {
  // Construct label from block-floor-number if not provided
  const label = input.label || [input.block, input.floor, input.number].filter(Boolean).join("-") || "";
  
  const result = await query(
    `insert into units (property_id, label, block, floor, number, rent_amount, deposit_amount, status)
     values ($1,$2,$3,$4,$5,$6,$7,$8)
     returning id,
               property_id as "propertyId",
               label,
               block,
               floor,
               number,
               status,
               rent_amount::float as rent,
               deposit_amount::float as deposit,
               tenant_id as "tenantId"`,
    [input.propertyId, label, input.block ?? null, input.floor ?? null, input.number ?? null, input.rent, input.deposit ?? 0, input.status ?? "vacant"]
  );
  return result.rows[0];
}

export async function updateUnit(input: {
  id: string;
  status?: string;
  tenantId?: string;
  rent?: number;
  deposit?: number;
}) {
  const result = await query(
    `update units
     set status = coalesce($2, status),
         tenant_id = case when $3 is not null then $3 else tenant_id end,
         rent_amount = coalesce($4, rent_amount),
         deposit_amount = coalesce($5, deposit_amount)
     where id = $1
     returning id,
               property_id as "propertyId",
               label,
               block,
               floor,
               number,
               status,
               rent_amount::float as rent,
               deposit_amount::float as deposit,
               tenant_id as "tenantId"`,
    [input.id, input.status ?? null, input.tenantId ?? null, input.rent ?? null, input.deposit ?? null]
  );
  if (!result.rows[0]) throw new Error("Unit not found");
  return result.rows[0];
}

export async function listExpenses(user: User) {
  const organization = await query<{ organization_id: string }>("select organization_id from users where id = $1", [user.id]);
  const organizationId = organization.rows[0]?.organization_id;
  if (!organizationId) throw new Error("User organization not found.");

  const result = await query(
    `select e.id,
            e.property_id as "propertyId",
            p.name as "propertyName",
            e.requested_by as "requestedBy",
            e.approved_by as "approvedBy",
            e.category,
            e.description,
            e.amount::float as amount,
            e.receipt_url as "receiptUrl",
            e.created_at as "createdAt"
     from expenses e
     join properties p on p.id = e.property_id
     where e.property_id in (
       select id from properties where organization_id = $1
     )
     order by e.created_at desc`,
    [organizationId]
  );
  return result.rows;
}

export async function createExpense(user: User, input: {
  propertyId: string;
  category: string;
  description: string;
  amount: number;
  requestedBy?: string;
  approvedBy?: string;
  receiptUrl?: string;
}) {
  const result = await query(
    `insert into expenses (property_id, requested_by, approved_by, category, description, amount, receipt_url)
     values ($1,$2,$3,$4,$5,$6,$7)
     returning id,
               property_id as "propertyId",
               requested_by as "requestedBy",
               approved_by as "approvedBy",
               category,
               description,
               amount::float as amount,
               receipt_url as "receiptUrl",
               created_at as "createdAt"`,
    [input.propertyId, input.requestedBy ?? null, input.approvedBy ?? null, input.category, input.description, input.amount, input.receiptUrl ?? null]
  );
  return result.rows[0];
}

export async function listNotifications(user: User) {
  // For tenants, get their assigned property; for others, get all their accessible properties
  let allowedPropertyIds: string[] = [];
  if (user.role === "tenant") {
    const assignedUnit = await query("select property_id from units where tenant_id = $1 limit 1", [user.id]);
    if (assignedUnit.rows[0]) {
      allowedPropertyIds = [String(assignedUnit.rows[0].property_id)];
    }
  } else if (user.role === "caretaker") {
    const properties = await query("select id from properties where manager_id = $1", [user.id]);
    allowedPropertyIds = properties.rows.map((row) => String(row.id));
  } else if (user.role === "owner") {
    const properties = await query("select id from properties where owner_id = $1 or manager_id = $1", [user.id]);
    allowedPropertyIds = properties.rows.map((row) => String(row.id));
  } else if (user.role === "super_admin") {
    const properties = await query("select id from properties");
    allowedPropertyIds = properties.rows.map((row) => String(row.id));
  }

  const result = await query(
    `select id,
            user_id as "userId",
            channel,
            template,
            payload,
            created_at as "createdAt",
            payload->>'propertyId' as "propertyId"
     from notifications
     where user_id = $1
        or (payload->>'propertyId' is null)
        or (payload->>'propertyId' = any($2::text[]))
     order by created_at desc
     limit 100`
  , [user.id, allowedPropertyIds.length > 0 ? allowedPropertyIds : null]);
  return result.rows;
}

export async function createAgreementTemplate(user: User, input: {
  propertyId?: string;
  name: string;
  templateText: string;
  fileName?: string;
}) {
  const organization = await query<{ organization_id: string }>("select organization_id from users where id = $1", [user.id]);
  const organizationId = organization.rows[0]?.organization_id;
  if (!organizationId) throw new Error("User organization not found.");

  const result = await query(
    `insert into agreement_templates (organization_id, property_id, name, template_text, uploaded_by, file_name)
     values ($1,$2,$3,$4,$5,$6)
     returning id,
               property_id as "propertyId",
               name,
               template_text as "templateText",
               uploaded_by as "uploadedBy",
               file_name as "fileName",
               created_at as "createdAt"`,
    [organizationId, input.propertyId ?? null, input.name, input.templateText, user.id, input.fileName ?? null]
  );
  return result.rows[0];
}

export async function listAgreementTemplates(user: User) {
  const organization = await query<{ organization_id: string }>("select organization_id from users where id = $1", [user.id]);
  const organizationId = organization.rows[0]?.organization_id;
  if (!organizationId) throw new Error("User organization not found.");

  const result = await query(
    `select id,
            property_id as "propertyId",
            name,
            template_text as "templateText",
            uploaded_by as "uploadedBy",
            file_name as "fileName",
            created_at as "createdAt"
     from agreement_templates
     where organization_id = $1
     order by created_at desc`,
    [organizationId]
  );
  return result.rows;
}

export async function listLeases() {
  const result = await query(
    `select l.id,
            l.unit_id as "unitId",
            l.tenant_id as "tenantId",
            l.starts_at as "startDate",
            l.ends_at as "endDate",
            l.rent_amount::float as "rentAmount",
            l.deposit_amount::float as deposit,
            l.digital_signature_status as "digitalSignatureStatus",
            u.label as "unitLabel",
            p.id as "propertyId",
            p.name as "propertyName",
            p.address as "propertyAddress",
            t.name as "tenantName",
            t.email as "tenantEmail",
            t.phone as "tenantPhone"
     from leases l
     join units u on u.id = l.unit_id
     join properties p on p.id = u.property_id
     join users t on t.id = l.tenant_id
     order by l.ends_at asc`
  );
  return result.rows;
}

export async function listTenantLeaseRecords(tenantId: string) {
  const result = await query(
    `select l.id,
            l.unit_id as "unitId",
            l.tenant_id as "tenantId",
            l.starts_at as "startDate",
            l.ends_at as "endDate",
            l.rent_amount::float as "rentAmount",
            l.deposit_amount::float as "depositAmount",
            l.digital_signature_status as "digitalSignatureStatus",
            u.label as "unitLabel",
            p.id as "propertyId",
            p.name as "propertyName",
            p.address as "propertyAddress"
     from leases l
     join units u on u.id = l.unit_id
     join properties p on p.id = u.property_id
     where l.tenant_id = $1
     order by l.starts_at desc`,
    [tenantId]
  );
  return result.rows;
}

export async function createLeaseRecord(input: { unitId: string; tenantId: string; startDate: string; endDate: string }) {
  const unitResult = await query<{ propertyId: string; tenantId: string | null; rentAmount: number; depositAmount: number }>(
    `select property_id as "propertyId",
            tenant_id as "tenantId",
            rent_amount::float as "rentAmount",
            deposit_amount::float as "depositAmount"
     from units where id = $1`,
    [input.unitId]
  );
  const unit = unitResult.rows[0];
  if (!unit) throw new Error("Unit not found.");
  if (unit.tenantId !== input.tenantId) throw new Error("The selected tenant is not assigned to this unit.");

  const inserted = await query<{ id: string }>(
    `insert into leases (unit_id, tenant_id, starts_at, ends_at, rent_amount, deposit_amount)
     values ($1, $2, $3, $4, $5, $6)
     returning id`,
    [input.unitId, input.tenantId, input.startDate, input.endDate, unit.rentAmount, unit.depositAmount]
  );
  const leases = await listLeases();
  return leases.find((lease) => String(lease.id) === String(inserted.rows[0]?.id)) ?? null;
}

export async function listPayments(user: User) {
  const params = user.role === "tenant" ? [user.id] : [];
  const result = await query(
    `select id,
            tenant_id as "tenantId",
            unit_id as "unitId",
            amount::float,
            method,
            status,
            receipt_number as "receiptNumber",
            paid_at as "paidAt"
     from payments
     ${user.role === "tenant" ? "where tenant_id = $1" : ""}
     order by created_at desc`,
    params
  );
  return result.rows;
}

export async function createPayment(input: {
  tenantId: string;
  unitId: string;
  amount: number;
  method: Payment["method"];
  status: Payment["status"];
}) {
  const organization = await query<{ organization_id: string }>(
    `select p.organization_id
     from units u
     join properties p on p.id = u.property_id
     where u.id = $1
     limit 1`,
    [input.unitId]
  );
  const organizationId = organization.rows[0]?.organization_id;
  if (!organizationId) throw new Error("Unit not found.");

  const result = await query(
    `insert into payments (organization_id, tenant_id, unit_id, amount, method, status, receipt_number, paid_at)
     values ($1, $2, $3, $4, $5, $6, $7, now())
     returning id,
               tenant_id as "tenantId",
               unit_id as "unitId",
               amount::float,
               method,
               status,
               receipt_number as "receiptNumber",
               paid_at as "paidAt"`,
    [
      organizationId,
      input.tenantId,
      input.unitId,
      input.amount,
      input.method,
      input.status,
      `RF-${new Date().getFullYear()}-${Date.now()}`
    ]
  );
  return result.rows[0];
}

export async function updatePaymentStatus(paymentId: string, status: Payment["status"]) {
  const result = await query(
    `update payments
     set status = $1
     where id = $2
     returning id,
               tenant_id as "tenantId",
               unit_id as "unitId",
               amount::float,
               method,
               status,
               receipt_number as "receiptNumber",
               paid_at as "paidAt"`,
    [status, paymentId]
  );
  if (!result.rows[0]) throw new Error("Payment not found");
  return result.rows[0];
}

export async function listPaymentAccounts() {
  const result = await query(
    `select id,
            type,
            label,
            account_name as "accountName",
            account_number as "accountNumber",
            bank_name as "bankName",
            branch_code as "branchCode",
            mpesa_paybill as "mpesaPaybill",
            mpesa_till as "mpesaTill",
            mpesa_account_reference as "mpesaAccountReference",
            is_active as "isActive",
            created_at as "createdAt"
     from payment_accounts
     order by created_at desc`
  );
  return result.rows;
}

export async function createPaymentAccount(user: User, input: {
  type: "mpesa" | "bank";
  label: string;
  accountName?: string;
  accountNumber?: string;
  bankName?: string;
  branchCode?: string;
  mpesaPaybill?: string;
  mpesaTill?: string;
  mpesaAccountReference?: string;
}) {
  const organization = await query<{ organization_id: string }>("select organization_id from users where id = $1", [user.id]);
  const organizationId = organization.rows[0]?.organization_id;
  if (!organizationId) throw new Error("User organization not found.");

  const result = await query(
    `insert into payment_accounts (
       organization_id, type, label, account_name, account_number, bank_name, branch_code,
       mpesa_paybill, mpesa_till, mpesa_account_reference, created_by
     )
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
     returning id,
               type,
               label,
               account_name as "accountName",
               account_number as "accountNumber",
               bank_name as "bankName",
               branch_code as "branchCode",
               mpesa_paybill as "mpesaPaybill",
               mpesa_till as "mpesaTill",
               mpesa_account_reference as "mpesaAccountReference",
               is_active as "isActive",
               created_at as "createdAt"`,
    [
      organizationId,
      input.type,
      input.label,
      input.accountName ?? null,
      input.accountNumber ?? null,
      input.bankName ?? null,
      input.branchCode ?? null,
      input.mpesaPaybill ?? null,
      input.mpesaTill ?? null,
      input.mpesaAccountReference ?? null,
      user.id
    ]
  );
  return result.rows[0];
}

export async function createBankDebitRequest(user: User, input: {
  amount: number;
  bankName: string;
  accountName: string;
  accountNumber: string;
}) {
  const organization = await query<{ organization_id: string }>("select organization_id from users where id = $1", [user.id]);
  const organizationId = organization.rows[0]?.organization_id;
  if (!organizationId) throw new Error("User organization not found.");

  const last4 = input.accountNumber.slice(-4);
  const result = await query(
    `insert into bank_debit_requests (organization_id, tenant_id, amount, bank_name, account_name, account_number_last4, status, provider_reference)
     values ($1,$2,$3,$4,$5,$6,'initiated',$7)
     returning id,
               amount::float,
               bank_name as "bankName",
               account_name as "accountName",
               account_number_last4 as "accountNumberLast4",
               status,
               provider_reference as "providerReference",
               created_at as "createdAt"`,
    [organizationId, user.id, input.amount, input.bankName, input.accountName, last4, `BANK-${Date.now()}`]
  );
  return result.rows[0];
}

export async function listMaintenanceTickets() {
  const result = await query(
    `select id,
            property_id as "propertyId",
            unit_id as "unitId",
            tenant_id as "tenantId",
            title,
            description,
            priority,
            status,
            media_urls as "mediaUrls",
            assigned_to as "assignedTo",
            vendor_name as "vendorName",
            follow_ups as "followUps",
            created_at as "createdAt"
     from maintenance_tickets
     order by created_at desc`
  );
  return result.rows;
}

export async function createMaintenanceTicket(input: {
  propertyId: string;
  unitId: string;
  tenantId: string;
  title: string;
  description?: string;
  priority: MaintenanceTicket["priority"];
  mediaUrls: string[];
}) {
  const result = await query(
    `insert into maintenance_tickets (property_id, unit_id, tenant_id, title, description, priority, media_urls, follow_ups)
     values ($1, $2, $3, $4, $5, $6, $7::jsonb, '[]'::jsonb)
     returning id,
               property_id as "propertyId",
               unit_id as "unitId",
               tenant_id as "tenantId",
               title,
               description,
               priority,
               status,
               media_urls as "mediaUrls",
               assigned_to as "assignedTo",
               vendor_name as "vendorName",
               follow_ups as "followUps",
               created_at as "createdAt"`,
    [input.propertyId, input.unitId, input.tenantId, input.title, input.description ?? null, input.priority, JSON.stringify(input.mediaUrls)]
  );
  return result.rows[0];
}

export async function updateMaintenanceTicket(input: {
  ticketId: string;
  status?: MaintenanceTicket["status"];
  description?: string;
  assignedTo?: string;
  vendorName?: string;
  followUp?: { author: string; note: string; createdAt: string };
}) {
  if (input.followUp) {
    const result = await query(
      `update maintenance_tickets
       set status = coalesce($2, status),
           description = coalesce($3, description),
           assigned_to = coalesce($4, assigned_to),
           vendor_name = coalesce($5, vendor_name),
           follow_ups = coalesce(follow_ups, '[]'::jsonb) || jsonb_build_array($6::jsonb)
       where id = $1
       returning id,
                 property_id as "propertyId",
                 unit_id as "unitId",
                 tenant_id as "tenantId",
                 title,
                 description,
                 priority,
                 status,
                 media_urls as "mediaUrls",
                 assigned_to as "assignedTo",
                 vendor_name as "vendorName",
                 follow_ups as "followUps",
                 created_at as "createdAt"`,
      [input.ticketId, input.status ?? null, input.description ?? null, input.assignedTo ?? null, input.vendorName ?? null, JSON.stringify(input.followUp)]
    );
    return result.rows[0];
  }

  const result = await query(
    `update maintenance_tickets
     set status = coalesce($2, status),
         description = coalesce($3, description),
         assigned_to = coalesce($4, assigned_to),
         vendor_name = coalesce($5, vendor_name)
     where id = $1
     returning id,
               property_id as "propertyId",
               unit_id as "unitId",
               tenant_id as "tenantId",
               title,
               description,
               priority,
               status,
               media_urls as "mediaUrls",
               assigned_to as "assignedTo",
               vendor_name as "vendorName",
               follow_ups as "followUps",
               created_at as "createdAt"`,
    [input.ticketId, input.status ?? null, input.description ?? null, input.assignedTo ?? null, input.vendorName ?? null]
  );
  return result.rows[0];
}

export async function listMessageThreads(user: User) {
  const result = await query(
    `select mt.id,
            mt.property_id as "propertyId",
            mt.name,
            mt.type,
            mt.pinned_notice as "pinnedNotice",
            mt.muted,
            array_agg(mtm.user_id::text order by mtm.joined_at) as "memberIds",
            count(mtm.user_id)::int as "memberCount",
            (
              select count(*)::int
              from thread_messages tm
              where tm.thread_id = mt.id
                and not (tm.read_by ? $1)
            ) as "unreadCount",
            (
              select jsonb_build_object(
                'id', tm.id,
                'threadId', tm.thread_id,
                'senderId', tm.sender_id,
                'senderName', u.name,
                'senderRole', u.role,
                'body', tm.body,
                'attachmentUrls', tm.attachment_urls,
                'createdAt', tm.created_at,
                'readBy', tm.read_by
              )
              from thread_messages tm
              join users u on u.id = tm.sender_id
              where tm.thread_id = mt.id
              order by tm.created_at desc
              limit 1
            ) as "lastMessage"
     from message_threads mt
     join message_thread_members mtm on mtm.thread_id = mt.id
     where $2 = 'super_admin' or exists (
       select 1 from message_thread_members mine
       where mine.thread_id = mt.id and mine.user_id = $3
     )
     group by mt.id
     order by mt.created_at desc`,
    [user.id, user.role, user.id]
  );
  return result.rows;
}

export async function getMessageThread(user: User, threadId: string) {
  const result = await query(
    `select mt.id,
            mt.property_id as "propertyId",
            mt.name,
            mt.type,
            mt.pinned_notice as "pinnedNotice",
            mt.muted,
            array_agg(mtm.user_id::text order by mtm.joined_at) as "memberIds"
     from message_threads mt
     join message_thread_members mtm on mtm.thread_id = mt.id
     where mt.id = $1
       and ($2 = 'super_admin' or exists (
         select 1 from message_thread_members mine
         where mine.thread_id = mt.id and mine.user_id = $3
       ))
     group by mt.id
     limit 1`,
    [threadId, user.role, user.id]
  );
  return result.rows[0] ?? null;
}

export async function listThreadMessages(user: User, threadId: string) {
  const thread = await getMessageThread(user, threadId);
  if (!thread) throw new Error("Message thread not found or access denied.");

  const result = await query(
    `select tm.id,
            tm.thread_id as "threadId",
            tm.sender_id as "senderId",
            u.name as "senderName",
            u.role as "senderRole",
            tm.body,
            tm.attachment_urls as "attachmentUrls",
            tm.created_at as "createdAt",
            tm.read_by as "readBy"
     from thread_messages tm
     join users u on u.id = tm.sender_id
     where tm.thread_id = $1
     order by tm.created_at asc`,
    [threadId]
  );
  return { thread, messages: result.rows };
}

export async function createMessageThread(user: User, input: {
  propertyId?: string;
  name: string;
  type?: string;
  memberIds?: string[];
  pinnedNotice?: string;
}) {
  const organization = await query<{ organization_id: string }>("select organization_id from users where id = $1", [user.id]);
  const organizationId = organization.rows[0]?.organization_id;
  if (!organizationId) throw new Error("User organization not found.");

  const thread = await query(
    `insert into message_threads (organization_id, property_id, name, type, pinned_notice, created_by)
     values ($1,$2,$3,$4,$5,$6)
     returning id,
               property_id as "propertyId",
               name,
               type,
               pinned_notice as "pinnedNotice",
               muted`,
    [organizationId, input.propertyId ?? null, input.name, input.type ?? "property_group", input.pinnedNotice ?? null, user.id]
  );
  const threadId = thread.rows[0].id;
  const memberIds = Array.from(new Set([user.id, ...(input.memberIds ?? [])]));
  for (const memberId of memberIds) {
    await query(
      `insert into message_thread_members (thread_id, user_id, role_label)
       values ($1,$2,(select role::text from users where id = $2))
       on conflict do nothing`,
      [threadId, memberId]
    );
  }
  return { ...thread.rows[0], memberIds };
}

export async function createThreadMessage(user: User, input: {
  threadId: string;
  body: string;
  attachmentUrls?: string[];
}) {
  const thread = await getMessageThread(user, input.threadId);
  if (!thread) throw new Error("Message thread not found or access denied.");

  const result = await query<Record<string, unknown> & { id: string }>(
    `insert into thread_messages (thread_id, sender_id, body, attachment_urls, read_by)
     values ($1,$2,$3,$4::jsonb,$5::jsonb)
     returning id,
               thread_id as "threadId",
               sender_id as "senderId",
               body,
               attachment_urls as "attachmentUrls",
               created_at as "createdAt",
               read_by as "readBy"`,
    [input.threadId, user.id, input.body, JSON.stringify(input.attachmentUrls ?? []), JSON.stringify([user.id])]
  );
  return { ...result.rows[0], senderName: user.name, senderRole: user.role };
}

export async function createNotification(user: User, input: {
  userId?: string;
  channel: "sms" | "email" | "push" | "whatsapp";
  template: string;
  payload?: Record<string, unknown>;
  propertyId?: string;
}) {
  const result = await query(
    `insert into notifications (user_id, channel, template, payload)
     values ($1,$2,$3,$4::jsonb)
     returning id, user_id as "userId", channel, template, payload, created_at as "createdAt"`,
    [input.userId ?? user.id, input.channel, input.template, JSON.stringify(input.payload ?? {})]
  );
  const row = result.rows[0];
  return row ? { ...row, propertyId: input.propertyId } : null;
}

export async function listNotificationSchedules(user: User) {
  const organization = await query<{ organization_id: string }>("select organization_id from users where id = $1", [user.id]);
  const organizationId = organization.rows[0]?.organization_id;
  if (!organizationId) throw new Error("User organization not found.");
  const result = await query(
    `select id, name, template, channels, schedule_rule as "scheduleRule", next_run_at as "nextRunAt", active, created_at as "createdAt"
     from notification_schedules
     where organization_id = $1
     order by next_run_at asc`,
    [organizationId]
  );
  return result.rows;
}

export async function upsertMonthlyRentReminder(user: User) {
  const organization = await query<{ organization_id: string }>("select organization_id from users where id = $1", [user.id]);
  const organizationId = organization.rows[0]?.organization_id;
  if (!organizationId) throw new Error("User organization not found.");

  const result = await query(
    `insert into notification_schedules (organization_id, name, template, channels, schedule_rule, next_run_at, active, created_by)
     values (
       $1,
       'Monthly rent reminder',
       'Rent is due by the 5th. Please pay before the due date to avoid late fees.',
       ARRAY['push','sms','email']::notification_channel[],
       'FREQ=MONTHLY;BYMONTHDAY=1;BYHOUR=9;BYMINUTE=0',
       date_trunc('month', now()) + interval '1 month' + interval '9 hours',
       true,
       $2
     )
     returning id, name, template, channels, schedule_rule as "scheduleRule", next_run_at as "nextRunAt", active`,
    [organizationId, user.id]
  );
  return result.rows[0];
}

export async function listSecurityRecords() {
  const result = await query(
    `select id,
            property_name as "propertyName",
            company_name as "companyName",
            contact_name as "contactName",
            contact_phone as "contactPhone",
            contact_email as "contactEmail",
            notes,
            instructions,
            created_at as "createdAt"
     from security_records
     order by created_at desc`
  );
  return result.rows;
}

export async function listSecurityEvents(user: User) {
  const organization = await query<{ organization_id: string }>("select organization_id from users where id = $1", [user.id]);
  const organizationId = organization.rows[0]?.organization_id;
  if (!organizationId) throw new Error("User organization not found.");
  const result = await query(
    `select id, property_id as "propertyId", event_type as "eventType", title, details, location,
            latitude, longitude, status, created_by as "createdBy", created_at as "createdAt"
     from security_events where organization_id = $1 order by created_at desc limit 200`,
    [organizationId]
  );
  return result.rows;
}

export async function createSecurityEvent(user: User, input: {
  propertyId?: string;
  eventType: string;
  title: string;
  details: string;
  location?: string;
  latitude?: number;
  longitude?: number;
}) {
  const organization = await query<{ organization_id: string }>("select organization_id from users where id = $1", [user.id]);
  const organizationId = organization.rows[0]?.organization_id;
  if (!organizationId) throw new Error("User organization not found.");
  const result = await query(
    `insert into security_events (organization_id, property_id, event_type, title, details, location, latitude, longitude, created_by)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9)
     returning id, property_id as "propertyId", event_type as "eventType", title, details, location,
               latitude, longitude, status, created_by as "createdBy", created_at as "createdAt"`,
    [organizationId, input.propertyId ?? null, input.eventType, input.title, input.details, input.location ?? null, input.latitude ?? null, input.longitude ?? null, user.id]
  );
  return result.rows[0];
}

export async function createSecurityRecord(user: User, input: {
  propertyName: string;
  companyName?: string;
  contactName?: string;
  contactPhone?: string;
  contactEmail?: string;
  notes?: string;
  instructions?: string;
}) {
  const organization = await query<{ organization_id: string }>("select organization_id from users where id = $1", [user.id]);
  const organizationId = organization.rows[0]?.organization_id;
  if (!organizationId) throw new Error("User organization not found.");

  const result = await query(
    `insert into security_records (organization_id, property_name, company_name, contact_name, contact_phone, contact_email, notes, instructions, created_by)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9)
     returning id,
               property_name as "propertyName",
               company_name as "companyName",
               contact_name as "contactName",
               contact_phone as "contactPhone",
               contact_email as "contactEmail",
               notes,
               instructions,
               created_at as "createdAt"`,
    [organizationId, input.propertyName, input.companyName ?? null, input.contactName ?? null, input.contactPhone ?? null, input.contactEmail ?? null, input.notes ?? null, input.instructions ?? null, user.id]
  );
  return result.rows[0];
}

export async function dashboardMetrics(user: User) {
  const [paymentsResult, unitsResult, maintenanceResult, leasesResult] = await Promise.all([
    query<{ rent_collected: number; arrears: number }>(
      `select coalesce(sum(case when status = 'paid' then amount else 0 end), 0)::float as rent_collected,
              coalesce(sum(case when status in ('partial', 'overdue') then amount else 0 end), 0)::float as arrears
       from payments
       ${user.role === "tenant" ? "where tenant_id = $1" : ""}`,
      user.role === "tenant" ? [user.id] : []
    ),
    query<{ total_units: number; occupied_units: number }>(
      `select count(*)::int as total_units,
              count(*) filter (where status = 'occupied')::int as occupied_units
       from units`
    ),
    query<{ open_maintenance: number }>(
      `select count(*)::int as open_maintenance
       from maintenance_tickets
       where status not in ('resolved', 'closed')
       ${user.role === "tenant" ? "and tenant_id = $1" : ""}`,
      user.role === "tenant" ? [user.id] : []
    ),
    query<{ upcoming_lease_expiries: number }>(
      `select count(*)::int as upcoming_lease_expiries
       from leases
       where ends_at <= current_date + interval '90 days'
       ${user.role === "tenant" ? "and tenant_id = $1" : ""}`,
      user.role === "tenant" ? [user.id] : []
    )
  ]);

  const units = unitsResult.rows[0];
  const totalUnits = Number(units?.total_units ?? 0);
  const occupiedUnits = Number(units?.occupied_units ?? 0);

  return {
    rentCollected: Number(paymentsResult.rows[0]?.rent_collected ?? 0),
    arrears: Number(paymentsResult.rows[0]?.arrears ?? 0),
    occupancyRate: totalUnits > 0 ? occupiedUnits / totalUnits : 0,
    openMaintenance: Number(maintenanceResult.rows[0]?.open_maintenance ?? 0),
    upcomingLeaseExpiries: Number(leasesResult.rows[0]?.upcoming_lease_expiries ?? 0)
  };
}

export async function listVisitorRecords(propertyIds: string[]) {
  if (propertyIds.length === 0) return [];
  const result = await query(
    `
    select id,
           visitor_name as "visitorName",
           phone,
           email,
           reason,
           check_in_at as "checkIn",
           check_out_at as "checkOut",
           destination,
           property_id as "propertyId",
           (select name from properties where id = visitor_passes.property_id) as "propertyName",
           unit_id as "unitId",
           (select label from units where id = visitor_passes.unit_id) as "unitLabel",
           floor,
           house_number as "houseNumber",
           status,
           created_at as "createdAt"
    from visitor_passes
    where property_id = any($1::uuid[])
    order by created_at desc
  `,
    [propertyIds]
  );
  return result.rows;
}

export async function listPublicVisitorOptions(propertyId: string) {
  const result = await query(
    `select p.id as "propertyId", p.name as "propertyName", u.id as "unitId", u.label as "unitLabel"
     from properties p
     join units u on u.property_id = p.id
     where p.id = $1
     order by u.label asc`,
    [propertyId]
  );
  return result.rows;
}

export async function createVisitorRecord(input: {
  visitorName: string;
  phone: string;
  email?: string;
  reason: string;
  checkIn?: string;
  checkOut?: string;
  destination: string;
  propertyId: string;
  unitId: string;
  floor?: string;
  houseNumber?: string;
  status?: string;
}) {
  const unit = await query<{ id: string }>(
    "select id from units where id = $1 and property_id = $2",
    [input.unitId, input.propertyId]
  );
  if (!unit.rows[0]) throw new Error("Select a valid unit belonging to this property.");

  const result = await query(
    `insert into visitor_passes (
       visitor_name, phone, email, reason,
       check_in_at, check_out_at, destination,
       property_id, unit_id, floor, house_number,
       status, qr_token, expires_at
     )
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
     returning 
       id,
       visitor_name as "visitorName",
       phone,
       email,
       reason,
       check_in_at as "checkIn",
       check_out_at as "checkOut",
       destination,
       property_id as "propertyId",
       (select name from properties where id = visitor_passes.property_id) as "propertyName",
       unit_id as "unitId",
      (select label from units where id = visitor_passes.unit_id) as "unitLabel",
       floor,
       house_number as "houseNumber",
       status,
       created_at as "createdAt"`,
    [
      input.visitorName,
      input.phone,
      input.email || null,
      input.reason,
      input.checkIn || null,
      input.checkOut || null,
      input.destination,
      input.propertyId,
      input.unitId,
      input.floor || null,
      input.houseNumber || null,
      input.status || 'active',
      `visitor-${Math.random().toString(36).slice(2, 10).toUpperCase()}-${Date.now()}`,
      new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    ]
  );
  return result.rows[0];
}

export async function updateVisitorRecord(id: string, input: Partial<{
  visitorName: string;
  phone: string;
  email: string;
  reason: string;
  checkIn: string;
  checkOut: string;
  destination: string;
  propertyId: string;
  unitId: string;
  floor: string;
  houseNumber: string;
  status: string;
}>) {
  const updates: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;

  if (input.visitorName !== undefined) {
    updates.push(`visitor_name = $${paramIndex++}`);
    values.push(input.visitorName);
  }
  if (input.phone !== undefined) {
    updates.push(`phone = $${paramIndex++}`);
    values.push(input.phone);
  }
  if (input.email !== undefined) {
    updates.push(`email = $${paramIndex++}`);
    values.push(input.email);
  }
  if (input.reason !== undefined) {
    updates.push(`reason = $${paramIndex++}`);
    values.push(input.reason);
  }
  if (input.checkIn !== undefined) {
    updates.push(`check_in_at = $${paramIndex++}`);
    values.push(input.checkIn);
  }
  if (input.checkOut !== undefined) {
    updates.push(`check_out_at = $${paramIndex++}`);
    values.push(input.checkOut);
  }
  if (input.destination !== undefined) {
    updates.push(`destination = $${paramIndex++}`);
    values.push(input.destination);
  }
  if (input.propertyId !== undefined) {
    updates.push(`property_id = $${paramIndex++}`);
    values.push(input.propertyId);
  }
  if (input.unitId !== undefined) {
    updates.push(`unit_id = $${paramIndex++}`);
    values.push(input.unitId);
  }
  if (input.floor !== undefined) {
    updates.push(`floor = $${paramIndex++}`);
    values.push(input.floor);
  }
  if (input.houseNumber !== undefined) {
    updates.push(`house_number = $${paramIndex++}`);
    values.push(input.houseNumber);
  }
  if (input.status !== undefined) {
    updates.push(`status = $${paramIndex++}`);
    values.push(input.status);
  }

  if (updates.length === 0) return null;

  values.push(id);
  const sql = `
    update visitor_passes
    set ${updates.join(', ')}
    where id = $${paramIndex}
    returning 
      id,
      visitor_name as "visitorName",
      phone,
      email,
      reason,
      check_in_at as "checkIn",
      check_out_at as "checkOut",
      destination,
      property_id as "propertyId",
      (select name from properties where id = visitor_passes.property_id) as "propertyName",
      unit_id as "unitId",
      (select label from units where id = visitor_passes.unit_id) as "unitLabel",
      floor,
      house_number as "houseNumber",
      status,
      created_at as "createdAt"
  `;

  const result = await query(sql, values);
  return result.rows[0];
}
