import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test, type TestContext } from 'node:test'
import Database from 'better-sqlite3'
import { createApp } from '../../src/server/app.ts'
import { openDatabase } from '../../src/server/database.ts'

test('I3-04a/c: missões abertas isoladas, conclusão, reabertura e arquivamento', async () => {
  const app = createApp(':memory:')
  try {
    const campaign = async () => (await app.inject({ method: 'POST', url: '/api/campaigns', payload: { name: 'Bruma' } })).json().id
    const url = `/api/campaigns/${await campaign()}`
    const other = `/api/campaigns/${await campaign()}`
    const id = randomUUID()
    const payload = { id, type: 'quest', title: 'Farol', body: 'Encontre o mapa.' }
    assert.equal((await app.inject({ method: 'POST', url: `${url}/wiki`, payload })).statusCode, 201)
    const update = (base: string, closed: boolean) => app.inject({ method: 'PUT', url: `${base}/wiki/${id}/quest-state`, payload: { closed } })
    const opened = async () => (await app.inject(`${url}/wiki?openQuests=true`)).json()
    assert.equal((await opened()).length, 1)
    assert.equal((await update(other, true)).statusCode, 404)
    assert.equal((await update(url, true)).statusCode, 200)
    assert.equal((await update(url, true)).statusCode, 200)
    assert.deepEqual(await opened(), [])
    assert.equal((await app.inject(`${url}/wiki/${id}`)).json().body, payload.body)
    assert.equal((await update(url, false)).statusCode, 200)
    await app.inject({ method: 'PATCH', url, payload: { archived: true } })
    assert.equal((await update(url, true)).statusCode, 409)
    assert.equal((await opened()).length, 1)
  } finally { await app.close() }
})

test('I3-04b/c: destaque aponta para personagem da própria campanha e pode ser removido', async () => {
  const app = createApp(':memory:')
  try {
    const campaign = async () => (await app.inject({ method: 'POST', url: '/api/campaigns', payload: { name: 'Bruma' } })).json().id
    const url = `/api/campaigns/${await campaign()}`
    const other = `/api/campaigns/${await campaign()}`
    async function page(base: string, type: string) {
      const id = randomUUID()
      assert.equal((await app.inject({ method: 'POST', url: `${base}/wiki`, payload: { id, type, title: 'Guia', body: '' } })).statusCode, 201)
      return id
    }
    const first = await page(url, 'character')
    const second = await page(url, 'character')
    const npc = await page(url, 'npc')
    const foreign = await page(other, 'character')
    const feature = (id: string | null) => app.inject({ method: 'PUT', url: `${url}/featured-character`, payload: { id } })
    assert.equal((await feature(first)).json().featuredCharacterId, first)
    assert.equal((await feature(second)).json().featuredCharacterId, second)
    assert.equal((await feature(npc)).statusCode, 404)
    assert.equal((await feature(foreign)).statusCode, 404)
    assert.equal((await app.inject(url)).json().featuredCharacterId, second)
    assert.equal((await feature(null)).json().featuredCharacterId, null)
    await feature(first)
    await app.inject({ method: 'PATCH', url, payload: { archived: true } })
    assert.equal((await feature(null)).statusCode, 409)
    assert.equal((await app.inject(url)).json().featuredCharacterId, first)
  } finally { await app.close() }
})

function fixture(t: TestContext, collision = false) {
  const dir = mkdtempSync(join(tmpdir(), 'lorekeeper-overview-'))
  t.after(() => rmSync(dir, { recursive: true, force: true }))
  const path = join(dir, 'test.sqlite')
  const db = new Database(path)
  try {
    db.pragma('foreign_keys = OFF')
    for (const version of [1, 2, 3, 4, 5]) {
      db.exec(readFileSync(new URL(`../fixtures/sqlite-v${version}.sql`, import.meta.url), 'utf8'))
    }
    db.exec(`
      INSERT INTO campaigns (id, name, created_at, updated_at) VALUES ('bruma', 'Bruma', 'hoje', 'hoje');
      INSERT INTO documents VALUES ('missao', 'bruma', 'quest', 'Farol', 'Registro', 2, 'hoje', 'hoje');
    `)
    if (collision) db.exec('ALTER TABLE campaigns ADD COLUMN featured_character_id TEXT')
  } finally { db.close() }
  return path
}

test('migration-integrity I3-04d: campos têm valores restritos e chaves válidas', (t) => {
  const db = openDatabase(fixture(t))
  try {
    assert.throws(() => db.exec("UPDATE documents SET quest_closed = 2 WHERE id = 'missao'"), /CHECK/)
    assert.throws(() => db.exec("UPDATE campaigns SET featured_character_id = 'ausente'"), /FOREIGN KEY/)
    assert.deepEqual(db.pragma('foreign_key_check'), [])
    assert.deepEqual(db.pragma('integrity_check'), [{ integrity_check: 'ok' }])
  } finally { db.close() }
})

test('migration-preservation I3-04d: missão de V5 mantém texto e começa aberta', (t) => {
  const db = openDatabase(fixture(t))
  try {
    assert.equal(db.pragma('user_version', { simple: true }), 14)
    assert.deepEqual(db.prepare('SELECT id, body, version, quest_closed FROM documents').get(),
      { id: 'missao', body: 'Registro', version: 2, quest_closed: 0 })
    assert.equal(db.prepare('SELECT featured_character_id FROM campaigns').pluck().get(), null)
  } finally { db.close() }
})

test('migration-rollback I3-04d: colisão na segunda coluna reverte a primeira', (t) => {
  const path = fixture(t, true)
  assert.throws(() => openDatabase(path), /duplicate column name/)
  const db = new Database(path)
  try {
    assert.equal(db.pragma('user_version', { simple: true }), 5)
    assert.throws(() => db.prepare('SELECT quest_closed FROM documents'), /no such column/)
    assert.equal(db.prepare('SELECT body FROM documents').pluck().get(), 'Registro')
  } finally { db.close() }
})
