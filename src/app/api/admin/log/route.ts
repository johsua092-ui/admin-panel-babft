import { NextResponse } from "next/server";
import { data } from "@/lib/data";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export async function POST(req: Request) {
  try { const body = await req.json().catch(() => ({})); const uid = (body.uid || "").toString(); const email = (body.email || "").toString(); const role = (body.role || "anggota").toString(); if (!uid || !email) return NextResponse.json({ error: "uid/email kosong" }, { status: 400 }); await data.logAdminLogin({ uid, email, role }); return NextResponse.json({ ok: true }); }
  catch (e) { const msg = e instanceof Error ? e.message : String(e); return NextResponse.json({ error: msg }, { status: 500 }); }
}
