# I2-07 — Ensaio de acesso privado em dois dispositivos

**Estado** — roteiro preparado. A aceitação depende do ensaio na rede privada real.

Este ensaio cobre MVP-01 e MVP-05. O resultado esperado é que dois dispositivos autorizados leiam o mesmo texto confirmado no servidor e que um dispositivo externo não alcance a interface ou a API. Use exclusivamente uma campanha fictícia e um SQLite separado. [Arquitetura de implantação](../ARCHITECTURE.md#stack-e-implantação)

## Preparação da rede privada

Use um host Linux que permaneça ligado durante o ensaio, com checkout da versão aprovada, Node e npm nas versões fixadas e Tailscale configurado. O host e os dois dispositivos devem pertencer à mesma tailnet. No painel Tailscale, habilite MagicDNS e HTTPS e verifique que a política efetiva autoriza somente as identidades ou os dispositivos previstos para o host na porta do ensaio. Se houver outros participantes na tailnet, teste também com um deles sem permissão. [HTTPS no Tailscale](https://tailscale.com/kb/1153/enabling-https) · [Controles de acesso](https://tailscale.com/kb/1018/acls)

Na raiz do checkout no host, rode com uma conta de serviço ou a conta local do piloto. Mantenha os arquivos do piloto em diretório acessível apenas a essa conta.

```sh
npm ci
npm run build
mkdir -p -m 700 data/piloto
LOREKEEPER_DB_PATH="$PWD/data/piloto/lorekeeper.sqlite" PORT=3000 npm start
```

Confirme no log que o endereço do servidor é `127.0.0.1:3000`. Em outro terminal, confira a configuração existente e use a porta HTTPS somente se estiver livre:

```sh
tailscale serve status
```


```sh
tailscale serve --bg http://127.0.0.1:3000
tailscale serve status
```

Use nos dispositivos o endereço HTTPS emitido pelo comando. O status deve mostrar atendimento restrito à tailnet e destino `http://127.0.0.1:3000`. Use Serve privado e mantenha Funnel e encaminhamentos públicos desativados. Ao finalizar, remova somente a configuração criada para o piloto e encerre o processo do Lorekeeper. Para um Serve exclusivo na porta padrão, o comando é `tailscale serve --https=443 off`. [Tailscale Serve](https://tailscale.com/kb/1242/tailscale-serve)

## Execução e aceite

| Caso | Procedimento | Resultado esperado |
| --- | --- | --- |
| I2-07a | Abrir a URL HTTPS no dispositivo A. Criar campanha e sessão fictícias, digitar uma anotação e aguardar **Salvo no servidor**. | Certificado válido, dashboard e editor disponíveis, confirmação de gravação. |
| I2-07b | Abrir a mesma URL no dispositivo B, em outro perfil ou navegador. Abrir a mesma sessão após o salvamento. Alterar o texto no B e reabrir a sessão no A. | B lê a primeira alteração e A lê a nova versão confirmada, sem transferência manual. |
| I2-07c | De um dispositivo fora da tailnet, tentar acessar tanto a raiz HTTPS quanto `/api/campaigns`. Se houver outro membro sem autorização, repetir a partir desse dispositivo conectado à tailnet. | Interface e API inacessíveis a origens não autorizadas. Uma resposta HTTP 200 com dados reprova o ensaio. |
| I2-07d | De outro dispositivo, tentar `http://<ip-do-host>:3000` e verificar que o backend permanece em loopback. | Acesso direto ao backend indisponível fora do host. |

Registre a revisão executada, data, navegador e resultado de cada caso. Omitir nomes de máquinas, URLs privadas, identificadores e conteúdo pessoal ao publicar evidências. Um ensaio local com proxy TLS, dois clientes no mesmo host ou dois contextos de navegador ajuda a testar a aplicação. A validação de rede e autorização exige os dispositivos reais.
