import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test, type TestContext } from 'node:test'
import Database from 'better-sqlite3'
import { createApp } from '../../src/server/app.ts'
import { openDatabase } from '../../src/server/database.ts'

function temporaryPath(t: TestContext) {
  const directory = mkdtempSync(join(tmpdir(), 'lorekeeper-wiki-'))
  t.after(() => rmSync(directory, { recursive: true, force: true }))
  return join(directory, 'wiki.sqlite')
}

test('I3-03a/b: cadastra os quatro tipos, repete sem duplicar e isola campanhas', async (t) => {
  const path = temporaryPath(t)
  let app = createApp(path)
  try {
    const campaign = async () => (await app.inject({ method: 'POST', url: '/api/campaigns', payload: { name: 'Bruma' } })).json().id
    const own = await campaign()
    const foreign = await campaign()
    const url = `/api/campaigns/${own}/wiki`
    const post = (payload: object) => app.inject({ method: 'POST', url, payload })
    const entries = ['character', 'npc', 'location', 'quest'].map((type) => ({
      id: randomUUID(), type, title: 'Farol', body: 'Pista **fictícia**.',
    }))
    for (const entry of entries) {
      const response = await post(entry)
      assert.equal(response.statusCode, 201)
      assert.equal((await post(entry)).statusCode, 200)
      assert.equal((await post({ ...entry, body: 'Outro texto.' })).statusCode, 409)
    }
    assert.equal((await post({ ...entries[0], type: 'session' })).statusCode, 400)
    assert.equal((await post({ ...entries[0], title: '  ' })).statusCode, 400)
    const foreignUrl = `/api/campaigns/${foreign}/wiki`
    assert.deepEqual((await app.inject(foreignUrl)).json(), [])
    assert.equal((await app.inject(`${foreignUrl}/${entries[0].id}`)).statusCode, 404)
    await app.close()
    app = createApp(path)
    const list = (await app.inject(url)).json()
    assert.equal(list.length, 4)
    for (const entry of entries) assert.deepEqual((await app.inject(`${url}/${entry.id}`)).json(), entry.type === 'quest' ? { ...entry, closed: false } : entry)
    await app.inject({ method: 'PATCH', url: `/api/campaigns/${own}`, payload: { archived: true } })
    assert.equal((await post({ ...entries[0], id: randomUUID() })).statusCode, 409)
    assert.deepEqual((await app.inject(url)).json(), list)
  } finally {
    await app.close()
  }
})

function installV4(path: string, broken = false) {
  const db = new Database(path)
  try {
    db.pragma('foreign_keys = OFF')
    for (const version of [1, 2, 3, 4]) {
      db.exec(readFileSync(new URL(`../fixtures/sqlite-v${version}.sql`, import.meta.url), 'utf8'))
    }
    db.exec(`
      INSERT INTO campaigns (id, name, created_at, updated_at) VALUES ('bruma', 'Bruma', 'hoje', 'hoje');
      INSERT INTO documents VALUES
        ('sessao', 'bruma', 'session', 'Farol', 'Registro', 1, 'hoje', 'hoje'),
        ('nota', 'bruma', 'quick_note', 'Pista', 'Uma pista.', 1, 'hoje', 'hoje');
      INSERT INTO sessions VALUES ('sessao', '2026-11-22', '', '', NULL);
      INSERT INTO session_revisions VALUES ('sessao', 1, 'Farol', 'Registro', 'hoje');
      INSERT INTO session_save_receipts VALUES ('sessao', 'op', 1, 'hash', '{}');
      INSERT INTO document_links VALUES ('nota', '${broken ? 'ausente' : 'sessao'}', 'manual');
    `)
  } finally {
    db.close()
  }
}

function snapshot(db: Database.Database) {
  return ['campaigns', 'documents', 'sessions', 'session_revisions', 'session_save_receipts', 'document_links']
    .map((table) => {
    const columns = table === 'documents' ? 'id, campaign_id, type, title, body, version, created_at, updated_at'
      : table === 'campaigns' ? 'id, name, description, game_master, system, rules_version, notes, status, archived_at, created_at, updated_at'
        : table === 'sessions' ? 'document_id, session_date, fictional_date, participants, number' : '*'
    return db.prepare(`SELECT ${columns} FROM ${table} ORDER BY 1`).all()
  })
}

test('migration-integrity I3-03c: novos tipos exigem campanha válida e preservam chaves estrangeiras', (t) => {
  const db = openDatabase(temporaryPath(t))
  try {
    const insert = db.prepare("INSERT INTO documents (id, campaign_id, type, title, body, version, created_at, updated_at) VALUES ('npc', ?, 'npc', 'Guia', '', 1, 'hoje', 'hoje')")
    assert.throws(() => insert.run(null), /CHECK/)
    assert.throws(() => insert.run('ausente'), /FOREIGN KEY/)
    assert.deepEqual(db.pragma('integrity_check'), [{ integrity_check: 'ok' }])
    assert.deepEqual(db.pragma('foreign_key_check'), [])
  } finally { db.close() }
})

test('migration-preservation I3-03c: V5 mantém todos os registros de V4', (t) => {
  const path = temporaryPath(t)
  installV4(path)
  const old = new Database(path)
  const before = snapshot(old)
  old.close()
  const db = openDatabase(path)
  try {
    assert.equal(db.pragma('user_version', { simple: true }), 16)
    assert.deepEqual(snapshot(db), before)
    assert.deepEqual(db.pragma('foreign_key_check'), [])
  } finally { db.close() }
})

test('migration-rollback I3-03c: uma referência inválida desfaz a troca da tabela', (t) => {
  const path = temporaryPath(t)
  installV4(path, true)
  assert.throws(() => openDatabase(path), /migração da wiki violou/)
  const db = new Database(path)
  try {
    assert.equal(db.pragma('user_version', { simple: true }), 4)
    assert.equal(db.prepare("SELECT name FROM sqlite_schema WHERE name = 'documents_v5'").get(), undefined)
    assert.equal(db.prepare("SELECT body FROM documents WHERE id = 'nota'").pluck().get(), 'Uma pista.')
    assert.equal(db.prepare('SELECT target_id FROM document_links').pluck().get(), 'ausente')
    assert.throws(() => db.exec("INSERT INTO documents (id, campaign_id, type, title, body, version, created_at, updated_at) VALUES ('npc', 'bruma', 'npc', 'Guia', '', 1, 'hoje', 'hoje')"), /CHECK/)
  } finally { db.close() }
})
