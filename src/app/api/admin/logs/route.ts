import { NextResponse } from "next/server";
import { data } from "@/lib/data";
import { isLocked } from "@/lib/lockdownGuard";
import { requireAdmin } from "@/lib/authGuard";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export async function GET(req: Request) {
  if (await isLocked()) {
    try { await requireAdmin(req.headers.get("authorization")); }
    catch { return NextResponse.json({}, { status: 423 }); }
  }
  try { const result = await data.getAdminLogs(); return NextResponse.json(result); }
  catch (e) { const msg = e instanceof Error ? e.message : String(e); return NextResponse.json({ error: msg }, { status: 500 }); }
}
