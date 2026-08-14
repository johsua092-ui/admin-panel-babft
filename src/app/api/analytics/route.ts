// GET /api/analytics — baca koleksi `analytics` (punya-si-jawa) via Admin SDK.
// Mengembalikan event terbaru + agregasi untuk deteksi aktivitas mencurigakan.

import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/adminFirestore";
import { getCached, setCached } from "@/lib/apiCache";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const TTL = 30000; // 30 detik

export async function GET() {
  const cached = getCached<any>("analytics-full");
  if (cached) return NextResponse.json(cached);

  try {
    const db = getAdminDb();
    const colName = process.env.NEXT_PUBLIC_ANALYTICS_COLLECTION || "analytics";

    const snap = await db
      .collection(colName)
      .orderBy("timestamp", "desc")
      .limit(500)
      .get();

    const events = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Record<string, unknown>) })) as Array<Record<string, any>>;

    // Agregasi heuristik
    const now = Date.now();
    const lastMin = events.filter((e) => now - (e.timestamp ?? 0) < 60000);
    const last10min = events.filter((e) => now - (e.timestamp ?? 0) < 600000);

    const failedLogins = events.filter((e) => e.kind === "login_failed");
    const errors = events.filter((e) => e.kind === "error");
    const heartbeats = events.filter((e) => e.kind === "heartbeat");

    // Deteksi mencurigakan (heuristik sederhana)
    const suspicious = [];

    // 1) Lonjakan login gagal (indikasi brute-force)
    const recentFailed = failedLogins.filter((e) => now - (e.timestamp ?? 0) < 300000);
    if (recentFailed.length >= 5) {
      suspicious.push({
        id: "brute_force",
        level: "danger",
        title: "Kemungkinan brute-force login",
        detail: `${recentFailed.length} login gagal dalam 5 menit terakhir.`,
      });
    }

    // 2) Lonjakan request/heartbeat (indikasi flood)
    const hbLastMin = heartbeats.filter((e) => now - (e.timestamp ?? 0) < 60000);
    if (hbLastMin.length >= 30) {
      suspicious.push({
        id: "flood",
        level: "warn",
        title: "Lonjakan traffic (kemungkinan flood)",
        detail: `${hbLastMin.length} heartbeat dalam 1 menit terakhir.`,
      });
    }

    // 3) Banyak error dalam waktu singkat
    const errLast5min = errors.filter((e) => now - (e.timestamp ?? 0) < 300000);
    if (errLast5min.length >= 10) {
      suspicious.push({
        id: "error_burst",
        level: "warn",
        title: "Lonjakan error",
        detail: `${errLast5min.length} error JS/promise dalam 5 menit.`,
      });
    }

    // 4) Banyak device/anon unik dalam menit terakhir
    const uniqueAnon = new Set(last10min.map((e) => e.deviceId).filter(Boolean)).size;
    if (uniqueAnon >= 50) {
      suspicious.push({
        id: "many_clients",
        level: "warn",
        title: "Banyak klien unik",
        detail: `${uniqueAnon} perangkat unik dalam 10 menit.`,
      });
    }

    const result = {
      events,
      summary: {
        total: events.length,
        errors: errors.length,
        failedLogins: failedLogins.length,
        heartbeats: heartbeats.length,
        lastMin: lastMin.length,
        last10min: last10min.length,
        uniqueDevices: uniqueAnon,
      },
      suspicious,
    };
    setCached("analytics-full", result, TTL);
    return NextResponse.json(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
