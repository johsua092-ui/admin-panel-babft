"use client";

import { useEffect, useState } from "react";
import {
  Users, Coins, Timer, TrendingUp, TrendingDown,
  RefreshCw, Activity,
} from "lucide-react";
import { StatCard, Card } from "@/components/ui";

type Totals = {
  totalUsers: number;
  paidUsers: number;
  percentTopup: number;
  totalBuyTransactions: number;
  totalGoldSpent: number;
  aiAccessUsers: number;
  activeTimersNow: number;
  totalRemainingMinutes: number;
  totalTimerMinutesPurchased: number;
  avgMinutesPerUser: number;
};

type Topic = { topic: string; label: string; count: number };
type SeriesRow = { date: string; purchases: number; activeAI: number };

type Stats = {
  generatedAt: number;
  totals: Totals;
  topics: Topic[];
  timeSeries: SeriesRow[];
};

// ---- Grafik garis SVG (time-series naik/turun) ----
function LineChart({ data }: { data: SeriesRow[] }) {
  if (data.length === 0) {
    return <div className="py-10 text-center text-xs text-fg-dim">Belum ada data.</div>;
  }
  const W = 640;
  const H = 220;
  const PAD = { l: 40, r: 16, t: 16, b: 28 };
  const innerW = W - PAD.l - PAD.r;
  const innerH = H - PAD.t - PAD.b;

  const maxVal = Math.max(1, ...data.flatMap((d) => [d.purchases, d.activeAI]));
  const x = (i: number) => PAD.l + (data.length === 1 ? innerW / 2 : (i / (data.length - 1)) * innerW);
  const y = (v: number) => PAD.t + innerH - (v / maxVal) * innerH;

  const makePath = (key: "purchases" | "activeAI") =>
    data.map((d, i) => `${i === 0 ? "M" : "L"} ${x(i)} ${y(d[key])}`).join(" ");

  const last = data[data.length - 1];
  const first = data[0];
  const trendingUp = last.purchases + last.activeAI >= first.purchases + first.activeAI;

  return (
    <div>
      <div className="mb-2 flex items-center gap-3 text-2xs">
        <span className="inline-flex items-center gap-1 text-fg-dim">
          <span className="h-2.5 w-2.5 rounded-sm bg-accent" /> Pembelian (topup)
        </span>
        <span className="inline-flex items-center gap-1 text-fg-dim">
          <span className="h-2.5 w-2.5 rounded-sm bg-info" /> AI aktif
        </span>
        <span className="ml-auto inline-flex items-center gap-1 rounded border border-bg-border px-2 py-0.5 text-fg-muted">
          {trendingUp ? (
            <><TrendingUp className="h-3 w-3 text-ok" /> Naik</>
          ) : (
            <><TrendingDown className="h-3 w-3 text-danger" /> Turun</>
          )}
        </span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
        {[0, 0.25, 0.5, 0.75, 1].map((g) => (
          <line key={g} x1={PAD.l} x2={W - PAD.r} y1={PAD.t + innerH - g * innerH} y2={PAD.t + innerH - g * innerH} stroke="#1e293b" strokeWidth="1" />
        ))}
        <polyline points={makePath("purchases")} fill="none" stroke="#c0392b" strokeWidth="2" />
        <polyline points={makePath("activeAI")} fill="none" stroke="#38bdf8" strokeWidth="2" />
        {data.map((d, i) => (
          <g key={i}>
            <circle cx={x(i)} cy={y(d.purchases)} r="3" fill="#c0392b" />
            <circle cx={x(i)} cy={y(d.activeAI)} r="3" fill="#38bdf8" />
            <text x={x(i)} y={H - 8} textAnchor="middle" fontSize="10" fill="#64748b">
              {d.date.slice(5)}
            </text>
          </g>
        ))}
        <text x={PAD.l} y={PAD.t - 4} fontSize="10" fill="#64748b">{maxVal}</text>
      </svg>
    </div>
  );
}

// ---- Bar chart horizontal (kategori "dipakai buat apa") ----
function TopicBars({ topics }: { topics: Topic[] }) {
  if (topics.length === 0) {
    return <div className="py-10 text-center text-xs text-fg-dim">Belum ada chat terekam.</div>;
  }
  const max = Math.max(1, ...topics.map((t) => t.count));
  return (
    <div className="flex flex-col gap-2">
      {topics.map((t) => (
        <div key={t.topic} className="flex items-center gap-2">
          <span className="w-28 shrink-0 truncate text-xs text-fg-muted">{t.label}</span>
          <div className="h-4 flex-1 overflow-hidden rounded bg-bg-panel2">
            <div className="h-full rounded bg-accent" style={{ width: `${(t.count / max) * 100}%` }} />
          </div>
          <span className="w-8 text-right text-xs tabular-nums text-fg-dim">{t.count}</span>
        </div>
      ))}
    </div>
  );
}

export default function BusinessPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      const r = await fetch("/api/business");
      if (!r.ok) throw new Error(`API ${r.status}`);
      const j = await r.json();
      setStats(j);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const t = setInterval(load, 60000);
    return () => clearInterval(t);
  }, []);

  const t = stats?.totals;

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="anim-fade-up text-xl font-bold">Analitik Bisnis &amp; AI</h1>
          <p className="text-xs text-fg-dim">
            % user topup · durasi pakai AI · dipakai buat apa · tren naik/turun.
          </p>
        </div>
        <button
          onClick={load}
          className="inline-flex items-center gap-1.5 rounded border border-bg-border px-3 py-1.5 text-xs text-fg-muted transition-colors hover:text-fg-primary"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </button>
      </div>

      {error && (
        <div className="rounded border border-[#5b1f1f] bg-[#331414] p-4 text-sm text-danger">
          Gagal memuat data bisnis: {error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
        <StatCard icon={Users} label="Total user" value={t?.totalUsers ?? 0} />
        <StatCard icon={Coins} label="User topup" value={t?.paidUsers ?? 0} hint={`${t?.percentTopup ?? 0}% dari total`} tone="accent" />
        <StatCard icon={Activity} label="AI aktif skrg" value={t?.activeTimersNow ?? 0} tone="ok" />
        <StatCard icon={Timer} label="Menit dibeli" value={t?.totalTimerMinutesPurchased ?? 0} hint={`rata ${t?.avgMinutesPerUser ?? 0} mnt/user`} />
        <StatCard icon={Timer} label="Sisa menit" value={t?.totalRemainingMinutes ?? 0} />
      </div>

      <Card title="Persentase user yang topup">
        <div className="flex items-center gap-4">
          <div className="text-4xl font-bold tabular-nums text-accent">{t?.percentTopup ?? 0}%</div>
          <div className="flex-1">
            <div className="h-4 overflow-hidden rounded bg-bg-panel2">
              <div
                className="h-full rounded bg-gradient-to-r from-accent to-[#e67e22] transition-all"
                style={{ width: `${Math.min(100, t?.percentTopup ?? 0)}%` }}
              />
            </div>
            <div className="mt-1 flex justify-between text-2xs text-fg-dim">
              <span>{t?.paidUsers ?? 0} user topup</span>
              <span>{t?.totalUsers ?? 0} total user</span>
            </div>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-3 text-center">
          <div className="rounded border border-bg-border bg-bg-panel2 p-2">
            <div className="text-lg font-bold tabular-nums">{t?.totalBuyTransactions ?? 0}</div>
            <div className="text-2xs text-fg-dim">Transaksi</div>
          </div>
          <div className="rounded border border-bg-border bg-bg-panel2 p-2">
            <div className="text-lg font-bold tabular-nums">{t?.totalGoldSpent ?? 0}</div>
            <div className="text-2xs text-fg-dim">Gold dibelanjakan</div>
          </div>
          <div className="rounded border border-bg-border bg-bg-panel2 p-2">
            <div className="text-lg font-bold tabular-nums">{t?.aiAccessUsers ?? 0}</div>
            <div className="text-2xs text-fg-dim">User pakai AI</div>
          </div>
        </div>
      </Card>

      <Card title="Perkembangan harian (naik / turun)">
        {stats ? <LineChart data={stats.timeSeries} /> : <div className="py-8 text-center text-xs text-fg-dim">Memuat grafik…</div>}
      </Card>

      <Card title="AI dipakai untuk apa">
        {stats ? <TopicBars topics={stats.topics} /> : <div className="py-8 text-center text-xs text-fg-dim">Memuat…</div>}
      </Card>

      {loading && <div className="py-8 text-center text-fg-dim">Memuat data…</div>}
    </div>
  );
}
