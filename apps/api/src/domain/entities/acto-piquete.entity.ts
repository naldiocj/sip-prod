import { EstadoActo } from "../enums/estado-acto.enum";
import { TransicaoInvalidaError } from "../errors/transicao-invalida.error";
import { ActoPiqueteRegistado } from "../events/acto-piquete-registado.event";
import { DomainEvent } from "../events/domain-event";

export type ActoPiqueteProps = {
  id: string;
  tipoActoId: string;
  tipoActoCodigo: string;
  piqueteId: string;
  userRegistoId: string;
  numeroActo: string;
  factos: string;
  dados: Record<string, unknown>;
  estado: EstadoActo;
  processoId: string | null;
  geraProcesso: boolean;
  dataRegisto: Date;
};

export class ActoPiquete {
  private readonly eventosInternos: DomainEvent[] = [];
  private constructor(private readonly props: ActoPiqueteProps) {}

  static criar(
    params: Omit<ActoPiqueteProps, "estado" | "processoId" | "dataRegisto" | "dados"> & {
      dados?: Record<string, unknown>;
    }
  ): ActoPiquete {
    if (!params.factos?.trim() || params.factos.trim().length < 20)
      throw new TransicaoInvalidaError("criacao", "factos_insuficientes");
    const acto = new ActoPiquete({
      ...params,
      factos: params.factos.trim(),
      dados: params.dados ?? {},
      estado: EstadoActo.SUBMETIDO,
      processoId: null,
      dataRegisto: new Date()
    });
    if (params.geraProcesso)
      acto.eventosInternos.push(
        new ActoPiqueteRegistado(
          acto.id,
          params.tipoActoId,
          params.piqueteId,
          params.userRegistoId,
          true
        )
      );
    return acto;
  }

  static reconstituir(props: ActoPiqueteProps): ActoPiquete {
    return new ActoPiquete(props);
  }
  get id(): string {
    return this.props.id;
  }
  get tipoActoId(): string {
    return this.props.tipoActoId;
  }
  get tipoActoCodigo(): string {
    return this.props.tipoActoCodigo;
  }
  get piqueteId(): string {
    return this.props.piqueteId;
  }
  get userRegistoId(): string {
    return this.props.userRegistoId;
  }
  get numeroActo(): string {
    return this.props.numeroActo;
  }
  get factos(): string {
    return this.props.factos;
  }
  get dados(): Record<string, unknown> {
    return { ...this.props.dados };
  }
  get estado(): EstadoActo {
    return this.props.estado;
  }
  get processoId(): string | null {
    return this.props.processoId;
  }
  get geraProcesso(): boolean {
    return this.props.geraProcesso;
  }
  get dataRegisto(): Date {
    return this.props.dataRegisto;
  }
  get eventos(): readonly DomainEvent[] {
    return [...this.eventosInternos];
  }
  limparEventos(): void {
    this.eventosInternos.length = 0;
  }

  validar(): void {
    this.exigirEstado(EstadoActo.SUBMETIDO, EstadoActo.VALIDADO);
    this.props.estado = EstadoActo.VALIDADO;
  }
  rejeitar(motivo: string): void {
    this.exigirEstado(EstadoActo.SUBMETIDO, EstadoActo.REJEITADO);
    if (motivo.trim().length < 10)
      throw new TransicaoInvalidaError(this.estado, "rejeicao_sem_fundamento");
    this.props.estado = EstadoActo.REJEITADO;
  }
  vincularProcesso(processoId: string): void {
    if (this.processoId) throw new TransicaoInvalidaError(this.estado, "processo_ja_vinculado");
    if (!processoId.trim()) throw new TransicaoInvalidaError(this.estado, "processo_vazio");
    this.props.processoId = processoId;
    this.props.estado = EstadoActo.CONVERTIDO;
  }
  private exigirEstado(atual: EstadoActo, pretendido: EstadoActo): void {
    if (this.estado !== atual) throw new TransicaoInvalidaError(this.estado, pretendido);
  }
}
