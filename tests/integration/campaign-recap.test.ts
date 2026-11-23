import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { test } from 'node:test'
import { createApp } from '../../src/server/app.ts'

test('P1-02 a P1-05: consulta documentos confirmados da campanha e acompanha a lixeira', async () => {
  const app = createApp(':memory:')
  try {
    async function post(url: string, payload: object) {
      const response = await app.inject({ method: 'POST', url, payload })
      assert.equal(response.statusCode, 201)
      return response.json()
    }
    const a = `/api/campaigns/${(await post('/api/campaigns', { name: 'Bruma' })).id}`
    const b = `/api/campaigns/${(await post('/api/campaigns', { name: 'Bruma' })).id}`
    const read = async (url: string) => {
      const response = await app.inject(`${url}/recap`)
      assert.equal(response.statusCode, 200)
      return response.json()
    }
    assert.equal((await app.inject('/api/campaigns/ausente/recap')).statusCode, 404)
    const empty = { sessions: [], entities: [], notes: [] }
    assert.deepEqual(await read(a), empty)
    const npc = await post(`${a}/wiki`, { id: randomUUID(), type: 'npc', title: 'Guia', body: '' })
    const foreign = await post(`${b}/wiki`, { id: randomUUID(), type: 'location', title: 'Farol', body: '' })
    const town = await post(`${a}/wiki`, { id: randomUUID(), type: 'location', title: 'Porto', body: '' })
    const note = await post('/api/quick-notes', { id: randomUUID(), body: 'Investigar o mapa.' })
    const { id, ...fields } = await post(`${a}/sessions`, { date: '2026-11-23' })
    const url = `${a}/sessions/${id}`
    async function save(body: string, version: number) {
      assert.equal((await app.inject({ method: 'PUT', url, payload: { ...fields, title: 'Travessia', body, version } })).statusCode, 200)
    }
    await save(`Vimos o [guia](#wiki-${npc.id}) [fora](#wiki-${foreign.id}).`, 1)
    assert.equal((await app.inject({ method: 'PUT', url: `${url}/wiki-links/${town.id}` })).statusCode, 204)
    assert.equal((await app.inject({ method: 'PUT', url: `${url}/quick-notes/${note.id}` })).statusCode, 204)
    let recap = await read(a)
    assert.equal(recap.sessions[0].id, id)
    assert.match(recap.sessions[0].excerpt, /^Vimos o/)
    assert.deepEqual(new Set(recap.entities.map((item: { id: string }) => item.id)), new Set([npc.id, town.id]))
    assert.equal(recap.notes[0].id, note.id)
    assert.deepEqual(await read(b), empty)
    await save('Chegamos ao cais.', 2)
    recap = await read(a)
    assert.equal(recap.sessions[0].excerpt, 'Chegamos ao cais.')
    assert.deepEqual(recap.entities.map((item: { id: string }) => item.id), [town.id])
    for (const trashed of [true, false]) {
      assert.equal((await app.inject({ method: 'PATCH', url: `${url}/trash`, payload: { trashed } })).statusCode, 200)
      assert.deepEqual(await read(a), trashed ? empty : recap)
    }
  } finally { await app.close() }
})
