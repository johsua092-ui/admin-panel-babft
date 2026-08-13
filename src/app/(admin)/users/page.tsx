"use client";

import { useEffect, useMemo, useState } from "react";
import {
  MapPin, Clock3, Wifi, ShieldAlert, Search, ChevronUp, ChevronDown,
  Circle, Monitor, Smartphone, Tablet, MonitorSmartphone, Navigation,
  Home, Cpu, Fingerprint, Languages, Trash2, Download, History,
} from "lucide-react";
import { useUsers } from "@/hooks/useUsers";
import { Badge, Card } from "@/components/ui";
import { PulseDot } from "@/components/anim";
import { fmtDateTime, fmtRelative } from "@/lib/format";
import type { UserRecord } from "@/lib/types";

type SortKey = "lastLoginAt" | "loginCount" | "region" | "email";

function deviceIcon(type?: string | null) {
  if (!type) return Monitor;
  if (type === "mobile") return Smartphone;
  if (type === "tablet") return Tablet;
  return MonitorSmartphone;
}

export default function UsersPage() {
  const { users, loading, error } = useUsers();
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("lastLoginAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function removeUser(id: string) {
    if (!confirm("Hapus user ini dari daftar?")) return;
    setDeletingId(id);
    try {
      const r = await fetch(`/api/users/${encodeURIComponent(id)}`, { method: "DELETE" });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        alert("Gagal menghapus: " + (j.error || r.status));
      }
      // biarkan polling berikutnya merefresh daftar
    } catch (e) {
      alert("Gagal menghapus: " + (e instanceof Error ? e.message : String(e)));
    } finally {
      setDeletingId(null);
    }
  }

  function exportCsv() {
    window.open("/api/users/export", "_blank");
  }

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("desc"); }
  }

  const filtered = useMemo(() => {
    let rows = [...users];
    const q = search.trim().toLowerCase();
    if (q) {
      rows = rows.filter((u) =>
        (u.email ?? "").toLowerCase().includes(q) ||
        (u.displayName ?? "").toLowerCase().includes(q) ||
        (u.region ?? "").toLowerCase().includes(q) ||
        (u.countryCode ?? "").toLowerCase().includes(q) ||
        (u.ipAddress ?? "").toLowerCase().includes(q) ||
        (u.city ?? "").toLowerCase().includes(q) ||
        (u.address ?? "").toLowerCase().includes(q) ||
        (u.device ?? "").toLowerCase().includes(q)
      );
    }
    rows.sort((a, b) => {
      const va = a[sortKey] ?? "";
      const vb = b[sortKey] ?? "";
      if (va < vb) return sortDir === "asc" ? -1 : 1;
      if (va > vb) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return rows;
  }, [users, search, sortKey, sortDir]);

  if (loading) return <div className="py-16 text-center text-fg-dim">Memuat data…</div>;
  if (error) {
    return (
      <div className="rounded border border-[#5b1f1f] bg-[#331414] p-4 text-sm text-danger">
        Gagal memuat data user: {error}
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="anim-fade-up text-xl font-bold">Users</h1>
          <p className="text-xs text-fg-dim">
            {users.length} user terdaftar · klik baris untuk detail lokasi & perangkat.
          </p>
        </div>
        <button
          onClick={exportCsv}
          className="inline-flex items-center gap-1.5 rounded border border-bg-border px-3 py-1.5 text-xs text-fg-muted hover:text-fg-primary"
        >
          <Download className="h-3.5 w-3.5" /> Export CSV
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-dim" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari email / nama / region / kota / alamat / device…"
          className="w-full rounded-md border border-bg-border bg-bg-panel py-2 pl-9 pr-3 text-sm text-fg-primary placeholder:text-fg-dim focus:border-accent focus:outline-none"
        />
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="admin-table">
            <thead>
              <tr>
                <th>
                  <button onClick={() => toggleSort("email")} className="flex items-center gap-1 hover:text-fg-primary">
                    User {sortKey === "email" ? (sortDir === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />) : null}
                  </button>
                </th>
                <th>Status</th>
                <th>
                  <button onClick={() => toggleSort("region")} className="flex items-center gap-1 hover:text-fg-primary">
                    Lokasi {sortKey === "region" ? (sortDir === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />) : null}
                  </button>
                </th>
                <th>Device</th>
                <th>IP Address</th>
                <th>
                  <button onClick={() => toggleSort("lastLoginAt")} className="flex items-center gap-1 hover:text-fg-primary">
                    Last Login {sortKey === "lastLoginAt" ? (sortDir === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />) : null}
                  </button>
                </th>
                <th>VPN</th>
                <th className="text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="py-8 text-center text-fg-dim">Tidak ada data.</td></tr>
              )}
              {filtered.map((u) => (
                <UserRow
                  key={u.id}
                  u={u}
                  expanded={expanded === u.id}
                  onToggle={() => setExpanded((e) => (e === u.id ? null : u.id))}
                  onDelete={() => removeUser(u.id)}
                  deleting={deletingId === u.id}
                />
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function UserRow({ u, expanded, onToggle, onDelete, deleting }: {
  u: UserRecord;
  expanded: boolean;
  onToggle: () => void;
  onDelete: () => void;
  deleting: boolean;
}) {
  const DeviceIcon = deviceIcon(u.deviceType);
  return (
    <>
      <tr onClick={onToggle} className={`cursor-pointer ${expanded ? "bg-bg-panel2" : ""}`}>
        <td>
          <div className="flex items-center gap-2">
            {u.photoURL ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={u.photoURL} alt="" className="h-7 w-7 rounded-full border border-bg-border" />
            ) : (
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-bg-panel2 text-2xs font-semibold text-fg-muted">
                {(u.email ?? "?").charAt(0).toUpperCase()}
              </div>
            )}
            <div className="min-w-0 leading-tight">
              <div className="flex items-center gap-1.5 truncate text-xs font-medium">
                {u.displayName || (u.isGuest ? "Guest" : "—")}
                {u.isGuest && <Badge tone="info">Guest</Badge>}
              </div>
              <div className="truncate text-2xs text-fg-dim">{u.email || (u.isGuest ? "anonim" : "")}</div>
            </div>
          </div>
        </td>
        <td>
          {u.online ? (
            <span className="inline-flex items-center gap-2 text-2xs font-medium text-ok">
              <PulseDot color="ok" /> Online
            </span>
          ) : (
            <span className="inline-flex items-center gap-2 text-2xs font-medium text-fg-dim">
              <Circle className="h-2 w-2 fill-current text-fg-muted" /> Offline
            </span>
          )}
        </td>
        <td>
          <div className="flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 text-fg-dim" />
            <span className="text-xs">{u.region || "—"}</span>
            {u.countryCode && <span className="text-2xs text-fg-dim">({u.countryCode})</span>}
          </div>
          {u.city && <div className="mt-0.5 text-2xs text-fg-dim">{u.city}</div>}
        </td>
        <td>
          <div className="flex items-center gap-1.5 text-xs">
            <DeviceIcon className="h-3.5 w-3.5 text-fg-dim" />
            {u.device || u.os || "—"}
          </div>
          {u.browser && <div className="mt-0.5 text-2xs text-fg-dim">{u.browser}</div>}
        </td>
        <td>
          <div className="flex items-center gap-1.5 font-mono text-xs">
            <Wifi className="h-3.5 w-3.5 text-fg-dim" />
            {u.ipAddress || "—"}
          </div>
        </td>
        <td>
          <div className="text-xs tabular-nums">{fmtDateTime(u.lastLoginAt)}</div>
          <div className="text-2xs text-fg-dim">{fmtRelative(u.lastLoginAt)}</div>
        </td>
        <td>
          {u.flaggedAsVpn ? (
            <Badge tone="danger"><ShieldAlert className="h-3 w-3" /> VPN</Badge>
          ) : (
            <Badge tone="default">—</Badge>
          )}
        </td>
        <td className="text-right">
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            disabled={deleting}
            title="Hapus user"
            className="inline-flex items-center gap-1 rounded border border-bg-border px-2 py-1 text-2xs text-fg-muted transition-colors hover:border-danger hover:text-danger disabled:opacity-50"
          >
            <Trash2 className="h-3.5 w-3.5" />
            {deleting ? "…" : "Hapus"}
          </button>
        </td>
      </tr>

      {expanded && (
        <tr>
          <td colSpan={7} className="bg-bg-base">
            <UserDetail u={u} />
          </td>
        </tr>
      )}
    </>
  );
}

function UserDetail({ u }: { u: UserRecord }) {
  const hasCoords = u.latitude != null && u.longitude != null;
  const mapsUrl = hasCoords
    ? `https://www.google.com/maps?q=${u.latitude},${u.longitude}`
    : null;

  return (
    <>
    <div className="anim-fade-in grid grid-cols-1 gap-4 p-4 md:grid-cols-3">
      {/* Lokasi & Map */}
      <div className="rounded border border-bg-border bg-bg-panel p-3">
        <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-fg-muted">
          <Navigation className="h-3.5 w-3.5" /> Lokasi & Koordinat
        </div>
        {hasCoords ? (
          <>
            <div className="mb-2 flex items-center gap-2 font-mono text-xs text-accent">
              <MapPin className="h-3.5 w-3.5" />
              {u.latitude?.toFixed(6)}, {u.longitude?.toFixed(6)}
            </div>
            {u.accuracy != null && (
              <div className="mb-2 text-2xs text-fg-dim">
                Akurasi ± {Math.round(u.accuracy)} meter
              </div>
            )}
            {mapsUrl && (
              <a
                href={mapsUrl}
                target="_blank"
                rel="noreferrer"
                className="text-2xs font-medium text-info underline hover:text-fg-primary"
              >
                Buka di Google Maps ↗
              </a>
            )}
          </>
        ) : (
          <div className="text-2xs text-fg-dim">Koordinat belum tersedia (user belum memberi izin GPS / IP tanpa koordinat).</div>
        )}
      </div>

      {/* Alamat */}
      <div className="rounded border border-bg-border bg-bg-panel p-3">
        <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-fg-muted">
          <Home className="h-3.5 w-3.5" /> Alamat
        </div>
        {u.address ? (
          <>
            <div className="mb-1 text-xs text-fg-primary">{u.address}</div>
            {u.city && <div className="text-2xs text-fg-dim">Kota: {u.city}</div>}
            {u.postal && <div className="text-2xs text-fg-dim">Kode pos: {u.postal}</div>}
          </>
        ) : (
          <div className="text-2xs text-fg-dim">Alamat belum tersedia.</div>
        )}
        <div className="mt-2 flex items-center gap-1.5 text-2xs text-fg-dim">
          <Clock3 className="h-3 w-3" /> {u.timezone || "—"} · online terakhir {fmtRelative(u.lastOnlineAt)}
        </div>
      </div>

      {/* Perangkat */}
      <div className="rounded border border-bg-border bg-bg-panel p-3">
        <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-fg-muted">
          <Cpu className="h-3.5 w-3.5" /> Perangkat
        </div>
        <div className="flex flex-col gap-1 text-xs">
          <Row icon={Monitor} label="Device" value={u.device || "—"} />
          <Row icon={Cpu} label="OS" value={u.os || "—"} />
          <Row icon={MonitorSmartphone} label="Browser" value={u.browser || "—"} />
          <Row icon={Smartphone} label="Tipe" value={u.deviceType || "—"} />
          <Row icon={MonitorSmartphone} label="Layar" value={u.screen || "—"} />
          <Row icon={Languages} label="Bahasa" value={u.language || "—"} />
        </div>
        {u.deviceId && (
          <div className="mt-2 flex items-start gap-1.5 text-2xs text-fg-dim">
            <Fingerprint className="h-3 w-3 shrink-0 mt-0.5" />
            <span className="break-all font-mono">ID: {u.deviceId.slice(0, 24)}…</span>
          </div>
        )}
      </div>
    </div>
    <HistoryPanel uid={u.id} isGuest={u.isGuest} />
    </>
  );
}

function HistoryPanel({ uid, isGuest }: { uid: string; isGuest?: boolean }) {
  const [history, setHistory] = useState<any[] | null>(null);
  const [hErr, setHErr] = useState<string | null>(null);

  useEffect(() => {
    if (isGuest) { setHistory([]); return; }
    let cancel = false;
    (async () => {
      try {
        const r = await fetch(`/api/users/${encodeURIComponent(uid)}/history`);
        if (!r.ok) throw new Error(`API ${r.status}`);
        const j = await r.json();
        if (!cancel) setHistory(j.history || []);
      } catch (e) {
        if (!cancel) setHErr(e instanceof Error ? e.message : String(e));
      }
    })();
    return () => { cancel = true; };
  }, [uid, isGuest]);

  if (isGuest) return null;
  if (hErr) return <div className="px-4 pb-3 text-2xs text-fg-dim">Riwayat tidak tersedia.</div>;
  if (history === null) return <div className="px-4 pb-3 text-2xs text-fg-dim">Memuat riwayat…</div>;

  return (
    <div className="border-t border-bg-border px-4 py-3">
      <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-fg-muted">
        <History className="h-3.5 w-3.5" /> Riwayat kunjungan ({history.length})
      </div>
      {history.length === 0 ? (
        <div className="text-2xs text-fg-dim">Belum ada riwayat.</div>
      ) : (
        <div className="flex max-h-48 flex-col gap-1 overflow-y-auto">
          {history.slice(0, 30).map((h, i) => (
            <div key={i} className="flex items-center gap-2 text-2xs text-fg-muted">
              <span className="w-32 shrink-0 tabular-nums">{fmtDateTime(h.timestamp)}</span>
              <span className="shrink-0">{h.device || h.os || "?"}</span>
              {h.browser && <span className="shrink-0 text-fg-dim">· {h.browser}</span>}
              <span className="truncate text-fg-dim">
                {[h.city, h.region].filter(Boolean).join(", ") || "—"}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Row({ icon: Icon, label, value }: { icon: typeof Monitor; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="h-3.5 w-3.5 shrink-0 text-fg-dim" />
      <span className="w-14 shrink-0 text-2xs uppercase tracking-wide text-fg-dim">{label}</span>
      <span className="min-w-0 truncate text-fg-primary">{value}</span>
    </div>
  );
}
