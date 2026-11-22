CREATE TABLE campaigns (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL CHECK (length(trim(name)) > 0),
  description TEXT NOT NULL DEFAULT '',
  game_master TEXT NOT NULL DEFAULT '',
  system TEXT NOT NULL DEFAULT '',
  rules_version TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'finished')),
  archived_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
) STRICT;

CREATE TABLE documents (
  id TEXT PRIMARY KEY NOT NULL,
  campaign_id TEXT NOT NULL REFERENCES campaigns (id),
  type TEXT NOT NULL CHECK (type = 'session'),
  title TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
) STRICT;

CREATE INDEX documents_campaign ON documents (campaign_id, type);

CREATE TABLE sessions (
  document_id TEXT PRIMARY KEY NOT NULL REFERENCES documents (id),
  session_date TEXT NOT NULL,
  fictional_date TEXT NOT NULL DEFAULT '',
  participants TEXT NOT NULL DEFAULT '',
  number INTEGER CHECK (number > 0)
) STRICT;

PRAGMA user_version = 1;
