# Fase 5 — processo seletivo e histórico

Continuidade solicitada pelo usuário em 01/11/2026 após a validação da Fase 4 e dos ajustes de interface. Escopo: etapas humanas, histórico persistente, notas internas e mensagens visíveis somente ao titular da candidatura. Referência visual: `Triagem - Modal perfil candidato.png`, reutilizando o modal existente e as listagens/portal já implementados; nenhuma nova página independente.

## Regras e visibilidade

Fluxo confirmado pelo usuário em 01/11/2026: Recebida → Em triagem → Pré-selecionada → Entrevista → Aprovada. O RH/admin pode reprovar em qualquer etapa ainda aberta. Decisões finais não reabrem e não se pulam etapas. São os seis estados sugeridos na seção 10 das instruções. O ranking continua sem modificar etapas ou decidir contratação.

Toda transição exige a versão atual e justificativa interna de 1–2000 caracteres. Mensagem ao candidato é opcional, com até 2000 caracteres, publicada apenas no portal/comprovante autenticado. A interface confirma o destino e a visibilidade antes da gravação. Não há envio de e-mail ou contato externo.

Histórico imutável registra origem, destino, versão, ator, data, justificativa interna e mensagem pública em campos distintos. A resposta do candidato projeta somente ID, origem/destino, versão, data e mensagem pública: não contém notas, justificativas nem identidade do RH. Candidaturas antigas recebem evento inicial com a data original de envio, sem alteração dos dados anteriores. Notas são acréscimos independentes, com autoria/data, sem edição ou exclusão nesta fase.

## Contrato incremental

Base `/api`, cookie de sessão e RBAC existentes. Escritas exigem `X-Pointmedia-Request: 1`, origem válida e JSON. UUIDs e DTOs estritos; campos extras são rejeitados. RH/admin podem operar candidaturas de candidatos ativos; demais titulares não acessam seus dados. Histórico/notas têm paginação `page`/`pageSize` (máximo 50), em ordem decrescente estável. Listagens existentes passam a aceitar filtro opcional `status` e apresentam o estado persistido.

| Método | Rota                                 | Resultado                                                                             |
| ------ | ------------------------------------ | ------------------------------------------------------------------------------------- |
| GET    | /management/applications/:id         | Resumo da candidatura e transições permitidas                                         |
| PATCH  | /management/applications/:id/stage   | `{version,status,internalReason,publicMessage?}`; estado, evento e auditoria atômicos |
| GET    | /management/applications/:id/history | Histórico interno paginado                                                            |
| GET    | /management/applications/:id/notes   | Notas internas paginadas                                                              |
| POST   | /management/applications/:id/notes   | `{body}` de 1–2000 caracteres; nota e auditoria atômicas                              |
| GET    | /applications/me/:id/history         | Histórico próprio paginado e projetado sem informações internas                       |

401 sem sessão, 403 para perfil/origem indevidos, 404 para candidatura indisponível/de outro titular, 400 para payload inválido/transição proibida, 409 para versão desatualizada. Erros mantêm `requestId`. Duas transições com a mesma versão permitem exatamente uma gravação; o cliente deve recarregar antes de decidir novamente.

## Verificação prevista

HTTP/PostgreSQL: todos os estados, transições inválidas e terminais, versões/concorrência, histórico e autoria, notas, persistência, filtros/paginação, isolamento por candidatura/titular, dados inativos, origem e campos forjados. Navegador real: RH registra nota, avança/reprova, confirma visibilidade, recarrega e candidato acompanha somente o conteúdo público. Regressões das Fases 1–4, tipagem, lint, formatação, build e inspeção do contrato antes de concluir. Evidências finais em `validation-phase5.md`.
