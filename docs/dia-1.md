# Dia 1 — Fundação

## Objetivo

Criar o monorepo, configurar Docker, ligar a base de dados e criar o schema Prisma inicial.

## Tarefas

- Criar o monorepo Turborepo com pnpm.
- Criar `apps/api`, `apps/web`, `packages/database`, `packages/domain`, `packages/ui` e `packages/config`.
- Inicializar NestJS em `apps/api`.
- Inicializar Next.js em `apps/web` com TypeScript, Tailwind e App Router.
- Configurar Prisma em `packages/database`.
- Criar Docker Compose com PostgreSQL 16, Redis, API e Web.
- Criar os modelos Prisma iniciais `User` e `UnidadeOrganica`.
- Configurar scripts de raiz: `dev`, `build` e `db:migrate`.

## Critério de conclusão

- `docker compose up` levanta PostgreSQL e Redis.
- `pnpm dev` arranca API e Web.
- `pnpm db:migrate` cria as tabelas.
- O ficheiro `.env.example` documenta todas as variáveis necessárias sem conter segredos reais.
- API e Web arrancam sem erros numa instalação limpa seguindo o README.
- Os serviços PostgreSQL e Redis têm healthchecks configurados.
- Realizar um commit significativo com a mensagem `feat(foundation): initialize monorepo and database`.
