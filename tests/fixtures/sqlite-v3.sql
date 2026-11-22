CREATE TABLE documents_v3 (
  id TEXT PRIMARY KEY NOT NULL,
  campaign_id TEXT REFERENCES campaigns (id),
  type TEXT NOT NULL CHECK (type IN ('session', 'quick_note')),
  title TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  CHECK (type = 'quick_note' OR campaign_id IS NOT NULL)
) STRICT;

INSERT INTO documents_v3 (id, campaign_id, type, title, body, version, created_at, updated_at)
SELECT id, campaign_id, type, title, body, version, created_at, updated_at FROM documents;
DROP TABLE documents;
ALTER TABLE documents_v3 RENAME TO documents;
CREATE INDEX documents_campaign ON documents (campaign_id, type);
PRAGMA user_version = 3;
