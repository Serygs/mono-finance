-- Mono Finance stores all timestamps as UTC Unix epoch seconds and all money
-- as signed integer minor units. Imported Monobank fields are immutable.

CREATE TABLE users (
  id TEXT PRIMARY KEY,
  is_application_owner INTEGER NOT NULL DEFAULT 1 CHECK (is_application_owner = 1) UNIQUE,
  email TEXT NOT NULL COLLATE NOCASE UNIQUE,
  password_hash TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE currencies (
  code TEXT PRIMARY KEY CHECK (length(code) = 3),
  numeric_code TEXT UNIQUE CHECK (length(numeric_code) = 3),
  minor_unit INTEGER NOT NULL CHECK (minor_unit BETWEEN 0 AND 6),
  display_name TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at INTEGER NOT NULL,
  revoked_at INTEGER,
  last_seen_at INTEGER,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT
);

CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);

CREATE TABLE accounts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  monobank_account_id TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL,
  currency_code TEXT NOT NULL,
  balance_minor INTEGER NOT NULL DEFAULT 0,
  credit_limit_minor INTEGER,
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT,
  FOREIGN KEY (currency_code) REFERENCES currencies(code) ON DELETE RESTRICT
);

CREATE INDEX idx_accounts_user_id ON accounts(user_id);

CREATE TABLE account_cards (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  monobank_card_id TEXT UNIQUE,
  masked_pan TEXT NOT NULL,
  display_name TEXT,
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE RESTRICT,
  UNIQUE (account_id, masked_pan)
);

CREATE INDEX idx_account_cards_account_id ON account_cards(account_id);

CREATE TABLE categories (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  icon TEXT,
  color_token TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT,
  UNIQUE (user_id, name)
);

CREATE TABLE transactions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  account_id TEXT NOT NULL,
  account_card_id TEXT,
  monobank_transaction_id TEXT NOT NULL,
  original_amount_minor INTEGER NOT NULL,
  original_currency_code TEXT NOT NULL,
  original_description TEXT NOT NULL,
  original_mcc INTEGER,
  original_timestamp INTEGER NOT NULL,
  original_category_code TEXT,
  original_category_name TEXT,
  direction TEXT NOT NULL CHECK (direction IN ('income', 'expense')),
  imported_at INTEGER NOT NULL DEFAULT (unixepoch()),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT,
  FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE RESTRICT,
  FOREIGN KEY (account_card_id) REFERENCES account_cards(id) ON DELETE RESTRICT,
  FOREIGN KEY (original_currency_code) REFERENCES currencies(code) ON DELETE RESTRICT,
  UNIQUE (monobank_transaction_id),
  CHECK (
    (direction = 'income' AND original_amount_minor >= 0) OR
    (direction = 'expense' AND original_amount_minor < 0)
  )
);

CREATE INDEX idx_transactions_original_timestamp
  ON transactions(original_timestamp DESC);
CREATE INDEX idx_transactions_account_id
  ON transactions(account_id, original_timestamp DESC);
CREATE INDEX idx_transactions_direction
  ON transactions(direction, original_timestamp DESC);
CREATE INDEX idx_transactions_original_category
  ON transactions(original_category_code, original_timestamp DESC);
CREATE INDEX idx_transactions_monobank_transaction_id
  ON transactions(monobank_transaction_id);

CREATE TRIGGER prevent_imported_transaction_source_update
BEFORE UPDATE OF
  monobank_transaction_id,
  original_amount_minor,
  original_currency_code,
  original_description,
  original_mcc,
  original_timestamp,
  original_category_code,
  original_category_name
ON transactions
FOR EACH ROW
BEGIN
  SELECT RAISE(ABORT, 'Imported transaction source fields are immutable');
END;

CREATE TABLE transaction_adjustments (
  id TEXT PRIMARY KEY,
  transaction_id TEXT NOT NULL UNIQUE,
  user_id TEXT NOT NULL,
  adjusted_amount_minor INTEGER NOT NULL,
  note TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE RESTRICT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT
);

CREATE INDEX idx_transaction_adjustments_user_id
  ON transaction_adjustments(user_id);

CREATE TABLE transaction_exclusions (
  id TEXT PRIMARY KEY,
  transaction_id TEXT NOT NULL UNIQUE,
  user_id TEXT NOT NULL,
  is_excluded INTEGER NOT NULL DEFAULT 1 CHECK (is_excluded IN (0, 1)),
  reason TEXT,
  excluded_at INTEGER NOT NULL DEFAULT (unixepoch()),
  restored_at INTEGER,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE RESTRICT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT,
  CHECK (
    (is_excluded = 1 AND restored_at IS NULL) OR
    (is_excluded = 0 AND restored_at IS NOT NULL)
  )
);

CREATE INDEX idx_transaction_exclusions_active
  ON transaction_exclusions(is_excluded, transaction_id);

CREATE TABLE transaction_category_overrides (
  id TEXT PRIMARY KEY,
  transaction_id TEXT NOT NULL UNIQUE,
  category_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE RESTRICT,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT
);

CREATE INDEX idx_transaction_category_overrides_category_id
  ON transaction_category_overrides(category_id);

CREATE TABLE compensation_links (
  id TEXT PRIMARY KEY,
  expense_transaction_id TEXT NOT NULL,
  compensation_transaction_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  compensated_amount_minor INTEGER NOT NULL CHECK (compensated_amount_minor > 0),
  currency_code TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  FOREIGN KEY (expense_transaction_id) REFERENCES transactions(id) ON DELETE RESTRICT,
  FOREIGN KEY (compensation_transaction_id) REFERENCES transactions(id) ON DELETE RESTRICT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT,
  FOREIGN KEY (currency_code) REFERENCES currencies(code) ON DELETE RESTRICT,
  UNIQUE (expense_transaction_id, compensation_transaction_id),
  CHECK (expense_transaction_id <> compensation_transaction_id)
);

CREATE INDEX idx_compensation_links_expense_transaction_id
  ON compensation_links(expense_transaction_id);
CREATE INDEX idx_compensation_links_compensation_transaction_id
  ON compensation_links(compensation_transaction_id);

CREATE TRIGGER validate_compensation_link_insert
BEFORE INSERT ON compensation_links
FOR EACH ROW
BEGIN
  SELECT (CASE
    WHEN (SELECT direction FROM transactions WHERE id = NEW.expense_transaction_id) <> 'expense'
    THEN RAISE(ABORT, 'Compensation expense must reference an expense transaction')
  END);
  SELECT (CASE
    WHEN (SELECT direction FROM transactions WHERE id = NEW.compensation_transaction_id) <> 'income'
    THEN RAISE(ABORT, 'Compensation must reference an incoming transaction')
  END);
  SELECT (CASE
    WHEN NEW.currency_code <> (
      SELECT original_currency_code FROM transactions WHERE id = NEW.expense_transaction_id
    )
    THEN RAISE(ABORT, 'Compensation currency must match the expense currency')
  END);
  SELECT (CASE
    WHEN NEW.currency_code <> (
      SELECT original_currency_code FROM transactions WHERE id = NEW.compensation_transaction_id
    )
    THEN RAISE(ABORT, 'Compensation currency must match the incoming transaction currency')
  END);
  SELECT (CASE
    WHEN NEW.user_id <> (
      SELECT user_id FROM transactions WHERE id = NEW.expense_transaction_id
    ) OR NEW.user_id <> (
      SELECT user_id FROM transactions WHERE id = NEW.compensation_transaction_id
    )
    THEN RAISE(ABORT, 'Compensation transactions must belong to the same user')
  END);
  SELECT (CASE
    WHEN NEW.compensated_amount_minor > (
      SELECT -original_amount_minor FROM transactions WHERE id = NEW.expense_transaction_id
    ) - COALESCE((
      SELECT SUM(compensated_amount_minor)
      FROM compensation_links
      WHERE expense_transaction_id = NEW.expense_transaction_id
    ), 0)
    THEN RAISE(ABORT, 'Compensation exceeds the original expense')
  END);
  SELECT CASE
    WHEN NEW.compensated_amount_minor > (
      SELECT original_amount_minor FROM transactions WHERE id = NEW.compensation_transaction_id
    ) - COALESCE((
      SELECT SUM(compensated_amount_minor)
      FROM compensation_links
      WHERE compensation_transaction_id = NEW.compensation_transaction_id
    ), 0)
    THEN RAISE(ABORT, 'Compensation exceeds the incoming transaction amount')
  END;
END;

CREATE TABLE sync_state (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'idle' CHECK (status IN ('idle', 'running', 'failed')),
  last_attempt_at INTEGER,
  last_successful_sync_at INTEGER,
  last_synced_transaction_at INTEGER,
  last_error_code TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE RESTRICT
);

CREATE TABLE exchange_rates (
  id TEXT PRIMARY KEY,
  source_currency_code TEXT NOT NULL,
  target_currency_code TEXT NOT NULL,
  rate_numerator INTEGER NOT NULL CHECK (rate_numerator > 0),
  rate_denominator INTEGER NOT NULL CHECK (rate_denominator > 0),
  rate_at INTEGER NOT NULL,
  source TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  FOREIGN KEY (source_currency_code) REFERENCES currencies(code) ON DELETE RESTRICT,
  FOREIGN KEY (target_currency_code) REFERENCES currencies(code) ON DELETE RESTRICT,
  CHECK (source_currency_code <> target_currency_code),
  UNIQUE (source_currency_code, target_currency_code, rate_at, source)
);

CREATE INDEX idx_exchange_rates_lookup
  ON exchange_rates(source_currency_code, target_currency_code, rate_at DESC);
