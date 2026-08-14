// GET /api/analytics/export — download CSV semua event analitik.

import { NextResponse } from "next/server";
import { guard, isResponse } from "@/lib/apiGuard";
import { getAdminDb } from "@/lib/adminFirestore";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function csvEscape(v: unknown): string {
  if (v == null) return "";
  let s = String(v);
  if (/[",\n]/.test(s)) s = '"' + s.replace(/"/g, '""') + '"';
  return s;
}

export async function GET(req: Request) {
  const g = await guard(req);
  if (isResponse(g)) return g;
  try {
    const db = getAdminDb();
    const col = process.env.NEXT_PUBLIC_ANALYTICS_COLLECTION || "analytics";
    const snap = await db.collection(col).orderBy("timestamp", "desc").limit(5000).get();
    const rows = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Record<string, unknown>) })) as Record<string, unknown>[];

    const headers = ["id", "kind", "method", "email", "error", "message", "type", "source", "line", "route", "deviceId", "timestamp"];
    const lines = [headers.join(",")];
    for (const r of rows) lines.push(headers.map((h) => csvEscape(r[h])).join(","));

    const csv = "\uFEFF" + lines.join("\n");
    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="analytics.csv"',
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
