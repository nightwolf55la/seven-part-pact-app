import type { CampaignStateV5 } from "./campaign-state";
import { DomainError } from "./errors";
import {
  isValidCompanionRelationshipId,
  isValidDenizenId,
  isValidTreasureId,
  isValidWizardId,
} from "./ids";
import { isValidPactSeatId } from "./pact-seats";
import {
  FAUSTIAN_CARD_IDS,
  FAUSTIAN_COMMUNITY_IDS,
  FAUSTIAN_ORIGIN_CLAIM_IDS,
  isValidFaustianAntagonistChipCount,
  isValidFaustianAntagonistGoal,
  isValidFaustianCardFacing,
  isValidFaustianCardId,
  isValidFaustianCommunityId,
  isValidFaustianDevilFormId,
  isValidFaustianDevilLawId,
  isValidFaustianMalignance,
  isValidFaustianOriginClaimId,
  isValidFaustianOriginClaimStatus,
} from "./faustian-catalogs";
import type { FaustianCardId, FaustianDevilFormId } from "./faustian-catalogs";
import type {
  FaustianCommunityState,
  FaustianDevilObligation,
  FaustianMachinationCard,
  FaustianPossessionRepresentation,
  FaustianSelectedDevilForms,
  FaustianState,
} from "./faustian-state";
import { requirePowerfulRoleProfile } from "./powerful-denizen-roles";

function assertNonNegativeSafeInteger(path: string, value: unknown): asserts value is number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `${path} must be a non-negative safe integer`);
  }
}

function assertNonEmptyString(path: string, value: unknown): asserts value is string {
  if (typeof value !== "string" || value.length === 0) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `${path} must be a non-empty string`);
  }
}

function uniqueIds(ids: readonly string[], label: string): void {
  const seen = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `Duplicate ${label}: ${id}`);
    }
    seen.add(id);
  }
}

function requireCardId(path: string, value: unknown): FaustianCardId {
  if (typeof value !== "string" || !isValidFaustianCardId(value)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `${path} is not a canonical Faustian card: ${JSON.stringify(value)}`);
  }
  return value;
}

function requireFacing(path: string, value: unknown): void {
  if (typeof value !== "string" || !isValidFaustianCardFacing(value)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `${path} facing is invalid: ${JSON.stringify(value)}`);
  }
}

function validateCommunities(communities: unknown): readonly FaustianCommunityState[] {
  if (!Array.isArray(communities)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "faustian.communities must be an array");
  }
  if (communities.length !== FAUSTIAN_COMMUNITY_IDS.length) {
    throw new DomainError(
      "INVALID_CAMPAIGN_STATE",
      `faustian.communities must contain exactly the ${FAUSTIAN_COMMUNITY_IDS.length} operational Communities`,
    );
  }
  const seen = new Set<string>();
  for (let i = 0; i < communities.length; i++) {
    const community = communities[i];
    const path = `faustian.communities[${i}]`;
    if (community === null || community === undefined || typeof community !== "object") {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path} must be an object`);
    }
    const c = community as Record<string, unknown>;
    if (typeof c.communityId !== "string" || !isValidFaustianCommunityId(c.communityId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.communityId is invalid: ${JSON.stringify(c.communityId)}`);
    }
    if (seen.has(c.communityId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `Duplicate Faustian Community: ${c.communityId}`);
    }
    seen.add(c.communityId);
    assertNonNegativeSafeInteger(`${path}.pawnCount`, c.pawnCount);
    if (!Array.isArray(c.schemes)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.schemes must be an array`);
    }
    for (let j = 0; j < c.schemes.length; j++) {
      const scheme = c.schemes[j];
      const schemePath = `${path}.schemes[${j}]`;
      if (scheme === null || scheme === undefined || typeof scheme !== "object") {
        throw new DomainError("INVALID_CAMPAIGN_STATE", `${schemePath} must be an object`);
      }
      const s = scheme as Record<string, unknown>;
      requireCardId(`${schemePath}.cardId`, s.cardId);
      requireFacing(schemePath, s.facing);
    }
    uniqueIds((c.schemes as Array<{ cardId: string }>).map((scheme) => scheme.cardId), `${path} scheme card`);
    if (!Array.isArray(c.accompliceCardIds)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.accompliceCardIds must be an array`);
    }
    const accompliceCardIds = (c.accompliceCardIds as unknown[]).map((cardId, j) =>
      requireCardId(`${path}.accompliceCardIds[${j}]`, cardId),
    );
    uniqueIds(accompliceCardIds, `${path} Accomplice card`);
  }
  for (const communityId of FAUSTIAN_COMMUNITY_IDS) {
    if (!seen.has(communityId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `Missing Faustian Community: ${communityId}`);
    }
  }
  return communities as FaustianCommunityState[];
}

function validateMachinations(value: unknown): readonly FaustianMachinationCard[] {
  if (!Array.isArray(value)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "faustian.machinations must be an array");
  }
  for (let i = 0; i < value.length; i++) {
    const entry = value[i];
    const path = `faustian.machinations[${i}]`;
    if (entry === null || entry === undefined || typeof entry !== "object") {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path} must be an object`);
    }
    const m = entry as Record<string, unknown>;
    requireCardId(`${path}.cardId`, m.cardId);
    requireFacing(path, m.facing);
  }
  uniqueIds((value as FaustianMachinationCard[]).map((entry) => entry.cardId), "Faustian Machination card");
  return value as FaustianMachinationCard[];
}

function validateCardIdArray(path: string, value: unknown): readonly FaustianCardId[] {
  if (!Array.isArray(value)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `${path} must be an array`);
  }
  const cards = value.map((cardId, i) => requireCardId(`${path}[${i}]`, cardId));
  uniqueIds(cards, path);
  return cards;
}

function validatePossessionRepresentation(path: string, value: unknown): FaustianPossessionRepresentation {
  if (value === null || value === undefined || typeof value !== "object") {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `${path} must be an object`);
  }
  const represented = value as Record<string, unknown>;
  if (represented.kind === "none") {
    return { kind: "none" };
  }
  if (represented.kind === "denizen") {
    if (typeof represented.denizenId !== "string" || !isValidDenizenId(represented.denizenId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.denizenId is invalid: ${JSON.stringify(represented.denizenId)}`);
    }
    return { kind: "denizen", denizenId: represented.denizenId };
  }
  if (represented.kind === "treasure") {
    if (typeof represented.treasureId !== "string" || !isValidTreasureId(represented.treasureId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.treasureId is invalid: ${JSON.stringify(represented.treasureId)}`);
    }
    return { kind: "treasure", treasureId: represented.treasureId };
  }
  throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.kind is invalid: ${JSON.stringify(represented.kind)}`);
}

function obligationKey(obligation: FaustianDevilObligation): string {
  switch (obligation.kind) {
    case "wizard_owes_week_next_month":
      return `${obligation.kind}:${obligation.wizardId}`;
    case "wizard_owes_week_monthly_while_denizen_alive":
      return `${obligation.kind}:${obligation.wizardId}:${obligation.denizenId}`;
    case "monthly_card_drain_while_powerful_in_isha":
      return `${obligation.kind}:${obligation.denizenId}`;
    case "recurring_devil_time_while_magic_trace":
      return `${obligation.kind}:${obligation.traceDescription}`;
    case "recurring_devil_time_in_domain_while_companion_care":
      return `${obligation.kind}:${obligation.wizardId}:${obligation.companionRelationshipId}`;
    case "monthly_card_drain_while_wizard_alive":
      return `${obligation.kind}:${obligation.wizardId}`;
  }
}

function validateObligation(path: string, value: unknown): FaustianDevilObligation {
  if (value === null || value === undefined || typeof value !== "object") {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `${path} must be an object`);
  }
  const obligation = value as Record<string, unknown>;
  if (obligation.kind === "wizard_owes_week_next_month" || obligation.kind === "monthly_card_drain_while_wizard_alive") {
    if (typeof obligation.wizardId !== "string" || !isValidWizardId(obligation.wizardId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.wizardId is invalid: ${JSON.stringify(obligation.wizardId)}`);
    }
    return { kind: obligation.kind, wizardId: obligation.wizardId };
  }
  if (obligation.kind === "wizard_owes_week_monthly_while_denizen_alive") {
    if (typeof obligation.wizardId !== "string" || !isValidWizardId(obligation.wizardId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.wizardId is invalid: ${JSON.stringify(obligation.wizardId)}`);
    }
    if (typeof obligation.denizenId !== "string" || !isValidDenizenId(obligation.denizenId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.denizenId is invalid: ${JSON.stringify(obligation.denizenId)}`);
    }
    return {
      kind: "wizard_owes_week_monthly_while_denizen_alive",
      wizardId: obligation.wizardId,
      denizenId: obligation.denizenId,
    };
  }
  if (obligation.kind === "monthly_card_drain_while_powerful_in_isha") {
    if (typeof obligation.denizenId !== "string" || !isValidDenizenId(obligation.denizenId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.denizenId is invalid: ${JSON.stringify(obligation.denizenId)}`);
    }
    return { kind: "monthly_card_drain_while_powerful_in_isha", denizenId: obligation.denizenId };
  }
  if (obligation.kind === "recurring_devil_time_while_magic_trace") {
    assertNonEmptyString(`${path}.traceDescription`, obligation.traceDescription);
    return { kind: "recurring_devil_time_while_magic_trace", traceDescription: obligation.traceDescription };
  }
  if (obligation.kind === "recurring_devil_time_in_domain_while_companion_care") {
    if (typeof obligation.wizardId !== "string" || !isValidWizardId(obligation.wizardId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.wizardId is invalid: ${JSON.stringify(obligation.wizardId)}`);
    }
    if (typeof obligation.companionRelationshipId !== "string" || !isValidCompanionRelationshipId(obligation.companionRelationshipId)) {
      throw new DomainError(
        "INVALID_CAMPAIGN_STATE",
        `${path}.companionRelationshipId is invalid: ${JSON.stringify(obligation.companionRelationshipId)}`,
      );
    }
    return {
      kind: "recurring_devil_time_in_domain_while_companion_care",
      wizardId: obligation.wizardId,
      companionRelationshipId: obligation.companionRelationshipId,
    };
  }
  throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.kind is invalid: ${JSON.stringify(obligation.kind)}`);
}

function collectLocatedCards(faustian: FaustianState): string[] {
  const located: string[] = [];
  located.push(...faustian.faustianDeck);
  located.push(...faustian.devilDeck);
  for (const community of faustian.communities) {
    for (const scheme of community.schemes) located.push(scheme.cardId);
    located.push(...community.accompliceCardIds);
  }
  for (const card of faustian.machinations) located.push(card.cardId);
  located.push(...faustian.defeatedSchemes);
  for (const card of faustian.entrustedCards) located.push(card.cardId);
  for (const card of faustian.beneathAntagonists) located.push(card.cardId);
  for (const card of faustian.possessions) located.push(card.cardId);
  located.push(...faustian.setAsideHand);
  for (const card of faustian.domainPlacements) located.push(card.cardId);
  return located;
}

export function validateFaustianStructure(faustian: unknown): void {
  if (faustian === null || faustian === undefined || typeof faustian !== "object") {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "Missing or invalid faustian");
  }
  const f = faustian as Record<string, unknown>;

  if (!Array.isArray(f.faustianDeck)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "faustian.faustianDeck must be an array");
  }
  if (!Array.isArray(f.devilDeck)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "faustian.devilDeck must be an array");
  }
  const faustianDeck = validateCardIdArray("faustian.faustianDeck", f.faustianDeck);
  const devilDeck = validateCardIdArray("faustian.devilDeck", f.devilDeck);
  const communities = validateCommunities(f.communities);
  const machinations = validateMachinations(f.machinations);
  const defeatedSchemes = validateCardIdArray("faustian.defeatedSchemes", f.defeatedSchemes);

  if (!Array.isArray(f.entrustedCards)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "faustian.entrustedCards must be an array");
  }
  for (let i = 0; i < f.entrustedCards.length; i++) {
    const card = f.entrustedCards[i];
    const path = `faustian.entrustedCards[${i}]`;
    if (card === null || card === undefined || typeof card !== "object") {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path} must be an object`);
    }
    const c = card as Record<string, unknown>;
    requireCardId(`${path}.cardId`, c.cardId);
    if (typeof c.wizardId !== "string" || !isValidWizardId(c.wizardId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.wizardId is invalid: ${JSON.stringify(c.wizardId)}`);
    }
  }

  if (!Array.isArray(f.beneathAntagonists)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "faustian.beneathAntagonists must be an array");
  }
  for (let i = 0; i < f.beneathAntagonists.length; i++) {
    const card = f.beneathAntagonists[i];
    const path = `faustian.beneathAntagonists[${i}]`;
    if (card === null || card === undefined || typeof card !== "object") {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path} must be an object`);
    }
    const c = card as Record<string, unknown>;
    requireCardId(`${path}.cardId`, c.cardId);
    if (typeof c.denizenId !== "string" || !isValidDenizenId(c.denizenId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.denizenId is invalid: ${JSON.stringify(c.denizenId)}`);
    }
  }

  if (!Array.isArray(f.possessions)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "faustian.possessions must be an array");
  }
  for (let i = 0; i < f.possessions.length; i++) {
    const card = f.possessions[i];
    const path = `faustian.possessions[${i}]`;
    if (card === null || card === undefined || typeof card !== "object") {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path} must be an object`);
    }
    const c = card as Record<string, unknown>;
    requireCardId(`${path}.cardId`, c.cardId);
    if (typeof c.wizardId !== "string" || !isValidWizardId(c.wizardId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.wizardId is invalid: ${JSON.stringify(c.wizardId)}`);
    }
    validatePossessionRepresentation(`${path}.represented`, c.represented);
  }

  const setAsideHand = validateCardIdArray("faustian.setAsideHand", f.setAsideHand);

  if (!Array.isArray(f.domainPlacements)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "faustian.domainPlacements must be an array");
  }
  for (let i = 0; i < f.domainPlacements.length; i++) {
    const card = f.domainPlacements[i];
    const path = `faustian.domainPlacements[${i}]`;
    if (card === null || card === undefined || typeof card !== "object") {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path} must be an object`);
    }
    const c = card as Record<string, unknown>;
    requireCardId(`${path}.cardId`, c.cardId);
    if (typeof c.seatId !== "string" || !isValidPactSeatId(c.seatId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.seatId is invalid: ${JSON.stringify(c.seatId)}`);
    }
    validatePossessionRepresentation(`${path}.represented`, c.represented);
  }
  uniqueIds((f.domainPlacements as Array<{ cardId: string }>).map((card) => card.cardId), "Faustian Domain-placed card");

  if (!Array.isArray(f.activeTwistCardIds)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "faustian.activeTwistCardIds must be an array");
  }
  const activeTwistCardIds = validateCardIdArray("faustian.activeTwistCardIds", f.activeTwistCardIds);
  const machinationIds = new Set(machinations.map((card) => card.cardId));
  for (const twistId of activeTwistCardIds) {
    if (!machinationIds.has(twistId)) {
      throw new DomainError(
        "INVALID_CAMPAIGN_STATE",
        `faustian.activeTwistCardIds active Twist must reference a card in Devil's Machinations: ${twistId}`,
      );
    }
  }

  if (!Array.isArray(f.conspiracies)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "faustian.conspiracies must be an array");
  }
  for (let i = 0; i < f.conspiracies.length; i++) {
    const conspiracy = f.conspiracies[i];
    const path = `faustian.conspiracies[${i}]`;
    if (conspiracy === null || conspiracy === undefined || typeof conspiracy !== "object") {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path} must be an object`);
    }
    const c = conspiracy as Record<string, unknown>;
    if (typeof c.denizenId !== "string" || !isValidDenizenId(c.denizenId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.denizenId is invalid: ${JSON.stringify(c.denizenId)}`);
    }
    if (typeof c.communityId !== "string" || !isValidFaustianCommunityId(c.communityId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.communityId is invalid: ${JSON.stringify(c.communityId)}`);
    }
  }
  uniqueIds((f.conspiracies as Array<{ denizenId: string }>).map((c) => c.denizenId), "Faustian Conspiracy");

  if (!Array.isArray(f.antagonists)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "faustian.antagonists must be an array");
  }
  for (let i = 0; i < f.antagonists.length; i++) {
    const antagonist = f.antagonists[i];
    const path = `faustian.antagonists[${i}]`;
    if (antagonist === null || antagonist === undefined || typeof antagonist !== "object") {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path} must be an object`);
    }
    const a = antagonist as Record<string, unknown>;
    if (typeof a.denizenId !== "string" || !isValidDenizenId(a.denizenId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.denizenId is invalid: ${JSON.stringify(a.denizenId)}`);
    }
    if (typeof a.seatId !== "string" || !isValidPactSeatId(a.seatId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.seatId is invalid: ${JSON.stringify(a.seatId)}`);
    }
    if (typeof a.chipCount !== "number" || !isValidFaustianAntagonistChipCount(a.chipCount)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.chipCount must be 1, 2, or 3`);
    }
  }
  uniqueIds((f.antagonists as Array<{ denizenId: string }>).map((a) => a.denizenId), "Faustian Antagonist");

  if (!Array.isArray(f.demons)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "faustian.demons must be an array");
  }
  for (let i = 0; i < f.demons.length; i++) {
    const demon = f.demons[i];
    const path = `faustian.demons[${i}]`;
    if (demon === null || demon === undefined || typeof demon !== "object") {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path} must be an object`);
    }
    const d = demon as Record<string, unknown>;
    if (typeof d.denizenId !== "string" || !isValidDenizenId(d.denizenId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.denizenId is invalid: ${JSON.stringify(d.denizenId)}`);
    }
    if (d.binding === null || d.binding === undefined || typeof d.binding !== "object") {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.binding must be an object`);
    }
    const binding = d.binding as Record<string, unknown>;
    if (binding.kind === "bound") {
      // Bound Demons have no Malignance.
    } else if (binding.kind === "unbound") {
      if (typeof binding.malignance !== "string" || !isValidFaustianMalignance(binding.malignance)) {
        throw new DomainError(
          "INVALID_CAMPAIGN_STATE",
          `${path}.binding.malignance is invalid: ${JSON.stringify(binding.malignance)}`,
        );
      }
    } else {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.binding.kind is invalid: ${JSON.stringify(binding.kind)}`);
    }
    assertNonEmptyString(`${path}.form`, d.form);
    assertNonEmptyString(`${path}.hellOfOrigin`, d.hellOfOrigin);
    assertNonEmptyString(`${path}.magicalSymbol`, d.magicalSymbol);
    if (d.occupancy !== null) {
      if (d.occupancy === undefined || typeof d.occupancy !== "object") {
        throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.occupancy must be an object or null`);
      }
      const occupancy = d.occupancy as Record<string, unknown>;
      if (occupancy.kind === "isha") {
        // ok
      } else if (occupancy.kind === "pact_domain") {
        if (typeof occupancy.seatId !== "string" || !isValidPactSeatId(occupancy.seatId)) {
          throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.occupancy.seatId is invalid: ${JSON.stringify(occupancy.seatId)}`);
        }
      } else {
        throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.occupancy.kind is invalid: ${JSON.stringify(occupancy.kind)}`);
      }
    }
    assertNonNegativeSafeInteger(`${path}.monthsInCurrentDomain`, d.monthsInCurrentDomain);
  }
  uniqueIds((f.demons as Array<{ denizenId: string }>).map((d) => d.denizenId), "Faustian Demon");

  if (!Array.isArray(f.domainSeizures)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "faustian.domainSeizures must be an array");
  }
  for (let i = 0; i < f.domainSeizures.length; i++) {
    const seizure = f.domainSeizures[i];
    const path = `faustian.domainSeizures[${i}]`;
    if (seizure === null || seizure === undefined || typeof seizure !== "object") {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path} must be an object`);
    }
    const s = seizure as Record<string, unknown>;
    if (typeof s.seatId !== "string" || !isValidPactSeatId(s.seatId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.seatId is invalid: ${JSON.stringify(s.seatId)}`);
    }
    if (s.seatId === "faustian") {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.seatId must be another Pact Domain, not faustian`);
    }
    if (typeof s.conduitDenizenId !== "string" || !isValidDenizenId(s.conduitDenizenId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.conduitDenizenId is invalid: ${JSON.stringify(s.conduitDenizenId)}`);
    }
  }
  uniqueIds((f.domainSeizures as Array<{ seatId: string }>).map((s) => s.seatId), "Faustian Domain seizure");

  if (!Array.isArray(f.selectedDevilLawIds)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "faustian.selectedDevilLawIds must be an array");
  }
  for (let i = 0; i < f.selectedDevilLawIds.length; i++) {
    const lawId = f.selectedDevilLawIds[i];
    if (typeof lawId !== "string" || !isValidFaustianDevilLawId(lawId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `faustian.selectedDevilLawIds[${i}] is invalid: ${JSON.stringify(lawId)}`);
    }
  }
  uniqueIds(f.selectedDevilLawIds as string[], "Faustian Law");

  if (f.selectedDevilForms === null || f.selectedDevilForms === undefined || typeof f.selectedDevilForms !== "object") {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "faustian.selectedDevilForms must be an object");
  }
  const selectedDevilForms = f.selectedDevilForms as Record<string, unknown>;
  function validateFormOccasion(occasion: "casual" | "special" | "duress"): readonly FaustianDevilFormId[] {
    const value = selectedDevilForms[occasion];
    if (!Array.isArray(value)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `faustian.selectedDevilForms.${occasion} must be an array`);
    }
    for (let i = 0; i < value.length; i++) {
      const formId = value[i];
      if (typeof formId !== "string" || !isValidFaustianDevilFormId(formId)) {
        throw new DomainError(
          "INVALID_CAMPAIGN_STATE",
          `faustian.selectedDevilForms.${occasion}[${i}] is invalid: ${JSON.stringify(formId)}`,
        );
      }
    }
    return value as FaustianDevilFormId[];
  }
  const selectedForms: FaustianSelectedDevilForms = {
    casual: validateFormOccasion("casual"),
    special: validateFormOccasion("special"),
    duress: validateFormOccasion("duress"),
  };
  uniqueIds([...selectedForms.casual, ...selectedForms.special, ...selectedForms.duress], "Faustian Devil form");

  if (!Array.isArray(f.originClaims)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "faustian.originClaims must be an array");
  }
  if (f.originClaims.length !== FAUSTIAN_ORIGIN_CLAIM_IDS.length) {
    throw new DomainError(
      "INVALID_CAMPAIGN_STATE",
      `faustian.originClaims must contain exactly the ${FAUSTIAN_ORIGIN_CLAIM_IDS.length} origin/secret-name claims`,
    );
  }
  const claimIds = new Set<string>();
  for (let i = 0; i < f.originClaims.length; i++) {
    const claim = f.originClaims[i];
    const path = `faustian.originClaims[${i}]`;
    if (claim === null || claim === undefined || typeof claim !== "object") {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path} must be an object`);
    }
    const c = claim as Record<string, unknown>;
    if (typeof c.claimId !== "string" || !isValidFaustianOriginClaimId(c.claimId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.claimId is invalid: ${JSON.stringify(c.claimId)}`);
    }
    if (claimIds.has(c.claimId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `Duplicate Faustian origin claim: ${c.claimId}`);
    }
    claimIds.add(c.claimId);
    if (typeof c.status !== "string" || !isValidFaustianOriginClaimStatus(c.status)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.status is invalid: ${JSON.stringify(c.status)}`);
    }
  }
  for (const claimId of FAUSTIAN_ORIGIN_CLAIM_IDS) {
    if (!claimIds.has(claimId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `Missing Faustian origin claim: ${claimId}`);
    }
  }

  if (f.customOriginClaim !== null) {
    if (f.customOriginClaim === undefined || typeof f.customOriginClaim !== "object") {
      throw new DomainError("INVALID_CAMPAIGN_STATE", "faustian.customOriginClaim must be an object or null");
    }
    const custom = f.customOriginClaim as Record<string, unknown>;
    assertNonEmptyString("faustian.customOriginClaim.claim", custom.claim);
    if (custom.secretName !== null) {
      assertNonEmptyString("faustian.customOriginClaim.secretName", custom.secretName);
    }
    if (typeof custom.status !== "string" || !isValidFaustianOriginClaimStatus(custom.status)) {
      throw new DomainError(
        "INVALID_CAMPAIGN_STATE",
        `faustian.customOriginClaim.status is invalid: ${JSON.stringify(custom.status)}`,
      );
    }
  }

  if (!Array.isArray(f.devilObligations)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "faustian.devilObligations must be an array");
  }
  const obligationKeys = new Set<string>();
  for (let i = 0; i < f.devilObligations.length; i++) {
    const obligation = validateObligation(`faustian.devilObligations[${i}]`, f.devilObligations[i]);
    const key = obligationKey(obligation);
    if (obligationKeys.has(key)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `Duplicate Faustian Devil obligation: ${key}`);
    }
    obligationKeys.add(key);
  }

  const located = collectLocatedCards({
    ...(f as unknown as FaustianState),
    faustianDeck,
    devilDeck,
    communities,
    machinations,
    defeatedSchemes,
    setAsideHand,
  });
  const seenCards = new Set<string>();
  for (const cardId of located) {
    if (seenCards.has(cardId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `Duplicate Faustian card identity: ${cardId}`);
    }
    seenCards.add(cardId);
  }
  if (located.length !== FAUSTIAN_CARD_IDS.length || FAUSTIAN_CARD_IDS.some((cardId) => !seenCards.has(cardId))) {
    throw new DomainError(
      "INVALID_CAMPAIGN_STATE",
      "Faustian cards must be the canonical set of 52 unique identities, each located exactly once",
    );
  }
}

export function validateFaustianReferenceIntegrity(state: CampaignStateV5): void {
  validateFaustianStructure(state.faustian);
  const faustian = state.faustian;
  const denizenById = new Map(state.world.denizens.map((denizen) => [denizen.denizenId as string, denizen]));
  const wizardIds = new Set(state.wizards.map((wizard) => wizard.wizardId as string));
  const treasureIds = new Set(state.world.treasures.map((treasure) => treasure.treasureId as string));
  const companionIds = new Set(
    state.world.companionRelationships.map((relationship) => relationship.companionRelationshipId as string),
  );
  const antagonistIds = new Set(faustian.antagonists.map((antagonist) => antagonist.denizenId as string));

  for (let i = 0; i < faustian.conspiracies.length; i++) {
    const path = `faustian.conspiracies[${i}]`;
    const denizen = denizenById.get(faustian.conspiracies[i].denizenId);
    if (denizen === undefined) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.denizenId does not resolve: ${faustian.conspiracies[i].denizenId}`);
    }
    if (denizen.representation !== "collective") {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.denizenId must reference a collective Denizen`);
    }
    requirePowerfulRoleProfile(denizen, path, "conspiracy");
    if (!antagonistIds.has(faustian.conspiracies[i].denizenId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path} must also be a Faustian Antagonist`);
    }
  }

  for (let i = 0; i < faustian.antagonists.length; i++) {
    const path = `faustian.antagonists[${i}]`;
    const denizen = denizenById.get(faustian.antagonists[i].denizenId);
    if (denizen === undefined) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.denizenId does not resolve: ${faustian.antagonists[i].denizenId}`);
    }
    const profile = denizen.powerfulProfile;
    if (profile === null) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path} requires a Powerful-Denizen profile`);
    }
    if (!isValidFaustianAntagonistGoal(profile.goal ?? "")) {
      throw new DomainError(
        "INVALID_CAMPAIGN_STATE",
        `${path} shared Powerful Goal must be one of Subjugation, Calamity, Extinction, or Treachery`,
      );
    }
  }

  for (let i = 0; i < faustian.demons.length; i++) {
    const path = `faustian.demons[${i}]`;
    const denizen = denizenById.get(faustian.demons[i].denizenId);
    if (denizen === undefined) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.denizenId does not resolve: ${faustian.demons[i].denizenId}`);
    }
    if (denizen.representation !== "individual") {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.denizenId must reference an individual Denizen`);
    }
    requirePowerfulRoleProfile(denizen, path, "demon");
  }

  for (let i = 0; i < faustian.entrustedCards.length; i++) {
    const path = `faustian.entrustedCards[${i}]`;
    if (!wizardIds.has(faustian.entrustedCards[i].wizardId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.wizardId does not resolve: ${faustian.entrustedCards[i].wizardId}`);
    }
  }

  for (let i = 0; i < faustian.possessions.length; i++) {
    const path = `faustian.possessions[${i}]`;
    const possession = faustian.possessions[i];
    if (!wizardIds.has(possession.wizardId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.wizardId does not resolve: ${possession.wizardId}`);
    }
    if (possession.represented.kind === "denizen" && !denizenById.has(possession.represented.denizenId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.represented.denizenId does not resolve: ${possession.represented.denizenId}`);
    }
    if (possession.represented.kind === "treasure" && !treasureIds.has(possession.represented.treasureId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.represented.treasureId does not resolve: ${possession.represented.treasureId}`);
    }
  }

  for (let i = 0; i < faustian.domainPlacements.length; i++) {
    const path = `faustian.domainPlacements[${i}]`;
    const placement = faustian.domainPlacements[i];
    if (placement.represented.kind === "denizen" && !denizenById.has(placement.represented.denizenId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.represented.denizenId does not resolve: ${placement.represented.denizenId}`);
    }
    if (placement.represented.kind === "treasure" && !treasureIds.has(placement.represented.treasureId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.represented.treasureId does not resolve: ${placement.represented.treasureId}`);
    }
  }

  for (let i = 0; i < faustian.beneathAntagonists.length; i++) {
    const path = `faustian.beneathAntagonists[${i}]`;
    const card = faustian.beneathAntagonists[i];
    if (!antagonistIds.has(card.denizenId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.denizenId must reference a Faustian Antagonist: ${card.denizenId}`);
    }
    if (!denizenById.has(card.denizenId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.denizenId does not resolve: ${card.denizenId}`);
    }
  }

  for (let i = 0; i < faustian.domainSeizures.length; i++) {
    const path = `faustian.domainSeizures[${i}]`;
    const seizure = faustian.domainSeizures[i];
    const conduit = denizenById.get(seizure.conduitDenizenId);
    if (conduit === undefined) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.conduitDenizenId does not resolve: ${seizure.conduitDenizenId}`);
    }
    if (conduit.mortalityState === "deceased") {
      throw new DomainError(
        "INVALID_CAMPAIGN_STATE",
        `${path}.conduitDenizenId is deceased; an active Domain seizure cannot use a dead Devil conduit`,
      );
    }
  }

  for (let i = 0; i < faustian.devilObligations.length; i++) {
    const path = `faustian.devilObligations[${i}]`;
    const obligation = faustian.devilObligations[i];
    if ("wizardId" in obligation && !wizardIds.has(obligation.wizardId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.wizardId does not resolve: ${obligation.wizardId}`);
    }
    if ("denizenId" in obligation && !denizenById.has(obligation.denizenId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.denizenId does not resolve: ${obligation.denizenId}`);
    }
    if (obligation.kind === "recurring_devil_time_in_domain_while_companion_care") {
      if (!companionIds.has(obligation.companionRelationshipId)) {
        throw new DomainError(
          "INVALID_CAMPAIGN_STATE",
          `${path}.companionRelationshipId does not resolve: ${obligation.companionRelationshipId}`,
        );
      }
    }
    if (obligation.kind === "monthly_card_drain_while_powerful_in_isha") {
      const denizen = denizenById.get(obligation.denizenId);
      if (denizen === undefined || denizen.powerfulProfile === null) {
        throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.denizenId must reference a Powerful Denizen`);
      }
    }
  }
}
