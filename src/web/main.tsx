import { Narrative } from './narrative.tsx'
import { Attachments } from './attachments.tsx'
import { PendingItems } from './pending-items.tsx'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { createRoot } from 'react-dom/client'
import type { Campaign, CampaignFields, CampaignStatus, Session, SessionSummary, WikiDetails, SearchResult } from '../contracts.ts'
import { api, displayDate, localDate } from './api.ts'
import { CampaignNotes, NoteList, type Note } from './note-assignment.tsx'
import { QuickNotes } from './quick-notes.tsx'
import { TextImport } from './text-import.tsx'
import { Search } from './search.tsx'
import { QuickNavigation, type QuickDestination } from './quick-navigation.tsx'
import { SessionEditor, type SessionNavigation } from './session-editor.tsx'
import { CampaignResume } from './campaign-recap.tsx'
import { Wiki } from './wiki.tsx'
import './style.css'

const campaignPath = '/api/campaigns'
const statusLabels: Record<CampaignStatus, string> = { active: 'Ativa', paused: 'Pausada', finished: 'Encerrada' }

type View =
  | { page: 'dashboard' }
  | { page: 'search' }
  | { page: 'text-import' }
  | { page: 'search-note'; note: Note; campaign: Campaign | null }
  | { page: 'quick-notes' }
  | { page: 'new' }
  | { page: 'campaign' | 'edit'; campaign: Campaign }
  | { page: 'information'; campaign: Campaign }
  | { page: 'pending-items'; campaign: Campaign; itemId?: string }
  | { page: 'campaign-notes'; campaign: Campaign; noteId?: string }
  | { page: 'session-trash'; campaign: Campaign; rows: SessionSummary[] }
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

  const [quickOpen, setQuickOpen] = useState(false)
  const quickOrigin = useRef<HTMLElement | null>(null)
  const sessionNavigation = useRef<SessionNavigation>(null)
  const shortcutAvailable = !['text-import', 'information', 'pending-items', 'edit', 'new', 'quick-notes', 'campaign-notes', 'wiki'].includes(view.page)

  const openQuick = useCallback(() => {
    quickOrigin.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    setQuickOpen(true)
  }, [])

  useEffect(() => {
    if (!shortcutAvailable || quickOpen || working) return
    const shortcut = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.isComposing || event.altKey || event.shiftKey ||
          !(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== 'k') return
      event.preventDefault()
      openQuick()
    }
    window.addEventListener('keydown', shortcut)
    return () => window.removeEventListener('keydown', shortcut)
  }, [shortcutAvailable, quickOpen, openQuick, working])

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

  function trashSession(campaign: Campaign, id: string, title: string) {
    if (!window.confirm(`Mover a sessão “${title}” para a lixeira? Ela poderá ser restaurada.`)) return
    void action(async () => {
      await api(`${campaignPath}/${campaign.id}/sessions/${id}/trash`, 'PATCH', { trashed: true })
      await openCampaign(campaign.id)
    })
  }

  async function openTrash(campaign: Campaign) {
    const rows = await api<SessionSummary[]>(`${campaignPath}/${campaign.id}/sessions?trashed=true`)
    setView({ page: 'session-trash', campaign, rows })
  }

  function campaignPage(campaign: Campaign) {
    const url = `${campaignPath}/${campaign.id}`
    const locked = Boolean(campaign.archivedAt)
    const openSession = (id?: string) => void action(async () => {
      const session = id
        ? await api<Session>(`${url}/sessions/${id}`)
        : { id: crypto.randomUUID(), version: 0, title: 'Nova sessão', date: localDate(),
          fictionalDate: '', participants: '', number: null, body: '' }
      setView({ page: 'session', campaign, session })
    })

    return (
      <>
        <button className="quiet" disabled={working} onClick={dashboard}>Voltar ao painel</button>
        <header className="page-header">
          <div><p className="context">{locked ? 'Campanha arquivada' : statusLabels[campaign.status]}</p>
            <h1>{campaign.name}</h1>{campaign.description && <p>{campaign.description}</p>}</div>
          <div className="actions">
            <button disabled={working} onClick={() => { setError(''); setView({ page: 'information', campaign }) }}>Informações</button>
            <button disabled={working} onClick={() => { setError(''); setView({ page: 'campaign-notes', campaign }) }}>
              Anotações da campanha
            </button>
            <button disabled={working} onClick={() => { setError(''); setView({ page: 'wiki', campaign }) }}>
              Wiki da campanha
            </button>
            <button disabled={working} onClick={() => void action(() => openTrash(campaign))}>Lixeira de sessões</button>
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
        <CampaignResume key={campaign.id} campaign={campaign} busy={working} onSession={openSession}
          onWiki={(id) => openWikiPage(campaign, id)}
          onPending={(itemId) => setView({ page: 'pending-items', campaign, itemId })}
          onNote={(noteId) => setView({ page: 'campaign-notes', campaign, noteId })} />
        <Attachments key={url} campaignUrl={url} archived={locked} navigationPending={working} />
        <section>
          <header className="page-header"><h2>Sessões</h2>
            {!locked && <button className="primary" disabled={working} onClick={() => openSession()}>Nova sessão</button>}
          </header>
          {sessions.length === 0 && <p className="panel empty">As sessões registradas vão aparecer aqui.</p>}
          <ul className="session-list">
            {sessions.map((session) => <li key={session.id} className="panel">
              <button className="quiet" disabled={working} onClick={() => openSession(session.id)}>{session.title}</button>
              <span>{session.number !== null && `Sessão ${session.number} · `}{displayDate(session.date)}</span>
              {!locked && <button disabled={working} aria-label={`Excluir sessão ${session.title}`}
                onClick={() => trashSession(campaign, session.id, session.title)}>Excluir sessão</button>}
            </li>)}
          </ul>
        </section>
      </>
    )
  }

  function openSearchResult(result: SearchResult) {
    void action(async () => {
      const url = `${campaignPath}/${result.campaignId}`
      const campaign = result.campaignId ? await api<Campaign>(url) : null
      if (result.type === 'quick_note') {
        const notes = await api<Note[]>(campaign ? `${url}/quick-notes` : '/api/quick-notes')
        const note = notes.find((item) => item.id === result.id)
        if (!note) throw new Error('Anotação não encontrada. Atualize a busca.')
        setView({ page: 'search-note', note, campaign })
      } else if (campaign && result.type === 'session') {
        const session = await api<Session>(`${url}/sessions/${result.id}`)
        setView({ page: 'session', campaign, session })
      } else if (campaign) {
        const initialPage = await api<WikiDetails>(`${url}/wiki/${result.id}`)
        setView({ page: 'wiki', campaign, initialPage })
      }
    })
  }

  function navigateQuick(destination: QuickDestination) {
    if (sessionNavigation.current && !sessionNavigation.current.canLeave()) return
    setQuickOpen(false)
    if (destination.kind === 'campaign') void action(() => openCampaign(destination.campaign.id))
    else openSearchResult(destination.result)
  }

  function currentPage() {
    switch (view.page) {
      case 'text-import': return <TextImport onBack={dashboard}
        onOpen={(campaign, session) => setView({ page: 'session', campaign, session })} />
      case 'search': return <Search working={working} onBack={dashboard} onOpen={openSearchResult} />
      case 'search-note': return <>
        <button className="quiet" onClick={() => setView({ page: 'search' })}>Voltar à busca</button>
        <header className="page-header"><div>
          <p className="context">{view.campaign?.name ?? 'Caixa de entrada'}</p>
          <h1>Anotação rápida</h1>
        </div></header>
        <NoteList items={[view.note]} />
      </>
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
      case 'session-trash': return <>
        <button className="quiet" disabled={working}
          onClick={() => void action(() => openCampaign(view.campaign.id))}>Voltar à campanha</button>
        <header className="page-header"><div>
          <p className="context">{view.campaign.name}</p><h1>Lixeira de sessões</h1>
        </div></header>
        {view.rows.length === 0 && <p className="panel empty">Nenhuma sessão na lixeira.</p>}
        {view.rows.length > 0 && <ul className="session-list">{view.rows.map((row) => <li key={row.id} className="panel">
          <strong>{row.title}</strong><span>{displayDate(row.date)}</span>
          {!view.campaign.archivedAt && <button disabled={working} aria-label={`Restaurar sessão ${row.title}`}
            onClick={() => void action(async () => {
              await api(`${campaignPath}/${view.campaign.id}/sessions/${row.id}/trash`, 'PATCH', { trashed: false })
              await openTrash(view.campaign)
            })}>Restaurar sessão</button>}
        </li>)}</ul>}
      </>
      case 'information': return <Narrative key={view.campaign.id} campaign={view.campaign}
        onBack={() => void action(() => openCampaign(view.campaign.id))}
        onPending={(itemId) => setView({ page: 'pending-items', campaign: view.campaign, itemId })}
        onDocument={(id, type) => {
          if (type !== 'session') return openWikiPage(view.campaign, id)
          void action(async () => {
            const session = await api<Session>(`${campaignPath}/${view.campaign.id}/sessions/${id}`)
            setView({ page: 'session', campaign: view.campaign, session })
          })
        }} />
      case 'pending-items': return <PendingItems campaign={view.campaign} itemId={view.itemId}
        onBack={() => void action(() => openCampaign(view.campaign.id))}
        onSession={(id) => void action(async () => {
          const session = await api<Session>(`${campaignPath}/${view.campaign.id}/sessions/${id}`)
          setView({ page: 'session', campaign: view.campaign, session })
        })}
        onWiki={(id) => openWikiPage(view.campaign, id)} />
      case 'campaign-notes': return <CampaignNotes campaign={view.campaign} noteId={view.noteId}
        onBack={() => setView({ page: 'campaign', campaign: view.campaign })} />
      case 'session': return <SessionEditor key={view.session.id} navigationRef={sessionNavigation} campaignName={view.campaign.name}
        campaignUrl={`${campaignPath}/${view.campaign.id}`}
        session={view.session} archived={Boolean(view.campaign.archivedAt)}
        path={`${campaignPath}/${view.campaign.id}/sessions`}
        onOpenWiki={(id) => openWikiPage(view.campaign, id)}
        onTrash={(id, title) => trashSession(view.campaign, id, title)}
        onBack={() => void action(() => openCampaign(view.campaign.id))} />
      case 'dashboard': return (
        <>
          <header className="page-header">
            <h1>Campanhas</h1>
            <div className="actions">
              <button disabled={working} onClick={() => { setError(''); setView({ page: 'quick-notes' }) }}>
                Anotações rápidas
              </button>
              <button disabled={working} onClick={() => { setError(''); setView({ page: 'search' }) }}>Busca</button>
              <button disabled={working} onClick={() => { setError(''); setView({ page: 'text-import' }) }}>Importar texto</button>
              <a className="quiet" href="/api/export" download>Exportar acervo</a>
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
      {shortcutAvailable && <button className="quiet" type="button" disabled={working}
        aria-keyshortcuts="Control+K Meta+K" onClick={openQuick}>Navegação rápida</button>}
      {quickOpen && <QuickNavigation onNavigate={navigateQuick} onClose={() => {
        setQuickOpen(false)
        window.requestAnimationFrame(() => quickOrigin.current?.focus())
      }} />}
      {error && <p role="alert" className="error panel">{error}</p>}
      {currentPage()}
    </main>
  </>
}

createRoot(document.getElementById('root')!).render(<App />)
