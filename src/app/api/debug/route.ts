import { NextResponse } from "next/server";
import { data } from "@/lib/data";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export async function GET() {
  const out: any = {
    CONVEX_URL: process.env.CONVEX_URL ?? null,
    DATA_BACKEND: process.env.DATA_BACKEND ?? null,
  };
  try {
    const users = await data.getUsers() as any[];
    out.count = users?.length ?? null;
    out.ids = (users ?? []).slice(0, 3).map((u: any) => u.id);
    out.emails = (users ?? []).slice(0, 3).map((u: any) => u.email ?? u.displayName);
  } catch (e) {
    out.error = e instanceof Error ? e.message : String(e);
  }
  return NextResponse.json(out);
}
