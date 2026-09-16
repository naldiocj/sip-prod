import { Module } from '@nestjs/common';
import { DatabaseModule } from '../infrastructure/database/database.module';
import { GeradorNumeroService } from './services/gerador-numero.service';
import { IdempotencyService } from './services/idempotency.service';
import { AuditService } from './services/audit.service';
import { RegistarActoPiqueteHandler } from './handlers/registar-acto-piquete.handler';
import { InstaurarProcessoHandler } from './handlers/instaurar-processo.handler';
import { ActoPiqueteRegistadoEventHandler } from './handlers/acto-piquete-registado.event-handler';
import { TIPO_ACTO_REPOSITORY, UNIDADE_ORGANICA_REPOSITORY } from '../infrastructure/database/database.tokens';

@Module({
  imports: [DatabaseModule],
  providers: [
    GeradorNumeroService,
    IdempotencyService,
    AuditService,
    RegistarActoPiqueteHandler,
    InstaurarProcessoHandler,
    ActoPiqueteRegistadoEventHandler,
  ],
  exports: [
    GeradorNumeroService,
    IdempotencyService,
    AuditService,
    RegistarActoPiqueteHandler,
    InstaurarProcessoHandler,
    ActoPiqueteRegistadoEventHandler,
  ],
})
export class ApplicationModule { }
