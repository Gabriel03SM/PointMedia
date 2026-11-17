# Fase 7 — fidelidade visual, acessibilidade e responsividade

Continuidade autorizada em 01/11/2026 pela solicitação “bora continuar ae”, após a entrega das Fases 5–6. Referências obrigatórias: as 16 imagens originais em `Imagens/`, Poppins e logos oficiais, além dos ajustes de escala e menus já aprovados em `interface-review.md`.

Retomada e validação do escopo existente concluídas em 02/11/2026: 182 testes aprovados e quatro asserções Postman. Correções, arquivos, revisão visual e limitações em [validation-phase7.md](validation-phase7.md). O requisito global das 16 referências permanece parcial enquanto as telas administrativas ausentes não forem implementadas.

## Escopo

Preservar a arquitetura, regras de negócio, contratos e integrações reais existentes. Corrigir problemas observados de contraste, formulários, navegação por teclado, foco e leitura em telas pequenas. Não criar telas administrativas ausentes, ativar IA ou iniciar preparação de produção nesta fase.

Paleta existente: preto `#000000`, fundo `#f7f7f7`, superfície `#ffffff`, rosa `#ed559b` e azul `#6cabd5`. Usar variantes mais escuras dos mesmos acentos somente onde o contraste do texto exigir. Preservar a tipografia Poppins, sidebar de 200 px, cartões, bordas, organização dos painéis e dimensões já aprovadas. No celular, permitir a quebra de linhas/colunas sem ocultar controles ou conteúdo.

## Verificação prevista

- Comparação visual das telas implementadas com as referências; módulos ainda não implementados permanecem identificados como pendências.
- Larguras de 320, 375, 768 e 1366 px, conteúdo longo, formulários e modais; sem rolagem horizontal da página. Gráficos podem ter rolagem interna identificada e acessível pelo teclado.
- Teclado: atalho para conteúdo, foco visível, erros relacionados aos campos, abertura/fechamento de modal com Escape e retorno ao acionador.
- Contraste de textos e controles, sem depender somente de cores para estados.
- Testes frontend, navegador com API/PostgreSQL reais no banco isolado, regressões existentes, tipagem, build, lint e formatação.

Critérios consultados: [contraste](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html), [reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html) e [modais](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/). Os resultados não equivalem a certificação WCAG nem teste completo com leitores de tela.

Fase 8 depende de nova aprovação. Sem commits, publicação, serviços pagos ou operações destrutivas.
