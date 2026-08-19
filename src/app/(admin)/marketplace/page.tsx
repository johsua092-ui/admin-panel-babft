"use client";

import { useEffect, useState } from "react";
import {
  ShoppingCart,
  Coins,
  TrendingUp,
  Users,
  RefreshCw,
  Package,
  Crown,
  Receipt,
  ArrowUpRight,
} from "lucide-react";
import { StatCard, Card } from "@/components/ui";

type Totals = {
  totalOrders: number;
  totalRevenue: number;
  totalTax: number;
  totalSellerPayout: number;
  totalItemsSold: number;
  uniqueBuyers: number;
  uniqueSellers: number;
};

type TopProduct = {
  productId: string;
  productName: string;
  category: string | null;
  price: number;
  quantitySold: number;
  revenue: number;
  gradient: string | null;
  seller_uid: string | null;
};

type TopBuyer = {
  uid: string;
  email: string | null;
  displayName: string | null;
  orderCount: number;
  totalSpent: number;
  itemsBought: number;
  lastPurchaseAt: string | null;
};

type TopSeller = {
  uid: string;
  email: string | null;
  displayName: string | null;
  totalEarned: number;
  totalTaxPaid: number;
  totalSales: number;
  totalItemsSold: number;
  lastSaleAt: string | null;
};

type RecentOrder = {
  orderId: number;
  uid: string;
  email: string | null;
  totalGold: number;
  itemCount: number;
  status: string;
  createdAt: string | null;
  items: Array<{
    productId: string;
    productName: string;
    price: number;
    quantity: number;
    subtotal: number;
  }>;
};

type Stats = {
  generatedAt: number;
  totals: Totals;
  topProducts: TopProduct[];
  topBuyers: TopBuyer[];
  topSellers: TopSeller[];
  recentOrders: RecentOrder[];
};

function fmt(n: number): string {
  return n.toLocaleString("id-ID", { maximumFractionDigits: 2 });
}

function fmtDate(s: string | null): string {
  if (!s) return "—";
  try {
    return new Date(s).toLocaleString("id-ID", { dateStyle: "short", timeStyle: "short" });
  } catch {
    return s;
  }
}

export default function MarketplacePage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedOrder, setExpandedOrder] = useState<number | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch("/api/marketplace-stats");
      if (!r.ok) {
        setError(`HTTP ${r.status}`);
        setStats(null);
      } else {
        const j = await r.json();
        setStats(j);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setStats(null);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  if (loading && !stats) {
    return (
      <div className="flex items-center justify-center py-20">
        <RefreshCw className="h-6 w-6 animate-spin text-accent" />
        <span className="ml-2 text-sm text-fg-muted">Memuat statistik marketplace…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <div className="rounded-md border border-danger/40 bg-danger/10 p-4 text-sm text-danger">
          Error: {error}
        </div>
        <button
          onClick={load}
          className="rounded-md border border-bg-border bg-bg-panel2 px-3 py-2 text-sm hover:text-accent"
        >
          Coba lagi
        </button>
      </div>
    );
  }

  if (!stats) return null;

  const t = stats.totals;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold">
            <ShoppingCart className="h-5 w-5 text-accent" />
            Marketplace Analytics
          </h1>
          <p className="text-2xs text-fg-dim">
            Statistik penjualan, pembeli, dan pendapatan seller (pajak 5%).
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

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <StatCard
          icon={Receipt}
          label="Total Order"
          value={fmt(t.totalOrders)}
          tone="default"
        />
        <StatCard
          icon={Coins}
          label="Total Revenue"
          value={fmt(t.totalRevenue)}
          hint="coins"
          tone="accent"
        />
        <StatCard
          icon={TrendingUp}
          label="Pajak Platform (5%)"
          value={fmt(t.totalTax)}
          hint="coins"
          tone="danger"
        />
        <StatCard
          icon={ArrowUpRight}
          label="Dibayar ke Seller"
          value={fmt(t.totalSellerPayout)}
          hint="coins"
          tone="ok"
        />
        <StatCard
          icon={Package}
          label="Item Terjual"
          value={fmt(t.totalItemsSold)}
          tone="default"
        />
        <StatCard
          icon={Users}
          label="Pembeli Unik"
          value={fmt(t.uniqueBuyers)}
          tone="default"
        />
        <StatCard
          icon={Crown}
          label="Seller Aktif"
          value={fmt(t.uniqueSellers)}
          tone="accent"
        />
        <StatCard
          icon={ShoppingCart}
          label="Rata-rata / Order"
          value={t.totalOrders > 0 ? fmt(t.totalRevenue / t.totalOrders) : "0"}
          hint="coins"
          tone="default"
        />
      </div>

      {/* Top Products */}
      <Card>
        <div className="mb-3 flex items-center gap-2">
          <Package className="h-4 w-4 text-accent" />
          <h2 className="text-sm font-semibold">Produk Terlaris</h2>
        </div>
        {stats.topProducts.length === 0 ? (
          <div className="py-8 text-center text-xs text-fg-dim">Belum ada penjualan.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-bg-border text-left text-2xs text-fg-dim">
                  <th className="py-2 pr-3">#</th>
                  <th className="py-2 pr-3">Produk</th>
                  <th className="py-2 pr-3">Kategori</th>
                  <th className="py-2 pr-3 text-right">Harga</th>
                  <th className="py-2 pr-3 text-right">Terjual</th>
                  <th className="py-2 pr-3 text-right">Revenue</th>
                  <th className="py-2 pr-3">Seller</th>
                </tr>
              </thead>
              <tbody>
                {stats.topProducts.map((p, i) => (
                  <tr key={p.productId} className="border-b border-bg-border/50 hover:bg-bg-panel2/50">
                    <td className="py-2 pr-3 text-fg-dim">{i + 1}</td>
                    <td className="py-2 pr-3">
                      <div className="flex items-center gap-2">
                        {p.gradient && (
                          <div
                            className="h-6 w-6 rounded flex-shrink-0"
                            style={{ background: p.gradient }}
                          />
                        )}
                        <span className="font-medium text-fg-primary">{p.productName}</span>
                      </div>
                    </td>
                    <td className="py-2 pr-3 text-fg-muted">{p.category || "—"}</td>
                    <td className="py-2 pr-3 text-right text-fg-muted">{fmt(p.price)}</td>
                    <td className="py-2 pr-3 text-right text-info font-semibold">{fmt(p.quantitySold)}</td>
                    <td className="py-2 pr-3 text-right text-accent font-semibold">{fmt(p.revenue)}</td>
                    <td className="py-2 pr-3 text-2xs text-fg-dim">
                      {p.seller_uid ? p.seller_uid.slice(0, 12) + "…" : "platform"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Top Buyers */}
        <Card>
          <div className="mb-3 flex items-center gap-2">
            <Users className="h-4 w-4 text-info" />
            <h2 className="text-sm font-semibold">Top Pembeli</h2>
          </div>
          {stats.topBuyers.length === 0 ? (
            <div className="py-8 text-center text-xs text-fg-dim">Belum ada pembeli.</div>
          ) : (
            <div className="space-y-2">
              {stats.topBuyers.map((b, i) => (
                <div
                  key={b.uid}
                  className="flex items-center gap-3 rounded-md border border-bg-border/50 bg-bg-panel2/30 p-2.5"
                >
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-bg-panel2 text-2xs font-bold text-fg-muted">
                    {i + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-xs font-medium text-fg-primary">
                      {b.displayName || b.email || b.uid.slice(0, 16)}
                    </div>
                    <div className="text-2xs text-fg-dim">
                      {b.email || "—"} · {b.orderCount} order · {b.itemsBought} item
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-bold text-accent">{fmt(b.totalSpent)}</div>
                    <div className="text-2xs text-fg-dim">coins</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Top Sellers */}
        <Card>
          <div className="mb-3 flex items-center gap-2">
            <Crown className="h-4 w-4 text-accent" />
            <h2 className="text-sm font-semibold">Top Seller (after 5% tax)</h2>
          </div>
          {stats.topSellers.length === 0 ? (
            <div className="py-8 text-center text-xs text-fg-dim">
              Belum ada seller dengan penjualan. Set <code className="text-fg-muted">seller_uid</code> di
              tabel <code className="text-fg-muted">marketplace_products</code> untuk mulai.
            </div>
          ) : (
            <div className="space-y-2">
              {stats.topSellers.map((s, i) => (
                <div
                  key={s.uid}
                  className="flex items-center gap-3 rounded-md border border-bg-border/50 bg-bg-panel2/30 p-2.5"
                >
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-accent/10 text-2xs font-bold text-accent">
                    {i + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-xs font-medium text-fg-primary">
                      {s.displayName || s.email || s.uid.slice(0, 16)}
                    </div>
                    <div className="text-2xs text-fg-dim">
                      {s.totalSales} sale · {s.totalItemsSold} item · tax {fmt(s.totalTaxPaid)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-bold text-ok">{fmt(s.totalEarned)}</div>
                    <div className="text-2xs text-fg-dim">coins net</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Recent Orders */}
      <Card>
        <div className="mb-3 flex items-center gap-2">
          <Receipt className="h-4 w-4 text-info" />
          <h2 className="text-sm font-semibold">Order Terbaru (last 20)</h2>
        </div>
        {stats.recentOrders.length === 0 ? (
          <div className="py-8 text-center text-xs text-fg-dim">Belum ada order.</div>
        ) : (
          <div className="space-y-2">
            {stats.recentOrders.map((o) => {
              const isOpen = expandedOrder === o.orderId;
              return (
                <div key={o.orderId} className="rounded-md border border-bg-border/50 bg-bg-panel2/30">
                  <button
                    onClick={() => setExpandedOrder(isOpen ? null : o.orderId)}
                    className="flex w-full items-center gap-3 p-3 text-left hover:bg-bg-panel2/50"
                  >
                    <div className="flex h-7 w-7 items-center justify-center rounded bg-bg-panel2 text-2xs font-bold text-fg-muted">
                      #{o.orderId}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-xs font-medium text-fg-primary">
                        {o.email || o.uid.slice(0, 16)}
                      </div>
                      <div className="text-2xs text-fg-dim">
                        {o.itemCount} item · {fmtDate(o.createdAt)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-bold text-accent">{fmt(o.totalGold)}</div>
                      <div className="text-2xs text-fg-dim">coins · {o.status}</div>
                    </div>
                    <ArrowUpRight
                      className={`h-3.5 w-3.5 text-fg-dim transition-transform ${isOpen ? "rotate-90" : ""}`}
                    />
                  </button>
                  {isOpen && (
                    <div className="border-t border-bg-border/50 p-3">
                      <table className="w-full text-2xs">
                        <thead>
                          <tr className="text-left text-fg-dim">
                            <th className="py-1 pr-3">Produk</th>
                            <th className="py-1 pr-3 text-right">Harga</th>
                            <th className="py-1 pr-3 text-right">Qty</th>
                            <th className="py-1 pr-3 text-right">Subtotal</th>
                          </tr>
                        </thead>
                        <tbody>
                          {o.items.map((it, i) => (
                            <tr key={i} className="border-t border-bg-border/30">
                              <td className="py-1 pr-3 text-fg-primary">{it.productName}</td>
                              <td className="py-1 pr-3 text-right text-fg-muted">{fmt(it.price)}</td>
                              <td className="py-1 pr-3 text-right text-info">{it.quantity}</td>
                              <td className="py-1 pr-3 text-right text-accent">{fmt(it.subtotal)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
