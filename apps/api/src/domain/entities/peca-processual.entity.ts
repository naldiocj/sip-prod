import { EstadoPeca } from "../enums/estado-peca.enum";
import { TransicaoInvalidaError } from "../errors/transicao-invalida.error";
import { HashDocumento } from "../value-objects/hash-documento.vo";

export type PecaProcessualProps = {
  id: string;
  processoId: string;
  templateId: string;
  tipo: string;
  numeroOrdem: number;
  dados: Record<string, unknown>;
  estado: EstadoPeca;
  hashDocumento: HashDocumento | null;
  pdfPath: string | null;
  criadaPor: string;
  criadaEm: Date;
  assinadaPor: string | null;
  assinadaEm: Date | null;
};

export class PecaProcessual {
  private constructor(private readonly props: PecaProcessualProps) {}

  static criar(
    params: Omit<
      PecaProcessualProps,
      "estado" | "hashDocumento" | "pdfPath" | "criadaEm" | "assinadaPor" | "assinadaEm"
    >
  ): PecaProcessual {
    if (params.numeroOrdem < 1)
      throw new TransicaoInvalidaError("criacao", "numero_ordem_invalido");
    return new PecaProcessual({
      ...params,
      estado: EstadoPeca.RASCUNHO,
      hashDocumento: null,
      pdfPath: null,
      criadaEm: new Date(),
      assinadaPor: null,
      assinadaEm: null
    });
  }

  static reconstituir(props: PecaProcessualProps): PecaProcessual {
    return new PecaProcessual(props);
  }
  get id(): string {
    return this.props.id;
  }
  get processoId(): string {
    return this.props.processoId;
  }
  get templateId(): string {
    return this.props.templateId;
  }
  get tipo(): string {
    return this.props.tipo;
  }
  get numeroOrdem(): number {
    return this.props.numeroOrdem;
  }
  get dados(): Record<string, unknown> {
    return { ...this.props.dados };
  }
  get estado(): EstadoPeca {
    return this.props.estado;
  }
  get hashDocumento(): HashDocumento | null {
    return this.props.hashDocumento;
  }
  get pdfPath(): string | null {
    return this.props.pdfPath;
  }
  get criadaPor(): string {
    return this.props.criadaPor;
  }
  get criadaEm(): Date {
    return this.props.criadaEm;
  }
  get assinadaPor(): string | null {
    return this.props.assinadaPor;
  }
  get assinadaEm(): Date | null {
    return this.props.assinadaEm;
  }

  gerarPDF(hash: HashDocumento, pdfPath: string): void {
    if (this.estado !== EstadoPeca.RASCUNHO)
      throw new TransicaoInvalidaError(this.estado, EstadoPeca.GERADA);
    if (!pdfPath.trim()) throw new TransicaoInvalidaError(this.estado, "pdf_sem_caminho");
    this.props.hashDocumento = hash;
    this.props.pdfPath = pdfPath;
    this.props.estado = EstadoPeca.GERADA;
  }
  assinar(assinadoPor: string): void {
    if (this.estado !== EstadoPeca.GERADA)
      throw new TransicaoInvalidaError(this.estado, EstadoPeca.ASSINADA);
    if (!this.hashDocumento) throw new TransicaoInvalidaError(this.estado, "assinatura_sem_hash");
    if (!assinadoPor.trim()) throw new TransicaoInvalidaError(this.estado, "assinante_vazio");
    this.props.assinadaPor = assinadoPor;
    this.props.assinadaEm = new Date();
    this.props.estado = EstadoPeca.IMUTAVEL;
  }
  estaImutavel(): boolean {
    return this.estado === EstadoPeca.IMUTAVEL;
  }
}
