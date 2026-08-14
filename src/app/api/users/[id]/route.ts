import { NextResponse } from "next/server";
import { data } from "@/lib/data";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try { const id = decodeURIComponent(params.id); if (!id) return NextResponse.json({ error: "id kosong" }, { status: 400 }); const res = await data.deleteUser(id); return NextResponse.json(res); }
  catch (e) { const msg = e instanceof Error ? e.message : String(e); return NextResponse.json({ error: msg }, { status: 500 }); }
}
