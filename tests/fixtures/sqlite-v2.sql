CREATE TABLE session_revisions (
  document_id TEXT NOT NULL REFERENCES sessions (document_id),
  version INTEGER NOT NULL CHECK (version > 0),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (document_id, version)
) STRICT;

INSERT INTO session_revisions (document_id, version, title, body, created_at)
SELECT d.id, d.version, d.title, d.body, d.updated_at
FROM documents d JOIN sessions s ON s.document_id = d.id
WHERE d.type = 'session';

CREATE TABLE session_save_receipts (
  document_id TEXT NOT NULL,
  operation_id TEXT NOT NULL,
  revision INTEGER NOT NULL,
  request_hash TEXT NOT NULL,
  response_json TEXT NOT NULL,
  PRIMARY KEY (document_id, operation_id),
  FOREIGN KEY (document_id, revision) REFERENCES session_revisions (document_id, version)
) STRICT;

PRAGMA user_version = 2;
