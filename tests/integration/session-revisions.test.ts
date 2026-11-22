import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import Database from 'better-sqlite3'
import { createApp } from '../../src/server/app.ts'

test('I2-01: migra o texto legado e registra a próxima revisão sem perder os metadados', async (t) => {
  const folder = mkdtempSync(join(tmpdir(), 'lorekeeper-v1-'))
  const path = join(folder, 'test.sqlite')
  const legacy = new Database(path)
  try {
    legacy.exec(readFileSync(new URL('../fixtures/sqlite-v1.sql', import.meta.url), 'utf8'))
    legacy.exec(`
      INSERT INTO campaigns (id, name, created_at, updated_at)
      VALUES ('campanha-a', 'Farol', '2026-11-01', '2026-11-05'),
             ('campanha-b', 'Observatório', '2026-11-01', '2026-11-05');
      INSERT INTO documents (id, campaign_id, type, title, body, version, created_at, updated_at)
      VALUES ('sessao', 'campanha-a', 'session', 'Chegada', 'Farol avistado', 4, '2026-11-02', '2026-11-05');
      INSERT INTO sessions (document_id, session_date, fictional_date, participants, number)
      VALUES ('sessao', '2026-11-02', 'Dia 5', 'Lia', 1);
    `)
  } finally {
    legacy.close()
  }

  const app = createApp(path)
  t.after(async () => {
    await app.close()
    rmSync(folder, { recursive: true, force: true })
  })
  const url = '/api/campaigns/campanha-a/sessions/sessao'
  const history = `${url}/revisions`
  const first = await app.inject(history)
  assert.equal(first.statusCode, 200)
  assert.deepEqual(first.json(), [{ version: 4, title: 'Chegada', body: 'Farol avistado', createdAt: '2026-11-05' }])
  assert.equal((await app.inject('/api/campaigns/campanha-b/sessions/sessao/revisions')).statusCode, 404)
  const session = (await app.inject(url)).json()
  assert.equal(session.participants, 'Lia')
  assert.equal(session.body, 'Farol avistado')
  const updated = await app.inject({ method: 'PUT', url, payload: {
    version: 4, title: 'Chegada', body: 'Farol apagado', number: 1,
    date: '2026-11-02', fictionalDate: 'Dia 5', participants: 'Lia',
  } })
  assert.equal(updated.json().version, 5)
  const versions = (await app.inject(history)).json()
  assert.deepEqual(versions.map(({ version, body }: { version: number; body: string }) => [version, body]),
    [[5, 'Farol apagado'], [4, 'Farol avistado']])
})

test('I2-02: reenvio após reinício devolve o comprovante original sem repetir a mutação', async (t) => {
  const folder = mkdtempSync(join(tmpdir(), 'lorekeeper-retry-'))
  const path = join(folder, 'test.sqlite')
  let app = createApp(path)
  t.after(async () => {
    await app.close()
    rmSync(folder, { recursive: true, force: true })
  })
  const campaign = await app.inject({ method: 'POST', url: '/api/campaigns', payload: { name: 'Bruma' } })
  const sessions = `/api/campaigns/${campaign.json().id}/sessions`
  const session = await app.inject({ method: 'POST', url: sessions, payload: { date: '2026-11-03' } })
  const url = `${sessions}/${session.json().id}`
  const draft = {
    title: 'A ponte', body: 'Travessia segura', version: 1,
    date: '2026-11-03', fictionalDate: '', participants: '', number: null,
  }
  const headers = { 'idempotency-key': '3ca798e5-81a6-411a-a0a4-14a81ad58e81' }
  const write = (payload: typeof draft, key?: typeof headers) =>
    app.inject({ url, method: 'PUT', payload, headers: key })
  const probe = new Database(path)
  try {
    probe.exec(`
      CREATE TRIGGER block_receipt BEFORE INSERT ON session_save_receipts
      BEGIN SELECT RAISE(ABORT, 'falha simulada'); END;
    `)
    assert.equal((await write(draft, headers)).statusCode, 500)
    assert.equal((await app.inject(url)).json().version, 1)
    assert.deepEqual((await app.inject(`${url}/revisions`)).json()
      .map(({ version }: { version: number }) => version), [1])
    probe.exec('DROP TRIGGER block_receipt')
  } finally {
    probe.close()
  }

  const first = await write(draft, headers)
  assert.equal(first.statusCode, 200)
  assert.equal(first.json().version, 2)
  assert.equal((await write({ ...draft, body: 'A ponte fechou', version: 2 })).statusCode, 200)
  await app.close()
  app = createApp(path)
  const retry = await write(draft, headers)
  assert.equal(retry.statusCode, 200)
  assert.deepEqual(retry.json(), first.json())
  assert.equal((await write({ ...draft, body: 'Outro texto', version: 3 }, headers)).statusCode, 409)
  assert.equal((await app.inject(url)).json().body, 'A ponte fechou')
  assert.deepEqual((await app.inject(`${url}/revisions`)).json()
    .map(({ version }: { version: number }) => version), [3, 2, 1])
})
