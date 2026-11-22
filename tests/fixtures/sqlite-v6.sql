ALTER TABLE documents ADD COLUMN quest_closed INTEGER NOT NULL DEFAULT 0
  CHECK (quest_closed IN (0, 1) AND (type = 'quest' OR quest_closed = 0));
ALTER TABLE campaigns ADD COLUMN featured_character_id TEXT REFERENCES documents (id);
PRAGMA user_version = 6;
