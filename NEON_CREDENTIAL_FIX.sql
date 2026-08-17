-- RentFlow Credential Fix - Neon SQL Editor
-- Paste this SQL into your Neon SQL Editor and run to fix the seeded test account passwords

-- Update all test accounts to use correct password hash
-- Password: "password"
-- Hash: $2a$10$eqEg80GBczqCGwip.MzRc.zT0wAU9RopL0bReha/SHXapBq2Vc1lm

UPDATE users 
SET password_hash = '$2a$10$eqEg80GBczqCGwip.MzRc.zT0wAU9RopL0bReha/SHXapBq2Vc1lm'
WHERE lower(email) IN ('tenant@test.com', 'caretaker@test.com', 'owner@test.com', 'admin@test.com');

-- Verify the update
SELECT email, 'Updated' as status FROM users 
WHERE lower(email) IN ('tenant@test.com', 'caretaker@test.com', 'owner@test.com', 'admin@test.com')
ORDER BY email;

-- After running this, test login with:
-- Email: admin@test.com
-- Password: password
-- API: POST http://localhost:4000/api/auth/login
