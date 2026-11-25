import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import Database from 'better-sqlite3'
import { createApp } from '../../src/server/app.ts'

const inbox = '/api/quick-notes'
const noteId = '7c8bd4bb-222a-421a-b5c0-662eb49cb70b'

function installLegacySchema(db: Database.Database) {
  for (const version of [1, 2]) {
    db.exec(readFileSync(new URL(`../fixtures/sqlite-v${version}.sql`, import.meta.url), 'utf8'))
  }
}

test('I3-01a/b: captura somente texto e preserva a nota e sua identidade após reiniciar', async (t) => {
  const folder = mkdtempSync(join(tmpdir(), 'lorekeeper-inbox-'))
  const path = join(folder, 'test.sqlite')
  let app = createApp(path)
  t.after(async () => {
    await app.close()
    rmSync(folder, { recursive: true, force: true })
  })
  const post = (id: string, body: string) => app.inject({ method: 'POST', url: inbox, payload: { id, body } })
  assert.equal((await post(noteId, ' \n ')).statusCode, 400)
  const original = '  \n# O farol\n\nA bússola girou.\n'
  const created = await post(noteId, original)
  assert.equal(created.statusCode, 201)
  assert.equal(created.json().id, noteId)
  assert.equal(created.json().title, '# O farol')
  assert.equal(created.json().body, original)
  assert.equal(created.json().campaignId, null)
  await app.close()
  app = createApp(path)
  const repeat = await post(noteId, original)
  assert.equal(repeat.statusCode, 200)
  assert.deepEqual(repeat.json(), created.json())
  assert.equal((await post(noteId, 'Texto diferente')).statusCode, 409)
  assert.deepEqual((await app.inject(inbox)).json(), [created.json()])
})

test('I3-01c: a migração preserva uma sessão legada, suas revisões e comprovantes', async (t) => {
  const folder = mkdtempSync(join(tmpdir(), 'lorekeeper-inbox-migration-'))
  const path = join(folder, 'test.sqlite')
  t.after(() => rmSync(folder, { recursive: true, force: true }))
  const legacy = new Database(path)
  const session = { id: 'sessao', title: 'Farol', body: 'Versão dois', version: 2,
    date: '2026-11-22', fictionalDate: '', participants: '', number: null }
  try {
    installLegacySchema(legacy)
    legacy.exec(`
      INSERT INTO campaigns (id, name, created_at, updated_at)
      VALUES ('campanha', 'Bruma', '2026-11-20', '2026-11-22');
      INSERT INTO documents VALUES ('sessao', 'campanha', 'session', 'Farol', 'Versão dois', 2, '2026-11-20', '2026-11-22');
      INSERT INTO sessions VALUES ('sessao', '2026-11-22', '', '', NULL);
      INSERT INTO session_revisions VALUES ('sessao', 1, 'Farol', 'Versão um', '2026-11-20'),
        ('sessao', 2, 'Farol', 'Versão dois', '2026-11-22');
    `)
    legacy.prepare('INSERT INTO session_save_receipts VALUES (?, ?, ?, ?, ?)')
      .run('sessao', 'comprovante-legado', 2, 'hash-legado', JSON.stringify(session))
  } finally {
    legacy.close()
  }
  const app = createApp(path)
  try {
    assert.deepEqual((await app.inject('/api/campaigns/campanha/sessions/sessao')).json(), session)
    const revisions = (await app.inject('/api/campaigns/campanha/sessions/sessao/revisions')).json()
    assert.deepEqual(revisions.map(({ body }: { body: string }) => body), ['Versão dois', 'Versão um'])
    assert.deepEqual((await app.inject(inbox)).json(), [])
    const created = await app.inject({ method: 'POST', url: inbox, payload: { id: noteId, body: 'Uma pista.' } })
    assert.equal(created.statusCode, 201)
    assert.equal((await app.inject('/api/campaigns/campanha')).json().sessionCount, 1)
  } finally {
    await app.close()
  }
  const inspected = new Database(path, { readonly: true })
  try {
    assert.equal(inspected.pragma('user_version', { simple: true }), 16)
    assert.deepEqual(inspected.pragma('foreign_key_check'), [])
    assert.deepEqual(inspected.prepare('SELECT request_hash, response_json FROM session_save_receipts').get(),
      { request_hash: 'hash-legado', response_json: JSON.stringify(session) })
  } finally {
    inspected.close()
  }
})

test('I3-01c: uma verificação de integridade reprovada reverte a migração V3', (t) => {
  const folder = mkdtempSync(join(tmpdir(), 'lorekeeper-inbox-rollback-'))
  const path = join(folder, 'test.sqlite')
  t.after(() => rmSync(folder, { recursive: true, force: true }))
  const legacy = new Database(path)
  try {
    installLegacySchema(legacy)
    legacy.pragma('foreign_keys = OFF')
    legacy.exec(`
      INSERT INTO documents VALUES ('sessao', 'campanha-ausente', 'session',
        'Farol', 'Texto preservado', 1, '2026-11-20', '2026-11-22')
    `)
  } finally {
    legacy.close()
  }

  assert.throws(() => createApp(path), /migração da caixa de entrada violou relações existentes/)
  const reverted = new Database(path, { readonly: true })
  try {
    assert.equal(reverted.pragma('user_version', { simple: true }), 2)
    assert.deepEqual(reverted.prepare('SELECT body FROM documents WHERE id = ?').get('sessao'),
      { body: 'Texto preservado' })
    assert.equal(reverted.prepare("SELECT 1 FROM sqlite_schema WHERE name = 'documents_v3'").get(), undefined)
  } finally {
    reverted.close()
  }
})

test('I3-03: encaminha uma nota uma vez e isola as consultas por campanha', async (t) => {
  const app = createApp(':memory:')
  t.after(() => app.close())
  const campaign = async (name: string) =>
    (await app.inject({ method: 'POST', url: '/api/campaigns', payload: { name } })).json().id as string
  const first = await campaign('Farol')
  const second = await campaign('Observatório')
  const archive = (id: string) =>
    app.inject({ method: 'PATCH', url: `/api/campaigns/${id}`, payload: { archived: true } })
  await archive(second)
  const captured = await app.inject({ method: 'POST', url: inbox, payload: { id: noteId, body: 'Bússola quebrada.' } })
  assert.equal(captured.statusCode, 201)
  const assign = (campaignId: string) => app.inject({
    method: 'PUT', url: `${inbox}/${noteId}/campaign`, payload: { campaignId },
  })
  const list = (id: string) => app.inject(`/api/campaigns/${id}/quick-notes`)

  const missing = 'faa06cb0-1abe-477a-ac0c-412b18c02f19'
  assert.equal((await assign(missing)).statusCode, 404)
  assert.equal((await assign(second)).statusCode, 409)
  assert.deepEqual((await app.inject(inbox)).json(), [captured.json()])
  assert.equal((await list(missing)).statusCode, 404)

  const assigned = await assign(first)
  assert.equal(assigned.statusCode, 200)
  assert.deepEqual(assigned.json(), { ...captured.json(), campaignId: first })
  assert.deepEqual((await assign(first)).json(), assigned.json())
  const uppercaseRetry = await app.inject({
    method: 'PUT', url: `${inbox}/${noteId.toUpperCase()}/campaign`,
    payload: { campaignId: first.toUpperCase() },
  })
  assert.equal(uppercaseRetry.statusCode, 200)
  assert.deepEqual(uppercaseRetry.json(), assigned.json())
  assert.deepEqual((await app.inject(inbox)).json(), [])
  assert.deepEqual((await list(second)).json(), [])
  assert.equal((await assign(second)).statusCode, 409)
  assert.deepEqual((await list(first)).json(), [assigned.json()])
  assert.equal((await app.inject(`/api/campaigns/${first}`)).json().sessionCount, 0)
  await archive(first)
  assert.deepEqual((await list(first)).json(), [assigned.json()])
})

test('I3-03: distingue identificador malformado de anotação inexistente', async (t) => {
  const app = createApp(':memory:')
  t.after(() => app.close())
  const payload = { campaignId: 'faa06cb0-1abe-477a-ac0c-412b18c02f19' }
  const assign = (id: string) => app.inject({
    method: 'PUT', url: `${inbox}/${id}/campaign`, payload,
  })
  assert.equal((await assign('nao-e-uuid')).statusCode, 400)
  assert.equal((await assign(noteId)).statusCode, 404)
})
