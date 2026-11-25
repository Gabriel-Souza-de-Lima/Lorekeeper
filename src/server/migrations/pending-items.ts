import type Database from 'better-sqlite3'

export function migratePendingItems(db: Database.Database) {
  db.transaction(() => {
    const version = db.pragma('user_version', { simple: true })
    if (version === 10 || version === 11 || version === 12 || version === 13 || version === 14 || version === 15 || version === 16) return
    if (version !== 9) throw new Error('Versão de banco incompatível.')
    db.exec(`
      CREATE TABLE pending_items (
        id TEXT PRIMARY KEY NOT NULL,
        campaign_id TEXT NOT NULL REFERENCES campaigns (id),
        session_id TEXT REFERENCES sessions (document_id),
        title TEXT NOT NULL CHECK (length(trim(title)) > 0),
        description TEXT NOT NULL DEFAULT '',
        origin TEXT NOT NULL DEFAULT '',
        notes TEXT NOT NULL DEFAULT '',
        type TEXT NOT NULL CHECK (type IN ('clue', 'question', 'promise', 'task', 'other')),
        state TEXT NOT NULL CHECK (state IN ('open', 'investigating', 'resolved', 'discarded')),
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      ) STRICT;
      CREATE INDEX pending_items_campaign ON pending_items (campaign_id, state);
      CREATE TABLE pending_item_entities (
        item_id TEXT NOT NULL REFERENCES pending_items (id),
        document_id TEXT NOT NULL REFERENCES documents (id),
        PRIMARY KEY (item_id, document_id)
      ) STRICT;
      CREATE TABLE pending_item_states (
        id INTEGER PRIMARY KEY,
        item_id TEXT NOT NULL REFERENCES pending_items (id),
        state TEXT NOT NULL CHECK (state IN ('open', 'investigating', 'resolved', 'discarded')),
        created_at TEXT NOT NULL
      ) STRICT;
      CREATE INDEX pending_item_states_item ON pending_item_states (item_id, id);
      PRAGMA user_version = 10;
    `)
  }).immediate()
}
