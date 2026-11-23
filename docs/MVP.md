# MVP do Lorekeeper

Escopo proposto para revisão com base no [documento de produto](PRODUCT.md). A primeira versão permite registrar várias sessões de uma campanha, alternar entre computadores e encontrar uma informação antiga pelo título, pelo corpo do texto ou pelo vínculo com uma entidade.

## Escopo e critérios de aceitação

| ID | Fluxo | Critério de aceitação |
| --- | --- | --- |
| MVP-01 | Acesso privado e navegação | O usuário abre o dashboard em dois computadores autorizados. Um dispositivo sem autorização fica sem acesso à interface e à API. A interface em português brasileiro, com tema escuro, permite ler e editar em telas estreitas. |
| MVP-02 | Campanhas | Criar uma campanha informando apenas o nome. Editar metadados, abrir a campanha pelo dashboard e ver estado, personagem em destaque, número de sessões, última sessão e missões abertas quando houver dados. Arquivar, localizar e reativar sem perder conteúdo ou vínculos. |
| MVP-03 | Sessões | A partir da campanha, abrir uma nova sessão diretamente no editor e criar o registro no primeiro Salvar. Editar título, datas, número e participantes quando necessário. Reabrir o histórico em ordem cronológica, consultar a sessão anterior e recuperar sessões pela lixeira. |
| MVP-04 | Editor Markdown | Digitar texto livre e visualizar títulos, listas, checklists, tabelas e destaques. O rascunho local é automático; Salvar confirma as alterações no servidor e distingue pendência, confirmação e erro. Restaurar uma revisão prepara alterações para o próximo Salvar. |
| MVP-05 | Troca de dispositivo | Gravar texto no computador A, aguardar a confirmação e encontrar a mesma versão ao abrir a sessão no computador B, sem transferência manual. |
| MVP-06 | Queda de conexão | Com o editor aberto, continuar escrevendo após desconectar. Depois da confirmação local, fechar a aba e recuperar o texto ao reabrir online no mesmo perfil. Repetir um envio já iniciado reutiliza a mesma operação e evita duplicatas. Se o armazenamento local falhar, a interface indica o erro e permite copiar ou baixar o texto. |
| MVP-07 | Conflito | Abrir a mesma sessão nos dois computadores, salvar mais tarde sobre a mesma versão-base e verificar que a tentativa atrasada preserva o rascunho e mostra a versão do servidor. Salvar uma combinação mantém o histórico disponível. |
| MVP-08 | Anotações rápidas | Abrir a captura a partir do dashboard, escrever sem escolher uma campanha e recuperar a nota na caixa de entrada. Atribuir campanha e vincular a uma sessão ou entidade depois. Aplicar a mesma proteção de texto das sessões. |
| MVP-09 | Wiki e personagens | Cadastrar personagens, NPCs, localidades e missões com título e texto livre na campanha. Consultar missões abertas e acessar a página do personagem em destaque pela campanha. |
| MVP-10 | Vínculos e tags | Vincular uma menção na sessão a uma página e ver a sessão nos backlinks. Renomear a página mantém o vínculo navegável. Entidades homônimas de campanhas diferentes permanecem independentes. Associar e remover tags. |
| MVP-11 | Busca | Encontrar um termo no corpo de uma sessão antiga, com ou sem acentos. Filtrar por campanha, categoria e tag, ler trecho destacado e abrir o documento correspondente. |
| MVP-12 | Exportação e backup | Abrir o Markdown e o JSON exportados fora do Lorekeeper. Restaurar uma cópia operacional separada e recuperar campanhas, textos, revisões e vínculos. Conferir que a busca retorna resultados coerentes após a restauração. |

## Validação do controle de sessões

O [aceite de SC-01 a SC-04 e SAVE-01 a SAVE-15](specs/21-controle-de-sessoes.md#aceite-e-rastreabilidade) registra a cobertura de criação, confirmação manual, histórico, rascunhos e lixeira. A validação operacional de troca de dispositivos e backup externo do [piloto do Incremento 4](specs/20-piloto-responsivo.md) é acompanhada separadamente.

## Incremento posterior ao MVP

A proposta deixa para os próximos incrementos a abertura a frio sem rede, a seleção de campanhas para disponibilidade offline e a instalação como PWA. Também ficam para depois capas e anexos, PDFs, editor rico, sintaxe `[[Nome]]`, atalhos avançados, linha do tempo ficcional, marcações de fatos e rumores, facções, itens, tela dedicada de preparação, histórico narrativo estruturado e exclusão definitiva. A visão geral inicial usa as sessões recentes e as missões abertas para retomar o contexto. Recursos de IA, importações, grafo e biblioteca de regras estão no [roadmap](ROADMAP.md).
