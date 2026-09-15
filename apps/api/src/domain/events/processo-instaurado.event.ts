import { OrigemProcesso } from "../enums/origem-processo.enum";
import { NumeroProcesso } from "../value-objects/numero-processo.vo";
import { DomainEvent } from "./domain-event";

export class ProcessoInstaurado extends DomainEvent {
  readonly eventName = "processo.instaurado";

  constructor(
    readonly processoId: string,
    readonly numeroProcesso: NumeroProcesso,
    readonly origem: OrigemProcesso,
    readonly instauradoPor: string
  ) {
    super();
  }
}
