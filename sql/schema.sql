-- ============================================================================
-- Turso (libSQL) schema untuk admin-panel-babft
-- Jalankan SEKALI saja untuk inisialisasi database.
-- All tables use ROWID-less design dengan PRIMARY KEY TEXT/INTEGER.
-- ============================================================================

-- ──────────────────────────────────────────────────────────────────────────
-- users: koleksi utama data user (tracking, presence, ban, soft-delete)
-- ──────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id                  TEXT PRIMARY KEY,
  uid                 TEXT,
  email               TEXT,
  isGuest             INTEGER DEFAULT 0,
  displayName        TEXT,
  photoURL           TEXT,
  lastLoginAt        REAL,
  loginCount         INTEGER DEFAULT 0,
  online             INTEGER DEFAULT 0,
  lastOnlineAt       REAL,
  firstLoginAt       REAL,
  region             TEXT,
  countryCode        TEXT,
  regionName         TEXT,
  isp                TEXT,
  timezone           TEXT,
  ipAddress          TEXT,
  latitude           REAL,
  longitude          REAL,
  accuracy           REAL,
  address            TEXT,
  city               TEXT,
  postal             TEXT,
  deviceId           TEXT,
  device             TEXT,
  os                 TEXT,
  browser            TEXT,
  deviceType         TEXT,
  screen             TEXT,
  language           TEXT,
  userAgent          TEXT,
  previousRegion     TEXT,
  regionChangedAt    REAL,
  regionChangeCount  INTEGER DEFAULT 0,
  flaggedAsVpn       INTEGER DEFAULT 0,
  isProxy            INTEGER DEFAULT 0,
  isHosting          INTEGER DEFAULT 0,
  vpnProvider        TEXT,
  asn                TEXT,
  asOrg              TEXT,
  mobile             INTEGER DEFAULT 0,
  referrer           TEXT,
  searchEngine       TEXT,
  searchQuery        TEXT,
  utmSource          TEXT,
  utmMedium          TEXT,
  utmCampaign        TEXT,
  landingPath        TEXT,
  banned             INTEGER DEFAULT 0,
  bannedAt           REAL,
  bannedReason       TEXT,
  unbannedAt         REAL,
  deleted            INTEGER DEFAULT 0,
  deletedAt          REAL,
  createdAt          REAL,
  updatedAt          REAL,
  gold               REAL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_users_lastLoginAt  ON users(lastLoginAt);
CREATE INDEX IF NOT EXISTS idx_users_online        ON users(online);
CREATE INDEX IF NOT EXISTS idx_users_deviceId     ON users(deviceId);
CREATE INDEX IF NOT EXISTS idx_users_uid          ON users(uid);
CREATE INDEX IF NOT EXISTS idx_users_email        ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_countryCode  ON users(countryCode);
CREATE INDEX IF NOT EXISTS idx_users_region       ON users(region);
CREATE INDEX IF NOT EXISTS idx_users_deleted      ON users(deleted);
CREATE INDEX IF NOT EXISTS idx_users_banned       ON users(banned);
CREATE INDEX IF NOT EXISTS idx_users_createdAt    ON users(createdAt);

-- ──────────────────────────────────────────────────────────────────────────
-- gold_log: history of all gold mutations (grant, deduct, bulk, etc.)
-- ──────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS gold_log (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  uid             TEXT NOT NULL,
  email           TEXT,
  type            TEXT,
  amount          REAL,
  balanceAfter    REAL,
  createdAt       REAL,
  meta             TEXT
);

CREATE INDEX IF NOT EXISTS idx_gold_log_uid        ON gold_log(uid);
CREATE INDEX IF NOT EXISTS idx_gold_log_createdAt  ON gold_log(createdAt);
CREATE INDEX IF NOT EXISTS idx_gold_log_type       ON gold_log(type);

-- ──────────────────────────────────────────────────────────────────────────
-- history: jejak navigasi/aktivitas per user (subcollection di Firestore lama)
-- ──────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS history (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  uid         TEXT NOT NULL,
  timestamp   REAL,
  data        TEXT
);

CREATE INDEX IF NOT EXISTS idx_history_uid        ON history(uid);
CREATE INDEX IF NOT EXISTS idx_history_timestamp  ON history(timestamp);

-- ──────────────────────────────────────────────────────────────────────────
-- admin_logins: catatan login admin (untuk audit trail di /history page)
-- ──────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS admin_logins (
  id          TEXT PRIMARY KEY,
  uid         TEXT NOT NULL,
  email       TEXT NOT NULL,
  role        TEXT NOT NULL,
  timestamp   REAL NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_admin_logins_timestamp ON admin_logins(timestamp);
CREATE INDEX IF NOT EXISTS idx_admin_logins_email     ON admin_logins(email);

-- ──────────────────────────────────────────────────────────────────────────
-- analytics: events tracking (heartbeat, login_failed, error, dll)
-- ──────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS analytics (
  eventId     TEXT PRIMARY KEY,
  timestamp   REAL,
  kind        TEXT,
  deviceId    TEXT,
  data        TEXT
);

CREATE INDEX IF NOT EXISTS idx_analytics_timestamp ON analytics(timestamp);
CREATE INDEX IF NOT EXISTS idx_analytics_kind      ON analytics(kind);
CREATE INDEX IF NOT EXISTS idx_analytics_deviceId ON analytics(deviceId);

-- ──────────────────────────────────────────────────────────────────────────
-- settings: key-value store untuk konfigurasi (lockdown, dll)
-- ──────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value TEXT
);

-- ──────────────────────────────────────────────────────────────────────────
-- ai_access: one row per user — sisa menit AI, timer aktif, total pembelian
-- Ditulis oleh Babftss backend (api/ai-chat.js + lib/gold-system.js).
-- ──────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ai_access (
  uid                       TEXT PRIMARY KEY,
  email                     TEXT,
  remainingMinutes           REAL DEFAULT 0,
  totalMinutesPurchased     REAL DEFAULT 0,
  timerStartedAt            REAL,
  timerExpiresAt            REAL,
  lastBuyAt                 REAL,
  createdAt                 REAL,
  updatedAt                 REAL
);

CREATE INDEX IF NOT EXISTS idx_ai_access_timerExpiresAt ON ai_access(timerExpiresAt);
CREATE INDEX IF NOT EXISTS idx_ai_access_lastBuyAt       ON ai_access(lastBuyAt);
CREATE INDEX IF NOT EXISTS idx_ai_access_email            ON ai_access(email);

-- ──────────────────────────────────────────────────────────────────────────
-- ai_chat_log: history percakapan user dengan AI (buat topik analitik)
-- Ditulis oleh Babftss backend (api/ai-chat.js + lib/analytics-api.js).
-- ──────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ai_chat_log (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  uid         TEXT,
  email       TEXT,
  message     TEXT,
  response    TEXT,
  topic       TEXT,
  createdAt   REAL
);

CREATE INDEX IF NOT EXISTS idx_ai_chat_log_uid        ON ai_chat_log(uid);
CREATE INDEX IF NOT EXISTS idx_ai_chat_log_createdAt  ON ai_chat_log(createdAt);
CREATE INDEX IF NOT EXISTS idx_ai_chat_log_topic       ON ai_chat_log(topic);

-- ──────────────────────────────────────────────────────────────────────────
-- marketplace_products: katalog produk (admin seed via scripts/seed-marketplace.mjs)
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
-- cart_items: item keranjang per user (unique per (uid, productId))
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
-- order_items: snapshot produk + harga per order
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
