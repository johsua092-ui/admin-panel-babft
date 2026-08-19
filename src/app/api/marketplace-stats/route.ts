import { NextResponse } from "next/server";
import { guard, isResponse } from "@/lib/apiGuard";
import { getMarketplaceStats } from "@/lib/marketplaceStats";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  const g = await guard(req);
  if (isResponse(g)) return g;
  try {
    const result = await getMarketplaceStats();
    return NextResponse.json(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[api/marketplace-stats] error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
