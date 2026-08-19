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
const migrationsDir = join(__dirname, "..", "sql", "migrations");

const fs = await import("node:fs");
const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith(".sql")).sort();
console.log(`Found ${files.length} migration files:`, files);

const client = createClient({ url, authToken: token });

for (const file of files) {
  console.log(`\n=== Running ${file} ===`);
  const sql = readFileSync(join(migrationsDir, file), "utf8");
  // Strip line comments, split by ;
  const cleaned = sql.split("\n").map(line => {
    const idx = line.indexOf("--");
    if (idx === -1) return line;
    if (idx === 0) return "";
    return line.slice(0, idx);
  }).join("\n");
  const statements = cleaned.split(";").map(s => s.trim()).filter(s => s.length > 0);
  for (const stmt of statements) {
    try {
      await client.execute(stmt);
      const preview = stmt.replace(/\s+/g, " ").slice(0, 80);
      console.log(`  OK: ${preview}${stmt.length > 80 ? "..." : ""}`);
    } catch (e) {
      // ALTER TABLE ADD COLUMN fails if column already exists — idempotent, OK
      if (/duplicate column/i.test(e.message) || /already exists/i.test(e.message)) {
        console.log(`  SKIP (already exists): ${stmt.replace(/\s+/g, " ").slice(0, 80)}`);
      } else {
        console.error(`  FAIL: ${e.message}`);
        console.error(`  SQL: ${stmt.slice(0, 200)}`);
      }
    }
  }
}

// Verify final schema
console.log("\n=== users table columns ===");
const cols = await client.execute("PRAGMA table_info(users)");
for (const c of cols.rows) {
  console.log(`  - ${c.name} ${c.type} default=${c.dflt_value} notnull=${c.notnull}`);
}

console.log("\n=== gold_log table columns ===");
const logCols = await client.execute("PRAGMA table_info(gold_log)");
for (const c of logCols.rows) {
  console.log(`  - ${c.name} ${c.type} default=${c.dflt_value} notnull=${c.notnull}`);
}

console.log("\nDone.");
