import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it, expect } from "vitest";
import type {
  CampaignStateV5,
  CompanionRelationshipId,
  DenizenId,
  FaustianCardId,
  FaustianRank,
  FaustianState,
  FaustianSuit,
  MonthOrdinal,
  PlayerId,
  TreasureId,
  WizardId,
} from "../shared/domain";
import {
  CURRENT_STATE_SCHEMA_VERSION,
  DomainError,
  EMPTY_FAUSTIAN_STATE,
  EMPTY_HIEROPHANT_STATE,
  EMPTY_MARINER_STATE,
  EMPTY_NECROMANCER_STATE,
  EMPTY_PACT_FRAGMENT_OPERATIONAL_STATE,
  EMPTY_SHARED_WORLD_STATE,
  FAUSTIAN_ANTAGONIST_GOAL_DEFINITIONS,
  FAUSTIAN_ANTAGONIST_GOALS,
  FAUSTIAN_ANTAGONIST_METHOD_NAMES,
  FAUSTIAN_CARD_DEFINITIONS,
  FAUSTIAN_CARD_IDS,
  FAUSTIAN_COMMUNITY_DEFINITIONS,
  FAUSTIAN_COMMUNITY_IDS,
  FAUSTIAN_DEVIL_FORM_DEFINITIONS,
  FAUSTIAN_DEVIL_FORM_IDS,
  FAUSTIAN_DEVIL_LAW_DEFINITIONS,
  FAUSTIAN_DEVIL_LAW_IDS,
  FAUSTIAN_ORIGIN_CLAIM_DEFINITIONS,
  FAUSTIAN_ORIGIN_CLAIM_IDS,
  FAUSTIAN_RANKS,
  FAUSTIAN_SUITS,
  POWERFUL_DENIZEN_BUILTIN_TAXONOMY_IDS,
  SEVEN_PART_PACT_DRAFT4_ID,
  SEVEN_PART_PACT_DRAFT4_VERSION,
  applySetDenizenMortalityState,
  buildInitializedDefaultFaustianState,
  devilWeeksOwedForMissingSuits,
  faustianCardId,
  faustianDeckMissingSuits,
  initialCampaignState,
  isFaustianDeckEmpty,
  validateCampaignState,
  validateCampaignStateV5Candidate,
  validateFaustianStructure,
} from "../shared/domain";

const EXPECTED_SUITS: readonly FaustianSuit[] = ["spades", "clubs", "diamonds", "hearts"];
const EXPECTED_RANKS: readonly FaustianRank[] = [
  "ace", "2", "3", "4", "5", "6", "7", "8", "9", "10", "jack", "queen", "king",
];

const EXPECTED_COMMUNITIES = [
  { communityId: "aries", associatedSeatId: "hierophant", populace: "monks/pilgrims" },
  { communityId: "leo", associatedSeatId: "warlock", populace: "lords/ladies" },
  { communityId: "sagittarius", associatedSeatId: "sorcerer", populace: "scholars/researchers" },
  { communityId: "taurus", associatedSeatId: "hierophant", populace: "merchants/bankers" },
  { communityId: "virgo", associatedSeatId: "warlock", populace: "soldiers/servants" },
  { communityId: "capricorn", associatedSeatId: "necromancer", populace: "dead/nearly-dead" },
  { communityId: "gemini", associatedSeatId: "hierophant", populace: "farmers/shepherds" },
  { communityId: "libra", associatedSeatId: "mariner", populace: "fishermen/divers" },
  { communityId: "aquarius", associatedSeatId: "sage", populace: "druids/hermits" },
  { communityId: "cancer", associatedSeatId: "hierophant", populace: "beggars/thieves" },
  { communityId: "scorpio", associatedSeatId: "mariner", populace: "sailors/travelers" },
  { communityId: "pisces", associatedSeatId: "sage", populace: "dreamers/wanderers" },
] as const;

const PLR_A = "plr_00000000-0000-0000-0000-00000000000a" as PlayerId;
const WIZ_A = "wiz_00000000-0000-0000-0000-00000000000a" as WizardId;
const WIZ_B = "wiz_00000000-0000-0000-0000-00000000000b" as WizardId;
const DEN_1 = "den_00000000-0000-0000-0000-000000000001" as DenizenId;
const DEN_2 = "den_00000000-0000-0000-0000-000000000002" as DenizenId;
const DEN_3 = "den_00000000-0000-0000-0000-000000000003" as DenizenId;
const TRS_1 = "trs_00000000-0000-0000-0000-000000000001" as TreasureId;
const CMPREL_1 = "cmprel_00000000-0000-0000-0000-000000000001" as CompanionRelationshipId;
const TWIST = faustianCardId("spades", "ace");
const TWIST_2 = faustianCardId("hearts", "king");

const EMPTY_PACT_SEATS = {
  necromancer: { status: null, wizardId: null, watcherPlayerId: null },
  hierophant: { status: null, wizardId: null, watcherPlayerId: null },
  warlock: { status: null, wizardId: null, watcherPlayerId: null },
  mariner: { status: null, wizardId: null, watcherPlayerId: null },
  faustian: { status: null, wizardId: null, watcherPlayerId: null },
  sage: { status: null, wizardId: null, watcherPlayerId: null },
  sorcerer: { status: null, wizardId: null, watcherPlayerId: null },
} as const;

function powerfulProfile(
  taxonomyId: "conspiracy" | "beast" | "demon" | "occultist",
  goal: string | null = null,
) {
  return {
    taxonomies: [{ kind: "builtin" as const, taxonomyId }],
    status: { kind: "standard" as const, value: "malignant" as const },
    goal,
    methods: [],
    truths: [],
  };
}

function defaultInitForms() {
  return {
    casual: FAUSTIAN_DEVIL_FORM_IDS.slice(0, 3),
    special: FAUSTIAN_DEVIL_FORM_IDS.slice(3, 5),
    duress: FAUSTIAN_DEVIL_FORM_IDS.slice(5, 6),
  };
}

function takeFromDeck(faustian: FaustianState, cardId: FaustianCardId): FaustianState {
  if (!faustian.faustianDeck.includes(cardId)) {
    throw new Error(`card ${cardId} is not in the Faustian Deck`);
  }
  return {
    ...faustian,
    faustianDeck: faustian.faustianDeck.filter((id) => id !== cardId),
  };
}

function initializedFaustian(overrides?: Partial<Parameters<typeof buildInitializedDefaultFaustianState>[0]>): FaustianState {
  return buildInitializedDefaultFaustianState({
    selectedDevilLawIds: [FAUSTIAN_DEVIL_LAW_IDS[0], FAUSTIAN_DEVIL_LAW_IDS[1]],
    activeTwistCardId: TWIST,
    selectedDevilForms: defaultInitForms(),
    ...overrides,
  });
}

function baseV5(faustian: FaustianState = EMPTY_FAUSTIAN_STATE, world = { ...EMPTY_SHARED_WORLD_STATE }): CampaignStateV5 {
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
    world,
    hierophant: { ...EMPTY_HIEROPHANT_STATE },
    mariner: { ...EMPTY_MARINER_STATE },
    necromancer: { ...EMPTY_NECROMANCER_STATE },
    faustian,
  };
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

describe("Faustian static card catalog", () => {
  it("contains exactly 52 unique identities covering all 4x13 combinations", () => {
    expect(FAUSTIAN_SUITS).toEqual(EXPECTED_SUITS);
    expect(FAUSTIAN_RANKS).toEqual(EXPECTED_RANKS);
    expect(FAUSTIAN_CARD_IDS).toHaveLength(52);
    expect(new Set(FAUSTIAN_CARD_IDS).size).toBe(52);
    expect(FAUSTIAN_CARD_DEFINITIONS).toHaveLength(52);

    const expectedIds = EXPECTED_SUITS.flatMap((suit) =>
      EXPECTED_RANKS.map((rank) => faustianCardId(suit, rank)),
    );
    expect([...FAUSTIAN_CARD_IDS]).toEqual(expectedIds);

    for (const suit of EXPECTED_SUITS) {
      for (const rank of EXPECTED_RANKS) {
        const cardId = faustianCardId(suit, rank);
        const definition = FAUSTIAN_CARD_DEFINITIONS.find((card) => card.cardId === cardId);
        expect(definition).toEqual({ cardId, suit, rank });
      }
    }
  });
});

describe("Faustian operational Community catalog", () => {
  it("is exactly the 12 approved Materials+Cards operational cells", () => {
    expect(FAUSTIAN_COMMUNITY_IDS).toEqual(EXPECTED_COMMUNITIES.map((cell) => cell.communityId));
    expect(FAUSTIAN_COMMUNITY_DEFINITIONS).toHaveLength(12);
    expect(FAUSTIAN_COMMUNITY_DEFINITIONS).toEqual(
      EXPECTED_COMMUNITIES.map((cell) => ({
        communityId: cell.communityId,
        associatedSeatId: cell.associatedSeatId,
        populace: cell.populace,
      })),
    );
  });

  it("documents that the operational layout is Materials+Cards, not the Codex final assignments", () => {
    const catalogSource = readFileSync(
      resolve(__dirname, "../shared/domain/faustian-catalogs.ts"),
      "utf8",
    );
    expect(catalogSource).toMatch(/Materials\+Cards/);
    expect(catalogSource).toMatch(/Codex conflicts/i);
    expect(catalogSource).not.toMatch(/Codex itself unambiguously/i);
  });
});

describe("Faustian initialization and derived deck facts", () => {
  it("empty Faustian state is coherent and used by initial campaign state", () => {
    expect(EMPTY_FAUSTIAN_STATE.faustianDeck).toEqual(FAUSTIAN_CARD_IDS);
    expect(EMPTY_FAUSTIAN_STATE.communities.map((c) => c.communityId)).toEqual([...FAUSTIAN_COMMUNITY_IDS]);
    expect(EMPTY_FAUSTIAN_STATE.activeTwistCardIds).toEqual([]);
    expect(EMPTY_FAUSTIAN_STATE.selectedDevilLawIds).toEqual([]);
    expect(() => validateFaustianStructure(EMPTY_FAUSTIAN_STATE)).not.toThrow();
    const state = initialCampaignState();
    expect(state.schemaVersion).toBe(CURRENT_STATE_SCHEMA_VERSION);
    expect(state.faustian).toEqual(EMPTY_FAUSTIAN_STATE);
    expect(() => validateCampaignState(state)).not.toThrow();
  });

  it("normal initialization creates one Twist, two Laws, and a coherent 52-card partition", () => {
    const faustian = initializedFaustian();
    expect(faustian.selectedDevilLawIds).toEqual([FAUSTIAN_DEVIL_LAW_IDS[0], FAUSTIAN_DEVIL_LAW_IDS[1]]);
    expect(faustian.activeTwistCardIds).toEqual([TWIST]);
    expect(faustian.machinations).toEqual([{ cardId: TWIST, facing: "face_down" }]);
    expect(faustian.faustianDeck).not.toContain(TWIST);
    expect(faustian.faustianDeck).toHaveLength(51);
    expect(faustian.communities).toHaveLength(12);
    expect(() => validateFaustianStructure(faustian)).not.toThrow();
    expect(() => validateCampaignStateV5Candidate(baseV5(faustian))).not.toThrow();
  });

  it("does not permanently require exactly two Laws on persisted state", () => {
    const oneLaw = { ...initializedFaustian(), selectedDevilLawIds: [FAUSTIAN_DEVIL_LAW_IDS[2]] };
    const threeLaws = {
      ...initializedFaustian(),
      selectedDevilLawIds: [FAUSTIAN_DEVIL_LAW_IDS[0], FAUSTIAN_DEVIL_LAW_IDS[1], FAUSTIAN_DEVIL_LAW_IDS[2]],
    };
    const noLaws = { ...initializedFaustian(), selectedDevilLawIds: [] };
    expect(() => validateFaustianStructure(oneLaw)).not.toThrow();
    expect(() => validateFaustianStructure(threeLaws)).not.toThrow();
    expect(() => validateFaustianStructure(noLaws)).not.toThrow();
    expect(() => buildInitializedDefaultFaustianState({
      selectedDevilLawIds: [FAUSTIAN_DEVIL_LAW_IDS[0]],
      activeTwistCardId: TWIST,
      selectedDevilForms: defaultInitForms(),
    })).toThrow(DomainError);
  });

  it("derives missing suits and Devil weeks from Faustian Deck membership", () => {
    const withoutSpades = {
      ...EMPTY_FAUSTIAN_STATE,
      faustianDeck: EMPTY_FAUSTIAN_STATE.faustianDeck.filter((id) => !id.startsWith("spades_")),
      devilDeck: FAUSTIAN_CARD_IDS.filter((id) => id.startsWith("spades_")),
    };
    expect(faustianDeckMissingSuits(withoutSpades)).toEqual(["spades"]);
    expect(devilWeeksOwedForMissingSuits(withoutSpades)).toBe(1);
    expect(isFaustianDeckEmpty(withoutSpades)).toBe(false);

    const emptyDeck: FaustianState = {
      ...EMPTY_FAUSTIAN_STATE,
      faustianDeck: [],
      devilDeck: [...FAUSTIAN_CARD_IDS],
    };
    expect(faustianDeckMissingSuits(emptyDeck)).toEqual([...FAUSTIAN_SUITS]);
    expect(devilWeeksOwedForMissingSuits(emptyDeck)).toBe(4);
    expect(isFaustianDeckEmpty(emptyDeck)).toBe(true);
    expect(() => validateFaustianStructure(emptyDeck)).not.toThrow();
  });
});

describe("Faustian card location integrity", () => {
  it("rejects a card that exists in two locations", () => {
    const duplicated = {
      ...EMPTY_FAUSTIAN_STATE,
      devilDeck: [TWIST],
    };
    expect(() => validateFaustianStructure(duplicated)).toThrow(DomainError);
    expect(() => validateFaustianStructure(duplicated)).toThrow(/exactly once|duplicate/i);
  });

  it("rejects missing or extra canonical cards", () => {
    const missing = takeFromDeck(EMPTY_FAUSTIAN_STATE, TWIST);
    expect(() => validateFaustianStructure(missing)).toThrow(/canonical|missing|52/i);

    const extra = {
      ...EMPTY_FAUSTIAN_STATE,
      devilDeck: ["spades_joker" as FaustianCardId],
    };
    expect(() => validateFaustianStructure(extra)).toThrow(DomainError);
  });

  it("allows multiple active Twists when those cards are in Machinations", () => {
    const twoTwists = {
      ...takeFromDeck(takeFromDeck(EMPTY_FAUSTIAN_STATE, TWIST), TWIST_2),
      machinations: [
        { cardId: TWIST, facing: "face_down" as const },
        { cardId: TWIST_2, facing: "face_up" as const },
      ],
      activeTwistCardIds: [TWIST, TWIST_2],
    };
    expect(() => validateFaustianStructure(twoTwists)).not.toThrow();
    expect(() => validateCampaignStateV5Candidate(baseV5(twoTwists))).not.toThrow();
  });

  it("rejects an active Twist that is not in Machinations", () => {
    const pointingAtDeck = {
      ...EMPTY_FAUSTIAN_STATE,
      activeTwistCardIds: [TWIST],
    };
    expect(() => validateFaustianStructure(pointingAtDeck)).toThrow(/machination/i);
  });

  it("rejects duplicate Law IDs and unknown Law IDs without requiring exactly two", () => {
    expect(() => validateFaustianStructure({
      ...initializedFaustian(),
      selectedDevilLawIds: [FAUSTIAN_DEVIL_LAW_IDS[0], FAUSTIAN_DEVIL_LAW_IDS[0]],
    })).toThrow(/duplicate/i);
    expect(() => validateFaustianStructure({
      ...initializedFaustian(),
      selectedDevilLawIds: ["not_a_law" as typeof FAUSTIAN_DEVIL_LAW_IDS[number]],
    })).toThrow(DomainError);
  });
});

describe("Faustian reference integrity", () => {
  it("rejects incoherent Conspiracy / Antagonist / Demon Powerful-Denizen refs", () => {
    const missingDenizen = {
      ...EMPTY_FAUSTIAN_STATE,
      conspiracies: [{ denizenId: DEN_1, communityId: "aries" as const }],
      antagonists: [{ denizenId: DEN_1, seatId: "hierophant" as const, chipCount: 1 as const }],
    };
    expectInvalid(baseV5(missingDenizen), /conspiracy|denizen/i);

    expectInvalid(
      baseV5(
        {
          ...EMPTY_FAUSTIAN_STATE,
          conspiracies: [{ denizenId: DEN_1, communityId: "aries" }],
          antagonists: [{ denizenId: DEN_1, seatId: "hierophant", chipCount: 1 }],
        },
        {
          ...EMPTY_SHARED_WORLD_STATE,
          denizens: [{
            denizenId: DEN_1,
            name: "A Conspiracy",
            representation: "individual",
            description: null,
            mortalityState: "not_deceased",
            powerfulProfile: powerfulProfile("conspiracy", "Calamity"),
          }],
        },
      ),
      /collective/,
    );

    expectInvalid(
      baseV5(
        {
          ...EMPTY_FAUSTIAN_STATE,
          conspiracies: [{ denizenId: DEN_1, communityId: "aries" }],
          antagonists: [{ denizenId: DEN_1, seatId: "hierophant", chipCount: 1 }],
        },
        {
          ...EMPTY_SHARED_WORLD_STATE,
          denizens: [{
            denizenId: DEN_1,
            name: "A Conspiracy",
            representation: "collective",
            description: null,
            mortalityState: null,
            powerfulProfile: null,
          }],
        },
      ),
      /Powerful|taxonomy|conspiracy/i,
    );

    expectInvalid(
      baseV5(
        {
          ...EMPTY_FAUSTIAN_STATE,
          antagonists: [{ denizenId: DEN_2, seatId: "hierophant", chipCount: 2 }],
        },
        {
          ...EMPTY_SHARED_WORLD_STATE,
          denizens: [{
            denizenId: DEN_2,
            name: "Lord Ash",
            representation: "individual",
            description: null,
            mortalityState: "not_deceased",
            powerfulProfile: null,
          }],
        },
      ),
      /Powerful/,
    );

    expectInvalid(
      baseV5(
        {
          ...EMPTY_FAUSTIAN_STATE,
          demons: [{
            denizenId: DEN_3,
            binding: { kind: "unbound", malignance: "violent" },
            form: "a black dog",
            hellOfOrigin: "the brass city",
            magicalSymbol: "a seven-pointed seal",
            occupancy: { kind: "isha" },
            monthsInCurrentDomain: 0,
          }],
        },
        {
          ...EMPTY_SHARED_WORLD_STATE,
          denizens: [{
            denizenId: DEN_3,
            name: "Unbound",
            representation: "individual",
            description: null,
            mortalityState: "not_deceased",
            powerfulProfile: null,
          }],
        },
      ),
      /Powerful|taxonomy|demon/i,
    );
  });

  it("rejects unresolved Treasure, Companion, Wizard, and PactSeat cross-refs", () => {
    expectInvalid(
      baseV5({
        ...takeFromDeck(EMPTY_FAUSTIAN_STATE, TWIST),
        possessions: [{
          cardId: TWIST,
          wizardId: WIZ_A,
          represented: { kind: "treasure", treasureId: TRS_1 },
        }],
      }),
      /treasure/i,
    );

    expectInvalid(
      baseV5({
        ...EMPTY_FAUSTIAN_STATE,
        devilObligations: [{
          kind: "recurring_devil_time_in_domain_while_companion_care",
          wizardId: WIZ_A,
          companionRelationshipId: CMPREL_1,
        }],
      }),
      /companion/i,
    );

    expectInvalid(
      baseV5({
        ...takeFromDeck(EMPTY_FAUSTIAN_STATE, TWIST),
        entrustedCards: [{ cardId: TWIST, wizardId: WIZ_B }],
      }),
      /wizard/i,
    );

    expectInvalid(
      baseV5({
        ...EMPTY_FAUSTIAN_STATE,
        domainSeizures: [{ seatId: "hierophant", conduitDenizenId: DEN_1 }],
      }),
      /conduit|denizen/i,
    );

    expectInvalid(
      baseV5({
        ...EMPTY_FAUSTIAN_STATE,
        domainSeizures: [{ seatId: "faustian", conduitDenizenId: DEN_1 }],
      }),
      /another|faustian/i,
    );
  });

  it("rejects an active Domain seizure whose conduit Denizen is deceased", () => {
    expectInvalid(
      baseV5(
        {
          ...EMPTY_FAUSTIAN_STATE,
          domainSeizures: [{ seatId: "hierophant", conduitDenizenId: DEN_2 }],
        },
        {
          ...EMPTY_SHARED_WORLD_STATE,
          denizens: [{
            denizenId: DEN_2,
            name: "Lord Ash",
            representation: "individual",
            description: null,
            mortalityState: "deceased",
            powerfulProfile: null,
          }],
        },
      ),
      /conduit.*deceased|deceased.*conduit/i,
    );
  });

  it("fails closed when set_denizen_mortality_state would leave a deceased Devil conduit", () => {
    const living = baseV5(
      {
        ...EMPTY_FAUSTIAN_STATE,
        domainSeizures: [{ seatId: "hierophant", conduitDenizenId: DEN_2 }],
      },
      {
        ...EMPTY_SHARED_WORLD_STATE,
        denizens: [{
          denizenId: DEN_2,
          name: "Lord Ash",
          representation: "individual",
          description: null,
          mortalityState: "not_deceased",
          powerfulProfile: null,
        }],
      },
    );
    expect(() => validateCampaignStateV5Candidate(living)).not.toThrow();
    expect(() => applySetDenizenMortalityState(living, DEN_2, {
      expected: "not_deceased",
      value: "deceased",
    })).toThrow(DomainError);
    expect(() => applySetDenizenMortalityState(living, DEN_2, {
      expected: "not_deceased",
      value: "deceased",
    })).toThrow(/conduit.*deceased|deceased.*conduit/i);
  });

  it("accepts coherent Conspiracy, Antagonist, Demon, and Devil treasure custody", () => {
    const moved = takeFromDeck(takeFromDeck(EMPTY_FAUSTIAN_STATE, TWIST), TWIST_2);
    const faustian: FaustianState = {
      ...moved,
      possessions: [{
        cardId: TWIST,
        wizardId: WIZ_A,
        represented: { kind: "treasure", treasureId: TRS_1 },
      }],
      beneathAntagonists: [{ cardId: TWIST_2, denizenId: DEN_2 }],
      conspiracies: [{ denizenId: DEN_1, communityId: "aries" }],
      antagonists: [
        { denizenId: DEN_1, seatId: "hierophant", chipCount: 1 },
        { denizenId: DEN_2, seatId: "hierophant", chipCount: 2 },
      ],
      demons: [{
        denizenId: DEN_3,
        binding: { kind: "unbound", malignance: "controlling" },
        form: "a column of smoke",
        hellOfOrigin: "the brass city",
        magicalSymbol: "a seven-pointed seal",
        occupancy: { kind: "pact_domain", seatId: "hierophant" },
        monthsInCurrentDomain: 2,
      }],
      domainSeizures: [{ seatId: "hierophant", conduitDenizenId: DEN_2 }],
      devilObligations: [{
        kind: "recurring_devil_time_in_domain_while_companion_care",
        wizardId: WIZ_A,
        companionRelationshipId: CMPREL_1,
      }],
    };
    const state = baseV5(faustian, {
      ...EMPTY_SHARED_WORLD_STATE,
      denizens: [
        {
          denizenId: DEN_1,
          name: "The League",
          representation: "collective",
          description: null,
          mortalityState: null,
          powerfulProfile: powerfulProfile("conspiracy", "Calamity"),
        },
        {
          denizenId: DEN_2,
          name: "Lord Ash",
          representation: "individual",
          description: null,
          mortalityState: "not_deceased",
          powerfulProfile: powerfulProfile("beast", "Subjugation"),
        },
        {
          denizenId: DEN_3,
          name: "Unbound",
          representation: "individual",
          description: null,
          mortalityState: "not_deceased",
          powerfulProfile: powerfulProfile("demon"),
        },
      ],
      companionRelationships: [{
        companionRelationshipId: CMPREL_1,
        wizardId: WIZ_A,
        element: "fire",
        denizenId: DEN_2,
        description: null,
        status: "current",
      }],
      treasures: [{
        treasureId: TRS_1,
        name: "Devil Chalice",
        description: null,
        condition: "intact",
        custody: { kind: "devil" },
      }],
    });
    expect(() => validateCampaignStateV5Candidate(state)).not.toThrow();
    expect(state.faustian.activeTwistCardIds).toEqual([]);
    expect(state.world.treasures[0].custody).toEqual({ kind: "devil" });
  });
});

describe("CampaignState V5 Faustian overlay", () => {
  it("rejects a V5 candidate missing Faustian state", () => {
    const { faustian: _dropped, ...rest } = baseV5();
    expectInvalid(rest, /faustian/i);
  });

  it("rejects representative malformed Faustian state on the candidate path", () => {
    expectInvalid(baseV5({
      ...EMPTY_FAUSTIAN_STATE,
      communities: EMPTY_FAUSTIAN_STATE.communities.map((community) => ({
        ...community,
        pawnCount: -1,
      })),
    }), /pawn/i);
  });
});

describe("Faustian source-integrity corrections", () => {
  it("adds Occultist, Conspiracy, and Demon taxonomies and does not treat Antagonist or Unbound Demon as taxonomies", () => {
    expect([...POWERFUL_DENIZEN_BUILTIN_TAXONOMY_IDS]).toEqual([
      "ghoul_caller",
      "prophet",
      "cult",
      "beast",
      "foe_of_death",
      "conspiracy",
      "occultist",
      "demon",
    ]);
    expect(POWERFUL_DENIZEN_BUILTIN_TAXONOMY_IDS).not.toContain("antagonist");
    expect(POWERFUL_DENIZEN_BUILTIN_TAXONOMY_IDS).not.toContain("unbound_demon");
  });

  it("maps Antagonist Goals in the Faustian catalog while leaving shared Powerful Goal authoritative", () => {
    expect([...FAUSTIAN_ANTAGONIST_GOALS]).toEqual(["Subjugation", "Calamity", "Extinction", "Treachery"]);
    expect(FAUSTIAN_ANTAGONIST_GOAL_DEFINITIONS).toEqual([
      { goal: "Subjugation", suit: "spades", applicationLabel: "Subjugation / Spades" },
      { goal: "Calamity", suit: "clubs", applicationLabel: "Calamity / Clubs" },
      { goal: "Extinction", suit: "diamonds", applicationLabel: "Extinction / Diamonds" },
      { goal: "Treachery", suit: "hearts", applicationLabel: "Treachery / Hearts" },
    ]);
    expect([...FAUSTIAN_ANTAGONIST_METHOD_NAMES]).toEqual([
      "Amass Power",
      "Offer Aid",
      "Spread Dissent",
      "Bargain with the Devil",
    ]);
    const catalogSource = readFileSync(resolve(__dirname, "../shared/domain/faustian-catalogs.ts"), "utf8");
    expect(catalogSource).toMatch(/Amass Power/);
    expect(catalogSource).toMatch(/Offer Aid/);
    expect(catalogSource).toMatch(/Spread Dissent/);
    expect(catalogSource).toMatch(/Bargain with the Devil/);
    expect(catalogSource).not.toMatch(/suitGoal/);
  });

  it("catalogs the seven source Devil Laws rather than ordinal application labels", () => {
    expect(FAUSTIAN_DEVIL_LAW_IDS).toHaveLength(7);
    expect(FAUSTIAN_DEVIL_LAW_IDS).not.toEqual([
      "first", "second", "third", "fourth", "fifth", "sixth", "seventh",
    ]);
    const texts = FAUSTIAN_DEVIL_LAW_DEFINITIONS.map((law) => "text" in law ? law.text : "");
    expect(texts.join(" ")).toMatch(/laughter of children/i);
    expect(texts.join(" ")).toMatch(/temple door/i);
    expect(texts.join(" ")).toMatch(/crowing rooster/i);
    expect(texts.join(" ")).toMatch(/morning light/i);
    expect(texts.join(" ")).toMatch(/bet or wager/i);
    expect(texts.join(" ")).toMatch(/break a promise/i);
    expect(texts.join(" ")).toMatch(/good food/i);
  });

  it("catalogs the 17 source Devil Forms with casual/special/duress selection", () => {
    expect(FAUSTIAN_DEVIL_FORM_DEFINITIONS).toHaveLength(17);
    expect(FAUSTIAN_DEVIL_FORM_IDS).toHaveLength(17);
    const descriptions = FAUSTIAN_DEVIL_FORM_DEFINITIONS.map((form) =>
      "description" in form ? form.description : "",
    ).join(" ");
    expect(descriptions).toMatch(/black goatee/i);
    expect(descriptions).toMatch(/seven heads/i);
    expect(descriptions).toMatch(/the Faustian himself/i);
    expect(EMPTY_FAUSTIAN_STATE).toHaveProperty("selectedDevilForms");
    expect(EMPTY_FAUSTIAN_STATE).not.toHaveProperty("selectedDevilFormIds");
  });

  it("catalogs the eleven origin/Secret-Name claims and allows a custom claim", () => {
    expect(FAUSTIAN_ORIGIN_CLAIM_DEFINITIONS).toHaveLength(11);
    expect(FAUSTIAN_ORIGIN_CLAIM_IDS).toHaveLength(11);
    const names = FAUSTIAN_ORIGIN_CLAIM_DEFINITIONS.map((claim) =>
      "secretName" in claim ? claim.secretName : "",
    );
    expect(names).toEqual(expect.arrayContaining([
      "Marcus", "Calliope", "Robin", "Nathix", "Nemora", "Madris",
      "Ephrain", "Elzammarat", "Azmodai", "The Tower",
    ]));
    expect(EMPTY_FAUSTIAN_STATE).toHaveProperty("customOriginClaim");
  });

  it("treats Antagonist as a Faustian role on a real Nature, with Domain and chip count", () => {
    const faustian = {
      ...EMPTY_FAUSTIAN_STATE,
      antagonists: [{ denizenId: DEN_2, seatId: "hierophant", chipCount: 2 }],
    };
    const state = baseV5(faustian as FaustianState, {
      ...EMPTY_SHARED_WORLD_STATE,
      denizens: [{
        denizenId: DEN_2,
        name: "Lord Ash",
        representation: "individual",
        description: null,
        mortalityState: "not_deceased",
        powerfulProfile: {
          taxonomies: [{ kind: "builtin", taxonomyId: "beast" }],
          status: { kind: "standard", value: "malignant" },
          goal: "Subjugation",
          methods: [],
          truths: [],
        },
      }],
    });
    expect(() => validateCampaignStateV5Candidate(state)).not.toThrow();
    expect("suitGoal" in (state.faustian.antagonists[0] as object)).toBe(false);
  });

  it("links a Conspiracy to a Community and requires the Antagonist role", () => {
    const faustian = {
      ...EMPTY_FAUSTIAN_STATE,
      conspiracies: [{ denizenId: DEN_1, communityId: "aries" }],
      antagonists: [{ denizenId: DEN_1, seatId: "hierophant", chipCount: 1 }],
    };
    const accepted = baseV5(faustian as FaustianState, {
      ...EMPTY_SHARED_WORLD_STATE,
      denizens: [{
        denizenId: DEN_1,
        name: "The League",
        representation: "collective",
        description: null,
        mortalityState: null,
        powerfulProfile: {
          taxonomies: [{ kind: "builtin", taxonomyId: "conspiracy" }],
          status: { kind: "standard", value: "malignant" },
          goal: "Calamity",
          methods: [],
          truths: [],
        },
      }],
    });
    expect(() => validateCampaignStateV5Candidate(accepted)).not.toThrow();

    const missingRole = {
      ...EMPTY_FAUSTIAN_STATE,
      conspiracies: [{ denizenId: DEN_1, communityId: "aries" }],
    };
    expectInvalid(
      baseV5(missingRole as FaustianState, {
        ...EMPTY_SHARED_WORLD_STATE,
        denizens: [{
          denizenId: DEN_1,
          name: "The League",
          representation: "collective",
          description: null,
          mortalityState: null,
          powerfulProfile: {
            taxonomies: [{ kind: "builtin", taxonomyId: "conspiracy" }],
            status: { kind: "standard", value: "malignant" },
            goal: "Calamity",
            methods: [],
            truths: [],
          },
        }],
      }),
      /antagonist/i,
    );
  });

  it("records Demon as taxonomy with Bound/Unbound state, form, Hell, symbol, and Domain progress", () => {
    const unbound = {
      ...EMPTY_FAUSTIAN_STATE,
      demons: [{
        denizenId: DEN_3,
        binding: { kind: "unbound", malignance: "violent" },
        form: "a column of smoke",
        hellOfOrigin: "the brass city",
        magicalSymbol: "a seven-pointed seal",
        occupancy: { kind: "pact_domain", seatId: "hierophant" },
        monthsInCurrentDomain: 2,
      }],
    };
    const accepted = baseV5(unbound as FaustianState, {
      ...EMPTY_SHARED_WORLD_STATE,
      denizens: [{
        denizenId: DEN_3,
        name: "Ashmaw",
        representation: "individual",
        description: null,
        mortalityState: "not_deceased",
        powerfulProfile: {
          taxonomies: [{ kind: "builtin", taxonomyId: "demon" }],
          status: { kind: "standard", value: "malignant" },
          goal: null,
          methods: [],
          truths: [],
        },
      }],
    });
    expect(() => validateCampaignStateV5Candidate(accepted)).not.toThrow();

    const boundMissingMalignance = {
      ...EMPTY_FAUSTIAN_STATE,
      demons: [{
        denizenId: DEN_3,
        binding: { kind: "bound" },
        form: "a black dog",
        hellOfOrigin: "the brass city",
        magicalSymbol: "a seven-pointed seal",
        occupancy: null,
        monthsInCurrentDomain: 0,
      }],
    };
    expect(() => validateCampaignStateV5Candidate(baseV5(boundMissingMalignance as FaustianState, {
      ...EMPTY_SHARED_WORLD_STATE,
      denizens: [{
        denizenId: DEN_3,
        name: "Ashmaw",
        representation: "individual",
        description: null,
        mortalityState: "not_deceased",
        powerfulProfile: {
          taxonomies: [{ kind: "builtin", taxonomyId: "demon" }],
          status: { kind: "standard", value: "malignant" },
          goal: null,
          methods: [],
          truths: [],
        },
      }],
    }))).not.toThrow();
  });

  it("allows multiple Accomplices in one Community", () => {
    const ace = faustianCardId("spades", "ace");
    const two = faustianCardId("spades", "2");
    const withAccomplices = {
      ...takeFromDeck(takeFromDeck(EMPTY_FAUSTIAN_STATE, ace), two),
      communities: EMPTY_FAUSTIAN_STATE.communities.map((community, index) =>
        index === 0
          ? { ...community, accompliceCardIds: [ace, two] }
          : community
      ),
    };
    expect(() => validateFaustianStructure(withAccomplices)).not.toThrow();
  });

  it("includes set-aside hands and Domain-placed cards in the exact-once partition", () => {
    const ace = faustianCardId("spades", "ace");
    const queen = faustianCardId("spades", "queen");
    const jack = faustianCardId("spades", "jack");
    const partitioned = {
      ...takeFromDeck(takeFromDeck(takeFromDeck(EMPTY_FAUSTIAN_STATE, ace), queen), jack),
      setAsideHand: [ace, queen],
      domainPlacements: [{
        cardId: jack,
        seatId: "hierophant",
        represented: { kind: "denizen", denizenId: DEN_2 },
      }],
    };
    expect(() => validateFaustianStructure(partitioned)).not.toThrow();
    expectInvalid(
      baseV5(partitioned as FaustianState),
      /denizen/i,
    );
  });

  it("enforces 3 casual / 2 special / 1 duress Forms only during normal initialization", () => {
    const casual = FAUSTIAN_DEVIL_FORM_IDS.slice(0, 3);
    const special = FAUSTIAN_DEVIL_FORM_IDS.slice(3, 5);
    const duress = FAUSTIAN_DEVIL_FORM_IDS.slice(5, 6);
    expect(() => buildInitializedDefaultFaustianState({
      selectedDevilLawIds: [FAUSTIAN_DEVIL_LAW_IDS[0], FAUSTIAN_DEVIL_LAW_IDS[1]],
      activeTwistCardId: TWIST,
      selectedDevilForms: { casual, special, duress },
    })).not.toThrow();
    expect(() => buildInitializedDefaultFaustianState({
      selectedDevilLawIds: [FAUSTIAN_DEVIL_LAW_IDS[0], FAUSTIAN_DEVIL_LAW_IDS[1]],
      activeTwistCardId: TWIST,
      selectedDevilForms: { casual: casual.slice(0, 2), special, duress },
    })).toThrow(DomainError);

    const extraDuress = {
      ...EMPTY_FAUSTIAN_STATE,
      selectedDevilForms: {
        casual,
        special,
        duress: [...duress, FAUSTIAN_DEVIL_FORM_IDS[6]],
      },
    };
    expect(() => validateFaustianStructure(extraDuress)).not.toThrow();
  });
});
