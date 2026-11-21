import { useEffect, useState } from 'react'
import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { Session, SessionFields } from '../contracts.ts'
import { api } from './api.ts'

interface Props {
  campaignName: string
  session: Session
  path: string
  archived: boolean
  onBack: () => void
}

export function SessionEditor({ campaignName, session, path, archived, onBack }: Props) {
  const { id, version: initialVersion, ...initialFields } = session
  const [draft, setDraft] = useState(initialFields)
  const [saved, setSaved] = useState(initialFields)
  const [version, setVersion] = useState(initialVersion)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const dirty = draft !== saved

  useEffect(() => {
    if (archived || !dirty || saving || error) return
    const timeout = window.setTimeout(async () => {
      setSaving(true)
      try {
        const result = await api<Session>(`${path}/${id}`, 'PUT', { ...draft, version })
        setVersion(result.version)
        setSaved(draft)
      } catch (failure) {
        setError(failure instanceof Error ? failure.message : 'Tente novamente.')
      } finally {
        setSaving(false)
      }
    }, 450)
    return () => window.clearTimeout(timeout)
  }, [archived, dirty, draft, error, id, path, saving, version])

  useEffect(() => {
    if (!dirty) return
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = true
    }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  function update<K extends keyof SessionFields>(key: K, value: SessionFields[K]) {
    setDraft((current) => ({ ...current, [key]: value }))
  }

  function back() {
    if (dirty && !window.confirm('Há alterações sem confirmação do servidor. Sair do editor?')) return
    onBack()
  }

  let status = 'Salvo no servidor'
  if (error) status = `Falha ao salvar. ${error} O texto continua disponível no editor.`
  else if (saving) status = 'Salvando…'
  else if (dirty) status = 'Alterações pendentes'
  else if (archived) status = 'Campanha arquivada · somente leitura'

  return (
    <>
      <button className="quiet" onClick={back} disabled={saving}>Voltar à campanha</button>
      <header className="page-header">
        <div><p className="context">{campaignName}</p><h1>Editor de sessão</h1></div>
        <div className="save-state">
          <span role="status" className={error ? 'error' : ''}>{status}</span>
          {error && <button onClick={() => setError('')}>Tentar novamente</button>}
        </div>
      </header>
      <fieldset className="form-grid session-fields" disabled={archived}>
        <label className="wide">Título<input value={draft.title} onChange={(e) => update('title', e.target.value)} /></label>
        <label>Data real<input type="date" value={draft.date} onChange={(e) => update('date', e.target.value)} /></label>
        <label>Número<input type="number" min="1" step="1" value={draft.number ?? ''}
          onChange={(e) => update('number', e.target.value === '' ? null : e.target.valueAsNumber)} /></label>
        <label>Data no universo<input value={draft.fictionalDate} onChange={(e) => update('fictionalDate', e.target.value)} /></label>
        <label>Participantes<input value={draft.participants} onChange={(e) => update('participants', e.target.value)} /></label>
      </fieldset>
      <div className="editor-grid">
        <div className="panel editor"><label htmlFor="session-notes">Anotações</label><textarea id="session-notes" autoFocus={!archived} disabled={archived} value={draft.body}
          placeholder="Registre o que aconteceu nesta sessão…" onChange={(e) => update('body', e.target.value)} /></div>
        <section className="panel preview" aria-label="Prévia Markdown">
          <p className="context">Prévia Markdown</p>
          <Markdown skipHtml remarkPlugins={[remarkGfm]}
            components={{ img: ({ alt }) => <span>{alt}</span> }}>{draft.body}</Markdown>
        </section>
      </div>
    </>
  )
}
