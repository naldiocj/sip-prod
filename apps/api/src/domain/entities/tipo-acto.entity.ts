export enum EstadoTipoActo {
  ACTIVO = "activo",
  INACTIVO = "inactivo"
}

export type TipoActoProps = {
  id: string;
  codigo: string;
  nome: string;
  activo: boolean;
  geraProcesso: boolean;
  campos: Record<string, unknown> | any;
  createdAt: Date;
  updatedAt: Date;
};

export class TipoActo {
  private constructor(private readonly props: TipoActoProps) { }

  static criar(params: {
    id: string;
    codigo: string;
    nome: string;
    geraProcesso?: boolean;
    campos?: Record<string, unknown>;
  }): TipoActo {
    return new TipoActo({
      id: params.id,
      codigo: params.codigo,
      nome: params.nome,
      activo: true,
      geraProcesso: params.geraProcesso ?? false,
      campos: params.campos ?? {},
      createdAt: new Date(),
      updatedAt: new Date()
    });
  }

  static reconstituir(props: TipoActoProps): TipoActo {
    return new TipoActo(props);
  }

  get id(): string {
    return this.props.id;
  }

  get codigo(): string {
    return this.props.codigo;
  }

  get nome(): string {
    return this.props.nome;
  }

  get activo(): boolean {
    return this.props.activo;
  }

  get geraProcesso(): boolean {
    return this.props.geraProcesso;
  }

  get campos(): Record<string, unknown> {
    return { ...this.props.campos };
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  desactivar(): void {
    this.props.activo = false;
    this.props.updatedAt = new Date();
  }

  activar(): void {
    this.props.activo = true;
    this.props.updatedAt = new Date();
  }
}

export interface TipoActoRepository {
  findById(id: string): Promise<TipoActo | null>;
  findByCodigo(codigo: string): Promise<TipoActo | null>;
  listarActivos(): Promise<TipoActo[]>;
  save(tipoActo: TipoActo): Promise<void>;
}
