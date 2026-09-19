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
  FaustianRank,
  FaustianMachinationOutcomeResult,
  FaustianPersistentFullHouseRank,
  FaustianState,
  FaustianSuit,
  FaustianTwistDispositionDestination,
  LoreSubjectRef,
  PactSeatId,
  SorcererExternalPresence,
  WizardId,
} from "../shared/domain";
import {
  FAUSTIAN_COMMUNITY_DEFINITIONS,
  FAUSTIAN_COMMUNITY_IDS,
  FAUSTIAN_RANK_GLYPHS,
  FAUSTIAN_SUITS,
  faustianCardSourceReference,
  faustianCommunityHeader,
  FAUSTIAN_SOURCE_WORDING_OMISSION,
  loreSubjectRefsEqual,
  pactSeatDisplayName,
  isExactUnarrangedFaustianBaseline,
  isExactStructuralHelperFaustian,
  faustianChallengeScheduleLabel,
  reservedFaustianActiveTwistCardIds,
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
export const ACTIVE_TWIST_TREATMENT_LABEL = "Active Twist";
export const RESERVED_TWIST_TREATMENT_LABEL = "Reserved Twist";
export const ACTIVE_TWIST_SPOTLIGHT_LABEL =
  "Same physical card as the highlighted Machinations card. This panel is a reference, not a second copy.";
export const PRIVATE_TWIST_INSPECT_LABEL = "Inspect Twist privately";
export const PRIVATE_TWIST_INSPECT_HINT =
  "Local-only view. Does not flip the card, send a command, or write an event.";
export const FACEDOWN_SCHEME_SUPPLY_LABEL = "Facedown Scheme from Devil's Deck";
export const FACEDOWN_ACCOMPLICE_SUPPLY_LABEL = "Facedown Accomplice from Faustian's Deck";
export const SCHEME_CONSEQUENCE_GLANCE_FALLBACK = "See Scheme consequence";
export const ACE_ACCOMPLICE_PROTECTION_GLANCE = "Prevents except 2";

function cardRank(cardId: FaustianCardId): FaustianRank {
  return cardId.slice(cardId.indexOf("_") + 1) as FaustianRank;
}

export function faustianAccompliceProtectionGlance(cardId: FaustianCardId): string {
  const rank = cardRank(cardId);
  if (rank === "ace") return ACE_ACCOMPLICE_PROTECTION_GLANCE;
  return `Prevents ≤${FAUSTIAN_RANK_GLYPHS[rank]}`;
}

export function faustianSchemeGlanceLine(cardId: FaustianCardId): string {
  if (faustianCardSourceReference(cardId).scheme.wordingStatus === "source_transcription_deferred") {
    return SCHEME_CONSEQUENCE_GLANCE_FALLBACK;
  }
  return SCHEME_CONSEQUENCE_GLANCE_FALLBACK;
}

export function faustianAccompliceGlanceLine(cardId: FaustianCardId): string {
  return faustianAccompliceProtectionGlance(cardId);
}

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
  readonly rankSuitGlyph: string;
  readonly roleKindLabel: string;
  readonly glanceLine: string;
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
  readonly schemeFaceUpCount: number;
  readonly schemeFaceDownCount: number;
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

export interface FaustianMachinationPresentation {
  readonly card: FaustianPublicCardPresentation;
  readonly isActiveTwist: boolean;
  readonly isReservedTwist: boolean;
  readonly treatmentLabel: string | null;
}

export interface FaustianPendingChallengeGroupPresentation {
  readonly groupId: string;
  readonly status: "pending" | "completed";
  readonly responsibleWizardId: string | null;
  readonly responsibleWizardName: string | null;
  readonly completedByWizardName: string | null;
}

export interface FaustianPendingChallengePresentation {
  readonly challengeId: string;
  readonly kindLabel: string;
  readonly sourceMonthOrdinal: number;
  readonly dueMonthOrdinal: number;
  readonly scheduleLabel: "upcoming" | "due_this_month" | "overdue";
  readonly groups: readonly FaustianPendingChallengeGroupPresentation[];
  readonly reservedTwistCount: number;
}

export interface FaustianTwistSpotlightPresentation {
  readonly index: number;
  readonly machinationInstanceKey: string;
  readonly facing: FaustianCardFacing;
  readonly publicLabel: string;
  readonly ariaLabel: string;
  readonly inspectablePrivately: boolean;
  readonly relationshipLabel: string;
}

export interface FaustianMissingSuitPresentation {
  readonly suit: FaustianSuit;
  readonly label: string;
}

export interface FaustianObligationCuePresentation {
  readonly key: string;
  readonly label: string;
  readonly wizardId: string;
  readonly dueMonthOrdinal: number;
  readonly weeks: number;
  readonly scheduleLabel: "upcoming" | "due_this_month" | "overdue";
  readonly imminent: boolean;
}

export interface FaustianTablePresentation {
  readonly communities: readonly FaustianCommunityPresentation[];
  readonly faustianDeckCount: number;
  readonly devilDeckCount: number;
  readonly devilDeckEmpty: boolean;
  readonly missingSuits: readonly FaustianMissingSuitPresentation[];
  readonly obligationCues: readonly FaustianObligationCuePresentation[];
  readonly suitSummaries: readonly FaustianSuitSummaryPresentation[];
  readonly twists: readonly FaustianTwistSpotlightPresentation[];
  readonly machinations: readonly FaustianMachinationPresentation[];
  readonly defeatedSchemes: readonly FaustianPublicCardPresentation[];
  readonly heldCards: readonly FaustianPublicCardPresentation[];
  readonly entrustedCards: readonly FaustianLocatedCardPresentation[];
  readonly possessionCards: readonly FaustianLocatedCardPresentation[];
  readonly domainPlacements: readonly FaustianLocatedCardPresentation[];
  readonly pendingChallenges: readonly FaustianPendingChallengePresentation[];
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

function roleKindLabel(kind: FaustianPublicCardKind): string {
  if (kind === "scheme") return "Scheme";
  if (kind === "accomplice") return "Accomplice";
  if (kind === "twist") return "Twist";
  if (kind === "machination") return "Machination";
  if (kind === "defeated") return "Defeated";
  if (kind === "held") return "Held";
  if (kind === "entrusted") return "Entrusted";
  if (kind === "possession") return "Possession";
  return "Domain";
}

function revealed(
  kind: FaustianPublicCardKind,
  cardId: FaustianCardId,
  instanceKey: string,
  extraAria?: string,
  glanceLine = "Face-up",
): FaustianRevealedCardPresentation {
  const reference = faustianCardSourceReference(cardId);
  const role = roleKindLabel(kind);
  const glyph = reference.rankSuitGlyph;
  const publicLabel = glyph;
  const syndicateLabel = kind === "accomplice" ? reference.accomplice.syndicate : null;
  const roleLabel = kind === "accomplice" ? reference.accomplice.role : null;
  const detail = `${glyph} ${reference.faceUpIdentityLabel}`;
  return {
    kind,
    facing: "face_up",
    cardId,
    publicLabel,
    ariaLabel: extraAria === undefined ? detail : `${extraAria}: ${detail}`,
    instanceKey,
    identityLabel: reference.faceUpIdentityLabel,
    rankSuitGlyph: glyph,
    roleKindLabel: role,
    glanceLine,
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
  return revealed("scheme", cardId, instanceKey, "Scheme", faustianSchemeGlanceLine(cardId));
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

function challengeKindLabel(kind: FaustianState["pendingMachinationChallenges"][number]["kind"]): string {
  if (kind === "one_pair") return "One Pair";
  if (kind === "two_pair") return "Two Pair";
  return "Three of a Kind";
}

export function buildFaustianTablePresentation(args: {
  readonly faustian: FaustianState;
  readonly sorcererPresence?: readonly SorcererExternalPresence[];
  readonly denizens?: readonly DenizenRef[];
  readonly wizards?: readonly NamedWizardRef[];
  readonly currentMonthOrdinal?: number;
}): FaustianTablePresentation {
  const faustian = args.faustian;
  const denizens = args.denizens ?? [];
  const wizards = args.wizards ?? [];
  const presence = args.sorcererPresence ?? [];
  const reservedTwists = new Set(reservedFaustianActiveTwistCardIds(faustian));
  const currentMonthOrdinal = args.currentMonthOrdinal ?? 0;

  const communities = FAUSTIAN_COMMUNITY_IDS.map((communityId, index) => {
    const state = faustian.communities.find((community) => community.communityId === communityId)
      ?? { communityId, pawnCount: 0, schemes: [], accompliceCardIds: [] };
    const header = faustianCommunityHeader(communityId);
    const schemes = state.schemes.map((scheme, schemeIndex) =>
      schemePresentation(scheme.cardId, scheme.facing, communityId, schemeIndex),
    );
    const accomplices = state.accompliceCardIds.map((cardId, accompliceIndex) =>
      revealed(
        "accomplice",
        cardId,
        `accomplice:${communityId}:${accompliceIndex}`,
        "Accomplice",
        faustianAccompliceGlanceLine(cardId),
      ),
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
      schemeFaceUpCount: state.schemes.filter((scheme) => scheme.facing === "face_up").length,
      schemeFaceDownCount: state.schemes.filter((scheme) => scheme.facing === "face_down").length,
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

  const machinations = faustian.machinations.map((card, index) => {
    const instanceKey = `machination:${index}`;
    const isActiveTwist = faustian.activeTwistCardIds.includes(card.cardId);
    const isReservedTwist = reservedTwists.has(card.cardId);
    const treatmentLabel = isReservedTwist
      ? RESERVED_TWIST_TREATMENT_LABEL
      : isActiveTwist ? ACTIVE_TWIST_TREATMENT_LABEL : null;
    if (card.facing === "face_down") {
      const publicLabel = isReservedTwist
        ? `${FACEDOWN_MACHINATION_LABEL} · ${RESERVED_TWIST_TREATMENT_LABEL}`
        : isActiveTwist
        ? `${FACEDOWN_MACHINATION_LABEL} · ${ACTIVE_TWIST_TREATMENT_LABEL}`
        : FACEDOWN_MACHINATION_LABEL;
      return {
        card: concealed("machination", publicLabel, instanceKey),
        isActiveTwist,
        isReservedTwist,
        treatmentLabel,
      };
    }
    return {
      card: revealed(
        "machination",
        card.cardId,
        instanceKey,
        isReservedTwist
          ? `Machination · ${RESERVED_TWIST_TREATMENT_LABEL}`
          : isActiveTwist ? `Machination · ${ACTIVE_TWIST_TREATMENT_LABEL}` : "Machination",
        isReservedTwist ? RESERVED_TWIST_TREATMENT_LABEL : isActiveTwist ? ACTIVE_TWIST_TREATMENT_LABEL : "In Machinations",
      ),
      isActiveTwist,
      isReservedTwist,
      treatmentLabel,
    };
  });

  const twists = faustian.activeTwistCardIds.map((cardId, index) => {
    const machinationIndex = faustian.machinations.findIndex((entry) => entry.cardId === cardId);
    const machination = machinationIndex >= 0 ? faustian.machinations[machinationIndex] : undefined;
    const facing = machination?.facing ?? "face_down";
    const identity = faustianCardSourceReference(cardId).faceUpIdentityLabel;
    return {
      index,
      machinationInstanceKey: machinationIndex >= 0 ? `machination:${machinationIndex}` : `twist-ref:${index}`,
      facing,
      publicLabel: facing === "face_down" ? FACEDOWN_TWIST_LABEL : identity,
      ariaLabel: facing === "face_down" ? FACEDOWN_TWIST_LABEL : `Active Twist reference: ${identity}`,
      inspectablePrivately: facing === "face_down",
      relationshipLabel: ACTIVE_TWIST_SPOTLIGHT_LABEL,
    };
  });

  const obligationCues = faustian.devilObligations.flatMap((obligation) => {
    if (obligation.kind !== "wizard_owes_week_due_month") return [];
    const scheduleLabel = faustianChallengeScheduleLabel(
      obligation.dueMonthOrdinal,
      currentMonthOrdinal as never,
    );
    return [{
      key: `${obligation.wizardId}:${obligation.dueMonthOrdinal}`,
      label: `${wizardName(wizards, obligation.wizardId)} owes ${obligation.weeks} week${obligation.weeks === 1 ? "" : "s"}`,
      wizardId: obligation.wizardId,
      dueMonthOrdinal: obligation.dueMonthOrdinal,
      weeks: obligation.weeks,
      scheduleLabel,
      imminent: scheduleLabel !== "upcoming",
    }];
  });

  return {
    communities,
    faustianDeckCount: faustian.faustianDeck.length,
    devilDeckCount: faustian.devilDeck.length,
    devilDeckEmpty: faustian.devilDeck.length === 0,
    missingSuits: suitSummaries
      .filter((suit) => suit.faustianDeckCount === 0)
      .map((suit) => ({ suit: suit.suit, label: suit.label })),
    obligationCues,
    suitSummaries,
    twists,
    machinations,
    defeatedSchemes: faustian.defeatedSchemes.map((cardId, index) =>
      revealed("defeated", cardId, `defeated:${index}`, "Defeated Scheme", "Defeated pile"),
    ),
    heldCards: faustian.setAsideHand.map((cardId, index) =>
      revealed("held", cardId, `held:${index}`, "Held card", "Held aside"),
    ),
    entrustedCards: faustian.entrustedCards.map((card, index) => ({
      ...revealed("entrusted", card.cardId, `entrusted:${index}`, "Entrusted card", `Entrusted to ${wizardName(wizards, card.wizardId)}`),
      locationLabel: `Entrusted to ${wizardName(wizards, card.wizardId)}`,
    })),
    possessionCards: faustian.possessions.map((card, index) => ({
      ...revealed("possession", card.cardId, `possession:${index}`, "Possession card", `Possession of ${wizardName(wizards, card.wizardId)}`),
      locationLabel: `Possession of ${wizardName(wizards, card.wizardId)}`,
    })),
    domainPlacements: faustian.domainPlacements.map((card, index) => ({
      ...revealed("domain", card.cardId, `domain:${index}`, "Domain-placed card", `${pactSeatDisplayName(card.seatId as PactSeatId)} Domain`),
      locationLabel: `${pactSeatDisplayName(card.seatId as PactSeatId)} Domain`,
    })),
    pendingChallenges: faustian.pendingMachinationChallenges.map((challenge) => ({
      challengeId: challenge.challengeId,
      kindLabel: challengeKindLabel(challenge.kind),
      sourceMonthOrdinal: challenge.sourceMonthOrdinal,
      dueMonthOrdinal: challenge.dueMonthOrdinal,
      scheduleLabel: faustianChallengeScheduleLabel(challenge.dueMonthOrdinal, currentMonthOrdinal as never),
      groups: challenge.groups.map((group) => ({
        groupId: group.groupId,
        status: group.status,
        responsibleWizardId: group.responsibleWizardId,
        responsibleWizardName: group.responsibleWizardId === null ? null : wizardName(wizards, group.responsibleWizardId),
        completedByWizardName: group.completedByWizardId === null ? null : wizardName(wizards, group.completedByWizardId),
      })),
      reservedTwistCount: challenge.outcomeDependentTwistCardIds.length,
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
    revealed(
      "accomplice",
      cardId,
      `accomplice:${communityId}:${index}`,
      "Accomplice",
      faustianAccompliceGlanceLine(cardId),
    ),
  );
}

export function privateTwistInspection(
  faustian: FaustianState,
  twistIndex: number,
): FaustianRevealedCardPresentation | null {
  const cardId = faustian.activeTwistCardIds[twistIndex];
  if (cardId === undefined) return null;
  return revealed("twist", cardId, `private-twist:${twistIndex}`, "Private Twist view", "Private view");
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

export { isExactUnarrangedFaustianBaseline, isExactStructuralHelperFaustian };

export function cloneFaustianState(faustian: FaustianState): FaustianState {
  return structuredClone(faustian);
}

export function isFaustianSchemeOccurrenceConfirmReady(args: {
  readonly schemeCardId: string;
  readonly requiresExplicitDirectSet: boolean;
  readonly selectedDirectCount: number;
}): boolean {
  if (args.schemeCardId === "") return false;
  if (args.requiresExplicitDirectSet && args.selectedDirectCount === 0) return false;
  return true;
}

export type FaustianMachinationOutcomeDraftInput = {
  readonly selectedScoring: readonly FaustianCardId[];
  readonly resultKind: FaustianMachinationOutcomeResult["kind"];
  readonly outcomeTwists: readonly FaustianCardId[];
  readonly twoPairA: readonly FaustianCardId[];
  readonly twoPairB: readonly FaustianCardId[];
  readonly wizardA: string;
  readonly wizardB: string;
  readonly wizardC: string;
  readonly threeA: FaustianCardId | "";
  readonly threeB: FaustianCardId | "";
  readonly threeC: FaustianCardId | "";
  readonly twistDestination: FaustianTwistDispositionDestination;
  readonly activeTwistCardIds: readonly FaustianCardId[];
};

function cardRankFromId(cardId: FaustianCardId): string {
  return cardId.slice(cardId.indexOf("_") + 1);
}

function cardSuitFromId(cardId: FaustianCardId): string {
  return cardId.slice(0, cardId.indexOf("_"));
}

function matchingPair(cardIds: readonly FaustianCardId[]): boolean {
  return cardIds.length === 2 && cardRankFromId(cardIds[0]!) === cardRankFromId(cardIds[1]!);
}

function immediateTwistDispositions(
  draft: FaustianMachinationOutcomeDraftInput,
): { readonly cardId: FaustianCardId; readonly destination: FaustianTwistDispositionDestination }[] {
  const reserved = new Set<FaustianCardId>();
  const dispositions: { readonly cardId: FaustianCardId; readonly destination: FaustianTwistDispositionDestination }[] = [];
  for (const cardId of [...draft.outcomeTwists, ...draft.selectedScoring]) {
    if (reserved.has(cardId)) continue;
    if (!draft.outcomeTwists.includes(cardId) && !draft.activeTwistCardIds.includes(cardId)) continue;
    reserved.add(cardId);
    dispositions.push({ cardId, destination: draft.twistDestination });
  }
  return dispositions;
}

export function isFaustianMachinationOutcomeDraftReady(draft: FaustianMachinationOutcomeDraftInput): boolean {
  if (draft.selectedScoring.length === 0) return false;
  if (draft.resultKind === "two_pair") {
    const overlap = draft.twoPairA.some((cardId) => draft.twoPairB.includes(cardId));
    return matchingPair(draft.twoPairA)
      && matchingPair(draft.twoPairB)
      && !overlap
      && draft.wizardA !== ""
      && draft.wizardB !== ""
      && draft.wizardA !== draft.wizardB;
  }
  if (draft.resultKind === "three_of_a_kind") {
    const cards = [draft.threeA, draft.threeB, draft.threeC];
    const wizards = [draft.wizardA, draft.wizardB, draft.wizardC];
    return cards.every((cardId) => cardId !== "")
      && new Set(cards).size === 3
      && wizards.every((wizardId) => wizardId !== "")
      && new Set(wizards).size === 3;
  }
  return true;
}

export function buildFaustianMachinationOutcomeResult(
  draft: FaustianMachinationOutcomeDraftInput,
): FaustianMachinationOutcomeResult {
  if (draft.resultKind === "one_pair") return { kind: "one_pair" };
  if (draft.resultKind === "two_pair") {
    return {
      kind: "two_pair",
      groups: [
        { cardIds: [...draft.twoPairA], responsibleWizardId: draft.wizardA as WizardId },
        { cardIds: [...draft.twoPairB], responsibleWizardId: draft.wizardB as WizardId },
      ],
    };
  }
  if (draft.resultKind === "three_of_a_kind") {
    return {
      kind: "three_of_a_kind",
      groups: [
        { cardId: draft.threeA as FaustianCardId, responsibleWizardId: draft.wizardA as WizardId },
        { cardId: draft.threeB as FaustianCardId, responsibleWizardId: draft.wizardB as WizardId },
        { cardId: draft.threeC as FaustianCardId, responsibleWizardId: draft.wizardC as WizardId },
      ],
    };
  }
  const twistDispositions = immediateTwistDispositions(draft);
  if (draft.resultKind === "flush") {
    const suit = (cardSuitFromId(draft.selectedScoring[0] ?? "hearts_2") || "hearts") as FaustianSuit;
    return { kind: "flush", suit, twistDispositions };
  }
  if (draft.resultKind === "full_house") {
    const counts = new Map<string, FaustianCardId[]>();
    for (const cardId of draft.selectedScoring) {
      const rank = cardRankFromId(cardId);
      const existing = counts.get(rank) ?? [];
      counts.set(rank, [...existing, cardId]);
    }
    const triple = [...counts.entries()].find(([, cards]) => cards.length === 3)?.[0]
      ?? cardRankFromId(draft.selectedScoring[0] ?? "hearts_9");
    return { kind: "full_house", rank: triple as FaustianPersistentFullHouseRank, twistDispositions };
  }
  return { kind: "table_resolved", twistDispositions };
}

export function synthesizeFaustianAfterSchemeReveal(
  faustian: FaustianState,
  communityId: FaustianCommunityId,
): FaustianState {
  return {
    ...faustian,
    communities: faustian.communities.map((community) =>
      community.communityId === communityId
        ? {
          ...community,
          schemes: community.schemes.map((scheme) => ({ ...scheme, facing: "face_up" as const })),
        }
        : community
    ),
  };
}

export { FAUSTIAN_COMMUNITY_DEFINITIONS, FAUSTIAN_SOURCE_WORDING_OMISSION };
