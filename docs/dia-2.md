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

- [x] Criar `Processo`, `ActoPiquete` e `PecaProcessual`.
- [x] Criar os value objects `NumeroProcesso`, `Tipicidade` e `HashDocumento`.
- [x] Criar os eventos `ProcessoInstaurado` e `ActoPiqueteRegistado`.
- [x] Criar interfaces de repositório para processo, acto e peça.
- [x] Implementar repositórios Prisma na infraestrutura.
- [x] Criar testes unitários das entidades.

## Critério de conclusão

- [x] Entidades compilam sem importar Prisma ou NestJS.
- [x] Testes unitários passam.
- [x] Interfaces de repositório estão definidas.
- [x] As entidades validam estados inválidos e transições não permitidas.
- [x] Os value objects rejeitam valores vazios ou com formato inválido.
- [x] Existe uma separação clara entre domínio, aplicação e infraestrutura.
- [x] Os testes cobrem os casos de sucesso e os principais casos de erro.
- [x] Realizar um commit significativo com a mensagem `feat(domain): add entities and repository ports`.
