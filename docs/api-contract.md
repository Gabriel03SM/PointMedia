# Contrato da API — Fases 1–8 e correção do cadastro

Base `/api`. Contrato legível por ferramentas em `docs/openapi.json`, servido em `GET /api/openapi.json`. JSON, com multipart também permitido na inscrição final e no upload de currículo. Operações de candidatos e vagas em [phase2.md](phase2.md); candidaturas, consentimento e pesquisa de talentos em [phase3.md](phase3.md); triagem e ranking em [phase4.md](phase4.md); transições, histórico e notas em [phase5.md](phase5.md); correção de criação de conta em [registration-flow.md](registration-flow.md).

| Método | Rota                  | Acesso  | Resultado                                                   |
| ------ | --------------------- | ------- | ----------------------------------------------------------- |
| GET    | /health/live          | Público | 200 processo ativo                                          |
| GET    | /health/ready         | Público | 200 banco disponível; 503 indisponível                      |
| GET    | /openapi.json         | Público | OpenAPI 3.0                                                 |
| POST   | /auth/register        | Público | 201 conta e inscrição gravadas juntas; 409 e-mail duplicado |
| POST   | /auth/login           | Público | 200 usuário público + cookie; 401 credenciais inválidas     |
| POST   | /auth/logout          | Sessão  | 204 sessão revogada e cookie removido                       |
| POST   | /auth/change-password | Sessão  | 204 senha trocada, todas as sessões revogadas               |
| GET    | /users/me             | Sessão  | 200 somente dados próprios                                  |
| PATCH  | /users/me             | Sessão  | 200 conta atualizada; não permite alterar role/cargo/estado |
| POST   | /users/recruiters     | ADMIN   | 201 recrutador criado; 403 para outros perfis               |

Mutações exigem `X-Pointmedia-Request: 1` e JSON. As únicas exceções multipart são `POST /candidates/me/resume`, com um arquivo `file`, e `POST /auth/register`, com um campo `data` e um arquivo opcional `file`. As exceções não liberam outras rotas nem dispensam origem/header; campos extras são rejeitados. Outros corpos não JSON retornam 415, incluindo Transfer-Encoding. Se Origin estiver presente, deve ser igual a WEB_ORIGIN. Browser usa proxy de mesma origem; não há CORS aberto. Clientes CLI também precisam do header. JWT em cookie `pm_session` HttpOnly, SameSite=Lax e Secure em produção, validade padrão de 15 minutos sem refresh nesta etapa. Sessão expirada exige novo login.

E-mail é normalizado com trim/lowercase. Senhas novas têm 12–128 caracteres (passphrases permitidas); login aceita senha não vazia de até 128 caracteres. Campos desconhecidos geram 400. Cadastro não autentica automaticamente. Nunca retornar hash ou token no JSON. Erros: `{statusCode,message,requestId}`. Falhas internas não expõem banco/stack. Login/cadastro/troca de senha: 10 requisições por IP a cada 15 minutos; 429 com Retry-After. Não registrar corpos ou cookies.

Correção autorizada em 02/11/2026: candidato cria conta somente no envio final de inscrição em vaga/banco de talentos. `/auth/register` recebe `{data:{name,email,password,profile,application? ,talentConsentVersion?}}`. Exige perfil inicial válido (`version: 0`, sem compartilhamento geral), senha e exatamente uma finalidade: `application` com os consentimentos já definidos, ou `talentConsentVersion` atual para adesão ao banco. Conta, perfil, referência do currículo opcional, inscrição/consentimento e auditoria são persistidos na mesma transação; falhas não deixam conta avulsa. Resposta 201: `{user,result}`; `result` segue `ApplicationResult`. Cadastro não abre sessão; login posterior usa a senha fornecida. E-mail já existente retorna 409 sem alterar a conta. Candidatura tardia mantém as regras existentes de prazo e adesão opcional ao banco.

Com arquivo, a mesma rota aceita multipart com um campo `data` (JSON) e um `file` PDF/DOCX de até 5 MiB; dados até 128 KiB. Arquivo inválido impede a criação da conta e arquivo preparado é removido se a transação falhar. Cadastro avulso com somente nome/e-mail/senha é rejeitado. `/cadastro` deixa de oferecer formulário independente e direciona às oportunidades ou ao destino de inscrição válido.

Editar e-mail nesta fundação não constitui verificação de posse. Antes de produção, definir confirmação de e-mail e recuperação de senha com canal transacional. Não há MFA implementado.

## Triagem por vaga — Fase 4

Todas as operações exigem sessão RECRUITER/ADMIN; candidatos recebem 403 e visitantes 401. Mesmas validações de origem, header e campos desconhecidos das rotas existentes.

| Método | Rota                              | Resultado                                                                                                    |
| ------ | --------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| GET    | /screening/jobs/:id/configuration | Configuração atual ou null, valores iniciais e versão da vaga                                                |
| PUT    | /screening/jobs/:id/configuration | Nova versão imutável; exige version atual (0 na primeira gravação); 409 em conflito                          |
| POST   | /screening/jobs/:id/runs          | 201 execução persistida; exige configurationVersion e jobVersion atuais; 409 sem configuração ou em conflito |
| GET    | /screening/jobs/:id/ranking       | Última execução, indicador stale, estatísticas reais e itens ordenados; aceita q, page e pageSize            |

Configuração exige skillsWeight, seniorityWeight, salaryWeight e mandatorySkillsShare inteiros entre 0 e 100, requireCompleteData booleano e version. Os três pesos principais somam 100. Score pode ser null; ausência de dados e critério não aplicável são estados distintos. Histórico não é sobrescrito; mudanças nos insumos exigem reprocessamento. Nenhuma dessas rotas aprova, rejeita ou muda etapas.

## Processo seletivo — Fase 5

Seis operações adicionadas ao módulo Applications: resumo interno, alteração de etapa, histórico interno, consulta/criação de notas e histórico próprio. Contrato detalhado em [phase5.md](phase5.md). Candidaturas retornam `version` e os seis estados; listagens aceitam `status` opcional.

Fluxo confirmado pelo usuário: Recebida → Em triagem → Pré-selecionada → Entrevista → Aprovada; reprovação em qualquer etapa aberta, sem reabertura de decisão final. Toda transição é humana, exige versão atual e justificativa interna. A mensagem pública é opcional e aparece apenas no portal/comprovante autenticado. Histórico público não contém notas, justificativas nem identidade do RH. Históricos/notas têm paginação de até 50 itens, ordem estável e acesso por perfil/titular. Escritas preservam auditoria na mesma transação; concorrência de versão retorna 409.

## Indicadores e IA opcional — Fase 6

`GET /analytics/recruitment` e `/analytics/recruitment/export` exigem RH/admin, aceitam `days=7|30|90|365` (padrão 30) e `jobId` opcional. Retornam agregados e CSV sem PII, com dias de calendário em Brasília, funil da coorte, estado atual, conversão e tempo até primeira triagem. Média/faixas de compatibilidade só existem para uma vaga com execução atualizada. `GET /analytics/administration` exige ADMIN e aceita apenas `days`; agrega contas, vagas e auditoria, sem atores individuais.

`GET /intelligence/status` informa a disponibilidade ao RH/admin. O usuário escolheu manter IA preparada e desativada: não há endpoint de análise nem envio externo. Interface e fronteira de extração estão isoladas; nenhum dado de currículo modifica perfil/ranking/decisão por esse módulo. Regras completas, denominadores e limites em [phase6.md](phase6.md).

## Configuração operacional — Fase 8

Sem novas rotas ou alteração de payloads nesta fase; OpenAPI permanece em 0.7.1. `TRUSTED_PROXY_IPS` configura IPs explícitos de proxies controlados; sem configuração, headers encaminhados não alteram o IP usado pelo limiter. `RESUME_STORAGE_DIR` exige caminho absoluto privado em produção. O proxy externo deve sobrescrever os headers encaminhados conforme a topologia real. Testes HTTP locais confirmaram cookie Secure/HttpOnly/Lax em modo de produção, respostas sem cache e resistência à falsificação da cadeia de IPs. Isso não substitui a validação TLS no destino. Configuração e limites em [deployment.md](deployment.md); evidências em [validation-phase8.md](validation-phase8.md).
