import { NextResponse } from "next/server";
import { data } from "@/lib/data";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try { const id = decodeURIComponent(params.id); if (!id) return NextResponse.json({ error: "id kosong" }, { status: 400 }); const history = await data.getUserHistory(id); return NextResponse.json({ history }); }
  catch (e) { const msg = e instanceof Error ? e.message : String(e); return NextResponse.json({ error: msg }, { status: 500 }); }
}
