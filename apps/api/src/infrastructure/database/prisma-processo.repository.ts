import { PrismaClient } from "@sip/database";
import {
  EstadoProcesso,
  OrigemProcesso,
  Processo,
  ProcessoProps,
  ProcessoRepository,
  NumeroProcesso,
  Tipicidade
} from "../../domain";

export class PrismaProcessoRepository implements ProcessoRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async save(processo: Processo): Promise<void> {
    await this.prisma.processo.upsert({
      where: { id: processo.id },
      create: this.paraModelo(processo),
      update: this.paraModelo(processo)
    });
    processo.limparEventos();
  }
  async findById(id: string): Promise<Processo | null> {
    const row = await this.prisma.processo.findUnique({ where: { id } });
    return row ? this.paraDominio(row) : null;
  }
  async findByNumero(numero: NumeroProcesso): Promise<Processo | null> {
    const row = await this.prisma.processo.findUnique({ where: { numeroInterno: numero.valor } });
    return row ? this.paraDominio(row) : null;
  }
  async findByNumeroProcuradoria(numero: string): Promise<Processo | null> {
    const row = await this.prisma.processo.findUnique({ where: { numeroProcuradoria: numero } });
    return row ? this.paraDominio(row) : null;
  }
  async listar(filtros: {
    unidadeId?: string;
    instrutorId?: string;
    estado?: string;
    origem?: string;
    ano?: number;
  }): Promise<Processo[]> {
    const rows = await this.prisma.processo.findMany({
      where: {
        unidadeActualId: filtros.unidadeId,
        instrutorId: filtros.instrutorId,
        estado: filtros.estado,
        origem: filtros.origem
      }
    });
    return rows
      .filter((row) => !filtros.ano || row.dataInstauracao.getFullYear() === filtros.ano)
      .map((row) => this.paraDominio(row));
  }
  async existe(numero: NumeroProcesso): Promise<boolean> {
    return Boolean(await this.prisma.processo.count({ where: { numeroInterno: numero.valor } }));
  }

  private paraModelo(p: Processo) {
    return {
      id: p.id,
      numeroInterno: p.numeroProcesso.valor,
      numeroProcuradoria: p.numeroProcuradoria,
      estado: p.estado,
      origem: p.origem,
      tipicidadeCodigo: p.tipicidade?.codigo ?? null,
      tipicidadeDesignacao: p.tipicidade?.designacao ?? null,
      tipicidadeArtigoCpp: p.tipicidade?.artigoCpp ?? null,
      piqueteId: p.piqueteId,
      instrutorId: p.instrutorId,
      unidadeActualId: p.unidadeActualId,
      dataInstauracao: p.dataInstauracao,
      dataUltimaTransicao: p.dataUltimaTransicao
    };
  }
  private paraDominio(row: {
    id: string;
    numeroInterno: string;
    numeroProcuradoria: string | null;
    estado: string;
    origem: string;
    tipicidadeCodigo: string | null;
    tipicidadeDesignacao: string | null;
    tipicidadeArtigoCpp: string | null;
    piqueteId: string | null;
    instrutorId: string | null;
    unidadeActualId: string;
    dataInstauracao: Date;
    dataUltimaTransicao: Date;
  }): Processo {
    const props: ProcessoProps = {
      id: row.id,
      numeroProcesso: NumeroProcesso.criar(row.numeroInterno),
      numeroProcuradoria: row.numeroProcuradoria,
      estado: row.estado as EstadoProcesso,
      origem: row.origem as OrigemProcesso,
      tipicidade:
        row.tipicidadeCodigo && row.tipicidadeDesignacao && row.tipicidadeArtigoCpp
          ? Tipicidade.criar(
              row.tipicidadeCodigo,
              row.tipicidadeDesignacao,
              row.tipicidadeArtigoCpp
            )
          : null,
      piqueteId: row.piqueteId,
      instrutorId: row.instrutorId,
      unidadeActualId: row.unidadeActualId,
      dataInstauracao: row.dataInstauracao,
      dataUltimaTransicao: row.dataUltimaTransicao
    };
    return Processo.reconstituir(props);
  }
}
