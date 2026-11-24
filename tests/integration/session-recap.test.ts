import assert from 'node:assert/strict'
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
  const dir = mkdtempSync(join(tmpdir(), 'session-recap-'))
  t.after(() => rmSync(dir, { recursive: true, force: true }))
  return dir
}

test('P7-01/02/03/04/07/08/09: resumo respeita versão, lixeira, histórico e backup', async (t) => {
  const dir = temp(t)
  const live = join(dir, 'live.sqlite')
  const backup = join(dir, 'backup.sqlite')
  const app = createApp(live)
  let root = ''
  let url = ''
  try {
    const post = (url: string, payload: object) => app.inject({ method: 'POST', url, payload })
    root = '/api/campaigns/' + (await post('/api/campaigns', { name: 'Ilhas' })).json().id
    const { id, ...fields } = (await post(root + '/sessions', { date: '2026-11-24' })).json()
    url = root + '/sessions/' + id
    const save = (payload: object) => app.inject({ method: 'PUT', url, payload })
    const read = async () => (await app.inject(root + '/recap')).json().sessions
    const changeTrash = (trashed: boolean) => app.inject({ method: 'PATCH', url: url + '/trash', payload: { trashed } })
    assert.equal((await read())[0].excerpt, '')
    const draft = { ...fields, summary: 'Encontraram o farol', highlights: 'Chegaram à costa\nRecuperaram o mapa' }
    const saved = await save(draft)
    assert.equal(saved.statusCode, 200, saved.body)
    assert.equal(saved.json().version, fields.version + 1)
    assert.equal((await read())[0].summary, draft.summary)
    assert.equal((await read())[0].highlights, draft.highlights)
    assert.equal((await save({ ...draft, summary: 'Conflito' })).statusCode, 409)
    const legacy = await save({ ...fields, version: saved.json().version, body: 'Trecho literal.' })
    assert.equal(legacy.statusCode, 200)
    assert.equal(legacy.json().summary, draft.summary)
    assert.deepEqual((await app.inject(url + '/revisions')).json().map((item: { version: number }) => item.version), [3, 1])
    assert.equal((await changeTrash(true)).statusCode, 200)
    assert.deepEqual(await read(), [])
    assert.equal((await changeTrash(false)).statusCode, 200)
    assert.equal((await read())[0].summary, draft.summary)
    const zip = unzipSync((await app.inject('/api/export')).rawPayload)
    assert.equal(JSON.parse(strFromU8(zip['lorekeeper.json'])).sessions[0].summary, draft.summary)
    await copyDatabase(live, backup)
  } finally { await app.close() }
  const restored = join(dir, 'restored.sqlite')
  await copyDatabase(backup, restored)
  const reopen = createApp(restored)
  try {
    assert.equal((await reopen.inject(url)).json().summary, 'Encontraram o farol')
    assert.equal((await reopen.inject(root + '/recap')).json().sessions[0].summary, 'Encontraram o farol')
  } finally { await reopen.close() }
})

function legacy(t: TestContext, collision = false) {
  const file = join(temp(t), 'previous.sqlite')
  const db = new Database(file)
  try {
    for (let version = 1; version <= 12; version++) {
      db.exec(readFileSync(new URL(`../fixtures/sqlite-v${version}.sql`, import.meta.url), 'utf8'))
    }
    db.exec(`INSERT INTO campaigns (id, name, created_at, updated_at) VALUES ('a', 'Ilhas', 'ontem', 'ontem');
      INSERT INTO documents (id, campaign_id, title, body, type, created_at, updated_at)
        VALUES ('s', 'a', 'Partida', 'Trecho', 'session', 'ontem', 'ontem');
      INSERT INTO sessions (document_id, session_date) VALUES ('s', '2026-11-24');`)
    if (collision) db.exec("ALTER TABLE sessions ADD COLUMN highlights TEXT NOT NULL DEFAULT ''")
  } finally { db.close() }
  return file
}

test('migration-preservation P7: mantém texto, sessão e data existentes', (t) => {
  const db = openDatabase(legacy(t))
  try {
    assert.equal(db.prepare('SELECT body FROM documents').pluck().get(), 'Trecho')
    assert.deepEqual(db.prepare('SELECT session_date, summary, highlights FROM sessions').get(),
      { session_date: '2026-11-24', summary: '', highlights: '' })
  } finally { db.close() }
})

test('migration-integrity P7: mantém chaves e restringe o resumo', (t) => {
  const db = openDatabase(legacy(t))
  try {
    assert.throws(() => db.prepare('UPDATE sessions SET summary = ?').run('x'.repeat(601)), /CHECK/)
    assert.deepEqual(db.pragma('foreign_key_check'), [])
  } finally { db.close() }
})

test('migration-rollback P7: falha em destaques desfaz a inclusão do resumo', (t) => {
  const file = legacy(t, true)
  assert.throws(() => openDatabase(file), /duplicate column/)
  const db = new Database(file)
  try {
    assert.equal(db.pragma('user_version', { simple: true }), 12)
    assert.equal(db.prepare('SELECT body FROM documents').pluck().get(), 'Trecho')
    assert.throws(() => db.prepare('SELECT summary FROM sessions'), /no such column/)
  } finally { db.close() }
})
