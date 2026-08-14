import { NextResponse } from "next/server";
import { convexMutation } from "@/lib/convexClient";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ALLOWED_ORIGINS = (
  process.env.INGEST_ORIGINS ||
  "https://babftss.vercel.app,https://babftlearning.dpdns.org,https://babft-project.vercel.app,https://babft-learning-project.zone.id,https://babft-learning.ryzn.pro,https://babft-learning.net,https://babft-learning.com,https://www.babft-learning.net,https://www.babft-learning.com,https://babft.learning.project.thedev.me"
)
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const MAX_BODY_BYTES = 32 * 1024;
const RATE_WINDOW_MS = 60_000;
const RATE_MAX_PER_IP = 240;

const rateMap = new Map<string, { count: number; reset: number }>();

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
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
  };
}

function clientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "unknown";
}

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const e = rateMap.get(ip);
  if (!e || now > e.reset) {
    rateMap.set(ip, { count: 1, reset: now + RATE_WINDOW_MS });
    return false;
  }
  e.count += 1;
  if (rateMap.size > 5000) {
    for (const [k, v] of rateMap) if (now > v.reset) rateMap.delete(k);
  }
  return e.count > RATE_MAX_PER_IP;
}

function num(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v !== "" && !Number.isNaN(Number(v))) return Number(v);
  return null;
}

function cleanStr(v: unknown, max = 500): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim().slice(0, max);
  return s || null;
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
  return {
    id: cleanStr(p.id) ?? cleanStr(p.key),
    uid: cleanStr(p.uid) ?? cleanStr(p.id) ?? cleanStr(p.key),
    email: cleanStr(p.email, 200),
    displayName: cleanStr(p.displayName, 200),
    photoURL: cleanStr(p.photoURL, 1000),
    isGuest: p.isGuest === true,
    online: p.online !== false,
    lastOnlineAt: num(p.lastOnlineAt),
    lastLoginAt: num(p.lastLoginAt),
    firstLoginAt: num(p.firstLoginAt),
    loginCount: num(p.loginCount) ?? 1,
    region: cleanStr(p.region, 100),
    countryCode: cleanStr(p.countryCode, 8),
    regionName: cleanStr(p.regionName, 100),
    isp: cleanStr(p.isp, 200),
    timezone: typeof p.timezone === "string" ? cleanStr(p.timezone, 100) : cleanStr(p.timezone, 100) ?? null,
    ipAddress: cleanStr(p.ipAddress, 45),
    latitude: num(p.latitude),
    longitude: num(p.longitude),
    address: cleanStr(p.address, 500),
    city: cleanStr(p.city, 150),
    postal: cleanStr(p.postal, 20),
    deviceId: cleanStr(p.deviceId, 100),
    device: cleanStr(p.device, 100),
    os: cleanStr(p.os, 100),
    browser: cleanStr(p.browser, 100),
    deviceType: cleanStr(p.deviceType, 20),
    screen: cleanStr(p.screen, 30),
    language: cleanStr(p.language, 20),
    userAgent: cleanStr(p.userAgent, 500),
    previousRegion: cleanStr(p.previousRegion, 100),
    regionChangeCount: num(p.regionChangeCount) ?? 0,
    flaggedAsVpn: p.flaggedAsVpn === true,
    isProxy: p.isProxy === true,
    isHosting: p.isHosting === true,
    mobile: p.mobile === true,
    asn: cleanStr(p.asn, 40),
    asOrg: cleanStr(p.asOrg, 200),
    vpnProvider: cleanStr(p.vpnProvider, 200),
    referrer: cleanStr(p.referrer, 500),
    searchEngine: cleanStr(p.searchEngine, 50),
    searchQuery: cleanStr(p.searchQuery, 200),
    utmSource: cleanStr(p.utmSource, 100),
    utmMedium: cleanStr(p.utmMedium, 100),
    utmCampaign: cleanStr(p.utmCampaign, 200),
    landingPath: cleanStr(p.landingPath, 300),
    createdAt: num(p.createdAt) ?? Date.now(),
    updatedAt: num(p.updatedAt) ?? Date.now(),
  };
}

export async function OPTIONS(req: Request) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(req) });
}

export async function POST(req: Request) {
  const headers = corsHeaders(req);
  const origin = req.headers.get("origin");
  if (!originAllowed(origin)) {
    return NextResponse.json({ ok: false, error: "origin not allowed" }, { status: 403, headers });
  }

  const ip = clientIp(req);
  if (rateLimited(ip)) {
    return NextResponse.json({ ok: false, error: "rate limited" }, { status: 429, headers });
  }

  let body: unknown;
  try {
    const raw = await req.text();
    if (raw.length > MAX_BODY_BYTES) {
      return NextResponse.json({ ok: false, error: "body too large" }, { status: 413, headers });
    }
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ ok: false, error: "invalid json" }, { status: 400, headers });
  }

  const b = (body ?? {}) as Record<string, unknown>;
  const type = typeof b.type === "string" ? b.type : "";

  try {
    if (type === "user") {
      const key = cleanStr(b.key) || cleanStr((b.user as Record<string, unknown> | undefined)?.id) || "";
      if (!key) return NextResponse.json({ ok: false, error: "missing key" }, { status: 400, headers });
      const user = normalizeUser((b.user ?? {}) as Record<string, unknown>);
      user.id = key;
      const r = await safeConvex(() => convexMutation("users:upsertUser", { id: key, data: user }));
      return NextResponse.json(r, { headers });
    }

    if (type === "history") {
      const uid = cleanStr(b.uid) || "";
      if (!uid) return NextResponse.json({ ok: false, error: "missing uid" }, { status: 400, headers });
      const r = await safeConvex(() => convexMutation("users:addHistory", { uid, timestamp: num(b.timestamp) ?? Date.now(), data: (b.data ?? {}) as Record<string, unknown> }));
      return NextResponse.json(r, { headers });
    }

    if (type === "health") {
      const id = cleanStr(b.id) || "";
      const deviceId = cleanStr(b.deviceId) || "";
      if (!id && !deviceId) return NextResponse.json({ ok: false, error: "missing id" }, { status: 400, headers });
      const ts = num(b.timestamp) ?? Date.now();
      const r = await safeConvex(() => convexMutation("users:upsertUser", { id: id || deviceId, data: { online: true, lastOnlineAt: ts, timezone: null } }));
      return NextResponse.json(r, { headers });
    }

    if (type === "analytics") {
      const eventId = cleanStr(b.eventId) || "";
      if (!eventId) return NextResponse.json({ ok: false, error: "missing eventId" }, { status: 400, headers });
      const r = await safeConvex(() => convexMutation("analytics:upsertAnalyticsEvent", { eventId, timestamp: num(b.timestamp) ?? Date.now(), kind: cleanStr(b.kind, 50) ?? undefined, deviceId: cleanStr(b.deviceId) ?? undefined, data: (b.data ?? {}) as Record<string, unknown> }));
      return NextResponse.json(r, { headers });
    }

    return NextResponse.json({ ok: false, error: "unknown type" }, { status: 400, headers });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: msg }, { status: 500, headers });
  }
}
