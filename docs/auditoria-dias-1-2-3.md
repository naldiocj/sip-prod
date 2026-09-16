# Auditoria Formal dos Dias 1, 2 e 3

**Data:** 2026-09-15  
**Âmbito:** monorepo, infraestrutura base, domínio, RBAC e autenticação.  
**Veredicto inicial:** **Reprovado para avançar para o Dia 4 sem restrições**.  
**Re-auditoria parcial:** os achados críticos de JWT, brute-force, secrets de Compose e logout foram remediados; permanecem achados altos e médios descritos abaixo.

**Atualização de normalização:** em 2026-09-15 foi aplicada a normalização PostgreSQL para tabelas/colunas snake_case, com migrações de preservação de dados e gate automático `pnpm validate:prisma`.

**Validação de instalação limpa:** a migration única `20260915221251_init_normalizado` foi aplicada numa base vazia e o seed criou 8 roles, 30 permissões, 20 relações role-permission e 8 utilizadores.

## 1. Sumário executivo

A base compila, o schema Prisma está válido, as migrações estão sincronizadas, não foram encontrados ciclos de dependência e os 23 testes atuais passam. O login e a rotação de refresh token também foram validados contra a API compilada e PostgreSQL.

Apesar disso, a auditoria encontrou riscos que impedem aprovação formal:

- O `docker-compose.yml` exige agora credenciais e `JWT_SECRET` por ambiente; o `.env.example` contém apenas valores de desenvolvimento explícitos.
- Existe rate limiting global via `@nestjs/throttler`.
- O access token inclui `type: access` e o guard valida esse tipo.
- Refresh tokens têm `sessionId`, logout e revogação da família em caso de reuse.
- O custo bcrypt foi aumentado para 12.
- Existem 13 vulnerabilidades reportadas por `pnpm audit`, incluindo 7 de severidade alta.
- Eventos de domínio são limpos pelos adaptadores, mas não existe outbox, publisher ou persistência de eventos.
- A cobertura não foi medida porque `@vitest/coverage-v8` não está instalado.

**Conclusão:** a implementação está funcional e os blockers de autenticação imediata foram corrigidos, mas ainda não cumpre todos os requisitos de segurança, observabilidade e operação para aprovação sem restrições.

## 2. Evidência automática

| Verificação | Resultado |
|---|---|
| `pnpm lint` | Passou |
| `pnpm typecheck` | Passou em 6 packages |
| `pnpm test` | 23 testes passaram |
| `pnpm build` | Passou em 6 packages |
| `prisma validate` | Passou |
| `prisma migrate status` | 1 migration normalizada, schema atualizado |
| Seed Prisma | Executado duas vezes com sucesso |
| Madge circular | Nenhuma dependência circular |
| Depcheck | Nenhum problema reportado |
| `pnpm audit --audit-level=high` | Falhou: 13 vulnerabilidades, 7 altas |
| Vitest coverage | Executado com `@vitest/coverage-v8`; domínio a 100% |
| Docker Compose config | Válida |
| Docker Compose runtime | Apenas PostgreSQL observado como saudável |

### Verificações end-to-end

O fluxo real contra a API compilada e PostgreSQL produziu:

```text
login: 200
refresh: 200
reusedRefresh: 401
rotatedTokenChanged: true
```

O login real devolveu `sub`, role e permissões efetivas do utilizador seedado.

## 3. Achados do Dia 1

### AUD-D1-001 — Crítico — Segredo JWT de desenvolvimento no Compose

**Estado:** **Remediado em 2026-09-15**.

**Evidência:** [docker-compose.yml](../docker-compose.yml) define credenciais PostgreSQL diretamente e não define `JWT_SECRET` nem `NODE_ENV` para a API. O módulo auth possui fallback de desenvolvimento.

**Impacto inicial:** um deployment baseado diretamente neste Compose podia arrancar com segredo JWT conhecido, permitindo forjar tokens se o serviço fosse exposto.

**Recomendação:** remover segredos do Compose, exigir variáveis de ambiente reais, falhar no arranque quando `JWT_SECRET` não tiver comprimento mínimo e fornecer um ficheiro de deployment separado para produção.

**Correção:** o Compose exige `POSTGRES_*` e `JWT_SECRET`, e a API falha em produção sem segredo. As URLs internas usam os nomes de serviço Docker.

### AUD-D1-002 — Alta — Compose não comprova arranque completo

**Evidência:** `docker compose config --quiet` passou, mas `docker compose ps` mostrou apenas `sip-postgres-1` saudável. Não houve evidência de API e web em execução pelo Compose.

**Impacto:** a reprodutibilidade do ambiente completo não está demonstrada.

**Recomendação:** adicionar uma verificação CI que execute `docker compose up --build -d`, aguarde healthchecks de todos os serviços e teste `/health`.

**Prazo:** antes do MVP.

### AUD-D1-003 — Alta — PrismaService sem lifecycle explícito

**Estado:** **Remediado em 2026-09-15**.

**Evidência inicial:** [prisma.service.ts](../apps/api/src/infrastructure/database/prisma.service.ts) não implementava `OnModuleInit`/`OnModuleDestroy`, `$connect` ou `$disconnect`.

**Impacto inicial:** o ciclo de vida das ligações não era controlado explicitamente, dificultando shutdown limpo, testes e diagnósticos de pool.

**Recomendação:** implementar os hooks Nest e testes de inicialização/destruição.

**Correção:** `PrismaService` implementa `OnModuleInit`/`OnModuleDestroy` com `$connect`/`$disconnect`.

### AUD-D1-004 — Média — Configuração TypeScript incompleta

**Evidência:** não existe `tsconfig.base.json`; `noUnusedLocals`, `noUnusedParameters` e `noImplicitAny` não estão explicitamente configurados. Também não existe `.nvmrc` nem `engines` no package root.

**Impacto:** regras podem divergir entre packages e a versão de Node fica dependente do ambiente do developer.

**Recomendação:** criar base comum, ativar flags explicitamente e fixar Node com `engines`/`.nvmrc`.

**Prazo:** antes do MVP.

### AUD-D1-005 — Média — Falta de pre-commit e pipelines Turbo de test/lint

**Evidência:** não existe Husky/lint-staged; `turbo.json` define build, dev e typecheck, mas não tarefas test/lint por package.

**Impacto:** uma alteração pode passar localmente sem os checks formais, e o CI não tem uma topologia completa.

**Recomendação:** adicionar scripts homogéneos por package e hooks/CI determinísticos.

**Prazo:** antes do MVP.

### AUD-D1-006 — Remediado — Convenção de nomes PostgreSQL não automatizada

**Estado:** **Remediado em 2026-09-15**.

**Correção:** o schema usa `@map`/`@@map`, as tabelas foram normalizadas para snake_case plural, a relação implícita foi convertida em `role_permissions`, e foi adicionado `scripts/validate-prisma-naming.sh`, executado por `pnpm validate:prisma` e `pnpm ci`.

## 4. Achados do Dia 2

### AUD-D2-001 — Alta — Eventos são descartados sem publicação

**Evidência:** entidades acumulam eventos e os adaptadores chamam `limparEventos()`, mas não existe outbox, publisher ou tabela de eventos.

**Impacto:** `ProcessoInstaurado` e `ActoPiqueteRegistado` podem desaparecer depois do save. Isso compromete auditoria e cadeia de custódia.

**Recomendação:** persistir eventos numa outbox transacional ou publicar através de um event bus antes de limpar a coleção.

**Prazo:** bloqueante para workflows jurídicos; corrigir antes do Dia 4 se eventos forem usados pelo próximo fluxo.

### AUD-D2-002 — Alta — Ciclo de Processo incompleto

**Evidência:** [processo.entity.ts](../apps/api/src/domain/entities/processo.entity.ts) implementa instrução, remessa, registo de procuradoria e arquivamento, mas o enum também declara `DESPACHADO`, `CUMPRIDO`, `ACUSADO`, `SUSPENSO` e `EXTINTO` sem operações correspondentes.

**Impacto:** estados podem existir no modelo sem transições de negócio protegidas.

**Recomendação:** definir a matriz de transições autorizadas, implementar os métodos necessários e testar cada transição válida e inválida.

**Prazo:** antes de implementar os fluxos que usam esses estados.

### AUD-D2-003 — Média — Cobertura de domínio não mensurada

**Estado:** **Remediado parcialmente em 2026-09-15**.

**Evidência inicial:** há um ficheiro agregado [domain.spec.ts](../apps/api/src/domain/domain.spec.ts), mas não havia provider `@vitest/coverage-v8`.

**Impacto inicial:** o critério de cobertura mínima de 90% não podia ser comprovado.

**Recomendação:** instalar o provider, publicar limiares de cobertura e separar testes por entidade/value object.

**Correção:** `pnpm test:coverage` executa sem prompts e mede 100% no diretório `src/domain`; adaptadores/bootstrap continuam sem cobertura dedicada.

### AUD-D2-004 — Média — Adaptadores usam casts diretos

**Evidência:** `prisma-acto-piquete.repository.ts` reconstrói entidades com `row as ActoPiqueteProps`.

**Impacto:** alterações no schema podem quebrar invariantes do domínio sem erro de compilação.

**Recomendação:** criar mappers explícitos `paraModelo`/`paraDominio` para todos os agregados e validar enums/VOs na reconstrução.

**Prazo:** antes do MVP.

## 5. Achados do Dia 3

### AUD-D3-001 — Crítico — Rate limiting e proteção contra brute-force ausentes

**Estado:** **Remediado parcialmente em 2026-09-15**.

**Evidência:** não há `@nestjs/throttler`, `@Throttle`, contador de tentativas ou bloqueio temporário no endpoint `/auth/login`.

**Impacto:** credenciais podem ser testadas indefinidamente; o endpoint é um alvo direto de brute-force.

**Correção:** `@nestjs/throttler` foi adicionado como `APP_GUARD`, com limite global de 10 pedidos por minuto. Ainda falta tornar o armazenamento distribuído em Redis e implementar bloqueio progressivo por identidade.

**Prazo residual:** antes de produção.

### AUD-D3-002 — Alta — Access token sem `type: access`

**Estado:** **Remediado em 2026-09-15**.

**Evidência:** [auth.service.ts](../apps/api/src/auth/auth.service.ts) emite access tokens com `sub`, email, roles e permissions, mas sem `type: "access"`; o guard também não exige esse tipo.

**Impacto inicial:** o contrato de tokens ficava ambíguo e um token de finalidade errada podia ser aceite por uma rota protegida se fosse assinado com a mesma chave.

**Recomendação:** incluir `type: "access"` no access token e validar `type === "access"` no `AuthGuard`.

**Correção:** o serviço emite `type: "access"` e o `AuthGuard` rejeita qualquer outro tipo.

### AUD-D3-003 — Alta — Refresh token sem revogação de família e sem logout

**Estado:** **Remediado parcialmente em 2026-09-15**.

**Evidência:** existe rotação individual e `replacedByTokenId`, mas não existe `sessionId`/family id, endpoint de logout ou revogação de toda a família após reuse detectado.

**Impacto inicial:** um refresh token roubado podia continuar a ser usado se uma rotação concorrente ocorresse; não havia controlo operacional para terminar sessões.

**Recomendação:** adicionar `sessionId`, estado de família comprometida, logout, revogação por utilizador e testes de reuse concorrente.

**Correção:** foi adicionada `sessionId`, endpoint `POST /auth/logout`, rotação transacional e revogação dos tokens ativos da família quando um token revogado é reutilizado. Falta um teste concorrente explícito.

### AUD-D3-004 — Alta — Bcrypt abaixo do critério definido

**Estado:** **Remediado em 2026-09-15**.

**Evidência:** seed e `AuthService.hashPassword` usam cost 10. O plano de auditoria exige cost mínimo 12.

**Impacto inicial:** aumentava a velocidade de ataques offline caso hashes fossem expostos.

**Recomendação:** subir para cost 12, medir latência no ambiente alvo e fazer rehash progressivo de passwords antigas.

**Correção:** o custo de hash novo foi aumentado para 12. Falta rehash progressivo de hashes antigos.

### AUD-D3-005 — Alta — Modelo de sessão incompleto

**Evidência:** `RefreshToken` não tem `sessionId`; `User` não tem `activo`; não há logout nem revogação ao mudar password/desativar utilizador.

**Impacto:** gestão de sessões e resposta a incidentes ficam incompletas.

**Recomendação:** adicionar estado de utilizador, família de sessão, endpoints de revogação e job de limpeza de tokens expirados.

**Prazo:** antes de produção.

### AUD-D3-006 — Média — Testes HTTP e de isolamento incompletos

**Evidência:** os 8 testes de auth são unitários. Não há `test:e2e` nem testes HTTP automatizados para `401`, `403`, `@Public()`, procurador isolado e guards na ordem real do Nest.

**Impacto:** a integração de módulos pode regredir sem os testes unitários detetarem.

**Recomendação:** adicionar suite Supertest/Nest testing com PostgreSQL de teste ou containers efémeros.

**Prazo:** antes do Dia 4.

## 6. Achados transversais

### AUD-T-001 — Alta — Dependências vulneráveis

`pnpm audit --audit-level=high` reportou **13 vulnerabilidades**, sendo **7 altas**, incluindo PostCSS, deepmerge-ts, mysql2 e multer transitivos.

**Recomendação:** atualizar dependências compatíveis, aplicar overrides quando seguro, remover dependências transitivas não necessárias e repetir o audit. Não avançar para produção com vulnerabilidades altas sem exceção formal documentada.

### AUD-T-002 — Média — Relatório de coverage indisponível

**Estado:** **Remediado parcialmente em 2026-09-15**.

O provider `@vitest/coverage-v8` foi instalado e `pnpm run ci` executa a cobertura sem prompts. A cobertura global da API ainda não atinge 70% porque os adaptadores e o bootstrap não têm testes.

### AUD-T-003 — Baixa — Ferramentas de auditoria ausentes no ambiente

`rg` e `psql` não estão instalados neste ambiente. Os checks equivalentes foram substituídos por `grep`/queries via Prisma quando possível; a ausência deve ser corrigida no ambiente de desenvolvimento/CI para reproduzir exatamente os comandos documentados.

### AUD-T-004 — Média — Working tree não consolidado

Existem alterações e ficheiros novos não commitados, incluindo o adaptador Prisma de auth, seed e migração `20260915212432_auth_and_domain`. Os commits existentes são convencionais, mas o estado auditado ainda não está representado num commit.

## 7. Critérios de aceitação

| Área | Estado |
|---|---|
| Monorepo compila | Passa |
| Prisma valida e migra | Passa |
| PostgreSQL usa snake_case | Passa; 5 migrações aplicadas |
| Gate automático de naming | Passa: `pnpm validate:prisma` |
| Sem ciclos de dependência | Passa |
| Domínio sem imports proibidos | Passa na verificação manual disponível |
| Testes unitários | Passa: 23 testes |
| Build completo | Passa |
| Cobertura mínima de 90% | Não comprovada |
| Docker completo saudável | Não comprovado |
| Segurança de tokens | Passa para tipo access, sessão e logout; falta teste concorrente |
| Rate limiting | Passa em limite local; falta backend distribuído |
| Dependências sem vulnerabilidades altas | Falha |

## 8. Plano de remediação

### Bloqueante antes do Dia 4

1. Exigir `JWT_SECRET` seguro no Compose/deployment e remover fallback em ambientes não locais. **Concluído.**
2. Adicionar `type: access` e validação correspondente no guard. **Concluído.**
3. Adicionar rate limiting no login e testes de abuso. **Concluído parcialmente: falta backend Redis/distributed.**
4. Implementar testes HTTP para 401/403, `@Public()` e isolamento do procurador.
5. Definir estratégia de outbox/publicação dos eventos antes de depender deles no Dia 4.

### Durante o Dia 4

1. Implementar `sessionId`, logout e revogação da família.
2. Subir bcrypt para cost 12 com rehash progressivo.
3. Implementar lifecycle explícito do PrismaService.
4. Completar as transições de Processo necessárias ao fluxo seguinte.
5. Instalar coverage provider e impor limiares.

### Antes do MVP

1. Resolver as 7 vulnerabilidades altas e documentar qualquer exceção.
2. Fixar Node, flags TypeScript e scripts Turbo de test/lint.
3. Adicionar CI com Compose, migrations, seed idempotente e healthchecks.
4. Substituir casts dos adaptadores por mappers explícitos.
5. Criar documentação de setup, operação e resposta a incidentes.

## 9. Assinatura e veredicto

**Auditor:** revisão secundária automatizada/manual no ambiente local  
**Data:** 2026-09-15  
**Veredicto atual:** **⚠️ Aprovado com restrições**.

Os blockers imediatos de JWT, secrets de Compose, rate limiting básico, logout e nomenclatura PostgreSQL foram corrigidos e revalidados com 24 testes. O Dia 4 pode começar em desenvolvimento, mas os achados altos sobre vulnerabilidades de dependências, outbox/eventos, testes HTTP, lifecycle Prisma e rate limiting distribuído continuam obrigatórios antes do MVP/produção.
