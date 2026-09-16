import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { UnidadeOrganicaRepository } from '../../domain';

@Injectable()
export class PrismaUnidadeOrganicaRepository implements UnidadeOrganicaRepository {
  constructor(private readonly prisma: PrismaService) { }

  async findById(id: string): Promise<{ id: string; codigo: string; nome: string } | null> {
    const row = await this.prisma.unidadeOrganica.findUnique({ where: { id } });
    return row ? { id: row.id, codigo: row.codigo, nome: row.nome } : null;
  }

  async findByCodigo(codigo: string): Promise<{ id: string; codigo: string; nome: string } | null> {
    const row = await this.prisma.unidadeOrganica.findUnique({ where: { codigo } });
    return row ? { id: row.id, codigo: row.codigo, nome: row.nome } : null;
  }
}
