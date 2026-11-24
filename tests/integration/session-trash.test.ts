import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { TestContext } from 'node:test'
import Database from 'better-sqlite3'
import { openDatabase } from '../../src/server/database.ts'
import { test } from 'node:test'
import { strFromU8, unzipSync } from 'fflate'
import { copyDatabase } from '../../src/server/backup.ts'
import { createApp } from '../../src/server/app.ts'

test('SC-04a/b/c: lixeira filtra leituras ativas e restaura sessão sem perder relações', async (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'lorekeeper-trash-api-'))
  t.after(() => rmSync(dir, { recursive: true, force: true }))
  const source = join(dir, 'source.sqlite')
  const app = createApp(source)
  try {
    async function campaign() {
      const { id } = (await app.inject({ method: 'POST', url: '/api/campaigns', payload: { name: 'Bruma' } })).json()
      return `/api/campaigns/${id}`
    }
    const base = await campaign()
    const foreign = await campaign()
    async function session(root: string) {
      return (await app.inject({
        method: 'POST', url: `${root}/sessions`, payload: { date: '2026-11-23' },
      })).json()
    }
    const { id, ...original } = await session(base)
    const unaffected = await session(foreign)
    const path = `${base}/sessions/${id}`
    const npcId = randomUUID()
    const note = randomUUID()
    assert.equal((await app.inject({ method: 'POST', url: `${base}/wiki`,
      payload: { id: npcId, type: 'npc', title: 'Guia', body: '' } })).statusCode, 201)
    const draft = { ...original, title: 'Travessia', participants: 'Lia', body: `A bússola indicou o [guia](#wiki-${npcId}).` }
    const key = randomUUID()
    const save = (payload = draft) => app.inject({ method: 'PUT', url: path, payload, headers: { 'idempotency-key': key } })
    const firstSave = await save()
    assert.equal(firstSave.statusCode, 200)
    assert.equal((await app.inject({ method: 'POST', url: '/api/quick-notes', payload: { id: note, body: 'Mapa.' } })).statusCode, 201)
    assert.equal((await app.inject({ method: 'PUT', url: `${path}/quick-notes/${note}` })).statusCode, 204)
    const tags = `${base}/documents/${id}/tags`
    assert.equal((await app.inject({ method: 'PUT', url: tags, payload: { name: 'Pista' } })).statusCode, 200)
    const trash = (trashed: boolean, root = base) => app.inject({
      method: 'PATCH', url: `${root}/sessions/${id}/trash`, payload: { trashed },
    })
    const search = '/api/search?q=bussola'
    const backlinks = `${base}/wiki/${npcId}/backlinks`
    const read = async (url: string) => (await app.inject(url)).json()
    const exportData = async () => JSON.parse(strFromU8(unzipSync((await app.inject('/api/export')).rawPayload)['lorekeeper.json']))
    const history = await read(`${path}/revisions`)
    assert.equal((await trash(true, foreign)).statusCode, 404)
    assert.equal((await trash(true)).statusCode, 200)
    assert.equal((await trash(true)).statusCode, 200)
    assert.deepEqual(await read(`${base}/sessions`), [])
    assert.equal((await read(base)).sessionCount, 0)
    assert.equal((await read(base)).lastSessionDate, null)
    assert.equal((await read(`${base}/sessions?trashed=true`))[0].id, id)
    for (const url of [path, `${path}/revisions`, `${path}/quick-notes`, `${path}/wiki-links`, tags]) {
      assert.equal((await app.inject(url)).statusCode, 404)
    }
    assert.equal((await save()).statusCode, 404)
    assert.deepEqual(await read(search), [])
    assert.deepEqual(await read(backlinks), [])
    const exported = await exportData()
    assert.equal(exported.documents.some((record: { id: string }) => record.id === id), false)
    assert.equal(exported.sessions.some((row: { document_id: string }) => row.document_id === id), false)
    assert.equal(exported.sessionRevisions.some((row: { document_id: string }) => row.document_id === id), false)
    assert.equal(exported.documentTags.some((row: { document_id: string }) => row.document_id === id), false)
    assert.equal(exported.links.some((row: { source_id: string; target_id: string }) => row.source_id === id || row.target_id === id), false)
    assert.equal((await read(`${foreign}/sessions`))[0].id, unaffected.id)

    const backup = join(dir, 'backup.sqlite')
    await copyDatabase(source, backup)
    const replica = createApp(backup)
    try {
      assert.deepEqual((await replica.inject(`${base}/sessions`)).json(), [])
      assert.equal((await replica.inject(`${base}/sessions?trashed=true`)).json()[0].id, id)
    } finally { await replica.close() }
    await app.inject({ method: 'PATCH', url: base, payload: { archived: true } })
    assert.equal((await trash(false)).statusCode, 409)
    await app.inject({ method: 'PATCH', url: base, payload: { archived: false } })

    assert.equal((await trash(false)).statusCode, 200)
    assert.equal((await read(path)).participants, 'Lia')
    assert.equal((await read(path)).version, firstSave.json().version + 2)
    assert.deepEqual(await read(`${path}/revisions`), history)
    assert.equal((await read(`${path}/quick-notes`))[0].id, note)
    assert.equal((await read(backlinks))[0].id, id)
    assert.equal((await read(search))[0].id, id)
    assert.equal((await read(tags))[0].name, 'Pista')
    assert.deepEqual((await save()).json(), firstSave.json())
    assert.equal((await app.inject({ method: 'PUT', url: path, payload: { ...draft, version: firstSave.json().version } })).statusCode, 409)
  } finally { await app.close() }
})

function legacy(t: TestContext, collision = false) {
  const dir = mkdtempSync(join(tmpdir(), 'lorekeeper-trash-'))
  t.after(() => rmSync(dir, { recursive: true, force: true }))
  const path = join(dir, 'test.sqlite')
  const db = new Database(path)
  try {
    db.pragma('foreign_keys = OFF')
    for (let version = 1; version <= 8; version++) {
      db.exec(readFileSync(new URL(`../fixtures/sqlite-v${version}.sql`, import.meta.url), 'utf8'))
    }
    db.exec(`
      INSERT INTO campaigns (id, name, created_at, updated_at) VALUES ('bruma', 'Bruma', 'hoje', 'hoje');
      INSERT INTO documents (id, campaign_id, type, title, body, created_at, updated_at)
      VALUES ('sessao', 'bruma', 'session', 'Farol', 'Uma bússola.', 'hoje', 'hoje');
      INSERT INTO sessions (document_id, session_date, participants) VALUES ('sessao', '2026-11-22', 'Lia');
      INSERT INTO session_revisions VALUES ('sessao', 1, 'Farol', 'Uma bússola.', 'hoje');
    `)
    if (collision) db.exec('CREATE INDEX sessions_trashed ON documents(id)')
  } finally { db.close() }
  return path
}

test('migration-preservation SC-04d: sessões legadas permanecem ativas e indexadas', (t) => {
  const db = openDatabase(legacy(t))
  try {
    assert.equal(db.pragma('user_version', { simple: true }), 15)
    assert.deepEqual(db.prepare('SELECT participants, trashed_at FROM sessions').get(),
      { participants: 'Lia', trashed_at: null })
    assert.equal(db.prepare('SELECT body FROM session_revisions').pluck().get(), 'Uma bússola.')
    assert.equal(db.prepare("SELECT document_id FROM document_search WHERE document_search MATCH 'bussola'").pluck().get(), 'sessao')
  } finally { db.close() }
})

test('migration-integrity SC-04d: marcar lixeira mantém referências e integridade', (t) => {
  const db = openDatabase(legacy(t))
  try {
    db.prepare('UPDATE sessions SET trashed_at = ? WHERE document_id = ?').run('2026-11-23T12:00:00Z', 'sessao')
    assert.deepEqual(db.pragma('foreign_key_check'), [])
    assert.deepEqual(db.pragma('integrity_check'), [{ integrity_check: 'ok' }])
    assert.equal(db.prepare('SELECT count(*) FROM session_revisions').pluck().get(), 1)
  } finally { db.close() }
})

test('migration-rollback SC-04d: falha ao criar índice reverte a coluna', (t) => {
  const path = legacy(t, true)
  assert.throws(() => openDatabase(path), /sessions_trashed already exists/)
  const db = new Database(path)
  try {
    assert.equal(db.pragma('user_version', { simple: true }), 8)
    assert.throws(() => db.prepare('SELECT trashed_at FROM sessions'), /no such column/)
    assert.equal(db.prepare('SELECT body FROM session_revisions').pluck().get(), 'Uma bússola.')
  } finally { db.close() }
})
