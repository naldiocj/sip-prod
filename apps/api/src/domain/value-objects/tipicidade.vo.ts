import { FormatoInvalidoError } from "../errors/formato-invalido.error";

export class Tipicidade {
  private constructor(
    private readonly codigoInterno: string,
    private readonly designacaoInterna: string,
    private readonly artigoCppInterno: string
  ) {}

  static criar(codigo: string, designacao: string, artigoCpp: string): Tipicidade {
    if (!codigo?.trim())
      throw new FormatoInvalidoError("tipicidade.codigo", codigo, "código não vazio");
    if (!designacao || designacao.trim().length < 3) {
      throw new FormatoInvalidoError("tipicidade.designacao", designacao, "mínimo 3 caracteres");
    }
    if (!/^\d+(\.\d+)?$/.test(artigoCpp?.trim() ?? "")) {
      throw new FormatoInvalidoError("tipicidade.artigoCpp", artigoCpp, "número de artigo");
    }
    return new Tipicidade(codigo.trim().toUpperCase(), designacao.trim(), artigoCpp.trim());
  }

  get codigo(): string {
    return this.codigoInterno;
  }
  get designacao(): string {
    return this.designacaoInterna;
  }
  get artigoCpp(): string {
    return this.artigoCppInterno;
  }
  equals(outro: Tipicidade): boolean {
    return this.codigoInterno === outro.codigoInterno;
  }
  toString(): string {
    return `${this.codigoInterno} - ${this.designacaoInterna} (art. ${this.artigoCppInterno}º CPP)`;
  }
}
