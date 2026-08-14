// GET /api/users/export — download CSV semua user.

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
    const col = process.env.NEXT_PUBLIC_USERS_COLLECTION || "users";
    const snap = await db.collection(col).orderBy("lastLoginAt", "desc").limit(1000).get();
    const rows = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Record<string, unknown>) })) as Record<string, unknown>[];

    const headers = [
      "id", "isGuest", "email", "displayName", "region", "countryCode", "regionName",
      "city", "address", "postal", "ipAddress", "isp", "latitude", "longitude",
      "timezone", "online", "loginCount", "lastLoginAt", "lastOnlineAt", "firstLoginAt",
      "device", "os", "browser", "deviceType", "screen", "language", "deviceId",
      "flaggedAsVpn", "regionChangeCount",
    ];

    const lines = [headers.join(",")];
    for (const r of rows) lines.push(headers.map((h) => csvEscape(r[h])).join(","));

    const csv = "\uFEFF" + lines.join("\n"); // BOM untuk Excel
    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="users.csv"',
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
