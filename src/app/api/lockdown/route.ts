import { NextResponse } from "next/server";
import { createHash } from "crypto";
import { convexQuery, convexMutation } from "@/lib/convexClient";
import { requireAdmin } from "@/lib/authGuard";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function expectedHash(): string | null {
  const code = process.env.LOCKDOWN_CODE;
  if (!code) return null;
  return createHash("sha256").update(code).digest("hex");
}

async function readLocked(): Promise<boolean> {
  try {
    const s = await convexQuery<{ locked: boolean }>("settings:getLockdownStatus", {});
    return s.locked === true;
  } catch {
    return false;
  }
}

export async function GET(req: Request) {
  let owner = false;
  try {
    await requireAdmin(req.headers.get("authorization"));
    owner = true;
  } catch {}
  const locked = await readLocked();
  return NextResponse.json({ locked, owner });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const code = typeof body.code === "string" ? body.code.trim() : "";
  const wantLock = body.locked === true;

  const hash = expectedHash();
  if (!hash || hash !== createHash("sha256").update(code).digest("hex")) {
    return NextResponse.json({});
  }

  try {
    await convexMutation("settings:setLockdown", { locked: wantLock });
    return NextResponse.json({ ok: true, locked: wantLock });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
