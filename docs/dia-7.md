# Dia 7 — Testes, seed, documentação e demo

## Objetivo

Entregar um MVP demonstrável, estável e documentado.

## Tarefas

- Criar seed com 8 roles, permissões, utilizadores de teste, 5 unidades, 3 tipos de acto e 2 templates.
- Criar testes E2E para Piquete → processo, Entrada PGR → número guardado e peça → PDF com hash.
- Criar `README.md` com setup, comandos e credenciais de seed.
- Criar `AGENTS.md` com convenções do projecto.
- Criar ADRs sobre NestJS, RBAC hierárquico e CQRS/Domain Events.
- Preparar `docker-compose.prod.yml` com variáveis, healthchecks e volumes.
- Criar o guião da demo ponta a ponta.

## Critério de conclusão

- `pnpm db:seed` popula os dados.
- `pnpm test:e2e` passa.
- A demo corre sem erros do login ao audit log.
- Uma instalação nova consegue seguir o README do início ao fim sem passos implícitos.
- Os testes unitários, de integração e E2E são executados num único comando documentado.
- Não existem segredos, credenciais reais ou dados pessoais reais no repositório.
- O estado conhecido do MVP, limitações e próximos itens estão documentados.
- Realizar um commit significativo com a mensagem `docs(test): finalize mvp seed tests and documentation`.

## Guião da demo

1. Login como `agente_piquete` e registo de Auto de Notícia.
2. Mostrar processo criado com número SIC.
3. Login como `oficial_secretaria` e registo de entrada PGR.
4. Login como `instrutor` e geração de peça PDF com hash.
5. Login como `procurador` e consulta/despacho do processo.
6. Mostrar o audit log.

## Backlog pós-MVP

| Item                                     | Prioridade |
| ---------------------------------------- | ---------- |
| Editor visual de templates               | Alta       |
| Fluxo de despacho com assinatura digital | Alta       |
| Dashboard da Direção com métricas        | Média      |
| Integração com SIGNUP via API            | Média      |
| Cifra de dados sensíveis com pgcrypto    | Alta       |
| Audit log imutável com hash chain        | Alta       |
| Notificações por email/SMS               | Média      |
| Relatórios exportáveis em PDF/Excel      | Média      |
| MFA para perfis de chefia                | Alta       |
| Backup 3-2-1 automatizado                | Alta       |

## Regras de execução

1. Não adicionar scope creep durante a semana.
2. Fazer um commit diário.
3. Não avançar sem os testes do dia atual.
4. Rever manualmente o código gerado pelo Agnes Code.
5. Fazer uma demo de cinco minutos no fim de cada dia.
