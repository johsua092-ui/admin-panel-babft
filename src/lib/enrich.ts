import { lookupMany } from "@/lib/geoip";
import type { GeoIpRecord } from "@/lib/geoip";

type UserLike = Record<string, unknown>;

function detectSearchEngine(referrer: string | null | undefined): { engine: string | null; query: string | null } {
  if (!referrer) return { engine: null, query: null };
  const lower = referrer.toLowerCase();
  const engines: Array<[string, string]> = [
    ["google", "google."],
    ["bing", "bing."],
    ["yahoo", "search.yahoo."],
    ["duckduckgo", "duckduckgo."],
    ["yandex", "yandex."],
    ["baidu", "baidu."],
  ];
  for (const [name, sig] of engines) {
    if (lower.includes(sig)) {
      try {
        const u = new URL(referrer);
        const q = u.searchParams.get("q") || u.searchParams.get("query") || u.searchParams.get("p");
        return { engine: name, query: q };
      } catch {
        return { engine: name, query: null };
      }
    }
  }
  try {
    const u = new URL(referrer);
    if (u.hostname) return { engine: new Set(["facebook.com", "www.facebook.com", "instagram.com", "tiktok.com", "x.com", "twitter.com"]).has(u.hostname) ? "sosmed" : "domain", query: null };
  } catch {}
  return { engine: null, query: null };
}

function mergeGeo(u: UserLike, g: GeoIpRecord | undefined): UserLike {
  if (!g || g.status !== "success") return u;
  const out = { ...u };
  if (g.lat != null && g.lon != null) { if (out.latitude == null) out.latitude = g.lat; if (out.longitude == null) out.longitude = g.lon; }
  if (out.city == null && g.city) out.city = g.city;
  if (out.regionName == null && g.regionName) out.regionName = g.regionName;
  if (out.region == null && g.region) out.region = g.region;
  if (out.countryCode == null && g.countryCode) out.countryCode = g.countryCode;
  if (out.isp == null && g.isp) out.isp = g.isp;
  if (out.timezone == null && g.timezone) out.timezone = g.timezone;
  if (out.postal == null && g.postal) out.postal = g.postal;
  if (out.asn == null && g.asn) out.asn = g.asn;
  if (out.asOrg == null && g.asOrg) out.asOrg = g.asOrg;
  out.isProxy = g.proxy === true;
  out.isHosting = g.hosting === true;
  out.mobile = g.mobile === true;
  if (g.proxy === true || g.hosting === true) { out.flaggedAsVpn = true; out.vpnProvider = g.asOrg || g.org || g.isp || "VPN/Proxy"; }
  return out;
}

export async function enrichUsers(users: UserLike[]): Promise<UserLike[]> {
  const needGeo = users.filter((u) => {
    const ip = typeof u.ipAddress === "string" ? u.ipAddress.trim() : "";
    if (!ip) return false;
    return (u.latitude == null || u.longitude == null || u.city == null || u.isp == null) ||
      u.isProxy === undefined || u.isHosting === undefined;
  });
  if (needGeo.length === 0) return users;
  const ips = needGeo.map((u) => u.ipAddress as string).filter(Boolean);
  const map = await lookupMany(ips);
  return users.map((u) => mergeGeo(u, map.get((u.ipAddress as string) ?? "")));
}

export function attachAcquisition(u: UserLike): UserLike {
  const out = { ...u };
  const ref = typeof u.referrer === "string" ? u.referrer : null;
  const se = detectSearchEngine(ref);
  if (out.searchEngine == null && se.engine) out.searchEngine = se.engine;
  if (out.searchQuery == null && se.query) out.searchQuery = se.query;
  return out;
}
