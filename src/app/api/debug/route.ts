import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function rawQuery() {
  const u = (process.env.CONVEX_URL || "").replace(/\/$/, "");
  const secret = process.env.CONVEX_INTERNAL_SECRET?.trim() || undefined;
  const args: any = secret ? { token: secret } : {};
  const res = await fetch(`${u}/api/query`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path: "users:getUsers", args, format: "json" }),
  });
  const txt = await res.text();
  return { httpStatus: res.status, body: txt.slice(0, 400), url: u, hasToken: !!secret };
}

export async function GET() {
  const r = await rawQuery();
  return NextResponse.json(r);
}
