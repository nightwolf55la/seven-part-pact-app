import { describe, it, expect } from "vitest";
import type {
  CampaignStateV5,
  MonthOrdinal,
  PlaceId,
  PlayerId,
  WizardId,
} from "../shared/domain";
import {
  CURRENT_STATE_SCHEMA_VERSION,
  DomainError,
  EMPTY_HIEROPHANT_STATE,
  EMPTY_MARINER_STATE,
  EMPTY_NECROMANCER_STATE,
  EMPTY_SHARED_WORLD_STATE,
  HIEROPHANT_BUILTIN_CLASS_IDS,
  HIEROPHANT_BUILTIN_CLASS_DEFINITIONS,
  HIEROPHANT_BUILTIN_DOCTRINE_DEFINITIONS,
  HIEROPHANT_FLAME_LAW_DEFINITIONS,
  HIEROPHANT_FLAME_LAW_IDS,
  HIEROPHANT_STARTING_TEMPLE_DEFINITIONS,
  HIEROPHANT_STARTING_TEMPLE_IDS,
  SEVEN_PART_PACT_DRAFT4_ID,
  SEVEN_PART_PACT_DRAFT4_VERSION,
  adjustTempleResourcesFingerprint,
  applyAdjustTempleResources,
  applyCreatePlaceV5Candidate,
  applyInitializeHierophant,
  hierophantStartingTempleDisplayName,
  initialCampaignState,
  initializeHierophantFingerprint,
  isLogicalStateCommandType,
  isValidHierophantFlameLawId,
  validateCampaignState,
  validateCampaignStateV5Candidate,
  EMPTY_PACT_FRAGMENT_OPERATIONAL_STATE,
} from "../shared/domain";
import { CAMPAIGN_COMMAND_TYPES } from "../shared/domain";
import { validateEventCoherenceForTest } from "../convex/canonicalCommit";
import type { CanonicalCommitInput } from "../convex/canonicalCommit";
import {
  executeOrdinaryLogicalCommand,
  type CanonicalCampaign,
  type OrdinaryLogicalCommandIo,
  type OrdinaryLogicalCommandPreparation,
} from "../convex/ordinaryLogicalCommand";

const CAMPAIGN_A = "cmp_00000000-0000-0000-0000-000000000001";
const CAMPAIGN_B = "cmp_00000000-0000-0000-0000-000000000002";
const COMMAND_1 = "cmd_00000000-0000-0000-0000-000000000001";
const PLR_A = "plr_00000000-0000-0000-0000-00000000000a" as PlayerId;
const WIZ_A = "wiz_00000000-0000-0000-0000-00000000000a" as WizardId;

function placeId(n: number): PlaceId {
  return `plc_00000000-0000-0000-0000-${String(n).padStart(12, "0")}` as PlaceId;
}

const EMPTY_PACT_SEATS = {
  necromancer: { status: null, wizardId: null, watcherPlayerId: null },
  hierophant: { status: null, wizardId: null, watcherPlayerId: null },
  warlock: { status: null, wizardId: null, watcherPlayerId: null },
  mariner: { status: null, wizardId: null, watcherPlayerId: null },
  faustian: { status: null, wizardId: null, watcherPlayerId: null },
  sage: { status: null, wizardId: null, watcherPlayerId: null },
  sorcerer: { status: null, wizardId: null, watcherPlayerId: null },
} as const;

function baseV5(): CampaignStateV5 {
  return {
    schemaVersion: 5,
    ruleset: { id: SEVEN_PART_PACT_DRAFT4_ID, version: SEVEN_PART_PACT_DRAFT4_VERSION },
    calendar: { monthOrdinal: 0 as MonthOrdinal },
    configuration: { ageId: null, facilitatorPlayerId: null },
    players: [{ playerId: PLR_A, name: "Alice" }],
    wizards: [{
      wizardId: WIZ_A,
      name: "Wizard A",
      portrayedByPlayerId: PLR_A,
      character: {
        elements: null,
        pactFragmentPersonalForm: null,
        familiarDescription: null,
        ageYears: null,
        publicChangesOfMagic: [],
        importantNotes: null,
      },
      homeIsleId: null,
      sanctumPlaceId: null,
      mortalityState: "not_deceased",
    }],
    pactSeats: EMPTY_PACT_SEATS,
    pactFragmentOperationalState: EMPTY_PACT_FRAGMENT_OPERATIONAL_STATE,
    lifecycle: {
      kind: "setup",
      orrery: { saturn: null, jupiter: null, mars: null, venus: null, mercury: null },
    },
    wizardmootHistory: [],
    world: { ...EMPTY_SHARED_WORLD_STATE },
    hierophant: { ...EMPTY_HIEROPHANT_STATE },
    mariner: { ...EMPTY_MARINER_STATE },
    necromancer: { ...EMPTY_NECROMANCER_STATE },
  };
}

function withStartingTemplePlaces(state: CampaignStateV5): CampaignStateV5 {
  let next = state;
  HIEROPHANT_STARTING_TEMPLE_IDS.forEach((templeId, index) => {
    const result = applyCreatePlaceV5Candidate(next, {
      placeId: placeId(index + 1),
      name: hierophantStartingTempleDisplayName(templeId),
      description: null,
      placement: { kind: "unspecified" },
    });
    next = result.nextState;
  });
  return next;
}

function startingBindings() {
  return HIEROPHANT_STARTING_TEMPLE_IDS.map((templeId, index) => ({
    templeId,
    placeId: placeId(index + 1),
  }));
}

function initializeReady(state: CampaignStateV5 = baseV5()) {
  const withPlaces = withStartingTemplePlaces(state);
  return applyInitializeHierophant(withPlaces, {
    selectedFlameLawIds: ["first", "second"],
    templePlaces: startingBindings(),
  });
}

describe("Hierophant Slice 1 catalogs", () => {
  it("defines seven Laws of the Flame with unique resolvable IDs and source text", () => {
    expect(HIEROPHANT_FLAME_LAW_IDS).toHaveLength(7);
    expect(new Set(HIEROPHANT_FLAME_LAW_IDS).size).toBe(7);
    for (const id of HIEROPHANT_FLAME_LAW_IDS) {
      expect(isValidHierophantFlameLawId(id)).toBe(true);
    }
    expect(isValidHierophantFlameLawId("unknown_law")).toBe(false);
    const byId = Object.fromEntries(HIEROPHANT_FLAME_LAW_DEFINITIONS.map((d) => [d.id, d]));
    expect(byId.first.text).toBe(
      "Thou shalt not spill blood here, or allow even a single drop to touch the ground.",
    );
    expect(byId.second.text).toBe(
      "Thou shalt not speak with a voice above a whisper here, or yell within the temple.",
    );
    expect(byId.third.text).toBe(
      "Thou shalt not depict others as images here, or represent the divine as human.",
    );
    expect(byId.fourth.text).toBe(
      "Thou shalt not enter the temples without ritually bathing and breathing incense.",
    );
    expect(byId.fifth.text).toBe(
      "Thou shalt not perform magic here, or allow magic to occur near the flame.",
    );
    expect(byId.sixth.text).toBe(
      "Thou shalt not judge another here, no matter their crimes.",
    );
    expect(byId.seventh.text).toBe(
      "Thou shalt not bring coins here, or allow any wealth to enter.",
    );
    expect(byId.first.applicationLabel).toBe("First Law of the Flame");
  });

  it("defines built-in Classes and starting Doctrine records", () => {
    expect([...HIEROPHANT_BUILTIN_CLASS_IDS]).toEqual([
      "pariah", "peasant", "artisan", "merchant", "gentry",
    ]);
    expect(HIEROPHANT_BUILTIN_CLASS_DEFINITIONS.map((c) => c.name)).toEqual([
      "Pariah", "Peasant", "Artisan", "Merchant", "Gentry",
    ]);
    const doctrines = Object.fromEntries(
      HIEROPHANT_BUILTIN_DOCTRINE_DEFINITIONS.map((d) => [d.id, d]),
    );
    expect(doctrines.worth_proved_through_labor).toMatchObject({
      text: "One's worth is proved through one's labor.",
      supportedClassIds: ["artisan", "peasant"],
      pairedBlasphemy: {
        id: "old_land_demands_blood",
        text: "The old land demands the blood of the idle.",
      },
    });
    expect(doctrines.charity_measure_of_moral_worth).toMatchObject({
      text: "Charity is the measure of moral worth.",
      supportedClassIds: ["gentry", "pariah"],
      pairedBlasphemy: {
        id: "law_of_the_wolf",
        text: "There is no law but the law of the wolf.",
      },
    });
    expect(doctrines.people_used_to_be_kinder).toMatchObject({
      text: "People used to be kinder to each other.",
      supportedClassIds: ["peasant", "pariah"],
      pairedBlasphemy: {
        id: "destroy_trappings_of_modernity",
        text: "We must destroy all trappings of modernity.",
      },
    });
    expect(doctrines.wealthy_deserve_pleasures).toMatchObject({
      text: "The wealthy deserve the pleasures of their station.",
      supportedClassIds: ["gentry", "merchant"],
      pairedBlasphemy: {
        id: "indulge_every_desire",
        text: "Indulge your every sumptuous, exotic, and twisted desire.",
      },
    });
  });

  it("encodes source starting Temple defaults", () => {
    expect(HIEROPHANT_STARTING_TEMPLE_IDS).toEqual([
      "krolis", "notor", "hestar", "ushin", "zephon",
    ]);
    expect(HIEROPHANT_STARTING_TEMPLE_DEFINITIONS).toHaveLength(5);
    const byId = Object.fromEntries(
      HIEROPHANT_STARTING_TEMPLE_DEFINITIONS.map((d) => [d.templeId, d]),
    );
    expect(byId.krolis).toMatchObject({
      displayName: "Temple Krolis",
      kind: "ordinary",
      hostSeatId: "hierophant",
      abundance: 5,
      conviction: 4,
      status: "active",
      doctrineId: "worth_proved_through_labor",
    });
    expect(byId.notor).toMatchObject({
      displayName: "Temple Notor",
      kind: "ordinary",
      abundance: 3,
      conviction: 6,
      doctrineId: "charity_measure_of_moral_worth",
    });
    expect(byId.zephon).toMatchObject({
      displayName: "Temple Zephon",
      kind: "ordinary",
      abundance: 4,
      conviction: 5,
      doctrineId: "people_used_to_be_kinder",
    });
    expect(byId.ushin).toMatchObject({
      displayName: "Temple Ushin",
      kind: "ordinary",
      abundance: 5,
      conviction: 4,
      doctrineId: "wealthy_deserve_pleasures",
    });
    expect(byId.hestar).toMatchObject({
      displayName: "Temple Hestar",
      kind: "hestar",
      hostSeatId: "hierophant",
      abundance: 4,
      conviction: 5,
      status: "active",
    });
    expect(byId.hestar).not.toHaveProperty("doctrineId");
  });
});

describe("CampaignStateV5 Hierophant core", () => {
  it("requires and accepts valid empty Hierophant core state", () => {
    expect(CURRENT_STATE_SCHEMA_VERSION).toBe(5);
    const state = initialCampaignState();
    expect(state.hierophant).toEqual(EMPTY_HIEROPHANT_STATE);
    expect(() => validateCampaignState(state)).not.toThrow();
    expect(() => validateCampaignStateV5Candidate(state)).not.toThrow();
  });

  it("fails closed on missing Hierophant state", () => {
    const { hierophant: _removed, ...rest } = baseV5() as CampaignStateV5 & { hierophant?: unknown };
    expect(() => validateCampaignStateV5Candidate(rest)).toThrow(DomainError);
  });

  it("fails closed on duplicate selected Flame Law IDs", () => {
    const state = {
      ...baseV5(),
      hierophant: { ...EMPTY_HIEROPHANT_STATE, selectedFlameLawIds: ["first", "first"] as const },
    };
    expect(() => validateCampaignStateV5Candidate(state)).toThrow(DomainError);
  });

  it("fails closed on unknown selected Flame Law IDs", () => {
    const state = {
      ...baseV5(),
      hierophant: { ...EMPTY_HIEROPHANT_STATE, selectedFlameLawIds: ["not_a_law"] as never[] },
    };
    expect(() => validateCampaignStateV5Candidate(state)).toThrow(DomainError);
  });

  it("accepts unique resolvable selected Flame Law IDs without requiring exactly two", () => {
    const zero = baseV5();
    expect(() => validateCampaignStateV5Candidate(zero)).not.toThrow();
    const one = {
      ...baseV5(),
      hierophant: { ...EMPTY_HIEROPHANT_STATE, selectedFlameLawIds: ["third"] as const },
    };
    expect(() => validateCampaignStateV5Candidate(one)).not.toThrow();
    const three = {
      ...baseV5(),
      hierophant: { ...EMPTY_HIEROPHANT_STATE, selectedFlameLawIds: ["first", "second", "third"] as const },
    };
    expect(() => validateCampaignStateV5Candidate(three)).not.toThrow();
  });

  it("fails closed on dangling Temple Place references", () => {
    const initialized = initializeReady().nextState;
    const dangling = {
      ...initialized,
      world: { ...initialized.world, places: [] },
    };
    expect(() => validateCampaignStateV5Candidate(dangling)).toThrow(DomainError);
  });

  it("fails closed when Hestar has Doctrine state", () => {
    const initialized = initializeReady().nextState;
    const temples = initialized.hierophant.temples.map((t) =>
      t.kind === "hestar" ? { ...t, doctrine: { kind: "unset" as const } } : t,
    );
    const bad = { ...initialized, hierophant: { ...initialized.hierophant, temples } };
    expect(() => validateCampaignStateV5Candidate(bad)).toThrow(DomainError);
  });

  it("fails closed when a campaign Temple is encoded with kind hestar", () => {
    const initialized = applyCreatePlaceV5Candidate(initializeReady().nextState, {
      placeId: placeId(20),
      name: "Custom Temple Place",
      description: null,
      placement: { kind: "unspecified" },
    }).nextState;
    const temples = [
      ...initialized.hierophant.temples,
      {
        templeId: "htm_00000000-0000-0000-0000-0000000000ab",
        kind: "hestar" as const,
        placeId: placeId(20),
        hostSeatId: "necromancer" as const,
        status: "active" as const,
        abundance: 0,
        conviction: 0,
      },
    ];
    const bad = { ...initialized, hierophant: { ...initialized.hierophant, temples } };
    expect(() => validateCampaignState(bad as CampaignStateV5)).toThrow(DomainError);
  });

  it("fails closed when templeId hestar is encoded as kind ordinary", () => {
    const initialized = initializeReady().nextState;
    const temples = initialized.hierophant.temples.map((t) =>
      t.templeId === "hestar"
        ? { ...t, kind: "ordinary" as const, doctrine: { kind: "unset" as const } }
        : t,
    );
    const bad = { ...initialized, hierophant: { ...initialized.hierophant, temples } };
    expect(() => validateCampaignState(bad)).toThrow(DomainError);
  });

  it("fails closed on negative Temple resources", () => {
    const initialized = initializeReady().nextState;
    const temples = initialized.hierophant.temples.map((t, i) =>
      i === 0 ? { ...t, abundance: -1 } : t,
    );
    const bad = { ...initialized, hierophant: { ...initialized.hierophant, temples } };
    expect(() => validateCampaignStateV5Candidate(bad)).toThrow(DomainError);
  });

  it("resolves built-in starting Doctrine IDs without campaign-created records", () => {
    const initialized = initializeReady().nextState;
    expect(initialized.hierophant.campaignDoctrines).toEqual([]);
    expect(initialized.hierophant.campaignClasses).toEqual([]);
    expect(() => validateCampaignStateV5Candidate(initialized)).not.toThrow();
  });

  it("fails closed on rejected synthetic Supplicant/Prophet/Cult identity records", () => {
    const initialized = initializeReady().nextState;
    const withSupplicants = {
      ...initialized,
      hierophant: {
        ...initialized.hierophant,
        supplicants: [{ supplicantId: "syn_supplicant" }],
      },
    };
    const withProphets = {
      ...initialized,
      hierophant: {
        ...initialized.hierophant,
        prophets: [{ prophetId: "syn_prophet" }],
      },
    };
    const withCults = {
      ...initialized,
      hierophant: {
        ...initialized.hierophant,
        cults: [{ cultId: "syn_cult" }],
      },
    };
    expect(() => validateCampaignStateV5Candidate(withSupplicants)).toThrow(DomainError);
    expect(() => validateCampaignStateV5Candidate(withProphets)).toThrow(DomainError);
    expect(() => validateCampaignStateV5Candidate(withCults)).toThrow(DomainError);
  });
});

describe("Hierophant initialization", () => {
  it("creates starting Temples associated with existing World Places", () => {
    const result = initializeReady();
    expect(result.events).toHaveLength(1);
    expect(result.events[0].type).toBe("hierophant_initialized");
    expect(result.nextState.hierophant.selectedFlameLawIds).toEqual(["first", "second"]);
    expect(result.nextState.hierophant.temples).toHaveLength(5);
    expect(() => validateCampaignState(result.nextState)).not.toThrow();

    for (let i = 0; i < HIEROPHANT_STARTING_TEMPLE_IDS.length; i++) {
      const temple = result.nextState.hierophant.temples[i];
      const definition = HIEROPHANT_STARTING_TEMPLE_DEFINITIONS[i];
      expect(temple.templeId).toBe(definition.templeId);
      expect(temple.kind).toBe(definition.kind);
      expect(temple.placeId).toBe(placeId(i + 1));
      expect(temple.hostSeatId).toBe("hierophant");
      expect(temple.abundance).toBe(definition.abundance);
      expect(temple.conviction).toBe(definition.conviction);
      expect(temple.status).toBe("active");
      expect(result.nextState.world.places.some((p) => p.placeId === temple.placeId)).toBe(true);
      if (temple.kind === "ordinary" && definition.kind === "ordinary") {
        expect(temple.doctrine).toEqual({ kind: "doctrine", doctrineId: definition.doctrineId });
      } else {
        expect("doctrine" in temple).toBe(false);
      }
    }
  });

  it("does not guess a city Place as a Temple Place", () => {
    let state = baseV5();
    state = applyCreatePlaceV5Candidate(state, {
      placeId: placeId(99),
      name: "Blue City",
      description: null,
      placement: { kind: "unspecified" },
    }).nextState;
    state = withStartingTemplePlaces(state);
    const result = applyInitializeHierophant(state, {
      selectedFlameLawIds: ["sixth", "seventh"],
      templePlaces: startingBindings(),
    });
    expect(result.nextState.hierophant.temples.some((t) => t.placeId === placeId(99))).toBe(false);
  });

  it("requires exactly two Flame Laws at initialization without making that a permanent state invariant", () => {
    const withPlaces = withStartingTemplePlaces(baseV5());
    expect(() =>
      applyInitializeHierophant(withPlaces, {
        selectedFlameLawIds: ["first"],
        templePlaces: startingBindings(),
      }),
    ).toThrow(DomainError);
    expect(() => validateCampaignStateV5Candidate(withPlaces)).not.toThrow();
  });

  it("fails closed on a missing Temple Place", () => {
    const withPlaces = withStartingTemplePlaces(baseV5());
    const bindings = startingBindings();
    bindings[0] = { ...bindings[0], placeId: placeId(99) };
    expect(() =>
      applyInitializeHierophant(withPlaces, {
        selectedFlameLawIds: ["first", "second"],
        templePlaces: bindings,
      }),
    ).toThrow(DomainError);
  });
});

describe("adjust_temple_resources representative command", () => {
  it("is a logical-state command that mutates only intended Hierophant resources", () => {
    expect(CAMPAIGN_COMMAND_TYPES as readonly string[]).toContain("adjust_temple_resources");
    expect(CAMPAIGN_COMMAND_TYPES as readonly string[]).toContain("initialize_hierophant");
    expect(isLogicalStateCommandType("adjust_temple_resources")).toBe(true);
    expect(isLogicalStateCommandType("initialize_hierophant")).toBe(true);

    const initialized = initializeReady().nextState;
    const result = applyAdjustTempleResources(initialized, "krolis", {
      abundance: { expected: 5, value: 4 },
    });
    expect(result.events[0].type).toBe("temple_resources_adjusted");
    const krolis = result.nextState.hierophant.temples.find((t) => t.templeId === "krolis")!;
    expect(krolis.abundance).toBe(4);
    expect(krolis.conviction).toBe(4);
    expect(krolis.status).toBe("active");
    expect(result.nextState.world).toEqual(initialized.world);
    expect(result.nextState.hierophant.selectedFlameLawIds).toEqual(initialized.hierophant.selectedFlameLawIds);
    expect(result.nextState.hierophant.supplicants).toEqual([]);
  });

  it("records a manual resource drop to 0 without automatic Temple consequences", () => {
    const initialized = initializeReady().nextState;
    const before = initialized.hierophant.temples.find((t) => t.templeId === "krolis")!;
    expect(before.kind).toBe("ordinary");
    const result = applyAdjustTempleResources(initialized, "krolis", {
      abundance: { expected: 5, value: 0 },
      conviction: { expected: 4, value: 0 },
    });
    const krolis = result.nextState.hierophant.temples.find((t) => t.templeId === "krolis")!;
    expect(krolis.abundance).toBe(0);
    expect(krolis.conviction).toBe(0);
    expect(krolis.status).toBe("active");
    expect(krolis.kind).toBe("ordinary");
    if (krolis.kind === "ordinary" && before.kind === "ordinary") {
      expect(krolis.doctrine).toEqual(before.doctrine);
      expect(krolis.doctrine.kind).toBe("doctrine");
      expect(krolis.doctrine).not.toMatchObject({ kind: "blasphemy" });
    }
    expect(result.nextState.hierophant.cults).toEqual([]);
    expect(result.nextState.hierophant.supplicants).toEqual([]);
    expect(result.nextState.hierophant.prophets).toEqual([]);
  });

  it("preserves fingerprints, campaign protection, idempotency, and coherence", async () => {
    const initialized = initializeReady().nextState;
    const fields = { abundance: { expected: 5, value: 3 } };
    const fp1 = adjustTempleResourcesFingerprint(CAMPAIGN_A, "krolis", fields);
    const fp2 = adjustTempleResourcesFingerprint(CAMPAIGN_A, "krolis", fields);
    expect(fp1).toBe(fp2);
    expect(adjustTempleResourcesFingerprint(CAMPAIGN_B, "krolis", fields)).not.toBe(fp1);
    expect(initializeHierophantFingerprint(CAMPAIGN_A, ["first", "second"], startingBindings()))
      .toBe(initializeHierophantFingerprint(CAMPAIGN_A, ["first", "second"], startingBindings()));

    const dummyState = initialized;
    expect(() =>
      validateEventCoherenceForTest(
        {
          campaignDocId: "dummy" as unknown as CanonicalCommitInput["campaignDocId"],
          campaignId: CAMPAIGN_A,
          currentRevision: 0,
          currentState: dummyState,
          commandId: COMMAND_1,
          commandType: "adjust_temple_resources",
          commandFingerprint: fp1,
          nextState: dummyState,
          events: applyAdjustTempleResources(initialized, "krolis", fields).events,
          historyControlUpdate: { kind: "logical_state_append" },
        },
        1,
      ),
    ).not.toThrow();

    const calls: string[] = [];
    const commits: CanonicalCommitInput[] = [];
    const io: OrdinaryLogicalCommandIo = {
      async assertNotDeleting() { calls.push("assertNotDeleting"); },
      async loadCanonicalCampaign() {
        calls.push("loadCanonicalCampaign");
        return {
          docId: "dummy" as CanonicalCampaign["docId"],
          campaignId: CAMPAIGN_B,
          currentRevision: 4,
          currentState: initialized,
        };
      },
      async findAcceptedCommand() { calls.push("findAcceptedCommand"); return null; },
      async loadCommittedSnapshot() { calls.push("loadCommittedSnapshot"); return initialized; },
      async commit(input) {
        calls.push("commit");
        commits.push(input);
        return { newRevision: 5, state: input.nextState, alreadyApplied: false };
      },
    };

    await expect(
      executeOrdinaryLogicalCommand(
        io,
        { commandId: COMMAND_1, expectedCampaignId: CAMPAIGN_A },
        () => ({
          commandType: "adjust_temple_resources",
          commandFingerprint: fp1,
          apply: (state) => applyAdjustTempleResources(state, "krolis", fields),
        }),
      ),
    ).rejects.toMatchObject({ code: "STALE_COMMAND_PRECONDITION" });
    expect(calls).toEqual(["assertNotDeleting", "loadCanonicalCampaign"]);
    expect(commits).toHaveLength(0);

    const replayCalls: string[] = [];
    let applyCount = 0;
    const replayIo: OrdinaryLogicalCommandIo = {
      async assertNotDeleting() { replayCalls.push("assertNotDeleting"); },
      async loadCanonicalCampaign() {
        replayCalls.push("loadCanonicalCampaign");
        return {
          docId: "dummy" as CanonicalCampaign["docId"],
          campaignId: CAMPAIGN_A,
          currentRevision: 8,
          currentState: initialized,
        };
      },
      async findAcceptedCommand() {
        replayCalls.push("findAcceptedCommand");
        return { commandType: "adjust_temple_resources", commandFingerprint: fp1, campaignRevision: 6 };
      },
      async loadCommittedSnapshot() { replayCalls.push("loadCommittedSnapshot"); return initialized; },
      async commit(input) {
        replayCalls.push("commit");
        commits.push(input);
        return { newRevision: 9, state: input.nextState, alreadyApplied: false };
      },
    };
    const prepare: () => OrdinaryLogicalCommandPreparation = () => ({
      commandType: "adjust_temple_resources",
      commandFingerprint: fp1,
      apply: (state) => {
        applyCount += 1;
        return applyAdjustTempleResources(state, "krolis", fields);
      },
    });
    const receipt = await executeOrdinaryLogicalCommand(
      replayIo,
      { commandId: COMMAND_1, expectedCampaignId: CAMPAIGN_A },
      prepare,
    );
    expect(receipt).toEqual({ revision: 6 });
    expect(applyCount).toBe(0);
    expect(replayCalls).toEqual([
      "assertNotDeleting",
      "loadCanonicalCampaign",
      "findAcceptedCommand",
      "loadCommittedSnapshot",
    ]);
  });
});

describe("Hierophant V5 snapshot participation", () => {
  it("complete snapshot/recovery state naturally carries the Hierophant field", () => {
    const initialized = initializeReady().nextState;
    const json = JSON.parse(JSON.stringify(initialized)) as CampaignStateV5;
    expect(json.hierophant.temples).toHaveLength(5);
    expect(json.hierophant.selectedFlameLawIds).toEqual(["first", "second"]);
    expect(() => validateCampaignState(json)).not.toThrow();
  });
});
