import { useEffect, useState } from 'react'
import type { Campaign, CampaignRecap } from '../contracts.ts'
import { api, displayDate } from './api.ts'
import { WikiOverview } from './wiki-overview.tsx'

export function CampaignResume({ campaign, busy, onSession, onWiki, onNote }: {
  campaign: Campaign
  busy: boolean
  onSession: (id: string) => void
  onWiki: (id: string) => void
  onNote: (id: string) => void
}) {
  const [data, setData] = useState<CampaignRecap | null>(null)
  const [failed, setFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let active = true
    void api<CampaignRecap>(`/api/campaigns/${campaign.id}/recap`).then(
      (recap) => { if (active) setData(recap) },
      () => { if (active) setFailed(true) },
    )
    return () => { active = false }
  }, [attempt, campaign])

  const [latest, ...recent] = data?.sessions ?? []
  return <section aria-label="Retomar campanha" className="panel campaign-recap">
    <h2>Retomar campanha</h2>
    {failed ? <>
      <p className="error" role="alert">Não foi possível carregar a retomada.</p>
      <button type="button" onClick={() => { setFailed(false); setAttempt((value) => value + 1) }}>Recarregar retomada</button>
    </> : data === null ? <p>Carregando sessões recentes…</p> : <>
      {latest ? <section aria-labelledby="recap-latest">
        <h3 id="recap-latest">Última sessão</h3>
        <p><strong>{latest.title}</strong> · {displayDate(latest.date)}</p>
        {latest.excerpt ? <><p className="context">Trecho registrado</p><blockquote>{latest.excerpt}</blockquote></>
          : <p>Nenhum texto registrado nesta sessão.</p>}
        <button className="quiet" disabled={busy} onClick={() => onSession(latest.id)}>Abrir última sessão</button>
      </section> : <p>Nenhuma sessão para retomar.</p>}
      {recent.length > 0 && <section>
        <h3>Sessões anteriores</h3>
        {recent.map((session) => <div key={session.id}>
          <button className="quiet" disabled={busy} aria-label={`Abrir sessão: ${session.title}`}
            onClick={() => onSession(session.id)}>{session.title}</button>
          <span>{displayDate(session.date)}</span>
          {session.excerpt && <blockquote>{session.excerpt}</blockquote>}
        </div>)}
      </section>}
      <section>
        <h3>NPCs e localidades mencionados</h3>
        {data.entities.length ? <ul className="session-list">{data.entities.map((entity) => <li key={entity.id}>
          <button className="quiet" disabled={busy} onClick={() => onWiki(entity.id)}>{entity.title}</button>
          <span>{entity.type === 'npc' ? 'NPC' : 'Localidade'}</span>
        </li>)}</ul> : <p>Nenhum NPC ou localidade nas sessões recentes.</p>}
      </section>
      <section>
        <h3>Anotações vinculadas</h3>
        {data.notes.length ? <ul className="session-list">{data.notes.map((note) => <li key={note.id}>
          <button className="quiet" disabled={busy} onClick={() => onNote(note.id)}>{note.title}</button>
        </li>)}</ul> : <p>Nenhuma anotação vinculada às sessões recentes.</p>}
      </section>
    </>}
    <WikiOverview campaign={campaign} busy={busy} onOpen={onWiki} />
  </section>
}
