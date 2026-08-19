-- ============================================================================
-- Turso schema migration — add seller support to marketplace_products
-- Idempotent: safe to run multiple times.
-- ============================================================================

-- Add seller_uid column (nullable — NULL = platform/admin-owned product)
ALTER TABLE marketplace_products ADD COLUMN seller_uid TEXT;

-- Payout rate per-product (default 0.95 = 95% to seller, 5% tax to platform)
-- Override per product if needed (e.g., 1.0 = no tax for certain sellers)
ALTER TABLE marketplace_products ADD COLUMN seller_payout_rate REAL DEFAULT 0.95;

-- Track seller revenue totals (for quick lookup in admin panel)
CREATE TABLE IF NOT EXISTS seller_revenue (
  uid             TEXT PRIMARY KEY,
  email           TEXT,
  displayName     TEXT,
  totalEarned     REAL DEFAULT 0,
  totalTaxPaid    REAL DEFAULT 0,
  totalSales      INTEGER DEFAULT 0,
  totalItemsSold  INTEGER DEFAULT 0,
  lastSaleAt      REAL,
  updatedAt       REAL
);

CREATE INDEX IF NOT EXISTS idx_seller_revenue_email      ON seller_revenue(email);
CREATE INDEX IF NOT EXISTS idx_seller_revenue_totalEarned ON seller_revenue(totalEarned);
