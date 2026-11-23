import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { test } from 'node:test'
import { createApp } from '../../src/server/app.ts'

test('I3-09a/b: renomeia sem perder relações e impede sobrescrita de título concorrente', async () => {
  const app = createApp(':memory:')
  try {
    async function campaign() {
      const { id } = (await app.inject({ method: 'POST', url: '/api/campaigns', payload: { name: 'Bruma' } })).json()
      return `/api/campaigns/${id}`
    }
    const base = await campaign()
    const foreign = await campaign()
    const id = randomUUID()
    const payload = { id, type: 'npc', title: 'Cartógrafa', body: 'Conhece o farol.' }
    for (const url of [base, foreign]) {
      assert.equal((await app.inject({
        method: 'POST', url: `${url}/wiki`, payload: { ...payload, id: url === base ? id : randomUUID() },
      })).statusCode, 201)
    }
    const { id: sessionId, ...session } = (await app.inject({
      method: 'POST', url: `${base}/sessions`, payload: { date: '2026-11-22' },
    })).json()
    const sessionUrl = `${base}/sessions/${sessionId}`
    const body = `A [cartógrafa](#wiki-${id}) chegou.`
    assert.equal((await app.inject({ method: 'PUT', url: sessionUrl, payload: { ...session, body } })).statusCode, 200)
    const tagsUrl = `${base}/documents/${id}/tags`
    assert.equal((await app.inject({ method: 'PUT', url: tagsUrl, payload: { name: 'Pista' } })).statusCode, 200)
    const rename = (title: string, previousTitle = payload.title, url = base) => app.inject({
      method: 'PUT', url: `${url}/wiki/${id}/title`, payload: { title, previousTitle },
    })
    assert.equal((await rename('  ')).statusCode, 400)
    assert.equal((await rename('Navegadora', payload.title, foreign)).statusCode, 404)
    const renamed = await rename(' Navegadora ')
    assert.equal(renamed.statusCode, 200)
    assert.deepEqual(renamed.json(), { ...payload, title: 'Navegadora' })
    assert.equal((await rename('Navegadora')).statusCode, 200)
    assert.equal((await rename('Outra')).statusCode, 409)
    assert.equal((await app.inject(sessionUrl)).json().body, body)
    assert.equal((await app.inject(`${sessionUrl}/wiki-links`)).json()[0].title, 'Navegadora')
    assert.equal((await app.inject(`${base}/wiki/${id}/backlinks`)).json()[0].id, sessionId)
    assert.equal((await app.inject(tagsUrl)).json()[0].name, 'Pista')
    assert.equal((await app.inject('/api/search?q=navegadora&type=npc')).json()[0].id, id)
    const old = (await app.inject('/api/search?q=cartografa&type=npc')).json()
    assert.equal(old.length, 1)
    assert.equal(old[0].campaignId, foreign.split('/').at(-1))
    await app.inject({ method: 'PATCH', url: base, payload: { archived: true } })
    assert.equal((await rename('Outra', 'Navegadora')).statusCode, 409)
  } finally { await app.close() }
})
