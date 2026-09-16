import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { NumeroProcesso } from '../../domain';

export interface GerarNumeroParams {
  unidade: string;
  tipo: string;
  ano?: number;
}

@Injectable()
export class GeradorNumeroService {
  private readonly logger = new Logger(GeradorNumeroService.name);

  constructor(private readonly prisma: PrismaService) { }

  async gerar(params: GerarNumeroParams): Promise<NumeroProcesso> {
    const ano = params.ano ?? new Date().getFullYear();
    const unidade = params.unidade.toUpperCase();
    const tipo = params.tipo.toUpperCase();

    this.logger.debug(`Gerando número: ${unidade}/${tipo}/${ano}`);

    return this.prisma.$transaction(async (tx) => {
      // Upsert a linha de sequência
      await tx.$executeRaw`
        INSERT INTO sequencias_numeracao (id, unidade, tipo, ano, ultimo_numero, created_at, updated_at)
        VALUES (gen_random_uuid()::text, ${unidade}, ${tipo}, ${ano}, 0, NOW(), NOW())
        ON CONFLICT (unidade, tipo, ano) DO NOTHING
      `;

      // Incrementa e devolve o novo valor atomicamente
      const rows = await tx.$queryRaw<{ ultimo_numero: number }[]>`
        UPDATE sequencias_numeracao
        SET ultimo_numero = ultimo_numero + 1,
            updated_at = NOW()
        WHERE unidade = ${unidade}
          AND tipo = ${tipo}
          AND ano = ${ano}
        RETURNING ultimo_numero
      `;

      if (!rows.length) {
        throw new Error(`Falha ao incrementar sequência ${unidade}/${tipo}/${ano}`);
      }

      const sequencial = rows[0].ultimo_numero;
      return NumeroProcesso.gerar(unidade, tipo, ano, sequencial);
    }, {
      isolationLevel: 'ReadCommitted',
      timeout: 5000,
    });
  }
}
