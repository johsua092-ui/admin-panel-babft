import { createClient } from "@libsql/client";

const url = process.env.TURSO_DATABASE_URL;
const token = process.env.TURSO_AUTH_TOKEN;
if (!url || !token) {
  console.error("TURSO_DATABASE_URL atau TURSO_AUTH_TOKEN belum diset.");
  process.exit(1);
}

const client = createClient({ url, authToken: token });

console.log(`Cleaning test data from ${url}...\n`);

const before = await client.execute("SELECT COUNT(*) as n FROM users");
console.log(`Users before: ${before.rows[0].n}`);

const r = await client.execute(
  "DELETE FROM users WHERE id LIKE 'turso_test_%' OR id LIKE 'turso_user_%' OR id LIKE 'verify_%'"
);
console.log(`Deleted ${r.rowsAffected} test rows from users.`);

const r2 = await client.execute(
  "DELETE FROM analytics WHERE eventId LIKE 'turso_test_%' OR eventId LIKE 'verify_%'"
);
console.log(`Deleted ${r2.rowsAffected} test rows from analytics.`);

const after = await client.execute("SELECT COUNT(*) as n FROM users");
console.log(`Users after: ${after.rows[0].n}`);

console.log("\nRemaining users:");
const remaining = await client.execute(
  "SELECT id, email, displayName, online, lastOnlineAt FROM users ORDER BY COALESCE(lastOnlineAt, 0) DESC LIMIT 20"
);
for (const row of remaining.rows) {
  console.log(`  - id=${row.id} | email=${row.email} | name=${row.displayName} | online=${row.online} | lastOnlineAt=${row.lastOnlineAt}`);
}

console.log("\nDone.");
