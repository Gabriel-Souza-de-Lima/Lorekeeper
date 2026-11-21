import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { createApp } from '../../src/server/app.ts'

test('C01/C02: cadastra, edita, arquiva e reativa campanhas', async (t) => {
  const app = createApp(':memory:')
  t.after(() => app.close())
  const request = (method: 'GET' | 'POST' | 'PUT' | 'PATCH', url: string, payload?: object) =>
    app.inject({ method, url, payload })

  assert.equal((await request('POST', '/api/campaigns', { name: '  ' })).statusCode, 400)
  const created = await request('POST', '/api/campaigns', { name: 'Costa da Bruma' })
  assert.equal(created.statusCode, 201)
  const { id } = created.json()
  const url = `/api/campaigns/${id}`
  const edited = await request('PUT', url, {
    name: 'Costa da Bruma', system: 'D&D', rulesVersion: '2024', status: 'paused',
    description: 'Uma campanha fictícia', gameMaster: 'Lia', notes: 'Somente para testes',
  })
  assert.equal(edited.statusCode, 200)
  assert.equal(edited.json().status, 'paused')
  assert.equal(edited.json().rulesVersion, '2024')

  assert.equal((await request('PATCH', url, { archived: true })).statusCode, 200)
  assert.deepEqual((await request('GET', '/api/campaigns')).json(), [])
  assert.equal((await request('GET', '/api/campaigns?archived=true')).json()[0].id, id)
  assert.equal((await request('POST', `${url}/sessions`, { date: '2026-04-02' })).statusCode, 409)
  assert.equal((await request('PATCH', url, { archived: false })).json().status, 'paused')
})

test('C03/S01/S03/S04: persiste, ordena, isola e verifica versão', async (t) => {
  const folder = mkdtempSync(join(tmpdir(), 'lorekeeper-inc1-'))
  const path = join(folder, 'test.sqlite')
  let app = createApp(path)
  t.after(async () => {
    await app.close()
    rmSync(folder, { recursive: true, force: true })
  })
  const post = (url: string, payload: object) => app.inject({ method: 'POST', url, payload })
  const get = (url: string) => app.inject(url)
  const put = (url: string, payload: object) => app.inject({ method: 'PUT', url, payload })
  const parent = await post('/api/campaigns', { name: 'Farol' })
  assert.equal(parent.statusCode, 201)
  const other = await post('/api/campaigns', { name: 'Farol' })
  const pathA = `/api/campaigns/${parent.json().id}`
  const pathB = `/api/campaigns/${other.json().id}`
  const earlier = await post(`${pathA}/sessions`, { date: '2026-04-02' })
  const later = await post(`${pathA}/sessions`, { date: '2026-04-05' })
  assert.equal(later.statusCode, 201)
  const sessionId = earlier.json().id
  const url = `${pathA}/sessions/${sessionId}`
  const draft = {
    title: 'Chegada', date: '2026-04-02', fictionalDate: 'Dia 7', participants: 'Lia',
    number: 1, body: '# Encontramos o farol', version: 1,
  }
  assert.equal((await put(url, { ...draft, date: '2026-02-30' })).statusCode, 400)
  const saved = await put(url, draft)
  assert.equal(saved.statusCode, 200)
  assert.equal(saved.json().version, 2)
  assert.equal((await put(url, { ...draft, body: 'Versão desatualizada' })).statusCode, 409)
  assert.equal((await get(`${pathB}/sessions/${sessionId}`)).statusCode, 404)
  assert.equal((await put(`${pathB}/sessions/${sessionId}`, { ...draft, version: 2 })).statusCode, 404)
  assert.equal((await requestArchive()).statusCode, 200)
  assert.equal((await put(url, { ...draft, version: 2 })).statusCode, 409)
  await app.close()
  app = createApp(path)
  assert.equal((await get(url)).json().body, draft.body)
  assert.equal((await get(url)).json().fictionalDate, draft.fictionalDate)
  assert.deepEqual((await get(`${pathA}/sessions`)).json().map((row: { id: string }) => row.id),
    [later.json().id, sessionId])
  assert.equal((await get(pathA)).json().sessionCount, 2)
  assert.equal((await get(pathA)).json().lastSessionDate, '2026-04-05')
  assert.deepEqual((await get(`${pathB}/sessions`)).json(), [])

  function requestArchive() {
    return app.inject({ method: 'PATCH', url: pathA, payload: { archived: true } })
  }
})
