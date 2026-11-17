# Validação da Fase 1 — 29/10/2026

Relatório histórico da fundação. Resultados atuais de candidatos/vagas e regressões em [validation-phase2.md](validation-phase2.md).

## Correção posterior — entrada pública

O usuário apontou que o sistema não deve exigir login para acesso inicial. Corrigido o redirecionamento da raiz: `/` agora abre uma Home pública baseada em `Imagens/Home.png`, sem consultar sessão nem depender da API. `/entrar` continua acessível por escolha do visitante; `/perfil` e os endpoints de conta permanecem restritos. URLs desconhecidas voltam à Home. O login ganhou retorno para a página inicial.

Arquivos: App.tsx, App.test.tsx, features/public/HomePage.tsx e home.css, LoginPage.tsx, global.css, vite.config.mjs e tests/e2e/auth.spec.ts. Atualizados README, arquitetura, requisitos e mapeamento visual. Nenhuma mudança no backend, schema ou permissões; nenhum commit.

Home mantém o cabeçalho preto, hero em gradiente, seção de oportunidades, banco de talentos e rodapé da referência. Links de oportunidades navegam por âncoras. Vagas, cadastro no banco e indicadores reais ainda não foram implementados: a página informa disponibilidade futura e não apresenta números, vagas ou prazos fictícios. Fontes oficiais e refinamento visual detalhado continuam pendentes.

Verificações: 5 testes Vitest passaram (incluindo dois novos de acesso público), 3 testes Playwright passaram com API/PostgreSQL reais (incluindo um novo da Home, âncoras, viewport móvel, login e conta restrita), lint e build/tipagem do frontend passaram. O runner E2E foi executado pelo mesmo coordenador exportado após a preparação do banco de teste, conforme o limite de Prisma CLI descrito abaixo.

Na conferência do endereço de desenvolvimento, o Vite ainda servia App.tsx antigo em memória. Confirmada diferença entre a resposta HTTP e o arquivo no disco; o Vite anterior foi reiniciado após verificar sua porta/processo e o código servido pelo projeto. Configurado polling de arquivos a cada 500 ms para detectar edições realizadas pelo agente neste Windows. QA posterior no endereço real confirmou Home pública, login opcional, retorno, desktop/mobile sem overflow e ausência de erros JavaScript. Capturas em `.tmp/qa-home-desktop.png` e `.tmp/qa-home-mobile.png`. Logs da nova execução em `.local/run/public-home.out.log` e `public-home.err.log`.

Os resultados abaixo registram a validação inicial da fundação, antes desta correção.

## Resultado inicial

Fundação funcional validada com PostgreSQL real e navegador Chromium: autenticação, autorização, persistência, login e edição da própria conta. **48 testes passaram**, além de lint, tipagem e build completos. A Fase 2 não foi iniciada; o avanço depende da aprovação do usuário, conforme AGENTS.md e observacaoCodex.md.

As instruções são a documentação funcional e as 16 imagens de `Imagens/` são a referência oficial do Figma. Não há PDF funcional separado. Materiais originais preservados; nenhum commit ou publicação foi realizado.

## Evidências executadas

| Verificação                   | Resultado                            | Alcance                                                                                          |
| ----------------------------- | ------------------------------------ | ------------------------------------------------------------------------------------------------ |
| `npm run lint`                | Passou                               | Monorepo, sem warnings de ESLint                                                                 |
| `npm run typecheck`           | Passou                               | Shared, API e frontend com dependências e Prisma Client reais                                    |
| `npm run build`               | Passou                               | Compilação shared/NestJS e bundle React/Vite                                                     |
| Prettier                      | Passou                               | Arquivos implementados; instruções originais preservadas                                         |
| Jest unitário                 | 17 testes / 3 suítes                 | Configuração, proteção de mutações e Argon2id                                                    |
| Node test runner              | 9 testes                             | Parser do PostgreSQL local e separação dos bancos                                                |
| Vitest / Testing Library      | 3 testes / 1 arquivo                 | Validação, erro e navegação do login; API simulada somente nesses testes unitários               |
| Jest / Supertest / PostgreSQL | 17 testes / 2 suítes                 | HTTP real, autenticação, RBAC, persistência e rate limiting                                      |
| Playwright / Chromium         | 2 testes                             | Frontend compilado, API e PostgreSQL reais; encerramento com código zero                         |
| Migration de desenvolvimento  | Aplicada pelo usuário                | `202610280001_foundation`, via `prisma migrate deploy`                                           |
| Seed                          | Passou e reexecução preservou contas | Três perfis fictícios; nome, role, hash e data de criação existentes não foram alterados         |
| PostgreSQL já iniciado        | Passou                               | `db:local` reconheceu o cluster do projeto pela conexão e não reiniciou processos                |
| Inspeção do bundle            | Passou                               | JWT_SECRET, SEED_PASSWORD e senha local do banco não encontrados nos arquivos JavaScript gerados |

Os 17 testes HTTP verificam cadastro e duplicidade, validação de entradas, proteção de origem/header/JSON, cookie e ausência de token no JSON, credenciais inválidas, criação de recrutador pelo ADMIN, bloqueios de candidato/RH, isolamento de conta, role atual no banco, auditoria, logout/reutilização de sessão, expiração, conta inativa, troca de senha revogando sessões, saúde/OpenAPI e limite com 429/Retry-After.

Os dois testes de navegador verificam cadastro pela API, login na interface, persistência da sessão após recarregar, edição persistida do perfil, logout, ausência de token no localStorage e uso do login em viewport móvel sem overflow horizontal. Eles usam banco separado e não interceptam a API com respostas simuladas.

## Ambiente e limites da execução

- Windows, Node 22.16.0. Dependências instaladas pelo usuário; Prisma Client 7.10.0 gerado por ele no PowerShell normal. PostgreSQL 17 portátil, sem Docker.
- Desenvolvimento usa `pointmedia` e testes usam `pointmedia_test`, ambos em 127.0.0.1:55432. A porta 5432 estava ocupada; nenhum processo externo foi encerrado.
- O frontend local foi configurado para `http://localhost:55173`, pois 5173 estava ocupada. Vite usa a porta de WEB_ORIGIN. A API permanece em 3000; os testes de navegador usam 33001/55174.
- No sandbox, a CLI JavaScript do Prisma falha com EPERM ao resolver a pasta temporária. A migration do banco de teste foi aplicada pelo **schema engine oficial instalado do Prisma 7.10.0**, via o protocolo JSON-RPC usado pela CLI, preservando o controle normal de migrations. Não houve reset, aplicação manual de DDL ou marcação artificial de migration.
- Após essa preparação, executamos as mesmas suítes Jest de integração e o coordenador exportado `runBrowserTests` do runner E2E. Os comandos completos `npm run test:integration` e `npm run test:e2e`, que incluem a etapa da CLI Prisma, não foram validados integralmente dentro do sandbox. Continuam sendo os comandos documentados para o PowerShell normal.
- Os processos de verificação no sandbox usaram NODE_OPTIONS com `--preserve-symlinks --preserve-symlinks-main`. Vitest usou `VITEST_SKIP_INSTALL_CHECKS=1` após confirmar jsdom instalado, para evitar uma checagem auxiliar bloqueada por EPERM. Testes, asserções e erros de runtime permaneceram ativos; essas opções não foram gravadas na configuração de produção.
- O runner E2E gerencia API e preview pelas APIs dos próprios servidores, aguarda Playwright e encerra ambos em finally. Isso substitui o encerramento por taskkill que travava no usuário restrito do Windows. A execução final passou e terminou com código zero.
- A verificação adicional de `npm run dev` encontrou `require is not defined` no carregador runner do Vite. A configuração foi convertida para JavaScript ESM com carregamento nativo, mantendo plugins e verificação de tipos via checkJs; o frontend passou a iniciar na porta configurada. Essa opção é documentada em [Vite: config loading](https://vite.dev/config/#config-loading).
- A primeira inicialização pelo usuário apresentou mensagem genérica de falha, mas a migration posterior comprovou o servidor ativo. A causa exata dessa primeira mensagem não foi comprovada. O helper agora reconhece uma instância do mesmo cluster iniciada por outra sessão e registra diagnósticos com segredos redigidos.

## Revisão visual e pendências

Login inspecionado em Chromium em 1440×1024 e 375×812: sem overflow horizontal, navegação por Tab e feedback dos campos obrigatórios. Capturas locais em `.tmp/qa-login-desktop.png` e `.tmp/qa-login-mobile.png`. A organização foi comparada a Entrar.png. O fluxo autenticado de perfil passou no E2E; a revisão visual detalhada desse perfil continua pendente.

Fontes/ativos vetoriais oficiais não foram fornecidos. Existem diferenças de tipografia e medidas; fidelidade pixel a pixel e WCAG AA completa não são declaradas concluídas. O contraste do link rosa de ajuda requer revisão na fase de refinamento visual. O build informa um chunk de aproximadamente 644 kB, sem erro; otimização de divisão de bundle fica registrada para refinamento de desempenho.

Recuperação de senha, confirmação de e-mail, renovação de sessão, módulos das próximas fases e provisionamento de produção não fazem parte desta entrega. Backups, TLS, retenção e direitos LGPD precisam ser concluídos antes de usar dados reais.

A cópia de cache de uma tentativa anterior de instalação offline permanece em `.tmp/npm-cache`, ignorada pelo Git. A revisão automática do ambiente rejeitou sua limpeza; o cache original do usuário não foi alterado. Nenhuma nova tentativa de remoção foi realizada.

## Arquivos e execução

Implementação em `apps/api`, `apps/web`, `packages/shared`; preparação local em `scripts`; testes em `apps/api/test`, nos fontes e em `tests`; contrato e rastreabilidade em `docs`. Nesta validação foram ajustados o reconhecimento do PostgreSQL já iniciado, carregamento/porta do Vite, ciclo de vida dos serviços E2E e documentação.

Com o banco disponível, `npm run dev` inicia API e frontend. Acesse `http://localhost:55173/entrar`. Contas fictícias: `admin@example.test`, `rh@example.test` e `candidato@example.test`; a senha é o valor local de SEED_PASSWORD no `.env`. Não compartilhar esse arquivo.

Verificação final de desenvolvimento: `npm run dev` iniciou Vite e NestJS; `/entrar`, a saúde da API em 3000 e `/api/health/ready` pelo proxy do frontend responderam HTTP 200. Após a mudança para carregamento nativo, build/tipagem do frontend, lint e os três testes Vitest passaram novamente; o bundle gerado manteve o mesmo hash. Os serviços de desenvolvimento foram deixados em execução para inspeção pelo usuário.

Rechecagem após o relato do usuário: as portas 3000 e 55173 estavam sem serviço (ECONNREFUSED). A verificação anterior não demonstrava permanência dos processos após a resposta do agente. O PostgreSQL continuava disponível. Os serviços foram iniciados novamente com Start-Process, janela oculta e saída em `.local/run/dev.out.log` e `dev.err.log`; login, API e proxy voltaram a responder HTTP 200. A permanência após o encerramento da sessão não é garantida por essa checagem. Para uso contínuo, o README documenta a execução no PowerShell normal com o terminal mantido aberto.
