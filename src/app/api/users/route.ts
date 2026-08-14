import { NextResponse } from "next/server";
import { data } from "@/lib/data";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export async function GET() {
  try { const users = await data.getUsers(); return NextResponse.json({ users }); }
  catch (e) { const msg = e instanceof Error ? e.message : String(e); return NextResponse.json({ error: msg }, { status: 500 }); }
}
