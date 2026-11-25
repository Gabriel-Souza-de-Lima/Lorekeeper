CREATE TABLE document_favorites (
  document_id TEXT PRIMARY KEY NOT NULL REFERENCES documents (id),
  favorite INTEGER NOT NULL CHECK (favorite IN (0, 1))
) STRICT;
PRAGMA user_version = 15;
