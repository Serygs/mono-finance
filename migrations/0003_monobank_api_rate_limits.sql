-- Monobank Personal API endpoints permit no more than one request per
-- 60-second window. Persist reservations so parallel Worker isolates share it.

CREATE TABLE monobank_api_rate_limits (
  scope TEXT PRIMARY KEY CHECK (length(scope) BETWEEN 1 AND 100),
  next_allowed_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);
