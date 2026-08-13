// GET /api/users — baca koleksi `users` (punya-si-jawa) via Firebase Admin SDK.
// Dipakai admin panel supaya bisa baca SELURUH data user secara aman
// (client SDK tidak bisa karena rules membatasi akses ke uid sendiri).

import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/adminFirestore";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    const db = getAdminDb();
    const snap = await db
      .collection(process.env.NEXT_PUBLIC_USERS_COLLECTION || "users")
      .orderBy("lastLoginAt", "desc")
      .limit(500)
      .get();

    const users = snap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    }));

    return NextResponse.json({ users });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
