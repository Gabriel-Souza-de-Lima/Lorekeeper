export const campaignStatuses = ['active', 'paused', 'finished'] as const
export type CampaignStatus = typeof campaignStatuses[number]

export interface CampaignFields {
  name: string
  description: string
  gameMaster: string
  system: string
  rulesVersion: string
  notes: string
  status: CampaignStatus
}

export interface Campaign extends CampaignFields {
  id: string
  archivedAt: string | null
  featuredCharacterId: string | null
  featuredCharacterTitle: string | null
  sessionCount: number
  lastSessionDate: string | null
}

export interface SessionFields {
  title: string
  date: string
  fictionalDate: string
  participants: string
  number: number | null
  body: string
}

export interface Session extends SessionFields {
  id: string
  version: number
}

export type SessionSummary = Pick<Session, 'id' | 'title' | 'date' | 'number'>

export const wikiTypes = ['character', 'npc', 'location', 'quest'] as const
export type WikiType = typeof wikiTypes[number]

export interface WikiPage {
  id: string
  type: WikiType
  title: string
  body: string
}

export type WikiDetails = WikiPage & { closed?: boolean }
export type WikiSummary = Omit<WikiPage, 'body'>

export interface DocumentTag {
  id: string
  name: string
}

export const searchTypes = ['session', 'quick_note', ...wikiTypes] as const
export type SearchType = typeof searchTypes[number]

export interface SearchResult {
  id: string
  campaignId: string | null
  campaignName: string | null
  archived: boolean
  type: SearchType
  title: string
  snippet: { text: string; match: boolean }[]
}

export interface SearchFilters {
  campaigns: { id: string; name: string; archived: number }[]
  tags: DocumentTag[]
}

export interface CampaignRecap {
  sessions: (SessionSummary & { excerpt: string })[]
  entities: WikiSummary[]
  notes: { id: string; title: string }[]
}

export const pendingTypes = ['clue', 'question', 'promise', 'task', 'other'] as const
export const pendingStates = ['open', 'investigating', 'resolved', 'discarded'] as const
export type PendingType = typeof pendingTypes[number]
export type PendingState = typeof pendingStates[number]

export interface PendingItemSummary {
  id: string
  title: string
  type: PendingType
  state: PendingState
}
export interface PendingFields {
  title: string
  type: PendingType
  description: string
  origin: string
  notes: string
  sessionId: string | null
  entityIds: string[]
}

export interface PendingItem extends PendingItemSummary, PendingFields {
  editVersion: number
  createdAt: string
  updatedAt: string
  history: { state: PendingState; createdAt: string }[]
}

export const maxAttachmentBytes = 10 * 1024 * 1024

export type Attachment = {
  id: string
  name: string
  filename: string
  source: string
  mime: 'image/png' | 'application/pdf'
  size: number
  sha256: string
  createdAt: string
}
