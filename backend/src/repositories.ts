import { query, mapUser } from "./db.js";
import { MaintenanceTicket, Payment, Role, User } from "./types.js";

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

export async function listUnits() {
  const result = await query(
    `select id,
            property_id as "propertyId",
            label,
            status,
            rent_amount::float as rent
     from units
     order by label asc`
  );
  return result.rows;
}

export async function listLeases() {
  const result = await query(
    `select id,
            unit_id as "unitId",
            tenant_id as "tenantId",
            starts_at as "startDate",
            ends_at as "endDate",
            deposit_amount::float as deposit,
            digital_signature_status as "digitalSignatureStatus"
     from leases
     order by ends_at asc`
  );
  return result.rows;
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
            priority,
            status,
            media_urls as "mediaUrls",
            vendor_name as technician
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
  priority: MaintenanceTicket["priority"];
  mediaUrls: string[];
}) {
  const result = await query(
    `insert into maintenance_tickets (property_id, unit_id, tenant_id, title, priority, media_urls)
     values ($1, $2, $3, $4, $5, $6::jsonb)
     returning id,
               property_id as "propertyId",
               unit_id as "unitId",
               tenant_id as "tenantId",
               title,
               priority,
               status,
               media_urls as "mediaUrls"`,
    [input.propertyId, input.unitId, input.tenantId, input.title, input.priority, JSON.stringify(input.mediaUrls)]
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
}) {
  const result = await query(
    `insert into notifications (user_id, channel, template, payload)
     values ($1,$2,$3,$4::jsonb)
     returning id, user_id as "userId", channel, template, payload, created_at as "createdAt"`,
    [input.userId ?? user.id, input.channel, input.template, JSON.stringify(input.payload ?? {})]
  );
  return result.rows[0];
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
