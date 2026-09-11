import type { CampaignStateV5 } from "./campaign-state";
import { DomainError } from "./errors";
import { isValidDenizenId, isValidIsleId, isValidWizardId } from "./ids";
import { isValidFaustianCommunityId } from "./faustian-catalogs";
import { isValidHierophantTempleId } from "./hierophant-catalogs";
import { isValidMarinerSeaRegionId } from "./mariner-catalogs";
import { isBuiltinEdgeOfLifePathSpaceId } from "./necromancer-catalogs";
import type { HouseIndex } from "./orrery";
import { isValidPactSeatId } from "./pact-seats";
import type { PactSeatId } from "./pact-seats";
import { requirePowerfulRoleProfile } from "./powerful-denizen-roles";
import { isValidSageDreamscapeSegmentId } from "./sage-catalogs";
import type { WizardOrDenizenSubjectRef } from "./shared-world";
import {
  isValidWarlockArmyLifecycle,
  isValidWarlockClanId,
  isValidWarlockCourtCondition,
  isValidWarlockCourtLawId,
  isValidWarlockHeroFame,
  isValidWarlockHeroicTitleGlyph,
  isValidWarlockIdeologyId,
  isValidWarlockKingHealthCondition,
  isValidWarlockLordTitleId,
  isValidWarlockSourceClanId,
  type WarlockClanId,
  type WarlockLordTitleId,
} from "./warlock-catalogs";
import {
  isValidWarlockCampaignCourtLawId,
  isValidWarlockGarrisonId,
  isValidWarlockRebellionId,
  isValidWarlockRelocatedMarketId,
  warlockAuthorityTargetKey,
  type WarlockArmySponsor,
  type WarlockAuthorityTarget,
  type WarlockCampaignCourtLawId,
  type WarlockCourtLawRef,
  type WarlockErrantClaim,
  type WarlockErrantHeraldry,
  type WarlockGarrisonId,
  type WarlockPartnership,
  type WarlockRebellionId,
  type WarlockRelocatedMarketId,
} from "./warlock-state";

function requireRecord(path: string, value: unknown): Record<string, unknown> {
  if (value === null || value === undefined || typeof value !== "object") {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `${path} must be an object`);
  }
  return value as Record<string, unknown>;
}

function requireArray(path: string, value: unknown): readonly unknown[] {
  if (!Array.isArray(value)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `${path} must be an array`);
  }
  return value;
}

function assertNonEmptyString(path: string, value: unknown): asserts value is string {
  if (typeof value !== "string" || value.length === 0) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `${path} must be a non-empty string`);
  }
}

function assertBoolean(path: string, value: unknown): asserts value is boolean {
  if (typeof value !== "boolean") {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `${path} must be a boolean`);
  }
}

function assertNonNegativeSafeInteger(path: string, value: unknown): asserts value is number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `${path} must be a non-negative safe integer`);
  }
}

function assertPositiveSafeInteger(path: string, value: unknown): asserts value is number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 1) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `${path} must be a positive safe integer`);
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

function isValidHouseIndex(value: unknown): value is HouseIndex {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0 && value <= 11;
}

function validateCharacterRef(path: string, value: unknown): WizardOrDenizenSubjectRef {
  const ref = requireRecord(path, value);
  if (ref.kind === "wizard") {
    if (typeof ref.wizardId !== "string" || !isValidWizardId(ref.wizardId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.wizardId is invalid: ${JSON.stringify(ref.wizardId)}`);
    }
    return { kind: "wizard", wizardId: ref.wizardId };
  }
  if (ref.kind === "denizen") {
    if (typeof ref.denizenId !== "string" || !isValidDenizenId(ref.denizenId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.denizenId is invalid: ${JSON.stringify(ref.denizenId)}`);
    }
    return { kind: "denizen", denizenId: ref.denizenId };
  }
  throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.kind is invalid: ${JSON.stringify(ref.kind)}`);
}

function resolveCharacterRef(
  path: string,
  ref: WizardOrDenizenSubjectRef,
  wizardIds: ReadonlySet<string>,
  denizenIds: ReadonlySet<string>,
): void {
  if (ref.kind === "wizard" && !wizardIds.has(ref.wizardId)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.wizardId does not resolve: ${ref.wizardId}`);
  }
  if (ref.kind === "denizen" && !denizenIds.has(ref.denizenId)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.denizenId does not resolve: ${ref.denizenId}`);
  }
}

function validateCourtLawRef(path: string, value: unknown): WarlockCourtLawRef {
  const ref = requireRecord(path, value);
  if (ref.kind === "source") {
    if (typeof ref.lawId !== "string" || !isValidWarlockCourtLawId(ref.lawId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.lawId is invalid: ${JSON.stringify(ref.lawId)}`);
    }
    return { kind: "source", lawId: ref.lawId };
  }
  if (ref.kind === "campaign") {
    if (typeof ref.lawId !== "string" || !isValidWarlockCampaignCourtLawId(ref.lawId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.lawId is invalid: ${JSON.stringify(ref.lawId)}`);
    }
    return { kind: "campaign", lawId: ref.lawId };
  }
  throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.kind is invalid: ${JSON.stringify(ref.kind)}`);
}

function courtLawRefKey(ref: WarlockCourtLawRef): string {
  return `${ref.kind}:${ref.lawId}`;
}

function validateTitleId(path: string, value: unknown): WarlockLordTitleId {
  if (typeof value !== "string" || !isValidWarlockLordTitleId(value)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `${path} is invalid: ${JSON.stringify(value)}`);
  }
  return value;
}

function validatePactSeat(path: string, value: unknown): PactSeatId {
  if (typeof value !== "string" || !isValidPactSeatId(value)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `${path} is invalid: ${JSON.stringify(value)}`);
  }
  return value;
}

function validateNullableHouseIndex(path: string, value: unknown): HouseIndex | null {
  if (value === null) return null;
  if (!isValidHouseIndex(value)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `${path} is invalid: ${JSON.stringify(value)}`);
  }
  return value;
}

function validateErrantHeraldry(path: string, value: unknown): WarlockErrantHeraldry {
  const heraldry = requireRecord(path, value);
  if (heraldry.kind === "source_clan") {
    if (typeof heraldry.clanId !== "string" || !isValidWarlockSourceClanId(heraldry.clanId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.clanId is invalid: ${JSON.stringify(heraldry.clanId)}`);
    }
    return { kind: "source_clan", clanId: heraldry.clanId };
  }
  if (heraldry.kind === "custom") {
    assertNonEmptyString(`${path}.description`, heraldry.description);
    return { kind: "custom", description: heraldry.description };
  }
  throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.kind is invalid: ${JSON.stringify(heraldry.kind)}`);
}

function validateErrantClaim(path: string, value: unknown): WarlockErrantClaim {
  const claim = requireRecord(path, value);
  if (claim.kind === "necromancer_edge") {
    if (typeof claim.pathSpaceId !== "string" || !isBuiltinEdgeOfLifePathSpaceId(claim.pathSpaceId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.pathSpaceId is invalid: ${JSON.stringify(claim.pathSpaceId)}`);
    }
    return { kind: "necromancer_edge", pathSpaceId: claim.pathSpaceId };
  }
  if (claim.kind === "hierophant_temple") {
    if (typeof claim.templeId !== "string" || !isValidHierophantTempleId(claim.templeId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.templeId is invalid: ${JSON.stringify(claim.templeId)}`);
    }
    return { kind: "hierophant_temple", templeId: claim.templeId };
  }
  if (claim.kind === "mariner_sea_region") {
    if (typeof claim.seaRegionId !== "string" || !isValidMarinerSeaRegionId(claim.seaRegionId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.seaRegionId is invalid: ${JSON.stringify(claim.seaRegionId)}`);
    }
    return { kind: "mariner_sea_region", seaRegionId: claim.seaRegionId };
  }
  if (claim.kind === "mariner_beast") {
    if (typeof claim.denizenId !== "string" || !isValidDenizenId(claim.denizenId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.denizenId is invalid: ${JSON.stringify(claim.denizenId)}`);
    }
    return { kind: "mariner_beast", denizenId: claim.denizenId };
  }
  if (claim.kind === "faustian_community") {
    if (typeof claim.communityId !== "string" || !isValidFaustianCommunityId(claim.communityId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.communityId is invalid: ${JSON.stringify(claim.communityId)}`);
    }
    return { kind: "faustian_community", communityId: claim.communityId };
  }
  if (claim.kind === "sage_dreamscape") {
    if (typeof claim.segmentId !== "string" || !isValidSageDreamscapeSegmentId(claim.segmentId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.segmentId is invalid: ${JSON.stringify(claim.segmentId)}`);
    }
    return { kind: "sage_dreamscape", segmentId: claim.segmentId };
  }
  if (claim.kind === "sorcerer_research_position" || claim.kind === "sorcerer_tower") {
    assertNonEmptyString(`${path}.label`, claim.label);
    return { kind: claim.kind, label: claim.label };
  }
  throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.kind is invalid: ${JSON.stringify(claim.kind)}`);
}

function validateAuthorityTarget(path: string, value: unknown): WarlockAuthorityTarget {
  const target = requireRecord(path, value);
  if (target.kind === "king") {
    return { kind: "king" };
  }
  if (target.kind === "ideology") {
    if (typeof target.ideologyId !== "string" || !isValidWarlockIdeologyId(target.ideologyId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.ideologyId is invalid: ${JSON.stringify(target.ideologyId)}`);
    }
    return { kind: "ideology", ideologyId: target.ideologyId };
  }
  if (target.kind === "clan") {
    if (typeof target.clanId !== "string" || !isValidWarlockClanId(target.clanId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.clanId is invalid: ${JSON.stringify(target.clanId)}`);
    }
    return { kind: "clan", clanId: target.clanId };
  }
  if (target.kind === "lord") {
    if (typeof target.titleId !== "string" || !isValidWarlockLordTitleId(target.titleId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.titleId is invalid: ${JSON.stringify(target.titleId)}`);
    }
    return { kind: "lord", titleId: target.titleId };
  }
  if (target.kind === "noble") {
    if (typeof target.denizenId !== "string" || !isValidDenizenId(target.denizenId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.denizenId is invalid: ${JSON.stringify(target.denizenId)}`);
    }
    return { kind: "noble", denizenId: target.denizenId };
  }
  if (target.kind === "garrison") {
    if (typeof target.garrisonId !== "string" || !isValidWarlockGarrisonId(target.garrisonId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.garrisonId is invalid: ${JSON.stringify(target.garrisonId)}`);
    }
    return { kind: "garrison", garrisonId: target.garrisonId };
  }
  if (target.kind === "army") {
    if (typeof target.denizenId !== "string" || !isValidDenizenId(target.denizenId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.denizenId is invalid: ${JSON.stringify(target.denizenId)}`);
    }
    return { kind: "army", denizenId: target.denizenId };
  }
  if (target.kind === "hierophant_temple") {
    if (typeof target.templeId !== "string" || !isValidHierophantTempleId(target.templeId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.templeId is invalid: ${JSON.stringify(target.templeId)}`);
    }
    return { kind: "hierophant_temple", templeId: target.templeId };
  }
  if (target.kind === "mariner_market") {
    if (typeof target.isleId !== "string" || !isValidIsleId(target.isleId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.isleId is invalid: ${JSON.stringify(target.isleId)}`);
    }
    return { kind: "mariner_market", isleId: target.isleId };
  }
  if (target.kind === "relocated_market") {
    if (typeof target.relocatedMarketId !== "string" || !isValidWarlockRelocatedMarketId(target.relocatedMarketId)) {
      throw new DomainError(
        "INVALID_CAMPAIGN_STATE",
        `${path}.relocatedMarketId is invalid: ${JSON.stringify(target.relocatedMarketId)}`,
      );
    }
    return { kind: "relocated_market", relocatedMarketId: target.relocatedMarketId };
  }
  if (target.kind === "orrery") {
    return { kind: "orrery" };
  }
  throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.kind is invalid: ${JSON.stringify(target.kind)}`);
}

function validateArmySponsor(path: string, value: unknown): WarlockArmySponsor {
  const sponsor = requireRecord(path, value);
  if (sponsor.kind === "king") {
    return { kind: "king" };
  }
  if (sponsor.kind === "clan") {
    if (typeof sponsor.clanId !== "string" || !isValidWarlockClanId(sponsor.clanId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.clanId is invalid: ${JSON.stringify(sponsor.clanId)}`);
    }
    return { kind: "clan", clanId: sponsor.clanId };
  }
  if (sponsor.kind === "wizard") {
    if (typeof sponsor.wizardId !== "string" || !isValidWizardId(sponsor.wizardId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.wizardId is invalid: ${JSON.stringify(sponsor.wizardId)}`);
    }
    return { kind: "wizard", wizardId: sponsor.wizardId };
  }
  throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.kind is invalid: ${JSON.stringify(sponsor.kind)}`);
}

function validatePartnership(path: string, value: unknown): WarlockPartnership {
  const partnership = requireRecord(path, value);
  if (typeof partnership.wizardId !== "string" || !isValidWizardId(partnership.wizardId)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.wizardId is invalid: ${JSON.stringify(partnership.wizardId)}`);
  }
  if (partnership.kind === "mercantilism" || partnership.kind === "piracy") {
    assertNonEmptyString(`${path}.partnerName`, partnership.partnerName);
    return { kind: partnership.kind, wizardId: partnership.wizardId, partnerName: partnership.partnerName };
  }
  if (partnership.kind === "monarchy") {
    return {
      kind: "monarchy",
      wizardId: partnership.wizardId,
      kingRef: validateCharacterRef(`${path}.kingRef`, partnership.kingRef),
    };
  }
  throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.kind is invalid: ${JSON.stringify(partnership.kind)}`);
}

function validateClanCounts(path: string, value: unknown): void {
  const clanCounts = requireArray(path, value);
  const clanIds: string[] = [];
  for (let i = 0; i < clanCounts.length; i++) {
    const countPath = `${path}[${i}]`;
    const entry = requireRecord(countPath, clanCounts[i]);
    if (typeof entry.clanId !== "string" || !isValidWarlockClanId(entry.clanId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${countPath}.clanId is invalid: ${JSON.stringify(entry.clanId)}`);
    }
    assertPositiveSafeInteger(`${countPath}.count`, entry.count);
    clanIds.push(entry.clanId);
  }
  uniqueIds(clanIds, `${path} clan`);
}

export function validateWarlockStructure(warlock: unknown): void {
  if (warlock === null || warlock === undefined || typeof warlock !== "object") {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "Missing or invalid warlock");
  }
  const w = warlock as Record<string, unknown>;

  const clans = requireArray("warlock.clans", w.clans);
  const clanIds: WarlockClanId[] = [];
  for (let i = 0; i < clans.length; i++) {
    const path = `warlock.clans[${i}]`;
    const clan = requireRecord(path, clans[i]);
    if (typeof clan.clanId !== "string" || !isValidWarlockClanId(clan.clanId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.clanId is invalid: ${JSON.stringify(clan.clanId)}`);
    }
    assertBoolean(`${path}.active`, clan.active);
    assertNonNegativeSafeInteger(`${path}.favor`, clan.favor);
    clanIds.push(clan.clanId);
  }
  uniqueIds(clanIds, "Warlock Clan");

  const campaignCourtLaws = requireArray("warlock.campaignCourtLaws", w.campaignCourtLaws);
  const campaignLawIds: WarlockCampaignCourtLawId[] = [];
  for (let i = 0; i < campaignCourtLaws.length; i++) {
    const path = `warlock.campaignCourtLaws[${i}]`;
    const law = requireRecord(path, campaignCourtLaws[i]);
    if (typeof law.lawId !== "string" || !isValidWarlockCampaignCourtLawId(law.lawId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.lawId is invalid: ${JSON.stringify(law.lawId)}`);
    }
    assertNonEmptyString(`${path}.text`, law.text);
    campaignLawIds.push(law.lawId);
  }
  uniqueIds(campaignLawIds, "Warlock campaign Court Law");
  const campaignLawIdSet = new Set<string>(campaignLawIds);

  const activeCourtLawRefs = requireArray("warlock.activeCourtLawRefs", w.activeCourtLawRefs);
  const activeLawKeys: string[] = [];
  for (let i = 0; i < activeCourtLawRefs.length; i++) {
    const path = `warlock.activeCourtLawRefs[${i}]`;
    const ref = validateCourtLawRef(path, activeCourtLawRefs[i]);
    if (ref.kind === "campaign" && !campaignLawIdSet.has(ref.lawId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.lawId does not resolve: ${ref.lawId}`);
    }
    activeLawKeys.push(courtLawRefKey(ref));
  }
  uniqueIds(activeLawKeys, "Warlock active Court Law");

  const titles = requireArray("warlock.titles", w.titles);
  const titleIds: WarlockLordTitleId[] = [];
  const titleCurrentClanById = new Map<string, WarlockClanId | null>();
  for (let i = 0; i < titles.length; i++) {
    const path = `warlock.titles[${i}]`;
    const title = requireRecord(path, titles[i]);
    titleIds.push(validateTitleId(`${path}.titleId`, title.titleId));
    if (title.occupantDenizenId !== null) {
      if (typeof title.occupantDenizenId !== "string" || !isValidDenizenId(title.occupantDenizenId)) {
        throw new DomainError(
          "INVALID_CAMPAIGN_STATE",
          `${path}.occupantDenizenId is invalid: ${JSON.stringify(title.occupantDenizenId)}`,
        );
      }
    }
    if (title.currentClanId !== null) {
      if (typeof title.currentClanId !== "string" || !isValidWarlockClanId(title.currentClanId)) {
        throw new DomainError(
          "INVALID_CAMPAIGN_STATE",
          `${path}.currentClanId is invalid: ${JSON.stringify(title.currentClanId)}`,
        );
      }
    }
    assertBoolean(`${path}.distracted`, title.distracted);
    titleCurrentClanById.set(
      title.titleId as string,
      title.currentClanId === null ? null : title.currentClanId as WarlockClanId,
    );
  }
  uniqueIds(titleIds, "Warlock Title");
  const titleIdSet = new Set<string>(titleIds);

  const locatedIds: string[] = [];

  const clanDecks = requireArray("warlock.clanDecks", w.clanDecks);
  const deckClanIds: string[] = [];
  for (let i = 0; i < clanDecks.length; i++) {
    const path = `warlock.clanDecks[${i}]`;
    const deck = requireRecord(path, clanDecks[i]);
    if (typeof deck.clanId !== "string" || !isValidWarlockClanId(deck.clanId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.clanId is invalid: ${JSON.stringify(deck.clanId)}`);
    }
    const deckTitleIds = requireArray(`${path}.titleIds`, deck.titleIds);
    for (let j = 0; j < deckTitleIds.length; j++) {
      const titleId = validateTitleId(`${path}.titleIds[${j}]`, deckTitleIds[j]);
      locatedIds.push(titleId);
      if (titleCurrentClanById.get(titleId) !== deck.clanId) {
        throw new DomainError(
          "INVALID_CAMPAIGN_STATE",
          `${path}.titleIds[${j}] currentClanId does not match deck clan ${deck.clanId}`,
        );
      }
    }
    deckClanIds.push(deck.clanId);
  }
  uniqueIds(deckClanIds, "Warlock Clan deck");

  const kingsAgenda = requireArray("warlock.kingsAgenda", w.kingsAgenda);
  for (let i = 0; i < kingsAgenda.length; i++) {
    locatedIds.push(validateTitleId(`warlock.kingsAgenda[${i}]`, kingsAgenda[i]));
  }

  const setAsideTitleIds = requireArray("warlock.setAsideTitleIds", w.setAsideTitleIds);
  for (let i = 0; i < setAsideTitleIds.length; i++) {
    locatedIds.push(validateTitleId(`warlock.setAsideTitleIds[${i}]`, setAsideTitleIds[i]));
  }

  const unclaimedTitleIds = requireArray("warlock.unclaimedTitleIds", w.unclaimedTitleIds);
  for (let i = 0; i < unclaimedTitleIds.length; i++) {
    locatedIds.push(validateTitleId(`warlock.unclaimedTitleIds[${i}]`, unclaimedTitleIds[i]));
  }

  const questTitles = requireArray("warlock.questTitles", w.questTitles);
  for (let i = 0; i < questTitles.length; i++) {
    const path = `warlock.questTitles[${i}]`;
    const quest = requireRecord(path, questTitles[i]);
    locatedIds.push(validateTitleId(`${path}.titleId`, quest.titleId));
    validatePactSeat(`${path}.currentDomainSeatId`, quest.currentDomainSeatId);
    const visited = requireArray(`${path}.visitedDomainSeatIds`, quest.visitedDomainSeatIds);
    const visitedIds: PactSeatId[] = [];
    for (let j = 0; j < visited.length; j++) {
      visitedIds.push(validatePactSeat(`${path}.visitedDomainSeatIds[${j}]`, visited[j]));
    }
    uniqueIds(visitedIds, `${path} visited Domain`);
  }

  const faustianAccompliceTitles = requireArray("warlock.faustianAccompliceTitles", w.faustianAccompliceTitles);
  for (let i = 0; i < faustianAccompliceTitles.length; i++) {
    const path = `warlock.faustianAccompliceTitles[${i}]`;
    const accomplice = requireRecord(path, faustianAccompliceTitles[i]);
    locatedIds.push(validateTitleId(`${path}.titleId`, accomplice.titleId));
    if (typeof accomplice.communityId !== "string" || !isValidFaustianCommunityId(accomplice.communityId)) {
      throw new DomainError(
        "INVALID_CAMPAIGN_STATE",
        `${path}.communityId is invalid: ${JSON.stringify(accomplice.communityId)}`,
      );
    }
  }

  const devilTakenTitleIds = requireArray("warlock.devilTakenTitleIds", w.devilTakenTitleIds);
  for (let i = 0; i < devilTakenTitleIds.length; i++) {
    locatedIds.push(validateTitleId(`warlock.devilTakenTitleIds[${i}]`, devilTakenTitleIds[i]));
  }

  if (w.king !== null) {
    const king = requireRecord("warlock.king", w.king);
    if (king.occupant !== null) {
      validateCharacterRef("warlock.king.occupant", king.occupant);
    }
    if (king.regnalName !== null) {
      assertNonEmptyString("warlock.king.regnalName", king.regnalName);
    }
    if (king.clanId !== null) {
      if (typeof king.clanId !== "string" || !isValidWarlockClanId(king.clanId)) {
        throw new DomainError("INVALID_CAMPAIGN_STATE", `warlock.king.clanId is invalid: ${JSON.stringify(king.clanId)}`);
      }
    }
    validateNullableHouseIndex("warlock.king.sunSign", king.sunSign);
    validateNullableHouseIndex("warlock.king.moonSign", king.moonSign);
    validateNullableHouseIndex("warlock.king.risingSign", king.risingSign);
    if (typeof king.healthCondition !== "string" || !isValidWarlockKingHealthCondition(king.healthCondition)) {
      throw new DomainError(
        "INVALID_CAMPAIGN_STATE",
        `warlock.king.healthCondition is invalid: ${JSON.stringify(king.healthCondition)}`,
      );
    }
  }

  if (w.courtCondition !== null) {
    if (typeof w.courtCondition !== "string" || !isValidWarlockCourtCondition(w.courtCondition)) {
      throw new DomainError(
        "INVALID_CAMPAIGN_STATE",
        `warlock.courtCondition is invalid: ${JSON.stringify(w.courtCondition)}`,
      );
    }
  }

  const ladies = requireArray("warlock.ladies", w.ladies);
  const ladyIds: string[] = [];
  for (let i = 0; i < ladies.length; i++) {
    const path = `warlock.ladies[${i}]`;
    const lady = requireRecord(path, ladies[i]);
    if (typeof lady.denizenId !== "string" || !isValidDenizenId(lady.denizenId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.denizenId is invalid: ${JSON.stringify(lady.denizenId)}`);
    }
    if (typeof lady.clanId !== "string" || !isValidWarlockClanId(lady.clanId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.clanId is invalid: ${JSON.stringify(lady.clanId)}`);
    }
    ladyIds.push(lady.denizenId);
  }
  uniqueIds(ladyIds, "Warlock Lady");
  const ladyIdSet = new Set<string>(ladyIds);

  const kingsFamilyLadyIds = requireArray("warlock.kingsFamilyLadyIds", w.kingsFamilyLadyIds);
  for (let i = 0; i < kingsFamilyLadyIds.length; i++) {
    const denizenId = kingsFamilyLadyIds[i];
    if (typeof denizenId !== "string" || !isValidDenizenId(denizenId)) {
      throw new DomainError(
        "INVALID_CAMPAIGN_STATE",
        `warlock.kingsFamilyLadyIds[${i}] is invalid: ${JSON.stringify(denizenId)}`,
      );
    }
    if (!ladyIdSet.has(denizenId)) {
      throw new DomainError(
        "INVALID_CAMPAIGN_STATE",
        `warlock.kingsFamilyLadyIds[${i}] does not resolve: ${denizenId}`,
      );
    }
  }
  uniqueIds(kingsFamilyLadyIds as string[], "Warlock Family Lady");

  const kingsConfidantLadyIds = requireArray("warlock.kingsConfidantLadyIds", w.kingsConfidantLadyIds);
  for (let i = 0; i < kingsConfidantLadyIds.length; i++) {
    const denizenId = kingsConfidantLadyIds[i];
    if (typeof denizenId !== "string" || !isValidDenizenId(denizenId)) {
      throw new DomainError(
        "INVALID_CAMPAIGN_STATE",
        `warlock.kingsConfidantLadyIds[${i}] is invalid: ${JSON.stringify(denizenId)}`,
      );
    }
    if (!ladyIdSet.has(denizenId)) {
      throw new DomainError(
        "INVALID_CAMPAIGN_STATE",
        `warlock.kingsConfidantLadyIds[${i}] does not resolve: ${denizenId}`,
      );
    }
  }
  uniqueIds(kingsConfidantLadyIds as string[], "Warlock Confidant Lady");
  const familyLadyIdSet = new Set(kingsFamilyLadyIds as string[]);
  for (const denizenId of kingsConfidantLadyIds as string[]) {
    if (familyLadyIdSet.has(denizenId)) {
      throw new DomainError(
        "INVALID_CAMPAIGN_STATE",
        `Warlock Lady cannot be both Family and Confidant: ${denizenId}`,
      );
    }
  }

  const errantLadies = requireArray("warlock.errantLadies", w.errantLadies);
  const errantIds: string[] = [];
  for (let i = 0; i < errantLadies.length; i++) {
    const path = `warlock.errantLadies[${i}]`;
    const lady = requireRecord(path, errantLadies[i]);
    if (typeof lady.denizenId !== "string" || !isValidDenizenId(lady.denizenId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.denizenId is invalid: ${JSON.stringify(lady.denizenId)}`);
    }
    if (typeof lady.clanId !== "string" || !isValidWarlockClanId(lady.clanId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.clanId is invalid: ${JSON.stringify(lady.clanId)}`);
    }
    validateErrantHeraldry(`${path}.heraldry`, lady.heraldry);
    assertNonEmptyString(`${path}.personalityQuirk`, lady.personalityQuirk);
    validatePactSeat(`${path}.currentDomainSeatId`, lady.currentDomainSeatId);
    validateErrantClaim(`${path}.claimedComponent`, lady.claimedComponent);
    const controlled = requireArray(`${path}.controlledLordTitleIds`, lady.controlledLordTitleIds);
    for (let j = 0; j < controlled.length; j++) {
      locatedIds.push(validateTitleId(`${path}.controlledLordTitleIds[${j}]`, controlled[j]));
    }
    if (ladyIdSet.has(lady.denizenId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.denizenId is still an ordinary Lady: ${lady.denizenId}`);
    }
    errantIds.push(lady.denizenId);
  }
  uniqueIds(errantIds, "Warlock Errant Lady");

  const rebellions = requireArray("warlock.rebellions", w.rebellions);
  const rebellionIds: WarlockRebellionId[] = [];
  for (let i = 0; i < rebellions.length; i++) {
    const path = `warlock.rebellions[${i}]`;
    const rebellion = requireRecord(path, rebellions[i]);
    if (typeof rebellion.rebellionId !== "string" || !isValidWarlockRebellionId(rebellion.rebellionId)) {
      throw new DomainError(
        "INVALID_CAMPAIGN_STATE",
        `${path}.rebellionId is invalid: ${JSON.stringify(rebellion.rebellionId)}`,
      );
    }
    validatePactSeat(`${path}.domainSeatId`, rebellion.domainSeatId);
    const rebellionTitleIds = requireArray(`${path}.lordTitleIds`, rebellion.lordTitleIds);
    for (let j = 0; j < rebellionTitleIds.length; j++) {
      locatedIds.push(validateTitleId(`${path}.lordTitleIds[${j}]`, rebellionTitleIds[j]));
    }
    rebellionIds.push(rebellion.rebellionId);
  }
  uniqueIds(rebellionIds, "Warlock Rebellion");

  uniqueIds(locatedIds, "Warlock Title location");
  for (const titleId of titleIds) {
    if (!locatedIds.includes(titleId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `Warlock Title is not located: ${titleId}`);
    }
  }
  for (const titleId of locatedIds) {
    if (!titleIdSet.has(titleId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `Warlock Title location references an unknown Title: ${titleId}`);
    }
  }

  const garrisons = requireArray("warlock.garrisons", w.garrisons);
  const garrisonIds: WarlockGarrisonId[] = [];
  for (let i = 0; i < garrisons.length; i++) {
    const path = `warlock.garrisons[${i}]`;
    const garrison = requireRecord(path, garrisons[i]);
    if (typeof garrison.garrisonId !== "string" || !isValidWarlockGarrisonId(garrison.garrisonId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.garrisonId is invalid: ${JSON.stringify(garrison.garrisonId)}`);
    }
    validatePactSeat(`${path}.domainSeatId`, garrison.domainSeatId);
    garrisonIds.push(garrison.garrisonId);
  }
  uniqueIds(garrisonIds, "Warlock Garrison");
  const garrisonIdSet = new Set<string>(garrisonIds);

  const armies = requireArray("warlock.armies", w.armies);
  const armyIds: string[] = [];
  for (let i = 0; i < armies.length; i++) {
    const path = `warlock.armies[${i}]`;
    const army = requireRecord(path, armies[i]);
    if (typeof army.denizenId !== "string" || !isValidDenizenId(army.denizenId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.denizenId is invalid: ${JSON.stringify(army.denizenId)}`);
    }
    validatePactSeat(`${path}.currentDomainSeatId`, army.currentDomainSeatId);
    assertNonNegativeSafeInteger(`${path}.favor`, army.favor);
    validateArmySponsor(`${path}.sponsor`, army.sponsor);
    if (army.alignedIdeologyId !== null) {
      if (typeof army.alignedIdeologyId !== "string" || !isValidWarlockIdeologyId(army.alignedIdeologyId)) {
        throw new DomainError(
          "INVALID_CAMPAIGN_STATE",
          `${path}.alignedIdeologyId is invalid: ${JSON.stringify(army.alignedIdeologyId)}`,
        );
      }
    }
    if (typeof army.lifecycle !== "string" || !isValidWarlockArmyLifecycle(army.lifecycle)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.lifecycle is invalid: ${JSON.stringify(army.lifecycle)}`);
    }
    armyIds.push(army.denizenId);
  }
  uniqueIds(armyIds, "Warlock Army");

  const heroes = requireArray("warlock.heroes", w.heroes);
  const heroIds: string[] = [];
  for (let i = 0; i < heroes.length; i++) {
    const path = `warlock.heroes[${i}]`;
    const hero = requireRecord(path, heroes[i]);
    if (typeof hero.denizenId !== "string" || !isValidDenizenId(hero.denizenId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.denizenId is invalid: ${JSON.stringify(hero.denizenId)}`);
    }
    validatePactSeat(`${path}.currentDomainSeatId`, hero.currentDomainSeatId);
    if (typeof hero.fame !== "string" || !isValidWarlockHeroFame(hero.fame)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.fame is invalid: ${JSON.stringify(hero.fame)}`);
    }
    const heroicTitles = requireArray(`${path}.heroicTitles`, hero.heroicTitles);
    for (let j = 0; j < heroicTitles.length; j++) {
      const titlePath = `${path}.heroicTitles[${j}]`;
      const heroicTitle = requireRecord(titlePath, heroicTitles[j]);
      if (typeof heroicTitle.glyph !== "string" || !isValidWarlockHeroicTitleGlyph(heroicTitle.glyph)) {
        throw new DomainError("INVALID_CAMPAIGN_STATE", `${titlePath}.glyph is invalid: ${JSON.stringify(heroicTitle.glyph)}`);
      }
      assertNonEmptyString(`${titlePath}.title`, heroicTitle.title);
    }
    heroIds.push(hero.denizenId);
  }
  uniqueIds(heroIds, "Warlock Hero");

  const relocatedMarkets = requireArray("warlock.relocatedMarkets", w.relocatedMarkets);
  const relocatedMarketIds: WarlockRelocatedMarketId[] = [];
  for (let i = 0; i < relocatedMarkets.length; i++) {
    const path = `warlock.relocatedMarkets[${i}]`;
    const market = requireRecord(path, relocatedMarkets[i]);
    if (typeof market.relocatedMarketId !== "string" || !isValidWarlockRelocatedMarketId(market.relocatedMarketId)) {
      throw new DomainError(
        "INVALID_CAMPAIGN_STATE",
        `${path}.relocatedMarketId is invalid: ${JSON.stringify(market.relocatedMarketId)}`,
      );
    }
    if (market.originIsleId !== null) {
      if (typeof market.originIsleId !== "string" || !isValidIsleId(market.originIsleId)) {
        throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.originIsleId is invalid: ${JSON.stringify(market.originIsleId)}`);
      }
    }
    validatePactSeat(`${path}.currentDomainSeatId`, market.currentDomainSeatId);
    validateClanCounts(`${path}.clanCounts`, market.clanCounts);
    relocatedMarketIds.push(market.relocatedMarketId);
  }
  uniqueIds(relocatedMarketIds, "Warlock relocated Market");
  const relocatedMarketIdSet = new Set<string>(relocatedMarketIds);

  const marketHeraldry = requireArray("warlock.marketHeraldry", w.marketHeraldry);
  const marketIsleIds: string[] = [];
  for (let i = 0; i < marketHeraldry.length; i++) {
    const path = `warlock.marketHeraldry[${i}]`;
    const market = requireRecord(path, marketHeraldry[i]);
    if (typeof market.isleId !== "string" || !isValidIsleId(market.isleId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.isleId is invalid: ${JSON.stringify(market.isleId)}`);
    }
    validateClanCounts(`${path}.clanCounts`, market.clanCounts);
    marketIsleIds.push(market.isleId);
  }
  uniqueIds(marketIsleIds, "Warlock Market Heraldry Isle");

  const authority = requireArray("warlock.authority", w.authority);
  const authorityKeys: string[] = [];
  for (let i = 0; i < authority.length; i++) {
    const path = `warlock.authority[${i}]`;
    const entry = requireRecord(path, authority[i]);
    const target = validateAuthorityTarget(`${path}.target`, entry.target);
    assertPositiveSafeInteger(`${path}.amount`, entry.amount);
    if (target.kind === "lord" && !titleIdSet.has(target.titleId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.target.titleId does not resolve: ${target.titleId}`);
    }
    if (target.kind === "garrison" && !garrisonIdSet.has(target.garrisonId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.target.garrisonId does not resolve: ${target.garrisonId}`);
    }
    if (target.kind === "relocated_market" && !relocatedMarketIdSet.has(target.relocatedMarketId)) {
      throw new DomainError(
        "INVALID_CAMPAIGN_STATE",
        `${path}.target.relocatedMarketId does not resolve: ${target.relocatedMarketId}`,
      );
    }
    authorityKeys.push(warlockAuthorityTargetKey(target));
  }
  uniqueIds(authorityKeys, "Warlock Authority target");

  const partnerships = requireArray("warlock.partnerships", w.partnerships);
  for (let i = 0; i < partnerships.length; i++) {
    validatePartnership(`warlock.partnerships[${i}]`, partnerships[i]);
  }
}

export function validateWarlockReferenceIntegrity(state: CampaignStateV5): void {
  validateWarlockStructure(state.warlock);
  const warlock = state.warlock;
  const denizenById = new Map(state.world.denizens.map((denizen) => [denizen.denizenId as string, denizen]));
  const wizardIds = new Set(state.wizards.map((wizard) => wizard.wizardId as string));
  const denizenIds = new Set(denizenById.keys());
  const isleIds = new Set(state.world.isles.map((isle) => isle.isleId as string));

  for (let i = 0; i < warlock.titles.length; i++) {
    const path = `warlock.titles[${i}]`;
    const occupantId = warlock.titles[i].occupantDenizenId;
    if (occupantId === null) continue;
    const denizen = denizenById.get(occupantId);
    if (denizen === undefined) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.occupantDenizenId does not resolve: ${occupantId}`);
    }
    if (denizen.representation !== "individual") {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.occupantDenizenId must reference an individual Denizen`);
    }
  }

  if (warlock.king?.occupant !== null && warlock.king?.occupant !== undefined) {
    resolveCharacterRef("warlock.king.occupant", warlock.king.occupant, wizardIds, denizenIds);
  }

  for (let i = 0; i < warlock.ladies.length; i++) {
    const path = `warlock.ladies[${i}]`;
    const denizen = denizenById.get(warlock.ladies[i].denizenId);
    if (denizen === undefined) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.denizenId does not resolve: ${warlock.ladies[i].denizenId}`);
    }
    if (denizen.representation !== "individual") {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.denizenId must reference an individual Denizen`);
    }
  }

  for (let i = 0; i < warlock.errantLadies.length; i++) {
    const path = `warlock.errantLadies[${i}]`;
    const lady = warlock.errantLadies[i];
    const denizen = denizenById.get(lady.denizenId);
    if (denizen === undefined) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.denizenId does not resolve: ${lady.denizenId}`);
    }
    if (denizen.representation !== "individual") {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.denizenId must reference an individual Denizen`);
    }
    requirePowerfulRoleProfile(denizen, path, "errant_noble");
    const claim = lady.claimedComponent;
    if (claim.kind === "necromancer_edge") {
      const exists = state.necromancer.pathSpaces.some((space) => space.pathSpaceId === claim.pathSpaceId);
      if (!exists) {
        throw new DomainError(
          "INVALID_CAMPAIGN_STATE",
          `${path}.claimedComponent.pathSpaceId does not resolve: ${claim.pathSpaceId}`,
        );
      }
    } else if (claim.kind === "hierophant_temple") {
      const exists = state.hierophant.temples.some((temple) => temple.templeId === claim.templeId);
      if (!exists) {
        throw new DomainError(
          "INVALID_CAMPAIGN_STATE",
          `${path}.claimedComponent.templeId does not resolve: ${claim.templeId}`,
        );
      }
    } else if (claim.kind === "mariner_sea_region") {
      const exists = state.mariner.seaRegions.some((region) => region.regionId === claim.seaRegionId);
      if (!exists) {
        throw new DomainError(
          "INVALID_CAMPAIGN_STATE",
          `${path}.claimedComponent.seaRegionId does not resolve: ${claim.seaRegionId}`,
        );
      }
    } else if (claim.kind === "mariner_beast") {
      const exists = state.mariner.beasts.some((beast) => beast.denizenId === claim.denizenId);
      if (!exists) {
        throw new DomainError(
          "INVALID_CAMPAIGN_STATE",
          `${path}.claimedComponent.denizenId does not resolve: ${claim.denizenId}`,
        );
      }
    } else if (claim.kind === "faustian_community") {
      const exists = state.faustian.communities.some((community) => community.communityId === claim.communityId);
      if (!exists) {
        throw new DomainError(
          "INVALID_CAMPAIGN_STATE",
          `${path}.claimedComponent.communityId does not resolve: ${claim.communityId}`,
        );
      }
    }
  }

  for (let i = 0; i < warlock.faustianAccompliceTitles.length; i++) {
    const path = `warlock.faustianAccompliceTitles[${i}]`;
    const communityId = warlock.faustianAccompliceTitles[i].communityId;
    const exists = state.faustian.communities.some((community) => community.communityId === communityId);
    if (!exists) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.communityId does not resolve: ${communityId}`);
    }
  }

  for (let i = 0; i < warlock.armies.length; i++) {
    const path = `warlock.armies[${i}]`;
    const army = warlock.armies[i];
    const denizen = denizenById.get(army.denizenId);
    if (denizen === undefined) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.denizenId does not resolve: ${army.denizenId}`);
    }
    if (denizen.representation !== "collective") {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.denizenId must reference a collective Denizen`);
    }
    requirePowerfulRoleProfile(denizen, path, "army");
    if (army.sponsor.kind === "wizard" && !wizardIds.has(army.sponsor.wizardId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.sponsor.wizardId does not resolve: ${army.sponsor.wizardId}`);
    }
  }

  for (let i = 0; i < warlock.heroes.length; i++) {
    const path = `warlock.heroes[${i}]`;
    const hero = warlock.heroes[i];
    const denizen = denizenById.get(hero.denizenId);
    if (denizen === undefined) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.denizenId does not resolve: ${hero.denizenId}`);
    }
    if (denizen.representation !== "individual") {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.denizenId must reference an individual Denizen`);
    }
    requirePowerfulRoleProfile(denizen, path, "hero");
  }

  const ladyOrErrantIds = new Set<string>([
    ...warlock.ladies.map((lady) => lady.denizenId as string),
    ...warlock.errantLadies.map((lady) => lady.denizenId as string),
  ]);
  const armyIds = new Set(warlock.armies.map((army) => army.denizenId as string));
  const currentTempleIds = new Set(state.hierophant.temples.map((temple) => temple.templeId as string));
  const currentMarketIsleIds = new Set(
    state.mariner.boardIsles
      .filter((boardIsle) => boardIsle.market.present)
      .map((boardIsle) => boardIsle.worldIsleId as string),
  );

  for (let i = 0; i < warlock.authority.length; i++) {
    const path = `warlock.authority[${i}].target`;
    const target = warlock.authority[i].target;
    if (target.kind === "noble" && !ladyOrErrantIds.has(target.denizenId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.denizenId does not resolve: ${target.denizenId}`);
    }
    if (target.kind === "army" && !armyIds.has(target.denizenId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.denizenId does not resolve: ${target.denizenId}`);
    }
    if (target.kind === "hierophant_temple" && !currentTempleIds.has(target.templeId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.templeId does not resolve: ${target.templeId}`);
    }
    if (target.kind === "mariner_market" && !currentMarketIsleIds.has(target.isleId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.isleId does not resolve: ${target.isleId}`);
    }
  }

  for (let i = 0; i < warlock.marketHeraldry.length; i++) {
    const path = `warlock.marketHeraldry[${i}]`;
    if (!currentMarketIsleIds.has(warlock.marketHeraldry[i].isleId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.isleId does not resolve: ${warlock.marketHeraldry[i].isleId}`);
    }
  }

  for (let i = 0; i < warlock.relocatedMarkets.length; i++) {
    const path = `warlock.relocatedMarkets[${i}]`;
    const originIsleId = warlock.relocatedMarkets[i].originIsleId;
    if (originIsleId !== null && !isleIds.has(originIsleId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.originIsleId does not resolve: ${originIsleId}`);
    }
  }

  for (let i = 0; i < warlock.partnerships.length; i++) {
    const path = `warlock.partnerships[${i}]`;
    const partnership = warlock.partnerships[i];
    if (!wizardIds.has(partnership.wizardId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.wizardId does not resolve: ${partnership.wizardId}`);
    }
    if (partnership.kind === "monarchy") {
      resolveCharacterRef(`${path}.kingRef`, partnership.kingRef, wizardIds, denizenIds);
    }
  }
}
