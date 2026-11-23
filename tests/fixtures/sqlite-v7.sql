CREATE TABLE tags (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 60),
  normalized_name TEXT NOT NULL UNIQUE CHECK (length(trim(normalized_name)) > 0)
) STRICT;
CREATE TABLE document_tags (
  document_id TEXT NOT NULL REFERENCES documents (id),
  tag_id TEXT NOT NULL REFERENCES tags (id),
  PRIMARY KEY (document_id, tag_id)
) STRICT;
CREATE INDEX document_tags_by_tag ON document_tags (tag_id, document_id);
PRAGMA user_version = 7;
