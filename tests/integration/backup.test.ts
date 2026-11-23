import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test, type TestContext } from 'node:test'
import { createApp } from '../../src/server/app.ts'
import { openDatabase } from '../../src/server/database.ts'
import { copyDatabase } from '../../src/server/backup.ts'

function directory(t: TestContext) {
  const dir = mkdtempSync(join(tmpdir(), 'lorekeeper-backup-'))
  t.after(() => rmSync(dir, { recursive: true, force: true }))
  return dir
}

test('I4-02a/b: copia o WAL e restaura conteúdo, revisões, relações e busca em outra instância', async (t) => {
  const dir = directory(t)
  const original = join(dir, 'original.sqlite')
  const backup = join(dir, 'backup.sqlite')
  const restored = join(dir, 'restored.sqlite')
  const live = createApp(original)
  try {
    const campaign = (await live.inject({ method: 'POST', url: '/api/campaigns', payload: { name: 'Bruma' } })).json()
    const root = `/api/campaigns/${campaign.id}`
    const { id, ...fields } = (await live.inject({
      method: 'POST', url: `${root}/sessions`, payload: { date: '2026-11-22' },
    })).json()
    const npc = randomUUID()
    const note = randomUUID()
    assert.equal((await live.inject({ method: 'POST', url: `${root}/wiki`, payload: { id: npc, type: 'npc', title: 'Guia', body: '' } })).statusCode, 201)
    assert.equal((await live.inject({ method: 'POST', url: '/api/quick-notes', payload: { id: note, body: 'Uma pista.' } })).statusCode, 201)
    const session = `${root}/sessions/${id}`
    const body = `A bússola apontou para o [guia](#wiki-${npc}).`
    assert.equal((await live.inject({ method: 'PUT', url: session, payload: { ...fields, body } })).statusCode, 200)
    assert.ok(existsSync(`${original}-wal`))
    await copyDatabase(original, backup)
    assert.equal((await live.inject({
      method: 'PUT', url: session, payload: { ...fields, version: 2, body: 'Texto posterior.' },
    })).statusCode, 200)
    await copyDatabase(backup, restored)
    const replica = createApp(restored)
    try {
      assert.equal((await replica.inject(root)).json().name, 'Bruma')
      assert.equal((await replica.inject(session)).json().body, body)
      assert.equal((await replica.inject(`${session}/revisions`)).json().length, 2)
      assert.equal((await replica.inject(`${root}/wiki/${npc}/backlinks`)).json()[0].id, id)
      assert.equal((await replica.inject('/api/quick-notes')).json()[0].id, note)
      assert.equal((await replica.inject('/api/search?q=bussola')).json()[0].id, id)
      assert.equal((await live.inject(session)).json().body, 'Texto posterior.')
    } finally { await replica.close() }
  } finally { await live.close() }
})

test('I4-02c: origens inválidas, destinos ocupados e falha de publicação preservam dados', async (t) => {
  const dir = directory(t)
  const source = join(dir, 'original.sqlite')
  const invalid = join(dir, 'invalid.sqlite')
  const target = join(dir, 'destino.sqlite')
  const broken = join(dir, 'broken.sqlite')
  const damaged = openDatabase(broken)
  try {
    damaged.pragma('foreign_keys = OFF')
    damaged.exec("INSERT INTO document_links VALUES ('ausente', 'outro', 'manual')")
  } finally { damaged.close() }
  const app = openDatabase(source)
  app.close()
  const before = readFileSync(source)
  writeFileSync(invalid, 'inválido')
  await assert.rejects(copyDatabase(join(dir, 'ausente'), target))
  await assert.rejects(copyDatabase(invalid, target))
  await assert.rejects(copyDatabase(broken, target), /integridade/)
  assert.equal(existsSync(target), false)
  writeFileSync(`${target}-wal`, 'arquivo anterior')
  await assert.rejects(copyDatabase(source, target), /destino/i)
  assert.equal(readFileSync(`${target}-wal`, 'utf8'), 'arquivo anterior')
  writeFileSync(target, 'dados existentes')
  await assert.rejects(copyDatabase(source, target), /destino/i)
  assert.equal(readFileSync(target, 'utf8'), 'dados existentes')
  assert.deepEqual(readFileSync(source), before)
  const collision = join(dir, 'livre.sqlite')
  const answers = await Promise.allSettled([copyDatabase(source, collision), copyDatabase(source, collision)])
  assert.equal(answers.filter(({ status }) => status === 'fulfilled').length, 1)
  assert.equal(answers.filter(({ status }) => status === 'rejected').length, 1)
  assert.ok(!readdirSync(dir).some((name) => name.startsWith('.lorekeeper-backup-')))
})
