import type { CampaignStateV5 } from "./campaign-state";
import { DomainError } from "./errors";
import type { DenizenId, IsleId, PlaceId } from "./ids";
import { isValidDenizenId, isValidIsleId, isValidPlaceId } from "./ids";
import type { HouseIndex } from "./orrery";
import { isValidPactSeatId } from "./pact-seats";
import { ELEMENT_IDS } from "./shared-world";
import type { MagicSchoolRef } from "./magic-consumables";
import {
  validateMagicConsumablesStructure,
  type MagicConsumablesState,
} from "./magic-consumables";
import {
  isValidCampaignSchoolOfMagicId,
  isValidSorcererBuiltinAlchemicalRecipeId,
  isValidSorcererLawOfMagicId,
  isValidSorcererSourceSchoolId,
  type SorcererLawOfMagicId,
} from "./sorcerer-catalogs";
import type { GrimoireSpellId } from "./grimoire-catalog";
import {
  grimoireSpellDefinition,
  isValidGrimoireSpellId,
} from "./grimoire-catalog";
import {
  isValidHierophantCampaignTempleId,
  isValidHierophantStartingTempleId,
  isValidHierophantTempleId,
} from "./hierophant-catalogs";
import { isValidWarlockIdeologyId } from "./warlock-catalogs";
import { isValidMarinerSeaRegionId } from "./mariner-catalogs";
import { requirePowerfulRoleProfile } from "./powerful-denizen-roles";
import type {
  SorcererAcademic,
  SorcererAcademicRole,
  SorcererArcanist,
  SorcererArcanistPlacement,
  SorcererCampaignAcademicKindDefinition,
  SorcererCampaignKnowledgeMethodDefinition,
  SorcererCampaignRecipeDefinition,
  SorcererCampaignSchoolDefinition,
  SorcererConstructInstruction,
  SorcererConstructOverlay,
  SorcererDisruptiveArcanistProfile,
  SorcererInnovation,
  SorcererKnowledgeState,
  SorcererRecipeRef,
  SorcererResearcher,
  SorcererResearchPosition,
  SorcererResearchPositionTarget,
  SorcererState,
} from "./sorcerer-state";
import {
  EMPTY_SORCERER_KNOWLEDGE_STATE,
  EMPTY_SORCERER_STATE,
  isValidSorcererArcanistRank,
  isValidSorcererCampaignAcademicKindId,
  isValidSorcererCampaignKnowledgeMethodId,
  isValidSorcererCampaignRecipeId,
  isValidSorcererInnovationId,
  isValidSorcererResearchPositionId,
  researchPositionTargetAgreesWithId,
} from "./sorcerer-state";

const MAX_TEXT_LENGTH = 8000;

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

function assertBoolean(path: string, value: unknown): asserts value is boolean {
  if (typeof value !== "boolean") {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `${path} must be a boolean`);
  }
}

function assertNonEmptyString(path: string, value: unknown): asserts value is string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `${path} must be a nonblank string`);
  }
  if (value.length > MAX_TEXT_LENGTH) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `${path} exceeds ${MAX_TEXT_LENGTH} characters`);
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

function validateMagicSchoolRef(path: string, value: unknown): MagicSchoolRef {
  const school = requireRecord(path, value);
  if (school.kind === "source") {
    if (typeof school.schoolId !== "string" || !isValidSorcererSourceSchoolId(school.schoolId)) {
      throw new DomainError(
        "INVALID_CAMPAIGN_STATE",
        `${path}.schoolId is not a known source School: ${JSON.stringify(school.schoolId)}`,
      );
    }
    return { kind: "source", schoolId: school.schoolId };
  }
  if (school.kind === "campaign") {
    if (typeof school.schoolId !== "string" || !isValidCampaignSchoolOfMagicId(school.schoolId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.schoolId is invalid: ${JSON.stringify(school.schoolId)}`);
    }
    return { kind: "campaign", schoolId: school.schoolId };
  }
  throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.kind is invalid: ${JSON.stringify(school.kind)}`);
}

function validateRecipeRef(path: string, value: unknown): SorcererRecipeRef {
  const recipe = requireRecord(path, value);
  if (recipe.kind === "builtin") {
    if (typeof recipe.recipeId !== "string" || !isValidSorcererBuiltinAlchemicalRecipeId(recipe.recipeId)) {
      throw new DomainError(
        "INVALID_CAMPAIGN_STATE",
        `${path}.recipeId is not a known built-in Recipe: ${JSON.stringify(recipe.recipeId)}`,
      );
    }
    return { kind: "builtin", recipeId: recipe.recipeId };
  }
  if (recipe.kind === "campaign") {
    if (typeof recipe.recipeId !== "string" || !isValidSorcererCampaignRecipeId(recipe.recipeId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.recipeId is invalid: ${JSON.stringify(recipe.recipeId)}`);
    }
    return { kind: "campaign", recipeId: recipe.recipeId };
  }
  throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.kind is invalid: ${JSON.stringify(recipe.kind)}`);
}

function validateAcademicRole(path: string, value: unknown): SorcererAcademicRole {
  const role = requireRecord(path, value);
  if (role.kind === "student") {
    return { kind: "student" };
  }
  if (role.kind === "professor") {
    return { kind: "professor" };
  }
  if (role.kind === "librarian") {
    return { kind: "librarian", school: validateMagicSchoolRef(`${path}.school`, role.school) };
  }
  if (role.kind === "alchemist") {
    return { kind: "alchemist", recipe: validateRecipeRef(`${path}.recipe`, role.recipe) };
  }
  if (role.kind === "campaign") {
    if (typeof role.academicKindId !== "string" || !isValidSorcererCampaignAcademicKindId(role.academicKindId)) {
      throw new DomainError(
        "INVALID_CAMPAIGN_STATE",
        `${path}.academicKindId is invalid: ${JSON.stringify(role.academicKindId)}`,
      );
    }
    return { kind: "campaign", academicKindId: role.academicKindId };
  }
  throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.kind is invalid: ${JSON.stringify(role.kind)}`);
}

function validateResearchPositionTarget(path: string, value: unknown): SorcererResearchPositionTarget {
  const target = requireRecord(path, value);
  if (target.kind === "orrery_house") {
    if (!isValidHouseIndex(target.house)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.house is invalid: ${JSON.stringify(target.house)}`);
    }
    return { kind: "orrery_house", house: target.house };
  }
  if (target.kind === "hierophant_temple") {
    if (typeof target.templeId !== "string" || !isValidHierophantTempleId(target.templeId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.templeId is invalid: ${JSON.stringify(target.templeId)}`);
    }
    return { kind: "hierophant_temple", templeId: target.templeId };
  }
  if (target.kind === "warlock_ideology") {
    if (typeof target.ideologyId !== "string" || !isValidWarlockIdeologyId(target.ideologyId)) {
      throw new DomainError(
        "INVALID_CAMPAIGN_STATE",
        `${path}.ideologyId is invalid: ${JSON.stringify(target.ideologyId)}`,
      );
    }
    return { kind: "warlock_ideology", ideologyId: target.ideologyId };
  }
  if (target.kind === "mariner_sea_region") {
    if (typeof target.seaRegionId !== "string" || !isValidMarinerSeaRegionId(target.seaRegionId)) {
      throw new DomainError(
        "INVALID_CAMPAIGN_STATE",
        `${path}.seaRegionId is invalid: ${JSON.stringify(target.seaRegionId)}`,
      );
    }
    return { kind: "mariner_sea_region", seaRegionId: target.seaRegionId };
  }
  if (target.kind === "sage_future_of_pact") {
    return { kind: "sage_future_of_pact" };
  }
  if (target.kind === "faustian_devils_schemes") {
    return { kind: "faustian_devils_schemes" };
  }
  if (target.kind === "necromancer_final_death") {
    return { kind: "necromancer_final_death" };
  }
  if (target.kind === "campaign_knowledge_method") {
    if (
      typeof target.knowledgeMethodId !== "string" ||
      !isValidSorcererCampaignKnowledgeMethodId(target.knowledgeMethodId)
    ) {
      throw new DomainError(
        "INVALID_CAMPAIGN_STATE",
        `${path}.knowledgeMethodId is invalid: ${JSON.stringify(target.knowledgeMethodId)}`,
      );
    }
    return { kind: "campaign_knowledge_method", knowledgeMethodId: target.knowledgeMethodId };
  }
  throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.kind is invalid: ${JSON.stringify(target.kind)}`);
}

function validateKnowledge(path: string, value: unknown): SorcererKnowledgeState {
  const knowledge = requireRecord(path, value);
  assertNonNegativeSafeInteger(`${path}.researchOrigin`, knowledge.researchOrigin);
  assertNonNegativeSafeInteger(`${path}.other`, knowledge.other);
  assertNonNegativeSafeInteger(`${path}.nextMonthResearchOrigin`, knowledge.nextMonthResearchOrigin);
  assertPositiveSafeInteger(
    `${path}.researcherProductionMultiplierCurrent`,
    knowledge.researcherProductionMultiplierCurrent,
  );
  assertPositiveSafeInteger(
    `${path}.researcherProductionMultiplierNextMonth`,
    knowledge.researcherProductionMultiplierNextMonth,
  );
  if ("totalKnowledge" in knowledge) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `${path} must not persist totalKnowledge`);
  }
  return {
    researchOrigin: knowledge.researchOrigin,
    other: knowledge.other,
    nextMonthResearchOrigin: knowledge.nextMonthResearchOrigin,
    researcherProductionMultiplierCurrent: knowledge.researcherProductionMultiplierCurrent,
    researcherProductionMultiplierNextMonth: knowledge.researcherProductionMultiplierNextMonth,
  };
}

function validateCampaignSchool(path: string, value: unknown): SorcererCampaignSchoolDefinition {
  const record = requireRecord(path, value);
  if (typeof record.schoolId !== "string" || !isValidCampaignSchoolOfMagicId(record.schoolId)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.schoolId is invalid: ${JSON.stringify(record.schoolId)}`);
  }
  assertNonEmptyString(`${path}.name`, record.name);
  assertNonEmptyString(`${path}.description`, record.description);
  return { schoolId: record.schoolId, name: record.name, description: record.description };
}

function validateCampaignAcademicKind(path: string, value: unknown): SorcererCampaignAcademicKindDefinition {
  const record = requireRecord(path, value);
  if (typeof record.academicKindId !== "string" || !isValidSorcererCampaignAcademicKindId(record.academicKindId)) {
    throw new DomainError(
      "INVALID_CAMPAIGN_STATE",
      `${path}.academicKindId is invalid: ${JSON.stringify(record.academicKindId)}`,
    );
  }
  assertNonEmptyString(`${path}.name`, record.name);
  assertNonEmptyString(`${path}.action`, record.action);
  return { academicKindId: record.academicKindId, name: record.name, action: record.action };
}

function validateCampaignRecipe(path: string, value: unknown): SorcererCampaignRecipeDefinition {
  const record = requireRecord(path, value);
  if (typeof record.recipeId !== "string" || !isValidSorcererCampaignRecipeId(record.recipeId)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.recipeId is invalid: ${JSON.stringify(record.recipeId)}`);
  }
  assertNonEmptyString(`${path}.name`, record.name);
  assertNonEmptyString(`${path}.recipeText`, record.recipeText);
  return { recipeId: record.recipeId, name: record.name, recipeText: record.recipeText };
}

function validateCampaignKnowledgeMethod(path: string, value: unknown): SorcererCampaignKnowledgeMethodDefinition {
  const record = requireRecord(path, value);
  if (typeof record.knowledgeMethodId !== "string" || !isValidSorcererCampaignKnowledgeMethodId(record.knowledgeMethodId)) {
    throw new DomainError(
      "INVALID_CAMPAIGN_STATE",
      `${path}.knowledgeMethodId is invalid: ${JSON.stringify(record.knowledgeMethodId)}`,
    );
  }
  assertNonEmptyString(`${path}.name`, record.name);
  assertNonEmptyString(`${path}.description`, record.description);
  return { knowledgeMethodId: record.knowledgeMethodId, name: record.name, description: record.description };
}

function validateResearchPosition(path: string, value: unknown): SorcererResearchPosition {
  const record = requireRecord(path, value);
  if (typeof record.positionId !== "string" || !isValidSorcererResearchPositionId(record.positionId)) {
    throw new DomainError(
      "INVALID_CAMPAIGN_STATE",
      `${path}.positionId is invalid: ${JSON.stringify(record.positionId)}`,
    );
  }
  const target = validateResearchPositionTarget(`${path}.target`, record.target);
  if (!researchPositionTargetAgreesWithId(record.positionId, target)) {
    throw new DomainError(
      "INVALID_CAMPAIGN_STATE",
      `${path}.target does not match positionId ${record.positionId}`,
    );
  }
  return {
    positionId: record.positionId,
    target,
  };
}

function validateResearcher(path: string, value: unknown): SorcererResearcher {
  const record = requireRecord(path, value);
  if (typeof record.denizenId !== "string" || !isValidDenizenId(record.denizenId)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.denizenId is invalid: ${JSON.stringify(record.denizenId)}`);
  }
  if (typeof record.positionId !== "string" || !isValidSorcererResearchPositionId(record.positionId)) {
    throw new DomainError(
      "INVALID_CAMPAIGN_STATE",
      `${path}.positionId is invalid: ${JSON.stringify(record.positionId)}`,
    );
  }
  assertBoolean(`${path}.operationalThisMonth`, record.operationalThisMonth);
  return {
    denizenId: record.denizenId,
    positionId: record.positionId,
    operationalThisMonth: record.operationalThisMonth,
  };
}

function validateAcademic(path: string, value: unknown): SorcererAcademic {
  const record = requireRecord(path, value);
  if (typeof record.denizenId !== "string" || !isValidDenizenId(record.denizenId)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.denizenId is invalid: ${JSON.stringify(record.denizenId)}`);
  }
  return { denizenId: record.denizenId, role: validateAcademicRole(`${path}.role`, record.role) };
}

function validateArcanistPlacement(path: string, value: unknown): SorcererArcanistPlacement {
  const placement = requireRecord(path, value);
  if (placement.kind === "tower") {
    return { kind: "tower" };
  }
  if (placement.kind === "other_domain") {
    if (typeof placement.seatId !== "string" || !isValidPactSeatId(placement.seatId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.seatId is invalid: ${JSON.stringify(placement.seatId)}`);
    }
    if (placement.seatId === "sorcerer") {
      throw new DomainError(
        "INVALID_CAMPAIGN_STATE",
        `${path}.seatId cannot be the Sorcerer's own Tower under ordinary singleton architecture`,
      );
    }
    return { kind: "other_domain", seatId: placement.seatId };
  }
  throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.kind is invalid: ${JSON.stringify(placement.kind)}`);
}

function validateDisruptiveProfile(path: string, value: unknown): SorcererDisruptiveArcanistProfile {
  const profile = requireRecord(path, value);
  if (typeof profile.primaryElement !== "string" || !(ELEMENT_IDS as readonly string[]).includes(profile.primaryElement)) {
    throw new DomainError(
      "INVALID_CAMPAIGN_STATE",
      `${path}.primaryElement is invalid: ${JSON.stringify(profile.primaryElement)}`,
    );
  }
  if (typeof profile.rank !== "string" || !isValidSorcererArcanistRank(profile.rank)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.rank is invalid: ${JSON.stringify(profile.rank)}`);
  }
  const changesRaw = requireArray(`${path}.changesOfMagic`, profile.changesOfMagic);
  const changesOfMagic: string[] = [];
  for (let i = 0; i < changesRaw.length; i++) {
    assertNonEmptyString(`${path}.changesOfMagic[${i}]`, changesRaw[i]);
    changesOfMagic.push(changesRaw[i] as string);
  }
  assertNonEmptyString(`${path}.quirk`, profile.quirk);
  const spellsRaw = requireArray(`${path}.prenticeSpellIds`, profile.prenticeSpellIds);
  const prenticeSpellIds: GrimoireSpellId[] = [];
  for (let i = 0; i < spellsRaw.length; i++) {
    const spellId = spellsRaw[i];
    if (typeof spellId !== "string" || !isValidGrimoireSpellId(spellId)) {
      throw new DomainError(
        "INVALID_CAMPAIGN_STATE",
        `${path}.prenticeSpellIds[${i}] is invalid: ${JSON.stringify(spellId)}`,
      );
    }
    prenticeSpellIds.push(spellId);
  }
  return {
    primaryElement: profile.primaryElement as SorcererDisruptiveArcanistProfile["primaryElement"],
    rank: profile.rank,
    changesOfMagic,
    quirk: profile.quirk,
    prenticeSpellIds,
  };
}

function validateArcanist(path: string, value: unknown): SorcererArcanist {
  const record = requireRecord(path, value);
  if (typeof record.denizenId !== "string" || !isValidDenizenId(record.denizenId)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.denizenId is invalid: ${JSON.stringify(record.denizenId)}`);
  }
  if ("reliable" in record) {
    throw new DomainError(
      "INVALID_CAMPAIGN_STATE",
      `${path} must not duplicate Reliable/Disruptive authority; shared Powerful status is authoritative`,
    );
  }
  const placement = validateArcanistPlacement(`${path}.placement`, record.placement);
  const disruptiveProfile =
    record.disruptiveProfile === null || record.disruptiveProfile === undefined
      ? null
      : validateDisruptiveProfile(`${path}.disruptiveProfile`, record.disruptiveProfile);
  return {
    denizenId: record.denizenId,
    school: validateMagicSchoolRef(`${path}.school`, record.school),
    placement,
    disruptiveProfile,
  };
}

function validateConstructInstruction(path: string, value: unknown): SorcererConstructInstruction {
  const record = requireRecord(path, value);
  assertNonEmptyString(`${path}.condition`, record.condition);
  assertNonEmptyString(`${path}.result`, record.result);
  return { condition: record.condition, result: record.result };
}

function validateConstruct(path: string, value: unknown): SorcererConstructOverlay {
  const record = requireRecord(path, value);
  if (typeof record.denizenId !== "string" || !isValidDenizenId(record.denizenId)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.denizenId is invalid: ${JSON.stringify(record.denizenId)}`);
  }
  const instructionsRaw = requireArray(`${path}.instructions`, record.instructions);
  const instructions: SorcererConstructInstruction[] = [];
  for (let i = 0; i < instructionsRaw.length; i++) {
    instructions.push(validateConstructInstruction(`${path}.instructions[${i}]`, instructionsRaw[i]));
  }
  return { denizenId: record.denizenId, instructions };
}

function validateInnovation(path: string, value: unknown): SorcererInnovation {
  const record = requireRecord(path, value);
  if (typeof record.innovationId !== "string" || !isValidSorcererInnovationId(record.innovationId)) {
    throw new DomainError(
      "INVALID_CAMPAIGN_STATE",
      `${path}.innovationId is invalid: ${JSON.stringify(record.innovationId)}`,
    );
  }
  if (typeof record.spellId !== "string" || !isValidGrimoireSpellId(record.spellId)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.spellId is invalid: ${JSON.stringify(record.spellId)}`);
  }
  if ("school" in record || "schoolId" in record) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `${path} must not persist a redundant School`);
  }
  assertNonEmptyString(`${path}.text`, record.text);
  return { innovationId: record.innovationId, spellId: record.spellId, text: record.text };
}

function nullableId(
  path: string,
  value: unknown,
  isValid: (value: string) => boolean,
): string | null {
  if (value === null) {
    return null;
  }
  if (typeof value !== "string" || !isValid(value)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `${path} is invalid: ${JSON.stringify(value)}`);
  }
  return value;
}

function assertUninitializedEmpty(state: SorcererState): void {
  if (state.spyrholmIsleId !== null || state.towerPlaceId !== null || state.universityPlaceId !== null) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "Uninitialized Sorcerer world refs must be null");
  }
  if (state.activeLawIds.length !== 0 || state.unrevealedLawIds.length !== 0) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "Uninitialized Sorcerer Laws must be empty");
  }
  if (
    state.campaignSchools.length !== 0 ||
    state.campaignAcademicKinds.length !== 0 ||
    state.campaignRecipes.length !== 0 ||
    state.campaignKnowledgeMethods.length !== 0 ||
    state.researchPositions.length !== 0 ||
    state.researchers.length !== 0 ||
    state.academics.length !== 0 ||
    state.towerOrder.length !== 0 ||
    state.arcanists.length !== 0 ||
    state.constructs.length !== 0 ||
    state.innovations.length !== 0
  ) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "Uninitialized Sorcerer collections must be empty");
  }
  if (
    state.knowledge.researchOrigin !== EMPTY_SORCERER_KNOWLEDGE_STATE.researchOrigin ||
    state.knowledge.other !== EMPTY_SORCERER_KNOWLEDGE_STATE.other ||
    state.knowledge.nextMonthResearchOrigin !== EMPTY_SORCERER_KNOWLEDGE_STATE.nextMonthResearchOrigin ||
    state.knowledge.researcherProductionMultiplierCurrent !==
      EMPTY_SORCERER_KNOWLEDGE_STATE.researcherProductionMultiplierCurrent ||
    state.knowledge.researcherProductionMultiplierNextMonth !==
      EMPTY_SORCERER_KNOWLEDGE_STATE.researcherProductionMultiplierNextMonth
  ) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "Uninitialized Sorcerer Knowledge must be neutral");
  }
  if (state.archivesOpen) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "Uninitialized Sorcerer Archives must be closed");
  }
}

export function validateSorcererStructure(state: unknown): SorcererState {
  const record = requireRecord("sorcerer", state);
  assertBoolean("sorcerer.initialized", record.initialized);

  const spyrholmIsleId = nullableId("sorcerer.spyrholmIsleId", record.spyrholmIsleId, isValidIsleId) as
    | SorcererState["spyrholmIsleId"];
  const towerPlaceId = nullableId("sorcerer.towerPlaceId", record.towerPlaceId, isValidPlaceId) as
    | SorcererState["towerPlaceId"];
  const universityPlaceId = nullableId(
    "sorcerer.universityPlaceId",
    record.universityPlaceId,
    isValidPlaceId,
  ) as SorcererState["universityPlaceId"];

  const activeLawIdsRaw = requireArray("sorcerer.activeLawIds", record.activeLawIds);
  const activeLawIds: SorcererLawOfMagicId[] = [];
  for (let i = 0; i < activeLawIdsRaw.length; i++) {
    const lawId = activeLawIdsRaw[i];
    if (typeof lawId !== "string" || !isValidSorcererLawOfMagicId(lawId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `sorcerer.activeLawIds[${i}] is invalid: ${JSON.stringify(lawId)}`);
    }
    activeLawIds.push(lawId);
  }
  uniqueIds(activeLawIds, "active Law of Magic");

  const unrevealedLawIdsRaw = requireArray("sorcerer.unrevealedLawIds", record.unrevealedLawIds);
  const unrevealedLawIds: SorcererLawOfMagicId[] = [];
  for (let i = 0; i < unrevealedLawIdsRaw.length; i++) {
    const lawId = unrevealedLawIdsRaw[i];
    if (typeof lawId !== "string" || !isValidSorcererLawOfMagicId(lawId)) {
      throw new DomainError(
        "INVALID_CAMPAIGN_STATE",
        `sorcerer.unrevealedLawIds[${i}] is invalid: ${JSON.stringify(lawId)}`,
      );
    }
    unrevealedLawIds.push(lawId);
  }
  uniqueIds(unrevealedLawIds, "unrevealed Law of Magic");
  for (const lawId of unrevealedLawIds) {
    if (activeLawIds.includes(lawId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `Law of Magic cannot be both active and unrevealed: ${lawId}`);
    }
  }

  const campaignSchoolsRaw = requireArray("sorcerer.campaignSchools", record.campaignSchools);
  const campaignSchools: SorcererCampaignSchoolDefinition[] = [];
  for (let i = 0; i < campaignSchoolsRaw.length; i++) {
    campaignSchools.push(validateCampaignSchool(`sorcerer.campaignSchools[${i}]`, campaignSchoolsRaw[i]));
  }
  uniqueIds(campaignSchools.map((school) => school.schoolId), "campaign School");

  const campaignAcademicKindsRaw = requireArray("sorcerer.campaignAcademicKinds", record.campaignAcademicKinds);
  const campaignAcademicKinds: SorcererCampaignAcademicKindDefinition[] = [];
  for (let i = 0; i < campaignAcademicKindsRaw.length; i++) {
    campaignAcademicKinds.push(
      validateCampaignAcademicKind(`sorcerer.campaignAcademicKinds[${i}]`, campaignAcademicKindsRaw[i]),
    );
  }
  uniqueIds(campaignAcademicKinds.map((kind) => kind.academicKindId), "campaign Academic kind");

  const campaignRecipesRaw = requireArray("sorcerer.campaignRecipes", record.campaignRecipes);
  const campaignRecipes: SorcererCampaignRecipeDefinition[] = [];
  for (let i = 0; i < campaignRecipesRaw.length; i++) {
    campaignRecipes.push(validateCampaignRecipe(`sorcerer.campaignRecipes[${i}]`, campaignRecipesRaw[i]));
  }
  uniqueIds(campaignRecipes.map((recipe) => recipe.recipeId), "campaign Recipe");

  const campaignKnowledgeMethodsRaw = requireArray(
    "sorcerer.campaignKnowledgeMethods",
    record.campaignKnowledgeMethods,
  );
  const campaignKnowledgeMethods: SorcererCampaignKnowledgeMethodDefinition[] = [];
  for (let i = 0; i < campaignKnowledgeMethodsRaw.length; i++) {
    campaignKnowledgeMethods.push(
      validateCampaignKnowledgeMethod(`sorcerer.campaignKnowledgeMethods[${i}]`, campaignKnowledgeMethodsRaw[i]),
    );
  }
  uniqueIds(campaignKnowledgeMethods.map((method) => method.knowledgeMethodId), "campaign Knowledge method");

  const researchPositionsRaw = requireArray("sorcerer.researchPositions", record.researchPositions);
  const researchPositions: SorcererResearchPosition[] = [];
  for (let i = 0; i < researchPositionsRaw.length; i++) {
    researchPositions.push(validateResearchPosition(`sorcerer.researchPositions[${i}]`, researchPositionsRaw[i]));
  }
  uniqueIds(researchPositions.map((position) => position.positionId), "Research Position");

  const researchersRaw = requireArray("sorcerer.researchers", record.researchers);
  const researchers: SorcererResearcher[] = [];
  for (let i = 0; i < researchersRaw.length; i++) {
    researchers.push(validateResearcher(`sorcerer.researchers[${i}]`, researchersRaw[i]));
  }
  uniqueIds(researchers.map((researcher) => researcher.denizenId), "Researcher");
  uniqueIds(researchers.map((researcher) => researcher.positionId), "Researcher Position occupant");

  const academicsRaw = requireArray("sorcerer.academics", record.academics);
  const academics: SorcererAcademic[] = [];
  for (let i = 0; i < academicsRaw.length; i++) {
    academics.push(validateAcademic(`sorcerer.academics[${i}]`, academicsRaw[i]));
  }
  uniqueIds(academics.map((academic) => academic.denizenId), "Academic");

  const researcherIds = new Set(researchers.map((researcher) => researcher.denizenId));
  for (const academic of academics) {
    if (researcherIds.has(academic.denizenId)) {
      throw new DomainError(
        "INVALID_CAMPAIGN_STATE",
        `Denizen cannot be both Researcher and Academic: ${academic.denizenId}`,
      );
    }
  }

  const towerOrderRaw = requireArray("sorcerer.towerOrder", record.towerOrder);
  const towerOrder: DenizenId[] = [];
  for (let i = 0; i < towerOrderRaw.length; i++) {
    const denizenId = towerOrderRaw[i];
    if (typeof denizenId !== "string" || !isValidDenizenId(denizenId)) {
      throw new DomainError(
        "INVALID_CAMPAIGN_STATE",
        `sorcerer.towerOrder[${i}] is invalid: ${JSON.stringify(denizenId)}`,
      );
    }
    towerOrder.push(denizenId);
  }
  uniqueIds(towerOrder, "Tower order Denizen");

  const arcanistsRaw = requireArray("sorcerer.arcanists", record.arcanists);
  const arcanists: SorcererArcanist[] = [];
  for (let i = 0; i < arcanistsRaw.length; i++) {
    arcanists.push(validateArcanist(`sorcerer.arcanists[${i}]`, arcanistsRaw[i]));
  }
  uniqueIds(arcanists.map((arcanist) => arcanist.denizenId), "Arcanist");

  const constructsRaw = requireArray("sorcerer.constructs", record.constructs);
  const constructs: SorcererConstructOverlay[] = [];
  for (let i = 0; i < constructsRaw.length; i++) {
    constructs.push(validateConstruct(`sorcerer.constructs[${i}]`, constructsRaw[i]));
  }
  uniqueIds(constructs.map((construct) => construct.denizenId), "Construct overlay");

  const innovationsRaw = requireArray("sorcerer.innovations", record.innovations);
  const innovations: SorcererInnovation[] = [];
  for (let i = 0; i < innovationsRaw.length; i++) {
    innovations.push(validateInnovation(`sorcerer.innovations[${i}]`, innovationsRaw[i]));
  }
  uniqueIds(innovations.map((innovation) => innovation.innovationId), "Innovation");

  assertBoolean("sorcerer.archivesOpen", record.archivesOpen);

  const sorcerer: SorcererState = {
    initialized: record.initialized,
    spyrholmIsleId,
    towerPlaceId,
    universityPlaceId,
    activeLawIds,
    unrevealedLawIds,
    campaignSchools,
    campaignAcademicKinds,
    campaignRecipes,
    campaignKnowledgeMethods,
    researchPositions,
    researchers,
    academics,
    towerOrder,
    knowledge: validateKnowledge("sorcerer.knowledge", record.knowledge),
    arcanists,
    constructs,
    innovations,
    archivesOpen: record.archivesOpen,
  };

  if (!sorcerer.initialized) {
    assertUninitializedEmpty(sorcerer);
  } else if (sorcerer.spyrholmIsleId === null || sorcerer.towerPlaceId === null || sorcerer.universityPlaceId === null) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "Initialized Sorcerer requires Spyrholm, Tower, and University refs");
  }

  return sorcerer;
}

function requirePlaceOnIsle(
  state: CampaignStateV5,
  placeId: string,
  isleId: string,
  path: string,
): void {
  const place = state.world.places.find((candidate) => candidate.placeId === placeId);
  if (place === undefined) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `${path} does not resolve: ${placeId}`);
  }
  if (place.placement.kind !== "on_isle" || place.placement.isleId !== isleId) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `${path} must be placed on Spyrholm`);
  }
}

export function validateMagicConsumablesReferenceIntegrity(state: CampaignStateV5): MagicConsumablesState {
  const consumables = validateMagicConsumablesStructure(state.magicConsumables);
  const wizardIds = new Set(state.wizards.map((wizard) => wizard.wizardId as string));
  const denizenIds = new Set(state.world.denizens.map((denizen) => denizen.denizenId as string));
  const campaignSchoolIds = new Set(state.sorcerer.campaignSchools.map((school) => school.schoolId as string));

  for (let i = 0; i < consumables.tomes.length; i++) {
    const stack = consumables.tomes[i];
    const path = `magicConsumables.tomes[${i}]`;
    if (stack.school.kind === "campaign" && !campaignSchoolIds.has(stack.school.schoolId)) {
      throw new DomainError(
        "INVALID_CAMPAIGN_STATE",
        `${path}.school.schoolId does not resolve: ${stack.school.schoolId}`,
      );
    }
    if (stack.custody.kind === "subject") {
      if (stack.custody.subject.kind === "wizard" && !wizardIds.has(stack.custody.subject.wizardId)) {
        throw new DomainError(
          "INVALID_CAMPAIGN_STATE",
          `${path}.custody.subject.wizardId does not resolve: ${stack.custody.subject.wizardId}`,
        );
      }
      if (stack.custody.subject.kind === "denizen" && !denizenIds.has(stack.custody.subject.denizenId)) {
        throw new DomainError(
          "INVALID_CAMPAIGN_STATE",
          `${path}.custody.subject.denizenId does not resolve: ${stack.custody.subject.denizenId}`,
        );
      }
    }
  }

  for (let i = 0; i < consumables.reagents.length; i++) {
    const stack = consumables.reagents[i];
    const path = `magicConsumables.reagents[${i}]`;
    if (stack.custody.kind === "subject") {
      if (stack.custody.subject.kind === "wizard" && !wizardIds.has(stack.custody.subject.wizardId)) {
        throw new DomainError(
          "INVALID_CAMPAIGN_STATE",
          `${path}.custody.subject.wizardId does not resolve: ${stack.custody.subject.wizardId}`,
        );
      }
      if (stack.custody.subject.kind === "denizen" && !denizenIds.has(stack.custody.subject.denizenId)) {
        throw new DomainError(
          "INVALID_CAMPAIGN_STATE",
          `${path}.custody.subject.denizenId does not resolve: ${stack.custody.subject.denizenId}`,
        );
      }
    }
  }

  return consumables;
}

function validateSorcererTowerHierarchy(sorcerer: SorcererState): void {
  const academicById = new Map(sorcerer.academics.map((academic) => [academic.denizenId, academic]));
  const reliableArcanistIds = new Set(
    sorcerer.arcanists
      .filter((arcanist) => arcanist.placement.kind === "tower")
      .map((arcanist) => arcanist.denizenId),
  );
  let seenNonStudentAcademic = false;
  let seenReliableArcanist = false;
  for (const denizenId of sorcerer.towerOrder) {
    const academic = academicById.get(denizenId);
    if (academic !== undefined) {
      if (seenReliableArcanist) {
        throw new DomainError(
          "INVALID_CAMPAIGN_STATE",
          `sorcerer.towerOrder places a Reliable Tower Arcanist below an Academic: ${denizenId}`,
        );
      }
      if (academic.role.kind === "student") {
        if (seenNonStudentAcademic) {
          throw new DomainError(
            "INVALID_CAMPAIGN_STATE",
            `sorcerer.towerOrder places a non-Student Academic below a Student: ${denizenId}`,
          );
        }
      } else {
        seenNonStudentAcademic = true;
      }
    } else if (reliableArcanistIds.has(denizenId)) {
      seenReliableArcanist = true;
    }
  }
}

export function validateSorcererReferenceIntegrity(state: CampaignStateV5): void {
  const sorcerer = validateSorcererStructure(state.sorcerer);
  validateMagicConsumablesReferenceIntegrity(state);

  if (!sorcerer.initialized) {
    return;
  }

  const isleIds = new Set(state.world.isles.map((isle) => isle.isleId as string));
  if (!isleIds.has(sorcerer.spyrholmIsleId!)) {
    throw new DomainError(
      "INVALID_CAMPAIGN_STATE",
      `sorcerer.spyrholmIsleId does not resolve: ${sorcerer.spyrholmIsleId}`,
    );
  }
  requirePlaceOnIsle(state, sorcerer.towerPlaceId!, sorcerer.spyrholmIsleId!, "sorcerer.towerPlaceId");
  requirePlaceOnIsle(state, sorcerer.universityPlaceId!, sorcerer.spyrholmIsleId!, "sorcerer.universityPlaceId");

  const denizenById = new Map(state.world.denizens.map((denizen) => [denizen.denizenId as string, denizen]));
  const positionById = new Map(sorcerer.researchPositions.map((position) => [position.positionId as string, position]));
  const campaignSchoolIds = new Set(sorcerer.campaignSchools.map((school) => school.schoolId as string));
  const campaignRecipeIds = new Set(sorcerer.campaignRecipes.map((recipe) => recipe.recipeId as string));
  const campaignAcademicKindIds = new Set(
    sorcerer.campaignAcademicKinds.map((kind) => kind.academicKindId as string),
  );
  const campaignKnowledgeMethodIds = new Set(
    sorcerer.campaignKnowledgeMethods.map((method) => method.knowledgeMethodId as string),
  );
  const currentTempleIds = new Set(state.hierophant.temples.map((temple) => temple.templeId as string));

  for (let i = 0; i < sorcerer.researchPositions.length; i++) {
    const path = `sorcerer.researchPositions[${i}].target`;
    const target = sorcerer.researchPositions[i].target;
    if (target.kind === "hierophant_temple") {
      if (isValidHierophantStartingTempleId(target.templeId)) {
        continue;
      }
      if (isValidHierophantCampaignTempleId(target.templeId) && !currentTempleIds.has(target.templeId)) {
        throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.templeId does not resolve: ${target.templeId}`);
      }
    }
    if (target.kind === "campaign_knowledge_method" && !campaignKnowledgeMethodIds.has(target.knowledgeMethodId)) {
      throw new DomainError(
        "INVALID_CAMPAIGN_STATE",
        `${path}.knowledgeMethodId does not resolve: ${target.knowledgeMethodId}`,
      );
    }
  }

  const researcherIds = new Set<string>();
  for (let i = 0; i < sorcerer.researchers.length; i++) {
    const path = `sorcerer.researchers[${i}]`;
    const researcher = sorcerer.researchers[i];
    if (!denizenById.has(researcher.denizenId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.denizenId does not resolve: ${researcher.denizenId}`);
    }
    if (!positionById.has(researcher.positionId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.positionId does not resolve: ${researcher.positionId}`);
    }
    researcherIds.add(researcher.denizenId);
  }

  const academicIds = new Set<string>();
  for (let i = 0; i < sorcerer.academics.length; i++) {
    const path = `sorcerer.academics[${i}]`;
    const academic = sorcerer.academics[i];
    if (!denizenById.has(academic.denizenId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.denizenId does not resolve: ${academic.denizenId}`);
    }
    academicIds.add(academic.denizenId);
    const role = academic.role;
    if (role.kind === "librarian") {
      if (role.school.kind === "campaign" && !campaignSchoolIds.has(role.school.schoolId)) {
        throw new DomainError(
          "INVALID_CAMPAIGN_STATE",
          `${path}.role.school.schoolId does not resolve: ${role.school.schoolId}`,
        );
      }
    }
    if (role.kind === "alchemist" && role.recipe.kind === "campaign" && !campaignRecipeIds.has(role.recipe.recipeId)) {
      throw new DomainError(
        "INVALID_CAMPAIGN_STATE",
        `${path}.role.recipe.recipeId does not resolve: ${role.recipe.recipeId}`,
      );
    }
    if (role.kind === "campaign" && !campaignAcademicKindIds.has(role.academicKindId)) {
      throw new DomainError(
        "INVALID_CAMPAIGN_STATE",
        `${path}.role.academicKindId does not resolve: ${role.academicKindId}`,
      );
    }
  }

  const towerWorkerIds: string[] = [];
  for (const academic of sorcerer.academics) {
    towerWorkerIds.push(academic.denizenId);
  }
  for (let i = 0; i < sorcerer.arcanists.length; i++) {
    const path = `sorcerer.arcanists[${i}]`;
    const arcanist = sorcerer.arcanists[i];
    const denizen = denizenById.get(arcanist.denizenId);
    if (denizen === undefined) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.denizenId does not resolve: ${arcanist.denizenId}`);
    }
    if (researcherIds.has(arcanist.denizenId) || academicIds.has(arcanist.denizenId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.denizenId overlaps another Sorcerer role`);
    }
    const profile = requirePowerfulRoleProfile(denizen, path, "arcanist");
    if (arcanist.school.kind === "campaign" && !campaignSchoolIds.has(arcanist.school.schoolId)) {
      throw new DomainError(
        "INVALID_CAMPAIGN_STATE",
        `${path}.school.schoolId does not resolve: ${arcanist.school.schoolId}`,
      );
    }
    if (arcanist.placement.kind === "tower") {
      if (profile.status.kind !== "standard" || profile.status.value !== "reliable") {
        throw new DomainError("INVALID_CAMPAIGN_STATE", `${path} Tower Arcanist requires standard Reliable Status`);
      }
      if (arcanist.disruptiveProfile !== null) {
        throw new DomainError("INVALID_CAMPAIGN_STATE", `${path} Reliable Tower Arcanist must not include a Disruptive profile`);
      }
      towerWorkerIds.push(arcanist.denizenId);
    } else {
      if (profile.status.kind !== "standard" || profile.status.value !== "disruptive") {
        throw new DomainError(
          "INVALID_CAMPAIGN_STATE",
          `${path} other-Domain Arcanist requires standard Disruptive Status`,
        );
      }
      if (arcanist.disruptiveProfile === null) {
        throw new DomainError("INVALID_CAMPAIGN_STATE", `${path} Disruptive Arcanist requires a Disruptive profile`);
      }
      const disruptive = arcanist.disruptiveProfile;
      if (disruptive.rank === "prentice") {
        if (arcanist.school.kind === "source") {
          if (disruptive.prenticeSpellIds.length < 1 || disruptive.prenticeSpellIds.length > 2) {
            throw new DomainError(
              "INVALID_CAMPAIGN_STATE",
              `${path}.disruptiveProfile.prenticeSpellIds must contain exactly 1 or 2 source-School spells`,
            );
          }
          uniqueIds(disruptive.prenticeSpellIds, `${path} Prentice spell`);
          for (const spellId of disruptive.prenticeSpellIds) {
            const spell = grimoireSpellDefinition(spellId);
            if (spell.schoolId !== arcanist.school.schoolId) {
              throw new DomainError(
                "INVALID_CAMPAIGN_STATE",
                `${path}.disruptiveProfile.prenticeSpellIds spell ${spellId} does not belong to School ${arcanist.school.schoolId}`,
              );
            }
          }
        } else if (disruptive.prenticeSpellIds.length !== 0) {
          throw new DomainError(
            "INVALID_CAMPAIGN_STATE",
            `${path}.disruptiveProfile.prenticeSpellIds must be empty for campaign-created Schools; custom spell identity is deferred`,
          );
        }
      } else if (disruptive.prenticeSpellIds.length !== 0) {
        throw new DomainError(
          "INVALID_CAMPAIGN_STATE",
          `${path}.disruptiveProfile.prenticeSpellIds must be empty for Journeyman/Master ranks`,
        );
      }
    }
  }

  const expectedTowerWorkers = new Set(towerWorkerIds);
  if (sorcerer.towerOrder.length !== expectedTowerWorkers.size) {
    throw new DomainError(
      "INVALID_CAMPAIGN_STATE",
      "sorcerer.towerOrder must include every current Tower Academic and Reliable Tower Arcanist exactly once",
    );
  }
  for (const denizenId of sorcerer.towerOrder) {
    if (!expectedTowerWorkers.has(denizenId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `sorcerer.towerOrder includes an inappropriate worker: ${denizenId}`);
    }
    if (researcherIds.has(denizenId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `sorcerer.towerOrder must not include Researcher ${denizenId}`);
    }
  }

  validateSorcererTowerHierarchy(sorcerer);

  for (let i = 0; i < sorcerer.constructs.length; i++) {
    const path = `sorcerer.constructs[${i}]`;
    const construct = sorcerer.constructs[i];
    const denizen = denizenById.get(construct.denizenId);
    if (denizen === undefined) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.denizenId does not resolve: ${construct.denizenId}`);
    }
    requirePowerfulRoleProfile(denizen, path, "construct");
  }

  for (let i = 0; i < sorcerer.innovations.length; i++) {
    const path = `sorcerer.innovations[${i}]`;
    const innovation = sorcerer.innovations[i];
    const spell = grimoireSpellDefinition(innovation.spellId);
    if (spell.isGreatWork) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.spellId must not be a Great Work: ${innovation.spellId}`);
    }
  }
}

export function isExactEmptySorcerer(state: SorcererState): boolean {
  return (
    state.initialized === EMPTY_SORCERER_STATE.initialized &&
    state.spyrholmIsleId === null &&
    state.towerPlaceId === null &&
    state.universityPlaceId === null &&
    state.activeLawIds.length === 0 &&
    state.unrevealedLawIds.length === 0 &&
    state.campaignSchools.length === 0 &&
    state.campaignAcademicKinds.length === 0 &&
    state.campaignRecipes.length === 0 &&
    state.campaignKnowledgeMethods.length === 0 &&
    state.researchPositions.length === 0 &&
    state.researchers.length === 0 &&
    state.academics.length === 0 &&
    state.towerOrder.length === 0 &&
    state.arcanists.length === 0 &&
    state.constructs.length === 0 &&
    state.innovations.length === 0 &&
    state.archivesOpen === false &&
    state.knowledge.researchOrigin === 0 &&
    state.knowledge.other === 0 &&
    state.knowledge.nextMonthResearchOrigin === 0 &&
    state.knowledge.researcherProductionMultiplierCurrent === 1 &&
    state.knowledge.researcherProductionMultiplierNextMonth === 1
  );
}
