## Diagnóstico geral

**O sistema tem uma base organizada, mas ainda apresenta falhas que impedem confiar no funcionamento completo.** O problema principal é que a interface usa dados fictícios e confirma operações mesmo quando o backend rejeita a solicitação.

Analisei frontend, backend, modelo do banco e testes, comparando com o `PROJECT-CONTEXT.md`. Não alterei o código.

## 🔴 Problemas críticos

### 1. Operações falham, mas a interface informa sucesso

O serviço de API retorna sucesso simulado quando uma requisição falha — inclusive em candidatura, criação de vaga, avaliação e mudança de etapa.

**Impacto:** candidato e RH podem acreditar que salvaram informações que nunca chegaram ao banco. Até uma lista real de vagas vazia é substituída por vagas fictícias.

Referência: [api.ts](/C:/Users/Freit/Downloads/PointMedia-main/PointMedia-main/frontend/src/services/api.ts:296).

### 2. Login real está incompatível; senha incorreta pode abrir uma sessão fictícia

- Backend retorna `accessToken`; frontend espera `token`.
- Quando o login falha, o frontend cria um usuário de demonstração.
- O perfil desse usuário é escolhido pelo texto do e-mail.
- As rotas internas não exigem autenticação na interface.

**Impacto:** um login válido não armazena o token corretamente, enquanto um inválido pode aparentar funcionar. Isso não prova acesso indevido ao banco: o backend possui guardas de autenticação.

Referências: [AuthContext.tsx](/C:/Users/Freit/Downloads/PointMedia-main/PointMedia-main/frontend/src/context/AuthContext.tsx:41), [api.ts](/C:/Users/Freit/Downloads/PointMedia-main/PointMedia-main/frontend/src/services/api.ts:330) e [App.tsx](/C:/Users/Freit/Downloads/PointMedia-main/PointMedia-main/frontend/src/App.tsx:34).

### 3. É possível assumir um perfil preexistente sem verificar o e-mail

Ao registrar uma conta, o backend conecta automaticamente um candidato sem conta que tenha o mesmo e-mail, sem comprovar a posse desse endereço.

**Impacto:** alguém pode cadastrar uma senha para um perfil de outra pessoa que entrou pelo formulário público, passando a acessar e alterar seus dados.

Referência: [auth.service.ts](/C:/Users/Freit/Downloads/PointMedia-main/PointMedia-main/backend/src/auth/auth.service.ts:16).

### 4. Candidato consegue receber informações internas do RH

A consulta de detalhes verifica se a candidatura pertence ao candidato, mas devolve também avaliações, notas, histórico e e-mail dos avaliadores.

**Impacto:** informações internas podem ser acessadas pelo próprio candidato via API, contrariando a especificação.

Referência: [applications.service.ts](/C:/Users/Freit/Downloads/PointMedia-main/PointMedia-main/backend/src/applications/applications.service.ts:53).

### 5. Editar etapas apaga o histórico do processo

A atualização exclui todas as etapas e cria outras. No banco:

- A exclusão da etapa apaga seu histórico por cascata.
- As candidaturas que estavam nela ficam com a etapa atual nula.

**Impacto:** uma edição da configuração pode destruir a rastreabilidade de processos em andamento.

Referências: [jobs.service.ts](/C:/Users/Freit/Downloads/PointMedia-main/PointMedia-main/backend/src/jobs/jobs.service.ts:125) e [schema.prisma](/C:/Users/Freit/Downloads/PointMedia-main/PointMedia-main/backend/prisma/schema.prisma:179).

## 🟠 Erros de integração e funcionamento

### 6. Frontend e backend usam contratos diferentes

| Fluxo | Frontend | Backend | Consequência |
|---|---|---|---|
| Cadastro | `name` | `fullName` | Rejeição da requisição |
| Candidatura | `linkedin`, `portfolio`, `expectedSalary` | `linkedinUrl`, `portfolioUrl`, `salaryExpectation` | Rejeição da requisição |
| Vaga | `department`, `deadline`, `skillsWeight` | `area`, `applicationDeadline`, `technologyWeight` | Criação incompatível |
| Avaliação | `notes` | `note` | Avaliação rejeitada |
| Ranking | Array ou `items` | `applications` | Dados reais descartados |
| Banco de talentos | Array ou `items` | `candidates` | Dados reais descartados |
| Dashboard | `pipelineByStage` | `candidatesByStage` | Erro ao renderizar |

A validação do backend rejeita campos não previstos. Os retornos fictícios escondem essas incompatibilidades.

Referências: [api.ts](/C:/Users/Freit/Downloads/PointMedia-main/PointMedia-main/frontend/src/services/api.ts:359), [DTO de candidatura](/C:/Users/Freit/Downloads/PointMedia-main/PointMedia-main/backend/src/applications/dto/create-public-application.dto.ts:6) e [dashboard](/C:/Users/Freit/Downloads/PointMedia-main/PointMedia-main/frontend/src/pages/RecruiterDashboardPage.tsx:62).

### 7. Candidatura de usuário já cadastrado não está integrada

A página de vaga sempre chama o formulário público. O backend rejeita esse fluxo para e-mails que já possuem conta e exige o endpoint autenticado `/applications/me`, que a página não utiliza.

Referência: [JobDetailsPage.tsx](/C:/Users/Freit/Downloads/PointMedia-main/PointMedia-main/frontend/src/pages/JobDetailsPage.tsx:42).

### 8. Cadastro no banco de talentos usa uma vaga fictícia

A tela envia `jobId: 'talent-pool-general'` para um endpoint que exige uma vaga existente. O resumo profissional preenchido também não é enviado.

**Impacto:** o cadastro anunciado pela interface não corresponde a um fluxo válido de persistência.

Referência: [TalentRegisterPage.tsx](/C:/Users/Freit/Downloads/PointMedia-main/PointMedia-main/frontend/src/pages/TalentRegisterPage.tsx:22).

### 9. Pontuação exibida pode ser inventada

A página usa `res.score || 92`. O backend retorna a nota dentro de `application`, e uma nota zero também seria substituída por 92.

A tela ainda espera `isExpired`, enquanto o backend retorna `submitted` e `inTalentPool`.

Referência: [JobDetailsPage.tsx](/C:/Users/Freit/Downloads/PointMedia-main/PointMedia-main/frontend/src/pages/JobDetailsPage.tsx:61).

### 10. Existem caminhos quebrados na navegação

- “Criar Nova Vaga” no dashboard aponta para `/recruiter/jobs/new`, rota inexistente.
- A triagem consulta a vaga pelo endpoint público, que não retorna vagas em rascunho, encerradas ou arquivadas.

Referências: [RecruiterDashboardPage.tsx](/C:/Users/Freit/Downloads/PointMedia-main/PointMedia-main/frontend/src/pages/RecruiterDashboardPage.tsx:96) e [JobRankingPage.tsx](/C:/Users/Freit/Downloads/PointMedia-main/PointMedia-main/frontend/src/pages/JobRankingPage.tsx:20).

## 🟡 Inconsistências e redundâncias

### 11. O ranking favorece a omissão de dados

Quando o candidato não informa senioridade ou pretensão salarial, esses critérios saem do cálculo e seus pesos são redistribuídos.

**Impacto:** omitir uma informação desfavorável pode produzir pontuação maior do que preenchê-la corretamente.

Referência: [ranking.service.ts](/C:/Users/Freit/Downloads/PointMedia-main/PointMedia-main/backend/src/ranking/ranking.service.ts:89).

### 12. Requisitos são verificados por presença literal de texto

O motor procura a descrição do requisito dentro da biografia e das competências.

Por exemplo, “não tenho experiência com SQL” contém “SQL”. Já uma experiência descrita com palavras diferentes pode ser rejeitada.

**Impacto:** falsos positivos e falsos negativos na triagem.

Referência: [ranking.service.ts](/C:/Users/Freit/Downloads/PointMedia-main/PointMedia-main/backend/src/ranking/ranking.service.ts:79).

### 13. Alterar a vaga não atualiza automaticamente suas notas

Editar pesos, requisitos ou competências não dispara recálculo. O ranking pode continuar refletindo regras antigas até outra ação recalculá-lo.

Referência: [jobs.service.ts](/C:/Users/Freit/Downloads/PointMedia-main/PointMedia-main/backend/src/jobs/jobs.service.ts:62).

### 14. Há recálculos excessivos e repetidos

- Cada nova candidatura recalcula todas as candidaturas da vaga.
- Atualizar competências recalcula os rankings.
- A atualização do perfil recalcula esses mesmos rankings novamente.

**Impacto:** trabalho duplicado e custo crescente conforme aumenta o número de candidatos.

Referências: [candidates.service.ts](/C:/Users/Freit/Downloads/PointMedia-main/PointMedia-main/backend/src/candidates/candidates.service.ts:24) e [applications.service.ts](/C:/Users/Freit/Downloads/PointMedia-main/PointMedia-main/backend/src/applications/applications.service.ts:132).

### 15. Validações e permissões têm comportamentos inconsistentes

- Alterar somente um limite salarial pode deixar mínimo maior que máximo: a comparação considera apenas os campos enviados.
- Desativar um usuário não invalida seu token já emitido, com duração de até oito horas.
- A gestão de candidaturas restringe recrutadores ao criador da vaga, mas o ranking permite leitura e recálculo por qualquer recrutador.
- O dashboard conta vagas `OPEN` vencidas como abertas, enquanto a listagem pública filtra pelo prazo.

Referências: [jobs.service.ts](/C:/Users/Freit/Downloads/PointMedia-main/PointMedia-main/backend/src/jobs/jobs.service.ts:155), [jwt-auth.guard.ts](/C:/Users/Freit/Downloads/PointMedia-main/PointMedia-main/backend/src/auth/guards/jwt-auth.guard.ts:45), [ranking.controller.ts](/C:/Users/Freit/Downloads/PointMedia-main/PointMedia-main/backend/src/ranking/ranking.controller.ts:7) e [dashboard.service.ts](/C:/Users/Freit/Downloads/PointMedia-main/PointMedia-main/backend/src/dashboard/dashboard.service.ts:15).

## ⚪ Funcionalidades faltando

Comparando a implementação com a especificação:

- **Currículo:** não há upload; o campo `resumeUrl` existe no banco, mas não é aceito nos DTOs de cadastro/atualização do candidato. A interface ainda insere links fictícios.
- **Administração:** faltam telas e endpoints de gestão de usuários e permissões.
- **Gestão de vagas:** faltam na interface edição, publicação, encerramento e configuração de requisitos, competências e etapas.
- **Perfil do candidato:** existe atualização no backend, mas falta interface para utilizá-la.
- **Reaproveitamento de talentos:** falta um fluxo para o RH vincular um candidato do banco a uma nova vaga.
- **Recuperação de senha:** não encontrei implementação.
- **Acessibilidade dos modais:** falta gerenciamento de foco e associação do título ao diálogo.
- **Testes de negócio:** os testes encontrados verificam apenas “Hello World”; não cobrem autenticação, permissões, ranking ou candidaturas.

Referências: [App.tsx](/C:/Users/Freit/Downloads/PointMedia-main/PointMedia-main/frontend/src/App.tsx:34), [Modal.tsx](/C:/Users/Freit/Downloads/PointMedia-main/PointMedia-main/frontend/src/components/Modal.tsx:20) e [teste E2E](/C:/Users/Freit/Downloads/PointMedia-main/PointMedia-main/backend/test/app.e2e-spec.ts:22).

## Ordem recomendada de correção

1. Corrigir vínculo de contas, exposição de avaliações e exclusão de histórico.
2. Remover o sucesso fictício e alinhar os contratos frontend/backend.
3. Validar o fluxo completo com dados reais: cadastro → candidatura → ranking → movimentação.
4. Corrigir as regras de ranking e eliminar recálculos duplicados.
5. Completar as funcionalidades previstas e criar testes dos fluxos principais.

**Limitação da análise:** os achados vêm da leitura do código. Tentei executar testes e linters, mas `vitest` e `oxlint` não estão disponíveis nesta cópia; não houve validação em navegador ou banco em execução.
