import { describe, it, expect } from "vitest";
import type {
  CampaignStateV5,
  DenizenId,
  MonthOrdinal,
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
  NECROMANCER_ARRANGEMENT_DEFINITIONS,
  NECROMANCER_BUILTIN_GATE_DEFINITIONS,
  NECROMANCER_BUILTIN_GATE_IDS,
  NECROMANCER_BUILTIN_PATH_SPACE_DEFINITIONS,
  NECROMANCER_BUILTIN_PATH_SPACE_IDS,
  NECROMANCER_DEFAULT_INTERNAL_STEPS,
  NECROMANCER_DEFAULT_TERMINAL_EXITS,
  NECROMANCER_LAW_OF_DEATH_DEFINITIONS,
  NECROMANCER_LAW_OF_DEATH_IDS,
  NECROMANCER_TERMINAL_EXIT_IDS,
  SEVEN_PART_PACT_DRAFT4_ID,
  SEVEN_PART_PACT_DRAFT4_VERSION,
  SUPPORTED_STATE_SCHEMA_VERSIONS,
  buildInitializedDefaultNecromancerState,
  initialCampaignState,
  necromancerDirectedStepKey,
  validateCampaignState,
  validateCampaignStateV5Candidate,
  validateNecromancerStructure,
} from "../shared/domain";
import type {
  NecromancerAllyState,
  NecromancerBuiltinGateId,
  NecromancerBuiltinPathSpaceId,
  NecromancerDirectedStep,
  NecromancerFoeState,
  NecromancerGhoulCallerState,
  NecromancerOccupiableSpaceRef,
  NecromancerState,
} from "../shared/domain";

const PLR_A = "plr_00000000-0000-0000-0000-00000000000a" as PlayerId;
const WIZ_A = "wiz_00000000-0000-0000-0000-00000000000a" as WizardId;
const WIZ_MISSING = "wiz_00000000-0000-0000-0000-0000000000ff" as WizardId;
const DEN_1 = "den_00000000-0000-0000-0000-000000000001" as DenizenId;
const DEN_2 = "den_00000000-0000-0000-0000-000000000002" as DenizenId;
const DEN_3 = "den_00000000-0000-0000-0000-000000000003" as DenizenId;
const DEN_COLLECTIVE = "den_00000000-0000-0000-0000-0000000000cc" as DenizenId;
const DEN_MISSING = "den_00000000-0000-0000-0000-999999999999" as DenizenId;
const CAMPAIGN_GATE = "ngt_00000000-0000-0000-0000-0000000000ab";
const CAMPAIGN_PATH = "nps_00000000-0000-0000-0000-0000000000cd";

const EMPTY_PACT_SEATS = {
  necromancer: { status: null, wizardId: null, watcherPlayerId: null },
  hierophant: { status: null, wizardId: null, watcherPlayerId: null },
  warlock: { status: null, wizardId: null, watcherPlayerId: null },
  mariner: { status: null, wizardId: null, watcherPlayerId: null },
  faustian: { status: null, wizardId: null, watcherPlayerId: null },
  sage: { status: null, wizardId: null, watcherPlayerId: null },
  sorcerer: { status: null, wizardId: null, watcherPlayerId: null },
} as const;

function gateRef(gateId: NecromancerBuiltinGateId): NecromancerOccupiableSpaceRef {
  return { kind: "gate", gateId };
}

function pathRef(pathSpaceId: NecromancerBuiltinPathSpaceId): NecromancerOccupiableSpaceRef {
  return { kind: "path", pathSpaceId };
}

/** Independently transcribed Draft-4 Gates. Do not read NECROMANCER_BUILTIN_GATE_DEFINITIONS. */
const EXPECTED_GATES = [
  { gateId: "amber", romanNumeral: "I", displayName: "Amber", band: "near" },
  { gateId: "bronze", romanNumeral: "II", displayName: "Bronze", band: "near" },
  { gateId: "lead", romanNumeral: "III", displayName: "Lead", band: "near" },
  { gateId: "ivory", romanNumeral: "IV", displayName: "Ivory", band: "near" },
  { gateId: "antimony", romanNumeral: "V", displayName: "Antimony", band: "near" },
  { gateId: "marching", romanNumeral: "VI", displayName: "Marching", band: "far" },
  { gateId: "churning", romanNumeral: "VII", displayName: "Churning", band: "far" },
  { gateId: "weeping", romanNumeral: "VIII", displayName: "Weeping", band: "far" },
  { gateId: "howling", romanNumeral: "IX", displayName: "Howling", band: "far" },
  { gateId: "deep", romanNumeral: "X", displayName: "Deep", band: "furthest" },
  { gateId: "terminus", romanNumeral: "XI", displayName: "Terminus", band: "furthest" },
] as const;

/** Independently transcribed Draft-4 path spaces. Do not read NECROMANCER_BUILTIN_PATH_SPACE_DEFINITIONS. */
const EXPECTED_PATH_SPACES = [
  { pathSpaceId: "edge_sage", region: "edge_of_life" },
  { pathSpaceId: "edge_hierophant", region: "edge_of_life" },
  { pathSpaceId: "edge_warlock", region: "edge_of_life" },
  { pathSpaceId: "edge_mariner", region: "edge_of_life" },
  { pathSpaceId: "edge_faustian", region: "edge_of_life" },
  { pathSpaceId: "edge_sorcerer", region: "edge_of_life" },
  { pathSpaceId: "far_amber", region: "far_lands" },
  { pathSpaceId: "far_bronze", region: "far_lands" },
  { pathSpaceId: "far_lead", region: "far_lands" },
  { pathSpaceId: "far_ivory", region: "far_lands" },
  { pathSpaceId: "far_antimony", region: "far_lands" },
  { pathSpaceId: "abyss_marching", region: "abyss" },
  { pathSpaceId: "abyss_churning", region: "abyss" },
  { pathSpaceId: "abyss_weeping_upper", region: "abyss" },
  { pathSpaceId: "abyss_weeping_lower", region: "abyss" },
] as const;

/** Independently transcribed closer -> further occupancy steps. Do not read NECROMANCER_DEFAULT_INTERNAL_STEPS. */
const EXPECTED_INTERNAL_STEPS: ReadonlyArray<readonly [NecromancerOccupiableSpaceRef, NecromancerOccupiableSpaceRef]> = [
  [pathRef("edge_sage"), gateRef("amber")],
  [pathRef("edge_hierophant"), gateRef("amber")],
  [pathRef("edge_hierophant"), gateRef("bronze")],
  [pathRef("edge_warlock"), gateRef("bronze")],
  [pathRef("edge_warlock"), gateRef("lead")],
  [pathRef("edge_mariner"), gateRef("lead")],
  [pathRef("edge_mariner"), gateRef("ivory")],
  [pathRef("edge_faustian"), gateRef("ivory")],
  [pathRef("edge_faustian"), gateRef("antimony")],
  [pathRef("edge_sorcerer"), gateRef("antimony")],
  [gateRef("amber"), pathRef("far_amber")],
  [gateRef("bronze"), pathRef("far_bronze")],
  [gateRef("lead"), pathRef("far_lead")],
  [gateRef("ivory"), pathRef("far_ivory")],
  [gateRef("antimony"), pathRef("far_antimony")],
  [pathRef("far_amber"), gateRef("marching")],
  [pathRef("far_bronze"), gateRef("marching")],
  [pathRef("far_bronze"), gateRef("churning")],
  [pathRef("far_lead"), gateRef("churning")],
  [pathRef("far_lead"), gateRef("weeping")],
  [pathRef("far_ivory"), gateRef("weeping")],
  [pathRef("far_ivory"), gateRef("howling")],
  [pathRef("far_antimony"), gateRef("howling")],
  [gateRef("marching"), pathRef("abyss_marching")],
  [pathRef("abyss_marching"), gateRef("deep")],
  [gateRef("churning"), pathRef("abyss_churning")],
  [pathRef("abyss_churning"), gateRef("deep")],
  [gateRef("weeping"), pathRef("abyss_weeping_upper")],
  [pathRef("abyss_weeping_upper"), pathRef("abyss_weeping_lower")],
  [pathRef("abyss_weeping_lower"), gateRef("terminus")],
  [gateRef("deep"), gateRef("terminus")],
];

function defaultWorld(options?: { extraCollective?: boolean; omitDenizen1?: boolean }) {
  const denizens: Array<{
    denizenId: DenizenId;
    name: string;
    representation: "individual" | "collective";
    description: null;
  }> = [];
  if (!options?.omitDenizen1) {
    denizens.push({ denizenId: DEN_1, name: "Foe One", representation: "individual", description: null });
  }
  denizens.push(
    { denizenId: DEN_2, name: "Ally One", representation: "individual", description: null },
    { denizenId: DEN_3, name: "Ghoul One", representation: "individual", description: null },
  );
  if (options?.extraCollective) {
    denizens.push({
      denizenId: DEN_COLLECTIVE,
      name: "A Host of Dead",
      representation: "collective",
      description: null,
    });
  }
  return {
    denizens,
    isles: [],
    places: [],
    companionRelationships: [],
  };
}

function baseV5(
  necromancer: NecromancerState = EMPTY_NECROMANCER_STATE,
  world = { ...EMPTY_SHARED_WORLD_STATE },
): CampaignStateV5 {
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
    }],
    pactSeats: EMPTY_PACT_SEATS,
    lifecycle: {
      kind: "setup",
      orrery: { saturn: null, jupiter: null, mars: null, venus: null, mercury: null },
    },
    wizardmootHistory: [],
    world,
    hierophant: { ...EMPTY_HIEROPHANT_STATE },
    mariner: { ...EMPTY_MARINER_STATE },
    necromancer,
  };
}

function initialized(overrides?: Parameters<typeof buildInitializedDefaultNecromancerState>[0]): NecromancerState {
  return buildInitializedDefaultNecromancerState(overrides);
}

function foe(overrides?: Partial<NecromancerFoeState>): NecromancerFoeState {
  return {
    denizenId: DEN_1,
    location: gateRef("deep"),
    ...overrides,
  };
}

function ally(overrides?: Partial<NecromancerAllyState>): NecromancerAllyState {
  return {
    denizenId: DEN_2,
    location: gateRef("amber"),
    ...overrides,
  };
}

function ghoul(overrides?: Partial<NecromancerGhoulCallerState>): NecromancerGhoulCallerState {
  return {
    denizenId: DEN_3,
    disposition: "reliable",
    location: { kind: "path", pathSpaceId: "edge_sage" },
    pettyDeadCount: 0,
    ...overrides,
  };
}

describe("Necromancer Gate catalog fidelity", () => {
  it("defines exactly eleven built-in Gates with IDs, names, numerals, and bands", () => {
    expect(NECROMANCER_BUILTIN_GATE_IDS).toHaveLength(11);
    expect(NECROMANCER_BUILTIN_GATE_DEFINITIONS).toHaveLength(11);
    expect([...NECROMANCER_BUILTIN_GATE_IDS]).toEqual(EXPECTED_GATES.map((g) => g.gateId));
    expect(NECROMANCER_BUILTIN_GATE_DEFINITIONS.map((d) => ({
      gateId: d.gateId,
      romanNumeral: d.romanNumeral,
      displayName: d.displayName,
      band: d.band,
    }))).toEqual([...EXPECTED_GATES]);
  });
});

describe("Necromancer path-space catalog fidelity", () => {
  it("defines exactly fifteen built-in path spaces and regions", () => {
    expect(NECROMANCER_BUILTIN_PATH_SPACE_IDS).toHaveLength(15);
    expect(NECROMANCER_BUILTIN_PATH_SPACE_DEFINITIONS).toHaveLength(15);
    expect([...NECROMANCER_BUILTIN_PATH_SPACE_IDS]).toEqual(EXPECTED_PATH_SPACES.map((s) => s.pathSpaceId));
    expect(NECROMANCER_BUILTIN_PATH_SPACE_DEFINITIONS.map((d) => ({
      pathSpaceId: d.pathSpaceId,
      region: d.region,
    }))).toEqual([...EXPECTED_PATH_SPACES]);
  });
});

describe("Necromancer topology fidelity", () => {
  it("defines exactly 31 internal directed steps, the expected connectivity, and two terminal exits", () => {
    expect(NECROMANCER_DEFAULT_INTERNAL_STEPS).toHaveLength(31);
    expect(NECROMANCER_DEFAULT_TERMINAL_EXITS).toHaveLength(2);
    expect(NECROMANCER_TERMINAL_EXIT_IDS).toEqual(["void_beyond", "final_death"]);
    const expectedKeys = EXPECTED_INTERNAL_STEPS.map(([from, to]) => necromancerDirectedStepKey({ from, to }));
    const actualKeys = NECROMANCER_DEFAULT_INTERNAL_STEPS.map(necromancerDirectedStepKey);
    expect(actualKeys).toEqual(expectedKeys);
    expect(NECROMANCER_DEFAULT_TERMINAL_EXITS).toEqual([
      { from: gateRef("howling"), to: { kind: "terminal", terminalId: "void_beyond" } },
      { from: gateRef("terminus"), to: { kind: "terminal", terminalId: "final_death" } },
    ]);
  });
});

describe("Necromancer Law catalog", () => {
  it("defines seven unique valid Laws of Death", () => {
    expect(NECROMANCER_LAW_OF_DEATH_IDS).toHaveLength(7);
    expect(NECROMANCER_LAW_OF_DEATH_DEFINITIONS).toHaveLength(7);
    expect(new Set(NECROMANCER_LAW_OF_DEATH_DEFINITIONS.map((d) => d.id)).size).toBe(7);
    expect(NECROMANCER_LAW_OF_DEATH_DEFINITIONS.every((d) => d.text.length > 0)).toBe(true);
    expect(NECROMANCER_LAW_OF_DEATH_DEFINITIONS.map((d) => d.id)).toEqual([
      "first", "second", "third", "fourth", "fifth", "sixth", "seventh",
    ]);
  });
});

describe("Necromancer empty-or-complete validation", () => {
  it("accepts the exact empty Necromancer state", () => {
    expect(() => validateNecromancerStructure(EMPTY_NECROMANCER_STATE)).not.toThrow();
    const state = initialCampaignState();
    expect(state.necromancer).toEqual(EMPTY_NECROMANCER_STATE);
    expect(() => validateCampaignState(state)).not.toThrow();
    expect(() => validateCampaignStateV5Candidate(state)).not.toThrow();
  });

  it("accepts a complete initialized default topology", () => {
    const necromancer = initialized();
    expect(necromancer.gates).toHaveLength(11);
    expect(necromancer.pathSpaces).toHaveLength(15);
    expect(necromancer.steps).toHaveLength(33);
    expect(() => validateNecromancerStructure(necromancer)).not.toThrow();
    expect(() => validateCampaignStateV5Candidate(baseV5(necromancer))).not.toThrow();
  });

  it("rejects omitting a built-in Gate identity", () => {
    const necromancer = initialized();
    const partial = { ...necromancer, gates: necromancer.gates.filter((g) => g.gateId !== "howling") };
    expect(() => validateNecromancerStructure(partial)).toThrow(DomainError);
  });

  it("accepts a campaign-created Gate identity independently of directed steps", () => {
    const necromancer = initialized({
      campaignGates: [{
        origin: "campaign",
        gateId: CAMPAIGN_GATE as never,
        name: "The Twelfth Gate",
        band: "far",
        status: "ordinary",
      }],
    });
    expect(necromancer.gates.some((g) => g.gateId === CAMPAIGN_GATE)).toBe(true);
    expect(() => validateNecromancerStructure(necromancer)).not.toThrow();
  });

  it("allows a Gate identity to remain while topology is disconnected", () => {
    const necromancer = initialized({
      steps: initialized().steps.filter((step) => {
        const touchesHowling =
          (step.from.kind === "gate" && step.from.gateId === "howling") ||
          (step.to.kind === "gate" && step.to.gateId === "howling");
        return !touchesHowling;
      }),
    });
    expect(necromancer.gates.some((g) => g.gateId === "howling")).toBe(true);
    expect(() => validateNecromancerStructure(necromancer)).not.toThrow();
  });
});

describe("Necromancer topology validation", () => {
  it("rejects an unresolved step endpoint", () => {
    const extra: NecromancerDirectedStep = {
      from: gateRef("terminus"),
      to: { kind: "path", pathSpaceId: CAMPAIGN_PATH as never },
    };
    expect(() => validateNecromancerStructure(initialized({ extraSteps: [extra] }))).toThrow(DomainError);
  });

  it("rejects a duplicate directed step", () => {
    const duplicate: NecromancerDirectedStep = {
      from: pathRef("edge_sage"),
      to: gateRef("amber"),
    };
    expect(() => validateNecromancerStructure(initialized({ extraSteps: [duplicate] }))).toThrow(DomainError);
  });

  it("rejects a self-loop", () => {
    const loop: NecromancerDirectedStep = {
      from: gateRef("amber"),
      to: gateRef("amber"),
    };
    expect(() => validateNecromancerStructure(initialized({ extraSteps: [loop] }))).toThrow(DomainError);
  });

  it("accepts a valid cyclic custom topology", () => {
    const cyclic = initialized({
      extraSteps: [
        { from: gateRef("terminus"), to: gateRef("deep") },
        { from: gateRef("amber"), to: gateRef("bronze") },
        { from: gateRef("bronze"), to: gateRef("amber") },
      ],
    });
    expect(() => validateNecromancerStructure(cyclic)).not.toThrow();
    expect(() => validateCampaignStateV5Candidate(baseV5(cyclic))).not.toThrow();
  });

  it("accepts a destroyed Gate status without removing the identity", () => {
    const necromancer = initialized({ gateStatuses: { howling: "destroyed", deep: "hostile" } });
    expect(necromancer.gates.find((g) => g.gateId === "howling")?.status).toBe("destroyed");
    expect(() => validateNecromancerStructure(necromancer)).not.toThrow();
  });

  it("rejects an invalid Gate status", () => {
    const necromancer = initialized();
    const bad = {
      ...necromancer,
      gates: necromancer.gates.map((g) => g.gateId === "amber" ? { ...g, status: "sealed" } : g),
    };
    expect(() => validateNecromancerStructure(bad)).toThrow(DomainError);
  });
});

describe("Necromancer Depth ownership", () => {
  it("requires an owner when depth exists and rejects an unresolved owner", () => {
    expect(() => validateNecromancerStructure(initialized({
      depth: { wizardId: "not-a-wizard" as WizardId, value: 1 },
    }))).toThrow(DomainError);
    const dangling = initialized({ depth: { wizardId: WIZ_MISSING, value: 1 } });
    expect(() => validateNecromancerStructure(dangling)).not.toThrow();
    expect(() => validateCampaignStateV5Candidate(baseV5(dangling))).toThrow(DomainError);
  });

  it("rejects negative and non-safe-integer depth values", () => {
    expect(() => validateNecromancerStructure(initialized({
      depth: { wizardId: WIZ_A, value: -1 },
    }))).toThrow(DomainError);
    expect(() => validateNecromancerStructure(initialized({
      depth: { wizardId: WIZ_A, value: 1.5 },
    }))).toThrow(DomainError);
  });

  it("accepts depth values greater than 3", () => {
    const necromancer = initialized({ depth: { wizardId: WIZ_A, value: 4 } });
    expect(() => validateNecromancerStructure(necromancer)).not.toThrow();
    expect(() => validateCampaignStateV5Candidate(baseV5(necromancer))).not.toThrow();
  });
});

describe("Necromancer Denizen references", () => {
  it("rejects missing Foe, Ally, or Ghoul-Caller Denizens", () => {
    expect(() => validateCampaignStateV5Candidate(baseV5(
      initialized({ foes: [foe({ denizenId: DEN_MISSING })] }),
      defaultWorld(),
    ))).toThrow(DomainError);
    expect(() => validateCampaignStateV5Candidate(baseV5(
      initialized({ allies: [ally({ denizenId: DEN_MISSING })] }),
      defaultWorld(),
    ))).toThrow(DomainError);
    expect(() => validateCampaignStateV5Candidate(baseV5(
      initialized({ ghoulCallers: [ghoul({ denizenId: DEN_MISSING })] }),
      defaultWorld(),
    ))).toThrow(DomainError);
  });

  it("rejects a collective Ghoul-Caller but does not reject collective Foe or Ally solely for being collective", () => {
    const collectiveWorld = defaultWorld({ extraCollective: true });
    expect(() => validateCampaignStateV5Candidate(baseV5(
      initialized({ ghoulCallers: [ghoul({ denizenId: DEN_COLLECTIVE })] }),
      collectiveWorld,
    ))).toThrow(DomainError);
    expect(() => validateCampaignStateV5Candidate(baseV5(
      initialized({ foes: [foe({ denizenId: DEN_COLLECTIVE })] }),
      collectiveWorld,
    ))).not.toThrow();
    expect(() => validateCampaignStateV5Candidate(baseV5(
      initialized({ allies: [ally({ denizenId: DEN_COLLECTIVE })] }),
      collectiveWorld,
    ))).not.toThrow();
  });
});

describe("Necromancer Soul and Petty Dead quantities", () => {
  it("rejects non-positive, non-integer, and duplicate Soul rows", () => {
    expect(() => validateNecromancerStructure(initialized({
      souls: [{ location: gateRef("deep"), count: 0 }],
    }))).toThrow(DomainError);
    expect(() => validateNecromancerStructure(initialized({
      souls: [{ location: gateRef("deep"), count: 1.5 }],
    }))).toThrow(DomainError);
    expect(() => validateNecromancerStructure(initialized({
      souls: [
        { location: gateRef("deep"), count: 1 },
        { location: gateRef("deep"), count: 2 },
      ],
    }))).toThrow(DomainError);
  });

  it("accepts a positive Soul count and a zero Petty-Dead count", () => {
    const necromancer = initialized({
      souls: [{ location: pathRef("edge_sage"), count: 3 }],
      ghoulCallers: [ghoul({ pettyDeadCount: 0 })],
    });
    expect(() => validateNecromancerStructure(necromancer)).not.toThrow();
    expect(() => validateCampaignStateV5Candidate(baseV5(necromancer, defaultWorld()))).not.toThrow();
  });

  it("rejects a negative Petty-Dead count", () => {
    expect(() => validateNecromancerStructure(initialized({
      ghoulCallers: [ghoul({ pettyDeadCount: -1 })],
    }))).toThrow(DomainError);
  });
});

describe("Necromancer Laws, Foes, and Ghoul-Callers", () => {
  it("accepts unique selected Laws without requiring exactly two", () => {
    expect(() => validateNecromancerStructure(initialized({ selectedLaws: [] }))).not.toThrow();
    expect(() => validateNecromancerStructure(initialized({
      selectedLaws: [{ lawId: "third", visibility: "hidden" }],
    }))).not.toThrow();
    expect(() => validateNecromancerStructure(initialized({
      selectedLaws: [
        { lawId: "first", visibility: "revealed" },
        { lawId: "second", visibility: "hidden" },
        { lawId: "seventh", visibility: "revealed" },
      ],
    }))).not.toThrow();
  });

  it("rejects duplicate or unknown selected Laws", () => {
    expect(() => validateNecromancerStructure(initialized({
      selectedLaws: [
        { lawId: "first", visibility: "revealed" },
        { lawId: "first", visibility: "hidden" },
      ],
    }))).toThrow(DomainError);
    expect(() => validateNecromancerStructure(initialized({
      selectedLaws: [{ lawId: "not_a_law" as never, visibility: "revealed" }],
    }))).toThrow(DomainError);
  });

  it("rejects an escaped Foe on the Necromancer seat and requires a valid Abomination kind", () => {
    expect(() => validateNecromancerStructure(initialized({
      foes: [foe({ location: { kind: "escaped", seatId: "necromancer", abominationKind: "occult" } })],
    }))).toThrow(DomainError);
    expect(() => validateNecromancerStructure(initialized({
      foes: [foe({ location: { kind: "escaped", seatId: "hierophant", abominationKind: "ghostly" as never } })],
    }))).toThrow(DomainError);
    expect(() => validateNecromancerStructure(initialized({
      foes: [foe({ location: { kind: "escaped", seatId: "hierophant", abominationKind: "brutal" } })],
    }))).not.toThrow();
  });

  it("rejects a Ghoul-Caller that is not on an Edge-of-Life path space", () => {
    expect(() => validateNecromancerStructure(initialized({
      ghoulCallers: [ghoul({ location: { kind: "path", pathSpaceId: "far_amber" } })],
    }))).toThrow(DomainError);
  });
});

describe("CampaignState V5 Necromancer integration", () => {
  it("requires the Necromancer branch on current V5 and keeps schema version 5", () => {
    expect(CURRENT_STATE_SCHEMA_VERSION).toBe(5);
    expect(SUPPORTED_STATE_SCHEMA_VERSIONS).toEqual([5]);
    const state = initialCampaignState();
    expect(state.schemaVersion).toBe(5);
    expect(state.necromancer).toEqual(EMPTY_NECROMANCER_STATE);
    expect(state.hierophant).toEqual(EMPTY_HIEROPHANT_STATE);
    expect(state.mariner).toEqual(EMPTY_MARINER_STATE);
    expect(() => validateCampaignStateV5Candidate(state)).not.toThrow();
  });

  it("fails closed on missing Necromancer state", () => {
    const { necromancer: _removed, ...rest } = baseV5() as CampaignStateV5 & { necromancer?: unknown };
    expect(() => validateCampaignStateV5Candidate(rest)).toThrow(DomainError);
  });

  it("does not treat Graven Isle or Crypt as Necromancer-owned identities", () => {
    const state = baseV5(initialized());
    expect(state.necromancer).not.toHaveProperty("homeIsleId");
    expect(state.necromancer).not.toHaveProperty("sanctumPlaceId");
    expect(state.necromancer).not.toHaveProperty("gravenIsleId");
    expect(state.necromancer).not.toHaveProperty("cryptPlaceId");
    expect(state.wizards[0]).toHaveProperty("homeIsleId");
    expect(state.wizards[0]).toHaveProperty("sanctumPlaceId");
  });

  it("arrangement catalogs stay static and do not initialize state", () => {
    expect(NECROMANCER_ARRANGEMENT_DEFINITIONS).toHaveLength(3);
    expect(initialized().foes).toEqual([]);
    expect(initialized().souls).toEqual([]);
    expect(NECROMANCER_ARRANGEMENT_DEFINITIONS[2].soulBeyondEachGateWithFurtherOccupiableSpace).toBe(true);
    expect(NECROMANCER_ARRANGEMENT_DEFINITIONS[1].soulPerPresentNonNecromancerEdge).toBe(true);
  });
});
