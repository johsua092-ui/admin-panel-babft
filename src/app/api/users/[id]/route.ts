import { NextResponse } from "next/server";
import { data } from "@/lib/data";
import { guard, isResponse } from "@/lib/apiGuard";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const g = await guard(req);
  if (isResponse(g)) return g;
  try {
    const id = decodeURIComponent(params.id);
    if (!id) return NextResponse.json({ error: "id kosong" }, { status: 400 });
    const res = await data.deleteUser(id);
    return NextResponse.json(res);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
