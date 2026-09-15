import { Prisma, PrismaClient } from "@sip/database";
import {
  EstadoPeca,
  HashDocumento,
  PecaProcessual,
  PecaProcessualProps,
  PecaProcessualRepository
} from "../../domain";

export class PrismaPecaProcessualRepository implements PecaProcessualRepository {
  constructor(private readonly prisma: PrismaClient) {}
  async save(peca: PecaProcessual): Promise<void> {
    await this.prisma.pecaProcessual.upsert({
      where: { id: peca.id },
      create: this.paraModelo(peca),
      update: this.paraModelo(peca)
    });
  }
  async findById(id: string): Promise<PecaProcessual | null> {
    const row = await this.prisma.pecaProcessual.findUnique({ where: { id } });
    return row ? this.paraDominio(row) : null;
  }
  async listarPorProcesso(processoId: string): Promise<PecaProcessual[]> {
    const rows = await this.prisma.pecaProcessual.findMany({
      where: { processoId },
      orderBy: { numeroOrdem: "asc" }
    });
    return rows.map((row) => this.paraDominio(row));
  }
  async proximoNumeroOrdem(processoId: string): Promise<number> {
    const row = await this.prisma.pecaProcessual.aggregate({
      where: { processoId },
      _max: { numeroOrdem: true }
    });
    return (row._max.numeroOrdem ?? 0) + 1;
  }
  private paraModelo(peca: PecaProcessual) {
    return {
      id: peca.id,
      processoId: peca.processoId,
      templateId: peca.templateId,
      tipo: peca.tipo,
      numeroOrdem: peca.numeroOrdem,
      dados: peca.dados as Prisma.InputJsonValue,
      estado: peca.estado,
      hashDocumento: peca.hashDocumento?.valor ?? null,
      pdfPath: peca.pdfPath,
      criadaPor: peca.criadaPor,
      criadaEm: peca.criadaEm,
      assinadaPor: peca.assinadaPor,
      assinadaEm: peca.assinadaEm
    };
  }
  private paraDominio(row: {
    id: string;
    processoId: string;
    templateId: string;
    tipo: string;
    numeroOrdem: number;
    dados: unknown;
    estado: string;
    hashDocumento: string | null;
    pdfPath: string | null;
    criadaPor: string;
    criadaEm: Date;
    assinadaPor: string | null;
    assinadaEm: Date | null;
  }): PecaProcessual {
    const props: PecaProcessualProps = {
      ...row,
      dados: row.dados as Record<string, unknown>,
      estado: row.estado as EstadoPeca,
      hashDocumento: row.hashDocumento ? HashDocumento.criar(row.hashDocumento) : null
    };
    return PecaProcessual.reconstituir(props);
  }
}
