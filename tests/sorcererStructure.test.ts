import { describe, expect, it } from "vitest";
import type {
  CampaignSchoolOfMagicId,
  CampaignStateV5,
  DenizenId,
  IsleId,
  PlaceId,
  PlayerId,
  PowerfulDenizenProfile,
  PowerfulDenizenTruthId,
  SorcererCampaignAcademicKindId,
  SorcererCampaignKnowledgeMethodId,
  SorcererCampaignRecipeId,
  SorcererInnovationId,
  SorcererState,
  WizardId,
} from "../shared/domain";
import {
  BLANK_WIZARD_CHARACTER_V5,
  DomainError,
  EMPTY_MAGIC_CONSUMABLES_STATE,
  EMPTY_SHARED_WORLD_STATE,
  EMPTY_SORCERER_STATE,
  EMPTY_WARLOCK_STATE,
  SORCERER_BASE_RESEARCH_POSITION_IDS,
  SORCERER_RESEARCH_TEMPLE_IDS,
  buildSourceResearchPositions,
  initialCampaignState,
  isValidSorcererInnovationId,
  isValidSorcererResearchPositionId,
  validateCampaignStateV5Candidate,
  validateSorcererStructure,
} from "../shared/domain";
import { makeTestCampaignStateV5 } from "./test-state";

const PLR_A = "plr_00000000-0000-0000-0000-00000000000a" as PlayerId;
const WIZ_A = "wiz_00000000-0000-0000-0000-00000000000a" as WizardId;
const ISL_SPYR = "isl_00000000-0000-0000-0000-0000000000aa" as IsleId;
const PLC_TOWER = "plc_00000000-0000-0000-0000-0000000000aa" as PlaceId;
const PLC_UNIV = "plc_00000000-0000-0000-0000-0000000000ab" as PlaceId;
const CAMPAIGN_SCHOOL = "ssch_00000000-0000-0000-0000-0000000000aa" as CampaignSchoolOfMagicId;
const CAMPAIGN_KIND = "sack_00000000-0000-0000-0000-0000000000aa" as SorcererCampaignAcademicKindId;
const CAMPAIGN_RECIPE = "srec_00000000-0000-0000-0000-0000000000aa" as SorcererCampaignRecipeId;
const CAMPAIGN_METHOD = "sknm_00000000-0000-0000-0000-0000000000aa" as SorcererCampaignKnowledgeMethodId;
const CAMPAIGN_POSITION = "srp_00000000-0000-0000-0000-0000000000aa";
const INNOVATION_1 = "sinn_00000000-0000-0000-0000-0000000000aa" as SorcererInnovationId;
const TRUTH_1 = "pdtru_00000000-0000-0000-0000-0000000000aa" as PowerfulDenizenTruthId;

function denizenId(n: number): DenizenId {
  return `den_00000000-0000-0000-0000-${String(n).padStart(12, "0")}` as DenizenId;
}

function expectInvalid(run: () => unknown, pattern: RegExp): void {
  expect(run).toThrow(DomainError);
  try {
    run();
  } catch (error) {
    expect((error as DomainError).code).toBe("INVALID_CAMPAIGN_STATE");
    expect((error as DomainError).message).toMatch(pattern);
  }
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

function constructProfile(): PowerfulDenizenProfile {
  return {
    taxonomies: [{ kind: "builtin", taxonomyId: "construct" }],
    status: { kind: "standard", value: "reliable" },
    goal: null,
    methods: [],
    truths: [{ truthId: TRUTH_1, text: "It was built to guard the stair", origin: "source" }],
  };
}

function denizen(id: DenizenId, name: string, profile: PowerfulDenizenProfile | null = null) {
  return {
    denizenId: id,
    name,
    representation: "individual" as const,
    description: null,
    mortalityState: "not_deceased" as const,
    powerfulProfile: profile,
  };
}

function sourcePositions() {
  return buildSourceResearchPositions({
    orreryHouses: [0, 4, 8],
    ideologyIds: ["aristocracy", "mercantilism"],
    seaRegionIds: ["bay_of_ishana", "wizard_strait"],
  });
}

function initializedShape(overrides?: Partial<SorcererState>): SorcererState {
  return {
    ...EMPTY_SORCERER_STATE,
    initialized: true,
    spyrholmIsleId: ISL_SPYR,
    towerPlaceId: PLC_TOWER,
    universityPlaceId: PLC_UNIV,
    activeLawIds: ["first", "second"],
    unrevealedLawIds: [],
    researchPositions: sourcePositions(),
    knowledge: { ...EMPTY_SORCERER_STATE.knowledge },
    ...overrides,
  };
}

function worldForInit(extraDenizens: ReturnType<typeof denizen>[] = []) {
  return {
    ...EMPTY_SHARED_WORLD_STATE,
    isles: [{ isleId: ISL_SPYR, name: "Spyrholm", description: null }],
    places: [
      { placeId: PLC_TOWER, name: "Sorcerer's Tower", description: null, placement: { kind: "on_isle" as const, isleId: ISL_SPYR } },
      { placeId: PLC_UNIV, name: "Spyrholm University", description: null, placement: { kind: "on_isle" as const, isleId: ISL_SPYR } },
    ],
    denizens: extraDenizens,
  };
}

function campaign(sorcerer: SorcererState, extra?: Partial<CampaignStateV5>): CampaignStateV5 {
  return makeTestCampaignStateV5({
    world: worldForInit(),
    ...extra,
    sorcerer,
  });
}

describe("empty/default V5 Sorcerer integration", () => {
  it("initialCampaignState includes valid empty Sorcerer and empty magicConsumables", () => {
    const state = initialCampaignState();
    expect(state.sorcerer).toEqual(EMPTY_SORCERER_STATE);
    expect(state.magicConsumables).toEqual(EMPTY_MAGIC_CONSUMABLES_STATE);
    expect(state.sorcerer.initialized).toBe(false);
    expect(state.sorcerer.knowledge).toEqual({
      researchOrigin: 0,
      other: 0,
      nextMonthResearchOrigin: 0,
      researcherProductionMultiplierCurrent: 1,
      researcherProductionMultiplierNextMonth: 1,
    });
    expect(state.sorcerer.archivesOpen).toBe(false);
    expect(() => validateCampaignStateV5Candidate(state)).not.toThrow();
    expect(() => validateSorcererStructure(EMPTY_SORCERER_STATE)).not.toThrow();
  });
});

describe("Sorcerer structural validation", () => {
  it("rejects uninitialized state that is not empty", () => {
    expectInvalid(
      () => validateSorcererStructure({ ...EMPTY_SORCERER_STATE, activeLawIds: ["first"] }),
      /Uninitialized Sorcerer Laws must be empty/,
    );
  });

  it("accepts disjoint Law IDs and rejects duplicates or overlap without requiring exactly two active Laws", () => {
    const oneLaw = initializedShape({ activeLawIds: ["seventh"], unrevealedLawIds: ["first", "second"] });
    expect(() => validateSorcererStructure(oneLaw)).not.toThrow();
    const threeActive = initializedShape({ activeLawIds: ["first", "second", "third"] });
    expect(() => validateSorcererStructure(threeActive)).not.toThrow();
    expectInvalid(
      () => validateSorcererStructure(initializedShape({ activeLawIds: ["first", "first"] })),
      /Duplicate active Law/,
    );
    expectInvalid(
      () => validateSorcererStructure(initializedShape({ activeLawIds: ["first", "second"], unrevealedLawIds: ["second"] })),
      /cannot be both active and unrevealed/,
    );
  });

  it("validates campaign definition IDs and nonblank text", () => {
    const valid = initializedShape({
      campaignSchools: [{ schoolId: CAMPAIGN_SCHOOL, name: "Glass", description: "Sees through smoke." }],
      campaignAcademicKinds: [{ academicKindId: CAMPAIGN_KIND, name: "Cartographer", action: "Draws a map." }],
      campaignRecipes: [{ recipeId: CAMPAIGN_RECIPE, name: "Quicklime", recipeText: "Heat limestone." }],
      campaignKnowledgeMethods: [{ knowledgeMethodId: CAMPAIGN_METHOD, name: "Star-count", description: "Count winter stars." }],
    });
    expect(() => validateSorcererStructure(valid)).not.toThrow();
    expectInvalid(
      () => validateSorcererStructure(initializedShape({
        campaignSchools: [{ schoolId: CAMPAIGN_SCHOOL, name: "   ", description: "text" }],
      })),
      /name must be a nonblank string/,
    );
  });

  it("rejects invalid Knowledge counts and non-positive multipliers", () => {
    expectInvalid(
      () => validateSorcererStructure(initializedShape({
        knowledge: { ...EMPTY_SORCERER_STATE.knowledge, researchOrigin: -1 },
      })),
      /researchOrigin must be a non-negative safe integer/,
    );
    expectInvalid(
      () => validateSorcererStructure(initializedShape({
        knowledge: { ...EMPTY_SORCERER_STATE.knowledge, researcherProductionMultiplierCurrent: 0 },
      })),
      /researcherProductionMultiplierCurrent must be a positive safe integer/,
    );
  });
});

describe("Research Position references", () => {
  it("builds the source 15-position topology with four non-Hestar Temples and distinct House/Ideology/Sea targets", () => {
    const positions = sourcePositions();
    expect(positions).toHaveLength(15);
    expect(positions.map((position) => position.positionId)).toEqual([...SORCERER_BASE_RESEARCH_POSITION_IDS]);
    expect(SORCERER_RESEARCH_TEMPLE_IDS).toEqual(["krolis", "notor", "ushin", "zephon"]);
    expect(positions.filter((position) => position.target.kind === "hierophant_temple").map((position) => {
      return position.target.kind === "hierophant_temple" ? position.target.templeId : null;
    })).toEqual(["krolis", "notor", "ushin", "zephon"]);
    const houses = positions.flatMap((position) => position.target.kind === "orrery_house" ? [position.target.house] : []);
    expect(new Set(houses).size).toBe(3);
    expect(() => validateCampaignStateV5Candidate(campaign(initializedShape({ researchPositions: positions })))).not.toThrow();
  });

  it("keeps an additional campaign Knowledge-method Position valid after the base topology", () => {
    const extra = initializedShape({
      campaignKnowledgeMethods: [{ knowledgeMethodId: CAMPAIGN_METHOD, name: "Star-count", description: "Count winter stars." }],
      researchPositions: [
        ...sourcePositions(),
        { positionId: CAMPAIGN_POSITION as SorcererState["researchPositions"][number]["positionId"], target: { kind: "campaign_knowledge_method", knowledgeMethodId: CAMPAIGN_METHOD } },
      ],
    });
    expect(isValidSorcererResearchPositionId(CAMPAIGN_POSITION)).toBe(true);
    expect(extra.researchPositions).toHaveLength(16);
    expect(() => validateCampaignStateV5Candidate(campaign(extra))).not.toThrow();
  });
});

describe("Researchers, Academics, and Tower order", () => {
  it("resolves Researcher Denizens/Positions and rejects duplicate occupants or Academic overlap", () => {
    const researcher = denizen(denizenId(1), "Rook");
    const academic = denizen(denizenId(2), "Ada");
    const base = initializedShape({
      researchers: [{ denizenId: denizenId(1), positionId: "srp_orrery_1" }],
      academics: [{ denizenId: denizenId(2), role: { kind: "student" } }],
      towerOrder: [denizenId(2)],
    });
    expect(() => validateCampaignStateV5Candidate(campaign(base, {
      world: worldForInit([researcher, academic]),
    }))).not.toThrow();

    expectInvalid(
      () => validateSorcererStructure(initializedShape({
        researchers: [
          { denizenId: denizenId(1), positionId: "srp_orrery_1" },
          { denizenId: denizenId(3), positionId: "srp_orrery_1" },
        ],
      })),
      /Duplicate Researcher Position occupant/,
    );
    expectInvalid(
      () => validateSorcererStructure(initializedShape({
        researchers: [{ denizenId: denizenId(2), positionId: "srp_orrery_1" }],
        academics: [{ denizenId: denizenId(2), role: { kind: "student" } }],
        towerOrder: [denizenId(2)],
      })),
      /cannot be both Researcher and Academic/,
    );
  });

  it("resolves Librarian School, Alchemist Recipe, and campaign Academic-kind refs; Tower workers exactly once", () => {
    const people = [
      denizen(denizenId(1), "Lib"),
      denizen(denizenId(2), "Alch"),
      denizen(denizenId(3), "Cart"),
      denizen(denizenId(4), "Arc", arcanistProfile("reliable")),
    ];
    const sorcerer = initializedShape({
      campaignSchools: [{ schoolId: CAMPAIGN_SCHOOL, name: "Glass", description: "Sees through smoke." }],
      campaignRecipes: [{ recipeId: CAMPAIGN_RECIPE, name: "Quicklime", recipeText: "Heat limestone." }],
      campaignAcademicKinds: [{ academicKindId: CAMPAIGN_KIND, name: "Cartographer", action: "Draws a map." }],
      academics: [
        { denizenId: denizenId(1), role: { kind: "librarian", school: { kind: "campaign", schoolId: CAMPAIGN_SCHOOL } } },
        { denizenId: denizenId(2), role: { kind: "alchemist", recipe: { kind: "campaign", recipeId: CAMPAIGN_RECIPE } } },
        { denizenId: denizenId(3), role: { kind: "campaign", academicKindId: CAMPAIGN_KIND } },
      ],
      arcanists: [{
        denizenId: denizenId(4),
        school: { kind: "source", schoolId: "enchantment" },
        placement: { kind: "tower" },
        disruptiveProfile: null,
      }],
      towerOrder: [denizenId(1), denizenId(2), denizenId(3), denizenId(4)],
    });
    expect(() => validateCampaignStateV5Candidate(campaign(sorcerer, { world: worldForInit(people) }))).not.toThrow();

    expectInvalid(
      () => validateCampaignStateV5Candidate(campaign({
        ...sorcerer,
        campaignSchools: [],
      }, { world: worldForInit(people) })),
      /school.schoolId does not resolve/,
    );
    expectInvalid(
      () => validateCampaignStateV5Candidate(campaign({
        ...sorcerer,
        towerOrder: [denizenId(1), denizenId(2), denizenId(3)],
      }, { world: worldForInit(people) })),
      /towerOrder must include every current Tower Academic and Reliable Tower Arcanist exactly once/,
    );
  });
});

describe("Knowledge provenance", () => {
  it("keeps Research-origin, other, next-month Research-origin, and current/next multipliers distinct", () => {
    const sorcerer = initializedShape({
      knowledge: {
        researchOrigin: 4,
        other: 2,
        nextMonthResearchOrigin: 1,
        researcherProductionMultiplierCurrent: 1,
        researcherProductionMultiplierNextMonth: 2,
      },
    });
    expect(sorcerer.knowledge.researchOrigin).not.toBe(sorcerer.knowledge.other);
    expect(sorcerer.knowledge.nextMonthResearchOrigin).toBe(1);
    expect(sorcerer.knowledge.researcherProductionMultiplierNextMonth).toBe(2);
    expect(() => validateSorcererStructure(sorcerer)).not.toThrow();
  });
});

describe("shared magic consumables reference validation", () => {
  it("accepts Tower, Wizard, and Denizen custody and campaign School Tomes; rejects missing subjects/schools", () => {
    const holder = denizen(denizenId(1), "Courier");
    const sorcerer = initializedShape({
      campaignSchools: [{ schoolId: CAMPAIGN_SCHOOL, name: "Glass", description: "Sees through smoke." }],
    });
    const valid = campaign(sorcerer, {
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
      world: worldForInit([holder]),
      magicConsumables: {
        tomes: [
          { school: { kind: "source", schoolId: "enchantment" }, custody: { kind: "sorcerer_tower" }, count: 2 },
          { school: { kind: "campaign", schoolId: CAMPAIGN_SCHOOL }, custody: { kind: "subject", subject: { kind: "wizard", wizardId: WIZ_A } }, count: 1 },
        ],
        reagents: [
          { reagentId: "salt", custody: { kind: "subject", subject: { kind: "denizen", denizenId: denizenId(1) } }, count: 3 },
        ],
      },
    });
    expect(() => validateCampaignStateV5Candidate(valid)).not.toThrow();

    expectInvalid(
      () => validateCampaignStateV5Candidate({
        ...valid,
        magicConsumables: {
          tomes: [{ school: { kind: "source", schoolId: "enchantment" }, custody: { kind: "subject", subject: { kind: "wizard", wizardId: "wiz_00000000-0000-0000-0000-0000000000ff" as WizardId } }, count: 1 }],
          reagents: [],
        },
      }),
      /wizardId does not resolve/,
    );
    expectInvalid(
      () => validateCampaignStateV5Candidate({
        ...valid,
        sorcerer: initializedShape(),
      }),
      /school.schoolId does not resolve/,
    );
    expectInvalid(
      () => validateCampaignStateV5Candidate({
        ...valid,
        magicConsumables: {
          tomes: [],
          reagents: [{ reagentId: "salt", custody: { kind: "subject", subject: { kind: "denizen", denizenId: denizenId(99) } }, count: 1 }],
        },
      }),
      /denizenId does not resolve/,
    );
  });
});

describe("Arcanists and shared Powerful integration", () => {
  it("requires Reliable Tower vs Disruptive other-Domain coherence and source-School Prentice spell matching", () => {
    const reliable = denizen(denizenId(1), "Rel", arcanistProfile("reliable"));
    const disruptive = denizen(denizenId(2), "Dis", arcanistProfile("disruptive"));
    const sorcerer = initializedShape({
      arcanists: [
        {
          denizenId: denizenId(1),
          school: { kind: "source", schoolId: "enchantment" },
          placement: { kind: "tower" },
          disruptiveProfile: null,
        },
        {
          denizenId: denizenId(2),
          school: { kind: "source", schoolId: "enchantment" },
          placement: { kind: "other_domain", seatId: "warlock" },
          disruptiveProfile: {
            primaryElement: "fire",
            rank: "prentice",
            changesOfMagic: ["voice rings like glass"],
            quirk: "never blinks",
            prenticeSpellIds: ["hand_of_power", "mending"],
          },
        },
      ],
      towerOrder: [denizenId(1)],
    });
    expect(() => validateCampaignStateV5Candidate(campaign(sorcerer, { world: worldForInit([reliable, disruptive]) }))).not.toThrow();

    expectInvalid(
      () => validateCampaignStateV5Candidate(campaign({
        ...sorcerer,
        arcanists: [{
          ...sorcerer.arcanists[1]!,
          disruptiveProfile: {
            ...sorcerer.arcanists[1]!.disruptiveProfile!,
            prenticeSpellIds: ["illusion"],
          },
        }, sorcerer.arcanists[0]!],
        towerOrder: [denizenId(1)],
      }, { world: worldForInit([reliable, disruptive]) })),
      /does not belong to School enchantment/,
    );

    const journeyman = initializedShape({
      arcanists: [{
        denizenId: denizenId(2),
        school: { kind: "source", schoolId: "enchantment" },
        placement: { kind: "other_domain", seatId: "mariner" },
        disruptiveProfile: {
          primaryElement: "air",
          rank: "journeyman",
          changesOfMagic: ["hair smokes"],
          quirk: "counts backwards",
          prenticeSpellIds: ["hand_of_power"],
        },
      }],
    });
    expectInvalid(
      () => validateCampaignStateV5Candidate(campaign(journeyman, { world: worldForInit([disruptive]) })),
      /must be empty for Journeyman\/Master ranks/,
    );

    const campaignPrentice = initializedShape({
      campaignSchools: [{ schoolId: CAMPAIGN_SCHOOL, name: "Glass", description: "Sees through smoke." }],
      arcanists: [{
        denizenId: denizenId(2),
        school: { kind: "campaign", schoolId: CAMPAIGN_SCHOOL },
        placement: { kind: "other_domain", seatId: "sage" },
        disruptiveProfile: {
          primaryElement: "water",
          rank: "prentice",
          changesOfMagic: ["skin like frost"],
          quirk: "hums",
          prenticeSpellIds: [],
        },
      }],
    });
    expect(() => validateCampaignStateV5Candidate(campaign(campaignPrentice, { world: worldForInit([disruptive]) }))).not.toThrow();
  });
});

describe("Constructs and Innovations", () => {
  it("requires Construct taxonomy, preserves If/Then text beside shared Truths, and rejects blank instructions", () => {
    const body = denizen(denizenId(1), "Golem", constructProfile());
    const sorcerer = initializedShape({
      constructs: [{
        denizenId: denizenId(1),
        instructions: [{ condition: "If a stranger climbs the stair", result: "Then bar the door" }],
      }],
    });
    const state = campaign(sorcerer, { world: worldForInit([body]) });
    expect(() => validateCampaignStateV5Candidate(state)).not.toThrow();
    expect(state.world.denizens[0]?.powerfulProfile?.truths[0]?.text).toBe("It was built to guard the stair");
    expect(state.sorcerer.constructs[0]?.instructions[0]).toEqual({
      condition: "If a stranger climbs the stair",
      result: "Then bar the door",
    });
    expectInvalid(
      () => validateSorcererStructure(initializedShape({
        constructs: [{ denizenId: denizenId(1), instructions: [{ condition: "   ", result: "Then bar the door" }] }],
      })),
      /condition must be a nonblank string/,
    );
  });

  it("accepts non-Great-Work Innovations without a persisted School and rejects Great Works", () => {
    expect(isValidSorcererInnovationId(INNOVATION_1)).toBe(true);
    const valid = initializedShape({
      innovations: [{ innovationId: INNOVATION_1, spellId: "hand_of_power", text: "The hand now writes." }],
    });
    expect(() => validateSorcererStructure(valid)).not.toThrow();
    expect("school" in valid.innovations[0]!).toBe(false);
    expectInvalid(
      () => validateCampaignStateV5Candidate(campaign(initializedShape({
        innovations: [{ innovationId: INNOVATION_1, spellId: "apotheosis", text: "Forbidden." }],
      }))),
      /must not be a Great Work/,
    );
  });
});

describe("Warlock Sorcerer claim replacement", () => {
  it("resolves a real Research Position and canonical Tower Place, and has no label field", () => {
    const lady = denizen(denizenId(9), "Errant", {
      taxonomies: [{ kind: "builtin", taxonomyId: "errant_noble" }],
      status: { kind: "standard", value: "disruptive" },
      goal: null,
      methods: [],
      truths: [],
    });
    const warlock = {
      ...EMPTY_WARLOCK_STATE,
      errantLadies: [{
        denizenId: denizenId(9),
        clanId: "ix" as const,
        heraldry: { kind: "source_clan" as const, clanId: "ix" as const },
        personalityQuirk: "collects broken compasses",
        currentDomainSeatId: "sorcerer" as const,
        claimedComponent: { kind: "sorcerer_research_position" as const, positionId: "srp_orrery_1" as const },
        controlledLordTitleIds: [],
      }],
    };
    const ok = campaign(initializedShape(), {
      warlock,
      world: worldForInit([lady]),
    });
    expect(ok.warlock.errantLadies[0]?.claimedComponent).toEqual({
      kind: "sorcerer_research_position",
      positionId: "srp_orrery_1",
    });
    expect("label" in ok.warlock.errantLadies[0]!.claimedComponent).toBe(false);
    expect(() => validateCampaignStateV5Candidate(ok)).not.toThrow();

    expectInvalid(
      () => validateCampaignStateV5Candidate(campaign(initializedShape(), {
        warlock: {
          ...warlock,
          errantLadies: [{
            ...warlock.errantLadies[0]!,
            claimedComponent: { kind: "sorcerer_research_position", positionId: CAMPAIGN_POSITION as typeof CAMPAIGN_POSITION & SorcererState["researchPositions"][number]["positionId"] },
          }],
        },
        world: worldForInit([lady]),
      })),
      /positionId does not resolve/,
    );

    const towerClaim = campaign(initializedShape(), {
      warlock: {
        ...warlock,
        errantLadies: [{
          ...warlock.errantLadies[0]!,
          claimedComponent: { kind: "sorcerer_tower", placeId: PLC_TOWER },
        }],
      },
      world: worldForInit([lady]),
    });
    expect(() => validateCampaignStateV5Candidate(towerClaim)).not.toThrow();
    expectInvalid(
      () => validateCampaignStateV5Candidate({
        ...towerClaim,
        warlock: {
          ...warlock,
          errantLadies: [{
            ...warlock.errantLadies[0]!,
            claimedComponent: { kind: "sorcerer_tower", placeId: PLC_UNIV },
          }],
        },
      }),
      /does not resolve to the Sorcerer's Tower/,
    );
  });
});
