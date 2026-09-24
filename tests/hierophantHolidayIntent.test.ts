import { describe, expect, it } from "vitest";
import { createHierophantHolidayIntentController } from "../src/hierophant-holiday-intent";

function deferred<T = void>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe("Hierophant Holiday intent", () => {
  it("shows the requested marker immediately and serializes a second click", async () => {
    const gate = deferred<void>();
    const dispatched: boolean[] = [];
    const controller = createHierophantHolidayIntentController({
      dispatch: async (_templeId, marked) => {
        dispatched.push(marked);
        await gate.promise;
      },
    });
    controller.request("krolis", true, false);
    expect(controller.view("krolis", false)).toEqual({ marked: true, pending: true });
    controller.request("krolis", false, false);
    expect(dispatched).toEqual([true]);
    gate.resolve();
    await Promise.resolve();
    await Promise.resolve();
    expect(controller.view("krolis", false)).toEqual({ marked: true, pending: true });
    controller.observe("krolis", true);
    expect(controller.view("krolis", true)).toEqual({ marked: true, pending: false });
  });

  it("reverts to authoritative state on rejection", async () => {
    const gate = deferred<void>();
    const errors: string[] = [];
    const controller = createHierophantHolidayIntentController({
      dispatch: async () => {
        await gate.promise;
        throw new Error("stale holiday");
      },
      onError: (message) => {
        errors.push(message);
      },
    });
    controller.request("krolis", true, false);
    expect(controller.view("krolis", false).marked).toBe(true);
    gate.resolve();
    await Promise.resolve();
    await Promise.resolve();
    expect(controller.view("krolis", false)).toEqual({ marked: false, pending: false });
    expect(errors[0]).toMatch(/stale holiday/);
  });
});
