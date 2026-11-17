# Página de vagas e ajustes de navegação — 02/11/2026

Escopo solicitado pelo usuário: página pública de vagas, botão de voltar no login, melhor posição/alinhamento dos detalhes da vaga acima dos formulários e altura da navegação lateral de Admin/RH independente do conteúdo.

## Implementação

| Solicitação                      | Arquivos responsáveis                                                                                                                                         | Comportamento                                                                                                                                                                                                                                                        |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Página de vagas                  | `features/jobs/PublicJobsPage.tsx`, `PublicJobs.tsx`; `app/App.tsx`; `features/public/PublicLayout.tsx`, `HomePage.tsx`, `home.css`; `RouteAccessibility.tsx` | `/vagas` pública, listagem/paginação reais pela API existente, abertura do detalhe, carregamento, erro com nova tentativa e estado vazio. Links na Home e no cabeçalho; acesso ao banco e ao login. Título de documento e atalho para conteúdo.                      |
| Voltar no login                  | `components/BackLink.tsx`, `features/auth/LoginPage.tsx`, `styles/global.css`                                                                                 | Link com seta vetorial, contorno, foco visível e área de pelo menos 44 px de altura. Posição superior esquerda. Retorna à inscrição válida indicada pelo fluxo ou à Home; destino externo não é aceito pelo validador existente.                                     |
| Detalhes alinhados ao formulário | `features/jobs/PublicJobs.tsx`, `jobs.css`; `features/applications/TalentRegistrationPage.tsx`, `applications.css`                                            | Cabeçalho, informações e formulário centralizados em até 1100 px, com bordas laterais alinhadas. Descrição/requisitos e resumo dos dados em colunas no desktop, empilhadas no celular. Mesma largura também no banco. Conteúdo real e prazo em Brasília preservados. |
| Altura da barra lateral          | `styles/global.css`                                                                                                                                           | Desktop: altura da janela (`100dvh`, fallback `100vh`), `align-self: start`, posição sticky e rolagem interna. O conteúdo da página pode crescer sem esticar a barra. Em telas até 750 px, navegação superior no fluxo normal, preservando o comportamento móvel.    |
| Destinos coerentes               | `AccountLayout.tsx`, `features/auth/RegisterPage.tsx`; `features/applications/ApplicationConfirmation.tsx`, `MyApplications.tsx`                              | Links de oportunidades passam a apontar para `/vagas`. Links antigos da Home com `#vagas` continuam funcionais. A rota legada de cadastro mantém a inscrição como único caminho de criação de conta.                                                                 |

Não houve alteração de backend, endpoints, schema, dependências, autenticação ou regras de inscrição. A conta continua sendo criada somente no envio final aceito, com senha no próprio formulário. Nenhum commit ou publicação.

## Referências e escolhas visuais

Foram inspecionadas `Imagens/Form.png`, `Entrar.png` e `Vagas.png`, além dos componentes/CSS existentes. Mantidos Poppins, fundo preto/branco, cinza `#f7f7f7`, rosa `#ed559b` (texto `#b32466`), azul `#6cabd5`, logos locais, cantos e escala atuais. A página nova reaproveita os cartões de oportunidades e o cabeçalho/rodapé da Home. O detalhe mantém as informações acima do formulário, com uma única coluna externa alinhada e resumo interno separado para leitura.

## Verificação

Os testes de frontend relacionados foram atualizados em `app/App.test.tsx`, `features/auth/LoginPage.test.tsx` e `RegisterPage.test.tsx`. Os fluxos existentes de navegador em `tests/e2e/auth.spec.ts` e `phase2.spec.ts` acompanham os novos destinos e o título da vaga sem prefixo decorativo.

`tests/e2e/public-layout.spec.ts` acrescenta três cenários reais com API/PostgreSQL no banco `_test`:

1. Home → página de vagas → detalhe persistido após recarga, formulário com senha, retorno contextual do login por teclado e volta às vagas. Sem overflow em 320/375/768/1366 px, detalhes/formulário com mesma posição e largura; alinhamento também no banco.
2. Admin com vaga de descrição longa: barra permanece com altura da janela ao rolar a página até o fim, em 1366×812, 768×812 e 1366×400. Navegação inferior acessível pela rolagem interna; layout móvel em 375 px.
3. Mesmo cenário com conta real de RH e seu menu próprio.

Uma primeira asserção de posição exata encontrou arredondamento de 0,3125 px no limite inferior da grade. A posição admite até 1 px de arredondamento; a altura continua comparada à altura exata da janela. Um teste anterior ainda procurava o travessão decorativo retirado do título e foi atualizado para o título real. Não houve alteração das regras da aplicação para satisfazer essas asserções.

## Resultados e evidências

| Verificação executada              | Resultado                                                                                                | Evidência local                                                                  |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Unidade frontend                   | 21/21 aprovados                                                                                          | `.tmp/public-layout-web-unit.log`                                                |
| Navegador com API/PostgreSQL reais | 25 cenários distintos aprovados: 24 na suíte e o cenário de título repetido após atualizar a expectativa | `.tmp/public-layout-e2e-final.log`, `.tmp/public-layout-e2e-recheck.log`         |
| Tipagem dos workspaces e E2E       | Aprovada                                                                                                 | `.tmp/public-layout-types.log`                                                   |
| Build do frontend                  | Aprovado                                                                                                 | `.tmp/public-layout-build-final.log`                                             |
| Lint                               | Aprovado, sem warnings                                                                                   | `.tmp/public-layout-lint.log`; checagem dos testes alterados após o ajuste final |
| Formatação                         | Aprovada, incluindo README e E2E fora do glob padrão                                                     | `.tmp/public-layout-format.log` e checagem explícita                             |
| Aplicação local atualizada         | Reinício pelo inicializador, bundle servido igual ao build atual e `/vagas` HTTP 200                     | `.tmp/public-layout-local-start.log`; checagens HTTP locais                      |

Foram inspecionadas capturas reais da listagem/detalhe em 320 e 1366 px, login em 320 px, Admin com janela de 400 px de altura e RH em 375 px de largura. Arquivos em `.tmp/public-jobs-*.png`, `.tmp/public-job-details-*.png`, `.tmp/public-login-*.png`, `.tmp/sidebar-*.png`. As capturas contêm somente fixtures fictícias no banco de teste, não dados de candidatos reais.

Sem regressões conhecidas nos cenários executados, incluindo cadastro final com senha, PDF/DOCX, ranking, seleção humana, comprovantes e consentimento do banco. Os testes unitários/HTTP exclusivos do backend não foram repetidos, pois não houve modificação nessa camada; a integração foi exercitada pelos 25 fluxos de navegador. A versão disponível está em http://localhost:55173/vagas.

Os testes são de Chromium e não constituem auditoria integral de acessibilidade ou validação em todos os navegadores. As limitações de sandbox para Vitest/jsdom e os coordenadores E2E sem reaplicar migrations permanecem as descritas em [validation-phase8.md](validation-phase8.md). Não há migration nova nesta alteração. O build mantém o aviso existente de bundle acima de 500 kB; os avisos de DevTools/jsdom/`pg` das suítes anteriores também persistem sem impedir as aprovações. Não houve mudança de arquitetura para tratar esses avisos neste escopo.
