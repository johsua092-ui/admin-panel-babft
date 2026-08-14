import { getConvexClient } from "@/lib/convexClient";
import type { DataSource, AdminLogsResult, AnalyticsResult, HistoryRow } from "@/lib/dataSource";

export const convexDataSource: DataSource = {
  name: "convex",
  async getUsers() { return (await getConvexClient().query("users:getUsers" as any, {})) as any; },
  async getUserHistory(uid) { return (await getConvexClient().query("users:getUserHistory" as any, { uid })) as HistoryRow[]; },
  async deleteUser(id) { const r = (await getConvexClient().mutation("users:deleteUser" as any, { id })) as any; return { ok: Boolean(r.ok), id }; },
  async logAdminLogin({ uid, email, role }) { await getConvexClient().mutation("adminLogins:logAdminLogin" as any, { uid, email, role, timestamp: Date.now() }); return { ok: true }; },
  async getAdminLogs() { return (await getConvexClient().query("adminLogins:getAdminLogins" as any, {})) as AdminLogsResult; },
  async getAnalytics() { return (await getConvexClient().query("analytics:getAnalyticsEvents" as any, {})) as AnalyticsResult; },
  async upsertUser(id, data) { await getConvexClient().mutation("users:upsertUser" as any, { id, data }); return { ok: true }; },
};
