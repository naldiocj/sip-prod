import { Injectable, Logger, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { createHash } from 'crypto';

const TTL_HORAS = 24;

export interface IdempotenciaCheckResult {
  existe: boolean;
  resposta?: any;
}

@Injectable()
export class IdempotencyService {
  private readonly logger = new Logger(IdempotencyService.name);

  constructor(private readonly prisma: PrismaService) { }

  async verificar(chave: string, userId: string): Promise<IdempotenciaCheckResult> {
    const existente = await this.prisma.idempotencyKey.findUnique({
      where: { chave },
    });

    if (!existente) {
      return { existe: false };
    }

    if (existente.userId !== userId) {
      throw new ConflictException('Idempotency-Key pertence a outro utilizador.');
    }

    return {
      existe: true,
      resposta: existente.responseBody
    };
  }

  async guardar(
    chave: string,
    userId: string,
    endpoint: string,
    requestHash: string,
    responseBody: any,
    responseStatus: number,
  ): Promise<void> {
    const expiresAt = new Date(Date.now() + TTL_HORAS * 3600 * 1000);

    await this.prisma.idempotencyKey.create({
      data: {
        chave,
        userId,
        endpoint,
        requestHash,
        responseBody,
        responseStatus,
        expiresAt,
      },
    });
  }

  async limparExpirados(): Promise<number> {
    const resultado = await this.prisma.idempotencyKey.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });
    this.logger.debug(`Limpeza de chaves expiradas: ${resultado.count} removidas`);
    return resultado.count;
  }

  private hashRequest(body: any): string {
    return createHash('sha256')
      .update(JSON.stringify(body ?? {}))
      .digest('hex');
  }
}
