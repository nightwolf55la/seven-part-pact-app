import type { CompanionRelationshipId, DenizenId, TreasureId, WizardId } from "./ids";
import type { PactSeatId } from "./pact-seats";
import type {
  FaustianAntagonistGoal,
  FaustianCardFacing,
  FaustianCardId,
  FaustianCommunityId,
  FaustianDevilFormId,
  FaustianDevilLawId,
  FaustianMalignance,
  FaustianOriginClaimId,
  FaustianOriginClaimStatus,
  FaustianSuit,
} from "./faustian-catalogs";
import {
  FAUSTIAN_CARD_IDS,
  FAUSTIAN_COMMUNITY_IDS,
  FAUSTIAN_ORIGIN_CLAIM_IDS,
  FAUSTIAN_SUITS,
  isValidFaustianCardId,
  isValidFaustianDevilLawId,
} from "./faustian-catalogs";
import { DomainError } from "./errors";

export interface FaustianSchemePlacement {
  readonly cardId: FaustianCardId;
  readonly facing: FaustianCardFacing;
}

export interface FaustianCommunityState {
  readonly communityId: FaustianCommunityId;
  readonly pawnCount: number;
  readonly schemes: readonly FaustianSchemePlacement[];
  readonly accompliceCardId: FaustianCardId | null;
}

export interface FaustianMachinationCard {
  readonly cardId: FaustianCardId;
  readonly facing: FaustianCardFacing;
}

export interface FaustianEntrustedCard {
  readonly cardId: FaustianCardId;
  readonly wizardId: WizardId;
}

export interface FaustianAntagonistBeneathCard {
  readonly cardId: FaustianCardId;
  readonly denizenId: DenizenId;
}

export type FaustianPossessionRepresentation =
  | { readonly kind: "none" }
  | { readonly kind: "denizen"; readonly denizenId: DenizenId }
  | { readonly kind: "treasure"; readonly treasureId: TreasureId };

export interface FaustianPossessionCard {
  readonly cardId: FaustianCardId;
  readonly wizardId: WizardId;
  readonly represented: FaustianPossessionRepresentation;
}

export interface FaustianConspiracyState {
  readonly denizenId: DenizenId;
}

export interface FaustianAntagonistState {
  readonly denizenId: DenizenId;
  readonly suitGoal: FaustianAntagonistGoal;
}

export type FaustianDemonOccupancy =
  | { readonly kind: "isha" }
  | { readonly kind: "pact_domain"; readonly seatId: PactSeatId };

export interface FaustianDemonState {
  readonly denizenId: DenizenId;
  readonly malignance: FaustianMalignance;
  readonly occupancy: FaustianDemonOccupancy;
  readonly monthsInCurrentDomain: number;
}

export interface FaustianDomainSeizure {
  readonly seatId: PactSeatId;
  readonly conduitDenizenId: DenizenId;
}

export interface FaustianOriginClaimState {
  readonly claimId: FaustianOriginClaimId;
  readonly status: FaustianOriginClaimStatus;
}

export type FaustianDevilObligation =
  | {
      readonly kind: "wizard_owes_week_next_month";
      readonly wizardId: WizardId;
    }
  | {
      readonly kind: "wizard_owes_week_monthly_while_denizen_alive";
      readonly wizardId: WizardId;
      readonly denizenId: DenizenId;
    }
  | {
      readonly kind: "monthly_card_drain_while_powerful_in_isha";
      readonly denizenId: DenizenId;
    }
  | {
      readonly kind: "recurring_devil_time_while_magic_trace";
      readonly traceDescription: string;
    }
  | {
      readonly kind: "recurring_devil_time_in_domain_while_companion_care";
      readonly wizardId: WizardId;
      readonly companionRelationshipId: CompanionRelationshipId;
    }
  | {
      readonly kind: "monthly_card_drain_while_wizard_alive";
      readonly wizardId: WizardId;
    };

export interface FaustianState {
  readonly faustianDeck: readonly FaustianCardId[];
  readonly devilDeck: readonly FaustianCardId[];
  readonly communities: readonly FaustianCommunityState[];
  readonly machinations: readonly FaustianMachinationCard[];
  readonly defeatedSchemes: readonly FaustianCardId[];
  readonly entrustedCards: readonly FaustianEntrustedCard[];
  readonly beneathAntagonists: readonly FaustianAntagonistBeneathCard[];
  readonly possessions: readonly FaustianPossessionCard[];
  readonly activeTwistCardIds: readonly FaustianCardId[];
  readonly conspiracies: readonly FaustianConspiracyState[];
  readonly antagonists: readonly FaustianAntagonistState[];
  readonly demons: readonly FaustianDemonState[];
  readonly domainSeizures: readonly FaustianDomainSeizure[];
  readonly selectedDevilLawIds: readonly FaustianDevilLawId[];
  readonly selectedDevilFormIds: readonly FaustianDevilFormId[];
  readonly originClaims: readonly FaustianOriginClaimState[];
  readonly devilObligations: readonly FaustianDevilObligation[];
}

function emptyCommunities(): readonly FaustianCommunityState[] {
  return FAUSTIAN_COMMUNITY_IDS.map((communityId) => ({
    communityId,
    pawnCount: 0,
    schemes: [],
    accompliceCardId: null,
  }));
}

function openOriginClaims(): readonly FaustianOriginClaimState[] {
  return FAUSTIAN_ORIGIN_CLAIM_IDS.map((claimId) => ({
    claimId,
    status: "open",
  }));
}

export const EMPTY_FAUSTIAN_STATE: FaustianState = {
  faustianDeck: [...FAUSTIAN_CARD_IDS],
  devilDeck: [],
  communities: emptyCommunities(),
  machinations: [],
  defeatedSchemes: [],
  entrustedCards: [],
  beneathAntagonists: [],
  possessions: [],
  activeTwistCardIds: [],
  conspiracies: [],
  antagonists: [],
  demons: [],
  domainSeizures: [],
  selectedDevilLawIds: [],
  selectedDevilFormIds: [],
  originClaims: openOriginClaims(),
  devilObligations: [],
};

export interface InitializedDefaultFaustianInput {
  readonly selectedDevilLawIds: readonly FaustianDevilLawId[];
  readonly activeTwistCardId: FaustianCardId;
  readonly selectedDevilFormIds?: readonly FaustianDevilFormId[];
}

export function buildInitializedDefaultFaustianState(
  input: InitializedDefaultFaustianInput,
): FaustianState {
  if (input.selectedDevilLawIds.length !== 2) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "Normal Faustian initialization requires exactly two Devil Laws");
  }
  const lawIds = new Set<string>();
  for (const lawId of input.selectedDevilLawIds) {
    if (!isValidFaustianDevilLawId(lawId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `Unknown Devil Law: ${lawId}`);
    }
    if (lawIds.has(lawId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `Duplicate Faustian Law: ${lawId}`);
    }
    lawIds.add(lawId);
  }
  if (!isValidFaustianCardId(input.activeTwistCardId)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Invalid Twist card: ${input.activeTwistCardId}`);
  }

  return {
    ...EMPTY_FAUSTIAN_STATE,
    faustianDeck: FAUSTIAN_CARD_IDS.filter((cardId) => cardId !== input.activeTwistCardId),
    machinations: [{ cardId: input.activeTwistCardId, facing: "face_down" }],
    activeTwistCardIds: [input.activeTwistCardId],
    selectedDevilLawIds: [...input.selectedDevilLawIds],
    selectedDevilFormIds: input.selectedDevilFormIds ?? [],
  };
}

export function faustianDeckMissingSuits(faustian: FaustianState): readonly FaustianSuit[] {
  const present = new Set<FaustianSuit>();
  for (const cardId of faustian.faustianDeck) {
    const suit = cardId.slice(0, cardId.indexOf("_")) as FaustianSuit;
    present.add(suit);
  }
  return FAUSTIAN_SUITS.filter((suit) => !present.has(suit));
}

export function devilWeeksOwedForMissingSuits(faustian: FaustianState): number {
  return faustianDeckMissingSuits(faustian).length;
}

export function isFaustianDeckEmpty(faustian: FaustianState): boolean {
  return faustian.faustianDeck.length === 0;
}
