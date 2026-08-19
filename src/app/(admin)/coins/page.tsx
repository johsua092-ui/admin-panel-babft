"use client";

import { useEffect, useState } from "react";
import {
  Coins, Users, ArrowDownToLine, ArrowUpFromLine, RefreshCw,
  Shield, Search, History, AlertTriangle, Infinity as InfinityIcon,
} from "lucide-react";
import { Card } from "@/components/ui";
import { useAuth } from "@/context/AuthContext";

interface Member {
  uid: string;
  email: string | null;
  displayName: string | null;
  gold: number;
  updatedAt: string | null;
  isAdmin: boolean;
}

interface GoldLog {
  id: string;
  uid: string;
  email?: string | null;
  type: string;
  amount: number;
  balanceAfter: number;
  createdAt: string | null;
  meta: Record<string, any>;
}

export default function CoinsPage() {
  const { user, getIdToken } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [logs, setLogs] = useState<GoldLog[]>([]);
  const [totalGold, setTotalGold] = useState(0);
  const [totalMembers, setTotalMembers] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Actions
  const [selectedUid, setSelectedUid] = useState<string | null>(null);
  const [actionAmount, setActionAmount] = useState("");
  const [actionNote, setActionNote] = useState("");
  const [actionType, setActionType] = useState<"grant" | "deduct">("grant");
  const [actionLoading, setActionLoading] = useState(false);
  const [actionResult, setActionResult] = useState<string | null>(null);

  // Bulk grant
  const [bulkAmount, setBulkAmount] = useState("");
  const [bulkNote, setBulkNote] = useState("");
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkResult, setBulkResult] = useState<string | null>(null);

  // Bulk deduct
  const [bulkDeductAmount, setBulkDeductAmount] = useState("");
  const [bulkDeductNote, setBulkDeductNote] = useState("");
  const [bulkDeductLoading, setBulkDeductLoading] = useState(false);
  const [bulkDeductResult, setBulkDeductResult] = useState<string | null>(null);

  // Search
  const [search, setSearch] = useState("");
  const [logFilter, setLogFilter] = useState("");

  async function getAuthHeaders(): Promise<Record<string, string>> {
    const token = await getIdToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const headers = await getAuthHeaders();
      const r = await fetch("/api/coins", { headers });
      if (r.status === 401) { setError("Unauthorized — silakan login ulang"); setLoading(false); return; }
      if (!r.ok) throw new Error(`API ${r.status}`);
      const data = await r.json();
      setMembers(data.members || []);
      setLogs(data.logs || []);
      setTotalGold(data.totalGold || 0);
      setTotalMembers(data.totalMembers || 0);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal memuat data");
    }
    setLoading(false);
  }

  useEffect(() => { if (user) loadData(); }, [user]);

  async function doAction() {
    if (!selectedUid || !actionAmount) return;
    setActionLoading(true);
    setActionResult(null);
    try {
      const headers = await getAuthHeaders();
      const r = await fetch("/api/coins", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify({
          action: actionType,
          targetUid: selectedUid,
          amount: parseInt(actionAmount, 10),
          note: actionNote || undefined,
        }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Gagal");
      setActionResult(`${actionType === "grant" ? "✅ Granted" : "🔴 Deducted"} ${actionAmount} gold — new balance: ${data.newBalance}`);
      loadData();
    } catch (e) {
      setActionResult(`❌ ${e instanceof Error ? e.message : "Gagal"}`);
    }
    setActionLoading(false);
  }

  async function doBulkGrant() {
    if (!bulkAmount) return;
    setBulkLoading(true);
    setBulkResult(null);
    try {
      const headers = await getAuthHeaders();
      const r = await fetch("/api/coins", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify({
          action: "bulk-grant",
          amount: parseInt(bulkAmount, 10),
          note: bulkNote || "Bulk grant from admin panel",
        }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Gagal");
      setBulkResult(`✅ ${data.count} member dapat ${bulkAmount} gold (total: ${data.totalGranted})`);
      loadData();
    } catch (e) {
      setBulkResult(`❌ ${e instanceof Error ? e.message : "Gagal"}`);
    }
    setBulkLoading(false);
  }

  async function doBulkDeduct() {
    if (!bulkDeductAmount) return;
    setBulkDeductLoading(true);
    setBulkDeductResult(null);
    try {
      const headers = await getAuthHeaders();
      const r = await fetch("/api/coins", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify({
          action: "bulk-deduct",
          amount: parseInt(bulkDeductAmount, 10),
          note: bulkDeductNote || "Bulk deduct from admin panel",
        }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Gagal");
      setBulkDeductResult(`🔴 ${data.count} member dikurangi — total deducted: ${data.totalDeducted}`);
      loadData();
    } catch (e) {
      setBulkDeductResult(`❌ ${e instanceof Error ? e.message : "Gagal"}`);
    }
    setBulkDeductLoading(false);
  }

  const filteredMembers = members
    .filter((m) => {
      const q = search.toLowerCase();
      if (!q) return true;
      return (m.email || "").toLowerCase().includes(q) ||
        (m.displayName || "").toLowerCase().includes(q) ||
        m.uid.toLowerCase().includes(q);
    })
    .sort((a, b) => b.gold - a.gold);

  const filteredLogs = logs.filter((l) => {
    const q = logFilter.toLowerCase();
    if (!q) return true;
    return l.type.toLowerCase().includes(q) || l.uid.toLowerCase().includes(q) ||
      (l.email || "").toLowerCase().includes(q) ||
      (l.meta?.note || "").toLowerCase().includes(q);
  });

  const selectedMember = members.find((m) => m.uid === selectedUid);

  // Build a uid→email map for log display
  const uidEmailMap = new Map<string, string>();
  for (const m of members) {
    if (m.email) uidEmailMap.set(m.uid, m.email);
  }

  if (loading) return <div className="py-16 text-center text-fg-dim">Memuat data coin…</div>;
  if (error) return <div className="rounded border border-[#5b1f1f] bg-[#331414] p-4 text-sm text-danger">Error: {error}</div>;

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="anim-fade-up text-xl font-bold flex items-center gap-2">
            <Coins className="h-5 w-5 text-yellow-400" /> Coin Manager
          </h1>
          <p className="text-xs text-fg-dim">
            {totalMembers} member · {totalGold} total gold beredar
          </p>
        </div>
        <button onClick={loadData} className="inline-flex items-center gap-1.5 rounded border border-bg-border px-3 py-1.5 text-xs text-fg-muted hover:text-fg-primary">
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <div className="flex items-center gap-3 p-3">
            <Coins className="h-8 w-8 text-yellow-400" />
            <div>
              <div className="text-2xs text-fg-dim">Total Gold</div>
              <div className="text-lg font-bold text-yellow-400">{totalGold}</div>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3 p-3">
            <Users className="h-8 w-8 text-blue-400" />
            <div>
              <div className="text-2xs text-fg-dim">Members</div>
              <div className="text-lg font-bold text-blue-400">{totalMembers}</div>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3 p-3">
            <History className="h-8 w-8 text-green-400" />
            <div>
              <div className="text-2xs text-fg-dim">Transactions</div>
              <div className="text-lg font-bold text-green-400">{logs.length}</div>
            </div>
          </div>
        </Card>
      </div>

      {/* Bulk Distribute */}
      <Card>
        <div className="p-4">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-orange-400">
            <Users className="h-4 w-4" /> Bulk Distribute ke Semua Member
          </h2>
          <div className="flex flex-wrap items-center gap-2">
            <input type="number" placeholder="Amount" value={bulkAmount} onChange={(e) => setBulkAmount(e.target.value)}
              className="w-28 rounded border border-bg-border bg-bg-panel px-3 py-2 text-sm font-bold text-yellow-400 focus:border-accent focus:outline-none" />
            <input type="text" placeholder="Note (opsional)" value={bulkNote} onChange={(e) => setBulkNote(e.target.value)}
              className="flex-1 min-w-[150px] rounded border border-bg-border bg-bg-panel px-3 py-2 text-xs text-fg-primary focus:border-accent focus:outline-none" />
            <button onClick={doBulkGrant} disabled={bulkLoading || !bulkAmount}
              className="rounded bg-orange-600 px-4 py-2 text-xs font-bold text-white hover:bg-orange-500 disabled:opacity-40">
              {bulkLoading ? "…" : "Distribute"}
            </button>
            {[10, 50, 100, 500].map((q) => (
              <button key={q} onClick={() => setBulkAmount(String(q))}
                className="rounded border border-bg-border px-2 py-1 text-2xs font-semibold text-fg-muted hover:text-fg-primary">{q}</button>
            ))}
          </div>
          {bulkResult && <div className="mt-2 text-xs text-ok">{bulkResult}</div>}
        </div>
      </Card>

      {/* Bulk Deduct (Withdraw from all) */}
      <Card>
        <div className="p-4">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-red-400">
            <ArrowUpFromLine className="h-4 w-4" /> Bulk Tarik Gold dari Semua Member
          </h2>
          <div className="mb-2 flex items-center gap-1 text-2xs text-warn">
            <AlertTriangle className="h-3 w-3" /> Anti-abuse: tarik gold dari semua member sekaligus. Tidak akan jadi negatif.
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input type="number" placeholder="Amount" value={bulkDeductAmount} onChange={(e) => setBulkDeductAmount(e.target.value)}
              className="w-28 rounded border border-bg-border bg-bg-panel px-3 py-2 text-sm font-bold text-red-400 focus:border-accent focus:outline-none" />
            <input type="text" placeholder="Alasan (opsional)" value={bulkDeductNote} onChange={(e) => setBulkDeductNote(e.target.value)}
              className="flex-1 min-w-[150px] rounded border border-bg-border bg-bg-panel px-3 py-2 text-xs text-fg-primary focus:border-accent focus:outline-none" />
            <button onClick={doBulkDeduct} disabled={bulkDeductLoading || !bulkDeductAmount}
              className="rounded bg-red-700 px-4 py-2 text-xs font-bold text-white hover:bg-red-600 disabled:opacity-40">
              {bulkDeductLoading ? "…" : "Tarik Semua"}
            </button>
          </div>
          {bulkDeductResult && <div className="mt-2 text-xs">{bulkDeductResult}</div>}
        </div>
      </Card>

      {/* Member list + Action panel */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Member list */}
        <div className="lg:col-span-2">
          <Card>
            <div className="p-3">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-bold">Member Gold Balances</h2>
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-fg-dim" />
                  <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari email/nama..."
                    className="w-48 rounded border border-bg-border bg-bg-panel py-1.5 pl-7 pr-2 text-xs focus:border-accent focus:outline-none" />
                </div>
              </div>
              <div className="max-h-[400px] overflow-y-auto">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Member</th>
                      <th className="text-right">Gold</th>
                      <th>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredMembers.map((m, i) => (
                      <tr key={m.uid} className={selectedUid === m.uid ? "bg-bg-panel2" : ""}>
                        <td className="text-2xs text-fg-dim">{i + 1}</td>
                        <td>
                          <div className="text-xs font-medium">{m.displayName || "—"}</div>
                          <div className="text-2xs text-fg-dim">{m.email || m.uid.slice(0, 20)}</div>
                        </td>
                        <td className="text-right font-bold text-yellow-400">
                          {m.isAdmin ? (
                            <span className="inline-flex items-center">
                              <InfinityIcon className="h-4 w-4" strokeWidth={2.5} />
                            </span>
                          ) : (
                            <>{m.gold}</>
                          )}
                        </td>
                        <td>
                          <div className="flex gap-1">
                            <button onClick={() => { setSelectedUid(m.uid); setActionType("grant"); setActionAmount(""); setActionNote(""); }}
                              className="rounded border border-green-800 px-2 py-0.5 text-2xs text-green-400 hover:bg-green-900/30">
                              <ArrowDownToLine className="h-3 w-3" />
                            </button>
                            <button onClick={() => { setSelectedUid(m.uid); setActionType("deduct"); setActionAmount(""); setActionNote(""); }}
                              className="rounded border border-red-800 px-2 py-0.5 text-2xs text-red-400 hover:bg-red-900/30">
                              <ArrowUpFromLine className="h-3 w-3" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </Card>
        </div>

        {/* Action panel */}
        <div>
          <Card>
            <div className="p-4">
              {selectedMember ? (
                <>
                  <h2 className="mb-2 flex items-center gap-2 text-sm font-bold" style={{ color: actionType === "grant" ? "#4ade80" : "#f87171" }}>
                    {actionType === "grant" ? <ArrowDownToLine className="h-4 w-4" /> : <ArrowUpFromLine className="h-4 w-4" />}
                    {actionType === "grant" ? "Grant Gold" : "Tarik Gold"}
                  </h2>
                  <div className="mb-3 rounded border border-bg-border bg-bg-panel p-2">
                    <div className="text-xs font-medium">{selectedMember.displayName || "—"}</div>
                    <div className="text-2xs text-fg-dim">{selectedMember.email}</div>
                    <div className="text-xs font-bold text-yellow-400">{selectedMember.gold} gold</div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <input type="number" placeholder="Jumlah gold" value={actionAmount} onChange={(e) => setActionAmount(e.target.value)}
                      className="rounded border border-bg-border bg-bg-panel px-3 py-2 text-sm font-bold text-yellow-400 focus:border-accent focus:outline-none" />
                    <input type="text" placeholder="Catatan" value={actionNote} onChange={(e) => setActionNote(e.target.value)}
                      className="rounded border border-bg-border bg-bg-panel px-3 py-2 text-xs text-fg-primary focus:border-accent focus:outline-none" />
                    {actionType === "deduct" && (
                      <div className="flex items-center gap-1 text-2xs text-warn">
                        <AlertTriangle className="h-3 w-3" /> Gold akan dikurangi dari saldo member
                      </div>
                    )}
                    <button onClick={doAction} disabled={actionLoading || !actionAmount}
                      className={`rounded px-4 py-2 text-xs font-bold text-white disabled:opacity-40 ${actionType === "grant" ? "bg-green-600 hover:bg-green-500" : "bg-red-600 hover:bg-red-500"}`}>
                      {actionLoading ? "…" : (actionType === "grant" ? `+ ${actionAmount || "?"} Gold` : `- ${actionAmount || "?"} Gold`)}
                    </button>
                  </div>
                  {actionResult && <div className="mt-2 text-xs">{actionResult}</div>}
                </>
              ) : (
                <div className="text-center text-xs text-fg-dim">
                  <Shield className="mx-auto mb-2 h-8 w-8 text-fg-muted" />
                  Pilih member dari tabel<br />lalu klik <ArrowDownToLine className="inline h-3 w-3" /> atau <ArrowUpFromLine className="inline h-3 w-3" />
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Transaction history */}
      <Card>
        <div className="p-3">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-bold">
              <History className="h-4 w-4" /> Riwayat Transaksi
            </h2>
            <input value={logFilter} onChange={(e) => setLogFilter(e.target.value)} placeholder="Filter type/email/uid..."
              className="w-48 rounded border border-bg-border bg-bg-panel py-1.5 px-2 text-xs focus:border-accent focus:outline-none" />
          </div>
          <div className="max-h-[300px] overflow-y-auto">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Waktu</th>
                  <th>Type</th>
                  <th>User</th>
                  <th className="text-right">Amount</th>
                  <th className="text-right">Balance</th>
                  <th>Note</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map((l) => {
                  const isPositive = l.amount > 0;
                  const typeColors: Record<string, string> = {
                    admin_grant: "text-green-400",
                    admin_deduct: "text-red-400",
                    transfer_in: "text-blue-400",
                    transfer_out: "text-red-400",
                    spend_ai: "text-orange-400",
                    earn_ai: "text-cyan-400",
                  };
                  const displayEmail = l.email || uidEmailMap.get(l.uid) || l.uid.slice(0, 16) + "…";
                  return (
                    <tr key={l.id}>
                      <td className="text-2xs tabular-nums text-fg-dim">
                        {l.createdAt ? new Date(l.createdAt).toLocaleString("id-ID", { dateStyle: "short", timeStyle: "short" }) : "—"}
                      </td>
                      <td className={`text-2xs font-semibold ${typeColors[l.type] || "text-fg-muted"}`}>{l.type}</td>
                      <td className="text-2xs text-fg-dim" title={l.uid}>{displayEmail}</td>
                      <td className={`text-right text-xs font-bold ${isPositive ? "text-green-400" : "text-red-400"}`}>
                        {isPositive ? "+" : ""}{l.amount}
                      </td>
                      <td className="text-right text-2xs text-fg-dim">{l.balanceAfter}</td>
                      <td className="max-w-[120px] truncate text-2xs text-fg-dim">
                        {l.meta?.note || l.meta?.bulkGrant ? "bulk grant" : l.meta?.bulkDeduct ? "bulk deduct" : ""}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </Card>
    </div>
  );
}
