import { DomainEvent } from "./domain-event";

export class ActoPiqueteRegistado extends DomainEvent {
  readonly eventName = "acto.piquete.registado";

  constructor(
    readonly actoId: string,
    readonly tipoActoId: string,
    readonly piqueteId: string,
    readonly registadoPor: string,
    readonly geraProcesso: boolean
  ) {
    super();
  }
}
