import { firestoreDataSource } from "@/lib/firestoreDataSource";
import { convexDataSource } from "@/lib/convexDataSource";
import { convexMutation } from "@/lib/convexClient";
import { tursoDataSource, tursoHelpers } from "@/lib/tursoDataSource";
import type { DataSource } from "@/lib/dataSource";
import { getCached, setCached } from "@/lib/apiCache";

type Backend = "FIREBASE" | "CONVEX" | "TURSO";

function primaryBackend(): Backend {
  const v = (process.env.DATA_BACKEND || "TURSO").toUpperCase();
  if (v === "CONVEX") return "CONVEX";
  if (v === "FIREBASE") return "FIREBASE";
  return "TURSO";
}

function mirrorEnabled(): boolean {
  return process.env.MIRROR_WRITES === "true";
}

export function primarySource(): DataSource {
  const b = primaryBackend();
  if (b === "CONVEX") return convexDataSource;
  if (b === "FIREBASE") return firestoreDataSource;
  return tursoDataSource;
}

function fallbackSource(p: DataSource): DataSource {
  if (p.name === "convex") return tursoDataSource;
  if (p.name === "firestore") return tursoDataSource;
  return firestoreDataSource;
}

async function readWithFailover<T>(cacheKey: string, ttlMs: number, reader: (ds: DataSource) => Promise<T>): Promise<T> {
  const cached = getCached<T>(cacheKey);
  if (cached !== undefined) return cached;
  const primary = primarySource();
  const fallback = fallbackSource(primary);
  try {
    const v = await reader(primary);
    setCached(cacheKey, v, ttlMs);
    return v;
  } catch (e) {
    console.warn(`[data] "${primary.name}" gagal, fallback "${fallback.name}":`, e);
    const v = await reader(fallback);
    setCached(cacheKey, v, ttlMs);
    return v;
  }
}

async function writeWithMirror<T>(writer: (ds: DataSource) => Promise<T>): Promise<T> {
  const primary = primarySource();
  const fallback = fallbackSource(primary);
  const result = await writer(primary);
  if (mirrorEnabled()) writer(fallback).catch((e) => console.warn(`[data] mirror "${fallback.name}" gagal:`, e));
  return result;
}

export const data = {
  getUsers: () => readWithFailover("users", 30000, (ds) => ds.getUsers()),
  getUserHistory: (uid: string) => readWithFailover(`history-${uid}`, 15000, (ds) => ds.getUserHistory(uid)),
  getAdminLogs: () => readWithFailover("admin-logs", 60000, (ds) => ds.getAdminLogs()),
  getAnalytics: () => readWithFailover("analytics-full", 30000, (ds) => ds.getAnalytics()),
  deleteUser: (id: string) => writeWithMirror((ds) => ds.deleteUser(id)),
  logAdminLogin: (i: { uid: string; email: string; role: string }) => writeWithMirror((ds) => ds.logAdminLogin(i)),
  upsertUser: (id: string, p: Record<string, unknown>) => writeWithMirror((ds) => ds.upsertUser(id, p)),
  setBan: (id: string, banned: boolean, reason?: string | null) => writeWithMirror((ds) => ds.setBan(id, banned, reason ?? null)),
  addHistory: (uid: string, timestamp: number | null, payload: Record<string, unknown>) => {
    const primary = primarySource();
    if (primary.name === "turso") return tursoHelpers.addHistory(uid, timestamp, payload);
    if (primary.name === "convex") {
      return convexMutation("users:addHistory", { uid, timestamp, data: payload }).then(() => ({ ok: true }));
    }
    return Promise.resolve({ ok: true });
  },
  upsertAnalytics: (eventId: string, timestamp: number, kind: string | undefined, deviceId: string | undefined, payload: Record<string, unknown>) => {
    const primary = primarySource();
    if (primary.name === "turso") return tursoHelpers.upsertAnalytics(eventId, timestamp, kind, deviceId, payload);
    if (primary.name === "convex") {
      return convexMutation("analytics:upsertAnalyticsEvent", { eventId, timestamp, kind, deviceId, data: payload }).then(() => ({ ok: true }));
    }
    return Promise.resolve({ ok: true });
  },
};
