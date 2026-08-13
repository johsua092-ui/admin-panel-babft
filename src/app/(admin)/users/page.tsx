"use client";

import { useMemo, useState } from "react";
import {
  Globe,
  MapPin,
  Clock3,
  Wifi,
  ShieldAlert,
  Search,
  ChevronUp,
  ChevronDown,
  Circle,
} from "lucide-react";
import { useUsers } from "@/hooks/useUsers";
import { Badge, Card } from "@/components/ui";
import { fmtDateTime, fmtRelative } from "@/lib/format";
import type { UserRecord } from "@/lib/types";

type SortKey = "lastLoginAt" | "loginCount" | "region" | "email";

export default function UsersPage() {
  const { users, loading, error } = useUsers();
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("lastLoginAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  const filtered = useMemo(() => {
    let rows = [...users];
    const q = search.trim().toLowerCase();
    if (q) {
      rows = rows.filter(
        (u) =>
          (u.email ?? "").toLowerCase().includes(q) ||
          (u.displayName ?? "").toLowerCase().includes(q) ||
          (u.region ?? "").toLowerCase().includes(q) ||
          (u.countryCode ?? "").toLowerCase().includes(q) ||
          (u.ipAddress ?? "").toLowerCase().includes(q)
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

  if (loading) {
    return <div className="py-16 text-center text-fg-dim">Memuat data…</div>;
  }
  if (error) {
    return (
      <div className="rounded border border-[#5b1f1f] bg-[#331414] p-4 text-sm text-danger">
        Gagal memuat data user: {error}
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-4">
      <div>
        <h1 className="text-xl font-bold">Users</h1>
        <p className="text-xs text-fg-dim">
          {users.length} user terdaftar · klik kolom untuk sort.
        </p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-dim" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari email / nama / region / IP…"
          className="w-full rounded-md border border-bg-border bg-bg-panel py-2 pl-9 pr-3 text-sm text-fg-primary placeholder:text-fg-dim focus:border-accent focus:outline-none"
        />
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="admin-table">
            <thead>
              <tr>
                <th>
                  <button
                    onClick={() => toggleSort("email")}
                    className="flex items-center gap-1 hover:text-fg-primary"
                  >
                    User {sortKey === "email" ? (sortDir === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />) : null}
                  </button>
                </th>
                <th>Status</th>
                <th>
                  <button
                    onClick={() => toggleSort("region")}
                    className="flex items-center gap-1 hover:text-fg-primary"
                  >
                    Region / Negara {sortKey === "region" ? (sortDir === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />) : null}
                  </button>
                </th>
                <th>Timezone</th>
                <th>IP Address</th>
                <th>
                  <button
                    onClick={() => toggleSort("lastLoginAt")}
                    className="flex items-center gap-1 hover:text-fg-primary"
                  >
                    Last Login {sortKey === "lastLoginAt" ? (sortDir === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />) : null}
                  </button>
                </th>
                <th>Last Online</th>
                <th>VPN</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-fg-dim">
                    Tidak ada data.
                  </td>
                </tr>
              )}
              {filtered.map((u) => (
                <UserRow key={u.id} u={u} />
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function UserRow({ u }: { u: UserRecord }) {
  return (
    <tr>
      <td>
        <div className="flex items-center gap-2">
          {u.photoURL ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={u.photoURL}
              alt=""
              className="h-7 w-7 rounded-full border border-bg-border"
            />
          ) : (
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-bg-panel2 text-2xs font-semibold text-fg-muted">
              {(u.email ?? "?").charAt(0).toUpperCase()}
            </div>
          )}
          <div className="min-w-0 leading-tight">
            <div className="truncate text-xs font-medium">{u.displayName || "—"}</div>
            <div className="truncate text-2xs text-fg-dim">{u.email}</div>
          </div>
        </div>
      </td>
      <td>
        {u.online ? (
          <Badge tone="ok">
            <Circle className="h-2 w-2 fill-current" /> Online
          </Badge>
        ) : (
          <Badge tone="default">Offline</Badge>
        )}
      </td>
      <td>
        <div className="flex items-center gap-1.5">
          <MapPin className="h-3.5 w-3.5 text-fg-dim" />
          <span className="text-xs">{u.region || "—"}</span>
          {u.countryCode && (
            <span className="text-2xs text-fg-dim">({u.countryCode})</span>
          )}
        </div>
        {u.regionChangedAt && (
          <div className="mt-0.5 text-2xs text-fg-dim">
            {u.regionChangeCount ?? 0}× ganti region
          </div>
        )}
      </td>
      <td>
        <div className="flex items-center gap-1.5 text-xs">
          <Clock3 className="h-3.5 w-3.5 text-fg-dim" />
          {u.timezone || "—"}
        </div>
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
        <div className="text-xs tabular-nums">{fmtDateTime(u.lastOnlineAt)}</div>
        <div className="text-2xs text-fg-dim">{fmtRelative(u.lastOnlineAt)}</div>
      </td>
      <td>
        {u.flaggedAsVpn ? (
          <Badge tone="danger">
            <ShieldAlert className="h-3 w-3" /> VPN
          </Badge>
        ) : (
          <Badge tone="default">—</Badge>
        )}
      </td>
    </tr>
  );
}
