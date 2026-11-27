import manifest from '../../package.json' with { type: 'json' }

export function About() {
  return <>
    <header className="page-header">
      <div><p className="context">Arquivo Narrativo Vivo</p><h1>Sobre</h1></div>
    </header>
    <section className="panel surface-flow" aria-labelledby="about-lorekeeper">
      <h2 id="about-lorekeeper">Lorekeeper</h2>
      <p className="context">Versão {manifest.version}</p>
      <p>Acervo pessoal para escrever sessões de RPG e recuperar histórias, personagens e descobertas de campanha.</p>
      <p>Use Campanhas para organizar sessões, wiki e pendências. Capture ideias em Anotações rápidas, consulte o acervo em Busca e marque documentos em Favoritos.</p>
      <h3>Exportação e backup</h3>
      <p>A exportação ZIP reúne documentos em formatos portáteis para consulta. O backup operacional é uma cópia do SQLite para restaurar o acervo.</p>
      <a href="https://github.com/Gabriel-Souza-de-Lima/Lorekeeper/blob/main/docs/PRODUCT.md">Documentação do Lorekeeper</a>
    </section>
  </>
}
