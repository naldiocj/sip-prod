import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { TipoActo, TipoActoRepository } from '../../domain';

@Injectable()
export class PrismaTipoActoRepository implements TipoActoRepository {
  private readonly logger = new Logger(PrismaTipoActoRepository.name);

  constructor(private readonly prisma: PrismaService) { }

  async findById(id: string): Promise<TipoActo | null> {
    const row = await this.prisma.tipoActo.findUnique({ where: { id } });
    return row ? TipoActo.reconstituir({ ...row, campos: row.campos as Record<string, unknown> }) : null;
  }

  async findByCodigo(codigo: string): Promise<TipoActo | null> {
    const row = await this.prisma.tipoActo.findUnique({ where: { codigo } });
    return row ? TipoActo.reconstituir({ ...row, campos: row.campos as Record<string, unknown> }) : null;
  }

  async listarActivos(): Promise<TipoActo[]> {
    const rows = await this.prisma.tipoActo.findMany({
      where: { activo: true },
    });
    return rows.map(row => TipoActo.reconstituir({ ...row, campos: row.campos as Record<string, unknown> }));
  }

  async save(tipoActo: TipoActo): Promise<void> {
    await this.prisma.tipoActo.upsert({
      where: { id: tipoActo.id },
      create: this.paraModelo(tipoActo),
      update: this.paraModelo(tipoActo),
    });
  }

  private paraModelo(tipoActo: TipoActo) {
    return {
      id: tipoActo.id,
      codigo: tipoActo.codigo,
      nome: tipoActo.nome,
      activo: tipoActo.activo,
      geraProcesso: tipoActo.geraProcesso,
      campos: tipoActo.campos as any,
    };
  }
}
