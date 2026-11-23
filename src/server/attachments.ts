import { createHash } from 'node:crypto'
import type Database from 'better-sqlite3'
import type { FastifyInstance } from 'fastify'
import { maxAttachmentBytes, type Attachment } from '../contracts.ts'
import { attachmentMime, validAttachmentName } from './attachment-format.ts'

type CampaignParams = { campaignId: string }
type FileParams = CampaignParams & { id: string }
type Query = { documentId?: string; available?: string }
type Upload = { id: string; filename: string; source?: string; data: string }
const maxCollectionBytes = 50 * 1024 * 1024
const maxEncodedBytes = Math.ceil(maxAttachmentBytes / 3) * 4
const uuid = { type: 'string', pattern: '^[0-9a-fA-F]{8}(-[0-9a-fA-F]{4}){3}-[0-9a-fA-F]{12}$' }
const metadata = `a.id, a.name, a.filename, a.origin AS source, a.mime, length(a.bytes) AS size,
  a.sha256, a.created_at AS createdAt`

export const activeAttachmentAssociations = `removed_at IS NULL
  AND (document_id IS NULL OR document_id IN (SELECT id FROM active_documents))`

export function registerAttachments(app: FastifyInstance, db: Database.Database) {
  const campaign = db.prepare<[string], { archived: number }>('SELECT archived_at IS NOT NULL AS archived FROM campaigns WHERE id = ?')
  const document = db.prepare(`
    SELECT 1 FROM active_documents WHERE campaign_id = ? AND id = ?
    AND type IN ('session', 'character', 'npc', 'location', 'quest')`)
  const listing = db.prepare<[string, number, string], Attachment>(`
    SELECT ${metadata} FROM attachments a WHERE a.campaign_id = ?
    AND (? = 1 OR EXISTS (
      SELECT 1 FROM attachment_associations WHERE attachment_id = a.id AND target_key = ? AND removed_at IS NULL
    )) ORDER BY a.created_at DESC, a.id`)
  const find = db.prepare<[string, string], Attachment>(`SELECT ${metadata} FROM attachments a WHERE a.campaign_id = ? AND a.id = ?`)
  const content = db.prepare<[string, string], Attachment & { bytes: Buffer }>(`
    SELECT ${metadata}, a.bytes FROM attachments a WHERE a.campaign_id = ? AND a.id = ?
    AND EXISTS (SELECT 1 FROM attachment_associations WHERE attachment_id = a.id AND ${activeAttachmentAssociations})`)
  const usage = db.prepare<[], number>('SELECT coalesce(sum(length(bytes)), 0) FROM attachments').pluck()
  const create = db.prepare(`
    INSERT INTO attachments (id, campaign_id, name, filename, origin, mime, bytes, sha256, created_at)
    VALUES (@id, @campaignId, @filename, @filename, @source, @mime, @bytes, @sha256, @now)
    ON CONFLICT (id) DO NOTHING`)
  const associate = db.prepare(`
    INSERT INTO attachment_associations (attachment_id, campaign_id, document_id, target_key)
    VALUES (@id, @campaignId, @documentId, @key)
    ON CONFLICT (attachment_id, target_key) DO UPDATE SET removed_at = NULL`)
  const detach = db.prepare(`
    UPDATE attachment_associations SET removed_at = ?
    WHERE attachment_id = ? AND campaign_id = ? AND target_key = ? AND removed_at IS NULL`)
  const rename = db.prepare('UPDATE attachments SET name = ? WHERE campaign_id = ? AND id = ?')
  const association = db.prepare('SELECT 1 FROM attachment_associations WHERE attachment_id = ? AND target_key = ? AND removed_at IS NULL')

  function writable(campaignId: string, documentId: string | null) {
    const owner = campaign.get(campaignId)
    if (!owner || (documentId && !document.get(campaignId, documentId))) return 404
    return owner.archived ? 409 : 200
  }

  const save = db.transaction((campaignId: string, documentId: string | null, payload: Upload, bytes: Buffer, mime: string) => {
    const status = writable(campaignId, documentId)
    if (status !== 200) return { status, message: 'Campanha ou documento indisponível para gravação.' }
    const { filename } = payload
    const id = payload.id.toLowerCase()
    const key = documentId ?? ''
    const source = payload.source?.trim() ?? ''
    const sha256 = createHash('sha256').update(bytes).digest('hex')
    const existing = find.get(campaignId, id)
    if (existing) {
      if (existing.filename === filename && existing.source === source && existing.sha256 === sha256 && association.get(id, key)) {
        return { status: 200, item: existing }
      }
      return { status: 409, message: 'O identificador do anexo já foi usado.' }
    }
    if ((usage.get() ?? 0) + bytes.length > maxCollectionBytes) {
      return { status: 413, message: 'O acervo de anexos atingiu o limite de 50 MiB.' }
    }
    if (!create.run({ id, campaignId, filename, source, bytes, sha256, mime, now: new Date().toISOString() }).changes) {
      return { status: 409, message: 'O identificador do anexo já foi usado.' }
    }
    associate.run({ id, campaignId, documentId, key })
    return { status: 201, item: find.get(campaignId, id) }
  })

  const changeAssociation = db.transaction((params: FileParams, documentId: string | null, linked: boolean) => {
    const { campaignId, id } = params
    const status = writable(campaignId, documentId)
    if (status !== 200) return status
    if (!find.get(campaignId, id)) return 404
    const key = documentId ?? ''
    if (linked) associate.run({ id, campaignId, documentId, key })
    else detach.run(new Date().toISOString(), id, campaignId, key)
    return 204
  })

  const changeName = db.transaction(({ campaignId, id }: FileParams, name: string) => {
    const status = writable(campaignId, null)
    if (status !== 200) return { status }
    return rename.run(name, campaignId, id).changes
      ? { status: 200, item: find.get(campaignId, id) }
      : { status: 404 }
  })

  const path = '/api/campaigns/:campaignId/attachments'
  app.get<{ Params: CampaignParams; Querystring: Query }>(path, ({ params, query }, reply) => {
    const { campaignId } = params
    if (!campaign.get(campaignId) || (query.documentId && !document.get(campaignId, query.documentId))) {
      return reply.code(404).send({ message: 'Campanha ou documento não encontrado.' })
    }
    return listing.all(campaignId, Number(query.available === 'true'), query.documentId ?? '')
  })
  app.post<{ Params: CampaignParams; Querystring: Query; Body: Upload }>(path, {
    bodyLimit: maxEncodedBytes + 4096,
    schema: { body: {
      type: 'object', required: ['id', 'filename', 'data'], additionalProperties: false,
      properties: { id: uuid, filename: { type: 'string', maxLength: 150 }, source: { type: 'string', maxLength: 500 },
        data: { type: 'string', maxLength: maxEncodedBytes } },
    } },
  }, ({ params, query, body }, reply) => {
    if (!validAttachmentName(body.filename)) return reply.code(400).send({ message: 'Nome de arquivo inválido.' })
    const bytes = Buffer.from(body.data, 'base64')
    if (bytes.length > maxAttachmentBytes) return reply.code(413).send({ message: 'O arquivo excede 10 MiB.' })
    if (bytes.toString('base64') !== body.data) return reply.code(400).send({ message: 'Codificação do arquivo inválida.' })
    const mime = attachmentMime(body.filename, bytes)
    if (!mime) return reply.code(400).send({ message: 'Envie um arquivo PNG ou PDF válido com a extensão correspondente.' })
    const result = save.immediate(params.campaignId, query.documentId || null, body, bytes, mime)
    return reply.code(result.status).send(result.item ?? { message: result.message })
  })
  app.get<{ Params: FileParams }>(`${path}/:id/content`, ({ params }, reply) => {
    const file = content.get(params.campaignId, params.id)
    if (!file) return reply.code(404).send({ message: 'Anexo não encontrado.' })
    const pdf = file.mime === 'application/pdf'
    const encoded = encodeURIComponent(file.filename).replace(/['()*]/g, (char) => `%${char.charCodeAt(0).toString(16)}`)
    return reply.type(file.mime)
      .header('X-Content-Type-Options', 'nosniff')
      .header('Cache-Control', 'no-store')
      .header('Content-Security-Policy', "default-src 'none'; sandbox")
      .header('Content-Disposition', `${pdf ? 'attachment' : 'inline'}; filename="anexo.${pdf ? 'pdf' : 'png'}"; filename*=UTF-8''${encoded}`)
      .send(file.bytes)
  })
  app.patch<{ Params: FileParams; Body: { name: string } }>(`${path}/:id`, {
    schema: { body: { type: 'object', required: ['name'], properties: { name: { type: 'string', maxLength: 150 } } } },
  }, ({ params, body }, reply) => {
    const name = body.name.trim()
    if (!validAttachmentName(name)) return reply.code(400).send({ message: 'Nome de exibição inválido.' })
    const result = changeName.immediate(params, name)
    return reply.code(result.status).send(result.item ?? { message: 'Anexo ou campanha indisponível para gravação.' })
  })
  for (const method of ['PUT', 'DELETE'] as const) {
    app.route<{ Params: FileParams; Querystring: Query }>({
      method, url: `${path}/:id/association`,
      handler: ({ params, query }, reply) => {
        const status = changeAssociation.immediate(params, query.documentId || null, method === 'PUT')
        return status === 204 ? reply.code(status).send()
          : reply.code(status).send({ message: 'Anexo ou destino indisponível para gravação.' })
      },
    })
  }
}
