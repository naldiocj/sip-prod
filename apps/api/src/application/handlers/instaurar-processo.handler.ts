import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { ActoPiquete, OrigemProcesso, Processo, ProcessoRepository } from '../../domain';
import { GeradorNumeroService } from '../services/gerador-numero.service';
import { AuditService } from '../services/audit.service';

export interface InstaurarProcessoHandlerParams {
  actoId: string;
  piqueteId: string;
  unidadeCodigo: string;
  userId: string;
}

@Injectable()
export class InstaurarProcessoHandler {
  private readonly logger = new Logger(InstaurarProcessoHandler.name);

  constructor(
    private readonly actoRepo: any, // ActoPiqueteRepository
    private readonly processoRepo: ProcessoRepository,
    private readonly gerador: GeradorNumeroService,
    private readonly auditService: AuditService,
  ) { }

  async execute(params: InstaurarProcessoHandlerParams): Promise<Processo | null> {
    this.logger.log(`A instaurar processo para acto ${params.actoId}`);

    // 1. Buscar o acto (já persistido)
    const acto = await this.actoRepo.findById(params.actoId);
    if (!acto) {
      throw new Error(`Acto ${params.actoId} não encontrado.`);
    }

    // 2. Verificar idempotência (o acto já tem processo vinculado)
    if (acto.processoId) {
      this.logger.warn(`Acto ${params.actoId} já tem processo vinculado. Ignorado.`);
      return this.processoRepo.findById(acto.processoId) as Promise<Processo | null>;
    }

    // 3. Verificar se o acto gera processo
    if (!acto.geraProcesso) {
      this.logger.debug(`Acto ${params.actoId} não gera processo — ignorado.`);
      return null;
    }

    // 4. Gerar número do processo
    const numeroProcesso = await this.gerador.gerar({
      unidade: params.unidadeCodigo,
      tipo: 'PROC',
    });

    // 5. Criar a entidade Processo (validações do domínio)
    const processo = Processo.instaurar({
      id: randomUUID(),
      numeroProcesso,
      origem: OrigemProcesso.PIQUETE_SIC,
      unidadeActualId: params.piqueteId,
      instauradoPor: params.userId,
      piqueteId: params.piqueteId,
    });

    // 6. Persistir processo
    await this.processoRepo.save(processo);

    // 7. Vincular processo ao acto
    acto.vincularProcesso(processo.id);
    await this.actoRepo.save(acto);

    // 8. Registar auditoria
    await this.auditService.registar({
      userId: params.userId,
      accao: 'processo.instaurar',
      recursoTipo: 'processo',
      recursoId: processo.id,
      dadosDepois: { numeroProcesso: processo.numeroProcesso.valor, actoId: acto.id },
      ipAddress: undefined,
      userAgent: undefined,
    });

    this.logger.log(`Processo ${processo.numeroProcesso.valor} instaurado para acto ${acto.numeroActo}.`);
    return processo;
  }
}
