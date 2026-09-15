import { ActoPiquete } from "../entities/acto-piquete.entity";

export interface ActoPiqueteRepository {
  save(acto: ActoPiquete): Promise<void>;
  findById(id: string): Promise<ActoPiquete | null>;
  findByNumero(numeroActo: string): Promise<ActoPiquete | null>;
  listarPorPiquete(piqueteId: string): Promise<ActoPiquete[]>;
  listarPorUser(userId: string): Promise<ActoPiquete[]>;
}
