import { NextResponse } from "next/server";
import { convexMutation } from "@/lib/convexClient";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ALLOWED_ORIGINS = (
  process.env.INGEST_ORIGINS ||
  "https://babftss.vercel.app,https://babftlearning.dpdns.org,https://babft-project.vercel.app,https://babft-learning-project.zone.id"
)
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

function originAllowed(origin: string | null): boolean {
  if (!origin) return false;
  return ALLOWED_ORIGINS.includes(origin);
}

function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("origin");
  const allow = origin && originAllowed(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allow || "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, x-ingest-key",
    "Access-Control-Max-Age": "86400",
  };
}

async function authorized(req: Request): Promise<boolean> {
  const expected = process.env.INGEST_SECRET;
  if (!expected) return false;
  const got = req.headers.get("x-ingest-key");
  if (!got) return false;
  const a = expected.trim();
  const b = got.trim();
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function num(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v !== "" && !Number.isNaN(Number(v))) return Number(v);
  return null;
}

async function safeConvex(fn: () => Promise<unknown>): Promise<{ ok: boolean; error?: string }> {
  try {
    await fn();
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: msg };
  }
}

function normalizeUser(p: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const str = (k: string): string | null => (typeof p[k] === "string" ? (p[k] as string) : null);
  const bool = (k: string): boolean | null => (typeof p[k] === "boolean" ? (p[k] as boolean) : null);
  out.id = str("id") ?? str("key") ?? null;
  out.uid = str("uid") ?? str("id") ?? str("key") ?? null;
  out.email = str("email");
  out.displayName = str("displayName");
  out.photoURL = str("photoURL");
  out.isGuest = bool("isGuest") ?? false;
  out.online = bool("online") ?? true;
  out.lastOnlineAt = num(p.lastOnlineAt);
  out.lastLoginAt = num(p.lastLoginAt);
  out.firstLoginAt = num(p.firstLoginAt);
  out.loginCount = num(p.loginCount) ?? 1;
  out.region = str("region");
  out.countryCode = str("countryCode");
  out.regionName = str("regionName");
  out.isp = str("isp");
  out.timezone = typeof p.timezone === "string" ? p.timezone : str("timezone") ?? null;
  out.ipAddress = str("ipAddress");
  out.latitude = num(p.latitude);
  out.longitude = num(p.longitude);
  out.address = str("address");
  out.city = str("city");
  out.postal = str("postal");
  out.deviceId = str("deviceId");
  out.device = str("device");
  out.os = str("os");
  out.browser = str("browser");
  out.deviceType = str("deviceType");
  out.screen = str("screen");
  out.language = str("language");
  out.userAgent = str("userAgent");
  out.previousRegion = str("previousRegion");
  out.regionChangeCount = num(p.regionChangeCount) ?? 0;
  out.flaggedAsVpn = bool("flaggedAsVpn") ?? false;
  out.createdAt = num(p.createdAt) ?? Date.now();
  out.updatedAt = num(p.updatedAt) ?? Date.now();
  return out;
}

export async function OPTIONS(req: Request) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(req) });
}

export async function POST(req: Request) {
  const headers = corsHeaders(req);
  if (req.method === "OPTIONS") return new NextResponse(null, { status: 204, headers });
  const origin = req.headers.get("origin");
  if (!originAllowed(origin)) {
    return NextResponse.json({ ok: false, error: "origin not allowed" }, { status: 403, headers });
  }
  if (!(await authorized(req))) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401, headers });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid json" }, { status: 400, headers });
  }

  const b = (body ?? {}) as Record<string, unknown>;
  const type = typeof b.type === "string" ? b.type : "";

  try {
    if (type === "user") {
      const key = (typeof b.key === "string" ? b.key : "") || (b.user as Record<string, unknown> | undefined)?.id as string | undefined || "";
      if (!key) return NextResponse.json({ ok: false, error: "missing key" }, { status: 400, headers });
      const user = normalizeUser((b.user ?? {}) as Record<string, unknown>);
      user.id = key;
      const r = await safeConvex(() => convexMutation("users:upsertUser", { id: key, data: user }));
      return NextResponse.json(r, { headers });
    }

    if (type === "history") {
      const uid = typeof b.uid === "string" ? b.uid : "";
      if (!uid) return NextResponse.json({ ok: false, error: "missing uid" }, { status: 400, headers });
      const r = await safeConvex(() => convexMutation("users:addHistory", { uid, timestamp: num(b.timestamp) ?? Date.now(), data: (b.data ?? {}) as Record<string, unknown> }));
      return NextResponse.json(r, { headers });
    }

    if (type === "health") {
      const id = typeof b.id === "string" ? b.id : "";
      const deviceId = typeof b.deviceId === "string" ? b.deviceId : "";
      if (!id && !deviceId) return NextResponse.json({ ok: false, error: "missing id" }, { status: 400, headers });
      const ts = num(b.timestamp) ?? Date.now();
      const r = await safeConvex(() => convexMutation("users:upsertUser", { id: id || deviceId, data: { online: true, lastOnlineAt: ts, timezone: null } }));
      return NextResponse.json(r, { headers });
    }

    if (type === "analytics") {
      const eventId = typeof b.eventId === "string" ? b.eventId : "";
      if (!eventId) return NextResponse.json({ ok: false, error: "missing eventId" }, { status: 400, headers });
      const r = await safeConvex(() => convexMutation("analytics:upsertAnalyticsEvent", { eventId, timestamp: num(b.timestamp) ?? Date.now(), kind: typeof b.kind === "string" ? b.kind : undefined, deviceId: typeof b.deviceId === "string" ? b.deviceId : undefined, data: (b.data ?? {}) as Record<string, unknown> }));
      return NextResponse.json(r, { headers });
    }

    return NextResponse.json({ ok: false, error: "unknown type" }, { status: 400, headers });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: msg }, { status: 500, headers });
  }
}
