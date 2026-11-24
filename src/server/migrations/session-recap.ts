import type Database from 'better-sqlite3'

export function migrateSessionRecap(db: Database.Database) {
  db.transaction(() => {
    const version = db.pragma('user_version', { simple: true })
    if (version === 13) return
    if (version !== 12) throw new Error('Versão de banco incompatível.')
    db.exec(`
      ALTER TABLE sessions ADD COLUMN summary TEXT NOT NULL DEFAULT '' CHECK (length(summary) <= 600);
      ALTER TABLE sessions ADD COLUMN highlights TEXT NOT NULL DEFAULT '' CHECK (length(highlights) <= 2000);
      PRAGMA user_version = 13;
    `)
  }).immediate()
}
