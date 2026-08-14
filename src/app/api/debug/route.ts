import { NextResponse } from "next/server";
import { convexQuery } from "@/lib/convexClient";
import { convexDataSource } from "@/lib/convexDataSource";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const out: Record<string, unknown> = {
    CONVEX_URL: process.env.CONVEX_URL ?? null,
    tokenPrefix: (process.env.CONVEX_INTERNAL_SECRET ?? "").slice(0, 12),
  };
  // direct query via convexQuery (no failover)
  try {
    const direct = (await convexQuery("users:getUsers", {})) as any;
    out.directCount = Array.isArray(direct) ? direct.length : null;
    out.directIds = Array.isArray(direct) ? direct.slice(0,3).map((u:any)=>String(u.id ?? u._id)) : null;
  } catch (e: any) {
    out.directError = String(e?.message ?? e);
  }
  // via dataSource (with failover)
  try {
    const viaDs = (await convexDataSource.getUsers()) as any[];
    out.viaDsCount = viaDs?.length ?? null;
  } catch (e: any) {
    out.viaDsError = String(e?.message ?? e);
  }
  return NextResponse.json(out);
}
