import { NextResponse } from "next/server";
import { guard, isResponse } from "@/lib/apiGuard";
import { getAuditLog, getAuditLogSummary } from "@/lib/auditLog";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  const g = await guard(req);
  if (isResponse(g)) return g;
  try {
    const url = new URL(req.url);
    const summary = url.searchParams.get("summary") === "1";
    if (summary) {
      const s = await getAuditLogSummary();
      return NextResponse.json(s);
    }
    const limit = parseInt(url.searchParams.get("limit") || "100", 10);
    const action = url.searchParams.get("action") || undefined;
    const actorUid = url.searchParams.get("actorUid") || undefined;
    const targetUid = url.searchParams.get("targetUid") || undefined;
    const sinceTs = url.searchParams.get("sinceTs")
      ? Number(url.searchParams.get("sinceTs"))
      : undefined;
    const entries = await getAuditLog({ limit, action, actorUid, targetUid, sinceTs });
    return NextResponse.json({ entries });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[api/audit-log] error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
