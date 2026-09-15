-- Owner-managed SVG visuals are metadata, never part of immutable imported rows.
CREATE TABLE visual_assets (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  object_key TEXT NOT NULL UNIQUE,
  asset_type TEXT NOT NULL CHECK (asset_type IN ('merchant-icon', 'category-icon')),
  mime_type TEXT NOT NULL CHECK (mime_type = 'image/svg+xml'),
  size_bytes INTEGER NOT NULL CHECK (size_bytes BETWEEN 1 AND 65536),
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT
);
CREATE INDEX idx_visual_assets_user_id ON visual_assets(user_id);

CREATE TABLE merchant_visuals (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  merchant_key TEXT NOT NULL,
  display_name TEXT NOT NULL,
  icon_asset_id TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT,
  FOREIGN KEY (icon_asset_id) REFERENCES visual_assets(id) ON DELETE RESTRICT,
  UNIQUE (user_id, merchant_key)
);
CREATE INDEX idx_merchant_visuals_asset_id ON merchant_visuals(icon_asset_id);

CREATE TABLE category_visuals (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  category_key TEXT NOT NULL,
  icon_asset_id TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT,
  FOREIGN KEY (icon_asset_id) REFERENCES visual_assets(id) ON DELETE RESTRICT,
  UNIQUE (user_id, category_key)
);
CREATE INDEX idx_category_visuals_asset_id ON category_visuals(icon_asset_id);
