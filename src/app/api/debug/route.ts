import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export async function GET() {
  return NextResponse.json({
    CONVEX_URL: process.env.CONVEX_URL ?? null,
    DATA_BACKEND: process.env.DATA_BACKEND ?? null,
    secretLen: (process.env.CONVEX_INTERNAL_SECRET ?? "").length,
    secretPrefix: (process.env.CONVEX_INTERNAL_SECRET ?? "").slice(0, 12),
    nodeEnv: process.env.NODE_ENV,
  });
}
