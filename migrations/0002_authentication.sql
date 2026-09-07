-- Durable failed-login state protects the single private account without
-- keeping brute-force counters in Worker memory.

CREATE TABLE login_rate_limits (
  id TEXT PRIMARY KEY,
  identifier_hash TEXT NOT NULL UNIQUE,
  window_started_at INTEGER NOT NULL,
  failed_attempts INTEGER NOT NULL CHECK (failed_attempts > 0),
  locked_until INTEGER,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX idx_login_rate_limits_locked_until
  ON login_rate_limits(locked_until);
