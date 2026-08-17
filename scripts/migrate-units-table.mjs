import pg from 'pg';
import * as dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../backend/.env') });

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
});

async function migrate() {
  try {
    await client.connect();
    console.log('Connected to database');

    // Check if columns already exist
    const result = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'units' AND column_name IN ('block', 'floor', 'number', 'tenant_id')
    `);

    const existingColumns = result.rows.map(r => r.column_name);
    console.log('Existing columns:', existingColumns);

    // Add missing columns
    if (!existingColumns.includes('block')) {
      await client.query('ALTER TABLE units ADD COLUMN block TEXT');
      console.log('✓ Added block column');
    }

    if (!existingColumns.includes('number')) {
      await client.query('ALTER TABLE units ADD COLUMN number TEXT');
      console.log('✓ Added number column');
    }

    if (!existingColumns.includes('tenant_id')) {
      await client.query('ALTER TABLE units ADD COLUMN tenant_id UUID REFERENCES users(id)');
      console.log('✓ Added tenant_id column');
    }

    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

migrate();
