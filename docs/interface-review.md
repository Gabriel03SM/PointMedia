# Revisão de navegação e escala visual

Correção concluída em 01/11/2026: RH e Admin têm funcionalidades e interfaces distintas, conforme lembrado pelo usuário, e a aplicação estava visualmente grande, com sensação de zoom. Esta tarefa ajusta a interface existente; não inicia a Fase 5 nem o desenvolvimento dos módulos administrativos futuros.

## Perfis e referências

| Perfil         | Navegação de referência                                          | Autorização existente                                                                             |
| -------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| RH / RECRUITER | Dashboard de recrutamento, candidatos, triagem, talentos e vagas | Operações de recrutamento; criação de recrutadores proibida no backend                            |
| ADMIN          | Dashboard administrativo, métricas, usuários, logs e sistema     | Criação de recrutadores exclusiva; acesso total indicado em Admin - Gerenciamento de Usuários.png |
| CANDIDATE      | Perfil profissional, vagas, candidaturas e participação no banco | Dados próprios; recrutamento e administração continuam protegidos                                 |

`AccountLayout.tsx` agora mantém somente os cinco itens administrativos no menu do Admin e identifica a navegação como Administração. O menu de RH permanece dedicado ao recrutamento. A regra de acesso total do Admin não foi convertida em restrição implícita a partir da ausência de links: as autorizações do servidor e rotas operacionais existentes foram preservadas.

Dashboard, métricas, usuários, logs e sistema ainda não possuem telas administrativas funcionais. Permanecem sinalizados como indisponíveis, conforme o fluxo já existente. Criar recrutadores funciona pela API restrita a ADMIN; não declarar o gerenciamento completo de usuários implementado. O dashboard de RH também permanece na fase de indicadores. As referências não autorizam antecipar esses módulos nesta correção.

## Escala ajustada

Preservados Poppins local, logos PNG oficiais, paleta preta/rosa/azul, componentes, campos e organização das páginas. As medidas foram reduzidas nas regras existentes de CSS; não há zoom global ou redução por transform. O navegador continua podendo aplicar o zoom escolhido pelo usuário.

| Elemento              | Antes                                                    | Agora                                                                 |
| --------------------- | -------------------------------------------------------- | --------------------------------------------------------------------- |
| Login desktop         | Cartão com largura de 550 px; inputs de 57 px            | Largura de 440 px; inputs de 44 px com texto de 16 px                 |
| Barra lateral desktop | 205 px no perfil; 16,1% na gestão, aumentando com a tela | 200 px compartilhados pelo perfil, gestão e posicionamento dos modais |
| Menu desktop          | 22 px no perfil; até 36 px na gestão                     | 18 px, sem aumento por largura da tela                                |
| Conteúdo de gestão    | Padding superior de até 76 px e inputs de até 64 px      | Padding superior de 32 px e inputs de 44 px                           |
| Painéis de vagas      | Alturas mínimas de 720/920 px                            | Altura conforme o conteúdo                                            |
| Página de confirmação | Cartão de até 1500 px e texto de até 28 px               | Cartão de até 1000 px e texto de 18 px                                |

Home, login/cadastro, perfil, formulários profissionais, vagas, candidatos, triagem, comprovante e modais receberam ajustes de tipografia/espaçamento nos arquivos correspondentes. No móvel, a estrutura continua responsiva, com campos legíveis e sem rolagem horizontal nos cenários revisados.

Em 1366×768, os perfis Admin e RH passam a caber na altura inicial da janela: antes tinham respectivamente 997 e 911 px de altura; após o ajuste têm 768 px. O login também passa de 850 para 768 px de altura da página. As medidas foram obtidas no Chromium com viewport controlada e zoom padrão, não por alteração do navegador do usuário.

## Arquivos

- `apps/web/src/components/AccountLayout.tsx`: menu de Admin e identificação da navegação.
- `apps/web/src/styles/global.css`: tipografia, login, sidebar, perfil e variável compartilhada de largura.
- `apps/web/src/features/{public/home,jobs/jobs,candidates/candidates,screening/screening,applications/applications}.css`: escala dos componentes existentes, modais e responsividade.
- `tests/e2e/auth.spec.ts`: regressão com Admin e RH reais, criação de recrutador pela API, menus distintos e bloqueio 403 para criação pelo RH.
- Documentação: este relatório, `requirements.md`, `figma-mapping.md` e README.

## Verificação

- `npm run build`: shared, API e frontend aprovados; o frontend executou a checagem TypeScript antes do bundle.
- `npm run typecheck`: shared, API e frontend aprovados.
- `npm run test -w @pointmedia/web`: 17 testes aprovados.
- `npm run lint`: passou; novo caso do navegador incluído na conferência final.
- Navegador: **12/12 testes aprovados em 46,5 segundos**, incluindo o novo cenário de separação dos perfis e 11 regressões. O runner usou API/PostgreSQL reais no banco `_test`, sem mock de respostas e sem alteração de timeouts. Admin criou um recrutador pela API; essa conta de RH recebeu 403 ao tentar a mesma operação e navegou pela triagem normalmente.
- Revisão local: 18 capturas de Home, login, perfil de Admin/RH e triagem em 1366, 1920 e 375 px, sem overflow horizontal ou erro JavaScript. As capturas finais aguardaram a conclusão dos estados de carregamento. Artefatos em `.tmp/scale-before-*`, `.tmp/scale-after-*` e script temporário `review-interface-scale.cjs`.
- `npm run format:check`: passou para os fontes e documentos.

A aplicação local foi recompilada e reiniciada em http://localhost:55173/. Sem alteração de banco, regras de negócio, dependências ou commits. O aviso de bundle acima de 500 kB permanece; a revisão visual não equivale a validação pixel a pixel nem WCAG completa. Gestão administrativa funcional e as próximas fases permanecem pendentes.
