# Estratégia de validação e decisões

## Processo de qualidade

1. **SDD e revisão independente.** Revisar IDs UX, critérios funcionais e exceções normativas. Definir casos principais, alternativos e de falha com registros fictícios. Anotar separadamente regras verificáveis e preferências que exigem julgamento.
2. **TDD de comportamento.** Antes de alterar um componente, escrever a menor evidência que falha pelo comportamento desejado. Verificar Green e repetir após Refactor. Usar os testes existentes de Playwright e integração para assertar foco, teclado, semântica, estados, ordem, rede e persistência. Para regras puras, usar o runner unitário existente. Ações assíncronas e rascunhos usam operações reais ou falhas controladas, conforme o risco.
3. **Regressão.** Manter lint, tipos, build e suítes atuais. Vincular cada mudança aos IDs UX e funcionais. Preservar os cenários a 320 px, conflitos, reenvio, rollback, referências de origem, conteúdo da perspectiva e foco verificado no #66. Seguir o CI obrigatório do projeto. [Guia de desenvolvimento](https://github.com/Gabriel-Souza-de-Lima/Lorekeeper/blob/df3e8b5/docs/DEVELOPMENT.md)
4. **Acessibilidade.** Usar asserções de papel, nome, foco, contraste inspecionado e teclado. Ensaiar leitura no Windows com leitor de tela disponível e em ao menos um dispositivo móvel real com tecnologia assistiva nativa. Avaliar WCAG 2.2 AA aplicável por processo completo e página, com registro de exceções. Captura visual e scanner não substituem execução do roteiro.
5. **Regressão visual.** Considerar snapshots do Playwright em poucas vistas/estados quando a direção estiver aprovada. Controlar sistema, navegador, escala, fonte, dados, relógio e movimento. Diferenças exigem inspeção. Qualquer ferramenta adicional de auditoria ou serviço visual requer justificativa de cobertura, custo, estabilidade, privacidade e manutenção.
6. **Aceite humano.** Avaliar separadamente experiência por tarefa e direção estética. Registrar alternativas, evidências e decisão do mantenedor antes de uma mudança visual ampla.

## Roteiros mínimos e evidências

| Ensaio | Cenário | Registro |
| --- | --- | --- |
| Aprendizado e eficiência | Sem instruções de UI, encontrar campanha, escrever, salvar, reencontrar o texto e consultar perspectiva correta. Repetir por teclado com usuário habituado. | Conclusão independente, erros, desvios, passos, tempo, comentários e configuração. Medir a base antes de propor metas de tempo. |
| Erro e recuperação | Deixar aba aberta e cortar conexão, perder resposta depois de gravar, simular falha do IndexedDB, abrir versão concorrente e recuperar sessão na lixeira. | Sequência de status, versão antes/depois, alvo da ação, log de rede local e confirmação de ausência de duplicação. |
| Responsivo por tarefa | 320/390/768/1280 CSS px, zoom de 200% e reflow a 400%; retrato/paisagem e teclado virtual em aparelho. | Campo, mensagens, Salvar, Cancelar, fechamentos e destino alcançados; foco e posição de rolagem. |
| Teclado e leitor | Navegar pelas áreas, resolver homônimo, fechar diálogo, abrir e sair da consulta, ler estados e corrigir formulário. | Sequência de foco, anúncios, ausência de armadilha, configurações de navegador/leitor e impedimentos. |
| Visual | Comparar camadas e estados equivalentes sob temas candidatos, contraste final e tamanho de alvos. | Capturas equivalentes, medições e observações. Preferência estética registrada pelo mantenedor. |

## Lacunas para revisão

- A inspeção estática inventaria as superfícies e indica quais testes existentes protegem fluxos. Faltam auditoria completa de acessibilidade, ensaios com leitores de tela, testes táteis e de teclado virtual, métricas de tarefa e comparação visual controlada.
- A documentação registra validação técnica local Windows e regressões específicas de foco da P10. Ainda é necessário avaliar clareza, esforço, compreensão da distinção entre perspectiva e registro global, e descoberta das ações com usuários novos e habituados.
- A navegação atual é controlada por estados React. Avaliar retenção de filtros, retorno contextual e necessidades de URL vinculável antes de propor mudanças de arquitetura. Os anexos ilustram alternativas de organização, inclusive telas dedicadas, que exigem demonstração de benefício.
- O ensaio offline deve usar página aberta e recuperação após reabertura no ambiente suportado. A partida offline completa está fora do escopo vigente. Backup operacional tem documentação e comandos próprios, e a UI atual oferece exportação portátil.
- A lista WCAG nesta proposta aponta critérios de maior risco. A revisão deve criar uma planilha de aplicabilidade para cada critério AA e seus estados de sucesso, falha, não aplicável e pendente.

## Decisões que dependem do mantenedor

| Decisão | Alternativas, consequência e recomendação da proposta |
| --- | --- |
| Estrutura global e contextual | Separação explícita entre acervo e campanha reduz ambiguidade; um único agrupamento reduz elementos permanentes. Comparar por tarefas antes de escolher estrutura, rótulos e padrões de retorno. |
| Composição do editor | Painéis paralelos favorecem prévia em desktop. Painel alternável reduz competição por espaço. Comparar escrita, revisão, recuperação e alternância em dispositivos e zoom. |
| Identidade do arquivo narrativo | Aprovar grau de ornamentação, papéis tipográficos, contraste, densidade, superfícies, ícones e temas a partir de alternativas. Usar o laboratório para comparar, com valores finais decididos depois. |
| Agrupamento de Informações e Perspectivas | Comparar detalhe com seção, vista dedicada e transição explícita global ↔ sujeito. Preservar contexto e evitar apresentar evidências desconhecidas. |
| Metas de desempenho e suporte | Aprovar navegadores/dispositivos alvo e medir tempos atuais antes de fixar orçamento. Priorizar teclado, leitor no Windows e ao menos um dispositivo móvel real. |
| Ferramentas de qualidade | Começar pela infraestrutura existente. Aprovar dependência adicional somente se lacunas observadas justificarem custos e manutenção. |

## Divisão futura, sujeita a aprovação

| Etapa | Recorte verificável | Condição de saída |
| --- | --- | --- |
| 0 | Revisão independente desta proposta e inventário de lacunas | Requisitos, prioridades e rastreabilidade revisados. |
| 1 | Ensaios com a interface atual e comparação de alternativas | Evidências por tarefa, teclado, leitor de tela, toque e zoom; aprovação pessoal das decisões estéticas e estruturais para qualquer implementação ampla. |
| 2 | Fundamentos reutilizáveis e navegação | Estados, foco, tokens, formulários e diálogo em um recorte pequeno; CI, evidência visual e aceite humano. |
| 3 | Escrita, captura e recuperação | E2E de rascunho, conflito, revisão, referências e lixeira sem regressão funcional. |
| 4 | Organização, consulta e investigação | Busca, wiki, pendências, P10 e anexos verificados em contextos reais. |
| 5 | Regressão de ponta a ponta e aceite | Reflow, acessibilidade, integridade, dispositivos e avaliação estética registrados. |

[Índice da proposta](README.md)

## Protocolo revisado de evidência

| Evidência insuficiente ou possível redundância | Correção operacional |
| --- | --- |
| `toBeFocused()` prova alvo no DOM e pode passar com o alvo coberto. `scrollWidth <= 320` pode passar com ação inacessível. | Manter assertions existentes e acrescentar conclusão da tarefa e checagem de oclusão no zoom real e com barra/teclado. |
| Selecionar opção com API Playwright e ver árvore semântica pode passar sem gesto real ou anúncio correto. | Usar teclado físico para casos essenciais e teste por toque e leitor em dispositivo/browser identificado. Registrar anúncio efetivamente ouvido. |
| Mostrar “Salvo” e contar registro pode passar mesmo se uma geração antiga apagou a nova. | Usar perda de resposta após commit, inspeção do segundo contexto e contagem antes/depois. Assertar texto preservado localmente e versão no servidor. |
| Screenshot do estado global ou da perspectiva pode passar sem observar uma resposta atrasada. | Inverter respostas para dois sujeitos. Asserções negativas sobre texto/UUID de evidência em cada etapa e retorno correto ao foco. |
| Várias capturas de contraste por princípio ou E2Es com a mesma regra pura aumentam manutenção. | Medir contraste uma vez por combinação efetiva em G12 e referenciar nos princípios. Testar regra pura em unidade, transação em integração e um percurso representativo em E2E. Adicionar E2Es para diferenças observáveis de teclado, foco, rede ou escopo. |
| Lint, scanner ou aprovação visual tratados como aceite completo. | Manter registro por critério WCAG aplicável, página/processo, tecnologia, dados, passos, resultado e evidência. Classificar pendente até concluir inspeção e ensaio assistivo pertinentes. |

**Ambientes distinguíveis.** Emulação automatizada verifica regressão de layout e sequência de ações. Desktop real verifica zoom de navegador, teclas e leitor de tela. Aparelho móvel verifica toque, teclado virtual, orientação, rolagem e leitor nativo. As combinações finais de sistema, navegador e assistivo dependem de aprovação.

**Ordem de inspeção.** Escrita e saída com trabalho pendente, recuperação e concorrência, troca de campanha/sujeito, importação e portabilidade, navegação e foco, demais estados. Avaliar alternativas visuais depois de registrar o desempenho atual das tarefas. Nenhum resultado humano foi produzido nesta revisão.
