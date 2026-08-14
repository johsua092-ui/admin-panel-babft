import { NextResponse } from "next/server";
import { data } from "@/lib/data";
import { isLocked } from "@/lib/lockdownGuard";
import { requireAdmin } from "@/lib/authGuard";
import { enrichUsers, attachAcquisition } from "@/lib/enrich";
import type { UserRecord } from "@/lib/types";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export async function GET(req: Request) {
  if (await isLocked()) {
    try { await requireAdmin(req.headers.get("authorization")); }
    catch { return NextResponse.json({}, { status: 423 }); }
  }
  try {
    const users = await data.getUsers();
    const enriched = (await enrichUsers(users as unknown as Record<string, unknown>[])).map((u) => attachAcquisition(u));
    const now = Date.now();
    const ONLINE_WINDOW = 60000;
    const live = enriched.map((u) => {
      const lastOnlineAt = typeof u.lastOnlineAt === "number" ? u.lastOnlineAt : null;
      const online = lastOnlineAt != null && now - lastOnlineAt < ONLINE_WINDOW;
      return { ...u, online };
    });
    return NextResponse.json({ users: live, serverTime: now });
  }
  catch (e) { const msg = e instanceof Error ? e.message : String(e); return NextResponse.json({ error: msg }, { status: 500 }); }
}
