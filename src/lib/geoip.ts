export type GeoIpRecord = {
  status: "success" | "fail";
  ip?: string;
  country?: string;
  countryCode?: string;
  region?: string;
  regionName?: string;
  city?: string;
  zip?: string;
  postal?: string;
  lat?: number;
  lon?: number;
  timezone?: string;
  isp?: string;
  org?: string;
  asn?: string;
  asOrg?: string;
  proxy?: boolean;
  hosting?: boolean;
  mobile?: boolean;
};

const CACHE_TTL = 6 * 60 * 60 * 1000;
const cache = new Map<string, { value: GeoIpRecord; expires: number }>();

function isPrivate(ip: string): boolean {
  const p = ip.split(".");
  if (p.length === 4) {
    const [a, b] = [Number(p[0]), Number(p[1])];
    if (a === 10) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 127) return true;
  }
  return ip === "::1" || ip === "localhost";
}

const VPN_KEYWORDS = [
  "vpn", "proxy", "hosting", "datacenter", "data center", "cloud", "vps",
  "m247", "digitalocean", "vultr", "linode", "ovh", "hetzner", "contabo",
  "colo", "leaseweb", "choopa", "nforce", "psychz", "sharktech", "async",
  "buyvm", "frantech", "quadranet", "dedicated", "server", "colo crossing",
  "aws", "amazon", "google cloud", "gcp", "azure", "oracle", "alibaba",
  "nordvpn", "expressvpn", "surfshark", "protonvpn", "private internet",
  "mullvad", "cyberghost", "ipvanish", "windscribe", "tunnelbear",
  "hotspot shield", "hidemyass", "purevpn", "vyprvpn", "zenmate",
  "idcloudhost", "biznet", "exabytes", "niagahoster", "qwords", "dewabiz",
  "rumahweb", "masterweb", "indowebsite", "jetorbit", "mochahost", "hostinger",
  "namecheap", "godaddy", "cloudflare", "fastly", "akamai", "cdn77",
  "stackpath", "quantil", "zenlayer", "psychz", "constant", "ramnode",
  "buyvm", "chunkhost", "mnzhost", "iix", "openixp", "apjii", "cbn", "mora",
  "infinys", "radnet", "neuviz", "firstmedia", "mylink",
];

const HOSTING_KEYWORDS = [
  "hosting", "datacenter", "data center", "cloud", "vps", "dedicated",
  "server", "colo", "digitalocean", "vultr", "linode", "ovh", "hetzner",
  "contabo", "leaseweb", "choopa", "nforce", "psychz", "sharktech", "async",
  "buyvm", "frantech", "quadranet", "aws", "amazon", "azure", "oracle",
  "alibaba", "google cloud", "gcp", "hostinger", "idcloudhost", "biznet",
  "exabytes", "niagahoster", "qwords", "dewabiz", "rumahweb", "masterweb",
  "indowebsite", "jetorbit", "namecheap", "godaddy", "cloudflare", "fastly",
  "akamai", "cdn77", "stackpath", "zenlayer", "ramnode", "constant",
];

function detectProxy(rec: { org?: string; isp?: string; asOrg?: string; asn?: string }): { proxy: boolean; hosting: boolean } {
  const hay = `${rec.org ?? ""} ${rec.isp ?? ""} ${rec.asOrg ?? ""}`.toLowerCase();
  const hosting = HOSTING_KEYWORDS.some((k) => hay.includes(k));
  const proxy = VPN_KEYWORDS.some((k) => hay.includes(k)) || hosting;
  return { proxy, hosting };
}

type Raw = {
  success: boolean;
  ip?: string;
  country?: string;
  country_code?: string;
  region?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
  postal?: string;
  timezone?: { id?: string };
  connection?: { asn?: number; org?: string; isp?: string; domain?: string };
};

function toRecord(r: Raw): GeoIpRecord {
  if (!r || r.success !== true) return { status: "fail" };
  const org = r.connection?.org ?? "";
  const isp = r.connection?.isp ?? "";
  const { proxy, hosting } = detectProxy({ org, isp, asOrg: org });
  return {
    status: "success",
    ip: r.ip,
    country: r.country,
    countryCode: r.country_code,
    region: r.region,
    regionName: r.region,
    city: r.city,
    postal: r.postal,
    lat: r.latitude,
    lon: r.longitude,
    timezone: r.timezone?.id,
    isp,
    org,
    asn: r.connection?.asn ? String(r.connection.asn) : undefined,
    asOrg: org,
    proxy,
    hosting,
  };
}

async function fetchIps(ips: string[]): Promise<GeoIpRecord[]> {
  const out: GeoIpRecord[] = [];
  for (const ip of ips) {
    try {
      const res = await fetch(`https://ipwho.is/${encodeURIComponent(ip)}`, { cache: "no-store" });
      if (res.status === 429) { out.push({ status: "fail" }); continue; }
      const raw = (await res.json()) as Raw;
      out.push(toRecord(raw));
    } catch {
      out.push({ status: "fail" });
    }
  }
  return out;
}

export async function lookupIp(ip: string): Promise<GeoIpRecord | null> {
  const clean = (ip || "").trim();
  if (!clean) return null;
  const hit = cache.get(clean);
  if (hit && Date.now() <= hit.expires) return hit.value;
  if (isPrivate(clean)) return { status: "fail" };
  const rec = (await fetchIps([clean]))[0];
  if (!rec) return null;
  cache.set(clean, { value: rec, expires: Date.now() + CACHE_TTL });
  return rec;
}

export async function lookupMany(ips: string[]): Promise<Map<string, GeoIpRecord>> {
  const out = new Map<string, GeoIpRecord>();
  const unique = Array.from(new Set(ips.map((s) => (s || "").trim()).filter((s) => s && !isPrivate(s))));
  const missing = unique.filter((ip) => { const e = cache.get(ip); return !e || Date.now() > e.expires; });
  if (missing.length) {
    const recs = await fetchIps(missing);
    missing.forEach((ip, i) => {
      const rec = recs[i] ?? { status: "fail" as const };
      cache.set(ip, { value: rec, expires: Date.now() + CACHE_TTL });
    });
  }
  for (const ip of unique) {
    const e = cache.get(ip);
    out.set(ip, e ? e.value : { status: "fail" });
  }
  return out;
}
