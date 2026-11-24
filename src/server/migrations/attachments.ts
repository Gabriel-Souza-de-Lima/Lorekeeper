import type Database from 'better-sqlite3'

export function migrateAttachments(db: Database.Database) {
  db.transaction(() => {
    const version = db.pragma('user_version', { simple: true })
    if (version === 11 || version === 12 || version === 13 || version === 14 || version === 15) return
    if (version !== 10) throw new Error('Versão de banco incompatível.')
    db.exec(`
      CREATE TABLE attachments (
        id TEXT PRIMARY KEY NOT NULL,
        campaign_id TEXT NOT NULL REFERENCES campaigns (id),
        name TEXT NOT NULL,
        filename TEXT NOT NULL,
        origin TEXT NOT NULL,
        mime TEXT NOT NULL CHECK (mime IN ('image/png', 'application/pdf')),
        bytes BLOB NOT NULL CHECK (length(bytes) BETWEEN 1 AND 10485760),
        sha256 TEXT NOT NULL,
        created_at TEXT NOT NULL,
        UNIQUE (id, campaign_id)
      ) STRICT;
      CREATE INDEX attachments_campaign ON attachments (campaign_id);
      CREATE TABLE attachment_associations (
        attachment_id TEXT NOT NULL,
        campaign_id TEXT NOT NULL REFERENCES campaigns (id),
        document_id TEXT REFERENCES documents (id),
        target_key TEXT NOT NULL DEFAULT '' CHECK (target_key = coalesce(document_id, '')),
        removed_at TEXT,
        PRIMARY KEY (attachment_id, target_key),
        FOREIGN KEY (attachment_id, campaign_id) REFERENCES attachments (id, campaign_id)
      ) STRICT;
      CREATE INDEX attachment_associations_target ON attachment_associations (campaign_id, target_key)
        WHERE removed_at IS NULL;
      PRAGMA user_version = 11;
    `)
  }).immediate()
}
