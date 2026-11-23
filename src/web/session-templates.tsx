import { useState } from 'react'

const templates = [
  { id: 'free', title: 'Sessão livre', headings: [] },
  { id: 'narrative', title: 'Sessão narrativa', headings: [
    'Resumo', 'Acontecimentos', 'Decisões', 'Descobertas', 'Próximos passos',
  ] },
  { id: 'investigation', title: 'Sessão investigativa', headings: [
    'Pistas encontradas', 'Pessoas interrogadas', 'Informações confirmadas', 'Teorias', 'Perguntas em aberto',
  ] },
]

export function SessionTemplates({ body, disabled, onApply }: {
  body: string; disabled: boolean; onApply: (body: string) => void
}) {
  const [selected, setSelected] = useState('')
  const template = templates.find(({ id }) => id === selected)

  function apply() {
    if (!template) return
    const markdown = template.headings.map((heading) => `## ${heading}\n\n`).join('')
    if (markdown === body) return
    if (body && !window.confirm('Substituir as anotações do rascunho pelo modelo selecionado?')) return
    onApply(markdown)
  }

  return <div className="actions">
    <label>Modelo de sessão<select value={selected} disabled={disabled}
      onChange={(event) => setSelected(event.currentTarget.value)}>
      <option value="">Escolha um modelo</option>
      {templates.map(({ id, title }) => <option key={id} value={id}>{title}</option>)}
    </select></label>
    <button type="button" disabled={!template || disabled} onClick={apply}>Aplicar modelo</button>
  </div>
}
