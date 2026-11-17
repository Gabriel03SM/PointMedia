# Fase 4 — triagem determinística e ranking explicável

Autorizada pelo usuário após a aplicação dos logos oficiais/Poppins em 29/10/2026. Não implementar transições, aprovação/rejeição, notas ou IA nesta fase. Triagem.png e Vagas.png orientam as interfaces, com formulário/modal e layout existentes.

## Critérios e ausências

Configuração inicial sugerida pelas instruções: tecnologias 50%, senioridade 30% e salário 20%. O RH salva os pesos por vaga antes da geração; a soma deve ser 100. A participação dos requisitos indispensáveis dentro de tecnologias também é configurável (inicialmente 70%; diferenciais 30%). Nenhum desses pesos fica fixo no algoritmo: cada versão é persistida.

Foi solicitada ao usuário preferência sobre dados ausentes. Na ausência de orientação diferente, usar somente critérios informados, exibindo a cobertura dos dados e revisão humana; nunca atribuir falta de competência a ausência de informação. Não eliminar candidatos automaticamente.

- Tecnologias: comparação exata após normalização já existente (NFKC, trim/case). Taxas de requisitos declarados por grupo, combinadas pela participação configurada. Se um grupo não tem requisitos, o outro recebe sua participação. Lista de competências não informada torna o critério desconhecido.
- Indispensáveis não declarados geram sinalização “confirmar com o candidato”; não afirmar que ele não possui a competência. Diferenciais ausentes não geram eliminação. Arquivo de currículo não é interpretado automaticamente nesta fase.
- Senioridade: igual/superior ao nível desejado recebe 100; abaixo recebe `(posição declarada + 1) / (posição desejada + 1) × 100`, na ordem Estágio, Júnior, Pleno, Sênior, Liderança. A comparação descreve aderência ao requisito da vaga, não qualidade da pessoa.
- Salário: pretensão até o teto da vaga recebe 100; acima recebe `teto / pretensão × 100`. Salário não informado fica desconhecido. Campo Não se aplica da vaga exclui o critério; pretensão abaixo do piso continua dentro do orçamento.
- Critérios não exigidos pela vaga não entram na soma. Critérios desconhecidos não recebem zero: pesos dos critérios conhecidos são redistribuídos para calcular a nota, e cobertura mostra qual parte dos critérios aplicáveis pôde ser avaliada. Nenhum critério avaliável → score null (“Sem dados suficientes”).
- A opção requireCompleteData permite ao RH aguardar todos os critérios aplicáveis com peso positivo: enquanto houver informação ausente, score permanece null, mantendo cobertura, explicações e revisão humana. O padrão false usa os dados disponíveis conforme a regra anterior.
- Score de 0–100, duas casas decimais; mostrar contribuição de cada critério. Cobertura baixa e indispensáveis não declarados exigem revisão humana. Não comparar scores entre vagas.
- Ordenação: score decrescente, cobertura decrescente, recebimento crescente e ID da candidatura; notas null ficam por último. Empates de score não recebem critério oculto.

## Persistência e concorrência

ScreeningConfiguration tem versões imutáveis por vaga, pesos, participação dos grupos, versão do algoritmo e ator/data. Atualizações exigem a versão atual; conflito retorna 409. ScreeningRun referencia uma configuração, versão da vaga e assinatura dos insumos; seus resultados são gravados atomicamente. Reprocessar cria uma execução, preservando a anterior.

Dados estruturados declarados do perfil são a fonte atual; não há análise/extração por IA. Resultado registra versão do perfil, score, cobertura, critérios e justificativas mínimas, sem cópias de currículo, contato ou senha. Leitura compara versões/assinatura atuais: mudanças em requisitos, configuração, perfis ou inscrições sinalizam execução desatualizada até novo processamento. Perfis removidos/inativos não expõem explicações antigas por essa consulta.

Processamento usa snapshot transacional coerente, sem bloquear perfis em ordem oposta ao envio de candidaturas. Uma alteração concorrente posterior pode deixar a execução desatualizada, o que deve ser informado. Nenhuma transição de candidatura decorre do score.

## Contrato incremental

Mesma base `/api`, sessão, origem/header, validação estrita e erros existentes. Todas as rotas abaixo exigem RECRUITER/ADMIN; candidatos não recebem ranking interno.

| Método | Rota                              | Resultado                                                                                            |
| ------ | --------------------------------- | ---------------------------------------------------------------------------------------------------- |
| GET    | /screening/jobs/:id/configuration | Configuração atual ou null, valores iniciais e versão da vaga                                        |
| PUT    | /screening/jobs/:id/configuration | Nova versão imutável; exige version=0 na primeira gravação                                           |
| POST   | /screening/jobs/:id/runs          | Gera/reprocessa atomicamente; exige configurationVersion e jobVersion                                |
| GET    | /screening/jobs/:id/ranking       | Execução mais recente, indicação de atualização, estatísticas reais e resultados ordenados/paginados |

Compara-se somente candidatos inscritos naquela vaga, com autorização correspondente da Fase 3. Pesquisa do banco continua condicionada ao consentimento de talentos. Nenhum score global de candidato, nota de CV, resumo IA ou decisão fictícia.

## Verificação prevista

Unitários: compatível/parcial, indispensável não declarado, ausência de salário/competências, pesos alterados, campos não aplicáveis, vazio, limites e empates. HTTP/PostgreSQL: RBAC, versões, pesos inválidos, histórico/reprocessamento, atualização de perfil/vaga e nova inscrição, isolamento e paginação. Navegador: RH salva configuração, gera ranking real, inspeciona explicação/perfil, altera pesos e reprocessa; candidato bloqueado. Executar regressões, lint, tipagem e build antes de concluir.

## Retomada e evidências

Em 31/10/2026, o código e os testes desta fase já existiam, mas plano/README/rastreabilidade ainda a descreviam como não iniciada. A retomada revisou a implementação, executou novamente as verificações e aplicou a migration que faltava no banco de desenvolvimento, preservando as contagens das tabelas anteriores. Relatório em [validation-phase4.md](validation-phase4.md). A Fase 5 continua dependente de aprovação específica.
