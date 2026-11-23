import type Database from 'better-sqlite3'
import type { FastifyInstance } from 'fastify'
import { strToU8, zipSync } from 'fflate'

type ExportDocument = {
  id: string
  campaign_id: string | null
  type: string
  title: string
  body: string
  version: number
  created_at: string
  updated_at: string
  quest_closed: number
}

export function registerExport(app: FastifyInstance, db: Database.Database) {
  const campaigns = db.prepare(`
    SELECT id, name, description, game_master, system, rules_version, notes, status, archived_at,
      created_at, updated_at, featured_character_id FROM campaigns ORDER BY id`)
  const documents = db.prepare<[], ExportDocument>(`
    SELECT id, campaign_id, type, title, body, version, created_at, updated_at, quest_closed FROM documents ORDER BY id`)
  const sessions = db.prepare(`
    SELECT document_id, session_date, fictional_date, participants, number FROM sessions ORDER BY document_id`)
  const sessionRevisions = db.prepare(`
    SELECT document_id, version, title, body, created_at FROM session_revisions ORDER BY document_id, version`)
  const links = db.prepare(`
    SELECT source_id, target_id, origin FROM document_links ORDER BY source_id, target_id, origin`)
  const tags = db.prepare('SELECT id, name, normalized_name FROM tags ORDER BY id')
  const documentTags = db.prepare('SELECT document_id, tag_id FROM document_tags ORDER BY document_id, tag_id')

  const snapshot = db.transaction(() => ({
    formatVersion: 1,
    exportedAt: new Date().toISOString(),
    campaigns: campaigns.all(),
    documents: documents.all().map((document) => ({
      ...document, markdownPath: `documents/${encodeURIComponent(document.id)}.md`,
    })),
    sessions: sessions.all(),
    sessionRevisions: sessionRevisions.all(),
    links: links.all(),
    tags: tags.all(),
    documentTags: documentTags.all(),
  }))

  app.get('/api/export', (_request, reply) => {
    const data = snapshot()
    const files = Object.fromEntries(data.documents.map(({ markdownPath, body }) => [markdownPath, strToU8(body)]))
    files['lorekeeper.json'] = strToU8(JSON.stringify(data, null, 2))
    const zip = zipSync(files, { level: 3 })
    return reply.type('application/zip')
      .header('Content-Disposition', `attachment; filename="lorekeeper-export-${data.exportedAt.slice(0, 10)}.zip"`)
      .send(Buffer.from(zip.buffer, zip.byteOffset, zip.byteLength))
  })
}
