import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) { }

  async registar(params: {
    userId: string;
    accao: string;
    recursoTipo: string;
    recursoId: string;
    dadosAntes?: any;
    dadosDepois?: any;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        userId: params.userId,
        accao: params.accao,
        recursoTipo: params.recursoTipo,
        recursoId: params.recursoId,
        dadosAntes: params.dadosAntes,
        dadosDepois: params.dadosDepois,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
      },
    });
  }
}
