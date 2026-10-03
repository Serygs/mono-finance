-- Legacy timestamps cannot prove a balance refresh or processed interval.
ALTER TABLE accounts ADD COLUMN balance_updated_at INTEGER;
CREATE TABLE transaction_sync_windows (
  account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  from_epoch_seconds INTEGER NOT NULL,
  to_epoch_seconds INTEGER NOT NULL,
  completed_at INTEGER NOT NULL,
  PRIMARY KEY (account_id, from_epoch_seconds, to_epoch_seconds),
  CHECK (from_epoch_seconds <= to_epoch_seconds)
);
