import { NextResponse } from "next/server";
import { data } from "@/lib/data";
import { enrichUsers, attachAcquisition } from "@/lib/enrich";
import type { UserRecord } from "@/lib/types";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export async function GET() {
  try {
    const users = await data.getUsers();
    const enriched = (await enrichUsers(users as unknown as Record<string, unknown>[])).map((u) => attachAcquisition(u));
    return NextResponse.json({ users: enriched });
  }
  catch (e) { const msg = e instanceof Error ? e.message : String(e); return NextResponse.json({ error: msg }, { status: 500 }); }
}
