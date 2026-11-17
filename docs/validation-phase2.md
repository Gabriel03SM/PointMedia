# Validação funcional da Fase 2 — 29/10/2026

## Resultado

Portal do candidato, currículo privado e gestão/consulta pública de vagas implementados e integrados ao PostgreSQL. **80 testes aprovados**, incluindo regressões da fundação. Tipagem, lint e build passaram. A Fase 3 não foi iniciada.

A validação funcional não declara igualdade tipográfica final: fontes e logos oficiais continuam pendentes. As imagens originais não foram alteradas. Nenhum commit, publicação, reset ou remoção de contas existentes foi realizado.

## Autorizações e escopo visual

O usuário autorizou criar o portal do candidato, ausente nas imagens, determinou senha para os cadastros de vaga/banco de talentos e aprovou modal de formulário para criar/editar vagas. Solicitou checkbox “Não se aplica” nos campos pertinentes. Outras páginas sem referência exigem consulta prévia.

Referências utilizadas: Entrar/Entrar-1.png no cadastro; Form.png nos campos do portal e detalhe público; Vagas.png na gestão; Candidatos.png na listagem; Triagem - Modal perfil candidato.png no modal de perfil. Reutilizados Brand, controles de senha, feedback e estrutura de conta. AccountShell centraliza o logout sem duplicar a lógica da fundação.

A gestão preserva sidebar preta, conteúdo claro, dois painéis brancos e chips pretos/azuis. Busca/seleção de vagas fica recolhida para preservar a organização principal. Modais têm foco nativo, fechamento por teclado e conteúdo rolável. Corrigida a perda de centralização causada pelo reset CSS. Navegação essencial e formulários foram conferidos em viewport móvel.

Diferenças funcionais deliberadas: nenhum ranking, score, resumo por IA, decisão de seleção ou indicador de processo foi inventado. O modal mostra dados declarados, experiência e formação reais; modalidade fica não informada enquanto não houver vínculo de candidatura. Vagas públicas usam “Ver vaga”, pois o envio de candidatura pertence à Fase 3. A página informa esse limite e oferece acesso ao cadastro/perfil, sem alegar candidatura enviada.

## Funcionalidades verificadas

- Cadastro com senha, login posterior e portal do candidato. Falha de conexão no login após cadastro permite repetir somente o login, sem tentar criar a conta outra vez.
- Perfil com dados pessoais básicos, área profissional, localização, senioridade, pretensão, links, competências, experiências e formação. Campos aplicáveis exigem valor ou ausência explicitamente escolhida. Datas e dinheiro validados no frontend/backend.
- Perfil e currículo próprios: edição, substituição, download e remoção. Remover perfil preserva conta/senha. Versão impede sobrescrita de edição concorrente.
- Compartilhamento voluntário com RH. Revogação bloqueia novas consultas/downloads pelo recrutamento; outros candidatos não podem acessar esses dados.
- Listagem interna paginada, busca por nome/área/localização, filtros de senioridade/competência e ordenação. Modal e links de currículo funcionais.
- Vagas: rascunho, edição, publicação com prazo futuro, encerramento e cancelamento lógico. Requisitos obrigatórios/diferenciais normalizados, flags de ausência, valores Decimal e auditoria.
- Prazo efetivo respeitado no servidor. Publicação expirada sai da listagem aberta; detalhe informa encerramento. Rascunho/cancelada não são públicos e não há reabertura implícita.
- Horário do formulário convertido explicitamente de America/Sao_Paulo para instante ISO. Validação independe do fuso local do navegador.

## Testes executados

| Camada                        | Resultado              | Evidência principal                                                                         |
| ----------------------------- | ---------------------- | ------------------------------------------------------------------------------------------- |
| Node test runner              | 9 testes               | Configuração e isolamento do PostgreSQL local                                               |
| Jest unitário API             | 26 testes / 4 suítes   | Fundação, proteção multipart, PDF/DOCX e regressões de conteúdo                             |
| Vitest / Testing Library      | 10 testes / 4 arquivos | Login, acesso público, senha/cadastro, recuperação de falha parcial, dinheiro e fuso        |
| Jest / Supertest / PostgreSQL | 29 testes / 3 suítes   | Fundação e 12 casos de candidatos/vagas/arquivos                                            |
| Playwright / Chromium         | 6 testes               | Home pública, conta, portal, currículo, gestão/publicação, consulta pública e modal interno |
| Tipagem                       | Passou                 | Shared, API e frontend                                                                      |
| ESLint                        | Passou                 | Sem warnings de lint                                                                        |
| Build                         | Passou                 | Shared, NestJS e React/Vite                                                                 |
| Formatação                    | Verificada             | Fontes e documentação implementados; materiais originais preservados                        |

Os testes HTTP cobrem RBAC/isolamento, escolha de ausência, requisitos duplicados e normalização expansiva, versão, prazo, cancelamento, compartilhamento/revogação, metadados sem chaves privadas, download auditado, arquivo falso, campos multipart extras, limite e substituição PDF→DOCX. Fixtures e limpeza ficam restritas a identificadores aleatórios de um banco `_test`; não houve limpeza global.

Os testes de navegador usam API/banco reais, sem simular respostas HTTP. Cobrem recarga/persistência, cadastro com senha, portal, bloqueio de candidato na gestão, envio/download privado, modal de vaga com Não se aplica, edição, publicação e detalhe público. RH consulta perfil compartilhado e baixa currículo. Portal e modal foram verificados sem overflow horizontal em 375×812.

Os primeiros testes internos navegavam antes da resposta de login e foram corrigidos para aguardar a confirmação visível da autenticação. A execução final de 6 testes passou e encerrou com código zero; nenhum timeout foi aumentado para encobrir a falha.

## Banco, arquivos e ambiente

Migration aditiva `202610290001_candidates_jobs` aplicada em `pointmedia` e `pointmedia_test`, preservando a fundação e as contas existentes. Inclui 8 tabelas, enums, índices, FKs e checks. PostgreSQL 17 portátil continua em 127.0.0.1:55432, sem Docker.

No sandbox, a CLI Prisma encontrou a restrição já conhecida de realpath no diretório temporário. A geração do Client foi executada pela CLI oficial 7.10.0 com cache de diretório temporário apontando para uma pasta gravável do workspace, em um preloader isolado em `.tmp`, sem alterar dependências ou permissões. O SQL foi gerado pelo schema engine oficial instalado via diff entre os schemas e aplicado por applyMigrations com o controle normal de histórico/checksum. A CLI de diff não produziu arquivo útil nesse ambiente; sua saída vazia foi rejeitada antes da aplicação. Não houve marcação artificial de migration, schema push ou reset. Protocolo consultado no [código oficial do Prisma](https://raw.githubusercontent.com/prisma/prisma-engines/0edf323efd1d98336f3f0a68684b56f689b900d3/schema-engine/json-rpc-api/src/types.rs).

Integração e E2E foram executados após a preparação do banco pelo engine, usando as suítes e o coordenador exportado já existentes. Isso não equivale a executar integralmente os comandos npm que incluem a CLI de migration dentro do sandbox. Para PowerShell normal, os comandos documentados continuam sendo db:generate, db:migrate, test:integration e test:e2e. Opções de preserve-symlinks e a checagem auxiliar do Vitest continuam restritas aos processos de verificação, conforme o relatório da fundação.

Currículos: limite de 5 MiB, MIME/extensão/assinatura PDF e estrutura ZIP/Open XML do DOCX, CRC e limites de expansão/quantidade. Recusados pacotes criptografados/ZIP64 e estruturas de macros/objetos incorporados detectadas. Nomes em português são normalizados corretamente. Dados ficam em `.local/resumes` ou `.local/test-resumes`, com chave UUID, fora de public/dist; download como attachment, cache desabilitado e início registrado na auditoria. A inspeção estrutural **não equivale a antivírus ou certificação de ausência de conteúdo malicioso**. Referências: [ZIP APPNOTE](https://pkware.cachefly.net/webdocs/casestudies/APPNOTE.TXT) e [estrutura WordprocessingML](https://learn.microsoft.com/en-us/office/open-xml/word/structure-of-a-wordprocessingml-document).

Substituição só remove o arquivo anterior após commit; falha na gravação de metadados tenta remover o novo arquivo. Reconciliação remove apenas chaves UUID órfãs com mais de uma hora, sem excluir arquivos baseando-se em consulta falha ao banco. Não são expostos caminho, storageKey, SHA-256 ou conteúdo do currículo nos JSONs/auditoria.

Nenhuma dependência nova foi instalada. Foram observados avisos não fatais: chunk frontend acima de 500 kB e depreciação de consultas enfileiradas pelo driver pg 8, além dos avisos de cor das ferramentas. Otimização de bundle e avaliação do driver permanecem para preparação de produção; não houve atualização de major version.

## Artefatos e execução local

Alterações em `apps/api/src/jobs`, `apps/api/src/candidates`, schema/migration Prisma, segurança/parser HTTP, `packages/shared`, formulários/rotas/layout em `apps/web`, testes e documentos/contrato OpenAPI. Capturas verificadas:

- `.tmp/phase2-jobs.png`
- `.tmp/phase2-job-modal.png`
- `.tmp/phase2-candidate-modal.png`
- `.tmp/phase2-portal-desktop.png`
- `.tmp/phase2-portal-mobile.png`

A checagem do endereço de desenvolvimento encontrou App.tsx antigo no cache do watcher Vite e inicializadores antigos disputando a porta da API. As instâncias identificadas do projeto foram encerradas, preservando o PostgreSQL. Para inspeção local, `npm run app:start` compila o código atual e inicia diretamente dois processos Node ocultos, sem árvore de watchers. O preview programático é compartilhado com o coordenador E2E e mantém proxy `/api` na mesma origem, ligado somente ao loopback.

Foram verificados início, `app:status`, `app:stop` e novo `app:start`. A parada liberou 3000/55173 e manteve 55432 disponível. O inicializador verifica PID e horário de criação antes de encerrar seus processos; não encerra processos externos por nome ou porta. A prontidão exige HTML e health JSON com banco disponível pelo proxy. A checagem utiliza fetch do Node; a tentativa anterior com Invoke-WebRequest não confirmou prontidão nesse ambiente e encerrou seus próprios processos com segurança. Logs em `.local/run/api.out.log`, `api.err.log`, `web.out.log` e `web.err.log`; manifest de processos em `.local/run/app.json`.

Rotas locais: `/`, `/cadastro`, `/candidato`, `/perfil`, `/gestao/vagas` e `/gestao/candidatos`, na origem http://localhost:55173. Páginas internas e arquivos continuam protegidos.

Após a recompilação, o Chromium confirmou nesse endereço a Home pública, o formulário de cadastro com senha, o redirecionamento da gestão sem sessão e a saúde da API/banco pelo proxy, sem erro JavaScript de página. Conferência estática do OpenAPI: 19 rotas, 27 operações com IDs únicos e 233 referências internas resolvidas. O bundle frontend não contém os valores configurados de JWT_SECRET, DATABASE_URL, TEST_DATABASE_URL ou SEED_PASSWORD; essa verificação específica não equivale a uma auditoria completa de segredos.

## Pendências

- Logos/fontes oficiais e comparação visual final; não declarar pixel perfect ou WCAG AA completa.
- Envio/vínculo de candidaturas, regra de inscrição tardia e banco de talentos completo: Fase 3. Form.png/Banco.png deverão usar senha no cadastro conforme orientação do usuário. A mensagem de sucesso de Banco.png não pode ser exibida antes da persistência real.
- Ranking, IA, notas/decisões de seleção, métricas e administração completa: fases previstas.
- Recuperação de senha, retenção/direitos LGPD, backups, TLS, monitoramento e validação de produção: pendentes antes de dados reais.
- Execução persistente após o encerramento de uma sessão do agente não é garantida. Se o ambiente encerrar os processos, execute `npm run app:start` no PowerShell normal. O modo dev alternativo exige manter o terminal aberto.
