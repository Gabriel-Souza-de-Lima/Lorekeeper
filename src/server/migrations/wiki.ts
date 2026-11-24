import type Database from 'better-sqlite3'

export function migrateWiki(db: Database.Database) {
  const currentVersion = db.pragma('user_version', { simple: true })
  if (currentVersion === 5 || currentVersion === 6 || currentVersion === 7 || currentVersion === 8 || currentVersion === 9 || currentVersion === 10 || currentVersion === 11 || currentVersion === 12 || currentVersion === 13 || currentVersion === 14) return
  // The SQLite table-rebuild procedure requires disabling checks on this connection
  // before the transaction and checking the entire schema before committing.
  db.pragma('foreign_keys = OFF')
  try {
    db.transaction(() => {
      const version = db.pragma('user_version', { simple: true })
      if (version === 5 || version === 6 || version === 7 || version === 8 || version === 9 || version === 10 || version === 11 || version === 12 || version === 13 || version === 14) return
      if (version !== 4) throw new Error('Versão de banco incompatível.')
      db.exec(`
        CREATE TABLE documents_v5 (
          id TEXT PRIMARY KEY NOT NULL,
          campaign_id TEXT REFERENCES campaigns (id),
          type TEXT NOT NULL CHECK (type IN ('session', 'quick_note', 'character', 'npc', 'location', 'quest')),
          title TEXT NOT NULL,
          body TEXT NOT NULL DEFAULT '',
          version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          CHECK (type = 'quick_note' OR campaign_id IS NOT NULL)
        ) STRICT;

        INSERT INTO documents_v5 (id, campaign_id, type, title, body, version, created_at, updated_at)
        SELECT id, campaign_id, type, title, body, version, created_at, updated_at FROM documents;
        DROP TABLE documents;
        ALTER TABLE documents_v5 RENAME TO documents;
        CREATE INDEX documents_campaign ON documents (campaign_id, type);
      `)
      if (db.prepare('PRAGMA foreign_key_check').get()) throw new Error('A migração da wiki violou relações existentes.')
      db.pragma('user_version = 5')
    }).immediate()
  } finally {
    db.pragma('foreign_keys = ON')
  }
}
