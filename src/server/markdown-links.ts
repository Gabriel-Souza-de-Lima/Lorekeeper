import type Database from 'better-sqlite3'
import remarkGfm from 'remark-gfm'
import remarkParse from 'remark-parse'
import { unified } from 'unified'
import { wikiTypes } from '../contracts.ts'
import { wikiReferenceId } from '../wiki-reference.ts'

interface Node {
  type: string
  url?: string
  identifier?: string
  children?: Node[]
}

const markdown = unified().use(remarkParse).use(remarkGfm).freeze()

function wikiTargets(body: string) {
  const pending: Node[] = [markdown.parse(body)]
  const urls: string[] = []
  const references = new Set<string>()
  const definitions = new Map<string, string>()
  while (pending.length > 0) {
    const node = pending.pop()!
    if (node.type === 'link' && node.url) urls.push(node.url)
    if (node.type === 'linkReference' && node.identifier) references.add(node.identifier)
    if (node.type === 'definition' && node.identifier && node.url && !definitions.has(node.identifier)) {
      definitions.set(node.identifier, node.url)
    }
    if (node.children) {
      for (let index = node.children.length - 1; index >= 0; index--) pending.push(node.children[index])
    }
  }
  for (const reference of references) {
    const url = definitions.get(reference)
    if (url) urls.push(url)
  }
  return new Set(urls.map(wikiReferenceId).filter((id) => id !== undefined))
}

export function prepareMarkdownLinks(db: Database.Database) {
  const remove = db.prepare(`
    DELETE FROM document_links
    WHERE source_id = @sessionId AND origin = 'markdown'
      AND target_id NOT IN (SELECT value FROM json_each(@targets))`)
  const insert = db.prepare(`
    INSERT INTO document_links (source_id, target_id, origin)
    SELECT @sessionId, id, 'markdown'
    FROM documents
    WHERE campaign_id = @campaignId
      AND type IN (SELECT value FROM json_each(@types))
      AND id IN (SELECT value FROM json_each(@targets))
    ON CONFLICT (source_id, target_id, origin) DO NOTHING`)
  const types = JSON.stringify(wikiTypes)

  return (sessionId: string, campaignId: string, body: string) => {
    const targets = wikiTargets(body)
    const params = { sessionId, targets: JSON.stringify([...targets]) }
    remove.run(params)
    if (targets.size) insert.run({ ...params, campaignId, types })
  }
}
