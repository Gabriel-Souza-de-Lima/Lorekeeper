import type Database from 'better-sqlite3'

export function migrateWikiOverview(db: Database.Database) {
  db.transaction(() => {
    const version = db.pragma('user_version', { simple: true })
    if (version === 6 || version === 7 || version === 8 || version === 9 || version === 10 || version === 11 || version === 12 || version === 13 || version === 14 || version === 15 || version === 16) return
    if (version !== 5) throw new Error('Versão de banco incompatível.')
    db.exec(`
      ALTER TABLE documents ADD COLUMN quest_closed INTEGER NOT NULL DEFAULT 0
        CHECK (quest_closed IN (0, 1) AND (type = 'quest' OR quest_closed = 0));
      ALTER TABLE campaigns ADD COLUMN featured_character_id TEXT REFERENCES documents (id);
      PRAGMA user_version = 6;
    `)
  }).immediate()
}
