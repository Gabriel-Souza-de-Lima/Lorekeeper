import type Database from 'better-sqlite3'
import type { FastifyInstance } from 'fastify'
import { wikiTypes, type WikiPage, type WikiDetails, type WikiSummary } from '../contracts.ts'

const path = '/api/campaigns/:campaignId/wiki'
type Params = { campaignId: string }
const uuid = { type: 'string', pattern: '^[0-9a-fA-F]{8}(-[0-9a-fA-F]{4}){3}-[0-9a-fA-F]{12}$' }

export function registerWiki(app: FastifyInstance, db: Database.Database) {
  const wikiDocuments = `FROM documents WHERE campaign_id = ? AND type IN (${wikiTypes.map(() => '?').join(', ')})`
  const list = db.prepare<[string, ...string[]], WikiSummary>(
    `SELECT id, type, title ${wikiDocuments} ORDER BY title COLLATE NOCASE, id`,
  )
  const openQuests = db.prepare<[string], WikiSummary>(`
    SELECT id, type, title FROM documents WHERE campaign_id = ? AND type = 'quest' AND quest_closed = 0
    ORDER BY title COLLATE NOCASE, id`)
  const select = db.prepare<[string, ...string[]], WikiPage & { questClosed: number }>(
    `SELECT id, type, title, body, quest_closed AS questClosed ${wikiDocuments} AND id = ?`,
  )
  function details(campaignId: string, id: string): WikiDetails | undefined {
    const row = select.get(campaignId, ...wikiTypes, id)
    if (!row) return
    const { questClosed, ...page } = row
    return page.type === 'quest' ? { ...page, closed: Boolean(questClosed) } : page
  }
  const setClosed = db.prepare("UPDATE documents SET quest_closed = ?, updated_at = ? WHERE id = ?")
  const campaign = db.prepare<[string], { archivedAt: string | null }>(
    'SELECT archived_at AS archivedAt FROM campaigns WHERE id = ?',
  )
  const insert = db.prepare(`
    INSERT INTO documents (id, campaign_id, type, title, body, created_at, updated_at)
    VALUES (@id, @campaignId, @type, @title, @body, @now, @now)
    ON CONFLICT (id) DO NOTHING`)
  const create = db.transaction((campaignId: string, page: WikiPage) => {
    const target = campaign.get(campaignId)
    if (!target) return { status: 404, message: 'Campanha não encontrada.' }
    const existing = details(campaignId, page.id)
    if (existing && existing.title === page.title && existing.type === page.type && existing.body === page.body) {
      return { status: 200, page: existing }
    }
    if (target.archivedAt) return { status: 409, message: 'Reative a campanha antes de cadastrar páginas.' }
    const result = insert.run({ ...page, campaignId, now: new Date().toISOString() })
    if (!result.changes) return { status: 409, message: 'O identificador já foi usado.' }
    return { status: 201, page: details(campaignId, page.id) }
  })

  const changeQuest = db.transaction((campaignId: string, id: string, closed: boolean) => {
    const page = details(campaignId, id)
    if (page?.type !== 'quest') return { status: 404, message: 'Missão não encontrada.' }
    if (campaign.get(campaignId)?.archivedAt) return { status: 409, message: 'Reative a campanha para alterar a missão.' }
    if (page.closed !== closed) setClosed.run(Number(closed), new Date().toISOString(), id)
    return { status: 200, page: { ...page, closed } }
  })

  app.get<{ Params: Params; Querystring: { openQuests?: string } }>(path, ({ params, query }, reply) => {
    if (!campaign.get(params.campaignId)) return reply.code(404).send({ message: 'Campanha não encontrada.' })
    return query.openQuests === 'true' ? openQuests.all(params.campaignId) : list.all(params.campaignId, ...wikiTypes)
  })
  app.get<{ Params: Params & { id: string } }>(`${path}/:id`, ({ params }, reply) => {
    return details(params.campaignId, params.id.toLowerCase()) ??
      reply.code(404).send({ message: 'Página não encontrada.' })
  })
  app.put<{ Params: Params & { id: string }; Body: { closed: boolean } }>(`${path}/:id/quest-state`, {
    schema: { body: { type: 'object', properties: { closed: { type: 'boolean' } }, required: ['closed'], additionalProperties: false } },
  }, ({ params, body }, reply) => {
    const result = changeQuest.immediate(params.campaignId, params.id.toLowerCase(), body.closed)
    return reply.code(result.status).send(result.page ?? { message: result.message })
  })
  app.post<{ Params: Params; Body: WikiPage }>(path, { schema: { body: {
    type: 'object', additionalProperties: false, required: ['id', 'type', 'title', 'body'],
    properties: { id: uuid, type: { type: 'string', enum: wikiTypes }, title: { type: 'string' }, body: { type: 'string' } },
  } } }, ({ params, body }, reply) => {
    const title = body.title.trim()
    if (!title) return reply.code(400).send({ message: 'Informe o título da página.' })
    const result = create.immediate(params.campaignId, { ...body, title, id: body.id.toLowerCase() })
    return reply.code(result.status).send(result.page ?? { message: result.message })
  })
}
