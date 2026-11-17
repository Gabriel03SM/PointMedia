# Mapeamento das referências visuais

Referência oficial confirmada pelo usuário: as 16 imagens em `Imagens/` representam o conteúdo do Figma e devem orientar a implementação, sem depender de link ou arquivo editável. Inspeção inicial do conjunto; análise ampliada de Entrar, Entrar-1 e Perfil para a fundação. Não havia componentes React anteriores. Logos oficiais PNG e Poppins foram aplicados posteriormente conforme [brand-assets.md](brand-assets.md). As imagens originais são preservadas.

| Referência                            | Fluxo                                                | Fase                                              |
| ------------------------------------- | ---------------------------------------------------- | ------------------------------------------------- |
| Entrar.png                            | Login comum aos perfis                               | 1                                                 |
| Entrar-1.png                          | Cadastro de funcionário RH restrito ao administrador | Fundação do contrato; UI administrativa posterior |
| Perfil.png                            | Dados básicos da conta e segurança                   | 1                                                 |
| Home.png                              | Entrada pública; vagas e cadastro posteriores        | Home na fundação; módulos nas fases 2–3           |
| Form.png                              | Detalhes de vaga e candidatura                       | 2–3                                               |
| Banco.png                             | Adesão ao banco de talentos                          | 3                                                 |
| Confirmação.png                       | Confirmação de candidatura                           | 3                                                 |
| Dashboard.png                         | Indicadores RH                                       | 6                                                 |
| Candidatos.png                        | Listagem RH                                          | 2–3                                               |
| Talentos.png                          | Pesquisa de talentos                                 | 3                                                 |
| Vagas.png                             | Gerenciamento de vagas                               | 2                                                 |
| Triagem.png                           | Ranking e decisões                                   | 4–5                                               |
| Triagem - Modal perfil candidato.png  | Perfil, resumo e revisão humana                      | 4–6                                               |
| Admin - Dashboard Administrativo.png  | Visão administrativa                                 | Administração                                     |
| Admin - Gerenciamento de Usuários.png | Gestão de usuários e permissões                      | Administração                                     |
| Admin - Métricas gerais.png           | Indicadores administrativos                          | 6                                                 |

## Elementos compartilhados

Correção solicitada em 02/11/2026: `/vagas` reutiliza cartões, paleta, Poppins e cabeçalho/rodapé da Home. `Form.png` orienta os detalhes acima do formulário, agora com largura e bordas laterais alinhadas; o resumo dos dados fica em coluna interna no desktop e empilhado no celular. `Entrar.png` preserva o cartão central, com retorno visível no topo solicitado pelo usuário. As barras laterais de `Vagas.png` e das referências administrativas mantêm altura da janela e rolagem interna. Escopo, arquivos e evidências em [public-navigation-review.md](public-navigation-review.md).

Fase 6: Dashboard.png, Admin - Dashboard Administrativo.png e Admin - Métricas gerais.png orientam os novos dashboards, preservando sidebar, cartões, organização dos gráficos, Poppins e escala atual. Origem dos candidatos não é coletada; alertas/backups e IA não têm provedor/telemetria. Esses números ilustrativos não foram copiados: exibem-se etapas, volume de auditoria, compatibilidade determinística por vaga e disponibilidade real de IA. Média entre vagas e métricas de “qualidade da pessoa” não são apresentadas. Filtro por vaga substitui área na consulta de compatibilidade, preservando a organização dos controles. Sem gráficos ou notificações fictícios.

Fase 5 (01/11/2026): decisões e notas da referência `Triagem - Modal perfil candidato.png` integradas ao CandidateModal existente, somente quando aberto por uma candidatura. Justificativa, mensagem pública opcional e revisão antes de gravar usam os campos/componentes existentes. Histórico/estado adicionados ao portal e comprovante já autorizados. Sem página nova, scores ilustrativos ou resumo de IA fictício. Evidências em [validation-phase5.md](validation-phase5.md).

Atualização de 29/10/2026: o usuário entregou dois logos oficiais PNG e confirmou Poppins como fonte. Aplicação, arquivos, licença e verificações em [brand-assets.md](brand-assets.md). As observações de fontes/logos pendentes nas validações anteriores representam o estado histórico dessas entregas.

Fundo preto no login, cartão quase branco arredondado, campos com contorno escuro, botões pretos e texto branco. Acentos rosa e azul. Perfil com barra lateral preta, conteúdo claro, avatar com gradiente e formulário em duas colunas. Em telas pequenas, manter ordem de leitura e quebrar as colunas. Usar fallback de sistema até disponibilização das fontes; não baixar fontes sem licença.

## Lacunas e incoerências identificadas antes da criação

- Não há tela de recuperação de senha, verificação de e-mail ou acesso negado. Esses fluxos continuam pendentes. Cadastro com senha e portal do candidato foram posteriormente autorizados pelo usuário, conforme registro abaixo.
- `Entrar-1.png` permite selecionar tipo de acesso: isso não torna o cadastro público. O contrato restringe a criação de recrutador ao ADMIN.
- `Perfil.png` combina “Conta do recrutador” com permissão “Administrador”. Exibir a role real do usuário e não copiar os valores ilustrativos.
- O texto “Autenticação por email ativa” não comprova MFA ou confirmação de e-mail. Não exibir essa garantia sem implementação.
- Navegação para módulos posteriores aparece como texto acompanhado de indicação de próxima fase, sem links/botões falsos. Na Fase 2, portal, vagas e candidatos passaram a ter links reais conforme as permissões.
- Recuperação de senha: o texto de ajuda do login abre orientação explícita sobre indisponibilidade nesta fase, sem simular envio de e-mail. Definir fluxo e contato de suporte antes da implementação.

Revisão pixel a pixel depende de fontes/ativos oficiais; a entrega não declara fidelidade tipográfica final. A home pública foi antecipada como correção de acesso solicitada pelo usuário; a Fase 2 está funcionalmente validada e as fases 3–8 permanecem pendentes.

## Correção da entrada pública

Home.png orienta o cabeçalho preto com login separado, hero em gradiente rosa/azul escuro, introdução, explicação do processo, área de vagas, faixa do banco de talentos e rodapé. Reutilizado Brand e mantida a família tipográfica/fallback existentes. A raiz não exige sessão; login e retorno à home são links funcionais. Os botões de oportunidades levam às respectivas seções por âncora.

Diferenças deliberadas em relação ao conteúdo ilustrativo: não reproduzir vagas de exemplo, prazos, +20 vagas, +300 perfis ou retorno de 48h como dados reais. Sem módulos de vagas/consentimento, mostrar disponibilidade futura, sem formulário fictício ou botão de cadastro sem operação. Benefícios que pressupõem esses módulos e links externos sem destino oficial também não foram incluídos. Nenhum dado de candidato ou área restrita foi tornado público.

A observação inicial de contraste do rosa em “esqueceu a senha?” foi tratada na Fase 7 com uma variante mais escura da mesma paleta, verificada no navegador. Isso não declara auditoria integral de acessibilidade concluída.

## Fase 2 — autorizações e referências aplicadas

O usuário determinou senha para cadastro nos fluxos de vaga e banco de talentos e autorizou criar o portal do candidato, ausente nas imagens. Autorizou modal de formulário para criar vagas e pediu a checkbox “Não se aplica”. Essas autorizações não se estendem a outras páginas sem referência.

| Implementação                                                | Referência e uso                                                                                                               |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| `features/auth/RegisterPage.tsx`                             | Entrar/Entrar-1: cartão, campos e controles de senha; cadastro público somente de candidato                                    |
| `features/candidates/CandidatePortal.tsx`                    | Portal autorizado, campos e organização de Form.png; layout de conta existente, experiências/formação e ausência explícita     |
| `features/jobs/JobsPage.tsx`, `JobModal.tsx`                 | Vagas.png: sidebar, dois painéis, chips e resumo da vaga; modal autorizado com os mesmos controles e estados reais             |
| `JobDetailsPage` em `features/jobs/PublicJobs.tsx`           | Informações da vaga em Form.png; dados públicos reais e acesso ao perfil, sem alegar candidatura enviada                       |
| `features/candidates/CandidatesPage.tsx`                     | Candidatos.png: pesquisa, filtros, lista e total reais de perfis compartilhados                                                |
| `CandidateModal` em `features/candidates/CandidatesPage.tsx` | Triagem - Modal perfil candidato.png: dados pessoais/profissionais reais, sem ranking, resumo IA ou decisão ainda inexistentes |
| `features/jobs/PublicJobs.tsx`                               | Home.png: vagas abertas recuperadas da API, sem conteúdo demonstrativo                                                         |

Capturas desktop e móvel e seis testes E2E estão registrados em [validation-phase2.md](validation-phase2.md). Modais possuem foco nativo, fechamento por teclado e rolagem. O modal de vaga e o de candidato foram centralizados na área de conteúdo; na viewport móvel usam a largura disponível sem overflow horizontal.

Na entrega da Fase 2, Form.png/Banco.png aguardavam candidatura/adesão; os fluxos foram implementados na Fase 3 conforme seção abaixo. Salvar somente o perfil continua sem criar candidatura nem adesão. Fontes e logos oficiais seguem pendentes; Brand existente foi preservado.

## Fase 3 — candidaturas e talentos

- Form.png: formulário profissional existente reutilizado abaixo do detalhe real da vaga. Cadastro com senha/login preservam o destino; as autorizações da vaga e do banco são separadas, para que futuras oportunidades sejam opcionais.
- Banco.png: mesmos cabeçalho, cartão informativo, formulário e controles existentes. O texto inicial explica a adesão; a mensagem de sucesso só aparece após persistência. Incluídas experiências, formação e escolhas de ausência já autorizadas no portal.
- Confirmação.png: fundo em gradiente e cartão branco, vaga/status e navegação. Mostra Recebida, que é o estado implementado, e recupera a inscrição pelo servidor mesmo após recarga. Incluído acesso a Minhas candidaturas.
- Talentos.png: sidebar, busca, total real, cartões e modal reutilizados. Filtros funcionais de formação, experiência e pretensão complementam competência/senioridade/localização. Não reproduzir score global, CV score ou match fictício; ranking relativo a vaga pertence à Fase 4.
- Candidatos.png: consulta de candidaturas integrada à página existente por abas e filtro por vaga; o modal usa a autorização daquela inscrição. Minhas candidaturas e consentimento ficam no portal autorizado, sem criar página sem referência.

Conferência Chromium desktop/móvel e artefatos em [validation-phase3.md](validation-phase3.md). Persistem diferenças de tipografia por ausência das fontes/logos oficiais; não declarar pixel perfect ou WCAG completa.

## Fase 4 — triagem e ranking

- Triagem.png: sidebar, título, cartões de totais, lista numerada, score e ação Ver perfil reutilizam a organização e componentes existentes. Os totais representam candidaturas, avaliações e revisão humana calculadas pela API.
- Vagas.png: o painel de candidatos rankeados agora consulta resultados reais e abre a triagem da vaga selecionada. Configuração e explicações usam os controles e feedback existentes.
- O formulário de pesos e a opção de aguardar dados completos atendem à configuração auditável prevista no escopo. A explicação mostra aderência, contribuição e informação ausente por critério; não há score global nem interpretação do currículo.
- Aprovação/rejeição, notas do recrutador e totais de decisões da imagem dependem da Fase 5. Nesta fase, as candidaturas continuam Recebidas; não reproduzir decisões ou indicadores demonstrativos.
- CandidateModal continua usando o contexto autorizado da candidatura. Logos oficiais/Poppins permanecem aplicados. Capturas desktop e móvel em `.tmp/phase4-ranking-desktop.png` e `.tmp/phase4-ranking-mobile.png`; resultados em [validation-phase4.md](validation-phase4.md). Refinamento final de medidas, acessibilidade completa e comparação pixel a pixel permanecem na Fase 7.

## Revisão no navegador — 29/10/2026

Atualização posterior em 01/11/2026: menus de RH/Admin separados conforme Dashboard.png e as três referências Admin. Escala de fontes, campos, cartões e sidebar reduzida a pedido do usuário, com revisão desktop/móvel e preservação de cores, logos, Poppins e componentes. Regras de acesso, arquivos, medidas e evidências em [interface-review.md](interface-review.md). Os resultados abaixo descrevem a revisão histórica de 29/10.

Login renderizado em Chromium nas resoluções 1440×1024 e 375×812, com capturas em `.tmp/qa-login-desktop.png` e `.tmp/qa-login-mobile.png`. Verificados ausência de overflow horizontal, navegação por Tab e feedback dos campos obrigatórios. Organização geral comparada a Entrar.png; há diferenças de tipografia e medidas que permanecem para refinamento. Sem alteração das imagens oficiais ou redesenho nesta verificação. Os dois testes E2E posteriores passaram com API e PostgreSQL reais, verificando login, perfil, edição persistida e logout. A revisão visual detalhada do perfil autenticado permanece pendente; o funcionamento desse fluxo está validado.

## Fase 7 — revisão das telas existentes em 02/11/2026

Referências consultadas como conjunto, mantendo Poppins, logos oficiais, sidebar de 200 px, paleta, cartões e escala já aprovados. Contraste dos textos de acento usa variantes mais escuras onde necessário; cores decorativas da marca são preservadas. Formulários exibem erros relacionados aos campos, e a navegação/modais receberam foco e semântica acessíveis. Conteúdo longo quebra linhas; gráficos mantêm rolagem interna por teclado e o seletor de vagas não invade a sidebar em 768 px.

`tests/e2e/phase7.spec.ts` verifica quatro larguras (320/375/768/1366 px) e gera 29 capturas em `.tmp/phase7-*.png`; amostras foram inspecionadas visualmente. A suíte completa aprovou 21 testes, incluindo 16 regressões. Evidências, arquivos e limitações em [validation-phase7.md](validation-phase7.md).

| Referências pendentes                 | Situação                                                                                                                        |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Entrar-1.png                          | Cadastro RH por interface depende do módulo administrativo; criação de recrutador pela API continua restrita ao ADMIN e testada |
| Admin - Gerenciamento de Usuários.png | Gestão administrativa de usuários/permissões ainda não implementada; sem valores ilustrativos ou controles falsos               |

As demais telas implementadas mantêm as adaptações funcionais documentadas nas fases anteriores: dados reais, consentimentos explícitos, critérios explicáveis e IA desativada. Esta revisão não declara fidelidade pixel a pixel, implementação de todas as 16 referências ou conformidade WCAG integral. A Fase 8 aguarda aprovação.

Correção posterior de 02/11/2026: por solicitação expressa do usuário, Form.png e Banco.png passam a concentrar também e-mail e senha da nova conta no formulário existente. A conta é criada somente no envio final aceito. O login direciona às oportunidades/banco e a antiga página independente de cadastro apenas redireciona. Preservados PasswordInput, campos, cartões, fonte, paleta e responsividade. Evidências e testes em [registration-flow.md](registration-flow.md); isso substitui o uso anterior de Entrar/Entrar-1 como tela separada de cadastro do candidato.
