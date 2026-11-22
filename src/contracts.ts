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

export type WikiSummary = Omit<WikiPage, 'body'>
