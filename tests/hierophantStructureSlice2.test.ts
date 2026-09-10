import { describe, it, expect } from "vitest";
import type {
  CampaignStateV5,
  DenizenId,
  HierophantCampaignClassId,
  HierophantCampaignDoctrineId,
  HierophantCampaignTempleId,
  HierophantDogmaEntryId,
  MonthOrdinal,
  PlaceId,
  PlayerId,
  WizardId,
} from "../shared/domain";
import {
  CAMPAIGN_COMMAND_TYPES,
  DomainError,
  EMPTY_HIEROPHANT_STATE,
  EMPTY_MARINER_STATE,
  EMPTY_NECROMANCER_STATE,
  EMPTY_SHARED_WORLD_STATE,
  HIEROPHANT_BUILTIN_DOCTRINE_DEFINITIONS,
  HIEROPHANT_BUILTIN_DOGMA_DEFINITIONS,
  HIEROPHANT_STARTING_TEMPLE_IDS,
  SEVEN_PART_PACT_DRAFT4_ID,
  SEVEN_PART_PACT_DRAFT4_VERSION,
  addSupplicantFingerprint,
  applyAddCultDogma,
  applyAddProphet,
  applyAddSupplicant,
  applyAdjustTempleResources,
  applyCreateCampaignClass,
  applyCreateCampaignDoctrine,
  applyCreateDenizenV5Candidate,
  applyCreatePlaceV5Candidate,
  applyCreateTemple,
  applyEstablishCult,
  applyInitializeHierophant,
  applyRemoveCult,
  applyRemoveCultDogma,
  applyRemoveProphet,
  applyRemoveSupplicant,
  applySetSelectedFlameLaws,
  applySetTempleHoliday,
  applyUpdateCult,
  applyUpdateCultDogma,
  applyUpdateSupplicant,
  applyUpdateTemple,
  hierophantStartingTempleDisplayName,
  isLogicalStateCommandType,
  validateCampaignState,
  validateCampaignStateV5Candidate,
  EMPTY_PACT_FRAGMENT_OPERATIONAL_STATE,
} from "../shared/domain";
import { validateEventCoherenceForTest } from "../convex/canonicalCommit";
import type { CanonicalCommitInput } from "../convex/canonicalCommit";
import {
  executeOrdinaryLogicalCommand,
  type CanonicalCampaign,
  type OrdinaryLogicalCommandIo,
} from "../convex/ordinaryLogicalCommand";

const CAMPAIGN_A = "cmp_00000000-0000-0000-0000-000000000001";
const CAMPAIGN_B = "cmp_00000000-0000-0000-0000-000000000002";
const COMMAND_1 = "cmd_00000000-0000-0000-0000-000000000001";
const PLR_A = "plr_00000000-0000-0000-0000-00000000000a" as PlayerId;
const WIZ_A = "wiz_00000000-0000-0000-0000-00000000000a" as WizardId;

function placeId(n: number): PlaceId {
  return `plc_00000000-0000-0000-0000-${String(n).padStart(12, "0")}` as PlaceId;
}
function denizenId(n: number): DenizenId {
  return `den_00000000-0000-0000-0000-${String(n).padStart(12, "0")}` as DenizenId;
}
function campaignTempleId(n: number): HierophantCampaignTempleId {
  return `htm_00000000-0000-0000-0000-${String(n).padStart(12, "0")}` as HierophantCampaignTempleId;
}
function campaignClassId(n: number): HierophantCampaignClassId {
  return `hcl_00000000-0000-0000-0000-${String(n).padStart(12, "0")}` as HierophantCampaignClassId;
}
function campaignDoctrineId(n: number): HierophantCampaignDoctrineId {
  return `hdc_00000000-0000-0000-0000-${String(n).padStart(12, "0")}` as HierophantCampaignDoctrineId;
}
function campaignBlasphemyId(n: number): string {
  return `hbl_00000000-0000-0000-0000-${String(n).padStart(12, "0")}`;
}
function dogmaEntryId(n: number): HierophantDogmaEntryId {
  return `hdg_00000000-0000-0000-0000-${String(n).padStart(12, "0")}` as HierophantDogmaEntryId;
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
    next = applyCreatePlaceV5Candidate(next, {
      placeId: placeId(index + 1),
      name: hierophantStartingTempleDisplayName(templeId),
      description: null,
      placement: { kind: "unspecified" },
    }).nextState;
  });
  return next;
}

function initializeReady(state: CampaignStateV5 = baseV5()) {
  const withPlaces = withStartingTemplePlaces(state);
  return applyInitializeHierophant(withPlaces, {
    selectedFlameLawIds: ["first", "second"],
    templePlaces: HIEROPHANT_STARTING_TEMPLE_IDS.map((templeId, index) => ({
      templeId,
      placeId: placeId(index + 1),
    })),
  }).nextState;
}

function withDenizen(state: CampaignStateV5, n: number, representation: "individual" | "collective") {
  return applyCreateDenizenV5Candidate(state, {
    denizenId: denizenId(n),
    name: representation === "individual" ? `Person ${n}` : `Group ${n}`,
    representation,
    description: null,
  }).nextState;
}

describe("Hierophant Slice 2 catalogs", () => {
  it("includes all 16 source Doctrine/Blasphemy pairs", () => {
    expect(HIEROPHANT_BUILTIN_DOCTRINE_DEFINITIONS).toHaveLength(16);
    expect(new Set(HIEROPHANT_BUILTIN_DOCTRINE_DEFINITIONS.map((d) => d.id)).size).toBe(16);
    expect(new Set(HIEROPHANT_BUILTIN_DOCTRINE_DEFINITIONS.map((d) => d.pairedBlasphemy.id)).size).toBe(16);
  });

  it("includes 40 built-in Dogma definitions", () => {
    expect(HIEROPHANT_BUILTIN_DOGMA_DEFINITIONS).toHaveLength(40);
    expect(new Set(HIEROPHANT_BUILTIN_DOGMA_DEFINITIONS.map((d) => d.id)).size).toBe(40);
  });
});

describe("Denizen representation integrity", () => {
  it("accepts an individual Supplicant and rejects a collective Supplicant", () => {
    let state = initializeReady();
    state = withDenizen(state, 1, "individual");
    state = withDenizen(state, 2, "collective");
    const added = applyAddSupplicant(state, {
      denizenId: denizenId(1),
      classId: "artisan",
      woe: 0,
      host: { kind: "temple", templeId: "krolis", area: "courtyard" },
    });
    expect(() => validateCampaignState(added.nextState)).not.toThrow();
    expect(() => applyAddSupplicant(state, {
      denizenId: denizenId(2),
      classId: "artisan",
      woe: 0,
      host: { kind: "temple", templeId: "krolis", area: null },
    })).toThrow(DomainError);
  });

  it("accepts an individual Prophet and rejects a collective Prophet", () => {
    let state = initializeReady();
    state = withDenizen(state, 1, "individual");
    state = withDenizen(state, 2, "collective");
    const added = applyAddProphet(state, {
      denizenId: denizenId(1),
      disposition: "reliable",
      host: { kind: "temple", templeId: "notor" },
    });
    expect(() => validateCampaignState(added.nextState)).not.toThrow();
    expect(() => applyAddProphet(state, {
      denizenId: denizenId(2),
      disposition: "disruptive",
      host: { kind: "temple", templeId: "notor" },
    })).toThrow(DomainError);
  });

  it("accepts a collective Cult and rejects an individual Cult", () => {
    let state = initializeReady();
    state = withDenizen(state, 1, "individual");
    state = withDenizen(state, 2, "collective");
    const added = applyEstablishCult(state, {
      cultDenizenId: denizenId(2),
      hostSeatId: "warlock",
      anchorPlaceId: null,
      leaderDenizenId: null,
      blasphemyId: "law_of_the_wolf",
      abundance: 1,
      conviction: 2,
      dogmas: [],
    });
    expect(() => validateCampaignState(added.nextState)).not.toThrow();
    expect(() => applyEstablishCult(state, {
      cultDenizenId: denizenId(1),
      hostSeatId: "warlock",
      anchorPlaceId: null,
      leaderDenizenId: null,
      blasphemyId: "law_of_the_wolf",
      abundance: 0,
      conviction: 0,
      dogmas: [],
    })).toThrow(DomainError);
  });

  it("accepts a null Cult leader and rejects a non-individual leader", () => {
    let state = initializeReady();
    state = withDenizen(state, 1, "individual");
    state = withDenizen(state, 2, "collective");
    state = withDenizen(state, 3, "collective");
    const withNullLeader = applyEstablishCult(state, {
      cultDenizenId: denizenId(2),
      hostSeatId: "hierophant",
      anchorPlaceId: null,
      leaderDenizenId: null,
      blasphemyId: "old_land_demands_blood",
      abundance: 0,
      conviction: 0,
      dogmas: [],
    }).nextState;
    expect(() => validateCampaignState(withNullLeader)).not.toThrow();
    expect(() => applyEstablishCult(state, {
      cultDenizenId: denizenId(3),
      hostSeatId: "sage",
      anchorPlaceId: null,
      leaderDenizenId: denizenId(2),
      blasphemyId: "old_land_demands_blood",
      abundance: 0,
      conviction: 0,
      dogmas: [],
    })).toThrow(DomainError);
    const withLeader = applyEstablishCult(state, {
      cultDenizenId: denizenId(3),
      hostSeatId: "sage",
      anchorPlaceId: null,
      leaderDenizenId: denizenId(1),
      blasphemyId: "old_land_demands_blood",
      abundance: 0,
      conviction: 0,
      dogmas: [],
    }).nextState;
    expect(() => validateCampaignState(withLeader)).not.toThrow();
  });
});

describe("Host integrity", () => {
  it("resolves Temple and Cult hosts and rejects dangling hosts", () => {
    let state = initializeReady();
    state = withDenizen(state, 1, "individual");
    state = withDenizen(state, 2, "collective");
    state = applyEstablishCult(state, {
      cultDenizenId: denizenId(2),
      hostSeatId: "faustian",
      anchorPlaceId: null,
      leaderDenizenId: null,
      blasphemyId: "indulge_every_desire",
      abundance: 0,
      conviction: 0,
      dogmas: [],
    }).nextState;
    expect(() => applyAddSupplicant(state, {
      denizenId: denizenId(1),
      classId: "gentry",
      woe: 1,
      host: { kind: "cult", cultDenizenId: denizenId(2) },
    })).not.toThrow();
    expect(() => applyAddSupplicant(state, {
      denizenId: denizenId(1),
      classId: "gentry",
      woe: 1,
      host: { kind: "cult", cultDenizenId: denizenId(9) },
    })).toThrow(DomainError);
    expect(() => applyAddProphet(state, {
      denizenId: denizenId(1),
      disposition: "reliable",
      host: { kind: "temple", templeId: "ushin" },
    })).not.toThrow();
  });

  it("requires Hestar area null and allows ordinary Temple area null/courtyard/agiary", () => {
    let state = initializeReady();
    state = withDenizen(state, 1, "individual");
    state = withDenizen(state, 2, "individual");
    state = withDenizen(state, 3, "individual");
    expect(() => applyAddSupplicant(state, {
      denizenId: denizenId(1),
      classId: "pariah",
      woe: 0,
      host: { kind: "temple", templeId: "hestar", area: "courtyard" },
    })).toThrow(DomainError);
    const hestar = applyAddSupplicant(state, {
      denizenId: denizenId(1),
      classId: "pariah",
      woe: 0,
      host: { kind: "temple", templeId: "hestar", area: null },
    }).nextState;
    expect(hestar.hierophant.supplicants[0].host).toEqual({ kind: "temple", templeId: "hestar", area: null });
    const courtyard = applyAddSupplicant(state, {
      denizenId: denizenId(2),
      classId: "peasant",
      woe: 0,
      host: { kind: "temple", templeId: "zephon", area: "agiary" },
    }).nextState;
    expect(courtyard.hierophant.supplicants[0].host).toMatchObject({ area: "agiary" });
    const unresolved = applyAddSupplicant(state, {
      denizenId: denizenId(3),
      classId: "merchant",
      woe: 0,
      host: { kind: "temple", templeId: "krolis", area: null },
    }).nextState;
    expect(() => validateCampaignState(unresolved)).not.toThrow();
  });
});

describe("Campaign definitions", () => {
  it("resolves campaign Class and Doctrine/Blasphemy and rejects built-in collisions", () => {
    let state = initializeReady();
    const createdClass = applyCreateCampaignClass(state, {
      classId: campaignClassId(1),
      name: "Glassblower",
    }).nextState;
    expect(createdClass.hierophant.campaignClasses[0].name).toBe("Glassblower");
    expect(() => applyCreateCampaignClass(state, {
      classId: "artisan" as HierophantCampaignClassId,
      name: "Fake",
    })).toThrow(DomainError);

    const createdDoctrine = applyCreateCampaignDoctrine(createdClass, {
      doctrineId: campaignDoctrineId(1),
      orthodoxText: "The kiln is a second flame.",
      blasphemy: {
        blasphemyId: campaignBlasphemyId(1) as never,
        text: "Smash every vessel that is not ours.",
      },
      supportedClassIds: ["artisan", campaignClassId(1)],
    }).nextState;
    expect(() => validateCampaignState(createdDoctrine)).not.toThrow();
    expect(createdDoctrine.hierophant.campaignDoctrines[0].blasphemy?.text).toContain("Smash");
  });
});

describe("Manual transitions", () => {
  it("adds, updates, and removes a Supplicant without deleting the Denizen", () => {
    let state = initializeReady();
    state = withDenizen(state, 1, "individual");
    state = applyAddSupplicant(state, {
      denizenId: denizenId(1),
      classId: "gentry",
      woe: 2,
      host: { kind: "temple", templeId: "krolis", area: "courtyard" },
    }).nextState;
    state = applyUpdateSupplicant(state, denizenId(1), {
      classId: { expected: "gentry", value: "pariah" },
      woe: { expected: 2, value: 4 },
      host: {
        expected: { kind: "temple", templeId: "krolis", area: "courtyard" },
        value: { kind: "temple", templeId: "notor", area: "agiary" },
      },
    }).nextState;
    expect(state.hierophant.supplicants[0]).toMatchObject({ classId: "pariah", woe: 4 });
    state = applyRemoveSupplicant(state, denizenId(1)).nextState;
    expect(state.hierophant.supplicants).toEqual([]);
    expect(state.world.denizens.some((d) => d.denizenId === denizenId(1))).toBe(true);
  });

  it("adds, updates, and removes a Prophet without deleting the Denizen", () => {
    let state = initializeReady();
    state = withDenizen(state, 1, "individual");
    state = applyAddProphet(state, {
      denizenId: denizenId(1),
      disposition: "reliable",
      host: { kind: "temple", templeId: "ushin" },
    }).nextState;
    state = applyRemoveProphet(state, denizenId(1)).nextState;
    expect(state.hierophant.prophets).toEqual([]);
    expect(state.world.denizens).toHaveLength(1);
  });

  it("creates and updates a Cult including leader -> null", () => {
    let state = initializeReady();
    state = withDenizen(state, 1, "individual");
    state = withDenizen(state, 2, "collective");
    state = applyEstablishCult(state, {
      cultDenizenId: denizenId(2),
      hostSeatId: "warlock",
      anchorPlaceId: null,
      leaderDenizenId: denizenId(1),
      blasphemyId: "destroy_trappings_of_modernity",
      abundance: 3,
      conviction: 1,
      dogmas: [],
    }).nextState;
    state = applyUpdateCult(state, denizenId(2), {
      leaderDenizenId: { expected: denizenId(1), value: null },
    }).nextState;
    expect(state.hierophant.cults[0].leaderDenizenId).toBeNull();
    expect(state.hierophant.cults[0].conviction).toBe(1);
  });

  it("adds and removes built-in and custom Dogmas", () => {
    let state = initializeReady();
    state = withDenizen(state, 2, "collective");
    state = applyEstablishCult(state, {
      cultDenizenId: denizenId(2),
      hostSeatId: "sage",
      anchorPlaceId: null,
      leaderDenizenId: null,
      blasphemyId: "past_as_kindling",
      abundance: 0,
      conviction: 4,
      dogmas: [],
    }).nextState;
    state = applyAddCultDogma(state, denizenId(2), {
      dogmaEntryId: dogmaEntryId(1),
      kind: "builtin",
      dogmaId: "apocalyptic_1",
    }).nextState;
    state = applyAddCultDogma(state, denizenId(2), {
      dogmaEntryId: dogmaEntryId(2),
      kind: "custom",
      category: "custom",
      text: "The tide itself is a liturgy.",
    }).nextState;
    state = applyUpdateCultDogma(state, denizenId(2), dogmaEntryId(2), {
      text: { expected: "The tide itself is a liturgy.", value: "The tide recites the names." },
    }).nextState;
    expect(state.hierophant.cults[0].dogmas).toHaveLength(2);
    state = applyRemoveCultDogma(state, denizenId(2), dogmaEntryId(1)).nextState;
    expect(state.hierophant.cults[0].dogmas).toHaveLength(1);
    expect(state.hierophant.cults[0].conviction).toBe(4);
  });

  it("creates a custom Temple, changes Doctrine, and toggles a Holiday marker", () => {
    let state = initializeReady();
    state = applyCreatePlaceV5Candidate(state, {
      placeId: placeId(20),
      name: "Temple of the New Flame",
      description: null,
      placement: { kind: "unspecified" },
    }).nextState;
    state = applyCreateTemple(state, {
      templeId: campaignTempleId(1),
      placeId: placeId(20),
      hostSeatId: "necromancer",
      abundance: 2,
      conviction: 1,
      status: "active",
      doctrine: { kind: "unset" },
    }).nextState;
    expect(state.hierophant.temples).toHaveLength(6);
    state = applyUpdateTemple(state, campaignTempleId(1), {
      doctrine: { expected: { kind: "unset" }, value: { kind: "doctrine", doctrineId: "family_most_important" } },
    }).nextState;
    const custom = state.hierophant.temples.find((t) => t.templeId === campaignTempleId(1));
    expect(custom?.kind === "ordinary" && custom.doctrine).toEqual({
      kind: "doctrine",
      doctrineId: "family_most_important",
    });
    state = applySetTempleHoliday(state, "krolis", true).nextState;
    expect(state.hierophant.holidayTempleIds).toEqual(["krolis"]);
    state = applySetTempleHoliday(state, "krolis", false).nextState;
    expect(state.hierophant.holidayTempleIds).toEqual([]);
    expect(() => applyUpdateTemple(state, "hestar", {
      doctrine: { expected: { kind: "unset" }, value: { kind: "doctrine", doctrineId: "family_most_important" } },
    })).toThrow(DomainError);
  });
});

describe("Anti-automation", () => {
  it("raw Woe change does not move or remove a Supplicant", () => {
    let state = initializeReady();
    state = withDenizen(state, 1, "individual");
    state = applyAddSupplicant(state, {
      denizenId: denizenId(1),
      classId: "artisan",
      woe: 4,
      host: { kind: "temple", templeId: "krolis", area: "courtyard" },
    }).nextState;
    const next = applyUpdateSupplicant(state, denizenId(1), {
      woe: { expected: 4, value: 8 },
    }).nextState;
    expect(next.hierophant.supplicants).toHaveLength(1);
    expect(next.hierophant.supplicants[0].woe).toBe(8);
    expect(next.hierophant.supplicants[0].host).toEqual(state.hierophant.supplicants[0].host);
  });

  it("Doctrine change does not alter Prophets or create Cults", () => {
    let state = initializeReady();
    state = withDenizen(state, 1, "individual");
    state = applyAddProphet(state, {
      denizenId: denizenId(1),
      disposition: "disruptive",
      host: { kind: "temple", templeId: "krolis" },
    }).nextState;
    const krolis = state.hierophant.temples.find((t) => t.templeId === "krolis")!;
    expect(krolis.kind).toBe("ordinary");
    const next = applyUpdateTemple(state, "krolis", {
      doctrine: {
        expected: krolis.kind === "ordinary" ? krolis.doctrine : { kind: "unset" },
        value: { kind: "blasphemy", blasphemyId: "old_land_demands_blood" },
      },
    }).nextState;
    expect(next.hierophant.prophets).toEqual(state.hierophant.prophets);
    expect(next.hierophant.cults).toEqual([]);
  });

  it("Cult Conviction change does not add or remove Dogma, and clearing leader does not replace them", () => {
    let state = initializeReady();
    state = withDenizen(state, 1, "individual");
    state = withDenizen(state, 2, "collective");
    state = applyEstablishCult(state, {
      cultDenizenId: denizenId(2),
      hostSeatId: "mariner",
      anchorPlaceId: null,
      leaderDenizenId: denizenId(1),
      blasphemyId: "enemies_on_all_sides",
      abundance: 2,
      conviction: 3,
      dogmas: [],
    }).nextState;
    state = applyAddCultDogma(state, denizenId(2), {
      dogmaEntryId: dogmaEntryId(1),
      kind: "builtin",
      dogmaId: "vain_1",
    }).nextState;
    const afterConviction = applyUpdateCult(state, denizenId(2), {
      conviction: { expected: 3, value: 0 },
    }).nextState;
    expect(afterConviction.hierophant.cults[0].dogmas).toHaveLength(1);
    const afterLeader = applyUpdateCult(afterConviction, denizenId(2), {
      leaderDenizenId: { expected: denizenId(1), value: null },
    }).nextState;
    expect(afterLeader.hierophant.cults[0].leaderDenizenId).toBeNull();
    expect(afterLeader.world.denizens).toHaveLength(2);
  });

  it("resource changes do not automatically collapse or Blaspheme", () => {
    const initialized = initializeReady();
    const next = applyAdjustTempleResources(initialized, "krolis", {
      abundance: { expected: 5, value: 0 },
      conviction: { expected: 4, value: 0 },
    }).nextState;
    const krolis = next.hierophant.temples.find((t) => t.templeId === "krolis")!;
    expect(krolis.status).toBe("active");
    expect(krolis.kind === "ordinary" && krolis.doctrine.kind).toBe("doctrine");
  });

  it("cannot remove a Cult while a role still hosts there", () => {
    let state = initializeReady();
    state = withDenizen(state, 1, "individual");
    state = withDenizen(state, 2, "collective");
    state = applyEstablishCult(state, {
      cultDenizenId: denizenId(2),
      hostSeatId: "sorcerer",
      anchorPlaceId: null,
      leaderDenizenId: null,
      blasphemyId: "law_of_the_wolf",
      abundance: 0,
      conviction: 0,
      dogmas: [],
    }).nextState;
    state = applyAddSupplicant(state, {
      denizenId: denizenId(1),
      classId: "pariah",
      woe: 0,
      host: { kind: "cult", cultDenizenId: denizenId(2) },
    }).nextState;
    expect(() => applyRemoveCult(state, denizenId(2))).toThrow(DomainError);
  });
});

describe("Hestar identity fail-closed", () => {
  it("rejects a custom htm_ Temple encoded with kind hestar", () => {
    let state = initializeReady();
    state = applyCreatePlaceV5Candidate(state, {
      placeId: placeId(20),
      name: "Temple of the New Flame",
      description: null,
      placement: { kind: "unspecified" },
    }).nextState;
    state = applyCreateTemple(state, {
      templeId: campaignTempleId(1),
      placeId: placeId(20),
      hostSeatId: "necromancer",
      abundance: 2,
      conviction: 1,
      status: "active",
      doctrine: { kind: "unset" },
    }).nextState;
    const temples = state.hierophant.temples.map((t) =>
      t.templeId === campaignTempleId(1)
        ? {
            templeId: t.templeId,
            kind: "hestar" as const,
            placeId: t.placeId,
            hostSeatId: t.hostSeatId,
            status: t.status,
            abundance: t.abundance,
            conviction: t.conviction,
          }
        : t,
    );
    const bad = { ...state, hierophant: { ...state.hierophant, temples } };
    expect(() => validateCampaignState(bad)).toThrow(DomainError);
  });

  it("rejects templeId hestar encoded as kind ordinary", () => {
    const state = initializeReady();
    const temples = state.hierophant.temples.map((t) =>
      t.templeId === "hestar"
        ? { ...t, kind: "ordinary" as const, doctrine: { kind: "unset" as const } }
        : t,
    );
    const bad = { ...state, hierophant: { ...state.hierophant, temples } };
    expect(() => validateCampaignState(bad)).toThrow(DomainError);
  });
});

describe("set_selected_flame_laws", () => {
  it("still requires exactly two Flame Laws at initialization", () => {
    const withPlaces = withStartingTemplePlaces(baseV5());
    const bindings = HIEROPHANT_STARTING_TEMPLE_IDS.map((templeId, index) => ({
      templeId,
      placeId: placeId(index + 1),
    }));
    expect(() =>
      applyInitializeHierophant(withPlaces, {
        selectedFlameLawIds: ["first"],
        templePlaces: bindings,
      }),
    ).toThrow(DomainError);
    expect(() =>
      applyInitializeHierophant(withPlaces, {
        selectedFlameLawIds: ["first", "second", "third"],
        templePlaces: bindings,
      }),
    ).toThrow(DomainError);
  });

  it("changes a two-Law selection to one or three without altering other Hierophant state", () => {
    const state = initializeReady();
    const { selectedFlameLawIds: _before, ...restBefore } = state.hierophant;
    expect(CAMPAIGN_COMMAND_TYPES as readonly string[]).toContain("set_selected_flame_laws");
    expect(isLogicalStateCommandType("set_selected_flame_laws")).toBe(true);

    const toOne = applySetSelectedFlameLaws(state, ["first", "second"], ["first"]);
    expect(toOne.events).toEqual([{
      type: "flame_laws_changed",
      version: 1,
      data: {
        previousSelectedFlameLawIds: ["first", "second"],
        newSelectedFlameLawIds: ["first"],
      },
    }]);
    expect(toOne.nextState.hierophant.selectedFlameLawIds).toEqual(["first"]);
    const { selectedFlameLawIds: _one, ...restOne } = toOne.nextState.hierophant;
    expect(restOne).toEqual(restBefore);
    expect(() => validateCampaignState(toOne.nextState)).not.toThrow();

    const toThree = applySetSelectedFlameLaws(state, ["first", "second"], ["first", "second", "third"]);
    expect(toThree.nextState.hierophant.selectedFlameLawIds).toEqual(["first", "second", "third"]);
    const { selectedFlameLawIds: _three, ...restThree } = toThree.nextState.hierophant;
    expect(restThree).toEqual(restBefore);
    expect(toThree.nextState.world).toEqual(state.world);
    expect(() => validateCampaignState(toThree.nextState)).not.toThrow();
  });

  it("rejects duplicates, unknown Law IDs, stale expected selection, and no-op", () => {
    const state = initializeReady();
    expect(() =>
      applySetSelectedFlameLaws(state, ["first", "second"], ["first", "first"]),
    ).toThrow(DomainError);
    expect(() =>
      applySetSelectedFlameLaws(state, ["first", "second"], ["first", "not_a_law" as never]),
    ).toThrow(DomainError);
    expect(() =>
      applySetSelectedFlameLaws(state, ["sixth", "seventh"], ["first"]),
    ).toThrow(DomainError);
    expect(() =>
      applySetSelectedFlameLaws(state, ["first", "second"], ["first", "second"]),
    ).toThrow(DomainError);
  });
});

describe("Ordinary-command contract", () => {
  it("Slice 2 commands are logical-state commands and preserve campaign protection and idempotency", async () => {
    expect(CAMPAIGN_COMMAND_TYPES as readonly string[]).toContain("add_supplicant");
    expect(CAMPAIGN_COMMAND_TYPES as readonly string[]).toContain("establish_cult");
    expect(CAMPAIGN_COMMAND_TYPES as readonly string[]).toContain("create_temple");
    expect(isLogicalStateCommandType("add_supplicant")).toBe(true);

    let state = initializeReady();
    state = withDenizen(state, 1, "individual");
    const supplicant = {
      denizenId: denizenId(1),
      classId: "artisan" as const,
      woe: 0,
      host: { kind: "temple" as const, templeId: "krolis" as const, area: "courtyard" as const },
    };
    const fp1 = addSupplicantFingerprint(CAMPAIGN_A, supplicant);
    expect(addSupplicantFingerprint(CAMPAIGN_A, supplicant)).toBe(fp1);
    expect(addSupplicantFingerprint(CAMPAIGN_B, supplicant)).not.toBe(fp1);

    const events = applyAddSupplicant(state, supplicant).events;
    expect(() =>
      validateEventCoherenceForTest(
        {
          campaignDocId: "dummy" as unknown as CanonicalCommitInput["campaignDocId"],
          campaignId: CAMPAIGN_A,
          currentRevision: 0,
          currentState: state,
          commandId: COMMAND_1,
          commandType: "add_supplicant",
          commandFingerprint: fp1,
          nextState: state,
          events,
          historyControlUpdate: { kind: "logical_state_append" },
        },
        1,
      ),
    ).not.toThrow();

    const calls: string[] = [];
    const io: OrdinaryLogicalCommandIo = {
      async assertNotDeleting() { calls.push("assertNotDeleting"); },
      async loadCanonicalCampaign() {
        calls.push("loadCanonicalCampaign");
        return {
          docId: "dummy" as CanonicalCampaign["docId"],
          campaignId: CAMPAIGN_B,
          currentRevision: 4,
          currentState: state,
        };
      },
      async findAcceptedCommand() { calls.push("findAcceptedCommand"); return null; },
      async loadCommittedSnapshot() { calls.push("loadCommittedSnapshot"); return state; },
      async commit() {
        calls.push("commit");
        return { newRevision: 5, state, alreadyApplied: false };
      },
    };
    await expect(
      executeOrdinaryLogicalCommand(
        io,
        { commandId: COMMAND_1, expectedCampaignId: CAMPAIGN_A },
        () => ({
          commandType: "add_supplicant",
          commandFingerprint: fp1,
          apply: (current) => applyAddSupplicant(current, supplicant),
        }),
      ),
    ).rejects.toMatchObject({ code: "STALE_COMMAND_PRECONDITION" });
    expect(calls).toEqual(["assertNotDeleting", "loadCanonicalCampaign"]);
  });
});
