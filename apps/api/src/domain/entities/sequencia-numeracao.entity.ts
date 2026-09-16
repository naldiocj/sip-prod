export type SequenciaNumeracaoProps = {
  id: string;
  unidade: string;
  tipo: string;
  ano: number;
  ultimoNumero: number;
  createdAt: Date;
  updatedAt: Date;
};

export class SequenciaNumeracao {
  private constructor(private readonly props: SequenciaNumeracaoProps) { }

  static criar(params: {
    id: string;
    unidade: string;
    tipo: string;
    ano: number;
  }): SequenciaNumeracao {
    return new SequenciaNumeracao({
      id: params.id,
      unidade: params.unidade,
      tipo: params.tipo,
      ano: params.ano,
      ultimoNumero: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    });
  }

  static reconstituir(props: SequenciaNumeracaoProps): SequenciaNumeracao {
    return new SequenciaNumeracao(props);
  }

  get id(): string {
    return this.props.id;
  }

  get unidade(): string {
    return this.props.unidade;
  }

  get tipo(): string {
    return this.props.tipo;
  }

  get ano(): number {
    return this.props.ano;
  }

  get ultimoNumero(): number {
    return this.props.ultimoNumero;
  }

  incrementar(): number {
    this.props.ultimoNumero += 1;
    this.props.updatedAt = new Date();
    return this.props.ultimoNumero;
  }

  getUltimoNumero(): number {
    return this.props.ultimoNumero;
  }
}

export interface SequenciaNumeracaoRepository {
  findOneByUnidadeTipoAno(unidade: string, tipo: string, ano: number): Promise<SequenciaNumeracao | null>;
  save(sequencia: SequenciaNumeracao): Promise<void>;
  incrementar(unidade: string, tipo: string, ano: number): Promise<number>;
}
