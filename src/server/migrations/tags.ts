import type Database from 'better-sqlite3'

export function migrateTags(db: Database.Database) {
  db.transaction(() => {
    const version = db.pragma('user_version', { simple: true })
    if (version === 7 || version === 8 || version === 9 || version === 10 || version === 11 || version === 12 || version === 13 || version === 14 || version === 15) return
    if (version !== 6) throw new Error('Versão de banco incompatível.')
    db.exec(`
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
    `)
  }).immediate()
}
