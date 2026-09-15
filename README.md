# SIP

Monorepo do Sistema de Informação de Processos, gerido com pnpm e Turborepo.

## Desenvolvimento

Requisitos: Node.js 20+, pnpm 10+ e Docker Compose.

```bash
cp .env.example .env
pnpm install
docker compose up -d postgres redis
pnpm db:migrate
pnpm dev
```

A API fica disponível em `http://localhost:3001` e a aplicação Web em `http://localhost:3000`.

Para arrancar todos os serviços em contentores: `docker compose up --build`.
