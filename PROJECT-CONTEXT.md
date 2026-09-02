# POINT MEDIA — CONTEXTO E ESPECIFICAÇÃO DO PROJETO

## 1. Contexto da empresa

A Point Media é uma empresa brasileira de marketing digital que atende diversas marcas, como PicPay, C&A, Track&Field e Havaianas.

A empresa oferece serviços relacionados a:

* CRM;
* campanhas digitais;
* criação de banners;
* criação de posts;
* estratégias de marketing digital.

O sistema deste projeto será desenvolvido para apoiar internamente o processo de recrutamento e seleção da empresa.

---

# 2. Objetivo do sistema

O sistema tem como objetivo centralizar e automatizar o processo seletivo da Point Media, permitindo o gerenciamento de vagas, candidatos, processos seletivos e banco de talentos.

A aplicação deverá reduzir tarefas manuais do RH, facilitar a triagem de candidatos e fornecer uma visão organizada dos candidatos mais compatíveis com cada vaga.

O sistema deverá funcionar como uma **esteira completa de recrutamento**, desde a abertura da vaga e recebimento das candidaturas até a triagem, avaliação e seleção dos candidatos.

---

# 3. Problema

Atualmente, sem uma solução centralizada para gerenciamento do processo seletivo, existe risco de:

* dificuldade na organização dos candidatos;
* perda de informações;
* dificuldade para localizar candidatos antigos;
* demora na triagem;
* dificuldade para comparar candidatos;
* ausência de um ranking objetivo;
* dificuldade em reutilizar candidatos de processos anteriores;
* falta de uma visão centralizada para o RH.

O sistema deverá solucionar esses problemas por meio de uma aplicação web centralizada.

---

# 4. Visão geral do sistema

O sistema será uma aplicação web para gerenciamento do processo seletivo e banco de talentos da Point Media.

A aplicação deverá permitir:

* criação e gerenciamento de vagas;
* definição de prazo de inscrição;
* cadastro público de candidatos;
* envio de currículo;
* cadastro de LinkedIn e portfólio;
* armazenamento dos candidatos;
* triagem automatizada;
* classificação dos candidatos;
* ranking de compatibilidade;
* gerenciamento do processo seletivo;
* banco de talentos;
* controle de usuários e permissões;
* visualização de métricas.

---

# 5. Fluxo principal

O fluxo esperado do sistema é:

1. Administrador ou RH cria uma vaga.
2. A vaga recebe seus requisitos.
3. São definidos requisitos indispensáveis e diferenciais.
4. São definidos pesos para os critérios de avaliação.
5. A vaga fica disponível publicamente.
6. O candidato acessa o formulário.
7. O candidato informa seus dados.
8. O candidato envia currículo e links profissionais.
9. O sistema verifica o prazo da vaga.
10. Caso esteja dentro do prazo, a candidatura é vinculada à vaga.
11. Caso esteja fora do prazo, o candidato é armazenado no banco de talentos.
12. O sistema processa os critérios de compatibilidade.
13. A candidatura recebe uma pontuação.
14. Os candidatos são classificados.
15. O RH visualiza o ranking.
16. O RH pode analisar individualmente os candidatos.
17. O candidato pode avançar pelas etapas do processo seletivo.
18. O processo termina com a contratação, reprovação ou arquivamento.

---

# 6. Perfis de acesso

O sistema possui três níveis principais de acesso.

## 6.1 Candidato

O candidato poderá:

* criar sua candidatura;
* preencher dados pessoais;
* enviar currículo;
* informar LinkedIn;
* informar portfólio;
* informar pretensão salarial;
* informar senioridade;
* informar tecnologias/conhecimentos;
* acompanhar o andamento de suas candidaturas;
* atualizar seus dados quando permitido.

O candidato NÃO poderá:

* acessar candidatos de terceiros;
* acessar o painel administrativo;
* criar vagas;
* editar critérios de vagas;
* acessar dados internos do RH;
* alterar pontuações;
* acessar o banco de talentos completo.

---

## 6.2 Recrutador / RH

O RH poderá:

* criar vagas;
* editar vagas;
* definir requisitos;
* definir requisitos indispensáveis;
* definir diferenciais;
* configurar pesos;
* visualizar candidatos;
* visualizar ranking;
* analisar currículos;
* alterar etapa do candidato;
* aprovar ou reprovar candidatos;
* pesquisar no banco de talentos;
* visualizar histórico do candidato;
* acompanhar métricas do processo seletivo.

---

## 6.3 Administrador

O administrador terá acesso às funcionalidades administrativas do sistema.

Poderá:

* gerenciar usuários;
* gerenciar permissões;
* gerenciar vagas;
* gerenciar candidatos;
* gerenciar configurações;
* acessar informações administrativas;
* visualizar métricas gerais;
* administrar o sistema.

---

# 7. Requisitos funcionais

## RF01 — Formulário público

O sistema deve disponibilizar um formulário público para cadastro de candidatos.

O formulário deverá permitir o preenchimento de:

* nome;
* dados de contato;
* informações profissionais;
* pretensão salarial;
* senioridade;
* tecnologias/conhecimentos;
* LinkedIn;
* portfólio;
* currículo;
* demais informações necessárias ao processo seletivo.

---

## RF02 — Cadastro de vagas

O sistema deve permitir que usuários autorizados criem vagas.

Uma vaga deverá possuir, no mínimo:

* título;
* descrição;
* área;
* senioridade;
* faixa ou pretensão salarial;
* prazo de inscrição;
* requisitos indispensáveis;
* requisitos diferenciais;
* tecnologias;
* critérios de avaliação;
* pesos dos critérios;
* status da vaga.

---

## RF03 — Prazo de inscrição

Cada vaga deverá possuir uma data de encerramento.

Após o encerramento:

* novas candidaturas não deverão ser vinculadas à vaga;
* os dados do candidato deverão permanecer armazenados;
* o candidato deverá ser direcionado ao banco de talentos;
* o candidato poderá ser considerado para futuras vagas.

---

## RF04 — Banco de talentos

O sistema deve manter um banco de talentos centralizado.

O banco deverá permitir:

* armazenamento de candidatos;
* pesquisa;
* filtros;
* classificação;
* identificação de competências;
* histórico de candidaturas;
* reutilização dos candidatos em novas vagas.

---

## RF05 — Triagem automatizada

O sistema deverá realizar uma triagem automatizada dos candidatos.

A pontuação deverá considerar critérios como:

* pretensão salarial;
* senioridade;
* tecnologias;
* conhecimentos;
* requisitos indispensáveis;
* requisitos diferenciais.

Os pesos deverão ser configuráveis de acordo com a vaga.

---

## RF06 — Requisitos indispensáveis

A vaga deverá permitir definir requisitos considerados obrigatórios.

O sistema deverá identificar candidatos que não atendam aos requisitos indispensáveis.

Esses requisitos deverão possuir tratamento diferente dos critérios considerados apenas diferenciais.

---

## RF07 — Requisitos diferenciais

A vaga poderá possuir requisitos considerados diferenciais.

O atendimento desses requisitos deverá contribuir positivamente para a pontuação do candidato.

---

## RF08 — Ranking

O sistema deverá calcular uma pontuação de compatibilidade entre candidato e vaga.

Os candidatos deverão ser apresentados ao RH em ordem de compatibilidade.

O ranking deverá permitir ao RH identificar rapidamente os candidatos com maior aderência à vaga.

---

## RF09 — Processo seletivo

O sistema deverá funcionar como uma esteira de seleção.

As etapas deverão ser configuráveis e poderão incluir, por exemplo:

* candidatura recebida;
* triagem;
* análise do RH;
* entrevista;
* teste;
* entrevista final;
* aprovado;
* reprovado;
* contratado.

---

## RF10 — Dashboard

O sistema deverá disponibilizar informações relevantes para o RH e administradores.

Exemplos:

* quantidade de candidatos;
* quantidade de vagas abertas;
* candidatos por etapa;
* candidatos aprovados;
* candidatos reprovados;
* quantidade de inscrições;
* desempenho das vagas;
* dados do banco de talentos.

---

## RF11 — Integrações analíticas

O sistema deverá ser preparado para integração com ferramentas analíticas, como:

* Power BI;
* Google Analytics.

A arquitetura deverá permitir futuras integrações sem necessidade de grandes alterações estruturais.

---

# 8. Requisitos não funcionais

## RNF01 — Acessibilidade

O sistema deverá seguir boas práticas de acessibilidade digital.

Deverá considerar:

* contraste adequado;
* navegação por teclado;
* textos alternativos;
* labels em formulários;
* mensagens de erro claras;
* foco visual;
* estrutura semântica;
* compatibilidade com tecnologias assistivas.

---

## RNF02 — Identidade visual

A interface deverá respeitar, quando possível, a identidade visual da Point Media.

Paleta de referência:

* rosa;
* azul;
* preto;
* branco.

Fontes de referência:

* Fresno;
* Din Pro;
* Freestyle Script.

Caso alguma fonte não esteja disponível para utilização web, deverá ser definida uma alternativa visualmente compatível.

---

## RNF03 — Segurança

O sistema deverá garantir isolamento entre os perfis de acesso.

Um candidato não poderá acessar funcionalidades administrativas ou informações de outros candidatos.

O controle de autorização deverá ocorrer no backend e não somente na interface.

---

## RNF04 — Performance

O sistema deverá ser projetado para suportar crescimento do banco de talentos sem degradação significativa de desempenho.

A arquitetura deverá considerar:

* paginação;
* filtros no banco;
* índices;
* consultas eficientes;
* separação adequada de responsabilidades;
* possibilidade de escalabilidade futura.

---

## RNF05 — Manutenibilidade

O código deverá seguir boas práticas de engenharia de software.

Deverá possuir:

* arquitetura organizada;
* separação de responsabilidades;
* componentes reutilizáveis;
* nomenclatura consistente;
* validação de dados;
* tratamento de erros;
* documentação quando necessária.

---

# 9. Benchmarking

Foram analisadas plataformas relacionadas a recrutamento e seleção:

* LinkedIn;
* Indeed;
* Gupy;
* InfoJobs;
* Flash.

A análise teve como objetivo identificar boas práticas relacionadas a:

* processos seletivos;
* experiência do candidato;
* banco de talentos;
* triagem;
* interfaces;
* desempenho;
* escalabilidade;
* aplicativos mobile;
* tecnologias utilizadas.

Também foi observado que plataformas de grande escala utilizam arquiteturas modernas, processamento assíncrono, infraestrutura em nuvem, microsserviços e mecanismos de mensageria.

Para o projeto Point Media, entretanto, a arquitetura deverá ser proporcional ao escopo acadêmico e às necessidades reais do sistema, evitando complexidade desnecessária.

---

# 10. Levantamento de requisitos

Durante o início do projeto foram realizadas reuniões com representantes da Point Media.

As reuniões ocorreram em março de 2026 e tiveram como objetivo compreender:

* funcionamento esperado do processo seletivo;
* forma de cadastro dos candidatos;
* níveis de acesso;
* fluxo do processo seletivo;
* necessidades do RH;
* funcionamento do banco de talentos;
* critérios desejados para triagem.

As informações obtidas foram utilizadas como base para definição dos requisitos funcionais e não funcionais.

---

# 11. Stack tecnológica

A stack definida inicialmente para o projeto é:

### Frontend

* React
* Chart.js

### Backend

* NestJS

### Banco de dados

* MySQL

### ORM

* Prisma

A arquitetura deverá manter uma separação clara entre frontend, backend e banco de dados.

---

# 12. Diretrizes arquiteturais

Antes de iniciar a implementação, deve ser definida uma arquitetura coerente com a stack escolhida.

A solução deverá considerar:

* React como camada de apresentação;
* NestJS como API/backend;
* Prisma como camada de acesso ao banco;
* MySQL como banco de dados;
* autenticação e autorização;
* validação de dados;
* tratamento centralizado de erros;
* organização modular do backend;
* componentes reutilizáveis no frontend.

Não utilizar microsserviços apenas por serem citados no benchmarking. A complexidade arquitetural deverá ser justificada pela necessidade real do projeto.

---

# 13. Modelo conceitual inicial

As principais entidades esperadas incluem:

* Usuário;
* Candidato;
* Vaga;
* Candidatura;
* Tecnologia;
* Requisito;
* Critério;
* Etapa do processo seletivo;
* Avaliação;
* Banco de Talentos.

O modelo final deverá ser definido após análise dos requisitos e dos relacionamentos necessários.

Não criar tabelas ou entidades desnecessárias sem justificativa.

---

# 14. Regra de ranking

O sistema deverá possuir um mecanismo de pontuação de candidatos.

A pontuação deverá considerar os critérios definidos para cada vaga.

Exemplo conceitual:

```text
Pontuação final =
    tecnologias compatíveis
    + senioridade
    + pretensão salarial
    + requisitos diferenciais
    + outros critérios configurados
```

Os pesos deverão ser configuráveis por vaga.

Os requisitos indispensáveis deverão possuir tratamento especial e poderão impedir ou reduzir significativamente a classificação de candidatos que não os atendam, conforme regra definida na implementação.

A fórmula definitiva deverá ser especificada antes da implementação.

---

# 15. Regras importantes para desenvolvimento

O projeto NÃO deverá ser implementado imediatamente.

Antes de escrever código, o desenvolvedor/Agente deverá:

1. analisar todo este documento;
2. identificar requisitos ambíguos;
3. identificar possíveis conflitos;
4. identificar informações ausentes;
5. propor a arquitetura;
6. propor a estrutura de pastas;
7. propor o modelo de dados;
8. definir o fluxo de autenticação;
9. definir o sistema de permissões;
10. definir a estratégia de ranking;
11. definir a estrutura da API;
12. definir as principais telas;
13. definir estratégia de validação;
14. definir estratégia de testes;
15. apresentar um plano de implementação.

Somente após essa etapa deverá iniciar a implementação.

---

# 16. Regra de tomada de decisão

Quando houver mais de uma maneira válida de implementar uma funcionalidade, priorizar:

1. simplicidade;
2. segurança;
3. manutenibilidade;
4. escalabilidade;
5. experiência do usuário;
6. aderência à stack definida.

Evitar implementar tecnologias ou padrões apenas porque são considerados modernos.

Toda decisão arquitetural relevante deverá possuir uma justificativa.

---

# 17. Resultado esperado

Ao final, o sistema deverá fornecer uma plataforma web completa para gerenciamento do processo seletivo da Point Media, permitindo:

* gerenciamento de vagas;
* recebimento de candidaturas;
* armazenamento de candidatos;
* banco de talentos;
* triagem automatizada;
* ranking de candidatos;
* gerenciamento das etapas do processo seletivo;
* controle de acesso;
* dashboards;
* preparação para integrações analíticas.

O sistema deverá apresentar uma arquitetura organizada, segura, acessível, escalável e adequada ao contexto do projeto.
