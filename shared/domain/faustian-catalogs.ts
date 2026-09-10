import type { PactSeatId } from "./pact-seats";

export const FAUSTIAN_SUITS = ["spades", "clubs", "diamonds", "hearts"] as const;

export type FaustianSuit = (typeof FAUSTIAN_SUITS)[number];

export const FAUSTIAN_RANKS = [
  "ace",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
  "jack",
  "queen",
  "king",
] as const;

export type FaustianRank = (typeof FAUSTIAN_RANKS)[number];

export type FaustianCardId = `${FaustianSuit}_${FaustianRank}`;

export interface FaustianCardDefinition {
  readonly cardId: FaustianCardId;
  readonly suit: FaustianSuit;
  readonly rank: FaustianRank;
}

export function faustianCardId(suit: FaustianSuit, rank: FaustianRank): FaustianCardId {
  return `${suit}_${rank}`;
}

export const FAUSTIAN_CARD_DEFINITIONS: readonly FaustianCardDefinition[] = FAUSTIAN_SUITS.flatMap((suit) =>
  FAUSTIAN_RANKS.map((rank) => ({
    cardId: faustianCardId(suit, rank),
    suit,
    rank,
  })),
);

export const FAUSTIAN_CARD_IDS: readonly FaustianCardId[] = FAUSTIAN_CARD_DEFINITIONS.map((card) => card.cardId);

const FAUSTIAN_CARD_ID_SET = new Set<string>(FAUSTIAN_CARD_IDS);

export function isValidFaustianCardId(value: string): value is FaustianCardId {
  return FAUSTIAN_CARD_ID_SET.has(value);
}

export function isValidFaustianSuit(value: string): value is FaustianSuit {
  return (FAUSTIAN_SUITS as readonly string[]).includes(value);
}

export function isValidFaustianRank(value: string): value is FaustianRank {
  return (FAUSTIAN_RANKS as readonly string[]).includes(value);
}

export const FAUSTIAN_CARD_FACINGS = ["face_down", "face_up"] as const;

export type FaustianCardFacing = (typeof FAUSTIAN_CARD_FACINGS)[number];

export function isValidFaustianCardFacing(value: string): value is FaustianCardFacing {
  return (FAUSTIAN_CARD_FACINGS as readonly string[]).includes(value);
}

/**
 * Approved operational Draft-4 Materials+Cards Community mapping.
 *
 * The Faustian Codex conflicts in its final Zodiac assignments.
 * The Materials board and Lord-card row effects agree with one another; this
 * application uses that Materials+Cards mapping as the fixed operational board.
 * The Codex final assignments are not the operational board, and the
 * board is not campaign-configurable to dodge the contradiction.
 *
 * Layout (row-major, 4x3):
 * Aries/Hierophant/monks-pilgrims | Leo/Warlock/lords-ladies | Sagittarius/Sorcerer/scholars-researchers
 * Taurus/Hierophant/merchants-bankers | Virgo/Warlock/soldiers-servants | Capricorn/Necromancer/dead-nearly-dead
 * Gemini/Hierophant/farmers-shepherds | Libra/Mariner/fishermen-divers | Aquarius/Sage/druids-hermits
 * Cancer/Hierophant/beggars-thieves | Scorpio/Mariner/sailors-travelers | Pisces/Sage/dreamers-wanderers
 */
export const FAUSTIAN_COMMUNITY_IDS = [
  "aries",
  "leo",
  "sagittarius",
  "taurus",
  "virgo",
  "capricorn",
  "gemini",
  "libra",
  "aquarius",
  "cancer",
  "scorpio",
  "pisces",
] as const;

export type FaustianCommunityId = (typeof FAUSTIAN_COMMUNITY_IDS)[number];

export interface FaustianCommunityDefinition {
  readonly communityId: FaustianCommunityId;
  readonly associatedSeatId: PactSeatId;
  readonly populace: string;
}

export const FAUSTIAN_COMMUNITY_DEFINITIONS: readonly FaustianCommunityDefinition[] = [
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
];

export function isValidFaustianCommunityId(value: string): value is FaustianCommunityId {
  return (FAUSTIAN_COMMUNITY_IDS as readonly string[]).includes(value);
}

export const FAUSTIAN_DEVIL_LAW_IDS = [
  "first",
  "second",
  "third",
  "fourth",
  "fifth",
  "sixth",
  "seventh",
] as const;

export type FaustianDevilLawId = (typeof FAUSTIAN_DEVIL_LAW_IDS)[number];

export interface FaustianDevilLawDefinition {
  readonly id: FaustianDevilLawId;
  /** Application ordinal label; not a source title. */
  readonly applicationLabel: string;
}

const DEVIL_LAW_APPLICATION_LABELS: Record<FaustianDevilLawId, string> = {
  first: "First Law of the Devil",
  second: "Second Law of the Devil",
  third: "Third Law of the Devil",
  fourth: "Fourth Law of the Devil",
  fifth: "Fifth Law of the Devil",
  sixth: "Sixth Law of the Devil",
  seventh: "Seventh Law of the Devil",
};

export const FAUSTIAN_DEVIL_LAW_DEFINITIONS: readonly FaustianDevilLawDefinition[] =
  FAUSTIAN_DEVIL_LAW_IDS.map((id) => ({
    id,
    applicationLabel: DEVIL_LAW_APPLICATION_LABELS[id],
  }));

export function isValidFaustianDevilLawId(value: string): value is FaustianDevilLawId {
  return (FAUSTIAN_DEVIL_LAW_IDS as readonly string[]).includes(value);
}

export const FAUSTIAN_DEVIL_FORM_IDS = [
  "first",
  "second",
  "third",
  "fourth",
  "fifth",
  "sixth",
  "seventh",
] as const;

export type FaustianDevilFormId = (typeof FAUSTIAN_DEVIL_FORM_IDS)[number];

export interface FaustianDevilFormDefinition {
  readonly id: FaustianDevilFormId;
  readonly applicationLabel: string;
}

const DEVIL_FORM_APPLICATION_LABELS: Record<FaustianDevilFormId, string> = {
  first: "First Devil Form",
  second: "Second Devil Form",
  third: "Third Devil Form",
  fourth: "Fourth Devil Form",
  fifth: "Fifth Devil Form",
  sixth: "Sixth Devil Form",
  seventh: "Seventh Devil Form",
};

export const FAUSTIAN_DEVIL_FORM_DEFINITIONS: readonly FaustianDevilFormDefinition[] =
  FAUSTIAN_DEVIL_FORM_IDS.map((id) => ({
    id,
    applicationLabel: DEVIL_FORM_APPLICATION_LABELS[id],
  }));

export function isValidFaustianDevilFormId(value: string): value is FaustianDevilFormId {
  return (FAUSTIAN_DEVIL_FORM_IDS as readonly string[]).includes(value);
}

export const FAUSTIAN_ORIGIN_CLAIM_IDS = [
  "first",
  "second",
  "third",
  "fourth",
  "fifth",
  "sixth",
  "seventh",
] as const;

export type FaustianOriginClaimId = (typeof FAUSTIAN_ORIGIN_CLAIM_IDS)[number];

export const FAUSTIAN_ORIGIN_CLAIM_STATUSES = ["open", "disproven"] as const;

export type FaustianOriginClaimStatus = (typeof FAUSTIAN_ORIGIN_CLAIM_STATUSES)[number];

export interface FaustianOriginClaimDefinition {
  readonly claimId: FaustianOriginClaimId;
  readonly applicationLabel: string;
}

const ORIGIN_CLAIM_APPLICATION_LABELS: Record<FaustianOriginClaimId, string> = {
  first: "First Devil Origin or Secret-Name Claim",
  second: "Second Devil Origin or Secret-Name Claim",
  third: "Third Devil Origin or Secret-Name Claim",
  fourth: "Fourth Devil Origin or Secret-Name Claim",
  fifth: "Fifth Devil Origin or Secret-Name Claim",
  sixth: "Sixth Devil Origin or Secret-Name Claim",
  seventh: "Seventh Devil Origin or Secret-Name Claim",
};

export const FAUSTIAN_ORIGIN_CLAIM_DEFINITIONS: readonly FaustianOriginClaimDefinition[] =
  FAUSTIAN_ORIGIN_CLAIM_IDS.map((claimId) => ({
    claimId,
    applicationLabel: ORIGIN_CLAIM_APPLICATION_LABELS[claimId],
  }));

export function isValidFaustianOriginClaimId(value: string): value is FaustianOriginClaimId {
  return (FAUSTIAN_ORIGIN_CLAIM_IDS as readonly string[]).includes(value);
}

export function isValidFaustianOriginClaimStatus(value: string): value is FaustianOriginClaimStatus {
  return (FAUSTIAN_ORIGIN_CLAIM_STATUSES as readonly string[]).includes(value);
}

export const FAUSTIAN_ANTAGONIST_GOALS = [
  "subjugation",
  "calamity",
  "extinction",
  "treachery",
] as const;

export type FaustianAntagonistGoal = (typeof FAUSTIAN_ANTAGONIST_GOALS)[number];

export interface FaustianAntagonistGoalDefinition {
  readonly goal: FaustianAntagonistGoal;
  readonly suit: FaustianSuit;
  readonly applicationLabel: string;
}

export const FAUSTIAN_ANTAGONIST_GOAL_DEFINITIONS: readonly FaustianAntagonistGoalDefinition[] = [
  { goal: "subjugation", suit: "spades", applicationLabel: "Subjugation / Spades" },
  { goal: "calamity", suit: "clubs", applicationLabel: "Calamity / Clubs" },
  { goal: "extinction", suit: "diamonds", applicationLabel: "Extinction / Diamonds" },
  { goal: "treachery", suit: "hearts", applicationLabel: "Treachery / Hearts" },
];

export function isValidFaustianAntagonistGoal(value: string): value is FaustianAntagonistGoal {
  return (FAUSTIAN_ANTAGONIST_GOALS as readonly string[]).includes(value);
}

export const FAUSTIAN_MALIGNANCES = ["violent", "controlling"] as const;

export type FaustianMalignance = (typeof FAUSTIAN_MALIGNANCES)[number];

export function isValidFaustianMalignance(value: string): value is FaustianMalignance {
  return (FAUSTIAN_MALIGNANCES as readonly string[]).includes(value);
}
