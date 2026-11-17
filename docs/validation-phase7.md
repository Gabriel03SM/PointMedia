# Validação da Fase 7 — interface, acessibilidade e responsividade

Escopo de refinamento das telas existentes concluído em 02/11/2026, após a retomada solicitada pelo usuário. **182 testes aprovados** e quatro asserções Postman adicionais. As referências continuam sendo as 16 imagens de `Imagens/`, os logos oficiais, Poppins e os ajustes de escala/menus aprovados. Esta entrega não conclui os módulos administrativos ausentes nem inicia a Fase 8.

## Comportamento verificado

- Navegação com título de página, foco no conteúdo após mudança de rota, atalho da Home e das áreas autenticadas e âncora de Minhas candidaturas. Somente o destino atual do menu do candidato recebe `aria-current`.
- Erros associados aos campos por `aria-describedby`/`aria-invalid`, mensagens anunciáveis e foco no primeiro campo inválido. Cadastro, perfil, senha, perfil profissional e formulário de vaga preservam as validações e integrações existentes. Datas finais anteriores às iniciais são identificadas no formulário profissional, acompanhando a validação do servidor.
- Modais nativos contêm a navegação por teclado, fecham por Escape e devolvem o foco ao acionador. O formulário de vaga recebe foco no título após abrir, inclusive em uma segunda abertura.
- Contraste dos textos rosa/azul, ajuda de senha, chips e contornos ajustado na mesma paleta. Asserções do navegador verificam amostras de texto normal e indicadores grandes; não constituem auditoria de todos os pares de cores.
- Larguras de 320, 375, 768 e 1366 px nos cenários da Fase 7, incluindo nomes/títulos longos, busca, formulários, modais, dashboards e seletor de vagas. Sem rolagem horizontal da página nas verificações. Gráficos mantêm rolagem interna identificada, foco visível e operação por teclado; o seletor de vagas em 768 px fica dentro da área de conteúdo.

Persistência e autorização foram exercitadas com API e PostgreSQL reais. Salvar o perfil e recarregar recupera os dados e as escolhas de Não se aplica. As regressões cobrem login/logout, permissões, currículo privado, candidatura, prazo, consentimento, ranking, decisões humanas, mensagens e indicadores.

## Resultados executados

| Camada             | Resultado                                                                                                                                          |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Configuração local | 9 testes Node aprovados                                                                                                                            |
| API unitária       | 50 testes / 6 suítes aprovados                                                                                                                     |
| Frontend           | 17 testes / 5 arquivos Vitest aprovados; execução alternativa com saída 0                                                                          |
| HTTP/PostgreSQL    | 85 testes / 7 suítes aprovados, saída 0, em 197,759 s                                                                                              |
| Navegador          | 21 testes Chromium aprovados na rodada final em 1,9 min: 16 regressões e 5 cenários da Fase 7                                                      |
| Compilação         | `npm run build` aprovado; build do frontend repetido e aprovado após a correção de foco                                                            |
| Tipagem            | `npm run typecheck` aprovado; build final do frontend também executa TypeScript                                                                    |
| Lint               | `npm run lint` aprovado novamente após a correção                                                                                                  |
| Formatação         | `npm run format:check` aprovado; documentos atualizados incluídos na conferência final                                                             |
| Postman CLI        | 4 asserções aprovadas, saída 0, em `GET http://127.0.0.1:3000/api/openapi.json`                                                                    |
| Aplicação local    | Saúde, páginas, 401 sem sessão, login administrativo, agregados, CSV, IA desativada e logout aprovados; frontend serve o bundle atual com HTTP 200 |

O Postman reutilizou `.tmp/postman-phase6-contract.js`, sem workspace ou publicação, com `--no-report-events`. Verifica a presença dos indicadores/CSV/status de IA e a ausência de campos pessoais nos schemas agregados. Isso comprova o contrato servido; os testes HTTP e de navegador comprovam os comportamentos exercitados.

## Correções na retomada

A primeira rodada desta retomada terminou com 19/21 testes de navegador aprovados. O teste de persistência lia `notApplicable` fora do envelope `profile` já documentado pelo endpoint; a asserção passou a conferir HTTP 200 e o campo correto. A outra falha identificou foco inicial incorreto no formulário de vaga: o `autoFocus` do React ocorria antes da abertura do diálogo. O hook existente agora permite escolher o foco depois de `showModal()`, e o formulário usa o título como destino. O teste também fecha e reabre o formulário por teclado, verificando o retorno ao botão nas duas vezes. A rodada completa posterior passou sem falhas.

## Revisão visual e arquivos

O navegador gerou 29 capturas da Fase 7 em `.tmp/phase7-*.png`, em 320 e 1366 px, incluindo portal e formulário de vaga. Amostras de Home, login/cadastro, detalhes de vaga, portal, candidatos, modais, vagas, triagem e dashboards foram inspecionadas visualmente. O conjunto de referências foi consultado preservando a sidebar, cartões, organização, fontes e identidade já aprovadas. A revisão não é comparação pixel a pixel.

Arquivos principais do refinamento já iniciado: `apps/web/src/components/{RouteAccessibility,FieldError,AccountLayout}.tsx`, `components/useModalDialog.ts`, `app/App.tsx`, formulários em `features/{auth,account,candidates,jobs}`, `features/analytics/MetricCharts.tsx`, `features/public/HomePage.tsx`, `styles/global.css` e CSS das funcionalidades. Na retomada de 02/11, a correção de produto ficou em `useModalDialog.ts` e `features/jobs/JobModal.tsx`; a asserção e a reabertura ficaram em `tests/e2e/phase7.spec.ts`. README, plano, rastreabilidade, escopo e mapeamento visual foram atualizados para refletir a validação.

## Ambiente e limitações

As verificações usaram `NODE_OPTIONS=--preserve-symlinks --preserve-symlinks-main`, somente nos processos desta sessão, devido ao `EPERM` de resolução de caminhos no sandbox. O `npm test` inicial aprovou os 9 testes locais, 50 da API e 17 do frontend, mas terminou com saída 1 pela checagem de localização do `jsdom` no Vitest. O pacote está instalado. Uma execução alternativa selecionou o mesmo ambiente embutido `builtinEnvironments.jsdom` por um módulo temporário `.tmp/phase7-jsdom.mjs`; os mesmos 17 testes passaram com saída 0. Nenhuma dependência ou configuração de produto foi alterada para contornar o ambiente.

Integração e navegador usaram os coordenadores temporários existentes `.tmp/run-integration.cjs` e `.tmp/run-browser-tests.mjs`, com verificação de banco `_test`; o segundo reutiliza `runBrowserTests` de `scripts/run-e2e.mjs` e gerencia as portas isoladas 33001/55174. Não se declara execução integral dos wrappers npm que reaplicam migrations. Não houve alteração de schema nem aplicação de migration nesta fase. O PostgreSQL existente foi reutilizado; nenhuma base foi resetada. A aplicação de desenvolvimento já estava ativa e serviu o novo bundle sem necessidade de reinício.

Evidências da retomada: `.tmp/continuation-phase7-{unit,web-unit,types,integration,e2e,e2e-final,postman,web-build,lint-final,format}.log`. Avisos não fatais: bundle de aproximadamente 821 kB, depreciação do `pg`, import opcional de devtools, cores no Playwright e import do ambiente no módulo temporário do Vitest.

Não foram executados testes completos com leitores de tela, em outros navegadores ou uma auditoria integral WCAG 2.2 AA. `Entrar-1.png` (cadastro RH) e `Admin - Gerenciamento de Usuários.png`, além de logs/sistema, dependem do módulo administrativo ainda não implementado; a criação restrita de recrutador continua funcional pela API. O requisito global de todas as referências permanece parcial. IA real, recuperação de senha, políticas/direitos LGPD e infraestrutura de produção continuam pendentes conforme as fases anteriores. Sem commits ou publicação. Fase 8 aguarda aprovação do usuário.
