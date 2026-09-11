import { describe, it, expect } from "vitest";
import type {
  CampaignStateV5,
  DenizenId,
  MonthOrdinal,
  PlayerId,
  SageState,
  WizardId,
} from "../shared/domain";
import {
  DomainError,
  EMPTY_FAUSTIAN_STATE,
  EMPTY_HIEROPHANT_STATE,
  EMPTY_MARINER_STATE,
  EMPTY_NECROMANCER_STATE,
  EMPTY_PACT_FRAGMENT_OPERATIONAL_STATE,
  EMPTY_SAGE_STATE,
  EMPTY_SHARED_WORLD_STATE,
  EMPTY_WARLOCK_STATE,
  POWERFUL_DENIZEN_BUILTIN_TAXONOMY_IDS,
  SAGE_CYCLE_DEFINITIONS,
  SAGE_CYCLE_IDS,
  SAGE_DESTINY_DEFINITIONS,
  SAGE_DREAMSCAPE_SEGMENT_IDS,
  SAGE_LAW_OF_DREAMING_DEFINITIONS,
  SAGE_LAW_OF_DREAMING_IDS,
  SEVEN_PART_PACT_DRAFT4_ID,
  SEVEN_PART_PACT_DRAFT4_VERSION,
  initialCampaignState,
  isValidSageDestinyInstanceId,
  validateCampaignState,
  validateCampaignStateV5Candidate,
  validateSageStructure,
} from "../shared/domain";
import { campaignStateV5Validator } from "../convex/validators";
import type { SageDestinyInstanceId } from "../shared/domain/sage-state";

const PLR_A = "plr_00000000-0000-0000-0000-00000000000a" as PlayerId;
const WIZ_A = "wiz_00000000-0000-0000-0000-00000000000a" as WizardId;
const WIZ_B = "wiz_00000000-0000-0000-0000-00000000000b" as WizardId;
const DEN_FAIRY_CADRE = "den_00000000-0000-0000-0000-0000000000f1" as DenizenId;
const DEN_FAIRY_ONE = "den_00000000-0000-0000-0000-0000000000f2" as DenizenId;
const DEN_DRUID = "den_00000000-0000-0000-0000-0000000000d1" as DenizenId;
const DEN_OTHER = "den_00000000-0000-0000-0000-0000000000a1" as DenizenId;
const SDI_1 = "sdi_00000000-0000-0000-0000-000000000001" as SageDestinyInstanceId;
const SDI_2 = "sdi_00000000-0000-0000-0000-000000000002" as SageDestinyInstanceId;
const SDI_3 = "sdi_00000000-0000-0000-0000-000000000003" as SageDestinyInstanceId;
const SDI_COPY = "sdi_00000000-0000-0000-0000-00000000000c" as SageDestinyInstanceId;

const EMPTY_PACT_SEATS = {
  necromancer: { status: null, wizardId: null, watcherPlayerId: null },
  hierophant: { status: null, wizardId: null, watcherPlayerId: null },
  warlock: { status: null, wizardId: null, watcherPlayerId: null },
  mariner: { status: null, wizardId: null, watcherPlayerId: null },
  faustian: { status: null, wizardId: null, watcherPlayerId: null },
  sage: { status: null, wizardId: null, watcherPlayerId: null },
  sorcerer: { status: null, wizardId: null, watcherPlayerId: null },
} as const;

const EXPECTED_DESTINIES = [
  { definitionId: "knives_true_prince", name: "The True Prince", suit: "knives", rank: "page" },
  { definitionId: "knives_wolf", name: "The Wolf", suit: "knives", rank: "knight" },
  { definitionId: "knives_hangman", name: "The Hangman", suit: "knives", rank: "queen" },
  { definitionId: "knives_tyrant", name: "The Tyrant", suit: "knives", rank: "king" },
  { definitionId: "knives_cataclysm", name: "The Cataclysm", suit: "knives", rank: "beast" },
  { definitionId: "wands_herald", name: "The Herald", suit: "wands", rank: "page" },
  { definitionId: "wands_champion", name: "The Champion", suit: "wands", rank: "knight" },
  { definitionId: "wands_sibyl", name: "The Sibyl", suit: "wands", rank: "queen" },
  { definitionId: "wands_magus", name: "The Magus", suit: "wands", rank: "king" },
  { definitionId: "wands_sphinx", name: "The Sphinx", suit: "wands", rank: "beast" },
  { definitionId: "coins_fox", name: "The Fox", suit: "coins", rank: "page" },
  { definitionId: "coins_rake", name: "The Rake", suit: "coins", rank: "knight" },
  { definitionId: "coins_crone", name: "The Crone", suit: "coins", rank: "queen" },
  { definitionId: "coins_nameless", name: "The Nameless", suit: "coins", rank: "king" },
  { definitionId: "coins_dragon", name: "The Dragon", suit: "coins", rank: "beast" },
  { definitionId: "grails_young_hero", name: "The Young Hero", suit: "grails", rank: "page" },
  { definitionId: "grails_gravedigger", name: "The Gravedigger", suit: "grails", rank: "knight" },
  { definitionId: "grails_wanderer", name: "The Wanderer", suit: "grails", rank: "queen" },
  { definitionId: "grails_green_man", name: "The Green Man", suit: "grails", rank: "king" },
  { definitionId: "grails_leviathan", name: "The Leviathan", suit: "grails", rank: "beast" },
  { definitionId: "flowers_innocent", name: "The Innocent", suit: "flowers", rank: "page" },
  { definitionId: "flowers_justicar", name: "The Justicar", suit: "flowers", rank: "knight" },
  { definitionId: "flowers_hermit", name: "The Hermit", suit: "flowers", rank: "queen" },
  { definitionId: "flowers_caretaker", name: "The Caretaker", suit: "flowers", rank: "king" },
  { definitionId: "flowers_behemoth", name: "The Behemoth", suit: "flowers", rank: "beast" },
] as const;

function powerfulProfile(
  taxonomyId: "fairy" | "druid" | "angel" | "beast",
  status: "reliable" | "disruptive" | "companion" | "malignant" = "reliable",
) {
  return {
    taxonomies: [{ kind: "builtin" as const, taxonomyId }],
    status: { kind: "standard" as const, value: status },
    goal: null,
    methods: [],
    truths: [],
  };
}

function blankWizard(wizardId: WizardId, name: string) {
  return {
    wizardId,
    name,
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
    mortalityState: "not_deceased" as const,
  };
}

function populatedSage(overrides: Partial<SageState> = {}): SageState {
  return {
    selectedDreamingLawIds: ["never_give_away_your_name", "never_describe_the_past"],
    dreamingCondition: "uncertain",
    futureCondition: "certain",
    destinyInstances: [
      { destinyInstanceId: SDI_1, definitionId: "knives_true_prince" },
      { destinyInstanceId: SDI_2, definitionId: "wands_herald" },
      { destinyInstanceId: SDI_3, definitionId: "flowers_behemoth" },
      { destinyInstanceId: SDI_COPY, definitionId: "knives_true_prince" },
    ],
    destinyDeck: [SDI_1],
    setAsideDestinyInstanceIds: [SDI_3],
    assignedDestinies: [
      {
        destinyInstanceId: SDI_2,
        characterRef: { kind: "wizard", wizardId: WIZ_A },
        status: "accepted",
      },
      {
        destinyInstanceId: SDI_COPY,
        characterRef: { kind: "denizen", denizenId: DEN_OTHER },
        status: "hidden",
      },
    ],
    omenLedger: [
      { location: { kind: "future_of_the_pact" }, count: 2 },
      { location: { kind: "destiny", destinyInstanceId: SDI_2 }, count: 1 },
      { location: { kind: "character", characterRef: { kind: "wizard", wizardId: WIZ_A } }, count: 3 },
      { location: { kind: "dreamscape", segmentId: "position_4" }, count: 1 },
    ],
    dreamscapeAssociations: [
      { denizenId: DEN_OTHER, segmentIds: ["position_4", "position_5"] },
    ],
    earnedCycles: ["agape", "agape", "agon"],
    fairies: [
      {
        denizenId: DEN_FAIRY_CADRE,
        form: "cadre",
        ordinaryNames: [
          { name: "The Green Host", glyph: "venus" },
          { name: "Briar", glyph: "mars" },
        ],
        trueName: { name: "Sol-of-the-Thicket" },
      },
      {
        denizenId: DEN_FAIRY_ONE,
        form: "individual",
        ordinaryNames: [{ name: "Moss", glyph: "moon" }],
        trueName: null,
      },
    ],
    druids: [
      {
        denizenId: DEN_DRUID,
        grade: "ovate",
        fairyNames: [
          { kind: "ordinary", name: "Ash-Walker", glyph: "saturn" },
          { kind: "true", name: "The Still Oak" },
        ],
        changesOfMagic: ["leaves in the hair"],
        familiarDescription: "a moth",
      },
    ],
    lostDreamers: [
      { kind: "lost", wizardId: WIZ_A },
      { kind: "returned_recovering", wizardId: WIZ_B, recoveryWeeksRemaining: 4 },
    ],
    ...overrides,
  };
}

function populatedWorld() {
  return {
    ...EMPTY_SHARED_WORLD_STATE,
    denizens: [
      {
        denizenId: DEN_FAIRY_CADRE,
        name: "The Green Host",
        representation: "collective" as const,
        description: null,
        mortalityState: null,
        powerfulProfile: powerfulProfile("fairy", "reliable"),
      },
      {
        denizenId: DEN_FAIRY_ONE,
        name: "Moss",
        representation: "individual" as const,
        description: null,
        mortalityState: "not_deceased" as const,
        powerfulProfile: powerfulProfile("fairy", "disruptive"),
      },
      {
        denizenId: DEN_DRUID,
        name: "Ash-Walker",
        representation: "individual" as const,
        description: null,
        mortalityState: "not_deceased" as const,
        powerfulProfile: powerfulProfile("druid", "reliable"),
      },
      {
        denizenId: DEN_OTHER,
        name: "A dreamer",
        representation: "individual" as const,
        description: null,
        mortalityState: "not_deceased" as const,
        powerfulProfile: null,
      },
    ],
  };
}

function baseV5(sage: SageState = EMPTY_SAGE_STATE, world = { ...EMPTY_SHARED_WORLD_STATE }): CampaignStateV5 {
  return {
    schemaVersion: 5,
    ruleset: { id: SEVEN_PART_PACT_DRAFT4_ID, version: SEVEN_PART_PACT_DRAFT4_VERSION },
    calendar: { monthOrdinal: 0 as MonthOrdinal },
    configuration: { ageId: null, facilitatorPlayerId: null },
    players: [{ playerId: PLR_A, name: "Alice" }],
    wizards: [blankWizard(WIZ_A, "Sage"), blankWizard(WIZ_B, "Other")],
    pactSeats: EMPTY_PACT_SEATS,
    pactFragmentOperationalState: EMPTY_PACT_FRAGMENT_OPERATIONAL_STATE,
    lifecycle: {
      kind: "setup",
      orrery: { saturn: null, jupiter: null, mars: null, venus: null, mercury: null },
    },
    wizardmootHistory: [],
    world,
    hierophant: { ...EMPTY_HIEROPHANT_STATE },
    mariner: { ...EMPTY_MARINER_STATE },
    necromancer: { ...EMPTY_NECROMANCER_STATE },
    faustian: { ...EMPTY_FAUSTIAN_STATE },
    sage,
    warlock: { ...EMPTY_WARLOCK_STATE },
  };
}

function matchesValidator(
  validator: { kind?: string; value?: unknown; members?: unknown[]; element?: unknown; fields?: Record<string, unknown>; inner?: unknown },
  value: unknown,
): boolean {
  switch (validator.kind) {
    case "string":
      return typeof value === "string";
    case "number":
    case "float64":
      return typeof value === "number";
    case "boolean":
      return typeof value === "boolean";
    case "null":
      return value === null;
    case "literal":
      return value === validator.value;
    case "any":
      return true;
    case "union":
      return (validator.members as Array<{ kind?: string }>).some((member) => matchesValidator(member, value));
    case "array":
      return Array.isArray(value) && value.every((item) => matchesValidator(validator.element as { kind?: string }, item));
    case "optional":
      return value === undefined || matchesValidator(validator.inner as { kind?: string }, value);
    case "object": {
      if (value === null || typeof value !== "object" || Array.isArray(value)) {
        return false;
      }
      const obj = value as Record<string, unknown>;
      for (const [key, field] of Object.entries(validator.fields ?? {})) {
        const fieldValidator = field as { kind?: string; inner?: unknown };
        const optional = fieldValidator.kind === "optional";
        const inner = optional ? fieldValidator.inner as { kind?: string } : fieldValidator;
        if (!(key in obj) || obj[key] === undefined) {
          if (optional) continue;
          return false;
        }
        if (!matchesValidator(inner, obj[key])) {
          return false;
        }
      }
      return true;
    }
    default:
      return false;
  }
}

function expectInvalid(state: unknown, pattern: RegExp): void {
  expect(() => validateCampaignStateV5Candidate(state)).toThrow(DomainError);
  try {
    validateCampaignStateV5Candidate(state);
  } catch (error) {
    expect(error).toBeInstanceOf(DomainError);
    expect((error as Error).message).toMatch(pattern);
  }
}

describe("Sage catalogs", () => {
  it("has the seven Laws, twenty-five Destinies, five Cycles, and twelve Dreamscape segments", () => {
    expect(SAGE_LAW_OF_DREAMING_IDS).toHaveLength(7);
    expect(SAGE_LAW_OF_DREAMING_DEFINITIONS.map((law) => law.text)).toEqual([
      "Never give away your name.",
      "Never speak ill of another.",
      "Never look down at your own body.",
      "Never attempt to read what is written.",
      "Never reveal your mortal face.",
      "Never guess at what the future holds.",
      "Never describe the past.",
    ]);

    expect(SAGE_DESTINY_DEFINITIONS).toHaveLength(25);
    expect([...SAGE_DESTINY_DEFINITIONS]).toEqual([...EXPECTED_DESTINIES]);

    expect(SAGE_CYCLE_IDS).toEqual(["agape", "agon", "cryptos", "kratos", "ekhthroi"]);
    expect(SAGE_CYCLE_DEFINITIONS.map((cycle) => [cycle.name, cycle.requiredRank])).toEqual([
      ["Agape", "page"],
      ["Agon", "knight"],
      ["Cryptos", "queen"],
      ["Kratos", "king"],
      ["Ekhthroi", "beast"],
    ]);

    expect(SAGE_DREAMSCAPE_SEGMENT_IDS).toEqual([
      "position_1", "position_2", "position_3", "position_4",
      "position_5", "position_6", "position_7", "position_8",
      "position_9", "position_10", "position_11", "position_12",
    ]);
    expect(POWERFUL_DENIZEN_BUILTIN_TAXONOMY_IDS).toEqual(expect.arrayContaining(["fairy", "druid", "angel"]));
  });
});

describe("Sage empty and V5 integration", () => {
  it("accepts EMPTY_SAGE_STATE and initialCampaignState() V5 sage", () => {
    expect(EMPTY_SAGE_STATE).toEqual({
      selectedDreamingLawIds: [],
      dreamingCondition: null,
      futureCondition: null,
      destinyInstances: [],
      destinyDeck: [],
      setAsideDestinyInstanceIds: [],
      assignedDestinies: [],
      omenLedger: [],
      dreamscapeAssociations: [],
      earnedCycles: [],
      fairies: [],
      druids: [],
      lostDreamers: [],
    });
    expect("initialized" in EMPTY_SAGE_STATE).toBe(false);
    expect(() => validateSageStructure(EMPTY_SAGE_STATE)).not.toThrow();

    const initial = initialCampaignState();
    expect(initial.schemaVersion).toBe(5);
    expect(initial.sage).toEqual(EMPTY_SAGE_STATE);
    expect(() => validateCampaignState(initial)).not.toThrow();
    expect(() => validateCampaignStateV5Candidate(baseV5())).not.toThrow();
  });
});

describe("Sage populated structural state", () => {
  it("accepts a representative populated Sage state", () => {
    const state = baseV5(populatedSage(), populatedWorld());
    expect(() => validateCampaignStateV5Candidate(state)).not.toThrow();
    expect(isValidSageDestinyInstanceId(SDI_1)).toBe(true);
  });

  it("does not turn gameplay outcomes into persistence invariants", () => {
    expect(() => validateCampaignStateV5Candidate(baseV5(populatedSage({
      selectedDreamingLawIds: [
        "never_give_away_your_name",
        "never_speak_ill_of_another",
        "never_describe_the_past",
      ],
      futureCondition: "bleak",
      omenLedger: [],
      dreamingCondition: "calm",
    }), populatedWorld()))).not.toThrow();
  });
});

describe("Sage Destiny instances and locations", () => {
  it("allows copies of one definition and requires an exact location partition", () => {
    const valid = populatedSage();
    expect(valid.destinyInstances.filter((instance) => instance.definitionId === "knives_true_prince")).toHaveLength(2);
    expect(() => validateSageStructure(valid)).not.toThrow();

    expectInvalid(baseV5(populatedSage({
      destinyDeck: [SDI_1, SDI_2],
    }), populatedWorld()), /Duplicate Sage Destiny location/);

    expectInvalid(baseV5(populatedSage({
      destinyDeck: [],
    }), populatedWorld()), /Sage Destiny instance is not located/);

    expectInvalid(baseV5(populatedSage({
      destinyInstances: [
        { destinyInstanceId: SDI_1, definitionId: "knives_true_prince" },
      ],
      destinyDeck: [SDI_1, SDI_2],
      setAsideDestinyInstanceIds: [],
      assignedDestinies: [],
    }), populatedWorld()), /unknown instance/);
  });
});

describe("Sage Omen ledger", () => {
  it("accepts representative locations and rejects duplicate or non-positive rows", () => {
    expect(() => validateSageStructure(populatedSage())).not.toThrow();

    expectInvalid(baseV5(populatedSage({
      omenLedger: [
        { location: { kind: "future_of_the_pact" }, count: 1 },
        { location: { kind: "future_of_the_pact" }, count: 2 },
      ],
    }), populatedWorld()), /Duplicate Sage Omen location/);

    expectInvalid(baseV5(populatedSage({
      omenLedger: [{ location: { kind: "future_of_the_pact" }, count: 0 }],
    }), populatedWorld()), /positive safe integer/);
  });
});

describe("Sage shared and catalog references", () => {
  it.each([
    [
      "unknown Law",
      populatedSage({ selectedDreamingLawIds: ["never_give_away_your_name", "not_a_law" as never] }),
      /selectedDreamingLawIds\[1\] is invalid/,
    ],
    [
      "unknown Destiny definition",
      populatedSage({
        destinyInstances: [{ destinyInstanceId: SDI_1, definitionId: "not_a_destiny" as never }],
        destinyDeck: [SDI_1],
        setAsideDestinyInstanceIds: [],
        assignedDestinies: [],
        omenLedger: [],
      }),
      /definitionId is invalid/,
    ],
    [
      "unresolved assigned Wizard",
      populatedSage({
        assignedDestinies: [
          {
            destinyInstanceId: SDI_2,
            characterRef: { kind: "wizard", wizardId: "wiz_00000000-0000-0000-0000-000000000099" as WizardId },
            status: "hidden",
          },
          {
            destinyInstanceId: SDI_COPY,
            characterRef: { kind: "denizen", denizenId: DEN_OTHER },
            status: "hidden",
          },
        ],
      }),
      /wizardId does not resolve/,
    ],
    [
      "unresolved Dreamscape Denizen",
      populatedSage({
        dreamscapeAssociations: [{
          denizenId: "den_00000000-0000-0000-0000-000000000099" as DenizenId,
          segmentIds: ["position_1"],
        }],
      }),
      /denizenId does not resolve/,
    ],
  ] as const)("fails closed on %s", (_label, sage, pattern) => {
    expectInvalid(baseV5(sage, populatedWorld()), pattern);
  });
});

describe("Sage Fairy and Druid Powerful integration", () => {
  it("requires cadre/individual form agreement and Reliable or Disruptive shared status", () => {
    expect(() => validateCampaignStateV5Candidate(baseV5(populatedSage(), populatedWorld()))).not.toThrow();

    const cadreAsIndividual = {
      ...populatedWorld(),
      denizens: populatedWorld().denizens.map((denizen) =>
        denizen.denizenId === DEN_FAIRY_CADRE
          ? { ...denizen, representation: "individual" as const, mortalityState: "not_deceased" as const }
          : denizen,
      ),
    };
    expectInvalid(baseV5(populatedSage(), cadreAsIndividual), /collective Denizen for cadre Fairy form/);

    const fairyWithoutTaxonomy = {
      ...populatedWorld(),
      denizens: populatedWorld().denizens.map((denizen) =>
        denizen.denizenId === DEN_FAIRY_ONE
          ? { ...denizen, powerfulProfile: powerfulProfile("beast", "reliable") }
          : denizen,
      ),
    };
    expectInvalid(baseV5(populatedSage(), fairyWithoutTaxonomy), /requires builtin taxonomy fairy/);

    const companionFairy = {
      ...populatedWorld(),
      denizens: populatedWorld().denizens.map((denizen) =>
        denizen.denizenId === DEN_FAIRY_ONE
          ? { ...denizen, powerfulProfile: powerfulProfile("fairy", "companion") }
          : denizen,
      ),
    };
    expectInvalid(baseV5(populatedSage(), companionFairy), /requires standard Status reliable or disruptive/);

    const collectiveDruid = {
      ...populatedWorld(),
      denizens: populatedWorld().denizens.map((denizen) =>
        denizen.denizenId === DEN_DRUID
          ? { ...denizen, representation: "collective" as const, mortalityState: null }
          : denizen,
      ),
    };
    expectInvalid(baseV5(populatedSage(), collectiveDruid), /must reference an individual Denizen/);
  });
});

describe("Sage Lost in Dreams", () => {
  it("accepts lost and returned-recovering rows without capping recovery weeks", () => {
    expect(() => validateCampaignStateV5Candidate(baseV5(populatedSage(), populatedWorld()))).not.toThrow();

    expectInvalid(baseV5(populatedSage({
      lostDreamers: [
        { kind: "lost", wizardId: WIZ_A },
        { kind: "returned_recovering", wizardId: WIZ_A, recoveryWeeksRemaining: 1 },
      ],
    }), populatedWorld()), /Duplicate Sage lost dreamer/);

    expectInvalid(baseV5(populatedSage({
      lostDreamers: [{ kind: "returned_recovering", wizardId: WIZ_B, recoveryWeeksRemaining: 0 }],
    }), populatedWorld()), /positive safe integer/);
  });
});

describe("Sage current-V5 and Convex validators", () => {
  it("accepts representative valid Sage state and rejects malformed Sage state", () => {
    const valid = baseV5(populatedSage(), populatedWorld());
    expect(() => validateCampaignStateV5Candidate(valid)).not.toThrow();
    expect(matchesValidator(campaignStateV5Validator, valid)).toBe(true);

    const malformed = {
      ...valid,
      sage: {
        ...valid.sage,
        dreamingCondition: "stormy",
      },
    };
    expectInvalid(malformed, /dreamingCondition is invalid/);
    expect(matchesValidator(campaignStateV5Validator, malformed)).toBe(false);

    const missingSage = { ...valid } as unknown as Record<string, unknown>;
    delete missingSage.sage;
    expect(matchesValidator(campaignStateV5Validator, missingSage)).toBe(false);
    expectInvalid(missingSage, /Missing or invalid sage/);
  });
});
