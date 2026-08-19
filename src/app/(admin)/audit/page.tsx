"use client";

import { useEffect, useState } from "react";
import {
  ScrollText,
  RefreshCw,
  Search,
  Filter,
} from "lucide-react";
import { Card, StatCard } from "@/components/ui";

type Entry = {
  id: number;
  timestamp: number;
  actorUid: string;
  actorEmail: string | null;
  action: string;
  targetUid: string | null;
  targetEmail: string | null;
  amount: number | null;
  meta: Record<string, unknown>;
  ip: string | null;
  userAgent: string | null;
};

type Summary = {
  total: number;
  byAction: Array<{ action: string; count: number }>;
  last24h: number;
  last7d: number;
};

const ACTION_LABELS: Record<string, string> = {
  grant: "Grant Gold",
  deduct: "Deduct Gold",
  bulk_grant: "Bulk Grant",
  bulk_deduct: "Bulk Deduct",
  admin_transfer: "Admin Transfer",
  announcement_create: "Announcement Create",
  announcement_edit: "Announcement Edit",
  announcement_delete: "Announcement Delete",
};

function fmtDate(ts: number): string {
  try {
    return new Date(ts).toLocaleString("id-ID", { dateStyle: "short", timeStyle: "medium" });
  } catch {
    return String(ts);
  }
}

function fmtAmount(amount: number | null): string {
  if (amount == null) return "—";
  const sign = amount > 0 ? "+" : "";
  return `${sign}${amount.toLocaleString("id-ID")}`;
}

function fmtAmountColor(amount: number | null): string {
  if (amount == null) return "text-fg-dim";
  if (amount > 0) return "text-ok";
  if (amount < 0) return "text-danger";
  return "text-fg-muted";
}

export default function AuditPage() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterAction, setFilterAction] = useState("");
  const [search, setSearch] = useState("");

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filterAction) params.set("action", filterAction);
      params.set("limit", "200");
      const [entriesRes, sumRes] = await Promise.all([
        fetch(`/api/audit-log?${params.toString()}`),
        fetch("/api/audit-log?summary=1"),
      ]);
      if (!entriesRes.ok) throw new Error(`HTTP ${entriesRes.status}`);
      const j = await entriesRes.json();
      setEntries(j.entries || []);
      if (sumRes.ok) {
        const s = await sumRes.json();
        setSummary(s);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterAction]);

  const filtered = search.trim()
    ? entries.filter((e) => {
        const q = search.toLowerCase();
        return (
          e.actorUid.toLowerCase().includes(q) ||
          (e.actorEmail || "").toLowerCase().includes(q) ||
          (e.targetEmail || "").toLowerCase().includes(q) ||
          e.action.toLowerCase().includes(q)
        );
      })
    : entries;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold">
            <ScrollText className="h-5 w-5 text-accent" />
            Audit Log
          </h1>
          <p className="text-2xs text-fg-dim">
            Catatan semua admin actions (grant, deduct, transfer, announcements).
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-md border border-bg-border bg-bg-panel2 px-3 py-1.5 text-xs hover:text-accent"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {summary && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard icon={ScrollText} label="Total Events" value={summary.total} tone="default" />
          <StatCard icon={RefreshCw} label="Last 24h" value={summary.last24h} tone="default" />
          <StatCard icon={RefreshCw} label="Last 7d" value={summary.last7d} tone="accent" />
          <StatCard icon={Filter} label="Unique Actions" value={summary.byAction.length} tone="default" />
        </div>
      )}

      <Card>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-1 min-w-[200px] items-center gap-2">
            <Search className="h-4 w-4 text-fg-dim" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari actor uid / email / action..."
              className="flex-1 border-none bg-transparent text-sm text-fg-primary outline-none placeholder:text-fg-dim"
            />
          </div>
          <select
            value={filterAction}
            onChange={(e) => setFilterAction(e.target.value)}
            className="rounded-md border border-bg-border bg-bg-panel2 px-3 py-1.5 text-xs text-fg-primary"
          >
            <option value="">All Actions</option>
            {Object.entries(ACTION_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>
      </Card>

      <Card>
        <div className="mb-3 flex items-center gap-2">
          <ScrollText className="h-4 w-4 text-accent" />
          <h2 className="text-sm font-semibold">Recent Events ({filtered.length})</h2>
        </div>
        {error ? (
          <div className="rounded-md border border-danger/40 bg-danger/10 p-4 text-sm text-danger">
            Error: {error}
          </div>
        ) : loading ? (
          <div className="py-10 text-center">
            <RefreshCw className="mx-auto h-6 w-6 animate-spin text-accent" />
            <div className="mt-2 text-xs text-fg-dim">Memuat…</div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center text-xs text-fg-dim">
            Belum ada aktivitas yang dicatat.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-2xs">
              <thead>
                <tr className="border-b border-bg-border text-left text-fg-dim">
                  <th className="py-2 pr-3">Waktu</th>
                  <th className="py-2 pr-3">Actor</th>
                  <th className="py-2 pr-3">Action</th>
                  <th className="py-2 pr-3">Target</th>
                  <th className="py-2 pr-3 text-right">Amount</th>
                  <th className="py-2 pr-3">Note / Meta</th>
                  <th className="py-2 pr-3">IP</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((e) => (
                  <tr key={e.id} className="border-b border-bg-border/40 hover:bg-bg-panel2/30">
                    <td className="whitespace-nowrap py-2 pr-3 text-fg-muted">
                      {fmtDate(e.timestamp)}
                    </td>
                    <td className="py-2 pr-3">
                      <div className="font-medium text-fg-primary">
                        {e.actorEmail || e.actorUid.slice(0, 12) + "…"}
                      </div>
                      <div className="text-fg-dim">{e.actorUid.slice(0, 16)}</div>
                    </td>
                    <td className="py-2 pr-3">
                      <span className="rounded border border-bg-border bg-bg-panel2 px-1.5 py-0.5 font-mono text-accent">
                        {ACTION_LABELS[e.action] || e.action}
                      </span>
                    </td>
                    <td className="py-2 pr-3">
                      {e.targetEmail || (e.targetUid ? e.targetUid.slice(0, 12) + "…" : "—")}
                    </td>
                    <td className={`py-2 pr-3 text-right font-mono font-semibold ${fmtAmountColor(e.amount)}`}>
                      {fmtAmount(e.amount)}
                    </td>
                    <td className="max-w-[280px] truncate py-2 pr-3 text-fg-muted">
                      {e.meta && Object.keys(e.meta).length > 0 ? (
                        <code className="text-2xs">
                          {Object.entries(e.meta)
                            .filter(([k]) => !["newBalance", "balanceAfter"].includes(k))
                            .map(([k, v]) =>
                              `${k}: ${typeof v === "string"
                                ? v.slice(0, 50)
                                : JSON.stringify(v)?.slice(0, 50)}`
                            )
                            .join(" · ")}
                        </code>
                      ) : "—"}
                    </td>
                    <td className="whitespace-nowrap py-2 pr-3 text-fg-dim">
                      {e.ip || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
