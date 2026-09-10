import type { CampaignStateV5 } from "./campaign-state";
import { DomainError } from "./errors";
import { isValidDenizenId, isValidPlaceId } from "./ids";
import { isValidPactSeatId } from "./pact-seats";
import {
  isValidHierophantBuiltinBlasphemyId,
  isValidHierophantBuiltinClassId,
  isValidHierophantBuiltinDoctrineId,
  isValidHierophantBuiltinDogmaId,
  isValidHierophantCampaignBlasphemyId,
  isValidHierophantCampaignClassId,
  isValidHierophantCampaignDoctrineId,
  isValidHierophantDogmaCategory,
  isValidHierophantDogmaEntryId,
  isValidHierophantFlameLawId,
  isValidHierophantTempleId,
} from "./hierophant-catalogs";
import type { HierophantTemple } from "./hierophant-state";
import {
  requirePowerfulRoleProfile,
  requireReliableOrDisruptiveStatus,
} from "./powerful-denizen-roles";

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

function isResolvableDoctrineId(id: string, campaignDoctrineIds: Set<string>): boolean {
  return isValidHierophantBuiltinDoctrineId(id) || campaignDoctrineIds.has(id);
}

function isResolvableClassId(id: string, campaignClassIds: Set<string>): boolean {
  return isValidHierophantBuiltinClassId(id) || campaignClassIds.has(id);
}

function isResolvableBlasphemyId(id: string, campaignBlasphemyIds: Set<string>): boolean {
  return isValidHierophantBuiltinBlasphemyId(id) || campaignBlasphemyIds.has(id);
}

function validateDoctrineState(
  path: string,
  doctrine: unknown,
  campaignDoctrineIds: Set<string>,
  campaignBlasphemyIds: Set<string>,
  blasphemyAllowed: boolean,
): void {
  if (doctrine === null || doctrine === undefined || typeof doctrine !== "object") {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.doctrine must be an object`);
  }
  const d = doctrine as Record<string, unknown>;
  if (d.kind === "unset") {
    return;
  }
  if (d.kind === "doctrine") {
    assertNonEmptyString(`${path}.doctrine.doctrineId`, d.doctrineId);
    if (!isResolvableDoctrineId(d.doctrineId, campaignDoctrineIds)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.doctrine.doctrineId does not resolve: ${d.doctrineId}`);
    }
    return;
  }
  if (d.kind === "blasphemy") {
    if (!blasphemyAllowed) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path} cannot have Blasphemy state`);
    }
    assertNonEmptyString(`${path}.doctrine.blasphemyId`, d.blasphemyId);
    if (!isResolvableBlasphemyId(d.blasphemyId, campaignBlasphemyIds)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.doctrine.blasphemyId does not resolve: ${d.blasphemyId}`);
    }
    return;
  }
  throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.doctrine.kind is invalid: ${JSON.stringify(d.kind)}`);
}

function validateTemple(
  path: string,
  temple: unknown,
  placeIds: Set<string> | null,
  campaignDoctrineIds: Set<string>,
  campaignBlasphemyIds: Set<string>,
): void {
  if (temple === null || temple === undefined || typeof temple !== "object") {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `${path} is not a valid object`);
  }
  const t = temple as Record<string, unknown>;
  if (typeof t.templeId !== "string" || !isValidHierophantTempleId(t.templeId)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.templeId is invalid: ${JSON.stringify(t.templeId)}`);
  }
  if (typeof t.placeId !== "string" || !isValidPlaceId(t.placeId)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.placeId is invalid: ${JSON.stringify(t.placeId)}`);
  }
  if (placeIds !== null && !placeIds.has(t.placeId)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.placeId references nonexistent World Place: ${t.placeId}`);
  }
  if (typeof t.hostSeatId !== "string" || !isValidPactSeatId(t.hostSeatId)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.hostSeatId is invalid: ${JSON.stringify(t.hostSeatId)}`);
  }
  if (t.status !== "active" && t.status !== "collapsed") {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.status is invalid: ${JSON.stringify(t.status)}`);
  }
  assertNonNegativeSafeInteger(`${path}.abundance`, t.abundance);
  assertNonNegativeSafeInteger(`${path}.conviction`, t.conviction);

  if (t.kind === "hestar") {
    if (t.templeId !== "hestar") {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path} kind hestar must have templeId "hestar"`);
    }
    if ("doctrine" in t && t.doctrine !== undefined) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path} Hestar must not have a set Doctrine`);
    }
    return;
  }
  if (t.kind !== "ordinary") {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.kind is invalid: ${JSON.stringify(t.kind)}`);
  }
  if (t.templeId === "hestar") {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `${path} templeId "hestar" must have kind "hestar"`);
  }
  validateDoctrineState(path, t.doctrine, campaignDoctrineIds, campaignBlasphemyIds, true);
}

function validateHostTemple(
  path: string,
  templeId: unknown,
  area: unknown,
  templeById: Map<string, Record<string, unknown>> | null,
  requireAreaField: boolean,
): void {
  if (typeof templeId !== "string" || !isValidHierophantTempleId(templeId)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.templeId is invalid: ${JSON.stringify(templeId)}`);
  }
  if (requireAreaField) {
    if (area !== null && area !== "courtyard" && area !== "agiary") {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.area is invalid: ${JSON.stringify(area)}`);
    }
  }
  if (templeById === null) {
    return;
  }
  const temple = templeById.get(templeId);
  if (temple === undefined) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.templeId does not resolve: ${templeId}`);
  }
  if (requireAreaField && temple.kind === "hestar" && area !== null) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `${path} Hestar host area must be null`);
  }
}

export function validateHierophantStructure(hierophant: unknown): void {
  if (hierophant === null || hierophant === undefined || typeof hierophant !== "object") {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "Missing or invalid hierophant");
  }
  const h = hierophant as Record<string, unknown>;

  if (!Array.isArray(h.selectedFlameLawIds)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "hierophant.selectedFlameLawIds must be an array");
  }
  if (!Array.isArray(h.campaignClasses)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "hierophant.campaignClasses must be an array");
  }
  if (!Array.isArray(h.campaignDoctrines)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "hierophant.campaignDoctrines must be an array");
  }
  if (!Array.isArray(h.temples)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "hierophant.temples must be an array");
  }
  if (!Array.isArray(h.supplicants)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "hierophant.supplicants must be an array");
  }
  if (!Array.isArray(h.prophets)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "hierophant.prophets must be an array");
  }
  if (!Array.isArray(h.cults)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "hierophant.cults must be an array");
  }
  if (!Array.isArray(h.holidayTempleIds)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "hierophant.holidayTempleIds must be an array");
  }

  const selected = h.selectedFlameLawIds as unknown[];
  const selectedIds: string[] = [];
  for (let i = 0; i < selected.length; i++) {
    const id = selected[i];
    if (typeof id !== "string" || !isValidHierophantFlameLawId(id)) {
      throw new DomainError(
        "INVALID_CAMPAIGN_STATE",
        `hierophant.selectedFlameLawIds[${i}] is not a known Flame Law: ${JSON.stringify(id)}`,
      );
    }
    selectedIds.push(id);
  }
  uniqueIds(selectedIds, "selectedFlameLawId");

  const classIds = new Set<string>();
  for (let i = 0; i < (h.campaignClasses as unknown[]).length; i++) {
    const cls = (h.campaignClasses as unknown[])[i];
    const path = `hierophant.campaignClasses[${i}]`;
    if (cls === null || cls === undefined || typeof cls !== "object") {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path} is not a valid object`);
    }
    const c = cls as Record<string, unknown>;
    assertNonEmptyString(`${path}.classId`, c.classId);
    assertNonEmptyString(`${path}.name`, c.name);
    if (isValidHierophantBuiltinClassId(c.classId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.classId collides with a built-in Class: ${c.classId}`);
    }
    if (!isValidHierophantCampaignClassId(c.classId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.classId is invalid: ${c.classId}`);
    }
    if (classIds.has(c.classId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `Duplicate campaign Class id: ${c.classId}`);
    }
    classIds.add(c.classId);
  }

  const campaignDoctrineIds = new Set<string>();
  const campaignBlasphemyIds = new Set<string>();
  for (let i = 0; i < (h.campaignDoctrines as unknown[]).length; i++) {
    const doc = (h.campaignDoctrines as unknown[])[i];
    const path = `hierophant.campaignDoctrines[${i}]`;
    if (doc === null || doc === undefined || typeof doc !== "object") {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path} is not a valid object`);
    }
    const d = doc as Record<string, unknown>;
    assertNonEmptyString(`${path}.doctrineId`, d.doctrineId);
    if (isValidHierophantBuiltinDoctrineId(d.doctrineId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.doctrineId collides with a built-in Doctrine: ${d.doctrineId}`);
    }
    if (!isValidHierophantCampaignDoctrineId(d.doctrineId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.doctrineId is invalid: ${d.doctrineId}`);
    }
    if (campaignDoctrineIds.has(d.doctrineId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `Duplicate campaign Doctrine id: ${d.doctrineId}`);
    }
    campaignDoctrineIds.add(d.doctrineId);

    if (d.orthodoxText !== null && typeof d.orthodoxText !== "string") {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.orthodoxText is invalid`);
    }
    const orthodox = typeof d.orthodoxText === "string" ? d.orthodoxText.trim() : "";
    if (d.blasphemy !== null && (d.blasphemy === undefined || typeof d.blasphemy !== "object")) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.blasphemy is invalid`);
    }
    let blasphemyText = "";
    if (d.blasphemy !== null) {
      const b = d.blasphemy as Record<string, unknown>;
      assertNonEmptyString(`${path}.blasphemy.blasphemyId`, b.blasphemyId);
      assertNonEmptyString(`${path}.blasphemy.text`, b.text);
      if (isValidHierophantBuiltinBlasphemyId(b.blasphemyId)) {
        throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.blasphemy.blasphemyId collides with a built-in Blasphemy: ${b.blasphemyId}`);
      }
      if (!isValidHierophantCampaignBlasphemyId(b.blasphemyId)) {
        throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.blasphemy.blasphemyId is invalid: ${b.blasphemyId}`);
      }
      if (campaignBlasphemyIds.has(b.blasphemyId)) {
        throw new DomainError("INVALID_CAMPAIGN_STATE", `Duplicate campaign Blasphemy id: ${b.blasphemyId}`);
      }
      campaignBlasphemyIds.add(b.blasphemyId);
      blasphemyText = b.text.trim();
    }
    if (orthodox.length === 0 && blasphemyText.length === 0) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path} must include orthodox or Blasphemy text`);
    }
    if (!Array.isArray(d.supportedClassIds)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.supportedClassIds must be an array`);
    }
    for (let j = 0; j < (d.supportedClassIds as unknown[]).length; j++) {
      const classId = (d.supportedClassIds as unknown[])[j];
      if (typeof classId !== "string" || classId.length === 0) {
        throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.supportedClassIds[${j}] is invalid`);
      }
      if (!isResolvableClassId(classId, classIds)) {
        throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.supportedClassIds[${j}] does not resolve: ${classId}`);
      }
    }
  }

  const templeIds: string[] = [];
  const templePlaceIds: string[] = [];
  const templeById = new Map<string, Record<string, unknown>>();
  for (let i = 0; i < (h.temples as unknown[]).length; i++) {
    const temple = (h.temples as unknown[])[i];
    validateTemple(`hierophant.temples[${i}]`, temple, null, campaignDoctrineIds, campaignBlasphemyIds);
    const t = temple as Record<string, unknown>;
    templeIds.push(t.templeId as string);
    templePlaceIds.push(t.placeId as string);
    templeById.set(t.templeId as string, t);
  }
  uniqueIds(templeIds, "templeId");
  uniqueIds(templePlaceIds, "Temple placeId");

  const cultIds: string[] = [];
  for (let i = 0; i < (h.cults as unknown[]).length; i++) {
    const cult = (h.cults as unknown[])[i];
    const path = `hierophant.cults[${i}]`;
    if (cult === null || cult === undefined || typeof cult !== "object") {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path} is not a valid object`);
    }
    const c = cult as Record<string, unknown>;
    if (typeof c.cultDenizenId !== "string" || !isValidDenizenId(c.cultDenizenId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.cultDenizenId is invalid: ${JSON.stringify(c.cultDenizenId)}`);
    }
    cultIds.push(c.cultDenizenId);
    if (typeof c.hostSeatId !== "string" || !isValidPactSeatId(c.hostSeatId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.hostSeatId is invalid: ${JSON.stringify(c.hostSeatId)}`);
    }
    if (c.anchorPlaceId !== null && (typeof c.anchorPlaceId !== "string" || !isValidPlaceId(c.anchorPlaceId))) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.anchorPlaceId is invalid: ${JSON.stringify(c.anchorPlaceId)}`);
    }
    if (c.leaderDenizenId !== null && (typeof c.leaderDenizenId !== "string" || !isValidDenizenId(c.leaderDenizenId))) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.leaderDenizenId is invalid: ${JSON.stringify(c.leaderDenizenId)}`);
    }
    assertNonEmptyString(`${path}.blasphemyId`, c.blasphemyId);
    if (!isResolvableBlasphemyId(c.blasphemyId, campaignBlasphemyIds)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.blasphemyId does not resolve: ${c.blasphemyId}`);
    }
    assertNonNegativeSafeInteger(`${path}.abundance`, c.abundance);
    assertNonNegativeSafeInteger(`${path}.conviction`, c.conviction);
    if (!Array.isArray(c.dogmas)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.dogmas must be an array`);
    }
    const dogmaEntryIds: string[] = [];
    for (let j = 0; j < (c.dogmas as unknown[]).length; j++) {
      const dogma = (c.dogmas as unknown[])[j];
      const dPath = `${path}.dogmas[${j}]`;
      if (dogma === null || dogma === undefined || typeof dogma !== "object") {
        throw new DomainError("INVALID_CAMPAIGN_STATE", `${dPath} is not a valid object`);
      }
      const dg = dogma as Record<string, unknown>;
      assertNonEmptyString(`${dPath}.dogmaEntryId`, dg.dogmaEntryId);
      if (!isValidHierophantDogmaEntryId(dg.dogmaEntryId)) {
        throw new DomainError("INVALID_CAMPAIGN_STATE", `${dPath}.dogmaEntryId is invalid: ${dg.dogmaEntryId}`);
      }
      dogmaEntryIds.push(dg.dogmaEntryId);
      if (dg.kind === "builtin") {
        if (typeof dg.dogmaId !== "string" || !isValidHierophantBuiltinDogmaId(dg.dogmaId)) {
          throw new DomainError("INVALID_CAMPAIGN_STATE", `${dPath}.dogmaId does not resolve: ${JSON.stringify(dg.dogmaId)}`);
        }
      } else if (dg.kind === "custom") {
        if (typeof dg.category !== "string" || !isValidHierophantDogmaCategory(dg.category)) {
          throw new DomainError("INVALID_CAMPAIGN_STATE", `${dPath}.category is invalid: ${JSON.stringify(dg.category)}`);
        }
        assertNonEmptyString(`${dPath}.text`, dg.text);
      } else {
        throw new DomainError("INVALID_CAMPAIGN_STATE", `${dPath}.kind is invalid: ${JSON.stringify(dg.kind)}`);
      }
    }
    uniqueIds(dogmaEntryIds, `${path} dogmaEntryId`);
  }
  uniqueIds(cultIds, "cultDenizenId");
  const cultIdSet = new Set(cultIds);

  const supplicantIds: string[] = [];
  for (let i = 0; i < (h.supplicants as unknown[]).length; i++) {
    const s = (h.supplicants as unknown[])[i];
    const path = `hierophant.supplicants[${i}]`;
    if (s === null || s === undefined || typeof s !== "object") {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path} is not a valid object`);
    }
    const rec = s as Record<string, unknown>;
    if (typeof rec.denizenId !== "string" || !isValidDenizenId(rec.denizenId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.denizenId is invalid: ${JSON.stringify(rec.denizenId)}`);
    }
    supplicantIds.push(rec.denizenId);
    assertNonEmptyString(`${path}.classId`, rec.classId);
    if (!isResolvableClassId(rec.classId, classIds)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.classId does not resolve: ${rec.classId}`);
    }
    assertNonNegativeSafeInteger(`${path}.woe`, rec.woe);
    if (rec.host === null || rec.host === undefined || typeof rec.host !== "object") {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.host must be an object`);
    }
    const host = rec.host as Record<string, unknown>;
    if (host.kind === "temple") {
      validateHostTemple(`${path}.host`, host.templeId, host.area, templeById, true);
    } else if (host.kind === "cult") {
      if (typeof host.cultDenizenId !== "string" || !isValidDenizenId(host.cultDenizenId)) {
        throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.host.cultDenizenId is invalid`);
      }
      if (!cultIdSet.has(host.cultDenizenId)) {
        throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.host.cultDenizenId does not resolve: ${host.cultDenizenId}`);
      }
    } else {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.host.kind is invalid: ${JSON.stringify(host.kind)}`);
    }
  }
  uniqueIds(supplicantIds, "supplicant denizenId");

  const prophetIds: string[] = [];
  for (let i = 0; i < (h.prophets as unknown[]).length; i++) {
    const p = (h.prophets as unknown[])[i];
    const path = `hierophant.prophets[${i}]`;
    if (p === null || p === undefined || typeof p !== "object") {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path} is not a valid object`);
    }
    const rec = p as Record<string, unknown>;
    if (typeof rec.denizenId !== "string" || !isValidDenizenId(rec.denizenId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.denizenId is invalid: ${JSON.stringify(rec.denizenId)}`);
    }
    prophetIds.push(rec.denizenId);
    if ("disposition" in rec) {
      throw new DomainError(
        "INVALID_CAMPAIGN_STATE",
        `${path} must not persist disposition; shared Powerful Status is authoritative`,
      );
    }
    if (rec.host === null || rec.host === undefined || typeof rec.host !== "object") {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.host must be an object`);
    }
    const host = rec.host as Record<string, unknown>;
    if (host.kind === "temple") {
      validateHostTemple(`${path}.host`, host.templeId, null, templeById, false);
    } else if (host.kind === "cult") {
      if (typeof host.cultDenizenId !== "string" || !isValidDenizenId(host.cultDenizenId)) {
        throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.host.cultDenizenId is invalid`);
      }
      if (!cultIdSet.has(host.cultDenizenId)) {
        throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.host.cultDenizenId does not resolve: ${host.cultDenizenId}`);
      }
    } else {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.host.kind is invalid: ${JSON.stringify(host.kind)}`);
    }
  }
  uniqueIds(prophetIds, "prophet denizenId");

  const holidayIds: string[] = [];
  for (let i = 0; i < (h.holidayTempleIds as unknown[]).length; i++) {
    const id = (h.holidayTempleIds as unknown[])[i];
    if (typeof id !== "string" || !isValidHierophantTempleId(id)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `hierophant.holidayTempleIds[${i}] is invalid: ${JSON.stringify(id)}`);
    }
    holidayIds.push(id);
  }
  uniqueIds(holidayIds, "holidayTempleId");
  for (let i = 0; i < holidayIds.length; i++) {
    if (!templeIds.includes(holidayIds[i])) {
      throw new DomainError(
        "INVALID_CAMPAIGN_STATE",
        `hierophant.holidayTempleIds[${i}] does not resolve to a Temple: ${holidayIds[i]}`,
      );
    }
  }
}

export function validateHierophantReferenceIntegrity(state: CampaignStateV5): void {
  validateHierophantStructure(state.hierophant);

  const placeIds = new Set(state.world.places.map((p) => p.placeId as string));
  const denizenById = new Map(state.world.denizens.map((d) => [d.denizenId as string, d]));
  const campaignDoctrineIds = new Set(state.hierophant.campaignDoctrines.map((d) => d.doctrineId as string));
  const campaignBlasphemyIds = new Set(
    state.hierophant.campaignDoctrines
      .map((d) => d.blasphemy?.blasphemyId as string | undefined)
      .filter((id): id is string => id !== undefined),
  );

  for (let i = 0; i < state.hierophant.temples.length; i++) {
    const temple: HierophantTemple = state.hierophant.temples[i];
    validateTemple(`hierophant.temples[${i}]`, temple, placeIds, campaignDoctrineIds, campaignBlasphemyIds);
  }

  for (let i = 0; i < state.hierophant.cults.length; i++) {
    const cult = state.hierophant.cults[i];
    const path = `hierophant.cults[${i}]`;
    const collective = denizenById.get(cult.cultDenizenId as string);
    if (collective === undefined) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.cultDenizenId does not resolve: ${cult.cultDenizenId}`);
    }
    if (collective.representation !== "collective") {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.cultDenizenId must reference a collective Denizen`);
    }
    requirePowerfulRoleProfile(collective, path, "cult");
    if (cult.anchorPlaceId !== null && !placeIds.has(cult.anchorPlaceId as string)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.anchorPlaceId does not resolve: ${cult.anchorPlaceId}`);
    }
    if (cult.leaderDenizenId !== null) {
      const leader = denizenById.get(cult.leaderDenizenId as string);
      if (leader === undefined) {
        throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.leaderDenizenId does not resolve: ${cult.leaderDenizenId}`);
      }
      if (leader.representation !== "individual") {
        throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.leaderDenizenId must reference an individual Denizen`);
      }
    }
  }

  for (let i = 0; i < state.hierophant.supplicants.length; i++) {
    const s = state.hierophant.supplicants[i];
    const path = `hierophant.supplicants[${i}]`;
    const denizen = denizenById.get(s.denizenId as string);
    if (denizen === undefined) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.denizenId does not resolve: ${s.denizenId}`);
    }
    if (denizen.representation !== "individual") {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.denizenId must reference an individual Denizen`);
    }
  }

  for (let i = 0; i < state.hierophant.prophets.length; i++) {
    const p = state.hierophant.prophets[i];
    const path = `hierophant.prophets[${i}]`;
    const denizen = denizenById.get(p.denizenId as string);
    if (denizen === undefined) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.denizenId does not resolve: ${p.denizenId}`);
    }
    if (denizen.representation !== "individual") {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.denizenId must reference an individual Denizen`);
    }
    const profile = requirePowerfulRoleProfile(denizen, path, "prophet");
    requireReliableOrDisruptiveStatus(profile, path);
  }
}
