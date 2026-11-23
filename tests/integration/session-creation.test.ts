import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { test } from 'node:test'
import { createApp } from '../../src/server/app.ts'

test('SAVE-13: cria versão inicial completa e repete a operação com o UUID do cliente', async () => {
  const app = createApp(':memory:')
  try {
    async function campaign() {
      const result = await app.inject({ method: 'POST', url: '/api/campaigns', payload: { name: 'Bruma' } })
      return `/api/campaigns/${result.json().id}`
    }
    const root = await campaign()
    const other = await campaign()
    const id = randomUUID()
    const key = randomUUID()
    const payload = { id, title: 'Travessia', date: '2026-11-23', fictionalDate: 'Dia 1', participants: 'Lia', body: 'A ponte apareceu.', number: 2 }
    const create = (url: string, fields = payload) => app.inject({
      method: 'POST', url: `${url}/sessions`, payload: fields, headers: { 'idempotency-key': key },
    })
    const first = await create(root)
    assert.equal(first.statusCode, 201)
    assert.deepEqual(first.json(), { ...payload, version: 1 })
    assert.deepEqual((await create(root)).json(), first.json())
    assert.equal((await create(root, { ...payload, body: 'Outro texto' })).statusCode, 409)
    assert.equal((await create(other)).statusCode, 409)
    const revisions = (await app.inject(`${root}/sessions/${id}/revisions`)).json()
    assert.deepEqual(revisions.map((item: { version: number; body: string }) => [item.version, item.body]), [[1, payload.body]])
    assert.equal((await app.inject(`${root}/sessions`)).json().length, 1)
    assert.deepEqual((await app.inject(`${other}/sessions`)).json(), [])
  } finally { await app.close() }
})
