// GET /api/users/[id]/history — riwayat kunjungan/login seorang user.

import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/adminFirestore";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = decodeURIComponent(params.id);
    if (!id) return NextResponse.json({ error: "id kosong" }, { status: 400 });
    const db = getAdminDb();
    const col = process.env.NEXT_PUBLIC_USERS_COLLECTION || "users";

    const snap = await db
      .collection(col)
      .doc(id)
      .collection("history")
      .orderBy("timestamp", "desc")
      .limit(200)
      .get();

    const history = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Record<string, unknown>) }));
    return NextResponse.json({ history });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
