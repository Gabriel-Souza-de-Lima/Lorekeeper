CREATE TABLE document_links (
  source_id TEXT NOT NULL REFERENCES documents (id),
  target_id TEXT NOT NULL REFERENCES documents (id),
  origin TEXT NOT NULL CHECK (origin IN ('manual', 'markdown')),
  CHECK (source_id <> target_id),
  PRIMARY KEY (source_id, target_id, origin)
) STRICT;
CREATE INDEX document_links_target ON document_links (target_id, origin, source_id);
PRAGMA user_version = 4;
