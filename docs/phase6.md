# Fase 6 — indicadores reais e IA opcional

Autorizada explicitamente em 01/11/2026 para começar após concluir a Fase 5. Referências: Dashboard.png, Admin - Dashboard Administrativo.png e Admin - Métricas gerais.png. Preservar sidebar, escala, cores e organização dos cartões/gráficos. Os números e alegações ilustrativos serão substituídos por dados/garantias verificáveis.

## Indicadores e privacidade

- RH/admin: dashboard de recrutamento e métricas por período de 7, 30, 90 ou 365 dias, com filtro opcional por vaga. Dias de calendário em America/Sao_Paulo, incluindo o dia atual até o instante da consulta. Série diária contém dias sem eventos com zero.
- Perfis disponíveis: candidato ativo com perfil e autorização geral, consentimento vigente de talentos ou candidatura. Sem dupla contagem. Perfil privado sem nenhuma dessas autorizações não entra na distribuição de senioridade. Ao filtrar vaga, consideram-se apenas seus inscritos.
- Talentos ativos: consentimento vigente, candidato ativo e perfil existente. Perfis do mês usam createdAt do perfil e mês corrente de Brasília. Vagas abertas exigem PUBLISHED e prazo futuro; não dependem de scheduler.
- Candidaturas e indicadores de processo usam a coorte enviada no período selecionado. Conversão é aprovadas atualmente / candidaturas da coorte, com denominador exposto; não representa taxa final enquanto o processo estiver aberto. Funil conta quem alcançou cada etapa pelo histórico. Distribuição atual é distinta do funil acumulado. Tempo até triagem é a média entre envio e primeiro evento SCREENING, com amostra exposta; sem amostra retorna null.
- Compatibilidade é apresentada somente com uma vaga selecionada, a partir da última execução da triagem. Pesos e scores não são comparados entre vagas. Dados desatualizados deixam média/distribuição indisponíveis até reprocessamento; sem execução, null. Faixas disjuntas: abaixo de 60, 60–74,99, 75–89,99, 90–100 e sem nota. Dados desconhecidos não viram zero.
- ADMIN: contas ativas, cadastros no período, vagas monitoradas e volume real de auditoria; atividade agregada por ação/dia e contagens operacionais. Não afirmar backups, alertas ou saúde de módulos sem evidência correspondente.
- Respostas/CSV contêm somente agregados, datas, chaves de etapa e identificador da vaga consultada; sem contatos, currículos, notas, nomes de candidatos/atores ou tokens. Não há transmissão para Power BI/Google Analytics. CSV autenticado permite integração manual posterior, sem fórmulas ou campos livres.

## Contrato

Base `/api`, sessões e guards existentes. DTO estrito: `days` em 7/30/90/365, padrão 30; `jobId` UUID opcional. Job inexistente retorna 404. Candidato recebe 403 e visitante 401.

| Método | Rota                          | Acesso / resultado                                  |
| ------ | ----------------------------- | --------------------------------------------------- |
| GET    | /analytics/recruitment        | RH/admin; agregados de recrutamento e período       |
| GET    | /analytics/recruitment/export | RH/admin; mesmos dados agregados em CSV             |
| GET    | /analytics/administration     | ADMIN; agregados administrativos por período        |
| GET    | /intelligence/status          | RH/admin; disponibilidade real do provedor opcional |

## IA opcional

O usuário confirmou: “Ainda não: implementar indicadores reais e deixar a integração de IA preparada e desativada.” Interface de provedor, validação de extrações com evidência literal e serviço isolado implementados; o padrão indisponível não processa documentos, não chama serviços externos e não gera um resumo fictício. O dashboard informa a disponibilidade real. Não há botão de análise sem provedor funcional.

Contrato de futura extração trata o currículo como texto não confiável, limita entrada/saída e exige evidências presentes na fonte, preservando a revisão humana. A verificação de trechos é lexical, não comprova a veracidade das declarações nem neutraliza toda instrução maliciosa para um modelo futuro. Nenhum resultado modifica perfil declarado, ranking ou decisão de contratação. Extração real de PDF/DOCX, adaptação ao provedor e avaliação de resumos dependem da configuração/autorização dessa integração e não são declaradas concluídas nesta entrega.

## Verificação

HTTP/PostgreSQL: permissões, valores conhecidos com fixtures isoladas, períodos/fuso/zeros, coorte/funil/tempo, autorização dos perfis, prazo, consentimentos expirados, filtros, distribuição por vaga, ranking desatualizado, ausência de PII, exportação e DTOs. Unitários da fronteira de extração: indisponibilidade, evidência inválida, limites e texto malicioso tratado como dado. Navegador: dashboards de RH/Admin, filtro/exportação, dados reais, estados vazios e móvel. Regressões das Fases 1–5, tipagem, lint, build e formatação.
