import type { UserRecord } from "@/lib/types";
export type { UserRecord };

export type HistoryRow = { id: string; timestamp?: number | null; [key: string]: unknown };
export type AdminLogin = { id: string; uid: string; email: string; role: string; timestamp: number };
export type AdminLogsResult = { logs: AdminLogin[]; admins: Array<{ email: string; role: string; count: number; last: number; first: number }> };
export type AnalyticsResult = { events: Array<Record<string, unknown>>; summary: { total: number; errors: number; failedLogins: number; heartbeats: number; lastMin: number; last10min: number; uniqueDevices: number }; suspicious: Array<{ id: string; level: string; title: string; detail: string }> };

export interface DataSource {
  readonly name: "firestore" | "convex";
  getUsers(): Promise<UserRecord[]>;
  getUserHistory(uid: string): Promise<HistoryRow[]>;
  deleteUser(id: string): Promise<{ ok: boolean; id: string }>;
  logAdminLogin(input: { uid: string; email: string; role: string }): Promise<{ ok: boolean }>;
  getAdminLogs(): Promise<AdminLogsResult>;
  getAnalytics(): Promise<AnalyticsResult>;
  upsertUser(id: string, data: Record<string, unknown>): Promise<{ ok: boolean }>;
}
