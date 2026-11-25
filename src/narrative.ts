export const natures = ['observation', 'report', 'rumor', 'theory'] as const
export const assessments = ['open', 'confirmed', 'disputed', 'refuted'] as const
export const evidenceRoles = ['supports', 'contradicts', 'contextualizes'] as const
export type Nature = typeof natures[number]
export type Assessment = typeof assessments[number]
export type EvidenceRole = typeof evidenceRoles[number]
export type SourceInput = { documentId?: string; text?: string }
export type Source = {
  kind: 'direct' | 'manual' | 'document'
  documentId?: string
  type?: string
  title?: string
  revision?: number
  text: string
  capturedAt: string
  available?: boolean
}
export type NarrativeUpdate = {
  version: number
  statement?: string
  nature?: Nature
  state?: Assessment
  source?: SourceInput
  justification?: string
  decisionSource?: SourceInput
  decisionEvidenceId?: string
  evidence?: { id: string; role: EvidenceRole; source: SourceInput; replacesId?: string }[]
  documents?: string[]
  pending?: string[]
}
export type NarrativeSummary = {
  id: string; statement: string; nature: Nature; state: Assessment; source: Source
  version: number; createdAt: string; updatedAt: string
}
export type NarrativeDetail = NarrativeSummary & {
  evidence: { id: string; role: EvidenceRole; source: Source; replacesId: string | null }[]
  history: { version: number; statement: string; nature: Nature; state: Assessment; justification: string
    source: Source; decisionEvidenceId: string | null; createdAt: string }[]
  documents: { id: string; title: string; type: string; available: boolean }[]
  pending: { id: string; title: string }[]
}

export function assessmentError(from: Assessment, to: Assessment, justification: string, identified: boolean) {
  if (from === to) return null
  if (!justification.trim()) return 'Informe a justificativa da mudança de estado.'
  if ((to === 'confirmed' || to === 'refuted') && !identified) return 'Informe uma evidência ou origem identificável.'
  return null
}
