// POST /api/admin/log — catat login admin ke koleksi `admin_logins` (punya-si-jawa).

import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/adminFirestore";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const uid = (body.uid || "").toString();
    const email = (body.email || "").toString();
    const role = (body.role || "anggota").toString();
    if (!uid || !email) {
      return NextResponse.json({ error: "uid/email kosong" }, { status: 400 });
    }

    const db = getAdminDb();
    const now = Date.now();
    const id = `${now.toString(36)}_${uid.slice(0, 8)}`;

    await db.collection("admin_logins").doc(id).set({ uid, email, role, timestamp: now });

    return NextResponse.json({ ok: true, id });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
