import { EstadoProcesso } from "../enums/estado-processo.enum";
import { OrigemProcesso } from "../enums/origem-processo.enum";
import { TransicaoInvalidaError } from "../errors/transicao-invalida.error";
import { ProcessoInstaurado } from "../events/processo-instaurado.event";
import { DomainEvent } from "../events/domain-event";
import { NumeroProcesso } from "../value-objects/numero-processo.vo";
import { Tipicidade } from "../value-objects/tipicidade.vo";

export type ProcessoProps = {
  id: string;
  numeroProcesso: NumeroProcesso;
  numeroProcuradoria: string | null;
  estado: EstadoProcesso;
  origem: OrigemProcesso;
  tipicidade: Tipicidade | null;
  piqueteId: string | null;
  instrutorId: string | null;
  unidadeActualId: string;
  dataInstauracao: Date;
  dataUltimaTransicao: Date;
};

export class Processo {
  private readonly eventosInternos: DomainEvent[] = [];
  private constructor(private readonly props: ProcessoProps) {}

  static instaurar(params: {
    id: string;
    numeroProcesso: NumeroProcesso;
    origem: OrigemProcesso;
    unidadeActualId: string;
    instauradoPor: string;
    piqueteId?: string;
  }): Processo {
    const agora = new Date();
    const processo = new Processo({
      id: params.id,
      numeroProcesso: params.numeroProcesso,
      numeroProcuradoria: null,
      estado: EstadoProcesso.RASCUNHO,
      origem: params.origem,
      tipicidade: null,
      piqueteId: params.piqueteId ?? null,
      instrutorId: null,
      unidadeActualId: params.unidadeActualId,
      dataInstauracao: agora,
      dataUltimaTransicao: agora
    });
    processo.adicionarEvento(
      new ProcessoInstaurado(
        processo.id,
        params.numeroProcesso,
        params.origem,
        params.instauradoPor
      )
    );
    return processo;
  }

  static reconstituir(props: ProcessoProps): Processo {
    return new Processo(props);
  }

  get id(): string {
    return this.props.id;
  }
  get numeroProcesso(): NumeroProcesso {
    return this.props.numeroProcesso;
  }
  get numeroProcuradoria(): string | null {
    return this.props.numeroProcuradoria;
  }
  get estado(): EstadoProcesso {
    return this.props.estado;
  }
  get origem(): OrigemProcesso {
    return this.props.origem;
  }
  get tipicidade(): Tipicidade | null {
    return this.props.tipicidade;
  }
  get piqueteId(): string | null {
    return this.props.piqueteId;
  }
  get instrutorId(): string | null {
    return this.props.instrutorId;
  }
  get unidadeActualId(): string {
    return this.props.unidadeActualId;
  }
  get dataInstauracao(): Date {
    return this.props.dataInstauracao;
  }
  get dataUltimaTransicao(): Date {
    return this.props.dataUltimaTransicao;
  }
  get eventos(): readonly DomainEvent[] {
    return [...this.eventosInternos];
  }
  limparEventos(): void {
    this.eventosInternos.length = 0;
  }

  distribuirParaInstrutor(instrutorId: string): void {
    if (this.estado !== EstadoProcesso.RASCUNHO)
      throw new TransicaoInvalidaError(this.estado, EstadoProcesso.EM_INSTRUCAO);
    if (!instrutorId.trim()) throw new TransicaoInvalidaError(this.estado, "instrutor_vazio");
    this.props.instrutorId = instrutorId;
    this.transitarPara(EstadoProcesso.EM_INSTRUCAO);
  }

  remeterParaProcuradoria(): void {
    if (this.estado !== EstadoProcesso.EM_INSTRUCAO)
      throw new TransicaoInvalidaError(this.estado, EstadoProcesso.REMETIDO_PROCURADORIA);
    this.transitarPara(EstadoProcesso.REMETIDO_PROCURADORIA);
  }

  registarNumeroProcuradoria(numero: string): void {
    if (this.estado !== EstadoProcesso.REMETIDO_PROCURADORIA)
      throw new TransicaoInvalidaError(this.estado, "registar_numero_procuradoria");
    if (!numero.trim()) throw new TransicaoInvalidaError(this.estado, "numero_vazio");
    this.props.numeroProcuradoria = numero.trim().toUpperCase();
    this.transitarPara(EstadoProcesso.EM_PROCURADORIA);
  }

  arquivar(motivo: string): void {
    const permitidos = [
      EstadoProcesso.RASCUNHO,
      EstadoProcesso.EM_INSTRUCAO,
      EstadoProcesso.EM_PROCURADORIA
    ];
    if (!permitidos.includes(this.estado))
      throw new TransicaoInvalidaError(this.estado, EstadoProcesso.ARQUIVADO);
    if (motivo.trim().length < 10)
      throw new TransicaoInvalidaError(this.estado, "arquivamento_sem_fundamento");
    this.transitarPara(EstadoProcesso.ARQUIVADO);
  }

  private adicionarEvento(evento: DomainEvent): void {
    this.eventosInternos.push(evento);
  }
  private transitarPara(novoEstado: EstadoProcesso): void {
    this.props.estado = novoEstado;
    this.props.dataUltimaTransicao = new Date();
  }
}
