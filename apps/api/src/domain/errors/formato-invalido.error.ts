import { DomainError } from "./domain.error";

export class FormatoInvalidoError extends DomainError {
  readonly code = "FORMATO_INVALIDO";

  constructor(
    public readonly campo: string,
    public readonly valor: string,
    public readonly formatoEsperado: string
  ) {
    super(`Formato inválido em "${campo}". Esperado: ${formatoEsperado}.`);
  }
}
