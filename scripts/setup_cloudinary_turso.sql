-- Turso schema for Cloudinary asset metadata
-- Run this against your Turso DB

CREATE TABLE IF NOT EXISTS cloudinary_assets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  asset_key TEXT NOT NULL UNIQUE,         -- local key like "999SW.png" or "game/hsr/character_portrait/1001.png"
  public_id TEXT NOT NULL,                -- Cloudinary public_id
  secure_url TEXT NOT NULL,               -- full HTTPS URL
  resource_type TEXT NOT NULL DEFAULT 'image', -- image | raw | video
  folder TEXT NOT NULL DEFAULT '',        -- cloudinary folder path
  bytes INTEGER,                          -- file size
  format TEXT,                            -- png, jpg, mp3, etc
  width INTEGER,                          -- for images
  height INTEGER,                         -- for images
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_cloudinary_folder ON cloudinary_assets(folder);
CREATE INDEX IF NOT EXISTS idx_cloudinary_key ON cloudinary_assets(asset_key);

-- Optional: track which assets are actively used by the app
CREATE TABLE IF NOT EXISTS asset_usage (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  asset_key TEXT NOT NULL REFERENCES cloudinary_assets(asset_key),
  used_by TEXT NOT NULL,                  -- component or page name
  last_used_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
