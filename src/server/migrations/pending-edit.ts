import type Database from 'better-sqlite3'

export function migratePendingEdit(db: Database.Database) {
  db.transaction(() => {
    const version = db.pragma('user_version', { simple: true })
    if (version === 12 || version === 13 || version === 14 || version === 15 || version === 16 || version === 17) return
    if (version !== 11) throw new Error('Versão de banco incompatível.')
    db.exec(`
      ALTER TABLE pending_items ADD COLUMN edit_version INTEGER NOT NULL DEFAULT 1 CHECK (edit_version > 0);
      ALTER TABLE pending_item_entities ADD COLUMN removed_at TEXT;
      PRAGMA user_version = 12;
    `)
  }).immediate()
}
