import { Controller, Post, Get, Body, Param, Query, UseGuards, HttpCode, HttpStatus, Request } from '@nestjs/common';
import { ActoPiquete, ActoPiqueteRepository } from '../../domain';
import { CriarActoPiqueteDto } from './dtos/criar-acto-piquete.dto';
import { RequirePermissions } from '../../auth/permissions.decorator';
import { AuthGuard } from '../../auth/auth.guard';
import { PermissionsGuard } from '../../auth/permissions.guard';
import { RegistarActoPiqueteHandler } from '../../application/handlers/registar-acto-piquete.handler';
import { IdempotencyService } from '../../application/services/idempotency.service';
import { createHash } from 'crypto';

const IDEMPOTENCY_KEY_HEADER = 'idempotency-key';

@Controller('actos-piquete')
@UseGuards(AuthGuard, PermissionsGuard)
export class ActoPiqueteController {
  constructor(
    private readonly registarActoHandler: RegistarActoPiqueteHandler,
    private readonly actoRepo: ActoPiqueteRepository,
    private readonly idempotencyService: IdempotencyService,
  ) { }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions('acto_piquete:criar')
  async criar(
    @Body() dto: CriarActoPiqueteDto,
    @Request() req: any,
  ) {
    const chave = req.headers?.[IDEMPOTENCY_KEY_HEADER];

    if (chave) {
      const existente = await this.idempotencyService.verificar(chave, req.user?.sub);
      if (existente.existe) {
        return existente.resposta;
      }
    }

    const acto = await this.registarActoHandler.execute({
      tipoActoCodigo: dto.tipoActoCodigo,
      piqueteId: dto.piqueteId,
      userId: req.user?.sub,
      factos: dto.factos,
      localFactos: dto.localFactos ?? null,
      dataHoraFactos: dto.dataHoraFactos ? new Date(dto.dataHoraFactos) : null,
      dados: dto.dados ?? {},
    });

    const resposta = {
      acto: this.formatarActo(acto),
      _links: {
        self: `/actos-piquete/${acto.id}`,
        processo: acto.processoId ? `/processos/${acto.processoId}` : null,
      },
    };

    if (chave) {
      const requestHash = createHash('sha256').update(JSON.stringify(dto)).digest('hex');
      await this.idempotencyService.guardar(
        chave,
        req.user?.sub,
        `POST /actos-piquete`,
        requestHash,
        resposta,
        HttpStatus.CREATED,
      );
    }

    return resposta;
  }

  @Get(':id')
  @RequirePermissions('acto_piquete:ler')
  async consultar(@Param('id') id: string) {
    const acto = await this.actoRepo.findById(id);
    if (!acto) {
      throw new Error('Acto não encontrado.');
    }
    return this.formatarActo(acto);
  }

  @Get()
  @RequirePermissions('acto_piquete:ler')
  async listar(
    @Query('piqueteId') piqueteId: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
  ) {
    const actos = piqueteId
      ? await this.actoRepo.listarPorPiquete(piqueteId)
      : [];

    const paginados = actos.slice((page - 1) * limit, page * limit);
    return {
      data: paginados.map(a => this.formatarActo(a)),
      total: actos.length,
      page,
      limit,
    };
  }

  private formatarActo(acto: ActoPiquete) {
    return {
      id: acto.id,
      numeroActo: acto.numeroActo,
      tipoActoCodigo: acto.tipoActoCodigo,
      piqueteId: acto.piqueteId,
      userRegistoId: acto.userRegistoId,
      factos: acto.factos,
      estado: acto.estado,
      processoId: acto.processoId,
      dataRegisto: acto.dataRegisto,
    };
  }
}
