# Correção — conta de candidato no envio final da inscrição

Autorizada em 02/11/2026. O usuário esclareceu: “a criação de conta do candidato é feita no momento da inscrição na vaga/banco de talentos, apenas”, e confirmou: “Somente no envio final da inscrição, que deve solicitar senha para conta também”. Esta correção substitui o cadastro independente das fases anteriores; não inicia a Fase 8.

## Regra e funcionamento

O visitante preenche nome, e-mail, senha, perfil profissional, currículo opcional e autorizações no próprio formulário da vaga ou do banco de talentos. Abrir, preencher ou abandonar o formulário não cria uma conta. O login orienta o primeiro acesso por esses dois fluxos; links antigos de `/cadastro` redirecionam para o destino válido de inscrição ou para as oportunidades.

`POST /api/auth/register` exige os dados completos da inscrição. Nome/e-mail/senha isolados são rejeitados. O backend reutiliza as validações de perfil, arquivos, prazo e consentimentos e grava conta CANDIDATE, perfil, referência do currículo, candidatura ou adesão ao banco e auditoria na mesma transação PostgreSQL. Não existe escolha pública de role. E-mail duplicado retorna 409 sem alterar conta, senha ou inscrição anteriores; sob concorrência, somente um envio cria a conta.

Se a vaga encerrar durante o preenchimento, continuam valendo as regras anteriores: com autorização específica para o banco, a participação pode ser registrada somente nele; sem essa autorização, o envio falha e a nova conta também não é gravada. Inscrição em vaga não implica participação no banco nem compartilhamento geral do perfil.

O arquivo é validado e preparado em storage privado; sua referência entra na transação. Em falha, o arquivo preparado é removido; se a remoção física falhar, permanece sem referência e é tratado pela reconciliação existente. Contas já existentes continuam usando login e os fluxos autenticados anteriores.

Após a gravação, o frontend entra com a senha fornecida. Se somente esse login posterior falhar, a inscrição permanece concluída e a interface oferece acesso à conta, sem repetir a criação. O endpoint de cadastro não retorna senha, hash ou token nem abre sessão automaticamente. Contrato detalhado em [api-contract.md](api-contract.md) e OpenAPI 0.7.1 em `openapi.json`.

## Verificação

**194 testes aprovados** no estado final, com API/PostgreSQL reais nas suites de integração e navegador.

| Camada             | Resultado                                                                                                                                                           |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Configuração local | 9 testes Node aprovados                                                                                                                                             |
| API unitária       | 50 testes / 6 suítes aprovados                                                                                                                                      |
| Frontend           | 21 testes / 6 arquivos aprovados; inclui ausência de cadastro avulso, redirecionamentos e recuperação após falha do login                                           |
| HTTP/PostgreSQL    | 93 testes / 8 suítes aprovados na rodada completa final, saída 0, em 90,611 s; 8 casos novos de inscrição                                                           |
| Navegador          | 21 testes Chromium aprovados, saída 0, em 1,8 min; inclui inscrição na vaga/banco, conta inexistente antes do envio, currículo inválido e persistência após sucesso |
| Compilação/tipagem | Build completo de shared/API/frontend e typecheck dos workspaces aprovados                                                                                          |
| Lint/formatação    | Lint aprovado; alterações finais incluídas na conferência de formatação                                                                                             |
| OpenAPI            | JSON válido, 42 rotas, 54 operações únicas e 462 referências locais resolvidas                                                                                      |
| Postman            | GET do contrato: 3 asserções aprovadas, saída 0. POST de cadastro incompleto: HTTP 400 esperado, 2 asserções aprovadas; CLI retorna saída 1 por HTTP não exitoso    |

Os oito casos novos HTTP verificam cadastro avulso/finalidade ausente; senha, perfil e consentimento inválidos; arquivo inválido/JSON multipart malformado; rollback de conta/perfil e remoção física do arquivo preparado quando a vaga não existe; banco persistido com login e duplicidade; prazo vencido sem adesão; vaga aberta com currículo privado e sem adesão implícita; concorrência pelo mesmo e-mail. As regressões existentes exercitam permissões, acesso privado, prazo, ranking, decisões humanas e dashboards.

Capturas atuais da vaga em 320 px, banco em 1366 px e login em 320 px foram inspecionadas em `.tmp/phase7-{vaga-publica,banco,login}-*.png`. A suíte preserva as verificações de 320/375/768/1366 px. Form.png e Banco.png orientam os formulários; senha usa o PasswordInput e os controles existentes. Nenhuma identidade visual foi substituída.

## Arquivos

- `apps/api/src/auth/{registration.dto,candidate-registration.service}.ts`, `auth.controller.ts` e `auth.module.ts`: entrada validada e orquestração transacional.
- `apps/api/src/users/users.service.ts`, `candidates/{profiles.service,resumes.service}.ts`, `applications/{applications.service,applications.module}.ts`: reutilização das gravações existentes dentro da transação da inscrição; operações autenticadas preservadas.
- `apps/api/src/{app.ts,common/security.ts}` e `common/security.spec.ts`: limite dos dados e multipart somente nas rotas exatas autorizadas, com proteção de origem e rate limiting mantidos.
- `packages/shared/src/index.ts` e `apps/web/src/lib/api.ts`: entrada completa, resultado e envio JSON/multipart.
- `apps/web/src/features/candidates/{ProfessionalForm.tsx,profile-schema.ts}`, `applications/SubmissionForm.tsx`, `auth/{LoginPage,RegisterPage}.tsx`: senha e conta no envio final, login existente e compatibilidade dos links antigos.
- `apps/api/test/{registration.integration.spec,registration-fixtures,auth.integration.spec}.ts`; `apps/web/src/features/{auth/LoginPage.test,auth/RegisterPage.test,applications/SubmissionForm.test}.tsx`; `tests/e2e/{fixtures,auth.spec,phase2.spec,phase3.spec,phase7.spec}.ts`: casos novos e regressões adaptadas à regra autorizada. Fixtures de contas existentes são criadas diretamente somente no banco `_test`; os fluxos novos de cadastro passam pela API real.
- README, OpenAPI, contrato, rastreabilidade, mapeamento visual e plano atualizados.

## Ambiente e pendências

Sem migration, alteração de dados existentes, nova dependência ou serviço externo. O inicializador do projeto reiniciou somente os processos registrados da aplicação e confirmou prontidão em `http://localhost:55173/`. As contas anteriores e o PostgreSQL foram preservados. O banco de teste recebe somente fixtures fictícias; nenhuma conta real foi criada para a verificação.

Mantidos os contornos locais do sandbox: `NODE_OPTIONS` de preservação de symlinks nos processos de verificação; Vitest com o ambiente jsdom embutido pelo módulo temporário documentado em [validation-phase7.md](validation-phase7.md); integração/navegador pelos coordenadores existentes após build. Não se declara execução integral dos wrappers npm que reaplicam migrations. O caso unitário de recuperação foi ajustado para preencher os dados por eventos de alteração e clique, evitando o custo de digitar cada caractere e consultar repetidamente toda a árvore acessível; sem aumentar o timeout ou mudar a aplicação para atender ao teste.

Evidências em `.tmp/signup-{build-final,types-final,api-unit,web-unit-final,integration-final,e2e,lint-final,postman-contract,postman-reject}.log`. O CLI instalado não oferece `postman status`; a tentativa retornou “unknown command”, sem prejudicar os testes locais de request. Permanecem os avisos conhecidos de bundle, pg e runner. Confirmação de e-mail, recuperação de senha, administração completa, LGPD e produção continuam pendentes como documentado anteriormente. Sem commits ou publicação; a Fase 8 ainda depende de aprovação.
