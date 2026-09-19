import { describe, it, expect } from "vitest";
import { createHierophantResourceIntentController } from "../src/hierophant-resource-intent";

function deferred<T = void>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe("Hierophant resource intent queue", () => {
  it("shows the increment before the mutation resolves and clears pending on success", async () => {
    const first = deferred<void>();
    const dispatched: Array<{ expected: number; value: number }> = [];
    const controller = createHierophantResourceIntentController({
      nextCommandId: () => "cmd_1",
      dispatch: async (intent) => {
        dispatched.push({ expected: intent.expected, value: intent.value });
        await first.promise;
      },
    });
    controller.enqueue("krolis", "abundance", 1, 5);
    const pending = controller.view("krolis", "abundance", 5);
    expect(pending.displayed).toBe(6);
    expect(pending.pending).toBe(true);
    expect(dispatched).toEqual([{ expected: 5, value: 6 }]);
    first.resolve();
    await Promise.resolve();
    await Promise.resolve();
    const settled = controller.view("krolis", "abundance", 5);
    expect(settled.displayed).toBe(6);
    expect(settled.pending).toBe(false);
    expect(settled.error).toBeNull();
  });

  it("serializes rapid increments as 5→6 then 6→7, never two expected=5", async () => {
    const gates = [deferred<void>(), deferred<void>()];
    let inFlight = 0;
    let maxInFlight = 0;
    const dispatched: Array<{ expected: number; value: number; commandId: string }> = [];
    let n = 0;
    const controller = createHierophantResourceIntentController({
      nextCommandId: () => `cmd_${++n}`,
      dispatch: async (intent) => {
        inFlight += 1;
        maxInFlight = Math.max(maxInFlight, inFlight);
        dispatched.push({ expected: intent.expected, value: intent.value, commandId: intent.commandId });
        await gates[dispatched.length - 1]!.promise;
        inFlight -= 1;
      },
    });
    controller.enqueue("krolis", "abundance", 1, 5);
    controller.enqueue("krolis", "abundance", 1, 5);
    expect(controller.view("krolis", "abundance", 5).displayed).toBe(7);
    expect(controller.view("krolis", "abundance", 5).pending).toBe(true);
    expect(dispatched).toHaveLength(1);
    gates[0]!.resolve();
    await Promise.resolve();
    await Promise.resolve();
    expect(dispatched).toEqual([
      { expected: 5, value: 6, commandId: "cmd_1" },
      { expected: 6, value: 7, commandId: "cmd_2" },
    ]);
    expect(maxInFlight).toBe(1);
    gates[1]!.resolve();
    await Promise.resolve();
    await Promise.resolve();
    expect(controller.view("krolis", "abundance", 7).pending).toBe(false);
    expect(controller.view("krolis", "abundance", 7).displayed).toBe(7);
  });

  it("preserves + + - intent order as 5→6, 6→7, 7→6", async () => {
    const gates = [deferred<void>(), deferred<void>(), deferred<void>()];
    const dispatched: Array<{ expected: number; value: number }> = [];
    const controller = createHierophantResourceIntentController({
      nextCommandId: () => "cmd",
      dispatch: async (intent) => {
        dispatched.push({ expected: intent.expected, value: intent.value });
        await gates[dispatched.length - 1]!.promise;
      },
    });
    controller.enqueue("krolis", "abundance", 1, 5);
    controller.enqueue("krolis", "abundance", 1, 5);
    controller.enqueue("krolis", "abundance", -1, 5);
    expect(controller.view("krolis", "abundance", 5).displayed).toBe(6);
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
      { expected: 5, value: 6 },
      { expected: 6, value: 7 },
      { expected: 7, value: 6 },
    ]);
  });

  it("restores authoritative state and cancels dependents when a stale mutation fails", async () => {
    const first = deferred<void>();
    const dispatched: Array<{ expected: number; value: number }> = [];
    const controller = createHierophantResourceIntentController({
      nextCommandId: () => "cmd",
      dispatch: async (intent) => {
        dispatched.push({ expected: intent.expected, value: intent.value });
        await first.promise;
      },
    });
    controller.enqueue("krolis", "abundance", 1, 5);
    controller.enqueue("krolis", "abundance", 1, 5);
    expect(controller.view("krolis", "abundance", 5).displayed).toBe(7);
    first.reject(new Error("stale abundance"));
    await Promise.resolve();
    await Promise.resolve();
    const failed = controller.view("krolis", "abundance", 5);
    expect(failed.displayed).toBe(5);
    expect(failed.pending).toBe(false);
    expect(failed.error).toMatch(/stale/i);
    expect(dispatched).toHaveLength(1);
  });

  it("does not rebase queued intents onto an unrelated external value", async () => {
    const first = deferred<void>();
    const dispatched: Array<{ expected: number; value: number }> = [];
    const controller = createHierophantResourceIntentController({
      nextCommandId: () => "cmd",
      dispatch: async (intent) => {
        dispatched.push({ expected: intent.expected, value: intent.value });
        await first.promise;
      },
    });
    controller.enqueue("krolis", "abundance", 1, 5);
    controller.enqueue("krolis", "abundance", 1, 5);
    expect(controller.view("krolis", "abundance", 5).displayed).toBe(7);
    controller.observeAuthoritative("krolis", "abundance", 9);
    const cancelled = controller.view("krolis", "abundance", 9);
    expect(cancelled.displayed).toBe(9);
    expect(cancelled.pending).toBe(false);
    expect(cancelled.error).not.toBeNull();
    first.resolve();
    await Promise.resolve();
    await Promise.resolve();
    expect(dispatched).toHaveLength(1);
    expect(dispatched[0]).toEqual({ expected: 5, value: 6 });
    expect(controller.view("krolis", "abundance", 9).displayed).toBe(9);
  });

  it("keeps the optimistic sequence when an intermediate confirmation matches the chain", async () => {
    const first = deferred<void>();
    const controller = createHierophantResourceIntentController({
      nextCommandId: () => "cmd",
      dispatch: async () => {
        await first.promise;
      },
    });
    controller.enqueue("krolis", "abundance", 1, 5);
    controller.enqueue("krolis", "abundance", 1, 5);
    controller.observeAuthoritative("krolis", "abundance", 6);
    expect(controller.view("krolis", "abundance", 6).displayed).toBe(7);
    expect(controller.view("krolis", "abundance", 6).pending).toBe(true);
    expect(controller.view("krolis", "abundance", 6).error).toBeNull();
    first.resolve();
    await Promise.resolve();
    await Promise.resolve();
  });

  it("shows a later authoritative value normally when nothing is pending", () => {
    const controller = createHierophantResourceIntentController({
      nextCommandId: () => "cmd",
      dispatch: async () => {},
    });
    expect(controller.view("krolis", "abundance", 5).displayed).toBe(5);
    controller.observeAuthoritative("krolis", "abundance", 8);
    expect(controller.view("krolis", "abundance", 8)).toEqual({
      displayed: 8,
      pending: false,
      error: null,
    });
  });
});
