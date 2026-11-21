# I2 — Integridade do editor de sessões

- **Estado** — proposta para implementação em entregas pequenas.
- **Objetivo** — preservar o texto durante falhas de rede e recuperar a sessão depois de trocar de aba ou dispositivo.
- **Rastreabilidade** — MVP-01 (acesso privado), MVP-04 (histórico e estado), MVP-05, MVP-06 e MVP-07. Produto §§4.3 e 7. [Arquitetura](../ARCHITECTURE.md#salvamento-e-sincronização).

## Entregas e critérios

| Ordem | ID | Cenário e critério verificável | Teste previsto |
| --- | --- | --- | --- |
| 1. Histórico e idempotência | I2-01 | Abrir um banco do Incremento 1, manter os registros e guardar um retrato do texto atual como primeira revisão disponível. Gravar a próxima versão e registrar sua revisão na mesma transação. | Integração com SQLite em disco e migração a partir da versão anterior |
| 1. Histórico e idempotência | I2-02 | Após confirmar a transação e perder a resposta, repetir a mesma mutação e receber a versão originalmente confirmada sem adicionar revisão. Reusar uma chave para outro conteúdo resulta em conflito e mantém o texto já salvo. | Integração com reenvio e inspeção do histórico |
| 2. Rascunhos e fila | I2-03 | Digitar durante queda da rede, aguardar confirmação do IndexedDB, fechar a aba e reabrir a sessão online no mesmo perfil. Recuperar o rascunho e enviar a mesma operação pendente. | E2E com queda de rede e reabertura de página |
| 2. Rascunhos e fila | I2-04 | Manter alterações mais novas quando uma resposta antiga chega. Uma falha do IndexedDB é visível e o texto continua disponível para cópia ou download. | E2E com atraso de resposta e falha de armazenamento |
| 3. Resolução e restauração | I2-05 | Editar a mesma base em dois contextos. Mostrar versão local e remota sem sobrescrever nenhuma. O usuário pode combinar, preservar para depois ou descartar explicitamente. Uma nova gravação concorrente exige nova comparação. | E2E com dois contextos independentes |
| 3. Resolução e restauração | I2-06 | Consultar revisões e recuperar o título e o corpo de uma versão anterior numa nova revisão, mantendo as anteriores disponíveis. | Integração e E2E |
| 4. Acesso privado | I2-07 | Em dois dispositivos autorizados, abrir o mesmo serviço HTTPS e observar o texto confirmado mais recente. Um dispositivo fora da rede autorizada não alcança a aplicação ou a API. | Ensaio documentado de implantação com dispositivos reais |

## Regras e limites

- Chaves idempotentes são vinculadas à sessão e ao conteúdo original. Uma confirmação cobre apenas a geração local enviada. Ao receber conflito, preservar o rascunho e exigir escolha explícita para usar uma nova versão-base.
- Rascunhos ficam separados por sessão e aba. Ao reabrir um perfil com mais de um rascunho da mesma sessão, apresentar as opções de recuperação. Falha de gravação local ou de rede nunca é apresentada como confirmação do servidor.
- Histórico e restauração cobrem título e corpo. Registros criados antes da migração trazem seu último conteúdo conhecido. A migração é aditiva e deve ser exercitada com banco fictício da versão anterior.
- Abertura inicial sem rede, cache de campanhas e instalação da PWA permanecem fora do escopo. O ensaio de rede privada depende do ambiente e dos dispositivos autorizados do usuário. As entregas de persistência e editor podem ser testadas em loopback com dados fictícios.
