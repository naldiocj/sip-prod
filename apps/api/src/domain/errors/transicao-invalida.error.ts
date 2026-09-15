import { DomainError } from "./domain.error";

export class TransicaoInvalidaError extends DomainError {
  readonly code = "TRANSICAO_INVALIDA";

  constructor(
    public readonly estadoAtual: string,
    public readonly estadoPretendido: string
  ) {
    super(`Transição inválida: "${estadoAtual}" → "${estadoPretendido}".`);
  }
}
