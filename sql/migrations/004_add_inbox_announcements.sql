-- ============================================================================
-- Turso schema migration — add inbox + announcements tables
-- Idempotent: safe to run multiple times.
-- ============================================================================

-- ──────────────────────────────────────────────────────────────────────────
-- inbox: pesan ke user (transfer_in, admin_grant, announcement)
-- ──────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS inbox (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  uid             TEXT NOT NULL,
  fromUid         TEXT,
  fromEmail       TEXT,
  fromName        TEXT,
  type            TEXT,
  amount          REAL DEFAULT 0,
  tax             REAL DEFAULT 0,
  note            TEXT,
  announcementId  INTEGER,
  announcementBody TEXT,
  read            INTEGER DEFAULT 0,
  createdAt       REAL
);

CREATE INDEX IF NOT EXISTS idx_inbox_uid          ON inbox(uid);
CREATE INDEX IF NOT EXISTS idx_inbox_uid_read      ON inbox(uid, read);
CREATE INDEX IF NOT EXISTS idx_inbox_createdAt     ON inbox(createdAt);
CREATE INDEX IF NOT EXISTS idx_inbox_announcementId ON inbox(announcementId);

-- ──────────────────────────────────────────────────────────────────────────
-- announcements: pesan admin yang dikirim ke semua user inbox
-- ──────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS announcements (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  title           TEXT,
  body            TEXT,
  createdByUid    TEXT,
  createdByEmail  TEXT,
  createdByName   TEXT,
  delivered       INTEGER DEFAULT 0,
  deliveredAt     REAL,
  recipientCount   INTEGER DEFAULT 0,
  createdAt       REAL,
  updatedAt       REAL
);

CREATE INDEX IF NOT EXISTS idx_announcements_createdAt ON announcements(createdAt);
