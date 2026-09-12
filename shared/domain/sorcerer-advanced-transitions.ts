/**
 * Body C1 advanced / correction Sorcerer transitions.
 *
 * These record already-resolved table outcomes. They do not automate Research,
 * Discovery, monthly procedures, or spellcasting.
 */

import type { CampaignStateV5 } from "./campaign-state";
import { canonicalJsonStringify } from "./canonical-json";
import { DomainError } from "./errors";
import type { DenizenId, PowerfulDenizenTruthId } from "./ids";
import { isValidDenizenId, isValidPowerfulDenizenTruthId } from "./ids";
import type { PactSeatId } from "./pact-seats";
import { isValidPactSeatId } from "./pact-seats";
import type { GrimoireSpellId } from "./grimoire-catalog";
import { grimoireSpellDefinition, isValidGrimoireSpellId } from "./grimoire-catalog";
import type { MagicSchoolRef } from "./magic-consumables";
import type { PowerfulDenizenProfile, PowerfulDenizenTruthEntry } from "./powerful-denizen";
import { denizenHasBuiltinTaxonomy } from "./powerful-denizen-roles";
import {
  isValidCampaignSchoolOfMagicId,
  isValidSorcererLawOfMagicId,
  isValidSorcererSourceSchoolId,
  type CampaignSchoolOfMagicId,
  type SorcererLawOfMagicId,
} from "./sorcerer-catalogs";
import type { SorcererEvent } from "./events";
import type {
  SorcererArcanist,
  SorcererArcanistPlacement,
  SorcererCampaignAcademicKindDefinition,
  SorcererCampaignAcademicKindId,
  SorcererCampaignKnowledgeMethodDefinition,
  SorcererCampaignKnowledgeMethodId,
  SorcererCampaignRecipeDefinition,
  SorcererCampaignRecipeId,
  SorcererCampaignResearchPositionId,
  SorcererCampaignSchoolDefinition,
  SorcererConstructInstruction,
  SorcererConstructOverlay,
  SorcererDisruptiveArcanistProfile,
  SorcererInnovation,
  SorcererInnovationId,
  SorcererResearchPositionId,
  SorcererState,
} from "./sorcerer-state";
import {
  isValidSorcererArcanistRank,
  isValidSorcererCampaignAcademicKindId,
  isValidSorcererCampaignKnowledgeMethodId,
  isValidSorcererCampaignRecipeId,
  isValidSorcererCampaignResearchPositionId,
  isValidSorcererInnovationId,
} from "./sorcerer-state";
import { validateSorcererReferenceIntegrity } from "./sorcerer-validation";
import { ELEMENT_IDS } from "./shared-world";
import { applyCreateDenizenV5Candidate } from "./world-subject-transitions";
import type { SorcererTransitionResult } from "./sorcerer-transitions";

const MAX_TEXT_LENGTH = 8000;

export type AddSorcererArcanistSubject =
  | {
      readonly kind: "create_denizen";
      readonly denizenId: DenizenId;
      readonly name: string;
      readonly description: string | null;
    }
  | { readonly kind: "existing_denizen"; readonly denizenId: DenizenId };

export interface SetSorcererResearcherProductionMultipliersInput {
  readonly expectedCurrent: number;
  readonly expectedNextMonth: number;
  readonly current: number;
  readonly nextMonth: number;
}

export interface SetSorcererLawsInput {
  readonly expectedActiveLawIds: readonly SorcererLawOfMagicId[];
  readonly expectedUnrevealedLawIds: readonly SorcererLawOfMagicId[];
  readonly activeLawIds: readonly SorcererLawOfMagicId[];
  readonly unrevealedLawIds: readonly SorcererLawOfMagicId[];
}

export type CreateSorcererCampaignDefinitionInput =
  | {
      readonly kind: "school";
      readonly schoolId: CampaignSchoolOfMagicId;
      readonly name: string;
      readonly description: string;
    }
  | {
      readonly kind: "academic_kind";
      readonly academicKindId: SorcererCampaignAcademicKindId;
      readonly name: string;
      readonly action: string;
    }
  | {
      readonly kind: "recipe";
      readonly recipeId: SorcererCampaignRecipeId;
      readonly name: string;
      readonly recipeText: string;
    }
  | {
      readonly kind: "knowledge_method";
      readonly knowledgeMethodId: SorcererCampaignKnowledgeMethodId;
      readonly researchPositionId: SorcererCampaignResearchPositionId;
      readonly name: string;
      readonly description: string;
    };

export type UpdateSorcererCampaignDefinitionInput =
  | {
      readonly kind: "school";
      readonly schoolId: CampaignSchoolOfMagicId;
      readonly expectedName: string;
      readonly expectedDescription: string;
      readonly name: string;
      readonly description: string;
    }
  | {
      readonly kind: "academic_kind";
      readonly academicKindId: SorcererCampaignAcademicKindId;
      readonly expectedName: string;
      readonly expectedAction: string;
      readonly name: string;
      readonly action: string;
    }
  | {
      readonly kind: "recipe";
      readonly recipeId: SorcererCampaignRecipeId;
      readonly expectedName: string;
      readonly expectedRecipeText: string;
      readonly name: string;
      readonly recipeText: string;
    }
  | {
      readonly kind: "knowledge_method";
      readonly knowledgeMethodId: SorcererCampaignKnowledgeMethodId;
      readonly expectedName: string;
      readonly expectedDescription: string;
      readonly name: string;
      readonly description: string;
    };

export type AddSorcererArcanistPlacement =
  | { readonly kind: "tower" }
  | {
      readonly kind: "other_domain";
      readonly seatId: PactSeatId;
      readonly disruptiveProfile: SorcererDisruptiveArcanistProfile;
    };

export interface AddSorcererArcanistInput {
  readonly subject: AddSorcererArcanistSubject;
  readonly school: MagicSchoolRef;
  readonly placement: AddSorcererArcanistPlacement;
  readonly expectedTowerOrder?: readonly DenizenId[];
}

export interface UpdateSorcererArcanistInput {
  readonly denizenId: DenizenId;
  readonly expectedArcanist: SorcererArcanist;
  readonly school: MagicSchoolRef;
  readonly placement: SorcererArcanistPlacement;
  readonly disruptiveProfile: SorcererDisruptiveArcanistProfile | null;
  readonly expectedTowerOrder?: readonly DenizenId[];
}

export interface AddSorcererConstructTruthInput {
  readonly truthId: PowerfulDenizenTruthId;
  readonly text: string;
}

export interface AddSorcererConstructInput {
  readonly denizenId: DenizenId;
  readonly name: string;
  readonly description: string | null;
  readonly truths: readonly AddSorcererConstructTruthInput[];
  readonly instructions: readonly SorcererConstructInstruction[];
}

export interface SetSorcererConstructInstructionsInput {
  readonly denizenId: DenizenId;
  readonly expectedInstructions: readonly SorcererConstructInstruction[];
  readonly instructions: readonly SorcererConstructInstruction[];
}

export interface AddSorcererInnovationInput {
  readonly innovationId: SorcererInnovationId;
  readonly spellId: GrimoireSpellId;
  readonly text: string;
}

export interface ReviseSorcererInnovationInput {
  readonly innovationId: SorcererInnovationId;
  readonly expectedSpellId: GrimoireSpellId;
  readonly expectedText: string;
  readonly spellId: GrimoireSpellId;
  readonly text: string;
}

export interface RemoveSorcererInnovationInput {
  readonly innovationId: SorcererInnovationId;
  readonly expectedSpellId: GrimoireSpellId;
  readonly expectedText: string;
}

function structurallyEqual(a: unknown, b: unknown): boolean {
  return canonicalJsonStringify(a) === canonicalJsonStringify(b);
}

function normalizeText(raw: string, label: string): string {
  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `${label} must not be blank`);
  }
  if (trimmed.length > MAX_TEXT_LENGTH) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `${label} exceeds ${MAX_TEXT_LENGTH} characters`);
  }
  return trimmed;
}

function normalizeOptionalDescription(raw: string | null): string | null {
  if (raw === null) {
    return null;
  }
  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    return null;
  }
  if (trimmed.length > MAX_TEXT_LENGTH) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `description exceeds ${MAX_TEXT_LENGTH} characters`);
  }
  return trimmed;
}

function uniqueOrThrow(ids: readonly string[], label: string): void {
  const seen = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `Duplicate ${label}: ${id}`);
    }
    seen.add(id);
  }
}

function assertPositiveSafeInteger(label: string, value: number): void {
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `${label} must be a positive safe integer`);
  }
}

function denizenIdsEqual(a: readonly DenizenId[], b: readonly DenizenId[]): boolean {
  return a.length === b.length && a.every((id, index) => id === b[index]);
}

function lawIdsEqual(a: readonly SorcererLawOfMagicId[], b: readonly SorcererLawOfMagicId[]): boolean {
  return a.length === b.length && a.every((id, index) => id === b[index]);
}

function requireInitializedSorcerer(state: CampaignStateV5): SorcererState {
  if (!state.sorcerer.initialized) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "Sorcerer has not been initialized");
  }
  return state.sorcerer;
}

function commitAdvanced(
  nextState: CampaignStateV5,
  events: readonly SorcererEvent[],
): SorcererTransitionResult {
  validateSorcererReferenceIntegrity(nextState);
  return { nextState, events };
}

function replaceSorcerer(state: CampaignStateV5, sorcerer: SorcererState): CampaignStateV5 {
  return { ...state, sorcerer };
}

function canonicalizeMagicSchoolRef(school: MagicSchoolRef, label: string): MagicSchoolRef {
  if (school.kind === "source") {
    if (!isValidSorcererSourceSchoolId(school.schoolId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${label} is not a known source School`);
    }
    return { kind: "source", schoolId: school.schoolId };
  }
  if (!isValidCampaignSchoolOfMagicId(school.schoolId)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `${label} campaign School id is invalid`);
  }
  return { kind: "campaign", schoolId: school.schoolId };
}

function canonicalizeDisruptiveProfile(
  profile: SorcererDisruptiveArcanistProfile,
): SorcererDisruptiveArcanistProfile {
  if (!(ELEMENT_IDS as readonly string[]).includes(profile.primaryElement)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "Disruptive Arcanist primaryElement is invalid");
  }
  if (!isValidSorcererArcanistRank(profile.rank)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Disruptive Arcanist rank is invalid: ${profile.rank}`);
  }
  return {
    primaryElement: profile.primaryElement,
    rank: profile.rank,
    changesOfMagic: profile.changesOfMagic.map((entry, index) =>
      normalizeText(entry, `Disruptive Arcanist changesOfMagic[${index}]`),
    ),
    quirk: normalizeText(profile.quirk, "Disruptive Arcanist quirk"),
    prenticeSpellIds: profile.prenticeSpellIds.map((spellId) => {
      if (!isValidGrimoireSpellId(spellId)) {
        throw new DomainError("INVALID_CAMPAIGN_STATE", `Invalid Prentice spell id: ${spellId}`);
      }
      return spellId;
    }),
  };
}

function canonicalizeArcanistRecord(arcanist: SorcererArcanist): SorcererArcanist {
  const placement = arcanist.placement.kind === "tower"
    ? { kind: "tower" as const }
    : { kind: "other_domain" as const, seatId: arcanist.placement.seatId };
  return {
    denizenId: arcanist.denizenId,
    school: canonicalizeMagicSchoolRef(arcanist.school, "Arcanist School"),
    placement,
    disruptiveProfile: arcanist.disruptiveProfile === null
      ? null
      : canonicalizeDisruptiveProfile(arcanist.disruptiveProfile),
  };
}

function canonicalizeInstruction(instruction: SorcererConstructInstruction, label: string): SorcererConstructInstruction {
  return {
    condition: normalizeText(instruction.condition, `${label} condition`),
    result: normalizeText(instruction.result, `${label} result`),
  };
}

function canonicalizeLawIds(ids: readonly SorcererLawOfMagicId[], label: string): SorcererLawOfMagicId[] {
  const next = ids.map((lawId, index) => {
    if (!isValidSorcererLawOfMagicId(lawId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${label}[${index}] is not a canonical Law of Magic`);
    }
    return lawId;
  });
  uniqueOrThrow(next, label);
  return next;
}

function requireExpectedTowerOrder(
  current: readonly DenizenId[],
  expected: readonly DenizenId[] | undefined,
  required: boolean,
): void {
  if (!required) {
    return;
  }
  if (expected === undefined) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "expectedTowerOrder is required for this Tower correction");
  }
  if (!denizenIdsEqual(current, expected)) {
    throw new DomainError(
      "STALE_COMMAND_PRECONDITION",
      "Tower order does not match the expected current order",
    );
  }
}

function requireNoPersonnelConflict(sorcerer: SorcererState, denizenId: DenizenId): void {
  if (sorcerer.researchers.some((researcher) => researcher.denizenId === denizenId)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Denizen already holds a conflicting Sorcerer role (Researcher): ${denizenId}`);
  }
  if (sorcerer.academics.some((academic) => academic.denizenId === denizenId)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Denizen already holds a conflicting Sorcerer role (Academic): ${denizenId}`);
  }
  if (sorcerer.arcanists.some((arcanist) => arcanist.denizenId === denizenId)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Denizen already holds a conflicting Sorcerer role (Arcanist): ${denizenId}`);
  }
  if (sorcerer.constructs.some((construct) => construct.denizenId === denizenId)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Denizen already holds a conflicting Sorcerer role (Construct): ${denizenId}`);
  }
}

function requireIndividualDenizen(state: CampaignStateV5, denizenId: DenizenId, label: string) {
  const denizen = state.world.denizens.find((entry) => entry.denizenId === denizenId);
  if (denizen === undefined) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `${label} Denizen does not resolve: ${denizenId}`);
  }
  if (denizen.representation !== "individual") {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `${label} must reference an individual Denizen`);
  }
  return denizen;
}

function replaceDenizenProfile(
  state: CampaignStateV5,
  denizenId: DenizenId,
  profile: PowerfulDenizenProfile,
): CampaignStateV5 {
  return {
    ...state,
    world: {
      ...state.world,
      denizens: state.world.denizens.map((denizen) => (
        denizen.denizenId === denizenId ? { ...denizen, powerfulProfile: profile } : denizen
      )),
    },
  };
}

function reliableArcanistProfile(): PowerfulDenizenProfile {
  return {
    taxonomies: [{ kind: "builtin", taxonomyId: "arcanist" }],
    status: { kind: "standard", value: "reliable" },
    goal: null,
    methods: [],
    truths: [],
  };
}

function disruptiveArcanistProfile(): PowerfulDenizenProfile {
  return {
    taxonomies: [{ kind: "builtin", taxonomyId: "arcanist" }],
    status: { kind: "standard", value: "disruptive" },
    goal: null,
    methods: [],
    truths: [],
  };
}

function isCompatibleArcanistProfile(
  profile: PowerfulDenizenProfile,
  status: "reliable" | "disruptive",
): boolean {
  return denizenHasBuiltinTaxonomy({ powerfulProfile: profile }, "arcanist")
    && profile.status.kind === "standard"
    && profile.status.value === status;
}

function withArcanistStatus(
  profile: PowerfulDenizenProfile,
  status: "reliable" | "disruptive",
): PowerfulDenizenProfile {
  return {
    ...profile,
    status: { kind: "standard", value: status },
  };
}

function collectTruthIds(state: CampaignStateV5): Set<string> {
  const ids = new Set<string>();
  for (const denizen of state.world.denizens) {
    for (const truth of denizen.powerfulProfile?.truths ?? []) {
      ids.add(truth.truthId);
    }
  }
  return ids;
}

function requireInnovationSpell(spellId: GrimoireSpellId): void {
  if (!isValidGrimoireSpellId(spellId)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Innovation spellId is invalid: ${spellId}`);
  }
  if (grimoireSpellDefinition(spellId).isGreatWork) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Innovation spellId must not be a Great Work: ${spellId}`);
  }
}

export function canonicalizeSetSorcererResearcherProductionMultipliersInput(
  input: SetSorcererResearcherProductionMultipliersInput,
): SetSorcererResearcherProductionMultipliersInput {
  return {
    expectedCurrent: input.expectedCurrent,
    expectedNextMonth: input.expectedNextMonth,
    current: input.current,
    nextMonth: input.nextMonth,
  };
}

export function applySetSorcererResearcherProductionMultipliers(
  state: CampaignStateV5,
  rawInput: SetSorcererResearcherProductionMultipliersInput,
): SorcererTransitionResult {
  const input = canonicalizeSetSorcererResearcherProductionMultipliersInput(rawInput);
  const sorcerer = requireInitializedSorcerer(state);
  assertPositiveSafeInteger("expectedCurrent", input.expectedCurrent);
  assertPositiveSafeInteger("expectedNextMonth", input.expectedNextMonth);
  assertPositiveSafeInteger("current", input.current);
  assertPositiveSafeInteger("nextMonth", input.nextMonth);
  if (
    sorcerer.knowledge.researcherProductionMultiplierCurrent !== input.expectedCurrent
    || sorcerer.knowledge.researcherProductionMultiplierNextMonth !== input.expectedNextMonth
  ) {
    throw new DomainError(
      "STALE_COMMAND_PRECONDITION",
      "Researcher production multipliers do not match the expected current pair",
    );
  }
  if (input.current === input.expectedCurrent && input.nextMonth === input.expectedNextMonth) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "Researcher production multipliers are unchanged");
  }
  return commitAdvanced(replaceSorcerer(state, {
    ...sorcerer,
    knowledge: {
      ...sorcerer.knowledge,
      researcherProductionMultiplierCurrent: input.current,
      researcherProductionMultiplierNextMonth: input.nextMonth,
    },
  }), [{
    type: "sorcerer_researcher_production_multipliers_set",
    version: 1,
    data: {
      previousCurrent: input.expectedCurrent,
      previousNextMonth: input.expectedNextMonth,
      current: input.current,
      nextMonth: input.nextMonth,
    },
  }]);
}

export function canonicalizeSetSorcererLawsInput(input: SetSorcererLawsInput): SetSorcererLawsInput {
  return {
    expectedActiveLawIds: [...input.expectedActiveLawIds],
    expectedUnrevealedLawIds: [...input.expectedUnrevealedLawIds],
    activeLawIds: canonicalizeLawIds(input.activeLawIds, "active Law"),
    unrevealedLawIds: canonicalizeLawIds(input.unrevealedLawIds, "unrevealed Law"),
  };
}

export function applySetSorcererLaws(
  state: CampaignStateV5,
  rawInput: SetSorcererLawsInput,
): SorcererTransitionResult {
  const input = canonicalizeSetSorcererLawsInput(rawInput);
  const sorcerer = requireInitializedSorcerer(state);
  const expectedActive = canonicalizeLawIds(input.expectedActiveLawIds, "expected active Law");
  const expectedUnrevealed = canonicalizeLawIds(input.expectedUnrevealedLawIds, "expected unrevealed Law");
  if (
    !lawIdsEqual(sorcerer.activeLawIds, expectedActive)
    || !lawIdsEqual(sorcerer.unrevealedLawIds, expectedUnrevealed)
  ) {
    throw new DomainError(
      "STALE_COMMAND_PRECONDITION",
      "Laws of Magic do not match the expected current arrays",
    );
  }
  const overlap = input.activeLawIds.filter((lawId) => input.unrevealedLawIds.includes(lawId));
  if (overlap.length > 0) {
    throw new DomainError(
      "INVALID_CAMPAIGN_STATE",
      `active and unrevealed Law IDs must be disjoint: ${overlap.join(", ")}`,
    );
  }
  if (
    lawIdsEqual(sorcerer.activeLawIds, input.activeLawIds)
    && lawIdsEqual(sorcerer.unrevealedLawIds, input.unrevealedLawIds)
  ) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "Laws of Magic are unchanged");
  }
  return commitAdvanced(replaceSorcerer(state, {
    ...sorcerer,
    activeLawIds: input.activeLawIds,
    unrevealedLawIds: input.unrevealedLawIds,
  }), [{
    type: "sorcerer_laws_set",
    version: 1,
    data: {
      previousActiveLawIds: sorcerer.activeLawIds,
      previousUnrevealedLawIds: sorcerer.unrevealedLawIds,
      activeLawIds: input.activeLawIds,
      unrevealedLawIds: input.unrevealedLawIds,
    },
  }]);
}

export function canonicalizeCreateSorcererCampaignDefinitionInput(
  input: CreateSorcererCampaignDefinitionInput,
): CreateSorcererCampaignDefinitionInput {
  switch (input.kind) {
    case "school":
      if (!isValidCampaignSchoolOfMagicId(input.schoolId)) {
        throw new DomainError("INVALID_CAMPAIGN_STATE", `campaign School id is invalid: ${input.schoolId}`);
      }
      return {
        kind: "school",
        schoolId: input.schoolId,
        name: normalizeText(input.name, "School name"),
        description: normalizeText(input.description, "School description"),
      };
    case "academic_kind":
      if (!isValidSorcererCampaignAcademicKindId(input.academicKindId)) {
        throw new DomainError("INVALID_CAMPAIGN_STATE", `campaign Academic kind id is invalid: ${input.academicKindId}`);
      }
      return {
        kind: "academic_kind",
        academicKindId: input.academicKindId,
        name: normalizeText(input.name, "Academic kind name"),
        action: normalizeText(input.action, "Academic kind action"),
      };
    case "recipe":
      if (!isValidSorcererCampaignRecipeId(input.recipeId)) {
        throw new DomainError("INVALID_CAMPAIGN_STATE", `campaign Recipe id is invalid: ${input.recipeId}`);
      }
      return {
        kind: "recipe",
        recipeId: input.recipeId,
        name: normalizeText(input.name, "Recipe name"),
        recipeText: normalizeText(input.recipeText, "Recipe text"),
      };
    case "knowledge_method":
      if (!isValidSorcererCampaignKnowledgeMethodId(input.knowledgeMethodId)) {
        throw new DomainError(
          "INVALID_CAMPAIGN_STATE",
          `campaign Knowledge method id is invalid: ${input.knowledgeMethodId}`,
        );
      }
      if (!isValidSorcererCampaignResearchPositionId(input.researchPositionId)) {
        throw new DomainError(
          "INVALID_CAMPAIGN_STATE",
          `campaign Research Position id is invalid: ${input.researchPositionId}`,
        );
      }
      return {
        kind: "knowledge_method",
        knowledgeMethodId: input.knowledgeMethodId,
        researchPositionId: input.researchPositionId,
        name: normalizeText(input.name, "Knowledge method name"),
        description: normalizeText(input.description, "Knowledge method description"),
      };
  }
}

export function applyCreateSorcererCampaignDefinition(
  state: CampaignStateV5,
  rawInput: CreateSorcererCampaignDefinitionInput,
): SorcererTransitionResult {
  const input = canonicalizeCreateSorcererCampaignDefinitionInput(rawInput);
  const sorcerer = requireInitializedSorcerer(state);
  switch (input.kind) {
    case "school": {
      if (sorcerer.campaignSchools.some((school) => school.schoolId === input.schoolId)) {
        throw new DomainError("INVALID_CAMPAIGN_STATE", `campaign School already exists: ${input.schoolId}`);
      }
      const definition: SorcererCampaignSchoolDefinition = {
        schoolId: input.schoolId,
        name: input.name,
        description: input.description,
      };
      return commitAdvanced(replaceSorcerer(state, {
        ...sorcerer,
        campaignSchools: [...sorcerer.campaignSchools, definition],
      }), [{
        type: "sorcerer_campaign_definition_created",
        version: 1,
        data: { definition: { kind: "school", definition } },
      }]);
    }
    case "academic_kind": {
      if (sorcerer.campaignAcademicKinds.some((kind) => kind.academicKindId === input.academicKindId)) {
        throw new DomainError("INVALID_CAMPAIGN_STATE", `campaign Academic kind already exists: ${input.academicKindId}`);
      }
      const definition: SorcererCampaignAcademicKindDefinition = {
        academicKindId: input.academicKindId,
        name: input.name,
        action: input.action,
      };
      return commitAdvanced(replaceSorcerer(state, {
        ...sorcerer,
        campaignAcademicKinds: [...sorcerer.campaignAcademicKinds, definition],
      }), [{
        type: "sorcerer_campaign_definition_created",
        version: 1,
        data: { definition: { kind: "academic_kind", definition } },
      }]);
    }
    case "recipe": {
      if (sorcerer.campaignRecipes.some((recipe) => recipe.recipeId === input.recipeId)) {
        throw new DomainError("INVALID_CAMPAIGN_STATE", `campaign Recipe already exists: ${input.recipeId}`);
      }
      const definition: SorcererCampaignRecipeDefinition = {
        recipeId: input.recipeId,
        name: input.name,
        recipeText: input.recipeText,
      };
      return commitAdvanced(replaceSorcerer(state, {
        ...sorcerer,
        campaignRecipes: [...sorcerer.campaignRecipes, definition],
      }), [{
        type: "sorcerer_campaign_definition_created",
        version: 1,
        data: { definition: { kind: "recipe", definition } },
      }]);
    }
    case "knowledge_method": {
      if (sorcerer.campaignKnowledgeMethods.some((method) => method.knowledgeMethodId === input.knowledgeMethodId)) {
        throw new DomainError(
          "INVALID_CAMPAIGN_STATE",
          `campaign Knowledge method already exists: ${input.knowledgeMethodId}`,
        );
      }
      if (sorcerer.researchPositions.some((position) => position.positionId === input.researchPositionId)) {
        throw new DomainError(
          "INVALID_CAMPAIGN_STATE",
          `Research Position already exists: ${input.researchPositionId}`,
        );
      }
      const definition: SorcererCampaignKnowledgeMethodDefinition = {
        knowledgeMethodId: input.knowledgeMethodId,
        name: input.name,
        description: input.description,
      };
      return commitAdvanced(replaceSorcerer(state, {
        ...sorcerer,
        campaignKnowledgeMethods: [...sorcerer.campaignKnowledgeMethods, definition],
        researchPositions: [
          ...sorcerer.researchPositions,
          {
            positionId: input.researchPositionId,
            target: { kind: "campaign_knowledge_method", knowledgeMethodId: input.knowledgeMethodId },
          },
        ],
      }), [{
        type: "sorcerer_campaign_definition_created",
        version: 1,
        data: {
          definition: {
            kind: "knowledge_method",
            definition,
            researchPositionId: input.researchPositionId,
          },
        },
      }]);
    }
  }
}

export function canonicalizeUpdateSorcererCampaignDefinitionInput(
  input: UpdateSorcererCampaignDefinitionInput,
): UpdateSorcererCampaignDefinitionInput {
  switch (input.kind) {
    case "school":
      return {
        kind: "school",
        schoolId: input.schoolId,
        expectedName: input.expectedName,
        expectedDescription: input.expectedDescription,
        name: normalizeText(input.name, "School name"),
        description: normalizeText(input.description, "School description"),
      };
    case "academic_kind":
      return {
        kind: "academic_kind",
        academicKindId: input.academicKindId,
        expectedName: input.expectedName,
        expectedAction: input.expectedAction,
        name: normalizeText(input.name, "Academic kind name"),
        action: normalizeText(input.action, "Academic kind action"),
      };
    case "recipe":
      return {
        kind: "recipe",
        recipeId: input.recipeId,
        expectedName: input.expectedName,
        expectedRecipeText: input.expectedRecipeText,
        name: normalizeText(input.name, "Recipe name"),
        recipeText: normalizeText(input.recipeText, "Recipe text"),
      };
    case "knowledge_method":
      return {
        kind: "knowledge_method",
        knowledgeMethodId: input.knowledgeMethodId,
        expectedName: input.expectedName,
        expectedDescription: input.expectedDescription,
        name: normalizeText(input.name, "Knowledge method name"),
        description: normalizeText(input.description, "Knowledge method description"),
      };
  }
}

function pairedKnowledgeMethodPositionId(
  sorcerer: SorcererState,
  knowledgeMethodId: SorcererCampaignKnowledgeMethodId,
): SorcererResearchPositionId {
  const paired = sorcerer.researchPositions.filter(
    (position) => (
      position.target.kind === "campaign_knowledge_method"
      && position.target.knowledgeMethodId === knowledgeMethodId
    ),
  );
  if (paired.length !== 1) {
    throw new DomainError(
      "INVALID_CAMPAIGN_STATE",
      `campaign Knowledge method must have exactly one paired Research Position: ${knowledgeMethodId}`,
    );
  }
  return paired[0]!.positionId;
}

export function applyUpdateSorcererCampaignDefinition(
  state: CampaignStateV5,
  rawInput: UpdateSorcererCampaignDefinitionInput,
): SorcererTransitionResult {
  const input = canonicalizeUpdateSorcererCampaignDefinitionInput(rawInput);
  const sorcerer = requireInitializedSorcerer(state);
  switch (input.kind) {
    case "school": {
      const index = sorcerer.campaignSchools.findIndex((school) => school.schoolId === input.schoolId);
      if (index === -1) {
        throw new DomainError("INVALID_CAMPAIGN_STATE", `campaign School does not resolve: ${input.schoolId}`);
      }
      const previous = sorcerer.campaignSchools[index]!;
      if (previous.name !== input.expectedName || previous.description !== input.expectedDescription) {
        throw new DomainError("STALE_COMMAND_PRECONDITION", "campaign School does not match the expected current text");
      }
      if (previous.name === input.name && previous.description === input.description) {
        throw new DomainError("INVALID_CAMPAIGN_STATE", "campaign School is unchanged");
      }
      const definition: SorcererCampaignSchoolDefinition = {
        schoolId: previous.schoolId,
        name: input.name,
        description: input.description,
      };
      const campaignSchools = sorcerer.campaignSchools.map((school, i) => (i === index ? definition : school));
      return commitAdvanced(replaceSorcerer(state, { ...sorcerer, campaignSchools }), [{
        type: "sorcerer_campaign_definition_updated",
        version: 1,
        data: {
          previous: { kind: "school", definition: previous },
          definition: { kind: "school", definition },
        },
      }]);
    }
    case "academic_kind": {
      const index = sorcerer.campaignAcademicKinds.findIndex((kind) => kind.academicKindId === input.academicKindId);
      if (index === -1) {
        throw new DomainError("INVALID_CAMPAIGN_STATE", `campaign Academic kind does not resolve: ${input.academicKindId}`);
      }
      const previous = sorcerer.campaignAcademicKinds[index]!;
      if (previous.name !== input.expectedName || previous.action !== input.expectedAction) {
        throw new DomainError(
          "STALE_COMMAND_PRECONDITION",
          "campaign Academic kind does not match the expected current text",
        );
      }
      if (previous.name === input.name && previous.action === input.action) {
        throw new DomainError("INVALID_CAMPAIGN_STATE", "campaign Academic kind is unchanged");
      }
      const definition: SorcererCampaignAcademicKindDefinition = {
        academicKindId: previous.academicKindId,
        name: input.name,
        action: input.action,
      };
      const campaignAcademicKinds = sorcerer.campaignAcademicKinds.map((kind, i) => (i === index ? definition : kind));
      return commitAdvanced(replaceSorcerer(state, { ...sorcerer, campaignAcademicKinds }), [{
        type: "sorcerer_campaign_definition_updated",
        version: 1,
        data: {
          previous: { kind: "academic_kind", definition: previous },
          definition: { kind: "academic_kind", definition },
        },
      }]);
    }
    case "recipe": {
      const index = sorcerer.campaignRecipes.findIndex((recipe) => recipe.recipeId === input.recipeId);
      if (index === -1) {
        throw new DomainError("INVALID_CAMPAIGN_STATE", `campaign Recipe does not resolve: ${input.recipeId}`);
      }
      const previous = sorcerer.campaignRecipes[index]!;
      if (previous.name !== input.expectedName || previous.recipeText !== input.expectedRecipeText) {
        throw new DomainError("STALE_COMMAND_PRECONDITION", "campaign Recipe does not match the expected current text");
      }
      if (previous.name === input.name && previous.recipeText === input.recipeText) {
        throw new DomainError("INVALID_CAMPAIGN_STATE", "campaign Recipe is unchanged");
      }
      const definition: SorcererCampaignRecipeDefinition = {
        recipeId: previous.recipeId,
        name: input.name,
        recipeText: input.recipeText,
      };
      const campaignRecipes = sorcerer.campaignRecipes.map((recipe, i) => (i === index ? definition : recipe));
      return commitAdvanced(replaceSorcerer(state, { ...sorcerer, campaignRecipes }), [{
        type: "sorcerer_campaign_definition_updated",
        version: 1,
        data: {
          previous: { kind: "recipe", definition: previous },
          definition: { kind: "recipe", definition },
        },
      }]);
    }
    case "knowledge_method": {
      const index = sorcerer.campaignKnowledgeMethods.findIndex(
        (method) => method.knowledgeMethodId === input.knowledgeMethodId,
      );
      if (index === -1) {
        throw new DomainError(
          "INVALID_CAMPAIGN_STATE",
          `campaign Knowledge method does not resolve: ${input.knowledgeMethodId}`,
        );
      }
      const previous = sorcerer.campaignKnowledgeMethods[index]!;
      const researchPositionId = pairedKnowledgeMethodPositionId(sorcerer, previous.knowledgeMethodId);
      if (previous.name !== input.expectedName || previous.description !== input.expectedDescription) {
        throw new DomainError(
          "STALE_COMMAND_PRECONDITION",
          "campaign Knowledge method does not match the expected current text",
        );
      }
      if (previous.name === input.name && previous.description === input.description) {
        throw new DomainError("INVALID_CAMPAIGN_STATE", "campaign Knowledge method is unchanged");
      }
      const definition: SorcererCampaignKnowledgeMethodDefinition = {
        knowledgeMethodId: previous.knowledgeMethodId,
        name: input.name,
        description: input.description,
      };
      const campaignKnowledgeMethods = sorcerer.campaignKnowledgeMethods.map((method, i) => (
        i === index ? definition : method
      ));
      return commitAdvanced(replaceSorcerer(state, { ...sorcerer, campaignKnowledgeMethods }), [{
        type: "sorcerer_campaign_definition_updated",
        version: 1,
        data: {
          previous: { kind: "knowledge_method", definition: previous, researchPositionId },
          definition: { kind: "knowledge_method", definition, researchPositionId },
        },
      }]);
    }
  }
}

export function canonicalizeAddSorcererArcanistInput(input: AddSorcererArcanistInput): AddSorcererArcanistInput {
  const school = canonicalizeMagicSchoolRef(input.school, "Arcanist School");
  const subject = input.subject.kind === "create_denizen"
    ? {
        kind: "create_denizen" as const,
        denizenId: input.subject.denizenId,
        name: normalizeText(input.subject.name, "Arcanist name"),
        description: normalizeOptionalDescription(input.subject.description),
      }
    : { kind: "existing_denizen" as const, denizenId: input.subject.denizenId };
  if (input.placement.kind === "tower") {
    return {
      subject,
      school,
      placement: { kind: "tower" },
      expectedTowerOrder: input.expectedTowerOrder === undefined ? undefined : [...input.expectedTowerOrder],
    };
  }
  if (!isValidPactSeatId(input.placement.seatId) || input.placement.seatId === "sorcerer") {
    throw new DomainError(
      "INVALID_CAMPAIGN_STATE",
      "Disruptive Arcanist must be placed in another Wizard's Domain",
    );
  }
  return {
    subject,
    school,
    placement: {
      kind: "other_domain",
      seatId: input.placement.seatId,
      disruptiveProfile: canonicalizeDisruptiveProfile(input.placement.disruptiveProfile),
    },
    expectedTowerOrder: input.expectedTowerOrder === undefined ? undefined : [...input.expectedTowerOrder],
  };
}

export function applyAddSorcererArcanist(
  state: CampaignStateV5,
  rawInput: AddSorcererArcanistInput,
): SorcererTransitionResult {
  const input = canonicalizeAddSorcererArcanistInput(rawInput);
  const sorcerer = requireInitializedSorcerer(state);
  const towerPlacement = input.placement.kind === "tower";
  requireExpectedTowerOrder(sorcerer.towerOrder, input.expectedTowerOrder, towerPlacement);

  let workingState = state;
  let denizenCreated = false;
  const denizenId = input.subject.denizenId;
  if (!isValidDenizenId(denizenId)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Invalid denizenId: ${denizenId}`);
  }
  if (input.subject.kind === "create_denizen") {
    workingState = applyCreateDenizenV5Candidate(state, {
      denizenId,
      name: input.subject.name,
      representation: "individual",
      description: input.subject.description,
    }).nextState;
    denizenCreated = true;
  }

  const denizen = requireIndividualDenizen(workingState, denizenId, "Arcanist");
  requireNoPersonnelConflict(workingState.sorcerer, denizenId);
  const desiredStatus = towerPlacement ? "reliable" : "disruptive";
  if (denizen.powerfulProfile === null) {
    workingState = replaceDenizenProfile(
      workingState,
      denizenId,
      desiredStatus === "reliable" ? reliableArcanistProfile() : disruptiveArcanistProfile(),
    );
  } else if (!isCompatibleArcanistProfile(denizen.powerfulProfile, desiredStatus)) {
    throw new DomainError(
      "INVALID_CAMPAIGN_STATE",
      `Denizen already has an incompatible Powerful profile: ${denizenId}`,
    );
  }

  const arcanist: SorcererArcanist = {
    denizenId,
    school: input.school,
    placement: towerPlacement
      ? { kind: "tower" }
      : { kind: "other_domain", seatId: input.placement.seatId },
    disruptiveProfile: towerPlacement ? null : input.placement.disruptiveProfile,
  };
  const nextTowerOrder = towerPlacement
    ? [...workingState.sorcerer.towerOrder, denizenId]
    : workingState.sorcerer.towerOrder;
  const nextState = replaceSorcerer(workingState, {
    ...workingState.sorcerer,
    arcanists: [...workingState.sorcerer.arcanists, arcanist],
    towerOrder: nextTowerOrder,
  });
  const resolvedName = nextState.world.denizens.find((entry) => entry.denizenId === denizenId)?.name ?? denizen.name;
  return commitAdvanced(nextState, [{
    type: "sorcerer_arcanist_added",
    version: 1,
    data: {
      denizenId,
      denizenCreated,
      denizenName: resolvedName,
      arcanist,
      previousTowerOrder: sorcerer.towerOrder,
      nextTowerOrder,
    },
  }]);
}

export function canonicalizeUpdateSorcererArcanistInput(
  input: UpdateSorcererArcanistInput,
): UpdateSorcererArcanistInput {
  if (input.placement.kind === "other_domain") {
    if (!isValidPactSeatId(input.placement.seatId) || input.placement.seatId === "sorcerer") {
      throw new DomainError(
        "INVALID_CAMPAIGN_STATE",
        "Disruptive Arcanist must be placed in another Wizard's Domain",
      );
    }
  }
  if (input.placement.kind === "tower" && input.disruptiveProfile !== null) {
    throw new DomainError(
      "INVALID_CAMPAIGN_STATE",
      "Reliable Tower Arcanist must not include a Disruptive profile",
    );
  }
  if (input.placement.kind === "other_domain" && input.disruptiveProfile === null) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "Disruptive Arcanist requires a Disruptive profile");
  }
  return {
    denizenId: input.denizenId,
    expectedArcanist: canonicalizeArcanistRecord(input.expectedArcanist),
    school: canonicalizeMagicSchoolRef(input.school, "Arcanist School"),
    placement: input.placement.kind === "tower"
      ? { kind: "tower" }
      : { kind: "other_domain", seatId: input.placement.seatId },
    disruptiveProfile: input.disruptiveProfile === null
      ? null
      : canonicalizeDisruptiveProfile(input.disruptiveProfile),
    expectedTowerOrder: input.expectedTowerOrder === undefined ? undefined : [...input.expectedTowerOrder],
  };
}

export function applyUpdateSorcererArcanist(
  state: CampaignStateV5,
  rawInput: UpdateSorcererArcanistInput,
): SorcererTransitionResult {
  const input = canonicalizeUpdateSorcererArcanistInput(rawInput);
  const sorcerer = requireInitializedSorcerer(state);
  const index = sorcerer.arcanists.findIndex((arcanist) => arcanist.denizenId === input.denizenId);
  if (index === -1) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Arcanist does not resolve: ${input.denizenId}`);
  }
  const current = canonicalizeArcanistRecord(sorcerer.arcanists[index]!);
  if (!structurallyEqual(current, input.expectedArcanist)) {
    throw new DomainError("STALE_COMMAND_PRECONDITION", "Arcanist does not match the expected current record");
  }
  const denizen = requireIndividualDenizen(state, input.denizenId, "Arcanist");
  if (denizen.powerfulProfile === null || !denizenHasBuiltinTaxonomy(denizen, "arcanist")) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Arcanist requires a Powerful arcanist profile: ${input.denizenId}`);
  }
  const nextArcanist: SorcererArcanist = {
    denizenId: input.denizenId,
    school: input.school,
    placement: input.placement,
    disruptiveProfile: input.disruptiveProfile,
  };
  if (structurallyEqual(current, nextArcanist)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "Arcanist is unchanged");
  }
  const towerInvolved = current.placement.kind === "tower" || nextArcanist.placement.kind === "tower";
  requireExpectedTowerOrder(sorcerer.towerOrder, input.expectedTowerOrder, towerInvolved);

  let nextTowerOrder = sorcerer.towerOrder;
  if (current.placement.kind === "tower" && nextArcanist.placement.kind === "other_domain") {
    nextTowerOrder = sorcerer.towerOrder.filter((id) => id !== input.denizenId);
  } else if (current.placement.kind === "other_domain" && nextArcanist.placement.kind === "tower") {
    nextTowerOrder = [...sorcerer.towerOrder, input.denizenId];
  }

  const nextStatus = nextArcanist.placement.kind === "tower" ? "reliable" : "disruptive";
  const workingState = replaceDenizenProfile(state, input.denizenId, withArcanistStatus(denizen.powerfulProfile, nextStatus));
  const nextState = replaceSorcerer(workingState, {
    ...workingState.sorcerer,
    arcanists: workingState.sorcerer.arcanists.map((arcanist, i) => (i === index ? nextArcanist : arcanist)),
    towerOrder: nextTowerOrder,
  });
  return commitAdvanced(nextState, [{
    type: "sorcerer_arcanist_updated",
    version: 1,
    data: {
      denizenId: input.denizenId,
      previousArcanist: current,
      arcanist: nextArcanist,
      previousPlacement: current.placement,
      placement: nextArcanist.placement,
      previousTowerOrder: sorcerer.towerOrder,
      nextTowerOrder,
    },
  }]);
}

export function canonicalizeAddSorcererConstructInput(
  input: AddSorcererConstructInput,
): AddSorcererConstructInput {
  if (!isValidDenizenId(input.denizenId)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Invalid denizenId: ${input.denizenId}`);
  }
  if (input.truths.length === 0) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "Construct requires one or more Truths");
  }
  uniqueOrThrow(input.truths.map((truth) => truth.truthId), "Construct Truth");
  return {
    denizenId: input.denizenId,
    name: normalizeText(input.name, "Construct name"),
    description: normalizeOptionalDescription(input.description),
    truths: input.truths.map((truth, index) => {
      if (!isValidPowerfulDenizenTruthId(truth.truthId)) {
        throw new DomainError("INVALID_CAMPAIGN_STATE", `Construct Truth id is invalid: ${truth.truthId}`);
      }
      return {
        truthId: truth.truthId,
        text: normalizeText(truth.text, `Construct Truth[${index}]`),
      };
    }),
    instructions: input.instructions.map((instruction, index) => (
      canonicalizeInstruction(instruction, `Construct instruction[${index}]`)
    )),
  };
}

export function applyAddSorcererConstruct(
  state: CampaignStateV5,
  rawInput: AddSorcererConstructInput,
): SorcererTransitionResult {
  const input = canonicalizeAddSorcererConstructInput(rawInput);
  const sorcerer = requireInitializedSorcerer(state);
  requireNoPersonnelConflict(sorcerer, input.denizenId);
  const existingTruthIds = collectTruthIds(state);
  for (const truth of input.truths) {
    if (existingTruthIds.has(truth.truthId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `Duplicate powerful denizen truthId: ${truth.truthId}`);
    }
  }
  const created = applyCreateDenizenV5Candidate(state, {
    denizenId: input.denizenId,
    name: input.name,
    representation: "individual",
    description: input.description,
  }).nextState;
  const truths: readonly PowerfulDenizenTruthEntry[] = input.truths.map((truth) => ({
    truthId: truth.truthId,
    text: truth.text,
    origin: "campaign",
  }));
  const workingState = replaceDenizenProfile(created, input.denizenId, {
    taxonomies: [{ kind: "builtin", taxonomyId: "construct" }],
    status: { kind: "standard", value: "reliable" },
    goal: null,
    methods: [],
    truths,
  });
  const overlay: SorcererConstructOverlay = {
    denizenId: input.denizenId,
    instructions: input.instructions,
  };
  const nextState = replaceSorcerer(workingState, {
    ...workingState.sorcerer,
    constructs: [...workingState.sorcerer.constructs, overlay],
  });
  return commitAdvanced(nextState, [{
    type: "sorcerer_construct_added",
    version: 1,
    data: {
      denizenId: input.denizenId,
      denizenName: input.name,
      truthIds: input.truths.map((truth) => truth.truthId),
      instructions: input.instructions,
    },
  }]);
}

export function canonicalizeSetSorcererConstructInstructionsInput(
  input: SetSorcererConstructInstructionsInput,
): SetSorcererConstructInstructionsInput {
  return {
    denizenId: input.denizenId,
    expectedInstructions: input.expectedInstructions.map((instruction, index) => (
      canonicalizeInstruction(instruction, `expected Construct instruction[${index}]`)
    )),
    instructions: input.instructions.map((instruction, index) => (
      canonicalizeInstruction(instruction, `Construct instruction[${index}]`)
    )),
  };
}

export function applySetSorcererConstructInstructions(
  state: CampaignStateV5,
  rawInput: SetSorcererConstructInstructionsInput,
): SorcererTransitionResult {
  const input = canonicalizeSetSorcererConstructInstructionsInput(rawInput);
  const sorcerer = requireInitializedSorcerer(state);
  const index = sorcerer.constructs.findIndex((construct) => construct.denizenId === input.denizenId);
  if (index === -1) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Construct does not resolve: ${input.denizenId}`);
  }
  const current = sorcerer.constructs[index]!;
  if (!structurallyEqual(current.instructions, input.expectedInstructions)) {
    throw new DomainError(
      "STALE_COMMAND_PRECONDITION",
      "Construct instructions do not match the expected current list",
    );
  }
  if (structurallyEqual(current.instructions, input.instructions)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "Construct instructions are unchanged");
  }
  const constructs = sorcerer.constructs.map((construct, i) => (
    i === index ? { ...construct, instructions: input.instructions } : construct
  ));
  return commitAdvanced(replaceSorcerer(state, { ...sorcerer, constructs }), [{
    type: "sorcerer_construct_instructions_set",
    version: 1,
    data: {
      denizenId: input.denizenId,
      previousInstructions: current.instructions,
      instructions: input.instructions,
    },
  }]);
}

export function canonicalizeAddSorcererInnovationInput(
  input: AddSorcererInnovationInput,
): AddSorcererInnovationInput {
  if (!isValidSorcererInnovationId(input.innovationId)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Innovation id is invalid: ${input.innovationId}`);
  }
  requireInnovationSpell(input.spellId);
  return {
    innovationId: input.innovationId,
    spellId: input.spellId,
    text: normalizeText(input.text, "Innovation text"),
  };
}

export function applyAddSorcererInnovation(
  state: CampaignStateV5,
  rawInput: AddSorcererInnovationInput,
): SorcererTransitionResult {
  const input = canonicalizeAddSorcererInnovationInput(rawInput);
  const sorcerer = requireInitializedSorcerer(state);
  if (sorcerer.innovations.some((innovation) => innovation.innovationId === input.innovationId)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Innovation already exists: ${input.innovationId}`);
  }
  const innovation: SorcererInnovation = {
    innovationId: input.innovationId,
    spellId: input.spellId,
    text: input.text,
  };
  return commitAdvanced(replaceSorcerer(state, {
    ...sorcerer,
    innovations: [...sorcerer.innovations, innovation],
  }), [{
    type: "sorcerer_innovation_added",
    version: 1,
    data: { innovation },
  }]);
}

export function canonicalizeReviseSorcererInnovationInput(
  input: ReviseSorcererInnovationInput,
): ReviseSorcererInnovationInput {
  requireInnovationSpell(input.spellId);
  return {
    innovationId: input.innovationId,
    expectedSpellId: input.expectedSpellId,
    expectedText: input.expectedText,
    spellId: input.spellId,
    text: normalizeText(input.text, "Innovation text"),
  };
}

export function applyReviseSorcererInnovation(
  state: CampaignStateV5,
  rawInput: ReviseSorcererInnovationInput,
): SorcererTransitionResult {
  const input = canonicalizeReviseSorcererInnovationInput(rawInput);
  const sorcerer = requireInitializedSorcerer(state);
  const index = sorcerer.innovations.findIndex((innovation) => innovation.innovationId === input.innovationId);
  if (index === -1) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Innovation does not resolve: ${input.innovationId}`);
  }
  const current = sorcerer.innovations[index]!;
  if (current.spellId !== input.expectedSpellId || current.text !== input.expectedText) {
    throw new DomainError("STALE_COMMAND_PRECONDITION", "Innovation does not match the expected current record");
  }
  if (current.spellId === input.spellId && current.text === input.text) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "Innovation is unchanged");
  }
  const innovation: SorcererInnovation = {
    innovationId: current.innovationId,
    spellId: input.spellId,
    text: input.text,
  };
  const innovations = sorcerer.innovations.map((entry, i) => (i === index ? innovation : entry));
  return commitAdvanced(replaceSorcerer(state, { ...sorcerer, innovations }), [{
    type: "sorcerer_innovation_revised",
    version: 1,
    data: {
      innovationId: current.innovationId,
      previousSpellId: current.spellId,
      previousText: current.text,
      spellId: input.spellId,
      text: input.text,
    },
  }]);
}

export function canonicalizeRemoveSorcererInnovationInput(
  input: RemoveSorcererInnovationInput,
): RemoveSorcererInnovationInput {
  return {
    innovationId: input.innovationId,
    expectedSpellId: input.expectedSpellId,
    expectedText: input.expectedText,
  };
}

export function applyRemoveSorcererInnovation(
  state: CampaignStateV5,
  rawInput: RemoveSorcererInnovationInput,
): SorcererTransitionResult {
  const input = canonicalizeRemoveSorcererInnovationInput(rawInput);
  const sorcerer = requireInitializedSorcerer(state);
  const current = sorcerer.innovations.find((innovation) => innovation.innovationId === input.innovationId);
  if (current === undefined) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Innovation does not resolve: ${input.innovationId}`);
  }
  if (current.spellId !== input.expectedSpellId || current.text !== input.expectedText) {
    throw new DomainError("STALE_COMMAND_PRECONDITION", "Innovation does not match the expected current record");
  }
  return commitAdvanced(replaceSorcerer(state, {
    ...sorcerer,
    innovations: sorcerer.innovations.filter((innovation) => innovation.innovationId !== input.innovationId),
  }), [{
    type: "sorcerer_innovation_removed",
    version: 1,
    data: { innovation: current },
  }]);
}
