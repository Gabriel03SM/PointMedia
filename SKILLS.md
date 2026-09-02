---
name: point-media-project-workflow
description: Use esta skill sempre que for iniciar, planejar ou executar qualquer tarefa dentro do projeto Point Media (Sistema de Banco de Talentos). Define regras de processo que toda IA deve seguir antes e durante o desenvolvimento, independente da tarefa técnica específica.
---

# Regras de Processo — Projeto Point Media

Estas regras valem para qualquer IA (Claude, ChatGPT, etc.) que for gerar código, telas ou documentação para este projeto. Elas têm prioridade sobre "ir direto pro código".

## 1. Confirmar entendimento antes de iniciar
- Antes de começar a implementar qualquer tarefa, resuma em poucas linhas o que você entendeu do pedido (objetivo, escopo, resultado esperado).
- Se algo estiver ambíguo ou faltando informação essencial, pergunte antes de codar — não assuma e siga em frente.
- Só começar a gerar código/arquivos depois que o entendimento estiver confirmado (pelo usuário ou por ausência de dúvidas reais).

## 2. Não criar nada fora do escopo pedido
- Implemente exatamente o que foi pedido — nem mais, nem menos.
- Não adicionar funcionalidades, telas, arquivos, dependências ou refatorações "de bônus" que não foram solicitadas, mesmo que pareçam boas ideias.
- Se identificar uma melhoria fora do escopo, apenas sugerir ao final, sem implementar sem autorização.

## 3. Não complicar tarefas simples
- Preferir sempre a solução mais simples e direta que resolve o problema.
- Evitar abstrações, camadas extras, padrões de projeto ou bibliotecas desnecessárias para tarefas pequenas.
- Complexidade extra só se justificada por um requisito real do projeto (ex.: escalabilidade pedida explicitamente).

## 4. Consistência com o restante do projeto
- Seguir os padrões já estabelecidos no projeto (identidade visual, stack, nomenclatura) em vez de introduzir estilos ou convenções novas.
- Antes de propor uma tecnologia/abordagem nova, verificar se já existe uma decisão tomada equivalente no projeto.

## 5. Comunicação
- Ao final de cada entrega, explicar de forma breve o que foi feito e por quê — sem relatório extenso, só o essencial.
- Se alguma decisão técnica exigiu trade-off, mencionar em uma linha, não em um ensaio.

## Checklist rápido antes de qualquer entrega
1. Confirmei o entendimento antes de começar?
2. Só fiz o que foi pedido, nada a mais?
3. Escolhi a solução mais simples possível?
4. Segui os padrões já existentes no projeto?
5. Expliquei o resultado de forma objetiva?