import { migratePerspectives } from './migrations/perspectives.ts'
import { migrateNarrative } from './migrations/narrative.ts'
import { migrateDocumentFavorites } from './migrations/document-favorites.ts'
import { migrateSessionImports } from './migrations/session-imports.ts'
import { migrateSessionRecap } from './migrations/session-recap.ts'
import { migratePendingEdit } from './migrations/pending-edit.ts'
import Database from 'better-sqlite3'
import { migrateWikiOverview } from './migrations/wiki-overview.ts'
import { migrateWiki } from './migrations/wiki.ts'
import { migrateTags } from './migrations/tags.ts'
import { migrateSearch } from './migrations/search.ts'
import { migrateSessionTrash } from './migrations/session-trash.ts'
import { migrateAttachments } from './migrations/attachments.ts'
import { migratePendingItems } from './migrations/pending-items.ts'

export function openDatabase(path: string) {
  const db = new Database(path)
  try {
    db.pragma('foreign_keys = ON')
    db.pragma('journal_mode = WAL')
    db.pragma('synchronous = FULL')
    db.transaction(() => {
      const version = db.pragma('user_version', { simple: true })
      if (version === 3 || version === 4 || version === 5 || version === 6 || version === 7 || version === 8 || version === 9 || version === 10 || version === 11 || version === 12 || version === 13 || version === 14 || version === 15 || version === 16 || version === 17) return
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
    migrateInbox(db)
    migrateDocumentLinks(db)
    migrateWiki(db)
    migrateWikiOverview(db)
    migrateTags(db)
    migrateSearch(db)
    migrateSessionTrash(db)
    migratePendingItems(db)
    migrateAttachments(db)
    migratePendingEdit(db)
    migrateSessionRecap(db)
    migrateSessionImports(db)
    migrateDocumentFavorites(db)
    migrateNarrative(db)
    migratePerspectives(db)
    return db
  } catch (error) {
    db.close()
    throw error
  }
}


// SQLite requires replacing the table to widen its type constraint.
// Foreign keys are suspended only on this connection and checked before commit.
function migrateInbox(db: Database.Database) {
  const currentVersion = db.pragma('user_version', { simple: true })
  if (currentVersion === 3 || currentVersion === 4 || currentVersion === 5 || currentVersion === 6 || currentVersion === 7 || currentVersion === 8 || currentVersion === 9 || currentVersion === 10 || currentVersion === 11 || currentVersion === 12 || currentVersion === 13 || currentVersion === 14 || currentVersion === 15 || currentVersion === 16 || currentVersion === 17) return
  db.pragma('foreign_keys = OFF')
  try {
    db.transaction(() => {
      const version = db.pragma('user_version', { simple: true })
      if (version === 3 || version === 4 || version === 5 || version === 6 || version === 7 || version === 8 || version === 9 || version === 10 || version === 11 || version === 12 || version === 13 || version === 14 || version === 15 || version === 16 || version === 17) return
      if (version !== 2) throw new Error('Versão de banco incompatível.')
      db.exec(`
        CREATE TABLE documents_v3 (
          id TEXT PRIMARY KEY NOT NULL,
          campaign_id TEXT REFERENCES campaigns (id),
          type TEXT NOT NULL CHECK (type IN ('session', 'quick_note')),
          title TEXT NOT NULL,
          body TEXT NOT NULL DEFAULT '',
          version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          CHECK (type = 'quick_note' OR campaign_id IS NOT NULL)
        ) STRICT;

        INSERT INTO documents_v3 (id, campaign_id, type, title, body, version, created_at, updated_at)
        SELECT id, campaign_id, type, title, body, version, created_at, updated_at FROM documents;
        DROP TABLE documents;
        ALTER TABLE documents_v3 RENAME TO documents;
        CREATE INDEX documents_campaign ON documents (campaign_id, type);
        PRAGMA user_version = 3;
      `)
      if (db.prepare('PRAGMA foreign_key_check').get()) throw new Error('A migração da caixa de entrada violou relações existentes.')
    }).immediate()
  } finally {
    db.pragma('foreign_keys = ON')
  }
}

function migrateDocumentLinks(db: Database.Database) {
  db.transaction(() => {
    const version = db.pragma('user_version', { simple: true })
    if (version === 4 || version === 5 || version === 6 || version === 7 || version === 8 || version === 9 || version === 10 || version === 11 || version === 12 || version === 13 || version === 14 || version === 15 || version === 16 || version === 17) return
    if (version !== 3) throw new Error('Versão de banco incompatível.')
    db.exec(`
      CREATE TABLE document_links (
        source_id TEXT NOT NULL REFERENCES documents (id),
        target_id TEXT NOT NULL REFERENCES documents (id),
        origin TEXT NOT NULL CHECK (origin IN ('manual', 'markdown')),
        CHECK (source_id <> target_id),
        PRIMARY KEY (source_id, target_id, origin)
      ) STRICT;
      CREATE INDEX document_links_target ON document_links (target_id, origin, source_id);
      PRAGMA user_version = 4;
    `)
  }).immediate()
}
