import type Database from 'better-sqlite3'

export function migrateSessionTrash(db: Database.Database) {
  db.transaction(() => {
    const version = db.pragma('user_version', { simple: true })
    if (version === 9 || version === 10 || version === 11) return
    if (version !== 8) throw new Error('Versão de banco incompatível.')
    db.exec(`
      ALTER TABLE sessions ADD COLUMN trashed_at TEXT;
      CREATE INDEX sessions_trashed ON sessions (trashed_at) WHERE trashed_at IS NOT NULL;
      CREATE VIEW active_documents AS
        SELECT d.* FROM documents d LEFT JOIN sessions s ON s.document_id = d.id
        WHERE s.trashed_at IS NULL;
      PRAGMA user_version = 9;
    `)
  }).immediate()
}
