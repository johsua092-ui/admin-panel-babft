import { NextResponse } from "next/server";
import { guard, isResponse } from "@/lib/apiGuard";
import { getBusinessStats } from "@/lib/businessStats";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  const g = await guard(req);
  if (isResponse(g)) return g;
  try {
    const result = await getBusinessStats();
    return NextResponse.json(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
