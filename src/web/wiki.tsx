import { useEffect, useState, type FormEvent } from 'react'
import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { wikiTypes, type Campaign, type WikiPage, type WikiSummary, type WikiType } from '../contracts.ts'
import { api, ApiError } from './api.ts'

const labels: Record<WikiType, string> = {
  character: 'Personagem', npc: 'NPC', location: 'Localidade', quest: 'Missão',
}

export function Wiki({ campaign, onBack }: { campaign: Campaign; onBack: () => void }) {
  const url = `/api/campaigns/${campaign.id}/wiki`
  const [pages, setPages] = useState<WikiSummary[] | null>(null)
  const [page, setPage] = useState<WikiPage | null>(null)
  const [draft, setDraft] = useState<WikiPage | null>(null)
  const [busy, setBusy] = useState(false)
  const [uncertain, setUncertain] = useState(false)
  const [error, setError] = useState('')
  const [refresh, setRefresh] = useState(0)

  useEffect(() => {
    let active = true
    void api<WikiSummary[]>(url).then(
      (items) => { if (active) setPages(items) },
      () => { if (active) setError('Não foi possível carregar a wiki.') },
    )
    return () => { active = false }
  }, [refresh, url])

  async function open(id: string) {
    setBusy(true)
    setError('')
    try {
      setPage(await api<WikiPage>(`${url}/${id}`))
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Não foi possível abrir a página.')
    } finally {
      setBusy(false)
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!draft || busy) return
    setBusy(true)
    setError('')
    try {
      const created = await api<WikiPage>(url, 'POST', draft)
      setPages(null)
      setRefresh((value) => value + 1)
      setPage(created)
      setDraft(null)
      setUncertain(false)
    } catch (failure) {
      const retry = failure instanceof ApiError && (failure.status === 0 || failure.status >= 500)
      setUncertain(retry)
      setError(retry ? 'Não foi possível confirmar a criação. Repita o envio da mesma página.'
        : failure instanceof Error ? failure.message : 'Não foi possível criar a página.')
    } finally {
      setBusy(false)
    }
  }

  const feedback = error && <p className="error" role="alert">{error}</p>
  if (page) return <>
    <button className="quiet" onClick={() => setPage(null)}>Voltar à wiki</button>
    <header className="page-header"><div><p className="context">{labels[page.type]}</p><h1>{page.title}</h1></div></header>
    <div className="panel preview"><Markdown skipHtml remarkPlugins={[remarkGfm]}
      components={{ img: ({ alt }) => <span>{alt}</span> }}>{page.body}</Markdown></div>
  </>
  if (draft) return <>
    <h1>Nova página da wiki</h1>
    <form className="panel campaign-form" onSubmit={(event) => void submit(event)}>
      <fieldset className="form-grid" disabled={busy || uncertain}>
        <label>Tipo<select value={draft.type} onChange={(event) => setDraft({ ...draft, type: event.target.value as WikiType })}>
          {wikiTypes.map((type) => <option key={type} value={type}>{labels[type]}</option>)}
        </select></label>
        <label>Título<input required value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} /></label>
        <label className="wide">Descrição<textarea value={draft.body}
          onChange={(event) => setDraft({ ...draft, body: event.target.value })} /></label>
      </fieldset>
      <div className="actions">
        <button className="primary" disabled={busy}>{uncertain ? 'Repetir envio' : 'Criar página'}</button>
        <button type="button" disabled={busy} onClick={() => {
          if (draft.body && !window.confirm('Sair do formulário e descartar o texto local?')) return
          setDraft(null)
          setError('')
          setUncertain(false)
          setRefresh((value) => value + 1)
        }}>Voltar à wiki</button>
      </div>
      {feedback}
    </form>
  </>

  return <>
    <button className="quiet" disabled={busy} onClick={onBack}>Voltar à campanha</button>
    <header className="page-header"><div><p className="context">{campaign.name}</p><h1>Wiki da campanha</h1></div>
      {!campaign.archivedAt && <button className="primary" disabled={busy} onClick={() => {
        setError('')
        setDraft({ id: crypto.randomUUID(), type: 'character', title: '', body: '' })
      }}>Nova página</button>}
    </header>
    {feedback}
    {pages === null ? error ? <button onClick={() => { setError(''); setRefresh((value) => value + 1) }}>Recarregar wiki</button>
      : <p>Carregando páginas…</p>
      : pages.length === 0 ? <p className="panel empty">Nenhuma página cadastrada.</p>
        : <ul className="session-list">{pages.map((item) => <li key={item.id} className="panel">
          <button className="quiet" disabled={busy} onClick={() => void open(item.id)}>{item.title}</button>
          <span>{labels[item.type]}</span>
        </li>)}</ul>}
  </>
}
