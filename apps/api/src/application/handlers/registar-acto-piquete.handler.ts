import { Injectable, Logger, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { ActoPiquete, TipoActo, TipoActoRepository } from '../../domain';
import { GeradorNumeroService } from '../services/gerador-numero.service';
import { AuditService } from '../services/audit.service';

export interface RegistarActoPiqueteHandlerParams {
  tipoActoCodigo: string;
  piqueteId: string;
  userId: string;
  factos: string;
  localFactos: string | null;
  dataHoraFactos: Date | null;
  dados: Record<string, unknown>;
}

@Injectable()
export class RegistarActoPiqueteHandler {
  private readonly logger = new Logger(RegistarActoPiqueteHandler.name);

  constructor(
    private readonly tipoActoRepo: TipoActoRepository,
    private readonly actoRepo: any,
    private readonly gerador: GeradorNumeroService,
    private readonly auditService: AuditService,
  ) { }

  async execute(params: RegistarActoPiqueteHandlerParams): Promise<ActoPiquete> {
    this.logger.log(`Registar acto: tipo=${params.tipoActoCodigo} piquete=${params.piqueteId}`);

    // 1. Validar que o tipo de acto existe e está activo
    const tipoActo = await this.tipoActoRepo.findByCodigo(params.tipoActoCodigo);
    if (!tipoActo || !tipoActo.activo) {
      throw new NotFoundException(`Tipo de acto "${params.tipoActoCodigo}" não encontrado ou inactivo.`);
    }

    // 2. Gerar número do acto com lock pessimista
    const numeroActo = await this.gerador.gerar({
      unidade: params.piqueteId,
      tipo: 'ACTO',
    });

    // 3. Criar a entidade (validações do domínio correm aqui)
    let acto: ActoPiquete;
    try {
      acto = ActoPiquete.criar({
        id: randomUUID(),
        tipoActoId: tipoActo.id,
        tipoActoCodigo: tipoActo.codigo,
        piqueteId: params.piqueteId,
        userRegistoId: params.userId,
        numeroActo: numeroActo.valor,
        factos: params.factos,
        dados: params.dados,
        geraProcesso: tipoActo.geraProcesso,
      });
    } catch (err: any) {
      if (err.message?.includes('factos')) {
        throw new UnprocessableEntityException(err.message);
      }
      throw err;
    }

    // 4. Persistir
    await this.actoRepo.save(acto);

    // 5. Registar auditoria
    await this.auditService.registar({
      userId: params.userId,
      accao: 'acto_piquete.criar',
      recursoTipo: 'acto_piquete',
      recursoId: acto.id,
      dadosDepois: { numeroActo: acto.numeroActo, tipoActo: tipoActo.codigo },
      ipAddress: undefined,
      userAgent: undefined,
    });

    this.logger.log(`Acto registado: ${acto.numeroActo}`);
    return acto;
  }
}
