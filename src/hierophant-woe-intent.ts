export interface HierophantWoeIntent {
  readonly commandId: string;
  readonly denizenId: string;
  readonly expected: number;
  readonly value: number;
}

export interface HierophantWoeFieldView {
  readonly displayed: number;
  readonly pending: boolean;
  readonly error: string | null;
}

interface WoeFieldState {
  queue: HierophantWoeIntent[];
  inFlight: boolean;
  displayed: number;
  error: string | null;
  lastConfirmed: number | null;
  settledValue: number | null;
  lastObserved: number;
  epoch: number;
  chainValues: Set<number>;
}

export function createHierophantWoeIntentController(args: {
  readonly nextCommandId: () => string;
  readonly dispatch: (intent: HierophantWoeIntent) => Promise<void>;
  readonly onChange?: () => void;
}) {
  const fields = new Map<string, WoeFieldState>();

  function notify(): void {
    args.onChange?.();
  }

  function getField(denizenId: string): WoeFieldState | undefined {
    return fields.get(denizenId);
  }

  function ensureField(denizenId: string, authoritative: number): WoeFieldState {
    const existing = fields.get(denizenId);
    if (existing !== undefined) return existing;
    const created: WoeFieldState = {
      queue: [],
      inFlight: false,
      displayed: authoritative,
      error: null,
      lastConfirmed: null,
      settledValue: null,
      lastObserved: authoritative,
      epoch: 0,
      chainValues: new Set(),
    };
    fields.set(denizenId, created);
    return created;
  }

  function isPending(field: WoeFieldState): boolean {
    return field.inFlight || field.queue.length > 0;
  }

  function failClosed(field: WoeFieldState, authoritative: number, message: string, notifyChange = true): void {
    field.epoch += 1;
    field.queue = [];
    field.inFlight = false;
    field.displayed = authoritative;
    field.lastObserved = authoritative;
    field.lastConfirmed = null;
    field.settledValue = null;
    field.chainValues = new Set();
    field.error = message;
    if (notifyChange) notify();
  }

  function pushIntent(field: WoeFieldState, denizenId: string, expected: number, value: number): void {
    const intent: HierophantWoeIntent = {
      commandId: args.nextCommandId(),
      denizenId,
      expected,
      value,
    };
    field.queue.push(intent);
    field.chainValues.add(expected);
    field.chainValues.add(value);
    field.displayed = value;
    field.settledValue = null;
    field.error = null;
  }

  function prepareBase(field: WoeFieldState, authoritative: number): number {
    if (!isPending(field) && field.settledValue === null) {
      field.lastObserved = authoritative;
    }
    return isPending(field) ? field.displayed : (field.settledValue ?? field.lastObserved);
  }

  async function pump(denizenId: string): Promise<void> {
    const field = getField(denizenId);
    if (field === undefined || field.inFlight) return;
    while (field.queue.length > 0) {
      const intent = field.queue[0]!;
      const epoch = field.epoch;
      field.inFlight = true;
      notify();
      try {
        await args.dispatch(intent);
        if (epoch !== field.epoch) return;
        field.queue.shift();
        field.inFlight = false;
        field.lastConfirmed = intent.value;
        if (field.queue.length === 0) {
          field.settledValue = intent.value;
          field.displayed = intent.value;
        }
        notify();
      } catch (error) {
        if (epoch !== field.epoch) return;
        const message = error instanceof Error ? error.message : "Woe update failed.";
        failClosed(field, field.lastObserved, message);
        return;
      }
    }
  }

  return {
    view(denizenId: string, authoritative: number): HierophantWoeFieldView {
      const field = getField(denizenId);
      if (field === undefined) {
        return { displayed: authoritative, pending: false, error: null };
      }
      if (isPending(field)) {
        return { displayed: field.displayed, pending: true, error: field.error };
      }
      if (field.error !== null) {
        return { displayed: field.displayed, pending: false, error: field.error };
      }
      if (field.settledValue !== null) {
        return { displayed: field.settledValue, pending: false, error: null };
      }
      return { displayed: authoritative, pending: false, error: null };
    },

    enqueueDelta(denizenId: string, delta: 1 | -1, authoritative: number): void {
      const field = ensureField(denizenId, authoritative);
      const base = prepareBase(field, authoritative);
      const next = base + delta;
      if (next < 0) return;
      if (!isPending(field)) {
        field.error = null;
        field.chainValues.add(base);
      }
      pushIntent(field, denizenId, base, next);
      notify();
      void pump(denizenId);
    },

    enqueueSet(denizenId: string, target: number, authoritative: number): void {
      if (!Number.isSafeInteger(target) || target < 0) return;
      const field = ensureField(denizenId, authoritative);
      const base = prepareBase(field, authoritative);
      if (target === base) return;
      if (!isPending(field)) {
        field.error = null;
        field.chainValues.add(base);
        pushIntent(field, denizenId, base, target);
        notify();
        void pump(denizenId);
        return;
      }
      const head = field.queue[0];
      if (head === undefined) {
        pushIntent(field, denizenId, base, target);
        notify();
        void pump(denizenId);
        return;
      }
      field.queue = field.inFlight ? [head] : [];
      const from = field.inFlight ? head.value : (field.lastConfirmed ?? field.lastObserved);
      field.displayed = target;
      field.settledValue = null;
      field.error = null;
      field.chainValues.add(from);
      field.chainValues.add(target);
      if (from !== target) {
        const expected = field.inFlight ? head.value : from;
        if (field.queue.length === 0 || field.queue[field.queue.length - 1]!.value !== target) {
          field.queue.push({
            commandId: args.nextCommandId(),
            denizenId,
            expected,
            value: target,
          });
        }
      }
      notify();
      void pump(denizenId);
    },

    observeAuthoritative(denizenId: string, authoritative: number): void {
      const field = getField(denizenId);
      if (field === undefined) return;
      if (!isPending(field)) {
        if (field.settledValue !== null) {
          if (authoritative === field.settledValue) {
            field.settledValue = null;
            field.chainValues = new Set();
            field.lastConfirmed = null;
            field.lastObserved = authoritative;
            return;
          }
          if (field.chainValues.has(authoritative)) return;
          field.settledValue = null;
          field.chainValues = new Set();
          field.lastConfirmed = null;
          field.lastObserved = authoritative;
          field.displayed = authoritative;
          field.error = null;
          notify();
          return;
        }
        field.lastObserved = authoritative;
        return;
      }
      field.lastObserved = authoritative;
      if (!field.chainValues.has(authoritative) && field.lastConfirmed !== authoritative) {
        failClosed(
          field,
          authoritative,
          "Woe changed elsewhere; pending adjustments cancelled.",
          false,
        );
      }
    },
  };
}

export type HierophantWoeIntentController = ReturnType<typeof createHierophantWoeIntentController>;
