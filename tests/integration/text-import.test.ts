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
  const dir = mkdtempSync(join(tmpdir(), 'text-import-'))
  t.after(() => rmSync(dir, { recursive: true, force: true }))
  return dir
}

test('P8-05/06/08/09/10/11/12: importa uma vez, indexa, exporta e restaura a origem', async (t) => {
  const dir = temp(t)
  const live = join(dir, 'live.sqlite')
  const backup = join(dir, 'backup.sqlite')
  const app = createApp(live)
  const id = randomUUID()
  let session = ''
  try {
    const campaign = async () => '/api/campaigns/' + (await app.inject({
      method: 'POST', url: '/api/campaigns', payload: { name: 'Costa' },
    })).json().id
    const root = await campaign()
    const other = await campaign()
    const url = root + '/import-text'
    const body = 'Café avistado perto de [[Costa]]'
    const payload = { id, filename: 'texto.txt', source: 'Caderno fictício', title: 'Registro',
      date: '2026-11-24', data: Buffer.from(body).toString('base64'), body }
    const key = randomUUID()
    const upload = (changes = {}, target = url) => app.inject({
      method: 'POST', url: target, headers: { 'Idempotency-Key': key }, payload: { ...payload, ...changes },
    })
    for (const malformed of [{ filename: 'texto.pdf' }, { data: '/w==' }, { data: 'AA==' },
      { data: Buffer.alloc(512 * 1024 + 1).toString('base64') }]) {
      const result = await upload(malformed)
      assert.ok([400, 413].includes(result.statusCode), result.body)
    }
    assert.deepEqual((await app.inject(root + '/sessions')).json(), [])
    const created = await upload()
    assert.equal(created.statusCode, 201, created.body)
    const retry = await upload()
    assert.equal(retry.statusCode, 200)
    assert.deepEqual(retry.json(), created.json())
    assert.equal((await upload({ body: 'Não sobrescrever' })).statusCode, 409)
    assert.equal((await upload({}, other + '/import-text')).statusCode, 409)
    session = root + '/sessions/' + id
    assert.equal((await app.inject(session)).json().body, body)
    assert.equal((await app.inject(session + '/import-source')).json().source, payload.source)
    const rows = (await app.inject('/api/search?q=cafe')).json()
    assert.equal(rows[0].id, id)
    const { id: savedId, ...fields } = created.json()
    assert.equal(savedId, id)
    assert.equal((await app.inject({ method: 'PUT', url: session, payload: { ...fields, body: body + ' revisto' } })).statusCode, 200)
    const zip = unzipSync((await app.inject('/api/export')).rawPayload)
    const manifest = JSON.parse(strFromU8(zip['lorekeeper.json']))
    assert.deepEqual(manifest.sessionImports[0], { document_id: id, filename: 'texto.txt', source: payload.source })
    await copyDatabase(live, backup)
  } finally { await app.close() }
  const restored = join(dir, 'restored.sqlite')
  await copyDatabase(backup, restored)
  const reopened = createApp(restored)
  try {
    assert.equal((await reopened.inject(session + '/import-source')).json().filename, 'texto.txt')
    assert.match((await reopened.inject(session)).json().body, /revisto/)
  } finally { await reopened.close() }
})

function legacy(t: TestContext, collision = false) {
  const path = join(temp(t), 'legacy.sqlite')
  const db = new Database(path)
  try {
    for (let version = 1; version <= 13; version++) {
      db.exec(readFileSync(new URL(`../fixtures/sqlite-v${version}.sql`, import.meta.url), 'utf8'))
    }
    db.exec("INSERT INTO campaigns (id, name, created_at, updated_at) VALUES ('a', 'Costa', 'ontem', 'ontem')")
    if (collision) db.exec("CREATE VIEW session_imports AS SELECT id FROM campaigns")
  } finally { db.close() }
  return path
}

test('migration-preservation P8: mantém campanha de V13 e não inventa proveniência', (t) => {
  const db = openDatabase(legacy(t))
  try {
    assert.equal(db.prepare('SELECT name FROM campaigns').pluck().get(), 'Costa')
    assert.equal(db.prepare('SELECT count(*) FROM session_imports').pluck().get(), 0)
  } finally { db.close() }
})

test('migration-integrity P8: proveniência exige sessão existente', (t) => {
  const db = openDatabase(legacy(t))
  try {
    assert.throws(() => db.exec("INSERT INTO session_imports VALUES ('ausente', 'texto.txt', '')"), /FOREIGN KEY/)
    assert.deepEqual(db.pragma('foreign_key_check'), [])
  } finally { db.close() }
})

test('migration-rollback P8: colisão de schema conserva a versão e a campanha', (t) => {
  const path = legacy(t, true)
  assert.throws(() => openDatabase(path), /already exists/)
  const db = new Database(path)
  try {
    assert.equal(db.pragma('user_version', { simple: true }), 13)
    assert.equal(db.prepare('SELECT name FROM campaigns').pluck().get(), 'Costa')
  } finally { db.close() }
})
