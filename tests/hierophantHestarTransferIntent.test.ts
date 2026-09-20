import { describe, expect, it } from "vitest";
import { createHierophantHestarTransferController } from "../src/hierophant-hestar-transfer";

function deferred<T = void>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe("Hierophant Hestar transfer pending projection", () => {
  it("projects source -1 and destination +1 immediately and allows only one in-flight mutation", async () => {
    const gate = deferred<void>();
    const dispatched: Array<{ sourceTempleId: string; destinationTempleId: string; resource: string }> = [];
    const controller = createHierophantHestarTransferController({
      nextCommandId: () => "cmd_1",
      dispatch: async (intent) => {
        dispatched.push({
          sourceTempleId: intent.sourceTempleId,
          destinationTempleId: intent.destinationTempleId,
          resource: intent.resource,
        });
        await gate.promise;
      },
    });
    controller.request({
      resource: "abundance",
      sourceTempleId: "krolis",
      destinationTempleId: "hestar",
      sourceAuthoritative: 5,
      destinationAuthoritative: 4,
    });
    controller.request({
      resource: "abundance",
      sourceTempleId: "krolis",
      destinationTempleId: "hestar",
      sourceAuthoritative: 5,
      destinationAuthoritative: 4,
    });
    const source = controller.view("krolis", "abundance", 5);
    const dest = controller.view("hestar", "abundance", 4);
    expect(source.displayed).toBe(4);
    expect(dest.displayed).toBe(5);
    expect(source.pending).toBe(true);
    expect(dest.pending).toBe(true);
    expect(controller.busy).toBe(true);
    expect(dispatched).toEqual([
      { sourceTempleId: "krolis", destinationTempleId: "hestar", resource: "abundance" },
    ]);
    gate.resolve();
    await Promise.resolve();
    await Promise.resolve();
    expect(controller.busy).toBe(false);
    expect(controller.view("krolis", "abundance", 4).pending).toBe(false);
    expect(controller.view("hestar", "abundance", 5).displayed).toBe(5);
  });

  it("rolls back both counters and surfaces the error on rejection", async () => {
    const gate = deferred<void>();
    const controller = createHierophantHestarTransferController({
      nextCommandId: () => "cmd_1",
      dispatch: async () => {
        await gate.promise;
        throw new Error("stale Hestar transfer");
      },
    });
    controller.request({
      resource: "conviction",
      sourceTempleId: "hestar",
      destinationTempleId: "notor",
      sourceAuthoritative: 6,
      destinationAuthoritative: 2,
    });
    expect(controller.view("hestar", "conviction", 6).displayed).toBe(5);
    expect(controller.view("notor", "conviction", 2).displayed).toBe(3);
    gate.resolve();
    await Promise.resolve();
    await Promise.resolve();
    expect(controller.busy).toBe(false);
    expect(controller.view("hestar", "conviction", 6).displayed).toBe(6);
    expect(controller.view("notor", "conviction", 2).displayed).toBe(2);
    expect(controller.view("hestar", "conviction", 6).pending).toBe(false);
    expect(controller.view("hestar", "conviction", 6).error).toMatch(/stale/i);
    expect(controller.view("notor", "conviction", 2).error).toMatch(/stale/i);
  });
});
