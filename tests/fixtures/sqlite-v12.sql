ALTER TABLE pending_items ADD COLUMN edit_version INTEGER NOT NULL DEFAULT 1 CHECK (edit_version > 0);
ALTER TABLE pending_item_entities ADD COLUMN removed_at TEXT;
PRAGMA user_version = 12;
