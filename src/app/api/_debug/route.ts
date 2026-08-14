import { NextResponse } from "next/server";
import { data } from "@/lib/data";
import { primarySource } from "@/lib/data";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const out: Record<string, unknown> = {
    CONVEX_URL: process.env.CONVEX_URL ?? null,
    DATA_BACKEND: process.env.DATA_BACKEND ?? null,
    SECRET_LEN: (process.env.CONVEX_INTERNAL_SECRET ?? "").length,
    primary: primarySource().name,
    ts: Date.now(),
  };
  try {
    const users = await data.getUsers() as any[];
    out.usersCount = users?.length ?? null;
    out.sampleEmails = (users ?? []).slice(0, 5).map((u: any) => u.email ?? u.displayName ?? u.id);
  } catch (e) {
    out.getUsersError = e instanceof Error ? e.message : String(e);
  }
  return NextResponse.json(out);
}
