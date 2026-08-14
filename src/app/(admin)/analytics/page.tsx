"use client";

import { useEffect, useState } from "react";
import {
  Activity, Bug, KeyRound, Radio, RefreshCw, Download,
  ShieldAlert, TriangleAlert, Users, Network,
} from "lucide-react";
import { StatCard, Card, Badge } from "@/components/ui";
import { PulseDot } from "@/components/anim";
import { fmtDateTime } from "@/lib/format";

type Event = {
  id: string;
  kind: string;
  method?: string;
  email?: string | null;
  error?: string;
  message?: string;
  type?: string;
  source?: string | null;
  line?: number | null;
  route?: string;
  deviceId?: string;
  timestamp?: number;
};

type Suspicious = {
  id: string;
  level: "danger" | "warn";
  title: string;
  detail: string;
};

type Summary = {
  total: number;
  errors: number;
  failedLogins: number;
  heartbeats: number;
  lastMin: number;
  last10min: number;
  uniqueDevices: number;
};

const KIND_LABEL: Record<string, { label: string; tone: "default" | "ok" | "warn" | "danger" | "info" }> = {
  error: { label: "Error", tone: "danger" },
  login_success: { label: "Login sukses", tone: "ok" },
  login_failed: { label: "Login gagal", tone: "warn" },
  heartbeat: { label: "Heartbeat", tone: "info" },
  request: { label: "Request", tone: "default" },
};

export default function AnalyticsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [suspicious, setSuspicious] = useState<Suspicious[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [traffic, setTraffic] = useState<{ day: any; week: any } | null>(null);

  async function loadTraffic() {
    try {
      const r = await fetch("/api/traffic");
      if (!r.ok) return;
      const j = await r.json();
      if (j.day || j.week) setTraffic(j);
    } catch (_) {}
  }

  async function load() {
    try {
      const r = await fetch("/api/analytics");
      if (!r.ok) throw new Error(`API ${r.status}`);
      const j = await r.json();
      setEvents(j.events || []);
      setSummary(j.summary || null);
      setSuspicious(j.suspicious || []);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    loadTraffic();
    const t = setInterval(load, 60000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="anim-fade-up text-xl font-bold">Analitik Server</h1>
          <p className="text-xs text-fg-dim">
            Error logs · aktivitas login · deteksi aktivitas mencurigakan.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => window.open("/api/analytics/export", "_blank")}
            className="inline-flex items-center gap-1.5 rounded border border-bg-border px-3 py-1.5 text-xs text-fg-muted transition-colors hover:text-fg-primary"
          >
            <Download className="h-3.5 w-3.5" /> Export CSV
          </button>
          <button
            onClick={load}
            className="inline-flex items-center gap-1.5 rounded border border-bg-border px-3 py-1.5 text-xs text-fg-muted transition-colors hover:text-fg-primary"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded border border-[#5b1f1f] bg-[#331414] p-4 text-sm text-danger">
          Gagal memuat analitik: {error}
        </div>
      )}

      {/* Ringkasan */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-6">
        <StatCard icon={Activity} label="Event" value={summary?.total ?? 0} tone="accent" />
        <StatCard icon={Bug} label="Error" value={summary?.errors ?? 0} tone="danger" />
        <StatCard icon={KeyRound} label="Login gagal" value={summary?.failedLogins ?? 0} tone="warn" />
        <StatCard icon={Radio} label="Heartbeat" value={summary?.heartbeats ?? 0} tone="accent" />
        <StatCard icon={Users} label="Device unik" value={summary?.uniqueDevices ?? 0} />
        <StatCard icon={Activity} label="1 mnt terakhir" value={summary?.lastMin ?? 0} />
      </div>

      {/* Traffic Internet (Vercel Web Analytics) */}
      {traffic && (
        <Card title="Traffic Internet (Vercel Web Analytics)">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <StatCard icon={Network} label="Pageviews 24 jam" value={traffic.day?.pageviews ?? 0} tone="accent" />
            <StatCard icon={Users} label="Visitors 24 jam" value={traffic.day?.visitors ?? 0} />
            <StatCard icon={Network} label="Pageviews 7 hari" value={traffic.week?.pageviews ?? 0} />
            <StatCard icon={Users} label="Visitors 7 hari" value={traffic.week?.visitors ?? 0} />
          </div>
          <div className="mt-2 text-2xs text-fg-dim">
            Sumber: Vercel Web Analytics (traffic produksi). Lonjakan pageviews mendadak bisa menandakan flood/DDoS.
          </div>
        </Card>
      )}

      {/* Deteksi mencurigakan */}
      {suspicious.length > 0 && (
        <div className="rounded-lg border border-[#5b1f1f] bg-[#331414] p-4">
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-danger">
            <TriangleAlert className="h-4 w-4" /> Aktivitas mencurigakan terdeteksi
          </div>
          <div className="flex flex-col gap-2">
            {suspicious.map((s) => (
              <div key={s.id} className="flex items-start gap-2 rounded border border-[#5b1f1f] bg-[#2a1010] p-3">
                <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-danger" />
                <div>
                  <div className="text-xs font-medium text-danger">{s.title}</div>
                  <div className="text-2xs text-[#e6b0b0]">{s.detail}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Status aman */}
      {!loading && suspicious.length === 0 && summary && (
        <div className="flex items-center gap-2 rounded-lg border border-[#1f5b35] bg-[#14331f] p-3 text-xs text-ok">
          <PulseDot color="ok" /> Tidak ada aktivitas mencurigakan saat ini.
        </div>
      )}

      {/* Event terbaru */}
      <Card title="Event terbaru (error & aktivitas)">
        <div className="overflow-x-auto">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Waktu</th>
                <th>Tipe</th>
                <th>Detail</th>
              </tr>
            </thead>
            <tbody>
              {events.length === 0 && (
                <tr><td colSpan={3} className="py-8 text-center text-fg-dim">Belum ada event.</td></tr>
              )}
              {events.slice(0, 100).map((e) => {
                const meta = KIND_LABEL[e.kind] || { label: e.kind, tone: "default" as const };
                return (
                  <tr key={e.id}>
                    <td className="whitespace-nowrap text-xs tabular-nums text-fg-dim">
                      {fmtDateTime(e.timestamp)}
                    </td>
                    <td>
                      <Badge tone={meta.tone}>{meta.label}</Badge>
                    </td>
                    <td>
                      <div className="text-xs text-fg-primary">
                        {e.kind === "error" && (
                          <>
                            <Bug className="mr-1 inline h-3 w-3 text-danger" />
                            <span className="text-danger">{e.message || e.error || "unknown error"}</span>
                            {e.source && <span className="text-2xs text-fg-dim"> · {e.source}{e.line ? `:${e.line}` : ""}</span>}
                          </>
                        )}
                        {(e.kind === "login_failed" || e.kind === "login_success") && (
                          <>
                            <span className="font-medium">{e.email || "—"}</span>
                            <span className="text-2xs text-fg-dim"> · {e.method || "?"}</span>
                            {e.error && <span className="text-2xs text-danger"> · {e.error}</span>}
                          </>
                        )}
                        {e.kind === "heartbeat" && (
                          <span className="text-2xs text-fg-dim">{e.route || "/"}</span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {loading && <div className="py-8 text-center text-fg-dim">Memuat data…</div>}
    </div>
  );
}
