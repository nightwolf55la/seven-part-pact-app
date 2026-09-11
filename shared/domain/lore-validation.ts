import type { CampaignStateV5 } from "./campaign-state";
import { DomainError } from "./errors";
import { isValidIsleId, isValidLoreCollectionId, isValidLoreEntryId, isValidPlaceId } from "./ids";
import { isValidPactSeatId } from "./pact-seats";
import { ELEMENT_IDS, type ElementId } from "./shared-world";
import { MARINER_HORIZON_CARDINAL_GROUP_IDS, type MarinerHorizonCardinalGroupId } from "./mariner-catalogs";
import { isValidNecromancerGateId, isValidNecromancerCampaignGateId } from "./necromancer-catalogs";
import { isValidHierophantTempleId, isValidHierophantCampaignTempleId } from "./hierophant-catalogs";
import { isValidWarlockClanId } from "./warlock-catalogs";
import {
  isValidSourceLoreCollectionId,
  isValidSourceLoreTopicId,
  lookupSourceLoreCatalog,
  sourceLoreCollectionDefinition,
  type SourceLoreBindingDescriptor,
  type SourceLoreCollectionDefinition,
} from "./lore-catalog";
import {
  expectedSubjectKindForBinding,
  loreSubjectKey,
  type CampaignAuthoredLoreEntry,
  type InstantiatedSourceLoreCollection,
  type LoreState,
  type LoreSubjectRef,
  type SourceLoreEntryOverride,
} from "./lore-state";

export const MAX_LORE_TEXT_LENGTH = 8000;
const ELEMENT_ID_SET = new Set<string>(ELEMENT_IDS);
const HORIZON_ID_SET = new Set<string>(MARINER_HORIZON_CARDINAL_GROUP_IDS);

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

export function assertValidStoredLoreText(path: string, value: unknown): asserts value is string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `${path} must be a nonblank string`);
  }
  if (value.length > MAX_LORE_TEXT_LENGTH) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `${path} exceeds ${MAX_LORE_TEXT_LENGTH} characters`);
  }
}

export function validateLoreSubjectRef(
  path: string,
  value: unknown,
  state: CampaignStateV5,
): LoreSubjectRef {
  const subject = requireRecord(path, value);
  const kind = subject.kind;
  if (kind === "isle") {
    if (typeof subject.isleId !== "string" || !isValidIsleId(subject.isleId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.isleId is malformed: ${JSON.stringify(subject.isleId)}`);
    }
    if (!state.world.isles.some((isle) => isle.isleId === subject.isleId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.isleId references nonexistent isle: ${subject.isleId}`);
    }
    return { kind: "isle", isleId: subject.isleId };
  }
  if (kind === "place") {
    if (typeof subject.placeId !== "string" || !isValidPlaceId(subject.placeId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.placeId is malformed: ${JSON.stringify(subject.placeId)}`);
    }
    if (!state.world.places.some((place) => place.placeId === subject.placeId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.placeId references nonexistent place: ${subject.placeId}`);
    }
    return { kind: "place", placeId: subject.placeId };
  }
  if (kind === "necromancer_gate") {
    if (typeof subject.gateId !== "string" || !isValidNecromancerGateId(subject.gateId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.gateId is malformed: ${JSON.stringify(subject.gateId)}`);
    }
    if (isValidNecromancerCampaignGateId(subject.gateId)) {
      if (!state.necromancer.gates.some((gate) => gate.gateId === subject.gateId)) {
        throw new DomainError(
          "INVALID_CAMPAIGN_STATE",
          `${path}.gateId references nonexistent campaign Gate: ${subject.gateId}`,
        );
      }
    }
    return { kind: "necromancer_gate", gateId: subject.gateId };
  }
  if (kind === "hierophant_temple") {
    if (typeof subject.templeId !== "string" || !isValidHierophantTempleId(subject.templeId)) {
      throw new DomainError(
        "INVALID_CAMPAIGN_STATE",
        `${path}.templeId is malformed: ${JSON.stringify(subject.templeId)}`,
      );
    }
    if (isValidHierophantCampaignTempleId(subject.templeId)) {
      if (!state.hierophant.temples.some((temple) => temple.templeId === subject.templeId)) {
        throw new DomainError(
          "INVALID_CAMPAIGN_STATE",
          `${path}.templeId references nonexistent campaign Temple: ${subject.templeId}`,
        );
      }
    }
    return { kind: "hierophant_temple", templeId: subject.templeId };
  }
  if (kind === "warlock_clan") {
    if (typeof subject.clanId !== "string" || !isValidWarlockClanId(subject.clanId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.clanId is invalid: ${JSON.stringify(subject.clanId)}`);
    }
    return { kind: "warlock_clan", clanId: subject.clanId };
  }
  if (kind === "element") {
    if (typeof subject.elementId !== "string" || !ELEMENT_ID_SET.has(subject.elementId)) {
      throw new DomainError(
        "INVALID_CAMPAIGN_STATE",
        `${path}.elementId is invalid: ${JSON.stringify(subject.elementId)}`,
      );
    }
    return { kind: "element", elementId: subject.elementId as ElementId };
  }
  if (kind === "pact_domain") {
    if (typeof subject.pactSeatId !== "string" || !isValidPactSeatId(subject.pactSeatId)) {
      throw new DomainError(
        "INVALID_CAMPAIGN_STATE",
        `${path}.pactSeatId is invalid: ${JSON.stringify(subject.pactSeatId)}`,
      );
    }
    return { kind: "pact_domain", pactSeatId: subject.pactSeatId };
  }
  if (kind === "mariner_horizon") {
    if (typeof subject.cardinalGroupId !== "string" || !HORIZON_ID_SET.has(subject.cardinalGroupId)) {
      throw new DomainError(
        "INVALID_CAMPAIGN_STATE",
        `${path}.cardinalGroupId is invalid: ${JSON.stringify(subject.cardinalGroupId)}`,
      );
    }
    return {
      kind: "mariner_horizon",
      cardinalGroupId: subject.cardinalGroupId as MarinerHorizonCardinalGroupId,
    };
  }
  if (kind === "source_topic") {
    if (typeof subject.topicId !== "string" || !isValidSourceLoreTopicId(subject.topicId)) {
      throw new DomainError(
        "INVALID_CAMPAIGN_STATE",
        `${path}.topicId is invalid: ${JSON.stringify(subject.topicId)}`,
      );
    }
    return { kind: "source_topic", topicId: subject.topicId };
  }
  throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.kind is invalid: ${JSON.stringify(kind)}`);
}

function staticBindingAgreesWithSubject(
  binding: SourceLoreBindingDescriptor,
  subject: LoreSubjectRef,
): boolean {
  switch (binding.strategy) {
    case "necromancer_builtin_gate":
      return subject.kind === "necromancer_gate" && subject.gateId === binding.gateId;
    case "hierophant_starting_temple":
      return subject.kind === "hierophant_temple" && subject.templeId === binding.templeId;
    case "warlock_clan":
      return subject.kind === "warlock_clan" && subject.clanId === binding.clanId;
    case "element":
      return subject.kind === "element" && subject.elementId === binding.elementId;
    case "mariner_horizon":
      return subject.kind === "mariner_horizon" && subject.cardinalGroupId === binding.cardinalGroupId;
    case "source_topic":
      return subject.kind === "source_topic" && subject.topicId === binding.topicId;
    default:
      return subject.kind === expectedSubjectKindForBinding(binding);
  }
}

function validateAuthoredEntries(
  path: string,
  value: unknown,
  loreEntryIds: Set<string>,
): readonly CampaignAuthoredLoreEntry[] {
  const entries = requireArray(path, value);
  const result: CampaignAuthoredLoreEntry[] = [];
  for (let i = 0; i < entries.length; i++) {
    const entryPath = `${path}[${i}]`;
    const entry = requireRecord(entryPath, entries[i]);
    if (typeof entry.loreEntryId !== "string" || !isValidLoreEntryId(entry.loreEntryId)) {
      throw new DomainError(
        "INVALID_CAMPAIGN_STATE",
        `${entryPath}.loreEntryId is malformed: ${JSON.stringify(entry.loreEntryId)}`,
      );
    }
    if (loreEntryIds.has(entry.loreEntryId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `Duplicate loreEntryId: ${entry.loreEntryId}`);
    }
    loreEntryIds.add(entry.loreEntryId);
    assertValidStoredLoreText(`${entryPath}.text`, entry.text);
    result.push({ loreEntryId: entry.loreEntryId, text: entry.text });
  }
  return result;
}

function validateOverrides(
  path: string,
  value: unknown,
  definition: SourceLoreCollectionDefinition,
): readonly SourceLoreEntryOverride[] {
  const overrides = requireArray(path, value);
  const seen = new Set<string>();
  const baselineIds = new Set(definition.entries.map((entry) => entry.sourceEntryId));
  const result: SourceLoreEntryOverride[] = [];
  for (let i = 0; i < overrides.length; i++) {
    const overridePath = `${path}[${i}]`;
    const override = requireRecord(overridePath, overrides[i]);
    if (typeof override.sourceEntryId !== "string") {
      throw new DomainError(
        "INVALID_CAMPAIGN_STATE",
        `${overridePath}.sourceEntryId is invalid: ${JSON.stringify(override.sourceEntryId)}`,
      );
    }
    if (!baselineIds.has(override.sourceEntryId)) {
      throw new DomainError(
        "INVALID_CAMPAIGN_STATE",
        `${overridePath} references nonexistent source entry ${definition.sourceCollectionId}:${override.sourceEntryId}`,
      );
    }
    if (seen.has(override.sourceEntryId)) {
      throw new DomainError(
        "INVALID_CAMPAIGN_STATE",
        `Duplicate source Lore override for ${definition.sourceCollectionId}:${override.sourceEntryId}`,
      );
    }
    seen.add(override.sourceEntryId);
    assertValidStoredLoreText(`${overridePath}.currentText`, override.currentText);
    result.push({ sourceEntryId: override.sourceEntryId, currentText: override.currentText });
  }
  return result;
}

function validateInstantiatedSourceCollection(
  path: string,
  value: unknown,
  state: CampaignStateV5,
  definitionLookup: (id: string) => SourceLoreCollectionDefinition | undefined,
  seenSourceCollectionIds: Set<string>,
  loreEntryIds: Set<string>,
): InstantiatedSourceLoreCollection {
  const collection = requireRecord(path, value);
  if (typeof collection.sourceCollectionId !== "string" || !isValidSourceLoreCollectionId(collection.sourceCollectionId)) {
    throw new DomainError(
      "INVALID_CAMPAIGN_STATE",
      `${path}.sourceCollectionId is unknown for the campaign ruleset: ${JSON.stringify(collection.sourceCollectionId)}`,
    );
  }
  if (seenSourceCollectionIds.has(collection.sourceCollectionId)) {
    throw new DomainError(
      "INVALID_CAMPAIGN_STATE",
      `Duplicate instantiated SourceLoreCollectionId: ${collection.sourceCollectionId}`,
    );
  }
  seenSourceCollectionIds.add(collection.sourceCollectionId);

  const definition = definitionLookup(collection.sourceCollectionId);
  if (definition === undefined) {
    throw new DomainError(
      "INVALID_CAMPAIGN_STATE",
      `${path}.sourceCollectionId is unknown for the campaign ruleset: ${collection.sourceCollectionId}`,
    );
  }

  const boundSubject = validateLoreSubjectRef(`${path}.boundSubject`, collection.boundSubject, state);
  if (boundSubject.kind !== definition.subjectKind) {
    throw new DomainError(
      "INVALID_CAMPAIGN_STATE",
      `${path}.boundSubject.kind ${boundSubject.kind} is incompatible with source collection ${definition.sourceCollectionId} (${definition.subjectKind})`,
    );
  }
  if (!staticBindingAgreesWithSubject(definition.binding, boundSubject)) {
    throw new DomainError(
      "INVALID_CAMPAIGN_STATE",
      `${path}.boundSubject does not match the source collection binding meaning for ${definition.sourceCollectionId}`,
    );
  }

  const overrides = validateOverrides(`${path}.overrides`, collection.overrides, definition);
  const additions = validateAuthoredEntries(`${path}.additions`, collection.additions, loreEntryIds);
  return {
    sourceCollectionId: collection.sourceCollectionId,
    boundSubject,
    overrides,
    additions,
  };
}

export function validateLoreStructure(lore: unknown): lore is LoreState {
  const record = requireRecord("lore", lore);
  requireArray("lore.sourceCollections", record.sourceCollections);
  requireArray("lore.campaignCollections", record.campaignCollections);
  return true;
}

export function validateLoreReferenceIntegrity(state: CampaignStateV5): void {
  validateLoreStructure(state.lore);

  const lookup = lookupSourceLoreCatalog(state.ruleset);
  if (!lookup.ok) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "Unsupported ruleset for Lore catalog lookup");
  }

  const seenSourceCollectionIds = new Set<string>();
  const loreEntryIds = new Set<string>();
  const sourceCollections = requireArray("lore.sourceCollections", state.lore.sourceCollections);
  for (let i = 0; i < sourceCollections.length; i++) {
    validateInstantiatedSourceCollection(
      `lore.sourceCollections[${i}]`,
      sourceCollections[i],
      state,
      (id) => sourceLoreCollectionDefinition(lookup.catalog, id),
      seenSourceCollectionIds,
      loreEntryIds,
    );
  }

  const seenCampaignCollectionIds = new Set<string>();
  const seenCampaignSubjects = new Set<string>();
  const campaignCollections = requireArray("lore.campaignCollections", state.lore.campaignCollections);
  for (let i = 0; i < campaignCollections.length; i++) {
    const path = `lore.campaignCollections[${i}]`;
    const collection = requireRecord(path, campaignCollections[i]);
    if (typeof collection.collectionId !== "string" || !isValidLoreCollectionId(collection.collectionId)) {
      throw new DomainError(
        "INVALID_CAMPAIGN_STATE",
        `${path}.collectionId is malformed: ${JSON.stringify(collection.collectionId)}`,
      );
    }
    if (seenCampaignCollectionIds.has(collection.collectionId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `Duplicate LoreCollectionId: ${collection.collectionId}`);
    }
    seenCampaignCollectionIds.add(collection.collectionId);

    const subject = validateLoreSubjectRef(`${path}.subject`, collection.subject, state);
    const subjectKey = loreSubjectKey(subject);
    if (seenCampaignSubjects.has(subjectKey)) {
      throw new DomainError(
        "INVALID_CAMPAIGN_STATE",
        `Duplicate canonical campaign Lore collection for subject ${subjectKey}`,
      );
    }
    seenCampaignSubjects.add(subjectKey);
    validateAuthoredEntries(`${path}.entries`, collection.entries, loreEntryIds);
  }
}
