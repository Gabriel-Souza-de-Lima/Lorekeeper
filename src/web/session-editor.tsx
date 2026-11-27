import { FavoriteButton } from './favorites.tsx'
import { Attachments } from './attachments.tsx'
import { useLayoutEffect, useRef, useState } from 'react'
import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { markdownLayout } from './markdown-layout.tsx'
import type { Session, WikiSummary } from '../contracts.ts'
import { wikiMention, wikiReferenceId } from '../wiki-reference.ts'
import { ConflictReview, RevisionHistory } from './session-review.tsx'
import { useSessionDraft } from './use-session-draft.ts'
import { ImportSource } from './text-import.tsx'
import { SessionTemplates } from './session-templates.tsx'
import { SessionWikiLinks } from './wiki-links.tsx'
import { SessionNoteLinks } from './session-note-links.tsx'
import { InlineWiki, inlineReference, type InlineReference } from './inline-wiki.tsx'
import { DocumentTags } from './document-tags.tsx'

import { useLeave, usePendingNavigation } from './navigation-guard.tsx'

interface Props {
  campaignName: string
  campaignUrl: string
  session: Session
  path: string
  archived: boolean
  onOpenWiki: (id: string) => void
  onTrash: (id: string, title: string) => void
  onBack: () => void
  onSearchBack?: () => void
}

export function SessionEditor({ campaignName, campaignUrl, session, path, archived, onOpenWiki, onTrash, onBack, onSearchBack }: Props) {
  const editor = useSessionDraft(path, session, archived)
  const { draft, documentId, created, ready, dirty, locallySaved, storageFailed, saving, failure, recoverable, recover, update, retry } = editor

  const notes = useRef<HTMLTextAreaElement>(null)
  const [showPreview, setShowPreview] = useState(true)
  const [reference, setReference] = useState<InlineReference | null>(null)
  const dismissed = useRef<InlineReference | null>(null)
  const nextCaret = useRef<number | null>(null)

  useLayoutEffect(() => {
    if (nextCaret.current === null) return
    notes.current?.focus()
    notes.current?.setSelectionRange(nextCaret.current, nextCaret.current)
    nextCaret.current = null
  }, [draft.body])
  useLayoutEffect(() => {
    if (ready && !archived && document.activeElement === document.body) notes.current?.focus()
  }, [archived, ready])

  const leave = useLeave()
  usePendingNavigation(saving || editor.uncertain || !ready && dirty ? { label: 'Operação da sessão em andamento ou sem confirmação', blocked: true }
    : dirty ? {
      label: 'Anotações ou metadados da sessão ainda não confirmados',
      keep: locallySaved,
      save: editor.canSave && draft.title.trim() && draft.date ? async () => Boolean(await editor.save()) : undefined,
      discard: async () => Boolean(await editor.discard()),
    } : null)

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

  function trackReference(field: HTMLTextAreaElement) {
    const candidate = inlineReference(field)
    if (candidate && dismissed.current?.start === candidate.start && dismissed.current.text === candidate.text) return
    dismissed.current = null
    setReference(candidate)
  }

  function cancelReference() {
    dismissed.current = reference
    setReference(null)
    notes.current?.focus()
  }

  function insertInline(entry: InlineReference, page: WikiSummary) {
    const field = notes.current
    const current = field && inlineReference(field)
    if (!field || archived || !current || current.start !== entry.start || current.end !== entry.end || current.text !== entry.text) return
    const mention = wikiMention(page.title, page.id)
    const { value } = field
    nextCaret.current = entry.start + mention.length
    update('body', value.slice(0, entry.start) + mention + value.slice(entry.end))
    setReference(null)
  }

  function download() {
    const metadata = [
      draft.summary && `## Resumo da sessão\n\n${draft.summary}`,
      draft.highlights && `## Destaques da sessão\n\n${draft.highlights}`,
    ].filter(Boolean)
    const url = URL.createObjectURL(new Blob([[draft.body, ...metadata].join('\n\n')], { type: 'text/markdown;charset=utf-8' }))
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
      {onSearchBack
        ? <button className="quiet" disabled={saving} onClick={() => leave(onSearchBack)}>Voltar à busca</button>
        : <button className="quiet" onClick={back} disabled={saving}>Voltar à campanha</button>}
      <header className="page-header">
        <div><p className="context">{campaignName}</p><h1>Editor de sessão</h1></div>
      </header>
      <div className="session-writing">
        <div className="panel editor">
          <div className="save-state">
            <span role="status" className={failure || storageFailed ? 'error' : ''}>{status}</span>
            {!archived && <button className="primary" disabled={!editor.canSave} onClick={() => void editor.save()}>Salvar</button>}
            <button type="button" aria-expanded={showPreview} aria-controls="session-preview"
              onClick={() => setShowPreview((visible) => !visible)}>
              {showPreview ? 'Ocultar prévia' : 'Mostrar prévia'}
            </button>
          </div>
          <label htmlFor="session-notes">Anotações</label><textarea id="session-notes" ref={notes} disabled={archived || !ready} value={draft.body}
          placeholder="Registre o que aconteceu nesta sessão…"
          onChange={(event) => {
            update('body', event.currentTarget.value)
            if (!('isComposing' in event.nativeEvent) || !event.nativeEvent.isComposing) {
              trackReference(event.currentTarget)
            }
          }}
          onSelect={(event) => trackReference(event.currentTarget)}
          onCompositionEnd={(event) => trackReference(event.currentTarget)}
          onKeyDown={(event) => {
            if (event.key === 'Escape' && reference) { event.preventDefault(); cancelReference() }
          }} />
          <InlineWiki campaignUrl={campaignUrl} reference={archived || !ready ? null : reference}
            onInsert={insertInline} onCancel={cancelReference} />
        </div>
        {!archived && !dirty && recoverable.length > 0 && <div className="actions">
          {recoverable.map((candidate) => <button key={candidate.id} disabled={!ready}
            onClick={() => void recover(candidate)}>
            Recuperar rascunho · {new Date(candidate.updatedAt).toLocaleString('pt-BR')} ·{' '}
            {candidate.fields.body.trim().slice(0, 72) || candidate.fields.title}
          </button>)}
        </div>}
        {created && failure?.status === 409 && <ConflictReview url={`${path}/${documentId}`}
          draft={draft} baseVersion={editor.baseVersion} busy={!ready || saving} canKeep={locallySaved}
          onKeep={back} onResolve={editor.resolveConflict} onDiscard={(server) => void editor.discardConflict(server)} />}
        {(created || dirty) && <div className="actions">
          {!archived && created && !dirty && <button type="button" disabled={!ready || saving}
            onClick={() => onTrash(documentId, draft.title)}>Excluir sessão</button>}
          {!archived && dirty && (!created || failure?.status !== 409) && <button disabled={!ready || saving} onClick={() => {
            if (window.confirm('Descartar as alterações locais e voltar à última versão confirmada?')) void editor.discard()
          }}>Descartar alterações</button>}
          {storageFailed && (!created || failure?.status !== 409) && dirty && <button onClick={retry}>Tentar novamente</button>}
          {(failure || storageFailed) && dirty && <button onClick={download}>Baixar rascunho</button>}
        </div>}
        <details className="panel session-metadata">
          <summary>Dados da sessão</summary>
          <fieldset className="form-grid session-fields" disabled={archived || !ready}>
            <label className="wide">Título<input value={draft.title} onChange={(e) => update('title', e.target.value)} /></label>
            <label>Data real<input type="date" value={draft.date} onChange={(e) => update('date', e.target.value)} /></label>
            <label>Número<input type="number" min="1" step="1" value={draft.number ?? ''}
              onChange={(e) => update('number', e.target.value === '' ? null : e.target.valueAsNumber)} /></label>
            <label>Data no universo<input value={draft.fictionalDate} onChange={(e) => update('fictionalDate', e.target.value)} /></label>
            <label>Participantes<input value={draft.participants} onChange={(e) => update('participants', e.target.value)} /></label>
          </fieldset>
          <fieldset className="form-grid" disabled={archived || !ready}>
            <label>Resumo da sessão<textarea rows={2} maxLength={600} value={draft.summary ?? ''}
              onChange={(event) => update('summary', event.currentTarget.value)} /></label>
            <label>Destaques da sessão<textarea rows={2} maxLength={2000} value={draft.highlights ?? ''}
              placeholder="Um acontecimento por linha" onChange={(event) => update('highlights', event.currentTarget.value)} /></label>
          </fieldset>
        </details>
        {!archived && !created && <SessionTemplates body={draft.body} disabled={!ready || saving}
          onApply={(body) => {
            nextCaret.current = body.length
            setReference(null)
            update('body', body)
          }} />}
        {created && <ImportSource sessionUrl={`${path}/${documentId}`} />}
        {created && <RevisionHistory url={`${path}/${documentId}`} canRestore={!archived && ready && !dirty}
          onRestore={editor.restoreRevision} />}
        <section id="session-preview" className="panel preview" aria-label="Prévia Markdown" hidden={!showPreview}>
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
      {created && <Attachments campaignUrl={campaignUrl} documentId={documentId} archived={archived} />}
      {created && <FavoriteButton key={documentId} campaignUrl={campaignUrl} id={documentId} />}
      {created && <DocumentTags campaignUrl={campaignUrl} documentId={documentId} archived={archived} />}
      <SessionWikiLinks draftOnly={!created} sessionUrl={`${path}/${documentId}`} campaignUrl={campaignUrl} archived={archived}
        navigationBlocked={saving} version={editor.baseVersion} canInsert={ready && !archived}
        onInsert={insertMention} onOpen={(id) => leave(() => onOpenWiki(id))} />
      {created && <SessionNoteLinks sessionUrl={`${path}/${documentId}`} campaignUrl={campaignUrl} archived={archived} />}
    </>
  )
}
