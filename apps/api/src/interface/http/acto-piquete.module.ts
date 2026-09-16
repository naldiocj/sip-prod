import { Module } from '@nestjs/common';
import { ActoPiqueteController } from './acto-piquete.controller';
import { ApplicationModule } from '../../application/application.module';
import { ACTO_PIQUETE_REPOSITORY } from '../../infrastructure/database/database.tokens';

@Module({
  imports: [ApplicationModule],
  controllers: [ActoPiqueteController],
  providers: [],
})
export class ActoPiqueteModule { }
