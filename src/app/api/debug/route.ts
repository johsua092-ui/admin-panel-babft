import { NextResponse } from "next/server";
import { convexQuery } from "@/lib/convexClient";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export async function GET() {
  try {
    const direct = (await convexQuery("users:getUsers", {})) as any[];
    return NextResponse.json({ count: direct.length, emails: direct.slice(0,6).map((u:any)=>u.email??u.displayName) });
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message ?? e) });
  }
}
