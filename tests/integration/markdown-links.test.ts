import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import Database from 'better-sqlite3'
import { test } from 'node:test'
import { createApp } from '../../src/server/app.ts'

test('I3-06a/b: atualiza relações Markdown junto da gravação e preserva vínculos manuais', async (t) => {
  const directory = mkdtempSync(join(tmpdir(), 'lorekeeper-markdown-links-'))
  t.after(() => rmSync(directory, { recursive: true, force: true }))
  const database = join(directory, 'test.sqlite')
  const app = createApp(database)
  try {
    const campaign = async () => (await app.inject({ method: 'POST', url: '/api/campaigns', payload: { name: 'Bruma' } })).json().id
    const base = `/api/campaigns/${await campaign()}`
    const foreign = `/api/campaigns/${await campaign()}`
    async function page(url: string) {
      const id = randomUUID()
      assert.equal((await app.inject({ method: 'POST', url: `${url}/wiki`, payload: { id, type: 'npc', title: 'Guia', body: '' } })).statusCode, 201)
      return id
    }
    const [first, second, ignored, outside] = [await page(base), await page(base), await page(base), await page(foreign)]
    const { id, ...fields } = (await app.inject({ method: 'POST', url: `${base}/sessions`, payload: { date: '2026-11-22' } })).json()
    const path = `${base}/sessions/${id}`
    const body = [
      `[Guia](#wiki-${first}) [Outro nome](#wiki-${first}) [Também visto][guia]`,
      `[Fora](#wiki-${outside}) ![Figura](#wiki-${ignored}) \`[Código](#wiki-${ignored})\``,
      `[guia]: #wiki-${first}`,
    ].join('\n\n')
    const save = (text: string, version: number, operationId = randomUUID()) => app.inject({
      method: 'PUT', url: path, headers: { 'idempotency-key': operationId }, payload: { ...fields, body: text, version },
    })
    const ids = async () => (await app.inject(`${path}/wiki-links`)).json().map((item: { id: string }) => item.id)
    const backlinks = async (target: string) => (await app.inject(`${base}/wiki/${target}/backlinks`)).json()
    const operation = randomUUID()
    assert.equal((await save(body, 1, operation)).statusCode, 200)
    assert.deepEqual(await ids(), [first])
    assert.equal((await backlinks(first)).length, 1)
    assert.equal((await app.inject({ method: 'PUT', url: `${path}/wiki-links/${first}` })).statusCode, 204)
    const replacement = `[Novo][referência]\n\n[referência]: #wiki-${second}`
    assert.equal((await save(replacement, 2)).statusCode, 200)
    assert.equal((await save(body, 1, operation)).statusCode, 200)
    assert.equal((await save(`[Desatualizado](#wiki-${ignored})`, 2)).statusCode, 409)
    assert.deepEqual((await ids()).sort(), [first, second].sort())
    assert.deepEqual(await backlinks(ignored), [])
    const prior = (await app.inject(`${path}/revisions`)).json().find((revision: { version: number }) => revision.version === 2)
    assert.equal(prior.body, body)
    assert.equal((await save(prior.body, 3)).statusCode, 200)
    assert.deepEqual(await ids(), [first])
    assert.deepEqual(await backlinks(second), [])
    assert.equal((await backlinks(first)).length, 1)

    const db = new Database(database)
    try {
      db.exec(`CREATE TRIGGER test_block_link BEFORE INSERT ON document_links
        WHEN NEW.origin = 'markdown' BEGIN SELECT RAISE(ABORT, 'Falha simulada'); END`)
    } finally { db.close() }
    assert.equal((await save(replacement, 4)).statusCode, 500)
    const current = (await app.inject(path)).json()
    assert.equal(current.body, body)
    assert.equal(current.version, 4)
    const persisted = new Database(database, { readonly: true })
    try {
      assert.deepEqual(persisted.prepare("SELECT target_id FROM document_links WHERE origin = 'markdown'").pluck().all(), [first])
    } finally { persisted.close() }
    assert.equal((await app.inject(`${path}/revisions`)).json().length, 4)
    assert.deepEqual(await ids(), [first])
    assert.deepEqual(await backlinks(second), [])
  } finally { await app.close() }
})
