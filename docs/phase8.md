# Fase 8 — validação integrada e preparação de produção

Continuidade autorizada pelo usuário em 02/11/2026 após o refinamento e a correção do cadastro. Preservar a criação de conta somente no envio final aceito da vaga/banco, com senha no mesmo formulário.

## Escopo desta entrega

- Executar os 13 passos do fluxo principal em um cenário contínuo de navegador/API/PostgreSQL reais, com Admin, RH e candidatos distintos, currículo privado, ranking, decisões humanas, prazo e participação no banco.
- Revisar autenticação, autorização, arquivos, configuração e respostas; corrigir falhas comprovadas sem alterar regras de negócio.
- Preparar o armazenamento persistente de currículos e a configuração explícita do proxy da API; manter o desenvolvimento local funcionando.
- Documentar execução em produção, configuração de proxy, backup/restauração, rollback e limites de publicação. Nenhum provedor ou serviço pago será introduzido.
- Atualizar rastreabilidade e registrar testes, falhas, correções e pendências reais.

## Limites

O usuário confirmou que não possui hospedagem/domínio. A pasta também está sem metadados Git. Não publicar, fazer commits, resetar bancos ou configurar serviços externos por inferência. A infraestrutura escolhida e as políticas de LGPD ainda precisam ser definidas antes do uso com dados reais.

As telas administrativas de usuários/cadastro RH, logs e sistema continuam pendentes; a criação restrita de RH pela API já existe e será usada no fluxo integrado. IA permanece desativada por escolha do usuário. Esses limites impedem declarar o sistema inteiro ou a publicação em produção concluídos somente com a validação local.

## Resultado

Escopo local validado: 203 testes automatizados, sete verificações do comando de preparação e quatro asserções Postman. Configuração explícita de proxy/storage, modelos operacionais e procedimento de backup/restauração preparados. Evidências, arquivos, limites do sandbox e pendências em [validation-phase8.md](validation-phase8.md); orientação operacional em [deployment.md](deployment.md). Auditoria remota de dependências e ensaio de restauração continuam pendentes. Nenhuma publicação realizada.
