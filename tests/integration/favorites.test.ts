import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test, type TestContext } from 'node:test'
import { strFromU8, unzipSync } from 'fflate'
import Database from 'better-sqlite3'
import { createApp } from '../../src/server/app.ts'
import { openDatabase } from '../../src/server/database.ts'

function temp(t: TestContext) {
  const dir = mkdtempSync(join(tmpdir(), 'favorites-'))
  t.after(() => rmSync(dir, { recursive: true, force: true }))
  return join(dir, 'library.sqlite')
}

test('P9-03/07/09: prefixo reutiliza FTS e favoritos persistem com isolamento e lixeira', async (t) => {
  const path = temp(t)
  const app = createApp(path)
  let root = ''
  let id = ''
  try {
    const campaign = async (name: string) => '/api/campaigns/' + (await app.inject({
      method: 'POST', url: '/api/campaigns', payload: { name },
    })).json().id
    root = await campaign('Costa')
    const other = await campaign('Montanha')
    const created = await app.inject({ method: 'POST', url: root + '/sessions', payload: { date: '2026-11-24' } })
    const { id: document, ...fields } = created.json()
    id = document
    const url = root + '/sessions/' + id
    assert.equal((await app.inject({ method: 'PUT', url, payload: { ...fields, title: 'Faról' } })).statusCode, 200)
    assert.deepEqual((await app.inject('/api/search?q=faro')).json(), [])
    assert.equal((await app.inject('/api/search?q=faro&prefix=true')).json()[0].id, id)
    const toggle = (scope: string, value: boolean) => app.inject({
      method: 'PUT', url: scope + '/favorites/' + id, payload: { favorite: value },
    })
    assert.equal((await toggle(other, true)).statusCode, 404)
    assert.deepEqual((await app.inject('/api/favorites')).json(), [])
    assert.equal((await toggle(root, true)).statusCode, 204)
    assert.equal((await toggle(root, true)).statusCode, 204)
    assert.equal((await app.inject('/api/favorites')).json()[0].campaignName, 'Costa')
    const zip = unzipSync((await app.inject('/api/export')).rawPayload)
    assert.deepEqual(JSON.parse(strFromU8(zip['lorekeeper.json'])).documentFavorites, [{ document_id: id }])
    for (const trashed of [true, false]) {
      assert.equal((await app.inject({ method: 'PATCH', url: url + '/trash', payload: { trashed } })).statusCode, 200)
      const favorites = (await app.inject('/api/favorites')).json()
      assert.equal(favorites.length, trashed ? 0 : 1)
    }
  } finally { await app.close() }
  const reopened = createApp(path)
  try {
    assert.equal((await reopened.inject('/api/favorites')).json()[0].id, id)
    assert.equal((await reopened.inject({ method: 'PUT', url: root + '/favorites/' + id, payload: { favorite: false } })).statusCode, 204)
    assert.deepEqual((await reopened.inject('/api/favorites')).json(), [])
  } finally { await reopened.close() }
})

function legacy(t: TestContext, collision = false) {
  const file = temp(t)
  const db = new Database(file)
  try {
    for (let version = 1; version <= 14; version++) {
      db.exec(readFileSync(new URL(`../fixtures/sqlite-v${version}.sql`, import.meta.url), 'utf8'))
    }
    db.exec(`INSERT INTO campaigns (id, name, created_at, updated_at) VALUES ('a', 'Costa', 'ontem', 'ontem');
      INSERT INTO documents (id, campaign_id, title, body, type, created_at, updated_at)
        VALUES ('npc', 'a', 'Farol', 'Texto', 'npc', 'ontem', 'ontem');`)
    if (collision) db.exec('CREATE VIEW document_favorites AS SELECT id FROM documents')
  } finally { db.close() }
  return file
}

test('migration-preservation P9: mantém documentos anteriores', (t) => {
  const db = openDatabase(legacy(t))
  try {
    assert.equal(db.prepare('SELECT body FROM documents').pluck().get(), 'Texto')
    assert.equal(db.prepare('SELECT count(*) FROM document_favorites').pluck().get(), 0)
  } finally { db.close() }
})

test('migration-integrity P9: favorito exige referência válida', (t) => {
  const db = openDatabase(legacy(t))
  try {
    assert.throws(() => db.prepare('INSERT INTO document_favorites VALUES (?, 1)').run(randomUUID()), /FOREIGN KEY/)
    assert.deepEqual(db.pragma('foreign_key_check'), [])
  } finally { db.close() }
})

test('migration-rollback P9: colisão de esquema conserva versão e conteúdo', (t) => {
  const file = legacy(t, true)
  assert.throws(() => openDatabase(file), /already exists/)
  const db = new Database(file)
  try {
    assert.equal(db.pragma('user_version', { simple: true }), 14)
    assert.equal(db.prepare('SELECT body FROM documents').pluck().get(), 'Texto')
  } finally { db.close() }
})
