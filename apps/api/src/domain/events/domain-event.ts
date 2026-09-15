export abstract class DomainEvent {
  readonly ocorridoEm = new Date();
  readonly eventId = crypto.randomUUID();
  abstract readonly eventName: string;
}
