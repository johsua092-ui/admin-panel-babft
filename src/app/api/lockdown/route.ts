import { NextResponse } from "next/server";
import { createHash } from "crypto";
import { convexQuery, convexMutation } from "@/lib/convexClient";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function expectedHash(): string | null {
  const code = process.env.LOCKDOWN_CODE;
  if (!code) return null;
  return createHash("sha256").update(code).digest("hex");
}

export async function GET() {
  try {
    const status = await convexQuery<{ locked: boolean }>("settings:getLockdownStatus", {});
    return NextResponse.json({ locked: status.locked });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
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
