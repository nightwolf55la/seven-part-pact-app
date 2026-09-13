import type { CampaignStateV5 } from "./campaign-state";
import { DomainError } from "./errors";
import type { FaustianEvent } from "./events";
import type { FaustianCardId, FaustianCommunityId, FaustianRank } from "./faustian-catalogs";
import { isValidFaustianCardId, isValidFaustianCommunityId } from "./faustian-catalogs";
import type { FaustianState } from "./faustian-state";
import { isFaustianDeckEmpty } from "./faustian-state";
import { validateFaustianReferenceIntegrity } from "./faustian-validation";
import { canonicalJsonStringify } from "./canonical-json";

export interface FaustianTransitionResult {
  readonly nextState: CampaignStateV5;
  readonly events: readonly FaustianEvent[];
}

function replaceFaustian(state: CampaignStateV5, faustian: FaustianState): CampaignStateV5 {
  return { ...state, faustian };
}

function commitFaustian(
  state: CampaignStateV5,
  faustian: FaustianState,
  events: readonly FaustianEvent[],
): FaustianTransitionResult {
  const nextState = replaceFaustian(state, faustian);
  validateFaustianReferenceIntegrity(nextState);
  return { nextState, events };
}

const RANK_VALUE: Record<FaustianRank, number> = {
  ace: 14,
  "2": 2,
  "3": 3,
  "4": 4,
  "5": 5,
  "6": 6,
  "7": 7,
  "8": 8,
  "9": 9,
  "10": 10,
  jack: 11,
  queen: 12,
  king: 13,
};

function cardRank(cardId: FaustianCardId): FaustianRank {
  return cardId.slice(cardId.indexOf("_") + 1) as FaustianRank;
}

// Application canon: the detailed Accomplice rule removes Schemes of equal or
// lower rank, despite shorter overview text that says only "lower". Ace
// Accomplices override ordinary comparison and defeat every Scheme except a 2.
export function faustianAccompliceDefeatsScheme(
  accompliceCardId: FaustianCardId,
  schemeCardId: FaustianCardId,
): boolean {
  const accompliceRank = cardRank(accompliceCardId);
  const schemeRank = cardRank(schemeCardId);
  if (accompliceRank === "ace") {
    return schemeRank !== "2";
  }
  return RANK_VALUE[schemeRank] <= RANK_VALUE[accompliceRank];
}

function accompliceDefeatsScheme(accompliceCardId: FaustianCardId, schemeCardId: FaustianCardId): boolean {
  return faustianAccompliceDefeatsScheme(accompliceCardId, schemeCardId);
}

export function applyLocalAccompliceProtection(
  schemes: readonly { readonly cardId: FaustianCardId; readonly facing: "face_down" | "face_up" }[],
  accompliceCardIds: readonly FaustianCardId[],
): {
  readonly revealedSchemeCardIds: readonly FaustianCardId[];
  readonly preventedSchemeCardIds: readonly FaustianCardId[];
  readonly remainingSchemes: readonly { readonly cardId: FaustianCardId; readonly facing: "face_up" }[];
} {
  const revealedSchemeCardIds = schemes
    .filter((scheme) => scheme.facing === "face_down")
    .map((scheme) => scheme.cardId);
  const preventedSchemeCardIds = schemes
    .filter((scheme) => accompliceCardIds.some((accompliceCardId) => accompliceDefeatsScheme(accompliceCardId, scheme.cardId)))
    .map((scheme) => scheme.cardId);
  const remainingSchemes = schemes
    .filter((scheme) => !accompliceCardIds.some((accompliceCardId) => accompliceDefeatsScheme(accompliceCardId, scheme.cardId)))
    .map((scheme) => ({ cardId: scheme.cardId, facing: "face_up" as const }));
  return { revealedSchemeCardIds, preventedSchemeCardIds, remainingSchemes };
}

function requireCommunity(state: CampaignStateV5, communityId: FaustianCommunityId): number {
  if (!isValidFaustianCommunityId(communityId)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Unknown Faustian Community: ${communityId}`);
  }
  const idx = state.faustian.communities.findIndex((community) => community.communityId === communityId);
  if (idx === -1) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Unknown Faustian Community: ${communityId}`);
  }
  return idx;
}

function requireAccompliceCommunity(state: CampaignStateV5, accompliceCardId: FaustianCardId): number {
  const matches: number[] = [];
  for (let i = 0; i < state.faustian.communities.length; i++) {
    if (state.faustian.communities[i].accompliceCardIds.includes(accompliceCardId)) {
      matches.push(i);
    }
  }
  if (matches.length !== 1) {
    throw new DomainError(
      "INVALID_CAMPAIGN_STATE",
      `Selected card is not currently an Accomplice in a Community: ${accompliceCardId}`,
    );
  }
  return matches[0];
}

export function applyInvestigateFaustianCommunity(
  state: CampaignStateV5,
  communityId: FaustianCommunityId,
  schemeCardId: FaustianCardId,
): FaustianTransitionResult {
  const communityIdx = requireCommunity(state, communityId);
  if (!isValidFaustianCardId(schemeCardId)) {
    throw new DomainError(
      "INVALID_CAMPAIGN_STATE",
      `Selected Scheme is not a canonical Faustian card: ${schemeCardId}`,
    );
  }
  const community = state.faustian.communities[communityIdx];
  const schemeIdx = community.schemes.findIndex((scheme) => scheme.cardId === schemeCardId);
  if (schemeIdx === -1) {
    throw new DomainError(
      "INVALID_CAMPAIGN_STATE",
      `Selected Scheme ${schemeCardId} is not currently in Community ${communityId}`,
    );
  }

  const revealedSchemeCardIds = community.schemes
    .filter((scheme) => scheme.facing === "face_down")
    .map((scheme) => scheme.cardId);
  const remainingSchemes = community.schemes
    .filter((scheme) => scheme.cardId !== schemeCardId)
    .map((scheme) => ({ ...scheme, facing: "face_up" as const }));

  const faustian: FaustianState = {
    ...state.faustian,
    communities: state.faustian.communities.map((entry, i) => (
      i === communityIdx ? { ...entry, schemes: remainingSchemes } : entry
    )),
    defeatedSchemes: [...state.faustian.defeatedSchemes, schemeCardId],
  };

  return commitFaustian(state, faustian, [{
    type: "faustian_community_investigated",
    version: 1,
    data: {
      communityId,
      schemeCardId,
      revealedSchemeCardIds,
    },
  }]);
}

export function applyBlackmailFaustianCommunity(
  state: CampaignStateV5,
  communityId: FaustianCommunityId,
  expectedFaustian?: FaustianState,
): FaustianTransitionResult {
  if (expectedFaustian !== undefined && !faustianStateEquals(expectedFaustian, state.faustian)) {
    throw new DomainError(
      "STALE_COMMAND_PRECONDITION",
      "Faustian table changed since Blackmail was started",
    );
  }
  const communityIdx = requireCommunity(state, communityId);
  if (isFaustianDeckEmpty(state.faustian)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "Faustian Deck is empty");
  }
  const drawnCardId = state.faustian.faustianDeck[0];
  const community = state.faustian.communities[communityIdx];
  const accompliceCardIds = [...community.accompliceCardIds, drawnCardId];
  const protection = applyLocalAccompliceProtection(community.schemes, accompliceCardIds);
  const faustian: FaustianState = {
    ...state.faustian,
    faustianDeck: state.faustian.faustianDeck.slice(1),
    devilDeck: [...state.faustian.devilDeck, ...protection.preventedSchemeCardIds],
    communities: state.faustian.communities.map((entry, i) => (
      i === communityIdx
        ? {
          ...entry,
          accompliceCardIds,
          schemes: protection.remainingSchemes,
        }
        : entry
    )),
  };

  return commitFaustian(state, faustian, [{
    type: "faustian_community_blackmailed",
    version: 2,
    data: {
      communityId,
      drawnCardId,
      revealedSchemeCardIds: protection.revealedSchemeCardIds,
      preventedSchemeCardIds: protection.preventedSchemeCardIds,
    },
  }]);
}

function faustianStateEquals(expected: FaustianState, actual: FaustianState): boolean {
  return canonicalJsonStringify(expected) === canonicalJsonStringify(actual);
}

export function applyDirectFaustianAccomplice(
  state: CampaignStateV5,
  accompliceCardId: FaustianCardId,
  destinationCommunityId: FaustianCommunityId,
): FaustianTransitionResult {
  if (!isValidFaustianCardId(accompliceCardId)) {
    throw new DomainError(
      "INVALID_CAMPAIGN_STATE",
      `Selected Accomplice is not a canonical Faustian card: ${accompliceCardId}`,
    );
  }
  const sourceIdx = requireAccompliceCommunity(state, accompliceCardId);
  const destinationIdx = requireCommunity(state, destinationCommunityId);
  const sourceCommunityId = state.faustian.communities[sourceIdx].communityId;
  if (sourceCommunityId === destinationCommunityId) {
    throw new DomainError(
      "INVALID_CAMPAIGN_STATE",
      `Accomplice destination Community must differ from source Community ${sourceCommunityId}`,
    );
  }

  const destination = state.faustian.communities[destinationIdx];
  const revealedSchemeCardIds = destination.schemes
    .filter((scheme) => scheme.facing === "face_down")
    .map((scheme) => scheme.cardId);
  const returnedSchemeCardIds = destination.schemes
    .filter((scheme) => accompliceDefeatsScheme(accompliceCardId, scheme.cardId))
    .map((scheme) => scheme.cardId);
  const remainingSchemes = destination.schemes
    .filter((scheme) => !accompliceDefeatsScheme(accompliceCardId, scheme.cardId))
    .map((scheme) => ({ ...scheme, facing: "face_up" as const }));

  // Application canon: returned Schemes append to the bottom of devilDeck in
  // the destination Community's existing scheme order. Do not shuffle.
  const faustian: FaustianState = {
    ...state.faustian,
    devilDeck: [...state.faustian.devilDeck, ...returnedSchemeCardIds],
    communities: state.faustian.communities.map((entry, i) => {
      if (i === sourceIdx) {
        return {
          ...entry,
          accompliceCardIds: entry.accompliceCardIds.filter((cardId) => cardId !== accompliceCardId),
        };
      }
      if (i === destinationIdx) {
        return {
          ...entry,
          accompliceCardIds: [...entry.accompliceCardIds, accompliceCardId],
          schemes: remainingSchemes,
        };
      }
      return entry;
    }),
  };

  return commitFaustian(state, faustian, [{
    type: "faustian_accomplice_directed",
    version: 1,
    data: {
      accompliceCardId,
      sourceCommunityId,
      destinationCommunityId,
      revealedSchemeCardIds,
      returnedSchemeCardIds,
    },
  }]);
}

export function applyDisruptFaustianPawn(
  state: CampaignStateV5,
  communityId: FaustianCommunityId,
  accompliceCardId: FaustianCardId,
): FaustianTransitionResult {
  const communityIdx = requireCommunity(state, communityId);
  if (!isValidFaustianCardId(accompliceCardId)) {
    throw new DomainError(
      "INVALID_CAMPAIGN_STATE",
      `Selected Accomplice is not a canonical Faustian card: ${accompliceCardId}`,
    );
  }
  const community = state.faustian.communities[communityIdx];
  if (community.pawnCount < 1) {
    throw new DomainError(
      "INVALID_CAMPAIGN_STATE",
      `Community ${communityId} has no Pawn to disrupt`,
    );
  }
  if (!community.accompliceCardIds.includes(accompliceCardId)) {
    throw new DomainError(
      "INVALID_CAMPAIGN_STATE",
      `Selected card is not currently an Accomplice in Community ${communityId}: ${accompliceCardId}`,
    );
  }

  const faustian: FaustianState = {
    ...state.faustian,
    faustianDeck: [...state.faustian.faustianDeck, accompliceCardId],
    communities: state.faustian.communities.map((entry, i) => (
      i === communityIdx
        ? {
          ...entry,
          pawnCount: entry.pawnCount - 1,
          accompliceCardIds: entry.accompliceCardIds.filter((cardId) => cardId !== accompliceCardId),
        }
        : entry
    )),
  };

  return commitFaustian(state, faustian, [{
    type: "faustian_pawn_disrupted",
    version: 1,
    data: {
      communityId,
      accompliceCardId,
    },
  }]);
}
