export type HierophantResourceKind = "abundance" | "conviction";

export interface HierophantResourceIntent {
  readonly commandId: string;
  readonly templeId: string;
  readonly resource: HierophantResourceKind;
  readonly expected: number;
  readonly value: number;
}

export interface HierophantResourcePoolView {
  readonly displayed: number;
  readonly pending: boolean;
  readonly error: string | null;
}

export function hierophantResourcePoolKey(
  templeId: string,
  resource: HierophantResourceKind,
): string {
  return `${templeId}:${resource}`;
}

interface ResourcePoolState {
  queue: HierophantResourceIntent[];
  inFlight: boolean;
  displayed: number;
  error: string | null;
  lastConfirmed: number | null;
  settledValue: number | null;
  lastObserved: number;
  epoch: number;
  chainValues: Set<number>;
}

export function createHierophantResourceIntentController(args: {
  readonly nextCommandId: () => string;
  readonly dispatch: (intent: HierophantResourceIntent) => Promise<void>;
  readonly onChange?: () => void;
}) {
  const pools = new Map<string, ResourcePoolState>();

  function notify(): void {
    args.onChange?.();
  }

  function getPool(templeId: string, resource: HierophantResourceKind): ResourcePoolState | undefined {
    return pools.get(hierophantResourcePoolKey(templeId, resource));
  }

  function ensurePool(
    templeId: string,
    resource: HierophantResourceKind,
    authoritative: number,
  ): ResourcePoolState {
    const key = hierophantResourcePoolKey(templeId, resource);
    const existing = pools.get(key);
    if (existing !== undefined) return existing;
    const created: ResourcePoolState = {
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
    pools.set(key, created);
    return created;
  }

  function isPending(pool: ResourcePoolState): boolean {
    return pool.inFlight || pool.queue.length > 0;
  }

  function failClosed(pool: ResourcePoolState, authoritative: number, message: string, notifyChange = true): void {
    pool.epoch += 1;
    pool.queue = [];
    pool.inFlight = false;
    pool.displayed = authoritative;
    pool.lastObserved = authoritative;
    pool.lastConfirmed = null;
    pool.settledValue = null;
    pool.chainValues = new Set();
    pool.error = message;
    if (notifyChange) notify();
  }

  async function pump(templeId: string, resource: HierophantResourceKind): Promise<void> {
    const pool = getPool(templeId, resource);
    if (pool === undefined || pool.inFlight) return;
    while (pool.queue.length > 0) {
      const intent = pool.queue[0]!;
      const epoch = pool.epoch;
      pool.inFlight = true;
      notify();
      try {
        await args.dispatch(intent);
        if (epoch !== pool.epoch) return;
        pool.queue.shift();
        pool.inFlight = false;
        pool.lastConfirmed = intent.value;
        if (pool.queue.length === 0) {
          pool.settledValue = intent.value;
          pool.displayed = intent.value;
        }
        notify();
      } catch (error) {
        if (epoch !== pool.epoch) return;
        const message = error instanceof Error ? error.message : "Resource update failed.";
        failClosed(pool, pool.lastObserved, message);
        return;
      }
    }
  }

  return {
    view(
      templeId: string,
      resource: HierophantResourceKind,
      authoritative: number,
    ): HierophantResourcePoolView {
      const pool = getPool(templeId, resource);
      if (pool === undefined) {
        return { displayed: authoritative, pending: false, error: null };
      }
      if (isPending(pool)) {
        return { displayed: pool.displayed, pending: true, error: pool.error };
      }
      if (pool.error !== null) {
        return { displayed: pool.displayed, pending: false, error: pool.error };
      }
      if (pool.settledValue !== null) {
        return { displayed: pool.settledValue, pending: false, error: null };
      }
      return { displayed: authoritative, pending: false, error: null };
    },

    enqueue(
      templeId: string,
      resource: HierophantResourceKind,
      delta: 1 | -1,
      authoritative: number,
    ): void {
      const pool = ensurePool(templeId, resource, authoritative);
      if (!isPending(pool) && pool.settledValue === null) {
        pool.lastObserved = authoritative;
      }
      const base = isPending(pool) ? pool.displayed : (pool.settledValue ?? pool.lastObserved);
      const next = base + delta;
      if (next < 0) return;
      if (!isPending(pool)) {
        pool.error = null;
        pool.chainValues.add(base);
      }
      const intent: HierophantResourceIntent = {
        commandId: args.nextCommandId(),
        templeId,
        resource,
        expected: base,
        value: next,
      };
      pool.queue.push(intent);
      pool.chainValues.add(base);
      pool.chainValues.add(next);
      pool.displayed = next;
      pool.settledValue = null;
      pool.error = null;
      notify();
      void pump(templeId, resource);
    },

    observeAuthoritative(
      templeId: string,
      resource: HierophantResourceKind,
      authoritative: number,
    ): void {
      const pool = getPool(templeId, resource);
      if (pool === undefined) return;
      if (!isPending(pool)) {
        if (pool.settledValue !== null) {
          if (authoritative === pool.settledValue) {
            pool.settledValue = null;
            pool.chainValues = new Set();
            pool.lastConfirmed = null;
            pool.lastObserved = authoritative;
            return;
          }
          if (pool.chainValues.has(authoritative)) return;
          pool.settledValue = null;
          pool.chainValues = new Set();
          pool.lastConfirmed = null;
          pool.lastObserved = authoritative;
          pool.displayed = authoritative;
          pool.error = null;
          notify();
          return;
        }
        pool.lastObserved = authoritative;
        return;
      }
      pool.lastObserved = authoritative;
      if (!pool.chainValues.has(authoritative) && pool.lastConfirmed !== authoritative) {
        failClosed(
          pool,
          authoritative,
          "Resource changed elsewhere; pending adjustments cancelled.",
          false,
        );
      }
    },
  };
}

export type HierophantResourceIntentController = ReturnType<typeof createHierophantResourceIntentController>;
