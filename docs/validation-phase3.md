# Validação funcional da Fase 3 — 29/10/2026

## Resultado

Candidaturas e banco de talentos integrados ao PostgreSQL, com autorização por finalidade. **110 testes aprovados**, incluindo regressões das fases anteriores. Build, tipagem e lint verificados; limitações do ambiente descritas abaixo. A Fase 4 não foi iniciada.

O usuário autorizou a fase e delegou a escolha do prazo do banco: adotados **180 dias**, configuráveis por TALENT_RETENTION_DAYS. A participação expira e pode ser renovada voluntariamente; sair bloqueia o acesso pelo banco. Esse prazo não promete exclusão física de conta ou candidaturas com outras finalidades.

## Funcionalidades verificadas

- Cadastro com senha e login preservam o destino de vaga/banco. Destinos externos, caminhos arbitrários e áreas internas não são aceitos como retorno de candidato. Funcionários mantêm a navegação interna.
- Formulário profissional e upload existentes reutilizados. Perfil salvo e currículo recusado não são apresentados como candidatura enviada: o arquivo pode ser corrigido e o envio repetido.
- Candidatura exige perfil salvo e autorização explícita da vaga; não exige banco de talentos ou compartilhamento geral. Estado inicial Recebida, comprovante consultável após recarga e lista própria no portal.
- Prazo e estado são conferidos no PostgreSQL no instante de aceitação, após locks. Oito envios simultâneos resultaram em uma candidatura e um evento de auditoria. Repetir após encerramento recupera a inscrição original.
- Vaga expirada/encerrada sem consentimento opcional não cria candidatura nem adesão. Com autorização explícita para futuras oportunidades, entra somente no banco. Rascunhos/canceladas não aceitam novas inscrições.
- RH/admin consultam inscrições por vaga/busca e usam o modal e download privados no contexto da candidatura. Candidato não acessa registros de outra pessoa nem rotas de recrutamento.
- Adesão independente ao banco, consentimento com versão/datas, saída idempotente e renovação preservando histórico. Compartilhamento da Fase 2 não gera adesão automática. Expiração bloqueia consultas sem depender de scheduler.
- Busca de talentos por nome/área/localização/competência, filtros combinados de competência, senioridade, localização, formação, experiência e pretensão; ordenação e paginação. Somente perfis ativos com consentimento vigente são retornados.
- Revogar o banco bloqueia suas rotas de perfil/currículo, preservando autorizações independentes de candidatura. Remover perfil revoga adesão e remove currículo, mantendo conta e comprovante mínimo.

## Testes executados

| Camada                        | Resultado              | Evidência                                                               |
| ----------------------------- | ---------------------- | ----------------------------------------------------------------------- |
| Node test runner              | 9 testes               | Configuração e isolamento do PostgreSQL portátil                        |
| Jest unitário API             | 27 testes / 4 suítes   | Fundação, arquivos e configuração do prazo/default/limites              |
| Vitest / Testing Library      | 17 testes / 5 arquivos | Fundação, cadastro, falha parcial de login, formatos e destinos seguros |
| Jest / Supertest / PostgreSQL | 48 testes / 4 suítes   | 29 regressões e 19 casos da Fase 3                                      |
| Playwright / Chromium         | 9 testes               | 6 regressões e 3 fluxos completos da Fase 3                             |
| Build                         | Passou                 | Shared, NestJS e React/Vite                                             |
| Tipagem                       | Passou                 | Shared, API e frontend                                                  |
| ESLint                        | Passou                 | Sem warnings de lint                                                    |
| OpenAPI                       | Verificado             | 30 rotas, 40 operações com IDs únicos e 335 referências resolvidas      |

Os testes HTTP verificaram uma requisição bloqueada por lock da vaga: o prazo venceu antes de sua liberação e a inscrição foi recusada. Cobrem também consentimentos expirados/revogados, renovação sem sobrescrever histórico, filtros, RBAC, campos forjados e arquivos privados. O alvo foi o PostgreSQL local separado com sufixo `_test`; limpeza de integração restrita às fixtures da execução.

Verificação adicional pelo Postman CLI 1.76.0 contra `GET http://127.0.0.1:3000/api/talent-pool/policy`: HTTP 200, três asserções aprovadas (status, prazo de 180 dias e texto/versionamento), código de saída zero. Requisição local sem credenciais, workspace ou publicação; essas asserções complementam os 110 testes, sem substituir os fluxos HTTP/navegador.

Navegador com API e banco reais, sem simular respostas HTTP: visitante → cadastro com senha → retorno à vaga → validação da autorização → rejeição de currículo falso sem candidatura → correção do arquivo → envio → comprovante após recarga. RH consulta essa candidatura e baixa currículo pelo contexto correto. Outra vaga é encerrada durante o preenchimento e o interessado entra somente no banco com sua autorização. O terceiro fluxo valida adesão independente, consulta RH, download e saída persistente.

A primeira execução E2E aprovou 8/9: o teste final recarregava a página e assumia erroneamente que o filtro de busca continuava aplicado, embora outras fixtures válidas permanecessem no banco. Corrigida a aplicação explícita do filtro após recarga. A execução final aprovou 9/9 com código zero; não foram aumentados timeouts.

O runner E2E continua restrito a NODE_ENV=test e banco `_test`. Seu limite de autenticação foi elevado somente nessa instância de teste para comportar as novas fixtures; o limite real permanece 10 tentativas/15 minutos e continua coberto pela suíte de rate limiting.

## Banco e execução no sandbox

Migration aditiva `202610290002_applications_talent` aplicada em desenvolvimento e teste, sem reset: duas tabelas, enum de status, índices/FKs e checks. Unicidade candidato/vaga e índice único parcial de consentimento não revogado reforçam consistência. Contagens de User, CandidateProfile, ResumeFile e JobOpening conferidas antes/depois da migration de desenvolvimento e preservadas.

Geração do Client e SQL pelo Prisma oficial 7.10.0. O ambiente mantém a limitação de realpath/EPERM no diretório do usuário: geração usou preloader temporário no workspace e flags preserve-symlinks. Migrations aplicadas por applyMigrations do engine oficial, com histórico/checksum normal, reutilizando o procedimento documentado nas fases anteriores. Não houve db push, marcação artificial de migration, reset ou remoção de contas.

Integração executada pelas mesmas suítes Jest após a preparação do banco; E2E pelo coordenador runBrowserTests. Isso não equivale a validar integralmente os comandos npm que incluem a CLI de migration dentro deste sandbox. Para PowerShell normal, permanecem `db:generate`, `db:migrate`, `test:integration` e `test:e2e` no README. Vitest usou VITEST_SKIP_INSTALL_CHECKS=1, conforme a limitação já registrada da checagem auxiliar; asserções e erros de runtime permaneceram ativos.

No endereço de desenvolvimento, duas tentativas do inicializador não confirmaram prontidão e encerraram somente seus próprios processos, preservando banco/dados. Um diagnóstico separado confirmou que o carregamento dos módulos levou 27 segundos neste Windows e que a API inicializou normalmente depois disso. Ajustada a janela de prontidão de `scripts/start-local.ps1` para até 90 segundos, com mensagem de progresso e a mesma exigência de HTML e health JSON com banco disponível; não alterar timeouts dos testes.

Após o ajuste, o inicializador confirmou aplicação pronta em http://localhost:55173/. Chromium confirmou Home/banco públicos, cadastro com senha mantendo retorno, redirecionamento da gestão sem sessão, viewport móvel sem overflow, API e PostgreSQL disponíveis, sem erro JavaScript de página. Processos registrados pelo próprio inicializador; a permanência após encerramento da sessão do agente continua sujeita ao ambiente. O usuário pode iniciar novamente com `npm run app:start` no PowerShell normal.

## Revisão visual e segurança

Form.png, Banco.png, Confirmação.png e Talentos.png orientaram a implementação. Brand, sidebar, cartões, campos, feedback, formulário e modal existentes foram reutilizados. Comprovante mostra Recebida; Banco.png não apresenta sucesso antes de persistir. Não foram reproduzidos scores ilustrativos nem criadas telas de ranking/processo/IA.

Capturas inspecionadas: `.tmp/phase3-confirmation-desktop.png`, `phase3-confirmation-mobile.png`, `phase3-bank-form.png`, `phase3-talents.png` e `phase3-applications.png`. Comprovante, navegação e modal verificados em 375×812 sem overflow horizontal. Fontes/logos oficiais seguem pendentes; não declarar pixel perfect ou WCAG AA completa.

Rotas privadas mantêm sessão, RBAC, validação estrita, proteção de origem e cache desabilitado. Autorizações consultadas por finalidade em cada acesso ao perfil/arquivo; currículo permanece fora da árvore pública e downloads auditados. Consentimentos e candidaturas auditados na mesma transação, sem corpos, senhas ou conteúdo de arquivos. Os valores configurados de JWT_SECRET, DATABASE_URL, TEST_DATABASE_URL e SEED_PASSWORD não aparecem no bundle; isso não equivale a uma auditoria completa de segredos.

## Arquivos alterados

- Backend: `apps/api/src/applications/*`, `talent-pool/*`, `app.module.ts`, `config.ts`, `config.spec.ts`, `candidates/{profiles.service,resumes.service,candidates.module,recruitment-access}.ts`.
- Banco/contratos: `apps/api/prisma/schema.prisma`, migration `202610290002_applications_talent/migration.sql`, Client gerado, `packages/shared/src/index.ts`, `.env.example` e `docs/openapi.json`.
- Frontend: `features/applications/*`, formulário/modal extraídos em `features/candidates`, `CandidatePortal.tsx`, `CandidatesPage.tsx`, destino seguro em `features/auth`, login/cadastro/rota protegida, `App.tsx`, `AccountLayout.tsx`, Home, vagas e `lib/api.ts`.
- Testes/execução: `apps/api/test/phase3.integration.spec.ts`, `tests/e2e/phase3.spec.ts`, fixture compartilhada `tests/e2e/fixtures.ts`, reaproveitamento em `phase2.spec.ts`, `features/auth/destination.test.ts`, `scripts/run-e2e.mjs` e `scripts/start-local.ps1`.
- Documentação: README, plano incremental, rastreabilidade, arquitetura, banco, contrato, mapeamento visual, escopo e este relatório.

## Pendências

Fase 4: triagem/ranking explicável, ainda não iniciada. Etapas seletivas e IA permanecem nas fases previstas. Fontes/logos e refinamento final seguem pendentes, assim como recuperação de senha, renovação de sessão, política completa de retenção/exclusão, direitos LGPD e operação de produção.

Avisos não fatais já observados: chunk frontend acima de 500 kB, consulta enfileirada depreciada no driver pg e import opcional de devtools do Vite no Vitest. Não foram instaladas dependências, alteradas tecnologias ou adicionados serviços pagos. Nenhum commit ou publicação foi realizado.
