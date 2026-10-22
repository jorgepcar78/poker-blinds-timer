-- migrations/0001_live_sessions.sql
CREATE TABLE IF NOT EXISTS live_sessions (
  id TEXT PRIMARY KEY,
  host_token TEXT NOT NULL,
  payload TEXT NOT NULL,
  updated_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_live_sessions_expires_at
  ON live_sessions (expires_at);
