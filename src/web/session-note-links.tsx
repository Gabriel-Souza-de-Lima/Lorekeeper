import { useEffect, useId, useState } from 'react'
import { api, ApiError } from './api.ts'
import { NoteList, type Note } from './note-assignment.tsx'

type Operation = { id: string; method: 'PUT' | 'DELETE' }

export function SessionNoteLinks({ sessionUrl, campaignUrl, archived }: {
  sessionUrl: string
  campaignUrl: string
  archived: boolean
}) {
  const headingId = useId()
  const pickerId = useId()
  const url = `${sessionUrl}/quick-notes`
  const [linked, setLinked] = useState<Note[] | null>(null)
  const [candidates, setCandidates] = useState<Note[]>([])
  const [selected, setSelected] = useState('')
  const [loadingFailed, setLoadingFailed] = useState(false)
  const [refresh, setRefresh] = useState(0)
  const [busy, setBusy] = useState(false)
  const [pending, setPending] = useState<Operation | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    async function load() {
      try {
        const items = await api<Note[]>(url)
        if (!active) return
        setLinked(items)
        if (archived) return
        const [inbox, campaign] = await Promise.all([
          api<Note[]>('/api/quick-notes'),
          api<Note[]>(`${campaignUrl}/quick-notes`),
        ])
        if (active) setCandidates([...new Map([...inbox, ...campaign].map((note) => [note.id, note])).values()])
      } catch {
        if (active) setLoadingFailed(true)
      }
    }
    void load()
    return () => { active = false }
  }, [archived, campaignUrl, refresh, url])

  async function change(operation: Operation) {
    setBusy(true)
    setError('')
    try {
      await api<void>(`${url}/${operation.id}`, operation.method)
      setPending(null)
      reload()
    } catch (failure) {
      const retry = failure instanceof ApiError && (failure.status === 0 || failure.status >= 500)
      setPending(retry ? operation : null)
      setError(retry ? 'Não foi possível confirmar a alteração. Repita a mesma operação.'
        : failure instanceof Error ? failure.message : 'Não foi possível alterar o vínculo.')
    } finally {
      setBusy(false)
    }
  }

  function reload() {
    setLoadingFailed(false)
    setLinked(null)
    setCandidates([])
    setSelected('')
    setRefresh((value) => value + 1)
  }

  const linkedIds = new Set(linked?.map((note) => note.id))
  const available = candidates.filter((candidate) => !linkedIds.has(candidate.id))
  const locked = busy || pending !== null || loadingFailed

  return <section className="panel" aria-labelledby={headingId}>
    <h2 id={headingId}>Anotações vinculadas</h2>
    {linked ? (linked.length ? <NoteList items={linked} actions={archived ? undefined : (note) =>
      <button type="button" aria-label={`Remover vínculo: ${note.title}`} disabled={locked}
        onClick={() => void change({ id: note.id, method: 'DELETE' })}>Remover vínculo</button>
    } /> : <p>Nenhuma anotação vinculada.</p>) : !loadingFailed && <p>Carregando anotações…</p>}
    {!archived && available.length > 0 && <div className="actions">
      <label htmlFor={pickerId}>Anotação para vincular</label>
      <select id={pickerId} value={selected} disabled={locked} onChange={(event) => setSelected(event.target.value)}>
        <option value="">Escolha uma anotação</option>
        {available.map((note) => <option key={note.id} value={note.id}>{note.title}</option>)}
      </select>
      <button type="button" disabled={locked || !selected}
        onClick={() => void change({ id: selected, method: 'PUT' })}>Vincular anotação</button>
    </div>}
    {error && <p className="error" role="alert">{error}</p>}
    {pending && <button type="button" disabled={busy} onClick={() => void change(pending)}>Repetir operação</button>}
    {loadingFailed && <p className="error" role="alert">Não foi possível carregar as anotações.</p>}
    {(loadingFailed || (error && !pending)) && <button type="button" onClick={() => { setError(''); reload() }}>
      Recarregar anotações
    </button>}
  </section>
}
