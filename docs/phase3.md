# Fase 3 — candidaturas e banco de talentos

Autorizada pelo usuário em 29/10/2026. Escopo: envio real, prazo, unicidade, consulta própria e pelo RH, adesão voluntária e pesquisa de talentos. Ranking, transições seletivas e IA ficam nas fases seguintes.

## Decisões e garantias

- Candidatura exige perfil profissional salvo e autorização explícita para disponibilizar seus dados/currículo ao RH no contexto daquela inscrição. Não exige adesão ao banco de talentos nem compartilhamento geral do perfil.
- Consentimento para futuras oportunidades é separado e opcional; não é inferido do compartilhamento da Fase 2. Texto/versionamento e datas ficam persistidos. Revogação/expiração bloqueiam as rotas do banco, sem revogar autorizações independentes de candidaturas ou compartilhamento geral.
- Prazo de participação/renovação: o usuário delegou a escolha; adotados 180 dias, configuráveis por TALENT_RETENTION_DAYS. Expiração bloqueia a consulta do RH automaticamente; renovação exige nova autorização. Não executar exclusão física automática de dados de conta/candidaturas com outras finalidades; a política completa de retenção/exclusão continua sendo requisito antes de produção.
- Somente vaga publicada, com prazo estritamente futuro no instante de aceitação pelo PostgreSQL, recebe candidatura. Locks de candidato e vaga coordenam envio/edição/encerramento. O relógio é consultado depois da espera por locks. Unicidade candidato/vaga também é garantida pelo banco.
- Repetir um envio já aceito retorna a mesma candidatura, inclusive após encerramento, sem duplicar nem alterar o instante original. Não confundir essa recuperação com uma nova inscrição tardia.
- Tentativa tardia com consentimento válido explícito para o banco retorna `TALENT_POOL`, sem criar candidatura. Sem essa escolha retorna 409 e não inscreve automaticamente. Rascunhos/canceladas retornam 404.
- Estado inicial: `RECEIVED` (Recebida). Não mostrar “Em análise” antes de existir essa etapa. Listas próprias nunca expõem notas ou dados de outros candidatos.
- Perfil/currículo são atuais, sem duplicação de arquivos ou snapshots de dados pessoais. A candidatura registra a versão do perfil na entrega. Remoção do perfil revoga a adesão ao banco, mantém conta e comprovante mínimo da candidatura; RH deixa de obter perfil/arquivo inexistentes.

## Contrato incremental

Mesma base `/api`, cookies, RBAC, validação estrita, proteção de origem, paginação e erros da fundação. OpenAPI existente continua sendo o artefato de contrato.

| Método | Rota                                 | Acesso    | Resultado                                                                                                                   |
| ------ | ------------------------------------ | --------- | --------------------------------------------------------------------------------------------------------------------------- |
| POST   | /applications                        | CANDIDATE | 200 `{outcome: APPLICATION ou TALENT_POOL, application, talentConsent}`; candidatura nova ou repetida, ou adesão após prazo |
| GET    | /applications/me                     | CANDIDATE | Lista paginada das próprias candidaturas                                                                                    |
| GET    | /applications/me/:id                 | CANDIDATE | Comprovante próprio persistido; 404 para ID alheio                                                                          |
| GET    | /management/applications             | RH/ADMIN  | Lista paginada, com filtro por vaga e busca                                                                                 |
| GET    | /management/applications/:id/profile | RH/ADMIN  | Perfil atual autorizado por aquela candidatura                                                                              |
| GET    | /management/applications/:id/resume  | RH/ADMIN  | Currículo privado, download auditado                                                                                        |
| GET    | /talent-pool/me                      | CANDIDATE | Consentimento próprio e estado ativo                                                                                        |
| PUT    | /talent-pool/me                      | CANDIDATE | Adesão/renovação explícita, sem estender um consentimento ainda válido em retentativas                                      |
| DELETE | /talent-pool/me                      | CANDIDATE | 204 revogação idempotente                                                                                                   |
| GET    | /talent-pool                         | RH/ADMIN  | Busca, filtros e paginação, somente consentimentos ativos                                                                   |
| GET    | /talent-pool/:id/profile             | RH/ADMIN  | Perfil com consentimento ativo                                                                                              |
| GET    | /talent-pool/:id/resume              | RH/ADMIN  | Currículo com consentimento ativo e auditoria                                                                               |

## Interfaces

Reutilizar formulário profissional, cadastro com senha, sessão e modal existentes. `Form.png`, `Banco.png`, `Confirmação.png` e `Talentos.png` orientam os fluxos. Cadastro/login preservam o destino interno para continuar a inscrição. Minhas candidaturas fica em uma seção do portal autorizado, sem página sem referência. Banco.png só exibe confirmação depois da persistência. Candidatura e banco têm mensagens distintas; nenhum score fictício ou pontuação global será reproduzido.

## Textos de autorização arquivados

- `application-2026-10-29`: “Autorizo disponibilizar meus dados profissionais e currículo à equipe da Point Media para participação nesta vaga.”
- `talent-2026-10-29`: “Quero participar do banco de talentos e autorizo a equipe da Point Media a consultar meu perfil e currículo para futuras oportunidades durante o prazo informado. Posso sair pelo portal do candidato a qualquer momento.”

O prazo efetivamente concedido fica registrado em grantedAt/expiresAt. Ao alterar textos em versões futuras, preservar este registro e criar nova versão. No resultado de uma candidatura repetida, talentConsent pode ser null: o envio não altera consentimentos independentes já registrados; consulte `/talent-pool/me` para o estado atual.

Referências técnicas: [relógio do PostgreSQL 17](https://www.postgresql.org/docs/17/functions-datetime.html#FUNCTIONS-DATETIME-CURRENT), [locks de linha](https://www.postgresql.org/docs/17/explicit-locking.html#LOCKING-ROWS).

## Verificação prevista

HTTP/PostgreSQL reais: autenticação/RBAC/isolamento, perfil obrigatório, autorização, unicidade sob concorrência, prazo e espera por lock, fechamento concorrente, adesão tardia com/sem consentimento, revogação/expiração e filtros. Navegador: visitante → cadastro com senha → perfil → envio → comprovante após recarga; banco independente e consulta RH. Executar regressões, lint, tipagem e build; registrar resultados e limites em validation-phase3.md.

## Resultado

110 testes aprovados, incluindo 48 HTTP/PostgreSQL e 9 Playwright. Evidências, arquivos alterados e limites em [validation-phase3.md](validation-phase3.md). Nenhuma fase seguinte foi iniciada.
