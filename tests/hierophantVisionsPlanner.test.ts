import { describe, it, expect } from "vitest";
import {
  EMPTY_HIEROPHANT_STATE,
  hierophantDoctrinePairSupportedClassIds,
  planHierophantVisions,
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
  readonly campaignDoctrines?: HierophantState["campaignDoctrines"];
}): HierophantState {
  return {
    ...EMPTY_HIEROPHANT_STATE,
    temples: args.temples ?? [
      ordinaryTemple("krolis"),
      ordinaryTemple("notor", {
        abundance: 3,
        conviction: 6,
        doctrine: { kind: "doctrine", doctrineId: "charity_measure_of_moral_worth" },
      }),
      hestarTemple(),
      ordinaryTemple("ushin", {
        doctrine: { kind: "doctrine", doctrineId: "wealthy_deserve_pleasures" },
      }),
      ordinaryTemple("zephon", {
        abundance: 4,
        conviction: 5,
        doctrine: { kind: "doctrine", doctrineId: "people_used_to_be_kinder" },
      }),
    ],
    supplicants: args.supplicants ?? [],
    prophets: args.prophets ?? [],
    campaignDoctrines: args.campaignDoctrines ?? [],
  };
}

function previewFor(plan: ReturnType<typeof planHierophantVisions>, id: string) {
  const found = plan.supplicants.find((entry) => entry.denizenId === denizen(id));
  if (found === undefined) throw new Error(`Missing supplicant preview ${id}`);
  return found;
}

function templePreview(plan: ReturnType<typeof planHierophantVisions>, templeId: string) {
  const found = plan.temples.find((entry) => entry.templeId === templeId);
  if (found === undefined) throw new Error(`Missing temple preview ${templeId}`);
  return found;
}

describe("Hierophant Visions planner — supported fixed-cost payment", () => {
  it("consumes the correct resource and loses Woe for a supported Peasant", () => {
    const plan = planHierophantVisions(
      state({
        supplicants: [supplicant({ id: "peasant-a", classId: "peasant", woe: 3, templeId: "krolis" })],
      }),
    );
    expect(plan.kind).toBe("ready");
    expect(plan.requiredChoices).toEqual([]);
    expect(plan.blockers).toEqual([]);
    const person = previewFor(plan, "peasant-a");
    expect(person.support).toBe("supported");
    expect(person.demand).toEqual({ kind: "fixed", resource: "abundance", amount: 1 });
    expect(person.woeProjection).toEqual({ kind: "determined", from: 3, to: 2 });
    expect(person.departure.kind).toBe("none");
    const krolis = templePreview(plan, "krolis");
    expect(krolis.abundance).toEqual({ before: 5, delta: -1, after: 4 });
    expect(krolis.conviction).toEqual({ before: 4, delta: 0, after: 4 });
  });
});

describe("Hierophant Visions planner — unsupported Woe", () => {
  it("gains Woe for an unsupported Supplicant and spends no resource", () => {
    const plan = planHierophantVisions(
      state({
        supplicants: [supplicant({ id: "gentry-a", classId: "gentry", woe: 2, templeId: "krolis" })],
      }),
    );
    expect(plan.kind).toBe("ready");
    const person = previewFor(plan, "gentry-a");
    expect(person.support).toBe("unsupported");
    expect(person.demand).toEqual({ kind: "none" });
    expect(person.woeProjection).toEqual({ kind: "determined", from: 2, to: 3 });
    expect(templePreview(plan, "krolis").abundance).toEqual({ before: 5, delta: 0, after: 5 });
    expect(templePreview(plan, "krolis").conviction).toEqual({ before: 4, delta: 0, after: 4 });
  });
});

describe("Hierophant Visions planner — Benefaction departure", () => {
  it("removes a supported Woe-1 Peasant and grants +1 Conviction", () => {
    const plan = planHierophantVisions(
      state({
        supplicants: [supplicant({ id: "peasant-b", classId: "peasant", woe: 1, templeId: "krolis" })],
      }),
    );
    expect(plan.kind).toBe("ready");
    const person = previewFor(plan, "peasant-b");
    expect(person.woeProjection).toEqual({ kind: "determined", from: 1, to: 0 });
    expect(person.departure).toEqual({
      kind: "benefaction",
      resource: "conviction",
      amount: 1,
    });
    const krolis = templePreview(plan, "krolis");
    expect(krolis.abundance).toEqual({ before: 5, delta: -1, after: 4 });
    expect(krolis.conviction).toEqual({ before: 4, delta: 1, after: 5 });
  });
});

describe("Hierophant Visions planner — order-independent easy month", () => {
  it("does not require an arbitrary order for a safe multi-Supplicant month", () => {
    const people = [
      supplicant({ id: "p1", classId: "peasant", woe: 2, templeId: "krolis" }),
      supplicant({ id: "p2", classId: "peasant", woe: 3, templeId: "krolis" }),
      supplicant({ id: "g1", classId: "gentry", woe: 1, templeId: "krolis" }),
    ];
    const forward = planHierophantVisions(state({ supplicants: people }));
    const reversed = planHierophantVisions(state({ supplicants: [...people].reverse() }));
    expect(forward.kind).toBe("ready");
    expect(reversed.kind).toBe("ready");
    expect(forward.requiredChoices.some((choice) => choice.kind === "supplicant_order")).toBe(false);
    expect(previewFor(forward, "p1").woeProjection).toEqual({ kind: "determined", from: 2, to: 1 });
    expect(previewFor(forward, "p2").woeProjection).toEqual({ kind: "determined", from: 3, to: 2 });
    expect(previewFor(forward, "g1").woeProjection).toEqual({ kind: "determined", from: 1, to: 2 });
    expect(templePreview(forward, "krolis").abundance.after).toBe(3);
    expect(templePreview(reversed, "krolis").abundance.after).toBe(3);
    expect(templePreview(forward, "krolis").abundance.after).toBe(
      templePreview(reversed, "krolis").abundance.after,
    );
  });
});

describe("Hierophant Visions planner — Artisan payment", () => {
  it("pays Abundance automatically when Abundance is strictly more plentiful", () => {
    const plan = planHierophantVisions(
      state({
        temples: [ordinaryTemple("krolis", { abundance: 5, conviction: 2 }), hestarTemple()],
        supplicants: [supplicant({ id: "art", classId: "artisan", woe: 2, templeId: "krolis" })],
      }),
    );
    expect(plan.kind).toBe("ready");
    expect(plan.requiredChoices).toEqual([]);
    expect(previewFor(plan, "art").demand).toEqual({ kind: "fixed", resource: "abundance", amount: 1 });
    expect(templePreview(plan, "krolis").abundance).toEqual({ before: 5, delta: -1, after: 4 });
    expect(templePreview(plan, "krolis").conviction).toEqual({ before: 2, delta: 0, after: 2 });
  });

  it("pays Conviction automatically when Conviction is strictly more plentiful", () => {
    const plan = planHierophantVisions(
      state({
        temples: [ordinaryTemple("krolis", { abundance: 1, conviction: 4 }), hestarTemple()],
        supplicants: [supplicant({ id: "art", classId: "artisan", woe: 2, templeId: "krolis" })],
      }),
    );
    expect(plan.kind).toBe("ready");
    expect(previewFor(plan, "art").demand).toEqual({ kind: "fixed", resource: "conviction", amount: 1 });
    expect(templePreview(plan, "krolis").abundance.after).toBe(1);
    expect(templePreview(plan, "krolis").conviction.after).toBe(3);
  });

  it("returns choices_required when Artisan payment is genuinely ambiguous", () => {
    const plan = planHierophantVisions(
      state({
        temples: [ordinaryTemple("krolis", { abundance: 3, conviction: 3 }), hestarTemple()],
        supplicants: [supplicant({ id: "art", classId: "artisan", woe: 2, templeId: "krolis" })],
      }),
    );
    expect(plan.kind).toBe("choices_required");
    expect(plan.requiredChoices).toEqual([
      {
        kind: "artisan_payment",
        denizenId: denizen("art"),
        templeId: "krolis",
        options: ["abundance", "conviction"],
      },
    ]);
    expect(previewFor(plan, "art").demand).toEqual({ kind: "artisan" });
    expect(previewFor(plan, "art").choiceRequired).toBe(true);
    expect(templePreview(plan, "krolis").abundance.after).toBeNull();
    expect(templePreview(plan, "krolis").conviction.after).toBeNull();
  });

  it("honors an explicit Artisan resource choice", () => {
    const hierophant = state({
      temples: [ordinaryTemple("krolis", { abundance: 3, conviction: 3 }), hestarTemple()],
      supplicants: [supplicant({ id: "art", classId: "artisan", woe: 2, templeId: "krolis" })],
    });
    const plan = planHierophantVisions(hierophant, {
      artisanPayments: { [denizen("art")]: "conviction" },
    });
    expect(plan.kind).toBe("ready");
    expect(previewFor(plan, "art").demand).toEqual({ kind: "fixed", resource: "conviction", amount: 1 });
    expect(templePreview(plan, "krolis").conviction).toEqual({ before: 3, delta: -1, after: 2 });
    expect(templePreview(plan, "krolis").abundance).toEqual({ before: 3, delta: 0, after: 3 });
  });
});

describe("Hierophant Visions planner — Hestar fallback", () => {
  it("represents optional Hestar backstop as an explicit choice when needed", () => {
    const plan = planHierophantVisions(
      state({
        temples: [
          ordinaryTemple("krolis", { abundance: 0, conviction: 4 }),
          hestarTemple({ abundance: 5, conviction: 5 }),
        ],
        supplicants: [supplicant({ id: "peasant-h", classId: "peasant", woe: 2, templeId: "krolis" })],
      }),
    );
    expect(plan.kind).toBe("choices_required");
    expect(plan.requiredChoices).toEqual([
      {
        kind: "hestar_fallback",
        denizenId: denizen("peasant-h"),
        templeId: "krolis",
        resource: "abundance",
        amount: 1,
        options: [true, false],
      },
    ]);
    expect(templePreview(plan, "krolis").hestarFallback).toBe("choice_required");
  });

  it("spends Hestar when the fallback choice is yes", () => {
    const plan = planHierophantVisions(
      state({
        temples: [
          ordinaryTemple("krolis", { abundance: 0, conviction: 4 }),
          hestarTemple({ abundance: 5, conviction: 5 }),
        ],
        supplicants: [supplicant({ id: "peasant-h", classId: "peasant", woe: 2, templeId: "krolis" })],
      }),
      { hestarFallback: { [denizen("peasant-h")]: true } },
    );
    expect(plan.kind).toBe("ready");
    expect(templePreview(plan, "krolis").abundance).toEqual({ before: 0, delta: 0, after: 0 });
    expect(templePreview(plan, "hestar").abundance).toEqual({ before: 5, delta: -1, after: 4 });
    expect(previewFor(plan, "peasant-h").woeProjection).toEqual({ kind: "determined", from: 2, to: 1 });
  });

  it("does not invent a Hestar choice when Hestar also lacks the resource", () => {
    const plan = planHierophantVisions(
      state({
        temples: [
          ordinaryTemple("krolis", { abundance: 0, conviction: 4 }),
          hestarTemple({ abundance: 0, conviction: 5 }),
        ],
        supplicants: [supplicant({ id: "peasant-h", classId: "peasant", woe: 2, templeId: "krolis" })],
      }),
    );
    expect(plan.kind).toBe("manual_resolution_required");
    expect(plan.requiredChoices.some((choice) => choice.kind === "hestar_fallback")).toBe(false);
    expect(plan.blockers.some((blocker) => blocker.kind === "resource_shortage_collapse")).toBe(true);
  });
});

describe("Hierophant Visions planner — Cult threshold", () => {
  it("blocks automatic resolution for an unsupported 4 → 5 Woe Cult consequence", () => {
    const plan = planHierophantVisions(
      state({
        supplicants: [supplicant({ id: "gentry-cult", classId: "gentry", woe: 4, templeId: "krolis" })],
      }),
    );
    expect(plan.kind).toBe("manual_resolution_required");
    expect(plan.blockers).toEqual([
      {
        kind: "cult_threshold",
        denizenId: denizen("gentry-cult"),
        templeId: "krolis",
        woeBefore: 4,
        woeAfter: 5,
      },
    ]);
    const person = previewFor(plan, "gentry-cult");
    expect(person.woeProjection).toEqual({ kind: "determined", from: 4, to: 5 });
    expect(person.departure).toEqual({ kind: "cult_threshold" });
    expect(person.blockerKind).toBe("cult_threshold");
  });
});

describe("Hierophant Visions planner — Collapse / Blasphemy shortage", () => {
  it("represents an Abundance shortage as Collapse territory rather than clamping spend", () => {
    const plan = planHierophantVisions(
      state({
        temples: [
          ordinaryTemple("krolis", { abundance: 0, conviction: 4 }),
          hestarTemple({ abundance: 0, conviction: 5 }),
        ],
        supplicants: [supplicant({ id: "peasant-short", classId: "peasant", woe: 2, templeId: "krolis" })],
      }),
    );
    expect(plan.kind).toBe("manual_resolution_required");
    const blocker = plan.blockers.find((entry) => entry.kind === "resource_shortage_collapse");
    expect(blocker).toMatchObject({
      kind: "resource_shortage_collapse",
      templeId: "krolis",
      resource: "abundance",
      amount: 1,
    });
    expect(templePreview(plan, "krolis").abundance.after).toBeNull();
    expect(templePreview(plan, "krolis").shortage).toEqual({
      resource: "abundance",
      consequence: "collapse",
    });
  });

  it("represents a Conviction shortage as Blasphemy territory rather than partial resolution", () => {
    const plan = planHierophantVisions(
      state({
        temples: [
          ordinaryTemple("ushin", {
            abundance: 5,
            conviction: 0,
            doctrine: { kind: "doctrine", doctrineId: "wealthy_deserve_pleasures" },
          }),
          hestarTemple({ abundance: 4, conviction: 0 }),
        ],
        supplicants: [supplicant({ id: "merchant-short", classId: "merchant", woe: 2, templeId: "ushin" })],
      }),
    );
    expect(plan.kind).toBe("manual_resolution_required");
    expect(plan.blockers.some((blocker) => blocker.kind === "resource_shortage_blasphemy")).toBe(true);
    expect(templePreview(plan, "ushin").shortage).toEqual({
      resource: "conviction",
      consequence: "blasphemy",
    });
    expect(templePreview(plan, "ushin").conviction.after).toBeNull();
  });
});

describe("Hierophant Visions planner — order sensitivity", () => {
  it("does not silently use array order when Benefaction timing can change a later payment", () => {
    const people = [
      supplicant({ id: "merchant-need", classId: "merchant", woe: 2, templeId: "ushin" }),
      supplicant({ id: "peasant-gift", classId: "peasant", woe: 1, templeId: "ushin" }),
    ];
    const temples = [
      ordinaryTemple("ushin", {
        abundance: 5,
        conviction: 0,
        doctrine: { kind: "doctrine", doctrineId: "masters_of_own_destiny" },
      }),
      hestarTemple({ abundance: 0, conviction: 0 }),
    ];
    const asListed = planHierophantVisions(state({ temples, supplicants: people }));
    const reversed = planHierophantVisions(state({ temples, supplicants: [...people].reverse() }));
    expect(asListed.kind).toBe("choices_required");
    expect(reversed.kind).toBe("choices_required");
    expect(asListed.requiredChoices.some((choice) => choice.kind === "supplicant_order")).toBe(true);
    expect(reversed.requiredChoices.some((choice) => choice.kind === "supplicant_order")).toBe(true);
    const listedOrder = asListed.requiredChoices.find((choice) => choice.kind === "supplicant_order");
    const reversedOrder = reversed.requiredChoices.find((choice) => choice.kind === "supplicant_order");
    expect(listedOrder).toEqual(reversedOrder);
    expect(listedOrder).toMatchObject({
      kind: "supplicant_order",
      participantIds: expect.arrayContaining([denizen("merchant-need"), denizen("peasant-gift")]),
    });
    expect(templePreview(asListed, "ushin").orderChoiceRequired).toBe(true);
  });

  it("honors an explicit order exactly when one is required", () => {
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
    const funded = planHierophantVisions(
      state({ temples, supplicants: people }),
      { supplicantOrder: [denizen("peasant-gift"), denizen("merchant-need")] },
    );
    expect(funded.kind).toBe("ready");
    expect(previewFor(funded, "peasant-gift").departure).toEqual({
      kind: "benefaction",
      resource: "conviction",
      amount: 1,
    });
    expect(previewFor(funded, "merchant-need").woeProjection).toEqual({ kind: "determined", from: 2, to: 1 });
    expect(templePreview(funded, "ushin").abundance.after).toBe(4);
    expect(templePreview(funded, "ushin").conviction.after).toBe(0);

    const unfunded = planHierophantVisions(
      state({ temples, supplicants: people }),
      { supplicantOrder: [denizen("merchant-need"), denizen("peasant-gift")] },
    );
    expect(unfunded.kind).toBe("manual_resolution_required");
    expect(unfunded.blockers.some((blocker) => blocker.kind === "resource_shortage_blasphemy")).toBe(true);
    expect(previewFor(unfunded, "merchant-need").blockerKind).toBe("resource_shortage_blasphemy");
  });
});

describe("Hierophant Visions planner — purity", () => {
  it("does not mutate its input", () => {
    const hierophant = state({
      supplicants: [
        supplicant({ id: "p1", classId: "peasant", woe: 2, templeId: "krolis" }),
        supplicant({ id: "g1", classId: "gentry", woe: 2, templeId: "krolis" }),
      ],
    });
    const snapshot = structuredClone(hierophant);
    Object.freeze(hierophant);
    Object.freeze(hierophant.temples);
    Object.freeze(hierophant.supplicants);
    for (const temple of hierophant.temples) Object.freeze(temple);
    for (const person of hierophant.supplicants) Object.freeze(person);
    const plan = planHierophantVisions(hierophant);
    expect(plan.kind).toBe("ready");
    expect(hierophant).toEqual(snapshot);
    expect(hierophant.temples[0]).toMatchObject({ abundance: 5, conviction: 4 });
    expect(hierophant.supplicants[0]?.woe).toBe(2);
  });
});

describe("Hierophant Visions planner — Prophet presence does not blanket-block", () => {
  it("still automatically resolves an uncomplicated month when a Prophet is present but unused", () => {
    const plan = planHierophantVisions(
      state({
        supplicants: [supplicant({ id: "peasant-p", classId: "peasant", woe: 3, templeId: "krolis" })],
        prophets: [{ denizenId: denizen("prophet-1"), host: { kind: "temple", templeId: "krolis" } }],
      }),
    );
    expect(plan.kind).toBe("ready");
    expect(plan.blockers).toEqual([]);
    expect(templePreview(plan, "krolis").abundance.after).toBe(4);
  });
});

describe("Hierophant Visions planner — local independence", () => {
  it("still projects an independent Temple when another Temple needs a Hestar choice", () => {
    const plan = planHierophantVisions(
      state({
        temples: [
          ordinaryTemple("krolis", { abundance: 5, conviction: 4 }),
          ordinaryTemple("zephon", {
            abundance: 0,
            conviction: 5,
            doctrine: { kind: "doctrine", doctrineId: "people_used_to_be_kinder" },
          }),
          hestarTemple({ abundance: 4, conviction: 5 }),
        ],
        supplicants: [
          supplicant({ id: "krolis-p", classId: "peasant", woe: 3, templeId: "krolis" }),
          supplicant({ id: "zephon-p", classId: "peasant", woe: 2, templeId: "zephon" }),
        ],
      }),
    );
    expect(plan.kind).toBe("choices_required");
    expect(templePreview(plan, "krolis").abundance).toEqual({ before: 5, delta: -1, after: 4 });
    expect(previewFor(plan, "krolis-p").woeProjection).toEqual({ kind: "determined", from: 3, to: 2 });
    expect(templePreview(plan, "zephon").hestarFallback).toBe("choice_required");
    expect(templePreview(plan, "zephon").abundance.after).toBeNull();
  });
});

describe("Hierophant Visions planner — Blasphemous Doctrine pair support", () => {
  it("resolves orthodox and paired Blasphemy to the same support definition", () => {
    expect(hierophantDoctrinePairSupportedClassIds(
      { kind: "doctrine", doctrineId: "worth_proved_through_labor" },
      [],
    )).toEqual(["artisan", "peasant"]);
    expect(hierophantDoctrinePairSupportedClassIds(
      { kind: "blasphemy", blasphemyId: "old_land_demands_blood" },
      [],
    )).toEqual(["artisan", "peasant"]);
  });
  it("keeps the pair's supported Classes for a built-in Blasphemy", () => {
    const plan = planHierophantVisions(
      state({
        temples: [
          ordinaryTemple("krolis", {
            abundance: 5,
            conviction: 4,
            doctrine: { kind: "blasphemy", blasphemyId: "old_land_demands_blood" },
          }),
          hestarTemple(),
        ],
        supplicants: [supplicant({ id: "peasant-blasphemy", classId: "peasant", woe: 3, templeId: "krolis" })],
      }),
    );
    expect(plan.kind).toBe("ready");
    const person = previewFor(plan, "peasant-blasphemy");
    expect(person.support).toBe("supported");
    expect(person.demand).toEqual({ kind: "fixed", resource: "abundance", amount: 1 });
    expect(person.woeProjection).toEqual({ kind: "determined", from: 3, to: 2 });
    expect(templePreview(plan, "krolis").abundance).toEqual({ before: 5, delta: -1, after: 4 });
  });

  it("treats a Class outside that pair as Unsupported", () => {
    const plan = planHierophantVisions(
      state({
        temples: [
          ordinaryTemple("krolis", {
            doctrine: { kind: "blasphemy", blasphemyId: "old_land_demands_blood" },
          }),
          hestarTemple(),
        ],
        supplicants: [supplicant({ id: "gentry-blasphemy", classId: "gentry", woe: 2, templeId: "krolis" })],
      }),
    );
    expect(plan.kind).toBe("ready");
    const person = previewFor(plan, "gentry-blasphemy");
    expect(person.support).toBe("unsupported");
    expect(person.demand).toEqual({ kind: "none" });
    expect(person.woeProjection).toEqual({ kind: "determined", from: 2, to: 3 });
    expect(templePreview(plan, "krolis").abundance).toEqual({ before: 5, delta: 0, after: 5 });
  });

  it("uses a campaign Doctrine's supportedClassIds while that Doctrine is Blasphemous", () => {
    const doctrineId = "hdc_00000000-0000-0000-0000-0000000000aa" as HierophantState["campaignDoctrines"][number]["doctrineId"];
    const blasphemyId = "hbl_00000000-0000-0000-0000-0000000000aa" as NonNullable<
      HierophantState["campaignDoctrines"][number]["blasphemy"]
    >["blasphemyId"];
    const plan = planHierophantVisions(
      state({
        campaignDoctrines: [
          {
            doctrineId,
            orthodoxText: "Campaign labor is sacred.",
            blasphemy: { blasphemyId, text: "Idle blood for the campaign land." },
            supportedClassIds: ["artisan", "peasant"],
          },
        ],
        temples: [
          ordinaryTemple("krolis", {
            abundance: 5,
            conviction: 4,
            doctrine: { kind: "blasphemy", blasphemyId },
          }),
          hestarTemple(),
        ],
        supplicants: [
          supplicant({ id: "campaign-artisan", classId: "artisan", woe: 2, templeId: "krolis" }),
          supplicant({ id: "campaign-gentry", classId: "gentry", woe: 2, templeId: "krolis" }),
        ],
      }),
    );
    expect(plan.kind).toBe("ready");
    expect(previewFor(plan, "campaign-artisan").support).toBe("supported");
    expect(previewFor(plan, "campaign-artisan").demand).toEqual({ kind: "fixed", resource: "abundance", amount: 1 });
    expect(previewFor(plan, "campaign-gentry").support).toBe("unsupported");
  });

  it("does not let a Blasphemous ordinary Temple use Hestar as a resource backstop", () => {
    const plan = planHierophantVisions(
      state({
        temples: [
          ordinaryTemple("krolis", {
            abundance: 0,
            conviction: 4,
            doctrine: { kind: "blasphemy", blasphemyId: "old_land_demands_blood" },
          }),
          hestarTemple({ abundance: 5, conviction: 5 }),
        ],
        supplicants: [supplicant({ id: "peasant-no-hestar", classId: "peasant", woe: 2, templeId: "krolis" })],
      }),
    );
    expect(plan.kind).toBe("manual_resolution_required");
    expect(plan.requiredChoices.some((choice) => choice.kind === "hestar_fallback")).toBe(false);
    expect(plan.blockers.some((blocker) => blocker.kind === "resource_shortage_collapse")).toBe(true);
    expect(templePreview(plan, "krolis").hestarFallback).toBe("not_needed");
  });
});

describe("Hierophant Visions planner — Reliable Prophet context", () => {
  it("keeps an otherwise-safe preview automatic when a Reliable Prophet is present but no production is projected", () => {
    const plan = planHierophantVisions(
      state({
        supplicants: [supplicant({ id: "peasant-p", classId: "peasant", woe: 3, templeId: "krolis" })],
        prophets: [{ denizenId: denizen("prophet-1"), host: { kind: "temple", templeId: "krolis" } }],
      }),
      {},
      { reliableProphetDenizenIds: [denizen("prophet-1")] },
    );
    expect(plan.kind).toBe("ready");
    expect(plan.blockers).toEqual([]);
    expect(templePreview(plan, "krolis").reliableProphetProduction).toBe(false);
    expect(templePreview(plan, "krolis").abundance.after).toBe(4);
  });

  it("returns a structured manual blocker for Reliable Prophet + projected Benefaction production", () => {
    const plan = planHierophantVisions(
      state({
        supplicants: [supplicant({ id: "peasant-gift", classId: "peasant", woe: 1, templeId: "krolis" })],
        prophets: [{ denizenId: denizen("prophet-1"), host: { kind: "temple", templeId: "krolis" } }],
      }),
      {},
      { reliableProphetDenizenIds: [denizen("prophet-1")] },
    );
    expect(plan.kind).toBe("manual_resolution_required");
    expect(plan.blockers).toEqual([
      {
        kind: "reliable_prophet_production",
        templeId: "krolis",
        prophetDenizenIds: [denizen("prophet-1")],
        productions: [
          {
            denizenId: denizen("peasant-gift"),
            resource: "conviction",
            amount: 1,
          },
        ],
      },
    ]);
    expect(previewFor(plan, "peasant-gift").departure).toEqual({
      kind: "benefaction",
      resource: "conviction",
      amount: 1,
    });
    expect(templePreview(plan, "krolis").reliableProphetProduction).toBe(true);
    expect(templePreview(plan, "krolis").abundance.after).toBeNull();
    expect(templePreview(plan, "krolis").conviction.after).toBeNull();
  });

  it("does not apply the Reliable Prophet rule to a Disruptive Prophet", () => {
    const plan = planHierophantVisions(
      state({
        supplicants: [supplicant({ id: "peasant-gift", classId: "peasant", woe: 1, templeId: "krolis" })],
        prophets: [{ denizenId: denizen("prophet-d"), host: { kind: "temple", templeId: "krolis" } }],
      }),
      {},
      { reliableProphetDenizenIds: [] },
    );
    expect(plan.kind).toBe("ready");
    expect(plan.blockers.some((blocker) => blocker.kind === "reliable_prophet_production")).toBe(false);
    expect(templePreview(plan, "krolis").conviction).toEqual({ before: 4, delta: 1, after: 5 });
  });
});

describe("Hierophant Visions planner — Hestar may borrow from ordinary Temples", () => {
  it("requests a Hestar-donor choice when Hestar is short and an eligible ordinary Temple can pay", () => {
    const plan = planHierophantVisions(
      state({
        temples: [
          ordinaryTemple("krolis", { abundance: 5, conviction: 4 }),
          hestarTemple({ abundance: 0, conviction: 5 }),
        ],
        supplicants: [supplicant({ id: "hestar-p", classId: "peasant", woe: 2, templeId: "hestar" })],
      }),
    );
    expect(plan.kind).toBe("choices_required");
    expect(plan.requiredChoices).toEqual([
      {
        kind: "hestar_donor",
        denizenId: denizen("hestar-p"),
        templeId: "hestar",
        resource: "abundance",
        amount: 1,
        eligibleDonorTempleIds: ["krolis"],
      },
    ]);
    expect(templePreview(plan, "hestar").hestarDonor).toBe("choice_required");
    expect(templePreview(plan, "hestar").abundance.after).toBeNull();
  });

  it("moves the resource from the chosen eligible donor, not from Hestar", () => {
    const plan = planHierophantVisions(
      state({
        temples: [
          ordinaryTemple("krolis", { abundance: 5, conviction: 4 }),
          hestarTemple({ abundance: 0, conviction: 5 }),
        ],
        supplicants: [supplicant({ id: "hestar-p", classId: "peasant", woe: 2, templeId: "hestar" })],
      }),
      { hestarDonors: { [denizen("hestar-p")]: "krolis" } },
    );
    expect(plan.kind).toBe("ready");
    expect(previewFor(plan, "hestar-p").woeProjection).toEqual({ kind: "determined", from: 2, to: 1 });
    expect(templePreview(plan, "hestar").abundance).toEqual({ before: 0, delta: 0, after: 0 });
    expect(templePreview(plan, "hestar").hestarDonor).toBe("applied");
    expect(templePreview(plan, "krolis").abundance).toEqual({ before: 5, delta: -1, after: 4 });
  });

  it("excludes a Blasphemous ordinary Temple from Hestar-sharing donors", () => {
    const plan = planHierophantVisions(
      state({
        temples: [
          ordinaryTemple("krolis", {
            abundance: 5,
            conviction: 4,
            doctrine: { kind: "blasphemy", blasphemyId: "old_land_demands_blood" },
          }),
          ordinaryTemple("notor", { abundance: 3, conviction: 6 }),
          hestarTemple({ abundance: 0, conviction: 5 }),
        ],
        supplicants: [supplicant({ id: "hestar-p", classId: "peasant", woe: 2, templeId: "hestar" })],
      }),
    );
    expect(plan.kind).toBe("choices_required");
    const donorChoice = plan.requiredChoices.find((choice) => choice.kind === "hestar_donor");
    expect(donorChoice).toMatchObject({
      kind: "hestar_donor",
      eligibleDonorTempleIds: ["notor"],
    });
    expect(donorChoice && donorChoice.kind === "hestar_donor"
      ? donorChoice.eligibleDonorTempleIds
      : []).not.toContain("krolis");
  });

  it("blocks when no single source-safe donor can satisfy the spend", () => {
    const plan = planHierophantVisions(
      state({
        temples: [
          ordinaryTemple("krolis", {
            abundance: 5,
            conviction: 4,
            doctrine: { kind: "blasphemy", blasphemyId: "old_land_demands_blood" },
          }),
          ordinaryTemple("notor", { abundance: 0, conviction: 6 }),
          hestarTemple({ abundance: 0, conviction: 5 }),
        ],
        supplicants: [supplicant({ id: "hestar-p", classId: "peasant", woe: 2, templeId: "hestar" })],
      }),
    );
    expect(plan.kind).toBe("manual_resolution_required");
    expect(plan.requiredChoices.some((choice) => choice.kind === "hestar_donor")).toBe(false);
    expect(plan.blockers).toEqual([
      {
        kind: "hestar_share_unresolved",
        denizenId: denizen("hestar-p"),
        templeId: "hestar",
        resource: "abundance",
        amount: 1,
        reason: "no_eligible_donor",
      },
    ]);
    expect(templePreview(plan, "hestar").shortage).toBeNull();
  });

  it("does not invent combining multiple partial donors for one Hestar spend", () => {
    const plan = planHierophantVisions(
      state({
        temples: [
          ordinaryTemple("krolis", { abundance: 5, conviction: 1 }),
          ordinaryTemple("notor", { abundance: 3, conviction: 1 }),
          hestarTemple({ abundance: 4, conviction: 0 }),
        ],
        supplicants: [supplicant({ id: "hestar-g", classId: "gentry", woe: 2, templeId: "hestar" })],
      }),
    );
    expect(plan.kind).toBe("manual_resolution_required");
    expect(plan.requiredChoices.some((choice) => choice.kind === "hestar_donor")).toBe(false);
    expect(plan.blockers).toEqual([
      {
        kind: "hestar_share_unresolved",
        denizenId: denizen("hestar-g"),
        templeId: "hestar",
        resource: "conviction",
        amount: 2,
        reason: "donor_combination_unapproved",
      },
    ]);
  });
});

describe("Hierophant Visions planner — cross-Temple Hestar contention", () => {
  it("does not allocate a scarce Hestar resource by input array order", () => {
    const temples = [
      ordinaryTemple("krolis", { abundance: 0, conviction: 4 }),
      ordinaryTemple("zephon", {
        abundance: 0,
        conviction: 5,
        doctrine: { kind: "doctrine", doctrineId: "people_used_to_be_kinder" },
      }),
      hestarTemple({ abundance: 1, conviction: 5 }),
    ];
    const people = [
      supplicant({ id: "krolis-p", classId: "peasant", woe: 2, templeId: "krolis" }),
      supplicant({ id: "zephon-p", classId: "peasant", woe: 2, templeId: "zephon" }),
    ];
    const fallback = {
      hestarFallback: {
        [denizen("krolis-p")]: true,
        [denizen("zephon-p")]: true,
      },
    } as const;
    const asListed = planHierophantVisions(state({ temples, supplicants: people }), fallback);
    const reversed = planHierophantVisions(state({ temples, supplicants: [...people].reverse() }), fallback);
    expect(asListed.kind).toBe("choices_required");
    expect(reversed.kind).toBe("choices_required");
    expect(asListed.requiredChoices.some((choice) => choice.kind === "supplicant_order")).toBe(true);
    expect(reversed.requiredChoices.some((choice) => choice.kind === "supplicant_order")).toBe(true);
    const listedOrder = asListed.requiredChoices.find((choice) => choice.kind === "supplicant_order");
    const reversedOrder = reversed.requiredChoices.find((choice) => choice.kind === "supplicant_order");
    expect(listedOrder).toEqual(reversedOrder);
    expect(listedOrder).toMatchObject({
      kind: "supplicant_order",
      participantIds: [denizen("krolis-p"), denizen("zephon-p")],
      reason: "resource_competition",
    });
    expect(templePreview(asListed, "krolis").abundance.after).toBeNull();
    expect(templePreview(asListed, "zephon").abundance.after).toBeNull();
    expect(templePreview(asListed, "hestar").abundance.after).toBeNull();
  });

  it("honors an explicit order for scarce Hestar allocation", () => {
    const temples = [
      ordinaryTemple("krolis", { abundance: 0, conviction: 4 }),
      ordinaryTemple("zephon", {
        abundance: 0,
        conviction: 5,
        doctrine: { kind: "doctrine", doctrineId: "people_used_to_be_kinder" },
      }),
      hestarTemple({ abundance: 1, conviction: 5 }),
    ];
    const people = [
      supplicant({ id: "krolis-p", classId: "peasant", woe: 2, templeId: "krolis" }),
      supplicant({ id: "zephon-p", classId: "peasant", woe: 2, templeId: "zephon" }),
    ];
    const funded = planHierophantVisions(
      state({ temples, supplicants: people }),
      {
        hestarFallback: {
          [denizen("krolis-p")]: true,
          [denizen("zephon-p")]: true,
        },
        supplicantOrder: [denizen("krolis-p"), denizen("zephon-p")],
      },
    );
    expect(funded.kind).toBe("manual_resolution_required");
    expect(previewFor(funded, "krolis-p").woeProjection).toEqual({ kind: "determined", from: 2, to: 1 });
    expect(previewFor(funded, "zephon-p").blockerKind).toBe("resource_shortage_collapse");
    expect(templePreview(funded, "krolis").abundance).toEqual({ before: 0, delta: 0, after: 0 });
    expect(templePreview(funded, "hestar").abundance).toEqual({ before: 1, delta: -1, after: 0 });
  });
});
