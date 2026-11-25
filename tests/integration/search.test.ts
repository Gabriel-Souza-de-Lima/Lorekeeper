import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import Database from 'better-sqlite3'
import type { TestContext } from 'node:test'
import { openDatabase } from '../../src/server/database.ts'
import { test } from 'node:test'
import { createApp } from '../../src/server/app.ts'

test('I3-08a/b: busca sem acentos e combina filtros após gravação, restauração e arquivamento', async () => {
  const app = createApp(':memory:')
  try {
    async function seed() {
      const campaign = (await app.inject({ method: 'POST', url: '/api/campaigns', payload: { name: 'Bruma' } })).json()
      const url = `/api/campaigns/${campaign.id}`
      const { id, ...session } = (await app.inject({ method: 'POST', url: `${url}/sessions`, payload: { date: '2026-11-22' } })).json()
      return { campaign, url, id, session }
    }
    const first = await seed()
    const second = await seed()
    const save = (entry: typeof first, body: string, version: number) => app.inject({
      method: 'PUT', url: `${entry.url}/sessions/${entry.id}`, payload: { ...entry.session, body, version },
    })
    assert.equal((await save(first, 'A bússola apontou para o farol.', 1)).statusCode, 200)
    assert.equal((await save(second, 'A bússola perdeu o norte.', 1)).statusCode, 200)
    const tags = await app.inject({ method: 'PUT', url: `${first.url}/documents/${first.id}/tags`, payload: { name: 'Pista' } })
    assert.equal(tags.statusCode, 200)
    const find = async (query: Record<string, string>) => {
      const response = await app.inject(`/api/search?${new URLSearchParams(query)}`)
      assert.equal(response.statusCode, 200)
      return response.json()
    }
    const filters = { q: '"bussola"', campaignId: first.campaign.id, type: 'session', tagId: tags.json().id }
    assert.equal((await find({ q: 'bussola' })).length, 2)
    const [match] = await find(filters)
    assert.equal(match.id, first.id)
    assert.ok(match.snippet.some((part: { text: string; match: boolean }) => part.text === 'bússola' && part.match))
    assert.deepEqual(await find({ ...filters, campaignId: second.campaign.id }), [])
    assert.deepEqual(await find({ ...filters, type: 'npc' }), [])
    assert.equal((await save(first, 'A lanterna apagou.', 2)).statusCode, 200)
    assert.deepEqual(await find(filters), [])
    const revisions = (await app.inject(`${first.url}/sessions/${first.id}/revisions`)).json()
    assert.equal((await save(first, revisions[1].body, 3)).statusCode, 200)
    await app.inject({ method: 'PATCH', url: first.url, payload: { archived: true } })
    assert.equal((await find(filters))[0].id, first.id)
  } finally { await app.close() }
})

function legacy(t: TestContext, collision = false) {
  const dir = mkdtempSync(join(tmpdir(), 'lorekeeper-search-'))
  t.after(() => rmSync(dir, { recursive: true, force: true }))
  const path = join(dir, 'test.sqlite')
  const db = new Database(path)
  try {
    db.pragma('foreign_keys = OFF')
    for (const version of [1, 2, 3, 4, 5, 6, 7]) {
      db.exec(readFileSync(new URL(`../fixtures/sqlite-v${version}.sql`, import.meta.url), 'utf8'))
    }
    db.exec("INSERT INTO documents (id, type, title, body, created_at, updated_at) VALUES ('nota', 'quick_note', 'Farol', 'Bússola', 'hoje', 'hoje')")
    if (collision) db.exec("CREATE TRIGGER documents_search_insert AFTER INSERT ON documents BEGIN SELECT 1; END")
  } finally { db.close() }
  return path
}

test('migration-preservation I3-08c: indexa documentos V7 e preserva o texto', (t) => {
  const db = openDatabase(legacy(t))
  try {
    assert.equal(db.pragma('user_version', { simple: true }), 17)
    assert.equal(db.prepare('SELECT body FROM documents').pluck().get(), 'Bússola')
    assert.equal(db.prepare("SELECT document_id FROM document_search WHERE document_search MATCH 'bussola'").pluck().get(), 'nota')
  } finally { db.close() }
})

test('migration-integrity I3-08c: gatilhos atualizam o índice junto do documento', (t) => {
  const db = openDatabase(legacy(t))
  try {
    db.exec("UPDATE documents SET body = 'Lanterna' WHERE id = 'nota'")
    const search = db.prepare('SELECT document_id FROM document_search WHERE document_search MATCH ?').pluck()
    assert.equal(search.get('bussola'), undefined)
    assert.equal(search.get('lanterna'), 'nota')
    assert.deepEqual(db.pragma('integrity_check'), [{ integrity_check: 'ok' }])
    assert.deepEqual(db.pragma('foreign_key_check'), [])
  } finally { db.close() }
})

test('migration-rollback I3-08c: colisão no gatilho reverte a criação do índice', (t) => {
  const path = legacy(t, true)
  assert.throws(() => openDatabase(path), /documents_search_insert already exists/)
  const db = new Database(path)
  try {
    assert.equal(db.pragma('user_version', { simple: true }), 7)
    assert.equal(db.prepare("SELECT name FROM sqlite_schema WHERE name = 'document_search'").get(), undefined)
    assert.equal(db.prepare('SELECT body FROM documents').pluck().get(), 'Bússola')
  } finally { db.close() }
})
