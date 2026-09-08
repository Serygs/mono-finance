-- User-owned effective category mappings apply to immutable imported source
-- category codes. Existing and future transactions resolve them at read time.

CREATE TABLE category_source_mappings (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  original_category_code TEXT NOT NULL,
  category_id TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT,
  UNIQUE (user_id, original_category_code)
);

CREATE INDEX idx_category_source_mappings_category_id
  ON category_source_mappings(category_id);
