require('dotenv').config({ path: './backend/.env' });
const { Client } = require('pg');

const correctHash = '$2a$10$eqEg80GBczqCGwip.MzRc.zT0wAU9RopL0bReha/SHXapBq2Vc1lm';
const emails = ['tenant@test.com', 'caretaker@test.com', 'owner@test.com', 'admin@test.com'];

const client = new Client({
  connectionString: process.env.DATABASE_URL
});

(async () => {
  try {
    await client.connect();
    console.log('Connected to database');
    
    for (const email of emails) {
      const result = await client.query(
        'UPDATE users SET password_hash = $1 WHERE lower(email) = lower($2) RETURNING id, email',
        [correctHash, email]
      );
      console.log(`${email}: ${result.rowCount} row(s) updated`);
    }
    
    console.log('\nCredential fix complete. Test login with: admin@test.com / password');
    await client.end();
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
})();
