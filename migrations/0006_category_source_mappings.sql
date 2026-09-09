CREATE TABLE category_source_mappings (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  original_category_code TEXT NOT NULL CHECK (length(original_category_code) BETWEEN 1 AND 128),
  category_id TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  UNIQUE (user_id, original_category_code),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT
);

CREATE INDEX idx_category_source_mappings_category
  ON category_source_mappings(category_id);
