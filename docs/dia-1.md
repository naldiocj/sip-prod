# Dia 1 — Fundação

## Objetivo

Criar o monorepo, configurar Docker, ligar a base de dados e criar o schema Prisma inicial.

## Tarefas

- [x] Criar o monorepo Turborepo com pnpm.
- [x] Criar `apps/api`, `apps/web`, `packages/database`, `packages/domain`, `packages/ui` e `packages/config`.
- [x] Inicializar NestJS em `apps/api`.
- [x] Inicializar Next.js em `apps/web` com TypeScript, Tailwind e App Router.
- [x] Configurar Prisma em `packages/database`.
- [x] Criar Docker Compose com PostgreSQL 16, Redis, API e Web.
- [x] Criar os modelos Prisma iniciais `User` e `UnidadeOrganica`.
- [x] Configurar scripts de raiz: `dev`, `build` e `db:migrate`.

## Critério de conclusão

- [x] `docker compose up` levanta PostgreSQL e Redis.
- [ ] `pnpm dev` arranca API e Web.
- [x] `pnpm db:migrate` cria as tabelas.
- [x] O ficheiro `.env.example` documenta todas as variáveis necessárias sem conter segredos reais.
- [x] API e Web arrancam sem erros numa instalação limpa seguindo o README.
- [x] Os serviços PostgreSQL e Redis têm healthchecks configurados.
- [x] Realizar um commit significativo com a mensagem `feat(foundation): initialize monorepo and database`.

> Pendente: executar `pnpm dev` e confirmar os dois processos em desenvolvimento em simultâneo.
