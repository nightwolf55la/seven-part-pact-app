import type { CampaignStateV5 } from "./campaign-state";
import type { MonthOrdinal } from "./calendar";
import { DomainError } from "./errors";
import type { FaustianEvent } from "./events";
import type {
  FaustianCardId,
  FaustianCommunityId,
  FaustianRank,
  FaustianSuit,
} from "./faustian-catalogs";
import {
  isValidFaustianCardId,
  isValidFaustianCommunityId,
  isValidFaustianSuit,
} from "./faustian-catalogs";
import type {
  FaustianPendingMachinationChallenge,
  FaustianPendingMachinationGroup,
  FaustianPersistentFullHouseRank,
  FaustianPossessionRepresentation,
  FaustianState,
} from "./faustian-state";
import {
  followingFaustianChallengeDueMonth,
  generateFaustianPendingMachinationChallengeId,
  generateFaustianPendingMachinationGroupId,
  isValidFaustianPersistentFullHouseRank,
} from "./faustian-state";
import { validateFaustianReferenceIntegrity } from "./faustian-validation";
import type { FaustianTransitionResult } from "./faustian-transitions";
import type {
  FaustianPendingMachinationChallengeId,
  FaustianPendingMachinationGroupId,
  WizardId,
} from "./ids";
import {
  isValidFaustianPendingMachinationChallengeId,
  isValidFaustianPendingMachinationGroupId,
  isValidWizardId,
} from "./ids";
import type { PactSeatId } from "./pact-seats";
import { isValidPactSeatId } from "./pact-seats";

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

function requireCurrentMonthOrdinal(state: CampaignStateV5): MonthOrdinal {
  if (state.calendar.monthOrdinal === null) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "Faustian Machination lifecycle requires a current MonthOrdinal");
  }
  return state.calendar.monthOrdinal;
}

function cardRank(cardId: FaustianCardId): FaustianRank {
  return cardId.slice(cardId.indexOf("_") + 1) as FaustianRank;
}

function cardSuit(cardId: FaustianCardId): FaustianSuit {
  return cardId.slice(0, cardId.indexOf("_")) as FaustianSuit;
}

function requireCardId(label: string, value: string): FaustianCardId {
  if (!isValidFaustianCardId(value)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `${label} is not a canonical Faustian card`);
  }
  return value;
}

function shuffleInPlace<T>(items: T[]): T[] {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = items[i]!;
    items[i] = items[j]!;
    items[j] = tmp;
  }
  return items;
}

function sameIdSet(left: readonly string[], right: readonly string[]): boolean {
  if (left.length !== right.length) return false;
  const counted = new Map<string, number>();
  for (const id of left) counted.set(id, (counted.get(id) ?? 0) + 1);
  for (const id of right) {
    const remaining = counted.get(id);
    if (remaining === undefined || remaining < 1) return false;
    counted.set(id, remaining - 1);
  }
  return true;
}

function uniqueCardIds(cardIds: readonly FaustianCardId[]): FaustianCardId[] {
  const seen = new Set<string>();
  const unique: FaustianCardId[] = [];
  for (const cardId of cardIds) {
    if (seen.has(cardId)) continue;
    seen.add(cardId);
    unique.push(cardId);
  }
  return unique;
}

export function reservedFaustianActiveTwistCardIds(faustian: FaustianState): readonly FaustianCardId[] {
  const reserved: FaustianCardId[] = [];
  const seen = new Set<string>();
  for (const challenge of faustian.pendingMachinationChallenges) {
    for (const cardId of challenge.outcomeDependentTwistCardIds) {
      if (seen.has(cardId)) continue;
      seen.add(cardId);
      reserved.push(cardId);
    }
  }
  return reserved;
}

export function isFaustianTwistReserved(faustian: FaustianState, cardId: FaustianCardId): boolean {
  return reservedFaustianActiveTwistCardIds(faustian).includes(cardId);
}

function pendingPhysicalCardIds(faustian: FaustianState): Set<string> {
  const reserved = new Set<string>();
  const reservedTwists = new Set(reservedFaustianActiveTwistCardIds(faustian));
  for (const challenge of faustian.pendingMachinationChallenges) {
    for (const group of challenge.groups) {
      if (group.status !== "pending") continue;
      for (const cardId of group.originalCardIds) {
        if (!reservedTwists.has(cardId)) reserved.add(cardId);
      }
    }
  }
  return reserved;
}

export function eligibleFaustianMachinationCleanupCardIds(faustian: FaustianState): readonly FaustianCardId[] {
  const protectedIds = new Set<string>([
    ...faustian.activeTwistCardIds,
    ...reservedFaustianActiveTwistCardIds(faustian),
    ...pendingPhysicalCardIds(faustian),
    ...faustian.possessions.map((card) => card.cardId),
    ...faustian.domainPlacements.map((card) => card.cardId),
    ...faustian.beneathAntagonists.map((card) => card.cardId),
  ]);
  const eligible: FaustianCardId[] = [];
  for (const card of faustian.machinations) {
    if (card.facing === "face_up" && !protectedIds.has(card.cardId)) {
      eligible.push(card.cardId);
    }
  }
  for (const cardId of faustian.defeatedSchemes) {
    if (!protectedIds.has(cardId)) eligible.push(cardId);
  }
  return eligible;
}

export function faustianChallengeScheduleLabel(
  dueMonthOrdinal: MonthOrdinal,
  currentMonthOrdinal: MonthOrdinal,
): "upcoming" | "due_this_month" | "overdue" {
  if (dueMonthOrdinal > currentMonthOrdinal) return "upcoming";
  if (dueMonthOrdinal === currentMonthOrdinal) return "due_this_month";
  return "overdue";
}

export type FaustianSchemeOccurrenceDestination =
  | { readonly kind: "ordinary_machinations" }
  | {
      readonly kind: "possession";
      readonly wizardId: WizardId;
      readonly represented: FaustianPossessionRepresentation;
    }
  | {
      readonly kind: "domain_placement";
      readonly seatId: PactSeatId;
      readonly represented: FaustianPossessionRepresentation;
    };

export interface RecordFaustianSchemeOccurredInput {
  readonly communityId: FaustianCommunityId;
  readonly schemeCardId: FaustianCardId;
  readonly destination: FaustianSchemeOccurrenceDestination;
  readonly directAccompliceCardIds: readonly FaustianCardId[];
  readonly expectedLocalAccompliceCardIds: readonly FaustianCardId[];
}

export interface FaustianSchemeOccurrencePreview {
  readonly localAccompliceCardIds: readonly FaustianCardId[];
  readonly requiresExplicitDirectSet: boolean;
  readonly directAccompliceCardIds: readonly FaustianCardId[];
  readonly cascadedAccompliceCardIds: readonly FaustianCardId[];
  readonly fallenAccompliceCardIds: readonly FaustianCardId[];
  readonly pawnCommunityIds: readonly FaustianCommunityId[];
}

function requireCommunityIndex(state: CampaignStateV5, communityId: FaustianCommunityId): number {
  if (!isValidFaustianCommunityId(communityId)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Unknown Faustian Community: ${communityId}`);
  }
  const idx = state.faustian.communities.findIndex((community) => community.communityId === communityId);
  if (idx === -1) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Unknown Faustian Community: ${communityId}`);
  }
  return idx;
}

export function isFaustianSchemeOccurrenceTargetValid(
  faustian: FaustianState,
  communityId: FaustianCommunityId,
  schemeCardId: FaustianCardId,
): boolean {
  const community = faustian.communities.find((entry) => entry.communityId === communityId);
  const selected = community?.schemes.find((scheme) => scheme.cardId === schemeCardId);
  return selected !== undefined && selected.facing === "face_up";
}

function localAccompliceIds(faustian: FaustianState, communityId: FaustianCommunityId): FaustianCardId[] {
  return [...(faustian.communities.find((community) => community.communityId === communityId)?.accompliceCardIds ?? [])];
}

function findAccompliceCommunity(faustian: FaustianState, cardId: FaustianCardId): FaustianCommunityId {
  for (const community of faustian.communities) {
    if (community.accompliceCardIds.includes(cardId)) return community.communityId;
  }
  throw new DomainError("INVALID_CAMPAIGN_STATE", "Selected Accomplice is no longer a local Accomplice");
}

function resolveDirectAccomplices(
  localIds: readonly FaustianCardId[],
  requested: readonly FaustianCardId[],
): FaustianCardId[] {
  if (localIds.length === 0) {
    if (requested.length > 0) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", "No local Accomplice is available for a direct fall");
    }
    return [];
  }
  if (localIds.length === 1) {
    return [localIds[0]!];
  }
  const localSet = new Set(localIds);
  const unique = uniqueCardIds(requested.map((cardId) => requireCardId("Direct Accomplice", cardId)));
  if (unique.length === 0) {
    throw new DomainError(
      "INVALID_CAMPAIGN_STATE",
      "Multiple local Accomplices require an explicit nonempty direct set",
    );
  }
  for (const cardId of unique) {
    if (!localSet.has(cardId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", "Selected direct Accomplice is not a current local Accomplice");
    }
  }
  return unique;
}

function computeSchemeOccurrenceFalls(
  faustian: FaustianState,
  directIds: readonly FaustianCardId[],
): {
  readonly fallen: readonly { readonly cardId: FaustianCardId; readonly communityId: FaustianCommunityId }[];
  readonly cascadedIds: readonly FaustianCardId[];
} {
  const fallen = new Map<string, FaustianCommunityId>();
  for (const cardId of directIds) {
    fallen.set(cardId, findAccompliceCommunity(faustian, cardId));
    if (cardRank(cardId) === "ace") continue;
    const suit = cardSuit(cardId);
    const value = RANK_VALUE[cardRank(cardId)];
    for (const community of faustian.communities) {
      for (const accompliceId of community.accompliceCardIds) {
        if (cardRank(accompliceId) === "ace") continue;
        if (cardSuit(accompliceId) !== suit) continue;
        if (RANK_VALUE[cardRank(accompliceId)] < value) {
          fallen.set(accompliceId, community.communityId);
        }
      }
    }
  }
  const cascadedIds = [...fallen.keys()].filter((cardId) => !directIds.includes(cardId as FaustianCardId)) as FaustianCardId[];
  return {
    fallen: [...fallen.entries()].map(([cardId, communityId]) => ({
      cardId: cardId as FaustianCardId,
      communityId,
    })),
    cascadedIds,
  };
}

export function previewFaustianSchemeOccurrence(
  faustian: FaustianState,
  communityId: FaustianCommunityId,
  schemeCardId: FaustianCardId,
  requestedDirectAccompliceCardIds: readonly FaustianCardId[],
): FaustianSchemeOccurrencePreview {
  const localAccompliceCardIds = localAccompliceIds(faustian, communityId);
  const directAccompliceCardIds = localAccompliceCardIds.length <= 1
    ? [...localAccompliceCardIds]
    : uniqueCardIds(requestedDirectAccompliceCardIds.filter((cardId) => localAccompliceCardIds.includes(cardId)));
  const falls = isFaustianSchemeOccurrenceTargetValid(faustian, communityId, schemeCardId)
    ? computeSchemeOccurrenceFalls(faustian, directAccompliceCardIds)
    : { fallen: [], cascadedIds: [] };
  return {
    localAccompliceCardIds,
    requiresExplicitDirectSet: localAccompliceCardIds.length > 1,
    directAccompliceCardIds,
    cascadedAccompliceCardIds: falls.cascadedIds,
    fallenAccompliceCardIds: falls.fallen.map((entry) => entry.cardId),
    pawnCommunityIds: falls.fallen.map((entry) => entry.communityId),
  };
}

function validatePossessionRepresentation(
  represented: FaustianPossessionRepresentation,
  state: CampaignStateV5,
  action: string,
): FaustianPossessionRepresentation {
  if (represented.kind === "none") return { kind: "none" };
  if (represented.kind === "denizen") {
    const denizen = state.world.denizens.find((entry) => entry.denizenId === represented.denizenId);
    if (denizen === undefined) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${action} Denizen destination does not exist`);
    }
    return { kind: "denizen", denizenId: represented.denizenId };
  }
  if (represented.kind === "treasure") {
    const treasure = state.world.treasures.find((entry) => entry.treasureId === represented.treasureId);
    if (treasure === undefined) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${action} treasure destination does not exist`);
    }
    return { kind: "treasure", treasureId: represented.treasureId };
  }
  throw new DomainError("INVALID_CAMPAIGN_STATE", `${action} destination representation is invalid`);
}

function applySchemeDestination(
  faustian: FaustianState,
  schemeCardId: FaustianCardId,
  destination: FaustianSchemeOccurrenceDestination,
  state: CampaignStateV5,
): FaustianState {
  if (destination.kind === "ordinary_machinations") {
    return {
      ...faustian,
      machinations: [...faustian.machinations, { cardId: schemeCardId, facing: "face_up" }],
    };
  }
  if (destination.kind === "possession") {
    if (!isValidWizardId(destination.wizardId) || !state.wizards.some((wizard) => wizard.wizardId === destination.wizardId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", "Scheme possession requires an exact valid Wizard holder");
    }
    const represented = validatePossessionRepresentation(destination.represented, state, "Scheme possession");
    return {
      ...faustian,
      possessions: [...faustian.possessions, {
        cardId: schemeCardId,
        wizardId: destination.wizardId,
        represented,
      }],
    };
  }
  if (!isValidPactSeatId(destination.seatId)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "Scheme Domain placement requires an exact valid Domain");
  }
  const represented = validatePossessionRepresentation(destination.represented, state, "Scheme Domain placement");
  return {
    ...faustian,
    domainPlacements: [...faustian.domainPlacements, {
      cardId: schemeCardId,
      seatId: destination.seatId,
      represented,
    }],
  };
}

export function applyRecordFaustianSchemeOccurred(
  state: CampaignStateV5,
  input: RecordFaustianSchemeOccurredInput,
): FaustianTransitionResult {
  const communityIdx = requireCommunityIndex(state, input.communityId);
  const schemeCardId = requireCardId("Selected Scheme", input.schemeCardId);
  if (!isFaustianSchemeOccurrenceTargetValid(state.faustian, input.communityId, schemeCardId)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "Selected Scheme is no longer an eligible face-up Scheme in that Community");
  }
  const localIds = localAccompliceIds(state.faustian, input.communityId);
  if (!sameIdSet(localIds, input.expectedLocalAccompliceCardIds)) {
    throw new DomainError("STALE_COMMAND_PRECONDITION", "Local Accomplice set changed since Scheme occurrence was started");
  }
  const directIds = resolveDirectAccomplices(localIds, input.directAccompliceCardIds);
  const falls = computeSchemeOccurrenceFalls(state.faustian, directIds);
  const fallenIds = falls.fallen.map((entry) => entry.cardId);
  const fallenSet = new Set(fallenIds);
  let faustian: FaustianState = {
    ...state.faustian,
    communities: state.faustian.communities.map((community, index) => {
      const removedSchemes = index === communityIdx
        ? community.schemes.filter((scheme) => scheme.cardId !== schemeCardId)
        : community.schemes;
      const addedPawns = falls.fallen.filter((entry) => entry.communityId === community.communityId).length;
      return {
        ...community,
        schemes: removedSchemes,
        accompliceCardIds: community.accompliceCardIds.filter((cardId) => !fallenSet.has(cardId)),
        pawnCount: community.pawnCount + addedPawns,
      };
    }),
  };
  faustian = applySchemeDestination(faustian, schemeCardId, input.destination, state);
  const shuffledFallen = shuffleInPlace([...fallenIds]);
  faustian = {
    ...faustian,
    devilDeck: [...faustian.devilDeck, ...shuffledFallen],
  };
  return commitFaustian(state, faustian, [{
    type: "faustian_scheme_occurred",
    version: 1,
    data: {
      communityId: input.communityId,
      schemeCardId,
      destination: input.destination,
      directAccompliceCardIds: directIds,
      cascadedAccompliceCardIds: falls.cascadedIds,
      fallenAccompliceCardIds: shuffledFallen,
      pawnCommunityIds: falls.fallen.map((entry) => entry.communityId),
    },
  }]);
}

export interface DiscloseFaustianTwistInput {
  readonly twistCardId: FaustianCardId;
}

function requireUnreservedActiveTwist(state: CampaignStateV5, twistCardId: FaustianCardId, action: string): void {
  const cardId = requireCardId("Selected Twist", twistCardId);
  if (!state.faustian.activeTwistCardIds.includes(cardId)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `${action} requires a current active Twist`);
  }
  if (!state.faustian.machinations.some((card) => card.cardId === cardId)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `${action} Twist must remain physically in Machinations`);
  }
  if (isFaustianTwistReserved(state.faustian, cardId)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `A reserved Twist cannot be independently ${action}`);
  }
}

export function applyDiscloseFaustianTwist(
  state: CampaignStateV5,
  input: DiscloseFaustianTwistInput,
): FaustianTransitionResult {
  const twistCardId = requireCardId("Selected Twist", input.twistCardId);
  requireUnreservedActiveTwist(state, twistCardId, "disclosed");
  if (state.faustian.faustianDeck.length === 0) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "Faustian's Deck cannot provide a Twist replacement");
  }
  const remaining = [...state.faustian.faustianDeck];
  shuffleInPlace(remaining);
  const replacementTwistCardId = remaining[0]!;
  const faustian: FaustianState = {
    ...state.faustian,
    faustianDeck: remaining.slice(1),
    machinations: [
      ...state.faustian.machinations.map((card) => (
        card.cardId === twistCardId ? { ...card, facing: "face_up" as const } : card
      )),
      { cardId: replacementTwistCardId, facing: "face_down" },
    ],
    activeTwistCardIds: [
      ...state.faustian.activeTwistCardIds.filter((cardId) => cardId !== twistCardId),
      replacementTwistCardId,
    ],
  };
  return commitFaustian(state, faustian, [{
    type: "faustian_twist_disclosed",
    version: 1,
    data: { disclosedTwistCardId: twistCardId, replacementTwistCardId },
  }]);
}

export interface RecordFaustianTwistOccurredInput {
  readonly twistCardId: FaustianCardId;
}

export function applyRecordFaustianTwistOccurred(
  state: CampaignStateV5,
  input: RecordFaustianTwistOccurredInput,
): FaustianTransitionResult {
  const twistCardId = requireCardId("Selected Twist", input.twistCardId);
  requireUnreservedActiveTwist(state, twistCardId, "recorded as occurring");
  const movedDevilDeckCardIds = [...state.faustian.devilDeck];
  const faustian: FaustianState = {
    ...state.faustian,
    devilDeck: [],
    machinations: [
      ...state.faustian.machinations.map((card) => (
        card.cardId === twistCardId ? { ...card, facing: "face_up" as const } : card
      )),
      ...movedDevilDeckCardIds.map((cardId) => ({ cardId, facing: "face_up" as const })),
    ],
  };
  return commitFaustian(state, faustian, [{
    type: "faustian_twist_occurred",
    version: 1,
    data: { twistCardId, movedDevilDeckCardIds },
  }]);
}

export type FaustianTwistDispositionDestination =
  | "remain_face_up_in_machinations"
  | "recycle_into_faustian_deck"
  | "move_to_defeated_schemes";

export interface FaustianTwistDisposition {
  readonly cardId: FaustianCardId;
  readonly destination: FaustianTwistDispositionDestination;
}

export type FaustianPendingHoldingDisposition =
  | "shuffle_into_faustian_deck"
  | "shuffle_into_devil_deck"
  | "move_to_defeated_schemes";

export type FaustianMachinationOutcomeResult =
  | { readonly kind: "one_pair" }
  | {
      readonly kind: "two_pair";
      readonly groups: readonly {
        readonly cardIds: readonly FaustianCardId[];
        readonly responsibleWizardId: WizardId;
      }[];
    }
  | {
      readonly kind: "three_of_a_kind";
      readonly groups: readonly {
        readonly cardId: FaustianCardId;
        readonly responsibleWizardId: WizardId;
      }[];
    }
  | {
      readonly kind: "flush";
      readonly suit: FaustianSuit;
      readonly twistDispositions: readonly FaustianTwistDisposition[];
    }
  | {
      readonly kind: "full_house";
      readonly rank: FaustianPersistentFullHouseRank;
      readonly twistDispositions: readonly FaustianTwistDisposition[];
    }
  | {
      readonly kind: "table_resolved";
      readonly twistDispositions: readonly FaustianTwistDisposition[];
    };

export interface RecordFaustianMachinationOutcomeInput {
  readonly scoringHandCardIds: readonly FaustianCardId[];
  readonly result: FaustianMachinationOutcomeResult;
  readonly expectedCleanupCardIds: readonly FaustianCardId[];
  readonly outcomeDependentTwistCardIds: readonly FaustianCardId[];
}

function requireFaceUpMachination(faustian: FaustianState, cardId: FaustianCardId, label: string): void {
  const card = faustian.machinations.find((entry) => entry.cardId === cardId);
  if (card === undefined || card.facing !== "face_up") {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `${label} must be a current face-up Machination`);
  }
}

function rankCounts(cardIds: readonly FaustianCardId[]): Map<string, FaustianCardId[]> {
  const counts = new Map<string, FaustianCardId[]>();
  for (const cardId of cardIds) {
    const rank = cardRank(cardId);
    const existing = counts.get(rank) ?? [];
    existing.push(cardId);
    counts.set(rank, existing);
  }
  return counts;
}

function requireFiveCardHand(cardIds: readonly FaustianCardId[], kind: string): void {
  if (cardIds.length !== 5) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `${kind} requires exactly five selected scoring cards`);
  }
}

function validateHandPattern(cardIds: readonly FaustianCardId[], kind: FaustianMachinationOutcomeResult["kind"]): void {
  const counts = rankCounts(cardIds);
  const sizes = [...counts.values()].map((group) => group.length).sort((a, b) => b - a);
  if (kind === "one_pair") {
    requireFiveCardHand(cardIds, "One Pair");
    if (sizes[0] !== 2 || sizes.slice(1).some((size) => size !== 1)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", "Selected cards do not form One Pair");
    }
    return;
  }
  if (kind === "two_pair") {
    requireFiveCardHand(cardIds, "Two Pair");
    if (sizes[0] !== 2 || sizes[1] !== 2 || sizes[2] !== 1) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", "Selected cards do not form Two Pair");
    }
    return;
  }
  if (kind === "three_of_a_kind") {
    requireFiveCardHand(cardIds, "Three of a Kind");
    if (sizes[0] !== 3 || sizes.slice(1).some((size) => size !== 1)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", "Selected cards do not form Three of a Kind");
    }
    return;
  }
  if (kind === "flush") {
    requireFiveCardHand(cardIds, "Flush");
    const suit = cardSuit(cardIds[0]!);
    if (cardIds.some((cardId) => cardSuit(cardId) !== suit)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", "Selected cards do not form a Flush");
    }
    return;
  }
  if (kind === "full_house") {
    requireFiveCardHand(cardIds, "Full House");
    if (sizes[0] !== 3 || sizes[1] !== 2) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", "Selected cards do not form a Full House");
    }
  }
}

function requireScoringCards(faustian: FaustianState, cardIds: readonly FaustianCardId[]): FaustianCardId[] {
  const unique = uniqueCardIds(cardIds.map((cardId) => requireCardId("Scoring card", cardId)));
  const pending = pendingPhysicalCardIds(faustian);
  const reservedTwists = new Set(reservedFaustianActiveTwistCardIds(faustian));
  for (const cardId of unique) {
    requireFaceUpMachination(faustian, cardId, "Scoring card");
    if (pending.has(cardId) || reservedTwists.has(cardId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", "Cards reserved by another unresolved challenge are ineligible");
    }
  }
  return unique;
}

function resolveReservedTwists(
  faustian: FaustianState,
  scoringHandCardIds: readonly FaustianCardId[],
  explicit: readonly FaustianCardId[],
): FaustianCardId[] {
  const reservedElsewhere = new Set(reservedFaustianActiveTwistCardIds(faustian));
  const requested = uniqueCardIds([
    ...explicit.map((cardId) => requireCardId("Outcome-dependent Twist", cardId)),
    ...scoringHandCardIds.filter((cardId) => faustian.activeTwistCardIds.includes(cardId)),
  ]);
  for (const cardId of requested) {
    if (!faustian.activeTwistCardIds.includes(cardId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", "Outcome-dependent Twist must be a current active Twist");
    }
    if (!faustian.machinations.some((card) => card.cardId === cardId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", "Reserved Twist must remain physically in Machinations");
    }
    if (reservedElsewhere.has(cardId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", "Active Twist is already reserved by another unresolved challenge");
    }
  }
  return requested;
}

function requireCleanupBasis(faustian: FaustianState, expectedCleanupCardIds: readonly FaustianCardId[]): void {
  const current = eligibleFaustianMachinationCleanupCardIds(faustian);
  if (!sameIdSet(current, expectedCleanupCardIds)) {
    throw new DomainError(
      "STALE_COMMAND_PRECONDITION",
      "Eligible Machination cleanup set changed since the outcome was started",
    );
  }
}

function recycleEligibleCards(
  faustian: FaustianState,
  eligibleBefore: readonly FaustianCardId[],
  keep: ReadonlySet<string>,
): { readonly faustian: FaustianState; readonly recycledCardIds: readonly FaustianCardId[] } {
  const recyclable = eligibleBefore.filter((cardId) => !keep.has(cardId));
  const recycledCardIds = shuffleInPlace([...recyclable]);
  const recycled = new Set(recycledCardIds);
  return {
    faustian: {
      ...faustian,
      machinations: faustian.machinations.filter((card) => !recycled.has(card.cardId)),
      defeatedSchemes: faustian.defeatedSchemes.filter((cardId) => !recycled.has(cardId)),
      faustianDeck: [...faustian.faustianDeck, ...recycledCardIds],
    },
    recycledCardIds,
  };
}

function applyTwistDispositions(
  faustian: FaustianState,
  dispositions: readonly FaustianTwistDisposition[],
  requiredCardIds: readonly FaustianCardId[],
): FaustianState {
  if (!sameIdSet(dispositions.map((entry) => entry.cardId), requiredCardIds)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "Explicit Twist disposition is required for each reserved or selected Twist");
  }
  let next = faustian;
  const recycled: FaustianCardId[] = [];
  for (const disposition of dispositions) {
    const cardId = requireCardId("Twist disposition", disposition.cardId);
    if (!next.machinations.some((card) => card.cardId === cardId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", "Twist disposition requires the card to remain in Machinations");
    }
    if (disposition.destination === "remain_face_up_in_machinations") {
      next = {
        ...next,
        machinations: next.machinations.map((card) => (
          card.cardId === cardId ? { ...card, facing: "face_up" as const } : card
        )),
        activeTwistCardIds: next.activeTwistCardIds.filter((id) => id !== cardId),
      };
      continue;
    }
    next = {
      ...next,
      machinations: next.machinations.filter((card) => card.cardId !== cardId),
      activeTwistCardIds: next.activeTwistCardIds.filter((id) => id !== cardId),
    };
    if (disposition.destination === "move_to_defeated_schemes") {
      next = { ...next, defeatedSchemes: [...next.defeatedSchemes, cardId] };
    } else {
      recycled.push(cardId);
    }
  }
  if (recycled.length > 0) {
    next = { ...next, faustianDeck: [...next.faustianDeck, ...shuffleInPlace(recycled)] };
  }
  return next;
}

function requireWizard(state: CampaignStateV5, wizardId: WizardId, label: string): WizardId {
  if (!isValidWizardId(wizardId) || !state.wizards.some((wizard) => wizard.wizardId === wizardId)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `${label} is not a valid current Wizard`);
  }
  return wizardId;
}

export function applyRecordFaustianMachinationOutcome(
  state: CampaignStateV5,
  input: RecordFaustianMachinationOutcomeInput,
): FaustianTransitionResult {
  const scoringHandCardIds = requireScoringCards(state.faustian, input.scoringHandCardIds);
  validateHandPattern(scoringHandCardIds, input.result.kind);
  requireCleanupBasis(state.faustian, input.expectedCleanupCardIds);
  const reservedTwists = resolveReservedTwists(
    state.faustian,
    scoringHandCardIds,
    input.outcomeDependentTwistCardIds,
  );
  const reservedTwistSet = new Set(reservedTwists);
  const sourceMonthOrdinal = requireCurrentMonthOrdinal(state);
  const dueMonthOrdinal = followingFaustianChallengeDueMonth(sourceMonthOrdinal);
  const eligibleBefore = eligibleFaustianMachinationCleanupCardIds(state.faustian);

  if (input.result.kind === "flush" || input.result.kind === "full_house" || input.result.kind === "table_resolved") {
    const immediate = input.result;
    let faustian = state.faustian;
    if (immediate.kind === "flush") {
      if (!isValidFaustianSuit(immediate.suit) || scoringHandCardIds.some((cardId) => cardSuit(cardId) !== immediate.suit)) {
        throw new DomainError("INVALID_CAMPAIGN_STATE", "Flush suit must match the selected hand");
      }
      if (faustian.resolvedFlushSuits.includes(immediate.suit)
        || faustian.persistentMachinationEffects.some((effect) => effect.kind === "flush" && effect.suit === immediate.suit)) {
        throw new DomainError("INVALID_CAMPAIGN_STATE", "That Flush consequence is already recorded");
      }
      faustian = {
        ...faustian,
        resolvedFlushSuits: [...faustian.resolvedFlushSuits, immediate.suit],
        persistentMachinationEffects: [...faustian.persistentMachinationEffects, { kind: "flush", suit: immediate.suit }],
      };
    }
    if (immediate.kind === "full_house") {
      const three = [...rankCounts(scoringHandCardIds).entries()].find(([, cards]) => cards.length === 3);
      if (three === undefined || !isValidFaustianPersistentFullHouseRank(immediate.rank) || three[0] !== immediate.rank) {
        throw new DomainError("INVALID_CAMPAIGN_STATE", "Full House rank must match the selected three-of-a-kind");
      }
      if (faustian.persistentMachinationEffects.some((effect) => effect.kind === "full_house" && effect.rank === immediate.rank)) {
        throw new DomainError("INVALID_CAMPAIGN_STATE", "That Full House consequence is already recorded");
      }
      faustian = {
        ...faustian,
        persistentMachinationEffects: [...faustian.persistentMachinationEffects, { kind: "full_house", rank: immediate.rank }],
      };
    }
    faustian = applyTwistDispositions(faustian, immediate.twistDispositions, reservedTwists);
    const recycle = recycleEligibleCards(faustian, eligibleBefore, new Set(faustian.activeTwistCardIds));
    return commitFaustian(state, recycle.faustian, [{
      type: "faustian_machination_outcome_recorded",
      version: 1,
      data: {
        resultKind: input.result.kind,
        scoringHandCardIds,
        challengeId: null,
        recycledCardIds: recycle.recycledCardIds,
        outcomeDependentTwistCardIds: reservedTwists,
        persistentEffect: input.result.kind === "flush"
          ? { kind: "flush", suit: input.result.suit }
          : input.result.kind === "full_house"
            ? { kind: "full_house", rank: input.result.rank }
            : null,
      },
    }]);
  }

  const challengeId = generateFaustianPendingMachinationChallengeId();
  let groups: FaustianPendingMachinationGroup[];
  if (input.result.kind === "one_pair") {
    groups = [{
      groupId: generateFaustianPendingMachinationGroupId(),
      responsibleWizardId: null,
      originalCardIds: scoringHandCardIds,
      status: "pending",
      completedByWizardId: null,
      completedMonthOrdinal: null,
    }];
  } else if (input.result.kind === "two_pair") {
    if (input.result.groups.length !== 2) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", "Two Pair requires exactly two response groups");
    }
    const pairRanks = [...rankCounts(scoringHandCardIds).entries()].filter(([, cards]) => cards.length === 2);
    groups = input.result.groups.map((group) => {
      const cardIds = uniqueCardIds(group.cardIds.map((cardId) => requireCardId("Two Pair group", cardId)));
      if (cardIds.length !== 2 || cardRank(cardIds[0]!) !== cardRank(cardIds[1]!)) {
        throw new DomainError("INVALID_CAMPAIGN_STATE", "Each Two Pair group must contain one selected pair");
      }
      if (!pairRanks.some(([, cards]) => sameIdSet(cards, cardIds))) {
        throw new DomainError("INVALID_CAMPAIGN_STATE", "Two Pair group is not a selected pair from the scoring hand");
      }
      return {
        groupId: generateFaustianPendingMachinationGroupId(),
        responsibleWizardId: requireWizard(state, group.responsibleWizardId, "Two Pair responsible Wizard"),
        originalCardIds: cardIds,
        status: "pending" as const,
        completedByWizardId: null,
        completedMonthOrdinal: null,
      };
    });
    if (groups[0]!.responsibleWizardId === groups[1]!.responsibleWizardId) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", "Two Pair responsible Wizards must be distinct");
    }
  } else {
    if (input.result.groups.length !== 3) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", "Three of a Kind requires exactly three response groups");
    }
    const three = [...rankCounts(scoringHandCardIds).values()].find((cards) => cards.length === 3) ?? [];
    const wizards = new Set<string>();
    groups = input.result.groups.map((group) => {
      const cardId = requireCardId("Three of a Kind group", group.cardId);
      if (!three.includes(cardId)) {
        throw new DomainError("INVALID_CAMPAIGN_STATE", "Three of a Kind group must be one of the matching three cards");
      }
      const wizardId = requireWizard(state, group.responsibleWizardId, "Three of a Kind responsible Wizard");
      if (wizards.has(wizardId)) {
        throw new DomainError("INVALID_CAMPAIGN_STATE", "Three of a Kind responsible Wizards must be distinct");
      }
      wizards.add(wizardId);
      return {
        groupId: generateFaustianPendingMachinationGroupId(),
        responsibleWizardId: wizardId,
        originalCardIds: [cardId],
        status: "pending" as const,
        completedByWizardId: null,
        completedMonthOrdinal: null,
      };
    });
    if (!sameIdSet(groups.flatMap((group) => group.originalCardIds), three)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", "Three of a Kind groups must cover the matching three cards");
    }
  }

  const challenge: FaustianPendingMachinationChallenge = {
    challengeId,
    kind: input.result.kind,
    sourceMonthOrdinal,
    dueMonthOrdinal,
    scoringHandCardIds,
    groups,
    outcomeDependentTwistCardIds: reservedTwists,
  };

  const holdingIds: FaustianCardId[] = [];
  let faustian: FaustianState = {
    ...state.faustian,
    pendingMachinationChallenges: [...state.faustian.pendingMachinationChallenges, challenge],
  };
  if (input.result.kind === "one_pair") {
    const moving = scoringHandCardIds.filter((cardId) => !reservedTwistSet.has(cardId));
    holdingIds.push(...moving);
    faustian = {
      ...faustian,
      machinations: faustian.machinations.filter((card) => !moving.includes(card.cardId)),
      defeatedSchemes: faustian.defeatedSchemes.filter((cardId) => !moving.includes(cardId)),
      setAsideHand: [...faustian.setAsideHand, ...moving],
    };
  } else {
    for (const group of groups) {
      const moving = group.originalCardIds.filter((cardId) => !reservedTwistSet.has(cardId));
      holdingIds.push(...moving);
      faustian = {
        ...faustian,
        machinations: faustian.machinations.filter((card) => !moving.includes(card.cardId)),
        defeatedSchemes: faustian.defeatedSchemes.filter((cardId) => !moving.includes(cardId)),
        entrustedCards: [
          ...faustian.entrustedCards,
          ...moving.map((cardId) => ({ cardId, wizardId: group.responsibleWizardId! })),
        ],
      };
    }
  }
  const keep = new Set<string>([
    ...reservedTwists,
    ...holdingIds,
    ...faustian.activeTwistCardIds,
    ...pendingPhysicalCardIds(faustian),
  ]);
  const recycle = recycleEligibleCards(faustian, eligibleBefore, keep);
  return commitFaustian(state, recycle.faustian, [{
    type: "faustian_machination_outcome_recorded",
    version: 1,
    data: {
      resultKind: input.result.kind,
      scoringHandCardIds,
      challengeId,
      recycledCardIds: recycle.recycledCardIds,
      outcomeDependentTwistCardIds: reservedTwists,
      persistentEffect: null,
    },
  }]);
}

export interface CompleteFaustianMachinationResponseInput {
  readonly challengeId: FaustianPendingMachinationChallengeId;
  readonly groupId: FaustianPendingMachinationGroupId;
  readonly completedByWizardId: WizardId;
}

function requireChallenge(
  faustian: FaustianState,
  challengeId: string,
): { readonly index: number; readonly challenge: FaustianPendingMachinationChallenge } {
  if (!isValidFaustianPendingMachinationChallengeId(challengeId)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "Unknown Faustian pending Machination challenge");
  }
  const index = faustian.pendingMachinationChallenges.findIndex((entry) => entry.challengeId === challengeId);
  if (index === -1) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "Unknown Faustian pending Machination challenge");
  }
  return { index, challenge: faustian.pendingMachinationChallenges[index]! };
}

export function applyCompleteFaustianMachinationResponse(
  state: CampaignStateV5,
  input: CompleteFaustianMachinationResponseInput,
): FaustianTransitionResult {
  const completedByWizardId = requireWizard(state, input.completedByWizardId, "Completing Wizard");
  const { index, challenge } = requireChallenge(state.faustian, input.challengeId);
  if (!isValidFaustianPendingMachinationGroupId(input.groupId)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "Unknown Faustian pending Machination group");
  }
  const group = challenge.groups.find((entry) => entry.groupId === input.groupId);
  if (group === undefined) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "Unknown Faustian pending Machination group");
  }
  if (group.status !== "pending") {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "That response group is already completed");
  }
  if (challenge.kind !== "one_pair" && group.responsibleWizardId !== completedByWizardId) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "Only the assigned responsible Wizard can complete that response group");
  }
  const reservedTwists = new Set(challenge.outcomeDependentTwistCardIds);
  const physicalIds = group.originalCardIds.filter((cardId) => !reservedTwists.has(cardId));
  if (challenge.kind === "one_pair") {
    for (const cardId of physicalIds) {
      if (!state.faustian.setAsideHand.includes(cardId)) {
        throw new DomainError("INVALID_CAMPAIGN_STATE", "Pending One Pair holding is missing or has moved");
      }
    }
  } else {
    for (const cardId of physicalIds) {
      const entrusted = state.faustian.entrustedCards.find((card) => card.cardId === cardId);
      if (entrusted === undefined || entrusted.wizardId !== group.responsibleWizardId) {
        throw new DomainError("INVALID_CAMPAIGN_STATE", "Pending entrusted holding is missing or has moved");
      }
    }
  }
  const recycledCardIds = shuffleInPlace([...physicalIds]);
  const recycled = new Set(recycledCardIds);
  const completedMonthOrdinal = requireCurrentMonthOrdinal(state);
  const nextGroups = challenge.groups.map((entry) => (
    entry.groupId === group.groupId
      ? {
          ...entry,
          status: "completed" as const,
          completedByWizardId,
          completedMonthOrdinal,
          responsibleWizardId: challenge.kind === "one_pair" ? completedByWizardId : entry.responsibleWizardId,
        }
      : entry
  ));
  const faustian: FaustianState = {
    ...state.faustian,
    setAsideHand: state.faustian.setAsideHand.filter((cardId) => !recycled.has(cardId)),
    entrustedCards: state.faustian.entrustedCards.filter((card) => !recycled.has(card.cardId)),
    faustianDeck: [...state.faustian.faustianDeck, ...recycledCardIds],
    pendingMachinationChallenges: state.faustian.pendingMachinationChallenges.map((entry, challengeIndex) => (
      challengeIndex === index ? { ...entry, groups: nextGroups } : entry
    )),
  };
  return commitFaustian(state, faustian, [{
    type: "faustian_machination_response_completed",
    version: 1,
    data: {
      challengeId: challenge.challengeId,
      groupId: group.groupId,
      completedByWizardId,
      completedMonthOrdinal,
      recycledCardIds,
    },
  }]);
}

export interface FinalizeFaustianMachinationChallengeInput {
  readonly challengeId: FaustianPendingMachinationChallengeId;
  readonly pendingHoldingDisposition: FaustianPendingHoldingDisposition;
  readonly twistDispositions: readonly FaustianTwistDisposition[];
}

export function applyFinalizeFaustianMachinationChallenge(
  state: CampaignStateV5,
  input: FinalizeFaustianMachinationChallengeInput,
): FaustianTransitionResult {
  const { challenge } = requireChallenge(state.faustian, input.challengeId);
  const reservedTwists = new Set(challenge.outcomeDependentTwistCardIds);
  const pendingHoldings: FaustianCardId[] = [];
  for (const group of challenge.groups) {
    if (group.status !== "pending") continue;
    for (const cardId of group.originalCardIds) {
      if (reservedTwists.has(cardId)) continue;
      if (challenge.kind === "one_pair") {
        if (!state.faustian.setAsideHand.includes(cardId)) {
          throw new DomainError("INVALID_CAMPAIGN_STATE", "Pending One Pair holding is missing or has moved");
        }
      } else {
        const entrusted = state.faustian.entrustedCards.find((card) => card.cardId === cardId);
        if (entrusted === undefined || entrusted.wizardId !== group.responsibleWizardId) {
          throw new DomainError("INVALID_CAMPAIGN_STATE", "Pending entrusted holding is missing or has moved");
        }
      }
      pendingHoldings.push(cardId);
    }
  }
  let faustian: FaustianState = {
    ...state.faustian,
    setAsideHand: state.faustian.setAsideHand.filter((cardId) => !pendingHoldings.includes(cardId)),
    entrustedCards: state.faustian.entrustedCards.filter((card) => !pendingHoldings.includes(card.cardId)),
  };
  let routedCardIds = [...pendingHoldings];
  if (pendingHoldings.length > 0) {
    if (input.pendingHoldingDisposition === "move_to_defeated_schemes") {
      faustian = { ...faustian, defeatedSchemes: [...faustian.defeatedSchemes, ...pendingHoldings] };
    } else {
      routedCardIds = shuffleInPlace([...pendingHoldings]);
      if (input.pendingHoldingDisposition === "shuffle_into_devil_deck") {
        faustian = { ...faustian, devilDeck: [...faustian.devilDeck, ...routedCardIds] };
      } else {
        faustian = { ...faustian, faustianDeck: [...faustian.faustianDeck, ...routedCardIds] };
      }
    }
  }
  faustian = applyTwistDispositions(faustian, input.twistDispositions, challenge.outcomeDependentTwistCardIds);
  faustian = {
    ...faustian,
    pendingMachinationChallenges: faustian.pendingMachinationChallenges.filter(
      (entry) => entry.challengeId !== challenge.challengeId,
    ),
  };
  return commitFaustian(state, faustian, [{
    type: "faustian_machination_challenge_finalized",
    version: 1,
    data: {
      challengeId: challenge.challengeId,
      pendingHoldingDisposition: input.pendingHoldingDisposition,
      routedCardIds,
      twistDispositions: input.twistDispositions,
    },
  }]);
}
