# Banco de dados

PostgreSQL com Prisma e migrations versionadas em `apps/api/prisma/migrations`. UUIDs como identificadores, constraints e índices no banco, datas UTC. `migrate deploy` aplica migrations sem apagar dados. Não executar reset automaticamente.

## Fase 1

- **User**: nome, e-mail normalizado único, hash Argon2id, telefone opcional, cargo opcional, role CANDIDATE/RECRUITER/ADMIN, ativo, datas de criação, alteração e troca de senha. Empresa é Point Media apenas para contas internas.
- **AuthSession**: UUID, userId, expiração e revogação. O JWT contém somente sub e sid; role e estado ativo são consultados no servidor a cada solicitação.
- **AuditLog**: ator opcional, ação, entityId e data. Sem senha, hash, token, currículo ou corpo de request. Criado na mesma transação das mutações relevantes.

Índices: User.email único; sessões por usuário/expiração; auditoria por ator/data. Relações de sessões com cascade na exclusão de usuário; auditoria preservada com ator nulo.

## Fase 2

Migration aditiva `202610290001_candidates_jobs`, sem alteração de dados das contas existentes:

- CandidateProfile ligado por userId à conta: dados profissionais, versão, escolhas Não se aplica e data de autorização de compartilhamento.
- Skill/CandidateSkill normalizam competências sem duplicação por grafia/capitalização. ProfessionalExperience e Education guardam registros separados com ordenação e datas validadas.
- ResumeFile guarda somente metadados, hash SHA-256 e chave UUID do arquivo privado. Uma versão atual por usuário; bytes permanecem fora da árvore pública.
- JobOpening guarda descrição, modalidade, senioridade, salário Decimal, flags de ausência, prazo, estado, autor e versão. JobRequirement separa requisitos obrigatórios e diferenciais.
- Checks no PostgreSQL reforçam a escolha de ausência, faixa salarial não negativa/ordenada, tamanho do currículo e datas de experiências/formação. Índices por estado/prazo, compartilhamento, relações e unicidade de requisitos.

O prazo altera o estado efetivo retornado pela API sem depender de scheduler. Cancelamento preserva linhas/histórico. Remover perfil profissional não remove a conta. Downloads registram início de acesso na auditoria, sem conteúdo ou nome de arquivo.

## Fase 3

Migration aditiva `202610290002_applications_talent`:

- Application: candidato/vaga com unicidade composta, estado RECEIVED, instante de envio, versão da autorização e versão do perfil na entrega. FK da vaga com Restrict preserva vínculos; cancelamento permanece lógico. Perfil e currículo continuam atuais, sem cópias de arquivos privados.
- TalentConsent: histórico de autorizações com versão do texto, concessão, vencimento e revogação. Índice único parcial permite somente um registro não revogado por candidato; checks protegem datas. Renovar cria outro registro e mantém o anterior.
- Nenhuma adesão é inferida ou migrada a partir de recruitmentConsentAt. Autorizações têm finalidades distintas.
- Prazo de 180 dias configurável; filtro de acesso exclui expiração e revogação imediatamente. A conta e comprovantes de candidaturas não são removidos pela saída do banco. Remover o perfil revoga a participação, removendo o currículo pelo fluxo já existente.

## Fase 4

Migration aditiva `202610290003_screening`, aplicada em desenvolvimento e testes:

- ScreeningConfiguration: versões por vaga, pesos, participação dos indispensáveis, política de dados completos, versão do algoritmo e ator/data. Unicidade vaga/versão; checks garantem percentuais inteiros de 0–100 e soma dos três critérios igual a 100.
- ScreeningRun: configuração utilizada, versão da vaga, sequência por vaga, assinatura SHA-256 dos insumos e ator/data. Unicidade vaga/sequência; execução e resultados são gravados na mesma transação.
- ScreeningResult: candidatura, versão do perfil, score Decimal opcional, cobertura Decimal, indicação de revisão e explicação JSON mínima. Unicidade execução/candidatura e checks de score/cobertura de 0–100.
- Reprocessamento cria outra execução e preserva a anterior. Remoção do perfil ou inativação da conta bloqueia a exposição das explicações pela consulta atual; a triagem não altera estados de candidaturas.

Na retomada de 31/10/2026, a migration estava aplicada somente no banco de testes. `npm run db:migrate` aplicou-a ao desenvolvimento pelo Prisma, sem reset; contagens das 13 tabelas existentes conferidas antes/depois e preservadas. Histórico e checksums das quatro migrations conferidos nos dois bancos, considerando normalização de quebras de linha LF/CRLF. Evidências em [validation-phase4.md](validation-phase4.md).

## Fase 5

Migration aditiva `202611010001_selection_process`, aplicada aos bancos de teste e desenvolvimento, sem reset:

- Application recebe versão positiva e os estados SCREENING, SHORTLISTED, INTERVIEW, APPROVED e REJECTED; índice por vaga/etapa/envio.
- ApplicationStageHistory mantém origem/destino, versão única por candidatura, autoria/data e campos distintos de justificativa interna e mensagem pública. Candidaturas anteriores recebem evento inicial na data original.
- RecruiterNote guarda notas internas com autoria/data, limite de 2000 caracteres e índice por candidatura/data. A API apenas acrescenta registros, sem edição/exclusão.
- Transições serializam pela candidatura e exigem versão atual; alteração, histórico e auditoria são atômicos. Notas independentes não alteram o estado nem a versão.
- As 16 tabelas anteriores tiveram contagens e hashes dos dados conferidos antes/depois da migration de desenvolvimento; preservados. Evidências em [validation-phase5.md](validation-phase5.md).

## Fase 6 — leituras agregadas

Fase 6 não acrescenta migration: indicadores leem Application, ApplicationStageHistory, CandidateProfile, TalentConsent, JobOpening, User, AuditLog e última execução Screening em snapshots coerentes. Não cria snapshots com dados pessoais, tabelas de analytics ou resultados fictícios de IA. Datas de calendário são agregadas no PostgreSQL com America/Sao_Paulo.

## Evolução prevista

Modelar as próximas entidades a partir das regras documentadas, sem criar tabelas especulativas desconectadas. Departamento usa texto na fase atual; catálogo administrativo pode ser normalizado quando houver gestão própria.

Compatibilidade sempre relativa a uma vaga. Salário Decimal, não float. Currículos privados com metadados e storage abstrato. Separar dados declarados, extraídos e verificados. Consentimento e prazo de participação implementados; política de retenção física/exclusão por finalidade precisa ser concluída antes de produção.

## Ambientes

Desenvolvimento e testes têm URLs diferentes. O runner de integração só aceita um banco cujo nome termina em `_test` e usa dados identificados por execução; limpa somente esses dados. Seed só é permitido fora de produção e exige uma senha por variável de ambiente, sem senha fixa no código.

## Execução sem Docker

Decisão autorizada pelo usuário: utilizar PostgreSQL 17 nativo/portátil no Windows, pois a máquina não suporta Docker. O banco e o ORM permanecem os mesmos; não há substituição por SQLite ou dados em memória.

- `npm run env:setup`: cria `.env` com credenciais aleatórias; preserva arquivo já existente e não exibe segredos.
- `npm run db:local`: usa binários opcionais para Windows x64 ou `LOCAL_POSTGRES_BIN`. Inicializa o cluster somente se ainda não existe, com SCRAM-SHA-256, UTF-8 e escuta em 127.0.0.1. Não registra serviço Windows.
- `npm run db:local:status`: informa o estado da instância do projeto.
- `npm run db:local:stop`: usa encerramento controlado via `pg_ctl`; mantém arquivos e dados.
- Desenvolvimento e testes usam `pointmedia` e `pointmedia_test` na mesma porta 5432 por padrão. URLs precisam ter a mesma porta e credenciais, com bancos diferentes.
- Nesta máquina, as URLs usam 55432 porque 5432 estava ocupada. O início verifica o diretório de dados pelo PostgreSQL antes de criar bancos; reconhece o mesmo cluster já iniciado por outra sessão sem reiniciá-lo.
- Dados/logs ficam em `.local/postgres17/`, ignorado pelo Git. O inicializador não apaga diretórios, não reinicializa cluster existente e não encerra processos que ocupem a porta escolhida.
- O fluxo portátil é exclusivo de desenvolvimento/testes; em produção, provisionar PostgreSQL e configurar DATABASE_URL diretamente.

Referências: [PostgreSQL para Windows e ZIP sem instalador](https://www.postgresql.org/download/windows/), [controle do servidor com pg_ctl](https://www.postgresql.org/docs/17/app-pg-ctl.html) e [binários portáteis utilizados](https://github.com/leinelissen/embedded-postgres).
