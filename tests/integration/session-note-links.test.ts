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
  const folder = mkdtempSync(join(tmpdir(), 'lorekeeper-links-'))
  t.after(() => rmSync(folder, { recursive: true, force: true }))
  return join(folder, 'test.sqlite')
}

function legacyDatabase(path: string, collision = '') {
  const db = new Database(path)
  try {
    db.pragma('foreign_keys = OFF')
    for (const version of [1, 2, 3]) {
      db.exec(readFileSync(new URL(`../fixtures/sqlite-v${version}.sql`, import.meta.url), 'utf8'))
    }
    db.exec(`
      INSERT INTO campaigns (id, name, created_at, updated_at) VALUES ('bruma', 'Bruma', 'hoje', 'hoje');
      INSERT INTO documents VALUES
        ('sessao', 'bruma', 'session', 'Farol', 'Registro', 1, 'hoje', 'hoje'),
        ('nota', NULL, 'quick_note', 'Pista', 'A bússola girou.', 1, 'hoje', 'hoje');
      INSERT INTO sessions VALUES ('sessao', '2026-11-22', '', '', NULL);
      INSERT INTO session_revisions VALUES ('sessao', 1, 'Farol', 'Registro', 'hoje');
      INSERT INTO session_save_receipts VALUES ('sessao', 'operacao', 1, 'hash', '{}');
      ${collision}
    `)
  } finally {
    db.close()
  }
}

test('migration-integrity I3-02c: vínculos exigem documentos, direção válida e unicidade', (t) => {
  const db = openDatabase(temporaryPath(t))
  try {
    const insert = db.prepare('INSERT INTO document_links (source_id, target_id, origin) VALUES (?, ?, ?)')
    assert.throws(() => insert.run('ausente', 'outro', 'manual'), /FOREIGN KEY/)
    assert.throws(() => insert.run('ausente', 'ausente', 'manual'), /CHECK/)
    db.exec("INSERT INTO documents (id, campaign_id, type, title, body, version, created_at, updated_at) VALUES ('a', NULL, 'quick_note', 'A', '', 1, 'hoje', 'hoje'), ('b', NULL, 'quick_note', 'B', '', 1, 'hoje', 'hoje')")
    insert.run('a', 'b', 'manual')
    assert.throws(() => insert.run('a', 'b', 'manual'), /UNIQUE/)
    assert.deepEqual(db.pragma('foreign_key_check'), [])
  } finally {
    db.close()
  }
})

test('migration-preservation I3-02c: V4 preserva nota, sessão, revisão e comprovante de V3', (t) => {
  const path = temporaryPath(t)
  legacyDatabase(path)
  const snapshot = (db: Database.Database) => ['campaigns', 'documents', 'sessions', 'session_revisions', 'session_save_receipts']
    .map((table) => {
    const columns = table === 'documents' ? 'id, campaign_id, type, title, body, version, created_at, updated_at'
      : table === 'campaigns' ? 'id, name, description, game_master, system, rules_version, notes, status, archived_at, created_at, updated_at'
        : table === 'sessions' ? 'document_id, session_date, fictional_date, participants, number' : '*'
    return db.prepare(`SELECT ${columns} FROM ${table} ORDER BY 1`).all()
  })
  const legacy = new Database(path, { readonly: true })
  const original = snapshot(legacy)
  legacy.close()
  const db = openDatabase(path)
  try {
    assert.equal(db.pragma('user_version', { simple: true }), 13)
    assert.deepEqual(snapshot(db), original)
    assert.deepEqual(db.pragma('integrity_check'), [{ integrity_check: 'ok' }])
  } finally {
    db.close()
  }
})

test('migration-rollback I3-02c: colisão do índice reverte a criação da tabela e preserva V3', (t) => {
  const path = temporaryPath(t)
  legacyDatabase(path, 'CREATE INDEX document_links_target ON documents (id);')
  assert.throws(() => openDatabase(path), /document_links_target already exists/)
  const db = new Database(path)
  try {
    assert.equal(db.pragma('user_version', { simple: true }), 3)
    assert.equal(db.prepare("SELECT name FROM sqlite_schema WHERE name = 'document_links'").get(), undefined)
    assert.deepEqual(db.prepare("SELECT body FROM documents WHERE id = 'nota'").get(), { body: 'A bússola girou.' })
    assert.deepEqual(db.pragma('foreign_key_check'), [])
  } finally {
    db.close()
  }
})

test('I3-02a/b: API vincula e desvincula com persistência, isolamento e proteção de arquivo', async (t) => {
  const path = temporaryPath(t)
  let app = createApp(path)
  try {
    const campaign = async () => (await app.inject({ method: 'POST', url: '/api/campaigns', payload: { name: 'Bruma' } })).json().id
    const campaignId = await campaign()
    const otherCampaign = await campaign()
    const session = async (id: string) => (await app.inject({
      method: 'POST', url: `/api/campaigns/${id}/sessions`, payload: { date: '2026-11-22' },
    })).json().id
    const sessionId = await session(campaignId)
    const otherSession = await session(otherCampaign)
    const secondSession = await session(campaignId)
    const noteId = randomUUID()
    const inbox = '/api/quick-notes'
    const body = 'A bússola girou.'
    assert.equal((await app.inject({ method: 'POST', url: inbox, payload: { id: noteId, body } })).statusCode, 201)
    const base = `/api/campaigns/${campaignId}`
    const notes = `${base}/sessions/${sessionId}/quick-notes`
    const link = `${notes}/${noteId}`
    const second = `${base}/sessions/${secondSession}/quick-notes`
    const foreign = `/api/campaigns/${otherCampaign}/sessions/${otherSession}/quick-notes`
    const request = (method: 'PUT' | 'DELETE' | 'GET', url: string) => app.inject({ method, url })
    assert.equal((await request('PUT', `${base}/sessions/${otherSession}/quick-notes/${noteId}`)).statusCode, 404)
    assert.deepEqual((await app.inject(notes)).json(), [])
    assert.equal((await request('PUT', link)).statusCode, 204)
    assert.equal((await request('PUT', link)).statusCode, 204)
    assert.equal((await request('PUT', `${second}/${noteId}`)).statusCode, 204)
    assert.deepEqual((await app.inject(inbox)).json(), [])
    assert.equal((await request('PUT', `${foreign}/${noteId}`)).statusCode, 404)
    assert.deepEqual((await app.inject(foreign)).json(), [])
    await app.close()
    app = createApp(path)
    const linked = (await app.inject(notes)).json()
    assert.deepEqual(linked.map((note: { id: string; body: string; campaignId: string }) =>
      [note.id, note.body, note.campaignId]), [[noteId, body, campaignId]])
    for (const archived of [true, false]) {
      assert.equal((await app.inject({ method: 'PATCH', url: base, payload: { archived } })).statusCode, 200)
      if (archived) {
        assert.deepEqual((await app.inject(notes)).json(), linked)
        assert.equal((await request('DELETE', link)).statusCode, 409)
      }
    }
    assert.equal((await request('DELETE', link)).statusCode, 204)
    assert.equal((await request('DELETE', link)).statusCode, 204)
    assert.deepEqual((await app.inject(notes)).json(), [])
    assert.deepEqual((await app.inject(second)).json(), linked)
    assert.deepEqual((await app.inject(`${base}/quick-notes`)).json(), linked)
  } finally {
    await app.close()
  }
})
