-- ============================================================================
-- Turso schema migration — add audit_log table
-- Idempotent: safe to run multiple times.
-- ============================================================================

-- ──────────────────────────────────────────────────────────────────────────
-- audit_log: catatan semua admin actions (grant, deduct, ban, announce, dll)
-- Ditulis oleh Babftss backend (lib/auditLog.js), dibaca oleh admin panel.
-- ──────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_log (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp     REAL NOT NULL,
  actorUid      TEXT NOT NULL,
  actorEmail    TEXT,
  action        TEXT NOT NULL,
  targetUid     TEXT,
  targetEmail   TEXT,
  amount        REAL,
  meta          TEXT,
  ip            TEXT,
  userAgent     TEXT
);

CREATE INDEX IF NOT EXISTS idx_audit_log_timestamp  ON audit_log(timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_log_actorUid   ON audit_log(actorUid);
CREATE INDEX IF NOT EXISTS idx_audit_log_action      ON audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_log_targetUid   ON audit_log(targetUid);
