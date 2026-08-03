import "dotenv/config";
import { databaseHealth, query } from "../db.js";

const health = await databaseHealth();
console.log("Database health:", health);

if (!health.connected) {
  process.exitCode = 1;
} else {
  const tables = await query<{ table_name: string }>(
    `select table_name
     from information_schema.tables
     where table_schema = 'public'
     order by table_name`
  );
  console.log("Tables:", tables.rows.map((row) => row.table_name).join(", "));
}

