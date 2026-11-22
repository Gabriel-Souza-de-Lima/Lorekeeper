import { useEffect, useId, useState } from 'react'
import type { ReactNode } from 'react'
import type { Campaign } from '../contracts.ts'
import { api, ApiError } from './api.ts'

interface Note {
  id: string
  title: string
  body: string
}

export function NoteList({ items, actions }: { items: Note[]; actions?: (note: Note) => ReactNode }) {
  return <ul className="session-list">{items.map((note) => <li className="panel" key={note.id}>
    <div className="preview">
      <h3>{note.title}</h3>
      {note.body.trim() !== note.title && <p style={{ whiteSpace: 'pre-wrap' }}>{note.body}</p>}
    </div>
    {actions?.(note)}
  </li>)}</ul>
}

export function AssignNote({ noteId, campaigns, onAssigned }: {
  noteId: string
  campaigns: Campaign[]
  onAssigned: (id: string) => void
}) {
  const selectId = useId()
  const [destination, setDestination] = useState('')
  const [saving, setSaving] = useState(false)
  const [uncertain, setUncertain] = useState(false)
  const [error, setError] = useState('')

  async function assign() {
    if (saving || !destination) return
    setSaving(true)
    setError('')
    try {
      await api<Note>(`/api/quick-notes/${noteId}/campaign`, 'PUT', { campaignId: destination })
      onAssigned(noteId)
    } catch (failure) {
      const status = failure instanceof ApiError ? failure.status : 0
      const retry = status === 0 || status >= 500
      setUncertain(retry)
      const message = failure instanceof Error ? failure.message : 'Tente novamente.'
      setError(retry ? `Ainda não foi possível confirmar o encaminhamento. ${message}` : message)
    } finally {
      setSaving(false)
    }
  }

  return <div>
    <label htmlFor={selectId}>Campanha de destino</label>
    <select id={selectId} value={destination} disabled={saving || uncertain}
      onChange={(event) => { setDestination(event.target.value); setError('') }}>
      <option value="">Escolha uma campanha</option>
      {campaigns.map((campaign) => <option key={campaign.id} value={campaign.id}>{campaign.name}</option>)}
    </select>
    <button type="button" disabled={!destination || saving} onClick={() => void assign()}>
      {saving ? 'Encaminhando…' : uncertain ? 'Repetir encaminhamento' : 'Encaminhar'}
    </button>
    {error && <p className="error" role="alert">{error}</p>}
  </div>
}

export function CampaignNotes({ campaign, onBack }: { campaign: Campaign; onBack: () => void }) {
  const [notes, setNotes] = useState<Note[] | null>(null)
  const [error, setError] = useState(false)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let active = true
    void api<Note[]>(`/api/campaigns/${campaign.id}/quick-notes`).then(
      (items) => { if (active) setNotes(items) },
      () => { if (active) setError(true) },
    )
    return () => { active = false }
  }, [attempt, campaign.id])

  return <>
    <button className="quiet" onClick={onBack}>Voltar à campanha</button>
    <header className="page-header"><div>
      <p className="context">{campaign.name}</p>
      <h1>Anotações da campanha</h1>
    </div></header>
    {error ? <div className="panel">
      <p className="error" role="alert">Não foi possível consultar as anotações da campanha.</p>
      <button onClick={() => { setError(false); setAttempt((value) => value + 1) }}>Recarregar anotações</button>
    </div> : notes === null ? <p>Carregando anotações…</p> : notes.length === 0
      ? <p className="panel empty">Nenhuma anotação encaminhada para esta campanha.</p>
      : <NoteList items={notes} />}
  </>
}
