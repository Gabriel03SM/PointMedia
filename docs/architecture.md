# Arquitetura — Fases 1–6

## Escopo e fontes

Fontes: `AGENTS.md`, `docs/instruções.md`, `docs/observacaoCodex.md` e as 16 imagens em `Imagens/`. Não havia código anterior. O usuário confirmou que não existe PDF funcional separado e que o conteúdo de `Imagens/` é a referência oficial do Figma. Os requisitos funcionais vêm dos arquivos de instruções; a apresentação visual vem das imagens. Não aguardar outros documentos para desenvolver. Arquivos de fontes e logo vetorial não foram fornecidos.

Monorepositório npm workspaces: `apps/api` (NestJS/TypeScript), `apps/web` (React/Vite/TypeScript), `packages/shared` (contratos sem dependências do servidor). Monólito modular, PostgreSQL e Prisma. Sem serviços pagos e sem commits automáticos.

Compatibilidade da fundação: Node 22.12+ ou 24 LTS, npm 11.6.0 e NestJS 11.2.8 (JWT 11.0.0). Os módulos Nest permanecem alinhados na mesma versão. A escolha inicial de Nest 12 foi corrigida porque seus pacotes ESM com Jest exigem Node 24.9+; usar Nest 11 mantém os testes Jest e o runtime Node 22 da máquina, sem mudança de arquitetura ou framework. [Referência do Nest](https://docs.nestjs.com/migration-guide#testing-stack). O npm é executado por npx na instalação para evitar o erro edgesOut do resolver no npm 10; não alterar a instalação global.

## Fundação

- Módulos: configuração, banco, autenticação, usuários, saúde e auditoria.
- Controllers recebem DTOs validados; services aplicam regras; Prisma concentra a persistência. Guards globais exigem autenticação por padrão e aplicam RBAC.
- Cadastro público cria apenas CANDIDATE. Somente ADMIN cria RECRUITER; nenhum payload público define privilégios.
- JWT de acesso de curta duração em cookie HttpOnly, SameSite=Lax, Secure em produção. Sessão persistida com identificador opaco; logout e troca de senha revogam sessões no banco. Sem tokens em localStorage. Operações mutáveis autenticadas verificam Origin; frontend e API servidos pela mesma origem via proxy.
- Argon2id; erros de login genéricos; rate limiting; cabeçalhos Helmet; DTOs rejeitam campos desconhecidos. Respostas nunca incluem hash, cookie ou detalhes SQL.
- A Fase 2 acrescenta JobsModule e CandidatesModule. Perfil profissional e currículo são separados da conta; operações próprias exigem CANDIDATE e consulta interna exige RH/admin e compartilhamento vigente. As respostas são mapeadas explicitamente, sem hash, chaves de storage ou dados de sessão.

## Decisões

1. Datas persistidas em UTC (`timestamptz`); fuso de negócio America/Sao_Paulo. Prazo efetivo de vagas validado na Fase 2; aceitação de candidatura com relógio do PostgreSQL na Fase 3.
2. Role é enum no banco na fundação (três perfis fixos). Permissões configuráveis e gestão completa entram na etapa administrativa; não há alteração pública de role.
3. `docs/openapi.json` é o contrato para ferramentas, servido pela API; `docs/api-contract.md` explica decisões de uso. Alterações nos DTOs/controllers devem atualizar esse contrato e seus testes. A interface Swagger UI não foi incluída nesta fase; não declarar geração automática a partir dos decorators.
4. Entrada pública em `/`, baseada em `Home.png`, conforme correção solicitada pelo usuário. Login em `/entrar` e perfil protegido em `/perfil`, baseados em `Entrar.png` e `Perfil.png`. A home não consulta sessão nem depende da API para abrir. URLs desconhecidas voltam à home pública. Sem números fictícios: vagas e cadastro no banco de talentos informam sua indisponibilidade até a implementação dos módulos. Referências e lacunas em `figma-mapping.md`.
5. A máquina não suporta Docker, conforme informado pelo usuário. PostgreSQL 17 roda nativamente no Windows, com binários portáteis e `pg_ctl`; `npm run db:local` inicializa apenas um cluster local próprio e preserva os dados em `.local/postgres17/data`. Também é possível apontar `LOCAL_POSTGRES_BIN` para uma instalação/ZIP do PostgreSQL 17. Desenvolvimento e testes têm bancos distintos na mesma instância local; não há reset automático. O Compose foi preservado somente como alternativa opcional para outras máquinas.
6. Frontend envia cookies exclusivamente ao proxy `/api`; Query mantém apenas o usuário público e limpa cache ao sair. Guards do frontend são conveniência, o servidor autoriza novamente.

## Decisões da Fase 2

- Portal do candidato e modal de vagas autorizados expressamente pelo usuário. Referências: Form.png, Entrar/Entrar-1.png, Vagas.png, Candidatos.png e modal de perfil. Novas páginas sem imagem, fora dessas autorizações, exigem consulta prévia.
- Versão otimista na edição de vagas/perfil; perfil e upload usam lock da própria conta para serializar alterações relacionadas. Auditoria sem cópia de corpos ou currículo.
- Prazo persistido como timestamptz; a interface converte explicitamente o horário de Brasília. Listagem pública exclui publicadas cujo prazo expirou e detalhes informam estado efetivo. Cancelamento é lógico e não apaga histórico.
- Perfil: localização, senioridade, pretensão, links, competências, experiências e formação precisam ter valor ou opção explícita Não se aplica. Faixa salarial/localização/senioridade da vaga usam flags de ausência com checks no PostgreSQL.
- ResumeStorage é a abstração de arquivos; LocalResumeStorage armazena chaves UUID fora de public/dist. Reconciliação na inicialização e a cada hora remove somente arquivos UUID sem metadados e com mais de uma hora, evitando uploads em andamento. Falha de consulta ao banco interrompe a reconciliação; nenhum arquivo é removido usando uma lista de metadados incompleta por erro.
- O upload é a única exceção multipart, limitada ao POST exato de currículo com header/origem válidos, um arquivo e sem campos adicionais. JSON de perfil/gestão tem limite total de 128 KiB; autenticação continua em 16 KiB. PDF/DOCX têm limite de 5 MiB e checagens estruturais; isso não equivale a certificado de ausência de malware.
- Candidaturas, banco de talentos completo, ranking, IA e decisões de seleção não foram antecipados. As telas mostram somente informações/ações implementadas, sem scores, vagas ou indicadores fictícios.

## Decisões da Fase 3

- Módulos Applications e TalentPool reutilizam ProfilesService, ResumesService, guards e contratos compartilhados. Nenhuma tecnologia, serviço externo ou dependência nova.
- Autorização de uma candidatura permite consulta no contexto dessa inscrição. Compartilhamento geral da Fase 2 e consentimento para futuras oportunidades são independentes. As rotas consultam a autorização correspondente, sem ampliar implicitamente as rotas existentes.
- Envio bloqueia candidato e vaga na mesma transação; INSERT condicionado ao estado e ao clock_timestamp() após locks. Unicidade candidato/vaga no PostgreSQL reforça idempotência. O instante aceito fica registrado sem criar candidaturas retroativas.
- Consentimentos do banco têm versão, concessão, vencimento e revogação. 180 dias por escolha delegada pelo usuário, configuráveis; consultas excluem consentimentos expirados/revogados sem scheduler. Renovação mantém histórico e saída não apaga dados de outras finalidades.
- Formulário e modal da Fase 2 extraídos para reutilização; cadastro/login preservam somente destinos internos explicitamente permitidos. Comprovante consulta a inscrição própria persistida e mostra Recebida. Portal reúne candidaturas e participação no banco.
- Ranking, transições e IA continuam fora desta fase. Retenção física/exclusão por finalidade e operação de produção precisam de política completa; o prazo de participação não equivale a prometer apagamento automático de conta/candidaturas.

## Decisões da Fase 4

- ScreeningModule reutiliza autenticação, RBAC, auditoria, perfis, vagas e candidaturas. A comparação se limita a inscritos da vaga e não amplia o acesso pelo banco de talentos.
- `evaluate.ts` é uma função determinística dos requisitos, dados declarados e configuração recebida. Pesos e versão do algoritmo ficam persistidos; não há interpretação automática de currículo nem serviço externo.
- Configurações são versões imutáveis. A gravação serializa pela vaga e exige a versão atual; conflitos retornam 409. Geração verifica as versões da vaga e configuração e grava execução, resultados e auditoria atomicamente.
- Geração e leitura usam snapshot RepeatableRead. A triagem não bloqueia perfis em ordem oposta à inscrição; mudanças posteriores invalidam a assinatura dos insumos e são sinalizadas na leitura. Reprocessar preserva execuções anteriores.
- Cada resultado registra versão do perfil, score opcional, cobertura e explicação por critério. Dados ausentes não são tratados como incompetência; a política configurável pode aguardar dados completos. Nenhuma nota modifica o estado da candidatura.
- Rotas internas excluem contas inativas e perfis removidos dos resultados disponíveis. O modal reutiliza a autorização da candidatura; o candidato não acessa o ranking. Não persistir cópias de contatos ou currículo nas explicações.
- Frontend reutiliza AccountShell, controles, feedback e CandidateModal nas referências Triagem.png/Vagas.png. Aprovação, rejeição, notas e transições pertencem à Fase 5. Regras em [phase4.md](phase4.md); verificações em [validation-phase4.md](validation-phase4.md).

## Decisões da Fase 5

- ApplicationProcessService amplia o módulo Applications existente, com os mesmos guards, validações, banco e auditoria. Transições serializadas e versionadas, eventos imutáveis e notas independentes.
- Histórico público usa projeção própria no banco, sem carregar justificativas, notas ou autoria do RH. Acesso por titular; consultas internas limitadas a candidatos ativos.
- CandidateModal recebe controles do processo somente no contexto de uma candidatura. Listagens, portal e comprovante mostram status persistido; nenhum caminho paralelo ou nova página.
- Regras confirmadas pelo usuário e contrato em [phase5.md](phase5.md); evidências em [validation-phase5.md](validation-phase5.md). A continuidade para a Fase 6 foi explicitamente autorizada em 01/11/2026.

## Decisões da Fase 6

Fase 6: AnalyticsModule lê agregados em snapshot RepeatableRead, sem novas tabelas. Reutiliza ScreeningService para validar a assinatura da última execução antes de expor média/faixas por vaga. Fronteira IntelligenceProvider/IntelligenceService separada e desativada por escolha do usuário, com validação lexical de evidência e sem dependência externa. Rotas/políticas em [phase6.md](phase6.md). Dashboards reutilizam AccountShell, sidebar e componentes existentes.

## Limites de produção

Uma instância da API utiliza rate limiter em memória; para múltiplas instâncias será necessário armazenamento compartilhado. TLS, backups e monitoramento ainda precisam de validação no destino; não há hospedagem/domínio definido. Recuperação de senha, confirmação de e-mail, MFA e e-mail transacional não são declarados implementados.

## Decisões da Fase 8

- A API mantém a arquitetura e o bind em loopback. `TRUSTED_PROXY_IPS` autoriza somente IPs explícitos do proxy, sem confiança por padrão. Testes HTTP verificam limites por cliente e cadeia forjada. Modelo de mesma origem HTTPS em `deploy/nginx.conf.example`.
- `RESUME_STORAGE_DIR` permite arquivos privados persistentes fora dos releases; obrigatório em produção, proibido como override de testes. O armazenamento local anterior permanece como padrão de desenvolvimento. Configurar o caminho não transfere arquivos existentes.
- Com `NODE_ENV=production` definido antes do bootstrap, o backend não lê implicitamente o `.env` de desenvolvimento. Segredos ficam no ambiente explícito do serviço; erros de configuração contêm somente nomes dos campos.
- `scripts/check-production.mjs` verifica configuração/artefatos/storage sem mutações, banco ou migrations. A validação não autoriza publicação. Backup coerente exige capturar banco e arquivos sem gravações da API; a restauração deve ser ensaiada em ambiente isolado.
- O fluxo contínuo usa os módulos existentes e preserva a criação atômica de conta no envio final. Tipagem dos E2E incluída nas verificações do projeto. Integração e navegador devem rodar em sequência por compartilharem a base `_test`.

Sem novo schema, dependências ou serviços externos. Modelos e limitações em [deployment.md](deployment.md); resultados em [validation-phase8.md](validation-phase8.md).

Referências técnicas: [NestJS Guards](https://docs.nestjs.com/guards), [Prisma migrations](https://www.prisma.io/docs/orm/reference/prisma-cli-reference), [Vite](https://vite.dev/guide/).
