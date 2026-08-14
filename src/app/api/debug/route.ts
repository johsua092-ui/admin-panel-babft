import { NextResponse } from "next/server";
import { data } from "@/lib/data";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const out: Record<string, unknown> = {
    CONVEX_URL: process.env.CONVEX_URL ?? null,
    DATA_BACKEND: process.env.DATA_BACKEND ?? null,
  };
  try {
    const users = (await data.getUsers()) as unknown[];
    out.count = users?.length ?? null;
    out.ids = (users ?? []).slice(0, 3).map((u: any) => String(u?.id ?? u?._id ?? ""));
    out.emails = (users ?? []).slice(0, 3).map((u: any) => String(u?.email ?? u?.displayName ?? ""));
  } catch (e) {
    out.error = String((e as any)?.message ?? e);
    out.errorStack = String((e as any)?.stack ?? "").slice(0, 600);
  }
  return NextResponse.json({ ...out });
}
