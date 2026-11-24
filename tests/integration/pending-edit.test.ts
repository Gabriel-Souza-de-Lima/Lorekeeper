import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test, type TestContext } from 'node:test'
import Database from 'better-sqlite3'
import { strFromU8, unzipSync } from 'fflate'
import { createApp } from '../../src/server/app.ts'
import { copyDatabase } from '../../src/server/backup.ts'
import { openDatabase } from '../../src/server/database.ts'

function temp(t: TestContext) {
  const dir = mkdtempSync(join(tmpdir(), 'pending-edit-'))
  t.after(() => rmSync(dir, { recursive: true, force: true }))
  return dir
}

test('P6-01/04/05/06/07/08: confirma detalhes transacionalmente e preserva o histórico no backup', async (t) => {
  const dir = temp(t)
  const live = join(dir, 'live.sqlite')
  const backup = join(dir, 'backup.sqlite')
  const app = createApp(live)
  let url = ''
  try {
    const post = (url: string, payload: object) => app.inject({ method: 'POST', url, payload })
    const campaign = async () => '/api/campaigns/' + (await post('/api/campaigns', { name: 'Bruma' })).json().id
    const root = await campaign()
    const other = await campaign()
    const path = root + '/pending-items'
    const npc = randomUUID()
    const foreign = randomUUID()
    for (const [scope, id] of [[root, npc], [other, foreign]]) {
      assert.equal((await post(scope + '/wiki', { id, type: 'npc', title: 'Guia', body: '' })).statusCode, 201)
    }
    const { id: sessionId } = (await post(root + '/sessions', { date: '2026-11-24' })).json()
    const id = randomUUID()
    assert.equal((await post(path, { id, title: 'Sinal', entityIds: [npc] })).statusCode, 201)
    url = path + '/' + id
    const edit = (payload: object) => app.inject({ method: 'PUT', url, payload })
    const state = await app.inject({ method: 'PATCH', url: url + '/state', payload: { previous: 'open', state: 'investigating' } })
    const before = state.json()
    const input = { editVersion: 1, title: 'Enigma', type: 'question', description: 'Luz', origin: 'Farol',
      notes: 'Testar', sessionId, entityIds: [] }
    assert.equal((await edit({ ...input, entityIds: [foreign] })).statusCode, 404)
    assert.deepEqual((await app.inject(url)).json(), before)
    const saved = await edit(input)
    assert.equal(saved.statusCode, 200, saved.body)
    assert.equal(saved.json().editVersion, 2)
    assert.equal(saved.json().state, 'investigating')
    assert.deepEqual(saved.json().history, before.history)
    for (const key of ['title', 'type', 'description', 'origin', 'notes', 'sessionId', 'entityIds'] as const) {
      assert.deepEqual(saved.json()[key], input[key])
    }
    assert.deepEqual((await edit(input)).json(), saved.json())
    assert.equal((await edit({ ...input, title: 'Outra edição' })).statusCode, 409)
    assert.equal((await app.inject(path + '?open=true')).json()[0].title, 'Enigma')
    const zip = unzipSync((await app.inject('/api/export')).rawPayload)
    const exported = JSON.parse(strFromU8(zip['lorekeeper.json']))
    assert.equal(exported.pendingItems[0].edit_version, 2)
    assert.deepEqual(exported.pendingItemEntities, [])
    await copyDatabase(live, backup)
  } finally { await app.close() }
  const restored = join(dir, 'restored.sqlite')
  await copyDatabase(backup, restored)
  const reopened = createApp(restored)
  try {
    const item = (await reopened.inject(url)).json()
    assert.equal(item.title, 'Enigma')
    assert.deepEqual(item.entityIds, [])
    assert.equal(item.history.length, 2)
  } finally { await reopened.close() }
})

function legacy(t: TestContext, collision = false) {
  const file = join(temp(t), 'previous.sqlite')
  const db = new Database(file)
  try {
    for (let version = 1; version <= 11; version++) {
      db.exec(readFileSync(new URL(`../fixtures/sqlite-v${version}.sql`, import.meta.url), 'utf8'))
    }
    db.exec(`INSERT INTO campaigns (id, name, created_at, updated_at) VALUES ('a', 'Bruma', 'ontem', 'ontem');
      INSERT INTO pending_items (id, campaign_id, title, type, state, created_at, updated_at)
        VALUES ('p', 'a', 'Sinal', 'clue', 'open', 'ontem', 'ontem');
      INSERT INTO documents (id, campaign_id, type, title, created_at, updated_at)
        VALUES ('npc', 'a', 'npc', 'Vigia', 'ontem', 'ontem');
      INSERT INTO pending_item_entities (item_id, document_id) VALUES ('p', 'npc');
      INSERT INTO pending_item_states (item_id, state, created_at) VALUES ('p', 'open', 'ontem');`)
    if (collision) db.exec('ALTER TABLE pending_item_entities ADD COLUMN removed_at TEXT')
  } finally { db.close() }
  return file
}

test('migration-preservation P6: V12 mantém os registros e inicializa a versão', (t) => {
  const db = openDatabase(legacy(t))
  try {
    assert.deepEqual(db.prepare('SELECT title, edit_version FROM pending_items').get(), { title: 'Sinal', edit_version: 1 })
    assert.deepEqual(db.prepare('SELECT document_id, removed_at FROM pending_item_entities').get(), { document_id: 'npc', removed_at: null })
    assert.equal(db.prepare('SELECT state FROM pending_item_states').pluck().get(), 'open')
  } finally { db.close() }
})

test('migration-integrity P6: versão positiva e referências existentes são preservadas', (t) => {
  const db = openDatabase(legacy(t))
  try {
    assert.throws(() => db.exec('UPDATE pending_items SET edit_version = 0'), /CHECK/)
    assert.deepEqual(db.pragma('foreign_key_check'), [])
  } finally { db.close() }
})

test('migration-rollback P6: falha na segunda coluna desfaz a primeira', (t) => {
  const file = legacy(t, true)
  assert.throws(() => openDatabase(file), /duplicate column/)
  const db = new Database(file)
  try {
    assert.equal(db.pragma('user_version', { simple: true }), 11)
    assert.equal(db.prepare('SELECT title FROM pending_items').pluck().get(), 'Sinal')
    assert.throws(() => db.prepare('SELECT edit_version FROM pending_items'), /no such column/)
  } finally { db.close() }
})
