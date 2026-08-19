import { createClient } from "@libsql/client";

function client() {
  const url = process.env.TURSO_DATABASE_URL;
  const token = process.env.TURSO_AUTH_TOKEN;
  if (!url) throw new Error("TURSO_DATABASE_URL belum diset.");
  return createClient({ url, authToken: token });
}

function tsToISO(v: unknown): string | null {
  if (v == null) return null;
  const n = typeof v === "number" ? v : typeof v === "string" && !Number.isNaN(Number(v)) ? Number(v) : null;
  if (n == null) return null;
  try { return new Date(n).toISOString(); } catch { return null; }
}

function jsonToData(v: unknown): Record<string, unknown> {
  if (v == null) return {};
  if (typeof v === "string") {
    try { return JSON.parse(v) as Record<string, unknown>; } catch { return {}; }
  }
  if (typeof v === "object") return v as Record<string, unknown>;
  return {};
}

function dataToJson(v: unknown): string | null {
  if (v == null) return null;
  if (typeof v === "string") return v;
  try { return JSON.stringify(v); } catch { return null; }
}

export type CoinMember = {
  uid: string;
  email: string | null;
  displayName: string | null;
  gold: number;
  updatedAt: string | null;
  isAdmin: boolean;
};

export type GoldLogRow = {
  id: string;
  uid: string;
  email: string | null;
  type: string | null;
  amount: number | null;
  balanceAfter: number | null;
  createdAt: string | null;
  meta: Record<string, unknown>;
};

export async function getCoinMembers(): Promise<{ members: CoinMember[]; totalGold: number; totalMembers: number }> {
  const c = client();
  const r = await c.execute(
    "SELECT id, uid, email, displayName, gold, updatedAt FROM users WHERE deleted = 0 ORDER BY COALESCE(lastLoginAt, 0) DESC LIMIT 500"
  );
  // Read admin whitelist from env (NEXT_PUBLIC_ADMIN_EMAILS) — union with
  // optional ADMIN_UIDS env (set on admin-panel-babft if needed).
  const adminEmails = new Set(
    (process.env.NEXT_PUBLIC_ADMIN_EMAILS || "")
      .split(",").map((s) => s.trim().toLowerCase()).filter(Boolean)
  );
  const adminUids = new Set(
    (process.env.ADMIN_UIDS || "")
      .split(",").map((s) => s.trim()).filter(Boolean)
  );
  const members: CoinMember[] = r.rows.map((row) => {
    const email = row.email != null ? String(row.email) : null;
    const uid = String(row.id ?? row.uid ?? "");
    const isAdmin = (email != null && adminEmails.has(email.toLowerCase())) || adminUids.has(uid);
    return {
      uid,
      email,
      displayName: row.displayName != null ? String(row.displayName) : null,
      gold: typeof row.gold === "number" ? row.gold : typeof row.gold === "string" ? Number(row.gold) || 0 : 0,
      updatedAt: tsToISO(row.updatedAt),
      isAdmin,
    };
  });
  const totalGold = members.reduce((sum, m) => sum + m.gold, 0);
  return { members, totalGold, totalMembers: members.length };
}

export async function lookupCoinUser(email: string): Promise<{
  found: boolean;
  uid?: string;
  email?: string | null;
  displayName?: string | null;
  gold?: number;
}> {
  const c = client();
  const r = await c.execute({
    sql: "SELECT id, email, displayName, gold FROM users WHERE LOWER(COALESCE(email, '')) = ? AND deleted = 0 LIMIT 1",
    args: [email.toLowerCase().trim()],
  });
  if (r.rows.length === 0) return { found: false };
  const row = r.rows[0];
  return {
    found: true,
    uid: String(row.id),
    email: row.email != null ? String(row.email) : null,
    displayName: row.displayName != null ? String(row.displayName) : null,
    gold: typeof row.gold === "number" ? row.gold : 0,
  };
}

export async function getGoldLogs(limit: number = 200): Promise<GoldLogRow[]> {
  const c = client();
  const r = await c.execute({
    sql: "SELECT id, uid, email, type, amount, balanceAfter, createdAt, meta FROM gold_log ORDER BY COALESCE(createdAt, 0) DESC LIMIT ?",
    args: [limit],
  });
  return r.rows.map((row) => ({
    id: String(row.id),
    uid: String(row.uid ?? ""),
    email: row.email != null ? String(row.email) : null,
    type: row.type != null ? String(row.type) : null,
    amount: typeof row.amount === "number" ? row.amount : null,
    balanceAfter: typeof row.balanceAfter === "number" ? row.balanceAfter : null,
    createdAt: tsToISO(row.createdAt),
    meta: jsonToData(row.meta),
  }));
}

async function writeGoldLog(
  uid: string,
  email: string | null,
  type: string,
  amount: number,
  balanceAfter: number,
  meta: Record<string, unknown>
): Promise<void> {
  const c = client();
  await c.execute({
    sql: "INSERT INTO gold_log (uid, email, type, amount, balanceAfter, createdAt, meta) VALUES (?, ?, ?, ?, ?, ?, ?)",
    args: [uid, email, type, amount, balanceAfter, Date.now(), dataToJson(meta)],
  });
}

export async function grantGold(
  uid: string,
  amount: number,
  note: string | null,
  adminEmail: string
): Promise<{ newBalance: number }> {
  if (amount <= 0 || amount > 100000) throw new Error("amount (1-100000) required");
  const c = client();
  const r = await c.execute({ sql: "SELECT id, email, gold FROM users WHERE id = ? AND deleted = 0", args: [uid] });
  if (r.rows.length === 0) throw new Error("User not found");
  const row = r.rows[0];
  const current = typeof row.gold === "number" ? row.gold : 0;
  const newBalance = current + amount;
  const now = Date.now();
  await c.execute({
    sql: "UPDATE users SET gold = ?, updatedAt = ? WHERE id = ?",
    args: [newBalance, now, uid],
  });
  await writeGoldLog(uid, row.email != null ? String(row.email) : null, "admin_grant", amount, newBalance, {
    note: note || null,
    source: "admin_panel",
    adminEmail,
  });
  return { newBalance };
}

export async function deductGold(
  uid: string,
  amount: number,
  note: string | null,
  adminEmail: string
): Promise<{ newBalance: number }> {
  if (amount <= 0 || amount > 100000) throw new Error("amount (1-100000) required");
  const c = client();
  const r = await c.execute({ sql: "SELECT id, email, gold FROM users WHERE id = ? AND deleted = 0", args: [uid] });
  if (r.rows.length === 0) throw new Error("User not found");
  const row = r.rows[0];
  const current = typeof row.gold === "number" ? row.gold : 0;
  if (current < amount) {
    const e = new Error("Insufficient gold");
    (e as any).statusCode = 402;
    (e as any).currentGold = current;
    throw e;
  }
  const newBalance = current - amount;
  const now = Date.now();
  await c.execute({
    sql: "UPDATE users SET gold = ?, updatedAt = ? WHERE id = ?",
    args: [newBalance, now, uid],
  });
  await writeGoldLog(uid, row.email != null ? String(row.email) : null, "admin_deduct", -amount, newBalance, {
    note: note || null,
    source: "admin_panel",
    adminEmail,
  });
  return { newBalance };
}

export async function bulkGrantGold(
  amount: number,
  note: string | null,
  adminEmail: string,
  excludeUid?: string | null
): Promise<{ count: number; totalGranted: number; results: Array<{ uid: string; email: string | null; oldGold: number; newGold: number }> }> {
  if (amount <= 0 || amount > 100000) throw new Error("amount (1-100000) required");
  const c = client();
  const r = await c.execute(
    excludeUid
      ? { sql: "SELECT id, email, gold FROM users WHERE deleted = 0 AND id != ?", args: [excludeUid] }
      : "SELECT id, email, gold FROM users WHERE deleted = 0"
  );
  const now = Date.now();
  const results: Array<{ uid: string; email: string | null; oldGold: number; newGold: number }> = [];
  for (const row of r.rows) {
    const uid = String(row.id);
    const email = row.email != null ? String(row.email) : null;
    const current = typeof row.gold === "number" ? row.gold : 0;
    const newGold = current + amount;
    await c.execute({
      sql: "UPDATE users SET gold = ?, updatedAt = ? WHERE id = ?",
      args: [newGold, now, uid],
    });
    await writeGoldLog(uid, email, "admin_grant", amount, newGold, {
      note: note || "Bulk grant",
      bulkGrant: true,
      source: "admin_panel",
      adminEmail,
    });
    results.push({ uid, email, oldGold: current, newGold });
  }
  return { count: results.length, totalGranted: results.length * amount, results };
}

export async function bulkDeductGold(
  amount: number,
  note: string | null,
  adminEmail: string,
  excludeUid?: string | null
): Promise<{ count: number; totalDeducted: number; results: Array<{ uid: string; email: string | null; oldGold: number; deducted: number; newGold: number }> }> {
  if (amount <= 0 || amount > 100000) throw new Error("amount (1-100000) required");
  const c = client();
  const r = await c.execute(
    excludeUid
      ? { sql: "SELECT id, email, gold FROM users WHERE deleted = 0 AND id != ?", args: [excludeUid] }
      : "SELECT id, email, gold FROM users WHERE deleted = 0"
  );
  const now = Date.now();
  const results: Array<{ uid: string; email: string | null; oldGold: number; deducted: number; newGold: number }> = [];
  for (const row of r.rows) {
    const uid = String(row.id);
    const email = row.email != null ? String(row.email) : null;
    const current = typeof row.gold === "number" ? row.gold : 0;
    const deductAmount = Math.min(amount, current);
    if (deductAmount <= 0) continue;
    const newGold = current - deductAmount;
    await c.execute({
      sql: "UPDATE users SET gold = ?, updatedAt = ? WHERE id = ?",
      args: [newGold, now, uid],
    });
    await writeGoldLog(uid, email, "admin_deduct", -deductAmount, newGold, {
      note: note || "Bulk deduct",
      bulkDeduct: true,
      source: "admin_panel",
      adminEmail,
    });
    results.push({ uid, email, oldGold: current, deducted: deductAmount, newGold });
  }
  return { count: results.length, totalDeducted: results.reduce((s, r) => s + r.deducted, 0), results };
}
