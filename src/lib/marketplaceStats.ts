import { createClient, type InValue } from "@libsql/client";

function client() {
  const url = process.env.TURSO_DATABASE_URL;
  const token = process.env.TURSO_AUTH_TOKEN;
  if (!url) throw new Error("TURSO_DATABASE_URL belum diset.");
  return createClient({ url, authToken: token });
}

function num(v: unknown): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v !== "" && !Number.isNaN(Number(v))) return Number(v);
  if (typeof v === "bigint") return Number(v);
  return 0;
}

function toISO(v: unknown): string | null {
  if (v == null) return null;
  const n = typeof v === "number" ? v : typeof v === "string" && !Number.isNaN(Number(v)) ? Number(v) : null;
  if (n == null) return null;
  try { return new Date(n < 1e12 ? n * 1000 : n).toISOString(); } catch { return null; }
}

export type MarketplaceStats = {
  generatedAt: number;
  totals: {
    totalOrders: number;
    totalRevenue: number;
    totalTax: number;
    totalSellerPayout: number;
    totalItemsSold: number;
    uniqueBuyers: number;
    uniqueSellers: number;
  };
  topProducts: Array<{
    productId: string;
    productName: string;
    category: string | null;
    price: number;
    quantitySold: number;
    revenue: number;
    gradient: string | null;
    seller_uid: string | null;
  }>;
  topBuyers: Array<{
    uid: string;
    email: string | null;
    displayName: string | null;
    orderCount: number;
    totalSpent: number;
    itemsBought: number;
    lastPurchaseAt: string | null;
  }>;
  topSellers: Array<{
    uid: string;
    email: string | null;
    displayName: string | null;
    totalEarned: number;
    totalTaxPaid: number;
    totalSales: number;
    totalItemsSold: number;
    lastSaleAt: string | null;
  }>;
  recentOrders: Array<{
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
  }>;
};

async function safeQuery<T>(fn: () => Promise<T>, label: string): Promise<T | null> {
  try {
    return await fn();
  } catch (e) {
    console.error(`[marketplaceStats] gagal baca ${label}:`, e instanceof Error ? e.message : e);
    return null;
  }
}

export async function getMarketplaceStats(): Promise<MarketplaceStats> {
  const c = client();

  // ── Aggregated totals ──
  const totalsRow = await safeQuery(
    () => c.execute(
      `SELECT
         COUNT(*) as totalOrders,
         COALESCE(SUM(totalGold), 0) as totalRevenue,
         COALESCE(SUM(itemCount), 0) as totalItemsSold,
         COUNT(DISTINCT uid) as uniqueBuyers
       FROM orders`
    ).then(r => r.rows[0]),
    "totals"
  );

  // ── Top products (most sold) ──
  const topProductsRows = await safeQuery(
    () => c.execute(
      `SELECT
         oi.productId,
         oi.productName,
         p.category,
         p.price,
         p.gradient,
         p.seller_uid,
         SUM(oi.quantity) as quantitySold,
         SUM(oi.subtotal) as revenue
       FROM order_items oi
       LEFT JOIN marketplace_products p ON p.id = oi.productId
       GROUP BY oi.productId
       ORDER BY quantitySold DESC, revenue DESC
       LIMIT 10`
    ).then(r => r.rows),
    "topProducts"
  );

  // ── Top buyers ──
  const topBuyersRows = await safeQuery(
    () => c.execute(
      `SELECT
         o.uid,
         o.email,
         u.displayName,
         COUNT(o.id) as orderCount,
         COALESCE(SUM(o.totalGold), 0) as totalSpent,
         COALESCE(SUM(o.itemCount), 0) as itemsBought,
         MAX(o.createdAt) as lastPurchaseAt
       FROM orders o
       LEFT JOIN users u ON u.id = o.uid
       GROUP BY o.uid
       ORDER BY totalSpent DESC
       LIMIT 10`
    ).then(r => r.rows),
    "topBuyers"
  );

  // ── Top sellers (from seller_revenue aggregate table) ──
  const topSellersRows = await safeQuery(
    () => c.execute(
      `SELECT
         uid,
         email,
         displayName,
         totalEarned,
         totalTaxPaid,
         totalSales,
         totalItemsSold,
         lastSaleAt
       FROM seller_revenue
       ORDER BY totalEarned DESC
       LIMIT 10`
    ).then(r => r.rows),
    "topSellers"
  );

  // ── Recent orders with items ──
  const recentOrdersRows = await safeQuery(
    () => c.execute(
      `SELECT
         o.id as orderId,
         o.uid,
         o.email,
         o.totalGold,
         o.itemCount,
         o.status,
         o.createdAt
       FROM orders o
       ORDER BY COALESCE(o.createdAt, 0) DESC
       LIMIT 20`
    ).then(r => r.rows),
    "recentOrders"
  );

  // For each recent order, fetch its items
  let recentOrdersWithItems: Array<{
    orderId: number;
    uid: string;
    email: string | null;
    totalGold: number;
    itemCount: number;
    status: string;
    createdAt: string | null;
    items: Array<{ productId: string; productName: string; price: number; quantity: number; subtotal: number }>;
  }> = [];
  if (recentOrdersRows) {
    for (const row of recentOrdersRows) {
      const itemsRows = await safeQuery(
        () => c.execute({
          sql: `SELECT productId, productName, price, quantity, subtotal
                FROM order_items WHERE orderId = ?`,
          args: [Number(row.id ?? row.orderId)],
        }).then(r => r.rows),
        `orderItems-${row.id}`
      );
      recentOrdersWithItems.push({
        orderId: Number(row.id ?? row.orderId),
        uid: String(row.uid),
        email: row.email ? String(row.email) : null,
        totalGold: num(row.totalGold),
        itemCount: num(row.itemCount),
        status: row.status ? String(row.status) : "paid",
        createdAt: toISO(row.createdAt),
        items: (itemsRows || []).map(it => ({
          productId: String(it.productId),
          productName: String(it.productName),
          price: num(it.price),
          quantity: num(it.quantity),
          subtotal: num(it.subtotal),
        })),
      });
    }
  }

  // Compute tax from gold_log where type=marketplace_purchase
  const taxRow = await safeQuery(
    () => c.execute(
      `SELECT
         COALESCE(SUM(ABS(amount)), 0) as totalGoldSpentOnPurchases
       FROM gold_log WHERE type = 'marketplace_purchase'`
    ).then(r => r.rows[0]),
    "tax"
  );

  const totalRevenue = totalsRow ? num(totalsRow.totalRevenue) : 0;
  const totalTaxFromSellers = topSellersRows
    ? topSellersRows.reduce((s, r) => s + num(r.totalTaxPaid), 0)
    : 0;
  const totalSellerPayout = topSellersRows
    ? topSellersRows.reduce((s, r) => s + num(r.totalEarned), 0)
    : 0;

  return {
    generatedAt: Date.now(),
    totals: {
      totalOrders: totalsRow ? num(totalsRow.totalOrders) : 0,
      totalRevenue,
      totalTax: totalTaxFromSellers,
      totalSellerPayout,
      totalItemsSold: totalsRow ? num(totalsRow.totalItemsSold) : 0,
      uniqueBuyers: totalsRow ? num(totalsRow.uniqueBuyers) : 0,
      uniqueSellers: topSellersRows ? topSellersRows.length : 0,
    },
    topProducts: (topProductsRows || []).map((row) => ({
      productId: String(row.productId),
      productName: String(row.productName),
      category: row.category ? String(row.category) : null,
      price: num(row.price),
      quantitySold: num(row.quantitySold),
      revenue: num(row.revenue),
      gradient: row.gradient ? String(row.gradient) : null,
      seller_uid: row.seller_uid ? String(row.seller_uid) : null,
    })),
    topBuyers: (topBuyersRows || []).map((row) => ({
      uid: String(row.uid),
      email: row.email ? String(row.email) : null,
      displayName: row.displayName ? String(row.displayName) : null,
      orderCount: num(row.orderCount),
      totalSpent: num(row.totalSpent),
      itemsBought: num(row.itemsBought),
      lastPurchaseAt: toISO(row.lastPurchaseAt),
    })),
    topSellers: (topSellersRows || []).map((row) => ({
      uid: String(row.uid),
      email: row.email ? String(row.email) : null,
      displayName: row.displayName ? String(row.displayName) : null,
      totalEarned: num(row.totalEarned),
      totalTaxPaid: num(row.totalTaxPaid),
      totalSales: num(row.totalSales),
      totalItemsSold: num(row.totalItemsSold),
      lastSaleAt: toISO(row.lastSaleAt),
    })),
    recentOrders: recentOrdersWithItems,
  };
}
