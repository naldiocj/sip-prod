import { Injectable, Logger } from '@nestjs/common';
import { ActoPiqueteRegistado } from '../../domain';
import { InstaurarProcessoHandler } from '../handlers/instaurar-processo.handler';

@Injectable()
export class ActoPiqueteRegistadoEventHandler {
  private readonly logger = new Logger(ActoPiqueteRegistadoEventHandler.name);

  constructor(private readonly instaurarProcesso: InstaurarProcessoHandler) { }

  async handle(event: ActoPiqueteRegistado): Promise<void> {
    this.logger.log(`Evento recebido: ActoPiqueteRegistado - actoId=${event.actoId}`);

    if (!event.geraProcesso) {
      this.logger.debug(`Acto ${event.actoId} não gera processo — ignorado.`);
      return;
    }

    await this.instaurarProcesso.execute({
      actoId: event.actoId,
      piqueteId: event.piqueteId,
      unidadeCodigo: event.piqueteId, // Assumindo que piqueteId é o código da unidade
      userId: event.registadoPor,
    });
  }
}
