# Point Media — Banco de Talentos

Aplicação em desenvolvimento incremental, com autenticação, portal do candidato, currículos privados, vagas, candidaturas, banco de talentos com consentimento, triagem determinística por vaga, processo seletivo com histórico/notas e indicadores reais (Fases 1–6), com refinamento das telas existentes validado na Fase 7. Instruções originais preservadas em `docs/` e referências oficiais do Figma nas 16 imagens de `Imagens/`; não existe PDF funcional separado.

## Requisitos

Node.js 22.12+ (linha 22) ou 24 LTS e npm 11.6.0 para instalação. A versão de npm do projeto está registrada em packageManager. O backend usa NestJS 11 para manter compatibilidade com Jest no Node 22. A máquina deste projeto não suporta Docker; o fluxo padrão utiliza PostgreSQL 17 portátil no Windows x64, sem contêiner ou serviço Windows. Dependências e binários precisam de acesso ao registro npm na primeira instalação.

## Primeira execução (PowerShell)

```powershell
npm run env:setup
npx --yes npm@11.6.0 install
npm run db:local
npm run db:generate
npm run db:migrate
npm run db:seed
npm run app:start
```

`env:setup` funciona sem dependências npm: cria `.env` com senhas e segredo JWT aleatórios e preserva qualquer arquivo existente. Para configuração manual, use `.env.example` como referência. O seed é somente local e não altera contas existentes em reexecuções. Contas fictícias: `admin@example.test`, `rh@example.test` e `candidato@example.test`, usando o valor de SEED_PASSWORD do seu `.env`. Não compartilhar `.env` nem usar essas contas em produção.

### Uso diário após a instalação

No PowerShell normal, dentro da pasta do projeto:

```powershell
npm run app:start
npm run app:status
```

`app:start` prepara o PostgreSQL local, compila o código atual e inicia API e frontend em segundo plano, sem Docker. Depois de compilar, pode aguardar até 90 segundos pela prontidão; o carregamento inicial dos módulos levou 27 segundos neste Windows. Aguarde a mensagem “Aplicacao pronta” e acesse http://localhost:55173/ nesta máquina: a página inicial é pública, com login opcional para acessar a conta. Para encerrar somente a aplicação, use `npm run app:stop`; o banco e os dados são preservados. Os logs ficam em `.local/run/api.out.log`, `api.err.log`, `web.out.log` e `web.err.log`.

Uma nova execução de `app:start` reinicia somente os dois processos registrados pelo próprio inicializador, verificando PID e horário de criação; recusa portas ocupadas por outros processos. Recompila as alterações para evitar cache antigo do watcher. Não é preciso repetir instalação, migrations ou seed a cada abertura. Após mudanças no schema ou em outro checkout, execute `db:generate` e `db:migrate` antes de iniciar.

Para desenvolvimento com atualização automática, use `npm run db:local` e `npm run dev`, mantendo o terminal aberto; `Ctrl+C` encerra esse modo. Encerre `app:stop` antes de usar as mesmas portas no modo dev. Se o watcher deixar de refletir mudanças, reinicie-o. Uma checagem HTTP confirma o funcionamento naquele momento; se os processos da sessão do agente forem encerrados pelo ambiente, execute `app:start` no PowerShell normal.

### Erro de instalação edgesOut

O npm 10.9.2 pode falhar ao resolver dependências opcionais do Vitest com `Cannot read properties of null (reading 'edgesOut')`. Use o comando acima: ele executa npm 11.6.0 somente para essa instalação, sem atualizar o npm global. O campo packageManager registra a versão, mas não atualiza o executável automaticamente. Depois da instalação, os comandos `npm run ...` continuam disponíveis pelo npm existente. Não é necessário apagar `.env`, fontes ou dados locais, nem desativar a resolução de peers com --force/--legacy-peer-deps. Gere o lockfile pela instalação real antes de usar npm ci.

O npm 12.2.1 sugerido pelo aviso de atualização exige Node 22.22.2+, 24.15+ ou 26+, enquanto esta máquina utiliza 22.16.0. O npm 11.6.0 aceita esse runtime. Referências: [problema no npm](https://github.com/npm/cli/issues/9787), [requisitos do npm 11.6.0](https://github.com/npm/cli/blob/v11.6.0/package.json) e [requisitos do npm 12.2.1](https://github.com/npm/cli/blob/v12.2.1/package.json).

`db:local` retorna ao terminal após iniciar o servidor em segundo plano. Ele mantém o cluster em `.local/postgres17/data` e cria os bancos de desenvolvimento e teste sem apagar dados existentes. Para consultar e encerrar a instância do projeto:

```powershell
npm run db:local:status
npm run db:local:stop
```

Os binários Windows x64 são instalados como dependência opcional; não omita dependências opcionais nem scripts na instalação local. Se já possui PostgreSQL 17 instalado ou extraído de um ZIP, configure `LOCAL_POSTGRES_BIN=C:/ferramentas/pgsql/bin` no `.env`. O [site oficial do PostgreSQL](https://www.postgresql.org/download/windows/) oferece instalador e ZIP dos binários. Se preferir um servidor já configurado, crie os dois bancos e ajuste as URLs; nesse caso não precisa usar `db:local`.

No modo portátil, as duas URLs devem apontar para 127.0.0.1/localhost, na mesma porta e com as mesmas credenciais, com nomes de banco diferentes. A senha de um cluster já inicializado não muda ao editar o `.env`. Se a porta estiver ocupada por outra instância, o comando recusa iniciar sem encerrar processos; configure outra porta nas duas URLs. O arquivo Compose foi preservado como opção para outras máquinas e não faz parte deste fluxo.

### Restrições do sandbox do Codex no Windows

Se o Prisma indicar EPERM ao resolver a pasta temporária ou o initdb indicar que não conseguiu criar/reexecutar com token restrito, execute a preparação no PowerShell normal da pasta do projeto:

```powershell
npm run db:generate
npm run db:local
npm run db:migrate
```

Essas falhas foram observadas no usuário restrito do sandbox; não significam dependências ausentes nem exigem apagar dados. `db:local` mantém o servidor em segundo plano para os testes seguintes. O log de diagnóstico fica em `.local/postgres17/postgres.log`, com segredos redigidos. Nesta máquina, as URLs do `.env` foram ajustadas para a porta 55432 porque 5432 estava ocupada; as credenciais foram preservadas.

Frontend nesta máquina: http://localhost:55173/ (público). Login: http://localhost:55173/entrar; perfil exige sessão. API: http://127.0.0.1:3000/api. OpenAPI: http://127.0.0.1:3000/api/openapi.json. A porta 5173 estava ocupada; o `.env` local usa WEB_ORIGIN=http://localhost:55173. Vite lê a porta dessa variável, que precisa corresponder à origem exata usada no navegador, sem barra final. O exemplo continua usando 5173 por padrão. Use o frontend pelo proxy Vite; não é necessário liberar CORS.

O comando dev compila NestJS com TypeScript antes de iniciar os watchers; isso preserva os metadados de injeção de dependências. Execute `db:generate` após instalar ou alterar o schema. `npm run build` gera os bundles e `npm run start -w @pointmedia/api` inicia a API compilada. Em produção, sirva o frontend e o proxy `/api` na mesma origem HTTPS; o proxy deve encaminhar para a API e respeitar limites de corpo. Configure trust proxy somente para proxies conhecidos antes de expor o serviço atrás de um proxy. O ambiente de produção não está provisionado nesta fase.

A configuração do Vite usa JavaScript ESM (`vite.config.mjs`) com carregamento nativo, compatível com o Node 22.16 instalado sem transpilar a configuração. Isso evita a falha de carregamento CommonJS observada no runner durante o desenvolvimento neste Windows. A configuração continua verificada pelo TypeScript com checkJs. Referência: [carregamento da configuração no Vite](https://vite.dev/config/#config-loading).

## Funcionalidades validadas na Fase 1

- Cadastro público de conta CANDIDATE pela API, normalização/unicidade de e-mail.
- Login com Argon2id e JWT em cookie HttpOnly; sessões persistidas e revogação no logout.
- Consulta e edição da própria conta; troca de senha com revogação de todas as sessões.
- Guards globais com sessão obrigatória e RBAC. Apenas ADMIN pode criar RECRUITER.
- DTOs com rejeição de campos extras, proteção de origem, rate limiting, erros padronizados e auditoria transacional.
- Login e perfil no frontend com API real, validação, tratamento de erro e cache limpo ao sair.
- PostgreSQL sem Docker, migration inicial, seed fictício e testes executados.

A validação inicial aprovou 48 testes de unidade, configuração local, integração com PostgreSQL e navegador. A correção posterior da entrada pública passou por 5 testes frontend e 3 E2E, incluindo os fluxos anteriores. Tipagem, lint e build também passaram. Os resultados, a revisão visual e os limites do sandbox estão em [docs/validation.md](docs/validation.md).

## Fase 2 — candidatos e vagas

- Cadastro com senha e portal do candidato: perfil profissional, competências, experiências, formação e currículo.
- “Não se aplica” nos campos pertinentes, com validação no frontend/backend e persistência da escolha.
- Currículo PDF/DOCX até 5 MiB, validação de conteúdo, storage privado, substituição e download autorizado/auditado.
- Compartilhamento voluntário do perfil com recrutamento; revogação interrompe o acesso do RH ao perfil e arquivo.
- RH/admin: listagem, busca, filtros e modal do candidato; vagas em rascunho, edição por modal, publicação, prazo, encerramento e cancelamento lógico.
- Vagas publicadas são consultadas na Home e têm detalhe público. O envio de candidaturas foi adicionado na Fase 3; salvar somente o perfil continua sem criar inscrição.

Rotas: `/` pública; `/vagas/:id` e `/banco-de-talentos` recebem a inscrição e a criação de conta no envio final; `/cadastro` redireciona para esses fluxos ou para as oportunidades; `/candidato` é o portal de quem já possui conta; `/perfil` mantém dados da conta e senha; `/gestao/vagas` e `/gestao/candidatos` exigem RH/admin. Candidatos retornam ao portal após login, preservando o destino quando estão em uma inscrição. Contas fictícias existentes continuam disponíveis pelo seed.

Não houve adição de dependências nesta fase. Em outro checkout, execute `db:generate` e `db:migrate` após instalar para disponibilizar os novos modelos. Não use reset. Escopo e autorizações estão em [phase2.md](docs/phase2.md); resultados e pendências em [validation-phase2.md](docs/validation-phase2.md).

## Fase 3 — candidaturas e banco de talentos

- Vaga e banco apresentam o formulário com senha para novos candidatos; a conta só é criada no envio final aceito, conforme a correção de 02/11/2026. Quem já tem conta pode entrar e continuar. Envio real exige autorização específica; adesão para futuras oportunidades é opcional e separada do compartilhamento geral do perfil.
- Backend valida prazo no PostgreSQL e impede duplicidade inclusive sob concorrência. Tentativa tardia sem adesão retorna erro; com autorização explícita entra somente no banco, sem candidatura retroativa.
- Comprovante persistido e seção Minhas candidaturas no portal, com estado inicial Recebida. O RH consulta inscrições por vaga e acessa perfil/currículo no contexto autorizado.
- Banco de talentos independente em `/banco-de-talentos`; pesquisa do RH em `/gestao/talentos`, com busca, filtros, ordenação e paginação. Consentimentos não são inferidos dos perfis compartilhados da Fase 2.
- Participação por **180 dias**, configurável por `TALENT_RETENTION_DAYS`. Após expiração, renovação voluntária; saída pelo portal bloqueia consultas/downloads pelo banco. Conta e candidaturas têm autorizações próprias. O prazo não promete exclusão automática de dados com outras finalidades.

Aplicar `db:generate` e `db:migrate` antes de iniciar outro checkout; não usar reset. Contrato/decisões em [phase3.md](docs/phase3.md) e resultados em [validation-phase3.md](docs/validation-phase3.md). A continuidade para a Fase 4 foi autorizada após a aplicação dos logos oficiais/Poppins.

## Fase 4 — triagem e ranking explicável

- RH/admin acessam `/gestao/triagem` pelo menu ou pelo painel de candidatos rankeados em `/gestao/vagas`.
- Pesos de tecnologias, senioridade e salário configuráveis por vaga, com soma de 100%; participação dos indispensáveis também configurável. Cada gravação preserva uma versão dos critérios e sua auditoria.
- Ranking de 0–100 calculado a partir dos dados declarados dos inscritos naquela vaga, com contribuição por critério, cobertura dos dados e pontos para revisão humana. Dados desconhecidos não recebem zero; a opção de aguardar dados completos mantém a nota pendente.
- Reprocessamento persistido sem sobrescrever execuções anteriores. Alterações em perfis, inscrições, vaga ou critérios sinalizam ranking desatualizado.
- Pesquisa, paginação e modal do perfil usam a autorização da candidatura. Candidatos não acessam o ranking interno; a nota não altera o estado da inscrição nem aprova/rejeita automaticamente.

Migration aditiva `202610290003_screening`, sem reset. Regras e contrato em [phase4.md](docs/phase4.md); evidências e limites em [validation-phase4.md](docs/validation-phase4.md).

## Fase 5 — processo seletivo

- RH/admin operam etapas no modal de candidato, a partir das candidaturas ou triagem. Avanço sequencial até aprovação após entrevista; reprovação em qualquer etapa aberta e decisões finais sem reabertura, conforme escolha do usuário.
- Histórico e auditoria preservam cada decisão humana com versão, ator e data. Edições concorrentes retornam conflito para recarga. Notas internas são independentes das mensagens ao candidato.
- Portal/comprovante mostram o estado e o histórico próprio; notas, justificativas e identidade do RH não são retornadas ao candidato. Sem envio de e-mail ou decisão automática por score.

Migration aditiva `202611010001_selection_process`, aplicada em desenvolvimento/testes com dados anteriores preservados. Regras/rotas em [phase5.md](docs/phase5.md); **161 testes aprovados** e limites em [validation-phase5.md](docs/validation-phase5.md). A continuidade para a Fase 6 foi autorizada em 01/11/2026.

## Fase 6 — indicadores e apoio opcional de IA

- Dashboards reais: RH em `/gestao/dashboard`; Admin em `/admin/dashboard` e `/admin/metricas`, com menus e permissões próprios.
- Filtros de 7/30/90/365 dias e vaga, dias de calendário em Brasília, funil/etapas, conversão da coorte e tempo até primeira triagem. Compatibilidade somente da vaga selecionada e da última execução atualizada.
- CSV autenticado e agregados sem nomes, contatos, currículos ou notas. Sem integração externa de analytics.
- Por escolha do usuário, IA preparada e desativada. A interface/fronteira de extração foi testada; extração real de PDF/DOCX, adapter e resumos com um provedor ainda dependem de configuração e não estão implementados.

Regras em [phase6.md](docs/phase6.md); **177 testes aprovados**, evidências e limitações em [validation-phase6.md](docs/validation-phase6.md). Sem nova migration ou dependências nesta fase. A Fase 7 foi posteriormente autorizada e validada no escopo abaixo.

## Fase 7 — refinamento das telas existentes

- Navegação por teclado, títulos de página, foco nas rotas/âncoras e retorno ao acionador dos modais; formulário de vaga recebe foco no título ao abrir.
- Erros relacionados aos campos, ajuda de senha com contraste corrigido e ajustes de leitura de conteúdo longo e formulários em telas pequenas.
- Verificação nas larguras 320/375/768/1366 px, com gráficos roláveis por teclado e seletor de vagas contido na área de conteúdo.

Retomada concluída em 02/11/2026: **182 testes aprovados**, quatro asserções Postman, build, tipagem e lint. Escopo em [phase7.md](docs/phase7.md); arquivos, revisão visual e limites do sandbox em [validation-phase7.md](docs/validation-phase7.md). Sem nova dependência ou migration. A referência de cadastro RH e a gestão administrativa de usuários continuam pendentes; a revisão não equivale a auditoria WCAG completa. A Fase 8 foi posteriormente autorizada.

## Fase 8 — validação e preparação local

**203 testes aprovados**, incluindo o fluxo contínuo dos 13 passos com API/PostgreSQL e navegador, sete verificações de configuração e quatro asserções Postman. Configuração de proxy por IPs explícitos (`TRUSTED_PROXY_IPS`) e diretório persistente privado de currículos (`RESUME_STORAGE_DIR`, obrigatório em produção), com padrões locais preservados. A tipagem agora inclui os testes E2E.

O comando `npm run check:production` verifica configuração, artefatos e acesso ao diretório após carregar o ambiente de produção; não conecta ao banco nem publica o sistema. Modelos revisáveis em `deploy/` e instruções em [deployment.md](docs/deployment.md). O usuário confirmou que ainda não possui hospedagem/domínio. Auditoria remota de dependências, restauração isolada e validação da infraestrutura continuam pendentes, assim como os requisitos administrativos/LGPD. Arquivos, evidências e limites em [validation-phase8.md](docs/validation-phase8.md).

## Verificação e regressões

Correção de navegação solicitada após a Fase 8: página pública de vagas em http://localhost:55173/vagas, retorno visível/contextual no login, detalhes e formulário alinhados, e barra lateral com altura da janela para Admin/RH. Regras de inscrição preservadas. Arquivos, testes e revisão visual em [public-navigation-review.md](docs/public-navigation-review.md).

Correção de cadastro em 02/11/2026: o candidato cria conta somente ao enviar a inscrição completa na vaga ou no banco de talentos. Conta, perfil e inscrição/consentimento são gravados juntos; falhas não deixam conta avulsa. O login não oferece cadastro independente. **194 testes aprovados** na correção, incluindo 8 novos HTTP/PostgreSQL; detalhes, arquivos e limites em [registration-flow.md](docs/registration-flow.md). Essa regra foi preservada na validação posterior da Fase 8.

```powershell
npm run lint
npm run format:check
npm run typecheck
npm run build
npm test
npm run test:local-db
# O PostgreSQL iniciado por db:local já disponibiliza pointmedia_test.
npm run test:integration
npx playwright install chromium
npm run test:e2e
```

Execute integração e E2E em sequência, pois compartilham o banco de testes e os indicadores administrativos medem totais globais. Para selecionar apenas o cenário contínuo: `npm run test:e2e -- phase8.spec.ts`.

Integração e E2E usam TEST_DATABASE_URL e recusam nomes de banco sem sufixo `_test`. Migrations são aplicadas sem reset. A integração limpa apenas fixtures do identificador aleatório da própria execução. E2E mantém suas contas fictícias no banco de teste para inspeção. O comando E2E compila o projeto, aplica migrations e gerencia API/preview em portas isoladas (33001/55174 por padrão, configuráveis por E2E_API_PORT/E2E_WEB_ORIGIN), encerrando os serviços ao terminar. Não executar os testes contra uma base com dados reais nem apagar `.local/postgres17/data` se precisar preservar dados. Os testes do parser de configuração local (`test:local-db`) usam somente módulos nativos do Node e podem rodar antes da instalação das dependências da aplicação.

## Contrato e decisões

Consulte [contrato](docs/api-contract.md), [arquitetura](docs/architecture.md), [banco](docs/database.md), [requisitos](docs/requirements.md), [referências visuais](docs/figma-mapping.md) e [plano](docs/implementation-plan.md).

O login não envia token para localStorage nem habilita cadastro de funcionários publicamente. Para criar recrutador, autentique-se como administrador e use `POST /api/users/recruiters` com `name`, `email`, `password` e `jobTitle`, cookie da sessão e header `X-Pointmedia-Request: 1`. A UI administrativa completa será feita na fase correspondente.

## Pendências

RH e Admin possuem menus próprios conforme as imagens: recrutamento para RH; dashboard administrativo, métricas, usuários, logs e sistema para Admin. A indicação “Acesso total” do Admin preserva suas autorizações existentes, enquanto criação de recrutadores continua exclusiva dele. Dashboards e métricas foram implementados na Fase 6; gestão de usuários, logs e sistema ainda pendentes permanecem indisponíveis. Em 01/11/2026, a escala visual foi reduzida, preservando a identidade e a responsividade; detalhes e 29 testes frontend/navegador em [interface-review.md](docs/interface-review.md).

As referências de design estão disponíveis integralmente como imagens em `Imagens/`; não é necessário aguardar PDF ou link editável do Figma. Logos oficiais PNG fornecidos e Poppins confirmada pelo usuário foram aplicados, com assets locais e licença preservada; ver [identidade visual](docs/brand-assets.md). O refinamento das telas existentes foi validado na Fase 7; todas as referências administrativas e a auditoria completa de acessibilidade ainda não estão concluídas. Recuperação de senha, confirmação de e-mail, MFA e renovação de sessão não foram implementados. Ajuda de senha informa essa limitação. Sessão dura 15 minutos por padrão, sem renovação automática. Retenção, direitos LGPD, backups, TLS e observabilidade de produção precisam ser concluídos antes de tratar dados reais. A IA permanece desativada, sem extração real de arquivos; não há analytics externo, serviço pago ou envio de mensagens a terceiros.
