import type Database from 'better-sqlite3'
import type { FastifyInstance } from 'fastify'
import type { SearchResult } from '../contracts.ts'

type Params = { campaignId: string; id: string }
type FavoriteRow = Omit<SearchResult, 'snippet' | 'archived'> & { archived: number }

export function registerFavorites(app: FastifyInstance, db: Database.Database) {
  const favorites = db.prepare<[], FavoriteRow>(`
    SELECT d.id, d.campaign_id AS campaignId, c.name AS campaignName, c.archived_at IS NOT NULL AS archived, d.type, d.title
    FROM document_favorites f JOIN active_documents d ON d.id = f.document_id JOIN campaigns c ON c.id = d.campaign_id
    WHERE f.favorite = 1 ORDER BY d.title COLLATE NOCASE, c.name COLLATE NOCASE, d.id`)
  const change = db.prepare<[number, string, string]>(`
    INSERT INTO document_favorites (document_id, favorite)
    SELECT id, ? FROM active_documents WHERE campaign_id = ? AND id = ? AND type <> 'quick_note'
    ON CONFLICT (document_id) DO UPDATE SET favorite = excluded.favorite`)

  app.get('/api/favorites', () => favorites.all().map(({ archived, ...row }): SearchResult => ({
    ...row, archived: Boolean(archived), snippet: [],
  })))

  app.put<{ Params: Params; Body: { favorite: boolean } }>('/api/campaigns/:campaignId/favorites/:id', {
    schema: { body: { type: 'object', required: ['favorite'], additionalProperties: false,
      properties: { favorite: { type: 'boolean' } } } },
  }, ({ params, body }, reply) =>
    change.run(Number(body.favorite), params.campaignId, params.id).changes
      ? reply.code(204).send() : reply.code(404).send({ message: 'Documento não encontrado nesta campanha.' }))
}
