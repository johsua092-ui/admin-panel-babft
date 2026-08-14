"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Users,
  UserCheck,
  Clock,
  Globe,
  ShieldAlert,
  Activity,
  TrendingUp,
  Radio,
} from "lucide-react";
import { useUsers } from "@/hooks/useUsers";
import { StatCard, Card, Badge } from "@/components/ui";
import { PulseDot } from "@/components/anim";
import { fmtDateTime, fmtRelative, computeLoginRange } from "@/lib/format";

export default function DashboardPage() {
  const { users, loading, error } = useUsers();
  const [recentEvents, setRecentEvents] = useState<any[]>([]);
  const [dailyTrend, setDailyTrend] = useState<{ label: string; count: number }[]>([]);

  useEffect(() => {
    const t = setInterval(async () => {
      try {
        const r = await fetch("/api/analytics");
        if (!r.ok) return;
        const j = await r.json();
        const ev = (j.events || []) as any[];
        setRecentEvents(ev.slice(0, 12));
        // trend 7 hari dari login_success + login_failed + heartbeat
        const map = new Map<string, number>();
        const now = Date.now();
        for (let i = 6; i >= 0; i--) {
          const d = new Date(now - i * 86400000);
          const key = d.toLocaleDateString("id-ID", { day: "2-digit", month: "short" });
          map.set(key, 0);
        }
        for (const e of ev) {
          if (!e.timestamp) continue;
          const d = new Date(e.timestamp);
          const key = d.toLocaleDateString("id-ID", { day: "2-digit", month: "short" });
          if (map.has(key)) map.set(key, (map.get(key) ?? 0) + 1);
        }
        setDailyTrend(Array.from(map.entries()).map(([label, count]) => ({ label, count })));
      } catch (_) {}
    }, 60000);
    return () => clearInterval(t);
  }, []);

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
          hint="aktif < 1 menit"
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

      {/* Tren login harian (7 hari) */}
      <Card title="Tren Aktivitas (7 hari terakhir)">
        <div className="flex h-32 items-end gap-2">
          {dailyTrend.length === 0 && <div className="text-sm text-fg-dim">Mengumpulkan data…</div>}
          {dailyTrend.map((d, i) => {
            const max = Math.max(1, ...dailyTrend.map((x) => x.count));
            return (
              <div key={i} className="flex flex-1 flex-col items-center gap-1">
                <div
                  className="w-full rounded-t-sm bg-accent/70 transition-all"
                  style={{ height: `${(d.count / max) * 100}%`, minHeight: d.count > 0 ? 4 : 1 }}
                  title={`${d.label}: ${d.count} event`}
                />
                <span className="text-2xs text-fg-dim">{d.label}</span>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Online sekarang + aktivitas terakhir */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card title="Online Sekarang">
          {stats.online === 0 && <div className="text-sm text-fg-dim">Tidak ada user online.</div>}
          <div className="flex max-h-64 flex-col gap-2 overflow-y-auto">
            {users.filter((u) => u.online).slice(0, 20).map((u) => (
              <div key={u.id} className="flex items-center gap-2 rounded border border-bg-border bg-bg-panel2 px-2 py-1.5">
                <PulseDot color="ok" />
                <span className="truncate text-xs">{u.displayName || u.email || (u.isGuest ? "Guest" : "?")}</span>
                {u.isGuest && <Badge tone="info">Guest</Badge>}
                <span className="ml-auto text-2xs text-fg-dim">{u.city || u.region || ""}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Aktivitas Terakhir">
          {recentEvents.length === 0 && <div className="text-sm text-fg-dim">Belum ada aktivitas.</div>}
          <div className="flex max-h-64 flex-col gap-1 overflow-y-auto">
            {recentEvents.map((e, i) => {
              const meta: Record<string, { t: string; c: string }> = {
                error: { t: "Error", c: "text-danger" },
                login_success: { t: "Login", c: "text-ok" },
                login_failed: { t: "Login gagal", c: "text-warn" },
                heartbeat: { t: "Visit", c: "text-fg-muted" },
              };
              const m = meta[e.kind] || { t: e.kind, c: "text-fg-muted" };
              return (
                <div key={i} className="flex items-center gap-2 text-xs">
                  <span className={`w-20 shrink-0 tabular-nums text-2xs text-fg-dim`}>
                    {fmtDateTime(e.timestamp)}
                  </span>
                  <span className={`shrink-0 font-medium ${m.c}`}>{m.t}</span>
                  <span className="truncate text-fg-muted">
                    {e.kind === "error" ? (e.message || e.error) : (e.email || e.route || "")}
                  </span>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
}
