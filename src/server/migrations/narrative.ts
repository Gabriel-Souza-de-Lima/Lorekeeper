import type Database from 'better-sqlite3'

export function migrateNarrative(db: Database.Database) {
  db.transaction(() => {
    const version = db.pragma('user_version', { simple: true })
    if (version === 16) return
    if (version !== 15) throw new Error('Versão de banco incompatível.')
    db.exec(`
      CREATE UNIQUE INDEX narrative_document_scope ON documents(campaign_id,id);
      CREATE UNIQUE INDEX narrative_pending_scope ON pending_items(campaign_id,id);
      CREATE TABLE narrative_items (
        campaign_id TEXT NOT NULL REFERENCES campaigns(id), id TEXT NOT NULL,
        statement TEXT NOT NULL, nature TEXT NOT NULL CHECK(nature IN ('observation','report','rumor','theory')),
        state TEXT NOT NULL CHECK(state IN ('open','confirmed','disputed','refuted')),
        source TEXT NOT NULL CHECK(json_valid(source)),
        source_document_id TEXT GENERATED ALWAYS AS (json_extract(source, '$.documentId')) VIRTUAL,
        source_revision INTEGER GENERATED ALWAYS AS (json_extract(source, '$.revision')) VIRTUAL,
        version INTEGER NOT NULL CHECK(version > 0), created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
        PRIMARY KEY(campaign_id, id),
        FOREIGN KEY(campaign_id, source_document_id) REFERENCES documents(campaign_id, id),
        FOREIGN KEY(source_document_id, source_revision) REFERENCES session_revisions(document_id, version)
      ) STRICT;
      CREATE INDEX narrative_items_list ON narrative_items(campaign_id, state, updated_at);
      CREATE TABLE narrative_evidence (
        campaign_id TEXT NOT NULL, item_id TEXT NOT NULL, id TEXT NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('supports','contradicts','contextualizes')), source TEXT NOT NULL CHECK(json_valid(source)),
        source_document_id TEXT GENERATED ALWAYS AS (json_extract(source, '$.documentId')) VIRTUAL,
        source_revision INTEGER GENERATED ALWAYS AS (json_extract(source, '$.revision')) VIRTUAL,
        replaces_id TEXT, created_at TEXT NOT NULL,
        PRIMARY KEY(campaign_id, item_id, id), UNIQUE(campaign_id, item_id, replaces_id),
        FOREIGN KEY(campaign_id, source_document_id) REFERENCES documents(campaign_id, id),
        FOREIGN KEY(source_document_id, source_revision) REFERENCES session_revisions(document_id, version),
        FOREIGN KEY(campaign_id, item_id) REFERENCES narrative_items(campaign_id, id),
        FOREIGN KEY(campaign_id, item_id, replaces_id) REFERENCES narrative_evidence(campaign_id, item_id, id)
      ) STRICT;
      CREATE TABLE narrative_history (
        campaign_id TEXT NOT NULL, item_id TEXT NOT NULL, version INTEGER NOT NULL,
        statement TEXT NOT NULL, nature TEXT NOT NULL CHECK(nature IN ('observation','report','rumor','theory')),
        state TEXT NOT NULL CHECK(state IN ('open','confirmed','disputed','refuted')), justification TEXT NOT NULL,
        source TEXT NOT NULL CHECK(json_valid(source)),
        source_document_id TEXT GENERATED ALWAYS AS (json_extract(source, '$.documentId')) VIRTUAL,
        source_revision INTEGER GENERATED ALWAYS AS (json_extract(source, '$.revision')) VIRTUAL,
        decision_evidence_id TEXT, created_at TEXT NOT NULL,
        PRIMARY KEY(campaign_id, item_id, version),
        FOREIGN KEY(campaign_id, source_document_id) REFERENCES documents(campaign_id, id),
        FOREIGN KEY(source_document_id, source_revision) REFERENCES session_revisions(document_id, version),
        FOREIGN KEY(campaign_id, item_id) REFERENCES narrative_items(campaign_id, id),
        FOREIGN KEY(campaign_id, item_id, decision_evidence_id) REFERENCES narrative_evidence(campaign_id, item_id, id)
      ) STRICT;
      CREATE TABLE narrative_document_links (
        campaign_id TEXT NOT NULL, item_id TEXT NOT NULL, document_id TEXT NOT NULL,
        PRIMARY KEY(campaign_id, item_id, document_id),
        FOREIGN KEY(campaign_id, document_id) REFERENCES documents(campaign_id, id),
        FOREIGN KEY(campaign_id, item_id) REFERENCES narrative_items(campaign_id, id)
      ) STRICT;
      CREATE TABLE narrative_pending_links (
        campaign_id TEXT NOT NULL, item_id TEXT NOT NULL, pending_id TEXT NOT NULL,
        PRIMARY KEY(campaign_id, item_id, pending_id),
        FOREIGN KEY(campaign_id, pending_id) REFERENCES pending_items(campaign_id, id),
        FOREIGN KEY(campaign_id, item_id) REFERENCES narrative_items(campaign_id, id)
      ) STRICT;
      CREATE TABLE narrative_save_receipts (
        campaign_id TEXT NOT NULL, item_id TEXT NOT NULL, operation_id TEXT NOT NULL,
        request_hash TEXT NOT NULL, response TEXT NOT NULL CHECK(json_valid(response)),
        PRIMARY KEY(campaign_id, operation_id),
        FOREIGN KEY(campaign_id, item_id) REFERENCES narrative_items(campaign_id, id)
      ) STRICT;
      PRAGMA user_version = 16;
    `)
  }).immediate()
}
