# Fase 2 — candidatos e vagas

Iniciada por autorização do usuário. Preservar a Home pública e os controles da fundação. Não iniciar ranking, etapas do processo seletivo ou IA nesta fase.

## Autorizações visuais

- O usuário autorizou criar o portal do candidato, ausente nas imagens, e determinou senha tanto no cadastro associado a uma vaga quanto no cadastro para o banco de talentos. O visitante continua consultando vagas sem login; dados particulares e currículos exigem conta.
- Autorizado modal de criação/edição de vaga a partir de Vagas.png, mantendo o estilo dos campos existentes.
- Solicitada opção “Não se aplica” nos campos que admitem ausência. O backend deve persistir a opção e rejeitar valores contraditórios ou ausência silenciosa.
- Novas páginas fora dessas autorizações devem ser perguntadas antes da criação. Logos oficiais serão fornecidos pelo usuário; não substituir por novos logos inventados.
- Fontes oficiais ainda não foram fornecidas. Usar a família/fallback existente e registrar a diferença; não declarar igualdade tipográfica final.

## Contrato incremental

Base `/api`; mesmos cookies, origem, cabeçalhos, erros e RBAC da fundação. Valores monetários são strings decimais em reais; datas de vaga são instantes ISO 8601 com fuso. Atualizações exigem `version`, evitando sobrescrever edição concorrente (409).

| Método | Rota                        | Acesso    | Comportamento                                                    |
| ------ | --------------------------- | --------- | ---------------------------------------------------------------- |
| GET    | /jobs                       | Público   | Apenas vagas publicadas ainda abertas; busca/paginação           |
| GET    | /jobs/:id                   | Público   | Detalhes publicados/encerrados, sem dados internos               |
| GET    | /management/jobs            | RH/ADMIN  | Vagas de todos os estados, busca/paginação                       |
| GET    | /management/jobs/:id        | RH/ADMIN  | Detalhe para edição                                              |
| POST   | /management/jobs            | RH/ADMIN  | Cria rascunho                                                    |
| PUT    | /management/jobs/:id        | RH/ADMIN  | Atualiza dados com controle de versão                            |
| PATCH  | /management/jobs/:id/status | RH/ADMIN  | Publica, encerra ou cancela; valida transição/prazo              |
| DELETE | /management/jobs/:id        | RH/ADMIN  | Cancela logicamente; preserva histórico                          |
| GET    | /candidates/me/profile      | CANDIDATE | Corpo `{profile: ProfessionalProfile}` ou `{profile: null}`      |
| PUT    | /candidates/me/profile      | CANDIDATE | Salva dados profissionais, competências, experiências e formação |
| DELETE | /candidates/me/profile      | CANDIDATE | Remove perfil profissional/currículo próprios; preserva conta    |
| GET    | /candidates                 | RH/ADMIN  | Perfis compartilhados voluntariamente, com paginação/busca       |
| GET    | /candidates/:id/profile     | RH/ADMIN  | Somente perfil compartilhado com recrutamento                    |
| POST   | /candidates/me/resume       | CANDIDATE | Multipart com um arquivo `file`, até 5 MiB; PDF/DOCX validado    |
| GET    | /candidates/me/resume       | CANDIDATE | Download privado do currículo próprio                            |
| GET    | /candidates/:id/resume      | RH/ADMIN  | Download de candidato que compartilhou o perfil                  |
| DELETE | /candidates/me/resume       | CANDIDATE | Remove currículo próprio                                         |

Vagas usam DRAFT/PUBLISHED/CLOSED/CANCELLED. O prazo determina o estado efetivo de uma vaga publicada, mesmo sem uma tarefa agendada. Não há reabertura implícita. Rascunhos/canceladas não são públicos. Edição e transição são auditadas sem registrar corpos, currículo ou dados pessoais desnecessários.

Compartilhamento de perfil com RH é uma escolha explícita, separada do futuro consentimento de permanência no banco de talentos. Retirá-lo interrompe acesso do RH ao perfil/currículo. Não divulgar perfis ou arquivos por rotas públicas.

Currículos ficam fora de public/dist, em `.local/resumes` (testes em `.local/test-resumes`), com chave aleatória e metadados no PostgreSQL. Validar extensão, MIME, assinatura PDF e estrutura ZIP/Open XML do DOCX, limites de expansão e ausência de macros. Servir como attachment, com autorização e cache desabilitado. Substituição remove o arquivo anterior após o commit; falha no banco remove o novo arquivo. A abstração de storage permite trocar o destino posteriormente.

## Limite desta fase

Form.png e Banco.png orientam os formulários e deverão receber senha no cadastro de uma nova conta, conforme pedido do usuário. O vínculo de candidatura, o tratamento de inscrição tardia, a pesquisa do banco de talentos e as etapas/indicadores de seleção pertencem às próximas fases. Não apresentar uma gravação de perfil como candidatura enviada.

## Validação executada

Migrations aditivas aplicadas sem reset em desenvolvimento e teste; 80 testes aprovados, incluindo HTTP/PostgreSQL e navegador reais. Tipagem, lint e build passaram. Evidências, limites e pendências visuais em [validation-phase2.md](validation-phase2.md). A próxima fase exige aprovação.
