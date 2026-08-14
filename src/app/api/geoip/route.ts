import { NextResponse } from "next/server";
import { lookupIp, lookupMany } from "@/lib/geoip";
import { guard, isResponse } from "@/lib/apiGuard";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  const g = await guard(req);
  if (isResponse(g)) return g;
  const url = new URL(req.url);
  const ipParam = (url.searchParams.get("ip") || "").trim();
  const batchParam = (url.searchParams.get("ips") || "").trim();
  try {
    if (batchParam) {
      const ips = batchParam.split(",").map((s) => s.trim()).filter(Boolean).slice(0, 100);
      const map = await lookupMany(ips);
      const items = ips.map((ip) => ({ ip, ...(map.get(ip) ?? { status: "fail" }) }));
      return NextResponse.json({ items });
    }
    if (!ipParam) return NextResponse.json({ error: "param ip/ips kosong" }, { status: 400 });
    const rec = await lookupIp(ipParam);
    return NextResponse.json({ ip: ipParam, ...(rec ?? { status: "fail" }) });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
