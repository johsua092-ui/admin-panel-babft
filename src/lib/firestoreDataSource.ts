import { getAdminDb } from "@/lib/adminFirestore";
import type { DataSource, AdminLogsResult, AnalyticsResult } from "@/lib/dataSource";

const USERS = () => process.env.NEXT_PUBLIC_USERS_COLLECTION || "users";
const ANALYTICS = () => process.env.NEXT_PUBLIC_ANALYTICS_COLLECTION || "analytics";

export const firestoreDataSource: DataSource = {
  name: "firestore",
  async getUsers() {
    const db = getAdminDb();
    const snap = await db.collection(USERS()).limit(500).get();
    const all = snap.docs.map((d) => {
      const data = d.data() as Record<string, unknown>;
      return { id: d.id, ...data };
    });
    const alive = all.filter((u: Record<string, unknown>) => u.deleted !== true);
    alive.sort((a: Record<string, unknown>, b: Record<string, unknown>) => {
      const aT = typeof a.lastLoginAt === "number" ? a.lastLoginAt : 0;
      const bT = typeof b.lastLoginAt === "number" ? b.lastLoginAt : 0;
      return (bT as number) - (aT as number);
    });
    return alive as any;
  },
  async getUserHistory(uid) { const db = getAdminDb(); const s = await db.collection(USERS()).doc(uid).collection("history").orderBy("timestamp", "desc").limit(200).get(); return s.docs.map((d) => ({ id: d.id, ...(d.data() as Record<string, unknown>) })); },
  async deleteUser(id) { const db = getAdminDb(); await db.collection(USERS()).doc(id).delete(); return { ok: true, id }; },
  async logAdminLogin({ uid, email, role }) { const db = getAdminDb(); const now = Date.now(); const id = `${now.toString(36)}_${uid.slice(0, 8)}`; await db.collection("admin_logins").doc(id).set({ uid, email, role, timestamp: now }); return { ok: true }; },
  async getAdminLogs() { const db = getAdminDb(); const s = await db.collection("admin_logins").orderBy("timestamp", "desc").limit(500).get(); const logs = s.docs.map((d) => ({ id: d.id, ...(d.data() as object) })) as any; const byEmail = new Map<string, any>(); for (const l of logs) { const key = l.email.toLowerCase(); const e = byEmail.get(key); if (!e) byEmail.set(key, { email: l.email, role: l.role, count: 1, last: l.timestamp, first: l.timestamp }); else { e.count += 1; if (l.timestamp > e.last) e.last = l.timestamp; if (l.timestamp < e.first) e.first = l.timestamp; } } const admins = Array.from(byEmail.values()).sort((a, b) => b.last - a.last); return { logs, admins } as AdminLogsResult; },
  async getAnalytics() { const db = getAdminDb(); const s = await db.collection(ANALYTICS()).orderBy("timestamp", "desc").limit(500).get(); const events = s.docs.map((d) => ({ id: d.id, ...(d.data() as object) })) as Array<Record<string, any>>; const now = Date.now(); const lastMin = events.filter((e) => now - (e.timestamp ?? 0) < 60000); const last10min = events.filter((e) => now - (e.timestamp ?? 0) < 600000); const failedLogins = events.filter((e) => e.kind === "login_failed"); const errors = events.filter((e) => e.kind === "error"); const heartbeats = events.filter((e) => e.kind === "heartbeat"); const suspicious: any[] = []; const recentFailed = failedLogins.filter((e) => now - (e.timestamp ?? 0) < 300000); if (recentFailed.length >= 5) suspicious.push({ id: "brute_force", level: "danger", title: "Kemungkinan brute-force login", detail: `${recentFailed.length} login gagal dalam 5 menit terakhir.` }); const hbLastMin = heartbeats.filter((e) => now - (e.timestamp ?? 0) < 60000); if (hbLastMin.length >= 30) suspicious.push({ id: "flood", level: "warn", title: "Lonjakan traffic (kemungkinan flood)", detail: `${hbLastMin.length} heartbeat dalam 1 menit terakhir.` }); const errLast5min = errors.filter((e) => now - (e.timestamp ?? 0) < 300000); if (errLast5min.length >= 10) suspicious.push({ id: "error_burst", level: "warn", title: "Lonjakan error", detail: `${errLast5min.length} error JS/promise dalam 5 menit.` }); const uniqueAnon = new Set(last10min.map((e) => e.deviceId).filter(Boolean)).size; if (uniqueAnon >= 50) suspicious.push({ id: "many_clients", level: "warn", title: "Banyak klien unik", detail: `${uniqueAnon} perangkat unik dalam 10 menit.` }); return { events, summary: { total: events.length, errors: errors.length, failedLogins: failedLogins.length, heartbeats: heartbeats.length, lastMin: lastMin.length, last10min: last10min.length, uniqueDevices: uniqueAnon }, suspicious } as AnalyticsResult; },
  async upsertUser(id, data) { const db = getAdminDb(); await db.collection(USERS()).doc(id).set({ ...data, id }, { merge: true }); return { ok: true }; },
  async setBan(id, banned, reason) { const db = getAdminDb(); const now = Date.now(); await db.collection(USERS()).doc(id).set(banned ? { banned: true, bannedAt: now, bannedReason: reason ?? null } : { banned: false, unbannedAt: now, bannedReason: null }, { merge: true }); return { ok: true, id, banned }; },
};
