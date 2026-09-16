export class RegistarActoPiqueteCommand {
  constructor(
    public readonly tipoActoCodigo: string,
    public readonly piqueteId: string,
    public readonly userId: string,
    public readonly factos: string,
    public readonly localFactos: string | null,
    public readonly dataHoraFactos: Date | null,
    public readonly dados: Record<string, unknown>,
  ) { }
}
