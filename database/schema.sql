DROP SCHEMA public CASCADE;
CREATE SCHEMA public;CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TYPE user_role AS ENUM ('tenant', 'caretaker', 'owner', 'super_admin');
CREATE TYPE unit_status AS ENUM ('occupied', 'vacant', 'maintenance');
CREATE TYPE payment_method AS ENUM ('mpesa', 'bank', 'card', 'mobile_money', 'paypal');
CREATE TYPE payment_status AS ENUM ('paid', 'partial', 'overdue', 'failed', 'refunded');
CREATE TYPE ticket_priority AS ENUM ('low', 'medium', 'high', 'emergency');
CREATE TYPE ticket_status AS ENUM ('submitted', 'assigned', 'in_progress', 'resolved', 'closed');
CREATE TYPE notification_channel AS ENUM ('sms', 'email', 'push', 'whatsapp');
CREATE TYPE payment_account_type AS ENUM ('mpesa', 'bank');

CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  plan TEXT NOT NULL DEFAULT 'trial',
  trial_ends_at TIMESTAMPTZ,
  billing_customer_id TEXT,
  commission_rate NUMERIC(5, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role user_role NOT NULL,
  mfa_enabled BOOLEAN NOT NULL DEFAULT false,
  email_verified_at TIMESTAMPTZ,
  sms_verified_at TIMESTAMPTZ,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE devices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  fingerprint TEXT NOT NULL,
  user_agent TEXT,
  ip_address INET,
  trusted BOOLEAN NOT NULL DEFAULT false,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE properties (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  owner_id UUID REFERENCES users(id),
  manager_id UUID REFERENCES users(id),
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  street TEXT,
  location TEXT,
  latitude NUMERIC(10, 7),
  longitude NUMERIC(10, 7),
  electricity_price TEXT,
  garbage_price TEXT,
  water_price TEXT,
  property_type TEXT,
  contact_name TEXT,
  contact_phone TEXT,
  contact_email TEXT,
  contract_fee NUMERIC(12, 2),
  management_quote TEXT,
  agreement_template_url TEXT,
  valuation NUMERIC(14, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE units (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  block TEXT,
  floor TEXT,
  number TEXT,
  bedrooms INTEGER NOT NULL DEFAULT 1,
  rent_amount NUMERIC(12, 2) NOT NULL,
  deposit_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  status unit_status NOT NULL DEFAULT 'vacant',
  tenant_id UUID REFERENCES users(id),
  meter_number TEXT,
  smart_gate_access_id TEXT,
  UNIQUE(property_id, label)
);

CREATE TABLE leases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  unit_id UUID NOT NULL REFERENCES units(id),
  tenant_id UUID NOT NULL REFERENCES users(id),
  starts_at DATE NOT NULL,
  ends_at DATE NOT NULL,
  rent_amount NUMERIC(12, 2) NOT NULL,
  deposit_amount NUMERIC(12, 2) NOT NULL,
  agreement_url TEXT,
  digital_signature_status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  lease_id UUID REFERENCES leases(id),
  tenant_id UUID NOT NULL REFERENCES users(id),
  unit_id UUID NOT NULL REFERENCES units(id),
  amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  method payment_method NOT NULL,
  status payment_status NOT NULL DEFAULT 'paid',
  provider_reference TEXT,
  receipt_number TEXT NOT NULL UNIQUE,
  late_fee NUMERIC(12, 2) NOT NULL DEFAULT 0,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE payment_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  type payment_account_type NOT NULL,
  label TEXT NOT NULL,
  account_name TEXT,
  account_number TEXT,
  bank_name TEXT,
  branch_code TEXT,
  mpesa_paybill TEXT,
  mpesa_till TEXT,
  mpesa_account_reference TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE bank_debit_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES users(id),
  amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  bank_name TEXT NOT NULL,
  account_name TEXT NOT NULL,
  account_number_last4 TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'initiated',
  provider_reference TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  requested_by UUID REFERENCES users(id),
  approved_by UUID REFERENCES users(id),
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  amount NUMERIC(12, 2) NOT NULL,
  approved_at TIMESTAMPTZ,
  receipt_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE maintenance_tickets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  unit_id UUID NOT NULL REFERENCES units(id),
  tenant_id UUID NOT NULL REFERENCES users(id),
  assigned_to UUID REFERENCES users(id),
  vendor_name TEXT,
  title TEXT NOT NULL,
  description TEXT,
  priority ticket_priority NOT NULL DEFAULT 'medium',
  status ticket_status NOT NULL DEFAULT 'submitted',
  media_urls JSONB NOT NULL DEFAULT '[]',
  follow_ups JSONB NOT NULL DEFAULT '[]',
  predicted_cost NUMERIC(12, 2),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES users(id),
  recipient_id UUID REFERENCES users(id),
  property_id UUID REFERENCES properties(id),
  subject TEXT,
  body TEXT NOT NULL,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE message_threads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'property_group',
  pinned_notice TEXT,
  muted BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE message_thread_members (
  thread_id UUID NOT NULL REFERENCES message_threads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_label TEXT,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (thread_id, user_id)
);

CREATE TABLE thread_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  thread_id UUID NOT NULL REFERENCES message_threads(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES users(id),
  body TEXT NOT NULL,
  attachment_urls JSONB NOT NULL DEFAULT '[]',
  read_by JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  channel notification_channel NOT NULL,
  template TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}',
  delivered_at TIMESTAMPTZ,
  failed_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE agreement_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  property_id UUID REFERENCES properties(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  template_text TEXT NOT NULL,
  uploaded_by UUID REFERENCES users(id),
  file_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE notification_schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  template TEXT NOT NULL,
  channels notification_channel[] NOT NULL DEFAULT ARRAY['push']::notification_channel[],
  schedule_rule TEXT NOT NULL,
  next_run_at TIMESTAMPTZ NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE visitor_passes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  unit_id UUID NOT NULL REFERENCES units(id),
  visitor_name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  reason TEXT,
  check_in_at TIMESTAMPTZ,
  check_out_at TIMESTAMPTZ,
  destination TEXT,
  property_id UUID REFERENCES properties(id),
  floor TEXT,
  house_number TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  qr_token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  checked_in_at TIMESTAMPTZ,
  checked_out_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE caretaker_checkins (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  caretaker_id UUID NOT NULL REFERENCES users(id),
  property_id UUID NOT NULL REFERENCES properties(id),
  latitude NUMERIC(10, 7) NOT NULL,
  longitude NUMERIC(10, 7) NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(
);

CREATE TABLE reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  generated_by UUID REFERENCES users(id),
  type TEXT NOT NULL,
  filters JSONB NOT NULL DEFAULT '{}',
  file_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE ai_predictions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  subject_type TEXT NOT NULL,
  subject_id UUID,
  model_name TEXT NOT NULL,
  score NUMERIC(6, 4),
  label TEXT,
  explanation TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  target_type TEXT,
  target_id TEXT,
  metadata JSONB NOT NULL DEFAULT '{}',
  ip_address INET,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_users_org_role ON users(organization_id, role);
CREATE INDEX idx_properties_org ON properties(organization_id);
CREATE INDEX idx_units_property_status ON units(property_id, status);
CREATE INDEX idx_payments_tenant_status ON payments(tenant_id, status);
CREATE INDEX idx_payment_accounts_org_type ON payment_accounts(organization_id, type, is_active);
CREATE INDEX idx_bank_debit_requests_tenant ON bank_debit_requests(tenant_id, created_at DESC);
CREATE INDEX idx_maintenance_property_status ON maintenance_tickets(property_id, status);
CREATE INDEX idx_notifications_user_channel ON notifications(user_id, channel);
CREATE INDEX idx_notification_schedules_next_run ON notification_schedules(active, next_run_at);
CREATE INDEX idx_message_threads_org ON message_threads(organization_id, type);
CREATE INDEX idx_thread_messages_thread_created ON thread_messages(thread_id, created_at);
CREATE INDEX idx_audit_logs_org_created ON audit_logs(organization_id, created_at DESC);
