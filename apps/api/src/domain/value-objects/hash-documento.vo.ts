import { FormatoInvalidoError } from "../errors/formato-invalido.error";

export class HashDocumento {
  private constructor(private readonly valorInterno: string) {}

  static criar(valor: string): HashDocumento {
    const normalizado = valor?.trim().toLowerCase() ?? "";
    if (!/^[a-f0-9]{64}$/.test(normalizado)) {
      throw new FormatoInvalidoError(
        "hashDocumento",
        valor,
        "SHA-256 hexadecimal de 64 caracteres"
      );
    }
    return new HashDocumento(normalizado);
  }

  get valor(): string {
    return this.valorInterno;
  }
  equals(outro: HashDocumento): boolean {
    return this.valorInterno === outro.valorInterno;
  }
  toString(): string {
    return this.valorInterno;
  }
}
