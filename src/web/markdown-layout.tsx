import type { Components } from 'react-markdown'

export const markdownLayout: Pick<Components, 'pre' | 'table'> = {
  pre: ({ children }) => <pre className="markdown-scroll" tabIndex={0}>{children}</pre>,
  table: ({ children }) => (
    <div className="markdown-scroll" role="region" aria-label="Tabela Markdown" tabIndex={0}>
      <table>{children}</table>
    </div>
  ),
}
