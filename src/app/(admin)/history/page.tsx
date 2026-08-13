"use client";

import { useEffect, useState } from "react";
import {
  History as HistoryIcon, UserCog, KeyRound, Clock, ShieldCheck, RefreshCw,
} from "lucide-react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { StatCard, Card, Badge } from "@/components/ui";
import { fmtDateTime } from "@/lib/format";

type AdminSummary = { email: string; role: string; count: number; last: number; first: number };
type LoginLog = { id: string; uid: string; email: string; role: string; timestamp: number };

export default function HistoryPage() {
  const [logs, setLogs] = useState<LoginLog[]>([]);
  const [admins, setAdmins] = useState<AdminSummary[]>([]);
  const [registeredAdmins, setRegisteredAdmins] = useState<{ email: string; role: string; active: boolean }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      const r = await fetch("/api/admin/logs");
      if (!r.ok) throw new Error(`API ${r.status}`);
      const j = await r.json();
      setLogs(j.logs || []);
      setAdmins(j.admins || []);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  // Daftar admin terdaftar dari koleksi `admins` (backend-fb691).
  useEffect(() => {
    (async () => {
      try {
        const snap = await getDocs(collection(db, "admins"));
        setRegisteredAdmins(
          snap.docs.map((d) => {
            const data = d.data() as { email?: string; role?: string; active?: boolean };
            return { email: data.email ?? d.id, role: data.role ?? "anggota", active: data.active !== false };
          })
        );
      } catch (_) {}
    })();
  }, []);

  useEffect(() => { load(); }, []);

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="anim-fade-up text-xl font-bold">History</h1>
          <p className="text-xs text-fg-dim">Log aktivitas login.</p>
        </div>
        <button onClick={load} className="inline-flex items-center gap-1.5 rounded border border-bg-border px-3 py-1.5 text-xs text-fg-muted hover:text-fg-primary">
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </button>
      </div>

      {error && <div className="rounded border border-[#5b1f1f] bg-[#331414] p-4 text-sm text-danger">Gagal: {error}</div>}

      {/* Ringkasan */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon={KeyRound} label="Total login" value={logs.length} tone="accent" />
        <StatCard icon={UserCog} label="Akun unik" value={admins.length} />
        <StatCard icon={ShieldCheck} label="Akun terdaftar" value={registeredAdmins.length} tone="ok" />
        <StatCard icon={Clock} label="Login terakhir" value={logs[0] ? fmtDateTime(logs[0].timestamp) : "—"} />
      </div>

      {/* Daftar admin */}
      <Card title="Daftar Akun">
        {registeredAdmins.length === 0 && admins.length === 0 && (
          <div className="text-sm text-fg-dim">Belum ada data akun.</div>
        )}
        <div className="flex flex-col gap-2">
          {registeredAdmins.map((a, i) => (
            <div key={i} className="flex items-center gap-3 rounded border border-bg-border bg-bg-panel2 px-3 py-2">
              <UserCog className="h-4 w-4 text-fg-dim" />
              <span className="min-w-0 truncate text-xs">{a.email}</span>
              <Badge tone="info">{a.role}</Badge>
              {a.active ? <Badge tone="ok">aktif</Badge> : <Badge tone="danger">nonaktif</Badge>}
            </div>
          ))}
          {/* admin yang pernah login tapi belum tentu di koleksi admins */}
          {admins.filter((a) => !registeredAdmins.some((r) => r.email.toLowerCase() === a.email.toLowerCase())).map((a, i) => (
            <div key={"l" + i} className="flex items-center gap-3 rounded border border-bg-border bg-bg-panel2 px-3 py-2">
              <UserCog className="h-4 w-4 text-fg-dim" />
              <span className="min-w-0 truncate text-xs">{a.email}</span>
              <Badge tone="info">{a.role}</Badge>
              <Badge tone="default">pernah login</Badge>
            </div>
          ))}
        </div>
      </Card>

      {/* Statistik login per admin */}
      <Card title="Login per Akun">
        {admins.length === 0 && <div className="text-sm text-fg-dim">Belum ada aktivitas login.</div>}
        <div className="overflow-x-auto">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Email</th>
                <th>Role</th>
                <th className="text-right">Jumlah login</th>
                <th>Login pertama</th>
                <th>Login terakhir</th>
              </tr>
            </thead>
            <tbody>
              {admins.map((a, i) => (
                <tr key={i}>
                  <td className="text-xs">{a.email}</td>
                  <td><Badge tone="info">{a.role}</Badge></td>
                  <td className="text-right text-xs tabular-nums">{a.count}</td>
                  <td className="text-xs tabular-nums text-fg-dim">{fmtDateTime(a.first)}</td>
                  <td className="text-xs tabular-nums text-fg-dim">{fmtDateTime(a.last)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Riwayat login detail */}
      <Card title="Riwayat Login">
        {logs.length === 0 && <div className="text-sm text-fg-dim">Belum ada riwayat login.</div>}
        <div className="overflow-x-auto">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Waktu</th>
                <th>Jam</th>
                <th>Tanggal</th>
                <th>Email</th>
                <th>Role</th>
              </tr>
            </thead>
            <tbody>
              {logs.slice(0, 100).map((l) => {
                const d = new Date(l.timestamp);
                const time = d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
                const date = d.toLocaleDateString("id-ID", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });
                return (
                  <tr key={l.id}>
                    <td className="text-xs tabular-nums text-fg-dim">{fmtDateTime(l.timestamp)}</td>
                    <td className="text-xs tabular-nums">{time}</td>
                    <td className="text-xs">{date}</td>
                    <td className="text-xs">{l.email}</td>
                    <td><Badge tone="info">{l.role}</Badge></td>
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
