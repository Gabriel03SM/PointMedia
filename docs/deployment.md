# Preparação de produção e operação

O usuário confirmou em 02/11/2026 que ainda não possui hospedagem/domínio. Os arquivos de `deploy/` são modelos revisáveis para uma única API Node, proxy TLS e PostgreSQL no mesmo servidor Linux; nenhum serviço foi instalado ou publicado. O uso local no Windows continua pelo inicializador existente. Outro destino exige adaptar e verificar estes modelos antes da publicação.

## Artefatos e ambiente

Usar a versão de Node/npm declarada no projeto. Preparar o release em diretório separado, preservando o anterior. A aplicação precisa de `apps/api/dist`, `apps/web/dist`, `packages/shared/dist`, dependências de runtime, contrato `docs/openapi.json` e as estruturas dos workspaces; não copiar somente o bundle web.

No ambiente de build, com banco `_test` isolado e dependências de desenvolvimento disponíveis:

```sh
npm ci
npm run db:generate
npm run typecheck
npm run build
npm test
npm run test:integration
npm run test:e2e
npm audit --omit=dev
```

Executar integração e navegador em sequência: o dashboard administrativo mede totais globais da base e outra execução pode criar fixtures entre a medição e a asserção. Os coordenadores padrão limpam os overrides de storage/proxy ao montar o ambiente de teste. Não usar uma base com dados reais para esses testes. A auditoria de dependências precisa de acesso ao registro; na sessão da Fase 8 ela não pôde ser concluída e não recebeu aprovação implícita.

O exemplo `deploy/api.env.example` contém somente marcadores. Preencher no servidor e guardar o arquivo real fora do repositório, com acesso exclusivo da conta operacional. Não passar senha/URL de banco/JWT em argumentos de comandos ou registrar variáveis inteiras em logs. `JWT_SECRET` deve ser gerado por fonte criptográfica, e as credenciais de produção devem ser distintas das locais. Não executar o seed de demonstração em produção.

Variáveis relevantes:

| Variável                                | Uso                                                                                                                                         |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| NODE_ENV                                | `production`, definido explicitamente pelo processo/serviço                                                                                 |
| WEB_ORIGIN                              | Origem HTTPS exata, sem caminho ou barra final                                                                                              |
| DATABASE_URL                            | Banco privado da aplicação, com usuário de runtime sem privilégios de DDL/administração                                                     |
| JWT_SECRET                              | Segredo aleatório privado com o mínimo validado pelo backend; sem reutilizar o segredo local                                                |
| TRUSTED_PROXY_IPS                       | IPs explícitos do proxy controlado; no modelo local de proxy, `127.0.0.1`. Não aceita `true`, número de saltos, hostname ou faixa universal |
| RESUME_STORAGE_DIR                      | Diretório absoluto privado e persistente, obrigatório em produção; fora de public/dist e dos diretórios de release                          |
| JWT_TTL_SECONDS / TALENT_RETENTION_DAYS | Prazos já definidos pela aplicação; mudanças da política de negócio exigem autorização                                                      |

Quando o processo é iniciado com `NODE_ENV=production` explícito, `loadConfig` não lê implicitamente o `.env` de desenvolvimento. O serviço pode receber o ambiente pelo gerenciador do servidor ou por arquivo explícito. Criar previamente o diretório privado de currículos com o usuário do processo, permissões restritas e espaço/disco monitorados. O modelo de serviço usa UMask 0077 e libera escrita somente nesse diretório. Testes recusam `RESUME_STORAGE_DIR` para não reutilizar arquivos reais.

Alterar `RESUME_STORAGE_DIR` não move os arquivos existentes. Se houver dados anteriores, parar a API, copiar os arquivos internos para o destino privado e verificar as referências/SHA-256 antes de ativar o novo caminho; preservar a origem até concluir a validação. Esta fase não alterou o `.env` local nem moveu currículos existentes.

Depois do build e do provisionamento do diretório, executar com a mesma conta do serviço:

```sh
node --env-file=/etc/pointmedia/api.env scripts/check-production.mjs
```

`npm run check:production` é equivalente quando o ambiente já foi carregado pelo gerenciador. Essa checagem lê configuração, artefatos compilados e acesso ao diretório; não conecta ao banco, não cria diretórios, não aplica migrations nem libera a aplicação para produção. Rejeita storage dentro dos diretórios públicos conhecidos, inclusive resolvendo caminhos reais na checagem. A configuração final do servidor web também deve ser revisada para não servir a árvore privada.

## Proxy, TLS e serviço

`deploy/nginx.conf.example` deve ser incluído no contexto `http` de uma instalação Nginx, com domínio, certificados e caminhos reais. `deploy/pointmedia-api.service.example` exemplifica a supervisão do processo compilado por systemd, com usuário dedicado e reinício em falha. A API continua ouvindo somente `127.0.0.1`; somente o proxy publica HTTPS e os arquivos web. Não usar `vite preview` nem os scripts locais como servidor público definitivo.

O proxy encaminha `/api/` preservando o prefixo. Sobrescreve X-Forwarded-For/Host/Proto e remove Forwarded; não concatena a cadeia que o cliente possa ter enviado. O backend confia apenas nos IPs configurados e usa o endereço não confiável mais próximo para o rate limiting. Isso exige que a topologia real corresponda ao exemplo; outros proxies/CDNs precisam de revisão. [Express atrás de proxies](https://expressjs.com/en/guide/behind-proxies/), [headers do proxy Nginx](https://nginx.org/en/docs/http/ngx_http_proxy_module.html#proxy_set_header).

O limite externo de 6 MiB comporta o arquivo de até 5 MiB e os dados multipart de até 128 KiB. Os limites internos continuam independentes. O modelo adiciona CSP/controles de navegador, nega dotfiles e permite somente assets compilados na raiz pública. O style-src permite estilos inline usados pelos gráficos existentes. A política deve ser conferida no navegador do destino antes da liberação. [Limite de corpo do Nginx](https://nginx.org/en/docs/http/ngx_http_core_module.html#client_max_body_size).

O access log sugerido guarda somente horário, status, volume, duração e ID de correlação; não inclui IP, query string, cookies ou corpo. Logs de erro do proxy ainda podem conter caminhos/URLs, portanto precisam de acesso restrito, retenção e revisão. Proteger também arquivos temporários de upload do proxy. O backend mantém erros sanitizados e auditoria no banco. Uma única API usa rate limiter em memória: múltiplas instâncias não estão preparadas por esse modelo.

Antes de ativar no servidor escolhido, validar a configuração Nginx e o serviço no próprio ambiente. Esses modelos não foram executados com Nginx/systemd nesta máquina Windows, nem houve teste de TLS real. Confirmar `/api/health/ready`, login com cookie Secure, persistência após reinício, rotas web, upload/download privado, limites, CSP e bloqueio da porta da API à rede externa.

## Banco e migrations

Usar credenciais separadas para aplicar migrations e para operar a API. Revisar os SQLs pendentes, criar backup coerente e aplicar migrations por operação controlada antes da troca de versão. O Prisma CLI é dependência de desenvolvimento: precisa estar disponível no job operacional que executa a migration; não pressupor que esteja em um runtime instalado com `--omit=dev`.

O comando de migration deve receber o ambiente de produção explicitamente e usar `migrate deploy`, nunca `reset`, `db push --accept-data-loss` ou atalhos destrutivos. Não executar automaticamente migrations potencialmente destrutivas. O release desta fase não altera schema nem precisa de nova migration. [Prisma migrate deploy](https://www.prisma.io/docs/orm/reference/prisma-cli-reference#migrate-deploy).

## Backup, restauração e rollback

Banco e arquivos são um conjunto. Como a substituição de currículo remove arquivos antigos após o commit, copiar os arquivos enquanto há gravações pode produzir um backup incoerente com o snapshot do banco. Para o procedimento simples deste modelo, colocar a aplicação em manutenção no proxy, bloquear novas requisições, aguardar as requisições em andamento e parar a API. Confirmar que o processo encerrou antes de capturar ambos. A drenagem/parada precisa de ensaio no destino; não foi validada por esse modelo de serviço. O PostgreSQL pode continuar ativo.

Configurar conexões libpq por serviço e arquivo de senha protegido; não usar senhas na linha de comando. Exemplos para revisão pelo operador, com destinos privados e criptografia de backup definidos previamente:

```sh
pg_dump --dbname="service=pointmedia_backup" --format=custom --file=/secure-backup/database.dump
tar -C /var/lib/pointmedia -cf /secure-backup/resumes.tar resumes
sha256sum /secure-backup/database.dump /secure-backup/resumes.tar
```

Guardar juntos dump, arquivos, checksums, versão/migrations e instruções de restauração. O armazenamento de backup deve ser privado, criptografado e ter política de retenção; não usar diretório público, pasta de release ou controle de versão. Retomar a API após verificar a captura. [pg_dump 17](https://www.postgresql.org/docs/17/app-pgdump.html), [serviços libpq](https://www.postgresql.org/docs/17/libpq-pgservice.html).

Antes de dados reais, restaurar em banco novo e ambiente isolado, com credenciais próprias e diretório de arquivos separado. Nunca testar restauração sobre produção ou sobre a base local existente. Para um serviço libpq já configurado para esse banco vazio:

```sh
pg_restore --dbname="service=pointmedia_restore_test" --no-owner --no-privileges --exit-on-error /secure-backup/database.dump
```

Restaurar os arquivos em diretório privado novo, verificar checksums e confirmar que cada storageKey referenciada pelo banco corresponde ao arquivo esperado, incluindo SHA-256. Executar login, currículo privado, candidatura e histórico no ambiente restaurado. Essa restauração ainda não foi executada nesta fase; não declarar backup operacional validado. [pg_restore 17](https://www.postgresql.org/docs/17/app-pgrestore.html).

Para rollback do código, manter o release anterior e a mesma configuração/diretório persistente. Retornar ao código anterior somente se ele for compatível com o schema já aplicado. Falhas de migration ou incompatibilidades exigem um plano específico aprovado; não tentar desfazer schema ou restaurar produção automaticamente. Backups e testes de restauração antecedem a primeira publicação.

## Condições ainda pendentes

Hospedagem, domínio e certificados não foram definidos. A auditoria remota de dependências, ensaio de restauração, observabilidade/disco/alertas e validação dos modelos no destino continuam abertos. As políticas e funções de retenção/exclusão/direitos dos titulares previstas nos requisitos precisam de definição e implementação. Gestão administrativa completa e as referências visuais correspondentes também permanecem pendentes. A aprovação dos testes locais não equivale à conclusão de todos os requisitos ou autorização para publicar dados reais.
