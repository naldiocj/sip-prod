import { Module } from "@nestjs/common";
import { PrismaActoPiqueteRepository } from "./prisma-acto-piquete.repository";
import { PrismaPecaProcessualRepository } from "./prisma-peca-processual.repository";
import { PrismaProcessoRepository } from "./prisma-processo.repository";
import { PrismaService } from "./prisma.service";
import { ACTO_PIQUETE_REPOSITORY, PECA_REPOSITORY, PROCESSO_REPOSITORY, TIPO_ACTO_REPOSITORY, UNIDADE_ORGANICA_REPOSITORY } from "./database.tokens";
import { PrismaTipoActoRepository } from "./prisma-tipo-acto.repository";
import { PrismaUnidadeOrganicaRepository } from "./prisma-unidade-organica.repository";

@Module({
  providers: [
    PrismaService,
    {
      provide: PROCESSO_REPOSITORY,
      useFactory: (prisma: PrismaService) => new PrismaProcessoRepository(prisma),
      inject: [PrismaService]
    },
    {
      provide: ACTO_PIQUETE_REPOSITORY,
      useFactory: (prisma: PrismaService) => new PrismaActoPiqueteRepository(prisma),
      inject: [PrismaService]
    },
    {
      provide: PECA_REPOSITORY,
      useFactory: (prisma: PrismaService) => new PrismaPecaProcessualRepository(prisma),
      inject: [PrismaService]
    },
    {
      provide: TIPO_ACTO_REPOSITORY,
      useFactory: (prisma: PrismaService) => new PrismaTipoActoRepository(prisma),
      inject: [PrismaService]
    },
    {
      provide: UNIDADE_ORGANICA_REPOSITORY,
      useFactory: (prisma: PrismaService) => new PrismaUnidadeOrganicaRepository(prisma),
      inject: [PrismaService]
    }
  ],
  exports: [PrismaService, PROCESSO_REPOSITORY, ACTO_PIQUETE_REPOSITORY, PECA_REPOSITORY, TIPO_ACTO_REPOSITORY, UNIDADE_ORGANICA_REPOSITORY]
})
export class DatabaseModule { }
