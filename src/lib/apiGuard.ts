import { NextResponse } from "next/server";
import { requireAdmin, type AuthedAdmin } from "@/lib/authGuard";

export async function guard(req: Request): Promise<AuthedAdmin | NextResponse> {
  try {
    return await requireAdmin(req.headers.get("authorization"), req.headers.get("cookie"));
  } catch (e) {
    const code = e instanceof Error && e.message === "FORBIDDEN" ? 403 : 401;
    return NextResponse.json({ error: code === 403 ? "Bukan admin." : "Belum login." }, { status: code });
  }
}

export function isResponse(v: unknown): v is NextResponse {
  return v instanceof NextResponse;
}
