-- ============================================================================
-- Turso schema migration — add tables for Analitik Bisnis & AI
-- Idempotent: safe to run multiple times.
-- ============================================================================

-- ──────────────────────────────────────────────────────────────────────────
-- ai_access: one row per user — sisa menit AI, timer aktif, total pembelian
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
