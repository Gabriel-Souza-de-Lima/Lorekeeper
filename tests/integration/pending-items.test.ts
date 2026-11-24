import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { TestContext } from 'node:test'
import { strFromU8, unzipSync } from 'fflate'
import Database from 'better-sqlite3'
import { openDatabase } from '../../src/server/database.ts'
import { test } from 'node:test'
import { createApp } from '../../src/server/app.ts'

test('P2-01 a P2-04, P2-07 e P2-08: pendência isolada guarda origens e histórico de estado', async () => {
  const app = createApp(':memory:')
  try {
    const post = (url: string, payload: object) => app.inject({ method: 'POST', url, payload })
    const campaign = async () => `/api/campaigns/${(await post('/api/campaigns', { name: 'Bruma' })).json().id}`
    const root = await campaign()
    const foreign = await campaign()
    const session = (await post(`${root}/sessions`, { date: '2026-11-23' })).json()
    const npc = randomUUID()
    const otherNpc = randomUUID()
    assert.equal((await post(`${root}/wiki`, { id: npc, type: 'npc', title: 'Guia', body: '' })).statusCode, 201)
    assert.equal((await post(`${foreign}/wiki`, { id: otherNpc, type: 'npc', title: 'Guia', body: '' })).statusCode, 201)
    const url = `${root}/pending-items`
    assert.deepEqual((await app.inject(url)).json(), [])
    const draft = { id: randomUUID(), title: 'Verificar o mapa', type: 'clue', sessionId: session.id, entityIds: [npc] }
    assert.equal((await post(url, { ...draft, entityIds: [otherNpc] })).statusCode, 404)
    assert.deepEqual((await app.inject(url)).json(), [])
    const creation = await post(url, draft)
    assert.equal(creation.statusCode, 201)
    const item = creation.json()
    assert.equal(item.state, 'open')
    assert.equal(item.sessionId, session.id)
    assert.deepEqual(item.entityIds, [npc])
    assert.deepEqual((await post(url, draft)).json(), item)
    const change = (base: string, previous: string, state: string) => app.inject({
      method: 'PATCH', url: `${base}/${item.id}/state`, payload: { previous, state },
    })
    assert.equal((await change(`${foreign}/pending-items`, 'open', 'resolved')).statusCode, 404)
    assert.equal((await change(url, 'open', 'investigating')).statusCode, 200)
    assert.equal((await change(url, 'open', 'resolved')).statusCode, 409)
    assert.equal((await change(url, 'investigating', 'resolved')).statusCode, 200)
    assert.deepEqual((await app.inject(`${url}?open=true`)).json(), [])
    const read = await app.inject(`${url}/${item.id}`)
    assert.equal(read.json().state, 'resolved')
    assert.deepEqual(read.json().history.map((change: { state: string }) => change.state), ['open', 'investigating', 'resolved'])
    assert.equal((await app.inject({ method: 'PUT', url: root + '/wiki/' + npc + '/title',
      payload: { title: 'Guia renomeado', previousTitle: 'Guia' } })).statusCode, 200)
    const archiveCampaign = (archived: boolean) => app.inject({ method: 'PATCH', url: root, payload: { archived } })
    assert.equal((await archiveCampaign(true)).statusCode, 200)
    assert.deepEqual((await app.inject(`${url}/${item.id}`)).json().entityIds, [npc])
    assert.equal((await change(url, 'resolved', 'open')).statusCode, 409)
    assert.equal((await archiveCampaign(false)).statusCode, 200)
    const archive = await app.inject('/api/export')
    const exported = JSON.parse(strFromU8(unzipSync(archive.rawPayload)['lorekeeper.json']))
    assert.equal(exported.pendingItems[0].session_id, session.id)
    assert.equal(exported.pendingItemEntities[0].document_id, npc)
    assert.deepEqual(exported.pendingItemStates.map((entry: { state: string }) => entry.state), ['open', 'investigating', 'resolved'])
    assert.equal((await app.inject({ method: 'PATCH', url: root + '/sessions/' + session.id + '/trash',
      payload: { trashed: true } })).statusCode, 200)
    assert.equal((await app.inject(`${url}/${item.id}`)).json().sessionId, session.id)
    const trashed = await app.inject('/api/export')
    assert.equal(JSON.parse(strFromU8(unzipSync(trashed.rawPayload)['lorekeeper.json'])).pendingItems[0].session_id, null)
    assert.equal((await app.inject({ method: 'PATCH', url: root + '/sessions/' + session.id + '/trash',
      payload: { trashed: false } })).statusCode, 200)
    const restored = await app.inject('/api/export')
    assert.equal(JSON.parse(strFromU8(unzipSync(restored.rawPayload)['lorekeeper.json'])).pendingItems[0].session_id, session.id)

  } finally { await app.close() }
})

function v9(t: TestContext, collision = false) {
  const dir = mkdtempSync(join(tmpdir(), 'lorekeeper-pending-'))
  t.after(() => rmSync(dir, { recursive: true, force: true }))
  const path = join(dir, 'test.sqlite')
  const db = new Database(path)
  try {
    db.pragma('foreign_keys = OFF')
    for (let version = 1; version <= 9; version++) {
      db.exec(readFileSync(new URL(`../fixtures/sqlite-v${version}.sql`, import.meta.url), 'utf8'))
    }
    db.exec("INSERT INTO campaigns (id, name, created_at, updated_at) VALUES ('bruma', 'Bruma', 'hoje', 'hoje')")
    if (collision) db.exec('CREATE TABLE pending_item_states (id TEXT)')
  } finally { db.close() }
  return path
}

test('migration-preservation P2: V10 preserva a campanha de V9', (t) => {
  const db = openDatabase(v9(t))
  try {
    assert.equal(db.pragma('user_version', { simple: true }), 14)
    assert.equal(db.prepare('SELECT name FROM campaigns').pluck().get(), 'Bruma')
    assert.equal(db.prepare('SELECT count(*) FROM pending_items').pluck().get(), 0)
  } finally { db.close() }
})

test('migration-integrity P2: chaves preservam referências e rejeitam registros órfãos', (t) => {
  const db = openDatabase(v9(t))
  try {
    assert.throws(() => db.exec("INSERT INTO pending_item_states (item_id, state, created_at) VALUES ('ausente', 'open', 'hoje')"), /FOREIGN KEY/)
    assert.deepEqual(db.pragma('foreign_key_check'), [])
    assert.deepEqual(db.pragma('integrity_check'), [{ integrity_check: 'ok' }])
  } finally { db.close() }
})

test('migration-rollback P2: colisão na tabela de histórico reverte a migração', (t) => {
  const path = v9(t, true)
  assert.throws(() => openDatabase(path), /pending_item_states already exists/)
  const db = new Database(path)
  try {
    assert.equal(db.pragma('user_version', { simple: true }), 9)
    assert.equal(db.prepare("SELECT name FROM sqlite_schema WHERE name = 'pending_items'").get(), undefined)
    assert.equal(db.prepare('SELECT name FROM campaigns').pluck().get(), 'Bruma')
  } finally { db.close() }
})
