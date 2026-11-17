# Validação da Fase 8 — 02/11/2026

O escopo local autorizado em [phase8.md](phase8.md) foi implementado e verificado. Os 13 passos da seção 19 das instruções funcionaram em um cenário contínuo com navegador, API e PostgreSQL reais. A conta do candidato continua sendo criada somente no envio final aceito da inscrição, com senha no mesmo formulário. Isso não conclui os requisitos administrativos/LGPD ainda pendentes nem libera a aplicação para produção.

O usuário informou que não possui hospedagem nem domínio. Nenhum provedor foi contratado, serviço externo configurado ou site publicado. Não houve commit, alteração de schema, nova migration, dependência adicionada, mudança do `.env` local ou movimentação dos currículos existentes.

## Implementação e arquivos

| Mudança                                          | Arquivos                                                                                                                                                             | Resultado verificado                                                                                                                                                                                                                   |
| ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Proxy explicitamente autorizado                  | `apps/api/src/config.ts`, `apps/api/src/app.ts`, `.env.example`                                                                                                      | `TRUSTED_PROXY_IPS` aceita somente IPs explícitos, limitado a 16. Padrão sem confiança em headers encaminhados. Rate limiting considera o cliente da cadeia autorizada.                                                                |
| Currículos em diretório persistente configurável | `apps/api/src/config.ts`, `apps/api/src/candidates/resume-storage.ts`, `.env.example`                                                                                | `RESUME_STORAGE_DIR` absoluto obrigatório em produção; rejeição dos diretórios públicos conhecidos e do override em testes. Desenvolvimento mantém o storage anterior. O mesmo arquivo é recuperado por uma nova instância do storage. |
| Ambiente de produção explícito                   | `apps/api/src/config.ts`                                                                                                                                             | Processo iniciado com `NODE_ENV=production` não carrega implicitamente o `.env` local. Erros expõem nomes de campos, sem valores de segredos.                                                                                          |
| Verificação local do release                     | `scripts/check-production.mjs`, `package.json`                                                                                                                       | Valida configuração, artefatos legíveis e diretório privado existente/acessível, incluindo caminhos reais. Não cria diretórios, conecta ao banco ou aplica migrations.                                                                 |
| Modelos operacionais revisáveis                  | `deploy/api.env.example`, `deploy/nginx.conf.example`, `deploy/pointmedia-api.service.example`, `docs/deployment.md`                                                 | Exemplos de ambiente, proxy HTTPS e supervisão; procedimento de backup coerente, restauração isolada e rollback condicionado ao schema. Modelos não instalados nesta máquina.                                                          |
| Fluxo contínuo e segurança HTTP                  | `tests/e2e/phase8.spec.ts`, `apps/api/test/production-security.integration.spec.ts`, `apps/api/src/config.spec.ts`, `apps/api/src/candidates/resume-storage.spec.ts` | Cobertura real de inscrição, seleção, banco, cookie de produção, headers, proxy e armazenamento privado.                                                                                                                               |
| Verificação dos próprios E2E                     | `tests/tsconfig.json`, `tests/e2e/phase7.spec.ts`, `package.json`                                                                                                    | Tipagem estrita dos testes de navegador incluída em `npm run typecheck`; ajustes de tipos no teste existente, sem mudar o produto.                                                                                                     |
| Execução e isolamento dos testes                 | `scripts/run-e2e.mjs`, `apps/api/test/run-integration.ts`                                                                                                            | E2E aceita seleção por argumento; coordenadores padrão limpam overrides de proxy/storage ao preparar o ambiente de teste.                                                                                                              |
| Rastreabilidade                                  | `README.md`, `docs/requirements.md`, `docs/implementation-plan.md`, `docs/architecture.md`, `docs/api-contract.md`, `docs/phase8.md`, este relatório                 | Escopo validado e pendências identificados sem alterar os documentos de instruções originais.                                                                                                                                          |

## Fluxo principal comprovado

Um único teste em `tests/e2e/phase8.spec.ts` executou os passos abaixo com contas fictícias distintas e contextos de navegador separados. Os passos 3 e 4 preservam a correção do usuário: preencher os dados não cria conta; o envio final cria conta e inscrição juntos.

| Passo das instruções                    | Evidência                                                                                                                                  |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| 1. Admin cadastra RH                    | API autenticada retorna 201/RECRUITER; a mesma operação pelo RH retorna 403. A tela administrativa correspondente continua pendente.       |
| 2. RH cria e publica vaga               | Formulário e publicação pela interface, confirmados na API.                                                                                |
| 3. Candidato cadastra dados e currículo | Nome, e-mail, senha, perfil e PDF preenchidos; login antes do envio final retorna 401.                                                     |
| 4. Candidato se inscreve                | Consentimento específico, envio final e comprovante autenticado.                                                                           |
| 5. Sistema valida prazo                 | Data da inscrição anterior ao encerramento; validação sob concorrência/prazo também coberta pela suíte HTTP existente.                     |
| 6. Sistema armazena candidatura         | Comprovante após recarga; repetição retorna a mesma inscrição.                                                                             |
| 7. Sistema calcula compatibilidade      | RH salva critérios e gera execução persistida.                                                                                             |
| 8. RH consulta ranking                  | Um resultado real com nota positiva; candidato recebe 403.                                                                                 |
| 9. RH consulta perfil e currículo       | Modal e PDF acessíveis no contexto da candidatura; consulta genérica sem compartilhamento retorna 404.                                     |
| 10. RH movimenta o processo             | Nota interna e quatro decisões humanas pela interface até aprovação após entrevista.                                                       |
| 11. Candidato acompanha andamento       | Estado aprovado e mensagem pública; histórico sem justificativas, autoria e notas internas.                                                |
| 12. Interessado após encerramento       | Vaga encerrada, senha, DOCX e consentimento explícito; somente banco, sem candidatura retroativa. Comprovante de outra pessoa retorna 404. |
| 13. RH considera talentos futuros       | Busca real no banco e acesso autorizado ao currículo; candidato sem adesão não é acessível pelo banco.                                     |

IA permaneceu desativada. Não houve envio de mensagens ou currículos a um provedor externo.

## Resultados executados

| Camada                              | Resultado                                | Evidência local                                                                                                   |
| ----------------------------------- | ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Configuração do PostgreSQL portátil | 9/9                                      | `.tmp/phase8-local-unit.log`                                                                                      |
| Unidade da API                      | 55/55, 7 suítes                          | `.tmp/phase8-api-unit-final.log`                                                                                  |
| Unidade do frontend                 | 21/21, 6 arquivos                        | `.tmp/phase8-web-unit.log`                                                                                        |
| HTTP/PostgreSQL                     | 96/96, 9 suítes                          | `.tmp/phase8-integration-verified.log`                                                                            |
| Navegador Chromium                  | 22/22, incluindo o fluxo contínuo        | `.tmp/phase8-e2e-verified.log`                                                                                    |
| Total das suítes                    | **203/203**                              | Sem testes ignorados nessas execuções finais                                                                      |
| Verificador de produção             | 7 verificações adicionais                | `.tmp/phase8-preflight.log`                                                                                       |
| Postman local                       | 4 asserções adicionais                   | `.tmp/phase8-postman.log`                                                                                         |
| Tipagem, incluindo os E2E           | Aprovada                                 | `.tmp/phase8-types-final.log`                                                                                     |
| Build dos workspaces/API final      | Aprovado                                 | `.tmp/phase8-build.log`, `.tmp/phase8-api-build-final.log`                                                        |
| Lint e formatação                   | Aprovados; incluindo scripts e novos E2E | `.tmp/phase8-lint-final.log`, `.tmp/phase8-format-final.log`; checagem explícita dos arquivos fora do glob padrão |

As quatro asserções Postman verificaram prontidão com PostgreSQL, `no-store`, `nosniff`/ausência de `X-Powered-By` e ID de correlação em `GET /api/health/ready`, sem publicar relatórios. O comando `postman status` não é suportado pela versão instalada; essa limitação já havia sido diagnosticada e reportada na etapa anterior, sem repetir a operação remota.

As sete verificações do comando de produção usaram um diretório temporário próprio e variáveis fictícias, sem conexão ao banco: configuração válida, modo incorreto, segredo inválido sem vazamento, storage público, diretório inexistente e saídas CLI de sucesso/falha. Não constituem um teste de infraestrutura publicada.

Lint e formatação foram conferidos ao finalizar. O smoke da aplicação reiniciada confirmou o bundle atual, páginas HTTP 200, prontidão, acesso anônimo negado, login/logout administrativo, agregados, CSV e IA desativada. Endereço local: http://localhost:55173/.

## Falhas encontradas e limites da execução

As primeiras tentativas do novo E2E expuseram dois problemas do teste: a fixture DOCX precisava ser invocada e o seletor genérico de status também encontrava o indicador de carregamento. Foram corrigidos usando o arquivo produzido e o feedback específico, sem alterar a interface ou regras da aplicação. A inclusão de tipagem dos E2E também apontou acessos de arrays no teste da Fase 7; os tipos foram ajustados e a suíte final passou.

A revisão final removeu uma dependência de preparação dos dois novos testes de storage/segurança: ambos agora criam a pasta temporária pai antes de gerar seu diretório próprio. Os casos afetados foram repetidos e passaram (um unitário e três HTTP, em `.tmp/phase8-storage-recheck.log` e `.tmp/phase8-security-recheck.log`), com lint/formatação dos dois arquivos aprovados. Esses quatro casos já pertencem ao total de 203; não são contados em duplicidade.

Uma tentativa de rodar integração e E2E simultaneamente interferiu na asserção de total global de usuários do dashboard. As duas suítes usam a mesma base `_test`. A execução final foi sequencial: 22 E2E seguidos dos 96 testes HTTP, todos aprovados. A asserção do dashboard não foi enfraquecida. A exigência de execução em sequência ficou documentada.

Neste sandbox Windows, `NODE_OPTIONS=--preserve-symlinks --preserve-symlinks-main` foi necessário para evitar `EPERM` ao resolver caminhos. A suíte frontend usou o ambiente jsdom nativo do Vitest por um módulo temporário, pois a detecção automática encontra a mesma restrição de caminhos. Integração e E2E foram executados por coordenadores temporários que preservam a exigência de banco `_test`, sem repetir migrations já aplicadas. Não houve nova migration nesta fase. Os wrappers padrão com aplicação de migrations não foram revalidados de ponta a ponta no sandbox.

Ocorreram avisos não fatais do Vitest/DevTools e de consultas concorrentes no cliente `pg` durante as suítes existentes; não impediram as aprovações. O caso negativo que envia `X-Forwarded-For` sem proxy autorizado também provoca um diagnóstico do limiter; o teste confirma que os endereços forjados não evitam o 429. Os logs temporários são evidência desta máquina e não substituem um relatório de CI versionado.

## Pendências antes de produção

- Hospedagem, domínio, certificados e topologia real ainda não definidos pelo usuário.
- `npm audit --omit=dev` foi tentado duas vezes e falhou no endpoint remoto do registro. **Não há resultado de auditoria de vulnerabilidades**; isso não significa ausência de vulnerabilidades.
- Modelos Nginx/systemd não executados neste Windows; TLS real, CSP no destino, limites externos, supervisão/parada, firewall, monitoramento e persistência após reinício precisam de ensaio no ambiente escolhido.
- Backup/restauração documentados, mas o ensaio de restauração isolada ainda não foi executado. A parada controlada precisa ser verificada no destino antes da captura conjunta de banco/arquivos.
- U01: telas e operações administrativas completas de usuários, logs e sistema continuam pendentes; cadastro RH já funciona pela API restrita.
- L01: política e funções completas de retenção física, exclusão e direitos dos titulares ainda precisam de definição e implementação. O prazo do banco não apaga automaticamente todas as finalidades.
- D01: duas referências administrativas e auditoria integral WCAG pendentes. Recuperação de senha, confirmação de e-mail, MFA e renovação automática de sessão não estão implementados.

O trabalho desta fase termina na validação e preparação local. Uma próxima etapa depende de aprovação do usuário; não há autorização implícita para contratar, publicar ou operar com dados reais.
