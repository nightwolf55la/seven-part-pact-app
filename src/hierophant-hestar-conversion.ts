import type { HierophantResourceKind, HierophantResourcePoolView } from "./hierophant-resource-intent";
import { hierophantResourcePoolKey } from "./hierophant-resource-intent";

export function hestarDestinationResource(
  sourceResource: HierophantResourceKind,
): HierophantResourceKind {
  return sourceResource === "abundance" ? "conviction" : "abundance";
}

export function hierophantHestarConversionVisibleLabel(
  sourceResource: HierophantResourceKind,
): string {
  return sourceResource === "abundance" ? "Hestar +C" : "Hestar +A";
}

export function hierophantHestarConversionAriaLabel(args: {
  readonly templeName: string;
  readonly sourceResource: HierophantResourceKind;
  readonly available: number;
}): string {
  const sourceLabel = args.sourceResource === "abundance" ? "Abundance" : "Conviction";
  const destLabel = args.sourceResource === "abundance" ? "Conviction" : "Abundance";
  if (args.available <= 0) {
    return `Cannot convert: ${args.templeName} ${sourceLabel} is 0`;
  }
  return `Convert 1 ${sourceLabel} at ${args.templeName} to 1 ${destLabel} at Hestar`;
}

export interface HierophantHestarConversionIntent {
  readonly commandId: string;
  readonly ordinaryTempleId: string;
  readonly sourceResource: HierophantResourceKind;
  readonly expectedRevision: number;
  readonly expectedOrdinarySourceCount: number;
  readonly expectedHestarDestinationCount: number;
}

export interface HierophantHestarConversionRequest {
  readonly ordinaryTempleId: string;
  readonly sourceResource: HierophantResourceKind;
  readonly ordinaryAuthoritative: number;
  readonly hestarAuthoritative: number;
}

interface ConversionQueuedItem {
  readonly commandId: string;
  readonly ordinaryTempleId: string;
  readonly sourceResource: HierophantResourceKind;
  readonly expectedOrdinarySourceCount: number;
  readonly expectedHestarDestinationCount: number;
}

interface ConversionControllerState {
  queue: ConversionQueuedItem[];
  inFlight: boolean;
  displayed: Map<string, number>;
  lastObserved: Map<string, number>;
  chainValues: Map<string, Set<number>>;
  lastConfirmed: Map<string, number>;
  settled: Map<string, number>;
  error: string | null;
  errorKeys: Set<string>;
  epoch: number;
  lastSettledRevision: number | null;
}

function sourceKey(templeId: string, resource: HierophantResourceKind): string {
  return hierophantResourcePoolKey(templeId, resource);
}

function destKey(resource: HierophantResourceKind): string {
  return hierophantResourcePoolKey("hestar", hestarDestinationResource(resource));
}

function itemKeys(item: ConversionQueuedItem): { source: string; dest: string } {
  return {
    source: sourceKey(item.ordinaryTempleId, item.sourceResource),
    dest: destKey(item.sourceResource),
  };
}

function ensureChain(map: Map<string, Set<number>>, key: string): Set<number> {
  const existing = map.get(key);
  if (existing !== undefined) return existing;
  const created = new Set<number>();
  map.set(key, created);
  return created;
}

export function createHierophantHestarConversionController(args: {
  readonly nextCommandId: () => string;
  readonly currentRevision: () => number;
  readonly dispatch: (
    intent: HierophantHestarConversionIntent,
  ) => Promise<{ revision: number } | void>;
  readonly onChange?: () => void;
}) {
  const state: ConversionControllerState = {
    queue: [],
    inFlight: false,
    displayed: new Map(),
    lastObserved: new Map(),
    chainValues: new Map(),
    lastConfirmed: new Map(),
    settled: new Map(),
    error: null,
    errorKeys: new Set(),
    epoch: 0,
    lastSettledRevision: null,
  };

  function notify(): void {
    args.onChange?.();
  }

  function isPending(): boolean {
    return state.inFlight || state.queue.length > 0;
  }

  function pendingAffects(key: string): boolean {
    return state.queue.some((item) => {
      const keys = itemKeys(item);
      return keys.source === key || keys.dest === key;
    });
  }

  function displayedBase(key: string, authoritative: number): number {
    if (isPending() && state.displayed.has(key)) return state.displayed.get(key)!;
    if (state.settled.has(key)) return state.settled.get(key)!;
    return state.lastObserved.get(key) ?? authoritative;
  }

  function failClosed(message: string, notifyChange = true): void {
    state.epoch += 1;
    state.queue = [];
    state.inFlight = false;
    state.displayed = new Map();
    state.chainValues = new Map();
    state.lastConfirmed = new Map();
    state.settled = new Map();
    state.lastSettledRevision = null;
    state.error = message;
    if (notifyChange) notify();
  }

  async function pump(): Promise<void> {
    if (state.inFlight) return;
    while (state.queue.length > 0) {
      const item = state.queue[0]!;
      const epoch = state.epoch;
      const intent: HierophantHestarConversionIntent = {
        commandId: item.commandId,
        ordinaryTempleId: item.ordinaryTempleId,
        sourceResource: item.sourceResource,
        expectedRevision: state.lastSettledRevision ?? args.currentRevision(),
        expectedOrdinarySourceCount: item.expectedOrdinarySourceCount,
        expectedHestarDestinationCount: item.expectedHestarDestinationCount,
      };
      state.inFlight = true;
      notify();
      try {
        const receipt = await args.dispatch(intent);
        if (epoch !== state.epoch) return;
        state.queue.shift();
        state.inFlight = false;
        const keys = itemKeys(item);
        state.lastConfirmed.set(keys.source, item.expectedOrdinarySourceCount - 1);
        state.lastConfirmed.set(keys.dest, item.expectedHestarDestinationCount + 1);
        state.lastSettledRevision = typeof receipt?.revision === "number"
          ? receipt.revision
          : intent.expectedRevision + 1;
        if (state.queue.length === 0) {
          state.settled.set(keys.source, item.expectedOrdinarySourceCount - 1);
          state.settled.set(keys.dest, item.expectedHestarDestinationCount + 1);
          for (const [key, value] of state.displayed) {
            if (!state.settled.has(key)) state.settled.set(key, value);
          }
          state.displayed = new Map();
        }
        notify();
      } catch (error) {
        if (epoch !== state.epoch) return;
        const keys = itemKeys(item);
        state.errorKeys = new Set([keys.source, keys.dest]);
        const message = error instanceof Error ? error.message : "Hestar conversion failed.";
        failClosed(message);
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
      const key = sourceKey(templeId, resource);
      const error = state.errorKeys.has(key) ? state.error : null;
      if (isPending() && pendingAffects(key)) {
        return {
          displayed: state.displayed.get(key) ?? authoritative,
          pending: true,
          error,
        };
      }
      if (error !== null) {
        return {
          displayed: state.lastObserved.get(key) ?? authoritative,
          pending: false,
          error,
        };
      }
      if (state.settled.has(key)) {
        return { displayed: state.settled.get(key)!, pending: false, error: null };
      }
      return { displayed: authoritative, pending: false, error: null };
    },

    enqueue(input: HierophantHestarConversionRequest): void {
      if (input.ordinaryTempleId === "hestar") return;
      const source = sourceKey(input.ordinaryTempleId, input.sourceResource);
      const dest = destKey(input.sourceResource);
      if (!isPending() && state.settled.size === 0) {
        state.lastObserved.set(source, input.ordinaryAuthoritative);
        state.lastObserved.set(dest, input.hestarAuthoritative);
      }
      const fromSource = displayedBase(source, input.ordinaryAuthoritative);
      const fromDest = displayedBase(dest, input.hestarAuthoritative);
      if (fromSource < 1) return;
      if (!isPending()) {
        state.error = null;
        state.errorKeys = new Set();
        ensureChain(state.chainValues, source).add(fromSource);
        ensureChain(state.chainValues, dest).add(fromDest);
      }
      const item: ConversionQueuedItem = {
        commandId: args.nextCommandId(),
        ordinaryTempleId: input.ordinaryTempleId,
        sourceResource: input.sourceResource,
        expectedOrdinarySourceCount: fromSource,
        expectedHestarDestinationCount: fromDest,
      };
      state.queue.push(item);
      ensureChain(state.chainValues, source).add(fromSource);
      ensureChain(state.chainValues, source).add(fromSource - 1);
      ensureChain(state.chainValues, dest).add(fromDest);
      ensureChain(state.chainValues, dest).add(fromDest + 1);
      state.displayed.set(source, fromSource - 1);
      state.displayed.set(dest, fromDest + 1);
      state.settled.delete(source);
      state.settled.delete(dest);
      state.error = null;
      notify();
      void pump();
    },

    observeAuthoritative(
      templeId: string,
      resource: HierophantResourceKind,
      authoritative: number,
    ): void {
      const key = sourceKey(templeId, resource);
      if (!isPending()) {
        if (state.settled.has(key)) {
          if (authoritative === state.settled.get(key)) {
            state.settled.delete(key);
            state.chainValues.delete(key);
            state.lastConfirmed.delete(key);
            state.lastObserved.set(key, authoritative);
            if (state.settled.size === 0) {
              state.chainValues = new Map();
              state.lastConfirmed = new Map();
              state.lastSettledRevision = null;
            }
            return;
          }
          if (state.chainValues.get(key)?.has(authoritative) === true) return;
          state.settled.delete(key);
          state.chainValues.delete(key);
          state.lastConfirmed.delete(key);
          state.lastObserved.set(key, authoritative);
          if (state.settled.size === 0) {
            state.lastSettledRevision = null;
          }
          state.error = null;
          state.errorKeys.delete(key);
          notify();
          return;
        }
        state.lastObserved.set(key, authoritative);
        return;
      }
      state.lastObserved.set(key, authoritative);
      if (!pendingAffects(key)) return;
      const chain = state.chainValues.get(key);
      if (chain !== undefined && !chain.has(authoritative) && state.lastConfirmed.get(key) !== authoritative) {
        state.errorKeys = new Set([key]);
        failClosed("Resource changed elsewhere; pending conversions cancelled.", false);
      }
    },
  };
}

export type HierophantHestarConversionController = ReturnType<typeof createHierophantHestarConversionController>;
