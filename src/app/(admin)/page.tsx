"use client";

import { useMemo } from "react";
import {
  Users,
  UserCheck,
  Clock,
  Globe,
  CalendarRange,
  ShieldAlert,
  Activity,
} from "lucide-react";
import { useUsers } from "@/hooks/useUsers";
import { StatCard, Card, Badge } from "@/components/ui";
import { fmtDateTime, fmtRelative, computeLoginRange } from "@/lib/format";

export default function DashboardPage() {
  const { users, loading, error } = useUsers();

  const stats = useMemo(() => {
    const total = users.length;
    const online = users.filter((u) => u.online).length;
    const vpnFlagged = users.filter((u) => u.flaggedAsVpn).length;
    const logins = users
      .map((u) => u.lastLoginAt)
      .filter((v): v is number => typeof v === "number" && v > 0);

    const range = computeLoginRange(logins);

    const regionCount = new Map<string, number>();
    for (const u of users) {
      const r = u.region || "Unknown";
      regionCount.set(r, (regionCount.get(r) ?? 0) + 1);
    }
    const topRegions = Array.from(regionCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8);

    // distribusi login per jam (UTC→ lokal pakai timestamp utuh)
    const hourBuckets = new Array(24).fill(0);
    for (const u of users) {
      if (typeof u.lastLoginAt === "number" && u.lastLoginAt > 0) {
        const h = new Date(u.lastLoginAt).getHours();
        hourBuckets[h] += 1;
      }
    }

    return { total, online, vpnFlagged, range, topRegions, hourBuckets };
  }, [users]);

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

  const maxHour = Math.max(1, ...stats.hourBuckets);

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold">Dashboard</h1>
        <p className="text-xs text-fg-dim">
          Ringkasan aktivitas user & status sistem.
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard icon={Users} label="Total Users" value={stats.total} tone="accent" />
        <StatCard
          icon={UserCheck}
          label="Online Sekarang"
          value={stats.online}
          hint="status online:true"
          tone="ok"
        />
        <StatCard
          icon={ShieldAlert}
          label="Terflag VPN"
          value={stats.vpnFlagged}
          hint="region berubah antar negara"
          tone="danger"
        />
        <StatCard
          icon={Globe}
          label="Region Aktif"
          value={stats.topRegions.length}
          hint="negara unik terdeteksi"
        />
      </div>

      {/* Login range */}
      <Card title="Rentang Waktu Login">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex items-start gap-3 rounded border border-bg-border bg-bg-panel2 p-3">
            <Clock className="mt-0.5 h-4 w-4 text-accent" />
            <div>
              <div className="text-2xs uppercase tracking-wide text-fg-dim">
                Login pertama tercatat
              </div>
              <div className="mt-1 text-sm font-semibold tabular-nums">
                {stats.range?.min ?? "—"}
              </div>
            </div>
          </div>
          <div className="flex items-start gap-3 rounded border border-bg-border bg-bg-panel2 p-3">
            <Clock className="mt-0.5 h-4 w-4 text-ok" />
            <div>
              <div className="text-2xs uppercase tracking-wide text-fg-dim">
                Login terbaru
              </div>
              <div className="mt-1 text-sm font-semibold tabular-nums">
                {stats.range?.max ?? "—"}
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Hour distribution */}
      <Card title="Distribusi Login per Jam (dari timestamp login terakhir)">
        <div className="flex h-40 items-end gap-1">
          {stats.hourBuckets.map((count, i) => (
            <div key={i} className="flex flex-1 flex-col items-center gap-1">
              <div
                className="w-full rounded-t-sm bg-accent/70 transition-all"
                style={{ height: `${(count / maxHour) * 100}%`, minHeight: count > 0 ? 4 : 1 }}
                title={`${i}:00 — ${count} user`}
              />
              <span className="text-2xs text-fg-dim">
                {i % 4 === 0 ? `${i}` : ""}
              </span>
            </div>
          ))}
        </div>
        <div className="mt-1 text-2xs text-fg-dim">Sumbu X = jam (0–23), Y = jumlah login terakhir per jam.</div>
      </Card>

      {/* Top regions */}
      <Card title="Top Region / Negara">
        <div className="flex flex-col gap-2">
          {stats.topRegions.length === 0 && (
            <div className="text-sm text-fg-dim">Belum ada data region.</div>
          )}
          {stats.topRegions.map(([region, count]) => {
            const pct = Math.round((count / stats.total) * 100);
            return (
              <div key={region} className="flex items-center gap-3">
                <Globe className="h-4 w-4 shrink-0 text-fg-dim" />
                <div className="w-28 shrink-0 truncate text-xs">{region}</div>
                <div className="h-2 flex-1 overflow-hidden rounded bg-bg-panel2">
                  <div
                    className="h-full rounded bg-accent"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <div className="w-12 shrink-0 text-right text-xs tabular-nums text-fg-muted">
                  {count}
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
