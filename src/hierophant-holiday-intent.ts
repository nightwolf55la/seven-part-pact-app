export interface HierophantHolidayFieldView {
  readonly marked: boolean;
  readonly pending: boolean;
}

export function createHierophantHolidayIntentController(args: {
  readonly dispatch: (templeId: string, marked: boolean) => Promise<void>;
  readonly onError?: (message: string) => void;
  readonly onChange?: () => void;
}) {
  const requested = new Map<string, boolean>();
  const inFlight = new Set<string>();

  function notify(): void {
    args.onChange?.();
  }

  return {
    view(templeId: string, authoritative: boolean): HierophantHolidayFieldView {
      if (requested.has(templeId)) {
        return { marked: requested.get(templeId)!, pending: true };
      }
      return { marked: authoritative, pending: false };
    },

    request(templeId: string, marked: boolean, authoritative: boolean): void {
      if (inFlight.has(templeId) || requested.has(templeId)) return;
      if (authoritative === marked) return;
      requested.set(templeId, marked);
      inFlight.add(templeId);
      notify();
      void args.dispatch(templeId, marked).then(
        () => {
          inFlight.delete(templeId);
          notify();
        },
        (error: unknown) => {
          inFlight.delete(templeId);
          requested.delete(templeId);
          const message = error instanceof Error ? error.message : "Holiday marker failed.";
          args.onError?.(message);
          notify();
        },
      );
    },

    observe(templeId: string, authoritative: boolean): void {
      if (!requested.has(templeId)) return;
      if (authoritative === requested.get(templeId)) {
        requested.delete(templeId);
        inFlight.delete(templeId);
        notify();
      }
    },
  };
}

export type HierophantHolidayIntentController = ReturnType<typeof createHierophantHolidayIntentController>;
