import { createClient } from "@libsql/client";

const url = process.env.TURSO_DATABASE_URL;
const token = process.env.TURSO_AUTH_TOKEN;
if (!url || !token) {
  console.error("TURSO_DATABASE_URL atau TURSO_AUTH_TOKEN belum diset.");
  process.exit(1);
}

const client = createClient({ url, authToken: token });

console.log(`Connected to ${url}\n`);

console.log("=== users table (last 10) ===");
const users = await client.execute("SELECT id, uid, email, displayName, online, lastOnlineAt, lastLoginAt, createdAt FROM users ORDER BY COALESCE(lastLoginAt, 0) DESC LIMIT 10");
console.log(`${users.rows.length} rows:`);
for (const row of users.rows) {
  console.log(`  - id=${row.id} | email=${row.email} | name=${row.displayName} | online=${row.online} | lastOnlineAt=${row.lastOnlineAt} | lastLoginAt=${row.lastLoginAt}`);
}

console.log("\n=== analytics table (last 5) ===");
const an = await client.execute("SELECT eventId, timestamp, kind, deviceId FROM analytics ORDER BY COALESCE(timestamp, 0) DESC LIMIT 5");
console.log(`${an.rows.length} rows:`);
for (const row of an.rows) {
  console.log(`  - eventId=${row.eventId} | ts=${row.timestamp} | kind=${row.kind} | deviceId=${row.deviceId}`);
}

console.log("\n=== table counts ===");
for (const t of ["users", "history", "admin_logins", "analytics"]) {
  try {
    const c = await client.execute(`SELECT COUNT(*) as n FROM ${t}`);
    console.log(`  ${t}: ${c.rows[0].n}`);
  } catch (e) {
    console.log(`  ${t}: ERROR ${e.message}`);
  }
}
