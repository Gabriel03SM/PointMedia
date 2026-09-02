# Point Media — Plano de Implementação

## 1. Decisões de arquitetura

Será utilizado um monorepo simples, com duas aplicações independentes:

```text
point-media/
├── frontend/   # React + TypeScript
├── backend/    # NestJS + Prisma
└── docs/
```

- **Frontend:** React, React Router, componentes reutilizáveis e Chart.js para os gráficos.
- **Backend:** NestJS modular, API REST, validação com DTOs e tratamento centralizado de erros.
- **Dados:** MySQL acessado exclusivamente pelo Prisma.
- **Arquivos:** currículos serão persistidos por uma camada de armazenamento abstraída; no ambiente inicial, armazenamento local controlado. A interface permitirá migrar para nuvem posteriormente.
- **Autenticação:** JWT com senha protegida por hash. O formulário público não exige sessão; áreas de candidato, RH e administração exigem autenticação.

Não serão usados microsserviços, filas ou integrações analíticas nesta primeira versão. A API manterá pontos de extensão para integrações futuras.

## 2. Perfis e permissões

| Perfil | Acesso |
|---|---|
| CANDIDATE | Próprio perfil e próprias candidaturas |
| RECRUITER | Vagas, candidatos, ranking, etapas e banco de talentos |
| ADMIN | Todas as ações do RH, usuários, permissões e configurações |

As permissões serão verificadas por guards no backend. A interface apenas reflete as permissões, sem ser a única camada de proteção.

## 3. Modelo de dados inicial

| Entidade | Responsabilidade e relações principais |
|---|---|
| User | Credenciais, perfil de acesso e vínculo opcional com Candidate |
| Candidate | Dados pessoais e profissionais, currículo, links, pretensão e senioridade |
| Skill | Tecnologia ou conhecimento normalizado |
| CandidateSkill | Competência do candidato e nível opcional |
| Job | Vaga, prazo, faixa salarial, senioridade e status |
| JobRequirement | Requisito da vaga: `REQUIRED` ou `DIFFERENTIAL`, com peso |
| JobSkill | Tecnologia exigida/desejada pela vaga e peso |
| Application | Vínculo candidato–vaga, score, etapa atual e status |
| SelectionStage | Etapas configuráveis por vaga e ordem de exibição |
| ApplicationStageHistory | Histórico de alterações de etapa |
| Evaluation | Anotações e decisão manual do RH |

O banco de talentos não será uma tabela duplicada: será uma visão de candidatos pesquisável. Candidatos que se inscreverem após o prazo, ou que não estejam em processo ativo, permanecem disponíveis nela.

## 4. Estratégia de ranking

O score será calculado de 0 a 100 por vaga:

```text
score = (tecnologias × peso) + (senioridade × peso)
      + (salário × peso) + (diferenciais × peso)
```

- Os pesos são configuráveis na vaga e devem totalizar 100.
- Cada componente retorna uma aderência de 0 a 1.
- Requisitos indispensáveis são uma regra de elegibilidade: candidato que não atender a algum deles recebe `requiredCriteriaMet = false`; permanece visível, mas aparece sinalizado e abaixo dos elegíveis no ranking.
- Empates são resolvidos por maior número de requisitos obrigatórios atendidos e, depois, data da candidatura.
- O score é recalculado ao criar/editar candidatura, candidato ou critérios da vaga.

## 5. Módulos e API REST

| Módulo | Rotas principais |
|---|---|
| Auth | `POST /auth/login`, `POST /auth/register`, `GET /auth/me` |
| Candidates | perfil do candidato, currículo e competências |
| Jobs | CRUD de vagas, requisitos, tecnologias e publicação |
| Applications | candidatura pública, listagem, detalhe, mudança de etapa e decisão |
| Ranking | ranking paginado por vaga e recálculo de score |
| Talent pool | busca e filtros de candidatos reutilizáveis |
| Dashboard | indicadores de vagas e processos |
| Users | administração de usuários e perfis |

As listagens serão paginadas e aceitarão filtros por status, senioridade, etapa, competência e período quando aplicável.

## 6. Telas iniciais

1. Página pública de vagas abertas e detalhe da vaga.
2. Formulário público de candidatura, com confirmação ou aviso de inclusão no banco de talentos após o prazo.
3. Login e área do candidato: perfil e acompanhamento das candidaturas.
4. Dashboard de RH: indicadores, funil e vagas recentes.
5. Gestão de vagas: lista, criação, edição e configuração de critérios/etapas.
6. Ranking de candidatos por vaga, com aderência, requisitos e ações de etapa.
7. Banco de talentos, com busca e filtros.
8. Administração de usuários.

O frontend começará por tokens de design e componentes `Button`, `Input`, `Select`, `Card`, `Badge`, `Table`, `Progress`, `Modal` e estruturas de navegação. A identidade seguirá a paleta, tipografia e CTAs definidos em `DESIGN-SYSTEM.md`.

## 7. Validação, segurança e acessibilidade

- DTOs no backend validam todo dado recebido; frontend oferece feedback imediato sem substituir a validação do servidor.
- Upload de currículo terá limite de tamanho e lista explícita de tipos aceitos.
- Senhas com hash, JWT com expiração e proteção de rotas por perfil.
- Mensagens de erro não expõem detalhes internos.
- Campos terão `label`, erros associados, foco visível e navegação por teclado.
- Estados não dependerão somente de cor; usarão texto e ícones.

## 8. Testes

- **Backend:** unitários para ranking e permissões; integração para autenticação, vagas e candidaturas.
- **Frontend:** testes de componentes críticos e dos fluxos de candidatura e gestão de etapas.
- **Aceitação manual:** responsividade, teclado, campos obrigatórios, expiração de vaga e isolamento entre perfis.

## 9. Ordem de implementação

1. Criar estrutura do monorepo e configurar React, NestJS, Prisma e MySQL.
2. Implementar schema Prisma, migrations e dados mínimos de desenvolvimento.
3. Implementar autenticação, perfis e proteção de rotas.
4. Implementar vagas, requisitos e etapas.
5. Implementar cadastro público, currículo e candidaturas.
6. Implementar cálculo de ranking e painel de ranking.
7. Implementar banco de talentos e busca.
8. Implementar dashboard e administração de usuários.
9. Executar testes, revisão de acessibilidade e ajustes responsivos.

## 10. Premissas adotadas

- Candidatos podem criar uma conta para acompanhar candidaturas; o cadastro público pode iniciar esse fluxo.
- O RH configura etapas por vaga, começando com um conjunto padrão sugerido.
- A pretensão salarial é comparada à faixa da vaga quando ambas existirem; caso contrário, esse critério não entra no score e os demais pesos são normalizados.
- Requisitos indispensáveis e diferenciais serão cadastrados como texto estruturado inicialmente; competências reutilizáveis usam a entidade `Skill`.
