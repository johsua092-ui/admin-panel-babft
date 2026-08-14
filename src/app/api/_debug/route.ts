import { NextResponse } from "next/server";
import { data } from "@/lib/data";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const out: Record<string, unknown> = {
    CONVEX_URL: process.env.CONVEX_URL ?? null,
    DATA_BACKEND: process.env.DATA_BACKEND ?? null,
    SECRET: process.env.CONVEX_INTERNAL_SECRET ?? null,
    ts: Date.now(),
  };
  try {
    const users = await data.getUsers() as any[];
    out.usersCount = users?.length ?? null;
    out.backend = (process.env.DATA_BACKEND || "FIREBASE");
    out.sample = (users ?? []).slice(0, 3).map((u: any) => u.email ?? u.displayName ?? u.id);
  } catch (e) {
    out.getUsersError = e instanceof Error ? e.message : String(e);
  }
  return NextResponse.json(out);
}
