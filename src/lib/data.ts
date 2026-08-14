import { firestoreDataSource } from "@/lib/firestoreDataSource";
import { convexDataSource } from "@/lib/convexDataSource";
import type { DataSource } from "@/lib/dataSource";
import { getCached, setCached } from "@/lib/apiCache";

type Backend = "FIREBASE" | "CONVEX";

function primaryBackend(): Backend {
  return (process.env.DATA_BACKEND || "FIREBASE").toUpperCase() === "CONVEX" ? "CONVEX" : "FIREBASE";
}

function mirrorEnabled(): boolean {
  return process.env.MIRROR_WRITES === "true";
}

export function primarySource(): DataSource {
  return primaryBackend() === "CONVEX" ? convexDataSource : firestoreDataSource;
}

function fallbackSource(p: DataSource): DataSource {
  return p.name === "convex" ? firestoreDataSource : convexDataSource;
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
};
