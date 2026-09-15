import { PecaProcessual } from "../entities/peca-processual.entity";

export interface PecaProcessualRepository {
  save(peca: PecaProcessual): Promise<void>;
  findById(id: string): Promise<PecaProcessual | null>;
  listarPorProcesso(processoId: string): Promise<PecaProcessual[]>;
  proximoNumeroOrdem(processoId: string): Promise<number>;
}
