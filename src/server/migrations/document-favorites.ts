import type Database from 'better-sqlite3'

export function migrateDocumentFavorites(db: Database.Database) {
  db.transaction(() => {
    const version = db.pragma('user_version', { simple: true })
    if (version === 15 || version === 16) return
    if (version !== 14) throw new Error('Versão de banco incompatível.')
    db.exec(`
      CREATE TABLE document_favorites (
        document_id TEXT PRIMARY KEY NOT NULL REFERENCES documents (id),
        favorite INTEGER NOT NULL CHECK (favorite IN (0, 1))
      ) STRICT;
      PRAGMA user_version = 15;
    `)
  }).immediate()
}
