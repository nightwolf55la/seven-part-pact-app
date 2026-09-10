import { describe, it, expect } from "vitest";
import type {
  CampaignStateV5,
  DenizenId,
  InitializeNecromancerInput,
  IsleId,
  MarinerBoardIsleId,
  MonthOrdinal,
  PlaceId,
  PlayerId,
  PowerfulDenizenMethodEntryId,
  PowerfulDenizenProfile,
  PowerfulDenizenStatus,
  PowerfulDenizenTaxonomyRef,
  WizardId,
} from "../shared/domain";
import {
  DomainError,
  EMPTY_HIEROPHANT_STATE,
  EMPTY_MARINER_STATE,
  EMPTY_NECROMANCER_STATE,
  EMPTY_PACT_FRAGMENT_OPERATIONAL_STATE,
  HIEROPHANT_STARTING_TEMPLE_IDS,
  MARINER_BOARD_ISLE_IDS,
  SEVEN_PART_PACT_DRAFT4_ID,
  SEVEN_PART_PACT_DRAFT4_VERSION,
  applyAddMarinerBeast,
  applyAddNecromancerFoe,
  applyAddNecromancerGhoulCaller,
  applyAddPowerfulDenizenMethod,
  applyAddProphet,
  applyCreateDenizenV5Candidate,
  applyCreatePowerfulDenizenProfile,
  applyCreatePlaceV5Candidate,
  applyEstablishCult,
  applyInitializeHierophant,
  applyInitializeMariner,
  applyInitializeNecromancer,
  applyRemoveCult,
  applyRemoveMarinerBeast,
  applyRemoveNecromancerGhoulCaller,
  applyRemovePowerfulDenizenMethod,
  applyRemovePowerfulDenizenProfile,
  applyRemoveProphet,
  applySetPowerfulDenizenStatus,
  applySetPowerfulDenizenTaxonomies,
  applyUpdateCult,
  applyUpdateMarinerBeast,
  applyUpdateNecromancerGhoulCaller,
  applyUpdateProphet,
  hierophantStartingTempleDisplayName,
  isNecromancerDenizenFoe,
  validateCampaignStateV5Candidate,
} from "../shared/domain";

const PLR_A = "plr_00000000-0000-0000-0000-00000000000a" as PlayerId;
const WIZ_A = "wiz_00000000-0000-0000-0000-00000000000a" as WizardId;
const DEN_1 = "den_00000000-0000-0000-0000-000000000001" as DenizenId;
const DEN_2 = "den_00000000-0000-0000-0000-000000000002" as DenizenId;
const DEN_5 = "den_00000000-0000-0000-0000-000000000005" as DenizenId;
const DEN_6 = "den_00000000-0000-0000-0000-000000000006" as DenizenId;
const DEN_7 = "den_00000000-0000-0000-0000-000000000007" as DenizenId;
const DEN_8 = "den_00000000-0000-0000-0000-000000000008" as DenizenId;
const DEN_9 = "den_00000000-0000-0000-0000-000000000009" as DenizenId;
const DEN_CULT = "den_00000000-0000-0000-0000-0000000000cc" as DenizenId;
const SHIP = "plc_00000000-0000-0000-0000-0000000000aa" as PlaceId;
const MTH_RAMP = "pdmth_00000000-0000-0000-0000-0000000000b1" as PowerfulDenizenMethodEntryId;

const EMPTY_PACT_SEATS = {
  necromancer: { status: null, wizardId: null, watcherPlayerId: null },
  hierophant: { status: null, wizardId: null, watcherPlayerId: null },
  warlock: { status: null, wizardId: null, watcherPlayerId: null },
  mariner: { status: null, wizardId: null, watcherPlayerId: null },
  faustian: { status: null, wizardId: null, watcherPlayerId: null },
  sage: { status: null, wizardId: null, watcherPlayerId: null },
  sorcerer: { status: null, wizardId: null, watcherPlayerId: null },
} as const;

const FOE_PROFILE: PowerfulDenizenProfile = {
  taxonomies: [{ kind: "builtin", taxonomyId: "foe_of_death" }],
  status: { kind: "standard", value: "malignant" },
  goal: null,
  methods: [],
  truths: [],
};

function expectCode(fn: () => unknown, code: DomainError["code"]): void {
  try {
    fn();
  } catch (error) {
    expect(error).toBeInstanceOf(DomainError);
    expect((error as DomainError).code).toBe(code);
    return;
  }
  throw new Error(`expected DomainError ${code}`);
}

function profileOf(
  taxonomies: readonly PowerfulDenizenTaxonomyRef[],
  status: PowerfulDenizenStatus,
  methods: PowerfulDenizenProfile["methods"] = [],
): PowerfulDenizenProfile {
  return { taxonomies: [...taxonomies], status, goal: null, methods: [...methods], truths: [] };
}

function denizen(
  denizenId: DenizenId,
  name: string,
  representation: "individual" | "collective",
  powerfulProfile: PowerfulDenizenProfile | null,
) {
  return {
    denizenId,
    name,
    representation,
    description: null,
    mortalityState: representation === "individual" ? "not_deceased" as const : null,
    powerfulProfile,
  };
}

function isleId(n: number): IsleId {
  return `isl_00000000-0000-0000-0000-${String(n).padStart(12, "0")}` as IsleId;
}

function placeId(n: number): PlaceId {
  return `plc_00000000-0000-0000-0000-${String(n).padStart(12, "0")}` as PlaceId;
}

function worldIsleIds(): Record<MarinerBoardIsleId, IsleId> {
  const bindings = {} as Record<MarinerBoardIsleId, IsleId>;
  MARINER_BOARD_ISLE_IDS.forEach((id, index) => {
    bindings[id] = isleId(index + 1);
  });
  return bindings;
}

function baseV5(denizens: ReturnType<typeof denizen>[] = []): CampaignStateV5 {
  const bindings = worldIsleIds();
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
    pactSeats: { ...EMPTY_PACT_SEATS },
    pactFragmentOperationalState: EMPTY_PACT_FRAGMENT_OPERATIONAL_STATE,
    lifecycle: {
      kind: "setup",
      orrery: { saturn: null, jupiter: null, mars: null, venus: null, mercury: null },
    },
    wizardmootHistory: [],
    world: {
      denizens,
      isles: MARINER_BOARD_ISLE_IDS.map((id) => ({
        isleId: bindings[id],
        name: id,
        description: null,
      })),
      places: [
        { placeId: SHIP, name: "The Mariner's Ship", description: null, placement: { kind: "mobile" as const, associatedIsleId: null } },
      ],
      companionRelationships: [],
      campaignPowerfulDenizenTaxonomies: [],
      treasures: [],
    },
    hierophant: { ...EMPTY_HIEROPHANT_STATE },
    mariner: { ...EMPTY_MARINER_STATE },
    necromancer: { ...EMPTY_NECROMANCER_STATE },
  };
}

function quietNecromancerInput(): InitializeNecromancerInput {
  return {
    arrangementId: "quiet",
    selectedLawIds: ["first", "second"],
    arrangementFoes: [
      { denizenId: DEN_1, gateId: "deep" },
      { denizenId: DEN_2, gateId: "terminus" },
    ],
    arrangementAlly: { denizenId: DEN_5, gateId: "amber" },
    arrangementGhoulCaller: null,
  };
}

function necromancerWorld(extra: ReturnType<typeof denizen>[] = []) {
  return [
    denizen(DEN_1, "Deep Foe", "individual", FOE_PROFILE),
    denizen(DEN_2, "Terminus Foe", "individual", FOE_PROFILE),
    denizen(DEN_5, "Near Ally", "individual", null),
    ...extra,
  ];
}

function initNecromancer(extra: ReturnType<typeof denizen>[] = []) {
  return applyInitializeNecromancer(baseV5(necromancerWorld(extra)), quietNecromancerInput()).nextState;
}

function initHierophant(state: CampaignStateV5 = baseV5()) {
  let next = state;
  HIEROPHANT_STARTING_TEMPLE_IDS.forEach((templeId, index) => {
    next = applyCreatePlaceV5Candidate(next, {
      placeId: placeId(index + 1),
      name: hierophantStartingTempleDisplayName(templeId),
      description: null,
      placement: { kind: "unspecified" },
    }).nextState;
  });
  return applyInitializeHierophant(next, {
    selectedFlameLawIds: ["first", "second"],
    templePlaces: HIEROPHANT_STARTING_TEMPLE_IDS.map((templeId, index) => ({
      templeId,
      placeId: placeId(index + 1),
    })),
  }).nextState;
}

function initMariner(state: CampaignStateV5 = baseV5()) {
  const bindings = worldIsleIds();
  return applyInitializeMariner(state, {
    arrangementId: "quiet",
    shipPlaceId: SHIP,
    selectedLawOfSeaIds: ["first", "seventh"],
    isleBindings: MARINER_BOARD_ISLE_IDS.map((boardIsleId) => ({
      boardIsleId,
      worldIsleId: bindings[boardIsleId],
    })),
    arrangementBeasts: [],
    rarityDescriptions: [],
  }).nextState;
}

function createDenizen(
  state: CampaignStateV5,
  denizenId: DenizenId,
  representation: "individual" | "collective",
  taxonomies?: readonly PowerfulDenizenTaxonomyRef[],
  status?: PowerfulDenizenStatus,
) {
  let next = applyCreateDenizenV5Candidate(state, {
    denizenId,
    name: representation === "individual" ? `Person ${denizenId}` : `Group ${denizenId}`,
    representation,
    description: null,
  }).nextState;
  if (taxonomies === undefined || status === undefined) return next;
  return applyCreatePowerfulDenizenProfile(next, {
    denizenId,
    taxonomies,
    status,
    goal: null,
  }).nextState;
}

function ghoulCaller(denizenId: DenizenId) {
  return {
    denizenId,
    location: { kind: "path" as const, pathSpaceId: "edge_sage" as const },
    pettyDeadCount: 0,
    primaryElement: "fire" as const,
    aesthetic: "ash-stained funeral silks",
    strangeQuirk: "counts backwards from thirteen",
    ageYears: 47,
  };
}

function distrustingBeast(denizenId: DenizenId) {
  return {
    denizenId,
    element: "water" as const,
    definitionId: "kraken" as const,
    condition: "distrusting" as const,
    location: { kind: "sea_region" as const, regionId: "sunken_fleet" as const },
  };
}

describe("D2B Ghoul-Caller shared Powerful profile", () => {
  it("requires a ghoul_caller profile and accepts only Reliable or Disruptive Status", () => {
    const missing = initNecromancer([denizen(DEN_6, "Unprofiled", "individual", null)]);
    expectCode(() => applyAddNecromancerGhoulCaller(missing, ghoulCaller(DEN_6)), "INVALID_CAMPAIGN_STATE");

    const companion = initNecromancer([denizen(DEN_6, "Companion Ghoul", "individual", profileOf(
      [{ kind: "builtin", taxonomyId: "ghoul_caller" }],
      { kind: "standard", value: "companion" },
    ))]);
    expectCode(() => applyAddNecromancerGhoulCaller(companion, ghoulCaller(DEN_6)), "INVALID_CAMPAIGN_STATE");

    const reliable = initNecromancer([denizen(DEN_6, "Reliable Ghoul", "individual", profileOf(
      [{ kind: "builtin", taxonomyId: "ghoul_caller" }],
      { kind: "standard", value: "reliable" },
    ))]);
    const added = applyAddNecromancerGhoulCaller(reliable, ghoulCaller(DEN_6)).nextState;
    expect(added.necromancer.ghoulCallers[0]).not.toHaveProperty("disposition");
    expect(added.world.denizens.find((d) => d.denizenId === DEN_6)?.powerfulProfile?.status).toEqual({
      kind: "standard",
      value: "reliable",
    });
  });

  it("rejects Companion, Malignant, and other Status while the role is active", () => {
    const state = applyAddNecromancerGhoulCaller(
      initNecromancer([denizen(DEN_6, "Ghoul", "individual", profileOf(
        [{ kind: "builtin", taxonomyId: "ghoul_caller" }],
        { kind: "standard", value: "disruptive" },
      ))]),
      ghoulCaller(DEN_6),
    ).nextState;
    const current = { kind: "standard" as const, value: "disruptive" as const };
    expectCode(() => applySetPowerfulDenizenStatus(state, DEN_6, {
      expected: current,
      value: { kind: "standard", value: "companion" },
    }), "INVALID_CAMPAIGN_STATE");
    expectCode(() => applySetPowerfulDenizenStatus(state, DEN_6, {
      expected: current,
      value: { kind: "standard", value: "malignant" },
    }), "INVALID_CAMPAIGN_STATE");
    expectCode(() => applySetPowerfulDenizenStatus(state, DEN_6, {
      expected: current,
      value: { kind: "other", label: "haunted" },
    }), "INVALID_CAMPAIGN_STATE");
  });

  it("shared Status edits preserve Necromancer-specific fields; overlay never stores disposition", () => {
    let state = applyAddNecromancerGhoulCaller(
      initNecromancer([denizen(DEN_6, "Ghoul", "individual", profileOf(
        [{ kind: "builtin", taxonomyId: "ghoul_caller" }],
        { kind: "standard", value: "disruptive" },
      ))]),
      ghoulCaller(DEN_6),
    ).nextState;
    state = applyUpdateNecromancerGhoulCaller(state, DEN_6, {
      pettyDeadCount: { expected: 0, value: 3 },
      aesthetic: { expected: "ash-stained funeral silks", value: "salt shroud" },
    }).nextState;
    const flipped = applySetPowerfulDenizenStatus(state, DEN_6, {
      expected: { kind: "standard", value: "disruptive" },
      value: { kind: "standard", value: "reliable" },
    }).nextState;
    expect(flipped.necromancer.ghoulCallers[0]).toMatchObject({
      pettyDeadCount: 3,
      aesthetic: "salt shroud",
      primaryElement: "fire",
      strangeQuirk: "counts backwards from thirteen",
      ageYears: 47,
    });
    expect(flipped.necromancer.ghoulCallers[0]).not.toHaveProperty("disposition");
  });

  it("rejects profile or taxonomy removal while active, and leaves the profile after role removal", () => {
    const withRole = applyAddNecromancerGhoulCaller(
      initNecromancer([denizen(DEN_6, "Ghoul", "individual", profileOf(
        [{ kind: "builtin", taxonomyId: "ghoul_caller" }],
        { kind: "standard", value: "disruptive" },
      ))]),
      ghoulCaller(DEN_6),
    ).nextState;
    const profile = withRole.world.denizens.find((d) => d.denizenId === DEN_6)!.powerfulProfile!;
    expectCode(() => applyRemovePowerfulDenizenProfile(withRole, DEN_6, profile), "INVALID_CAMPAIGN_STATE");
    expectCode(() => applySetPowerfulDenizenTaxonomies(withRole, DEN_6, {
      expected: profile.taxonomies,
      value: [{ kind: "builtin", taxonomyId: "beast" }],
    }), "INVALID_CAMPAIGN_STATE");

    const removed = applyRemoveNecromancerGhoulCaller(
      withRole,
      DEN_6,
      withRole.necromancer.ghoulCallers[0],
    ).nextState;
    expect(removed.necromancer.ghoulCallers).toEqual([]);
    expect(removed.world.denizens.find((d) => d.denizenId === DEN_6)?.powerfulProfile).toEqual(profile);
    expect(() => applyRemovePowerfulDenizenProfile(removed, DEN_6, profile)).not.toThrow();
  });

  it("Explosive starting Ghoul-Caller requires Disruptive shared Status already on the profile", () => {
    const farFoes = [
      denizen(DEN_7, "Far One", "individual", FOE_PROFILE),
      denizen(DEN_8, "Far Two", "individual", FOE_PROFILE),
    ];
    const reliableWorld = necromancerWorld([
      denizen(DEN_6, "Ghoul", "individual", profileOf(
        [{ kind: "builtin", taxonomyId: "ghoul_caller" }],
        { kind: "standard", value: "reliable" },
      )),
      ...farFoes,
    ]);
    expectCode(() => applyInitializeNecromancer(baseV5(reliableWorld), {
      arrangementId: "explosive",
      selectedLawIds: ["fifth", "sixth"],
      arrangementFoes: [
        { denizenId: DEN_1, gateId: "deep" },
        { denizenId: DEN_2, gateId: "terminus" },
        { denizenId: DEN_7, gateId: "marching" },
        { denizenId: DEN_8, gateId: "churning" },
      ],
      arrangementAlly: { denizenId: DEN_5, gateId: "amber" },
      arrangementGhoulCaller: {
        denizenId: DEN_6,
        pathSpaceId: "edge_sage",
        primaryElement: "fire",
        aesthetic: "ash-stained funeral silks",
        strangeQuirk: "counts backwards from thirteen",
        ageYears: 47,
      },
    }), "INVALID_CAMPAIGN_STATE");

    const disruptiveWorld = [
      ...necromancerWorld([denizen(DEN_6, "Ghoul", "individual", profileOf(
        [{ kind: "builtin", taxonomyId: "ghoul_caller" }],
        { kind: "standard", value: "disruptive" },
      ))]),
      ...farFoes,
    ];
    const started = applyInitializeNecromancer(baseV5(disruptiveWorld), {
      arrangementId: "explosive",
      selectedLawIds: ["fifth", "sixth"],
      arrangementFoes: [
        { denizenId: DEN_1, gateId: "deep" },
        { denizenId: DEN_2, gateId: "terminus" },
        { denizenId: DEN_7, gateId: "marching" },
        { denizenId: DEN_8, gateId: "churning" },
      ],
      arrangementAlly: { denizenId: DEN_5, gateId: "amber" },
      arrangementGhoulCaller: {
        denizenId: DEN_6,
        pathSpaceId: "edge_sage",
        primaryElement: "fire",
        aesthetic: "ash-stained funeral silks",
        strangeQuirk: "counts backwards from thirteen",
        ageYears: 47,
      },
    }).nextState;
    expect(started.necromancer.ghoulCallers[0]).not.toHaveProperty("disposition");
    expect(started.world.denizens.find((d) => d.denizenId === DEN_6)?.powerfulProfile?.status).toEqual({
      kind: "standard",
      value: "disruptive",
    });
  });
});

describe("D2B Prophet shared Powerful profile", () => {
  it("requires a prophet profile with Reliable or Disruptive Status", () => {
    let state = initHierophant();
    state = createDenizen(state, DEN_6, "individual");
    expectCode(() => applyAddProphet(state, {
      denizenId: DEN_6,
      host: { kind: "temple", templeId: "notor" },
    }), "INVALID_CAMPAIGN_STATE");

    state = createDenizen(baseV5(), DEN_6, "individual", [{ kind: "builtin", taxonomyId: "prophet" }], {
      kind: "standard",
      value: "malignant",
    });
    state = initHierophant(state);
    expectCode(() => applyAddProphet(state, {
      denizenId: DEN_6,
      host: { kind: "temple", templeId: "notor" },
    }), "INVALID_CAMPAIGN_STATE");

    state = createDenizen(baseV5(), DEN_6, "individual", [{ kind: "builtin", taxonomyId: "prophet" }], {
      kind: "standard",
      value: "reliable",
    });
    state = applyAddProphet(initHierophant(state), {
      denizenId: DEN_6,
      host: { kind: "temple", templeId: "notor" },
    }).nextState;
    expect(state.hierophant.prophets[0]).toEqual({
      denizenId: DEN_6,
      host: { kind: "temple", templeId: "notor" },
    });
    expect(state.hierophant.prophets[0]).not.toHaveProperty("disposition");
  });

  it("host update does not mutate Status; shared Status edit preserves host", () => {
    let state = createDenizen(baseV5(), DEN_6, "individual", [{ kind: "builtin", taxonomyId: "prophet" }], {
      kind: "standard",
      value: "reliable",
    });
    state = applyAddProphet(initHierophant(state), {
      denizenId: DEN_6,
      host: { kind: "temple", templeId: "ushin" },
    }).nextState;
    const afterHost = applyUpdateProphet(state, DEN_6, {
      host: {
        expected: { kind: "temple", templeId: "ushin" },
        value: { kind: "temple", templeId: "krolis" },
      },
    }).nextState;
    expect(afterHost.world.denizens.find((d) => d.denizenId === DEN_6)?.powerfulProfile?.status).toEqual({
      kind: "standard",
      value: "reliable",
    });
    const afterStatus = applySetPowerfulDenizenStatus(afterHost, DEN_6, {
      expected: { kind: "standard", value: "reliable" },
      value: { kind: "standard", value: "disruptive" },
    }).nextState;
    expect(afterStatus.hierophant.prophets[0]?.host).toEqual({ kind: "temple", templeId: "krolis" });
    expectCode(() => applySetPowerfulDenizenStatus(afterStatus, DEN_6, {
      expected: { kind: "standard", value: "disruptive" },
      value: { kind: "standard", value: "companion" },
    }), "INVALID_CAMPAIGN_STATE");
  });

  it("rejects profile/taxonomy removal while active and leaves the profile after role removal", () => {
    let state = createDenizen(baseV5(), DEN_6, "individual", [{ kind: "builtin", taxonomyId: "prophet" }], {
      kind: "standard",
      value: "disruptive",
    });
    state = applyAddProphet(initHierophant(state), {
      denizenId: DEN_6,
      host: { kind: "temple", templeId: "notor" },
    }).nextState;
    const profile = state.world.denizens.find((d) => d.denizenId === DEN_6)!.powerfulProfile!;
    expectCode(() => applyRemovePowerfulDenizenProfile(state, DEN_6, profile), "INVALID_CAMPAIGN_STATE");
    expectCode(() => applySetPowerfulDenizenTaxonomies(state, DEN_6, {
      expected: profile.taxonomies,
      value: [{ kind: "builtin", taxonomyId: "beast" }],
    }), "INVALID_CAMPAIGN_STATE");
    const removed = applyRemoveProphet(state, DEN_6).nextState;
    expect(removed.hierophant.prophets).toEqual([]);
    expect(removed.world.denizens.find((d) => d.denizenId === DEN_6)?.powerfulProfile).toEqual(profile);
  });
});

describe("D2B Cult shared Powerful profile", () => {
  it("requires a collective Denizen with cult taxonomy and explicit shared Status", () => {
    let state = initHierophant();
    state = createDenizen(state, DEN_6, "individual");
    expectCode(() => applyEstablishCult(state, {
      cultDenizenId: DEN_6,
      hostSeatId: "warlock",
      anchorPlaceId: null,
      leaderDenizenId: null,
      blasphemyId: "law_of_the_wolf",
      abundance: 1,
      conviction: 2,
      dogmas: [],
    }), "INVALID_CAMPAIGN_STATE");

    state = createDenizen(baseV5(), DEN_CULT, "collective");
    state = initHierophant(state);
    expectCode(() => applyEstablishCult(state, {
      cultDenizenId: DEN_CULT,
      hostSeatId: "warlock",
      anchorPlaceId: null,
      leaderDenizenId: null,
      blasphemyId: "law_of_the_wolf",
      abundance: 1,
      conviction: 2,
      dogmas: [],
    }), "INVALID_CAMPAIGN_STATE");

    state = createDenizen(baseV5(), DEN_6, "individual");
    state = createDenizen(state, DEN_CULT, "collective", [{ kind: "builtin", taxonomyId: "cult" }], {
      kind: "standard",
      value: "malignant",
    });
    state = applyEstablishCult(initHierophant(state), {
      cultDenizenId: DEN_CULT,
      hostSeatId: "warlock",
      anchorPlaceId: null,
      leaderDenizenId: DEN_6,
      blasphemyId: "law_of_the_wolf",
      abundance: 4,
      conviction: 1,
      dogmas: [],
    }).nextState;
    expect(state.world.denizens.find((d) => d.denizenId === DEN_6)?.powerfulProfile).toBeNull();
    expect(state.world.denizens.find((d) => d.denizenId === DEN_CULT)?.powerfulProfile?.taxonomies).toEqual([
      { kind: "builtin", taxonomyId: "cult" },
    ]);
    const before = state.world.denizens.find((d) => d.denizenId === DEN_CULT)?.powerfulProfile?.status;
    const updated = applyUpdateCult(state, DEN_CULT, {
      abundance: { expected: 4, value: 0 },
      conviction: { expected: 1, value: 5 },
      blasphemyId: { expected: "law_of_the_wolf", value: "destroy_trappings_of_modernity" },
    }).nextState;
    expect(updated.world.denizens.find((d) => d.denizenId === DEN_CULT)?.powerfulProfile?.status).toEqual(before);
    const profile = updated.world.denizens.find((d) => d.denizenId === DEN_CULT)!.powerfulProfile!;
    expectCode(() => applyRemovePowerfulDenizenProfile(updated, DEN_CULT, profile), "INVALID_CAMPAIGN_STATE");
    const removed = applyRemoveCult(updated, DEN_CULT).nextState;
    expect(removed.hierophant.cults).toEqual([]);
    expect(removed.world.denizens.find((d) => d.denizenId === DEN_CULT)?.powerfulProfile).toEqual(profile);
  });
});

describe("D2B Beast shared Powerful profile", () => {
  it("requires an individual Beast profile whose Status is independent of condition", () => {
    const unprofiled = createDenizen(baseV5(), DEN_9, "individual");
    expectCode(() => applyAddMarinerBeast(initMariner(unprofiled), distrustingBeast(DEN_9)), "INVALID_CAMPAIGN_STATE");

    let state = createDenizen(baseV5(), DEN_9, "individual", [{ kind: "builtin", taxonomyId: "beast" }], {
      kind: "standard",
      value: "companion",
    });
    state = applyAddMarinerBeast(initMariner(state), distrustingBeast(DEN_9)).nextState;
    const nested = applyUpdateMarinerBeast(state, DEN_9, {
      condition: { expected: "distrusting", value: "friendly_nesting" },
      location: {
        expected: { kind: "sea_region", regionId: "sunken_fleet" },
        value: { kind: "board_isle", boardIsleId: "tahv" },
      },
    }).nextState;
    expect(nested.mariner.beasts[0]?.condition).toBe("friendly_nesting");
    expect(nested.world.denizens.find((d) => d.denizenId === DEN_9)?.powerfulProfile?.status).toEqual({
      kind: "standard",
      value: "companion",
    });
    expect(nested.world.denizens.find((d) => d.denizenId === DEN_9)?.powerfulProfile?.methods).toEqual([]);
  });

  it("rampaging requires a standard Rampaging Method already present; non-rampaging does not", () => {
    let state = createDenizen(baseV5(), DEN_9, "individual", [{ kind: "builtin", taxonomyId: "beast" }], {
      kind: "standard",
      value: "malignant",
    });
    state = applyAddMarinerBeast(initMariner(state), distrustingBeast(DEN_9)).nextState;
    expectCode(() => applyUpdateMarinerBeast(state, DEN_9, {
      condition: { expected: "distrusting", value: "rampaging" },
    }), "INVALID_CAMPAIGN_STATE");

    const withMethod = applyAddPowerfulDenizenMethod(state, {
      denizenId: DEN_9,
      methodEntryId: MTH_RAMP,
      definition: { kind: "standard", method: "rampaging" },
    }).nextState;
    expect(withMethod.mariner.beasts[0]?.condition).toBe("distrusting");
    const rampaging = applyUpdateMarinerBeast(withMethod, DEN_9, {
      condition: { expected: "distrusting", value: "rampaging" },
    }).nextState;
    expect(rampaging.mariner.beasts[0]?.condition).toBe("rampaging");
    expect(rampaging.world.denizens.find((d) => d.denizenId === DEN_9)?.powerfulProfile?.status).toEqual({
      kind: "standard",
      value: "malignant",
    });
    const method = rampaging.world.denizens.find((d) => d.denizenId === DEN_9)!.powerfulProfile!.methods[0];
    expectCode(() => applyRemovePowerfulDenizenMethod(rampaging, DEN_9, MTH_RAMP, method), "INVALID_CAMPAIGN_STATE");

    const removed = applyRemoveMarinerBeast(rampaging, DEN_9, rampaging.mariner.beasts[0]).nextState;
    expect(removed.mariner.beasts).toEqual([]);
    expect(removed.world.denizens.find((d) => d.denizenId === DEN_9)?.powerfulProfile).not.toBeNull();
  });
});

describe("D2B cross-domain shared commands", () => {
  it("keeps multiple taxonomies and represents Prophet + foe_of_death without duplicated Truth authority", () => {
    let state = createDenizen(baseV5(), DEN_1, "individual", [{ kind: "builtin", taxonomyId: "foe_of_death" }], {
      kind: "standard",
      value: "malignant",
    });
    state = createDenizen(state, DEN_2, "individual", [{ kind: "builtin", taxonomyId: "foe_of_death" }], {
      kind: "standard",
      value: "malignant",
    });
    state = createDenizen(state, DEN_5, "individual");
    state = createDenizen(state, DEN_6, "individual", [
      { kind: "builtin", taxonomyId: "prophet" },
      { kind: "builtin", taxonomyId: "foe_of_death" },
    ], { kind: "standard", value: "reliable" });
    state = applyInitializeNecromancer(state, quietNecromancerInput()).nextState;
    state = applyAddProphet(initHierophant(state), {
      denizenId: DEN_6,
      host: { kind: "temple", templeId: "notor" },
    }).nextState;
    const addedFoe = applyAddNecromancerFoe(state, {
      subject: { kind: "denizen", denizenId: DEN_6 },
      location: { kind: "gate", gateId: "amber" },
    }).nextState;
    const foe = addedFoe.necromancer.foes.find((candidate) => (
      candidate.subject.kind === "denizen" && candidate.subject.denizenId === DEN_6
    ));
    expect(foe && isNecromancerDenizenFoe(foe)).toBe(true);
    expect(foe).not.toHaveProperty("truths");
    const profile = addedFoe.world.denizens.find((d) => d.denizenId === DEN_6)!.powerfulProfile!;
    expect(profile.taxonomies).toEqual([
      { kind: "builtin", taxonomyId: "prophet" },
      { kind: "builtin", taxonomyId: "foe_of_death" },
    ]);
    expect(profile.truths).toEqual([]);
    expect(() => applySetPowerfulDenizenTaxonomies(addedFoe, DEN_6, {
      expected: profile.taxonomies,
      value: [
        { kind: "builtin", taxonomyId: "prophet" },
        { kind: "builtin", taxonomyId: "foe_of_death" },
        { kind: "builtin", taxonomyId: "beast" },
      ],
    })).not.toThrow();
  });

  it("still requires foe_of_death on an active Denizen Foe", () => {
    const state = initNecromancer();
    const profile = state.world.denizens.find((d) => d.denizenId === DEN_1)!.powerfulProfile!;
    expectCode(() => applySetPowerfulDenizenTaxonomies(state, DEN_1, {
      expected: profile.taxonomies,
      value: [{ kind: "builtin", taxonomyId: "beast" }],
    }), "INVALID_CAMPAIGN_STATE");
    expectCode(() => applyRemovePowerfulDenizenProfile(state, DEN_1, profile), "INVALID_CAMPAIGN_STATE");
  });
});

describe("D2B persisted-state fail-closed", () => {
  it("does not silently normalize leftover Ghoul-Caller or Prophet disposition fields", () => {
    const ghoulState = applyAddNecromancerGhoulCaller(
      initNecromancer([denizen(DEN_6, "Ghoul", "individual", profileOf(
        [{ kind: "builtin", taxonomyId: "ghoul_caller" }],
        { kind: "standard", value: "disruptive" },
      ))]),
      ghoulCaller(DEN_6),
    ).nextState;
    const leftoverGhoul = {
      ...ghoulState,
      necromancer: {
        ...ghoulState.necromancer,
        ghoulCallers: ghoulState.necromancer.ghoulCallers.map((ghoul) => ({
          ...ghoul,
          disposition: "disruptive",
        })),
      },
    };
    expect(() => validateCampaignStateV5Candidate(leftoverGhoul)).toThrow(DomainError);

    let prophetState = createDenizen(baseV5(), DEN_6, "individual", [{ kind: "builtin", taxonomyId: "prophet" }], {
      kind: "standard",
      value: "reliable",
    });
    prophetState = applyAddProphet(initHierophant(prophetState), {
      denizenId: DEN_6,
      host: { kind: "temple", templeId: "notor" },
    }).nextState;
    const leftoverProphet = {
      ...prophetState,
      hierophant: {
        ...prophetState.hierophant,
        prophets: prophetState.hierophant.prophets.map((prophet) => ({
          ...prophet,
          disposition: "reliable",
        })),
      },
    };
    expect(() => validateCampaignStateV5Candidate(leftoverProphet)).toThrow(DomainError);
  });

  it("fails closed when restored or imported V5 contains an active role without its required profile", () => {
    const ghoulState = applyAddNecromancerGhoulCaller(
      initNecromancer([denizen(DEN_6, "Ghoul", "individual", profileOf(
        [{ kind: "builtin", taxonomyId: "ghoul_caller" }],
        { kind: "standard", value: "disruptive" },
      ))]),
      ghoulCaller(DEN_6),
    ).nextState;
    expect(() => validateCampaignStateV5Candidate(ghoulState)).not.toThrow();
    const strippedGhoul = {
      ...ghoulState,
      world: {
        ...ghoulState.world,
        denizens: ghoulState.world.denizens.map((candidate) => (
          candidate.denizenId === DEN_6 ? { ...candidate, powerfulProfile: null } : candidate
        )),
      },
    };
    expect(() => validateCampaignStateV5Candidate(strippedGhoul)).toThrow(DomainError);

    let prophetState = createDenizen(baseV5(), DEN_6, "individual", [{ kind: "builtin", taxonomyId: "prophet" }], {
      kind: "standard",
      value: "reliable",
    });
    prophetState = applyAddProphet(initHierophant(prophetState), {
      denizenId: DEN_6,
      host: { kind: "temple", templeId: "notor" },
    }).nextState;
    const strippedProphet = {
      ...prophetState,
      world: {
        ...prophetState.world,
        denizens: prophetState.world.denizens.map((candidate) => (
          candidate.denizenId === DEN_6 ? { ...candidate, powerfulProfile: null } : candidate
        )),
      },
    };
    expect(() => validateCampaignStateV5Candidate(strippedProphet)).toThrow(DomainError);

    let cultState = createDenizen(baseV5(), DEN_CULT, "collective", [{ kind: "builtin", taxonomyId: "cult" }], {
      kind: "standard",
      value: "reliable",
    });
    cultState = applyEstablishCult(initHierophant(cultState), {
      cultDenizenId: DEN_CULT,
      hostSeatId: "warlock",
      anchorPlaceId: null,
      leaderDenizenId: null,
      blasphemyId: "law_of_the_wolf",
      abundance: 1,
      conviction: 1,
      dogmas: [],
    }).nextState;
    const strippedCult = {
      ...cultState,
      world: {
        ...cultState.world,
        denizens: cultState.world.denizens.map((candidate) => (
          candidate.denizenId === DEN_CULT ? { ...candidate, powerfulProfile: null } : candidate
        )),
      },
    };
    expect(() => validateCampaignStateV5Candidate(strippedCult)).toThrow(DomainError);

    let beastState = createDenizen(baseV5(), DEN_9, "individual", [{ kind: "builtin", taxonomyId: "beast" }], {
      kind: "standard",
      value: "malignant",
    });
    beastState = applyAddMarinerBeast(initMariner(beastState), distrustingBeast(DEN_9)).nextState;
    const strippedBeast = {
      ...beastState,
      world: {
        ...beastState.world,
        denizens: beastState.world.denizens.map((candidate) => (
          candidate.denizenId === DEN_9 ? { ...candidate, powerfulProfile: null } : candidate
        )),
      },
    };
    expect(() => validateCampaignStateV5Candidate(strippedBeast)).toThrow(DomainError);
  });
});
