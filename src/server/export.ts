import type Database from 'better-sqlite3'
import type { FastifyInstance } from 'fastify'
import { strToU8, zipSync, type Zippable } from 'fflate'
import { activeAttachmentAssociations } from './attachments.ts'

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
    SELECT id, campaign_id, type, title, body, version, created_at, updated_at, quest_closed FROM active_documents ORDER BY id`)
  const sessions = db.prepare(`
    SELECT document_id, session_date, fictional_date, participants, number, summary, highlights FROM sessions WHERE trashed_at IS NULL ORDER BY document_id`)
  const sessionImports = db.prepare(`
    SELECT document_id, filename, source FROM session_imports
    WHERE document_id IN (SELECT id FROM active_documents) ORDER BY document_id`)
  const sessionRevisions = db.prepare(`
    SELECT document_id, version, title, body, created_at FROM session_revisions WHERE document_id IN (SELECT id FROM active_documents) ORDER BY document_id, version`)
  const favorites = db.prepare(`
    SELECT document_id FROM document_favorites WHERE favorite = 1
    AND document_id IN (SELECT id FROM active_documents) ORDER BY document_id`)
  const links = db.prepare(`
    SELECT source_id, target_id, origin FROM document_links
    WHERE source_id IN (SELECT id FROM active_documents) AND target_id IN (SELECT id FROM active_documents)
    ORDER BY source_id, target_id, origin`)
  const tags = db.prepare('SELECT id, name, normalized_name FROM tags ORDER BY id')
  const documentTags = db.prepare(`
    SELECT document_id, tag_id FROM document_tags
    WHERE document_id IN (SELECT id FROM active_documents) ORDER BY document_id, tag_id`)

  const pendingItems = db.prepare(`
    SELECT id, campaign_id, CASE WHEN session_id IN (SELECT id FROM active_documents) THEN session_id END AS session_id,
      title, type, description, origin, notes, state, edit_version, created_at, updated_at FROM pending_items ORDER BY id`)
  const pendingItemEntities = db.prepare('SELECT item_id, document_id FROM pending_item_entities WHERE removed_at IS NULL ORDER BY item_id, document_id')
  const pendingItemStates = db.prepare('SELECT item_id, state, created_at FROM pending_item_states ORDER BY id')

  const attachmentAssociations = db.prepare(`
    SELECT attachment_id, campaign_id, document_id FROM attachment_associations
    WHERE ${activeAttachmentAssociations} ORDER BY attachment_id, target_key`)
  const attachments = db.prepare<[], {
    id: string
    campaign_id: string
    name: string
    filename: string
    origin: string
    mime: string
    size: number
    bytes: Buffer
    sha256: string
    created_at: string
  }>(`
    SELECT id, campaign_id, name, filename, origin, mime, length(bytes) AS size, bytes, sha256, created_at
    FROM attachments WHERE id IN (
      SELECT attachment_id FROM attachment_associations WHERE ${activeAttachmentAssociations}
    ) ORDER BY id`)

  const snapshot = db.transaction(() => ({
    formatVersion: 1,
    exportedAt: new Date().toISOString(),
    campaigns: campaigns.all(),
    documents: documents.all().map((document) => ({
      ...document, markdownPath: `documents/${encodeURIComponent(document.id)}.md`,
    })),
    sessions: sessions.all(),
    sessionImports: sessionImports.all(),
    sessionRevisions: sessionRevisions.all(),
    links: links.all(),
    documentFavorites: favorites.all(),
    tags: tags.all(),
    documentTags: documentTags.all(),
    pendingItems: pendingItems.all(),
    pendingItemEntities: pendingItemEntities.all(),
    pendingItemStates: pendingItemStates.all(),
    attachments: attachments.all().map((file) => ({
      ...file, path: `attachments/${encodeURIComponent(file.id)}.${file.mime === 'image/png' ? 'png' : 'pdf'}`,
    })),
    attachmentAssociations: attachmentAssociations.all(),
  }))

  app.get('/api/export', (_request, reply) => {
    const { attachments: binary, ...data } = snapshot()
    const files: Zippable = Object.fromEntries(data.documents.map(({ markdownPath, body }) => [markdownPath, strToU8(body)]))
    const manifest = binary.map(({ bytes, ...file }) => {
      files[file.path] = [bytes, { level: 0 }]
      return file
    })
    files['lorekeeper.json'] = strToU8(JSON.stringify({ ...data, attachments: manifest }, null, 2))
    const zip = zipSync(files, { level: 3 })
    return reply.type('application/zip')
      .header('Content-Disposition', `attachment; filename="lorekeeper-export-${data.exportedAt.slice(0, 10)}.zip"`)
      .send(Buffer.from(zip.buffer, zip.byteOffset, zip.byteLength))
  })
}
