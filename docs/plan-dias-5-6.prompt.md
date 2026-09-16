# Plano de Implementação — Dias 5 e 6

**Data:** 2026-09-16
**Base:** Auditoria de Âmbito (225 features, 21 concluídas, 9%)

---

## Visão Geral

Dia 5: Módulo Pessoas (bloqueador crítico)
Dia 6: Processos (completo) + Peças/PDF

---

## Dia 5: Módulo Pessoas

### Passo 1: Schema Prisma

Adicionar em `packages/database/prisma/schema.prisma`:

```prisma
model Pessoa {
  id            String    @id @default(cuid())
  nome          String    @db.VarChar(255)
  bi            String?   @unique @db.VarChar(20)
  morada        String?   @db.Text
  telefone      String?   @db.VarChar(20)
  email         String?   @db.VarChar(255)
  dataNascimento DateTime? @db.Date
  nacionalidade String?   @default("Angolana") @db.VarChar(100)
  genero        Genero?
  observacoes   String?   @db.Text
  criadoPor     String?   @db.VarChar(100)
  criadoEm      DateTime  @default(now()) @db.Timestamptz
  actualizadoPor String?  @db.VarChar(100)
  actualizadoEm DateTime? @db.Timestamptz
  activo        Boolean   @default(true)

  processoPessoas ProcessoPessoa[]

  @@index([nome])
  @@index([bi])
  @@map("pessoa")
}

model ProcessoPessoa {
  id        String         @id @default(cuid())
  pessoaId  String
  processoId String
  papel     PapelProcesso
  
  criadoEm  DateTime       @default(now()) @db.Timestamptz

  pessoa      Pessoa      @relation(fields: [pessoaId], references: [id], onDelete: Cascade)
  processo    Processo    @relation(fields: [processoId], references: [id], onDelete: Cascade)

  @@unique([pessoaId, processoId, papel])
  @@index([processoId])
  @@index([pessoaId])
  @@map("processo_pessoa")
}

enum Genero { MASCULINO; FEMININO }
enum PapelProcesso { ARGUIDO; OFENDIDO; TESTEMUNHA; REPRESENTANTE_LEGAL; OUTRO }
```

### Passo 2: Entidades

`apps/api/src/domain/entities/pessoa.entity.ts`:
```typescript
import { Genero } from '@prisma/client'

export class Pessoa {
  constructor(
    public readonly id: string,
    public readonly nome: string,
    public readonly bi?: string,
    public readonly morada?: string,
    public readonly telefone?: string,
    public readonly email?: string,
    public readonly dataNascimento?: Date,
    public readonly nacionalidade: string = 'Angolana',
    public readonly genero?: Genero,
    public readonly observacoes?: string,
    public readonly criadoPor?: string,
    public readonly criadoEm: Date = new Date(),
    public readonly actualizadoPor?: string,
    public readonly actualizadoEm?: Date,
    public readonly activo: boolean = true,
  ) {}

  static criar(params: {
    nome: string
    bi?: string
    morada?: string
    telefone?: string
    email?: string
    dataNascimento?: Date
    nacionalidade?: string
    genero?: Genero
    observacoes?: string
    criadoPor?: string
  }): Pessoa {
    if (!params.nome?.trim()) throw new Error('Nome é obrigatório')
    if (params.bi && !ValidadorBI.isValid(params.bi)) throw new Error('BI angolano inválido')
    return new Pessoa(
      crypto.randomUUID(), params.nome.trim(), params.bi, params.morada,
      params.telefone, params.email, params.dataNascimento,
      params.nacionalidade || 'Angolana', params.genero,
      params.observacoes, params.criadoPor
    )
  }
}

export class ValidadorBI {
  static isValid(bi: string): boolean {
    const regex = /^[A-Z]{2}\d{8}[0-9]$/
    return regex.test(bi.toUpperCase())
  }
}
```

`apps/api/src/domain/entities/processo-pessoa.entity.ts`:
```typescript
import { PapelProcesso } from '@prisma/client'

export class ProcessoPessoa {
  constructor(
    public readonly id: string,
    public readonly pessoaId: string,
    public readonly processoId: string,
    public readonly papel: PapelProcesso,
    public readonly criadoEm: Date = new Date(),
  ) {}

  static criar(params: { pessoaId: string; processoId: string; papel: PapelProcesso }): ProcessoPessoa {
    if (!params.pessoaId || !params.processoId) throw new Error('IDs obrigatórios')
    if (!Object.values(PapelProcesso).includes(params.papel)) throw new Error(`Papel inválido: ${params.papel}`)
    return new ProcessoPessoa(crypto.randomUUID(), params.pessoaId, params.processoId, params.papel)
  }
}
```

### Passo 3: Repositórios

`apps/api/src/domain/repositories/pessoa.repository.ts`:
```typescript
import { Pessoa } from '../entities/pessoa.entity'
import { Genero } from '@prisma/client'

export interface PessoaRepository {
  findById(id: string): Promise<Pessoa | null>
  findByBi(bi: string): Promise<Pessoa | null>
  findAll(params: { pagina?: number; limite?: number; nome?: string; bi?: string; genero?: Genero; activo?: boolean }): Promise<{ dados: Pessoa[]; total: number }>
  criar(pessoa: Pessoa): Promise<void>
  desactivar(id: string): Promise<void>
}
```

`apps/api/src/domain/repositories/processo-pessoa.repository.ts`:
```typescript
import { ProcessoPessoa } from '../entities/processo-pessoa.entity'
import { PapelProcesso } from '@prisma/client'

export interface ProcessoPessoaRepository {
  findById(id: string): Promise<ProcessoPessoa | null>
  findByProcesso(processoId: string): Promise<ProcessoPessoa[]>
  findByProcessoEPapel(processoId: string, papel: PapelProcesso): Promise<ProcessoPessoa[]>
  criar(relacao: ProcessoPessoa): Promise<void>
}
```

`apps/api/src/infrastructure/database/database.tokens.ts` - adicionar:
```typescript
export const PESSA_REPOSITORY = 'PESSOA_REPOSITORY'
export const PROCESSO_PESSA_REPOSITORY = 'PROCESSO_PESSA_REPOSITORY'
```

### Passo 4: Implementações dos Repositórios

`apps/api/src/infrastructure/database/prisma-pessoa.repository.ts`:
```typescript
import { Injectable } from '@nestjs/common'
import { InjectDataSource } from '@nestjs/typeorm'
import { DataSource } from 'typeorm'
import { Pessoa } from '../../domain/entities/pessoa.entity'
import { Genero } from '@prisma/client'
import { PessoaRepository } from '../../domain/repositories/pessoa.repository'

@Injectable()
export class PrismaPessoaRepository implements PessoaRepository {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async findById(id: string): Promise<Pessoa | null> {
    const result = await this.dataSource.query(`SELECT * FROM pessoa WHERE id = $1 AND activo = true`, [id])
    return result[0] ? this.toEntity(result[0]) : null
  }

  async findByBi(bi: string): Promise<Pessoa | null> {
    const result = await this.dataSource.query(`SELECT * FROM pessoa WHERE bi = $1 AND activo = true`, [bi.toUpperCase()])
    return result[0] ? this.toEntity(result[0]) : null
  }

  async findAll(params: { pagina?: number; limite?: number; nome?: string; bi?: string; genero?: Genero; activo?: boolean }): Promise<{ dados: Pessoa[]; total: number }> {
    const { pagina = 1, limite = 20, nome, bi, genero, activo } = params
    const offset = (pagina - 1) * limite
    let whereClauses = ['1=1']
    const paramsArray: any[] = []

    if (nome) { whereClauses.push(`nome ILIKE $${paramsArray.length + 1}`); paramsArray.push(`%${nome}%`) }
    if (bi) { whereClauses.push(`bi = $${paramsArray.length + 1}`); paramsArray.push(bi.toUpperCase()) }
    if (genero) { whereClauses.push(`genero = $${paramsArray.length + 1}`); paramsArray.push(genero) }
    if (activo !== undefined) { whereClauses.push(`activo = $${paramsArray.length + 1}`); paramsArray.push(activo) }

    const whereSql = whereClauses.join(' AND ')
    const [countResult, dataResult] = await Promise.all([
      this.dataSource.query(`SELECT COUNT(*) as total FROM pessoa WHERE ${whereSql}`, paramsArray),
      this.dataSource.query(`SELECT * FROM pessoa WHERE ${whereSql} ORDER BY nome LIMIT $${paramsArray.length + 1} OFFSET $${paramsArray.length + 2}`, [...paramsArray, limite, offset]),
    ])

    return { dados: dataResult.map((r: any) => this.toEntity(r)), total: parseInt(countResult[0].total) }
  }

  async criar(pessoa: Pessoa): Promise<void> {
    await this.dataSource.query(
      `INSERT INTO pessoa (id, nome, bi, morada, telefone, email, data_nascimento, nacionalidade, genero, observacoes, criado_por, criado_em, actualizado_por, actualizado_em, activo) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
      [pessoa.id, pessoa.nome, pessoa.bi, pessoa.morada, pessoa.telefone, pessoa.email, pessoa.dataNascimento, pessoa.nacionalidade, pessoa.genero, pessoa.observacoes, pessoa.criadoPor, pessoa.criadoEm, pessoa.actualizadoPor, pessoa.actualizadoEm, pessoa.activo]
    )
  }

  async desactivar(id: string): Promise<void> {
    await this.dataSource.query(`UPDATE pessoa SET activo = false, actualizado_em = $2 WHERE id = $1`, [id, new Date()])
  }

  private toEntity(row: any): Pessoa {
    return new Pessoa(
      row.id, row.nome, row.bi, row.morada, row.telefone, row.email,
      row.data_nascimento ? new Date(row.data_nascimento) : undefined, row.nacionalidade,
      row.genero as Genero, row.observacoes, row.criado_por,
      row.criado_em ? new Date(row.criado_em) : new Date(),
      row.actualizado_por, row.actualizado_em ? new Date(row.actualizado_em) : undefined,
      row.activo !== false
    )
  }
}
```

`apps/api/src/infrastructure/database/prisma-processo-pessoa.repository.ts`:
```typescript
import { Injectable } from '@nestjs/common'
import { InjectDataSource } from '@nestjs/typeorm'
import { DataSource } from 'typeorm'
import { ProcessoPessoa } from '../../domain/entities/processo-pessoa.entity'
import { PapelProcesso } from '@prisma/client'
import { ProcessoPessoaRepository } from '../../domain/repositories/processo-pessoa.repository'

@Injectable()
export class PrismaProcessoPessoaRepository implements ProcessoPessoaRepository {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async findById(id: string): Promise<ProcessoPessoa | null> {
    const result = await this.dataSource.query(`SELECT * FROM processo_pessoa WHERE id = $1`, [id])
    return result[0] ? this.toEntity(result[0]) : null
  }

  async findByProcesso(processoId: string): Promise<ProcessoPessoa[]> {
    const result = await this.dataSource.query(`SELECT * FROM processo_pessoa WHERE processo_id = $1 ORDER BY criado_em`, [processoId])
    return result.map((r: any) => this.toEntity(r))
  }

  async findByProcessoEPapel(processoId: string, papel: PapelProcesso): Promise<ProcessoPessoa[]> {
    const result = await this.dataSource.query(`SELECT * FROM processo_pessoa WHERE processo_id = $1 AND papel = $2`, [processoId, papel])
    return result.map((r: any) => this.toEntity(r))
  }

  async criar(relacao: ProcessoPessoa): Promise<void> {
    await this.dataSource.query(`INSERT INTO processo_pessoa (id, pessoa_id, processo_id, papel, criado_em) VALUES ($1, $2, $3, $4, $5)`, [relacao.id, relacao.pessoaId, relacao.processoId, relacao.papel, relacao.criadoEm])
  }

  private toEntity(row: any): ProcessoPessoa {
    return new ProcessoPessoa(row.id, row.pessoa_id, row.processo_id, row.papel as PapelProcesso, row.criado_em ? new Date(row.criado_em) : new Date())
  }
}
```

Adicionar em `database.module.ts`:
```typescript
import { PESSA_REPOSITORY, PROCESSO_PESSA_REPOSITORY } from './database.tokens'
import { PrismaPessoaRepository } from './prisma-pessoa.repository'
import { PrismaProcessoPessoaRepository } from './prisma-processo-pessoa.repository'

// nos providers:
{ provide: PESSA_REPOSITORY, useClass: PrismaPessoaRepository },
{ provide: PROCESSO_PESSA_REPOSITORY, useClass: PrismaProcessoPessoaRepository },
```

### Passo 5: Handlers CQRS

`apps/api/src/application/handlers/criar-pessoa.handler.ts`:
```typescript
import { Inject, Injectable } from '@nestjs/common'
import { ICommandHandler, ICommand } from '@nestjs/cqrs'
import { Pessoa } from '../../domain/entities/pessoa.entity'
import { PESSA_REPOSITORY } from '../../infrastructure/database/database.tokens'
import { PessoaRepository } from '../../domain/repositories/pessoa.repository'

export class CriarPessoaCommand implements ICommand {
  constructor(
    public readonly nome: string,
    public readonly bi?: string,
    public readonly morada?: string,
    public readonly telefone?: string,
    public readonly email?: string,
    public readonly dataNascimento?: Date,
    public readonly nacionalidade?: string,
    public readonly genero?: 'MASCULINO' | 'FEMININO',
    public readonly observacoes?: string,
    public readonly criadoPor?: string,
  ) {}
}

@Injectable()
export class CriarPessoaHandler implements ICommandHandler<CriarPessoaCommand> {
  constructor(@Inject(PESSA_REPOSITORY) private readonly pessoaRepository: PessoaRepository) {}

  async execute(command: CriarPessoaCommand): Promise<Pessoa> {
    const { nome, bi, morada, telefone, email, dataNascimento, nacionalidade, genero, observacoes, criadoPor } = command
    
    if (bi) {
      const existente = await this.pessoaRepository.findByBi(bi)
      if (existente) throw new Error(`Já existe uma pessoa com o BI: ${bi}`)
    }

    const pessoa = Pessoa.criar({ nome, bi, morada, telefone, email, dataNascimento, nacionalidade, genero, observacoes, criadoPor })
    await this.pessoaRepository.criar(pessoa)
    return pessoa
  }
}
```

`apps/api/src/application/handlers/associar-pessoa-processo.handler.ts`:
```typescript
import { Inject, Injectable } from '@nestjs/common'
import { ICommandHandler, ICommand } from '@nestjs/cqrs'
import { ProcessoPessoa } from '../../domain/entities/processo-pessoa.entity'
import { PapelProcesso } from '@prisma/client'
import { PROCESSO_PESSA_REPOSITORY } from '../../infrastructure/database/database.tokens'
import { ProcessoPessoaRepository } from '../../domain/repositories/processo-pessoa.repository'

export class AssociarPessoaProcessoCommand implements ICommand {
  constructor(public readonly pessoaId: string, public readonly processoId: string, public readonly papel: PapelProcesso) {}
}

@Injectable()
export class AssociarPessoaProcessoHandler implements ICommandHandler<AssociarPessoaProcessoCommand> {
  constructor(@Inject(PROCESSO_PESSA_REPOSITORY) private readonly processoPessoaRepository: ProcessoPessoaRepository) {}

  async execute(command: AssociarPessoaProcessoCommand): Promise<ProcessoPessoa> {
    const existente = await this.processoPessoaRepository.findByProcessoEPapel(command.processoId, command.papel)
    if (existente.length > 0) throw new Error(`Já existe uma pessoa com o papel ${command.papel} neste processo`)

    const relacao = ProcessoPessoa.criar({ pessoaId: command.pessoaId, processoId: command.processoId, papel: command.papel })
    await this.processoPessoaRepository.criar(relacao)
    return relacao
  }
}
```

`apps/api/src/application/handlers/listar-pessoas.handler.ts`:
```typescript
import { Injectable } from '@nestjs/common'
import { IQueryHandler, IQuery } from '@nestjs/cqrs'
import { Pessoa } from '../../domain/entities/pessoa.entity'
import { PESSA_REPOSITORY } from '../../infrastructure/database/database.tokens'
import { PessoaRepository } from '../../domain/repositories/pessoa.repository'
import { Genero } from '@prisma/client'

export class ListarPessoasQuery implements IQuery {
  constructor(
    public readonly pagina?: number, public readonly limite?: number,
    public readonly nome?: string, public readonly bi?: string,
    public readonly genero?: Genero, public readonly activo?: boolean,
  ) {}
}

@Injectable()
export class ListarPessoasHandler implements IQueryHandler<ListarPessoasQuery> {
  constructor(@Inject(PESSA_REPOSITORY) private readonly pessoaRepository: PessoaRepository) {}

  async execute(query: ListarPessoasQuery): Promise<any> {
    const result = await this.pessoaRepository.findAll({ pagina: query.pagina, limite: query.limite, nome: query.nome, bi: query.bi, genero: query.genero, activo: query.activo })
    return { ...result, pagina: query.pagina || 1, limite: query.limite || 20 }
  }
}
```

Actualizar `apps/api/src/application/handlers/index.ts`:
```typescript
export * from './registar-acto-piquete.handler'
export * from './instaurar-processo.handler'
export * from './acto-piquete-registado.event-handler'
export * from './criar-pessoa.handler'
export * from './associar-pessoa-processo.handler'
export * from './listar-pessoas.handler'
```

### Passo 6: Controller

`apps/api/src/interface/http/pessoas.controller.ts`:
```typescript
import { Controller, Get, Post, Body, Param, Query, HttpCode, HttpStatus, UseGuards } from '@nestjs/common'
import { ICommandBus, IQueryBus } from '@nestjs/cqrs'
import { AuthGuard } from '../../auth/auth.guard'
import { PermissionsGuard } from '../../auth/permissions.guard'
import { RequirePermissions } from '../../auth/permissions.decorator'
import { CriarPessoaCommand } from '../../application/handlers/criar-pessoa.handler'
import { AssociarPessoaProcessoCommand } from '../../application/handlers/associar-pessoa-processo.handler'
import { ListarPessoasQuery } from '../../application/handlers/listar-pessoas.handler'
import { PapelProcesso } from '@prisma/client'

@Controller('pessoas')
@UseGuards(AuthGuard, PermissionsGuard)
export class PessoasController {
  constructor(private readonly commandBus: ICommandBus, private readonly queryBus: IQueryBus) {}

  @Post()
  @RequirePermissions('pessoa:criar')
  @HttpCode(HttpStatus.CREATED)
  async criar(@Body() dto: { nome: string; bi?: string; morada?: string; telefone?: string; email?: string; dataNascimento?: string; nacionalidade?: string; genero?: 'MASCULINO' | 'FEMININO'; observacoes?: string }) {
    const pessoa = await this.commandBus.execute(new CriarPessoaCommand(dto.nome, dto.bi, dto.morada, dto.telefone, dto.email, dto.dataNascimento ? new Date(dto.dataNascimento) : undefined, dto.nacionalidade, dto.genero as any, dto.observacoes, 'usuario_logado'))
    return { id: pessoa.id, nome: pessoa.nome, bi: pessoa.bi }
  }

  @Get()
  @RequirePermissions('pessoa:ler')
  async listar(@Query() query: { pagina?: string; limite?: string; nome?: string; bi?: string; genero?: 'MASCULINO' | 'FEMININO'; activo?: string }) {
    return this.queryBus.execute(new ListarPessoasQuery(parseInt(query.pagina) || 1, parseInt(query.limite) || 20, query.nome, query.bi, query.genero as any, query.activo === 'false' ? false : undefined))
  }

  @Post(':id/processos/:processoId/papel/:papel')
  @RequirePermissions('pessoa:associar')
  @HttpCode(HttpStatus.CREATED)
  async associar(@Param('id') pessoaId: string, @Param('processoId') processoId: string, @Param('papel') papel: string) {
    const relacao = await this.commandBus.execute(new AssociarPessoaProcessoCommand(pessoaId, processoId, papel as PapelProcesso))
    return { id: relacao.id, pessoaId, processoId, papel: relacao.papel }
  }
}
```

`apps/api/src/interface/http/pessoas.module.ts`:
```typescript
import { Module } from '@nestjs/common'
import { CqrsModule } from '@nestjs/cqrs'
import { PessoasController } from './pessoas.controller'
import { CriarPessoaHandler } from '../../application/handlers/criar-pessoa.handler'
import { AssociarPessoaProcessoHandler } from '../../application/handlers/associar-pessoa-processo.handler'
import { ListarPessoasHandler } from '../../application/handlers/listar-pessoas.handler'
import { PESSA_REPOSITORY, PROCESSO_PESSA_REPOSITORY } from '../../infrastructure/database/database.tokens'

@Module({
  imports: [CqrsModule],
  controllers: [PessoasController],
  providers: [CriarPessoaHandler, AssociarPessoaProcessoHandler, ListarPessoasHandler,
    { provide: PESSA_REPOSITORY, useExisting: require('../../infrastructure/database/database.tokens').PESSA_REPOSITORY },
    { provide: PROCESSO_PESSA_REPOSITORY, useExisting: require('../../infrastructure/database/database.tokens').PROCESSO_PESSA_REPOSITORY },
  ],
  exports: [CqrsModule],
})
export class PessoasModule {}
```

### Passo 7: Actualizar Módulos

`apps/api/src/app.module.ts` - adicionar import:
```typescript
import { PessoasModule } from './interface/http/pessoas.module'
// ... nos imports: PessoasModule
```

### Passo 8: Seed

`packages/database/prisma/seed.ts` - adicionar antes do final:
```typescript
const pessoasTeste = [
  { nome: 'João Bernardo de Sousa', bi: '0012345678A', morada: 'Rua da Saudade, nº 45, Luanda', telefone: '+244 923 456 789', email: 'joao.sousa@email.ao', dataNascimento: new Date('1985-03-15'), nacionalidade: 'Angolana', genero: 'MASCULINO', criadoPor: 'admin' },
  { nome: 'Maria Fernandes da Costa', bi: '0098765432B', morada: 'Av. Henrique Galvão, nº 12, Luanda', telefone: '+244 934 567 890', email: 'maria.costa@email.ao', dataNascimento: new Date('1990-07-22'), nacionalidade: 'Angolana', genero: 'FEMININO', criadoPor: 'admin' },
  { nome: 'António Manuel Pereira', bi: '0055667788C', morada: 'Morro Bento, Município de Belas', telefone: '+244 912 345 678', criadoPor: 'admin' },
]

for (const pessoa of pessoasTeste) {
  await prisma.pessoa.upsert({ where: { bi: pessoa.bi }, update: {}, create: { nome: pessoa.nome, bi: pessoa.bi, morada: pessoa.morada, telefone: pessoa.telefone, email: pessoa.email, dataNascimento: pessoa.dataNascimento, nacionalidade: pessoa.nacionalidade, genero: pessoa.genero, criadoPor: pessoa.criadoPor } })
}
console.log('✅ Pessoas de teste criadas')
```

### Passo 9: Migration

```bash
cd packages/database && pnpm prisma migrate dev --name add_pessoas
```

---

## Dia 6: Processos + Peças/PDF

### Handler: Listar Processos

`apps/api/src/application/handlers/listar-processos.handler.ts`:
```typescript
import { Injectable } from '@nestjs/common'
import { IQueryHandler, IQuery } from '@nestjs/cqrs'
import { PROCESSO_REPOSITORY } from '../../infrastructure/database/database.tokens'
import { ProcessoRepository } from '../../domain/repositories/processo.repository'

export class ListarProcessosQuery implements IQuery {
  constructor(
    public readonly pagina?: number,
    public readonly limite?: number,
    public readonly estado?: any,
    public readonly unidadeId?: string,
    public readonly numero?: string,
  ) {}
}

@Injectable()
export class ListarProcessosHandler implements IQueryHandler<ListarProcessosQuery> {
  constructor(@Inject(PROCESSO_REPOSITORY) private readonly processoRepository: ProcessoRepository) {}

  async execute(query: ListarProcessosQuery): Promise<{ dados: any[]; total: number }> {
    return this.processoRepository.findAll({
      pagina: query.pagina, limite: query.limite, estado: query.estado,
      unidadeId: query.unidadeId, numero: query.numero,
    })
  }
}
```

### Handler: Consultar Processo

`apps/api/src/application/handlers/consultar-processo.handler.ts`:
```typescript
import { Injectable } from '@nestjs/common'
import { IQueryHandler, IQuery } from '@nestjs/cqrs'
import { PROCESSO_REPOSITORY } from '../../infrastructure/database/database.tokens'
import { ProcessoRepository } from '../../domain/repositories/processo.repository'

export class ConsultarProcessoQuery implements IQuery {
  constructor(public readonly id: string) {}
}

@Injectable()
export class ConsultarProcessoHandler implements IQueryHandler<ConsultarProcessoQuery> {
  constructor(@Inject(PROCESSO_REPOSITORY) private readonly processoRepository: ProcessoRepository) {}

  async execute(query: ConsultarProcessoQuery): Promise<any> {
    const processo = await this.processoRepository.findById(query.id)
    if (!processo) throw new Error('Processo não encontrado')
    const pessoas = await this.processoRepository.findPessoasByProcesso(query.id)
    return { ...processo, pessoas }
  }
}
```

### Handler: Distribuir Processo

`apps/api/src/application/handlers/distribuir-processo.handler.ts`:
```typescript
import { Inject, Injectable } from '@nestjs/common'
import { ICommandHandler, ICommand } from '@nestjs/cqrs'
import { PROCESSO_REPOSITORY } from '../../infrastructure/database/database.tokens'
import { ProcessoRepository } from '../../domain/repositories/processo.repository'

export class DistribuirProcessoCommand implements ICommand {
  constructor(public readonly processoId: string, public readonly instrutorId: string, public readonly distribuidoPor: string) {}
}

@Injectable()
export class DistribuirProcessoHandler implements ICommandHandler<DistribuirProcessoCommand> {
  constructor(@Inject(PROCESSO_REPOSITORY) private readonly processoRepository: ProcessoRepository) {}

  async execute(command: DistribuirProcessoCommand): Promise<void> {
    await this.processoRepository.distribuir(command.processoId, command.instrutorId, command.distribuidoPor)
  }
}
```

### Handler: Arquivar Processo

`apps/api/src/application/handlers/arquivar-processo.handler.ts`:
```typescript
import { Inject, Injectable } from '@nestjs/common'
import { ICommandHandler, ICommand } from '@nestjs/cqrs'
import { PROCESSO_REPOSITORY } from '../../infrastructure/database/database.tokens'
import { ProcessoRepository } from '../../domain/repositories/processo.repository'

export class ArquivarProcessoCommand implements ICommand {
  constructor(public readonly processoId: string, public readonly fundamento: string, public readonly arquivadoPor: string) {}
}

@Injectable()
export class ArquivarProcessoHandler implements ICommandHandler<ArquivarProcessoCommand> {
  constructor(@Inject(PROCESSO_REPOSITORY) private readonly processoRepository: ProcessoRepository) {}

  async execute(command: ArquivarProcessoCommand): Promise<void> {
    await this.processoRepository.arquivar(command.processoId, command.fundamento, command.arquivadoPor)
  }
}
```

### Controller: Processos

`apps/api/src/interface/http/processos.controller.ts`:
```typescript
import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common'
import { ICommandBus, IQueryBus } from '@nestjs/cqrs'
import { AuthGuard } from '../../auth/auth.guard'
import { PermissionsGuard } from '../../auth/permissions.guard'
import { RequirePermissions } from '../../auth/permissions.decorator'
import { ListarProcessosQuery } from '../../application/handlers/listar-processos.handler'
import { ConsultarProcessoQuery } from '../../application/handlers/consultar-processo.handler'
import { DistribuirProcessoCommand } from '../../application/handlers/distribuir-processo.handler'
import { ArquivarProcessoCommand } from '../../application/handlers/arquivar-processo.handler'

@Controller('processos')
@UseGuards(AuthGuard, PermissionsGuard)
export class ProcessosController {
  constructor(private readonly commandBus: ICommandBus, private readonly queryBus: IQueryBus) {}

  @Get()
  @RequirePermissions('processo:ler')
  async listar(@Query() query: { pagina?: string; limite?: string; estado?: string; numero?: string; unidadeId?: string }) {
    return this.queryBus.execute(new ListarProcessosQuery(parseInt(query.pagina)||1, parseInt(query.limite)||20, query.estado as any, query.unidadeId, query.numero))
  }

  @Get(':id')
  @RequirePermissions('processo:ler')
  async encontrar(@Param('id') id: string) {
    return this.queryBus.execute(new ConsultarProcessoQuery(id))
  }

  @Post(':id/distribuir')
  @RequirePermissions('processo:distribuir')
  async distribuir(@Param('id') processoId: string, @Body() dto: { instrutorId: string }) {
    await this.commandBus.execute(new DistribuirProcessoCommand(processoId, dto.instrutorId, 'usuario_logado'))
    return { success: true, processoId }
  }

  @Post(':id/arquivar')
  @RequirePermissions('processo:arquivar')
  async arquivar(@Param('id') processoId: string, @Body() dto: { fundamento: string }) {
    await this.commandBus.execute(new ArquivarProcessoCommand(processoId, dto.fundamento, 'usuario_logado'))
    return { success: true, processoId }
  }
}
```

`apps/api/src/interface/http/processos.module.ts`:
```typescript
import { Module } from '@nestjs/common'
import { CqrsModule } from '@nestjs/cqrs'
import { ProcessosController } from './processos.controller'
import { ListarProcessosHandler } from '../../application/handlers/listar-processos.handler'
import { ConsultarProcessoHandler } from '../../application/handlers/consultar-processo.handler'
import { DistribuirProcessoHandler } from '../../application/handlers/distribuir-processo.handler'
import { ArquivarProcessoHandler } from '../../application/handlers/arquivar-processo.handler'
import { PROCESSO_REPOSITORY } from '../../infrastructure/database/database.tokens'

@Module({
  imports: [CqrsModule],
  controllers: [ProcessosController],
  providers: [ListarProcessosHandler, ConsultarProcessoHandler, DistribuirProcessoHandler, ArquivarProcessoHandler,
    { provide: PROCESSO_REPOSITORY, useExisting: require('../../infrastructure/database/database.tokens').PROCESSO_REPOSITORY }],
  exports: [CqrsModule],
})
export class ProcessosModule {}
```

---

## Parte B: Módulo Peças e Templates

### Entity: TemplateDocumento

`apps/api/src/domain/entities/template-documento.entity.ts`:
```typescript
export class TemplateDocumento {
  constructor(
    public readonly id: string,
    public readonly nome: string,
    public readonly codigo: string,
    public readonly conteudo: string,
    public readonly descricao?: string,
    public readonly activo: boolean = true,
    public readonly criadoEm: Date = new Date(),
    public readonly actualizadoEm?: Date,
  ) {}

  static criar(params: { nome: string; codigo: string; conteudo: string; descricao?: string }): TemplateDocumento {
    if (!params.nome?.trim()) throw new Error('Nome é obrigatório')
    if (!params.codigo?.trim()) throw new Error('Código é obrigatório')
    return new TemplateDocumento(crypto.randomUUID(), params.nome.trim(), params.codigo.trim(), params.conteudo, params.descricao)
  }
}
```

### Repository: TemplateDocumento

`apps/api/src/domain/repositories/template-documento.repository.ts`:
```typescript
import { TemplateDocumento } from '../entities/template-documento.entity'

export interface TemplateDocumentoRepository {
  findById(id: string): Promise<TemplateDocumento | null>
  findByCodigo(codigo: string): Promise<TemplateDocumento | null>
  findAll(params: { activo?: boolean }): Promise<TemplateDocumento[]>
  criar(template: TemplateDocumento): Promise<void>
}
```

### Implementação: PrismaTemplateDocumentoRepository

`apps/api/src/infrastructure/database/prisma-template-documento.repository.ts`:
```typescript
import { Injectable } from '@nestjs/common'
import { InjectDataSource } from '@nestjs/typeorm'
import { DataSource } from 'typeorm'
import { TemplateDocumento } from '../../domain/entities/template-documento.entity'
import { TemplateDocumentoRepository } from '../../domain/repositories/template-documento.repository'

@Injectable()
export class PrismaTemplateDocumentoRepository implements TemplateDocumentoRepository {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async findById(id: string): Promise<TemplateDocumento | null> {
    const result = await this.dataSource.query(`SELECT * FROM template_documento WHERE id = $1 AND activo = true`, [id])
    return result[0] ? this.toEntity(result[0]) : null
  }

  async findByCodigo(codigo: string): Promise<TemplateDocumento | null> {
    const result = await this.dataSource.query(`SELECT * FROM template_documento WHERE codigo = $1 AND activo = true`, [codigo])
    return result[0] ? this.toEntity(result[0]) : null
  }

  async findAll(params: { activo?: boolean }): Promise<TemplateDocumento[]> {
    const where = params.activo !== false ? 'AND activo = true' : ''
    const result = await this.dataSource.query(`SELECT * FROM template_documento WHERE 1=1 ${where} ORDER BY nome`)
    return result.map((r: any) => this.toEntity(r))
  }

  async criar(template: TemplateDocumento): Promise<void> {
    await this.dataSource.query(`INSERT INTO template_documento (id, nome, codigo, conteudo, descricao, activo, criado_em) VALUES ($1, $2, $3, $4, $5, $6, $7)`, [template.id, template.nome, template.codigo, template.conteudo, template.descricao, template.activo, template.criadoEm])
  }

  private toEntity(row: any): TemplateDocumento {
    return new TemplateDocumento(row.id, row.nome, row.codigo, row.conteudo, row.descricao, row.activo !== false, row.criado_em ? new Date(row.criado_em) : new Date(), row.actualizado_em ? new Date(row.actualizado_em) : undefined)
  }
}
```

### Service: GeradorPDF

`apps/api/src/application/services/gerador-pdf.service.ts`:
```typescript
import { Injectable } from '@nestjs/common'
import * as crypto from 'crypto'

@Injectable()
export class GeradorPDFService {
  async gerarPDF(conteudoHTML: string, dados: Record<string, any>): Promise<{ buffer: Buffer; hash: string }> {
    const conteudoFinal = this.renderizarTemplate(conteudoHTML, dados)
    const buffer = Buffer.from(conteudoFinal)
    const hash = crypto.createHash('sha256').update(buffer).digest('hex')
    return { buffer, hash }
  }

  private renderizarTemplate(template: string, dados: Record<string, any>): string {
    let conteudo = template
    for (const [chave, valor] of Object.entries(dados)) {
      const regex = new RegExp(`{{${chave}}}`, 'g')
      conteudo = conteudo.replace(regex, String(valor))
    }
    return conteudo
  }

  calcularHash(buffer: Buffer): string {
    return crypto.createHash('sha256').update(buffer).digest('hex')
  }
}
```

### Handler: Criar Peça

`apps/api/src/application/handlers/criar-peca.handler.ts`:
```typescript
import { Inject, Injectable } from '@nestjs/common'
import { ICommandHandler, ICommand } from '@nestjs/cqrs'
import { TEMPLATE_DOCUMENTO_REPOSITORY } from '../../infrastructure/database/database.tokens'
import { TemplateDocumentoRepository } from '../../domain/repositories/template-documento.repository'
import { GeradorPDFService } from '../../application/services/gerador-pdf.service'

export class CriarPecaCommand implements ICommand {
  constructor(public readonly processoId: string, public readonly templateCodigo: string, public readonly dadosTemplate: Record<string, any>, public readonly criadoPor: string) {}
}

@Injectable()
export class CriarPecaHandler implements ICommandHandler<CriarPecaCommand> {
  constructor(
    @Inject(TEMPLATE_DOCUMENTO_REPOSITORY) private readonly templateRepository: TemplateDocumentoRepository,
    private readonly geradorPDF: GeradorPDFService,
  ) {}

  async execute(command: CriarPecaCommand): Promise<any> {
    const template = await this.templateRepository.findByCodigo(command.templateCodigo)
    if (!template) throw new Error(`Template não encontrado: ${command.templateCodigo}`)

    const { buffer, hash } = await this.geradorPDF.gerarPDF(template.conteudo, command.dadosTemplate)
    return { hash, tamanho: buffer.length, template: template.nome }
  }
}
```

### Controllers: Templates e Peças

`apps/api/src/interface/http/templates.controller.ts`:
```typescript
import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common'
import { AuthGuard } from '../../auth/auth.guard'
import { PermissionsGuard } from '../../auth/permissions.guard'
import { RequirePermissions } from '../../auth/permissions.decorator'

@Controller('templates')
@UseGuards(AuthGuard, PermissionsGuard)
export class TemplatesController {
  @Get()
  @RequirePermissions('template:ler')
  async listar() { return { mensagem: 'Listagem de templates' } }

  @Post()
  @RequirePermissions('template:criar')
  async criar(@Body() dto: { nome: string; codigo: string; conteudo: string; descricao?: string }) {
    return { mensagem: 'Template criado', dto }
  }
}
```

`apps/api/src/interface/http/pecas.controller.ts`:
```typescript
import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common'
import { ICommandBus } from '@nestjs/cqrs'
import { AuthGuard } from '../../auth/auth.guard'
import { PermissionsGuard } from '../../auth/permissions.guard'
import { RequirePermissions } from '../../auth/permissions.decorator'
import { CriarPecaCommand } from '../../application/handlers/criar-peca.handler'

@Controller('processos/:processoId/pecas')
@UseGuards(AuthGuard, PermissionsGuard)
export class PecasController {
  constructor(private readonly commandBus: ICommandBus) {}

  @Get()
  @RequirePermissions('peca:ler')
  async listar(@Param('processoId') processoId: string) {
    return { processoId, mensagem: 'Listagem de peças' }
  }

  @Post()
  @RequirePermissions('peca:criar')
  async criar(@Param('processoId') processoId: string, @Body() dto: { templateCodigo: string; dadosTemplate: Record<string, any> }) {
    return this.commandBus.execute(new CriarPecaCommand(processoId, dto.templateCodigo, dto.dadosTemplate, 'usuario_logado'))
  }
}
```

### Schema Prisma - Adicionar Modelo TemplateDocumento

```prisma
model TemplateDocumento {
  id            String   @id @default(cuid())
  nome          String   @db.VarChar(255)
  codigo        String   @unique @db.VarChar(100)
  conteudo      String   @db.Text
  descricao     String?  @db.Text
  activo        Boolean  @default(true)
  criadoEm      DateTime @default(now()) @db.Timestamptz
  actualizadoEm DateTime? @db.Timestamptz

  @@index([codigo])
  @@map("template_documento")
}
```

---

## Checklist Final

### Dia 5 (Pessoas)
- [ ] Schema Prisma actualizado com Pessoa e ProcessoPessoa
- [ ] Migration criada e aplicada
- [ ] Entidades Pessoa e ProcessoPessoa criadas
- [ ] Repositórios implementados
- [ ] Handlers CQRS criados (CriarPessoa, AssociarPessoaProcesso, ListarPessoas)
- [ ] Controller HTTP criado
- [ ] Módulo registado
- [ ] Seed actualizado com 3 pessoas de teste
- [ ] TypeScript compila sem erros
- [ ] Tests passam
- [ ] Build passa

### Dia 6 (Processos + Peças)
- [ ] Handlers de processos implementados
- [ ] Controller Processos criado
- [ ] Entity TemplateDocumento criado
- [ ] Repository TemplateDocumento implementado
- [ ] Service GeradorPDF criado
- [ ] Handler CriarPeca implementado
- [ ] Controllers Templates e Peças criados
- [ ] Migration aplicada
- [ ] TypeScript compila
- [ ] Tests passam
- [ ] Build passa

---

## Endpoints Resultantes

### Pessoas
| Método | Path | Permissão |
|--------|------|-----------|
| POST | `/pessoas` | `pessoa:criar` |
| GET | `/pessoas` | `pessoa:ler` |
| POST | `/pessoas/:id/processos/:processoId/papel/:papel` | `pessoa:associar` |

### Processos
| Método | Path | Permissão |
|--------|------|-----------|
| GET | `/processos` | `processo:ler` |
| GET | `/processos/:id` | `processo:ler` |
| POST | `/processos/:id/distribuir` | `processo:distribuir` |
| POST | `/processos/:id/arquivar` | `processo:arquivar` |

### Templates
| Método | Path | Permissão |
|--------|------|-----------|
| GET | `/templates` | `template:ler` |
| POST | `/templates` | `template:criar` |

### Peças
| Método | Path | Permissão |
|--------|------|-----------|
| GET | `/processos/:processoId/pecas` | `peca:ler` |
| POST | `/processos/:processoId/pecas` | `peca:criar` |

---

## Fluxo End-to-End para Testar

```bash
# 1. Login como agente_piquete
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"agente.piquete@sic.ao","password":"AgentePiquete!23"}'

# 2. Criar pessoa (arguido)
curl -X POST http://localhost:3000/pessoas \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"nome":"Arguido Teste","bi":"0011223344A"}'

# 3. Registar acto do piquete (já existe)

# 4. Associar pessoa ao processo
curl -X POST http://localhost:3000/pessoas/<ID>/processos/<PROCESSO_ID>/papel/ARGUIDO \
  -H "Authorization: Bearer <TOKEN>"

# 5. Listar processos
curl -X GET http://localhost:3000/processos \
  -H "Authorization: Bearer <TOKEN>"

# 6. Consultar processo
curl -X GET http://localhost:3000/processos/<ID> \
  -H "Authorization: Bearer <TOKEN>"

# 7. Distribuir processo
curl -X POST http://localhost:3000/processos/<ID>/distribuir \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"instrutorId":"<ID_INSTRUTOR>"}'
```
