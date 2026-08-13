// GET /api/admin/logs — riwayat login admin + agregasi per admin.

import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/adminFirestore";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type AdminLogin = {
  id: string;
  uid: string;
  email: string;
  role: string;
  timestamp: number;
};

export async function GET() {
  try {
    const db = getAdminDb();
    const snap = await db
      .collection("admin_logins")
      .orderBy("timestamp", "desc")
      .limit(500)
      .get();

    const logs = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Record<string, unknown>) })) as AdminLogin[];

    const byEmail = new Map<string, { email: string; role: string; count: number; last: number; first: number }>();
    for (const l of logs) {
      const key = l.email.toLowerCase();
      const e = byEmail.get(key);
      if (!e) {
        byEmail.set(key, { email: l.email, role: l.role, count: 1, last: l.timestamp, first: l.timestamp });
      } else {
        e.count += 1;
        if (l.timestamp > e.last) e.last = l.timestamp;
        if (l.timestamp < e.first) e.first = l.timestamp;
      }
    }

    const admins = Array.from(byEmail.values()).sort((a, b) => b.last - a.last);

    return NextResponse.json({ logs, admins });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
