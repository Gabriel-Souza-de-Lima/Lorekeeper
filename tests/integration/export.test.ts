import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { test } from 'node:test'
import { createApp } from '../../src/server/app.ts'

test('I4-01a/b/c: exporta instantâneo completo em ZIP e Markdown UTF-8', async () => {
  const app = createApp(':memory:')
  try {
    const { id: campaignId } = (await app.inject({
      method: 'POST', url: '/api/campaigns', payload: { name: 'Bruma' },
    })).json()
    const base = `/api/campaigns/${campaignId}`
    const { id, ...fields } = (await app.inject({
      method: 'POST', url: `${base}/sessions`, payload: { date: '2026-11-22' },
    })).json()
    const npcId = randomUUID()
    const noteId = randomUUID()
    assert.equal((await app.inject({ method: 'POST', url: `${base}/wiki`,
      payload: { id: npcId, type: 'npc', title: '../Guia', body: 'Cartógrafa.' } })).statusCode, 201)
    assert.equal((await app.inject({ method: 'POST', url: '/api/quick-notes',
      payload: { id: noteId, body: 'Nota na caixa.' } })).statusCode, 201)
    const body = `A bússola apontou para a [guia](#wiki-${npcId}).\n`
    assert.equal((await app.inject({ method: 'PUT', url: `${base}/sessions/${id}`, payload: { ...fields, body } })).statusCode, 200)
    const tag = await app.inject({ method: 'PUT', url: `${base}/documents/${id}/tags`, payload: { name: 'Pista' } })
    assert.equal(tag.statusCode, 200)
    assert.equal((await app.inject({ method: 'PATCH', url: base, payload: { archived: true } })).statusCode, 200)

    const response = await app.inject('/api/export')
    assert.equal(response.statusCode, 200)
    assert.equal(response.headers['content-type'], 'application/zip')
    assert.equal(response.headers['cache-control'], 'no-store')
    assert.match(String(response.headers['content-disposition']), /attachment; filename="lorekeeper-export-\d{4}-\d{2}-\d{2}\.zip"/)
    const { unzipSync, strFromU8 } = await import('fflate')
    const archive = unzipSync(response.rawPayload)
    assert.deepEqual(Object.keys(archive).sort(),
      ['lorekeeper.json', ...[id, npcId, noteId].map((key) => `documents/${key}.md`)].sort())
    const exported = JSON.parse(strFromU8(archive['lorekeeper.json']))
    assert.equal(exported.formatVersion, 1)
    assert.equal(exported.campaigns[0].id, campaignId)
    assert.ok(exported.campaigns[0].archived_at)
    assert.equal(exported.documents.find((doc: { id: string }) => doc.id === noteId).campaign_id, null)
    assert.equal(exported.documents.find((doc: { id: string }) => doc.id === id).markdownPath, `documents/${id}.md`)
    assert.equal(strFromU8(archive[`documents/${id}.md`]), body)
    assert.equal(strFromU8(archive[`documents/${npcId}.md`]), 'Cartógrafa.')
    assert.equal(exported.sessions[0].document_id, id)
    assert.deepEqual(exported.links, [{ source_id: id, target_id: npcId, origin: 'markdown' }])
    assert.deepEqual(exported.documentTags, [{ document_id: id, tag_id: tag.json().id }])
    assert.equal(exported.tags[0].name, 'Pista')
    assert.equal(exported.sessionRevisions.length, 2)
    assert.equal(exported.sessionRevisions[1].body, body)
  } finally { await app.close() }
})
