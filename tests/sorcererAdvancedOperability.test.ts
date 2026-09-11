import { describe, expect, it } from "vitest";
import type {
  CampaignStateV5,
  DenizenId,
  InitializeSorcererInput,
  IsleId,
  MonthOrdinal,
  PlaceId,
  PlayerId,
  PowerfulDenizenProfile,
  PowerfulDenizenTruthId,
  WizardId,
} from "../shared/domain";
import {
  BLANK_WIZARD_CHARACTER_V5,
  CAMPAIGN_COMMAND_TYPES,
  DomainError,
  EMPTY_SHARED_WORLD_STATE,
  addSorcererArcanistFingerprint,
  addSorcererConstructFingerprint,
  addSorcererInnovationFingerprint,
  applyAddSorcererArcanist,
  applyAddSorcererConstruct,
  applyAddSorcererInnovation,
  applyCreateSorcererCampaignDefinition,
  applyInitializeSorcerer,
  applyRemoveSorcererInnovation,
  applyReviseSorcererInnovation,
  applySetSorcererConstructInstructions,
  applySetSorcererLaws,
  applySetSorcererResearcherProductionMultipliers,
  applyUpdateSorcererArcanist,
  applyUpdateSorcererCampaignDefinition,
  canonicalizeAddSorcererArcanistInput,
  canonicalizeAddSorcererConstructInput,
  canonicalizeAddSorcererInnovationInput,
  canonicalizeCreateSorcererCampaignDefinitionInput,
  canonicalizeRemoveSorcererInnovationInput,
  canonicalizeReviseSorcererInnovationInput,
  canonicalizeSetSorcererConstructInstructionsInput,
  canonicalizeSetSorcererLawsInput,
  canonicalizeSetSorcererResearcherProductionMultipliersInput,
  canonicalizeUpdateSorcererArcanistInput,
  canonicalizeUpdateSorcererCampaignDefinitionInput,
  createSorcererCampaignDefinitionFingerprint,
  isLogicalStateCommandType,
  readSorcererBoardReference,
  removeSorcererInnovationFingerprint,
  reviseSorcererInnovationFingerprint,
  setSorcererConstructInstructionsFingerprint,
  setSorcererLawsFingerprint,
  setSorcererResearcherProductionMultipliersFingerprint,
  updateSorcererArcanistFingerprint,
  updateSorcererCampaignDefinitionFingerprint,
  validateCampaignStateV5Candidate,
} from "../shared/domain";
import { makeTestCampaignStateV5 } from "./test-state";
import { validateEventCoherenceForTest } from "../convex/canonicalCommit";
import type { CanonicalCommitInput } from "../convex/canonicalCommit";
import {
  executeOrdinaryLogicalCommand,
  type CanonicalCampaign,
  type OrdinaryLogicalCommandIo,
} from "../convex/ordinaryLogicalCommand";

const CAMPAIGN_A = "cmp_00000000-0000-0000-0000-000000000001";
const COMMAND_1 = "cmd_00000000-0000-0000-0000-000000000001";
const PLR_A = "plr_00000000-0000-0000-0000-00000000000a" as PlayerId;
const WIZ_A = "wiz_00000000-0000-0000-0000-00000000000a" as WizardId;
const ISL_SPYR = "isl_00000000-0000-0000-0000-0000000000aa" as IsleId;
const PLC_TOWER = "plc_00000000-0000-0000-0000-0000000000aa" as PlaceId;
const PLC_UNIV = "plc_00000000-0000-0000-0000-0000000000ab" as PlaceId;
const NEW_DEN = "den_00000000-0000-0000-0000-0000000000c8" as DenizenId;
const NEW_DEN_2 = "den_00000000-0000-0000-0000-0000000000c9" as DenizenId;
const SCHOOL_ID = "ssch_00000000-0000-0000-0000-0000000000aa";
const KIND_ID = "sack_00000000-0000-0000-0000-0000000000ab";
const RECIPE_ID = "srec_00000000-0000-0000-0000-0000000000aa";
const METHOD_ID = "sknm_00000000-0000-0000-0000-0000000000aa";
const POSITION_ID = "srp_00000000-0000-0000-0000-0000000000aa";
const INNOVATION_ID = "sinn_00000000-0000-0000-0000-0000000000aa";
const TRUTH_ID = "pdtru_00000000-0000-0000-0000-0000000000aa" as PowerfulDenizenTruthId;
const TRUTH_ID_2 = "pdtru_00000000-0000-0000-0000-0000000000ab" as PowerfulDenizenTruthId;

const ADVANCED_COMMANDS = [
  "set_sorcerer_researcher_production_multipliers",
  "set_sorcerer_laws",
  "create_sorcerer_campaign_definition",
  "update_sorcerer_campaign_definition",
  "add_sorcerer_arcanist",
  "update_sorcerer_arcanist",
  "add_sorcerer_construct",
  "set_sorcerer_construct_instructions",
  "add_sorcerer_innovation",
  "revise_sorcerer_innovation",
  "remove_sorcerer_innovation",
] as const;

function denizenId(n: number): DenizenId {
  return `den_00000000-0000-0000-0000-${String(n).padStart(12, "0")}` as DenizenId;
}

function expectCode(run: () => unknown, code: DomainError["code"], pattern?: RegExp): void {
  expect(run).toThrow(DomainError);
  try {
    run();
  } catch (error) {
    expect((error as DomainError).code).toBe(code);
    if (pattern !== undefined) {
      expect((error as DomainError).message).toMatch(pattern);
    }
  }
}

function person(id: number, name: string, profile: PowerfulDenizenProfile | null = null) {
  return {
    denizenId: denizenId(id),
    name,
    representation: "individual" as const,
    description: null,
    mortalityState: "not_deceased" as const,
    powerfulProfile: profile,
  };
}

function arcanistProfile(status: "reliable" | "disruptive"): PowerfulDenizenProfile {
  return {
    taxonomies: [{ kind: "builtin", taxonomyId: "arcanist" }],
    status: { kind: "standard", value: status },
    goal: null,
    methods: [],
    truths: [],
  };
}

function quietInput(): InitializeSorcererInput {
  return {
    arrangementId: "quiet",
    spyrholmIsleId: ISL_SPYR,
    towerPlaceId: PLC_TOWER,
    universityPlaceId: PLC_UNIV,
    activeLawIds: ["first", "second"],
    unrevealedLawId: "third",
    orreryHouses: [0, 4, 8],
    ideologyIds: ["aristocracy", "mercantilism"],
    seaRegionIds: ["bay_of_ishana", "wizard_strait"],
    researchers: [
      { denizenId: denizenId(1), positionId: "srp_orrery_1" },
      { denizenId: denizenId(2), positionId: "srp_temple_krolis" },
      { denizenId: denizenId(3), positionId: "srp_court_1" },
    ],
    studentDenizenIds: [denizenId(4), denizenId(5), denizenId(6)],
    professorDenizenId: denizenId(7),
    alchemistDenizenId: denizenId(8),
    librarian: null,
    towerArcanists: [],
    calamityDisruptiveArcanist: null,
  };
}

function initializedQuiet(): CampaignStateV5 {
  return applyInitializeSorcerer(
    makeTestCampaignStateV5({
      calendar: { monthOrdinal: 0 as MonthOrdinal },
      configuration: { ageId: "awakening", facilitatorPlayerId: PLR_A },
      players: [{ playerId: PLR_A, name: "Alice" }],
      wizards: [{
        wizardId: WIZ_A,
        name: "Mira",
        portrayedByPlayerId: PLR_A,
        character: { ...BLANK_WIZARD_CHARACTER_V5 },
        homeIsleId: ISL_SPYR,
        sanctumPlaceId: PLC_TOWER,
        mortalityState: "not_deceased",
      }],
      pactSeats: {
        ...makeTestCampaignStateV5().pactSeats,
        sorcerer: { status: "present", wizardId: WIZ_A, watcherPlayerId: null },
      },
      world: {
        ...EMPTY_SHARED_WORLD_STATE,
        denizens: [
          person(1, "R1"), person(2, "R2"), person(3, "R3"),
          person(4, "S1"), person(5, "S2"), person(6, "S3"),
          person(7, "Professor"), person(8, "Alchemist"),
        ],
        isles: [{ isleId: ISL_SPYR, name: "Spyrholm", description: null }],
        places: [
          { placeId: PLC_TOWER, name: "Sorcerer's Tower", description: null, placement: { kind: "on_isle", isleId: ISL_SPYR } },
          { placeId: PLC_UNIV, name: "Spyrholm University", description: null, placement: { kind: "on_isle", isleId: ISL_SPYR } },
        ],
      },
    }),
    quietInput(),
  ).nextState;
}

function initializedDynamic(): CampaignStateV5 {
  return applyInitializeSorcerer(
    makeTestCampaignStateV5({
      calendar: { monthOrdinal: 0 as MonthOrdinal },
      configuration: { ageId: "awakening", facilitatorPlayerId: PLR_A },
      players: [{ playerId: PLR_A, name: "Alice" }],
      wizards: [{
        wizardId: WIZ_A,
        name: "Mira",
        portrayedByPlayerId: PLR_A,
        character: { ...BLANK_WIZARD_CHARACTER_V5 },
        homeIsleId: ISL_SPYR,
        sanctumPlaceId: PLC_TOWER,
        mortalityState: "not_deceased",
      }],
      pactSeats: {
        ...makeTestCampaignStateV5().pactSeats,
        sorcerer: { status: "present", wizardId: WIZ_A, watcherPlayerId: null },
      },
      world: {
        ...EMPTY_SHARED_WORLD_STATE,
        denizens: [
          person(1, "R1"), person(2, "R2"), person(3, "R3"),
          person(4, "S1"), person(5, "S2"), person(6, "S3"),
          person(7, "Professor"), person(8, "Alchemist"),
          person(9, "Librarian"),
          person(10, "Tower Arc", arcanistProfile("reliable")),
        ],
        isles: [{ isleId: ISL_SPYR, name: "Spyrholm", description: null }],
        places: [
          { placeId: PLC_TOWER, name: "Sorcerer's Tower", description: null, placement: { kind: "on_isle", isleId: ISL_SPYR } },
          { placeId: PLC_UNIV, name: "Spyrholm University", description: null, placement: { kind: "on_isle", isleId: ISL_SPYR } },
        ],
      },
    }),
    {
      ...quietInput(),
      arrangementId: "dynamic",
      librarian: { denizenId: denizenId(9), school: { kind: "source", schoolId: "divination" } },
      towerArcanists: [{ denizenId: denizenId(10), school: { kind: "source", schoolId: "divination" } }],
    },
  ).nextState;
}

function withKnowledge(state: CampaignStateV5): CampaignStateV5 {
  return {
    ...state,
    sorcerer: {
      ...state.sorcerer,
      knowledge: {
        researchOrigin: 4,
        other: 2,
        nextMonthResearchOrigin: 9,
        researcherProductionMultiplierCurrent: 1,
        researcherProductionMultiplierNextMonth: 2,
      },
    },
  };
}

function campaignSchoolState(): CampaignStateV5 {
  const created = applyCreateSorcererCampaignDefinition(initializedQuiet(), {
    kind: "school",
    schoolId: SCHOOL_ID as never,
    name: "Cartography",
    description: "Maps of hidden ways",
  });
  return created.nextState;
}

function disruptiveProfile(overrides: Partial<{
  rank: "prentice" | "journeyman" | "master";
  prenticeSpellIds: readonly string[];
}> = {}) {
  return {
    primaryElement: "fire" as const,
    rank: overrides.rank ?? "prentice" as const,
    changesOfMagic: ["rewrites local weather"],
    quirk: "Speaks only in questions",
    prenticeSpellIds: (overrides.prenticeSpellIds ?? ["hand_of_power"]) as never,
  };
}

function campaignOf(state: CampaignStateV5, revision = 4): CanonicalCampaign {
  return {
    docId: "dummy" as CanonicalCommitInput["campaignDocId"],
    campaignId: CAMPAIGN_A,
    currentRevision: revision,
    currentState: state,
  };
}

function recordingIo(options: {
  campaign: CanonicalCampaign;
  accepted?: { commandType: string; commandFingerprint: string; campaignRevision: number };
  snapshot?: CampaignStateV5;
}) {
  const commits: CanonicalCommitInput[] = [];
  const io: OrdinaryLogicalCommandIo = {
    async assertNotDeleting() {},
    async loadCanonicalCampaign() {
      return options.campaign;
    },
    async findAcceptedCommand() {
      return options.accepted === undefined ? null : options.accepted;
    },
    async loadCommittedSnapshot() {
      return options.snapshot === undefined ? options.campaign.currentState : options.snapshot;
    },
    async commit(input) {
      commits.push(input);
      return { newRevision: options.campaign.currentRevision + 1, state: input.nextState, alreadyApplied: false };
    },
  };
  return { io, commits };
}

describe("sorcerer advanced command registration", () => {
  it("registers every C1 command as an ordinary logical-state command", () => {
    for (const commandType of ADVANCED_COMMANDS) {
      expect(CAMPAIGN_COMMAND_TYPES as readonly string[]).toContain(commandType);
      expect(isLogicalStateCommandType(commandType)).toBe(true);
    }
  });
});

describe("set_sorcerer_researcher_production_multipliers", () => {
  it("corrects current and next independently without changing Knowledge amounts", () => {
    const before = withKnowledge(initializedQuiet());
    const result = applySetSorcererResearcherProductionMultipliers(before, {
      expectedCurrent: 1,
      expectedNextMonth: 2,
      current: 3,
      nextMonth: 4,
    });
    expect(result.nextState.sorcerer.knowledge).toEqual({
      researchOrigin: 4,
      other: 2,
      nextMonthResearchOrigin: 9,
      researcherProductionMultiplierCurrent: 3,
      researcherProductionMultiplierNextMonth: 4,
    });
    expect(result.events[0]?.type).toBe("sorcerer_researcher_production_multipliers_set");
    expect(() => validateCampaignStateV5Candidate(result.nextState)).not.toThrow();
  });

  it("rejects zero, negative, stale pair, and no-op", () => {
    const before = withKnowledge(initializedQuiet());
    expectCode(
      () => applySetSorcererResearcherProductionMultipliers(before, {
        expectedCurrent: 1, expectedNextMonth: 2, current: 0, nextMonth: 4,
      }),
      "INVALID_CAMPAIGN_STATE",
      /positive/,
    );
    expectCode(
      () => applySetSorcererResearcherProductionMultipliers(before, {
        expectedCurrent: 1, expectedNextMonth: 2, current: -1, nextMonth: 4,
      }),
      "INVALID_CAMPAIGN_STATE",
      /positive/,
    );
    expectCode(
      () => applySetSorcererResearcherProductionMultipliers(before, {
        expectedCurrent: 9, expectedNextMonth: 2, current: 3, nextMonth: 4,
      }),
      "STALE_COMMAND_PRECONDITION",
    );
    expectCode(
      () => applySetSorcererResearcherProductionMultipliers(before, {
        expectedCurrent: 1, expectedNextMonth: 2, current: 1, nextMonth: 2,
      }),
      "INVALID_CAMPAIGN_STATE",
      /unchanged/,
    );
  });
});

describe("set_sorcerer_laws", () => {
  it("records an exact active/unrevealed correction", () => {
    const before = initializedQuiet();
    const result = applySetSorcererLaws(before, {
      expectedActiveLawIds: ["first", "second"],
      expectedUnrevealedLawIds: ["third"],
      activeLawIds: ["first", "fourth"],
      unrevealedLawIds: ["second", "third"],
    });
    expect(result.nextState.sorcerer.activeLawIds).toEqual(["first", "fourth"]);
    expect(result.nextState.sorcerer.unrevealedLawIds).toEqual(["second", "third"]);
    expect(result.events[0]?.type).toBe("sorcerer_laws_set");
    expect(() => validateCampaignStateV5Candidate(result.nextState)).not.toThrow();
  });

  it("rejects overlap, invalid IDs, and stale expected arrays", () => {
    const before = initializedQuiet();
    expectCode(
      () => applySetSorcererLaws(before, {
        expectedActiveLawIds: ["first", "second"],
        expectedUnrevealedLawIds: ["third"],
        activeLawIds: ["first", "second"],
        unrevealedLawIds: ["second"],
      }),
      "INVALID_CAMPAIGN_STATE",
      /disjoint/,
    );
    expectCode(
      () => applySetSorcererLaws(before, {
        expectedActiveLawIds: ["first", "second"],
        expectedUnrevealedLawIds: ["third"],
        activeLawIds: ["not_a_law" as never],
        unrevealedLawIds: ["third"],
      }),
      "INVALID_CAMPAIGN_STATE",
      /canonical Law/,
    );
    expectCode(
      () => applySetSorcererLaws(before, {
        expectedActiveLawIds: ["first"],
        expectedUnrevealedLawIds: ["third"],
        activeLawIds: ["first"],
        unrevealedLawIds: ["second"],
      }),
      "STALE_COMMAND_PRECONDITION",
    );
  });
});

describe("sorcerer campaign definitions", () => {
  it("creates and updates a campaign School without inventing an Arcanist", () => {
    const before = initializedQuiet();
    const created = applyCreateSorcererCampaignDefinition(before, {
      kind: "school",
      schoolId: SCHOOL_ID as never,
      name: "Cartography",
      description: "Maps of hidden ways",
    });
    expect(created.nextState.sorcerer.campaignSchools).toEqual([{
      schoolId: SCHOOL_ID,
      name: "Cartography",
      description: "Maps of hidden ways",
    }]);
    expect(created.nextState.sorcerer.arcanists).toEqual([]);
    const updated = applyUpdateSorcererCampaignDefinition(created.nextState, {
      kind: "school",
      schoolId: SCHOOL_ID as never,
      expectedName: "Cartography",
      expectedDescription: "Maps of hidden ways",
      name: "Wayfinding",
      description: "Revised maps",
    });
    expect(updated.nextState.sorcerer.campaignSchools[0]).toMatchObject({
      schoolId: SCHOOL_ID,
      name: "Wayfinding",
      description: "Revised maps",
    });
    expect(() => validateCampaignStateV5Candidate(updated.nextState)).not.toThrow();
  });

  it("creates and updates a campaign Academic kind", () => {
    const created = applyCreateSorcererCampaignDefinition(initializedQuiet(), {
      kind: "academic_kind",
      academicKindId: KIND_ID as never,
      name: "Cartomancer",
      action: "Reads the cards",
    });
    const updated = applyUpdateSorcererCampaignDefinition(created.nextState, {
      kind: "academic_kind",
      academicKindId: KIND_ID as never,
      expectedName: "Cartomancer",
      expectedAction: "Reads the cards",
      name: "Oracle",
      action: "Interprets omens",
    });
    expect(updated.nextState.sorcerer.campaignAcademicKinds[0]).toMatchObject({
      academicKindId: KIND_ID,
      name: "Oracle",
      action: "Interprets omens",
    });
  });

  it("creates and updates a campaign Recipe without parsing recipe text", () => {
    const created = applyCreateSorcererCampaignDefinition(initializedQuiet(), {
      kind: "recipe",
      recipeId: RECIPE_ID as never,
      name: "Moon Ink",
      recipeText: "Mix silver and night.",
    });
    const updated = applyUpdateSorcererCampaignDefinition(created.nextState, {
      kind: "recipe",
      recipeId: RECIPE_ID as never,
      expectedName: "Moon Ink",
      expectedRecipeText: "Mix silver and night.",
      name: "Star Ink",
      recipeText: "Mix silver and starlight.",
    });
    expect(updated.nextState.sorcerer.campaignRecipes[0]).toEqual({
      recipeId: RECIPE_ID,
      name: "Star Ink",
      recipeText: "Mix silver and starlight.",
    });
  });

  it("creates a Knowledge method atomically with one paired Research Position", () => {
    const before = initializedQuiet();
    const positionCount = before.sorcerer.researchPositions.length;
    const created = applyCreateSorcererCampaignDefinition(before, {
      kind: "knowledge_method",
      knowledgeMethodId: METHOD_ID as never,
      researchPositionId: POSITION_ID as never,
      name: "Listening to bells",
      description: "Hear the hidden hours",
    });
    expect(created.nextState.sorcerer.campaignKnowledgeMethods).toEqual([{
      knowledgeMethodId: METHOD_ID,
      name: "Listening to bells",
      description: "Hear the hidden hours",
    }]);
    const paired = created.nextState.sorcerer.researchPositions.filter(
      (position) => position.positionId === POSITION_ID,
    );
    expect(paired).toHaveLength(1);
    expect(paired[0]?.target).toEqual({
      kind: "campaign_knowledge_method",
      knowledgeMethodId: METHOD_ID,
    });
    expect(created.nextState.sorcerer.researchPositions).toHaveLength(positionCount + 1);
    const updated = applyUpdateSorcererCampaignDefinition(created.nextState, {
      kind: "knowledge_method",
      knowledgeMethodId: METHOD_ID as never,
      expectedName: "Listening to bells",
      expectedDescription: "Hear the hidden hours",
      name: "Bell hours",
      description: "Revised listening",
    });
    expect(updated.nextState.sorcerer.campaignKnowledgeMethods[0]?.knowledgeMethodId).toBe(METHOD_ID);
    expect(updated.nextState.sorcerer.researchPositions.find((position) => position.positionId === POSITION_ID)?.target)
      .toEqual({ kind: "campaign_knowledge_method", knowledgeMethodId: METHOD_ID });
    expect(() => validateCampaignStateV5Candidate(updated.nextState)).not.toThrow();
  });

  it("leaves no partial method or Position when Knowledge-method creation fails", () => {
    const before = initializedQuiet();
    expectCode(
      () => applyCreateSorcererCampaignDefinition(before, {
        kind: "knowledge_method",
        knowledgeMethodId: "not-valid" as never,
        researchPositionId: POSITION_ID as never,
        name: "Broken",
        description: "Nope",
      }),
      "INVALID_CAMPAIGN_STATE",
    );
    expect(before.sorcerer.campaignKnowledgeMethods).toHaveLength(0);
    expect(before.sorcerer.researchPositions.some((position) => position.positionId === POSITION_ID)).toBe(false);
  });
});

describe("add_sorcerer_arcanist reliable", () => {
  it("creates Denizen, Reliable profile, overlay, and appends at the top of towerOrder", () => {
    const before = initializedDynamic();
    const previousOrder = [...before.sorcerer.towerOrder];
    const result = applyAddSorcererArcanist(before, {
      subject: { kind: "create_denizen", denizenId: NEW_DEN, name: "Ione", description: null },
      school: { kind: "source", schoolId: "enchantment" },
      placement: { kind: "tower" },
      expectedTowerOrder: before.sorcerer.towerOrder,
    });
    const denizen = result.nextState.world.denizens.find((entry) => entry.denizenId === NEW_DEN);
    expect(denizen?.name).toBe("Ione");
    expect(denizen?.powerfulProfile).toMatchObject({
      taxonomies: [{ kind: "builtin", taxonomyId: "arcanist" }],
      status: { kind: "standard", value: "reliable" },
      goal: null,
    });
    expect(result.nextState.sorcerer.arcanists[result.nextState.sorcerer.arcanists.length - 1]).toMatchObject({
      denizenId: NEW_DEN,
      placement: { kind: "tower" },
      disruptiveProfile: null,
    });
    expect(result.nextState.sorcerer.towerOrder.slice(0, -1)).toEqual(previousOrder);
    expect(result.nextState.sorcerer.towerOrder[result.nextState.sorcerer.towerOrder.length - 1]).toBe(NEW_DEN);
    expect(result.events[0]?.type).toBe("sorcerer_arcanist_added");
    expect(() => validateCampaignStateV5Candidate(result.nextState)).not.toThrow();
  });

  it("leaves no partial Denizen when Reliable creation fails", () => {
    const before = initializedDynamic();
    expectCode(
      () => applyAddSorcererArcanist(before, {
        subject: { kind: "create_denizen", denizenId: NEW_DEN, name: "Ione", description: null },
        school: { kind: "source", schoolId: "enchantment" },
        placement: { kind: "tower" },
        expectedTowerOrder: [denizenId(4)],
      }),
      "STALE_COMMAND_PRECONDITION",
    );
    expect(before.world.denizens.some((denizen) => denizen.denizenId === NEW_DEN)).toBe(false);
    expect(before.sorcerer.arcanists.some((arcanist) => arcanist.denizenId === NEW_DEN)).toBe(false);
  });
});

describe("add_sorcerer_arcanist disruptive", () => {
  it("creates a Disruptive Arcanist in another Domain outside towerOrder", () => {
    const before = initializedQuiet();
    const result = applyAddSorcererArcanist(before, {
      subject: { kind: "create_denizen", denizenId: NEW_DEN, name: "Vex", description: "A rival" },
      school: { kind: "source", schoolId: "enchantment" },
      placement: {
        kind: "other_domain",
        seatId: "necromancer",
        disruptiveProfile: disruptiveProfile(),
      },
    });
    const denizen = result.nextState.world.denizens.find((entry) => entry.denizenId === NEW_DEN);
    expect(denizen?.powerfulProfile?.status).toEqual({ kind: "standard", value: "disruptive" });
    expect(result.nextState.sorcerer.towerOrder).not.toContain(NEW_DEN);
    expect(result.nextState.sorcerer.arcanists[result.nextState.sorcerer.arcanists.length - 1]).toMatchObject({
      denizenId: NEW_DEN,
      placement: { kind: "other_domain", seatId: "necromancer" },
    });
    expect(() => validateCampaignStateV5Candidate(result.nextState)).not.toThrow();
  });

  it("enforces source-School Prentice spell rules and campaign-School emptiness", () => {
    const before = campaignSchoolState();
    expectCode(
      () => applyAddSorcererArcanist(before, {
        subject: { kind: "create_denizen", denizenId: NEW_DEN, name: "Vex", description: null },
        school: { kind: "source", schoolId: "enchantment" },
        placement: {
          kind: "other_domain",
          seatId: "warlock",
          disruptiveProfile: disruptiveProfile({ prenticeSpellIds: [] }),
        },
      }),
      "INVALID_CAMPAIGN_STATE",
      /1 or 2/,
    );
    expectCode(
      () => applyAddSorcererArcanist(before, {
        subject: { kind: "create_denizen", denizenId: NEW_DEN, name: "Vex", description: null },
        school: { kind: "source", schoolId: "enchantment" },
        placement: {
          kind: "other_domain",
          seatId: "warlock",
          disruptiveProfile: disruptiveProfile({
            prenticeSpellIds: ["hand_of_power", "bombardment", "mending"],
          }),
        },
      }),
      "INVALID_CAMPAIGN_STATE",
      /1 or 2/,
    );
    expectCode(
      () => applyAddSorcererArcanist(before, {
        subject: { kind: "create_denizen", denizenId: NEW_DEN, name: "Vex", description: null },
        school: { kind: "source", schoolId: "enchantment" },
        placement: {
          kind: "other_domain",
          seatId: "warlock",
          disruptiveProfile: disruptiveProfile({ prenticeSpellIds: ["scrying"] }),
        },
      }),
      "INVALID_CAMPAIGN_STATE",
      /does not belong/,
    );
    expectCode(
      () => applyAddSorcererArcanist(before, {
        subject: { kind: "create_denizen", denizenId: NEW_DEN, name: "Vex", description: null },
        school: { kind: "campaign", schoolId: SCHOOL_ID as never },
        placement: {
          kind: "other_domain",
          seatId: "warlock",
          disruptiveProfile: disruptiveProfile({ prenticeSpellIds: ["hand_of_power"] }),
        },
      }),
      "INVALID_CAMPAIGN_STATE",
      /empty for campaign-created/,
    );
    const campaignPrentice = applyAddSorcererArcanist(before, {
      subject: { kind: "create_denizen", denizenId: NEW_DEN, name: "Vex", description: null },
      school: { kind: "campaign", schoolId: SCHOOL_ID as never },
      placement: {
        kind: "other_domain",
        seatId: "warlock",
        disruptiveProfile: disruptiveProfile({ prenticeSpellIds: [] }),
      },
    });
    expect(
      campaignPrentice.nextState.sorcerer.arcanists[campaignPrentice.nextState.sorcerer.arcanists.length - 1]
        ?.disruptiveProfile?.prenticeSpellIds,
    ).toEqual([]);
    expectCode(
      () => applyAddSorcererArcanist(before, {
        subject: { kind: "create_denizen", denizenId: NEW_DEN_2, name: "Master Vex", description: null },
        school: { kind: "source", schoolId: "enchantment" },
        placement: {
          kind: "other_domain",
          seatId: "sage",
          disruptiveProfile: disruptiveProfile({ rank: "master", prenticeSpellIds: ["hand_of_power"] }),
        },
      }),
      "INVALID_CAMPAIGN_STATE",
      /Journeyman\/Master/,
    );
  });
});

describe("update_sorcerer_arcanist movement", () => {
  it("records Reliable Tower to Disruptive Domain without changing Denizen identity", () => {
    const before = initializedDynamic();
    const current = before.sorcerer.arcanists.find((arcanist) => arcanist.denizenId === denizenId(10))!;
    const result = applyUpdateSorcererArcanist(before, {
      denizenId: denizenId(10),
      expectedArcanist: current,
      school: current.school,
      placement: { kind: "other_domain", seatId: "faustian" },
      disruptiveProfile: disruptiveProfile({ rank: "journeyman", prenticeSpellIds: [] }),
      expectedTowerOrder: before.sorcerer.towerOrder,
    });
    const moved = result.nextState.sorcerer.arcanists.find((arcanist) => arcanist.denizenId === denizenId(10));
    expect(moved?.placement).toEqual({ kind: "other_domain", seatId: "faustian" });
    expect(moved?.disruptiveProfile?.rank).toBe("journeyman");
    expect(result.nextState.sorcerer.towerOrder).not.toContain(denizenId(10));
    expect(result.nextState.world.denizens.find((denizen) => denizen.denizenId === denizenId(10))?.powerfulProfile?.status)
      .toEqual({ kind: "standard", value: "disruptive" });
    expect(() => validateCampaignStateV5Candidate(result.nextState)).not.toThrow();
  });

  it("corrects Disruptive back to Reliable and appends at the top of the Arcanist band", () => {
    const tower = initializedDynamic();
    const current = tower.sorcerer.arcanists.find((arcanist) => arcanist.denizenId === denizenId(10))!;
    const disruptive = applyUpdateSorcererArcanist(tower, {
      denizenId: denizenId(10),
      expectedArcanist: current,
      school: current.school,
      placement: { kind: "other_domain", seatId: "mariner" },
      disruptiveProfile: disruptiveProfile({ rank: "journeyman", prenticeSpellIds: [] }),
      expectedTowerOrder: tower.sorcerer.towerOrder,
    }).nextState;
    const previousOrder = [...disruptive.sorcerer.towerOrder];
    const result = applyUpdateSorcererArcanist(disruptive, {
      denizenId: denizenId(10),
      expectedArcanist: disruptive.sorcerer.arcanists.find((arcanist) => arcanist.denizenId === denizenId(10))!,
      school: current.school,
      placement: { kind: "tower" },
      disruptiveProfile: null,
      expectedTowerOrder: disruptive.sorcerer.towerOrder,
    });
    expect(result.nextState.sorcerer.arcanists.find((arcanist) => arcanist.denizenId === denizenId(10))).toMatchObject({
      placement: { kind: "tower" },
      disruptiveProfile: null,
    });
    expect(result.nextState.sorcerer.towerOrder.slice(0, -1)).toEqual(previousOrder);
    expect(result.nextState.sorcerer.towerOrder[result.nextState.sorcerer.towerOrder.length - 1]).toBe(denizenId(10));
    expect(result.nextState.world.denizens.find((denizen) => denizen.denizenId === denizenId(10))?.powerfulProfile?.status)
      .toEqual({ kind: "standard", value: "reliable" });
  });

  it("rejects stale expected Arcanist or Tower input", () => {
    const before = initializedDynamic();
    const current = before.sorcerer.arcanists.find((arcanist) => arcanist.denizenId === denizenId(10))!;
    expectCode(
      () => applyUpdateSorcererArcanist(before, {
        denizenId: denizenId(10),
        expectedArcanist: { ...current, school: { kind: "source", schoolId: "artifice" } },
        school: { kind: "source", schoolId: "enchantment" },
        placement: current.placement,
        disruptiveProfile: null,
        expectedTowerOrder: before.sorcerer.towerOrder,
      }),
      "STALE_COMMAND_PRECONDITION",
    );
    expectCode(
      () => applyUpdateSorcererArcanist(before, {
        denizenId: denizenId(10),
        expectedArcanist: current,
        school: { kind: "source", schoolId: "enchantment" },
        placement: current.placement,
        disruptiveProfile: null,
        expectedTowerOrder: [denizenId(4)],
      }),
      "STALE_COMMAND_PRECONDITION",
    );
  });
});

describe("add_sorcerer_construct and instructions", () => {
  it("atomically creates Denizen, Reliable Construct profile, campaign Truths, and overlay", () => {
    const before = initializedQuiet();
    const result = applyAddSorcererConstruct(before, {
      denizenId: NEW_DEN,
      name: "Brass Sentinel",
      description: null,
      truths: [{ truthId: TRUTH_ID, text: "It never sleeps." }],
      instructions: [{ condition: "If a stranger climbs", result: "Then it bars the stair." }],
    });
    const denizen = result.nextState.world.denizens.find((entry) => entry.denizenId === NEW_DEN);
    expect(denizen?.powerfulProfile).toMatchObject({
      taxonomies: [{ kind: "builtin", taxonomyId: "construct" }],
      status: { kind: "standard", value: "reliable" },
      goal: null,
      methods: [],
    });
    expect(denizen?.powerfulProfile?.truths).toEqual([{
      truthId: TRUTH_ID,
      text: "It never sleeps.",
      origin: "campaign",
    }]);
    expect(result.nextState.sorcerer.constructs[0]).toEqual({
      denizenId: NEW_DEN,
      instructions: [{ condition: "If a stranger climbs", result: "Then it bars the stair." }],
    });
    const presentation = readSorcererBoardReference(result.nextState).constructs[0];
    expect(presentation?.truths).toEqual([{ truthId: TRUTH_ID, text: "It never sleeps." }]);
    expect(presentation?.instructions).toEqual([{ condition: "If a stranger climbs", result: "Then it bars the stair." }]);
    expect((presentation as { truthText?: unknown } | undefined)?.truthText).toBeUndefined();
    expect(() => validateCampaignStateV5Candidate(result.nextState)).not.toThrow();
  });

  it("replaces If/Then instructions with expected-current CAS and stays atomic on failure", () => {
    const created = applyAddSorcererConstruct(initializedQuiet(), {
      denizenId: NEW_DEN,
      name: "Brass Sentinel",
      description: null,
      truths: [{ truthId: TRUTH_ID, text: "It never sleeps." }, { truthId: TRUTH_ID_2, text: "It obeys Ione." }],
      instructions: [{ condition: "If dusk", result: "Then it lights lamps." }],
    }).nextState;
    const replaced = applySetSorcererConstructInstructions(created, {
      denizenId: NEW_DEN,
      expectedInstructions: [{ condition: "If dusk", result: "Then it lights lamps." }],
      instructions: [{ condition: "If dawn", result: "Then it opens the gate." }],
    });
    expect(replaced.nextState.sorcerer.constructs[0]?.instructions).toEqual([
      { condition: "If dawn", result: "Then it opens the gate." },
    ]);
    expectCode(
      () => applySetSorcererConstructInstructions(created, {
        denizenId: NEW_DEN,
        expectedInstructions: [{ condition: "If noon", result: "Then it waits." }],
        instructions: [{ condition: "If dawn", result: "Then it opens the gate." }],
      }),
      "STALE_COMMAND_PRECONDITION",
    );
    expect(created.sorcerer.constructs[0]?.instructions).toEqual([
      { condition: "If dusk", result: "Then it lights lamps." },
    ]);
    expectCode(
      () => applyAddSorcererConstruct(initializedQuiet(), {
        denizenId: NEW_DEN,
        name: "Broken",
        description: null,
        truths: [],
        instructions: [],
      }),
      "INVALID_CAMPAIGN_STATE",
      /one or more Truths/,
    );
    expect(initializedQuiet().world.denizens.some((denizen) => denizen.denizenId === NEW_DEN)).toBe(false);
  });
});

describe("sorcerer innovations", () => {
  it("adds, revises, and removes an Innovation while keeping School derived", () => {
    const before = initializedQuiet();
    const added = applyAddSorcererInnovation(before, {
      innovationId: INNOVATION_ID as never,
      spellId: "hand_of_power",
      text: "The chant may be whispered.",
    });
    expect(added.nextState.sorcerer.innovations[0]).toEqual({
      innovationId: INNOVATION_ID,
      spellId: "hand_of_power",
      text: "The chant may be whispered.",
    });
    expect("school" in added.nextState.sorcerer.innovations[0]!).toBe(false);
    const board = readSorcererBoardReference(added.nextState);
    expect(board.innovations[0]).toMatchObject({
      spellName: "Hand of Power",
      schoolLabel: "Enchantment",
      text: "The chant may be whispered.",
    });
    const revised = applyReviseSorcererInnovation(added.nextState, {
      innovationId: INNOVATION_ID as never,
      expectedSpellId: "hand_of_power",
      expectedText: "The chant may be whispered.",
      spellId: "scrying",
      text: "The basin may be a puddle.",
    });
    expect(revised.nextState.sorcerer.innovations[0]).toEqual({
      innovationId: INNOVATION_ID,
      spellId: "scrying",
      text: "The basin may be a puddle.",
    });
    const removed = applyRemoveSorcererInnovation(revised.nextState, {
      innovationId: INNOVATION_ID as never,
      expectedSpellId: "scrying",
      expectedText: "The basin may be a puddle.",
    });
    expect(removed.nextState.sorcerer.innovations).toEqual([]);
    expect(() => validateCampaignStateV5Candidate(removed.nextState)).not.toThrow();
  });

  it("rejects Great Works and stale revision/removal", () => {
    const before = initializedQuiet();
    expectCode(
      () => applyAddSorcererInnovation(before, {
        innovationId: INNOVATION_ID as never,
        spellId: "apotheosis",
        text: "Forbidden.",
      }),
      "INVALID_CAMPAIGN_STATE",
      /Great Work/,
    );
    const added = applyAddSorcererInnovation(before, {
      innovationId: INNOVATION_ID as never,
      spellId: "hand_of_power",
      text: "Whispered.",
    }).nextState;
    expectCode(
      () => applyReviseSorcererInnovation(added, {
        innovationId: INNOVATION_ID as never,
        expectedSpellId: "scrying",
        expectedText: "Whispered.",
        spellId: "mending",
        text: "Changed.",
      }),
      "STALE_COMMAND_PRECONDITION",
    );
    expectCode(
      () => applyRemoveSorcererInnovation(added, {
        innovationId: INNOVATION_ID as never,
        expectedSpellId: "hand_of_power",
        expectedText: "Other.",
      }),
      "STALE_COMMAND_PRECONDITION",
    );
  });
});

describe("sorcerer advanced command/event contract", () => {
  it("fingerprints, coherence, and idempotent replay hold for representative C1 commands", async () => {
    const before = withKnowledge(initializedQuiet());
    const multipliers = canonicalizeSetSorcererResearcherProductionMultipliersInput({
      expectedCurrent: 1,
      expectedNextMonth: 2,
      current: 3,
      nextMonth: 1,
    });
    const fingerprint = setSorcererResearcherProductionMultipliersFingerprint(CAMPAIGN_A, multipliers);
    const prepare = () => ({
      commandType: "set_sorcerer_researcher_production_multipliers" as const,
      commandFingerprint: fingerprint,
      apply: (current: CampaignStateV5) => applySetSorcererResearcherProductionMultipliers(current, multipliers),
    });
    const first = recordingIo({ campaign: campaignOf(before) });
    const receipt = await executeOrdinaryLogicalCommand(
      first.io,
      { commandId: COMMAND_1, expectedCampaignId: CAMPAIGN_A },
      prepare,
    );
    expect(receipt).toEqual({ revision: 5 });
    expect(first.commits[0]?.events[0]?.type).toBe("sorcerer_researcher_production_multipliers_set");
    expect(() => validateEventCoherenceForTest(first.commits[0]!, 1)).not.toThrow();

    const replay = recordingIo({
      campaign: campaignOf(first.commits[0]!.nextState, 5),
      accepted: {
        commandType: "set_sorcerer_researcher_production_multipliers",
        commandFingerprint: fingerprint,
        campaignRevision: 5,
      },
      snapshot: first.commits[0]!.nextState,
    });
    const replayReceipt = await executeOrdinaryLogicalCommand(
      replay.io,
      { commandId: COMMAND_1, expectedCampaignId: CAMPAIGN_A },
      prepare,
    );
    expect(replayReceipt).toEqual({ revision: 5 });
    expect(replay.commits).toHaveLength(0);

    const lawInput = canonicalizeSetSorcererLawsInput({
      expectedActiveLawIds: ["first", "second"],
      expectedUnrevealedLawIds: ["third"],
      activeLawIds: ["first"],
      unrevealedLawIds: ["second", "third"],
    });
    expect(setSorcererLawsFingerprint(CAMPAIGN_A, lawInput)).toMatch(/^set_sorcerer_laws:v1:/);
    expect(createSorcererCampaignDefinitionFingerprint(CAMPAIGN_A, canonicalizeCreateSorcererCampaignDefinitionInput({
      kind: "school",
      schoolId: SCHOOL_ID as never,
      name: "Cartography",
      description: "Maps",
    }))).toMatch(/^create_sorcerer_campaign_definition:v1:/);
    expect(updateSorcererCampaignDefinitionFingerprint(CAMPAIGN_A, canonicalizeUpdateSorcererCampaignDefinitionInput({
      kind: "school",
      schoolId: SCHOOL_ID as never,
      expectedName: "Cartography",
      expectedDescription: "Maps",
      name: "Wayfinding",
      description: "Revised",
    }))).toMatch(/^update_sorcerer_campaign_definition:v1:/);
    expect(addSorcererArcanistFingerprint(CAMPAIGN_A, canonicalizeAddSorcererArcanistInput({
      subject: { kind: "create_denizen", denizenId: NEW_DEN, name: "Ione", description: null },
      school: { kind: "source", schoolId: "enchantment" },
      placement: { kind: "tower" },
      expectedTowerOrder: before.sorcerer.towerOrder,
    }))).toMatch(/^add_sorcerer_arcanist:v1:/);
    expect(updateSorcererArcanistFingerprint(CAMPAIGN_A, canonicalizeUpdateSorcererArcanistInput({
      denizenId: denizenId(10),
      expectedArcanist: {
        denizenId: denizenId(10),
        school: { kind: "source", schoolId: "divination" },
        placement: { kind: "tower" },
        disruptiveProfile: null,
      },
      school: { kind: "source", schoolId: "enchantment" },
      placement: { kind: "tower" },
      disruptiveProfile: null,
      expectedTowerOrder: before.sorcerer.towerOrder,
    }))).toMatch(/^update_sorcerer_arcanist:v1:/);
    expect(addSorcererConstructFingerprint(CAMPAIGN_A, canonicalizeAddSorcererConstructInput({
      denizenId: NEW_DEN,
      name: "Brass Sentinel",
      description: null,
      truths: [{ truthId: TRUTH_ID, text: "It never sleeps." }],
      instructions: [],
    }))).toMatch(/^add_sorcerer_construct:v1:/);
    expect(setSorcererConstructInstructionsFingerprint(CAMPAIGN_A, canonicalizeSetSorcererConstructInstructionsInput({
      denizenId: NEW_DEN,
      expectedInstructions: [],
      instructions: [{ condition: "If dusk", result: "Then lamps." }],
    }))).toMatch(/^set_sorcerer_construct_instructions:v1:/);
    expect(addSorcererInnovationFingerprint(CAMPAIGN_A, canonicalizeAddSorcererInnovationInput({
      innovationId: INNOVATION_ID as never,
      spellId: "hand_of_power",
      text: "Whispered.",
    }))).toMatch(/^add_sorcerer_innovation:v1:/);
    expect(reviseSorcererInnovationFingerprint(CAMPAIGN_A, canonicalizeReviseSorcererInnovationInput({
      innovationId: INNOVATION_ID as never,
      expectedSpellId: "hand_of_power",
      expectedText: "Whispered.",
      spellId: "scrying",
      text: "Puddle.",
    }))).toMatch(/^revise_sorcerer_innovation:v1:/);
    expect(removeSorcererInnovationFingerprint(CAMPAIGN_A, canonicalizeRemoveSorcererInnovationInput({
      innovationId: INNOVATION_ID as never,
      expectedSpellId: "scrying",
      expectedText: "Puddle.",
    }))).toMatch(/^remove_sorcerer_innovation:v1:/);
  });
});
