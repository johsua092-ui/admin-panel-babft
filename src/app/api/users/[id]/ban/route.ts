import { NextResponse } from "next/server";
import { data } from "@/lib/data";
import { requireAdmin } from "@/lib/authGuard";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    await requireAdmin(req.headers.get("authorization"));
  } catch (e) {
    const code = e instanceof Error && e.message === "FORBIDDEN" ? 403 : 401;
    return NextResponse.json({ error: code === 403 ? "Bukan admin." : "Belum login." }, { status: code });
  }
  try {
    const id = decodeURIComponent(params.id);
    if (!id) return NextResponse.json({ error: "id kosong" }, { status: 400 });
    const body = await req.json().catch(() => ({}));
    const banned = body.banned === true;
    const reason = typeof body.reason === "string" ? body.reason : null;
    const res = await data.setBan(id, banned, reason);
    return NextResponse.json(res);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
