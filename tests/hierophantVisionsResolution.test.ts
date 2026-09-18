import { describe, it, expect } from "vitest";
import {
  EMPTY_HIEROPHANT_STATE,
  computeHierophantVisionsResolution,
  type HierophantState,
  type HierophantTemple,
  type HierophantSupplicant,
  type HierophantClassId,
  type HierophantTempleId,
} from "../shared/domain";

const PLACE = "plc_00000000-0000-0000-0000-000000000001" as HierophantTemple["placeId"];

function denizen(n: string): HierophantSupplicant["denizenId"] {
  return `den_${n}` as HierophantSupplicant["denizenId"];
}

function ordinaryTemple(
  templeId: Exclude<HierophantTempleId, "hestar">,
  extras: Partial<Extract<HierophantTemple, { kind: "ordinary" }>> = {},
): Extract<HierophantTemple, { kind: "ordinary" }> {
  return {
    templeId,
    kind: "ordinary",
    placeId: PLACE,
    hostSeatId: "hierophant",
    status: "active",
    abundance: 5,
    conviction: 4,
    doctrine: { kind: "doctrine", doctrineId: "worth_proved_through_labor" },
    ...extras,
  };
}

function hestarTemple(
  extras: Partial<Extract<HierophantTemple, { kind: "hestar" }>> = {},
): Extract<HierophantTemple, { kind: "hestar" }> {
  return {
    templeId: "hestar",
    kind: "hestar",
    placeId: PLACE,
    hostSeatId: "hierophant",
    status: "active",
    abundance: 4,
    conviction: 5,
    ...extras,
  };
}

function supplicant(args: {
  readonly id: string;
  readonly classId: HierophantClassId;
  readonly woe: number;
  readonly templeId: HierophantTempleId;
  readonly area?: "courtyard" | "agiary" | null;
}): HierophantSupplicant {
  return {
    denizenId: denizen(args.id),
    classId: args.classId,
    woe: args.woe,
    host: {
      kind: "temple",
      templeId: args.templeId,
      area: args.area === undefined ? "courtyard" : args.area,
    },
  };
}

function state(args: {
  readonly temples?: readonly HierophantTemple[];
  readonly supplicants?: readonly HierophantSupplicant[];
  readonly prophets?: HierophantState["prophets"];
}): HierophantState {
  return {
    ...EMPTY_HIEROPHANT_STATE,
    temples: args.temples ?? [ordinaryTemple("krolis"), hestarTemple()],
    supplicants: args.supplicants ?? [],
    prophets: args.prophets ?? [],
  };
}

function snapshot(value: unknown): string {
  return JSON.stringify(value);
}

describe("Hierophant Visions pure resolution result", () => {
  it("returns a complete resulting state for an uncomplicated ready month without mutating input", () => {
    const hierophant = state({
      supplicants: [supplicant({ id: "peasant-a", classId: "peasant", woe: 3, templeId: "krolis" })],
    });
    const before = snapshot(hierophant);
    const first = computeHierophantVisionsResolution(hierophant);
    const second = computeHierophantVisionsResolution(hierophant);
    expect(snapshot(hierophant)).toBe(before);
    expect(first.kind).toBe("ready");
    if (first.kind !== "ready") return;
    expect(first.resultingState.temples.find((temple) => temple.templeId === "krolis")).toMatchObject({
      abundance: 4,
      conviction: 4,
    });
    expect(first.resultingState.supplicants).toEqual([
      { ...hierophant.supplicants[0], woe: 2 },
    ]);
    expect(second).toEqual(first);
    expect(first.facts.woeChanges).toEqual([
      { denizenId: denizen("peasant-a"), templeId: "krolis", from: 3, to: 2 },
    ]);
    expect(first.facts.resourceDeltas).toEqual([
      { templeId: "krolis", resource: "abundance", before: 5, after: 4, delta: -1 },
    ]);
    expect(first.facts.departures).toEqual([]);
  });

  it("applies supported cost and unsupported Woe exactly once each", () => {
    const hierophant = state({
      supplicants: [
        supplicant({ id: "peasant-a", classId: "peasant", woe: 3, templeId: "krolis" }),
        supplicant({ id: "gentry-a", classId: "gentry", woe: 2, templeId: "krolis" }),
      ],
    });
    const result = computeHierophantVisionsResolution(hierophant);
    expect(result.kind).toBe("ready");
    if (result.kind !== "ready") return;
    const krolis = result.resultingState.temples.find((temple) => temple.templeId === "krolis");
    expect(krolis?.abundance).toBe(4);
    expect(krolis?.conviction).toBe(4);
    expect(result.resultingState.supplicants.map((person) => [person.denizenId, person.woe])).toEqual([
      [denizen("peasant-a"), 2],
      [denizen("gentry-a"), 3],
    ]);
    expect(result.facts.woeChanges).toHaveLength(2);
    expect(result.facts.resourceDeltas.filter((delta) => delta.templeId === "krolis")).toHaveLength(1);
  });

  it("removes a supported Woe-1 departure and applies Benefaction", () => {
    const hierophant = state({
      supplicants: [supplicant({ id: "peasant-b", classId: "peasant", woe: 1, templeId: "krolis" })],
    });
    const result = computeHierophantVisionsResolution(hierophant);
    expect(result.kind).toBe("ready");
    if (result.kind !== "ready") return;
    expect(result.resultingState.supplicants).toEqual([]);
    expect(result.resultingState.temples.find((temple) => temple.templeId === "krolis")).toMatchObject({
      abundance: 4,
      conviction: 5,
    });
    expect(result.facts.departures).toEqual([
      { denizenId: denizen("peasant-b"), templeId: "krolis", resource: "conviction", amount: 1 },
    ]);
    expect(result.facts.benefactions).toEqual(result.facts.departures);
    expect(result.facts.woeChanges[0]).toMatchObject({ from: 1, to: 0 });
  });

  it("reflects an explicit Artisan choice in the resulting stock", () => {
    const hierophant = state({
      temples: [ordinaryTemple("krolis", { abundance: 3, conviction: 3 }), hestarTemple()],
      supplicants: [supplicant({ id: "art", classId: "artisan", woe: 2, templeId: "krolis" })],
    });
    const result = computeHierophantVisionsResolution(hierophant, {
      artisanPayments: { [denizen("art")]: "conviction" },
    });
    expect(result.kind).toBe("ready");
    if (result.kind !== "ready") return;
    expect(result.resultingState.temples.find((temple) => temple.templeId === "krolis")).toMatchObject({
      abundance: 3,
      conviction: 2,
    });
    expect(result.facts.suppliedChoices.artisanPayments).toEqual({ [denizen("art")]: "conviction" });
  });

  it("reflects ordinary Hestar spend and Hestar donor spend", () => {
    const fallbackState = state({
      temples: [
        ordinaryTemple("krolis", { abundance: 0, conviction: 4 }),
        hestarTemple({ abundance: 5, conviction: 5 }),
      ],
      supplicants: [supplicant({ id: "peasant-h", classId: "peasant", woe: 2, templeId: "krolis" })],
    });
    const usedHestar = computeHierophantVisionsResolution(fallbackState, {
      hestarFallback: { [denizen("peasant-h")]: true },
    });
    expect(usedHestar.kind).toBe("ready");
    if (usedHestar.kind === "ready") {
      expect(usedHestar.resultingState.temples.find((temple) => temple.templeId === "krolis")?.abundance).toBe(0);
      expect(usedHestar.resultingState.temples.find((temple) => temple.templeId === "hestar")?.abundance).toBe(4);
    }

    const donorState = state({
      temples: [
        ordinaryTemple("krolis", { abundance: 5, conviction: 4 }),
        hestarTemple({ abundance: 0, conviction: 5 }),
      ],
      supplicants: [supplicant({ id: "hestar-p", classId: "peasant", woe: 2, templeId: "hestar" })],
    });
    const borrowed = computeHierophantVisionsResolution(donorState, {
      hestarDonors: { [denizen("hestar-p")]: "krolis" },
    });
    expect(borrowed.kind).toBe("ready");
    if (borrowed.kind !== "ready") return;
    expect(borrowed.resultingState.temples.find((temple) => temple.templeId === "hestar")?.abundance).toBe(0);
    expect(borrowed.resultingState.temples.find((temple) => temple.templeId === "krolis")?.abundance).toBe(4);
    expect(borrowed.facts.resourceDeltas).toEqual([
      { templeId: "krolis", resource: "abundance", before: 5, after: 4, delta: -1 },
    ]);
  });

  it("changes the result when an order-sensitive month is given an explicit order", () => {
    const temples = [
      ordinaryTemple("ushin", {
        abundance: 5,
        conviction: 0,
        doctrine: { kind: "doctrine", doctrineId: "masters_of_own_destiny" },
      }),
      hestarTemple({ abundance: 0, conviction: 0 }),
    ];
    const people = [
      supplicant({ id: "merchant-need", classId: "merchant", woe: 2, templeId: "ushin" }),
      supplicant({ id: "peasant-gift", classId: "peasant", woe: 1, templeId: "ushin" }),
    ];
    const hierophant = state({ temples, supplicants: people });
    const funded = computeHierophantVisionsResolution(hierophant, {
      supplicantOrder: [denizen("peasant-gift"), denizen("merchant-need")],
    });
    const unfunded = computeHierophantVisionsResolution(hierophant, {
      supplicantOrder: [denizen("merchant-need"), denizen("peasant-gift")],
    });
    expect(funded.kind).toBe("ready");
    expect(unfunded.kind).toBe("manual_resolution_required");
    if (funded.kind !== "ready") return;
    expect(funded.resultingState.supplicants.map((person) => person.denizenId)).toEqual([
      denizen("merchant-need"),
    ]);
    expect(funded.resultingState.temples.find((temple) => temple.templeId === "ushin")).toMatchObject({
      abundance: 4,
      conviction: 0,
    });
    expect("resultingState" in unfunded).toBe(false);
  });

  it("produces no resulting state for choices_required, manual blockers, or late Prophet production", () => {
    const artisan = computeHierophantVisionsResolution(state({
      temples: [ordinaryTemple("krolis", { abundance: 3, conviction: 3 }), hestarTemple()],
      supplicants: [supplicant({ id: "art", classId: "artisan", woe: 2, templeId: "krolis" })],
    }));
    expect(artisan.kind).toBe("choices_required");
    expect("resultingState" in artisan).toBe(false);

    const shortage = computeHierophantVisionsResolution(state({
      temples: [
        ordinaryTemple("krolis", { abundance: 0, conviction: 4 }),
        hestarTemple({ abundance: 0, conviction: 5 }),
      ],
      supplicants: [supplicant({ id: "peasant-short", classId: "peasant", woe: 2, templeId: "krolis" })],
    }));
    expect(shortage.kind).toBe("manual_resolution_required");
    expect("resultingState" in shortage).toBe(false);

    const prophet = computeHierophantVisionsResolution(
      state({
        supplicants: [supplicant({ id: "peasant-gift", classId: "peasant", woe: 1, templeId: "krolis" })],
        prophets: [{ denizenId: denizen("prophet-r"), host: { kind: "temple", templeId: "krolis" } }],
      }),
      {},
      { reliableProphetDenizenIds: [denizen("prophet-r")] },
    );
    expect(prophet.kind).toBe("manual_resolution_required");
    expect("resultingState" in prophet).toBe(false);
    expect(prophet.plan.blockers.some((blocker) => blocker.kind === "reliable_prophet_production")).toBe(true);
  });
});
