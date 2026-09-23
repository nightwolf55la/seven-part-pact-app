import { describe, expect, it } from "vitest";
import {
  createHierophantHestarConversionController,
  hestarDestinationResource,
  hierophantHestarConversionAriaLabel,
  hierophantHestarConversionVisibleLabel,
} from "../src/hierophant-hestar-conversion";

function deferred<T = void>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe("Hierophant Hestar conversion labels", () => {
  it("maps ordinary Abundance to Hestar Conviction and Conviction to Abundance", () => {
    expect(hestarDestinationResource("abundance")).toBe("conviction");
    expect(hestarDestinationResource("conviction")).toBe("abundance");
    expect(hierophantHestarConversionVisibleLabel("abundance")).toBe("→ Hestar Conviction");
    expect(hierophantHestarConversionVisibleLabel("conviction")).toBe("→ Hestar Abundance");
    expect(hierophantHestarConversionAriaLabel({
      templeName: "Temple Krolis",
      sourceResource: "conviction",
      available: 4,
    })).toBe("Convert 1 Conviction at Temple Krolis to 1 Abundance at Hestar");
    expect(hierophantHestarConversionAriaLabel({
      templeName: "Temple Krolis",
      sourceResource: "abundance",
      available: 0,
    })).toBe("Cannot convert: Temple Krolis Abundance is 0");
  });
});

describe("Hierophant Hestar conversion queue", () => {
  it("projects source -1 and Hestar destination +1 immediately and serializes repeated clicks", async () => {
    const gates = [deferred<{ revision: number }>(), deferred<{ revision: number }>(), deferred<{ revision: number }>()];
    const dispatched: Array<{
      expectedRevision: number;
      expectedOrdinarySourceCount: number;
      expectedHestarDestinationCount: number;
      commandId: string;
    }> = [];
    let n = 0;
    let maxInFlight = 0;
    let inFlight = 0;
    const controller = createHierophantHestarConversionController({
      nextCommandId: () => `cmd_${++n}`,
      currentRevision: () => 4,
      dispatch: async (intent) => {
        inFlight += 1;
        maxInFlight = Math.max(maxInFlight, inFlight);
        dispatched.push({
          expectedRevision: intent.expectedRevision,
          expectedOrdinarySourceCount: intent.expectedOrdinarySourceCount,
          expectedHestarDestinationCount: intent.expectedHestarDestinationCount,
          commandId: intent.commandId,
        });
        const receipt = await gates[dispatched.length - 1]!.promise;
        inFlight -= 1;
        return receipt;
      },
    });
    controller.enqueue({
      ordinaryTempleId: "krolis",
      sourceResource: "conviction",
      ordinaryAuthoritative: 4,
      hestarAuthoritative: 5,
    });
    controller.enqueue({
      ordinaryTempleId: "krolis",
      sourceResource: "conviction",
      ordinaryAuthoritative: 4,
      hestarAuthoritative: 5,
    });
    controller.enqueue({
      ordinaryTempleId: "krolis",
      sourceResource: "conviction",
      ordinaryAuthoritative: 4,
      hestarAuthoritative: 5,
    });
    expect(controller.view("krolis", "conviction", 4)).toEqual({ displayed: 1, pending: true, error: null });
    expect(controller.view("hestar", "abundance", 5)).toEqual({ displayed: 8, pending: true, error: null });
    expect(controller.view("krolis", "abundance", 5)).toEqual({ displayed: 5, pending: false, error: null });
    expect(dispatched).toHaveLength(1);
    expect(dispatched[0]).toMatchObject({
      commandId: "cmd_1",
      expectedRevision: 4,
      expectedOrdinarySourceCount: 4,
      expectedHestarDestinationCount: 5,
    });
    gates[0]!.resolve({ revision: 5 });
    await Promise.resolve();
    await Promise.resolve();
    expect(dispatched).toHaveLength(2);
    expect(dispatched[1]).toMatchObject({
      commandId: "cmd_2",
      expectedRevision: 5,
      expectedOrdinarySourceCount: 3,
      expectedHestarDestinationCount: 6,
    });
    gates[1]!.resolve({ revision: 6 });
    await Promise.resolve();
    await Promise.resolve();
    expect(dispatched[2]).toMatchObject({
      commandId: "cmd_3",
      expectedRevision: 6,
      expectedOrdinarySourceCount: 2,
      expectedHestarDestinationCount: 7,
    });
    gates[2]!.resolve({ revision: 7 });
    await Promise.resolve();
    await Promise.resolve();
    expect(maxInFlight).toBe(1);
    expect(controller.view("krolis", "conviction", 1).pending).toBe(false);
    expect(controller.view("krolis", "conviction", 1).displayed).toBe(1);
    expect(controller.view("hestar", "abundance", 8).displayed).toBe(8);
  });

  it("does not queue past a zero source and does not dispatch from Hestar", () => {
    const dispatched: string[] = [];
    const controller = createHierophantHestarConversionController({
      nextCommandId: () => "cmd_1",
      currentRevision: () => 4,
      dispatch: async (intent) => {
        dispatched.push(intent.ordinaryTempleId);
      },
    });
    controller.enqueue({
      ordinaryTempleId: "krolis",
      sourceResource: "abundance",
      ordinaryAuthoritative: 0,
      hestarAuthoritative: 4,
    });
    controller.enqueue({
      ordinaryTempleId: "hestar",
      sourceResource: "abundance",
      ordinaryAuthoritative: 4,
      hestarAuthoritative: 4,
    });
    expect(dispatched).toEqual([]);
    expect(controller.view("krolis", "abundance", 0).pending).toBe(false);
  });

  it("rolls back both counters and surfaces the error on rejection", async () => {
    const gate = deferred<void>();
    const controller = createHierophantHestarConversionController({
      nextCommandId: () => "cmd_1",
      currentRevision: () => 4,
      dispatch: async () => {
        await gate.promise;
        throw new Error("stale Hestar conversion");
      },
    });
    controller.enqueue({
      ordinaryTempleId: "krolis",
      sourceResource: "abundance",
      ordinaryAuthoritative: 5,
      hestarAuthoritative: 4,
    });
    expect(controller.view("krolis", "abundance", 5).displayed).toBe(4);
    expect(controller.view("hestar", "conviction", 4).displayed).toBe(5);
    gate.resolve();
    await Promise.resolve();
    await Promise.resolve();
    expect(controller.view("krolis", "abundance", 5).displayed).toBe(5);
    expect(controller.view("hestar", "conviction", 4).displayed).toBe(4);
    expect(controller.view("krolis", "abundance", 5).pending).toBe(false);
    expect(controller.view("krolis", "abundance", 5).error).toMatch(/stale/i);
    expect(controller.view("hestar", "conviction", 4).error).toMatch(/stale/i);
  });
});
