import type { HierophantResourceKind, HierophantResourcePoolView } from "./hierophant-resource-intent";

export interface HierophantHestarTransferIntent {
  readonly commandId: string;
  readonly resource: HierophantResourceKind;
  readonly sourceTempleId: string;
  readonly destinationTempleId: string;
}

export interface HierophantHestarTransferRequest {
  readonly resource: HierophantResourceKind;
  readonly sourceTempleId: string;
  readonly destinationTempleId: string;
  readonly sourceAuthoritative: number;
  readonly destinationAuthoritative: number;
}

interface TransferFlight {
  readonly intent: HierophantHestarTransferIntent;
  readonly sourceDisplayed: number;
  readonly destinationDisplayed: number;
  readonly sourceAuthoritative: number;
  readonly destinationAuthoritative: number;
}

export function createHierophantHestarTransferController(args: {
  readonly nextCommandId: () => string;
  readonly dispatch: (intent: HierophantHestarTransferIntent) => Promise<void>;
  readonly onChange?: () => void;
}) {
  let flight: TransferFlight | null = null;
  let error: string | null = null;
  let errorResource: HierophantResourceKind | null = null;
  let errorSourceId: string | null = null;
  let errorDestinationId: string | null = null;

  function notify(): void {
    args.onChange?.();
  }

  function poolError(templeId: string, resource: HierophantResourceKind): string | null {
    if (error === null || errorResource !== resource) return null;
    if (templeId === errorSourceId || templeId === errorDestinationId) return error;
    return null;
  }

  return {
    get busy(): boolean {
      return flight !== null;
    },

    view(
      templeId: string,
      resource: HierophantResourceKind,
      authoritative: number,
    ): HierophantResourcePoolView {
      if (flight !== null && flight.intent.resource === resource) {
        if (templeId === flight.intent.sourceTempleId) {
          return { displayed: flight.sourceDisplayed, pending: true, error: null };
        }
        if (templeId === flight.intent.destinationTempleId) {
          return { displayed: flight.destinationDisplayed, pending: true, error: null };
        }
      }
      return {
        displayed: authoritative,
        pending: false,
        error: poolError(templeId, resource),
      };
    },

    request(input: HierophantHestarTransferRequest): void {
      if (flight !== null) return;
      if (input.sourceAuthoritative < 1) return;
      error = null;
      errorResource = null;
      errorSourceId = null;
      errorDestinationId = null;
      const intent: HierophantHestarTransferIntent = {
        commandId: args.nextCommandId(),
        resource: input.resource,
        sourceTempleId: input.sourceTempleId,
        destinationTempleId: input.destinationTempleId,
      };
      flight = {
        intent,
        sourceDisplayed: input.sourceAuthoritative - 1,
        destinationDisplayed: input.destinationAuthoritative + 1,
        sourceAuthoritative: input.sourceAuthoritative,
        destinationAuthoritative: input.destinationAuthoritative,
      };
      notify();
      void (async () => {
        try {
          await args.dispatch(intent);
          if (flight?.intent.commandId !== intent.commandId) return;
          flight = null;
          notify();
        } catch (caught) {
          if (flight?.intent.commandId !== intent.commandId) return;
          flight = null;
          error = caught instanceof Error ? caught.message : "Hestar transfer failed.";
          errorResource = intent.resource;
          errorSourceId = intent.sourceTempleId;
          errorDestinationId = intent.destinationTempleId;
          notify();
        }
      })();
    },
  };
}

export type HierophantHestarTransferController = ReturnType<typeof createHierophantHestarTransferController>;
