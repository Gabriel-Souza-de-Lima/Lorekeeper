import { useEffect, useState } from 'react'
import type { Campaign, WikiSummary } from '../contracts.ts'
import { api } from './api.ts'

export function WikiOverview({ campaign, busy, onOpen }: {
  campaign: Campaign
  busy: boolean
  onOpen: (id: string) => void
}) {
  const [quests, setQuests] = useState<WikiSummary[] | null>(null)
  const [failed, setFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let active = true
    void api<WikiSummary[]>(`/api/campaigns/${campaign.id}/wiki?openQuests=true`).then(
      (items) => { if (active) setQuests(items) },
      () => { if (active) setFailed(true) },
    )
    return () => { active = false }
  }, [attempt, campaign.id])

  const { featuredCharacterId, featuredCharacterTitle } = campaign
  return <>
    {featuredCharacterId && <section aria-label="Personagem em destaque" className="panel">
      <h2>Personagem em destaque</h2>
      <button className="quiet" disabled={busy} onClick={() => onOpen(featuredCharacterId)}>
        {featuredCharacterTitle}</button>
    </section>}
    {(failed || quests === null || quests.length > 0) && <section aria-label="Missões abertas" className="panel">
      <h2>Missões abertas</h2>
      {failed ? <><p role="alert">Não foi possível carregar as missões.</p>
        <button onClick={() => { setFailed(false); setAttempt((value) => value + 1) }}>Recarregar missões</button></>
        : quests === null ? <p>Carregando missões…</p>
          : <ul className="session-list">{quests.map((quest) => <li key={quest.id}>
              <button className="quiet" disabled={busy} onClick={() => onOpen(quest.id)}>{quest.title}</button>
            </li>)}</ul>}
    </section>}
  </>
}
