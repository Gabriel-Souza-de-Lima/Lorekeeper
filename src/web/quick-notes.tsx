import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { api } from './api.ts'
import { claimDraft } from './draft-store.ts'

interface Note {
  id: string
  title: string
  body: string
}

interface Capture {
  id: string
  body: string
  submitted: boolean
}

const path = '/api/quick-notes'
const storageKey = 'lorekeeper-quick-note-capture'

export function QuickNotes({ onBack }: { onBack: () => void }) {
  const [items, setItems] = useState<Note[] | null>(null)
  const [capture, setCapture] = useState<Capture | null>(null)
  const [editor, setEditor] = useState<'loading' | 'available' | 'locked' | 'unavailable'>('loading')
  const [attempt, setAttempt] = useState(0)
  const [listAttempt, setListAttempt] = useState(0)
  const [listingFailed, setListingFailed] = useState(false)
  const [saving, setSaving] = useState(false)
  const [storageFailed, setStorageFailed] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const listVersion = useRef(0)

  useEffect(() => {
    let active = true
    let release: (() => void) | null = null
    async function loadCapture() {
      release = await claimDraft(storageKey)
      if (!active) return release?.()
      if (!release) return setEditor('locked')
      const saved = localStorage.getItem(storageKey)
      if (saved) {
        const record = JSON.parse(saved) as Partial<Capture> | null
        if (!record || typeof record.id !== 'string' || typeof record.body !== 'string' ||
            typeof record.submitted !== 'boolean') throw new Error('Rascunho inválido.')
        setCapture({ id: record.id, body: record.body, submitted: record.submitted })
      }
      setEditor('available')
    }
    void loadCapture().catch(() => {
      if (active) setEditor('unavailable')
    })
    return () => {
      active = false
      release?.()
    }
  }, [attempt])

  useEffect(() => {
    let active = true
    const version = listVersion.current
    void api<Note[]>(path).then(
      (notes) => { if (active && version === listVersion.current) setItems(notes) },
      () => { if (active && version === listVersion.current) setListingFailed(true) },
    )
    return () => { active = false }
  }, [listAttempt])

  useEffect(() => {
    if (!storageFailed || !capture?.body) return
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = true
    }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [storageFailed, capture?.body])

  function persist(record: Capture) {
    try {
      localStorage.setItem(storageKey, JSON.stringify(record))
      setStorageFailed(false)
      return true
    } catch {
      setStorageFailed(true)
      return false
    }
  }

  function change(body: string) {
    const next = { id: capture?.id ?? crypto.randomUUID(), body, submitted: false }
    setMessage('')
    setCapture(next)
    persist(next)
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!capture?.body.trim() || editor !== 'available' || saving) return
    const pending = { ...capture, submitted: true }
    if (!persist(pending)) return
    setCapture(pending)
    setError('')
    setSaving(true)
    try {
      const note = await api<Note>(path, 'POST', { id: pending.id, body: pending.body })
      listVersion.current++
      setListingFailed(false)
      setListAttempt((value) => value + 1)
      setItems((current) => [note, ...(current ?? []).filter((item) => item.id !== note.id)])
      setMessage('Anotação guardada')
      try {
        localStorage.removeItem(storageKey)
        setCapture(null)
      } catch {
        setError('A anotação foi guardada. O navegador manteve a cópia pendente.')
      }
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  function download() {
    const url = URL.createObjectURL(new Blob([capture?.body ?? ''], { type: 'text/markdown;charset=utf-8' }))
    const link = document.createElement('a')
    link.href = url
    link.download = 'anotacao-rapida.md'
    link.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  return <>
    <button className="quiet" disabled={saving} onClick={() => {
      if (storageFailed && capture?.body && !window.confirm('O rascunho ainda está apenas nesta aba. Sair?')) return
      onBack()
    }}>Voltar ao painel</button>
    <header className="page-header"><h1>Anotações rápidas</h1></header>
    {editor === 'locked' && <div className="panel">
      <p>Outra aba está com o editor aberto. Você pode consultar a caixa de entrada aqui.</p>
      <button onClick={() => { setEditor('loading'); setAttempt((value) => value + 1) }}>Tentar abrir editor</button>
    </div>}
    {editor === 'loading' && <p>Consultando rascunho local…</p>}
    {editor === 'unavailable' && <p className="error" role="alert">Armazenamento local indisponível para editar.</p>}
    {editor === 'available' && <form className="panel" onSubmit={(event) => void submit(event)}>
      <label htmlFor="quick-note-body">Anotação</label>
      <textarea id="quick-note-body" autoFocus value={capture?.body ?? ''} disabled={saving || capture?.submitted}
        onChange={(event) => change(event.target.value)} />
      {capture?.submitted && !message && <p>Anotação pendente de confirmação.</p>}
      {storageFailed && <p role="alert" className="error">Falha no armazenamento local. Baixe o rascunho ou tente novamente.</p>}
      {!storageFailed && error && <p role="alert" className="error">{message ? error : `Anotação pendente. ${error}`}</p>}
      {message && <p role="status">{message}</p>}
      <div className="actions">
        <button type="submit" className="primary" disabled={saving || !capture?.body.trim()}>
          {saving ? 'Guardando…' : capture?.submitted ? 'Tentar novamente' : 'Guardar anotação'}
        </button>
        {capture?.body && (storageFailed || capture.submitted) &&
          <button type="button" onClick={download}>Baixar rascunho</button>}
      </div>
    </form>}
    <section aria-label="Caixa de entrada">
      <header className="page-header"><h2>Caixa de entrada</h2></header>
      {listingFailed && <p className="error">Não foi possível consultar a caixa de entrada.{' '}
        <button onClick={() => { setListingFailed(false); setListAttempt((value) => value + 1) }}>Recarregar caixa</button>
      </p>}
      {items === null && !listingFailed && <p>Carregando anotações…</p>}
      {items?.length === 0 && <p className="panel empty">Nenhuma anotação na caixa de entrada.</p>}
      {items && <ul className="session-list">{items.map((note) => <li className="panel" key={note.id}>
        <div className="preview">
          <h3>{note.title}</h3>
          {note.body.trim() !== note.title && <p style={{ whiteSpace: 'pre-wrap' }}>{note.body}</p>}
        </div>
      </li>)}</ul>}
    </section>
  </>
}
