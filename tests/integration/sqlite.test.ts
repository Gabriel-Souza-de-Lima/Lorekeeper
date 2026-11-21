import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import Database from 'better-sqlite3'

test('o SQLite em disco preserva texto e permite restaurar uma busca FTS5', async (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'lorekeeper-test-'))
  t.after(() => rmSync(dir, { recursive: true, force: true }))

  const original = join(dir, 'original.sqlite')
  const backup = join(dir, 'backup.sqlite')
  const db = new Database(original)
  try {
    assert.equal(db.pragma('journal_mode = WAL', { simple: true }), 'wal')
    db.exec("CREATE VIRTUAL TABLE notas USING fts5(texto, tokenize='unicode61 remove_diacritics 2')")
    db.prepare('INSERT INTO notas (texto) VALUES (?)').run('À procura do dragão')
    await db.backup(backup)
  } finally {
    db.close()
  }

  for (const path of [original, backup]) {
    const restored = new Database(path, { readonly: true, fileMustExist: true })
    try {
      assert.equal(restored.pragma('integrity_check', { simple: true }), 'ok')
      assert.deepEqual(
        restored.prepare('SELECT texto FROM notas WHERE notas MATCH ?').all('dragao'),
        [{ texto: 'À procura do dragão' }],
      )
    } finally {
      restored.close()
    }
  }
})
