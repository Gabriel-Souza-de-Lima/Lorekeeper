import type Database from 'better-sqlite3'

export function migrateSessionImports(db: Database.Database) {
  db.transaction(() => {
    const version = db.pragma('user_version', { simple: true })
    if (version === 14 || version === 15 || version === 16 || version === 17) return
    if (version !== 13) throw new Error('Versão de banco incompatível.')
    db.exec(`
      CREATE TABLE session_imports (
        document_id TEXT PRIMARY KEY NOT NULL REFERENCES sessions (document_id),
        filename TEXT NOT NULL CHECK (length(filename) BETWEEN 1 AND 150),
        source TEXT NOT NULL CHECK (length(source) <= 500)
      ) STRICT;
      PRAGMA user_version = 14;
    `)
  }).immediate()
}
