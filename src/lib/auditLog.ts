import { createClient } from "@libsql/client";

function client() {
  const url = process.env.TURSO_DATABASE_URL;
  const token = process.env.TURSO_AUTH_TOKEN;
  if (!url) throw new Error("TURSO_DATABASE_URL belum diset.");
  return createClient({ url, authToken: token });
}

export type AuditLogEntry = {
  id: number;
  timestamp: number;
  actorUid: string;
  actorEmail: string | null;
  action: string;
  targetUid: string | null;
  targetEmail: string | null;
  amount: number | null;
  meta: Record<string, unknown>;
  ip: string | null;
  userAgent: string | null;
};

export type AuditLogQuery = {
  limit?: number;
  action?: string;
  actorUid?: string;
  targetUid?: string;
  sinceTs?: number;
};

function num(v: unknown): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v !== "" && !Number.isNaN(Number(v))) return Number(v);
  if (typeof v === "bigint") return Number(v);
  return 0;
}

export async function getAuditLog(opts: AuditLogQuery = {}): Promise<AuditLogEntry[]> {
  const c = client();
  const limit = Math.min(parseInt(String(opts.limit || "100"), 10), 500);
  const where: string[] = [];
  const args: (string | number)[] = [];
  if (opts.action) {
    where.push("action = ?");
    args.push(opts.action);
  }
  if (opts.actorUid) {
    where.push("actorUid = ?");
    args.push(opts.actorUid);
  }
  if (opts.targetUid) {
    where.push("targetUid = ?");
    args.push(opts.targetUid);
  }
  if (opts.sinceTs) {
    where.push("timestamp >= ?");
    args.push(Number(opts.sinceTs));
  }
  const sql = `SELECT id, timestamp, actorUid, actorEmail, action, targetUid, targetEmail, amount, meta, ip, userAgent
               FROM audit_log
               ${where.length ? "WHERE " + where.join(" AND ") : ""}
               ORDER BY COALESCE(timestamp, 0) DESC
               LIMIT ?`;
  args.push(limit);
  const r = await c.execute({ sql, args: args.map(a => a as never) });
  return r.rows.map((row) => {
    let meta: Record<string, unknown> = {};
    try {
      meta = row.meta ? (JSON.parse(String(row.meta)) as Record<string, unknown>) : {};
    } catch { /* ignore */ }
    return {
      id: Number(row.id),
      timestamp: num(row.timestamp),
      actorUid: String(row.actorUid || ""),
      actorEmail: row.actorEmail ? String(row.actorEmail) : null,
      action: String(row.action || ""),
      targetUid: row.targetUid ? String(row.targetUid) : null,
      targetEmail: row.targetEmail ? String(row.targetEmail) : null,
      amount: typeof row.amount === "number" ? row.amount : null,
      meta,
      ip: row.ip ? String(row.ip) : null,
      userAgent: row.userAgent ? String(row.userAgent) : null,
    };
  });
}

export async function getAuditLogSummary(): Promise<{
  total: number;
  byAction: Array<{ action: string; count: number }>;
  last24h: number;
  last7d: number;
}> {
  const c = client();
  const now = Date.now();
  const dayMs = 86400000;
  const r = await c.execute(
    `SELECT action, COUNT(*) as count
     FROM audit_log
     WHERE timestamp >= ?
     GROUP BY action
     ORDER BY count DESC`,
    [now - 7 * dayMs]
  );
  const byAction = r.rows.map((row) => ({
    action: String(row.action || ""),
    count: num(row.count),
  }));
  const totalR = await c.execute("SELECT COUNT(*) as n FROM audit_log");
  const last24R = await c.execute({
    sql: "SELECT COUNT(*) as n FROM audit_log WHERE timestamp >= ?",
    args: [now - dayMs],
  });
  const last7R = await c.execute({
    sql: "SELECT COUNT(*) as n FROM audit_log WHERE timestamp >= ?",
    args: [now - 7 * dayMs],
  });
  return {
    total: num(totalR.rows[0].n),
    byAction,
    last24h: num(last24R.rows[0].n),
    last7d: num(last7R.rows[0].n),
  };
}
