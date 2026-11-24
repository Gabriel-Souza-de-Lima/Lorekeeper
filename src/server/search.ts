import { randomUUID } from 'node:crypto'
import type Database from 'better-sqlite3'
import type { FastifyInstance } from 'fastify'
import { searchTypes, type SearchFilters, type SearchResult } from '../contracts.ts'

interface Query {
  q: string
  type?: string
  campaignId?: string
  tagId?: string
  prefix?: 'true'
}

type SearchRow = Omit<SearchResult, 'snippet' | 'archived'> & { excerpt: string; archived: number }

export function registerSearch(app: FastifyInstance, db: Database.Database) {
  const search = db.prepare<{
    terms: string; type: string | null; campaignId: string | null; tagId: string | null; start: string; end: string
  }, SearchRow>(`
    SELECT d.id, d.campaign_id AS campaignId, c.name AS campaignName, c.archived_at IS NOT NULL AS archived,
      d.type, d.title, snippet(document_search, -1, @start, @end, '…', 24) AS excerpt
    FROM document_search JOIN active_documents d ON d.id = document_search.document_id
    LEFT JOIN campaigns c ON c.id = d.campaign_id
    WHERE document_search MATCH @terms
      AND (@type IS NULL OR d.type = @type)
      AND (@campaignId IS NULL OR d.campaign_id = @campaignId)
      AND (@tagId IS NULL OR EXISTS (
        SELECT 1 FROM document_tags dt WHERE dt.document_id = d.id AND dt.tag_id = @tagId
      ))
    ORDER BY bm25(document_search, 0, 5, 1), d.id LIMIT 50`)
  const campaigns = db.prepare<[], SearchFilters['campaigns'][number]>(`
    SELECT id, name, archived_at IS NOT NULL AS archived FROM campaigns ORDER BY name COLLATE NOCASE, id`)
  const tags = db.prepare<[], SearchFilters['tags'][number]>(`
    SELECT id, name FROM tags WHERE EXISTS (
      SELECT 1 FROM document_tags JOIN active_documents d ON d.id = document_tags.document_id WHERE tag_id = tags.id
    ) ORDER BY normalized_name, id`)

  app.get('/api/search/filters', () => ({ campaigns: campaigns.all(), tags: tags.all() }))
  app.get<{ Querystring: Query }>('/api/search', {
    schema: { querystring: {
      type: 'object', required: ['q'], additionalProperties: false,
      properties: {
        q: { type: 'string', maxLength: 200 },
        prefix: { type: 'string', enum: ['true'] },
        type: { type: 'string', enum: searchTypes },
        campaignId: { type: 'string', maxLength: 64 },
        tagId: { type: 'string', maxLength: 64 },
      },
    } },
  }, ({ query }, reply) => {
    const terms = query.q.normalize('NFC').match(/[\p{L}\p{N}\p{M}]+/gu)
    if (!terms?.length || terms.length > 20) return reply.code(400).send({ message: 'Informe de um a vinte termos de busca.' })
    const marker = randomUUID()
    const start = `<${marker}>`
    const end = `</${marker}>`
    return search.all({
      terms: terms.map((term) => `"${term}"${query.prefix ? '*' : ''}`).join(' AND '),
      type: query.type ?? null,
      campaignId: query.campaignId ?? null,
      tagId: query.tagId ?? null,
      start, end,
    }).map(({ excerpt, archived, ...row }): SearchResult => ({
      ...row, archived: Boolean(archived),
      snippet: excerpt.split(start).flatMap((part, index) => {
        if (index === 0) return [{ text: part, match: false }]
        const [match, tail] = part.split(end)
        return [{ text: match, match: true }, { text: tail ?? '', match: false }]
      }).filter(({ text }) => text.length > 0),
    }))
  })
}
