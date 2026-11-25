# Roadmap do Lorekeeper

A implementação começa após a revisão da [arquitetura](ARCHITECTURE.md) e do [escopo do MVP](MVP.md). Cada incremento termina com um fluxo que pode ser exercitado antes de avançar.

## Incrementos do MVP

| Ordem | Entrega | Verificação para avançar |
| --- | --- | --- |
| 1 | Campanhas e editor de sessões. Estrutura web, banco com migrações, dashboard, criação e arquivamento, sessões e Markdown com a política inicial de gravação automática, substituída pela confirmação explícita nas sessões existentes. | Criar uma campanha, escrever duas sessões, reiniciar o processo com o mesmo volume e reabrir os textos. Testar migração, isolamento entre campanhas e gravação condicionada à versão. Usar dados de teste nesta etapa. |
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

## Entregas do Incremento 4

- O painel exporta o acervo salvo em ZIP com Markdown e JSON versionado. [Especificação](specs/17-exportacao-portavel.md)

- O comando de cópia verifica a integridade do SQLite e permite ensaiar a restauração em outra instância. [Especificação](specs/18-backup-sqlite.md)

- A CLI gera e recupera cópias externas criptografadas. A especificação define frequência diária e retenção. A configuração no host e o ensaio em volume externo real ficam para o piloto. [Especificação](specs/19-backup-externo.md)

- O ensaio automatizado registra em tela estreita, restaura uma cópia criptografada e recupera a sessão pela busca em outro contexto. A execução nos dispositivos e no volume externo reais está pendente. [Roteiro do piloto](specs/20-piloto-responsivo.md)

## Controle de sessões

- SC-01 separa revisão textual da versão de concorrência. SC-02 adiciona confirmação explícita no editor de sessões existentes. SC-03 cria a sessão no primeiro Salvar. SC-04 disponibiliza a lixeira reversível e filtra sessões excluídas das consultas e exportações normais. [Critérios](specs/22-salvamento-manual.md)

## Depois do MVP

1. **Offline e PWA.** Disponibilizar campanhas selecionadas no dispositivo, abrir o aplicativo sem rede, ampliar a fila para mais operações e evoluir a busca local. Validar cache, migrações com pendências, limites de armazenamento e atualização do service worker durante uma edição.
2. **Organização de campanhas.** Acrescentar facções, itens, linha do tempo real e ficcional, pendências próprias e preparação de sessão. Registrar origem, grau de certeza e perspectiva de jogador ou personagem, preservando afirmações anteriores quando forem corrigidas. Evoluir a apresentação do histórico, atalhos e links por nome.
3. **Arquivos, importação e regras.** Incorporar imagens, capas e anexos com backup que inclua os arquivos. Importar TXT, Markdown, PDF e dados exportados de outras ferramentas, com origem e revisão prévia. Criar a biblioteca de regras da casa e distinguir D&D 5e 2014 de 2024, respeitando as licenças das fontes. Avaliar integrações diretas com Google Drive e Discord depois de validar o fluxo de importação.
4. **Grafo e assistência opcional.** Usar os vínculos existentes para visualização do grafo. Avaliar resumos e consultas com IA apenas com fontes citadas, separação entre fatos e hipóteses, originais preservados e confirmação explícita para qualquer alteração sugerida.

## Pós-MVP — Organização e experiência de campanha

| Ordem | Entrega | Validação |
| --- | --- | --- |
| P1 | Retomar campanha com sessões e vínculos já registrados. | Navegação, vazio, lixeira, isolamento e rascunhos. [Especificação](specs/24-retomar-campanha.md) |
| P2 | Pendências, pistas e perguntas com histórico de estado. | Cadastro, vínculos, consulta contextual e complemento do painel P1. [Especificação](specs/25-pendencias.md) |
| P3 | Selecionar e criar entidades no editor com `[[Nome]]`. | Cancelamento preserva texto e confirmação usa IDs estáveis. [Especificação](specs/26-referencias-durante-a-escrita.md) |
| P4 | Templates opcionais de sessão. | Aplicação local e confirmação para substituir texto. [Especificação](specs/27-modelos-de-sessao.md) |
| P5 | Anexos de imagens e PDFs. | Validar armazenamento local, exportação e restauração isolada. [Especificação](specs/28-anexos.md) |
| P6 | Edição de pendências. | Confirmar, cancelar e resolver conflitos sem perder histórico. [Especificação](specs/29-edicao-de-pendencias.md) |
| P7 | Resumo de sessão e destaques escritos pelo usuário. | Preservar salvamento manual, retomada e portabilidade. [Especificação](specs/30-resumo-de-sessao.md) |
| P8 | Importação de TXT e Markdown. | Prévia, confirmação, idempotência e busca. [Especificação](specs/31-importacao-de-texto.md) |
| P9 | Navegação rápida e favoritos. | Teclado, foco, rascunhos e persistência. [Especificação](specs/32-navegacao-rapida.md) |
| P10-A | Fatos, rumores e evidências. | [Especificação e evidências](specs/33-fatos-rumores-e-teorias.md). |
| P10-B | Perspectivas e conhecimento dos personagens. | [Especificação e evidências](specs/34-perspectivas-e-conhecimento.md). |

### Encerramento do ciclo funcional

P6–P9 foram integrados com validação pós-merge. O acervo existente foi verificado com migrações aditivas V12–V15 em bancos temporários, usando testes de preservação, integridade e rollback. A importação inicial tem sessão como destino editável e limite de 512 KiB em UTF-8. O resumo e os destaques são escritos pelo usuário, e os favoritos incluem sessões e páginas da wiki.

O ciclo encerra com a proposta P10. A próxima etapa planejada é avaliar alternativas para a reformulação visual. A implementação permanece condicionada à aprovação pessoal da direção estética, navegação, cores, tipografia e componentes principais.
