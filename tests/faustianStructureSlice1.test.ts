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
  FAUSTIAN_CARD_DEFINITIONS,
  FAUSTIAN_CARD_IDS,
  FAUSTIAN_COMMUNITY_DEFINITIONS,
  FAUSTIAN_COMMUNITY_IDS,
  FAUSTIAN_RANKS,
  FAUSTIAN_SUITS,
  SEVEN_PART_PACT_DRAFT4_ID,
  SEVEN_PART_PACT_DRAFT4_VERSION,
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

function powerfulProfile(taxonomyId: "conspiracy" | "antagonist" | "unbound_demon") {
  return {
    taxonomies: [{ kind: "builtin" as const, taxonomyId }],
    status: { kind: "standard" as const, value: "malignant" as const },
    goal: null,
    methods: [],
    truths: [],
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
    selectedDevilLawIds: ["first", "second"],
    activeTwistCardId: TWIST,
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
    expect(faustian.selectedDevilLawIds).toEqual(["first", "second"]);
    expect(faustian.activeTwistCardIds).toEqual([TWIST]);
    expect(faustian.machinations).toEqual([{ cardId: TWIST, facing: "face_down" }]);
    expect(faustian.faustianDeck).not.toContain(TWIST);
    expect(faustian.faustianDeck).toHaveLength(51);
    expect(faustian.communities).toHaveLength(12);
    expect(() => validateFaustianStructure(faustian)).not.toThrow();
    expect(() => validateCampaignStateV5Candidate(baseV5(faustian))).not.toThrow();
  });

  it("does not permanently require exactly two Laws on persisted state", () => {
    const oneLaw = { ...initializedFaustian(), selectedDevilLawIds: ["third"] as const };
    const threeLaws = { ...initializedFaustian(), selectedDevilLawIds: ["first", "second", "third"] as const };
    const noLaws = { ...initializedFaustian(), selectedDevilLawIds: [] };
    expect(() => validateFaustianStructure(oneLaw)).not.toThrow();
    expect(() => validateFaustianStructure(threeLaws)).not.toThrow();
    expect(() => validateFaustianStructure(noLaws)).not.toThrow();
    expect(() => buildInitializedDefaultFaustianState({
      selectedDevilLawIds: ["first"],
      activeTwistCardId: TWIST,
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
      selectedDevilLawIds: ["first", "first"],
    })).toThrow(/duplicate/i);
    expect(() => validateFaustianStructure({
      ...initializedFaustian(),
      selectedDevilLawIds: ["not_a_law" as "first"],
    })).toThrow(DomainError);
  });
});

describe("Faustian reference integrity", () => {
  it("rejects incoherent Conspiracy / Antagonist / Demon Powerful-Denizen refs", () => {
    const missingDenizen = {
      ...EMPTY_FAUSTIAN_STATE,
      conspiracies: [{ denizenId: DEN_1 }],
    };
    expectInvalid(baseV5(missingDenizen), /conspiracy|denizen/i);

    expectInvalid(
      baseV5(
        { ...EMPTY_FAUSTIAN_STATE, conspiracies: [{ denizenId: DEN_1 }] },
        {
          ...EMPTY_SHARED_WORLD_STATE,
          denizens: [{
            denizenId: DEN_1,
            name: "A Conspiracy",
            representation: "individual",
            description: null,
            mortalityState: "not_deceased",
            powerfulProfile: powerfulProfile("conspiracy"),
          }],
        },
      ),
      /collective/,
    );

    expectInvalid(
      baseV5(
        { ...EMPTY_FAUSTIAN_STATE, conspiracies: [{ denizenId: DEN_1 }] },
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
          antagonists: [{ denizenId: DEN_2, suitGoal: "subjugation" }],
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
      /Powerful|taxonomy|antagonist/i,
    );

    expectInvalid(
      baseV5(
        {
          ...EMPTY_FAUSTIAN_STATE,
          demons: [{
            denizenId: DEN_3,
            malignance: "violent",
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
      conspiracies: [{ denizenId: DEN_1 }],
      antagonists: [{ denizenId: DEN_2, suitGoal: "subjugation" }],
      demons: [{
        denizenId: DEN_3,
        malignance: "controlling",
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
          powerfulProfile: powerfulProfile("conspiracy"),
        },
        {
          denizenId: DEN_2,
          name: "Lord Ash",
          representation: "individual",
          description: null,
          mortalityState: "not_deceased",
          powerfulProfile: powerfulProfile("antagonist"),
        },
        {
          denizenId: DEN_3,
          name: "Unbound",
          representation: "individual",
          description: null,
          mortalityState: "not_deceased",
          powerfulProfile: powerfulProfile("unbound_demon"),
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
