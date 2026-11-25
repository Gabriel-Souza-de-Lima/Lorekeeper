# Revisão individual dos requisitos originais

Cada ID foi avaliado quanto a clareza, necessidade, completude, consistência, viabilidade, vínculo funcional, testabilidade, redundância e adequação ao uso pessoal. A coluna de revisão registra o ponto que determinou a decisão. Os identificadores AUD remetem ao relatório, onde constam impacto, evidência, severidade e necessidade de decisão. A avaliação é documental.

| ID | Decisão | Avaliação determinante e efeito |
| --- | --- | --- |
| UX-G01 | Revisar | Retorno universal extrapola a navegação interna e não é testável sem limitar o percurso. AUD-02. |
| UX-G02 | Revisar | Necessário para aprendizagem. Exigir roteiro e registrar resultado, não julgar pela aparência. AUD-10. |
| UX-G03 | Manter | Estados distintos e caso de erro são claros. G14 acrescenta a disputa de respostas, sem repetir a regra de feedback. AUD-06. |
| UX-G04 | Revisar | Valioso e viável; tipos de persistência e reenvio precisam ser específicos. AUD-01. |
| UX-G05 | Revisar | Critério verificável após separar foco no DOM, indicador e visibilidade. AUD-04/11. |
| UX-G06 | Revisar | Árvore acessível é evidência parcial; anúncio e nomes precisam de teste assistivo. AUD-04/13. |
| UX-G07 | Revisar | Alvo normativo, exceções e meta interna precisam de registros distintos. AUD-04. |
| UX-G08 | Revisar | Emulação e zoom real cobrem riscos diferentes do aparelho com teclado virtual. AUD-04/11. |
| UX-G09 | Revisar | Confirmação indiscriminada pode duplicar atrito ou esconder consequências distintas. AUD-05. |
| UX-G10 | Revisar | Erro em seção recolhida e preenchimento redundante antes indefinidos. AUD-04/13. |
| UX-G11 | Revisar | Atraso fixo não prova latência percebida ou integridade de respostas. AUD-06. |
| UX-G12 | Revisar | Concentrar contraste normativo aqui. Separar movimento reduzido como meta interna. AUD-04/09/13. |
| UX-F01 | Manter | Criar, arquivar e retomar são rastreáveis ao MVP e observáveis sem mudança do domínio. |
| UX-F02 | Manter | Resumo e trecho têm condições alternativas e vínculos explícitos à P1/P2/P7. |
| UX-F03 | Manter | Critério específico de escrita manual tem regressão direta; G04/G13 explicitam limites locais. AUD-01/10. |
| UX-F04 | Revisar | Separar modelos e referência com cancelamento e UUID, medindo efeito em sessão e wiki. AUD-07. |
| UX-F05 | Revisar | Requer segunda disputa e prova de restauração manual, por versão. AUD-12. |
| UX-F06 | Revisar | Lixeira reversível precisa de prova de disponibilidade, identidade e destino do foco. AUD-05/12. |
| UX-F07 | Manter | Captura, encaminhamento e desvinculação têm consequência verificável; G04 define limite da persistência. AUD-01. |
| UX-F08 | Revisar | Missão e destaque tinham inventário sem casos próprios. Homônimo e renomeação têm riscos diferentes. AUD-07. |
| UX-F09 | Revisar | Falta provar que remoção da associação conserva a tag e outros documentos. AUD-07. |
| UX-F10 | Revisar | Retenção de consulta deve ter percurso explícito e estados de falha. AUD-02. |
| UX-F11 | Revisar | Contextos elegíveis, proteção do rascunho e operação de favoritos precisam de critérios separados. AUD-02. |
| UX-F12 | Revisar | Diferenciar concorrência de campos de histórico de transição e evitar promessa de offline. AUD-01/07. |
| UX-F13 | Revisar | Prévia inerte e destino realmente suportado são pré-condições, não preferências visuais. AUD-08. |
| UX-F14 | Revisar | Definir quota e distinguir prévia PNG, download PDF e remoção do vínculo. AUD-05/08. |
| UX-F15 | Revisar | Condições de histórico, proveniência, foco e concorrência precisam sobreviver à troca visual. AUD-01/12. |
| UX-F16 | Revisar | Separar conteúdo da perspectiva, troca de sujeito e vista global. AUD-03/12. |
| UX-F17 | Revisar | Explicitar fronteira entre UI, exportação, recuperação operacional e acesso privado. AUD-08. |
| UX-D01 | Condicionar | Expressão geométrica é preferência; relação verificável se escolhida. AUD-09. |
| UX-D02 | Revisar | Medir cor resultante por G12 quando houver borda alfa. AUD-09. |
| UX-D03 | Condicionar | Tecnologia de cor e fallback dependem de tema e navegadores aprovados. AUD-09. |
| UX-D04 | Condicionar | Gradiente opcional, contraste no pior ponto obrigatório quando usado. AUD-09. |
| UX-D05 | Manter | Consistência ótica e nome acessível têm evidências distintas, uma visual e outra técnica/humana. |
| UX-D06 | Condicionar | Máscara opcional. Legibilidade, foco e alvos seguem critérios verificáveis caso usada. AUD-09/11. |
| UX-D07 | Condicionar | Profundidade visual depende da direção aprovada. Contraste permanece em G12. AUD-09. |
| UX-D08 | Revisar | Resultado é acesso à tarefa com teclado móvel; CSS específico é escolha técnica. AUD-11. |
| UX-D09 | Revisar | Medir escala visual separada de tamanho e espaçamento de hitbox. AUD-09. |
| UX-D10 | Manter | Papéis tipográficos e fallback são avaliáveis sem definir fontes, com zoom e tarefa de leitura. |
| UX-D11 | Condicionar | Ajuste ótico cabe às alternativas aprovadas e preserva ordem e hitbox. AUD-09. |
| UX-D12 | Revisar | Critério visual é consistência dos papéis; estado real e contraste são G04/G12. AUD-09. |
| UX-D13 | Revisar | Redução de campos é útil; ações essenciais e erros em áreas recolhidas precisam de proteção. AUD-10. |
