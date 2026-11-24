import type Database from 'better-sqlite3'
import type { FastifyInstance } from 'fastify'
import type { CampaignRecap } from '../contracts.ts'

export function registerCampaignRecap(app: FastifyInstance, db: Database.Database) {
  const campaign = db.prepare('SELECT 1 FROM campaigns WHERE id = ?')
  const sessions = db.prepare<[string], CampaignRecap['sessions'][number]>(`
    SELECT d.id, d.title, s.session_date AS date, s.number, s.summary, s.highlights,
      substr(ltrim(d.body, char(9) || char(10) || char(13) || ' '), 1, 241) AS excerpt
    FROM documents d JOIN sessions s ON s.document_id = d.id
    WHERE d.campaign_id = ? AND s.trashed_at IS NULL
    ORDER BY s.session_date DESC, d.updated_at DESC, d.id LIMIT 3`)
  const entities = db.prepare<[string, string], CampaignRecap['entities'][number]>(`
    SELECT d.id, d.title, d.type
    FROM json_each(?) recent
    JOIN document_links l ON l.source_id = recent.value
    JOIN documents d ON d.id = l.target_id
    WHERE d.campaign_id = ? AND d.type IN ('npc', 'location')
    GROUP BY d.id ORDER BY min(recent.key), d.title COLLATE NOCASE, d.id LIMIT 10`)
  const notes = db.prepare<[string, string], CampaignRecap['notes'][number]>(`
    SELECT d.id, d.title
    FROM json_each(?) recent
    JOIN document_links l ON l.target_id = recent.value
    JOIN documents d ON d.id = l.source_id
    WHERE d.campaign_id = ? AND d.type = 'quick_note'
    GROUP BY d.id ORDER BY min(recent.key), d.title COLLATE NOCASE, d.id LIMIT 10`)
  const read = db.transaction((id: string): CampaignRecap | undefined => {
    if (!campaign.get(id)) return
    const recent = sessions.all(id)
    const ids = JSON.stringify(recent.map((session) => session.id))
    return {
      sessions: recent.map(({ excerpt, ...session }) => {
        const characters = Array.from(excerpt)
        return { ...session, summary: session.summary.trim(), excerpt: characters.length > 240 ? `${characters.slice(0, 239).join('')}…` : excerpt }
      }),
      entities: entities.all(ids, id),
      notes: notes.all(ids, id),
    }
  })

  app.get<{ Params: { campaignId: string } }>('/api/campaigns/:campaignId/recap', ({ params }, reply) =>
    read(params.campaignId) ?? reply.code(404).send({ message: 'Campanha não encontrada.' }))
}
