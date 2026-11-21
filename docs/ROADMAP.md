# Roadmap do Lorekeeper

A implementação começa após a revisão da [arquitetura](ARCHITECTURE.md) e do [escopo do MVP](MVP.md). Cada incremento termina com um fluxo que pode ser exercitado antes de avançar.

## Incrementos do MVP

| Ordem | Entrega | Verificação para avançar |
| --- | --- | --- |
| 1 | Campanhas e editor de sessões. Estrutura web, banco com migrações, dashboard, criação e arquivamento, sessões e Markdown com gravação automática no servidor. | Criar uma campanha, escrever duas sessões, reiniciar o processo com o mesmo volume e reabrir os textos. Testar migração, isolamento entre campanhas e gravação condicionada à versão. Usar dados de teste nesta etapa. |
| 2 | Integridade do editor e acesso em dois dispositivos. Rascunhos locais, reenvio idempotente, histórico, resolução de conflitos e implantação privada. | Usar dois contextos de navegador e os computadores de jogo. Testar perda de conexão, perda da resposta após a gravação, fechamento com rascunho confirmado e duas abas com edições concorrentes. Verificar bloqueio do acesso externo. |
| 3 | Caixa de entrada, wiki e busca. Notas rápidas, cadastro básico das entidades, tags, vínculos, backlinks e busca global. | Anotar uma descoberta, vincular um NPC, recuperar a sessão pela busca e confirmar o isolamento de campanhas homônimas. Verificar o estado do índice após edição, arquivamento e restauração de texto. |
| 4 | Portabilidade e piloto pessoal. Exportação, rotina de backup com cópia externa, ensaio de restauração e revisão da interface responsiva. | Restaurar em instância separada e completar o fluxo de criação de campanha, registro de sessões, troca de computador e busca. Medir tempo de restauração e só então iniciar o uso com o acervo real. |

## Depois do MVP

1. **Offline e PWA.** Disponibilizar campanhas selecionadas no dispositivo, abrir o aplicativo sem rede, ampliar a fila para mais operações e evoluir a busca local. Validar cache, migrações com pendências, limites de armazenamento e atualização do service worker durante uma edição.
2. **Organização de campanhas.** Acrescentar facções, itens, linha do tempo real e ficcional, pendências próprias e preparação de sessão. Registrar origem, grau de certeza e perspectiva de jogador ou personagem, preservando afirmações anteriores quando forem corrigidas. Evoluir a apresentação do histórico, atalhos e links por nome.
3. **Arquivos, importação e regras.** Incorporar imagens, capas e anexos com backup que inclua os arquivos. Importar TXT, Markdown, PDF e dados exportados de outras ferramentas, com origem e revisão prévia. Criar a biblioteca de regras da casa e distinguir D&D 5e 2014 de 2024, respeitando as licenças das fontes. Avaliar integrações diretas com Google Drive e Discord depois de validar o fluxo de importação.
4. **Grafo e assistência opcional.** Usar os vínculos existentes para visualização do grafo. Avaliar resumos e consultas com IA apenas com fontes citadas, separação entre fatos e hipóteses, originais preservados e confirmação explícita para qualquer alteração sugerida.
