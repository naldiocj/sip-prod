import { Processo } from "../entities/processo.entity";
import { NumeroProcesso } from "../value-objects/numero-processo.vo";

export type FiltrosProcesso = {
  unidadeId?: string;
  instrutorId?: string;
  estado?: string;
  origem?: string;
  ano?: number;
};

export interface ProcessoRepository {
  save(processo: Processo): Promise<void>;
  findById(id: string): Promise<Processo | null>;
  findByNumero(numero: NumeroProcesso): Promise<Processo | null>;
  findByNumeroProcuradoria(numero: string): Promise<Processo | null>;
  listar(filtros: FiltrosProcesso): Promise<Processo[]>;
  existe(numero: NumeroProcesso): Promise<boolean>;
}
