INSERT INTO organizations (id, name, plan, trial_ends_at, commission_rate)
VALUES ('00000000-0000-0000-0000-000000000001', 'RentFlow Demo Holdings', 'growth', now() + interval '14 days', 1.50);

INSERT INTO users (id, organization_id, name, email, phone, password_hash, role, mfa_enabled, email_verified_at, sms_verified_at)
VALUES
('00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000001', 'Amina Otieno', 'tenant@rentflow.app', '+254700000101', '$2a$10$BzADq5xZJyW.Rzsavp/3yeE7qDvgimN0OADyM6lZmbW9PpyuLJvGW', 'tenant', true, now(), now()),
('00000000-0000-0000-0000-000000000102', '00000000-0000-0000-0000-000000000001', 'Joseph Kariuki', 'caretaker@rentflow.app', '+254700000102', '$2a$10$BzADq5xZJyW.Rzsavp/3yeE7qDvgimN0OADyM6lZmbW9PpyuLJvGW', 'caretaker', true, now(), now()),
('00000000-0000-0000-0000-000000000103', '00000000-0000-0000-0000-000000000001', 'Naomi Wanjiru', 'owner@rentflow.app', '+254700000103', '$2a$10$BzADq5xZJyW.Rzsavp/3yeE7qDvgimN0OADyM6lZmbW9PpyuLJvGW', 'owner', true, now(), now()),
('00000000-0000-0000-0000-000000000104', '00000000-0000-0000-0000-000000000001', 'RentFlow Admin', 'admin@rentflow.app', '+254700000104', '$2a$10$BzADq5xZJyW.Rzsavp/3yeE7qDvgimN0OADyM6lZmbW9PpyuLJvGW', 'super_admin', true, now(), now());

INSERT INTO properties (id, organization_id, owner_id, manager_id, name, address, latitude, longitude, valuation)
VALUES
('00000000-0000-0000-0000-000000000201', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000103', '00000000-0000-0000-0000-000000000102', 'Westlands Heights', 'Waiyaki Way, Nairobi', -1.2640, 36.8020, 4200000),
('00000000-0000-0000-0000-000000000202', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000103', '00000000-0000-0000-0000-000000000102', 'Kilimani Court', 'Argwings Kodhek, Nairobi', -1.2921, 36.7830, 3800000);

INSERT INTO units (id, property_id, label, bedrooms, rent_amount, deposit_amount, status, meter_number, smart_gate_access_id)
VALUES
('00000000-0000-0000-0000-000000000301', '00000000-0000-0000-0000-000000000201', 'A-12', 2, 840, 840, 'occupied', 'MTR-91012', 'GATE-A12'),
('00000000-0000-0000-0000-000000000302', '00000000-0000-0000-0000-000000000201', 'B-03', 1, 760, 760, 'vacant', 'MTR-91013', 'GATE-B03'),
('00000000-0000-0000-0000-000000000303', '00000000-0000-0000-0000-000000000202', 'C-08', 3, 1120, 1120, 'maintenance', 'MTR-81008', 'GATE-C08');

INSERT INTO leases (id, unit_id, tenant_id, starts_at, ends_at, rent_amount, deposit_amount, agreement_url, digital_signature_status)
VALUES ('00000000-0000-0000-0000-000000000401', '00000000-0000-0000-0000-000000000301', '00000000-0000-0000-0000-000000000101', '2026-01-01', '2026-12-31', 840, 840, '/agreements/lease-a12.pdf', 'signed');

INSERT INTO payments (organization_id, lease_id, tenant_id, unit_id, amount, method, status, provider_reference, receipt_number, paid_at)
VALUES
('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000401', '00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000301', 840, 'mpesa', 'paid', 'MPESA-QE12X', 'RF-2026-0001', now() - interval '25 days'),
('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000401', '00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000301', 420, 'card', 'partial', 'PI-STRIPE-002', 'RF-2026-0002', now() - interval '4 days');

INSERT INTO payment_accounts (organization_id, type, label, account_name, bank_name, account_number, branch_code, mpesa_paybill, mpesa_account_reference, created_by)
VALUES
('00000000-0000-0000-0000-000000000001', 'mpesa', 'Main M-Pesa Paybill', 'RentFlow Demo Holdings', null, null, null, '123456', 'UNIT_NUMBER', '00000000-0000-0000-0000-000000000104'),
('00000000-0000-0000-0000-000000000001', 'bank', 'Main rent collection bank', 'RentFlow Demo Holdings', 'Equity Bank', '0123456789', 'EQBLKENA', null, null, '00000000-0000-0000-0000-000000000104');

INSERT INTO maintenance_tickets (property_id, unit_id, tenant_id, assigned_to, vendor_name, title, description, priority, status, media_urls, predicted_cost)
VALUES
('00000000-0000-0000-0000-000000000201', '00000000-0000-0000-0000-000000000301', '00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000102', 'Apex Plumbing', 'Water heater fault', 'No hot water in unit A-12.', 'emergency', 'assigned', '["/uploads/water-heater.jpg"]', 185),
('00000000-0000-0000-0000-000000000202', '00000000-0000-0000-0000-000000000303', '00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000102', null, 'Utility meter anomaly', 'Meter is reporting unusual overnight usage.', 'high', 'in_progress', '[]', 90);

INSERT INTO message_threads (id, organization_id, property_id, name, type, pinned_notice, created_by)
VALUES
('00000000-0000-0000-0000-000000000701', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000201', 'Westlands Heights Tenants', 'property_group', 'Quiet hours start at 10 PM. Emergency alerts remain enabled.', '00000000-0000-0000-0000-000000000102'),
('00000000-0000-0000-0000-000000000702', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000201', 'Maintenance Desk', 'support', 'Upload a clear image or video when reporting repair issues.', '00000000-0000-0000-0000-000000000102'),
('00000000-0000-0000-0000-000000000703', '00000000-0000-0000-0000-000000000001', null, 'Owner and Management', 'management', 'Expense approvals above $500 require owner confirmation.', '00000000-0000-0000-0000-000000000103');

INSERT INTO message_thread_members (thread_id, user_id, role_label)
VALUES
('00000000-0000-0000-0000-000000000701', '00000000-0000-0000-0000-000000000101', 'tenant'),
('00000000-0000-0000-0000-000000000701', '00000000-0000-0000-0000-000000000102', 'caretaker'),
('00000000-0000-0000-0000-000000000701', '00000000-0000-0000-0000-000000000103', 'owner'),
('00000000-0000-0000-0000-000000000702', '00000000-0000-0000-0000-000000000101', 'tenant'),
('00000000-0000-0000-0000-000000000702', '00000000-0000-0000-0000-000000000102', 'caretaker'),
('00000000-0000-0000-0000-000000000703', '00000000-0000-0000-0000-000000000102', 'caretaker'),
('00000000-0000-0000-0000-000000000703', '00000000-0000-0000-0000-000000000103', 'owner');

INSERT INTO thread_messages (thread_id, sender_id, body, read_by)
VALUES
('00000000-0000-0000-0000-000000000701', '00000000-0000-0000-0000-000000000102', 'Team, the water pump service is scheduled between 3 PM and 4 PM. Please store enough water before then.', '["00000000-0000-0000-0000-000000000103"]'),
('00000000-0000-0000-0000-000000000701', '00000000-0000-0000-0000-000000000101', 'Thanks for the update. Will the B block rooftop tanks be checked too?', '["00000000-0000-0000-0000-000000000102"]'),
('00000000-0000-0000-0000-000000000701', '00000000-0000-0000-0000-000000000102', 'Yes. B block and C block are both included.', '["00000000-0000-0000-0000-000000000101"]');

INSERT INTO notification_schedules (organization_id, name, template, channels, schedule_rule, next_run_at, created_by)
VALUES
('00000000-0000-0000-0000-000000000001', 'Monthly rent reminder', 'Rent is due by the 5th. Please pay before the due date to avoid late fees.', ARRAY['push','sms','email']::notification_channel[], 'FREQ=MONTHLY;BYMONTHDAY=1;BYHOUR=9;BYMINUTE=0', date_trunc('month', now()) + interval '1 month' + interval '9 hours', '00000000-0000-0000-0000-000000000102');

INSERT INTO audit_logs (organization_id, actor_id, action, target_type, target_id, metadata)
VALUES
('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000104', 'SECURITY_SCAN', 'platform', 'rentflow', '{"result":"healthy"}'),
('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000102', 'EXPENSE_APPROVAL_REQUESTED', 'property', '00000000-0000-0000-0000-000000000201', '{"amount":185}');
