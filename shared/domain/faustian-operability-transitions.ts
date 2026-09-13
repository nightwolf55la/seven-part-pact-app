import type { CampaignStateV5 } from "./campaign-state";
import type { AgeDefinitionId } from "./ages";
import { DomainError } from "./errors";
import type { FaustianEvent } from "./events";
import type {
  FaustianCardId,
  FaustianCommunityId,
  FaustianRank,
  FaustianSuit,
} from "./faustian-catalogs";
import {
  FAUSTIAN_SUITS,
  isValidFaustianCardId,
  isValidFaustianCommunityId,
} from "./faustian-catalogs";
import type { FaustianState } from "./faustian-state";
import { EMPTY_FAUSTIAN_STATE } from "./faustian-state";
import { validateFaustianReferenceIntegrity } from "./faustian-validation";
import {
  applyLocalAccompliceProtection,
  type FaustianTransitionResult,
} from "./faustian-transitions";
import type { DenizenId } from "./ids";
import { isValidDenizenId } from "./ids";
import type { PactSeatId } from "./pact-seats";
import { isValidPactSeatId } from "./pact-seats";
import type { FaustianAntagonistChipCount, FaustianAntagonistGoal } from "./faustian-catalogs";
import {
  isValidFaustianAntagonistChipCount,
  isValidFaustianAntagonistGoal,
} from "./faustian-catalogs";
import { canonicalJsonStringify } from "./canonical-json";
import type { WizardElementScores } from "./campaign-state";

export const FAUSTIAN_ARRANGEMENT_IDS = ["quiet", "dynamic", "explosive"] as const;
export type FaustianArrangementId = (typeof FAUSTIAN_ARRANGEMENT_IDS)[number];

const LOW_RANKS: readonly FaustianRank[] = ["ace", "2", "3", "4"];
const MID_RANKS: readonly FaustianRank[] = ["5", "6", "7", "8"];

function replaceFaustian(state: CampaignStateV5, faustian: FaustianState): CampaignStateV5 {
  return { ...state, faustian };
}

function commitFaustian(
  state: CampaignStateV5,
  faustian: FaustianState,
  events: readonly FaustianEvent[],
  extraState?: CampaignStateV5,
): FaustianTransitionResult {
  const base = extraState ?? state;
  const nextState = replaceFaustian(base, faustian);
  validateFaustianReferenceIntegrity(nextState);
  return { nextState, events };
}

export function faustianStatesEqual(a: FaustianState, b: FaustianState): boolean {
  return canonicalJsonStringify(a) === canonicalJsonStringify(b);
}

export function requireExpectedFaustian(state: CampaignStateV5, expected: FaustianState, action: string): void {
  if (!faustianStatesEqual(expected, state.faustian)) {
    throw new DomainError("STALE_COMMAND_PRECONDITION", `Faustian table changed since ${action} was started`);
  }
}

function cardRank(cardId: FaustianCardId): FaustianRank {
  return cardId.slice(cardId.indexOf("_") + 1) as FaustianRank;
}

function cardSuit(cardId: FaustianCardId): FaustianSuit {
  return cardId.slice(0, cardId.indexOf("_")) as FaustianSuit;
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

function requireSetup(state: CampaignStateV5, action: string): void {
  if (state.lifecycle.kind !== "setup") {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `${action} is only available during campaign setup`);
  }
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

function pickRandom<T>(pool: readonly T[], count: number): { readonly picked: T[]; readonly remaining: T[] } {
  if (count > pool.length) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "Requested random draw exceeds remaining cards");
  }
  const remaining = [...pool];
  shuffleInPlace(remaining);
  return { picked: remaining.slice(0, count), remaining: remaining.slice(count) };
}

function pickOne<T>(pool: readonly T[]): { readonly picked: T; readonly remaining: T[] } {
  const { picked, remaining } = pickRandom(pool, 1);
  return { picked: picked[0]!, remaining };
}

export function completedTwentyYearScores(ageYears: number): number {
  if (!Number.isSafeInteger(ageYears) || ageYears < 0) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "Faustian Wizard ageYears must be a non-negative safe integer");
  }
  return Math.floor(ageYears / 20);
}

export function allowedFaustianArrangementsForAge(ageId: AgeDefinitionId | null): readonly FaustianArrangementId[] {
  if (ageId === "awakening") return ["quiet", "dynamic"];
  if (ageId === "dominion") return ["dynamic", "explosive"];
  if (ageId === "calamity") return ["explosive"];
  return [];
}

export function isExactUnarrangedFaustianBaseline(faustian: FaustianState): boolean {
  const untouched =
    faustian.devilDeck.length === 0
    && faustian.machinations.length === 0
    && faustian.defeatedSchemes.length === 0
    && faustian.entrustedCards.length === 0
    && faustian.beneathAntagonists.length === 0
    && faustian.possessions.length === 0
    && faustian.setAsideHand.length === 0
    && faustian.domainPlacements.length === 0
    && faustian.activeTwistCardIds.length === 0
    && faustian.conspiracies.length === 0
    && faustian.antagonists.length === 0
    && faustian.demons.length === 0
    && faustian.domainSeizures.length === 0
    && faustian.devilObligations.length === 0
    && faustian.resolvedFlushSuits.length === 0
    && faustian.persistentMachinationEffects.length === 0
    && faustian.communities.every((community) =>
      community.pawnCount === 0 && community.schemes.length === 0 && community.accompliceCardIds.length === 0
    );
  return untouched && faustian.faustianDeck.length === 52;
}

export function isExactStructuralHelperFaustian(faustian: FaustianState): boolean {
  if (faustian.activeTwistCardIds.length !== 1) return false;
  if (faustian.machinations.length !== 1) return false;
  if (faustian.machinations[0]?.cardId !== faustian.activeTwistCardIds[0]) return false;
  if (faustian.machinations[0]?.facing !== "face_down") return false;
  if (faustian.faustianDeck.length !== 51) return false;
  if (faustian.selectedDevilLawIds.length !== 2) return false;
  if (faustian.selectedDevilForms.casual.length !== 3) return false;
  if (faustian.selectedDevilForms.special.length !== 2) return false;
  if (faustian.selectedDevilForms.duress.length !== 1) return false;
  const withoutHelperCards: FaustianState = {
    ...faustian,
    faustianDeck: EMPTY_FAUSTIAN_STATE.faustianDeck,
    machinations: [],
    activeTwistCardIds: [],
    selectedDevilLawIds: [],
    selectedDevilForms: EMPTY_FAUSTIAN_STATE.selectedDevilForms,
  };
  return isExactUnarrangedFaustianBaseline(withoutHelperCards);
}

export interface ArrangeFaustianTableInput {
  readonly arrangementId: FaustianArrangementId;
  readonly favoriteCommunityId: FaustianCommunityId;
  readonly pawnCommunityId: FaustianCommunityId | null;
  readonly reservedTwistCardId: FaustianCardId | null;
  readonly expectedFaustian: FaustianState;
  readonly expectedAgeId: AgeDefinitionId;
  readonly expectedAgeYears: number | null;
  readonly expectedElements: WizardElementScores | null;
  readonly calamityAntagonist: ArrangeFaustianCalamityAntagonistInput | null;
}

export interface ArrangeFaustianCalamityAntagonistInput {
  readonly denizenId: DenizenId;
  readonly create: {
    readonly name: string;
  } | null;
  readonly communityId: FaustianCommunityId;
  readonly seatId: PactSeatId;
  readonly chipCount: FaustianAntagonistChipCount;
  readonly goal: FaustianAntagonistGoal;
}

function faustianWizard(state: CampaignStateV5) {
  const wizardId = state.pactSeats.faustian.wizardId;
  if (wizardId === null) return null;
  return state.wizards.find((wizard) => wizard.wizardId === wizardId) ?? null;
}

function requireUnarrangedForArrange(state: CampaignStateV5): void {
  if (!isExactUnarrangedFaustianBaseline(state.faustian)) {
    throw new DomainError(
      "INVALID_CAMPAIGN_STATE",
      "Arrange Table requires the exact valid unarranged Faustian baseline",
    );
  }
}

export function applyArrangeFaustianTable(
  state: CampaignStateV5,
  input: ArrangeFaustianTableInput,
): FaustianTransitionResult {
  requireSetup(state, "Arrange Table");
  requireExpectedFaustian(state, input.expectedFaustian, "Arrange Table");
  requireUnarrangedForArrange(state);
  const ageId = state.configuration.ageId;
  if (ageId === null) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "Arrange Table requires a selected campaign age");
  }
  if (ageId !== input.expectedAgeId) {
    throw new DomainError("STALE_COMMAND_PRECONDITION", "Campaign age changed since Arrange Table was started");
  }
  if (!FAUSTIAN_ARRANGEMENT_IDS.includes(input.arrangementId)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Unknown Faustian arrangement: ${input.arrangementId}`);
  }
  const allowed = allowedFaustianArrangementsForAge(ageId);
  if (!allowed.includes(input.arrangementId)) {
    throw new DomainError(
      "INVALID_CAMPAIGN_STATE",
      `Arrangement ${input.arrangementId} is not valid for age ${ageId}`,
    );
  }
  if (!isValidFaustianCommunityId(input.favoriteCommunityId)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Unknown favorite Community: ${input.favoriteCommunityId}`);
  }

  const wizard = faustianWizard(state);
  if (input.arrangementId === "dynamic") {
    const ageYears = wizard?.character.ageYears ?? null;
    if (ageYears !== input.expectedAgeYears) {
      throw new DomainError("STALE_COMMAND_PRECONDITION", "Faustian Wizard age changed since Arrange Table was started");
    }
    if (ageYears === null || ageYears === undefined) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", "Dynamic arrangement requires the Faustian Wizard's ageYears");
    }
  }
  if (input.arrangementId === "explosive") {
    const elements = wizard?.character.elements ?? null;
    if (canonicalJsonStringify(elements) !== canonicalJsonStringify(input.expectedElements)) {
      throw new DomainError("STALE_COMMAND_PRECONDITION", "Faustian Wizard Elements changed since Arrange Table was started");
    }
    if (elements === null) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", "Explosive arrangement requires the Faustian Wizard's Elements");
    }
  }
  if (ageId === "awakening") {
    if (input.reservedTwistCardId === null || !isValidFaustianCardId(input.reservedTwistCardId) || cardRank(input.reservedTwistCardId) !== "2") {
      throw new DomainError("INVALID_CAMPAIGN_STATE", "Age of Awakening requires choosing which Two will be the Twist");
    }
  } else if (input.reservedTwistCardId !== null) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "A reserved Twist Two is only used in the Age of Awakening");
  }
  if (ageId === "calamity") {
    if (input.calamityAntagonist === null) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", "Age of Calamity requires explicit Antagonist/Conspiracy choices");
    }
  } else if (input.calamityAntagonist !== null) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "Antagonist setup is only required for the Age of Calamity");
  }

  let pool = [...state.faustian.faustianDeck];
  let reserved: FaustianCardId | null = null;
  if (input.reservedTwistCardId !== null) {
    if (!pool.includes(input.reservedTwistCardId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", "Reserved Two is not in the unarranged Faustian Deck");
    }
    reserved = input.reservedTwistCardId;
    pool = pool.filter((cardId) => cardId !== reserved);
  }

  let devilDeck: FaustianCardId[];
  let twistCardId: FaustianCardId;
  let accompliceCardId: FaustianCardId;
  let remaining: FaustianCardId[];
  let pawnCommunityId: FaustianCommunityId | null = input.pawnCommunityId;
  let pawnCountAtDestination = 0;

  if (input.arrangementId === "quiet") {
    const low = pool.filter((cardId) => LOW_RANKS.includes(cardRank(cardId)));
    const mid = pool.filter((cardId) => MID_RANKS.includes(cardRank(cardId)));
    const high = pool.filter((cardId) => !LOW_RANKS.includes(cardRank(cardId)) && !MID_RANKS.includes(cardRank(cardId)));
    const devilLow = pickRandom(low, 4);
    const devilMid = pickRandom(mid, 2);
    devilDeck = shuffleInPlace([...devilLow.picked, ...devilMid.picked]);
    let remainingLow = devilLow.remaining;
    if (reserved !== null) {
      twistCardId = reserved;
    } else {
      const twistPick = pickOne(remainingLow);
      twistCardId = twistPick.picked;
      remainingLow = twistPick.remaining;
    }
    const accomplicePick = pickOne(devilMid.remaining);
    accompliceCardId = accomplicePick.picked;
    remaining = shuffleInPlace([...remainingLow, ...accomplicePick.remaining, ...high]);
    if (pawnCommunityId !== null) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", "Quiet arrangement does not place Pawns");
    }
  } else if (input.arrangementId === "dynamic") {
    const ageYears = wizard!.character.ageYears!;
    const devilCount = 3 + 2 * completedTwentyYearScores(ageYears);
    const neededAfterDevil = reserved === null ? 2 : 1;
    if (pool.length < devilCount + neededAfterDevil) {
      throw new DomainError(
        "INVALID_CAMPAIGN_STATE",
        "Dynamic arrangement cannot leave the required Twist and Accomplice",
      );
    }
    const devilPick = pickRandom(pool, devilCount);
    devilDeck = devilPick.picked;
    let rest = devilPick.remaining;
    if (reserved !== null) {
      twistCardId = reserved;
    } else {
      const twistPick = pickOne(rest);
      twistCardId = twistPick.picked;
      rest = twistPick.remaining;
    }
    if (rest.length < 1) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", "Dynamic arrangement cannot leave the required Accomplice");
    }
    const accomplicePick = pickOne(rest);
    accompliceCardId = accomplicePick.picked;
    remaining = shuffleInPlace(accomplicePick.remaining);
    if (
      pawnCommunityId === null
      || !isValidFaustianCommunityId(pawnCommunityId)
      || pawnCommunityId === input.favoriteCommunityId
    ) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", "Dynamic arrangement requires one Pawn in a Community other than the Accomplice Community");
    }
    pawnCountAtDestination = 1;
  } else {
    const elements = wizard!.character.elements!;
    const perSuit: Record<FaustianSuit, number> = {
      spades: 2 * elements.air,
      clubs: 2 * elements.fire,
      diamonds: 2 * elements.earth,
      hearts: 2 * elements.water,
    };
    const devilCards: FaustianCardId[] = [];
    let rest = [...pool];
    for (const suit of FAUSTIAN_SUITS) {
      const ofSuit = rest.filter((cardId) => cardSuit(cardId) === suit);
      if (perSuit[suit] > ofSuit.length) {
        throw new DomainError(
          "INVALID_CAMPAIGN_STATE",
          "Explosive arrangement per-suit request exceeds remaining suit capacity",
        );
      }
      const picked = pickRandom(ofSuit, perSuit[suit]);
      devilCards.push(...picked.picked);
      rest = rest.filter((cardId) => !picked.picked.includes(cardId));
    }
    devilDeck = shuffleInPlace(devilCards);
    if (reserved !== null) {
      twistCardId = reserved;
    } else {
      if (rest.length < 2) {
        throw new DomainError("INVALID_CAMPAIGN_STATE", "Explosive remainder cannot supply Twist and Accomplice");
      }
      const twistPick = pickOne(rest);
      twistCardId = twistPick.picked;
      rest = twistPick.remaining;
    }
    if (rest.length < 1) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", "Explosive remainder cannot supply Twist and Accomplice");
    }
    const accomplicePick = pickOne(rest);
    accompliceCardId = accomplicePick.picked;
    remaining = shuffleInPlace(accomplicePick.remaining);
    if (
      pawnCommunityId === null
      || !isValidFaustianCommunityId(pawnCommunityId)
      || pawnCommunityId === input.favoriteCommunityId
    ) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", "Explosive arrangement requires both Pawns in one Community other than the Accomplice Community");
    }
    pawnCountAtDestination = 2;
  }

  const communities = state.faustian.communities.map((community) => {
    if (community.communityId === input.favoriteCommunityId) {
      return { ...community, accompliceCardIds: [accompliceCardId] };
    }
    if (pawnCommunityId !== null && community.communityId === pawnCommunityId) {
      return { ...community, pawnCount: pawnCountAtDestination };
    }
    return community;
  });

  const faustian: FaustianState = {
    ...state.faustian,
    faustianDeck: remaining,
    devilDeck,
    communities,
    machinations: [{ cardId: twistCardId, facing: "face_down" }],
    activeTwistCardIds: [twistCardId],
  };

  let working: CampaignStateV5 = replaceFaustian(state, faustian);
  const arrangedEvent: FaustianEvent = {
    type: "faustian_table_arranged",
    version: 1,
    data: {
      arrangementId: input.arrangementId,
      favoriteCommunityId: input.favoriteCommunityId,
      pawnCommunityId,
      devilDeckCardIds: devilDeck,
      twistCardId,
      accompliceCardId,
      reservedTwistCardId: reserved,
    },
  };
  if (input.calamityAntagonist !== null) {
    const conspiracy = applyEstablishFaustianConspiracy(working, {
      communityId: input.calamityAntagonist.communityId,
      expectedFaustian: faustian,
      subject: input.calamityAntagonist.create === null
        ? { kind: "existing", denizenId: input.calamityAntagonist.denizenId }
        : {
          kind: "create",
          denizenId: input.calamityAntagonist.denizenId,
          name: input.calamityAntagonist.create.name,
        },
      seatId: input.calamityAntagonist.seatId,
      chipCount: input.calamityAntagonist.chipCount,
      goal: input.calamityAntagonist.goal,
    });
    return {
      nextState: conspiracy.nextState,
      events: [arrangedEvent, ...conspiracy.events],
    };
  }

  return commitFaustian(working, working.faustian, [arrangedEvent], working);
}

export function applyCompleteFaustianStructuralPlaceholder(
  state: CampaignStateV5,
  expectedFaustian: FaustianState,
): FaustianTransitionResult {
  requireSetup(state, "Complete Structural Placeholder");
  requireExpectedFaustian(state, expectedFaustian, "Complete Structural Placeholder");
  if (!isExactStructuralHelperFaustian(state.faustian)) {
    throw new DomainError(
      "INVALID_CAMPAIGN_STATE",
      "Complete Structural Placeholder requires the exact unused structural-helper signature during setup",
    );
  }
  const previousTwistCardId = state.faustian.activeTwistCardIds[0]!;
  const faustian: FaustianState = {
    ...state.faustian,
    faustianDeck: shuffleInPlace([previousTwistCardId, ...state.faustian.faustianDeck]),
    machinations: [],
    activeTwistCardIds: [],
  };
  return commitFaustian(state, faustian, [{
    type: "faustian_structural_placeholder_completed",
    version: 1,
    data: { previousTwistCardId },
  }]);
}

export function applyRevealFaustianCommunitySchemes(
  state: CampaignStateV5,
  communityId: FaustianCommunityId,
  expectedFaustian: FaustianState,
): FaustianTransitionResult {
  requireExpectedFaustian(state, expectedFaustian, "Investigate");
  const communityIdx = requireCommunity(state, communityId);
  const community = state.faustian.communities[communityIdx];
  const revealedSchemeCardIds = community.schemes
    .filter((scheme) => scheme.facing === "face_down")
    .map((scheme) => scheme.cardId);
  const nextSchemes = community.schemes.map((scheme) => ({ ...scheme, facing: "face_up" as const }));
  const eligibleSchemeCardIds = nextSchemes.map((scheme) => scheme.cardId);
  const faustian: FaustianState = {
    ...state.faustian,
    communities: state.faustian.communities.map((entry, i) => (
      i === communityIdx ? { ...entry, schemes: nextSchemes } : entry
    )),
  };
  return commitFaustian(state, faustian, [{
    type: "faustian_community_schemes_revealed",
    version: 1,
    data: { communityId, revealedSchemeCardIds, eligibleSchemeCardIds },
  }]);
}

export function applyFoilFaustianCommunityScheme(
  state: CampaignStateV5,
  communityId: FaustianCommunityId,
  schemeCardId: FaustianCardId,
  expectedFaustian: FaustianState,
): FaustianTransitionResult {
  requireExpectedFaustian(state, expectedFaustian, "Foil");
  const communityIdx = requireCommunity(state, communityId);
  if (!isValidFaustianCardId(schemeCardId)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "Selected Scheme is not a canonical Faustian card");
  }
  const community = state.faustian.communities[communityIdx];
  const selected = community.schemes.find((scheme) => scheme.cardId === schemeCardId);
  if (selected === undefined) {
    throw new DomainError(
      "INVALID_CAMPAIGN_STATE",
      "Selected Scheme is no longer in that Community",
    );
  }
  if (selected.facing !== "face_up") {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "Selected Scheme is not currently face-up");
  }
  const faustian: FaustianState = {
    ...state.faustian,
    communities: state.faustian.communities.map((entry, i) => (
      i === communityIdx
        ? { ...entry, schemes: entry.schemes.filter((scheme) => scheme.cardId !== schemeCardId) }
        : entry
    )),
    defeatedSchemes: [...state.faustian.defeatedSchemes, schemeCardId],
  };
  return commitFaustian(state, faustian, [{
    type: "faustian_community_scheme_foiled",
    version: 1,
    data: { communityId, schemeCardId },
  }]);
}

export function applyPlaceFaustianSchemes(
  state: CampaignStateV5,
  communityId: FaustianCommunityId,
  requestedQuantity: number,
  expectedFaustian: FaustianState,
): FaustianTransitionResult {
  requireExpectedFaustian(state, expectedFaustian, "Place Schemes");
  const communityIdx = requireCommunity(state, communityId);
  if (!Number.isSafeInteger(requestedQuantity) || requestedQuantity < 1) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "Place Schemes quantity must be a positive integer");
  }
  if (state.faustian.devilDeck.length < requestedQuantity) {
    throw new DomainError(
      "INVALID_CAMPAIGN_STATE",
      "Devil's Deck does not contain enough cards for the requested quantity",
    );
  }
  const placedCardIds = state.faustian.devilDeck.slice(0, requestedQuantity);
  const community = state.faustian.communities[communityIdx];
  const schemesAfterDeal = [
    ...community.schemes,
    ...placedCardIds.map((cardId) => ({ cardId, facing: "face_down" as const })),
  ];
  const protection = applyLocalAccompliceProtection(schemesAfterDeal, community.accompliceCardIds);
  const faustian: FaustianState = {
    ...state.faustian,
    devilDeck: [...state.faustian.devilDeck.slice(requestedQuantity), ...protection.preventedSchemeCardIds],
    communities: state.faustian.communities.map((entry, i) => (
      i === communityIdx ? { ...entry, schemes: protection.remainingSchemes } : entry
    )),
  };
  return commitFaustian(state, faustian, [{
    type: "faustian_schemes_placed",
    version: 1,
    data: {
      communityId,
      requestedQuantity,
      placedCardIds,
      revealedSchemeCardIds: protection.revealedSchemeCardIds,
      preventedSchemeCardIds: protection.preventedSchemeCardIds,
      insufficient: false,
    },
  }]);
}

export function applyChangeFaustianPawnCount(
  state: CampaignStateV5,
  communityId: FaustianCommunityId,
  expectedPawnCount: number,
  delta: 1 | -1,
  expectedFaustian: FaustianState,
): FaustianTransitionResult {
  requireExpectedFaustian(state, expectedFaustian, "Pawn change");
  const communityIdx = requireCommunity(state, communityId);
  const community = state.faustian.communities[communityIdx];
  if (community.pawnCount !== expectedPawnCount) {
    throw new DomainError("STALE_COMMAND_PRECONDITION", "Pawn count changed since this action was started");
  }
  const nextCount = community.pawnCount + delta;
  if (nextCount < 0) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Community ${communityId} has no Pawn to remove`);
  }
  const faustian: FaustianState = {
    ...state.faustian,
    communities: state.faustian.communities.map((entry, i) => (
      i === communityIdx ? { ...entry, pawnCount: nextCount } : entry
    )),
  };
  return commitFaustian(state, faustian, [{
    type: "faustian_pawn_count_changed",
    version: 1,
    data: { communityId, previousCount: community.pawnCount, nextCount },
  }]);
}

export interface EstablishFaustianConspiracyInput {
  readonly communityId: FaustianCommunityId;
  readonly expectedFaustian: FaustianState;
  readonly subject:
    | { readonly kind: "existing"; readonly denizenId: DenizenId }
    | { readonly kind: "create"; readonly denizenId: DenizenId; readonly name: string };
  readonly seatId: PactSeatId;
  readonly chipCount: FaustianAntagonistChipCount;
  readonly goal: FaustianAntagonistGoal;
}

export function applyEstablishFaustianConspiracy(
  state: CampaignStateV5,
  input: EstablishFaustianConspiracyInput,
): FaustianTransitionResult {
  requireExpectedFaustian(state, input.expectedFaustian, "Establish Conspiracy");
  requireCommunity(state, input.communityId);
  if (!isValidPactSeatId(input.seatId) || !isValidFaustianAntagonistChipCount(input.chipCount) || !isValidFaustianAntagonistGoal(input.goal)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "Conspiracy requires a valid Antagonist seat, chip count, and Goal");
  }
  if (!isValidDenizenId(input.subject.denizenId)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "Invalid Conspiracy denizenId");
  }
  if (state.faustian.conspiracies.some((entry) => entry.denizenId === input.subject.denizenId)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "That Denizen is already a Faustian Conspiracy");
  }

  let working = state;
  let createdDenizen = false;
  if (input.subject.kind === "create") {
    if (working.world.denizens.some((denizen) => denizen.denizenId === input.subject.denizenId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `Duplicate denizenId: ${input.subject.denizenId}`);
    }
    const name = input.subject.name.trim();
    if (name.length === 0) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", "New Conspiracy Denizen requires a name");
    }
    createdDenizen = true;
    working = {
      ...working,
      world: {
        ...working.world,
        denizens: [
          ...working.world.denizens,
          {
            denizenId: input.subject.denizenId,
            name,
            representation: "collective",
            description: null,
            mortalityState: null,
            powerfulProfile: {
              taxonomies: [{ kind: "builtin", taxonomyId: "conspiracy" }],
              status: { kind: "standard", value: "malignant" },
              goal: input.goal,
              methods: [],
              truths: [],
            },
          },
        ],
      },
    };
  } else {
    const denizen = working.world.denizens.find((entry) => entry.denizenId === input.subject.denizenId);
    if (denizen === undefined) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", "Selected Denizen does not resolve");
    }
    if (denizen.representation !== "collective") {
      throw new DomainError("INVALID_CAMPAIGN_STATE", "Conspiracy must be a collective Denizen");
    }
    if (denizen.powerfulProfile === null) {
      working = {
        ...working,
        world: {
          ...working.world,
          denizens: working.world.denizens.map((entry) =>
            entry.denizenId === denizen.denizenId
              ? {
                ...entry,
                powerfulProfile: {
                  taxonomies: [{ kind: "builtin", taxonomyId: "conspiracy" }],
                  status: { kind: "standard", value: "malignant" },
                  goal: input.goal,
                  methods: [],
                  truths: [],
                },
              }
              : entry
          ),
        },
      };
    } else {
      const hasConspiracy = denizen.powerfulProfile.taxonomies.some(
        (taxonomy) => taxonomy.kind === "builtin" && taxonomy.taxonomyId === "conspiracy",
      );
      if (!hasConspiracy) {
        throw new DomainError("INVALID_CAMPAIGN_STATE", "Existing Powerful profile is not a Conspiracy");
      }
      if (denizen.powerfulProfile.goal !== input.goal) {
        throw new DomainError("INVALID_CAMPAIGN_STATE", "Do not overwrite an incompatible existing Powerful profile");
      }
    }
  }

  const faustian: FaustianState = {
    ...working.faustian,
    conspiracies: [...working.faustian.conspiracies, {
      denizenId: input.subject.denizenId,
      communityId: input.communityId,
    }],
    antagonists: working.faustian.antagonists.some((entry) => entry.denizenId === input.subject.denizenId)
      ? working.faustian.antagonists
      : [...working.faustian.antagonists, {
        denizenId: input.subject.denizenId,
        seatId: input.seatId,
        chipCount: input.chipCount,
      }],
  };

  return commitFaustian(working, faustian, [{
    type: "faustian_conspiracy_established",
    version: 1,
    data: {
      communityId: input.communityId,
      denizenId: input.subject.denizenId,
      createdDenizen,
      seatId: input.seatId,
      chipCount: input.chipCount,
    },
  }], working);
}
