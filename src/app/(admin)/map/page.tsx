"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { MapPin, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui";
import type { UserRecord } from "@/lib/types";

declare global {
  interface Window { L: any; }
}

let leafletLoaded = false;
let leafletLoading: Promise<void> | null = null;

function ensureLeaflet(): Promise<void> {
  if (leafletLoaded) return Promise.resolve();
  if (leafletLoading) return leafletLoading;
  leafletLoading = new Promise((resolve, reject) => {
    if (typeof window === "undefined") return resolve();
    if (window.L) { leafletLoaded = true; resolve(); return; }
    const css = document.createElement("link");
    css.rel = "stylesheet";
    css.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    document.head.appendChild(css);
    const script = document.createElement("script");
    script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    script.onload = () => { leafletLoaded = true; resolve(); };
    script.onerror = () => reject(new Error("gagal load leaflet"));
    document.head.appendChild(script);
  });
  return leafletLoading;
}

export default function MapPage() {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);

  const coordsUsers = useMemo(
    () => users.filter((u) => u.latitude != null && u.longitude != null),
    [users]
  );

  async function load() {
    try {
      const r = await fetch("/api/users?limit=500");
      if (!r.ok) throw new Error(`API ${r.status}`);
      const j = await r.json();
      setUsers(j.users || []);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (!mapRef.current || loading) return;
    let cancelled = false;
    (async () => {
      try {
        await ensureLeaflet();
        if (cancelled) return;
        const L = window.L;
        if (!leafletMapRef.current) {
          leafletMapRef.current = L.map(mapRef.current).setView([-2.5, 118], 5);
          L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            attribution: "&copy; OpenStreetMap",
          }).addTo(leafletMapRef.current);
        }
        // bersihkan marker lama
        markersRef.current.forEach((m) => m.remove());
        markersRef.current = [];
        // pasang marker baru
        for (const u of coordsUsers) {
          const online = u.online;
          const m = L.circleMarker([u.latitude, u.longitude], {
            radius: 8,
            color: online ? "#22c55e" : (u.flaggedAsVpn ? "#ef4444" : "#38bdf8"),
            weight: 2,
            fillColor: online ? "#22c55e" : (u.flaggedAsVpn ? "#ef4444" : "#38bdf8"),
            fillOpacity: 0.8,
          }).addTo(leafletMapRef.current);
          const isGuest = u.isGuest;
          const label = `${u.displayName || (isGuest ? "Guest" : u.email || "?").slice(0, 24)}
${u.city || u.region || ""} · ${u.device || u.os || "?"}${online ? " · online" : ""}`;
          m.bindPopup(label.replace(/\n/g, "<br/>"));
          markersRef.current.push(m);
        }
      } catch (_) {}
    })();
    return () => { cancelled = true; };
  }, [coordsUsers, loading]);

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="anim-fade-up text-xl font-bold">Peta User</h1>
          <p className="text-xs text-fg-dim">
            {coordsUsers.length} user dengan koordinat · hijau = online · merah = VPN · biru = offline.
          </p>
        </div>
        <button onClick={load} className="inline-flex items-center gap-1.5 rounded border border-bg-border px-3 py-1.5 text-xs text-fg-muted hover:text-fg-primary">
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </button>
      </div>

      {error && (
        <div className="rounded border border-[#5b1f1f] bg-[#331414] p-4 text-sm text-danger">Gagal: {error}</div>
      )}

      <div className="overflow-hidden rounded-lg border border-bg-border">
        <div ref={mapRef} className="h-[70vh] w-full" />
      </div>

      <div className="text-2xs text-fg-dim">
        <MapPin className="mr-1 inline h-3 w-3" />
        User tanpa koordinat (belum ada IP/geo) tidak tampil di peta — jumlah: {users.length - coordsUsers.length}.
      </div>
    </div>
  );
}
