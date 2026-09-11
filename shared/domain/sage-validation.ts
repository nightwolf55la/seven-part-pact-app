import type { CampaignStateV5 } from "./campaign-state";
import { DomainError } from "./errors";
import { isValidDenizenId, isValidWizardId } from "./ids";
import type { WizardOrDenizenSubjectRef } from "./shared-world";
import {
  isValidSageCycleId,
  isValidSageDestinyAssignmentStatus,
  isValidSageDestinyDefinitionId,
  isValidSageDreamingCondition,
  isValidSageDreamscapeSegmentId,
  isValidSageDruidGrade,
  isValidSageFairyForm,
  isValidSageFutureCondition,
  isValidSageLawOfDreamingId,
  isValidSageOrdinaryFairyNameGlyph,
  type SageDreamscapeSegmentId,
  type SageLawOfDreamingId,
} from "./sage-catalogs";
import {
  isValidSageDestinyInstanceId,
  sageOmenLocationKey,
  type SageDestinyInstanceId,
  type SageFairyName,
  type SageLostDreamerState,
  type SageOmenLocation,
  type SageOrdinaryFairyName,
} from "./sage-state";
import { isValidWarlockRebellionId } from "./warlock-state";
import {
  requirePowerfulRoleProfile,
  requireReliableOrDisruptiveStatus,
} from "./powerful-denizen-roles";

function requireRecord(path: string, value: unknown): Record<string, unknown> {
  if (value === null || value === undefined || typeof value !== "object") {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `${path} must be an object`);
  }
  return value as Record<string, unknown>;
}

function assertNonEmptyString(path: string, value: unknown): asserts value is string {
  if (typeof value !== "string" || value.length === 0) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `${path} must be a non-empty string`);
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

function requireArray(path: string, value: unknown): readonly unknown[] {
  if (!Array.isArray(value)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `${path} must be an array`);
  }
  return value;
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

function validateOmenLocation(path: string, value: unknown): SageOmenLocation {
  const location = requireRecord(path, value);
  if (location.kind === "future_of_the_pact") {
    return { kind: "future_of_the_pact" };
  }
  if (location.kind === "destiny") {
    if (typeof location.destinyInstanceId !== "string" || !isValidSageDestinyInstanceId(location.destinyInstanceId)) {
      throw new DomainError(
        "INVALID_CAMPAIGN_STATE",
        `${path}.destinyInstanceId is invalid: ${JSON.stringify(location.destinyInstanceId)}`,
      );
    }
    return { kind: "destiny", destinyInstanceId: location.destinyInstanceId };
  }
  if (location.kind === "character") {
    return { kind: "character", characterRef: validateCharacterRef(`${path}.characterRef`, location.characterRef) };
  }
  if (location.kind === "dreamscape") {
    if (typeof location.segmentId !== "string" || !isValidSageDreamscapeSegmentId(location.segmentId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.segmentId is invalid: ${JSON.stringify(location.segmentId)}`);
    }
    return { kind: "dreamscape", segmentId: location.segmentId };
  }
  if (location.kind === "warlock_court") {
    return { kind: "warlock_court" };
  }
  if (location.kind === "warlock_rebellion") {
    if (typeof location.rebellionId !== "string" || !isValidWarlockRebellionId(location.rebellionId)) {
      throw new DomainError(
        "INVALID_CAMPAIGN_STATE",
        `${path}.rebellionId is invalid: ${JSON.stringify(location.rebellionId)}`,
      );
    }
    return { kind: "warlock_rebellion", rebellionId: location.rebellionId };
  }
  throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.kind is invalid: ${JSON.stringify(location.kind)}`);
}

function validateOrdinaryFairyName(path: string, value: unknown): SageOrdinaryFairyName {
  const name = requireRecord(path, value);
  assertNonEmptyString(`${path}.name`, name.name);
  if (typeof name.glyph !== "string" || !isValidSageOrdinaryFairyNameGlyph(name.glyph)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.glyph is invalid: ${JSON.stringify(name.glyph)}`);
  }
  return { name: name.name, glyph: name.glyph };
}

function validateFairyName(path: string, value: unknown): SageFairyName {
  const name = requireRecord(path, value);
  if (name.kind === "ordinary") {
    const ordinary = validateOrdinaryFairyName(path, name);
    return { kind: "ordinary", name: ordinary.name, glyph: ordinary.glyph };
  }
  if (name.kind === "true") {
    assertNonEmptyString(`${path}.name`, name.name);
    return { kind: "true", name: name.name };
  }
  throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.kind is invalid: ${JSON.stringify(name.kind)}`);
}

function validateLostDreamer(path: string, value: unknown): SageLostDreamerState {
  const dreamer = requireRecord(path, value);
  if (typeof dreamer.wizardId !== "string" || !isValidWizardId(dreamer.wizardId)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.wizardId is invalid: ${JSON.stringify(dreamer.wizardId)}`);
  }
  if (dreamer.kind === "lost") {
    return { kind: "lost", wizardId: dreamer.wizardId };
  }
  if (dreamer.kind === "returned_recovering") {
    assertPositiveSafeInteger(`${path}.recoveryWeeksRemaining`, dreamer.recoveryWeeksRemaining);
    return {
      kind: "returned_recovering",
      wizardId: dreamer.wizardId,
      recoveryWeeksRemaining: dreamer.recoveryWeeksRemaining,
    };
  }
  throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.kind is invalid: ${JSON.stringify(dreamer.kind)}`);
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

export function validateSageStructure(sage: unknown): void {
  if (sage === null || sage === undefined || typeof sage !== "object") {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "Missing or invalid sage");
  }
  const s = sage as Record<string, unknown>;

  const selectedDreamingLawIds = requireArray("sage.selectedDreamingLawIds", s.selectedDreamingLawIds);
  for (let i = 0; i < selectedDreamingLawIds.length; i++) {
    const lawId = selectedDreamingLawIds[i];
    if (typeof lawId !== "string" || !isValidSageLawOfDreamingId(lawId)) {
      throw new DomainError(
        "INVALID_CAMPAIGN_STATE",
        `sage.selectedDreamingLawIds[${i}] is invalid: ${JSON.stringify(lawId)}`,
      );
    }
  }
  uniqueIds(selectedDreamingLawIds as SageLawOfDreamingId[], "Sage Law");

  if (s.dreamingCondition !== null) {
    if (typeof s.dreamingCondition !== "string" || !isValidSageDreamingCondition(s.dreamingCondition)) {
      throw new DomainError(
        "INVALID_CAMPAIGN_STATE",
        `sage.dreamingCondition is invalid: ${JSON.stringify(s.dreamingCondition)}`,
      );
    }
  }
  if (s.futureCondition !== null) {
    if (typeof s.futureCondition !== "string" || !isValidSageFutureCondition(s.futureCondition)) {
      throw new DomainError(
        "INVALID_CAMPAIGN_STATE",
        `sage.futureCondition is invalid: ${JSON.stringify(s.futureCondition)}`,
      );
    }
  }

  const destinyInstances = requireArray("sage.destinyInstances", s.destinyInstances);
  const instanceIds: SageDestinyInstanceId[] = [];
  const definitionIds = new Set<string>();
  for (let i = 0; i < destinyInstances.length; i++) {
    const path = `sage.destinyInstances[${i}]`;
    const instance = requireRecord(path, destinyInstances[i]);
    if (typeof instance.destinyInstanceId !== "string" || !isValidSageDestinyInstanceId(instance.destinyInstanceId)) {
      throw new DomainError(
        "INVALID_CAMPAIGN_STATE",
        `${path}.destinyInstanceId is invalid: ${JSON.stringify(instance.destinyInstanceId)}`,
      );
    }
    if (typeof instance.definitionId !== "string" || !isValidSageDestinyDefinitionId(instance.definitionId)) {
      throw new DomainError(
        "INVALID_CAMPAIGN_STATE",
        `${path}.definitionId is invalid: ${JSON.stringify(instance.definitionId)}`,
      );
    }
    instanceIds.push(instance.destinyInstanceId);
    definitionIds.add(instance.definitionId);
  }
  uniqueIds(instanceIds, "Sage Destiny instance");
  const instanceIdSet = new Set<string>(instanceIds);

  const destinyDeck = requireArray("sage.destinyDeck", s.destinyDeck);
  for (let i = 0; i < destinyDeck.length; i++) {
    const instanceId = destinyDeck[i];
    if (typeof instanceId !== "string" || !isValidSageDestinyInstanceId(instanceId)) {
      throw new DomainError(
        "INVALID_CAMPAIGN_STATE",
        `sage.destinyDeck[${i}] is invalid: ${JSON.stringify(instanceId)}`,
      );
    }
  }

  const setAsideDestinyInstanceIds = requireArray(
    "sage.setAsideDestinyInstanceIds",
    s.setAsideDestinyInstanceIds,
  );
  for (let i = 0; i < setAsideDestinyInstanceIds.length; i++) {
    const instanceId = setAsideDestinyInstanceIds[i];
    if (typeof instanceId !== "string" || !isValidSageDestinyInstanceId(instanceId)) {
      throw new DomainError(
        "INVALID_CAMPAIGN_STATE",
        `sage.setAsideDestinyInstanceIds[${i}] is invalid: ${JSON.stringify(instanceId)}`,
      );
    }
  }

  const assignedDestinies = requireArray("sage.assignedDestinies", s.assignedDestinies);
  const assignedIds: SageDestinyInstanceId[] = [];
  for (let i = 0; i < assignedDestinies.length; i++) {
    const path = `sage.assignedDestinies[${i}]`;
    const assigned = requireRecord(path, assignedDestinies[i]);
    if (typeof assigned.destinyInstanceId !== "string" || !isValidSageDestinyInstanceId(assigned.destinyInstanceId)) {
      throw new DomainError(
        "INVALID_CAMPAIGN_STATE",
        `${path}.destinyInstanceId is invalid: ${JSON.stringify(assigned.destinyInstanceId)}`,
      );
    }
    validateCharacterRef(`${path}.characterRef`, assigned.characterRef);
    if (typeof assigned.status !== "string" || !isValidSageDestinyAssignmentStatus(assigned.status)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.status is invalid: ${JSON.stringify(assigned.status)}`);
    }
    assignedIds.push(assigned.destinyInstanceId);
  }

  const locatedIds = [
    ...(destinyDeck as SageDestinyInstanceId[]),
    ...(setAsideDestinyInstanceIds as SageDestinyInstanceId[]),
    ...assignedIds,
  ];
  uniqueIds(locatedIds, "Sage Destiny location");
  for (const instanceId of instanceIds) {
    if (!locatedIds.includes(instanceId)) {
      throw new DomainError(
        "INVALID_CAMPAIGN_STATE",
        `Sage Destiny instance is not located: ${instanceId}`,
      );
    }
  }
  for (const instanceId of locatedIds) {
    if (!instanceIdSet.has(instanceId)) {
      throw new DomainError(
        "INVALID_CAMPAIGN_STATE",
        `Sage Destiny location references an unknown instance: ${instanceId}`,
      );
    }
  }

  const omenLedger = requireArray("sage.omenLedger", s.omenLedger);
  const omenKeys = new Set<string>();
  for (let i = 0; i < omenLedger.length; i++) {
    const path = `sage.omenLedger[${i}]`;
    const entry = requireRecord(path, omenLedger[i]);
    const location = validateOmenLocation(`${path}.location`, entry.location);
    assertPositiveSafeInteger(`${path}.count`, entry.count);
    if (location.kind === "destiny" && !instanceIdSet.has(location.destinyInstanceId)) {
      throw new DomainError(
        "INVALID_CAMPAIGN_STATE",
        `${path}.location.destinyInstanceId does not resolve: ${location.destinyInstanceId}`,
      );
    }
    const key = sageOmenLocationKey(location);
    if (omenKeys.has(key)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `Duplicate Sage Omen location: ${key}`);
    }
    omenKeys.add(key);
  }

  const dreamscapeAssociations = requireArray("sage.dreamscapeAssociations", s.dreamscapeAssociations);
  const associationDenizenIds: string[] = [];
  for (let i = 0; i < dreamscapeAssociations.length; i++) {
    const path = `sage.dreamscapeAssociations[${i}]`;
    const association = requireRecord(path, dreamscapeAssociations[i]);
    if (typeof association.denizenId !== "string" || !isValidDenizenId(association.denizenId)) {
      throw new DomainError(
        "INVALID_CAMPAIGN_STATE",
        `${path}.denizenId is invalid: ${JSON.stringify(association.denizenId)}`,
      );
    }
    const segmentIds = requireArray(`${path}.segmentIds`, association.segmentIds);
    if (segmentIds.length === 0) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.segmentIds must not be empty`);
    }
    for (let j = 0; j < segmentIds.length; j++) {
      const segmentId = segmentIds[j];
      if (typeof segmentId !== "string" || !isValidSageDreamscapeSegmentId(segmentId)) {
        throw new DomainError(
          "INVALID_CAMPAIGN_STATE",
          `${path}.segmentIds[${j}] is invalid: ${JSON.stringify(segmentId)}`,
        );
      }
    }
    uniqueIds(segmentIds as SageDreamscapeSegmentId[], `${path} Dreamscape segment`);
    associationDenizenIds.push(association.denizenId);
  }
  uniqueIds(associationDenizenIds, "Sage Dreamscape Denizen association");

  const earnedCycles = requireArray("sage.earnedCycles", s.earnedCycles);
  for (let i = 0; i < earnedCycles.length; i++) {
    const cycleId = earnedCycles[i];
    if (typeof cycleId !== "string" || !isValidSageCycleId(cycleId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `sage.earnedCycles[${i}] is invalid: ${JSON.stringify(cycleId)}`);
    }
  }

  const fairies = requireArray("sage.fairies", s.fairies);
  const fairyDenizenIds: string[] = [];
  for (let i = 0; i < fairies.length; i++) {
    const path = `sage.fairies[${i}]`;
    const fairy = requireRecord(path, fairies[i]);
    if (typeof fairy.denizenId !== "string" || !isValidDenizenId(fairy.denizenId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.denizenId is invalid: ${JSON.stringify(fairy.denizenId)}`);
    }
    if (typeof fairy.form !== "string" || !isValidSageFairyForm(fairy.form)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.form is invalid: ${JSON.stringify(fairy.form)}`);
    }
    const ordinaryNames = requireArray(`${path}.ordinaryNames`, fairy.ordinaryNames);
    for (let j = 0; j < ordinaryNames.length; j++) {
      validateOrdinaryFairyName(`${path}.ordinaryNames[${j}]`, ordinaryNames[j]);
    }
    if (fairy.trueName !== null) {
      const trueName = requireRecord(`${path}.trueName`, fairy.trueName);
      assertNonEmptyString(`${path}.trueName.name`, trueName.name);
    }
    fairyDenizenIds.push(fairy.denizenId);
  }
  uniqueIds(fairyDenizenIds, "Sage Fairy");

  const druids = requireArray("sage.druids", s.druids);
  const druidDenizenIds: string[] = [];
  for (let i = 0; i < druids.length; i++) {
    const path = `sage.druids[${i}]`;
    const druid = requireRecord(path, druids[i]);
    if (typeof druid.denizenId !== "string" || !isValidDenizenId(druid.denizenId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.denizenId is invalid: ${JSON.stringify(druid.denizenId)}`);
    }
    if (typeof druid.grade !== "string" || !isValidSageDruidGrade(druid.grade)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.grade is invalid: ${JSON.stringify(druid.grade)}`);
    }
    const fairyNames = requireArray(`${path}.fairyNames`, druid.fairyNames);
    for (let j = 0; j < fairyNames.length; j++) {
      validateFairyName(`${path}.fairyNames[${j}]`, fairyNames[j]);
    }
    const changesOfMagic = requireArray(`${path}.changesOfMagic`, druid.changesOfMagic);
    for (let j = 0; j < changesOfMagic.length; j++) {
      assertNonEmptyString(`${path}.changesOfMagic[${j}]`, changesOfMagic[j]);
    }
    if (druid.familiarDescription !== null) {
      assertNonEmptyString(`${path}.familiarDescription`, druid.familiarDescription);
    }
    druidDenizenIds.push(druid.denizenId);
  }
  uniqueIds(druidDenizenIds, "Sage Druid");

  const lostDreamers = requireArray("sage.lostDreamers", s.lostDreamers);
  const lostWizardIds: string[] = [];
  for (let i = 0; i < lostDreamers.length; i++) {
    const dreamer = validateLostDreamer(`sage.lostDreamers[${i}]`, lostDreamers[i]);
    lostWizardIds.push(dreamer.wizardId);
  }
  uniqueIds(lostWizardIds, "Sage lost dreamer");
}

export function validateSageReferenceIntegrity(state: CampaignStateV5): void {
  validateSageStructure(state.sage);
  const sage = state.sage;
  const denizenById = new Map(state.world.denizens.map((denizen) => [denizen.denizenId as string, denizen]));
  const wizardIds = new Set(state.wizards.map((wizard) => wizard.wizardId as string));
  const denizenIds = new Set(denizenById.keys());

  for (let i = 0; i < sage.assignedDestinies.length; i++) {
    const path = `sage.assignedDestinies[${i}].characterRef`;
    resolveCharacterRef(path, sage.assignedDestinies[i].characterRef, wizardIds, denizenIds);
  }

  const rebellionIds = new Set(state.warlock.rebellions.map((rebellion) => rebellion.rebellionId as string));

  for (let i = 0; i < sage.omenLedger.length; i++) {
    const path = `sage.omenLedger[${i}].location`;
    const location = sage.omenLedger[i].location;
    if (location.kind === "character") {
      resolveCharacterRef(`${path}.characterRef`, location.characterRef, wizardIds, denizenIds);
    }
    if (location.kind === "warlock_rebellion" && !rebellionIds.has(location.rebellionId)) {
      throw new DomainError(
        "INVALID_CAMPAIGN_STATE",
        `${path}.rebellionId does not resolve: ${location.rebellionId}`,
      );
    }
  }

  for (let i = 0; i < sage.dreamscapeAssociations.length; i++) {
    const path = `sage.dreamscapeAssociations[${i}]`;
    if (!denizenById.has(sage.dreamscapeAssociations[i].denizenId)) {
      throw new DomainError(
        "INVALID_CAMPAIGN_STATE",
        `${path}.denizenId does not resolve: ${sage.dreamscapeAssociations[i].denizenId}`,
      );
    }
  }

  for (let i = 0; i < sage.fairies.length; i++) {
    const path = `sage.fairies[${i}]`;
    const fairy = sage.fairies[i];
    const denizen = denizenById.get(fairy.denizenId);
    if (denizen === undefined) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.denizenId does not resolve: ${fairy.denizenId}`);
    }
    const expectedRepresentation = fairy.form === "cadre" ? "collective" : "individual";
    if (denizen.representation !== expectedRepresentation) {
      throw new DomainError(
        "INVALID_CAMPAIGN_STATE",
        `${path}.denizenId must reference a ${expectedRepresentation} Denizen for ${fairy.form} Fairy form`,
      );
    }
    const profile = requirePowerfulRoleProfile(denizen, path, "fairy");
    requireReliableOrDisruptiveStatus(profile, path);
  }

  for (let i = 0; i < sage.druids.length; i++) {
    const path = `sage.druids[${i}]`;
    const druid = sage.druids[i];
    const denizen = denizenById.get(druid.denizenId);
    if (denizen === undefined) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.denizenId does not resolve: ${druid.denizenId}`);
    }
    if (denizen.representation !== "individual") {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.denizenId must reference an individual Denizen`);
    }
    const profile = requirePowerfulRoleProfile(denizen, path, "druid");
    requireReliableOrDisruptiveStatus(profile, path);
  }

  for (let i = 0; i < sage.lostDreamers.length; i++) {
    const path = `sage.lostDreamers[${i}]`;
    if (!wizardIds.has(sage.lostDreamers[i].wizardId)) {
      throw new DomainError(
        "INVALID_CAMPAIGN_STATE",
        `${path}.wizardId does not resolve: ${sage.lostDreamers[i].wizardId}`,
      );
    }
  }
}
