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

function temporary(t: TestContext) {
  const dir = mkdtempSync(join(tmpdir(), 'perspectives-'))
  t.after(() => rmSync(dir, { recursive: true, force: true }))
  return dir
}

test('P10-03/13/15/16: sujeito explícito, correção, concorrência, ZIP e recuperação', async (t) => {
  const dir = temporary(t)
  const db = join(dir, 'live.sqlite')
  const app = createApp(db)
  let url = ''
  try {
    const request = (method: 'POST'|'PUT'|'PATCH', url: string, payload: object, key = randomUUID()) =>
      app.inject({ method, url, payload, headers: { 'Idempotency-Key': key } })
    const campaign = async () => '/api/campaigns/' + (await request('POST', '/api/campaigns', { name: 'Costa fictícia' })).json().id
    const root = await campaign()
    const other = await campaign()
    const actor = async (scope: string, type = 'character') => {
      const id = randomUUID()
      assert.equal((await request('POST', scope + '/wiki', { id, type, title: 'Marina fictícia', body: '' })).statusCode, 201)
      return id
    }
    const marina = await actor(root)
    const otherCharacter = await actor(root)
    const outsider = await actor(other)
    const npc = await actor(root, 'npc')
    const session = (await request('POST', root + '/sessions', { date: '2026-11-25' })).json().id
    const info = root + '/information/' + randomUUID()
    const another = root + '/information/' + randomUUID()
    const evidence = randomUUID()
    assert.equal((await request('PUT', info, { version: 0, statement: 'Luzes no farol', nature: 'report' })).statusCode, 201)
    assert.equal((await request('PUT', another, { version: 0, statement: 'Outra afirmação', nature: 'rumor',
      evidence: [{ id: randomUUID(), role: 'supports', source: { text: 'Outra evidência' } }] })).statusCode, 201)
    url = info + '/perspectives'
    const read = async () => (await app.inject(url)).json()
    assert.deepEqual(await read(), { version: 0, player: false, coverage: 'undefined', events: [] })
    const player = { version: 0, discovery: { id: randomUUID(), kind: 'heard' } }
    const key = randomUUID()
    const confirmed = await request('PUT', url, player, key)
    assert.equal(confirmed.statusCode, 200, confirmed.body)
    assert.deepEqual((await request('PUT', url, player, key)).json(), confirmed.json())
    assert.equal((await request('PUT', url, { ...player, coverage: 'none' }, key)).statusCode, 409)
    assert.equal((await read()).coverage, 'undefined')
    assert.equal((await request('PUT', url, { version: 1, coverage: 'none' })).statusCode, 200)
    assert.equal((await read()).coverage, 'none')
    for (const characterId of [outsider, npc]) {
      assert.equal((await request('PUT', url, { version: 2, discovery: { id: randomUUID(), characterId, kind: 'heard' } })).statusCode, 404)
    }
    const heard = randomUUID()
    assert.equal((await request('PUT', url, { version: 2, discovery: { id: heard, characterId: marina, kind: 'heard', sessionId: session } })).statusCode, 200)
    assert.equal((await read()).coverage, 'undefined')
    assert.equal((await request('PUT', info, { version: 1, state: 'refuted', justification: 'Investigação',
      decisionEvidenceId: evidence, evidence: [{ id: evidence, role: 'contradicts', source: { text: 'O mecanismo funcionou sozinho' } }] })).statusCode, 200)
    const knowledge = (id: string) => app.inject(root + '/perspectives?characterId=' + id)
    assert.deepEqual((await knowledge(marina)).json()[0].discoveries.map(({ kind }: { kind: string }) => kind), ['heard'])
    assert.equal(JSON.stringify((await knowledge(marina)).json()).includes('O mecanismo funcionou sozinho'), false)
    const contested = randomUUID()
    assert.equal((await request('PUT', url, { version: 3, discovery: { id: contested, characterId: marina, kind: 'contested' } })).statusCode, 200)
    assert.equal(JSON.stringify((await knowledge(marina)).json()).includes('O mecanismo funcionou sozinho'), false)
    const draft = { id: randomUUID(), characterId: otherCharacter, kind: 'evidence', evidenceId: evidence }
    const foreignEvidence = (await app.inject(another)).json().evidence[0].id
    assert.equal((await request('PUT', url, { version: 4, discovery: { ...draft, evidenceId: foreignEvidence } })).statusCode, 404)
    assert.equal((await read()).version, 4)
    assert.equal((await request('PUT', url, { version: 3, discovery: draft })).statusCode, 409)
    assert.equal((await request('PUT', url, { version: 4, discovery: draft })).statusCode, 200)
    assert.match(JSON.stringify((await knowledge(otherCharacter)).json()), /mecanismo funcionou sozinho/)
    assert.equal((await request('PUT', info, { version: 2, evidence: [{ id: randomUUID(), role: 'contradicts',
      source: { text: 'Correção ainda desconhecida' }, replacesId: evidence }] })).statusCode, 200)
    const known = (await knowledge(otherCharacter)).json()[0].discoveries[0]
    assert.equal(known.evidence.id, evidence)
    assert.equal(known.evidence.text, 'O mecanismo funcionou sozinho')
    assert.equal((await request('PUT', url, { version: 5, discovery: { id: randomUUID(), kind: 'contested',
      characterId: marina, replacesId: contested, fictionalDate: 'Dia 8' } })).statusCode, 200)
    assert.equal((await read()).events.length, 6)
    assert.equal((await request('PATCH', root + '/sessions/' + session + '/trash', { trashed: true })).statusCode, 200)
    const zipped = JSON.parse(strFromU8(unzipSync((await app.inject('/api/export')).rawPayload)['lorekeeper.json']))
    assert.equal(zipped.perspectiveEvents.length, 6)
    assert.equal(zipped.perspectiveEvents.find(({ id }: { id: string }) => id === heard).session_id, session)
    assert.equal((await knowledge(marina)).json()[0].discoveries[0].session.available, false)
    await copyDatabase(db, join(dir, 'backup.sqlite'))
    assert.equal((await request('PATCH', root + '/sessions/' + session + '/trash', { trashed: false })).statusCode, 200)
    assert.equal((await knowledge(marina)).json()[0].discoveries[0].session.available, true)
    assert.equal((await app.inject(info)).json().version, 3)
    assert.equal((await app.inject(root + '/perspectives')).json().length, 1)
  } finally { await app.close() }
  const restored = join(dir, 'restored.sqlite')
  await copyDatabase(join(dir, 'backup.sqlite'), restored)
  const inspect = openDatabase(restored)
  try { assert.equal(inspect.pragma('integrity_check', { simple: true }), 'ok'); assert.deepEqual(inspect.pragma('foreign_key_check'), []) }
  finally { inspect.close() }
  const replica = createApp(restored)
  try {
    const result = (await replica.inject(url)).json()
    assert.equal(result.player, true)
    assert.equal(result.events.length, 6)
    assert.equal(result.events.find((row: { session: unknown }) => row.session).session.available, false)
  } finally { await replica.close() }
})

test('P10-15: falha ao gravar descoberta reverte versão e comprovante', async (t) => {
  const path = join(temporary(t), 'failure.sqlite')
  const app = createApp(path)
  const raw = new Database(path)
  try {
    const { id } = (await app.inject({ method: 'POST', url: '/api/campaigns', payload: { name: 'Ilhas fictícias' } })).json()
    const info = `/api/campaigns/${id}/information/${randomUUID()}`
    assert.equal((await app.inject({ method: 'PUT', url: info,
      headers: { 'Idempotency-Key': randomUUID() }, payload: { version: 0, statement: 'Farol', nature: 'rumor' } })).statusCode, 201)
    const url = info + '/perspectives'
    const key = randomUUID()
    const write = () => app.inject({ method: 'PUT', url, headers: { 'Idempotency-Key': key },
      payload: { version: 0, coverage: 'none' } })
    raw.exec(`CREATE TRIGGER fail_event BEFORE INSERT ON perspective_events
      BEGIN SELECT RAISE(ABORT, 'Falha fictícia de gravação'); END`)
    assert.equal((await write()).statusCode, 500)
    assert.deepEqual((await app.inject(url)).json(), { version: 0, player: false, coverage: 'undefined', events: [] })
    assert.equal(raw.prepare('SELECT count(*) FROM perspective_receipts').pluck().get(), 0)
    raw.exec('DROP TRIGGER fail_event')
    assert.equal((await write()).statusCode, 200)
  } finally { raw.close(); await app.close() }
})

function legacy(t: TestContext, collision = false) {
  const path = join(temporary(t), 'v16.sqlite')
  const db = new Database(path)
  try {
    for (let v = 1; v <= 16; v++) db.exec(readFileSync(new URL(`../fixtures/sqlite-v${v}.sql`, import.meta.url), 'utf8'))
    db.exec(`INSERT INTO campaigns (id,name,created_at,updated_at) VALUES ('a','Costa','hoje','hoje');
      INSERT INTO narrative_items(campaign_id,id,statement,nature,state,source,version,created_at,updated_at)
      VALUES ('a','info','Farol','rumor','open','{}',1,'hoje','hoje');`)
    if (collision) db.exec('CREATE TABLE perspective_receipts (id TEXT)')
  } finally { db.close() }
  return path
}

test('migration-preservation P10-B: mantém informação de V16 sem atribuição', (t) => {
  const db = openDatabase(legacy(t))
  try {
    assert.equal(db.pragma('user_version', { simple: true }), 17)
    assert.equal(db.prepare('SELECT statement FROM narrative_items').pluck().get(), 'Farol')
    assert.equal(db.prepare('SELECT count(*) FROM perspective_heads').pluck().get(), 0)
  } finally { db.close() }
})
test('migration-integrity P10-B: conhecimento exige informação da campanha', (t) => {
  const db = openDatabase(legacy(t))
  try {
    assert.throws(() => db.exec("INSERT INTO perspective_heads VALUES ('a','ausente',1,'undefined')"), /FOREIGN KEY/)
    assert.deepEqual(db.pragma('foreign_key_check'), [])
  } finally { db.close() }
})
test('migration-rollback P10-B: falha no comprovante desfaz o esquema', (t) => {
  const path = legacy(t, true)
  assert.throws(() => openDatabase(path), /already exists/)
  const db = new Database(path)
  try {
    assert.equal(db.pragma('user_version', { simple: true }), 16)
    assert.equal(db.prepare("SELECT name FROM sqlite_schema WHERE name='perspective_events'").get(), undefined)
  } finally { db.close() }
})
