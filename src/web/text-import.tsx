import { useLeave, usePendingNavigation } from './navigation-guard.tsx'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import type { Campaign, Session, SessionImportSource } from '../contracts.ts'
import { maxImportBytes, readImportFile, validImportText } from '../text-import.ts'
import { api, ApiError, localDate } from './api.ts'

type ImportRequest = {
  id: string; title: string; body: string; date: string; filename: string; source: string; data: string
}

function base64(bytes: Uint8Array) {
  let binary = ''
  for (let index = 0; index < bytes.length; index += 8192) {
    binary += String.fromCharCode(...bytes.subarray(index, index + 8192))
  }
  return btoa(binary)
}

export function TextImport({ onBack, onOpen }: { onBack: () => void; onOpen: (campaign: Campaign, session: Session) => void }) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [campaignId, setCampaignId] = useState('')
  const [title, setTitle] = useState('')
  const [source, setSource] = useState('')
  const [text, setText] = useState('')
  const [file, setFile] = useState<{ filename: string; bytes: Uint8Array } | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [uncertain, setUncertain] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const selection = useRef(0)
  const operation = useRef<{ key: string; campaign: Campaign; request: ImportRequest } | null>(null)
  const campaign = campaigns.find(({ id }) => id === campaignId)

  const leave = useLeave()
  usePendingNavigation(busy || uncertain ? { label: 'Importação em andamento ou aguardando confirmação', blocked: true }
    : file || title || source || text || campaignId ? { label: 'Importação ainda não confirmada', discard: true } : null)

  useEffect(() => {
    let active = true
    void api<Campaign[]>('/api/campaigns').then(
      (items) => { if (active) setCampaigns(items) },
      () => { if (active) setError('Não foi possível carregar as campanhas.') },
    )
    return () => { active = false }
  }, [attempt])

  useEffect(() => {
    if (!uncertain && !busy) return
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = true }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [uncertain, busy])

  async function preview(selected: File | undefined) {
    const sequence = ++selection.current
    setError('')
    setFile(null)
    setText('')
    if (!selected) return
    try {
      if (selected.size > maxImportBytes) throw new Error('O arquivo excede 512 KiB.')
      const bytes = new Uint8Array(await selected.arrayBuffer())
      if (sequence !== selection.current) return
      setText(readImportFile(selected.name, bytes))
      setFile({ filename: selected.name, bytes })
      setTitle(selected.name.replace(/\.[^.]+$/, ''))
    } catch (failure) {
      if (sequence === selection.current) setError(failure instanceof Error ? failure.message : 'Não foi possível ler o arquivo.')
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy || !campaign || !file) return
    if (!operation.current) {
      if (!title.trim() || !validImportText(text)) {
        setError('Informe o título e o conteúdo da sessão.')
        return
      }
      if (new TextEncoder().encode(text).byteLength > maxImportBytes) {
        setError('O conteúdo excede 512 KiB.')
        return
      }
      operation.current = { key: crypto.randomUUID(), campaign, request: {
        id: crypto.randomUUID(), title, body: text, date: localDate(), filename: file.filename,
        source, data: base64(file.bytes),
      } }
    }
    const current = operation.current
    setBusy(true)
    setError('')
    try {
      const saved = await api<Session>(`/api/campaigns/${current.campaign.id}/import-text`, 'POST', current.request,
        { 'Idempotency-Key': current.key })
      operation.current = null
      onOpen(current.campaign, saved)
    } catch (failure) {
      const retry = !(failure instanceof ApiError) || failure.status === 0 || failure.status >= 500
      setUncertain(retry)
      if (!retry) operation.current = null
      setError(failure instanceof Error ? failure.message : 'Não foi possível confirmar a importação.')
    } finally { setBusy(false) }
  }

  return <>
    <button className="quiet dashboard-shortcut" disabled={busy} onClick={() => leave(onBack)}>Voltar ao painel</button>
    <header className="page-header"><h1>Importar texto</h1></header>
    {error && <p className="error" role="alert">{error}</p>}
    {campaigns.length === 0 && <button type="button" onClick={() => {
      setError('')
      setAttempt((value) => value + 1)
    }}>Recarregar campanhas</button>}
    <form className="panel surface-flow" aria-label="Preparar importação" onSubmit={(event) => void submit(event)}>
      <fieldset className="form-grid" disabled={busy || uncertain}>
        <label>Campanha de destino<select required value={campaignId} onChange={(event) => setCampaignId(event.currentTarget.value)}>
          <option value="">Selecione a campanha</option>
          {campaigns.map(({ id, name }) => <option key={id} value={id}>{name}</option>)}
        </select></label>
        <p className="context">Tipo de destino: sessão</p>
        <div className="wide surface-flow">
          <label>Arquivo de texto<input type="file" accept=".txt,.md" aria-describedby="text-import-limit"
            onChange={(event) => void preview(event.currentTarget.files?.[0])} /></label>
          <p className="context" id="text-import-limit">TXT ou Markdown em UTF-8, até 512 KiB.</p>
        </div>
        {file && <>
          <label>Título<input value={title} required maxLength={150} onChange={(event) => setTitle(event.currentTarget.value)} /></label>
          <label>Origem informada<input value={source} maxLength={500} onChange={(event) => setSource(event.currentTarget.value)} /></label>
          <label className="wide">Prévia do conteúdo<textarea value={text} rows={12}
            onChange={(event) => setText(event.currentTarget.value)} /></label>
        </>}
      </fieldset>
      <div className="actions">
        <button className="primary" disabled={!campaign || !file || busy}>
          {uncertain ? 'Reenviar importação' : 'Confirmar importação'}
        </button>
      </div>
    </form>
  </>
}

export function ImportSource({ sessionUrl }: { sessionUrl: string }) {
  const [source, setSource] = useState<SessionImportSource | null>(null)
  useEffect(() => {
    let active = true
    void api<SessionImportSource | null>(sessionUrl + '/import-source').then((value) => {
      if (active) setSource(value)
    }).catch(() => {})
    return () => { active = false }
  }, [sessionUrl])
  if (!source) return null
  return <p className="context">Importado de {source.filename}{source.source && ` · ${source.source}`}</p>
}
