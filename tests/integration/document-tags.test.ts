import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test, type TestContext } from 'node:test'
import Database from 'better-sqlite3'
import { createApp } from '../../src/server/app.ts'
import { openDatabase } from '../../src/server/database.ts'

test('I3-07a/b: normaliza tags, preserva outras associações e isola campanhas', async () => {
  const app = createApp(':memory:')
  try {
    async function campaign() {
      const { id } = (await app.inject({ method: 'POST', url: '/api/campaigns', payload: { name: 'Bruma' } })).json()
      const url = `/api/campaigns/${id}`
      const session = (await app.inject({ method: 'POST', url: `${url}/sessions`, payload: { date: '2026-11-22' } })).json()
      return { url, session: session.id, tags: `${url}/documents/${session.id}/tags` }
    }
    const a = await campaign()
    const b = await campaign()
    const attach = (url: string, name: string) => app.inject({ method: 'PUT', url, payload: { name } })
    assert.deepEqual((await app.inject(a.tags)).json(), [])
    assert.equal((await attach(a.tags, '   ')).statusCode, 400)
    const first = await attach(a.tags, '  PISTA   Náutica ')
    assert.equal(first.statusCode, 200)
    const tag = first.json()
    assert.equal(tag.name, 'PISTA Náutica')
    assert.deepEqual((await attach(a.tags, 'pista na\u0301utica')).json(), tag)
    assert.deepEqual((await attach(b.tags, 'pista náutica')).json(), tag)
    assert.deepEqual((await app.inject(a.tags)).json(), [tag])
    const wrong = `${b.url}/documents/${a.session}/tags`
    assert.equal((await app.inject(wrong)).statusCode, 404)
    assert.equal((await attach(wrong, 'Outra')).statusCode, 404)
    const remove = (url: string) => app.inject({ method: 'DELETE', url: `${url}/${tag.id}` })
    assert.equal((await remove(a.tags)).statusCode, 204)
    assert.equal((await remove(a.tags)).statusCode, 204)
    assert.deepEqual((await app.inject(a.tags)).json(), [])
    await app.inject({ method: 'PATCH', url: b.url, payload: { archived: true } })
    assert.equal((await remove(b.tags)).statusCode, 409)
    assert.equal((await attach(b.tags, 'Outra')).statusCode, 409)
    assert.deepEqual((await app.inject(b.tags)).json(), [tag])
  } finally { await app.close() }
})

function legacy(t: TestContext, collision = false) {
  const dir = mkdtempSync(join(tmpdir(), 'lorekeeper-tags-'))
  t.after(() => rmSync(dir, { recursive: true, force: true }))
  const path = join(dir, 'test.sqlite')
  const db = new Database(path)
  try {
    db.pragma('foreign_keys = OFF')
    for (const version of [1, 2, 3, 4, 5, 6]) {
      db.exec(readFileSync(new URL(`../fixtures/sqlite-v${version}.sql`, import.meta.url), 'utf8'))
    }
    db.exec("INSERT INTO documents (id, type, title, body, created_at, updated_at) VALUES ('nota', 'quick_note', 'Farol', 'Pista', 'hoje', 'hoje')")
    if (collision) db.exec('CREATE TABLE document_tags (id TEXT)')
  } finally { db.close() }
  return path
}

test('migration-integrity I3-07c: exige vínculos válidos e chaves únicas', (t) => {
  const db = openDatabase(legacy(t))
  try {
    db.exec("INSERT INTO tags VALUES ('tag', 'Farol', 'farol')")
    assert.throws(() => db.exec("INSERT INTO tags VALUES ('outra', 'FAROL', 'farol')"), /UNIQUE/)
    assert.throws(() => db.exec("INSERT INTO document_tags VALUES ('ausente', 'tag')"), /FOREIGN KEY/)
    db.exec("INSERT INTO document_tags VALUES ('nota', 'tag')")
    assert.throws(() => db.exec("INSERT INTO document_tags VALUES ('nota', 'tag')"), /UNIQUE/)
    assert.deepEqual(db.pragma('foreign_key_check'), [])
  } finally { db.close() }
})

test('migration-preservation I3-07c: mantém o conteúdo legado ao abrir V7', (t) => {
  const db = openDatabase(legacy(t))
  try {
    assert.equal(db.pragma('user_version', { simple: true }), 14)
    assert.equal(db.prepare('SELECT body FROM documents').pluck().get(), 'Pista')
    assert.deepEqual(db.pragma('integrity_check'), [{ integrity_check: 'ok' }])
  } finally { db.close() }
})

test('migration-rollback I3-07c: reverte a criação da primeira tabela após colisão na segunda', (t) => {
  const path = legacy(t, true)
  assert.throws(() => openDatabase(path), /document_tags already exists/)
  const db = new Database(path)
  try {
    assert.equal(db.pragma('user_version', { simple: true }), 6)
    assert.equal(db.prepare("SELECT name FROM sqlite_schema WHERE name = 'tags'").get(), undefined)
    assert.equal(db.prepare('SELECT body FROM documents').pluck().get(), 'Pista')
  } finally { db.close() }
})
