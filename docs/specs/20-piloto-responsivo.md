# I4-04 — Interface responsiva e ensaio do piloto

- **Estado** — ensaiada localmente; validação operacional no host pendente.
- **Objetivo** — registrar e recuperar uma sessão usando uma tela estreita e uma instância restaurada.
- **Rastreabilidade** — MVP-04, MVP-05, MVP-11 e MVP-12.

| ID | Critério | Teste |
| --- | --- | --- |
| I4-04a | Em tela de 320 pixels, o editor fica em uma coluna. Código e tabelas largos rolam dentro do próprio bloco, sem deslocar a página ou esconder o texto ao redor. | E2E |
| I4-04b | Criar campanha e sessão, aguardar a confirmação do servidor, gerar backup criptografado e restaurar em um arquivo isolado. Abrir a sessão pela busca em outro contexto de navegador. | E2E e SQLite |
| I4-04c | Ensaiar acesso em dispositivos reais, cópia externa diária e recuperação com a chave armazenada separadamente, antes do uso com dados reais. | Piloto manual |

O ensaio automatizado usa somente dados fictícios e dois contextos Chromium. O tempo obtido no ensaio local serve como registro da execução, sem representar o tempo de recuperação em um host real.


## Evidências de TDD

- **Red** — em 320 pixels, a prévia media 286 pixels e sua área de rolagem excedia 2.000 pixels.
- **Green** — a prévia passou a manter o texto no espaço disponível, com rolagem interna em código e tabela. Outra instância recuperou a sessão pela busca.
- **Refactor** — o editor e a wiki compartilham a renderização de blocos largos. O ensaio registra o tempo da restauração criptografada. Uma execução local registrou 6 ms para uma base fictícia pequena, medidos somente para autenticar, verificar e copiar o arquivo restaurado.

## Ensaio operacional do piloto

1. Escolha um banco fictício separado e confirme a porta do processo de ensaio. Use a rede privada conforme o [ensaio I2-07](06-ensaio-de-acesso-privado.md).
2. Em um dispositivo, crie uma campanha e uma sessão. Escreva uma pista, aguarde a confirmação do servidor e encontre a sessão pela busca em outro dispositivo autorizado.
3. No host, configure a execução diária e verifique o volume externo antes de gerar a cópia. Registre horário, resultado e destino da execução, sem registrar o conteúdo da chave. [Procedimento](19-backup-externo.md#operação)
4. Restaure em um arquivo novo e meça o tempo até a instância isolada responder. Consulte a campanha, a sessão, o histórico, os vínculos e a busca. Anote o tempo e o dispositivo usado.
5. Valide o fluxo em tela estreita e confira se uma execução agendada criou uma cópia real no volume externo. Registre os resultados antes de iniciar o piloto com o acervo real.
