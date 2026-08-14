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
    url: u,
    count: Array.isArray(val) ? val.length : null,
    ids: Array.isArray(val) ? val.map((x: any) => x.id ?? x._id) : null,
    emails: Array.isArray(val) ? val.map((x: any) => x.email ?? x.displayName) : null,
    secretPrefix: (secret || "").slice(0, 10),
  });
}
