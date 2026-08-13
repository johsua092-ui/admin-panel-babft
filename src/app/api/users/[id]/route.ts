// DELETE /api/users/[id] — hapus satu record user dari koleksi `users`
// (punya-si-jawa) via Firebase Admin SDK. Auth terproteksi oleh Admin SDK.

import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/adminFirestore";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = decodeURIComponent(params.id);
    if (!id) {
      return NextResponse.json({ error: "id kosong" }, { status: 400 });
    }
    const db = getAdminDb();
    const col = process.env.NEXT_PUBLIC_USERS_COLLECTION || "users";
    await db.collection(col).doc(id).delete();
    return NextResponse.json({ ok: true, id });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
