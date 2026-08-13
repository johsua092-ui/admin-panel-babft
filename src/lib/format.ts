// Utilitas format tanggal, region, dan tooltip kecil.

export function fmtDateTime(ts?: number | null): string {
  if (!ts) return "—";
  const d = new Date(ts);
  return d.toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export function fmtDate(ts?: number | null): string {
  if (!ts) return "—";
  const d = new Date(ts);
  return d.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function fmtTime(ts?: number | null): string {
  if (!ts) return "—";
  const d = new Date(ts);
  return d.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

// Durasi relatif gaya "3 menit lalu" / "2 jam lalu"
export function fmtRelative(ts?: number | null): string {
  if (!ts) return "—";
  const diff = Date.now() - ts;
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s} dtk lalu`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} mnt lalu`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} jam lalu`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d} hari lalu`;
  const mo = Math.floor(d / 30);
  return `${mo} bln lalu`;
}

// Rentang jam login aktif (dari array timestamp)
export function computeLoginRange(records: number[]): { min: string; max: string } | null {
  if (!records || records.length === 0) return null;
  let min = records[0];
  let max = records[0];
  for (const r of records) {
    if (r < min) min = r;
    if (r > max) max = r;
  }
  return { min: fmtDateTime(min), max: fmtDateTime(max) };
}

// Flag emoji → icon name (dipakai di komponen, bukan emoji literal)
export function regionFlag(countryCode?: string | null): string {
  if (!countryCode) return "globe";
  // Kita return code-nya; komponen memetakan ke flag icon (lucide tidak punya flag,
  // jadi kita pakai teks code negara + ikon globe).
  return countryCode.toUpperCase();
}
