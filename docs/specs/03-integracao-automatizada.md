# IE — Integração automatizada

- **Objetivo** — identificar candidatos com CI aprovado antes de habilitar uma operação automática de merge.
- **Rastreabilidade** — processo de engenharia, fora do escopo funcional do MVP.
- **Limite desta entrega** — auditoria sem escrita. A ativação depende de confirmação e teste do mecanismo de proteção no GitHub.

| ID | Critério | Teste |
| --- | --- | --- |
| IE-01 | PR aberto, interno, autorizado e sem conflito, com execução de PR e job `validar` concluídos com sucesso, é elegível na simulação. | Unitário |
| IE-02 | Evidência indisponível, job ausente, duplicado, pendente, reprovado, cancelado ou ignorado bloqueiam a simulação. | Unitário |
| IE-03 | Mudança de head ou de base e divergência entre o commit de teste registrado e o candidato atual exigem revalidação. | Unitário |
| IE-04 | PR externo, destino incorreto, mudança crítica, conflito ou mergeabilidade indeterminada bloqueiam a simulação. | Unitário |
