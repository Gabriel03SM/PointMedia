# Validação da Fase 6 — indicadores e IA opcional

Escopo aprovado concluído em 01/11/2026, com **177 testes aprovados** e quatro asserções Postman adicionais. Continuidade autorizada pelo usuário para começar após a conclusão da Fase 5. O usuário confirmou que ainda não possui provedor de IA e solicitou indicadores reais com a integração preparada e desativada. Nenhum provedor pago, transmissão externa ou análise fictícia foi introduzido.

## Entrega e escopo

- Dashboard RH em `/gestao/dashboard`, dashboard Admin em `/admin/dashboard` e métricas administrativas em `/admin/metricas`, com menus próprios e autorização no backend.
- Filtros de 7/30/90/365 dias e vaga, busca/paginação real do seletor, atualização da consulta e download CSV autenticado. Agregados vêm do PostgreSQL e incluem zeros, dados disponíveis por autorização, prazo efetivo e coorte de candidaturas. Conversão, funil acumulado, estado atual e tempo até a primeira triagem têm definições e denominadores em [phase6.md](phase6.md).
- Compatibilidade somente por vaga, em faixas disjuntas, usando a última execução atualizada. A mesma assinatura da triagem controla a validade; perfis/critério/vaga alterados ocultam os números antigos até reprocessamento. Nenhuma alteração automática de etapa.
- Administração recebe somente totais de contas/perfis de acesso, vagas e ações agregadas. Respostas e CSV não incluem nomes, contatos, currículos, notas, justificativas ou atores individuais.
- IntelligenceProvider/IntelligenceService isolam a futura integração. Provedor padrão indisponível e endpoint real de status; sem botão ou endpoint de análise. Fronteira de extração limita entrada/saída, rejeita campos decisórios e exige trechos/evidências literais. A validação é lexical e não equivale a verificação factual ou garantia contra prompt injection em um modelo futuro. Extração real de PDF/DOCX, adapter, credenciais e avaliação de resumos permanecem pendentes por escolha expressa do usuário.

## Verificação

| Camada             | Resultado                                                                                      |
| ------------------ | ---------------------------------------------------------------------------------------------- |
| Configuração local | 9 testes Node aprovados                                                                        |
| API unitária       | 50 testes / 6 suítes aprovados, incluindo 4 da fronteira de IA                                 |
| Frontend           | 17 testes Vitest aprovados                                                                     |
| HTTP/PostgreSQL    | 85 testes / 7 suítes aprovados, incluindo 10 da Fase 6                                         |
| Navegador          | 16 testes Chromium aprovados na rodada final em 1,5 min; inclui 2 novos fluxos e 14 regressões |
| Compilação         | Build de shared/API/frontend aprovado; recompilações específicas após os ajustes aprovadas     |
| Tipagem            | Shared, API/testes e frontend aprovados                                                        |
| Lint e formatação  | Aprovados                                                                                      |
| OpenAPI estrutural | 42 rotas, 54 operações com IDs únicos, 456 referências locais resolvidas; versão 0.6.0         |
| Postman CLI        | 4 asserções aprovadas, saída 0, contra OpenAPI servido em localhost                            |

A integração verifica contagens conhecidas por vaga, fuso, limite do período por milissegundo, dias vazios, prazo vencido, conversão/tempo, exclusão de inativos, consentimentos, perfil sem dupla contagem, distribuição de scores, ranking desatualizado, RBAC, CSV e ausência de PII. Unitários verificam indisponibilidade, formato/volume, trechos inventados, competência sem evidência (inclusive Java versus JavaScript) e instruções maliciosas como texto sem efeito decisório.

O navegador usa API/PostgreSQL reais, sem interceptar respostas. Verifica RH/Admin, valores retornados pelo servidor, filtro de vaga/período, ranking, download CSV, IA desativada, bloqueio 403 e redirecionamento de páginas proibidas. A primeira rodada de 16 testes passou; a inspeção visual identificou compressão do título pelo filtro no celular, sem overflow horizontal. O cabeçalho foi empilhado em telas pequenas e asserções de não sobreposição foram acrescentadas. A rodada final aprovou os 16 testes. As cinco capturas finais de RH, Admin e métricas em `.tmp/phase6-*.png` foram inspecionadas, incluindo os dois cabeçalhos corrigidos em 375 px; revisão não equivale a WCAG completa ou fidelidade pixel a pixel.

## Histórico de correções na verificação

Na primeira integração, 84/85 testes passaram. Uma fixture alterava o consentimento geral do perfil e o desfazia, mudando updatedAt; isso corretamente invalidava o ranking para o caso seguinte. A restauração da fixture passou a preservar seu timestamp original. A suíte completa posterior passou em 111,7 segundos, sem alterar a regra de validade.

Um teste unitário identificou que a validação lexical tratava o ponto final em “React.” como parte da competência. A fronteira foi corrigida para permitir pontuação final e continuar rejeitando inferência de “Java” a partir de “JavaScript”. As seis suítes unitárias da API passaram depois dessa correção. O npm test inicial terminou com erro por esse caso; a correção foi verificada pelo comando específico `npm run test -w @pointmedia/api`. O frontend completou seus 17 testes sem falhas.

## Ambiente e limites

Sem migration nesta fase. Banco de desenvolvimento preservado; fixtures somente no banco `_test`. Seguem os contornos de realpath do sandbox descritos em [validation-phase5.md](validation-phase5.md): opções preserve-symlinks restritas aos processos de verificação, Prisma com preloader temporário quando necessário, integração e navegador pelos coordenadores existentes depois da migration/build. Não houve edição de permissões, `.env`, dependências ou configuração de produção. Não se declara execução integral dos wrappers npm de integração/navegador que refazem migrations dentro do sandbox.

A aplicação compilada foi reiniciada pelo inicializador existente e confirmou prontidão em http://localhost:55173/. Checagem HTTP local adicional passou: Home, três rotas de dashboard, saúde, 401 sem sessão, login administrativo com a conta fictícia local, agregados reais, CSV, status de IA desativada e logout da própria sessão. Segredos e cookies não foram registrados. O banco e os registros existentes foram preservados; login/logout geram suas auditorias normais.

Postman usou `--no-report-events`, sem workspace, publicação ou dados de candidatos. Confirma somente o contrato servido; os testes HTTP/navegador exercitam a implementação. Avisos não fatais conhecidos: bundle de aproximadamente 817 kB, depreciação do pg, import opcional de devtools no runner Vitest e variáveis de cor no Playwright. Nenhuma dependência nova.

## Arquivos

- `apps/api/src/analytics/{analytics.service,analytics.controller,analytics.module,dto}.ts`: agregação, período, RBAC e CSV.
- `apps/api/src/intelligence/{intelligence.service,intelligence.module,intelligence.spec}.ts`: interface, fronteira e indisponibilidade real.
- `apps/api/src/screening/{screening.service,screening.module}.ts`: exportação do serviço existente e agregação da última execução com a mesma assinatura.
- `apps/api/src/app.module.ts`, `packages/shared/src/index.ts`, `apps/web/src/lib/api.ts`: módulos e contratos reais.
- `apps/web/src/features/analytics/{RecruitmentDashboard,AdministrationDashboard,MetricFilters,MetricCharts}.tsx` e `analytics.css`: telas conforme as referências existentes.
- `apps/web/src/{app/App,components/AccountLayout}.tsx`: rotas e navegação por perfil.
- `apps/web/src/lib/format.ts` e os componentes de histórico/notas da Fase 5: formatter de data/hora centralizado sem mudança de comportamento.
- `apps/api/test/phase6.integration.spec.ts` e `tests/e2e/phase6.spec.ts`: integração e navegador reais.
- README, OpenAPI, contrato, plano, rastreabilidade, arquitetura, banco e mapeamento visual atualizados.

IA real e conectores externos de analytics não estão implementados. Administração completa, política LGPD/retenção/exclusão, produção/TLS/backups e refinamento visual/acessibilidade permanecem nas fases seguintes. A Fase 7 aguarda aprovação; nenhum commit foi realizado.
