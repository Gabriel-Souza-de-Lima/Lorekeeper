import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { test } from 'node:test'
import { createApp } from '../../src/server/app.ts'

test('I3-05a/b: cria vínculo idempotente, exibe backlinks e respeita campanha e arquivamento', async () => {
  const app = createApp(':memory:')
  try {
    const campaign = async () => (await app.inject({ method: 'POST', url: '/api/campaigns', payload: { name: 'Bruma' } })).json().id
    const base = `/api/campaigns/${await campaign()}`
    const foreign = `/api/campaigns/${await campaign()}`
    const session = (await app.inject({ method: 'POST', url: `${base}/sessions`, payload: { date: '2026-11-22' } })).json()
    async function addPage(url: string) {
      const id = randomUUID()
      assert.equal((await app.inject({ method: 'POST', url: `${url}/wiki`, payload: { id, type: 'npc', title: 'Guia', body: '' } })).statusCode, 201)
      return id
    }
    const id = await addPage(base)
    const foreignId = await addPage(foreign)
    const url = `${base}/sessions/${session.id}/wiki-links`
    const backlink = `${base}/wiki/${id}/backlinks`
    const link = (wikiId: string) => app.inject({ method: 'PUT', url: `${url}/${wikiId}` })
    assert.deepEqual((await app.inject(url)).json(), [])
    assert.equal((await link(foreignId)).statusCode, 404)
    assert.equal((await link(id)).statusCode, 204)
    assert.equal((await link(id)).statusCode, 204)
    assert.deepEqual((await app.inject(url)).json(), [{ id, type: 'npc', title: 'Guia' }])
    assert.deepEqual((await app.inject(backlink)).json(), [
      { id: session.id, title: session.title, date: session.date, number: null },
    ])
    const { id: sessionId, ...draft } = session
    assert.equal((await app.inject({ method: 'PUT', url: `${base}/sessions/${sessionId}`,
      headers: { 'idempotency-key': randomUUID() }, payload: { ...draft, title: 'Retorno ao farol' } })).statusCode, 200)
    assert.equal((await app.inject(backlink)).json()[0].title, 'Retorno ao farol')
    assert.equal((await app.inject(`${foreign}/wiki/${id}/backlinks`)).statusCode, 404)
    const otherPage = await addPage(base)
    await app.inject({ method: 'PATCH', url: base, payload: { archived: true } })
    assert.equal((await link(otherPage)).statusCode, 409)
    assert.equal((await app.inject(backlink)).json().length, 1)
  } finally { await app.close() }
})
