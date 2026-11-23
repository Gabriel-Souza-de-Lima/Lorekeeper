# Arquitetura proposta do Lorekeeper

Proposta para revisão. O [documento de produto](PRODUCT.md) é a referência funcional. O [MVP](MVP.md) define a primeira entrega e o [roadmap](ROADMAP.md) organiza a implementação.

## Requisitos que orientam a arquitetura

O fluxo principal é abrir uma campanha, começar a escrever e reencontrar o texto meses depois, inclusive em outro computador. A escrita livre exige poucos campos e salvamento sem ação manual. Campanhas têm continuidades independentes, embora uma busca possa atravessá-las. Dois computadores do mesmo usuário ainda podem editar a mesma nota em paralelo. O editor precisa informar quando guardou o texto localmente e quando o servidor confirmou a gravação.

O produto prevê offline completo para conteúdo previamente disponibilizado, histórico, recuperação e PWA. Para limitar o custo da primeira entrega, a proposta inclui recuperação local do trabalho iniciado no editor e sincronização ao reconectar, com histórico básico de texto. A abertura a frio sem rede, a navegação pelo acervo offline e a instalação como PWA entram em uma etapa posterior. Essa fronteira precisa de revisão porque o requisito técnico geral de offline é mais amplo.

## Stack e implantação

| Camada | Proposta e motivo |
| --- | --- |
| Aplicação | Node.js LTS, TypeScript, Fastify e React com Vite. Um processo serve os arquivos compilados da interface e a API JSON na mesma origem. A interação do editor fica no navegador e as regras de gravação ficam no servidor. |
| Editor | Campo de texto com controles simples, Markdown como formato canônico e prévia sanitizada. O texto permanece legível em exportações e comporta listas, checklists, tabelas, destaques e links. HTML embutido fica desabilitado. |
| Persistência | SQLite com driver síncrono `better-sqlite3`, SQL parametrizado e migrações versionadas. Transações curtas cobrem a alteração, o histórico e o índice. Validar a disponibilidade do driver e do FTS5 no alvo de implantação. |
| Navegador | IndexedDB para rascunhos e a fila de gravação de sessão e nota rápida. Isolar o acesso ao armazenamento do editor para permitir ampliar a cobertura offline. |
| Hospedagem | Uma instância Linux com volume local persistente, acesso HTTPS por uma rede privada de dispositivos autorizados, como Tailscale, e destino separado para backups. Restringir o acesso ao único usuário e aos seus dispositivos. |
| Testes | Testes de domínio e integração com SQLite real, mais Playwright para dois contextos de navegador, falha de rede e recuperação. |

Um computador próprio sempre ligado pode evitar uma mensalidade de hospedagem e depende da disponibilidade da máquina, da energia e da conexão doméstica. Uma VPS pequena dá um endereço estável e envolve custos recorrentes de máquina, volume e cópia externa. Confirmar preço e testar a rede privada nos computadores de jogo antes de escolher. Se algum equipamento bloquear a rede privada, a alternativa é HTTPS com proxy de acesso autenticado e origem inacessível diretamente. A mutação pela API deve validar a origem, com checagem de CSRF quando houver autenticação por cookie. Proteger volume e cópias por criptografia e controle de acesso, e guardar a chave de recuperação separadamente.

PostgreSQL gerenciado faria sentido se o alvo exigisse várias instâncias ou oferecesse banco durável como serviço, ao custo de outra dependência operacional. Uma arquitetura local-first com replicação completa facilitaria sessões inteiras offline, mas exigiria replicar dados, migrações e exclusões entre dispositivos. A proposta centraliza a gravação em SQLite e limita a coordenação local ao texto em edição. Usar disco local, chaves estrangeiras habilitadas, WAL e `synchronous=FULL` para privilegiar durabilidade. Evitar pasta de rede ou diretório replicado por ferramentas de sincronização de arquivos para o banco ativo.

## Módulos e navegação

A interface chama uma API autenticada. Os módulos de campanhas, documentos, links e tags, busca e recuperação compartilham a mesma instância de SQLite. O servidor valida relações e versões antes de gravar. O cliente mantém o estado da interface e os rascunhos pendentes. A API consulta diretamente o banco para leitura entre dispositivos.

A navegação principal oferece Dashboard, Campanhas, Personagens, Anotações rápidas, Busca e Configurações. Dentro de cada campanha, a Visão geral reúne resumo, últimas sessões e missões abertas, seguida de Sessões e Wiki com filtros por tipo. A busca abre o documento no contexto da campanha. O editor de sessão ocupa a área principal, com estado de gravação sempre visível e acesso aos vínculos. A interface usa português brasileiro e tema escuro responsivo.

## Modelo relacional

| Entidade | Campos e relações principais |
| --- | --- |
| Campanha | UUID, nome, descrição, mestre, sistema, versão de regras, observações, estado `ativa/pausada/encerrada`, data de arquivamento opcional, versão e datas de auditoria. O personagem em destaque é opcional e deve pertencer à campanha. |
| Documento | UUID, campanha opcional apenas para nota rápida na caixa de entrada, tipo `sessao/nota_rapida/personagem/npc/localidade/missao`, título, corpo Markdown, versão, datas de criação, atualização e arquivamento. Base comum para indexação, tags, vínculos e revisão. |
| Sessão | Extensão 1:1 de Documento com número opcional, data real, data ficcional em texto livre e participantes em texto livre. A data real define a ordem inicial, com desempate estável. |
| Personagem | Extensão 1:1 de Documento com espécie, classe, subclasse e nível opcionais. História, personalidade e evolução ficam no Markdown. |
| NPC, Localidade e Missão | Tipos de Documento. NPC pode ter uma situação em texto livre. Missão tem estado para filtrar pendências. Descrição e detalhes ficam no Markdown. Usar extensões tipadas à medida que houver campos estruturados. |
| Pendência | UUID, campanha, título, tipo, estado, descrição, origem, observações e datas. A sessão de origem é opcional. As entidades associam NPCs e localidades por UUID. O histórico acrescenta um registro por mudança de estado. |
| Nota rápida | Tipo de Documento que pode permanecer na caixa de entrada ou ser atribuído a uma campanha. Associação à sessão ou à entidade usa vínculo. |
| Tag e DocumentoTag | Tag com UUID, nome de exibição e chave normalizada única. Associação N:N com chave composta. Compartilhar um nome de tag mantém os documentos nas respectivas campanhas. |
| Vínculo | Documento de origem, documento de destino e origem da referência, manual ou Markdown. Índices para as duas direções. Backlinks consultam a direção inversa. Vínculos entre campanhas distintas são rejeitados. Atribuir uma nota da caixa de entrada à campanha ao vinculá-la. |
| Revisão de texto | Documento, versão, título e corpo, data e motivo opcional. Restauração cria nova revisão. A recuperação básica cobre texto da sessão e da nota rápida. |
| Operação de gravação | Identificador único da mutação, alvo e resultado confirmado para permitir reenvio sem duplicação. O servidor mantém o registro pelo período suportado de reenvio. |

Usar UUIDs estáveis gerados no cliente para documentos e operações, inclusive quando a criação é reenviada. Guardar instantes em UTC e a data civil da sessão separadamente. Usar restrições de unicidade, chaves estrangeiras e validação transacional para assegurar coerência de tipo e campanha. O MVP arquiva campanhas de forma reversível. A exclusão definitiva exige um fluxo posterior com confirmação e regras explícitas para dependências.

Os links escritos no Markdown apontam para IDs estáveis com rótulo legível. O editor oferece seleção de destino e preserva o rótulo escrito mesmo se a página mudar de nome. A sintaxe `[[Nome]]` no editor de sessões permite localizar ou criar o destino por ação explícita. A seleção converte a referência em Markdown por UUID no rascunho. Vínculos derivados do corpo são atualizados na mesma transação da gravação. Vínculos manuais têm origem própria. Links históricos podem apontar para documentos arquivados e indicar seu estado.

## Salvamento e sincronização

Uma sessão nova começa como rascunho local com UUID estável. O primeiro **Salvar** cria o registro, a revisão inicial e o comprovante em transação. A lixeira usa marcação reversível e preserva documento, histórico e relações. Marcar ou restaurar avança a versão de concorrência sem criar revisão textual. [Controle de sessões](specs/21-controle-de-sessoes.md) · [Lixeira reversível](specs/23-lixeira-de-sessoes.md)

1. O editor atualiza o texto em memória e persiste o rascunho no IndexedDB a cada alteração, com gravações ordenadas. A única indicação de rascunho local aparece após a confirmação do IndexedDB. A pequena janela anterior a essa confirmação pode perder caracteres em um fechamento abrupto.
2. Ao acionar Salvar, o cliente envia os campos e a versão-base com um identificador de operação. Antes do envio, a operação fica registrada localmente com o conteúdo exato, separado de alterações posteriores. Há uma operação em trânsito por documento e uma geração local para impedir que uma confirmação antiga limpe um rascunho novo. Abas concorrentes mantêm rascunhos independentes.
3. O servidor valida a versão em transação, grava a versão resultante, registra revisão textual quando título ou corpo muda, atualiza os vínculos e o índice e persiste a confirmação idempotente. Repetir a mesma operação após perda da resposta devolve a confirmação original. Reusar a chave com conteúdo diferente resulta em erro. A criação também verifica o UUID do documento. Uma operação antiga sem confirmação consultável exige reconciliação com a versão atual.
4. O editor indica **Salvo no servidor** somente para o texto confirmado. Em falha transitória, preserva a operação para um novo clique em Salvar. Em falta de espaço local ou erro de validação, mostra o erro e mantém o texto disponível para copiar ou baixar enquanto a aba estiver aberta. Ao reabrir online, recupera o rascunho do mesmo perfil para confirmar por ação explícita. Nenhuma gravação depende de um evento de fechamento da aba.
5. Uma versão-base desatualizada produz conflito (`409`). O cliente mantém o rascunho e apresenta as versões local e do servidor para comparação. O usuário pode combinar e salvar sobre a versão atual, manter o rascunho em separado ou descartá-lo explicitamente. Uma nova edição remota durante a resolução exige nova comparação. A revisão do servidor preserva o texto anterior.
6. Outro computador lê a última versão confirmada ao abrir a página. Ao voltar o foco para uma página já aberta, atualizar os dados sem substituir alterações locais. Rascunhos pendentes permanecem no dispositivo e perfil de origem até serem enviados. O MVP cobre continuar digitando com o editor aberto quando a rede cai e recuperar o rascunho ao reabrir online.

## Busca e recuperação

SQLite FTS5 usa um índice derivado com título e corpo, com tokenizer `unicode61` configurado para busca sem distinguir acentos na escrita em português. Priorizar título no ranking e consultar termos normalizados com SQL parametrizado e sintaxe FTS construída a partir de termos tratados. Aplicar filtros de campanha, categoria e tags sobre metadados relacionais. Permitir selecionar campanhas arquivadas na busca. Retornar trechos com destaque renderizado como texto seguro e links para o documento. O índice pode ser reconstruído a partir das tabelas de origem. Busca do acervo offline e indexação de anexos entram depois.

O exportador gera ZIP com Markdown em UTF-8 e JSON versionado com IDs, metadados, relações e revisões. Gerar os dados a partir de uma leitura consistente e documentar o formato. O backup operacional é uma cópia consistente do SQLite gerada via API de backup ou `VACUUM INTO`, criptografada e enviada para destino independente da instância. Proposta inicial de retenção de sete cópias diárias e quatro semanais. Monitorar a idade da última cópia bem-sucedida e testar restauração numa instância separada, com verificação de integridade, reabertura de notas, vínculos e busca. Fazer uma cópia antes de migrações e ensaiar o caminho de recuperação com dados existentes.

## Riscos prioritários

| Falha | Resposta e limite |
| --- | --- |
| Aba fecha ou conexão cai durante a escrita | Recuperar o último rascunho confirmado no IndexedDB e confirmar quando decidir salvar. O estado do editor mostra o que já está protegido. |
| Navegador apaga, expira ou recusa o armazenamento | Solicitar armazenamento persistente quando disponível, tratar erros e permitir baixar o rascunho. Um dispositivo perdido antes do envio pode levar consigo o texto pendente. |
| Duas máquinas ou abas editam a mesma nota | Versão-base obrigatória, tentativa idempotente, comparação manual e preservação de ambas as versões até resolução. |
| Servidor confirma a gravação, mas a resposta se perde | Reenviar a mesma operação. Conferir que a sessão, a revisão e os vínculos aparecem uma única vez. |
| Disco cheio ou servidor indisponível | Rejeitar a gravação sem confirmar sucesso, manter a fila local, alertar sobre espaço e permitir repetir a operação. |
| Perda do volume, erro em migração ou backup corrompido | Cópia externa, validação e restauração ensaiada. Com backup diário, uma perda total pode afetar até um dia de gravações confirmadas se as cópias estiverem em dia. Definir o tempo de recuperação com base no primeiro ensaio. |
| Computador de jogo bloqueia a rede privada | Validar o acesso nos dispositivos reais antes do piloto e decidir se o proxy autenticado é necessário. |
