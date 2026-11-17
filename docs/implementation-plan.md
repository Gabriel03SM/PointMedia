# Plano incremental

## Fase 1 — fundação funcional validada

Implementação e verificação funcional realizadas. Foram aprovados 48 testes iniciais; a correção da entrada pública passou por 5 testes frontend e 3 E2E. Evidências e limites estão em [validation.md](validation.md). Refinamento visual detalhado e preparação de produção permanecem nas fases previstas.

1. Inspecionar instruções, diretório e imagens; preservar originais.
2. Registrar arquitetura, requisitos, modelo, mapeamento visual e decisões.
3. Criar npm workspaces, NestJS, React/Vite e contratos compartilhados.
4. Configurar PostgreSQL, Prisma, migration, seed e env validado.
5. Implementar cadastro candidato (API), login, sessão, logout, troca de senha, consulta/edição própria, RBAC e criação de recrutador pelo administrador (API).
6. Integrar login e perfil, com validação, estados de erro/carregamento e navegação protegida.
7. Executar geração Prisma, lint, tipagem, build, testes de unidade, integração com PostgreSQL e fluxo de navegador quando o ambiente permitir. Documentar impedimentos sem declarar sucesso.
8. Apresentar resultados e aguardar aprovação para a Fase 2.

## Fase 2 — funcionamento validado

O usuário autorizou prosseguir e criar o portal do candidato, com senha para acesso posterior. Também autorizou o modal de formulário de vagas e solicitou a opção “Não se aplica” nos campos pertinentes. Outras páginas sem imagem exigem consulta prévia. Contrato, escopo e decisões em [phase2.md](phase2.md).

Perfil profissional, currículo privado, compartilhamento com RH, busca e gestão/consulta pública de vagas integrados ao PostgreSQL. 80 testes aprovados, incluindo regressões, com tipagem, lint e build. Resultados e limites em [validation-phase2.md](validation-phase2.md). Logos/fontes e comparação visual final permanecem pendentes. A continuidade para a Fase 3 foi posteriormente autorizada pelo usuário.

## Fase 3 — funcionamento validado

Usuário autorizou iniciar a fase e delegou a escolha do prazo do banco de talentos. Implementados envio real de candidaturas, prazo e unicidade no PostgreSQL, comprovante próprio, consulta pelo RH e banco de talentos independente com consentimento separado. Participação por 180 dias configuráveis; revogação/expiração bloqueiam consultas pelo banco e renovação preserva histórico.

110 testes aprovados nas camadas local, unitária, HTTP/PostgreSQL e navegador, incluindo regressões. Detalhes e limites em [validation-phase3.md](validation-phase3.md); contrato e decisões em [phase3.md](phase3.md). A continuidade para a Fase 4 foi posteriormente autorizada após a aplicação dos logos oficiais/Poppins.

## Fase 4 — triagem determinística

Autorização registrada em [phase4.md](phase4.md) e [brand-assets.md](brand-assets.md). Critérios versionados por vaga, ranking explicável, cobertura dos dados, revisão humana e reprocessamento com histórico implementados em `screening`, com integração nas páginas de triagem e vagas. A nota não decide contratação nem modifica candidaturas.

Retomada concluída em 31/10/2026: 144 testes aprovados (9 locais, 46 unitários API, 17 frontend, 61 HTTP/PostgreSQL e 11 navegador), além de três asserções Postman. Tipagem, lint e build passaram. A migration de triagem, já presente no banco de testes, foi aplicada ao desenvolvimento sem reset; as contagens das 13 tabelas anteriores foram preservadas. Resultados e limites em [validation-phase4.md](validation-phase4.md).

## Fase 5 — funcionamento validado

Autorizada pela solicitação de continuidade em 01/11/2026. O usuário confirmou avanço sequencial, reprovação em qualquer etapa aberta, aprovação após entrevista e decisões finais sem reabertura. Etapas versionadas, histórico, notas internas e acompanhamento público próprio implementados no módulo Applications e no modal/portal existentes. Migration aditiva aplicada com preservação dos dados.

161 testes aprovados, quatro asserções Postman, build, tipagem e lint. Regras/arquivos/evidências em [phase5.md](phase5.md) e [validation-phase5.md](validation-phase5.md). O usuário autorizou explicitamente iniciar a Fase 6 após esta conclusão, sem nova pausa. A Fase 7 continua sujeita à aprovação.

## Fase 6 — escopo autorizado validado

Autorizada explicitamente para começar após a Fase 5. O usuário confirmou indicadores reais e integração de IA preparada e desativada. Dashboards de RH/Admin, filtros por período/vaga, coorte/funil/etapas, tempo até triagem, compatibilidade atualizada por vaga e CSV privado implementados e verificados. Interface de IA e fronteira lexical testadas; sem extração real de arquivos, adapter ou chamada externa.

177 testes aprovados, quatro asserções Postman finais, build, tipagem, lint e formatação. Cinco capturas finais inspecionadas; cabeçalhos móveis corrigidos e cobertos por asserções de não sobreposição. Regras e evidências em [phase6.md](phase6.md) e [validation-phase6.md](validation-phase6.md). A Fase 7 foi posteriormente autorizada.

## Fase 7 — escopo das telas existentes validado

Autorizada em 01/11 e retomada em 02/11/2026. Navegação por teclado, foco em rotas e âncoras, títulos de página, erros relacionados aos campos, contraste e responsividade revisados com as referências e os ajustes de escala já aprovados. Foco inicial do modal de vaga corrigido após falha identificada no navegador; fechamento, reabertura e retorno ao acionador verificados.

182 testes aprovados: 9 locais, 50 unitários API, 17 frontend, 85 HTTP/PostgreSQL e 21 navegador; quatro asserções Postman adicionais. Build, tipagem e lint aprovados. Escopo e limites em [phase7.md](phase7.md) e [validation-phase7.md](validation-phase7.md). O requisito global das 16 referências permanece parcial: cadastro RH e gestão de usuários dependem do módulo administrativo, e não houve auditoria integral WCAG. Sem alteração de arquitetura, schema, dependências ou regras de negócio. Fase 8 aguarda nova aprovação.

## Continuidade aprovada

O usuário aprovou a continuidade e confirmou que os requisitos estão nos arquivos de instruções e que o Figma corresponde à pasta `Imagens/`. Não existe PDF funcional separado. Validar a Fase 1 antes de iniciar a fase seguinte; a aprovação não substitui as verificações técnicas.

Também autorizou uma alternativa ao Docker, que não é suportado pela máquina: PostgreSQL 17 nativo/portátil no Windows. Os comandos de preparação, início, parada e status ficam no projeto; a aplicação continua usando PostgreSQL com Prisma.

## Correção de cadastro — validada

Correção solicitada após a Fase 7 em 02/11/2026: criação de conta de candidato restrita ao envio final da vaga/banco, com senha no formulário. Implementada com transação e reutilização dos módulos existentes; 194 testes aprovados. Regras, arquivos e evidências em [registration-flow.md](registration-flow.md). A Fase 8 foi autorizada posteriormente pelo pedido de continuidade.

## Fase 8 — validação e preparação local verificadas

Autorizada pelo pedido de continuidade em 02/11/2026. O usuário informou não possuir hospedagem/domínio; o escopo foi limitado à validação local e aos artefatos de preparação, sem publicação. O fluxo contínuo dos 13 passos passou com navegador/API/PostgreSQL, incluindo criação de conta somente no envio final, PDF/DOCX, seleção humana e adesão tardia somente ao banco.

203 testes aprovados (9 locais, 55 unitários API, 21 frontend, 96 HTTP/PostgreSQL e 22 navegador), sete verificações de configuração e quatro asserções Postman. Build, tipagem incluindo E2E e checagens finais documentados em [validation-phase8.md](validation-phase8.md). Implementados storage persistente configurável e proxy explicitamente autorizado; modelos e procedimentos em [deployment.md](deployment.md). Sem mudança de arquitetura, schema, dependências ou regras de negócio.

Publicação e conclusão global permanecem pendentes: infraestrutura/domínio, auditoria remota de dependências, ensaio de restauração, validação operacional no destino, gestão administrativa e requisitos LGPD. Não iniciar a próxima etapa sem aprovação do usuário.

Não implementar etapas futuras antecipadamente. Nenhum commit, publicação, serviço pago ou operação destrutiva está autorizado automaticamente.
