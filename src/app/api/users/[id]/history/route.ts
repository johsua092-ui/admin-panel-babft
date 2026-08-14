import { NextResponse } from "next/server";
import { data } from "@/lib/data";
import { guard, isResponse } from "@/lib/apiGuard";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const g = await guard(req);
  if (isResponse(g)) return g;
  try {
    const id = decodeURIComponent(params.id);
    if (!id) return NextResponse.json({ error: "id kosong" }, { status: 400 });
    const history = await data.getUserHistory(id);
    return NextResponse.json({ history });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
