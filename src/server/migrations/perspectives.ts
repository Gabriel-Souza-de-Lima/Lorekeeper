import type Database from 'better-sqlite3'

export function migratePerspectives(db: Database.Database) {
  db.transaction(() => {
    const version = db.pragma('user_version', { simple: true })
    if (version === 17) return
    if (version !== 16) throw new Error('Versão de banco incompatível.')
    db.exec(`
      CREATE TABLE perspective_heads (
        campaign_id TEXT NOT NULL, item_id TEXT NOT NULL, version INTEGER NOT NULL CHECK(version > 0),
        coverage TEXT NOT NULL CHECK(coverage IN ('undefined','none')),
        PRIMARY KEY(campaign_id,item_id),
        FOREIGN KEY(campaign_id,item_id) REFERENCES narrative_items(campaign_id,id)
      ) STRICT;
      CREATE TABLE perspective_events (
        campaign_id TEXT NOT NULL, item_id TEXT NOT NULL, id TEXT NOT NULL, version INTEGER NOT NULL CHECK(version > 0),
        character_id TEXT, kind TEXT CHECK(kind IN ('heard','contested','evidence')),
        evidence_id TEXT, session_id TEXT REFERENCES sessions(document_id), session_title TEXT,
        fictional_date TEXT NOT NULL, note TEXT NOT NULL, statement TEXT NOT NULL,
        replaces_id TEXT, coverage TEXT NOT NULL CHECK(coverage IN ('undefined','none')), created_at TEXT NOT NULL,
        PRIMARY KEY(campaign_id,item_id,id), UNIQUE(campaign_id,item_id,version), UNIQUE(campaign_id,item_id,replaces_id),
        CHECK ((kind IS NOT NULL AND (kind = 'evidence') = (evidence_id IS NOT NULL))
          OR (kind IS NULL AND character_id IS NULL AND evidence_id IS NULL AND replaces_id IS NULL AND session_id IS NULL)),
        FOREIGN KEY(campaign_id,item_id) REFERENCES perspective_heads(campaign_id,item_id),
        FOREIGN KEY(campaign_id,character_id) REFERENCES documents(campaign_id,id),
        FOREIGN KEY(campaign_id,session_id) REFERENCES documents(campaign_id,id),
        FOREIGN KEY(campaign_id,item_id,evidence_id) REFERENCES narrative_evidence(campaign_id,item_id,id),
        FOREIGN KEY(campaign_id,item_id,replaces_id) REFERENCES perspective_events(campaign_id,item_id,id)
      ) STRICT;
      CREATE INDEX perspective_subject ON perspective_events(campaign_id,character_id,item_id);
      CREATE TRIGGER perspective_character_type BEFORE INSERT ON perspective_events
      WHEN NEW.character_id IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM documents WHERE campaign_id=NEW.campaign_id AND id=NEW.character_id AND type='character'
      ) BEGIN SELECT RAISE(ABORT, 'Perspectiva exige personagem da campanha'); END;
      CREATE TABLE perspective_receipts (
        campaign_id TEXT NOT NULL, item_id TEXT NOT NULL, operation_id TEXT NOT NULL,
        request_hash TEXT NOT NULL, response TEXT NOT NULL CHECK(json_valid(response)),
        PRIMARY KEY(campaign_id,operation_id),
        FOREIGN KEY(campaign_id,item_id) REFERENCES perspective_heads(campaign_id,item_id)
      ) STRICT;
      PRAGMA user_version = 17;
    `)
  }).immediate()
}
