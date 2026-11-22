import Database from 'better-sqlite3'

export function openDatabase(path: string) {
  const db = new Database(path)
  try {
    db.pragma('foreign_keys = ON')
    db.pragma('journal_mode = WAL')
    db.pragma('synchronous = FULL')
    db.transaction(() => {
      const version = db.pragma('user_version', { simple: true })
      if (version !== 0 && version !== 1 && version !== 2) throw new Error('Versão de banco incompatível.')
      if (version === 0) db.exec(`
        CREATE TABLE campaigns (
          id TEXT PRIMARY KEY NOT NULL,
          name TEXT NOT NULL CHECK (length(trim(name)) > 0),
          description TEXT NOT NULL DEFAULT '',
          game_master TEXT NOT NULL DEFAULT '',
          system TEXT NOT NULL DEFAULT '',
          rules_version TEXT NOT NULL DEFAULT '',
          notes TEXT NOT NULL DEFAULT '',
          status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'finished')),
          archived_at TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        ) STRICT;

        CREATE TABLE documents (
          id TEXT PRIMARY KEY NOT NULL,
          campaign_id TEXT NOT NULL REFERENCES campaigns (id),
          type TEXT NOT NULL CHECK (type = 'session'),
          title TEXT NOT NULL,
          body TEXT NOT NULL DEFAULT '',
          version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        ) STRICT;

        CREATE INDEX documents_campaign ON documents (campaign_id, type);

        CREATE TABLE sessions (
          document_id TEXT PRIMARY KEY NOT NULL REFERENCES documents (id),
          session_date TEXT NOT NULL,
          fictional_date TEXT NOT NULL DEFAULT '',
          participants TEXT NOT NULL DEFAULT '',
          number INTEGER CHECK (number > 0)
        ) STRICT;

        PRAGMA user_version = 1;
      `)
      if (version < 2) db.exec(`
        CREATE TABLE session_revisions (
          document_id TEXT NOT NULL REFERENCES sessions (document_id),
          version INTEGER NOT NULL CHECK (version > 0),
          title TEXT NOT NULL,
          body TEXT NOT NULL,
          created_at TEXT NOT NULL,
          PRIMARY KEY (document_id, version)
        ) STRICT;

        INSERT INTO session_revisions (document_id, version, title, body, created_at)
        SELECT d.id, d.version, d.title, d.body, d.updated_at
        FROM documents d JOIN sessions s ON s.document_id = d.id
        WHERE d.type = 'session';

        CREATE TABLE session_save_receipts (
          document_id TEXT NOT NULL,
          operation_id TEXT NOT NULL,
          revision INTEGER NOT NULL,
          request_hash TEXT NOT NULL,
          response_json TEXT NOT NULL,
          PRIMARY KEY (document_id, operation_id),
          FOREIGN KEY (document_id, revision) REFERENCES session_revisions (document_id, version)
        ) STRICT;

        PRAGMA user_version = 2;
      `)
    }).immediate()
    return db
  } catch (error) {
    db.close()
    throw error
  }
}
