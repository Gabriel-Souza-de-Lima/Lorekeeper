export const discoveryKinds = ['heard', 'contested', 'evidence'] as const
export const coverageValues = ['undefined', 'none'] as const
export type DiscoveryKind = typeof discoveryKinds[number]
export type Coverage = typeof coverageValues[number]

export type DiscoveryInput = {
  id: string
  characterId?: string
  kind: DiscoveryKind
  evidenceId?: string
  sessionId?: string
  fictionalDate?: string
  note?: string
  replacesId?: string
}
export type PerspectiveUpdate = { version: number; discovery?: DiscoveryInput; coverage?: Coverage }
export type Discovery = {
  id: string
  version: number
  kind: DiscoveryKind | null
  characterId: string | null
  characterName: string | null
  statement: string
  evidence: { id: string; role: string; text: string } | null
  session: { id: string; title: string; available: boolean } | null
  fictionalDate: string
  note: string
  replacesId: string | null
  coverage: Coverage
  createdAt: string
}
export type Perspective = { version: number; player: boolean; coverage: Coverage; events: Discovery[] }
export type Knowledge = { id: string; discoveries: Discovery[] }

export function knowledgeLabel(player: boolean, coverage: Coverage, characters: number) {
  if (characters > 0) return player ? 'Jogador e personagens registrados' : 'Personagens registrados'
  if (player && coverage === 'none') return 'Somente o jogador'
  if (player) return 'Jogador registrado · personagens ainda não definidos'
  return 'Ainda não definido'
}

export function activeDiscoveries(events: Discovery[]) {
  const replaced = new Set(events.map((event) => event.replacesId))
  return events.filter((event) => event.kind !== null && !replaced.has(event.id))
}
