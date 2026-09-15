import { FormatoInvalidoError } from "../errors/formato-invalido.error";

export class NumeroProcesso {
  private static readonly REGEX = /^SIC\/[A-Z]{2,5}\/[A-Z]{2,5}\/\d{4}\/\d{6}$/;

  private constructor(private readonly valorInterno: string) {}

  static criar(valor: string): NumeroProcesso {
    const normalizado = valor?.trim().toUpperCase() ?? "";
    if (!NumeroProcesso.REGEX.test(normalizado)) {
      throw new FormatoInvalidoError("numeroProcesso", valor, "SIC/UNIDADE/TIPO/ANO/SEQUENCIAL");
    }
    return new NumeroProcesso(normalizado);
  }

  static gerar(unidade: string, tipo: string, ano: number, sequencial: number): NumeroProcesso {
    return NumeroProcesso.criar(
      `SIC/${unidade}/${tipo}/${ano}/${String(sequencial).padStart(6, "0")}`
    );
  }

  get valor(): string {
    return this.valorInterno;
  }
  get unidade(): string {
    return this.valorInterno.split("/")[1];
  }
  get tipo(): string {
    return this.valorInterno.split("/")[2];
  }
  get ano(): number {
    return Number(this.valorInterno.split("/")[3]);
  }
  equals(outro: NumeroProcesso): boolean {
    return this.valorInterno === outro.valorInterno;
  }
  toString(): string {
    return this.valorInterno;
  }
}
