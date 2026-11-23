# Roadmap do Lorekeeper

A implementação começa após a revisão da [arquitetura](ARCHITECTURE.md) e do [escopo do MVP](MVP.md). Cada incremento termina com um fluxo que pode ser exercitado antes de avançar.

## Incrementos do MVP

| Ordem | Entrega | Verificação para avançar |
| --- | --- | --- |
| 1 | Campanhas e editor de sessões. Estrutura web, banco com migrações, dashboard, criação e arquivamento, sessões e Markdown com gravação automática no servidor. | Criar uma campanha, escrever duas sessões, reiniciar o processo com o mesmo volume e reabrir os textos. Testar migração, isolamento entre campanhas e gravação condicionada à versão. Usar dados de teste nesta etapa. |
| 2 — concluído | Integridade do editor e acesso em dois dispositivos. Rascunhos locais, reenvio idempotente, histórico, resolução de conflitos e implantação privada. | Usar dois contextos de navegador e os computadores de jogo. Testar perda de conexão, perda da resposta após a gravação, fechamento com rascunho confirmado e duas abas com edições concorrentes. Verificar bloqueio do acesso externo. |
| 3 | Caixa de entrada, wiki e busca. Notas rápidas, cadastro básico das entidades, tags, vínculos, backlinks e busca global. | Anotar uma descoberta, vincular um NPC, recuperar a sessão pela busca e confirmar o isolamento de campanhas homônimas. Verificar o estado do índice após edição, arquivamento e restauração de texto. |
| 4 | Portabilidade e piloto pessoal. Exportação, rotina de backup com cópia externa, ensaio de restauração e revisão da interface responsiva. | Restaurar em instância separada e completar o fluxo de criação de campanha, registro de sessões, troca de computador e busca. Medir tempo de restauração e só então iniciar o uso com o acervo real. |

## Aceite do Incremento 2

- **I2-01 a I2-06 aprovados.** A suíte cobre migração e persistência de revisões, reenvio idempotente, recuperação de rascunhos, edições concorrentes e restauração. Os testes antecederam a implementação e foram executados no CI das entregas integradas. [Especificação e evidências](specs/04-integridade-do-editor.md)
- **I2-07 aprovado.** O mantenedor relatou 4/4 verificações em host Windows com SQLite de teste e HTTPS privado via Tailscale. Passaram acesso e gravação, sincronização entre dois dispositivos autorizados, bloqueio a acesso externo e isolamento da porta 3000. [Registro do ensaio](specs/06-ensaio-de-acesso-privado.md#resultado-do-ensaio-manual)
- **Validação operacional em Linux pendente de uma implantação Linux.** A comprovação funcional do acesso privado em Windows encerra o Incremento 2. Gerenciamento de serviço, permissões locais, configuração de rede e recuperação após reinício em Linux ficam para a validação de um futuro host Linux.

## Entregas do Incremento 3

- A caixa de entrada recebe anotações rápidas e permite encaminhá-las para campanhas. [Especificação](specs/07-captura-de-anotacoes-rapidas.md)
- Os vínculos entre notas e sessões estão disponíveis no editor, com leitura de campanhas arquivadas e recuperação após perda de resposta. [Especificação](specs/09-vinculos-entre-anotacoes-e-sessoes.md)

- O cadastro básico da wiki organiza personagens, NPCs, localidades e missões por campanha. [Especificação](specs/10-cadastro-da-wiki.md)

- A visão geral oferece acesso às missões abertas e ao personagem em destaque. [Especificação](specs/11-visao-geral-da-wiki.md)

- Sessões e páginas da wiki permitem navegar por vínculos manuais nos dois sentidos. [Especificação](specs/12-vinculos-da-wiki.md)

- Menções em Markdown de sessões atualizam os backlinks na gravação e ficam navegáveis na prévia. [Especificação](specs/13-mencoes-markdown.md)

- Tags podem ser adicionadas e removidas em sessões, páginas da wiki e notas encaminhadas. [Especificação](specs/14-tags.md)

- A busca global indexa títulos e textos e combina filtros de campanha, categoria e tag. [Especificação](specs/15-busca-global.md)

- O título das páginas da wiki pode ser corrigido sem alterar o destino das menções. Os testes percorrem pesquisa, navegação, backlinks e o isolamento entre campanhas. [Especificação](specs/16-renomeia-pagina.md)

## Depois do MVP

1. **Offline e PWA.** Disponibilizar campanhas selecionadas no dispositivo, abrir o aplicativo sem rede, ampliar a fila para mais operações e evoluir a busca local. Validar cache, migrações com pendências, limites de armazenamento e atualização do service worker durante uma edição.
2. **Organização de campanhas.** Acrescentar facções, itens, linha do tempo real e ficcional, pendências próprias e preparação de sessão. Registrar origem, grau de certeza e perspectiva de jogador ou personagem, preservando afirmações anteriores quando forem corrigidas. Evoluir a apresentação do histórico, atalhos e links por nome.
3. **Arquivos, importação e regras.** Incorporar imagens, capas e anexos com backup que inclua os arquivos. Importar TXT, Markdown, PDF e dados exportados de outras ferramentas, com origem e revisão prévia. Criar a biblioteca de regras da casa e distinguir D&D 5e 2014 de 2024, respeitando as licenças das fontes. Avaliar integrações diretas com Google Drive e Discord depois de validar o fluxo de importação.
4. **Grafo e assistência opcional.** Usar os vínculos existentes para visualização do grafo. Avaliar resumos e consultas com IA apenas com fontes citadas, separação entre fatos e hipóteses, originais preservados e confirmação explícita para qualquer alteração sugerida.
