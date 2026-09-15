Amigo, aqui está o plano de desenvolvimento completo, dia a dia, com entregáveis concretos, comandos e o que pedir ao Agnes Code em cada fase. Assumi a stack sénior que definimos: **Monorepo Turborepo + NestJS 11 + Next.js 16 + Prisma 7 + PostgreSQL 16 + RBAC hierárquico + Docker Compose**.

---

## 📅 Visão Geral da Semana

| Dia | Foco                                         | Entregável                         |
| --- | -------------------------------------------- | ---------------------------------- |
| 1   | Fundação do monorepo + Docker + Prisma       | Ambiente a correr, schema inicial  |
| 2   | Domain + Clean Architecture + Repositórios   | Camadas definidas, entidades puras |
| 3   | RBAC hierárquico + Autenticação              | 7 perfis com permissões funcionais |
| 4   | Fluxo Piquete + Instauração de Processo      | Registo de ato → processo criado   |
| 5   | Secretaria (Entrada PGR) + Peças Processuais | Entrada registada, PDF gerado      |
| 6   | Frontend Next.js + Middleware RBAC           | Ecrãs essenciais funcionais        |
| 7   | Testes, seed, documentação, demo             | MVP demonstrável                   |

---

## 🗓️ DIA 1 — Fundação

**Objetivo:** Monorepo a correr com Docker, base de dados ligada, schema Prisma inicial.

### Tarefas

**1.1 — Criar o monorepo**

```bash
pnpm dlx create-turbo@latest sic-processual --package-manager pnpm
cd sic-processual
```

**1.2 — Estrutura de apps e packages**

```bash
mkdir -p apps/api apps/web packages/database packages/domain packages/ui packages/config
```

**1.3 — Inicializar NestJS em `apps/api`**

```bash
cd apps/api
pnpm dlx @nestjs/cli new . --package-manager pnpm --skip-git
```

**1.4 — Inicializar Next.js em `apps/web`**

```bash
cd ../web
pnpm dlx create-next-app@latest . --typescript --tailwind --app --no-src-dir --import-alias "@/*"
```

**1.5 — Configurar Prisma em `packages/database`**

```bash
cd ../../packages/database
pnpm init
pnpm add -D prisma
pnpm add @prisma/client
pnpm dlx prisma init
```

**1.6 — Docker Compose na raiz**

```yaml
# docker-compose.yml
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: sic
      POSTGRES_PASSWORD: sic_dev
      POSTGRES_DB: sic_processual
    ports: ["5432:5432"]
    volumes: ["pgdata:/var/lib/postgresql/data"]
  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]
  api:
    build: ./apps/api
    depends_on: [postgres, redis]
    ports: ["3001:3001"]
  web:
    build: ./apps/web
    depends_on: [api]
    ports: ["3000:3000"]
volumes:
  pgdata:
```

**1.7 — Schema Prisma inicial (só o essencial)**

```prisma
// packages/database/prisma/schema.prisma
generator client { provider = "prisma-client-js" }
datasource db { provider = "postgresql"; url = env("DATABASE_URL") }

model User {
  id             String   @id @default(cuid())
  email          String   @unique
  passwordHash   String
  nomeCompleto   String
  funcao         String
  unidadeId      String
  unidade        UnidadeOrganica @relation(fields: [unidadeId], references: [id])
  activo         Boolean  @default(true)
  createdAt      DateTime @default(now())
}

model UnidadeOrganica {
  id        String   @id @default(cuid())
  codigo    String   @unique
  nome      String
  tipo      String
  parentId  String?
  parent    UnidadeOrganica? @relation("Hierarquia", fields: [parentId], references: [id])
  filhos    UnidadeOrganica[] @relation("Hierarquia")
  users     User[]
}
```

**Prompt para Agnes Code:**

> "Configura o Turborepo para orquestrar `apps/api` (NestJS) e `apps/web` (Next.js), com `packages/database` a exportar o Prisma Client. Cria scripts `dev`, `build` e `db:migrate` na raiz."

### ✅ Critério de Done

- `docker compose up` levanta PostgreSQL + Redis.
- `pnpm dev` arranca API e Web.
- `pnpm db:migrate` cria as tabelas.

---

## 🗓️ DIA 2 — Domain + Clean Architecture

**Objetivo:** Definir entidades de domínio puras e interfaces de repositório, sem dependência de Prisma.

### Tarefas

**2.1 — Estrutura de camadas em `apps/api/src`**

```
src/
├── domain/
│   ├── entities/        # Processo, ActoPiquete, PecaProcessual
│   ├── value-objects/   # NumeroProcesso, Tipicidade, HashDocumento
│   └── repositories/    # Interfaces (ports)
├── application/
│   ├── commands/        # CriarProcesso, InstaurarProcesso
│   ├── queries/         # ListarProcessosPorUnidade
│   └── events/          # ActoPiqueteRegistado
├── infrastructure/
│   ├── database/        # PrismaProcessoRepository
│   ├── pdf/             # GeradorPecaPDF
│   └── security/        # HashService
└── interface/
    ├── http/            # Controllers
    └── dtos/
```

**2.2 — Entidade `Processo` (domínio puro)**

```typescript
// domain/entities/processo.entity.ts
export class Processo {
  constructor(
    public readonly id: string,
    public readonly numeroInterno: string,
    public numeroProcuradoria: string | null,
    public estado: EstadoProcesso,
    public readonly origem: OrigemProcesso,
    private readonly eventos: DomainEvent[] = []
  ) {}

  static instaurar(numeroInterno: string, origem: OrigemProcesso): Processo {
    const p = new Processo(cuid(), numeroInterno, null, EstadoProcesso.RASCUNHO, origem);
    p.adicionarEvento(new ProcessoInstaurado(p.id, numeroInterno));
    return p;
  }

  registarNumeroProcuradoria(numero: string) {
    if (!this.estadoEhRemetido()) throw new Error("Processo não foi remetido");
    this.numeroProcuradoria = numero;
    this.adicionarEvento(new NumeroProcuradoriaRegistado(this.id, numero));
  }
}
```

**2.3 — Interface do repositório**

```typescript
// domain/repositories/processo.repository.ts
export interface ProcessoRepository {
  save(processo: Processo): Promise<void>;
  findById(id: string): Promise<Processo | null>;
  findByNumeroInterno(numero: string): Promise<Processo | null>;
  listarPorUnidade(unidadeId: string): Promise<Processo[]>;
}
```

**2.4 — Implementação Prisma**

```typescript
// infrastructure/database/prisma-processo.repository.ts
@Injectable()
export class PrismaProcessoRepository implements ProcessoRepository {
  constructor(private prisma: PrismaService) {}
  async save(p: Processo) {
    await this.prisma.processo.upsert({ where: { id: p.id }, create: {...}, update: {...} });
    await this.dispatchEvents(p);
  }
}
```

**Prompt para Agnes Code:**

> "Cria as entidades de domínio `Processo`, `ActoPiquete` e `PecaProcessual` com value objects para `NumeroProcesso` e `HashDocumento`. As entidades não podem importar Prisma nem NestJS. Cria as interfaces de repositório correspondentes."

### ✅ Critério de Done

- Entidades de domínio compilam sem dependências externas.
- Testes unitários das entidades passam.
- Interfaces de repositório definidas.

---

## 🗓️ DIA 3 — RBAC Hierárquico + Autenticação

**Objetivo:** 7 perfis funcionais com herança hierárquica e guards a proteger endpoints.

### Tarefas

**3.1 — Schema Prisma para RBAC**

```prisma
model Role {
  id          String   @id @default(cuid())
  codigo      String   @unique   // "diretor_geral", "instrutor"
  nome        String
  parentId    String?
  parent      Role?    @relation("HierarquiaRole", fields: [parentId], references: [id])
  filhos      Role[]   @relation("HierarquiaRole")
  permissions Permission[]
  users       UserRole[]
}

model Permission {
  id     String @id @default(cuid())
  codigo String @unique   // "processo:criar", "peca:gerar_pdf"
  roles  Role[]
}

model UserRole {
  userId String
  roleId String
  escopo String?  // "unidade:DN_CE", "provincia:LUANDA"
  user   User @relation(fields: [userId], references: [id])
  role   Role @relation(fields: [roleId], references: [id])
  @@id([userId, roleId])
}
```

**3.2 — Seed dos 7 perfis**

```typescript
const roles = [
  { codigo: "diretor_geral", parent: null },
  { codigo: "diretor_nacional", parent: "diretor_geral" },
  { codigo: "chefe_departamento", parent: "diretor_nacional" },
  { codigo: "chefe_seccao", parent: "chefe_departamento" },
  { codigo: "instrutor", parent: "chefe_seccao" },
  { codigo: "oficial_secretaria", parent: "chefe_departamento" },
  { codigo: "agente_piquete", parent: "chefe_seccao" },
  { codigo: "procurador", parent: null } // externo, sem herança
];
```

**3.3 — Permissions granulares**

```typescript
const permissions = [
  "acto_piquete:criar",
  "acto_piquete:validar",
  "processo:ler",
  "processo:distribuir",
  "processo:arquivar",
  "entrada_pgr:registar",
  "entrada_pgr:encaminhar",
  "peca:criar",
  "peca:gerar_pdf",
  "peca:assinar",
  "despacho:criar",
  "despacho:assinar",
  "relatorio:ver",
  "auditoria:ver"
];
```

**3.4 — Guard RBAC no NestJS**

```typescript
@Injectable()
export class PermissionsGuard implements CanActivate {
  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const required = this.reflector.get<string[]>("permissions", ctx.getHandler());
    if (!required) return true;
    const user = ctx.switchToHttp().getRequest().user;
    const perms = await this.rbacService.getEffectivePermissions(user.id);
    return required.every((p) => perms.includes(p));
  }
}
```

**3.5 — Decorador de permissão**

```typescript
export const RequirePermissions = (...perms: string[]) =>
  SetMetadata('permissions', perms);

// Uso:
@RequirePermissions('acto_piquete:criar')
@Post('actos')
criarActo(@Body() dto: CriarActoDto) { ... }
```

**3.6 — Autenticação JWT com refresh rotation**

```typescript
// Estratégia: access token 15min, refresh token 7 dias, rotação a cada uso
```

**Prompt para Agnes Code:**

> "Implementa o RBAC hierárquico com herança de permissões. Um utilizador com role `diretor_nacional` herda todas as permissões de `chefe_departamento`, `chefe_seccao`, `instrutor` e `agente_piquete`. Cria o `PermissionsGuard` e o decorador `@RequirePermissions`. Adiciona seed com os 8 roles e as permissions listadas."

### ✅ Critério de Done

- Login devolve JWT com roles e permissões efectivas.
- Endpoints protegidos rejeitam utilizadores sem permissão.
- Testes de herança: `diretor_nacional` consegue aceder a rotas de `instrutor`.

---

## 🗓️ DIA 4 — Fluxo Piquete + Instauração de Processo

**Objetivo:** Registo de acto no Piquete gera processo automaticamente com número interno.

### Tarefas

**4.1 — Schema Prisma**

```prisma
model TipoActo {
  id            String @id @default(cuid())
  codigo        String @unique
  nome          String
  geraProcesso  Boolean @default(true)
  schemaCampos  Json
  activo        Boolean @default(true)
}

model ActoPiquete {
  id            String @id @default(cuid())
  tipoActoId    String
  tipoActo      TipoActo @relation(fields: [tipoActoId], references: [id])
  piqueteId     String
  userRegistoId String
  numeroActo    String @unique
  factos        String
  dados         Json
  estado        EstadoActo @default(SUBMETIDO)
  processoId    String? @unique
  processo      Processo? @relation(fields: [processoId], references: [id])
  createdAt     DateTime @default(now())
}

model SequenciaNumeracao {
  id           String @id @default(cuid())
  unidade      String
  tipo         String
  ano          Int
  ultimoNumero Int    @default(0)
  @@unique([unidade, tipo, ano])
}
```

**4.2 — Serviço de numeração com lock**

```typescript
@Injectable()
export class GeradorNumeroProcesso {
  async gerar(unidade: string, tipo: string): Promise<string> {
    const ano = new Date().getFullYear();
    return this.prisma.$transaction(async (tx) => {
      const seq = await tx.sequenciaNumeracao.upsert({
        where: { unidade_tipo_ano: { unidade, tipo, ano } },
        create: { unidade, tipo, ano, ultimoNumero: 1 },
        update: { ultimoNumero: { increment: 1 } }
      });
      return `SIC/${unidade}/${tipo}/${ano}/${String(seq.ultimoNumero).padStart(6, "0")}`;
    });
  }
}
```

**4.3 — Caso de uso `RegistarActoPiquete`**

```typescript
@CommandHandler(RegistarActoPiqueteCommand)
export class RegistarActoPiqueteHandler {
  async execute(cmd: RegistarActoPiqueteCommand) {
    const tipo = await this.tipoActoRepo.findByCodigo(cmd.tipoCodigo);
    const numeroActo = await this.gerador.gerar(cmd.unidade, "ACTO");
    const acto = ActoPiquete.criar({ ...cmd, numeroActo, tipo });
    await this.actoRepo.save(acto);
    if (tipo.geraProcesso) {
      await this.eventBus.publish(new ActoPiqueteRegistado(acto.id));
    }
  }
}
```

**4.4 — Handler que instaura processo**

```typescript
@EventsHandler(ActoPiqueteRegistado)
export class InstaurarProcessoHandler {
  async handle(event: ActoPiqueteRegistado) {
    const acto = await this.actoRepo.findById(event.actoId);
    const numero = await this.gerador.gerar(acto.piquete.codigo, "PROC");
    const processo = Processo.instaurar(numero, OrigemProcesso.PIQUETE_SIC);
    await this.processoRepo.save(processo);
    await this.actoRepo.vincularProcesso(acto.id, processo.id);
  }
}
```

**4.5 — Controller**

```typescript
@Controller("actos-piquete")
export class ActoPiqueteController {
  @RequirePermissions("acto_piquete:criar")
  @Post()
  async criar(@Body() dto: CriarActoDto, @User() user: JwtPayload) {
    return this.commandBus.execute(new RegistarActoPiqueteCommand(dto, user));
  }
}
```

**Prompt para Agnes Code:**

> "Implementa o fluxo completo: `POST /actos-piquete` cria um `ActoPiquete`, gera número sequencial com lock transacional, publica evento `ActoPiqueteRegistado`, e o handler desse evento instaura um `Processo` com número interno próprio. Adiciona testes de integração."

### ✅ Critério de Done

- `POST /actos-piquete` cria acto + processo em transacção.
- Número interno segue formato `SIC/PIQ/LU/2026/000123`.
- Testes cobrem concorrência (dois pedidos simultâneos não colidem).

---

## 🗓️ DIA 5 — Secretaria (Entrada PGR) + Peças Processuais

**Objetivo:** Registar entrada de processo vindo da PGR e gerar peças em PDF.

### Tarefas

**5.1 — Schema Prisma**

```prisma
model EntradaProcesso {
  id                String @id @default(cuid())
  processoId        String @unique
  processo          Processo @relation(fields: [processoId], references: [id])
  unidadeRegistoId  String
  userRegistoId     String
  origem            OrigemProcesso
  numeroOrigem      String   // número da PGR
  documentoRef      String
  dataEntrada       DateTime @default(now())
  estado            EstadoEntrada @default(REGISTADA)
}

model PecaProcessual {
  id                String @id @default(cuid())
  processoId        String
  templateId        String
  tipo              String
  dados             Json
  estado            EstadoPeca @default(RASCUNHO)
  hashSha256        String?
  pdfPath           String?
  numeroOrdem       Int
  createdAt         DateTime @default(now())
  @@unique([processoId, numeroOrdem])
}

model TemplateDocumento {
  id            String @id @default(cuid())
  codigo        String @unique
  nome          String
  versao        String
  conteudoHtml  String
  schemaCampos  Json
  camposAuto    Json
  activo        Boolean @default(true)
}
```

**5.2 — Caso de uso `RegistarEntradaPGR`**

```typescript
@CommandHandler(RegistarEntradaPGRCommand)
export class RegistarEntradaPGRHandler {
  async execute(cmd) {
    const numeroInterno = await this.gerador.gerar(cmd.unidade, "PROC");
    const processo = Processo.instaurar(numeroInterno, OrigemProcesso.REMESSA_PGR);
    processo.registarNumeroProcuradoria(cmd.numeroProcuradoria);
    await this.processoRepo.save(processo);
    await this.entradaRepo.save(EntradaProcesso.criar({ ...cmd, processoId: processo.id }));
  }
}
```

**5.3 — Serviço de geração de PDF**

```typescript
@Injectable()
export class GeradorPecaPDF {
  async gerar(peca: PecaProcessual, template: TemplateDocumento): Promise<Buffer> {
    const html = this.renderTemplate(template.conteudoHtml, peca.dados);
    const pdf = await this.puppeteerService.htmlToPdf(html);
    const hash = crypto.createHash("sha256").update(pdf).digest("hex");
    await this.pecaRepo.updateHash(peca.id, hash);
    return pdf;
  }
}
```

**5.4 — Seed de um template (Auto de Notícia)**

```typescript
await prisma.templateDocumento.create({
  data: {
    codigo: "AUTO_NOTICIA_V1",
    nome: "Auto de Notícia",
    versao: "1.0",
    conteudoHtml: `<html>...{{numero_processo}}...{{factos}}...</html>`,
    schemaCampos: { factos: { tipo: "texto_longo", label: "Factos" } },
    camposAuto: { numero_processo: "processo.numeroInterno" }
  }
});
```

**Prompt para Agnes Code:**

> "Implementa o registo de entrada de processo vindo da PGR, gerando número interno e guardando o número da procuradoria. Depois, implementa o serviço de geração de PDF de peças processuais usando Puppeteer, com cálculo de hash SHA-256 e armazenamento do PDF."

### ✅ Critério de Done

- `POST /entradas-pgr` cria processo com número interno e regista número PGR.
- `POST /processos/:id/pecas` gera PDF com hash SHA-256.
- Template seedado funciona.

---

## 🗓️ DIA 6 — Frontend Next.js + Middleware RBAC

**Objetivo:** Ecrãs essenciais funcionais com protecção por perfil.

### Tarefas

**6.1 — Middleware RBAC no Next.js**

```typescript
// apps/web/middleware.ts
export function middleware(req: NextRequest) {
  const token = req.cookies.get("access_token")?.value;
  const path = req.nextUrl.pathname;

  if (!token && !path.startsWith("/login")) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const payload = decodeJwt(token);
  const guardas = [
    { prefix: "/piquete", roles: ["agente_piquete", "chefe_seccao"] },
    { prefix: "/secretaria", roles: ["oficial_secretaria"] },
    { prefix: "/instrucao", roles: ["instrutor", "chefe_seccao"] },
    { prefix: "/procuradoria", roles: ["procurador"] }
  ];

  const guarda = guardas.find((g) => path.startsWith(g.prefix));
  if (guarda && !guarda.roles.some((r) => payload.roles.includes(r))) {
    return NextResponse.redirect(new URL("/403", req.url));
  }
}
```

**6.2 — Ecrãs essenciais**

- `/login`
- `/piquete/novo-acto` — formulário dinâmico que lê `schemaCampos`
- `/piquete/actos` — lista de actos do utilizador
- `/processos` — lista filtrada por escopo
- `/processos/[id]` — ficha com peças, histórico, botão "Nova Peça"
- `/secretaria/entradas` — registo de entrada PGR
- `/procuradoria/despachos` — lista de processos para despachar

**6.3 — Componente de permissão condicional**

```tsx
export function Can({ permission, children }: Props) {
  const { permissions } = useAuth();
  return permissions.includes(permission) ? <>{children}</> : null;
}

// Uso:
<Can permission="peca:criar">
  <Button>Nova Peça</Button>
</Can>;
```

**6.4 — Formulário dinâmico de acto**

```tsx
export function FormularioActo({ template }: { template: TipoActo }) {
  return (
    <form onSubmit={handleSubmit}>
      {Object.entries(template.schemaCampos).map(([nome, regra]) => (
        <CampoDinamico key={nome} nome={nome} regra={regra} />
      ))}
      <Button type="submit">Registar Acto</Button>
    </form>
  );
}
```

**Prompt para Agnes Code:**

> "Cria o middleware de RBAC no Next.js que redireciona para /403 quando o utilizador não tem o role para o prefixo de rota. Cria os ecrãs essenciais: login, registo de acto no piquete (formulário dinâmico), lista de processos, ficha de processo com peças, e registo de entrada PGR."

### ✅ Critério de Done

- Login funciona e guarda JWT em cookie httpOnly.
- Middleware bloqueia rotas por role.
- Formulário dinâmico renderiza campos do `schemaCampos`.
- Fluxo completo Piquete → Processo → Peça funciona no browser.

---

## 🗓️ DIA 7 — Testes, Seed, Documentação, Demo

**Objetivo:** MVP demonstrável, estável, documentado.

### Tarefas

**7.1 — Seed completo**

```typescript
// prisma/seed.ts
- 8 roles hierárquicos
- permissions granulares
- 1 utilizador por perfil
- 5 unidades orgânicas (SG, DN, Depto, Secção, Piquete)
- 3 tipos de acto (Auto de Notícia, Auto de Queixa, Denúncia)
- 2 templates de documento
```

**7.2 — Testes de integração dos 3 fluxos**

```bash
pnpm test:e2e
# Fluxo 1: Piquete regista acto → processo instaurado
# Fluxo 2: Secretaria regista entrada PGR → número PGR guardado
# Fluxo 3: Instrutor gera peça → PDF com hash
```

**7.3 — Documentação mínima**

- `README.md` com setup, comandos, credenciais de seed
- `AGENTS.md` com convenções para Agnes Code
- `docs/adr/` com 3 ADRs:
  - 001 — Porquê NestJS em vez de Express
  - 002 — Porquê RBAC hierárquico com herança
  - 003 — Porquê CQRS + Domain Events

**7.4 — Docker Compose de produção (esboço)**

```yaml
# docker-compose.prod.yml com variáveis de ambiente, healthchecks e volumes
```

**7.5 — Demo script**

```
1. Login como agente_piquete → registar Auto de Notícia
2. Mostrar processo criado automaticamente com número SIC/PIQ/LU/2026/000001
3. Login como oficial_secretaria → registar entrada PGR
4. Login como instrutor → gerar peça PDF, mostrar hash
5. Login como procurador → ver processo, despachar
6. Mostrar audit log
```

**Prompt para Agnes Code:**

> "Cria o seed completo com roles, permissions, unidades orgânicas, utilizadores de teste e templates. Escreve testes e2e para os 3 fluxos principais. Gera o README.md e 3 ADRs."

### ✅ Critério de Done

- `pnpm db:seed` popula tudo.
- `pnpm test:e2e` passa.
- Demo corre de ponta a ponta sem erros.

---

## 📊 O que fica para pós-MVP

| Item                                              | Prioridade             |
| ------------------------------------------------- | ---------------------- |
| Editor visual de templates                        | Alta                   |
| Fluxo completo de despacho com assinatura digital | Alta                   |
| Dashboard da Direção com métricas                 | Média                  |
| Integração com SIGNUP via API                     | Média (quando existir) |
| Cifra de dados sensíveis (pgcrypto)               | Alta                   |
| Audit log imutável com hash chain                 | Alta                   |
| Notificações por email/SMS                        | Média                  |
| Relatórios exportáveis (PDF/Excel)                | Média                  |
| MFA para perfis de chefia                         | Alta                   |
| Backup 3-2-1 automatizado                         | Alta                   |

---

## 🎯 Regras de execução da semana

1. **Nada de scope creep.** Ideias novas vão para o backlog, não para a semana.
2. **Commit diário.** Mesmo que incompleto, commit no fim do dia.
3. **Testes antes de avançar.** Se o Dia 3 não passa testes, o Dia 4 não começa.
4. **Code review mesmo com Agnes Code.** Lê sempre o que ele gera.
5. **Demo no fim de cada dia.** 5 minutos a mostrar o que funciona.

Queres que eu detalhe agora o **Dia 1 em comandos concretos**, incluindo os prompts exactos para o Agnes Code configurar o monorepo e o Prisma?
