ALTER TABLE sync_state ADD COLUMN backfill_start_at INTEGER;
ALTER TABLE sync_state ADD COLUMN backfill_cursor_at INTEGER;
ALTER TABLE sync_state ADD COLUMN lease_expires_at INTEGER;

CREATE INDEX idx_sync_state_claim
  ON sync_state(status, lease_expires_at, last_attempt_at);
