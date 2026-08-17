-- Bootstrap organization and test accounts for RentFlow
-- Demo properties removed - all new listings will be stored in the database

-- Create default organization
INSERT INTO organizations (id, name, plan, trial_ends_at, commission_rate)
VALUES ('00000000-0000-0000-0000-000000000001', 'RentFlow', 'growth', now() + interval '30 days', 1.50)
ON CONFLICT DO NOTHING;

-- Create test users for development
-- Password: "password" (hash from bcryptjs)
INSERT INTO users (id, organization_id, name, email, phone, password_hash, role, mfa_enabled, email_verified_at, sms_verified_at)
VALUES
('00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000001', 'Tenant User', 'tenant@test.com', '+254700000101', '$2a$10$bfNgZ6GN9cmD1/ncrl9Rt./1i2jRqc5DZ2eq.wyvHG0mVdCj3y4Ny', 'tenant', false, now(), now()),
('00000000-0000-0000-0000-000000000102', '00000000-0000-0000-0000-000000000001', 'Caretaker User', 'caretaker@test.com', '+254700000102', '$2a$10$bfNgZ6GN9cmD1/ncrl9Rt./1i2jRqc5DZ2eq.wyvHG0mVdCj3y4Ny', 'caretaker', false, now(), now()),
('00000000-0000-0000-0000-000000000103', '00000000-0000-0000-0000-000000000001', 'Owner User', 'owner@test.com', '+254700000103', '$2a$10$bfNgZ6GN9cmD1/ncrl9Rt./1i2jRqc5DZ2eq.wyvHG0mVdCj3y4Ny', 'owner', false, now(), now()),
('00000000-0000-0000-0000-000000000104', '00000000-0000-0000-0000-000000000001', 'Admin User', 'admin@test.com', '+254700000104', '$2a$10$bfNgZ6GN9cmD1/ncrl9Rt./1i2jRqc5DZ2eq.wyvHG0mVdCj3y4Ny', 'super_admin', false, now(), now())
ON CONFLICT (email) DO NOTHING;
