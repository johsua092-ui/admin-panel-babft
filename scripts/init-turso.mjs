import { createClient } from "@libsql/client";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const url = process.env.TURSO_DATABASE_URL;
const token = process.env.TURSO_AUTH_TOKEN;
if (!url || !token) {
  console.error("TURSO_DATABASE_URL atau TURSO_AUTH_TOKEN belum diset.");
  process.exit(1);
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const schemaPath = join(__dirname, "..", "sql", "schema.sql");
const sql = readFileSync(schemaPath, "utf8");

const client = createClient({ url, authToken: token });

const cleaned = sql
  .split("\n")
  .map((line) => {
    const idx = line.indexOf("--");
    if (idx === -1) return line;
    if (idx === 0) return "";
    return line.slice(0, idx);
  })
  .join("\n");

const statements = cleaned
  .split(";")
  .map((s) => s.trim())
  .filter((s) => s.length > 0);

console.log(`Running ${statements.length} SQL statements on ${url}...`);
for (const stmt of statements) {
  try {
    await client.execute(stmt);
    const preview = stmt.replace(/\s+/g, " ").slice(0, 80);
    console.log(`  OK: ${preview}${stmt.length > 80 ? "..." : ""}`);
  } catch (e) {
    console.error(`  FAIL: ${e.message}`);
    console.error(`  SQL: ${stmt.slice(0, 200)}`);
  }
}

console.log("\nVerifying tables...");
const tables = await client.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name");
for (const row of tables.rows) {
  console.log(`  - ${row.name}`);
}

const indexes = await client.execute("SELECT name FROM sqlite_master WHERE type='index' AND name LIKE 'idx_%' ORDER BY name");
console.log(`\n${indexes.rows.length} indexes created:`);
for (const row of indexes.rows) {
  console.log(`  - ${row.name}`);
}

console.log("\nDone.");
