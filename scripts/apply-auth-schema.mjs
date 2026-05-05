import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Pool } from "pg";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const postgresUrl = process.env.POSTGRES_URL;

if (!postgresUrl) {
  console.error("POSTGRES_URL is required to apply the Better Auth schema.");
  process.exit(1);
}

const schemaPath = path.resolve(
  scriptDir,
  "../docker/initdb/02-better-auth.sql",
);
const schemaSql = await readFile(schemaPath, "utf8");
const pool = new Pool({ connectionString: postgresUrl });

try {
  await pool.query(schemaSql);
  console.log("Better Auth schema applied successfully.");
} finally {
  await pool.end();
}
