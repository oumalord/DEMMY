import { Pool } from "pg";
import { Role, User } from "./types.js";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required. Configure the Neon PostgreSQL connection string before starting the backend.");
}

export const pool = new Pool({
  connectionString: databaseUrl,
  max: Number(process.env.DB_POOL_SIZE ?? 10),
  idleTimeoutMillis: 30_000
});

export async function query<T = Record<string, unknown>>(text: string, params: unknown[] = []) {
  return pool.query<T>(text, params);
}

export async function databaseHealth() {
  try {
    const result = await query<{ now: Date; database: string }>("select now(), current_database() as database");
    return { connected: true, database: result.rows[0]?.database ?? "unknown" };
  } catch (error) {
    return { connected: false, error: error instanceof Error ? error.message : "Unknown database error" };
  }
}

export function mapUser(row: Record<string, unknown>): User {
  return {
    id: String(row.id),
    name: String(row.name),
    email: String(row.email),
    phone: String(row.phone),
    role: row.role as Role,
    mfaEnabled: Boolean(row.mfa_enabled),
    verified: Boolean(row.email_verified_at && row.sms_verified_at)
  };
}

