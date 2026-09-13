/**
 * Static Faustian card-source reference.
 *
 * APPLICATION DESIGN: typed lookup keyed by canonical playing-card identity.
 * This is display/reference data only. It does not define executable card
 * effects, transitions, or randomization.
 *
 * SOURCE vs APPLICATION: Scheme, Twist, and Accomplice wording lives on the
 * physical Faustian cards. Those texts are not yet transcribed into this
 * repository, so the reference layer records that omission honestly rather
 * than inventing titles, syndicates, or effects.
 */

import type { FaustianCardId, FaustianRank, FaustianSuit } from "./faustian-catalogs";
import {
  FAUSTIAN_CARD_DEFINITIONS,
  FAUSTIAN_COMMUNITY_DEFINITIONS,
  FAUSTIAN_RANKS,
  FAUSTIAN_SUITS,
  isValidFaustianCardId,
} from "./faustian-catalogs";
import { pactSeatDisplayName } from "./pact-seats";

export const FAUSTIAN_SOURCE_WORDING_STATUSES = ["source_not_transcribed"] as const;

export type FaustianSourceWordingStatus = (typeof FAUSTIAN_SOURCE_WORDING_STATUSES)[number];

export const FAUSTIAN_SOURCE_WORDING_OMISSION =
  "Source wording is not transcribed in this application; the physical card remains authoritative.";

export interface FaustianSchemeReference {
  readonly wordingStatus: FaustianSourceWordingStatus;
  readonly title: null;
  readonly text: null;
  readonly omission: typeof FAUSTIAN_SOURCE_WORDING_OMISSION;
}

export interface FaustianTwistReference {
  readonly wordingStatus: FaustianSourceWordingStatus;
  readonly title: null;
  readonly text: null;
  readonly omission: typeof FAUSTIAN_SOURCE_WORDING_OMISSION;
}

export interface FaustianAccompliceReference {
  readonly wordingStatus: FaustianSourceWordingStatus;
  readonly syndicate: null;
  readonly role: null;
  readonly omission: typeof FAUSTIAN_SOURCE_WORDING_OMISSION;
}

export interface FaustianCardSourceReference {
  readonly cardId: FaustianCardId;
  readonly suit: FaustianSuit;
  readonly rank: FaustianRank;
  readonly rankLabel: string;
  readonly suitLabel: string;
  readonly faceUpIdentityLabel: string;
  readonly scheme: FaustianSchemeReference;
  readonly twist: FaustianTwistReference;
  readonly accomplice: FaustianAccompliceReference;
}

export const FAUSTIAN_RANK_LABELS: Record<FaustianRank, string> = {
  ace: "Ace",
  "2": "Two",
  "3": "Three",
  "4": "Four",
  "5": "Five",
  "6": "Six",
  "7": "Seven",
  "8": "Eight",
  "9": "Nine",
  "10": "Ten",
  jack: "Jack",
  queen: "Queen",
  king: "King",
};

export const FAUSTIAN_SUIT_LABELS: Record<FaustianSuit, string> = {
  spades: "Spades",
  clubs: "Clubs",
  diamonds: "Diamonds",
  hearts: "Hearts",
};

export const FAUSTIAN_ZODIAC_LABELS: Record<(typeof FAUSTIAN_COMMUNITY_DEFINITIONS)[number]["communityId"], string> = {
  aries: "Aries",
  leo: "Leo",
  sagittarius: "Sagittarius",
  taurus: "Taurus",
  virgo: "Virgo",
  capricorn: "Capricorn",
  gemini: "Gemini",
  libra: "Libra",
  aquarius: "Aquarius",
  cancer: "Cancer",
  scorpio: "Scorpio",
  pisces: "Pisces",
};

const OMITTED_SCHEME: FaustianSchemeReference = {
  wordingStatus: "source_not_transcribed",
  title: null,
  text: null,
  omission: FAUSTIAN_SOURCE_WORDING_OMISSION,
};

const OMITTED_TWIST: FaustianTwistReference = {
  wordingStatus: "source_not_transcribed",
  title: null,
  text: null,
  omission: FAUSTIAN_SOURCE_WORDING_OMISSION,
};

const OMITTED_ACCOMPLICE: FaustianAccompliceReference = {
  wordingStatus: "source_not_transcribed",
  syndicate: null,
  role: null,
  omission: FAUSTIAN_SOURCE_WORDING_OMISSION,
};

function faceUpIdentityLabel(rank: FaustianRank, suit: FaustianSuit): string {
  return `${FAUSTIAN_RANK_LABELS[rank]} of ${FAUSTIAN_SUIT_LABELS[suit]}`;
}

export const FAUSTIAN_CARD_SOURCE_REFERENCES: readonly FaustianCardSourceReference[] =
  FAUSTIAN_CARD_DEFINITIONS.map((card) => ({
    cardId: card.cardId,
    suit: card.suit,
    rank: card.rank,
    rankLabel: FAUSTIAN_RANK_LABELS[card.rank],
    suitLabel: FAUSTIAN_SUIT_LABELS[card.suit],
    faceUpIdentityLabel: faceUpIdentityLabel(card.rank, card.suit),
    scheme: OMITTED_SCHEME,
    twist: OMITTED_TWIST,
    accomplice: OMITTED_ACCOMPLICE,
  }));

const SOURCE_BY_CARD_ID = new Map<FaustianCardId, FaustianCardSourceReference>(
  FAUSTIAN_CARD_SOURCE_REFERENCES.map((entry) => [entry.cardId, entry]),
);

export function faustianCardSourceReference(cardId: FaustianCardId): FaustianCardSourceReference {
  const entry = SOURCE_BY_CARD_ID.get(cardId);
  if (entry === undefined) {
    throw new Error(`Unknown Faustian card: ${cardId}`);
  }
  return entry;
}

export function faustianCardSourceReferenceOrNull(cardId: string): FaustianCardSourceReference | null {
  if (!isValidFaustianCardId(cardId)) return null;
  return faustianCardSourceReference(cardId);
}

export function faustianFaceUpIdentityLabel(cardId: FaustianCardId): string {
  return faustianCardSourceReference(cardId).faceUpIdentityLabel;
}

export function faustianCommunityHeader(communityId: (typeof FAUSTIAN_COMMUNITY_DEFINITIONS)[number]["communityId"]): {
  readonly communityId: typeof communityId;
  readonly zodiacLabel: string;
  readonly populace: string;
  readonly associatedWizardLabel: string;
} {
  const definition = FAUSTIAN_COMMUNITY_DEFINITIONS.find((entry) => entry.communityId === communityId);
  if (definition === undefined) {
    throw new Error(`Unknown Faustian Community: ${communityId}`);
  }
  return {
    communityId,
    zodiacLabel: FAUSTIAN_ZODIAC_LABELS[communityId],
    populace: definition.populace,
    associatedWizardLabel: pactSeatDisplayName(definition.associatedSeatId),
  };
}

export const FAUSTIAN_TABLEAU_COLUMN_COUNT = 3;
export const FAUSTIAN_TABLEAU_ROW_COUNT = 4;

export function faustianTableauRowIndex(communityIndex: number): number {
  return Math.floor(communityIndex / FAUSTIAN_TABLEAU_COLUMN_COUNT);
}

export function faustianTableauColumnIndex(communityIndex: number): number {
  return communityIndex % FAUSTIAN_TABLEAU_COLUMN_COUNT;
}

export const FAUSTIAN_RANK_SEQUENCE: readonly FaustianRank[] = FAUSTIAN_RANKS;
export const FAUSTIAN_SUIT_SEQUENCE: readonly FaustianSuit[] = FAUSTIAN_SUITS;
