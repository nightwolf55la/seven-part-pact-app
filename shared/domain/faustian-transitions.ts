import type { CampaignStateV5 } from "./campaign-state";
import { DomainError } from "./errors";
import type { FaustianEvent } from "./events";
import type { FaustianCardId, FaustianCommunityId } from "./faustian-catalogs";
import { isValidFaustianCardId, isValidFaustianCommunityId } from "./faustian-catalogs";
import type { FaustianState } from "./faustian-state";
import { isFaustianDeckEmpty } from "./faustian-state";
import { validateFaustianReferenceIntegrity } from "./faustian-validation";

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
): FaustianTransitionResult {
  const communityIdx = requireCommunity(state, communityId);
  if (isFaustianDeckEmpty(state.faustian)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "Faustian Deck is empty");
  }
  const drawnCardId = state.faustian.faustianDeck[0];
  const faustian: FaustianState = {
    ...state.faustian,
    faustianDeck: state.faustian.faustianDeck.slice(1),
    communities: state.faustian.communities.map((entry, i) => (
      i === communityIdx
        ? { ...entry, accompliceCardIds: [...entry.accompliceCardIds, drawnCardId] }
        : entry
    )),
  };

  return commitFaustian(state, faustian, [{
    type: "faustian_community_blackmailed",
    version: 1,
    data: {
      communityId,
      drawnCardId,
    },
  }]);
}
