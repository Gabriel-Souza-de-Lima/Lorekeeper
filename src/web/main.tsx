import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { createRoot } from 'react-dom/client'
import type { Campaign, CampaignFields, CampaignStatus, Session, SessionSummary, WikiDetails } from '../contracts.ts'
import { api, displayDate, localDate } from './api.ts'
import { CampaignNotes } from './note-assignment.tsx'
import { QuickNotes } from './quick-notes.tsx'
import { SessionEditor } from './session-editor.tsx'
import { WikiOverview } from './wiki-overview.tsx'
import { Wiki } from './wiki.tsx'
import './style.css'

const campaignPath = '/api/campaigns'
const statusLabels: Record<CampaignStatus, string> = { active: 'Ativa', paused: 'Pausada', finished: 'Encerrada' }

type View =
  | { page: 'dashboard' }
  | { page: 'quick-notes' }
  | { page: 'new' }
  | { page: 'campaign' | 'edit'; campaign: Campaign }
  | { page: 'campaign-notes'; campaign: Campaign }
  | { page: 'wiki'; campaign: Campaign; initialPage?: WikiDetails }
  | { page: 'session'; campaign: Campaign; session: Session }

const campaignMetadata = [
  ['name', 'Nome'], ['system', 'Sistema'], ['rulesVersion', 'Versão das regras'], ['gameMaster', 'Mestre'],
] as const

function CampaignForm({ initial, busy, onSave, onCancel }: {
  initial?: Campaign
  busy: boolean
  onSave: (fields: CampaignFields) => void
  onCancel: () => void
}) {
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const fields = new FormData(event.currentTarget)
    onSave({
      name: String(fields.get('name') ?? ''),
      system: String(fields.get('system') ?? ''),
      rulesVersion: String(fields.get('rulesVersion') ?? ''),
      gameMaster: String(fields.get('gameMaster') ?? ''),
      description: String(fields.get('description') ?? ''),
      notes: String(fields.get('notes') ?? ''),
      status: (fields.get('status') as CampaignStatus | null) ?? 'active',
    })
  }

  return (
    <>
      <h1>{initial ? 'Editar campanha' : 'Nova campanha'}</h1>
      <form className="panel campaign-form" onSubmit={submit}>
        <fieldset className="form-grid" disabled={busy}>
          {campaignMetadata.slice(0, initial ? undefined : 1).map(([field, label]) => (
            <label key={field}>{label}<input name={field} defaultValue={initial?.[field]}
              required={field === 'name'} autoFocus={field === 'name'} /></label>
          ))}
          {initial && <>
            <label>Estado<select name="status" defaultValue={initial.status}>
              {Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select></label>
            <label className="wide">Descrição<textarea name="description" defaultValue={initial.description} /></label>
            <label className="wide">Observações<textarea name="notes" defaultValue={initial.notes} /></label>
          </>}
          <div className="actions wide">
            <button className="primary" type="submit">{initial ? 'Salvar campanha' : 'Criar campanha'}</button>
            <button type="button" onClick={onCancel}>Cancelar</button>
          </div>
        </fieldset>
      </form>
    </>
  )
}

function App() {
  const [view, setView] = useState<View>({ page: 'dashboard' })
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [sessions, setSessions] = useState<SessionSummary[]>([])
  const [archived, setArchived] = useState(false)
  const [loading, setLoading] = useState(true)
  const [working, setWorking] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (view.page !== 'dashboard') return
    let ignore = false
    void api<Campaign[]>(`${campaignPath}?archived=${archived}`).then(
      (rows) => { if (!ignore) { setCampaigns(rows); setLoading(false) } },
      () => { if (!ignore) { setError('Não foi possível carregar as campanhas.'); setLoading(false) } },
    )
    return () => { ignore = true }
  }, [archived, view])

  async function action(task: () => Promise<void>) {
    setError('')
    setWorking(true)
    try {
      await task()
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'A operação falhou.')
    } finally {
      setWorking(false)
    }
  }

  function dashboard() {
    setError('')
    setLoading(true)
    setView({ page: 'dashboard' })
  }

  async function openCampaign(id: string) {
    const url = `${campaignPath}/${id}`
    const [campaign, rows] = await Promise.all([api<Campaign>(url), api<SessionSummary[]>(`${url}/sessions`)])
    setSessions(rows)
    setView({ page: 'campaign', campaign })
  }

  function campaignForm(initial?: Campaign) {
    return <CampaignForm key={initial?.id ?? 'new'} initial={initial} busy={working}
      onCancel={() => initial ? setView({ page: 'campaign', campaign: initial }) : dashboard()}
      onSave={(fields) => void action(async () => {
        if (initial) {
          const campaign = await api<Campaign>(`${campaignPath}/${initial.id}`, 'PUT', fields)
          setView({ page: 'campaign', campaign })
        } else {
          const created = await api<Campaign>(campaignPath, 'POST', { name: fields.name })
          setSessions([])
          setView({ page: 'campaign', campaign: created })
        }
      })} />
  }

  function openWikiPage(campaign: Campaign, id: string) {
    void action(async () => {
      const initialPage = await api<WikiDetails>(`${campaignPath}/${campaign.id}/wiki/${id}`)
      setView({ page: 'wiki', campaign, initialPage })
    })
  }

  function campaignPage(campaign: Campaign) {
    const url = `${campaignPath}/${campaign.id}`
    const locked = Boolean(campaign.archivedAt)
    const openSession = (id?: string) => void action(async () => {
      const session = id
        ? await api<Session>(`${url}/sessions/${id}`)
        : await api<Session>(`${url}/sessions`, 'POST', { date: localDate() })
      setView({ page: 'session', campaign, session })
    })

    return (
      <>
        <button className="quiet" disabled={working} onClick={dashboard}>Voltar ao painel</button>
        <header className="page-header">
          <div><p className="context">{locked ? 'Campanha arquivada' : statusLabels[campaign.status]}</p>
            <h1>{campaign.name}</h1>{campaign.description && <p>{campaign.description}</p>}</div>
          <div className="actions">
            <button disabled={working} onClick={() => { setError(''); setView({ page: 'campaign-notes', campaign }) }}>
              Anotações da campanha
            </button>
            <button disabled={working} onClick={() => { setError(''); setView({ page: 'wiki', campaign }) }}>
              Wiki da campanha
            </button>
            {!locked && <button disabled={working} onClick={() => { setError(''); setView({ page: 'edit', campaign }) }}>
              Editar campanha
            </button>}
            <button disabled={working} onClick={() => void action(async () => {
              const updated = await api<Campaign>(url, 'PATCH', { archived: !locked })
              setView({ page: 'campaign', campaign: updated })
            })}>{locked ? 'Reativar campanha' : 'Arquivar campanha'}</button>
          </div>
        </header>
        <div className="panel campaign-summary">
          <span>{campaign.system || 'Sistema a definir'}{campaign.rulesVersion && ` · ${campaign.rulesVersion}`}</span>
          <span>{campaign.sessionCount} {campaign.sessionCount === 1 ? 'sessão' : 'sessões'}</span>
          <span>{campaign.lastSessionDate ? `Última sessão em ${displayDate(campaign.lastSessionDate)}` : 'Nenhuma sessão registrada'}</span>
        </div>
        <WikiOverview key={campaign.id} campaign={campaign} busy={working} onOpen={(id) => openWikiPage(campaign, id)} />
        <section>
          <header className="page-header"><h2>Sessões</h2>
            {!locked && <button className="primary" disabled={working} onClick={() => openSession()}>Nova sessão</button>}
          </header>
          {sessions.length === 0 && <p className="panel empty">As sessões registradas vão aparecer aqui.</p>}
          <ul className="session-list">
            {sessions.map((session) => <li key={session.id} className="panel">
              <button className="quiet" disabled={working} onClick={() => openSession(session.id)}>{session.title}</button>
              <span>{session.number !== null && `Sessão ${session.number} · `}{displayDate(session.date)}</span>
            </li>)}
          </ul>
        </section>
      </>
    )
  }

  function currentPage() {
    switch (view.page) {
      case 'quick-notes': return <QuickNotes onBack={dashboard} />
      case 'new': return campaignForm()
      case 'edit': return campaignForm(view.campaign)
      case 'campaign': return campaignPage(view.campaign)
      case 'wiki': return <Wiki campaign={view.campaign} initialPage={view.initialPage}
        onOpenSession={(id) => void action(async () => {
          const session = await api<Session>(`${campaignPath}/${view.campaign.id}/sessions/${id}`)
          setView({ page: 'session', campaign: view.campaign, session })
        })}
        onBack={() => void action(() => openCampaign(view.campaign.id))} />
      case 'campaign-notes': return <CampaignNotes campaign={view.campaign}
        onBack={() => setView({ page: 'campaign', campaign: view.campaign })} />
      case 'session': return <SessionEditor key={view.session.id} campaignName={view.campaign.name}
        campaignUrl={`${campaignPath}/${view.campaign.id}`}
        session={view.session} archived={Boolean(view.campaign.archivedAt)}
        path={`${campaignPath}/${view.campaign.id}/sessions`}
        onOpenWiki={(id) => openWikiPage(view.campaign, id)}
        onBack={() => void action(() => openCampaign(view.campaign.id))} />
      case 'dashboard': return (
        <>
          <header className="page-header">
            <h1>Campanhas</h1>
            <div className="actions">
              <button disabled={working} onClick={() => { setError(''); setView({ page: 'quick-notes' }) }}>
                Anotações rápidas
              </button>
              <button className="primary" disabled={working} onClick={() => { setError(''); setView({ page: 'new' }) }}>
                Nova campanha
              </button>
            </div>
          </header>
          <div className="tabs" aria-label="Visualizar campanhas">
            <button disabled={working} aria-pressed={!archived} onClick={() => {
              if (archived) { setLoading(true); setError(''); setArchived(false) }
              else if (error) dashboard()
            }}>Em andamento</button>
            <button disabled={working} aria-pressed={archived} onClick={() => {
              if (!archived) { setLoading(true); setError(''); setArchived(true) }
              else if (error) dashboard()
            }}>Arquivadas</button>
          </div>
          {loading ? <p>Carregando campanhas…</p> : !error && campaigns.length === 0 &&
            <p className="panel empty">{archived ? 'Nenhuma campanha arquivada.' : 'Crie uma campanha para começar seu diário de sessões.'}</p>}
          {!loading && <div className="cards">
            {campaigns.map((campaign) => <article className="panel campaign-card" key={campaign.id}>
              <p className="context">{statusLabels[campaign.status]}</p>
              <h2><button className="quiet" disabled={working}
                onClick={() => void action(() => openCampaign(campaign.id))}>{campaign.name}</button></h2>
              {campaign.system && <p>{campaign.system}</p>}
              <p>{campaign.sessionCount} {campaign.sessionCount === 1 ? 'sessão' : 'sessões'}
                {campaign.lastSessionDate && ` · ${displayDate(campaign.lastSessionDate)}`}</p>
            </article>)}
          </div>}
        </>
      )
    }
  }

  return <>
    <aside className="sidebar"><span className="brand">Lorekeeper</span>
      <span className="sidebar-section">Diário de campanhas</span></aside>
    <main>
      {error && <p role="alert" className="error panel">{error}</p>}
      {currentPage()}
    </main>
  </>
}

createRoot(document.getElementById('root')!).render(<App />)
