/**
 * Pure Faustian card-table presentation helper.
 *
 * React should render this read model rather than reconstructing Community
 * order, card zones, Sorcerer presence, or concealment labels independently.
 * This is not a source of truth; CampaignState.faustian remains authoritative.
 */

import type {
  FaustianCardFacing,
  FaustianCardId,
  FaustianCommunityId,
  FaustianState,
  FaustianSuit,
  LoreSubjectRef,
  PactSeatId,
  SorcererExternalPresence,
} from "../shared/domain";
import {
  FAUSTIAN_COMMUNITY_DEFINITIONS,
  FAUSTIAN_COMMUNITY_IDS,
  FAUSTIAN_SUITS,
  faustianCardSourceReference,
  faustianCommunityHeader,
  FAUSTIAN_SOURCE_WORDING_OMISSION,
  loreSubjectRefsEqual,
  pactSeatDisplayName,
} from "../shared/domain";
import type { LoreCompendiumUiState } from "./lore-view-model";
import { findPresentationSubjectByRef } from "./lore-view-model";
import type { LorePresentationSubject } from "../shared/domain";
import type { DenizenRef } from "./WorldSurface";

export const FAUSTIAN_FAN_CAP = 3;
export const FAUSTIAN_TABLE_MIN_WIDTH_PX = 720;
export const SHARED_TIME_BOUNDARY_COPY =
  "Records the Faustian board result; shared Time is handled separately.";
export const FACEDOWN_SCHEME_LABEL = "Unrevealed Scheme";
export const FACEDOWN_TWIST_LABEL = "Unrevealed Twist";
export const FACEDOWN_MACHINATION_LABEL = "Unrevealed Machination";
export const FACEDOWN_CARD_LABEL = "Unrevealed card";
export const PRIVATE_TWIST_INSPECT_LABEL = "Inspect Twist privately";
export const PRIVATE_TWIST_INSPECT_HINT =
  "Local-only view. Does not flip the card, send a command, or write an event.";

export interface NamedWizardRef {
  readonly wizardId: string;
  readonly name: string;
}

export interface FaustianWizardRef {
  readonly wizardId: string;
  readonly name: string;
  readonly ageYears: number | null | undefined;
  readonly elements: { readonly air: number; readonly fire: number; readonly earth: number; readonly water: number } | null;
  readonly homeIsleId: string | null;
  readonly sanctumPlaceId: string | null;
}

export type FaustianPublicCardKind =
  | "scheme"
  | "accomplice"
  | "twist"
  | "machination"
  | "defeated"
  | "held"
  | "entrusted"
  | "possession"
  | "domain";

export interface FaustianConcealedCardPresentation {
  readonly kind: FaustianPublicCardKind;
  readonly facing: "face_down";
  readonly publicLabel: string;
  readonly ariaLabel: string;
  readonly instanceKey: string;
}

export interface FaustianRevealedCardPresentation {
  readonly kind: FaustianPublicCardKind;
  readonly facing: "face_up";
  readonly cardId: FaustianCardId;
  readonly publicLabel: string;
  readonly ariaLabel: string;
  readonly instanceKey: string;
  readonly identityLabel: string;
  readonly sourceOmission: string;
  readonly syndicateLabel: string | null;
  readonly roleLabel: string | null;
}

export type FaustianPublicCardPresentation =
  | FaustianConcealedCardPresentation
  | FaustianRevealedCardPresentation;

export interface FaustianFannedPilePresentation {
  readonly visible: readonly FaustianPublicCardPresentation[];
  readonly hiddenCount: number;
  readonly totalCount: number;
  readonly overflowLabel: string | null;
}

export interface FaustianCommunityPresentation {
  readonly communityId: FaustianCommunityId;
  readonly row: number;
  readonly column: number;
  readonly zodiacLabel: string;
  readonly populace: string;
  readonly associatedWizardLabel: string;
  readonly headerLabel: string;
  readonly schemes: FaustianFannedPilePresentation;
  readonly accomplices: FaustianFannedPilePresentation;
  readonly pawnCount: number;
  readonly pawnLabel: string;
  readonly conspiracies: readonly {
    readonly denizenId: string;
    readonly name: string;
  }[];
}

export interface FaustianSuitSummaryPresentation {
  readonly suit: FaustianSuit;
  readonly label: string;
  readonly faustianDeckCount: number;
}

export interface FaustianLocatedCardPresentation extends FaustianRevealedCardPresentation {
  readonly locationLabel: string;
}

export interface FaustianTablePresentation {
  readonly communities: readonly FaustianCommunityPresentation[];
  readonly faustianDeckCount: number;
  readonly devilDeckCount: number;
  readonly suitSummaries: readonly FaustianSuitSummaryPresentation[];
  readonly twists: readonly FaustianPublicCardPresentation[];
  readonly machinations: readonly FaustianPublicCardPresentation[];
  readonly defeatedSchemes: readonly FaustianPublicCardPresentation[];
  readonly heldCards: readonly FaustianPublicCardPresentation[];
  readonly entrustedCards: readonly FaustianLocatedCardPresentation[];
  readonly possessionCards: readonly FaustianLocatedCardPresentation[];
  readonly domainPlacements: readonly FaustianLocatedCardPresentation[];
  readonly devilSchemeResearchers: readonly {
    readonly denizenId: string;
    readonly name: string;
    readonly operationalLabel: string;
  }[];
  readonly disruptiveArcanists: readonly {
    readonly denizenId: string;
    readonly name: string;
    readonly schoolLabel: string;
  }[];
}

function fan(
  cards: readonly FaustianPublicCardPresentation[],
  overflowNoun: string,
): FaustianFannedPilePresentation {
  if (cards.length <= FAUSTIAN_FAN_CAP) {
    return { visible: cards, hiddenCount: 0, totalCount: cards.length, overflowLabel: null };
  }
  const hiddenCount = cards.length - FAUSTIAN_FAN_CAP;
  return {
    visible: cards.slice(0, FAUSTIAN_FAN_CAP),
    hiddenCount,
    totalCount: cards.length,
    overflowLabel: `Inspect all ${cards.length} ${overflowNoun}`,
  };
}

function concealed(
  kind: FaustianPublicCardKind,
  publicLabel: string,
  instanceKey: string,
): FaustianConcealedCardPresentation {
  return {
    kind,
    facing: "face_down",
    publicLabel,
    ariaLabel: publicLabel,
    instanceKey,
  };
}

function revealed(
  kind: FaustianPublicCardKind,
  cardId: FaustianCardId,
  instanceKey: string,
  extraAria?: string,
): FaustianRevealedCardPresentation {
  const reference = faustianCardSourceReference(cardId);
  const publicLabel = reference.faceUpIdentityLabel;
  const syndicateLabel = kind === "accomplice" ? reference.accomplice.syndicate : null;
  const roleLabel = kind === "accomplice" ? reference.accomplice.role : null;
  return {
    kind,
    facing: "face_up",
    cardId,
    publicLabel,
    ariaLabel: extraAria === undefined ? publicLabel : `${extraAria}: ${publicLabel}`,
    instanceKey,
    identityLabel: publicLabel,
    sourceOmission: FAUSTIAN_SOURCE_WORDING_OMISSION,
    syndicateLabel,
    roleLabel,
  };
}

function schemePresentation(
  cardId: FaustianCardId,
  facing: FaustianCardFacing,
  communityId: FaustianCommunityId,
  index: number,
): FaustianPublicCardPresentation {
  const instanceKey = `scheme:${communityId}:${index}`;
  if (facing === "face_down") {
    return concealed("scheme", FACEDOWN_SCHEME_LABEL, instanceKey);
  }
  return revealed("scheme", cardId, instanceKey, "Scheme");
}

export function researcherOperationalLabel(operationalThisMonth: boolean): string {
  return operationalThisMonth ? "Working" : "Unavailable this month";
}

export function faustianDevilSchemeResearchers(
  presence: readonly SorcererExternalPresence[],
): Extract<SorcererExternalPresence, { kind: "researcher" }>[] {
  return presence.filter(
    (entry): entry is Extract<SorcererExternalPresence, { kind: "researcher" }> =>
      entry.kind === "researcher" && entry.target.kind === "faustian_devils_schemes",
  );
}

export function faustianDomainDisruptiveArcanists(
  presence: readonly SorcererExternalPresence[],
): Extract<SorcererExternalPresence, { kind: "disruptive_arcanist" }>[] {
  return presence.filter(
    (entry): entry is Extract<SorcererExternalPresence, { kind: "disruptive_arcanist" }> =>
      entry.kind === "disruptive_arcanist" && entry.seatId === "faustian",
  );
}

function denizenName(denizens: readonly DenizenRef[], denizenId: string): string {
  return denizens.find((denizen) => denizen.denizenId === denizenId)?.name ?? "Named Denizen";
}

function wizardName(wizards: readonly NamedWizardRef[], wizardId: string): string {
  return wizards.find((wizard) => wizard.wizardId === wizardId)?.name ?? "Wizard";
}

function schoolLabel(school: Extract<SorcererExternalPresence, { kind: "disruptive_arcanist" }>["school"]): string {
  return school.kind === "source" ? school.schoolId : school.schoolId;
}

export function buildFaustianTablePresentation(args: {
  readonly faustian: FaustianState;
  readonly sorcererPresence?: readonly SorcererExternalPresence[];
  readonly denizens?: readonly DenizenRef[];
  readonly wizards?: readonly NamedWizardRef[];
}): FaustianTablePresentation {
  const faustian = args.faustian;
  const denizens = args.denizens ?? [];
  const wizards = args.wizards ?? [];
  const presence = args.sorcererPresence ?? [];

  const communities = FAUSTIAN_COMMUNITY_IDS.map((communityId, index) => {
    const state = faustian.communities.find((community) => community.communityId === communityId)
      ?? { communityId, pawnCount: 0, schemes: [], accompliceCardIds: [] };
    const header = faustianCommunityHeader(communityId);
    const schemes = state.schemes.map((scheme, schemeIndex) =>
      schemePresentation(scheme.cardId, scheme.facing, communityId, schemeIndex),
    );
    const accomplices = state.accompliceCardIds.map((cardId, accompliceIndex) =>
      revealed("accomplice", cardId, `accomplice:${communityId}:${accompliceIndex}`, "Accomplice"),
    );
    const conspiracies = faustian.conspiracies
      .filter((conspiracy) => conspiracy.communityId === communityId)
      .map((conspiracy) => ({
        denizenId: conspiracy.denizenId,
        name: denizenName(denizens, conspiracy.denizenId),
      }));
    return {
      communityId,
      row: Math.floor(index / 3),
      column: index % 3,
      zodiacLabel: header.zodiacLabel,
      populace: header.populace,
      associatedWizardLabel: header.associatedWizardLabel,
      headerLabel: `${header.zodiacLabel} · ${header.populace} · ${header.associatedWizardLabel}`,
      schemes: fan(schemes, "Schemes"),
      accomplices: fan(accomplices, "Accomplices"),
      pawnCount: state.pawnCount,
      pawnLabel: state.pawnCount === 1 ? "1 Pawn" : `${state.pawnCount} Pawns`,
      conspiracies,
    };
  });

  const suitSummaries = FAUSTIAN_SUITS.map((suit) => ({
    suit,
    label: faustianCardSourceReference(`${suit}_ace` as FaustianCardId).suitLabel,
    faustianDeckCount: faustian.faustianDeck.filter((cardId) => cardId.startsWith(`${suit}_`)).length,
  }));

  const twists = faustian.activeTwistCardIds.map((cardId, index) => {
    const machination = faustian.machinations.find((entry) => entry.cardId === cardId);
    const facing = machination?.facing ?? "face_down";
    const instanceKey = `twist:${index}`;
    if (facing === "face_down") {
      return concealed("twist", FACEDOWN_TWIST_LABEL, instanceKey);
    }
    return revealed("twist", cardId, instanceKey, "Twist");
  });

  const machinations = faustian.machinations.map((card, index) => {
    const instanceKey = `machination:${index}`;
    if (card.facing === "face_down") {
      return concealed("machination", FACEDOWN_MACHINATION_LABEL, instanceKey);
    }
    return revealed("machination", card.cardId, instanceKey, "Machination");
  });

  return {
    communities,
    faustianDeckCount: faustian.faustianDeck.length,
    devilDeckCount: faustian.devilDeck.length,
    suitSummaries,
    twists,
    machinations,
    defeatedSchemes: faustian.defeatedSchemes.map((cardId, index) =>
      revealed("defeated", cardId, `defeated:${index}`, "Defeated Scheme"),
    ),
    heldCards: faustian.setAsideHand.map((cardId, index) =>
      revealed("held", cardId, `held:${index}`, "Held card"),
    ),
    entrustedCards: faustian.entrustedCards.map((card, index) => ({
      ...revealed("entrusted", card.cardId, `entrusted:${index}`, "Entrusted card"),
      locationLabel: `Entrusted to ${wizardName(wizards, card.wizardId)}`,
    })),
    possessionCards: faustian.possessions.map((card, index) => ({
      ...revealed("possession", card.cardId, `possession:${index}`, "Possession card"),
      locationLabel: `Possession of ${wizardName(wizards, card.wizardId)}`,
    })),
    domainPlacements: faustian.domainPlacements.map((card, index) => ({
      ...revealed("domain", card.cardId, `domain:${index}`, "Domain-placed card"),
      locationLabel: `${pactSeatDisplayName(card.seatId as PactSeatId)} Domain`,
    })),
    devilSchemeResearchers: faustianDevilSchemeResearchers(presence).map((researcher) => ({
      denizenId: researcher.denizenId,
      name: researcher.name,
      operationalLabel: researcherOperationalLabel(researcher.operationalThisMonth),
    })),
    disruptiveArcanists: faustianDomainDisruptiveArcanists(presence).map((arcanist) => ({
      denizenId: arcanist.denizenId,
      name: arcanist.name,
      schoolLabel: schoolLabel(arcanist.school),
    })),
  };
}

export function communityAllSchemes(
  faustian: FaustianState,
  communityId: FaustianCommunityId,
): readonly FaustianPublicCardPresentation[] {
  const community = faustian.communities.find((entry) => entry.communityId === communityId);
  if (community === undefined) return [];
  return community.schemes.map((scheme, index) =>
    schemePresentation(scheme.cardId, scheme.facing, communityId, index),
  );
}

export function communityAllAccomplices(
  faustian: FaustianState,
  communityId: FaustianCommunityId,
): readonly FaustianPublicCardPresentation[] {
  const community = faustian.communities.find((entry) => entry.communityId === communityId);
  if (community === undefined) return [];
  return community.accompliceCardIds.map((cardId, index) =>
    revealed("accomplice", cardId, `accomplice:${communityId}:${index}`, "Accomplice"),
  );
}

export function privateTwistInspection(
  faustian: FaustianState,
  twistIndex: number,
): FaustianRevealedCardPresentation | null {
  const cardId = faustian.activeTwistCardIds[twistIndex];
  if (cardId === undefined) return null;
  return revealed("twist", cardId, `private-twist:${twistIndex}`, "Private Twist view");
}

export function presentationContainsSecretIdentity(
  haystack: string,
  cardId: FaustianCardId,
): boolean {
  const reference = faustianCardSourceReference(cardId);
  const needles = [
    cardId,
    reference.faceUpIdentityLabel,
    reference.rankLabel,
    reference.suitLabel,
    reference.rank,
    reference.suit,
  ];
  const lower = haystack.toLowerCase();
  return needles.some((needle) => lower.includes(String(needle).toLowerCase()));
}

export function faustianLoreSubjects(
  loreCompendium: LoreCompendiumUiState | undefined,
  wizard: FaustianWizardRef | null,
): readonly LorePresentationSubject[] {
  if (loreCompendium === undefined || loreCompendium.status !== "ready") {
    return [];
  }
  const presentation = loreCompendium.presentation;
  const wanted: LoreSubjectRef[] = [];
  if (wizard?.homeIsleId) {
    wanted.push({ kind: "isle", isleId: wizard.homeIsleId as never });
  }
  if (wizard?.sanctumPlaceId) {
    wanted.push({ kind: "place", placeId: wizard.sanctumPlaceId as never });
  }
  wanted.push({ kind: "pact_domain", pactSeatId: "faustian" });
  const resolved: LorePresentationSubject[] = [];
  for (const ref of wanted) {
    const subject = findPresentationSubjectByRef(presentation, ref);
    if (subject !== undefined) resolved.push(subject);
  }
  for (const subject of presentation.subjects) {
    if (
      subject.subject?.kind === "source_topic"
      && subject.subject.topicId.startsWith("hell.")
      && !resolved.some((entry) => entry.subject !== null && loreSubjectRefsEqual(entry.subject, subject.subject!))
    ) {
      resolved.push(subject);
    }
  }
  return resolved;
}

export const FAUSTIAN_COMMUNITY_ROW_ORDER: readonly FaustianCommunityId[] = FAUSTIAN_COMMUNITY_IDS;

export function isExactUnarrangedFaustianBaseline(faustian: FaustianState): boolean {
  if (faustian.faustianDeck.length !== 52) return false;
  if (faustian.devilDeck.length !== 0) return false;
  if (faustian.machinations.length !== 0) return false;
  if (faustian.defeatedSchemes.length !== 0) return false;
  if (faustian.entrustedCards.length !== 0) return false;
  if (faustian.beneathAntagonists.length !== 0) return false;
  if (faustian.possessions.length !== 0) return false;
  if (faustian.setAsideHand.length !== 0) return false;
  if (faustian.domainPlacements.length !== 0) return false;
  if (faustian.activeTwistCardIds.length !== 0) return false;
  if (faustian.conspiracies.length !== 0) return false;
  if (faustian.antagonists.length !== 0) return false;
  if (faustian.demons.length !== 0) return false;
  if (faustian.domainSeizures.length !== 0) return false;
  if (faustian.devilObligations.length !== 0) return false;
  if (faustian.resolvedFlushSuits.length !== 0) return false;
  if (faustian.persistentMachinationEffects.length !== 0) return false;
  return faustian.communities.every((community) =>
    community.pawnCount === 0
    && community.schemes.length === 0
    && community.accompliceCardIds.length === 0,
  );
}

export function isExactStructuralHelperFaustian(faustian: FaustianState): boolean {
  if (faustian.activeTwistCardIds.length !== 1) return false;
  if (faustian.machinations.length !== 1) return false;
  if (faustian.machinations[0]?.cardId !== faustian.activeTwistCardIds[0]) return false;
  if (faustian.machinations[0]?.facing !== "face_down") return false;
  if (faustian.faustianDeck.length !== 51) return false;
  if (faustian.devilDeck.length !== 0) return false;
  if (faustian.defeatedSchemes.length !== 0) return false;
  if (faustian.entrustedCards.length !== 0) return false;
  if (faustian.beneathAntagonists.length !== 0) return false;
  if (faustian.possessions.length !== 0) return false;
  if (faustian.setAsideHand.length !== 0) return false;
  if (faustian.domainPlacements.length !== 0) return false;
  if (faustian.conspiracies.length !== 0) return false;
  if (faustian.antagonists.length !== 0) return false;
  if (faustian.demons.length !== 0) return false;
  if (faustian.domainSeizures.length !== 0) return false;
  if (faustian.devilObligations.length !== 0) return false;
  if (faustian.resolvedFlushSuits.length !== 0) return false;
  if (faustian.persistentMachinationEffects.length !== 0) return false;
  if (faustian.selectedDevilLawIds.length !== 2) return false;
  const formCount = faustian.selectedDevilForms.casual.length
    + faustian.selectedDevilForms.special.length
    + faustian.selectedDevilForms.duress.length;
  if (formCount !== 6) return false;
  if (faustian.selectedDevilForms.casual.length !== 3) return false;
  if (faustian.selectedDevilForms.special.length !== 2) return false;
  if (faustian.selectedDevilForms.duress.length !== 1) return false;
  return faustian.communities.every((community) =>
    community.pawnCount === 0
    && community.schemes.length === 0
    && community.accompliceCardIds.length === 0,
  );
}

export { FAUSTIAN_COMMUNITY_DEFINITIONS, FAUSTIAN_SOURCE_WORDING_OMISSION };
