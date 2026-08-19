import { createClient, type InValue } from "@libsql/client";
import type { DataSource, AdminLogsResult, AnalyticsResult, HistoryRow } from "@/lib/dataSource";

function client() {
  const url = process.env.TURSO_DATABASE_URL;
  const token = process.env.TURSO_AUTH_TOKEN;
  if (!url) throw new Error("TURSO_DATABASE_URL belum diset.");
  return createClient({ url, authToken: token });
}

type Row = Record<string, unknown>;

function asBool(v: unknown): boolean {
  if (typeof v === "boolean") return v;
  if (typeof v === "number") return v === 1;
  if (typeof v === "string") return v === "1" || v === "true";
  return false;
}

function asNum(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v !== "" && !Number.isNaN(Number(v))) return Number(v);
  return null;
}

function rowToUser(r: Row): Record<string, unknown> {
  const out: Record<string, unknown> = { id: r.id };
  for (const [k, v] of Object.entries(r)) {
    if (k === "id") continue;
    if (v === null) { out[k] = null; continue; }
    if (typeof v === "bigint") { out[k] = Number(v); continue; }
    if (typeof v === "number" || typeof v === "string" || typeof v === "boolean") {
      const boolKeys = ["isGuest", "online", "flaggedAsVpn", "isProxy", "isHosting", "mobile", "banned", "deleted"];
      const numKeys = ["lastLoginAt", "lastOnlineAt", "firstLoginAt", "loginCount", "latitude", "longitude", "accuracy", "regionChangedAt", "regionChangeCount", "bannedAt", "unbannedAt", "deletedAt", "createdAt", "updatedAt"];
      if (boolKeys.includes(k)) out[k] = asBool(v);
      else if (numKeys.includes(k)) out[k] = asNum(v);
      else out[k] = v;
    }
  }
  return out;
}

function dataToJson(v: unknown): Record<string, unknown> {
  if (v == null) return {};
  if (typeof v === "string") {
    try { return JSON.parse(v) as Record<string, unknown>; } catch { return {}; }
  }
  if (typeof v === "object") return v as Record<string, unknown>;
  return {};
}

function jsonToData(v: unknown): string | null {
  if (v == null) return null;
  if (typeof v === "string") return v;
  try { return JSON.stringify(v); } catch { return null; }
}

const USER_COLS = [
  "id", "uid", "email", "isGuest", "displayName", "photoURL",
  "lastLoginAt", "loginCount", "online", "lastOnlineAt", "firstLoginAt",
  "region", "countryCode", "regionName", "isp", "timezone", "ipAddress",
  "latitude", "longitude", "accuracy", "address", "city", "postal",
  "deviceId", "device", "os", "browser", "deviceType", "screen", "language",
  "userAgent", "previousRegion", "regionChangedAt", "regionChangeCount",
  "flaggedAsVpn", "isProxy", "isHosting", "vpnProvider", "asn", "asOrg", "mobile",
  "referrer", "searchEngine", "searchQuery", "utmSource", "utmMedium", "utmCampaign",
  "landingPath", "banned", "bannedAt", "bannedReason", "unbannedAt",
  "deleted", "deletedAt", "createdAt", "updatedAt",
];

function colVal(v: unknown): InValue {
  if (typeof v === "boolean") return v ? 1 : 0;
  if (v === undefined) return null;
  if (typeof v === "object" && v !== null) return jsonToData(v);
  if (typeof v === "string" || typeof v === "number" || typeof v === "bigint") return v;
  return null;
}

export const tursoDataSource: DataSource = {
  name: "turso",
  async getUsers() {
    const c = client();
    const r = await c.execute(
      "SELECT * FROM users WHERE deleted = 0 ORDER BY COALESCE(lastLoginAt, 0) DESC LIMIT 500"
    );
    return r.rows.map((row) => rowToUser(row as unknown as Row)) as any;
  },
  async getUserHistory(uid) {
    const c = client();
    const r = await c.execute({
      sql: "SELECT id, uid, timestamp, data FROM history WHERE uid = ? ORDER BY COALESCE(timestamp, 0) DESC LIMIT 200",
      args: [uid],
    });
    return r.rows.map((row) => ({
      id: String(row.id),
      uid: String(row.uid),
      timestamp: asNum(row.timestamp),
      ...(dataToJson(row.data as unknown as Row)),
    })) as HistoryRow[];
  },
  async deleteUser(id) {
    const c = client();
    const now = Date.now();
    await c.execute({
      sql: "UPDATE users SET deleted = 1, deletedAt = ? WHERE id = ?",
      args: [now, id],
    });
    return { ok: true, id };
  },
  async logAdminLogin({ uid, email, role }) {
    const c = client();
    const now = Date.now();
    const id = `${now.toString(36)}_${uid.slice(0, 8)}`;
    await c.execute({
      sql: "INSERT INTO admin_logins (id, uid, email, role, timestamp) VALUES (?, ?, ?, ?, ?)",
      args: [id, uid, email, role, now],
    });
    return { ok: true };
  },
  async getAdminLogs() {
    const c = client();
    const r = await c.execute(
      "SELECT id, uid, email, role, timestamp FROM admin_logins ORDER BY timestamp DESC LIMIT 500"
    );
    const logs = r.rows.map((row) => ({
      id: String(row.id),
      uid: String(row.uid),
      email: String(row.email),
      role: String(row.role),
      timestamp: asNum(row.timestamp),
    })) as any;
    const byEmail = new Map<string, any>();
    for (const l of logs) {
      const key = l.email.toLowerCase();
      const e = byEmail.get(key);
      if (!e) byEmail.set(key, { email: l.email, role: l.role, count: 1, last: l.timestamp, first: l.timestamp });
      else {
        e.count += 1;
        if (l.timestamp > e.last) e.last = l.timestamp;
        if (l.timestamp < e.first) e.first = l.timestamp;
      }
    }
    const admins = Array.from(byEmail.values()).sort((a, b) => b.last - a.last);
    return { logs, admins } as AdminLogsResult;
  },
  async getAnalytics() {
    const c = client();
    const r = await c.execute(
      "SELECT eventId, timestamp, kind, deviceId, data FROM analytics ORDER BY COALESCE(timestamp, 0) DESC LIMIT 500"
    );
    const events = r.rows.map((row) => ({
      id: String(row.eventId),
      eventId: String(row.eventId),
      timestamp: asNum(row.timestamp),
      kind: row.kind != null ? String(row.kind) : null,
      deviceId: row.deviceId != null ? String(row.deviceId) : null,
      ...dataToJson(row.data as unknown as Row),
    })) as Array<Record<string, any>>;
    const now = Date.now();
    const lastMin = events.filter((e) => now - (e.timestamp ?? 0) < 60000);
    const last10min = events.filter((e) => now - (e.timestamp ?? 0) < 600000);
    const failedLogins = events.filter((e) => e.kind === "login_failed");
    const errors = events.filter((e) => e.kind === "error");
    const heartbeats = events.filter((e) => e.kind === "heartbeat");
    const suspicious: any[] = [];
    const recentFailed = failedLogins.filter((e) => now - (e.timestamp ?? 0) < 300000);
    if (recentFailed.length >= 5) suspicious.push({ id: "brute_force", level: "danger", title: "Kemungkinan brute-force login", detail: `${recentFailed.length} login gagal dalam 5 menit terakhir.` });
    const hbLastMin = heartbeats.filter((e) => now - (e.timestamp ?? 0) < 60000);
    if (hbLastMin.length >= 30) suspicious.push({ id: "flood", level: "warn", title: "Lonjakan traffic (kemungkinan flood)", detail: `${hbLastMin.length} heartbeat dalam 1 menit terakhir.` });
    const errLast5min = errors.filter((e) => now - (e.timestamp ?? 0) < 300000);
    if (errLast5min.length >= 10) suspicious.push({ id: "error_burst", level: "warn", title: "Lonjakan error", detail: `${errLast5min.length} error JS/promise dalam 5 menit.` });
    const uniqueAnon = new Set(last10min.map((e) => e.deviceId).filter(Boolean)).size;
    if (uniqueAnon >= 50) suspicious.push({ id: "many_clients", level: "warn", title: "Banyak klien unik", detail: `${uniqueAnon} perangkat unik dalam 10 menit.` });
    return { events, summary: { total: events.length, errors: errors.length, failedLogins: failedLogins.length, heartbeats: heartbeats.length, lastMin: lastMin.length, last10min: last10min.length, uniqueDevices: uniqueAnon }, suspicious } as AnalyticsResult;
  },
  async upsertUser(id, data) {
    const c = client();
    const existing = await c.execute({ sql: "SELECT id, banned, deleted FROM users WHERE id = ?", args: [id] });
    const now = Date.now();
    const incoming: Record<string, unknown> = { ...data };
    if (existing.rows.length > 0) {
      const cur = existing.rows[0] as Row;
      if (asBool(cur.banned) || asBool(incoming.banned)) {
        incoming.banned = true;
        if (!asNum(incoming.bannedAt)) incoming.bannedAt = asNum(cur.bannedAt) ?? now;
        if (!incoming.bannedReason) incoming.bannedReason = cur.bannedReason ?? null;
      }
      if (asBool(cur.deleted)) {
        incoming.deleted = true;
        if (!asNum(incoming.deletedAt)) incoming.deletedAt = asNum(cur.deletedAt) ?? now;
      }
    }
    incoming.id = id;
    incoming.updatedAt = asNum(incoming.updatedAt) ?? now;
    if (!asNum(incoming.createdAt)) incoming.createdAt = now;
    const cols = USER_COLS.filter((k) => k in incoming);
    const placeholders = cols.map(() => "?").join(", ");
    const args = cols.map((k) => colVal(incoming[k]));
    const updates = cols.filter((k) => k !== "id").map((k) => `${k} = excluded.${k}`).join(", ");
    const sql = `INSERT INTO users (${cols.join(", ")}) VALUES (${placeholders}) ON CONFLICT(id) DO UPDATE SET ${updates}`;
    await c.execute({ sql, args });
    return { ok: true };
  },
  async setBan(id, banned, reason) {
    const c = client();
    const now = Date.now();
    if (banned) {
      await c.execute({
        sql: "UPDATE users SET banned = 1, bannedAt = ?, bannedReason = ? WHERE id = ?",
        args: [now, reason ?? null, id],
      });
    } else {
      await c.execute({
        sql: "UPDATE users SET banned = 0, unbannedAt = ?, bannedReason = NULL WHERE id = ?",
        args: [now, id],
      });
    }
    return { ok: true, id, banned };
  },
};

export const tursoHelpers = {
  async addHistory(uid: string, timestamp: number | null, data: Record<string, unknown>) {
    const c = client();
    await c.execute({
      sql: "INSERT INTO history (uid, timestamp, data) VALUES (?, ?, ?)",
      args: [uid, timestamp, jsonToData(data)],
    });
    return { ok: true };
  },
  async upsertAnalytics(eventId: string, timestamp: number, kind: string | undefined, deviceId: string | undefined, data: Record<string, unknown>) {
    const c = client();
    await c.execute({
      sql: `INSERT INTO analytics (eventId, timestamp, kind, deviceId, data)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(eventId) DO UPDATE SET timestamp = excluded.timestamp, kind = excluded.kind, deviceId = excluded.deviceId, data = excluded.data`,
      args: [eventId, timestamp, kind ?? null, deviceId ?? null, jsonToData(data)],
    });
    return { ok: true };
  },
};
