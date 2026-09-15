# Dia 2 — Domain e Clean Architecture

## Objetivo

Definir entidades de domínio puras e interfaces de repositório, sem dependências de Prisma ou NestJS.

## Estrutura prevista

```text
apps/api/src/
├── domain/
│   ├── entities/
│   ├── value-objects/
│   └── repositories/
├── application/
│   ├── commands/
│   ├── queries/
│   └── events/
├── infrastructure/
│   ├── database/
│   ├── pdf/
│   └── security/
└── interface/
    ├── http/
    └── dtos/
```

## Tarefas

- Criar `Processo`, `ActoPiquete` e `PecaProcessual`.
- Criar os value objects `NumeroProcesso`, `Tipicidade` e `HashDocumento`.
- Criar os eventos `ProcessoInstaurado` e `ActoPiqueteRegistado`.
- Criar interfaces de repositório para processo, acto e peça.
- Implementar repositórios Prisma na infraestrutura.
- Criar testes unitários das entidades.

## Critério de conclusão

- Entidades compilam sem importar Prisma ou NestJS.
- Testes unitários passam.
- Interfaces de repositório estão definidas.
- As entidades validam estados inválidos e transições não permitidas.
- Os value objects rejeitam valores vazios ou com formato inválido.
- Existe uma separação clara entre domínio, aplicação e infraestrutura.
- Os testes cobrem os casos de sucesso e os principais casos de erro.
- Realizar um commit significativo com a mensagem `feat(domain): add entities and repository ports`.
