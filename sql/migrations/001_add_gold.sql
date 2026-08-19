-- ============================================================================
-- Turso schema migration — add gold support for admin panel coins API
-- Idempotent: safe to run multiple times.
-- ============================================================================

-- Add gold column to users (default 0)
ALTER TABLE users ADD COLUMN gold REAL DEFAULT 0;

-- gold_log: history of all gold mutations (grant, deduct, transfer, etc.)
CREATE TABLE IF NOT EXISTS gold_log (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  uid             TEXT NOT NULL,
  email           TEXT,
  type            TEXT,
  amount          REAL,
  balanceAfter    REAL,
  createdAt       REAL,
  meta            TEXT
);

CREATE INDEX IF NOT EXISTS idx_gold_log_uid       ON gold_log(uid);
CREATE INDEX IF NOT EXISTS idx_gold_log_createdAt ON gold_log(createdAt);
CREATE INDEX IF NOT EXISTS idx_gold_log_type      ON gold_log(type);
