import { usePendingNavigation } from './navigation-guard.tsx'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { maxAttachmentBytes, type Attachment } from '../contracts.ts'
import { api, ApiError } from './api.ts'

function validateFile(file: File | null) {
  if (!file?.size || !/\.(png|pdf)$/i.test(file.name)) return 'Escolha um arquivo PNG ou PDF.'
  if (file.size > maxAttachmentBytes) return 'O arquivo excede 10 MiB.'
  return null
}

function encodeFile(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Não foi possível ler o arquivo selecionado.'))
    reader.onload = () => resolve(String(reader.result).split(',', 2)[1])
    reader.readAsDataURL(file)
  })
}

export function Attachments({ campaignUrl, documentId, archived, navigationPending = false }: {
  campaignUrl: string; documentId?: string; archived: boolean; navigationPending?: boolean
}) {
  const path = `${campaignUrl}/attachments`
  const query = documentId ? `?documentId=${encodeURIComponent(documentId)}` : ''
  const [rows, setRows] = useState<Attachment[] | null>(null)
  const [available, setAvailable] = useState<Attachment[]>([])
  const [selected, setSelected] = useState('')
  const [editing, setEditing] = useState<string | null>(null)
  const [refresh, setRefresh] = useState(0)
  const [loadFailed, setLoadFailed] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [retry, setRetry] = useState<(() => Promise<void>) | null>(null)
  const uploadForm = useRef<HTMLFormElement>(null)
  const blocked = busy || navigationPending || Boolean(retry)
  const upload = useRef<{ id: string; file: File; source: string } | null>(null)

  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [sourceEdited, setSourceEdited] = useState(false)
  usePendingNavigation(busy || retry ? { label: 'Envio ou alteração de anexo em andamento ou sem confirmação', blocked: true }
    : selectedFile || sourceEdited || editing || selected
      ? { label: 'Arquivo, vínculo ou renomeação de anexo ainda não confirmados',
        saveLabel: 'Enviar anexo e continuar',
        save: !blocked && !archived && !editing && !selected && !validateFile(selectedFile) ? submitUpload : undefined,
        discard: async () => {
          uploadForm.current?.reset()
          setSelectedFile(null)
          setSourceEdited(false)
          setEditing(null)
          setSelected('')
          upload.current = null
          return true
        } } : null)

  useEffect(() => {
    let active = true
    void Promise.all([
      api<Attachment[]>(path + query),
      archived ? Promise.resolve([]) : api<Attachment[]>(path + '?available=true'),
    ]).then(([linked, catalog]) => {
      if (!active) return
      setRows(linked)
      setAvailable(catalog.filter((file) => !linked.some(({ id }) => file.id === id)))
      setLoadFailed(false)
    }, () => { if (active) setLoadFailed(true) })
    return () => { active = false }
  }, [archived, path, query, refresh])

  async function action(work: () => Promise<void>) {
    setBusy(true)
    setError('')
    try {
      await work()
      setRetry(null)
      setRefresh((count) => count + 1)
      return true
    } catch (failure) {
      if (failure instanceof ApiError && (failure.status === 0 || failure.status >= 500)) setRetry(() => work)
      setError(failure instanceof Error ? failure.message : 'A operação não pôde ser concluída.')
      return false
    } finally { setBusy(false) }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void submitUpload()
  }

  async function submitUpload() {
    const form = uploadForm.current
    if (!form || blocked || archived || !form.checkValidity()) return false
    const source = String(new FormData(form).get('source') ?? '').trim()
    const file = selectedFile
    const validation = validateFile(file)
    if (validation || !file) {
      setError(validation ?? 'Escolha um arquivo PNG ou PDF.')
      return false
    }
    if (upload.current?.file.name !== file.name || upload.current.file.size !== file.size ||
        upload.current.file.lastModified !== file.lastModified || upload.current.source !== source) {
      upload.current = { id: crypto.randomUUID(), file, source }
    }
    const id = upload.current.id
    return action(async () => {
      await api<Attachment>(path + query, 'POST', { id, filename: file.name, source, data: await encodeFile(file) })
      upload.current = null
      form.reset()
      setSelectedFile(null)
      setSourceEdited(false)
    })
  }

  function changeAssociation(id: string, linked: boolean) {
    return api<void>(`${path}/${id}/association${query}`, linked ? 'PUT' : 'DELETE')
  }

  return <section className="panel attachments surface-flow" aria-label="Anexos">
    <h2>Anexos</h2>
    {loadFailed && <div className="actions">
      <p className="error" aria-live="polite">Não foi possível carregar os anexos.</p>
      <button type="button" onClick={() => setRefresh((count) => count + 1)}>Recarregar anexos</button>
    </div>}
    {error && <p className="error" role="alert">{error}</p>}
    {retry && <button type="button" disabled={busy || navigationPending}
      onClick={() => void action(retry)}>Confirmar operação pendente do anexo</button>}
    {rows === null ? !loadFailed && <p className="context" aria-live="polite">Carregando anexos…</p> : rows.length === 0 ? <p>Nenhum anexo vinculado.</p> :
      <ul className="session-list">{rows.map((file) => {
        const url = `${path}/${file.id}/content`
        return <li key={file.id} className="attachment">
          {file.mime === 'image/png' && <img src={url} alt={file.name} loading="lazy" />}
          <div className="attachment-details">
            <a href={url}>{file.name}</a>
            <p className="context">{file.mime === 'image/png' ? 'PNG' : 'PDF'} · {new Intl.NumberFormat('pt-BR', {
              style: 'unit', unit: 'kilobyte', maximumFractionDigits: 1,
            }).format(file.size / 1000)}{file.source && ` · ${file.source}`}</p>
            {!archived && (editing === file.id ? <form className="actions field-actions" onSubmit={(event) => {
              event.preventDefault()
              const name = new FormData(event.currentTarget).get('name')
              void action(async () => { await api(`${path}/${file.id}`, 'PATCH', { name }); setEditing(null) })
            }}>
              <label>Nome de exibição<input name="name" defaultValue={file.name} required maxLength={150} disabled={blocked} /></label>
              <button disabled={blocked}>Salvar nome</button>
              <button disabled={blocked} type="button" onClick={() => setEditing(null)}>Cancelar</button>
            </form> : <div className="actions">
              <button type="button" disabled={blocked} onClick={() => setEditing(file.id)}
                aria-label={`Renomear ${file.name}`}>Renomear</button>
              <button type="button" disabled={blocked} aria-label={`Remover vínculo de ${file.name}`} onClick={() => {
                if (window.confirm(`Remover o vínculo com “${file.name}”?`)) void action(() => changeAssociation(file.id, false))
              }}>Remover vínculo</button>
            </div>)}
          </div>
        </li>
      })}</ul>}
    {!archived && rows !== null && <>
      <form ref={uploadForm} className="surface-flow attachment-controls" onSubmit={submit}>
        <label>Arquivo<input type="file" name="file" accept=".png,.pdf" required disabled={blocked}
          onChange={(event) => { upload.current = null; setSelectedFile(event.currentTarget.files?.[0] ?? null) }} /></label>
        <label>Origem do anexo<input name="source" maxLength={500} disabled={blocked} onChange={(event) => setSourceEdited(Boolean(event.currentTarget.value))} /></label>
        <div className="actions"><button className="primary" disabled={blocked}>{busy ? 'Aguarde…' : 'Enviar anexo'}</button></div>
      </form>
      {available.length > 0 && <div className="surface-flow attachment-controls">
        <label>Arquivo existente<select value={selected} disabled={blocked}
          onChange={(event) => setSelected(event.currentTarget.value)}>
          <option value="">Escolha um arquivo</option>
          {available.map((file) => <option value={file.id} key={file.id}>{file.name}</option>)}
        </select></label>
        <div className="actions"><button type="button" disabled={blocked || !selected} onClick={() => void action(async () => {
          await changeAssociation(selected, true)
          setSelected('')
        })}>Vincular arquivo</button></div>
      </div>}
    </>}
  </section>
}
