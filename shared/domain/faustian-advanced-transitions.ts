import type { CampaignStateV5 } from "./campaign-state";
import type { MonthOrdinal } from "./calendar";
import { DomainError } from "./errors";
import type { FaustianEvent } from "./events";
import type {
  FaustianCardFacing,
  FaustianCardId,
  FaustianCommunityId,
  FaustianDevilFormId,
  FaustianDevilLawId,
  FaustianOriginClaimId,
  FaustianOriginClaimStatus,
  FaustianSuit,
} from "./faustian-catalogs";
import {
  isValidFaustianAntagonistChipCount,
  isValidFaustianAntagonistGoal,
  isValidFaustianCardFacing,
  isValidFaustianCardId,
  isValidFaustianCommunityId,
  isValidFaustianDevilFormId,
  isValidFaustianDevilLawId,
  isValidFaustianOriginClaimId,
  isValidFaustianOriginClaimStatus,
  isValidFaustianSuit,
} from "./faustian-catalogs";
import type {
  FaustianAntagonistChipCount,
  FaustianDemonBinding,
  FaustianDemonCondition,
  FaustianDemonOccupancy,
  FaustianCustomOriginClaim,
  FaustianPersistentFullHouseRank,
  FaustianPersistentMachinationEffect,
  FaustianPossessionRepresentation,
  FaustianSelectedDevilForms,
  FaustianState,
} from "./faustian-state";
import {
  accumulateFaustianDueMonthObligation,
  fulfillFaustianDueMonthObligation,
  isValidFaustianDemonCondition,
  isValidFaustianPersistentFullHouseRank,
} from "./faustian-state";
import { validateFaustianReferenceIntegrity } from "./faustian-validation";
import type { FaustianTransitionResult } from "./faustian-transitions";
import { isFaustianTwistReserved } from "./faustian-lifecycle-transitions";
import type { DenizenId, WizardId } from "./ids";
import { isValidDenizenId } from "./ids";
import type { PactSeatId } from "./pact-seats";
import { isValidPactSeatId } from "./pact-seats";

function commitFaustian(
  state: CampaignStateV5,
  faustian: FaustianState,
  events: readonly FaustianEvent[],
): FaustianTransitionResult {
  const nextState = { ...state, faustian };
  validateFaustianReferenceIntegrity(nextState);
  return { nextState, events };
}

function requireCard(cardId: string): FaustianCardId {
  if (!isValidFaustianCardId(cardId)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "Correction requires a canonical Faustian card");
  }
  return cardId;
}

function pendingPhysicalIds(faustian: FaustianState): Set<string> {
  const reservedTwists = new Set(faustian.pendingMachinationChallenges.flatMap((challenge) => challenge.outcomeDependentTwistCardIds));
  const pending = new Set<string>();
  for (const challenge of faustian.pendingMachinationChallenges) {
    for (const group of challenge.groups) {
      if (group.status !== "pending") continue;
      for (const cardId of group.originalCardIds) {
        if (!reservedTwists.has(cardId)) pending.add(cardId);
      }
    }
  }
  return pending;
}

function assertCardMovable(faustian: FaustianState, cardId: FaustianCardId, action: string): void {
  if (isFaustianTwistReserved(faustian, cardId)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `A reserved Twist cannot be independently ${action}`);
  }
  if (pendingPhysicalIds(faustian).has(cardId)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `A pending challenge holding cannot be independently ${action}`);
  }
}

export type FaustianPhysicalDestination =
  | { readonly kind: "faustian_deck" }
  | { readonly kind: "devil_deck" }
  | { readonly kind: "community_scheme"; readonly communityId: FaustianCommunityId; readonly facing: FaustianCardFacing }
  | { readonly kind: "community_accomplice"; readonly communityId: FaustianCommunityId }
  | { readonly kind: "machinations"; readonly facing: FaustianCardFacing }
  | { readonly kind: "defeated_schemes" }
  | { readonly kind: "set_aside_hand" }
  | { readonly kind: "entrusted"; readonly wizardId: WizardId }
  | { readonly kind: "possession"; readonly wizardId: WizardId; readonly represented: FaustianPossessionRepresentation }
  | { readonly kind: "domain_placement"; readonly seatId: PactSeatId; readonly represented: FaustianPossessionRepresentation }
  | { readonly kind: "beneath_antagonist"; readonly denizenId: DenizenId };

function removeCard(faustian: FaustianState, cardId: FaustianCardId): FaustianState {
  return {
    ...faustian,
    faustianDeck: faustian.faustianDeck.filter((id) => id !== cardId),
    devilDeck: faustian.devilDeck.filter((id) => id !== cardId),
    communities: faustian.communities.map((community) => ({
      ...community,
      schemes: community.schemes.filter((scheme) => scheme.cardId !== cardId),
      accompliceCardIds: community.accompliceCardIds.filter((id) => id !== cardId),
    })),
    machinations: faustian.machinations.filter((card) => card.cardId !== cardId),
    defeatedSchemes: faustian.defeatedSchemes.filter((id) => id !== cardId),
    setAsideHand: faustian.setAsideHand.filter((id) => id !== cardId),
    entrustedCards: faustian.entrustedCards.filter((card) => card.cardId !== cardId),
    possessions: faustian.possessions.filter((card) => card.cardId !== cardId),
    domainPlacements: faustian.domainPlacements.filter((card) => card.cardId !== cardId),
    beneathAntagonists: faustian.beneathAntagonists.filter((card) => card.cardId !== cardId),
    activeTwistCardIds: faustian.activeTwistCardIds.filter((id) => id !== cardId),
  };
}

function placeCard(
  state: CampaignStateV5,
  faustian: FaustianState,
  cardId: FaustianCardId,
  destination: FaustianPhysicalDestination,
): FaustianState {
  if (destination.kind === "faustian_deck") return { ...faustian, faustianDeck: [...faustian.faustianDeck, cardId] };
  if (destination.kind === "devil_deck") return { ...faustian, devilDeck: [...faustian.devilDeck, cardId] };
  if (destination.kind === "defeated_schemes") return { ...faustian, defeatedSchemes: [...faustian.defeatedSchemes, cardId] };
  if (destination.kind === "set_aside_hand") return { ...faustian, setAsideHand: [...faustian.setAsideHand, cardId] };
  if (destination.kind === "community_scheme") {
    if (!isValidFaustianCommunityId(destination.communityId) || !isValidFaustianCardFacing(destination.facing)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", "Scheme placement requires a valid Community and facing");
    }
    return {
      ...faustian,
      communities: faustian.communities.map((community) => (
        community.communityId === destination.communityId
          ? { ...community, schemes: [...community.schemes, { cardId, facing: destination.facing }] }
          : community
      )),
    };
  }
  if (destination.kind === "community_accomplice") {
    if (!isValidFaustianCommunityId(destination.communityId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", "Accomplice placement requires a valid Community");
    }
    return {
      ...faustian,
      communities: faustian.communities.map((community) => (
        community.communityId === destination.communityId
          ? { ...community, accompliceCardIds: [...community.accompliceCardIds, cardId] }
          : community
      )),
    };
  }
  if (destination.kind === "machinations") {
    if (!isValidFaustianCardFacing(destination.facing)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", "Machination placement requires a valid facing");
    }
    return { ...faustian, machinations: [...faustian.machinations, { cardId, facing: destination.facing }] };
  }
  if (destination.kind === "entrusted") {
    if (!state.wizards.some((wizard) => wizard.wizardId === destination.wizardId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", "Entrusted placement requires a valid Wizard");
    }
    return { ...faustian, entrustedCards: [...faustian.entrustedCards, { cardId, wizardId: destination.wizardId }] };
  }
  if (destination.kind === "possession") {
    if (!state.wizards.some((wizard) => wizard.wizardId === destination.wizardId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", "Possession correction requires a valid Wizard");
    }
    return {
      ...faustian,
      possessions: [...faustian.possessions, {
        cardId,
        wizardId: destination.wizardId,
        represented: destination.represented,
      }],
    };
  }
  if (destination.kind === "domain_placement") {
    if (!isValidPactSeatId(destination.seatId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", "Domain placement requires a valid Domain");
    }
    return {
      ...faustian,
      domainPlacements: [...faustian.domainPlacements, {
        cardId,
        seatId: destination.seatId,
        represented: destination.represented,
      }],
    };
  }
  if (!isValidDenizenId(destination.denizenId) || !faustian.antagonists.some((entry) => entry.denizenId === destination.denizenId)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "Beneath-Antagonist placement requires an existing Faustian Antagonist");
  }
  return { ...faustian, beneathAntagonists: [...faustian.beneathAntagonists, { cardId, denizenId: destination.denizenId }] };
}

export type CorrectFaustianCardInput =
  | {
      readonly kind: "facing";
      readonly cardId: FaustianCardId;
      readonly facing: FaustianCardFacing;
    }
  | {
      readonly kind: "placement";
      readonly cardId: FaustianCardId;
      readonly destination: FaustianPhysicalDestination;
    }
  | {
      readonly kind: "deck_order";
      readonly deck: "faustian" | "devil";
      readonly cardIds: readonly FaustianCardId[];
    };

function cardExists(faustian: FaustianState, cardId: FaustianCardId): boolean {
  return faustian.faustianDeck.includes(cardId)
    || faustian.devilDeck.includes(cardId)
    || faustian.defeatedSchemes.includes(cardId)
    || faustian.setAsideHand.includes(cardId)
    || faustian.machinations.some((card) => card.cardId === cardId)
    || faustian.entrustedCards.some((card) => card.cardId === cardId)
    || faustian.possessions.some((card) => card.cardId === cardId)
    || faustian.domainPlacements.some((card) => card.cardId === cardId)
    || faustian.beneathAntagonists.some((card) => card.cardId === cardId)
    || faustian.communities.some((community) =>
      community.schemes.some((scheme) => scheme.cardId === cardId)
      || community.accompliceCardIds.includes(cardId)
    );
}

export function applyCorrectFaustianCard(
  state: CampaignStateV5,
  input: CorrectFaustianCardInput,
): FaustianTransitionResult {
  if (input.kind === "deck_order") {
    const current = input.deck === "faustian" ? state.faustian.faustianDeck : state.faustian.devilDeck;
    if (input.cardIds.length !== current.length || [...input.cardIds].sort().join() !== [...current].sort().join()) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", "Deck-order correction must be an exact permutation of the current deck");
    }
    const faustian = input.deck === "faustian"
      ? { ...state.faustian, faustianDeck: [...input.cardIds] }
      : { ...state.faustian, devilDeck: [...input.cardIds] };
    return commitFaustian(state, faustian, [{
      type: "faustian_card_corrected",
      version: 1,
      data: { correctionKind: "deck_order", cardId: null, deck: input.deck },
    }]);
  }
  const cardId = requireCard(input.cardId);
  if (!cardExists(state.faustian, cardId)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "Corrected card is not a current Faustian card");
  }
  if (input.kind === "placement" && state.faustian.activeTwistCardIds.includes(cardId)) {
    throw new DomainError(
      "INVALID_CAMPAIGN_STATE",
      "An active Twist cannot be independently moved; use Disclose, Occur, or Finalize",
    );
  }
  assertCardMovable(state.faustian, cardId, input.kind === "facing" ? "re-faced" : "moved");
  if (input.kind === "facing") {
    if (!isValidFaustianCardFacing(input.facing)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", "Card-facing correction requires a valid facing");
    }
    const inScheme = state.faustian.communities.some((community) => community.schemes.some((scheme) => scheme.cardId === cardId));
    const inMachination = state.faustian.machinations.some((card) => card.cardId === cardId);
    if (!inScheme && !inMachination) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", "Only Community Schemes and Machinations have a card facing");
    }
    const faustian: FaustianState = {
      ...state.faustian,
      communities: state.faustian.communities.map((community) => ({
        ...community,
        schemes: community.schemes.map((scheme) => scheme.cardId === cardId ? { ...scheme, facing: input.facing } : scheme),
      })),
      machinations: state.faustian.machinations.map((card) => card.cardId === cardId ? { ...card, facing: input.facing } : card),
    };
    return commitFaustian(state, faustian, [{
      type: "faustian_card_corrected",
      version: 1,
      data: { correctionKind: "facing", cardId, deck: null },
    }]);
  }
  const faustian = placeCard(state, removeCard(state.faustian, cardId), cardId, input.destination);
  return commitFaustian(state, faustian, [{
    type: "faustian_card_corrected",
    version: 1,
    data: { correctionKind: "placement", cardId, deck: null },
  }]);
}

export type CorrectFaustianAntagonistInput =
  | {
      readonly kind: "attach";
      readonly denizenId: DenizenId;
      readonly seatId: PactSeatId;
      readonly chipCount: FaustianAntagonistChipCount;
    }
  | {
      readonly kind: "update";
      readonly denizenId: DenizenId;
      readonly seatId: PactSeatId;
      readonly chipCount: FaustianAntagonistChipCount;
    }
  | {
      readonly kind: "remove";
      readonly denizenId: DenizenId;
      readonly beneathDestinations: readonly {
        readonly cardId: FaustianCardId;
        readonly destination: FaustianPhysicalDestination;
      }[];
    };

export function applyCorrectFaustianAntagonist(
  state: CampaignStateV5,
  input: CorrectFaustianAntagonistInput,
): FaustianTransitionResult {
  if (!isValidDenizenId(input.denizenId) || !state.world.denizens.some((denizen) => denizen.denizenId === input.denizenId)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "Antagonist correction requires an existing world Denizen");
  }
  if (input.kind !== "remove") {
    if (!isValidPactSeatId(input.seatId) || !isValidFaustianAntagonistChipCount(input.chipCount)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", "Antagonist correction requires a valid seat and chip count");
    }
    const denizen = state.world.denizens.find((entry) => entry.denizenId === input.denizenId)!;
    if (denizen.powerfulProfile === null || !isValidFaustianAntagonistGoal(denizen.powerfulProfile.goal ?? "")) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", "Antagonist correction requires a compatible Powerful Goal");
    }
    if (input.kind === "attach" && state.faustian.antagonists.some((entry) => entry.denizenId === input.denizenId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", "That Denizen is already a Faustian Antagonist");
    }
    if (input.kind === "update" && !state.faustian.antagonists.some((entry) => entry.denizenId === input.denizenId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", "Antagonist update requires an existing Faustian Antagonist");
    }
    const antagonists = input.kind === "attach"
      ? [...state.faustian.antagonists, { denizenId: input.denizenId, seatId: input.seatId, chipCount: input.chipCount }]
      : state.faustian.antagonists.map((entry) => (
        entry.denizenId === input.denizenId ? { ...entry, seatId: input.seatId, chipCount: input.chipCount } : entry
      ));
    return commitFaustian(state, { ...state.faustian, antagonists }, [{
      type: "faustian_antagonist_corrected",
      version: 1,
      data: { correctionKind: input.kind, denizenId: input.denizenId },
    }]);
  }
  if (!state.faustian.antagonists.some((entry) => entry.denizenId === input.denizenId)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "Antagonist removal requires an existing Faustian Antagonist");
  }
  const beneath = state.faustian.beneathAntagonists.filter((card) => card.denizenId === input.denizenId);
  if (beneath.length !== input.beneathDestinations.length
    || beneath.some((card) => !input.beneathDestinations.some((entry) => entry.cardId === card.cardId))) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "Removing an Antagonist requires an explicit destination for every card beneath it");
  }
  let faustian: FaustianState = {
    ...state.faustian,
    antagonists: state.faustian.antagonists.filter((entry) => entry.denizenId !== input.denizenId),
  };
  for (const entry of input.beneathDestinations) {
    const cardId = requireCard(entry.cardId);
    assertCardMovable(faustian, cardId, "moved");
    faustian = placeCard(state, removeCard(faustian, cardId), cardId, entry.destination);
  }
  return commitFaustian(state, faustian, [{
    type: "faustian_antagonist_corrected",
    version: 1,
    data: { correctionKind: "remove", denizenId: input.denizenId },
  }]);
}

export type CorrectFaustianDemonInput =
  | {
      readonly kind: "record";
      readonly denizenId: DenizenId;
      readonly binding: FaustianDemonBinding;
      readonly form: string;
      readonly hellOfOrigin: string;
      readonly magicalSymbol: string;
      readonly occupancy: FaustianDemonOccupancy | null;
      readonly monthsInCurrentDomain: number;
      readonly condition: FaustianDemonCondition;
    }
  | {
      readonly kind: "update";
      readonly denizenId: DenizenId;
      readonly binding: FaustianDemonBinding;
      readonly form: string;
      readonly hellOfOrigin: string;
      readonly magicalSymbol: string;
      readonly occupancy: FaustianDemonOccupancy | null;
      readonly monthsInCurrentDomain: number;
      readonly condition: FaustianDemonCondition;
    }
  | { readonly kind: "remove"; readonly denizenId: DenizenId };

export function applyCorrectFaustianDemon(
  state: CampaignStateV5,
  input: CorrectFaustianDemonInput,
): FaustianTransitionResult {
  if (!isValidDenizenId(input.denizenId) || !state.world.denizens.some((denizen) => denizen.denizenId === input.denizenId)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "Demon correction requires an existing world Denizen");
  }
  if (input.kind === "remove") {
    if (!state.faustian.demons.some((demon) => demon.denizenId === input.denizenId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", "Demon removal requires an existing Faustian Demon");
    }
    return commitFaustian(state, {
      ...state.faustian,
      demons: state.faustian.demons.filter((demon) => demon.denizenId !== input.denizenId),
    }, [{ type: "faustian_demon_corrected", version: 1, data: { correctionKind: "remove", denizenId: input.denizenId } }]);
  }
  if (input.kind === "record" && state.faustian.demons.some((demon) => demon.denizenId === input.denizenId)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "That Denizen is already a Faustian Demon");
  }
  if (input.kind === "update" && !state.faustian.demons.some((demon) => demon.denizenId === input.denizenId)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "Demon update requires an existing Faustian Demon");
  }
  if (!isValidFaustianDemonCondition(input.condition) || !Number.isSafeInteger(input.monthsInCurrentDomain) || input.monthsInCurrentDomain < 0) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "Demon correction requires a valid condition and month count");
  }
  const demon = {
    denizenId: input.denizenId,
    binding: input.binding,
    form: input.form,
    hellOfOrigin: input.hellOfOrigin,
    magicalSymbol: input.magicalSymbol,
    occupancy: input.occupancy,
    monthsInCurrentDomain: input.monthsInCurrentDomain,
    condition: input.condition,
  };
  const demons = input.kind === "record"
    ? [...state.faustian.demons, demon]
    : state.faustian.demons.map((entry) => entry.denizenId === input.denizenId ? demon : entry);
  return commitFaustian(state, { ...state.faustian, demons }, [{
    type: "faustian_demon_corrected",
    version: 1,
    data: { correctionKind: input.kind, denizenId: input.denizenId },
  }]);
}

export type CorrectFaustianDomainSeizureInput =
  | { readonly kind: "set"; readonly seatId: PactSeatId; readonly conduitDenizenId: DenizenId }
  | { readonly kind: "clear"; readonly seatId: PactSeatId };

export function applyCorrectFaustianDomainSeizure(
  state: CampaignStateV5,
  input: CorrectFaustianDomainSeizureInput,
): FaustianTransitionResult {
  if (!isValidPactSeatId(input.seatId) || input.seatId === "faustian") {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "Domain seizure must target another Domain");
  }
  if (input.kind === "clear") {
    return commitFaustian(state, {
      ...state.faustian,
      domainSeizures: state.faustian.domainSeizures.filter((seizure) => seizure.seatId !== input.seatId),
    }, [{ type: "faustian_domain_seizure_corrected", version: 1, data: { correctionKind: "clear", seatId: input.seatId } }]);
  }
  if (!isValidDenizenId(input.conduitDenizenId) || !state.world.denizens.some((denizen) => denizen.denizenId === input.conduitDenizenId)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "Domain seizure requires an existing conduit Denizen");
  }
  const remaining = state.faustian.domainSeizures.filter((seizure) => seizure.seatId !== input.seatId);
  return commitFaustian(state, {
    ...state.faustian,
    domainSeizures: [...remaining, { seatId: input.seatId, conduitDenizenId: input.conduitDenizenId }],
  }, [{ type: "faustian_domain_seizure_corrected", version: 1, data: { correctionKind: "set", seatId: input.seatId } }]);
}

export type CorrectFaustianDevilProfileInput =
  | { readonly kind: "laws"; readonly selectedDevilLawIds: readonly FaustianDevilLawId[] }
  | { readonly kind: "forms"; readonly selectedDevilForms: FaustianSelectedDevilForms }
  | { readonly kind: "origin_claim"; readonly claimId: FaustianOriginClaimId; readonly status: FaustianOriginClaimStatus }
  | { readonly kind: "custom_origin_claim"; readonly customOriginClaim: FaustianCustomOriginClaim | null };

export function applyCorrectFaustianDevilProfile(
  state: CampaignStateV5,
  input: CorrectFaustianDevilProfileInput,
): FaustianTransitionResult {
  if (input.kind === "laws") {
    if (
      input.selectedDevilLawIds.length !== 2
      || new Set(input.selectedDevilLawIds).size !== 2
      || input.selectedDevilLawIds.some((id) => !isValidFaustianDevilLawId(id))
    ) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", "Devil Law correction requires exactly two valid Laws");
    }
    return commitFaustian(state, { ...state.faustian, selectedDevilLawIds: [...input.selectedDevilLawIds] }, [{
      type: "faustian_devil_profile_corrected",
      version: 1,
      data: { correctionKind: "laws" },
    }]);
  }
  if (input.kind === "forms") {
    const all = [...input.selectedDevilForms.casual, ...input.selectedDevilForms.special, ...input.selectedDevilForms.duress];
    if (all.some((id) => !isValidFaustianDevilFormId(id)) || new Set(all).size !== all.length) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", "Devil Form correction requires unique valid Forms");
    }
    return commitFaustian(state, { ...state.faustian, selectedDevilForms: {
      casual: [...input.selectedDevilForms.casual],
      special: [...input.selectedDevilForms.special],
      duress: [...input.selectedDevilForms.duress],
    } }, [{ type: "faustian_devil_profile_corrected", version: 1, data: { correctionKind: "forms" } }]);
  }
  if (input.kind === "custom_origin_claim") {
    if (input.customOriginClaim !== null) {
      if (input.customOriginClaim.claim.trim() === "" || !isValidFaustianOriginClaimStatus(input.customOriginClaim.status)) {
        throw new DomainError("INVALID_CAMPAIGN_STATE", "Custom origin-claim correction requires represented claim text and status");
      }
    }
    return commitFaustian(state, { ...state.faustian, customOriginClaim: input.customOriginClaim }, [{
      type: "faustian_devil_profile_corrected",
      version: 1,
      data: { correctionKind: "custom_origin_claim" },
    }]);
  }
  if (!isValidFaustianOriginClaimId(input.claimId) || !isValidFaustianOriginClaimStatus(input.status)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "Origin-claim correction requires a represented claim and status");
  }
  if (!state.faustian.originClaims.some((claim) => claim.claimId === input.claimId)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "Origin-claim correction requires an existing represented claim");
  }
  return commitFaustian(state, {
    ...state.faustian,
    originClaims: state.faustian.originClaims.map((claim) => (
      claim.claimId === input.claimId ? { ...claim, status: input.status } : claim
    )),
  }, [{ type: "faustian_devil_profile_corrected", version: 1, data: { correctionKind: "origin_claim" } }]);
}

export interface RecordFaustianDueMonthObligationInput {
  readonly wizardId: WizardId;
  readonly dueMonthOrdinal: MonthOrdinal;
  readonly weeks: number;
}

export function applyRecordFaustianDueMonthObligation(
  state: CampaignStateV5,
  input: RecordFaustianDueMonthObligationInput,
): FaustianTransitionResult {
  if (!state.wizards.some((wizard) => wizard.wizardId === input.wizardId)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "Due-month obligation requires a current Wizard");
  }
  return commitFaustian(state, {
    ...state.faustian,
    devilObligations: accumulateFaustianDueMonthObligation(
      state.faustian.devilObligations,
      input.wizardId,
      input.dueMonthOrdinal,
      input.weeks,
    ),
  }, [{
    type: "faustian_due_month_obligation_recorded",
    version: 1,
    data: { wizardId: input.wizardId, dueMonthOrdinal: input.dueMonthOrdinal, weeks: input.weeks },
  }]);
}

export interface FulfillFaustianDueMonthObligationInput {
  readonly wizardId: WizardId;
  readonly dueMonthOrdinal: MonthOrdinal;
  readonly weeks: number;
}

export function applyFulfillFaustianDueMonthObligation(
  state: CampaignStateV5,
  input: FulfillFaustianDueMonthObligationInput,
): FaustianTransitionResult {
  return commitFaustian(state, {
    ...state.faustian,
    devilObligations: fulfillFaustianDueMonthObligation(
      state.faustian.devilObligations,
      input.wizardId,
      input.dueMonthOrdinal,
      input.weeks,
    ),
  }, [{
    type: "faustian_due_month_obligation_fulfilled",
    version: 1,
    data: { wizardId: input.wizardId, dueMonthOrdinal: input.dueMonthOrdinal, weeks: input.weeks },
  }]);
}

export type CorrectFaustianPersistentEffectInput =
  | { readonly kind: "add"; readonly effect: FaustianPersistentMachinationEffect }
  | { readonly kind: "remove"; readonly effect: FaustianPersistentMachinationEffect };

export function applyCorrectFaustianPersistentEffect(
  state: CampaignStateV5,
  input: CorrectFaustianPersistentEffectInput,
): FaustianTransitionResult {
  if (input.effect.kind === "flush" && !isValidFaustianSuit(input.effect.suit)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "Persistent Flush correction requires a valid suit");
  }
  if (input.effect.kind === "full_house" && !isValidFaustianPersistentFullHouseRank(input.effect.rank as FaustianPersistentFullHouseRank)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "Persistent Full House correction requires a represented rank");
  }
  if (input.kind === "add") {
    const already = state.faustian.persistentMachinationEffects.some((effect) =>
      effect.kind === input.effect.kind
      && (effect.kind === "flush" ? effect.suit === (input.effect as { suit: FaustianSuit }).suit : effect.rank === (input.effect as { rank: string }).rank)
    );
    if (already) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", "That persistent Machination consequence is already recorded");
    }
    const resolvedFlushSuits = input.effect.kind === "flush" && !state.faustian.resolvedFlushSuits.includes(input.effect.suit)
      ? [...state.faustian.resolvedFlushSuits, input.effect.suit]
      : state.faustian.resolvedFlushSuits;
    return commitFaustian(state, {
      ...state.faustian,
      resolvedFlushSuits,
      persistentMachinationEffects: [...state.faustian.persistentMachinationEffects, input.effect],
    }, [{ type: "faustian_persistent_effect_corrected", version: 1, data: { correctionKind: "add", effectKind: input.effect.kind } }]);
  }
  return commitFaustian(state, {
    ...state.faustian,
    persistentMachinationEffects: state.faustian.persistentMachinationEffects.filter((effect) =>
      !(effect.kind === input.effect.kind
        && (effect.kind === "flush" ? effect.suit === (input.effect as { suit: FaustianSuit }).suit : effect.rank === (input.effect as { rank: string }).rank))
    ),
  }, [{ type: "faustian_persistent_effect_corrected", version: 1, data: { correctionKind: "remove", effectKind: input.effect.kind } }]);
}
