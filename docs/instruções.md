# PROJETO: POINT MEDIA | SISTEMA DE BANCO DE TALENTOS

Você é um engenheiro de software sênior, arquiteto de sistemas full stack e especialista em aplicações web corporativas.

Sua missão é **desenvolver do zero o Sistema de Banco de Talentos da Point Media**, seguindo a documentação funcional fornecida e as interfaces que serão disponibilizadas pelo Figma.

Não quero apenas um protótipo visual. Quero um sistema funcional, com arquitetura sólida, backend real, banco de dados persistente, autenticação, autorização, frontend integrado, validações, testes e documentação.

**IMPORTANTE:** Trabalhe progressivamente, mas implemente código desde a primeira etapa. Não pare após gerar um planejamento.

---

# 1. CONTEXTO DO PROJETO

A Point Media é uma empresa de marketing digital que necessita centralizar e organizar seus processos seletivos.

O sistema deverá permitir:

- Cadastro e gerenciamento de candidatos.
- Cadastro, publicação e encerramento de vagas.
- Inscrição de candidatos em vagas.
- Armazenamento de talentos para futuras oportunidades.
- Upload e análise de currículos.
- Triagem automatizada por critérios configuráveis.
- Ranking de candidatos por compatibilidade.
- Gerenciamento das etapas do processo seletivo.
- Visualização e acompanhamento pelo RH.
- Administração de usuários e permissões.
- Possibilidade de integração com ferramentas analíticas.

O sistema deve funcionar como uma aplicação web completa, com interfaces distintas para candidatos, recrutadores e administradores.

A documentação fornecida representa a fonte principal dos requisitos funcionais. Não elimine nenhuma funcionalidade descrita nela.

# 2. STACK TECNOLÓGICA

Utilize preferencialmente:

**Backend**
- Node.js LTS
- NestJS
- TypeScript
- PostgreSQL
- Prisma ORM
- Autenticação JWT
- Argon2 para senhas
- Validação com class-validator
- Swagger/OpenAPI
- Jest e Supertest

**Frontend**
- React
- TypeScript
- Vite
- React Router
- TanStack Query
- React Hook Form
- Zod
- Tailwind CSS, mantendo compatibilidade com o design do Figma
- Vitest, React Testing Library e Playwright

**Infraestrutura**
- Docker Compose para serviços locais
- Migrations versionadas
- Variáveis de ambiente
- ESLint e Prettier
- Git
- Arquivos de configuração de ambiente exemplificados

Utilize uma estrutura de monorepositório organizada:

```text
pointmedia/
├── apps/
│   ├── api/
│   └── web/
├── packages/
│   └── shared/
├── docs/
├── docker-compose.yml
├── .env.example
└── README.md
```

Prefira uma arquitetura modular, com responsabilidades claras e baixo acoplamento. Evite abstrações desnecessárias, microserviços prematuros e bibliotecas sem justificativa.

# 3. FIGMA E IDENTIDADE VISUAL

As páginas do Figma serão disponibilizadas como referência obrigatória para o frontend.

Ao receber os arquivos, links ou imagens do Figma:

1. Analise todas as telas disponíveis.
2. Identifique componentes reutilizáveis.
3. Extraia cores, tipografia, espaçamentos, tamanhos, bordas e estados.
4. Identifique os fluxos de navegação.
5. Organize os layouts por perfil de usuário.
6. Crie componentes e layouts compartilhados.
7. Reproduza as interfaces com alta fidelidade visual.
8. Implemente responsividade e acessibilidade.
9. Conecte todas as telas aos serviços reais do backend.
10. Revise diferenças visuais e funcionais entre a implementação e o Figma.

Não invente telas definitivas quando houver uma referência de design pendente.

Se o Figma não estiver acessível, prossiga com o backend e a estrutura funcional do frontend, utilizando interfaces provisórias simples. Registre quais telas precisam receber o design final.

A identidade visual descrita na documentação utiliza rosa, azul, preto e branco, com fontes Fresno, DIN Pro e Freestyle Script. Utilize as fontes específicas somente quando os arquivos ou licenças estiverem disponíveis.

A documentação define as funcionalidades. O Figma define a apresentação visual e a experiência de navegação. Quando houver conflito, documente a divergência em vez de remover um requisito silenciosamente.

# 4. TIPOS DE USUÁRIOS E PERMISSÕES

O sistema deverá possuir três perfis.

## CANDIDATO

O candidato poderá:

- Realizar cadastro.
- Autenticar-se.
- Gerenciar seus próprios dados.
- Preencher informações profissionais.
- Adicionar tecnologias e competências.
- Informar senioridade.
- Informar pretensão salarial.
- Adicionar LinkedIn e portfólio.
- Enviar e atualizar currículo.
- Consultar vagas disponíveis.
- Candidatar-se a vagas abertas.
- Consultar suas próprias candidaturas e respectivos status.
- Integrar o banco de talentos para futuras oportunidades.

## RECRUTADOR / RH

O recrutador poderá:

- Acessar um painel restrito.
- Visualizar candidatos e candidaturas.
- Criar e gerenciar vagas, conforme suas permissões.
- Configurar critérios de triagem.
- Visualizar rankings de compatibilidade.
- Consultar currículos e perfis profissionais.
- Filtrar e pesquisar candidatos.
- Gerenciar etapas dos processos seletivos.
- Consultar o banco de talentos.
- Registrar decisões e observações internas.
- Acompanhar indicadores de recrutamento.

## ADMINISTRADOR

O administrador poderá:

- Gerenciar usuários.
- Criar e gerenciar contas de recrutadores.
- Definir perfis e permissões.
- Gerenciar configurações globais.
- Consultar registros de auditoria.
- Acompanhar o funcionamento da aplicação.
- Acessar funcionalidades administrativas autorizadas.

**SEGURANÇA OBRIGATÓRIA**

Implementar autorização por perfil no backend, com RBAC e Guards do NestJS.

Esconder elementos no frontend não substitui autorização no servidor.

Um candidato nunca poderá acessar dados particulares de outros candidatos, rankings internos, informações administrativas ou endpoints de recrutamento.

# 5. MÓDULO DE CANDIDATOS

Criar um cadastro público simples e intuitivo.

Campos básicos sugeridos:

- Nome completo
- E-mail
- Telefone
- Localização
- LinkedIn
- Portfólio
- Senioridade
- Pretensão salarial
- Tecnologias e competências
- Experiências profissionais
- Formação acadêmica
- Currículo

Separar adequadamente os dados de autenticação, informações pessoais, perfil profissional e arquivos.

As informações devem ser validadas no frontend e no backend.

Implementar edição de perfil e tratamento de duplicidade de e-mail.

O candidato deve poder manter um perfil no banco de talentos mesmo sem se candidatar a uma vaga específica.

# 6. MÓDULO DE VAGAS

Implementar CRUD de vagas.

Cada vaga poderá possuir:

- Título
- Descrição
- Departamento
- Senioridade desejada
- Faixa salarial ou orçamento aplicável
- Tecnologias necessárias
- Requisitos indispensáveis
- Requisitos diferenciais
- Pesos dos critérios de avaliação
- Data de abertura
- Data e horário de encerramento
- Status da vaga

Estados sugeridos:

- Rascunho
- Publicada
- Encerrada
- Cancelada

Uma vaga publicada deverá ficar disponível para candidaturas durante seu prazo.

O encerramento deve respeitar o horário definido e a configuração de fuso horário.

**REGRA FUNDAMENTAL DA DOCUMENTAÇÃO**

Candidatos que tentarem se inscrever após o prazo não deverão entrar como candidaturas ativas da vaga encerrada.

Seus dados deverão ser preservados no banco de talentos, mediante consentimento aplicável, para futuras oportunidades.

Essa regra deverá ser implementada e testada no backend.

# 7. BANCO DE TALENTOS

Criar um módulo próprio para armazenamento, consulta e busca de profissionais cadastrados.

Permitir filtragem por:

- Tecnologias
- Senioridade
- Formação
- Experiência
- Pretensão salarial
- Outras informações profissionais relevantes

Implementar paginação, ordenação e pesquisa eficiente.

O banco de talentos deverá permitir localizar candidatos potencialmente compatíveis com novas vagas, mesmo que eles não tenham se inscrito nelas.

A compatibilidade deve ser calculada em relação aos critérios de uma vaga. Não criar uma pontuação global de qualidade das pessoas.

# 8. TRIAGEM AUTOMATIZADA E RANKING

Esse é um dos módulos centrais do projeto.

Desenvolver um mecanismo de compatibilidade entre candidatos e vagas.

Critérios obrigatórios:

- Pretensão salarial
- Senioridade
- Tecnologias dominadas

O sistema também deverá distinguir requisitos indispensáveis de diferenciais.

Os pesos de avaliação deverão ser configuráveis pelo RH para cada vaga ou cargo, conforme a estrutura escolhida.

Exemplo inicial, apenas como configuração padrão:

| Critério | Peso |
|---|---:|
| Tecnologias | 50% |
| Senioridade | 30% |
| Compatibilidade salarial | 20% |

Os pesos não deverão ficar fixos no código.

O mecanismo deverá:

1. Analisar as informações declaradas e verificadas do candidato.
2. Compará-las aos requisitos da vaga.
3. Aplicar os pesos configurados.
4. Identificar requisitos indispensáveis não atendidos.
5. Gerar pontuação de compatibilidade de 0 a 100.
6. Registrar o resultado e a versão dos critérios utilizados.
7. Fornecer uma explicação dos fatores que contribuíram para a pontuação.
8. Exibir o ranking ao RH, ordenado pela compatibilidade.

Trate ausência de informações de maneira explícita. Não considere automaticamente que uma competência inexistente no currículo é inexistente no candidato.

Requisitos indispensáveis não atendidos devem gerar um indicador claro para revisão humana, sem eliminação automática irreversível.

O ranking deverá ser determinístico, testável e auditável.

Crie testes para:

- Candidato compatível.
- Candidato parcialmente compatível.
- Requisito indispensável não atendido.
- Ausência de pretensão salarial.
- Pesos alterados.
- Vaga sem candidatos.
- Empate entre candidatos.
- Reprocessamento de pontuação após alteração dos critérios.

# 9. INTELIGÊNCIA ARTIFICIAL

A documentação prevê utilização de inteligência artificial na análise de currículos.

Estruture um módulo de IA desacoplado da lógica principal do negócio.

Funcionalidades previstas:

- Extração de informações de currículos.
- Identificação de tecnologias e experiências mencionadas.
- Organização das informações profissionais.
- Geração de resumos para o RH.
- Auxílio na comparação entre currículos e requisitos de vagas.

A IA deve complementar, e não substituir, o mecanismo de pontuação configurável.

Não utilize um modelo de linguagem como única fonte de decisão sobre a compatibilidade.

Crie uma interface de serviço que permita utilizar futuramente um provedor real de IA por configuração.

Nunca exponha chaves no frontend ou no repositório.

Se não houver credenciais de IA disponíveis, o sistema deverá continuar funcionando com os dados estruturados dos candidatos e a triagem determinística.

Não invente experiências ou competências não presentes no currículo.

Currículos devem ser tratados como entradas não confiáveis, inclusive contra instruções maliciosas inseridas nos documentos.

Decisões de contratação e rejeição devem permanecer sob responsabilidade humana.

# 10. PROCESSO SELETIVO

Implementar uma esteira de acompanhamento de candidaturas.

Estados inicialmente sugeridos:

- Recebida
- Em triagem
- Pré-selecionada
- Entrevista
- Aprovada
- Reprovada

Permitir transições validadas, registro de histórico, observações internas e acompanhamento dos candidatos.

A interface do RH deverá mostrar o andamento das candidaturas.

O candidato poderá visualizar apenas as informações de andamento destinadas a ele.

Separar observações internas de RH das mensagens públicas.

# 11. UPLOAD DE CURRÍCULOS

Implementar upload real e seguro de arquivos.

Requisitos:

- Aceitar formatos definidos pela aplicação, inicialmente PDF e DOCX.
- Validar extensão, MIME type e tamanho.
- Definir limites de upload.
- Usar nomes e identificadores internos seguros.
- Impedir acesso público direto a arquivos privados.
- Garantir autorização para download.
- Separar armazenamento de arquivos da lógica de negócio.
- Preparar abstração para armazenamento em serviço de objetos futuramente.

Não armazenar currículos apenas como caminhos públicos acessíveis a qualquer visitante.

# 12. BANCO DE DADOS

Projetar um banco relacional normalizado e coerente.

Entidades iniciais sugeridas:

- User
- Role
- CandidateProfile
- Skill
- CandidateSkill
- Department
- JobOpening
- JobRequirement
- Application
- ApplicationStageHistory
- ResumeFile
- ScreeningConfiguration
- ScreeningResult
- RecruiterNote
- AuditLog

Criar tabelas auxiliares quando necessário.

Definir relacionamentos, índices, constraints, unicidade e integridade referencial.

Utilizar migrations.

Evitar duplicar dados desnecessariamente.

Criar seed com dados fictícios que permitam testar todos os perfis e o fluxo completo.

Não utilizar informações reais de candidatos nos seeds.

# 13. FRONTEND

Organizar o frontend por funcionalidades e utilizar componentes compartilhados.

Estrutura sugerida:

```text
src/
├── app/
├── components/
│   ├── ui/
│   ├── forms/
│   └── layouts/
├── features/
│   ├── auth/
│   ├── candidates/
│   ├── jobs/
│   ├── applications/
│   ├── screening/
│   ├── talent-pool/
│   └── admin/
├── hooks/
├── lib/
├── services/
├── styles/
└── types/
```

Preparar fluxos para:

**Área pública:** página inicial, vagas disponíveis, detalhes da vaga, cadastro e login.

**Área do candidato:** perfil profissional, currículo, minhas candidaturas e status.

**Área do RH:** dashboard, vagas, candidatos, banco de talentos, ranking e processos seletivos.

**Área administrativa:** usuários, permissões, configurações e auditoria.

Essas páginas são uma proposta de organização funcional. Ajuste-as à estrutura real do Figma quando as telas estiverem disponíveis.

Implementar carregamento, estados vazios, mensagens de erro, validações, confirmação de ações sensíveis e navegação protegida.

Nenhuma tela deve depender de dados falsos em produção.

# 14. ACESSIBILIDADE E RESPONSIVIDADE

Aplicar boas práticas de acessibilidade digital, incluindo WCAG 2.2 AA como meta técnica.

Garantir:

- Navegação por teclado.
- Contraste adequado.
- Labels em formulários.
- Feedback de validação.
- Estados de foco.
- Semântica correta.
- Layout responsivo.
- Componentes utilizáveis em diferentes resoluções.

# 15. ANALYTICS

A documentação solicita integração com ferramentas como Power BI ou Google Analytics.

Preparar uma camada de integração que permita incorporar análises e indicadores posteriormente.

Criar indicadores internos para o RH, como:

- Número de candidatos.
- Vagas ativas.
- Quantidade de candidaturas.
- Candidatos por etapa.
- Distribuição de compatibilidade por vaga.

Não enviar currículos, dados pessoais identificáveis ou outras informações sensíveis indiscriminadamente para ferramentas analíticas.

Documentar quais integrações estão implementadas e quais estão preparadas para etapas futuras.

# 16. SEGURANÇA E LGPD

Implementar:

- Hash de senha seguro.
- Autenticação robusta.
- Controle de permissões.
- Validação de entradas.
- Proteção contra injeções.
- Rate limiting em endpoints sensíveis.
- Controle de acesso a arquivos.
- Paginação de consultas.
- Logs sem dados pessoais desnecessários.
- Tratamento centralizado de erros.
- Segredos via variáveis de ambiente.
- Trilha de auditoria das operações relevantes.

Considerar a LGPD no tratamento dos dados pessoais de candidatos, incluindo transparência, base legal adequada, retenção, exclusão e direitos dos titulares.

Não utilizar atributos pessoais sensíveis para pontuar ou discriminar candidatos.

# 17. QUALIDADE DE CÓDIGO

Siga os seguintes princípios:

- SOLID onde fizer sentido.
- DRY sem generalizações excessivas.
- Separação de responsabilidades.
- Controllers enxutos.
- Services responsáveis pelas regras de negócio.
- DTOs de entrada e saída.
- Validação no backend.
- Tratamento padronizado de exceções.
- Tipagem rigorosa.
- Sem uso indiscriminado de any.
- Componentes React reutilizáveis.
- APIs REST consistentes.
- Código legível.
- Testes automatizados.
- Documentação atualizada.

Evite código demonstrativo disfarçado de implementação funcional.

# 18. PLANO DE IMPLEMENTAÇÃO

Desenvolva por etapas, mantendo o projeto executável.

## FASE 1: Fundação

- Inicializar monorepositório.
- Configurar backend e frontend.
- Configurar PostgreSQL.
- Criar Prisma Schema inicial.
- Implementar migrations.
- Configurar Docker Compose.
- Configurar lint e testes.
- Implementar autenticação e autorização.
- Criar README e .env.example.

## FASE 2: Candidatos e vagas

- Implementar CRUD de candidatos.
- Implementar perfis profissionais.
- Implementar upload seguro.
- Implementar cadastro e gerenciamento de vagas.
- Implementar requisitos e prazos.
- Criar formulários funcionais.
- Integrar frontend e API.

## FASE 3: Candidaturas e banco de talentos

- Criar fluxo de candidatura.
- Validar prazos.
- Implementar armazenamento de talentos.
- Implementar pesquisa e filtros.
- Criar painel do candidato e listagens do RH.

## FASE 4: Triagem automatizada

- Implementar critérios configuráveis.
- Criar cálculo de compatibilidade.
- Gerar rankings.
- Identificar requisitos não atendidos.
- Criar interface de análise para RH.
- Criar testes automatizados de classificação.

## FASE 5: Processo seletivo

- Implementar esteira de etapas.
- Criar histórico de movimentações.
- Implementar observações do RH.
- Criar visualizações de acompanhamento.

## FASE 6: Inteligência artificial e analytics

- Implementar extração estruturada de currículos.
- Criar integração opcional com IA.
- Implementar geração de resumos.
- Criar dashboards e indicadores.
- Preparar integração analítica externa.

## FASE 7: Integração com Figma e refinamento

- Implementar fielmente cada página do Figma.
- Reaproveitar componentes globais.
- Completar fluxos de navegação.
- Revisar responsividade.
- Validar acessibilidade.
- Comparar visualmente as telas.

Se o Figma estiver disponível antes dessa fase, utilize-o desde a construção inicial do frontend.

## FASE 8: Validação final

- Testes unitários.
- Testes de integração.
- Testes end-to-end.
- Verificação de permissões.
- Testes de envio de currículo.
- Testes de prazo de candidatura.
- Testes de compatibilidade.
- Testes de fluxo completo.
- Revisão de segurança.
- Documentação para execução e deploy.

# 19. FLUXO PRINCIPAL QUE DEVE FUNCIONAR

Ao final do desenvolvimento, deverá ser possível:

1. Um administrador cadastrar um recrutador.
2. O recrutador criar e publicar uma vaga.
3. Um candidato cadastrar-se e enviar seu currículo.
4. O candidato candidatar-se à vaga.
5. O sistema validar o prazo de inscrição.
6. O sistema armazenar a candidatura.
7. O sistema calcular a compatibilidade do candidato.
8. O RH visualizar o ranking da vaga.
9. O RH consultar informações e currículo do candidato.
10. O RH movimentar o candidato pelo processo seletivo.
11. O candidato consultar o andamento permitido.
12. Após o encerramento da vaga, novos interessados serem direcionados ao banco de talentos, sem criar candidaturas ativas retroativas.
13. O RH poder considerar talentos cadastrados para futuras oportunidades.

Esse fluxo deve ser comprovado com testes e não apenas descrito no README.

# 20. INSTRUÇÕES PARA EXECUÇÃO

Antes de escrever código, inspecione o diretório atual e os materiais fornecidos.

Se houver arquivos antigos, não os apague automaticamente. O objetivo é reconstruir o sistema do zero, preservando a segurança dos arquivos existentes.

Primeiro, crie:

- `docs/architecture.md`
- `docs/requirements.md`
- `docs/database.md`
- `docs/figma-mapping.md`
- `docs/implementation-plan.md`

Registre os requisitos extraídos da documentação e sua correspondência com módulos e testes.

Depois, **comece imediatamente a implementar a Fase 1**.

Não encerre sua atuação entregando apenas arquivos Markdown.

Tome decisões técnicas razoáveis quando houver lacunas não críticas. Documente essas decisões e suas justificativas.

Se faltar o Figma, prossiga com os módulos independentes dele.

Ao concluir cada etapa:

- Informe quais arquivos foram criados.
- Explique o que já funciona.
- Execute os testes disponíveis.
- Corrija erros encontrados.
- Informe pendências e limitações.
- Mantenha a aplicação inicializável.

Não afirme que algo foi testado sem executar o teste.

**OBJETIVO FINAL:** Entregar um Sistema de Banco de Talentos completo, confiável, seguro, visualmente fiel ao Figma e funcional de ponta a ponta, respeitando os requisitos fornecidos pela Point Media.

Comece agora pela análise dos arquivos disponíveis, definição da arquitetura e implementação efetiva da Fase 1.
