import { convexQuery, convexMutation } from "@/lib/convexClient";
import type { DataSource, AdminLogsResult, AnalyticsResult, HistoryRow } from "@/lib/dataSource";

export const convexDataSource: DataSource = {
  name: "convex",
  async getUsers() { return convexQuery("users:getUsers", {}); },
  async getUserHistory(uid) { return convexQuery<HistoryRow[]>("users:getUserHistory", { uid }); },
  async deleteUser(id) { const r = await convexMutation<{ ok: boolean }>("users:deleteUser", { id }); return { ok: Boolean(r.ok), id }; },
  async logAdminLogin({ uid, email, role }) { await convexMutation("adminLogins:logAdminLogin", { uid, email, role, timestamp: Date.now() }); return { ok: true }; },
  async getAdminLogs() { return convexQuery<AdminLogsResult>("adminLogins:getAdminLogins", {}); },
  async getAnalytics() { return convexQuery<AnalyticsResult>("analytics:getAnalyticsEvents", {}); },
  async upsertUser(id, data) { await convexMutation<{ ok: boolean }>("users:upsertUser", { id, data }); return { ok: true }; },
};
