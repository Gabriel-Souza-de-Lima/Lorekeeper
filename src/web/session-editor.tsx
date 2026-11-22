import { useEffect, useRef } from 'react'
import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { Session } from '../contracts.ts'
import { useSessionDraft } from './use-session-draft.ts'

interface Props {
  campaignName: string
  session: Session
  path: string
  archived: boolean
  onBack: () => void
}

export function SessionEditor({ campaignName, session, path, archived, onBack }: Props) {
  const editor = useSessionDraft(path, session, archived)
  const { draft, ready, dirty, locallySaved, storageFailed, saving, failure, recoverable, recover, update, retry } = editor

  const notes = useRef<HTMLTextAreaElement>(null)
  useEffect(() => {
    if (ready && !archived) notes.current?.focus()
  }, [archived, ready])

  function back() {
    if (dirty && !locallySaved && !window.confirm('O rascunho ainda está apenas nesta aba. Sair do editor?')) return
    onBack()
  }

  function download() {
    const url = URL.createObjectURL(new Blob([draft.body], { type: 'text/markdown;charset=utf-8' }))
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'rascunho-da-sessao.md'
    anchor.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  let status = 'Salvo no servidor'
  if (storageFailed) status = 'Falha no armazenamento local. Baixe o rascunho antes de sair.'
  else if (failure) status = `Falha ao salvar. ${failure.message} O rascunho continua disponível neste navegador.`
  else if (!ready) status = 'Verificando rascunhos locais…'
  else if (saving) status = 'Salvando…'
  else if (locallySaved) status = 'Rascunho local · sincronização pendente'
  else if (dirty) status = 'Guardando rascunho local…'
  else if (archived) status = 'Campanha arquivada · somente leitura'

  return (
    <>
      <button className="quiet" onClick={back} disabled={saving}>Voltar à campanha</button>
      <header className="page-header">
        <div><p className="context">{campaignName}</p><h1>Editor de sessão</h1></div>
        <div className="save-state">
          <span role="status" className={failure || storageFailed ? 'error' : ''}>{status}</span>
          {(failure || storageFailed) && dirty && <button onClick={retry}>Tentar novamente</button>}
          {(failure || storageFailed) && dirty && <button onClick={download}>Baixar rascunho</button>}
        </div>
      </header>
      {!archived && !dirty && recoverable.length > 0 && <div className="actions">
        {recoverable.map((candidate) => <button key={candidate.id} disabled={!ready}
          onClick={() => void recover(candidate)}>
          Recuperar rascunho · {new Date(candidate.updatedAt).toLocaleString('pt-BR')} ·{' '}
          {candidate.fields.body.trim().slice(0, 72) || candidate.fields.title}
        </button>)}
      </div>}
      <fieldset className="form-grid session-fields" disabled={archived || !ready}>
        <label className="wide">Título<input value={draft.title} onChange={(e) => update('title', e.target.value)} /></label>
        <label>Data real<input type="date" value={draft.date} onChange={(e) => update('date', e.target.value)} /></label>
        <label>Número<input type="number" min="1" step="1" value={draft.number ?? ''}
          onChange={(e) => update('number', e.target.value === '' ? null : e.target.valueAsNumber)} /></label>
        <label>Data no universo<input value={draft.fictionalDate} onChange={(e) => update('fictionalDate', e.target.value)} /></label>
        <label>Participantes<input value={draft.participants} onChange={(e) => update('participants', e.target.value)} /></label>
      </fieldset>
      <div className="editor-grid">
        <div className="panel editor"><label htmlFor="session-notes">Anotações</label><textarea id="session-notes" ref={notes} disabled={archived || !ready} value={draft.body}
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
