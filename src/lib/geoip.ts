type GeoIpField =
  | "status" | "message" | "country" | "countryCode" | "region" | "regionName"
  | "city" | "zip" | "lat" | "lon" | "timezone" | "isp" | "org" | "as" | "asname"
  | "query" | "proxy" | "hosting" | "mobile";

export type GeoIpRecord = {
  status: "success" | "fail";
  message?: string;
  country?: string;
  countryCode?: string;
  region?: string;
  regionName?: string;
  city?: string;
  zip?: string;
  lat?: number;
  lon?: number;
  timezone?: string;
  isp?: string;
  org?: string;
  as?: string;
  asname?: string;
  query?: string;
  proxy?: boolean;
  hosting?: boolean;
  mobile?: boolean;
};

const CACHE_TTL = 6 * 60 * 60 * 1000;
const cache = new Map<string, { value: GeoIpRecord; expires: number }>();

function cached(ip: string): GeoIpRecord | undefined {
  const e = cache.get(ip);
  if (!e) return undefined;
  if (Date.now() > e.expires) { cache.delete(ip); return undefined; }
  return e.value;
}

function isPrivate(ip: string): boolean {
  const p = ip.split(".");
  if (p.length === 4) {
    const [a, b] = [Number(p[0]), Number(p[1])];
    if (a === 10) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 127) return true;
  }
  if (ip === "::1" || ip === "localhost") return true;
  return false;
}

async function fetchBatch(ips: string[]): Promise<GeoIpRecord[]> {
  const fields: GeoIpField[] = [
    "status", "message", "country", "countryCode", "region", "regionName",
    "city", "zip", "lat", "lon", "timezone", "isp", "org", "as", "asname",
    "query", "proxy", "hosting", "mobile",
  ];
  const url = `https://ip-api.com/batch/${ips.join(",")}?fields=${fields.join(",")}&lang=en`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`ip-api error ${res.status}`);
  const data = (await res.json()) as GeoIpRecord[] | GeoIpRecord;
  return Array.isArray(data) ? data : [data];
}

export async function lookupIp(ip: string): Promise<GeoIpRecord | null> {
  const clean = (ip || "").trim();
  if (!clean) return null;
  const hit = cached(clean);
  if (hit) return hit;
  if (isPrivate(clean)) return { status: "fail", message: "private range" };
  const batch = await fetchBatch([clean]);
  const rec = batch[0];
  if (!rec) return null;
  cache.set(clean, { value: rec, expires: Date.now() + CACHE_TTL });
  return rec;
}

export async function lookupMany(ips: string[]): Promise<Map<string, GeoIpRecord>> {
  const out = new Map<string, GeoIpRecord>();
  const unique = Array.from(new Set(ips.map((s) => (s || "").trim()).filter((s) => s && !isPrivate(s))));
  const missing = unique.filter((ip) => !cached(ip));
  const groups: string[][] = [];
  for (let i = 0; i < missing.length; i += 100) groups.push(missing.slice(i, i + 100));
  for (const g of groups) {
    try {
      const recs = await fetchBatch(g);
      for (const r of recs) {
        if (r.query) { cache.set(r.query, { value: r, expires: Date.now() + CACHE_TTL }); out.set(r.query, r); }
      }
      for (const ip of g) if (!out.has(ip)) { const c = cached(ip); if (c) out.set(ip, c); }
    } catch {
      for (const ip of g) out.set(ip, { status: "fail", message: "lookup failed", query: ip });
    }
  }
  for (const ip of unique) {
    if (out.has(ip)) continue;
    const c = cached(ip);
    if (c) out.set(ip, c);
  }
  return out;
}
