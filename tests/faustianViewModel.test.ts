import { describe, it, expect } from "vitest";
import {
  EMPTY_FAUSTIAN_STATE,
  FAUSTIAN_COMMUNITY_DEFINITIONS,
  FAUSTIAN_COMMUNITY_IDS,
  FAUSTIAN_TABLEAU_COLUMN_COUNT,
  FAUSTIAN_TABLEAU_ROW_COUNT,
  FAUSTIAN_ZODIAC_LABELS,
  buildInitializedDefaultFaustianState,
  faustianCardId,
  faustianCardSourceReference,
  faustianCommunityHeader,
  faustianTableauColumnIndex,
  faustianTableauRowIndex,
  readLoreCompendiumReference,
  type FaustianCardId,
  type FaustianCommunityId,
  type FaustianState,
  type SorcererExternalPresence,
} from "../shared/domain";
import { makeTestCampaignStateV5 } from "./test-state";
import {
  FAUSTIAN_COMMUNITY_ROW_ORDER,
  FAUSTIAN_FAN_CAP,
  FACEDOWN_SCHEME_LABEL,
  FACEDOWN_TWIST_LABEL,
  buildFaustianTablePresentation,
  faustianLoreSubjects,
  presentationContainsSecretIdentity,
  privateTwistInspection,
  researcherOperationalLabel,
} from "../src/faustian-view-model";
import type { DenizenRef } from "../src/WorldSurface";

const TWIST = faustianCardId("spades", "ace");
const SCHEME_A = faustianCardId("hearts", "2");
const SCHEME_B = faustianCardId("hearts", "3");
const SCHEME_C = faustianCardId("hearts", "4");
const SCHEME_D = faustianCardId("clubs", "5");
const SCHEME_E = faustianCardId("clubs", "6");
const ACCOMPLICE_A = faustianCardId("diamonds", "7");
const ACCOMPLICE_B = faustianCardId("diamonds", "8");
const HELD = faustianCardId("spades", "9");
const ENTRUSTED = faustianCardId("spades", "10");
const POSSESSION = faustianCardId("spades", "jack");
const DOMAIN = faustianCardId("spades", "queen");
const DEFEATED = faustianCardId("spades", "king");
const WIZ_A = "wiz_00000000-0000-0000-0000-00000000000a";
const DEN_A = "den_00000000-0000-0000-0000-000000000001";

function take(faustian: FaustianState, cardIds: readonly FaustianCardId[]): FaustianState {
  const removing = new Set(cardIds);
  return {
    ...faustian,
    faustianDeck: faustian.faustianDeck.filter((id) => !removing.has(id)),
  };
}

function withCommunity(
  faustian: FaustianState,
  communityId: FaustianCommunityId,
  patch: Partial<FaustianState["communities"][number]>,
): FaustianState {
  return {
    ...faustian,
    communities: faustian.communities.map((community) =>
      community.communityId === communityId ? { ...community, ...patch } : community
    ),
  };
}

function populatedFaustian(): FaustianState {
  let faustian = take(EMPTY_FAUSTIAN_STATE, [
    TWIST, SCHEME_A, SCHEME_B, SCHEME_C, SCHEME_D, SCHEME_E,
    ACCOMPLICE_A, ACCOMPLICE_B, HELD, ENTRUSTED, POSSESSION, DOMAIN, DEFEATED,
  ]);
  faustian = {
    ...faustian,
    devilDeck: [SCHEME_E],
    machinations: [{ cardId: TWIST, facing: "face_down" }],
    activeTwistCardIds: [TWIST],
    defeatedSchemes: [DEFEATED],
    setAsideHand: [HELD],
    entrustedCards: [{ cardId: ENTRUSTED, wizardId: WIZ_A as never }],
    possessions: [{ cardId: POSSESSION, wizardId: WIZ_A as never, represented: { kind: "none" } }],
    domainPlacements: [{ cardId: DOMAIN, seatId: "hierophant", represented: { kind: "none" } }],
    conspiracies: [{ denizenId: DEN_A as never, communityId: "aries" }],
  };
  faustian = withCommunity(faustian, "aries", {
    pawnCount: 2,
    schemes: [
      { cardId: SCHEME_A, facing: "face_up" },
      { cardId: SCHEME_B, facing: "face_down" },
      { cardId: SCHEME_C, facing: "face_down" },
      { cardId: SCHEME_D, facing: "face_up" },
    ],
    accompliceCardIds: [ACCOMPLICE_A, ACCOMPLICE_B],
  });
  return faustian;
}

describe("Faustian card source reference", () => {
  it("keys every canonical card and records source wording omissions honestly", () => {
    const ace = faustianCardSourceReference("spades_ace");
    expect(ace.faceUpIdentityLabel).toBe("Ace of Spades");
    expect(ace.scheme.wordingStatus).toBe("source_not_transcribed");
    expect(ace.scheme.title).toBeNull();
    expect(ace.twist.text).toBeNull();
    expect(ace.accomplice.syndicate).toBeNull();
    expect(ace.accomplice.role).toBeNull();
  });
});

describe("canonical Community order", () => {
  it("uses the settled 3-column by 4-row Materials mapping", () => {
    expect(FAUSTIAN_COMMUNITY_ROW_ORDER).toEqual([...FAUSTIAN_COMMUNITY_IDS]);
    expect(FAUSTIAN_TABLEAU_COLUMN_COUNT).toBe(3);
    expect(FAUSTIAN_TABLEAU_ROW_COUNT).toBe(4);
    expect(FAUSTIAN_COMMUNITY_DEFINITIONS[0]).toMatchObject({
      communityId: "aries",
      associatedSeatId: "hierophant",
      populace: "monks/pilgrims",
    });
    expect(faustianTableauRowIndex(0)).toBe(0);
    expect(faustianTableauColumnIndex(1)).toBe(1);
    expect(faustianCommunityHeader("leo").zodiacLabel).toBe(FAUSTIAN_ZODIAC_LABELS.leo);
    expect(faustianCommunityHeader("leo").associatedWizardLabel).toBe("Warlock");
    const presentation = buildFaustianTablePresentation({ faustian: EMPTY_FAUSTIAN_STATE });
    expect(presentation.communities.map((community) => community.communityId)).toEqual([
      "aries", "leo", "sagittarius",
      "taurus", "virgo", "capricorn",
      "gemini", "libra", "aquarius",
      "cancer", "scorpio", "pisces",
    ]);
    expect(presentation.communities[0]?.headerLabel).toContain("Aries");
    expect(presentation.communities[0]?.headerLabel).toContain("Hierophant");
  });
});

describe("represented card zones", () => {
  it("derives every current Faustian card zone without inventing placements", () => {
    const presentation = buildFaustianTablePresentation({
      faustian: populatedFaustian(),
      denizens: [{ denizenId: DEN_A, name: "The Red Compact", representation: "collective", description: null }],
      wizards: [{ wizardId: WIZ_A, name: "Mara" }],
    });
    const aries = presentation.communities[0]!;
    expect(aries.schemes.totalCount).toBe(4);
    expect(aries.accomplices.totalCount).toBe(2);
    expect(aries.pawnCount).toBe(2);
    expect(aries.pawnLabel).toBe("2 Pawns");
    expect(aries.conspiracies).toEqual([{ denizenId: DEN_A, name: "The Red Compact" }]);
    expect(presentation.faustianDeckCount).toBe(52 - 13);
    expect(presentation.devilDeckCount).toBe(1);
    expect(presentation.twists).toHaveLength(1);
    expect(presentation.machinations).toHaveLength(1);
    expect(presentation.defeatedSchemes[0]?.publicLabel).toBe("King of Spades");
    expect(presentation.heldCards[0]?.publicLabel).toBe("Nine of Spades");
    expect(presentation.entrustedCards[0]?.locationLabel).toBe("Entrusted to Mara");
    expect(presentation.possessionCards[0]?.locationLabel).toBe("Possession of Mara");
    expect(presentation.domainPlacements[0]?.locationLabel).toBe("Hierophant Domain");
    expect(presentation.suitSummaries.find((suit) => suit.suit === "hearts")?.faustianDeckCount).toBeGreaterThanOrEqual(0);
  });

  it("presents multiple Schemes, Accomplices, and Twists", () => {
    const helper = buildInitializedDefaultFaustianState({
      selectedDevilLawIds: ["laughter_of_children_and_music", "temple_door_or_immortal_flames"],
      activeTwistCardId: TWIST,
      selectedDevilForms: {
        casual: ["dashing_young_man", "old_schoolmaster", "ancient_miser"],
        special: ["beautiful_young_woman", "caring_mother"],
        duress: ["old_hag"],
      },
    });
    const secondTwist = faustianCardId("hearts", "ace");
    let faustian = take(helper, [SCHEME_A, SCHEME_B, ACCOMPLICE_A, ACCOMPLICE_B, secondTwist]);
    faustian = {
      ...faustian,
      machinations: [
        { cardId: TWIST, facing: "face_down" },
        { cardId: secondTwist, facing: "face_up" },
      ],
      activeTwistCardIds: [TWIST, secondTwist],
    };
    faustian = withCommunity(faustian, "leo", {
      schemes: [
        { cardId: SCHEME_A, facing: "face_up" },
        { cardId: SCHEME_B, facing: "face_down" },
      ],
      accompliceCardIds: [ACCOMPLICE_A, ACCOMPLICE_B],
    });
    const presentation = buildFaustianTablePresentation({ faustian });
    const leo = presentation.communities.find((community) => community.communityId === "leo")!;
    expect(leo.schemes.totalCount).toBe(2);
    expect(leo.accomplices.totalCount).toBe(2);
    expect(presentation.twists).toHaveLength(2);
    expect(presentation.twists[0]?.publicLabel).toBe(FACEDOWN_TWIST_LABEL);
    expect(presentation.twists[1]?.facing).toBe("face_up");
  });
});

describe("facedown non-leakage", () => {
  it("does not put rank, suit, or identity into ordinary public labels", () => {
    const presentation = buildFaustianTablePresentation({ faustian: populatedFaustian() });
    const aries = presentation.communities[0]!;
    const facedown = aries.schemes.visible.filter((card) => card.facing === "face_down");
    expect(facedown.length).toBeGreaterThan(0);
    for (const card of facedown) {
      expect(card.publicLabel).toBe(FACEDOWN_SCHEME_LABEL);
      expect(card.ariaLabel).toBe(FACEDOWN_SCHEME_LABEL);
      expect(presentationContainsSecretIdentity(card.publicLabel, SCHEME_B)).toBe(false);
      expect(presentationContainsSecretIdentity(card.ariaLabel, SCHEME_B)).toBe(false);
      expect("cardId" in card).toBe(false);
    }
    expect(presentation.twists[0]?.publicLabel).toBe(FACEDOWN_TWIST_LABEL);
    expect("cardId" in presentation.twists[0]!).toBe(false);
  });
});

describe("private Twist inspection", () => {
  it("reveals identity locally without changing Faustian state", () => {
    const faustian = populatedFaustian();
    const before = structuredClone(faustian);
    const inspected = privateTwistInspection(faustian, 0);
    expect(inspected?.identityLabel).toBe("Ace of Spades");
    expect(faustian).toEqual(before);
    expect(faustian.machinations[0]?.facing).toBe("face_down");
  });
});

describe("Sorcerer presence", () => {
  it("uses Working / Unavailable this month text and Domain-wide Disruptive Arcanists", () => {
    expect(researcherOperationalLabel(true)).toBe("Working");
    expect(researcherOperationalLabel(false)).toBe("Unavailable this month");
    const presence: SorcererExternalPresence[] = [
      {
        kind: "researcher",
        denizenId: DEN_A as never,
        name: "Ilex",
        operationalThisMonth: true,
        positionId: "srp_faustian_devils_schemes",
        target: { kind: "faustian_devils_schemes" },
      },
      {
        kind: "researcher",
        denizenId: "den_00000000-0000-0000-0000-000000000002" as never,
        name: "Ashen Watcher",
        operationalThisMonth: false,
        positionId: "srp_necromancer_final_death",
        target: { kind: "necromancer_final_death" },
      },
      {
        kind: "disruptive_arcanist",
        denizenId: "den_00000000-0000-0000-0000-000000000003" as never,
        name: "Vesper",
        school: { kind: "source", schoolId: "enchantment" },
        seatId: "faustian",
      },
      {
        kind: "disruptive_arcanist",
        denizenId: "den_00000000-0000-0000-0000-000000000004" as never,
        name: "Other Domain",
        school: { kind: "source", schoolId: "enchantment" },
        seatId: "mariner",
      },
    ];
    const presentation = buildFaustianTablePresentation({
      faustian: EMPTY_FAUSTIAN_STATE,
      sorcererPresence: presence,
    });
    expect(presentation.devilSchemeResearchers).toEqual([
      { denizenId: DEN_A, name: "Ilex", operationalLabel: "Working" },
    ]);
    expect(presentation.disruptiveArcanists).toEqual([
      { denizenId: "den_00000000-0000-0000-0000-000000000003", name: "Vesper", schoolLabel: "enchantment" },
    ]);
  });
});

describe("Lore binding", () => {
  it("reuses existing Faustian hell source topics without inventing Community Notes", () => {
    const presentation = readLoreCompendiumReference(makeTestCampaignStateV5());
    expect(presentation.ok).toBe(true);
    if (!presentation.ok) return;
    const subjects = faustianLoreSubjects({ status: "ready", presentation }, null);
    expect(subjects.some((subject) => subject.subjectLabel.toLowerCase().includes("mutterheep") || subject.presentationKey.includes("hell"))).toBe(true);
    expect(subjects.every((subject) => subject.subject?.kind !== "faustian_community" as never)).toBe(true);
  });
});

describe("crowded Community overflow", () => {
  it("caps fanned Schemes and exposes an overflow inspector label", () => {
    const presentation = buildFaustianTablePresentation({ faustian: populatedFaustian() });
    const aries = presentation.communities[0]!;
    expect(FAUSTIAN_FAN_CAP).toBe(3);
    expect(aries.schemes.visible).toHaveLength(FAUSTIAN_FAN_CAP);
    expect(aries.schemes.hiddenCount).toBe(1);
    expect(aries.schemes.overflowLabel).toBe("Inspect all 4 Schemes");
  });
});

describe("denizen fallback", () => {
  const unused: DenizenRef[] = [];
  it("does not require World denizens to render the tableau", () => {
    const presentation = buildFaustianTablePresentation({
      faustian: populatedFaustian(),
      denizens: unused,
    });
    expect(presentation.communities).toHaveLength(12);
  });
});
