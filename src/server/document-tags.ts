import { randomUUID } from 'node:crypto'
import type Database from 'better-sqlite3'
import type { FastifyInstance } from 'fastify'
import type { DocumentTag } from '../contracts.ts'

type Params = { campaignId: string; documentId: string }
const path = '/api/campaigns/:campaignId/documents/:documentId/tags'

export function registerDocumentTags(app: FastifyInstance, db: Database.Database) {
  const document = db.prepare<[string, string], { archivedAt: string | null }>(`
    SELECT c.archived_at AS archivedAt FROM documents d JOIN campaigns c ON c.id = d.campaign_id
    WHERE d.id = ? AND d.campaign_id = ?`)
  const list = db.prepare<[string], DocumentTag>(`
    SELECT t.id, t.name FROM tags t JOIN document_tags dt ON dt.tag_id = t.id
    WHERE dt.document_id = ? ORDER BY t.normalized_name, t.id`)
  const findTag = db.prepare<[string], DocumentTag>('SELECT id, name FROM tags WHERE normalized_name = ?')
  const createTag = db.prepare('INSERT INTO tags (id, name, normalized_name) VALUES (?, ?, ?)')
  const attach = db.prepare(`
    INSERT INTO document_tags (document_id, tag_id) VALUES (?, ?)
    ON CONFLICT (document_id, tag_id) DO NOTHING`)
  const detach = db.prepare('DELETE FROM document_tags WHERE document_id = ? AND tag_id = ?')

  const update = db.transaction((params: Params, change: () => DocumentTag | undefined) => {
    const target = document.get(params.documentId, params.campaignId)
    if (!target) return { status: 404, message: 'Documento não encontrado.' }
    if (target.archivedAt) return { status: 409, message: 'Reative a campanha para alterar tags.' }
    const tag = change()
    return { status: tag ? 200 : 204, tag }
  })

  app.get<{ Params: Params }>(path, ({ params }, reply) => {
    if (!document.get(params.documentId, params.campaignId)) return reply.code(404).send({ message: 'Documento não encontrado.' })
    return list.all(params.documentId)
  })
  app.put<{ Params: Params; Body: { name: string } }>(path, {
    schema: { body: { type: 'object', properties: { name: { type: 'string', maxLength: 300 } },
      required: ['name'], additionalProperties: false } },
  }, ({ params, body }, reply) => {
    const name = body.name.normalize('NFKC').trim().replace(/\s+/gu, ' ')
    if (!name || [...name].length > 60 || /\p{Cc}/u.test(name)) {
      return reply.code(400).send({ message: 'Informe um nome de tag de até 60 caracteres.' })
    }
    const normalized = name.toLocaleLowerCase('pt-BR').normalize('NFKC')
    const result = update.immediate(params, () => {
      let tag = findTag.get(normalized)
      if (!tag) {
        tag = { id: randomUUID(), name }
        createTag.run(tag.id, name, normalized)
      }
      attach.run(params.documentId, tag.id)
      return tag
    })
    return reply.code(result.status).send(result.tag ?? { message: result.message })
  })
  app.delete<{ Params: Params & { tagId: string } }>(`${path}/:tagId`, ({ params }, reply) => {
    const result = update.immediate(params, () => {
      detach.run(params.documentId, params.tagId.toLowerCase())
      return undefined
    })
    if (result.status === 204) return reply.code(204).send()
    return reply.code(result.status).send({ message: result.message })
  })
}
