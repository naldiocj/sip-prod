export class InstaurarProcessoCommand {
  constructor(
    public readonly actoId: string,
    public readonly piqueteId: string,
    public readonly unidadeCodigo: string,
    public readonly instauradoPor: string,
  ) { }
}
