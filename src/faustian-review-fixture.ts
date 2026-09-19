/**
 * APPLICATION DESIGN: Faustian review/demo mid-play table.
 *
 * This is not the canonical campaign starting position. Normal Arrange Table
 * and campaign creation are unchanged. The review campaign applies these
 * placements after quiet arrangement so the table can be judged with
 * representative occupied Communities, both decks, and an active Twist.
 */

import type { DenizenId, FaustianPendingMachinationChallengeId, FaustianPendingMachinationGroupId, WizardId } from "../shared/domain";
import {
  EMPTY_FAUSTIAN_STATE,
  FAUSTIAN_CARD_IDS,
  FAUSTIAN_COMMUNITY_IDS,
  faustianCardId,
  type CorrectFaustianCardInput,
  type FaustianCardId,
  type FaustianCommunityId,
  type FaustianCommunityState,
  type FaustianPhysicalDestination,
  type FaustianState,
} from "../shared/domain";

export const FAUSTIAN_REVIEW_TWIST_CARD_ID = faustianCardId("hearts", "2");

export interface FaustianReviewPlayOptions {
  readonly conspiracyDenizenId?: string;
  readonly obligationWizardId?: string;
  readonly currentMonthOrdinal?: number;
  readonly pendingChallengeId?: string;
  readonly pendingGroupId?: string;
}

const ARIES_SCHEMES = [
  { cardId: faustianCardId("clubs", "3"), facing: "face_down" as const },
  { cardId: faustianCardId("diamonds", "4"), facing: "face_down" as const },
  { cardId: faustianCardId("hearts", "7"), facing: "face_up" as const },
];
const LEO_SCHEMES = [
  { cardId: faustianCardId("spades", "5"), facing: "face_down" as const },
  { cardId: faustianCardId("diamonds", "8"), facing: "face_up" as const },
];
const TAURUS_SCHEMES = [
  { cardId: faustianCardId("clubs", "6"), facing: "face_down" as const },
];
const VIRGO_SCHEMES = [
  { cardId: faustianCardId("spades", "9"), facing: "face_up" as const },
];

const ARIES_ACCOMPLICE = faustianCardId("diamonds", "jack");
const LEO_ACCOMPLICE = faustianCardId("clubs", "queen");
const TAURUS_ACCOMPLICE = faustianCardId("spades", "10");
const DEFEATED = faustianCardId("spades", "king");
const EXTRA_MACHINATION = faustianCardId("diamonds", "ace");
const HELD = [
  faustianCardId("diamonds", "king"),
  faustianCardId("clubs", "king"),
  faustianCardId("spades", "ace"),
  faustianCardId("clubs", "ace"),
  faustianCardId("hearts", "ace"),
] as const;

const DEVIL_EXTRA: readonly FaustianCardId[] = [
  faustianCardId("diamonds", "2"),
  faustianCardId("diamonds", "3"),
  faustianCardId("diamonds", "5"),
  faustianCardId("diamonds", "6"),
  faustianCardId("clubs", "2"),
  faustianCardId("clubs", "4"),
];

function occupiedCardIds(): Set<FaustianCardId> {
  return new Set<FaustianCardId>([
    FAUSTIAN_REVIEW_TWIST_CARD_ID,
    ...ARIES_SCHEMES.map((scheme) => scheme.cardId),
    ...LEO_SCHEMES.map((scheme) => scheme.cardId),
    ...TAURUS_SCHEMES.map((scheme) => scheme.cardId),
    ...VIRGO_SCHEMES.map((scheme) => scheme.cardId),
    ARIES_ACCOMPLICE,
    LEO_ACCOMPLICE,
    TAURUS_ACCOMPLICE,
    DEFEATED,
    EXTRA_MACHINATION,
    ...HELD,
    ...DEVIL_EXTRA,
  ]);
}

function community(
  communityId: FaustianCommunityId,
  patch: Partial<FaustianCommunityState> = {},
): FaustianCommunityState {
  return {
    communityId,
    pawnCount: 0,
    schemes: [],
    accompliceCardIds: [],
    ...patch,
  };
}

export function buildFaustianReviewPlayState(options: FaustianReviewPlayOptions = {}): FaustianState {
  const occupied = occupiedCardIds();
  const remaining = FAUSTIAN_CARD_IDS.filter((cardId) => !occupied.has(cardId));
  const remainingHearts = remaining.filter((cardId) => cardId.startsWith("hearts_"));
  const remainingOthers = remaining.filter((cardId) => !cardId.startsWith("hearts_"));
  const devilDeck = [...remainingHearts, ...DEVIL_EXTRA];
  const faustianDeck = remainingOthers;

  const conspiracies = options.conspiracyDenizenId === undefined
    ? []
    : [{ denizenId: options.conspiracyDenizenId as DenizenId, communityId: "leo" as const }];

  const devilObligations = options.obligationWizardId === undefined || options.currentMonthOrdinal === undefined
    ? []
    : [{
      kind: "wizard_owes_week_due_month" as const,
      wizardId: options.obligationWizardId as WizardId,
      dueMonthOrdinal: options.currentMonthOrdinal as never,
      weeks: 1,
    }];

  const pendingMachinationChallenges = options.pendingChallengeId === undefined || options.pendingGroupId === undefined
    ? []
    : [{
      challengeId: options.pendingChallengeId as FaustianPendingMachinationChallengeId,
      kind: "one_pair" as const,
      sourceMonthOrdinal: ((options.currentMonthOrdinal ?? 1) - 1) as never,
      dueMonthOrdinal: (options.currentMonthOrdinal ?? 1) as never,
      scoringHandCardIds: [...HELD],
      groups: [{
        groupId: options.pendingGroupId as FaustianPendingMachinationGroupId,
        responsibleWizardId: null,
        originalCardIds: [...HELD],
        status: "pending" as const,
        completedByWizardId: null,
        completedMonthOrdinal: null,
      }],
      outcomeDependentTwistCardIds: [FAUSTIAN_REVIEW_TWIST_CARD_ID],
    }];

  return {
    ...EMPTY_FAUSTIAN_STATE,
    faustianDeck,
    devilDeck,
    communities: FAUSTIAN_COMMUNITY_IDS.map((communityId) => {
      if (communityId === "aries") {
        return community("aries", {
          pawnCount: 1,
          schemes: ARIES_SCHEMES,
          accompliceCardIds: [ARIES_ACCOMPLICE],
        });
      }
      if (communityId === "leo") {
        return community("leo", {
          schemes: LEO_SCHEMES,
          accompliceCardIds: [LEO_ACCOMPLICE],
        });
      }
      if (communityId === "taurus") {
        return community("taurus", {
          schemes: TAURUS_SCHEMES,
          accompliceCardIds: [TAURUS_ACCOMPLICE],
        });
      }
      if (communityId === "virgo") {
        return community("virgo", { schemes: VIRGO_SCHEMES });
      }
      return community(communityId);
    }),
    machinations: [
      { cardId: FAUSTIAN_REVIEW_TWIST_CARD_ID, facing: "face_down" },
      { cardId: EXTRA_MACHINATION, facing: "face_up" },
    ],
    defeatedSchemes: [DEFEATED],
    setAsideHand: [...HELD],
    activeTwistCardIds: [FAUSTIAN_REVIEW_TWIST_CARD_ID],
    conspiracies,
    pendingMachinationChallenges,
    devilObligations,
  };
}

function destinationForCard(faustian: FaustianState, cardId: FaustianCardId): FaustianPhysicalDestination | null {
  if (faustian.faustianDeck.includes(cardId)) return { kind: "faustian_deck" };
  if (faustian.devilDeck.includes(cardId)) return { kind: "devil_deck" };
  if (faustian.defeatedSchemes.includes(cardId)) return { kind: "defeated_schemes" };
  if (faustian.setAsideHand.includes(cardId)) return { kind: "set_aside_hand" };
  const machination = faustian.machinations.find((card) => card.cardId === cardId);
  if (machination !== undefined) return { kind: "machinations", facing: machination.facing };
  for (const communityState of faustian.communities) {
    const scheme = communityState.schemes.find((entry) => entry.cardId === cardId);
    if (scheme !== undefined) {
      return { kind: "community_scheme", communityId: communityState.communityId, facing: scheme.facing };
    }
    if (communityState.accompliceCardIds.includes(cardId)) {
      return { kind: "community_accomplice", communityId: communityState.communityId };
    }
  }
  const entrusted = faustian.entrustedCards.find((card) => card.cardId === cardId);
  if (entrusted !== undefined) return { kind: "entrusted", wizardId: entrusted.wizardId };
  const possession = faustian.possessions.find((card) => card.cardId === cardId);
  if (possession !== undefined) {
    return { kind: "possession", wizardId: possession.wizardId, represented: possession.represented };
  }
  const domain = faustian.domainPlacements.find((card) => card.cardId === cardId);
  if (domain !== undefined) {
    return { kind: "domain_placement", seatId: domain.seatId, represented: domain.represented };
  }
  const beneath = faustian.beneathAntagonists.find((card) => card.cardId === cardId);
  if (beneath !== undefined) return { kind: "beneath_antagonist", denizenId: beneath.denizenId };
  return null;
}

export function faustianReviewCardPlacements(
  faustian: FaustianState = buildFaustianReviewPlayState(),
): Extract<CorrectFaustianCardInput, { kind: "placement" }>[] {
  const placements: Extract<CorrectFaustianCardInput, { kind: "placement" }>[] = [];
  for (const cardId of FAUSTIAN_CARD_IDS) {
    if (faustian.activeTwistCardIds.includes(cardId)) continue;
    const destination = destinationForCard(faustian, cardId);
    if (destination === null) continue;
    placements.push({ kind: "placement", cardId, destination });
  }
  return placements;
}
