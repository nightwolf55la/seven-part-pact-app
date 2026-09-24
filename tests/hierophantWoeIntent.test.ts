import { describe, it, expect } from "vitest";
import { createHierophantWoeIntentController } from "../src/hierophant-woe-intent";

function deferred<T = void>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe("Hierophant Woe intent queue", () => {
  it("shows repeated + targets immediately and serializes expected transitions", async () => {
    const gates = [deferred<void>(), deferred<void>(), deferred<void>()];
    let inFlight = 0;
    let maxInFlight = 0;
    const dispatched: Array<{ expected: number; value: number }> = [];
    const controller = createHierophantWoeIntentController({
      nextCommandId: () => "cmd",
      dispatch: async (intent) => {
        inFlight += 1;
        maxInFlight = Math.max(maxInFlight, inFlight);
        dispatched.push({ expected: intent.expected, value: intent.value });
        await gates[dispatched.length - 1]!.promise;
        inFlight -= 1;
      },
    });
    controller.enqueueDelta("den_ann", 1, 2);
    controller.enqueueDelta("den_ann", 1, 2);
    controller.enqueueDelta("den_ann", 1, 2);
    expect(controller.view("den_ann", 2).displayed).toBe(5);
    expect(controller.view("den_ann", 2).pending).toBe(true);
    expect(dispatched).toHaveLength(1);
    gates[0]!.resolve();
    await Promise.resolve();
    await Promise.resolve();
    gates[1]!.resolve();
    await Promise.resolve();
    await Promise.resolve();
    gates[2]!.resolve();
    await Promise.resolve();
    await Promise.resolve();
    expect(dispatched).toEqual([
      { expected: 2, value: 3 },
      { expected: 3, value: 4 },
      { expected: 4, value: 5 },
    ]);
    expect(maxInFlight).toBe(1);
    expect(controller.view("den_ann", 5).pending).toBe(false);
    expect(controller.view("den_ann", 5).displayed).toBe(5);
  });

  it("lets exact pip selection update the requested target while a write is in flight", async () => {
    const gates = [deferred<void>(), deferred<void>()];
    const dispatched: Array<{ expected: number; value: number }> = [];
    const controller = createHierophantWoeIntentController({
      nextCommandId: () => "cmd",
      dispatch: async (intent) => {
        dispatched.push({ expected: intent.expected, value: intent.value });
        await gates[dispatched.length - 1]!.promise;
      },
    });
    controller.enqueueDelta("den_ann", 1, 2);
    controller.enqueueSet("den_ann", 5, 2);
    expect(controller.view("den_ann", 2).displayed).toBe(5);
    expect(dispatched).toEqual([{ expected: 2, value: 3 }]);
    gates[0]!.resolve();
    await Promise.resolve();
    await Promise.resolve();
    expect(dispatched).toEqual([
      { expected: 2, value: 3 },
      { expected: 3, value: 5 },
    ]);
    gates[1]!.resolve();
    await Promise.resolve();
    await Promise.resolve();
    expect(controller.view("den_ann", 5).displayed).toBe(5);
    expect(controller.view("den_ann", 5).pending).toBe(false);
  });

  it("does not enqueue negative Woe", () => {
    const dispatched: Array<{ expected: number; value: number }> = [];
    const controller = createHierophantWoeIntentController({
      nextCommandId: () => "cmd",
      dispatch: async (intent) => {
        dispatched.push({ expected: intent.expected, value: intent.value });
      },
    });
    controller.enqueueDelta("den_ann", -1, 0);
    controller.enqueueSet("den_ann", -2, 0);
    expect(dispatched).toEqual([]);
    expect(controller.view("den_ann", 0).displayed).toBe(0);
    expect(controller.view("den_ann", 0).pending).toBe(false);
  });

  it("isolates one Supplicant's pending Woe from another", async () => {
    const first = deferred<void>();
    const dispatched: string[] = [];
    const controller = createHierophantWoeIntentController({
      nextCommandId: () => "cmd",
      dispatch: async (intent) => {
        dispatched.push(intent.denizenId);
        if (intent.denizenId === "den_ann") await first.promise;
      },
    });
    controller.enqueueDelta("den_ann", 1, 1);
    controller.enqueueDelta("den_blank", 1, 5);
    expect(controller.view("den_ann", 1).displayed).toBe(2);
    expect(controller.view("den_blank", 5).displayed).toBe(6);
    expect(dispatched).toEqual(["den_ann", "den_blank"]);
    first.resolve();
    await Promise.resolve();
    await Promise.resolve();
  });

  it("restores authoritative Woe when a mutation is rejected", async () => {
    const first = deferred<void>();
    const controller = createHierophantWoeIntentController({
      nextCommandId: () => "cmd",
      dispatch: async () => {
        await first.promise;
      },
    });
    controller.enqueueDelta("den_ann", 1, 1);
    controller.enqueueDelta("den_ann", 1, 1);
    expect(controller.view("den_ann", 1).displayed).toBe(3);
    first.reject(new Error("stale woe"));
    await Promise.resolve();
    await Promise.resolve();
    const failed = controller.view("den_ann", 1);
    expect(failed.displayed).toBe(1);
    expect(failed.pending).toBe(false);
    expect(failed.error).toMatch(/stale/i);
  });

  it("fails closed when authoritative Woe diverges from the expected chain", async () => {
    const first = deferred<void>();
    const controller = createHierophantWoeIntentController({
      nextCommandId: () => "cmd",
      dispatch: async () => {
        await first.promise;
      },
    });
    controller.enqueueSet("den_ann", 4, 1);
    expect(controller.view("den_ann", 1).displayed).toBe(4);
    controller.observeAuthoritative("den_ann", 5);
    const cancelled = controller.view("den_ann", 5);
    expect(cancelled.displayed).toBe(5);
    expect(cancelled.pending).toBe(false);
    expect(cancelled.error).not.toBeNull();
    first.resolve();
    await Promise.resolve();
    await Promise.resolve();
    expect(controller.view("den_ann", 5).displayed).toBe(5);
  });

  it("keeps the optimistic sequence when an intermediate confirmation matches the chain", async () => {
    const first = deferred<void>();
    const controller = createHierophantWoeIntentController({
      nextCommandId: () => "cmd",
      dispatch: async () => {
        await first.promise;
      },
    });
    controller.enqueueDelta("den_ann", 1, 2);
    controller.enqueueDelta("den_ann", 1, 2);
    controller.observeAuthoritative("den_ann", 3);
    expect(controller.view("den_ann", 3).displayed).toBe(4);
    expect(controller.view("den_ann", 3).pending).toBe(true);
    expect(controller.view("den_ann", 3).error).toBeNull();
    first.resolve();
    await Promise.resolve();
    await Promise.resolve();
  });
});
