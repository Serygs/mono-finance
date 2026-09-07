CREATE TABLE user_preferences (
  user_id TEXT PRIMARY KEY,
  analytics_base_currency_code TEXT NOT NULL DEFAULT 'UAH'
    CHECK (analytics_base_currency_code GLOB '[A-Z][A-Z][A-Z]'),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT
);
