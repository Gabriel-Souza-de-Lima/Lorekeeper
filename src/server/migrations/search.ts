import type Database from 'better-sqlite3'

export function migrateSearch(db: Database.Database) {
  db.transaction(() => {
    const version = db.pragma('user_version', { simple: true })
    if (version === 8 || version === 9 || version === 10) return
    if (version !== 7) throw new Error('Versão de banco incompatível.')
    db.exec(`
      CREATE VIRTUAL TABLE document_search USING fts5(
        document_id UNINDEXED, title, body, tokenize='unicode61 remove_diacritics 2'
      );
      INSERT INTO document_search (document_id, title, body)
      SELECT id, title, body FROM documents;
      CREATE TRIGGER documents_search_insert AFTER INSERT ON documents BEGIN
        INSERT INTO document_search (document_id, title, body) VALUES (new.id, new.title, new.body);
      END;
      CREATE TRIGGER documents_search_update AFTER UPDATE OF title, body ON documents
        WHEN old.title IS NOT new.title OR old.body IS NOT new.body BEGIN
        UPDATE document_search SET title = new.title, body = new.body WHERE document_id = old.id;
      END;
      CREATE TRIGGER documents_search_delete AFTER DELETE ON documents BEGIN
        DELETE FROM document_search WHERE document_id = old.id;
      END;
      PRAGMA user_version = 8;
    `)
  }).immediate()
}
