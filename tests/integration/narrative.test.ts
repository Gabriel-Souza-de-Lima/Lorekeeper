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
  const dir = mkdtempSync(join(tmpdir(), 'lorekeeper-narrative-'))
  t.after(() => rmSync(dir, { recursive: true, force: true }))
  return dir
}

test('P10-A: confirmação, histórico, fontes, isolamento, idempotência e restauração', async (t) => {
  const dir = temp(t)
  const filename = join(dir, 'live.sqlite')
  const backup = join(dir, 'backup.sqlite')
  const app = createApp(filename)
  const id = randomUUID()
  let url = ''
  try {
    const post = (url: string, payload: object) => app.inject({ method: 'POST', url, payload })
    const campaign = async () => '/api/campaigns/' + (await post('/api/campaigns', { name: 'Farol fictício' })).json().id
    const root = await campaign()
    const other = await campaign()
    const list = root + '/information'
    url = list + '/' + id
    const session = (await post(root + '/sessions', { date: '2026-11-25' })).json()
    const npc = randomUUID()
    assert.equal((await post(root + '/wiki', { id: npc, title: 'Vigia', type: 'npc', body: 'Relato inicial' })).statusCode, 201)
    const foreign = (await post(other + '/sessions', { date: '2026-11-25' })).json().id
    const pending = randomUUID()
    assert.equal((await post(root + '/pending-items', { id: pending, title: 'Investigar' })).statusCode, 201)
    const write = (payload: object, key = randomUUID()) => app.inject({
      method: 'PUT', url, headers: { 'Idempotency-Key': key }, payload,
    })
    const original = { version: 0, statement: 'A luz é um sinal', nature: 'report' }
    assert.deepEqual((await app.inject(list)).json(), [])
    const key = randomUUID()
    const created = await write(original, key)
    assert.equal(created.statusCode, 201, created.body)
    assert.equal(created.json().state, 'open')
    assert.deepEqual((await write(original, key)).json(), created.json())
    assert.equal((await write({ ...original, statement: 'Outra' }, key)).statusCode, 409)
    assert.equal((await write({ version: 1, documents: [foreign], statement: 'Não aplicar' })).statusCode, 404)
    assert.equal((await write({ version: 1, state: 'confirmed', justification: 'Insuficiente' })).statusCode, 400)
    const support = randomUUID()
    const contradict = randomUUID()
    const saved = await write({ version: 1, state: 'disputed', justification: 'Dois relatos',
      documents: [npc, session.id], pending: [pending], evidence: [
        { id: support, role: 'supports', source: { documentId: session.id, text: 'Luz na costa' } },
        { id: contradict, role: 'contradicts', source: { text: 'Outro barco' } },
      ] })
    assert.equal(saved.statusCode, 200, saved.body)
    assert.equal(saved.json().nature, 'report')
    assert.equal(saved.json().evidence[0].source.revision, 1)
    assert.equal((await write({ version: 1, statement: 'Concorrente' })).statusCode, 409)
    assert.equal((await write({ version: 2, state: 'refuted', justification: 'O mecanismo explica a luz',
      decisionEvidenceId: contradict, evidence: [{ id: randomUUID(), role: 'supports', replacesId: support,
        source: { text: 'Correção explícita' } }] })).statusCode, 200)
    const sessionUrl = root + '/sessions/' + session.id
    const { id: sessionId, ...fields } = session
    assert.ok(sessionId)
    assert.equal((await app.inject({ method: 'PUT', url: sessionUrl, payload: { ...fields, title: 'Título posterior' } })).statusCode, 200)
    for (const trashed of [true, false]) {
      assert.equal((await app.inject({ method: 'PATCH', url: sessionUrl + '/trash', payload: { trashed } })).statusCode, 200)
      const item = (await app.inject(url)).json()
      assert.equal(item.evidence[0].source.available, !trashed)
      assert.equal(item.evidence[0].source.title, session.title)
      assert.equal(item.evidence[0].source.revision, 1)
      if (trashed) {
        const zip = unzipSync((await app.inject('/api/export')).rawPayload)
        const data = JSON.parse(strFromU8(zip['lorekeeper.json']))
        assert.ok(!data.documents.some(({ id }: { id: string }) => id === session.id))
        assert.equal(data.narrativeEvidence[0].source.documentId, session.id)
        assert.equal(data.narrativeEvidence[0].source.text, 'Luz na costa')
      }
      assert.deepEqual(item.history.map((row: { state: string }) => row.state), ['open', 'disputed', 'refuted'])
    }
    assert.equal((await app.inject(other + '/information/' + id)).statusCode, 404)
    const raw = new Database(filename)
    try {
      raw.pragma('foreign_keys = ON')
      assert.throws(() => raw.prepare('INSERT INTO narrative_document_links VALUES (?, ?, ?)')
        .run(root.split('/').at(-1), id, foreign), /FOREIGN KEY/)
    } finally { raw.close() }
    assert.equal((await app.inject(list + '?state=refuted&nature=report')).json()[0].id, id)
    assert.equal((await app.inject(root + '/pending-items/' + pending)).json().state, 'open')
    const zip = unzipSync((await app.inject('/api/export')).rawPayload)
    const data = JSON.parse(strFromU8(zip['lorekeeper.json']))
    assert.equal(data.narrativeItems[0].id, id)
    assert.equal(data.narrativeEvidence.length, 3)
    assert.equal(data.narrativeEvidence[0].source.documentId, session.id)
    assert.equal(data.narrativeHistory.length, 3)
    assert.equal(data.narrativePendingLinks[0].pending_id, pending)
    await copyDatabase(filename, backup)
  } finally { await app.close() }
  const restoredPath = join(dir, 'restored.sqlite')
  await copyDatabase(backup, restoredPath)
  const db = openDatabase(restoredPath)
  try { assert.deepEqual(db.pragma('foreign_key_check'), []); assert.equal(db.pragma('integrity_check', { simple: true }), 'ok') }
  finally { db.close() }
  const restored = createApp(restoredPath)
  try {
    const item = (await restored.inject(url)).json()
    assert.equal(item.state, 'refuted')
    assert.equal(item.history.length, 3)
    assert.equal(item.evidence.length, 3)
    assert.equal(item.documents.length, 2)
    assert.equal(item.pending.length, 1)
  }
  finally { await restored.close() }
})

test('P10-02/04/10: edição de natureza e confirmação manual preservam o original', async () => {
  const app = createApp(':memory:')
  try {
    const { id: campaign } = (await app.inject({ method: 'POST', url: '/api/campaigns',
      payload: { name: 'Costa fictícia' } })).json()
    const url = `/api/campaigns/${campaign}/information/${randomUUID()}`
    const save = (payload: object) => app.inject({
      method: 'PUT', url, headers: { 'Idempotency-Key': randomUUID() }, payload,
    })
    assert.equal((await save({ version: 0, statement: 'A luz veio do barco', nature: 'theory' })).statusCode, 201)
    const evidenceId = randomUUID()
    const failed = await save({ version: 1, nature: 'observation', state: 'confirmed',
      evidence: [{ id: evidenceId, role: 'supports', source: { text: 'Nota de teste' } }] })
    assert.equal(failed.statusCode, 400)
    assert.deepEqual((await app.inject(url)).json().evidence, [])
    const confirmed = await save({ version: 1, nature: 'observation', state: 'confirmed',
      justification: 'Observado durante a travessia', decisionEvidenceId: evidenceId,
      evidence: [{ id: evidenceId, role: 'supports', source: { text: 'Nota de teste' } }] })
    assert.equal(confirmed.statusCode, 200, confirmed.body)
    assert.deepEqual(confirmed.json().history.map(({ nature, state }: { nature: string; state: string }) => [nature, state]),
      [['theory', 'open'], ['observation', 'confirmed']])
    assert.equal(confirmed.json().evidence[0].source.kind, 'manual')
  } finally { await app.close() }
})

function legacy(t: TestContext, collision = false) {
  const path = join(temp(t), 'legacy.sqlite')
  const db = new Database(path)
  try {
    for (let i = 1; i <= 15; i++) db.exec(readFileSync(new URL(`../fixtures/sqlite-v${i}.sql`, import.meta.url), 'utf8'))
    db.exec("INSERT INTO campaigns (id, name, created_at, updated_at) VALUES ('a', 'Bruma', 'ontem', 'ontem')")
    if (collision) db.exec('CREATE TABLE narrative_save_receipts (id TEXT)')
  } finally { db.close() }
  return path
}

test('migration-preservation P10: mantém campanha de V15', (t) => {
  const db = openDatabase(legacy(t))
  try {
    assert.equal(db.pragma('user_version', { simple: true }), 16)
    assert.equal(db.prepare('SELECT name FROM campaigns').pluck().get(), 'Bruma')
  } finally { db.close() }
})
test('migration-integrity P10: histórico exige relação composta válida', (t) => {
  const db = openDatabase(legacy(t))
  try {
    assert.throws(() => db.exec("INSERT INTO narrative_history VALUES ('a','ausente',1,'Texto','rumor','open','','{}',NULL,'hoje')"), /FOREIGN KEY/)
    assert.deepEqual(db.pragma('foreign_key_check'), [])
  } finally { db.close() }
})
test('migration-rollback P10: colisão final desfaz as tabelas anteriores', (t) => {
  const path = legacy(t, true)
  assert.throws(() => openDatabase(path), /already exists/)
  const db = new Database(path)
  try {
    assert.equal(db.pragma('user_version', { simple: true }), 15)
    assert.equal(db.prepare("SELECT name FROM sqlite_schema WHERE name='narrative_items'").get(), undefined)
  } finally { db.close() }
})
