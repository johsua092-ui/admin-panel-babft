-- ============================================================================
-- Turso schema migration — add Marketplace + Cart + Orders tables
-- Idempotent: safe to run multiple times.
-- ============================================================================

-- ──────────────────────────────────────────────────────────────────────────
-- marketplace_products: katalog produk yang dijual (admin dikelola via seed)
-- ──────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS marketplace_products (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  category      TEXT,
  price         REAL NOT NULL DEFAULT 0,
  rating        REAL DEFAULT 0,
  sales         REAL DEFAULT 0,
  gradient      TEXT,
  imageUrl      TEXT,
  description   TEXT,
  active        INTEGER DEFAULT 1,
  createdAt     REAL,
  updatedAt     REAL
);

CREATE INDEX IF NOT EXISTS idx_marketplace_products_category ON marketplace_products(category);
CREATE INDEX IF NOT EXISTS idx_marketplace_products_active   ON marketplace_products(active);

-- ──────────────────────────────────────────────────────────────────────────
-- cart_items: item keranjang per user (one row per (uid, productId))
-- ──────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cart_items (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  uid          TEXT NOT NULL,
  productId    TEXT NOT NULL,
  quantity     INTEGER NOT NULL DEFAULT 1,
  addedAt      REAL,
  updatedAt    REAL,
  UNIQUE(uid, productId)
);

CREATE INDEX IF NOT EXISTS idx_cart_items_uid        ON cart_items(uid);
CREATE INDEX IF NOT EXISTS idx_cart_items_productId   ON cart_items(productId);

-- ──────────────────────────────────────────────────────────────────────────
-- orders: data order yang sudah checkout
-- ──────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS orders (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  uid         TEXT NOT NULL,
  email       TEXT,
  totalGold   REAL NOT NULL DEFAULT 0,
  itemCount   INTEGER NOT NULL DEFAULT 0,
  status      TEXT NOT NULL DEFAULT 'paid',
  createdAt   REAL NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_orders_uid        ON orders(uid);
CREATE INDEX IF NOT EXISTS idx_orders_createdAt   ON orders(createdAt);
CREATE INDEX IF NOT EXISTS idx_orders_status      ON orders(status);

-- ──────────────────────────────────────────────────────────────────────────
-- order_items: detail item per order (snapshot produk + harga saat checkout)
-- ──────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS order_items (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  orderId       INTEGER NOT NULL,
  uid           TEXT NOT NULL,
  productId     TEXT,
  productName   TEXT,
  price         REAL NOT NULL DEFAULT 0,
  quantity      INTEGER NOT NULL DEFAULT 1,
  subtotal      REAL NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_order_items_orderId ON order_items(orderId);
CREATE INDEX IF NOT EXISTS idx_order_items_uid      ON order_items(uid);
