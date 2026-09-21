import { describe, it, expect } from "vitest";
import {
  EMPTY_HIEROPHANT_STATE,
  planHierophantVisions,
  type HierophantState,
  type HierophantSupplicant,
  type HierophantTemple,
  type HierophantTempleId,
} from "../shared/domain";
import {
  completeVisionsOrder,
  formatVisionsPreviewChoiceSummary,
  pruneHierophantVisionsChoices,
  retainValidHierophantVisionsChoices,
} from "../src/hierophant-visions-preview";

const PLACE = "plc_00000000-0000-0000-0000-000000000001" as HierophantTemple["placeId"];

function denizen(n: string): HierophantSupplicant["denizenId"] {
  return `den_${n}` as HierophantSupplicant["denizenId"];
}

function ordinary(
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

function hestar(
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

function person(args: {
  readonly id: string;
  readonly classId: HierophantSupplicant["classId"];
  readonly woe: number;
  readonly templeId: HierophantTempleId;
}): HierophantSupplicant {
  return {
    denizenId: denizen(args.id),
    classId: args.classId,
    woe: args.woe,
    host: { kind: "temple", templeId: args.templeId, area: "courtyard" },
  };
}

function state(args: {
  readonly temples?: readonly HierophantTemple[];
  readonly supplicants?: readonly HierophantSupplicant[];
}): HierophantState {
  return {
    ...EMPTY_HIEROPHANT_STATE,
    temples: args.temples ?? [ordinary("krolis"), hestar()],
    supplicants: args.supplicants ?? [],
  };
}

describe("Hierophant Visions preview choice retention", () => {
  it("drops an Artisan payment once the planner no longer requires that choice", () => {
    const ambiguous = state({
      temples: [ordinary("krolis", { abundance: 3, conviction: 3 }), hestar()],
      supplicants: [person({ id: "mira", classId: "artisan", woe: 2, templeId: "krolis" })],
    });
    const kept = pruneHierophantVisionsChoices(ambiguous, {
      artisanPayments: { [denizen("mira")]: "conviction" },
    });
    expect(kept.artisanPayments).toEqual({ [denizen("mira")]: "conviction" });
    const unambiguous = state({
      temples: [ordinary("krolis", { abundance: 5, conviction: 2 }), hestar()],
      supplicants: [person({ id: "mira", classId: "artisan", woe: 2, templeId: "krolis" })],
    });
    expect(pruneHierophantVisionsChoices(unambiguous, kept)).toEqual({});
  });

  it("drops a Hestar donor that is no longer eligible instead of reinterpreting it", () => {
    const open = state({
      temples: [
        ordinary("krolis", { abundance: 5 }),
        ordinary("notor", { abundance: 3 }),
        hestar({ abundance: 0 }),
      ],
      supplicants: [person({ id: "mina", classId: "peasant", woe: 2, templeId: "hestar" })],
    });
    const chosen = pruneHierophantVisionsChoices(open, {
      hestarDonors: { [denizen("mina")]: "krolis" },
    });
    expect(chosen.hestarDonors).toEqual({ [denizen("mina")]: "krolis" });
    const blasphemousKrolis = state({
      temples: [
        ordinary("krolis", {
          abundance: 5,
          doctrine: { kind: "blasphemy", blasphemyId: "old_land_demands_blood" },
        }),
        ordinary("notor", { abundance: 3 }),
        hestar({ abundance: 0 }),
      ],
      supplicants: [person({ id: "mina", classId: "peasant", woe: 2, templeId: "hestar" })],
    });
    const pruned = pruneHierophantVisionsChoices(blasphemousKrolis, chosen);
    expect(pruned.hestarDonors).toBeUndefined();
    expect(planHierophantVisions(blasphemousKrolis, pruned).requiredChoices).toEqual([
      expect.objectContaining({
        kind: "hestar_donor",
        eligibleDonorTempleIds: ["notor"],
      }),
    ]);
  });

  it("keeps an explicit Hestar refusal and ignores unknown order IDs", () => {
    const shortage = state({
      temples: [ordinary("krolis", { abundance: 0 }), hestar({ abundance: 5 })],
      supplicants: [person({ id: "ann", classId: "peasant", woe: 2, templeId: "krolis" })],
    });
    const kept = pruneHierophantVisionsChoices(shortage, {
      hestarFallback: { [denizen("ann")]: false },
      artisanPayments: { [denizen("ghost")]: "abundance" },
      supplicantOrder: [denizen("ghost")],
    });
    expect(kept).toEqual({ hestarFallback: { [denizen("ann")]: false } });
    expect(completeVisionsOrder([denizen("a")], [denizen("a"), denizen("b")])).toBeUndefined();
    expect(completeVisionsOrder([denizen("b"), denizen("a")], [denizen("a"), denizen("b")])).toEqual([
      denizen("b"),
      denizen("a"),
    ]);
  });

  it("summarizes supplied table choices without inventing an order", () => {
    const required = retainValidHierophantVisionsChoices(
      [
        {
          kind: "artisan_payment",
          denizenId: denizen("mira"),
          templeId: "krolis",
          options: ["abundance", "conviction"],
        },
        {
          kind: "hestar_fallback",
          denizenId: denizen("ann"),
          templeId: "krolis",
          resource: "abundance",
          amount: 1,
          options: [true, false],
        },
        {
          kind: "hestar_donor",
          denizenId: denizen("mina"),
          templeId: "hestar",
          resource: "conviction",
          amount: 1,
          eligibleDonorTempleIds: ["notor"],
        },
        {
          kind: "supplicant_order",
          participantIds: [denizen("aster"), denizen("bell")],
          reason: "resource_competition",
        },
      ],
      {
        artisanPayments: { [denizen("mira")]: "conviction" },
        hestarFallback: { [denizen("ann")]: true },
        hestarDonors: { [denizen("mina")]: "notor" },
        supplicantOrder: [denizen("aster")],
      },
    );
    expect(formatVisionsPreviewChoiceSummary(
      [
        {
          kind: "artisan_payment",
          denizenId: denizen("mira"),
          templeId: "krolis",
          options: ["abundance", "conviction"],
        },
        {
          kind: "hestar_fallback",
          denizenId: denizen("ann"),
          templeId: "krolis",
          resource: "abundance",
          amount: 1,
          options: [true, false],
        },
        {
          kind: "hestar_donor",
          denizenId: denizen("mina"),
          templeId: "hestar",
          resource: "conviction",
          amount: 1,
          eligibleDonorTempleIds: ["notor"],
        },
        {
          kind: "supplicant_order",
          participantIds: [denizen("aster"), denizen("bell")],
          reason: "resource_competition",
        },
      ],
      retainedWithIncompleteOrder(required),
      {
        denizenName: (id) => ({
          [denizen("mira")]: "Mira",
          [denizen("ann")]: "Ann",
          [denizen("mina")]: "Mina",
          [denizen("aster")]: "Aster",
          [denizen("bell")]: "Bell",
        }[id] ?? id),
        templeName: (id) => ({ krolis: "Temple Krolis", notor: "Temple Notor" }[id] ?? id),
      },
    )).toEqual([
      "Mira pays Conviction",
      "Krolis uses Hestar Abundance",
      "Hestar takes Conviction from Notor",
    ]);
  });
});

function retainedWithIncompleteOrder(
  choices: ReturnType<typeof retainValidHierophantVisionsChoices>,
) {
  return { ...choices, supplicantOrder: [denizen("aster")] };
}
