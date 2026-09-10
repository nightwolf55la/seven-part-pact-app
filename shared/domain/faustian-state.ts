import type { CompanionRelationshipId, DenizenId, TreasureId, WizardId } from "./ids";
import type { PactSeatId } from "./pact-seats";
import type {
  FaustianAntagonistChipCount,
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
  isValidFaustianDevilFormId,
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
  readonly accompliceCardIds: readonly FaustianCardId[];
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

export interface FaustianDomainPlacedCard {
  readonly cardId: FaustianCardId;
  readonly seatId: PactSeatId;
  readonly represented: FaustianPossessionRepresentation;
}

export interface FaustianConspiracyState {
  readonly denizenId: DenizenId;
  readonly communityId: FaustianCommunityId;
}

export interface FaustianAntagonistState {
  readonly denizenId: DenizenId;
  readonly seatId: PactSeatId;
  readonly chipCount: FaustianAntagonistChipCount;
}

export type FaustianDemonOccupancy =
  | { readonly kind: "isha" }
  | { readonly kind: "pact_domain"; readonly seatId: PactSeatId };

export type FaustianDemonBinding =
  | { readonly kind: "bound" }
  | { readonly kind: "unbound"; readonly malignance: FaustianMalignance };

export const FAUSTIAN_DEMON_CONDITIONS = [
  "active",
  "destroyed_reforming",
  "imprisoned",
  "banished",
] as const;

export type FaustianDemonCondition = (typeof FAUSTIAN_DEMON_CONDITIONS)[number];

export function isValidFaustianDemonCondition(value: string): value is FaustianDemonCondition {
  return (FAUSTIAN_DEMON_CONDITIONS as readonly string[]).includes(value);
}

export interface FaustianDemonState {
  readonly denizenId: DenizenId;
  readonly binding: FaustianDemonBinding;
  readonly form: string;
  readonly hellOfOrigin: string;
  readonly magicalSymbol: string;
  readonly occupancy: FaustianDemonOccupancy | null;
  readonly monthsInCurrentDomain: number;
  readonly condition: FaustianDemonCondition;
}

export interface FaustianDomainSeizure {
  readonly seatId: PactSeatId;
  readonly conduitDenizenId: DenizenId;
}

export interface FaustianOriginClaimState {
  readonly claimId: FaustianOriginClaimId;
  readonly status: FaustianOriginClaimStatus;
}

export interface FaustianCustomOriginClaim {
  readonly claim: string;
  readonly secretName: string | null;
  readonly status: FaustianOriginClaimStatus;
}

export interface FaustianSelectedDevilForms {
  readonly casual: readonly FaustianDevilFormId[];
  readonly special: readonly FaustianDevilFormId[];
  readonly duress: readonly FaustianDevilFormId[];
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
    }
  | {
      readonly kind: "permanent_devil_time_from_wizard";
      readonly wizardId: WizardId;
      readonly weeks: number;
    };

export const FAUSTIAN_PERSISTENT_FULL_HOUSE_RANKS = [
  "2",
  "3",
  "4",
  "5",
  "6",
  "9",
  "10",
  "jack",
  "queen",
  "king",
] as const;

export type FaustianPersistentFullHouseRank = (typeof FAUSTIAN_PERSISTENT_FULL_HOUSE_RANKS)[number];

export function isValidFaustianPersistentFullHouseRank(
  value: string,
): value is FaustianPersistentFullHouseRank {
  return (FAUSTIAN_PERSISTENT_FULL_HOUSE_RANKS as readonly string[]).includes(value);
}

export type FaustianPersistentMachinationEffect =
  | {
      readonly kind: "flush";
      readonly suit: FaustianSuit;
    }
  | {
      readonly kind: "full_house";
      readonly rank: FaustianPersistentFullHouseRank;
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
  readonly setAsideHand: readonly FaustianCardId[];
  readonly domainPlacements: readonly FaustianDomainPlacedCard[];
  readonly activeTwistCardIds: readonly FaustianCardId[];
  readonly conspiracies: readonly FaustianConspiracyState[];
  readonly antagonists: readonly FaustianAntagonistState[];
  readonly demons: readonly FaustianDemonState[];
  readonly domainSeizures: readonly FaustianDomainSeizure[];
  readonly selectedDevilLawIds: readonly FaustianDevilLawId[];
  readonly selectedDevilForms: FaustianSelectedDevilForms;
  readonly originClaims: readonly FaustianOriginClaimState[];
  readonly customOriginClaim: FaustianCustomOriginClaim | null;
  readonly devilObligations: readonly FaustianDevilObligation[];
  readonly resolvedFlushSuits: readonly FaustianSuit[];
  readonly persistentMachinationEffects: readonly FaustianPersistentMachinationEffect[];
}

function emptyCommunities(): readonly FaustianCommunityState[] {
  return FAUSTIAN_COMMUNITY_IDS.map((communityId) => ({
    communityId,
    pawnCount: 0,
    schemes: [],
    accompliceCardIds: [],
  }));
}

function openOriginClaims(): readonly FaustianOriginClaimState[] {
  return FAUSTIAN_ORIGIN_CLAIM_IDS.map((claimId) => ({
    claimId,
    status: "open",
  }));
}

export const EMPTY_SELECTED_DEVIL_FORMS: FaustianSelectedDevilForms = {
  casual: [],
  special: [],
  duress: [],
};

export const EMPTY_FAUSTIAN_STATE: FaustianState = {
  faustianDeck: [...FAUSTIAN_CARD_IDS],
  devilDeck: [],
  communities: emptyCommunities(),
  machinations: [],
  defeatedSchemes: [],
  entrustedCards: [],
  beneathAntagonists: [],
  possessions: [],
  setAsideHand: [],
  domainPlacements: [],
  activeTwistCardIds: [],
  conspiracies: [],
  antagonists: [],
  demons: [],
  domainSeizures: [],
  selectedDevilLawIds: [],
  selectedDevilForms: EMPTY_SELECTED_DEVIL_FORMS,
  originClaims: openOriginClaims(),
  customOriginClaim: null,
  devilObligations: [],
  resolvedFlushSuits: [],
  persistentMachinationEffects: [],
};

export interface InitializedDefaultFaustianInput {
  readonly selectedDevilLawIds: readonly FaustianDevilLawId[];
  readonly activeTwistCardId: FaustianCardId;
  readonly selectedDevilForms: FaustianSelectedDevilForms;
}

function requireUniqueFormSelection(forms: FaustianSelectedDevilForms, enforceNormalCounts: boolean): void {
  const selected = [...forms.casual, ...forms.special, ...forms.duress];
  const seen = new Set<string>();
  for (const formId of selected) {
    if (!isValidFaustianDevilFormId(formId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `Unknown Devil Form: ${formId}`);
    }
    if (seen.has(formId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `Duplicate Faustian Devil form: ${formId}`);
    }
    seen.add(formId);
  }
  if (enforceNormalCounts) {
    if (forms.casual.length !== 3 || forms.special.length !== 2 || forms.duress.length !== 1) {
      throw new DomainError(
        "INVALID_CAMPAIGN_STATE",
        "Normal Faustian initialization requires 3 casual, 2 special, and 1 duress Devil Forms",
      );
    }
  }
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
  requireUniqueFormSelection(input.selectedDevilForms, true);

  return {
    ...EMPTY_FAUSTIAN_STATE,
    faustianDeck: FAUSTIAN_CARD_IDS.filter((cardId) => cardId !== input.activeTwistCardId),
    machinations: [{ cardId: input.activeTwistCardId, facing: "face_down" }],
    activeTwistCardIds: [input.activeTwistCardId],
    selectedDevilLawIds: [...input.selectedDevilLawIds],
    selectedDevilForms: {
      casual: [...input.selectedDevilForms.casual],
      special: [...input.selectedDevilForms.special],
      duress: [...input.selectedDevilForms.duress],
    },
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
