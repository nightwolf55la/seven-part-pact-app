import type { CampaignStateV5, PactFragmentCustody, PactFragmentOperationalState } from "./campaign-state";
import type {
  Denizen,
  MortalityState,
  SharedWorldState,
  Treasure,
  TreasureCondition,
  TreasureCustody,
  WizardOrDenizenSubjectRef,
} from "./shared-world";
import type {
  CampaignPowerfulDenizenTaxonomy,
  PowerfulDenizenMethodDefinition,
  PowerfulDenizenMethodEntry,
  PowerfulDenizenProfile,
  PowerfulDenizenStatus,
  PowerfulDenizenTaxonomyRef,
  PowerfulDenizenTruthEntry,
} from "./powerful-denizen";
import {
  isValidBuiltinPowerfulDenizenTaxonomyId,
  isValidPowerfulDenizenStandardStatus,
  isValidStandardPowerfulDenizenMethod,
  powerfulDenizenTaxonomyRefKey,
} from "./powerful-denizen";
import type {
  CampaignPowerfulDenizenTaxonomyId,
  DenizenId,
  PowerfulDenizenMethodEntryId,
  PowerfulDenizenTruthId,
  TreasureId,
  WizardId,
} from "./ids";
import {
  isValidCampaignPowerfulDenizenTaxonomyId,
  isValidDenizenId,
  isValidPlaceId,
  isValidPowerfulDenizenMethodEntryId,
  isValidPowerfulDenizenTruthId,
  isValidTreasureId,
  isValidWizardId,
} from "./ids";
import { DomainError } from "./errors";
import { canonicalJsonStringify } from "./canonical-json";
import type { PactSeatId } from "./pact-seats";
import { isValidPactSeatId } from "./pact-seats";
import type { ExpectedFieldChange } from "./world-subject-transitions";
import type {
  CampaignEvent,
  CampaignPowerfulDenizenTaxonomyCreatedEventV1,
  CampaignPowerfulDenizenTaxonomyRemovedEventV1,
  CampaignPowerfulDenizenTaxonomyUpdatedEventV1,
  DenizenMortalityStateChangedEventV1,
  PactFragmentOperationalStateChangedEventV1,
  PowerfulDenizenGoalChangedEventV1,
  PowerfulDenizenMethodAddedEventV1,
  PowerfulDenizenMethodRemovedEventV1,
  PowerfulDenizenMethodUpdatedEventV1,
  PowerfulDenizenProfileCreatedEventV1,
  PowerfulDenizenProfileRemovedEventV1,
  PowerfulDenizenStatusChangedEventV1,
  PowerfulDenizenTaxonomiesChangedEventV1,
  PowerfulDenizenTruthAddedEventV1,
  PowerfulDenizenTruthRemovedEventV1,
  PowerfulDenizenTruthUpdatedEventV1,
  TreasureCreatedEventV1,
  TreasureDetailsUpdatedEventV1,
  TreasureStateUpdatedEventV1,
  WizardMortalityStateChangedEventV1,
} from "./events";
import { validateNecromancerReferenceIntegrity } from "./necromancer-validation";
import { validateHierophantReferenceIntegrity } from "./hierophant-validation";
import { validateMarinerReferenceIntegrity } from "./mariner-validation";
import { isNecromancerWizardFoe } from "./necromancer-state";

export type SharedStateTransitionResult = {
  readonly nextState: CampaignStateV5;
  readonly events: readonly CampaignEvent[];
};

const MAX_NAME_LENGTH = 200;
const MAX_DESCRIPTION_LENGTH = 8000;
const VALID_MORTALITY_STATES = new Set<MortalityState>(["not_deceased", "deceased"]);
const VALID_TREASURE_CONDITIONS = new Set<TreasureCondition>(["intact", "destroyed"]);
const VALID_FRAGMENT_CONDITIONS = new Set(["intact", "damaged", "destroyed"]);

function assertCompleteRoleIntegrity(state: CampaignStateV5): void {
  validateNecromancerReferenceIntegrity(state);
  validateHierophantReferenceIntegrity(state);
  validateMarinerReferenceIntegrity(state);
}

function normalizeName(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "Name must not be blank");
  }
  if (trimmed.length > MAX_NAME_LENGTH) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Name exceeds ${MAX_NAME_LENGTH} characters`);
  }
  return trimmed;
}

function normalizeDescription(raw: string | null): string | null {
  if (raw === null) return null;
  const trimmed = raw.trim();
  if (trimmed.length === 0) return null;
  if (trimmed.length > MAX_DESCRIPTION_LENGTH) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Description exceeds ${MAX_DESCRIPTION_LENGTH} characters`);
  }
  return trimmed;
}

function normalizeRequiredText(raw: string, fieldLabel: string): string {
  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `${fieldLabel} must not be blank`);
  }
  if (trimmed.length > MAX_DESCRIPTION_LENGTH) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `${fieldLabel} exceeds ${MAX_DESCRIPTION_LENGTH} characters`);
  }
  return trimmed;
}

function structurallyEqual(a: unknown, b: unknown): boolean {
  return canonicalJsonStringify(a) === canonicalJsonStringify(b);
}

function checkPrecondition<T>(
  fieldLabel: string,
  current: T,
  change: ExpectedFieldChange<T>,
  eq: (left: T, right: T) => boolean = (left, right) => left === right,
): void {
  if (!eq(current, change.expected)) {
    throw new DomainError(
      "STALE_COMMAND_PRECONDITION",
      `${fieldLabel}: expected "${String(change.expected)}" but current is "${String(current)}"`,
    );
  }
}

function replaceWorld(state: CampaignStateV5, world: SharedWorldState): CampaignStateV5 {
  return { ...state, world };
}

function requireDenizen(state: CampaignStateV5, denizenId: DenizenId): { index: number; denizen: Denizen } {
  const index = state.world.denizens.findIndex((denizen) => denizen.denizenId === denizenId);
  if (index === -1) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Denizen not found: ${denizenId}`);
  }
  return { index, denizen: state.world.denizens[index] };
}

function replaceDenizen(state: CampaignStateV5, index: number, updated: Denizen): CampaignStateV5 {
  const denizens = [...state.world.denizens];
  denizens[index] = updated;
  return replaceWorld(state, { ...state.world, denizens });
}

function requireProfile(denizen: Denizen): PowerfulDenizenProfile {
  if (denizen.powerfulProfile === null) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Denizen ${denizen.denizenId} has no Powerful profile`);
  }
  return denizen.powerfulProfile;
}

function collectMethodEntryIds(world: SharedWorldState, exceptDenizenId?: DenizenId): Set<string> {
  const ids = new Set<string>();
  for (const denizen of world.denizens) {
    if (exceptDenizenId !== undefined && denizen.denizenId === exceptDenizenId) continue;
    const profile = denizen.powerfulProfile;
    if (profile === null) continue;
    for (const method of profile.methods) {
      ids.add(method.methodEntryId);
    }
  }
  return ids;
}

function collectTruthIds(state: CampaignStateV5, exceptDenizenId?: DenizenId): Set<string> {
  const ids = new Set<string>();
  for (const denizen of state.world.denizens) {
    if (exceptDenizenId !== undefined && denizen.denizenId === exceptDenizenId) continue;
    const profile = denizen.powerfulProfile;
    if (profile === null) continue;
    for (const truth of profile.truths) {
      ids.add(truth.truthId);
    }
  }
  for (const foe of state.necromancer.foes) {
    if (!isNecromancerWizardFoe(foe)) continue;
    for (const truth of foe.truths) {
      ids.add(truth.truthId);
    }
  }
  return ids;
}

function campaignTaxonomyIds(world: SharedWorldState): Set<string> {
  return new Set(world.campaignPowerfulDenizenTaxonomies.map((taxonomy) => taxonomy.taxonomyId));
}

function normalizeStatus(status: PowerfulDenizenStatus): PowerfulDenizenStatus {
  if (status.kind === "standard") {
    if (!isValidPowerfulDenizenStandardStatus(status.value)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `Invalid powerful denizen status: ${status.value}`);
    }
    return { kind: "standard", value: status.value };
  }
  return { kind: "other", label: normalizeName(status.label) };
}

function normalizeMethodDefinition(definition: PowerfulDenizenMethodDefinition): PowerfulDenizenMethodDefinition {
  if (definition.kind === "standard") {
    if (!isValidStandardPowerfulDenizenMethod(definition.method)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `Invalid standard method: ${definition.method}`);
    }
    return { kind: "standard", method: definition.method };
  }
  return {
    kind: "named",
    name: normalizeName(definition.name),
    description: normalizeDescription(definition.description),
  };
}

function normalizeTaxonomyRefs(
  world: SharedWorldState,
  refs: readonly PowerfulDenizenTaxonomyRef[],
): readonly PowerfulDenizenTaxonomyRef[] {
  if (refs.length === 0) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "Powerful profile requires at least one taxonomy");
  }
  const seen = new Set<string>();
  const campaignIds = campaignTaxonomyIds(world);
  const normalized: PowerfulDenizenTaxonomyRef[] = [];
  for (const ref of refs) {
    if (ref.kind === "builtin") {
      if (!isValidBuiltinPowerfulDenizenTaxonomyId(ref.taxonomyId)) {
        throw new DomainError("INVALID_CAMPAIGN_STATE", `Unknown builtin taxonomy: ${ref.taxonomyId}`);
      }
      const next: PowerfulDenizenTaxonomyRef = { kind: "builtin", taxonomyId: ref.taxonomyId };
      const key = powerfulDenizenTaxonomyRefKey(next);
      if (seen.has(key)) {
        throw new DomainError("INVALID_CAMPAIGN_STATE", `Duplicate taxonomy ref: ${key}`);
      }
      seen.add(key);
      normalized.push(next);
      continue;
    }
    if (ref.kind !== "campaign" || !isValidCampaignPowerfulDenizenTaxonomyId(ref.taxonomyId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `Invalid campaign taxonomy ref: ${JSON.stringify(ref)}`);
    }
    if (!campaignIds.has(ref.taxonomyId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `Campaign taxonomy not found: ${ref.taxonomyId}`);
    }
    const next: PowerfulDenizenTaxonomyRef = { kind: "campaign", taxonomyId: ref.taxonomyId };
    const key = powerfulDenizenTaxonomyRefKey(next);
    if (seen.has(key)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `Duplicate taxonomy ref: ${key}`);
    }
    seen.add(key);
    normalized.push(next);
  }
  return normalized;
}

function wizardExists(state: CampaignStateV5, wizardId: WizardId): boolean {
  return state.wizards.some((wizard) => wizard.wizardId === wizardId);
}

function denizenExists(state: CampaignStateV5, denizenId: DenizenId): boolean {
  return state.world.denizens.some((denizen) => denizen.denizenId === denizenId);
}

function placeExists(state: CampaignStateV5, placeId: string): boolean {
  return state.world.places.some((place) => place.placeId === placeId);
}

function assertSubjectRef(state: CampaignStateV5, subject: WizardOrDenizenSubjectRef): WizardOrDenizenSubjectRef {
  if (subject.kind === "wizard") {
    if (!isValidWizardId(subject.wizardId) || !wizardExists(state, subject.wizardId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `Wizard not found: ${subject.wizardId}`);
    }
    return { kind: "wizard", wizardId: subject.wizardId };
  }
  if (subject.kind !== "denizen" || !isValidDenizenId(subject.denizenId) || !denizenExists(state, subject.denizenId)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Denizen not found: ${subject.kind === "denizen" ? subject.denizenId : JSON.stringify(subject)}`);
  }
  return { kind: "denizen", denizenId: subject.denizenId };
}

function normalizeTreasureCustody(
  state: CampaignStateV5,
  condition: TreasureCondition,
  custody: TreasureCustody,
): TreasureCustody {
  if (condition === "destroyed" && custody.kind !== "none") {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "Destroyed treasure custody must be none");
  }
  if (custody.kind === "none") return { kind: "none" };
  if (custody.kind === "unlocated") return { kind: "unlocated" };
  if (custody.kind === "place") {
    if (!isValidPlaceId(custody.placeId) || !placeExists(state, custody.placeId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `Place not found: ${custody.placeId}`);
    }
    return { kind: "place", placeId: custody.placeId };
  }
  if (custody.kind !== "subject") {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Invalid treasure custody: ${JSON.stringify(custody)}`);
  }
  return { kind: "subject", subject: assertSubjectRef(state, custody.subject) };
}

function normalizeFragmentCustody(
  state: CampaignStateV5,
  condition: PactFragmentOperationalState["condition"],
  custody: PactFragmentCustody,
): PactFragmentCustody {
  if (condition === "destroyed" && custody.kind !== "none") {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "Destroyed pact fragment custody must be none");
  }
  if (custody.kind === "none") return { kind: "none" };
  if (custody.kind === "devil") return { kind: "devil" };
  if (custody.kind === "unlocated") return { kind: "unlocated" };
  if (custody.kind !== "wizard") {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Invalid pact fragment custody: ${JSON.stringify(custody)}`);
  }
  if (!isValidWizardId(custody.wizardId) || !wizardExists(state, custody.wizardId)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Wizard not found: ${custody.wizardId}`);
  }
  return { kind: "wizard", wizardId: custody.wizardId };
}

function taxonomyReferencedByAnyProfile(world: SharedWorldState, taxonomyId: CampaignPowerfulDenizenTaxonomyId): boolean {
  for (const denizen of world.denizens) {
    const profile = denizen.powerfulProfile;
    if (profile === null) continue;
    if (profile.taxonomies.some((ref) => ref.kind === "campaign" && ref.taxonomyId === taxonomyId)) {
      return true;
    }
  }
  return false;
}

export function applySetWizardMortalityState(
  state: CampaignStateV5,
  wizardId: WizardId,
  change: ExpectedFieldChange<MortalityState>,
): SharedStateTransitionResult {
  if (!isValidWizardId(wizardId)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Invalid wizardId: ${wizardId}`);
  }
  if (!VALID_MORTALITY_STATES.has(change.value)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Invalid mortality state: ${change.value}`);
  }
  const wizard = state.wizards.find((candidate) => candidate.wizardId === wizardId);
  if (wizard === undefined) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Wizard not found: ${wizardId}`);
  }
  checkPrecondition("mortalityState", wizard.mortalityState, change);
  if (change.value === wizard.mortalityState) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "Update produces no change");
  }
  const nextState: CampaignStateV5 = {
    ...state,
    wizards: state.wizards.map((candidate) =>
      candidate.wizardId === wizardId ? { ...candidate, mortalityState: change.value } : candidate,
    ),
  };
  const event: WizardMortalityStateChangedEventV1 = {
    type: "wizard_mortality_state_changed",
    version: 1,
    data: {
      wizardId,
      previousMortalityState: wizard.mortalityState,
      newMortalityState: change.value,
    },
  };
  validateNecromancerReferenceIntegrity(nextState);
  return { nextState, events: [event] };
}

export function applySetDenizenMortalityState(
  state: CampaignStateV5,
  denizenId: DenizenId,
  change: ExpectedFieldChange<MortalityState>,
): SharedStateTransitionResult {
  if (!isValidDenizenId(denizenId)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Invalid denizenId: ${denizenId}`);
  }
  if (!VALID_MORTALITY_STATES.has(change.value)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Invalid mortality state: ${change.value}`);
  }
  const { index, denizen } = requireDenizen(state, denizenId);
  if (denizen.representation !== "individual" || denizen.mortalityState === null) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Collective denizen mortality cannot be mutated: ${denizenId}`);
  }
  checkPrecondition("mortalityState", denizen.mortalityState, change);
  if (change.value === denizen.mortalityState) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "Update produces no change");
  }
  const updated: Denizen = { ...denizen, mortalityState: change.value };
  const event: DenizenMortalityStateChangedEventV1 = {
    type: "denizen_mortality_state_changed",
    version: 1,
    data: {
      denizenId,
      previousMortalityState: denizen.mortalityState,
      newMortalityState: change.value,
    },
  };
  return { nextState: replaceDenizen(state, index, updated), events: [event] };
}

export interface CreatePowerfulDenizenProfileInput {
  readonly denizenId: DenizenId;
  readonly taxonomies: readonly PowerfulDenizenTaxonomyRef[];
  readonly status: PowerfulDenizenStatus;
  readonly goal: string | null;
}

export function applyCreatePowerfulDenizenProfile(
  state: CampaignStateV5,
  input: CreatePowerfulDenizenProfileInput,
): SharedStateTransitionResult {
  const { index, denizen } = requireDenizen(state, input.denizenId);
  if (denizen.powerfulProfile !== null) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Denizen already has a Powerful profile: ${input.denizenId}`);
  }
  const profile: PowerfulDenizenProfile = {
    taxonomies: normalizeTaxonomyRefs(state.world, input.taxonomies),
    status: normalizeStatus(input.status),
    goal: normalizeDescription(input.goal),
    methods: [],
    truths: [],
  };
  const updated: Denizen = { ...denizen, powerfulProfile: profile };
  const event: PowerfulDenizenProfileCreatedEventV1 = {
    type: "powerful_denizen_profile_created",
    version: 1,
    data: { denizenId: input.denizenId, profile },
  };
  return { nextState: replaceDenizen(state, index, updated), events: [event] };
}

export function applyRemovePowerfulDenizenProfile(
  state: CampaignStateV5,
  denizenId: DenizenId,
  expectedProfile: PowerfulDenizenProfile,
): SharedStateTransitionResult {
  const { index, denizen } = requireDenizen(state, denizenId);
  const current = requireProfile(denizen);
  if (!structurallyEqual(current, expectedProfile)) {
    throw new DomainError(
      "STALE_COMMAND_PRECONDITION",
      `Powerful profile for ${denizenId} does not match the expected current state`,
    );
  }
  const updated: Denizen = { ...denizen, powerfulProfile: null };
  const event: PowerfulDenizenProfileRemovedEventV1 = {
    type: "powerful_denizen_profile_removed",
    version: 1,
    data: { denizenId, profile: current },
  };
  const nextState = replaceDenizen(state, index, updated);
  assertCompleteRoleIntegrity(nextState);
  return { nextState, events: [event] };
}

export function applySetPowerfulDenizenTaxonomies(
  state: CampaignStateV5,
  denizenId: DenizenId,
  change: ExpectedFieldChange<readonly PowerfulDenizenTaxonomyRef[]>,
): SharedStateTransitionResult {
  const { index, denizen } = requireDenizen(state, denizenId);
  const current = requireProfile(denizen);
  checkPrecondition("taxonomies", current.taxonomies, change, structurallyEqual);
  const taxonomies = normalizeTaxonomyRefs(state.world, change.value);
  if (structurallyEqual(current.taxonomies, taxonomies)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "Update produces no change");
  }
  const profile: PowerfulDenizenProfile = { ...current, taxonomies };
  const event: PowerfulDenizenTaxonomiesChangedEventV1 = {
    type: "powerful_denizen_taxonomies_changed",
    version: 1,
    data: { denizenId, previous: current.taxonomies, updated: taxonomies },
  };
  const nextState = replaceDenizen(state, index, { ...denizen, powerfulProfile: profile });
  assertCompleteRoleIntegrity(nextState);
  return { nextState, events: [event] };
}

export function applySetPowerfulDenizenStatus(
  state: CampaignStateV5,
  denizenId: DenizenId,
  change: ExpectedFieldChange<PowerfulDenizenStatus>,
): SharedStateTransitionResult {
  const { index, denizen } = requireDenizen(state, denizenId);
  const current = requireProfile(denizen);
  checkPrecondition("status", current.status, change, structurallyEqual);
  const status = normalizeStatus(change.value);
  if (structurallyEqual(current.status, status)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "Update produces no change");
  }
  const profile: PowerfulDenizenProfile = { ...current, status };
  const event: PowerfulDenizenStatusChangedEventV1 = {
    type: "powerful_denizen_status_changed",
    version: 1,
    data: { denizenId, previous: current.status, updated: status },
  };
  const nextState = replaceDenizen(state, index, { ...denizen, powerfulProfile: profile });
  assertCompleteRoleIntegrity(nextState);
  return { nextState, events: [event] };
}

export function applySetPowerfulDenizenGoal(
  state: CampaignStateV5,
  denizenId: DenizenId,
  change: ExpectedFieldChange<string | null>,
): SharedStateTransitionResult {
  const { index, denizen } = requireDenizen(state, denizenId);
  const current = requireProfile(denizen);
  checkPrecondition("goal", current.goal, change);
  const goal = normalizeDescription(change.value);
  if (goal === current.goal) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "Update produces no change");
  }
  const profile: PowerfulDenizenProfile = { ...current, goal };
  const event: PowerfulDenizenGoalChangedEventV1 = {
    type: "powerful_denizen_goal_changed",
    version: 1,
    data: { denizenId, previousGoal: current.goal, newGoal: goal },
  };
  return { nextState: replaceDenizen(state, index, { ...denizen, powerfulProfile: profile }), events: [event] };
}

export interface AddPowerfulDenizenMethodInput {
  readonly denizenId: DenizenId;
  readonly methodEntryId: PowerfulDenizenMethodEntryId;
  readonly definition: PowerfulDenizenMethodDefinition;
}

export function applyAddPowerfulDenizenMethod(
  state: CampaignStateV5,
  input: AddPowerfulDenizenMethodInput,
): SharedStateTransitionResult {
  if (!isValidPowerfulDenizenMethodEntryId(input.methodEntryId)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Invalid methodEntryId: ${input.methodEntryId}`);
  }
  const { index, denizen } = requireDenizen(state, input.denizenId);
  const current = requireProfile(denizen);
  const existingIds = collectMethodEntryIds(state.world);
  if (existingIds.has(input.methodEntryId) || current.methods.some((method) => method.methodEntryId === input.methodEntryId)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Duplicate powerful denizen methodEntryId: ${input.methodEntryId}`);
  }
  const method: PowerfulDenizenMethodEntry = {
    methodEntryId: input.methodEntryId,
    definition: normalizeMethodDefinition(input.definition),
    origin: "campaign",
  };
  const profile: PowerfulDenizenProfile = { ...current, methods: [...current.methods, method] };
  const event: PowerfulDenizenMethodAddedEventV1 = {
    type: "powerful_denizen_method_added",
    version: 1,
    data: { denizenId: input.denizenId, method },
  };
  return { nextState: replaceDenizen(state, index, { ...denizen, powerfulProfile: profile }), events: [event] };
}

export function applyUpdatePowerfulDenizenMethod(
  state: CampaignStateV5,
  denizenId: DenizenId,
  methodEntryId: PowerfulDenizenMethodEntryId,
  change: ExpectedFieldChange<PowerfulDenizenMethodDefinition>,
): SharedStateTransitionResult {
  const { index, denizen } = requireDenizen(state, denizenId);
  const current = requireProfile(denizen);
  const methodIndex = current.methods.findIndex((method) => method.methodEntryId === methodEntryId);
  if (methodIndex === -1) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Powerful denizen method not found: ${methodEntryId}`);
  }
  const existing = current.methods[methodIndex];
  checkPrecondition("definition", existing.definition, change, structurallyEqual);
  const definition = normalizeMethodDefinition(change.value);
  if (structurallyEqual(existing.definition, definition)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "Update produces no change");
  }
  const updated: PowerfulDenizenMethodEntry = {
    methodEntryId: existing.methodEntryId,
    definition,
    origin: existing.origin,
  };
  const methods = current.methods.map((method, i) => (i === methodIndex ? updated : method));
  const profile: PowerfulDenizenProfile = { ...current, methods };
  const event: PowerfulDenizenMethodUpdatedEventV1 = {
    type: "powerful_denizen_method_updated",
    version: 1,
    data: { denizenId, previous: existing, updated },
  };
  const nextState = replaceDenizen(state, index, { ...denizen, powerfulProfile: profile });
  assertCompleteRoleIntegrity(nextState);
  return { nextState, events: [event] };
}

export function applyRemovePowerfulDenizenMethod(
  state: CampaignStateV5,
  denizenId: DenizenId,
  methodEntryId: PowerfulDenizenMethodEntryId,
  expectedMethod: PowerfulDenizenMethodEntry,
): SharedStateTransitionResult {
  const { index, denizen } = requireDenizen(state, denizenId);
  const current = requireProfile(denizen);
  const existing = current.methods.find((method) => method.methodEntryId === methodEntryId);
  if (existing === undefined) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Powerful denizen method not found: ${methodEntryId}`);
  }
  if (!structurallyEqual(existing, expectedMethod)) {
    throw new DomainError(
      "STALE_COMMAND_PRECONDITION",
      `Powerful denizen method ${methodEntryId} does not match the expected current state`,
    );
  }
  const profile: PowerfulDenizenProfile = {
    ...current,
    methods: current.methods.filter((method) => method.methodEntryId !== methodEntryId),
  };
  const event: PowerfulDenizenMethodRemovedEventV1 = {
    type: "powerful_denizen_method_removed",
    version: 1,
    data: { denizenId, method: existing },
  };
  const nextState = replaceDenizen(state, index, { ...denizen, powerfulProfile: profile });
  assertCompleteRoleIntegrity(nextState);
  return { nextState, events: [event] };
}

export interface AddPowerfulDenizenTruthInput {
  readonly denizenId: DenizenId;
  readonly truthId: PowerfulDenizenTruthId;
  readonly text: string;
}

export function applyAddPowerfulDenizenTruth(
  state: CampaignStateV5,
  input: AddPowerfulDenizenTruthInput,
): SharedStateTransitionResult {
  if (!isValidPowerfulDenizenTruthId(input.truthId)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Invalid truthId: ${input.truthId}`);
  }
  const { index, denizen } = requireDenizen(state, input.denizenId);
  const current = requireProfile(denizen);
  const existingIds = collectTruthIds(state);
  if (existingIds.has(input.truthId) || current.truths.some((truth) => truth.truthId === input.truthId)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Duplicate powerful denizen truthId: ${input.truthId}`);
  }
  const truth: PowerfulDenizenTruthEntry = {
    truthId: input.truthId,
    text: normalizeRequiredText(input.text, "Truth text"),
    origin: "campaign",
  };
  const profile: PowerfulDenizenProfile = { ...current, truths: [...current.truths, truth] };
  const event: PowerfulDenizenTruthAddedEventV1 = {
    type: "powerful_denizen_truth_added",
    version: 1,
    data: { denizenId: input.denizenId, truth },
  };
  return { nextState: replaceDenizen(state, index, { ...denizen, powerfulProfile: profile }), events: [event] };
}

export function applyUpdatePowerfulDenizenTruth(
  state: CampaignStateV5,
  denizenId: DenizenId,
  truthId: PowerfulDenizenTruthId,
  change: ExpectedFieldChange<string>,
): SharedStateTransitionResult {
  const { index, denizen } = requireDenizen(state, denizenId);
  const current = requireProfile(denizen);
  const truthIndex = current.truths.findIndex((truth) => truth.truthId === truthId);
  if (truthIndex === -1) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Powerful denizen truth not found: ${truthId}`);
  }
  const existing = current.truths[truthIndex];
  checkPrecondition("text", existing.text, change);
  const text = normalizeRequiredText(change.value, "Truth text");
  if (text === existing.text) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "Update produces no change");
  }
  const updated: PowerfulDenizenTruthEntry = {
    truthId: existing.truthId,
    text,
    origin: existing.origin,
  };
  const truths = current.truths.map((truth, i) => (i === truthIndex ? updated : truth));
  const profile: PowerfulDenizenProfile = { ...current, truths };
  const event: PowerfulDenizenTruthUpdatedEventV1 = {
    type: "powerful_denizen_truth_updated",
    version: 1,
    data: { denizenId, previous: existing, updated },
  };
  return { nextState: replaceDenizen(state, index, { ...denizen, powerfulProfile: profile }), events: [event] };
}

export function applyRemovePowerfulDenizenTruth(
  state: CampaignStateV5,
  denizenId: DenizenId,
  truthId: PowerfulDenizenTruthId,
  expectedTruth: PowerfulDenizenTruthEntry,
): SharedStateTransitionResult {
  const { index, denizen } = requireDenizen(state, denizenId);
  const current = requireProfile(denizen);
  const existing = current.truths.find((truth) => truth.truthId === truthId);
  if (existing === undefined) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Powerful denizen truth not found: ${truthId}`);
  }
  if (!structurallyEqual(existing, expectedTruth)) {
    throw new DomainError(
      "STALE_COMMAND_PRECONDITION",
      `Powerful denizen truth ${truthId} does not match the expected current state`,
    );
  }
  const profile: PowerfulDenizenProfile = {
    ...current,
    truths: current.truths.filter((truth) => truth.truthId !== truthId),
  };
  const event: PowerfulDenizenTruthRemovedEventV1 = {
    type: "powerful_denizen_truth_removed",
    version: 1,
    data: { denizenId, truth: existing },
  };
  return { nextState: replaceDenizen(state, index, { ...denizen, powerfulProfile: profile }), events: [event] };
}

export interface CreateCampaignPowerfulDenizenTaxonomyInput {
  readonly taxonomyId: CampaignPowerfulDenizenTaxonomyId;
  readonly name: string;
  readonly description: string | null;
}

export function applyCreateCampaignPowerfulDenizenTaxonomy(
  state: CampaignStateV5,
  input: CreateCampaignPowerfulDenizenTaxonomyInput,
): SharedStateTransitionResult {
  if (!isValidCampaignPowerfulDenizenTaxonomyId(input.taxonomyId)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Invalid taxonomyId: ${input.taxonomyId}`);
  }
  if (campaignTaxonomyIds(state.world).has(input.taxonomyId)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Duplicate campaign taxonomyId: ${input.taxonomyId}`);
  }
  const taxonomy: CampaignPowerfulDenizenTaxonomy = {
    taxonomyId: input.taxonomyId,
    name: normalizeName(input.name),
    description: normalizeDescription(input.description),
  };
  const world: SharedWorldState = {
    ...state.world,
    campaignPowerfulDenizenTaxonomies: [...state.world.campaignPowerfulDenizenTaxonomies, taxonomy],
  };
  const event: CampaignPowerfulDenizenTaxonomyCreatedEventV1 = {
    type: "campaign_powerful_denizen_taxonomy_created",
    version: 1,
    data: { taxonomy },
  };
  return { nextState: replaceWorld(state, world), events: [event] };
}

export interface UpdateCampaignPowerfulDenizenTaxonomyFields {
  readonly name?: ExpectedFieldChange<string>;
  readonly description?: ExpectedFieldChange<string | null>;
}

export function applyUpdateCampaignPowerfulDenizenTaxonomy(
  state: CampaignStateV5,
  taxonomyId: CampaignPowerfulDenizenTaxonomyId,
  fields: UpdateCampaignPowerfulDenizenTaxonomyFields,
): SharedStateTransitionResult {
  if (fields.name === undefined && fields.description === undefined) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "Update must specify at least one field");
  }
  const index = state.world.campaignPowerfulDenizenTaxonomies.findIndex((taxonomy) => taxonomy.taxonomyId === taxonomyId);
  if (index === -1) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Campaign taxonomy not found: ${taxonomyId}`);
  }
  const current = state.world.campaignPowerfulDenizenTaxonomies[index];
  let name = current.name;
  let description = current.description;
  if (fields.name !== undefined) {
    checkPrecondition("name", current.name, fields.name);
    name = normalizeName(fields.name.value);
  }
  if (fields.description !== undefined) {
    checkPrecondition("description", current.description, fields.description);
    description = normalizeDescription(fields.description.value);
  }
  if (name === current.name && description === current.description) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "Update produces no change");
  }
  const updated: CampaignPowerfulDenizenTaxonomy = { taxonomyId, name, description };
  const campaignPowerfulDenizenTaxonomies = [...state.world.campaignPowerfulDenizenTaxonomies];
  campaignPowerfulDenizenTaxonomies[index] = updated;
  const event: CampaignPowerfulDenizenTaxonomyUpdatedEventV1 = {
    type: "campaign_powerful_denizen_taxonomy_updated",
    version: 1,
    data: { previous: current, updated },
  };
  return {
    nextState: replaceWorld(state, { ...state.world, campaignPowerfulDenizenTaxonomies }),
    events: [event],
  };
}

export function applyRemoveCampaignPowerfulDenizenTaxonomy(
  state: CampaignStateV5,
  taxonomyId: CampaignPowerfulDenizenTaxonomyId,
  expectedTaxonomy: CampaignPowerfulDenizenTaxonomy,
): SharedStateTransitionResult {
  const current = state.world.campaignPowerfulDenizenTaxonomies.find((taxonomy) => taxonomy.taxonomyId === taxonomyId);
  if (current === undefined) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Campaign taxonomy not found: ${taxonomyId}`);
  }
  if (!structurallyEqual(current, expectedTaxonomy)) {
    throw new DomainError(
      "STALE_COMMAND_PRECONDITION",
      `Campaign taxonomy ${taxonomyId} does not match the expected current state`,
    );
  }
  if (taxonomyReferencedByAnyProfile(state.world, taxonomyId)) {
    throw new DomainError(
      "INVALID_CAMPAIGN_STATE",
      `Cannot remove campaign taxonomy ${taxonomyId} while a Powerful profile still references it`,
    );
  }
  const world: SharedWorldState = {
    ...state.world,
    campaignPowerfulDenizenTaxonomies: state.world.campaignPowerfulDenizenTaxonomies.filter(
      (taxonomy) => taxonomy.taxonomyId !== taxonomyId,
    ),
  };
  const event: CampaignPowerfulDenizenTaxonomyRemovedEventV1 = {
    type: "campaign_powerful_denizen_taxonomy_removed",
    version: 1,
    data: { taxonomy: current },
  };
  return { nextState: replaceWorld(state, world), events: [event] };
}

export interface CreateTreasureInput {
  readonly treasureId: TreasureId;
  readonly name: string;
  readonly description: string | null;
  readonly condition: TreasureCondition;
  readonly custody: TreasureCustody;
}

export function applyCreateTreasure(
  state: CampaignStateV5,
  input: CreateTreasureInput,
): SharedStateTransitionResult {
  if (!isValidTreasureId(input.treasureId)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Invalid treasureId: ${input.treasureId}`);
  }
  if (state.world.treasures.some((treasure) => treasure.treasureId === input.treasureId)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Duplicate treasureId: ${input.treasureId}`);
  }
  if (!VALID_TREASURE_CONDITIONS.has(input.condition)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Invalid treasure condition: ${input.condition}`);
  }
  const treasure: Treasure = {
    treasureId: input.treasureId,
    name: normalizeName(input.name),
    description: normalizeDescription(input.description),
    condition: input.condition,
    custody: normalizeTreasureCustody(state, input.condition, input.custody),
  };
  const world: SharedWorldState = {
    ...state.world,
    treasures: [...state.world.treasures, treasure],
  };
  const event: TreasureCreatedEventV1 = {
    type: "treasure_created",
    version: 1,
    data: { treasure },
  };
  return { nextState: replaceWorld(state, world), events: [event] };
}

export interface UpdateTreasureDetailsFields {
  readonly name?: ExpectedFieldChange<string>;
  readonly description?: ExpectedFieldChange<string | null>;
}

export function applyUpdateTreasureDetails(
  state: CampaignStateV5,
  treasureId: TreasureId,
  fields: UpdateTreasureDetailsFields,
): SharedStateTransitionResult {
  if (fields.name === undefined && fields.description === undefined) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "Update must specify at least one field");
  }
  const index = state.world.treasures.findIndex((treasure) => treasure.treasureId === treasureId);
  if (index === -1) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Treasure not found: ${treasureId}`);
  }
  const current = state.world.treasures[index];
  let name = current.name;
  let description = current.description;
  if (fields.name !== undefined) {
    checkPrecondition("name", current.name, fields.name);
    name = normalizeName(fields.name.value);
  }
  if (fields.description !== undefined) {
    checkPrecondition("description", current.description, fields.description);
    description = normalizeDescription(fields.description.value);
  }
  if (name === current.name && description === current.description) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "Update produces no change");
  }
  const updated: Treasure = { ...current, treasureId, name, description };
  const treasures = [...state.world.treasures];
  treasures[index] = updated;
  const event: TreasureDetailsUpdatedEventV1 = {
    type: "treasure_details_updated",
    version: 1,
    data: { treasureId, previous: current, updated },
  };
  return { nextState: replaceWorld(state, { ...state.world, treasures }), events: [event] };
}

export function applyUpdateTreasureState(
  state: CampaignStateV5,
  treasureId: TreasureId,
  expected: Pick<Treasure, "condition" | "custody">,
  next: Pick<Treasure, "condition" | "custody">,
): SharedStateTransitionResult {
  const index = state.world.treasures.findIndex((treasure) => treasure.treasureId === treasureId);
  if (index === -1) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Treasure not found: ${treasureId}`);
  }
  const current = state.world.treasures[index];
  if (!structurallyEqual({ condition: current.condition, custody: current.custody }, expected)) {
    throw new DomainError(
      "STALE_COMMAND_PRECONDITION",
      `Treasure ${treasureId} operational state does not match the expected current state`,
    );
  }
  if (!VALID_TREASURE_CONDITIONS.has(next.condition)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Invalid treasure condition: ${next.condition}`);
  }
  const condition = next.condition;
  const custody = normalizeTreasureCustody(state, condition, next.custody);
  if (condition === current.condition && structurallyEqual(custody, current.custody)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "Update produces no change");
  }
  const updated: Treasure = { ...current, condition, custody };
  const treasures = [...state.world.treasures];
  treasures[index] = updated;
  const event: TreasureStateUpdatedEventV1 = {
    type: "treasure_state_updated",
    version: 1,
    data: { treasureId, previous: current, updated },
  };
  return { nextState: replaceWorld(state, { ...state.world, treasures }), events: [event] };
}

export function applyUpdatePactFragmentOperationalState(
  state: CampaignStateV5,
  seatId: PactSeatId,
  expected: PactFragmentOperationalState,
  next: PactFragmentOperationalState,
): SharedStateTransitionResult {
  if (!isValidPactSeatId(seatId)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Invalid seat id: ${seatId}`);
  }
  const current = state.pactFragmentOperationalState[seatId];
  if (!structurallyEqual(current, expected)) {
    throw new DomainError(
      "STALE_COMMAND_PRECONDITION",
      `Pact fragment for ${seatId} does not match the expected current state`,
    );
  }
  if (!VALID_FRAGMENT_CONDITIONS.has(next.condition)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Invalid pact fragment condition: ${next.condition}`);
  }
  const updated: PactFragmentOperationalState = {
    condition: next.condition,
    custody: normalizeFragmentCustody(state, next.condition, next.custody),
  };
  if (structurallyEqual(current, updated)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "Update produces no change");
  }
  const nextState: CampaignStateV5 = {
    ...state,
    pactFragmentOperationalState: {
      ...state.pactFragmentOperationalState,
      [seatId]: updated,
    },
  };
  const event: PactFragmentOperationalStateChangedEventV1 = {
    type: "pact_fragment_operational_state_changed",
    version: 1,
    data: { seatId, previous: current, updated },
  };
  return { nextState, events: [event] };
}
