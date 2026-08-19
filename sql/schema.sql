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
  updatedAt          REAL
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
