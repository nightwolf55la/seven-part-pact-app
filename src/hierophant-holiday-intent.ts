export interface HierophantHolidayFieldView {
  readonly marked: boolean;
  readonly pending: boolean;
}

interface HolidayIntent {
  readonly expected: boolean;
  readonly requested: boolean;
  readonly expectedRevision: number;
}

export function createHierophantHolidayIntentController(args: {
  readonly dispatch: (templeId: string, marked: boolean) => Promise<void>;
  readonly onError?: (message: string) => void;
  readonly onChange?: () => void;
}) {
  const intents = new Map<string, HolidayIntent>();
  const inFlight = new Set<string>();

  function notify(): void {
    args.onChange?.();
  }

  return {
    view(templeId: string, authoritative: boolean): HierophantHolidayFieldView {
      const intent = intents.get(templeId);
      if (intent !== undefined) {
        return { marked: intent.requested, pending: true };
      }
      return { marked: authoritative, pending: false };
    },

    request(
      templeId: string,
      marked: boolean,
      authoritative: boolean,
      expectedRevision: number,
    ): void {
      if (inFlight.has(templeId) || intents.has(templeId)) return;
      if (authoritative === marked) return;
      intents.set(templeId, {
        expected: authoritative,
        requested: marked,
        expectedRevision,
      });
      inFlight.add(templeId);
      notify();
      void args.dispatch(templeId, marked).then(
        () => {
          inFlight.delete(templeId);
          notify();
        },
        (error: unknown) => {
          inFlight.delete(templeId);
          intents.delete(templeId);
          const message = error instanceof Error ? error.message : "Holiday marker failed.";
          args.onError?.(message);
          notify();
        },
      );
    },

    observe(templeId: string, authoritative: boolean, revision: number): void {
      const intent = intents.get(templeId);
      if (intent === undefined) return;
      if (authoritative === intent.requested) {
        intents.delete(templeId);
        inFlight.delete(templeId);
        notify();
        return;
      }
      // Holiday is boolean: requested is always the opposite of expected, so the
      // marker alone cannot distinguish "still waiting" from a later same-value
      // authoritative revision. Campaign revision is the local settlement signal.
      if (authoritative !== intent.expected || revision !== intent.expectedRevision) {
        intents.delete(templeId);
        notify();
      }
    },
  };
}

export type HierophantHolidayIntentController = ReturnType<typeof createHierophantHolidayIntentController>;
