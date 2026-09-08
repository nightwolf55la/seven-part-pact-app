import type { CampaignStateV5 } from "./campaign-state";
import { DomainError } from "./errors";
import { isValidPlaceId } from "./ids";
import { isValidPactSeatId } from "./pact-seats";
import {
  isValidHierophantBuiltinClassId,
  isValidHierophantBuiltinDoctrineId,
  isValidHierophantFlameLawId,
  isValidHierophantTempleId,
} from "./hierophant-catalogs";
import type {
  HierophantTemple,
} from "./hierophant-state";

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

function validateDoctrineState(path: string, doctrine: unknown, campaignDoctrineIds: Set<string>, blasphemyAllowed: boolean): void {
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
    return;
  }
  throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.doctrine.kind is invalid: ${JSON.stringify(d.kind)}`);
}

function validateTemple(path: string, temple: unknown, placeIds: Set<string> | null, campaignDoctrineIds: Set<string>): void {
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
    if ("doctrine" in t && t.doctrine !== undefined) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path} Hestar must not have a set Doctrine`);
    }
    return;
  }
  if (t.kind !== "ordinary") {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.kind is invalid: ${JSON.stringify(t.kind)}`);
  }
  validateDoctrineState(path, t.doctrine, campaignDoctrineIds, true);
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
    if (classIds.has(c.classId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `Duplicate campaign Class id: ${c.classId}`);
    }
    classIds.add(c.classId);
  }

  const campaignDoctrineIds = new Set<string>();
  for (let i = 0; i < (h.campaignDoctrines as unknown[]).length; i++) {
    const doc = (h.campaignDoctrines as unknown[])[i];
    const path = `hierophant.campaignDoctrines[${i}]`;
    if (doc === null || doc === undefined || typeof doc !== "object") {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path} is not a valid object`);
    }
    const d = doc as Record<string, unknown>;
    assertNonEmptyString(`${path}.doctrineId`, d.doctrineId);
    assertNonEmptyString(`${path}.name`, d.name);
    if (!Array.isArray(d.supportedClassIds)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.supportedClassIds must be an array`);
    }
    if (isValidHierophantBuiltinDoctrineId(d.doctrineId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.doctrineId collides with a built-in Doctrine: ${d.doctrineId}`);
    }
    if (campaignDoctrineIds.has(d.doctrineId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `Duplicate campaign Doctrine id: ${d.doctrineId}`);
    }
    campaignDoctrineIds.add(d.doctrineId);
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

  if ((h.supplicants as unknown[]).length > 0) {
    throw new DomainError(
      "INVALID_CAMPAIGN_STATE",
      "hierophant.supplicants must be empty until Slice 2 Denizen-backed records",
    );
  }
  if ((h.prophets as unknown[]).length > 0) {
    throw new DomainError(
      "INVALID_CAMPAIGN_STATE",
      "hierophant.prophets must be empty until Slice 2 Denizen-backed records",
    );
  }
  if ((h.cults as unknown[]).length > 0) {
    throw new DomainError(
      "INVALID_CAMPAIGN_STATE",
      "hierophant.cults must be empty until Slice 2 Denizen-backed records",
    );
  }

  const holidayIds: string[] = [];
  for (let i = 0; i < (h.holidayTempleIds as unknown[]).length; i++) {
    const id = (h.holidayTempleIds as unknown[])[i];
    if (typeof id !== "string" || !isValidHierophantTempleId(id)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `hierophant.holidayTempleIds[${i}] is invalid: ${JSON.stringify(id)}`);
    }
    holidayIds.push(id);
  }
  uniqueIds(holidayIds, "holidayTempleId");

  const templeIds: string[] = [];
  const templePlaceIds: string[] = [];
  for (let i = 0; i < (h.temples as unknown[]).length; i++) {
    const temple = (h.temples as unknown[])[i];
    validateTemple(`hierophant.temples[${i}]`, temple, null, campaignDoctrineIds);
    const t = temple as Record<string, unknown>;
    templeIds.push(t.templeId as string);
    templePlaceIds.push(t.placeId as string);
  }
  uniqueIds(templeIds, "templeId");
  uniqueIds(templePlaceIds, "Temple placeId");

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
  const campaignDoctrineIds = new Set(state.hierophant.campaignDoctrines.map((d) => d.doctrineId as string));

  for (let i = 0; i < state.hierophant.temples.length; i++) {
    const temple: HierophantTemple = state.hierophant.temples[i];
    validateTemple(`hierophant.temples[${i}]`, temple, placeIds, campaignDoctrineIds);
  }
}
