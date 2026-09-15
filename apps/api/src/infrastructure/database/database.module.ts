import { Module } from "@nestjs/common";
import { PrismaActoPiqueteRepository } from "./prisma-acto-piquete.repository";
import { PrismaPecaProcessualRepository } from "./prisma-peca-processual.repository";
import { PrismaProcessoRepository } from "./prisma-processo.repository";
import { PrismaService } from "./prisma.service";
import { ACTO_PIQUETE_REPOSITORY, PECA_REPOSITORY, PROCESSO_REPOSITORY } from "./database.tokens";

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
    }
  ],
  exports: [PrismaService, PROCESSO_REPOSITORY, ACTO_PIQUETE_REPOSITORY, PECA_REPOSITORY]
})
export class DatabaseModule {}
