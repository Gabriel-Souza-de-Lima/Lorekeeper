import { useLayoutEffect, useRef } from 'react'
import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { markdownLayout } from './markdown-layout.tsx'
import type { Session, WikiSummary } from '../contracts.ts'
import { wikiMention, wikiReferenceId } from '../wiki-reference.ts'
import { ConflictReview, RevisionHistory } from './session-review.tsx'
import { useSessionDraft } from './use-session-draft.ts'
import { SessionWikiLinks } from './wiki-links.tsx'
import { SessionNoteLinks } from './session-note-links.tsx'
import { DocumentTags } from './document-tags.tsx'

interface Props {
  campaignName: string
  campaignUrl: string
  session: Session
  path: string
  archived: boolean
  onOpenWiki: (id: string) => void
  onBack: () => void
}

export function SessionEditor({ campaignName, campaignUrl, session, path, archived, onOpenWiki, onBack }: Props) {
  const editor = useSessionDraft(path, session, archived)
  const { draft, documentId, created, ready, dirty, locallySaved, storageFailed, saving, failure, recoverable, recover, update, retry } = editor

  const notes = useRef<HTMLTextAreaElement>(null)
  useLayoutEffect(() => {
    if (ready && !archived && document.activeElement === document.body) notes.current?.focus()
  }, [archived, ready])

  function leave(navigate: () => void) {
    if (saving) return
    if (dirty && !window.confirm(locallySaved
      ? 'As alterações estão neste navegador e ainda não estão disponíveis em outros dispositivos. Sair do editor?'
      : 'O rascunho ainda está apenas nesta aba e pode ser perdido. Sair do editor?')) return
    navigate()
  }

  const back = () => leave(onBack)

  function insertMention(page: WikiSummary) {
    const field = notes.current
    if (!field || !ready || archived) return
    const { selectionStart, selectionEnd } = field
    const selected = draft.body.slice(selectionStart, selectionEnd)
    const label = selected.trim()
    const mention = wikiMention(label || page.title, page.id)
    const leading = label ? selected.match(/^\s*/)?.[0] ?? '' : ''
    const trailing = label ? selected.match(/\s*$/)?.[0] ?? '' : ''
    const start = label ? selectionStart : selectionEnd
    update('body', draft.body.slice(0, start) + leading + mention + trailing + draft.body.slice(selectionEnd))
    field.focus()
  }

  function download() {
    const url = URL.createObjectURL(new Blob([draft.body], { type: 'text/markdown;charset=utf-8' }))
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'rascunho-da-sessao.md'
    anchor.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  let status = created ? 'Salvo no servidor' : 'Sessão ainda não criada'
  if (storageFailed) status = 'Falha no armazenamento local. Baixe o rascunho antes de sair.'
  else if (created && failure?.status === 409) status = 'Conflito de edição · resolução necessária'
  else if (failure) status = `Falha ao salvar. ${failure.message} O rascunho continua disponível neste navegador.`
  else if (!ready) status = 'Verificando rascunhos locais…'
  else if (saving) status = 'Salvando…'
  else if (locallySaved) status = 'Alterações não salvas · rascunho protegido'
  else if (dirty) status = 'Protegendo rascunho…'
  else if (archived) status = 'Campanha arquivada · somente leitura'

  return (
    <>
      <button className="quiet" onClick={back} disabled={saving}>Voltar à campanha</button>
      <header className="page-header">
        <div><p className="context">{campaignName}</p><h1>Editor de sessão</h1></div>
        <div className="save-state">
          <span role="status" className={failure || storageFailed ? 'error' : ''}>{status}</span>
          {!archived && <button className="primary" disabled={!editor.canSave} onClick={() => void editor.save()}>Salvar</button>}
          {!archived && dirty && (!created || failure?.status !== 409) && <button disabled={!ready || saving} onClick={() => {
            if (window.confirm('Descartar as alterações locais e voltar à última versão confirmada?')) void editor.discard()
          }}>Descartar alterações</button>}
          {storageFailed && (!created || failure?.status !== 409) && dirty && <button onClick={retry}>Tentar novamente</button>}
          {(failure || storageFailed) && dirty && <button onClick={download}>Baixar rascunho</button>}
        </div>
      </header>
      {created && <RevisionHistory url={`${path}/${documentId}`} canRestore={!archived && ready && !dirty}
        onRestore={editor.restoreRevision} />}
      {created && failure?.status === 409 && <ConflictReview url={`${path}/${documentId}`}
        draft={draft} baseVersion={editor.baseVersion} busy={!ready || saving} canKeep={locallySaved}
        onKeep={back} onResolve={editor.resolveConflict} onDiscard={(server) => void editor.discardConflict(server)} />}
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
            components={{
              ...markdownLayout,
              img: ({ alt }) => <span>{alt}</span>,
              a: ({ href, title, children }) => {
                const id = wikiReferenceId(href ?? '')
                return id ? <button type="button" className="quiet" disabled={saving}
                  onClick={() => leave(() => onOpenWiki(id))}>{children}</button>
                  : <a href={href} title={title}>{children}</a>
              },
            }}>{draft.body}</Markdown>
        </section>
      </div>
      {created && <DocumentTags campaignUrl={campaignUrl} documentId={documentId} archived={archived} />}
      <SessionWikiLinks draftOnly={!created} sessionUrl={`${path}/${documentId}`} campaignUrl={campaignUrl} archived={archived}
        navigationBlocked={saving} version={editor.baseVersion} canInsert={ready && !archived}
        onInsert={insertMention} onOpen={(id) => leave(() => onOpenWiki(id))} />
      {created && <SessionNoteLinks sessionUrl={`${path}/${documentId}`} campaignUrl={campaignUrl} archived={archived} />}
    </>
  )
}
