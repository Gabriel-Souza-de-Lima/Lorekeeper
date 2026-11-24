CREATE TABLE session_imports (
  document_id TEXT PRIMARY KEY NOT NULL REFERENCES sessions (document_id),
  filename TEXT NOT NULL CHECK (length(filename) BETWEEN 1 AND 150),
  source TEXT NOT NULL CHECK (length(source) <= 500)
) STRICT;
PRAGMA user_version = 14;
