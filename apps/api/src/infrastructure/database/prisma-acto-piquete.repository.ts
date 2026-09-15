import { Prisma, PrismaClient } from "@sip/database";
import { ActoPiquete, ActoPiqueteProps, ActoPiqueteRepository } from "../../domain";

export class PrismaActoPiqueteRepository implements ActoPiqueteRepository {
  constructor(private readonly prisma: PrismaClient) {}
  async save(acto: ActoPiquete): Promise<void> {
    await this.prisma.actoPiquete.upsert({
      where: { id: acto.id },
      create: this.paraModelo(acto),
      update: this.paraModelo(acto)
    });
    acto.limparEventos();
  }
  async findById(id: string): Promise<ActoPiquete | null> {
    const row = await this.prisma.actoPiquete.findUnique({ where: { id } });
    return row ? ActoPiquete.reconstituir(row as ActoPiqueteProps) : null;
  }
  async findByNumero(numeroActo: string): Promise<ActoPiquete | null> {
    const row = await this.prisma.actoPiquete.findUnique({ where: { numeroActo } });
    return row ? ActoPiquete.reconstituir(row as ActoPiqueteProps) : null;
  }
  async listarPorPiquete(piqueteId: string): Promise<ActoPiquete[]> {
    const rows = await this.prisma.actoPiquete.findMany({ where: { piqueteId } });
    return rows.map((row) => ActoPiquete.reconstituir(row as ActoPiqueteProps));
  }
  async listarPorUser(userId: string): Promise<ActoPiquete[]> {
    const rows = await this.prisma.actoPiquete.findMany({ where: { userRegistoId: userId } });
    return rows.map((row) => ActoPiquete.reconstituir(row as ActoPiqueteProps));
  }
  private paraModelo(acto: ActoPiquete) {
    return {
      id: acto.id,
      tipoActoId: acto.tipoActoId,
      tipoActoCodigo: acto.tipoActoCodigo,
      piqueteId: acto.piqueteId,
      userRegistoId: acto.userRegistoId,
      numeroActo: acto.numeroActo,
      factos: acto.factos,
      dados: acto.dados as Prisma.InputJsonValue,
      estado: acto.estado,
      processoId: acto.processoId,
      geraProcesso: acto.geraProcesso,
      dataRegisto: acto.dataRegisto
    };
  }
}
