import { useState } from 'react'
import type { Session, SessionFields } from '../contracts.ts'
import { api, displayDate } from './api.ts'

type Revision = Pick<Session, 'version' | 'title' | 'body'> & { createdAt: string }

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Tente novamente.'
}

export function ConflictReview({ url, draft, baseVersion, busy, canKeep, onKeep, onResolve, onDiscard }: {
  url: string
  draft: SessionFields
  baseVersion: number
  busy: boolean
  canKeep: boolean
  onKeep: () => void
  onResolve: (session: Session) => void
  onDiscard: (session: Session) => void
}) {
  const [server, setServer] = useState<Session | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function compare() {
    setLoading(true)
    setError('')
    setServer(null)
    try {
      const latest = await api<Session>(url)
      if (latest.version <= baseVersion) {
        setError('O servidor ainda está na mesma versão. O rascunho foi preservado.')
      } else {
        setServer(latest)
      }
    } catch (failure) {
      setError(errorMessage(failure))
    } finally {
      setLoading(false)
    }
  }

  return <section className="panel" aria-label="Conflito de edição">
    <div className="actions">
      <button disabled={busy || loading} onClick={() => void compare()}>
        {server ? 'Atualizar comparação' : 'Comparar versões'}
      </button>
      {canKeep && <button disabled={busy} onClick={onKeep}>Manter rascunho e voltar</button>}
    </div>
    {error && <p className="error" role="alert">{error}</p>}
    {server && <>
      <p>Edite a versão local nos campos da sessão. Prepare a combinação sobre a versão exibida e clique em Salvar para confirmá-la.</p>
      <div className="editor-grid">
        <VersionText name="Versão local" fields={draft} />
        <VersionText name="Versão do servidor" fields={server} version={server.version} />
      </div>
      <div className="actions">
        <button className="primary" disabled={busy} onClick={() => onResolve(server)}>Preparar combinação</button>
        <button disabled={busy} onClick={() => {
          if (window.confirm('Descartar o rascunho local e usar a versão exibida do servidor?')) onDiscard(server)
        }}>Descartar rascunho</button>
      </div>
    </>}
  </section>
}

function VersionText({ name, fields, version }: { name: string; fields: SessionFields; version?: number }) {
  return <section className="panel preview" aria-label={name}>
    <h2>{name}{version !== undefined && ` · v${version}`}</h2>
    <p><strong>{fields.title}</strong></p>
    <p>{displayDate(fields.date)}{fields.number !== null && ` · Sessão ${fields.number}`}</p>
    {fields.fictionalDate && <p>Data no universo: {fields.fictionalDate}</p>}
    {fields.participants && <p>Participantes: {fields.participants}</p>}
    {fields.summary && <p style={{ whiteSpace: 'pre-wrap' }}>Resumo: {fields.summary}</p>}
    {fields.highlights && <p style={{ whiteSpace: 'pre-wrap' }}>Destaques: {fields.highlights}</p>}
    <p style={{ whiteSpace: 'pre-wrap' }}>{fields.body}</p>
  </section>
}

export function RevisionHistory({ url, canRestore, onRestore }: {
  url: string
  canRestore: boolean
  onRestore: (revision: Revision) => void
}) {
  const [revisions, setRevisions] = useState<Revision[] | null>(null)
  const [selected, setSelected] = useState<Revision | null>(null)
  const [open, setOpen] = useState(false)
  const [error, setError] = useState('')

  async function show() {
    setOpen(true)
    setError('')
    setRevisions(null)
    setSelected(null)
    try {
      setRevisions(await api<Revision[]>(`${url}/revisions`))
    } catch (failure) {
      setError(errorMessage(failure))
    }
  }

  return <>
    <button aria-expanded={open} onClick={() => open ? setOpen(false) : void show()}>Histórico de revisões</button>
    {open && <section className="panel" aria-label="Histórico de revisões">
      {error ? <p className="error" role="alert">{error}</p>
        : revisions === null ? <p>Consultando revisões…</p>
          : revisions.length === 0 ? <p>Nenhuma revisão disponível.</p>
            : <ul className="session-list">
              {revisions.map((revision) => <li key={revision.version}>
                <button onClick={() => setSelected(revision)}>Inspecionar versão {revision.version}</button>
                <span>{new Date(revision.createdAt).toLocaleString('pt-BR')}</span>
              </li>)}
            </ul>}
      {selected && <section className="panel preview" aria-label="Conteúdo da revisão">
        <h2>{selected.title}</h2>
        <p style={{ whiteSpace: 'pre-wrap' }}>{selected.body}</p>
        <button disabled={!canRestore} onClick={() => {
          if (!window.confirm('Carregar título e anotações da revisão? Use Salvar para confirmar.')) return
          onRestore(selected)
          setOpen(false)
        }}>Restaurar como nova revisão</button>
      </section>}
    </section>}
  </>
}
