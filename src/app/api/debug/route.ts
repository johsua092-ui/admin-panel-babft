import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export async function GET() {
  const u = (process.env.CONVEX_URL || "").replace(/\/$/, "");
  const secret = process.env.CONVEX_INTERNAL_SECRET?.trim() || undefined;
  const args: any = secret ? { token: secret } : {};
  const res = await fetch(`${u}/api/query`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path: "users:getUsers", args, format: "json" }),
  });
  const j = await res.json();
  const val = j.value || [];
  return NextResponse.json({
    count: Array.isArray(val) ? val.length : null,
    version: Array.isArray(val) && val[0] ? (val[0]._version ?? "NONE") : null,
    emails: Array.isArray(val) ? val.map((x: any) => x.email ?? x.displayName) : null,
  });
}
