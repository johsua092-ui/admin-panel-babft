import { NextResponse } from "next/server";
import { createHash } from "crypto";
import { convexQuery, convexMutation } from "@/lib/convexClient";
import { requireAdmin } from "@/lib/authGuard";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function expectedHash(): string | null {
  const code = process.env.LOCKDOWN_CODE;
  if (!code) return null;
  const trimmed = code.trim();
  // Dukung dua mode:
  // 1) env berisi HASH SHA-256 (64 hex) -> langsung pakai (kode asli TIDAK tersimpan).
  // 2) env berisi plaintext (fallback/legacy) -> hash dulu.
  if (/^[a-f0-9]{64}$/.test(trimmed)) return trimmed;
  return createHash("sha256").update(trimmed).digest("hex");
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
