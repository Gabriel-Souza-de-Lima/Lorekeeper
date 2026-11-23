# Lorekeeper — Central Pessoal de Anotações e Gerenciamento de Campanhas de RPG

## 1. Visão geral do projeto

Quero desenvolver uma aplicação chamada **Lorekeeper**, destinada ao gerenciamento pessoal de anotações, informações e conhecimentos relacionados às minhas campanhas de RPG de mesa, principalmente Dungeons & Dragons 5e, considerando as versões de 2014 e 2024.

Atualmente participo de várias mesas simultaneamente, cada uma com personagens, histórias, acontecimentos, regras e contextos diferentes.

Além disso, jogo utilizando computadores diferentes, o que faz com que minhas anotações acabem espalhadas por vários aplicativos, como Notepad, Discord, Google Drive, documentos locais e arquivos PDF.

Isso gera alguns problemas:

- Dificuldade para encontrar informações registradas em sessões anteriores.
- Perda de contexto quando uma campanha passa muito tempo sem uma sessão.
- Anotações duplicadas ou espalhadas entre diferentes dispositivos.
- Dificuldade para acompanhar NPCs, missões, localidades e acontecimentos importantes.
- Falta de um histórico organizado sobre o desenvolvimento dos meus personagens.
- Necessidade de alternar constantemente entre aplicativos para recuperar informações.

O Lorekeeper deve resolver esses problemas reunindo tudo em um único ambiente.

**A ideia central é criar uma memória organizada das minhas campanhas, onde eu possa registrar acontecimentos rapidamente durante as sessões e recuperar qualquer informação posteriormente, mesmo que ela tenha sido registrada meses antes.**

O sistema deve funcionar como uma combinação de diário de campanha, wiki pessoal, gerenciador de informações e ferramenta de consulta.

Não quero criar um Virtual Tabletop (VTT), uma alternativa ao D&D Beyond ou um sistema completo de fichas digitais. A prioridade são as anotações, sua organização e a facilidade de encontrar informações.

## 2. Escopo e restrições

O Lorekeeper será um projeto de uso exclusivamente pessoal.

Não pretendo publicar, distribuir, comercializar ou disponibilizar a aplicação para terceiros.

Portanto, a arquitetura e as funcionalidades devem considerar as seguintes condições:

- **Usuário único:** apenas eu utilizarei o sistema.
- **Acesso privado:** a aplicação não precisa oferecer cadastro público ou gerenciamento de outros usuários.
- **Sem colaboração:** não preciso de edição compartilhada, permissões entre usuários ou funcionalidades sociais.
- **Sem monetização:** não haverá assinaturas, pagamentos, planos ou qualquer recurso comercial.
- **Sem necessidade de escalabilidade para múltiplos usuários:** o sistema deve ser eficiente para meu uso pessoal, com várias campanhas e grandes quantidades de informações.
- **Baixo custo:** priorizar tecnologias gratuitas, open source ou com custos mínimos de hospedagem e armazenamento.
- **Controle dos dados:** todas as informações devem poder ser exportadas e recuperadas independentemente da aplicação.
- **Acesso em diferentes dispositivos:** preciso utilizar o Lorekeeper em diferentes computadores, mantendo os dados sincronizados.
- **Manutenção simples:** evitar infraestrutura complexa, dependências desnecessárias ou soluções que exijam administração constante.

A aplicação deverá ser privada, mas acessível nos dispositivos em que eu jogar. Avaliar a melhor forma de conseguir isso sem deixar os dados expostos publicamente.

Mesmo sendo um projeto pessoal, considerar segurança básica, backups, proteção das informações e respeito às licenças de bibliotecas e materiais utilizados.

Não implementar recursos voltados para um produto comercial ou uma plataforma pública.

## 3. Princípios de desenvolvimento

Quero que o Lorekeeper siga algumas prioridades:

**Rapidez de uso**

Durante uma sessão de RPG, preciso prestar atenção no mestre e nos demais jogadores. Anotar alguma coisa não pode exigir vários cliques, formulários extensos ou navegação complexa.

O ideal é abrir uma campanha, iniciar a sessão e começar a escrever imediatamente.

**Organização sem burocracia**

Quero poder estruturar minhas anotações, mas não ser obrigado a preencher dezenas de campos.

A escrita livre deve ser a forma principal de registro. A organização estruturada deve complementar essa experiência.

**Informações conectadas**

As anotações não devem existir como documentos completamente isolados.

Quero conectar NPCs, missões, localidades, itens, personagens e acontecimentos, criando uma base de conhecimento navegável.

**Preservação histórica**

O sistema deve preservar informações antigas, permitindo acompanhar como a história e os personagens evoluíram.

**Facilidade de recuperação**

Encontrar uma informação deve ser tão simples quanto pesquisar por um nome, termo ou acontecimento.

**Independência de inteligência artificial**

O sistema deve funcionar completamente sem IA. Futuramente, recursos inteligentes poderão complementar as funcionalidades existentes.

## 4. Funcionalidades principais

### 4.1. Dashboard geral

Ao abrir o Lorekeeper, quero visualizar um painel contendo minhas campanhas.

Cada campanha deve aparecer como um card com informações como:

- Nome e imagem da campanha.
- Sistema de RPG utilizado.
- Personagem associado.
- Número de sessões registradas.
- Data da última sessão.
- Quantidade de objetivos ou pendências abertas.
- Estado da campanha: ativa, pausada ou encerrada.

O dashboard deve permitir abrir uma campanha ou continuar rapidamente suas anotações.

Também quero um botão de anotação rápida, para registrar uma informação sem precisar navegar por toda a aplicação.

### 4.2. Gerenciamento de campanhas

Cada campanha deve possuir um ambiente independente.

Ao criar uma campanha, quero poder informar:

- Nome.
- Descrição.
- Mestre responsável.
- Sistema de RPG.
- Versão das regras utilizadas.
- Imagem ou capa.
- Personagem utilizado.
- Estado atual.
- Observações gerais.

O sistema deve permitir criar, editar, arquivar e excluir campanhas, com confirmação antes de operações destrutivas.

As informações de campanhas diferentes não devem ser misturadas automaticamente.

Por exemplo, posso jogar duas campanhas ambientadas em Forgotten Realms, mas os acontecimentos de uma não necessariamente existem na outra.

Cada campanha deve manter sua própria continuidade narrativa.

### 4.3. Anotações de sessões

Esta é a funcionalidade mais importante do Lorekeeper.

Cada campanha deve ter um histórico de sessões organizado cronologicamente.

Ao criar uma sessão, quero poder informar:

- Número da sessão.
- Título.
- Data real.
- Data no universo do RPG, quando conhecida.
- Participantes presentes.
- Anotações principais.

O editor deve permitir escrever livremente, com recursos como:

- Confirmação explícita no servidor e proteção automática do rascunho no navegador.
- Suporte a Markdown ou editor de texto rico.
- Títulos e subtítulos.
- Listas e checklists.
- Tabelas.
- Destaque de texto.
- Links internos.
- Inserção de imagens.
- Anexos.
- Atalhos de teclado.
- Histórico de edições.
- Indicação do estado de salvamento e sincronização.

Também quero poder classificar determinados trechos como acontecimentos importantes, descobertas, decisões, informações recebidas, suspeitas ou pendências.

Essas classificações não devem ser obrigatórias.

O editor precisa priorizar o texto, oferecendo um modo de foco que esconda elementos secundários da interface.

**Uma anotação deve ser salva automaticamente, mesmo que eu esqueça de clicar em qualquer botão.**

O sistema deve proteger o conteúdo contra perda acidental, incluindo fechamento inesperado do navegador ou interrupções de conexão.

### 4.4. Anotações rápidas

Quero um espaço separado para registrar informações que ainda não estão organizadas.

Durante uma sessão, posso precisar anotar rapidamente o nome de um NPC, uma informação importante ou uma ideia que quero investigar depois.

Essas notas devem ser criadas com poucos cliques e poderão ser associadas posteriormente a uma campanha, sessão ou entidade.

O objetivo é evitar que eu deixe de anotar alguma coisa porque não sei imediatamente onde armazená-la.

### 4.5. Wiki de campanhas

Cada campanha deve possuir uma wiki própria.

A wiki deve organizar informações que aparecem repetidamente ao longo das sessões.

As principais categorias são:

**NPCs**

Registrar nome, apelidos, aparência, personalidade, profissão, localização, facções, relacionamentos, estado atual e informações conhecidas.

Deve ser possível indicar se determinado NPC é aliado, inimigo, neutro, desconhecido, desaparecido ou falecido, sem limitar o usuário a essas opções.

**Localidades**

Registrar cidades, regiões, tavernas, templos, masmorras e outros locais relevantes.

Cada local deve permitir armazenar descrições, personagens associados, acontecimentos e descobertas.

**Facções e organizações**

Registrar guildas, famílias, organizações políticas, religiosas ou criminosas e seus membros conhecidos.

**Missões e objetivos**

Registrar missões principais, secundárias e objetivos pessoais dos personagens.

Cada missão deve possuir estado, descrição, origem, informações conhecidas, personagens relacionados e próximos passos.

**Itens e artefatos**

Registrar objetos importantes, equipamentos especiais, documentos, pistas e itens mágicos.

A wiki deve permitir criar páginas diretamente ou a partir de uma anotação existente.

### 4.6. Relacionamentos entre informações

Quero conectar diferentes informações através de links internos.

Por exemplo, na campanha Waterdeep: Dragon Heist, meu personagem Aresius possui uma relação importante com Thalen, seu antigo mestre Hajime Kenrei e o Mosteiro Seiryu.

Quero conseguir relacionar essas entidades e acompanhar em quais sessões elas foram mencionadas.

Ao acessar a página de Thalen, por exemplo, o Lorekeeper poderia apresentar:

- Sua descrição.
- Relacionamentos conhecidos.
- Localidades associadas.
- Sessões em que foi mencionado.
- Informações descobertas sobre ele.
- Objetivos relacionados.
- Mistérios ainda não resolvidos.

O sistema deve suportar links bidirecionais e backlinks, mostrando quais páginas fazem referência à informação atual.

Idealmente, quero utilizar uma sintaxe como `[[Nome da entidade]]` para criar ou vincular páginas sem sair do editor.

### 4.7. Busca global

A busca é uma das prioridades do projeto.

Preciso conseguir encontrar informações mesmo sem lembrar em qual sessão ou documento foram registradas.

A pesquisa deve funcionar em todas as campanhas, incluindo:

- Sessões.
- Anotações rápidas.
- NPCs.
- Localidades.
- Missões.
- Personagens.
- Itens.
- Documentos e conteúdos textuais importados, quando houver suporte.

Quero filtros por campanha, categoria e tags.

Os resultados devem apresentar um trecho do texto encontrado, com destaque para os termos pesquisados.

Ao clicar em um resultado, quero abrir diretamente a página ou a seção correspondente.

A busca básica deve funcionar sem inteligência artificial.

### 4.8. Gerenciamento de personagens

Quero manter uma área dedicada aos personagens que utilizo.

O Lorekeeper deve permitir registrar:

- Nome.
- Raça ou espécie.
- Classe e subclasse.
- Nível.
- Campanha associada.
- Aparência.
- Imagem.
- Background.
- Personalidade.
- Crenças e ideais.
- Defeitos e conflitos.
- Objetivos pessoais.
- Relacionamentos.
- Habilidades importantes.
- Inventário.
- Arquivos PDF da ficha.

Não preciso que o sistema implemente imediatamente todos os cálculos de atributos, magias e combate de D&D.

O foco inicial será guardar as informações relevantes e acompanhar o desenvolvimento narrativo.

Por exemplo, Aresius possui um background relacionado ao questionamento da autoridade, à liberdade de pensamento e à morte de Thalen.

Quero registrar como os acontecimentos da campanha modificam suas crenças, objetivos e relacionamentos.

Também utilizo outros personagens, como Bilbron Kraftwerk, um artífice gnomo das profundezas, que possui necessidades diferentes de registro.

A estrutura deve ser flexível para comportar personagens de classes, sistemas e versões de regras diferentes.

### 4.9. Linha do tempo

Quero poder visualizar acontecimentos importantes de cada campanha em ordem cronológica.

O sistema deve permitir organizar eventos pela data real das sessões ou pela cronologia do universo, quando essa informação existir.

Também deve distinguir:

- Fatos confirmados.
- Declarações feitas por NPCs.
- Rumores.
- Teorias pessoais.
- Informações conhecidas pelo personagem.
- Informações conhecidas apenas pelo jogador.

Isso é importante para preservar a continuidade narrativa e evitar metagaming.

Se uma informação for desmentida posteriormente, quero manter o registro original e adicionar a nova descoberta, sem apagar o passado.

### 4.10. Pendências e preparação para sessões

Quero registrar assuntos que ficaram em aberto, como pistas, promessas, lugares a investigar, NPCs a procurar e objetivos pessoais.

Essas pendências devem poder ser associadas a missões, personagens, entidades e sessões.

Antes de começar uma nova sessão, quero acessar uma visão resumida contendo:

- Principais acontecimentos da sessão anterior.
- Objetivos atuais.
- Missões em andamento.
- Pendências.
- NPCs relevantes.
- Informações que preciso lembrar.

Essa tela deve funcionar como uma preparação rápida para voltar ao contexto da campanha.

## 5. Funcionalidades futuras

As funcionalidades abaixo devem ser consideradas na arquitetura, mas não precisam fazer parte da primeira versão.

### 5.1. Assistente de IA contextual

Futuramente, quero integrar inteligência artificial para consultar e analisar as informações das campanhas.

Exemplos:

- "O que aconteceu nas últimas três sessões?"
- "Quando conhecemos esse NPC?"
- "Quais pistas encontramos sobre determinado artefato?"
- "Quais mistérios ainda não resolvemos?"
- "Como as experiências recentes afetaram os objetivos do meu personagem?"
- "O que meu personagem sabe sobre determinada organização?"

A IA deve responder com base nas informações registradas, apresentando referências às fontes utilizadas.

Ela não deve inventar acontecimentos ou tratar hipóteses como fatos.

Também quero que possa sugerir registros de NPCs, localidades, missões e relacionamentos identificados nas anotações.

Nenhuma alteração sugerida pela IA deve ser aplicada sem minha confirmação.

### 5.2. Resumos automáticos

Permitir gerar resumos das sessões, identificando acontecimentos importantes, decisões, descobertas, mudanças narrativas e pendências.

As anotações originais devem ser preservadas.

### 5.3. Grafo de relacionamentos

Criar uma visualização interativa das conexões entre personagens, NPCs, facções, localidades, itens, missões e acontecimentos.

O grafo deve usar os relacionamentos registrados e permitir navegar diretamente para as páginas correspondentes.

### 5.4. Importação de arquivos e anotações

Quero poder migrar informações existentes de outras fontes.

Considerar:

- TXT.
- Markdown.
- PDF.
- Documentos exportados do Google Drive.
- Textos copiados do Discord.
- Imagens e anexos.

Em versões futuras, avaliar integrações diretas com Google Drive e Discord, caso tragam benefícios reais.

O sistema deve preservar a origem dos documentos importados e permitir revisar os conteúdos antes de incorporá-los às campanhas.

### 5.5. Biblioteca pessoal de regras

Quero manter referências às regras de D&D 5e, principalmente às versões 2014 e 2024.

Essa biblioteca deve permitir registrar:

- Magias.
- Habilidades.
- Condições.
- Regras frequentemente consultadas.
- Interpretações do mestre.
- Regras da casa.

As regras da casa devem poder ser específicas de cada campanha.

O módulo será uma ferramenta de referência pessoal, respeitando os direitos autorais dos materiais utilizados.

## 6. Interface e identidade visual

O nome da aplicação será **Lorekeeper**.

Quero uma identidade visual inspirada em fantasia medieval, bibliotecas antigas, grimórios e manuscritos.

Entretanto, não quero uma interface excessivamente ornamentada.

A aplicação deve parecer um software moderno com identidade de fantasia, mantendo a legibilidade e a facilidade de navegação como prioridades.

Preferências:

- Tema escuro como padrão.
- Tema claro opcional.
- Tipografia confortável para leitura e escrita.
- Elementos de fantasia discretos.
- Interface responsiva.
- Navegação lateral.
- Cards para campanhas.
- Editor com bastante espaço disponível.
- Animações sutis.
- Atalhos de teclado.
- Navegação rápida entre páginas.

A estrutura inicial sugerida é:

**Menu principal**

- Dashboard
- Campanhas
- Personagens
- Anotações rápidas
- Busca global
- Biblioteca de regras (futuramente)
- Configurações

**Dentro de uma campanha**

- Visão geral
- Sessões
- Wiki
- NPCs
- Localidades
- Facções
- Missões
- Personagens
- Linha do tempo
- Arquivos

A navegação deve permitir consultar informações relacionadas sem perder o contexto da página atual.

## 7. Requisitos técnicos

Quero desenvolver o Lorekeeper inicialmente como uma aplicação web responsiva, com possibilidade de instalação como PWA.

Isso permitirá utilizar a aplicação em diferentes computadores sem precisar manter instalações e bancos de dados independentes.

Os requisitos técnicos são:

**Persistência e sincronização**

- Armazenamento persistente.
- Sincronização entre dispositivos.
- Confirmação explícita no servidor e proteção automática do rascunho no navegador.
- Funcionamento offline para conteúdo previamente disponibilizado.
- Sincronização posterior quando houver conexão.
- Tratamento de conflitos de edição.
- Histórico e recuperação de versões.

**Segurança**

- Acesso privado.
- Autenticação simples e segura, se necessária.
- Proteção dos dados armazenados.
- Configuração segura do ambiente de hospedagem.
- Nenhuma necessidade de cadastro público.

**Dados e manutenção**

- Banco de dados adequado para anotações e relacionamentos.
- Exportação de informações em formatos abertos.
- Backups recuperáveis.
- Possibilidade de restaurar informações.
- Estrutura modular.
- Facilidade de manutenção e atualização.

**Custos**

Priorizar soluções gratuitas ou de baixo custo.

Evitar serviços pagos quando alternativas gratuitas forem suficientes para o uso pessoal.

Não quero implementar uma arquitetura distribuída ou infraestrutura complexa sem necessidade.

A escolha das tecnologias deve considerar a simplicidade de desenvolvimento, manutenção e operação.

## 8. MVP — Primeira versão funcional

Não quero começar implementando todas as funcionalidades.

A primeira versão deve resolver o problema principal: centralizar e organizar minhas anotações de RPG.

O MVP deve conter:

1. Estrutura básica da aplicação e navegação.
2. Acesso pessoal e armazenamento persistente.
3. Dashboard de campanhas.
4. Criação, edição e arquivamento de campanhas.
5. Criação e edição de sessões.
6. Editor de anotações com rascunho local automático e confirmação explícita no servidor.
7. Sincronização entre dispositivos.
8. Anotações rápidas.
9. Busca global e filtros por campanha.
10. Tags para organização.
11. Cadastro básico de personagens, NPCs, localidades e missões.
12. Links internos entre anotações e entidades.
13. Exportação e backup das informações.
14. Tema escuro e interface responsiva.

O MVP será considerado utilizável quando eu conseguir criar uma campanha, registrar várias sessões, alternar entre computadores e recuperar rapidamente informações antigas sem depender dos aplicativos que utilizo atualmente.

## 9. Exemplos de fluxos de uso

### Cenário 1: Iniciando uma sessão

Abro o Lorekeeper, seleciono minha campanha, consulto brevemente os acontecimentos anteriores e clico em "Nova sessão".

O editor abre imediatamente e posso começar a anotar.

### Cenário 2: Registrando um NPC

Durante a sessão, conhecemos um NPC chamado Darven.

Escrevo seu nome nas anotações e crio um vínculo com uma página própria, onde posteriormente posso adicionar mais informações sobre ele.

### Cenário 3: Recuperando informações antigas

Meses depois, o mestre menciona novamente Darven.

Utilizo a busca e encontro suas informações, incluindo quando o conhecemos, o que ele nos contou e quais acontecimentos estão associados a ele.

### Cenário 4: Mudando de computador

Registro as anotações da sessão em um computador.

Na sessão seguinte, utilizo outro dispositivo.

Todas as informações sincronizadas devem continuar disponíveis, sem transferência manual de arquivos.

### Cenário 5: Preparando uma sessão

Antes de começar a jogar, abro a visão geral da campanha e consulto as principais pendências e descobertas recentes.

Consigo recuperar o contexto sem reler todas as anotações antigas.

### Cenário 6: Evolução narrativa

Meu personagem passa por um acontecimento que modifica suas crenças.

Registro a mudança em sua página e relaciono o acontecimento à sessão correspondente.

O histórico anterior deve continuar disponível para que eu consiga acompanhar sua evolução.

## 10. Como quero conduzir o desenvolvimento

Quero que você atue como arquiteto de software, desenvolvedor full-stack e designer de interfaces para me ajudar a construir o Lorekeeper.

Considere que este é um projeto pessoal, com usuário único, e que minhas maiores prioridades são simplicidade, confiabilidade, facilidade de uso e baixo custo.

Antes de começar a implementar, quero que você:

1. Analise os requisitos e identifique possíveis problemas ou conflitos.
2. Proponha uma stack tecnológica adequada, explicando as escolhas.
3. Apresente uma arquitetura simples que suporte armazenamento, sincronização, busca e relacionamentos.
4. Defina um modelo de dados para campanhas, sessões, personagens, entidades, anotações e vínculos.
5. Proponha a estrutura de navegação e das principais telas.
6. Organize o desenvolvimento em etapas pequenas e testáveis.
7. Defina critérios de aceitação para as funcionalidades principais.
8. Considere situações de falha, principalmente perda de conexão, falhas de salvamento e conflitos de sincronização.
9. Explique quais recursos realmente precisam ser implementados e quais podem ser simplificados por se tratar de um projeto pessoal.

Não quero desenvolver funcionalidades desnecessárias apenas porque são comuns em aplicações comerciais.

Evite complexidade prematura e priorize soluções que sejam fáceis de manter.

Após estabelecer a arquitetura, quero começar pelo MVP, implementando primeiro o gerenciamento de campanhas e o editor de sessões.

O desenvolvimento deve ser incremental. Cada etapa precisa produzir algo funcional que possa ser testado antes de avançarmos.

Quando houver diferentes soluções possíveis, quero entender suas vantagens, desvantagens e custos para escolher a mais adequada.

## 11. Critério principal de sucesso

O Lorekeeper deve se tornar o único lugar que preciso abrir para registrar e consultar informações das minhas campanhas de RPG.

Quero poder jogar várias mesas, utilizar diferentes computadores e manter todo o histórico organizado sem depender de arquivos espalhados.

A aplicação precisa permitir que eu encontre rapidamente um acontecimento, NPC, missão ou informação importante, mesmo depois de meses.

**A principal função do Lorekeeper é preservar a memória das minhas aventuras e tornar esse conhecimento fácil de acessar.**

Todas as decisões de desenvolvimento devem priorizar esse objetivo.
