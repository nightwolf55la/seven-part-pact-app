import type { CampaignStateV5 } from "./campaign-state";
import type { DenizenId, PowerfulDenizenTruthId, WizardId } from "./ids";
import { isValidDenizenId, isValidPowerfulDenizenTruthId, isValidWizardId } from "./ids";
import { DomainError } from "./errors";
import type { ExpectedFieldChange } from "./world-subject-transitions";
import type { ElementId } from "./shared-world";
import { ELEMENT_IDS } from "./shared-world";
import type { PowerfulDenizenTruthEntry } from "./powerful-denizen";
import {
  requireDisruptiveStatus,
  requirePowerfulRoleProfile,
  requireReliableOrDisruptiveStatus,
} from "./powerful-denizen-roles";
import type { PactSeatId } from "./pact-seats";
import { isValidPactSeatId } from "./pact-seats";
import type { NecromancerEvent } from "./events";
import { canonicalJsonStringify } from "./canonical-json";
import type {
  NecromancerArrangementId,
  NecromancerBuiltinGateId,
  NecromancerBuiltinPathSpaceId,
  NecromancerCampaignGateId,
  NecromancerCampaignPathSpaceId,
  NecromancerDirectedStep,
  NecromancerGateBand,
  NecromancerGateId,
  NecromancerGateStatus,
  NecromancerLawOfDeathId,
  NecromancerOccupiableSpaceRef,
  NecromancerPathRegion,
  NecromancerPathSpaceId,
} from "./necromancer-catalogs";
import {
  NECROMANCER_BUILTIN_GATE_IDS,
  NECROMANCER_BUILTIN_PATH_SPACE_DEFINITIONS,
  isBuiltinEdgeOfLifePathSpaceId,
  isValidNecromancerAbominationKind,
  isValidNecromancerArrangementId,
  isValidNecromancerBuiltinGateId,
  isValidNecromancerCampaignGateId,
  isValidNecromancerCampaignPathSpaceId,
  isValidNecromancerGateBand,
  isValidNecromancerGateStatus,
  isValidNecromancerLawOfDeathId,
  isValidNecromancerLawVisibility,
  isValidNecromancerPathRegion,
  necromancerArrangementDefinition,
  necromancerBuiltinGateDefinition,
  necromancerDefaultInternalOutgoingTarget,
  necromancerDirectedStepKey,
  necromancerDirectedStepsEqual,
  necromancerOccupiableSpaceRefsEqual,
  NECROMANCER_QUIET_ARRANGEMENT_SOUL_LOCATIONS,
} from "./necromancer-catalogs";
import type {
  NecromancerAllyState,
  NecromancerCampaignGateState,
  NecromancerCampaignPathSpaceState,
  NecromancerDepthState,
  NecromancerFoeLocation,
  NecromancerFoeState,
  NecromancerFoeSubjectRef,
  NecromancerGhoulCallerState,
  NecromancerSelectedLaw,
  NecromancerSoulCount,
  NecromancerState,
  NecromancerWizardFoeState,
  NecromancerWizardTraversalKind,
  NecromancerWizardTraversalState,
} from "./necromancer-state";
import {
  buildInitializedDefaultNecromancerState,
  isNecromancerWizardFoe,
  isNecromancerDenizenFoe,
  isValidNecromancerWizardTraversalKind,
  necromancerFoeSubjectKey,
  necromancerFoeSubjectsEqual,
} from "./necromancer-state";
import { validateNecromancerReferenceIntegrity } from "./necromancer-validation";

export interface NecromancerTransitionResult {
  readonly nextState: CampaignStateV5;
  readonly events: readonly NecromancerEvent[];
}

export interface NecromancerArrangementFoeBinding {
  readonly denizenId: DenizenId;
  readonly gateId: NecromancerBuiltinGateId;
}

export interface NecromancerArrangementAllyBinding {
  readonly denizenId: DenizenId;
  readonly gateId: NecromancerBuiltinGateId;
}

export interface NecromancerArrangementGhoulCallerBinding {
  readonly denizenId: DenizenId;
  readonly pathSpaceId: NecromancerBuiltinPathSpaceId;
  readonly primaryElement: ElementId;
  readonly aesthetic: string;
  readonly strangeQuirk: string;
  readonly ageYears: number;
}

export interface InitializeNecromancerInput {
  readonly arrangementId: NecromancerArrangementId;
  readonly selectedLawIds: readonly NecromancerLawOfDeathId[];
  readonly arrangementFoes: readonly NecromancerArrangementFoeBinding[];
  readonly arrangementAlly: NecromancerArrangementAllyBinding;
  readonly arrangementGhoulCaller: NecromancerArrangementGhoulCallerBinding | null;
}

export interface CreateNecromancerCampaignGateInput {
  readonly gateId: NecromancerCampaignGateId;
  readonly name: string;
  readonly band: NecromancerGateBand;
}

export interface UpdateNecromancerCampaignGateFields {
  readonly name?: ExpectedFieldChange<string>;
  readonly band?: ExpectedFieldChange<NecromancerGateBand>;
}

export interface CreateNecromancerCampaignPathSpaceInput {
  readonly pathSpaceId: NecromancerCampaignPathSpaceId;
  readonly region: NecromancerPathRegion;
}

export interface UpdateNecromancerFoeFields {
  readonly location?: ExpectedFieldChange<NecromancerFoeLocation>;
}

export interface UpdateNecromancerWizardTraversalFields {
  readonly kind?: ExpectedFieldChange<NecromancerWizardTraversalKind>;
  readonly location?: ExpectedFieldChange<NecromancerOccupiableSpaceRef>;
}

export interface AddNecromancerWizardFoeTruthInput {
  readonly wizardId: WizardId;
  readonly truthId: PowerfulDenizenTruthId;
  readonly text: string;
}

export interface UpdateNecromancerAllyFields {
  readonly location?: ExpectedFieldChange<NecromancerOccupiableSpaceRef>;
}

export interface UpdateNecromancerGhoulCallerFields {
  readonly location?: ExpectedFieldChange<NecromancerGhoulCallerState["location"]>;
  readonly pettyDeadCount?: ExpectedFieldChange<number>;
  readonly primaryElement?: ExpectedFieldChange<ElementId>;
  readonly aesthetic?: ExpectedFieldChange<string>;
  readonly strangeQuirk?: ExpectedFieldChange<string>;
  readonly ageYears?: ExpectedFieldChange<number>;
}

const MAX_NAME_LENGTH = 200;
const MAX_DESCRIPTION_LENGTH = 8000;
const MAX_GHOUL_CALLER_PROFILE_TEXT_LENGTH = 8000;

function replaceNecromancer(state: CampaignStateV5, necromancer: NecromancerState): CampaignStateV5 {
  return { ...state, necromancer };
}

function commitNecromancer(
  state: CampaignStateV5,
  necromancer: NecromancerState,
  events: readonly NecromancerEvent[],
): NecromancerTransitionResult {
  const nextState = replaceNecromancer(state, necromancer);
  validateNecromancerReferenceIntegrity(nextState);
  return { nextState, events };
}

function isExactEmptyNecromancer(necromancer: NecromancerState): boolean {
  return (
    necromancer.gates.length === 0 &&
    necromancer.pathSpaces.length === 0 &&
    necromancer.steps.length === 0 &&
    necromancer.souls.length === 0 &&
    necromancer.foes.length === 0 &&
    necromancer.allies.length === 0 &&
    necromancer.ghoulCallers.length === 0 &&
    necromancer.selectedLaws.length === 0 &&
    necromancer.depth === null &&
    necromancer.wizardTraversals.length === 0
  );
}

function requireInitialized(state: CampaignStateV5): NecromancerState {
  if (isExactEmptyNecromancer(state.necromancer)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "Necromancer is not initialized");
  }
  return state.necromancer;
}

function checkPrecondition<T>(
  fieldLabel: string,
  current: T,
  change: ExpectedFieldChange<T>,
  equal: (a: T, b: T) => boolean = Object.is,
): void {
  if (!equal(current, change.expected)) {
    throw new DomainError(
      "STALE_COMMAND_PRECONDITION",
      `${fieldLabel}: expected "${String(change.expected)}" but current is "${String(current)}"`,
    );
  }
}

function assertNonNegativeSafeInteger(label: string, value: number): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `${label} must be a non-negative safe integer`);
  }
}

function assertPositiveSafeInteger(label: string, value: number): void {
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `${label} must be a positive safe integer`);
  }
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

export function canonicalizeNecromancerCampaignGateName(raw: string): string {
  return normalizeName(raw);
}

export function canonicalizeNecromancerGhoulCallerProfileText(raw: string, label: string): string {
  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `${label} must not be blank`);
  }
  if (trimmed.length > MAX_GHOUL_CALLER_PROFILE_TEXT_LENGTH) {
    throw new DomainError(
      "INVALID_CAMPAIGN_STATE",
      `${label} exceeds ${MAX_GHOUL_CALLER_PROFILE_TEXT_LENGTH} characters`,
    );
  }
  return trimmed;
}

function requirePrimaryElement(value: unknown, label: string): ElementId {
  if (typeof value !== "string" || !(ELEMENT_IDS as readonly string[]).includes(value)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `${label} is invalid: ${JSON.stringify(value)}`);
  }
  return value as ElementId;
}

export function canonicalizeNecromancerArrangementGhoulCallerBinding(
  binding: NecromancerArrangementGhoulCallerBinding,
): NecromancerArrangementGhoulCallerBinding {
  return {
    denizenId: binding.denizenId,
    pathSpaceId: binding.pathSpaceId,
    primaryElement: requirePrimaryElement(binding.primaryElement, "Primary Element"),
    aesthetic: canonicalizeNecromancerGhoulCallerProfileText(binding.aesthetic, "Aesthetic"),
    strangeQuirk: canonicalizeNecromancerGhoulCallerProfileText(binding.strangeQuirk, "Strange Quirk"),
    ageYears: binding.ageYears,
  };
}

export function canonicalizeInitializeNecromancerInput(
  input: InitializeNecromancerInput,
): InitializeNecromancerInput {
  return {
    ...input,
    arrangementGhoulCaller: input.arrangementGhoulCaller === null
      ? null
      : canonicalizeNecromancerArrangementGhoulCallerBinding(input.arrangementGhoulCaller),
  };
}

export function canonicalizeNecromancerGhoulCaller(
  ghoulCaller: NecromancerGhoulCallerState,
): NecromancerGhoulCallerState {
  return {
    denizenId: ghoulCaller.denizenId,
    location: ghoulCaller.location,
    pettyDeadCount: ghoulCaller.pettyDeadCount,
    primaryElement: requirePrimaryElement(ghoulCaller.primaryElement, "Primary Element"),
    aesthetic: canonicalizeNecromancerGhoulCallerProfileText(ghoulCaller.aesthetic, "Aesthetic"),
    strangeQuirk: canonicalizeNecromancerGhoulCallerProfileText(ghoulCaller.strangeQuirk, "Strange Quirk"),
    ageYears: ghoulCaller.ageYears,
  };
}

export function canonicalizeUpdateNecromancerGhoulCallerFields(
  fields: UpdateNecromancerGhoulCallerFields,
): UpdateNecromancerGhoulCallerFields {
  return {
    ...(fields.location === undefined ? {} : { location: fields.location }),
    ...(fields.pettyDeadCount === undefined ? {} : { pettyDeadCount: fields.pettyDeadCount }),
    ...(fields.primaryElement === undefined ? {} : { primaryElement: fields.primaryElement }),
    ...(fields.aesthetic === undefined
      ? {}
      : {
          aesthetic: {
            expected: fields.aesthetic.expected,
            value: canonicalizeNecromancerGhoulCallerProfileText(fields.aesthetic.value, "Aesthetic"),
          },
        }),
    ...(fields.strangeQuirk === undefined
      ? {}
      : {
          strangeQuirk: {
            expected: fields.strangeQuirk.expected,
            value: canonicalizeNecromancerGhoulCallerProfileText(fields.strangeQuirk.value, "Strange Quirk"),
          },
        }),
    ...(fields.ageYears === undefined ? {} : { ageYears: fields.ageYears }),
  };
}

export function canonicalizeCreateNecromancerCampaignGateInput(
  input: CreateNecromancerCampaignGateInput,
): CreateNecromancerCampaignGateInput {
  return {
    gateId: input.gateId,
    name: canonicalizeNecromancerCampaignGateName(input.name),
    band: input.band,
  };
}

export function canonicalizeUpdateNecromancerCampaignGateFields(
  fields: UpdateNecromancerCampaignGateFields,
): UpdateNecromancerCampaignGateFields {
  return {
    ...(fields.name === undefined
      ? {}
      : {
          name: {
            expected: fields.name.expected,
            value: canonicalizeNecromancerCampaignGateName(fields.name.value),
          },
        }),
    ...(fields.band === undefined ? {} : { band: fields.band }),
  };
}

function soulCountAt(souls: readonly NecromancerSoulCount[], location: NecromancerOccupiableSpaceRef): number {
  const found = souls.find((soul) => necromancerOccupiableSpaceRefsEqual(soul.location, location));
  return found?.count ?? 0;
}

function setSoulCount(
  souls: readonly NecromancerSoulCount[],
  location: NecromancerOccupiableSpaceRef,
  count: number,
): NecromancerSoulCount[] {
  const without = souls.filter((soul) => !necromancerOccupiableSpaceRefsEqual(soul.location, location));
  if (count === 0) {
    return without;
  }
  return [...without, { location, count }];
}

function addSoulCounts(
  souls: readonly NecromancerSoulCount[],
  additions: readonly NecromancerOccupiableSpaceRef[],
): NecromancerSoulCount[] {
  let next = [...souls];
  for (const location of additions) {
    next = setSoulCount(next, location, soulCountAt(next, location) + 1);
  }
  return next;
}

function depthEqual(a: NecromancerDepthState | null, b: NecromancerDepthState | null): boolean {
  if (a === null || b === null) {
    return a === b;
  }
  return a.wizardId === b.wizardId && a.value === b.value;
}

function selectedLawsEqual(a: readonly NecromancerSelectedLaw[], b: readonly NecromancerSelectedLaw[]): boolean {
  return a.length === b.length && a.every((law, i) => law.lawId === b[i].lawId && law.visibility === b[i].visibility);
}

function foeLocationsEqual(a: NecromancerFoeLocation, b: NecromancerFoeLocation): boolean {
  if (a.kind === "escaped" || b.kind === "escaped") {
    return (
      a.kind === "escaped" &&
      b.kind === "escaped" &&
      a.seatId === b.seatId &&
      a.abominationKind === b.abominationKind
    );
  }
  return necromancerOccupiableSpaceRefsEqual(a, b);
}

function foeEqual(a: NecromancerFoeState, b: NecromancerFoeState): boolean {
  if (!necromancerFoeSubjectsEqual(a.subject, b.subject) || !foeLocationsEqual(a.location, b.location)) {
    return false;
  }
  if (isNecromancerWizardFoe(a) || isNecromancerWizardFoe(b)) {
    if (!isNecromancerWizardFoe(a) || !isNecromancerWizardFoe(b)) return false;
    return canonicalJsonStringify(a.truths) === canonicalJsonStringify(b.truths);
  }
  return true;
}

function allyEqual(a: NecromancerAllyState, b: NecromancerAllyState): boolean {
  return a.denizenId === b.denizenId && necromancerOccupiableSpaceRefsEqual(a.location, b.location);
}

function ghoulCallerEqual(a: NecromancerGhoulCallerState, b: NecromancerGhoulCallerState): boolean {
  return (
    a.denizenId === b.denizenId &&
    a.pettyDeadCount === b.pettyDeadCount &&
    a.primaryElement === b.primaryElement &&
    a.aesthetic === b.aesthetic &&
    a.strangeQuirk === b.strangeQuirk &&
    a.ageYears === b.ageYears &&
    necromancerOccupiableSpaceRefsEqual(a.location, b.location)
  );
}

function campaignPathSpaceEqual(
  a: NecromancerCampaignPathSpaceState,
  b: NecromancerCampaignPathSpaceState,
): boolean {
  return a.origin === b.origin && a.pathSpaceId === b.pathSpaceId && a.region === b.region;
}

function gateIdsInState(necromancer: NecromancerState): Set<string> {
  return new Set(necromancer.gates.map((gate) => gate.gateId as string));
}

function pathSpaceIdsInState(necromancer: NecromancerState): Set<string> {
  return new Set(necromancer.pathSpaces.map((space) => space.pathSpaceId as string));
}

function assertOccupiableResolves(necromancer: NecromancerState, location: NecromancerOccupiableSpaceRef, label: string): void {
  if ((location as { kind: string }).kind === "terminal") {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `${label} must be an occupiable Gate or path space, not a terminal exit`);
  }
  if (location.kind === "gate") {
    if (!gateIdsInState(necromancer).has(location.gateId as string)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${label} does not resolve to an occupiable Gate: ${location.gateId}`);
    }
    return;
  }
  if (!pathSpaceIdsInState(necromancer).has(location.pathSpaceId as string)) {
    throw new DomainError(
      "INVALID_CAMPAIGN_STATE",
      `${label} does not resolve to an occupiable path space: ${location.pathSpaceId}`,
    );
  }
}

function requireDenizenFoeProfile(state: CampaignStateV5, denizenId: DenizenId, label: string) {
  const denizen = requireDenizen(state, denizenId, label);
  requirePowerfulRoleProfile(denizen, label, "foe_of_death");
  return denizen;
}

function requireGhoulCallerRoleProfile(
  state: CampaignStateV5,
  denizenId: DenizenId,
  label: string,
  startingDisruptive = false,
) {
  const denizen = requireIndividualDenizen(state, denizenId, label);
  const profile = requirePowerfulRoleProfile(denizen, label, "ghoul_caller");
  if (startingDisruptive) {
    requireDisruptiveStatus(profile, label);
  } else {
    requireReliableOrDisruptiveStatus(profile, label);
  }
  return denizen;
}

function requireWizard(state: CampaignStateV5, wizardId: WizardId, label: string) {
  if (!isValidWizardId(wizardId)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `${label}.wizardId is invalid: ${JSON.stringify(wizardId)}`);
  }
  const wizard = state.wizards.find((candidate) => candidate.wizardId === wizardId);
  if (wizard === undefined) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `${label}.wizardId does not resolve: ${wizardId}`);
  }
  return wizard;
}

function findFoeIndex(necromancer: NecromancerState, subject: NecromancerFoeSubjectRef): number {
  return necromancer.foes.findIndex((foe) => necromancerFoeSubjectsEqual(foe.subject, subject));
}

function collectCampaignTruthIds(state: CampaignStateV5, exceptWizardFoe?: WizardId): Set<string> {
  const ids = new Set<string>();
  for (const denizen of state.world.denizens) {
    const profile = denizen.powerfulProfile;
    if (profile === null) continue;
    for (const truth of profile.truths) ids.add(truth.truthId);
  }
  for (const foe of state.necromancer.foes) {
    if (!isNecromancerWizardFoe(foe)) continue;
    if (exceptWizardFoe !== undefined && foe.subject.wizardId === exceptWizardFoe) continue;
    for (const truth of foe.truths) ids.add(truth.truthId);
  }
  return ids;
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

function wizardIsFoe(necromancer: NecromancerState, wizardId: WizardId): boolean {
  return necromancer.foes.some((foe) => foe.subject.kind === "wizard" && foe.subject.wizardId === wizardId);
}

function wizardHasTraversal(necromancer: NecromancerState, wizardId: WizardId): boolean {
  return necromancer.wizardTraversals.some((traversal) => traversal.wizardId === wizardId);
}

function traversalEqual(a: NecromancerWizardTraversalState, b: NecromancerWizardTraversalState): boolean {
  return (
    a.wizardId === b.wizardId &&
    a.kind === b.kind &&
    necromancerOccupiableSpaceRefsEqual(a.location, b.location)
  );
}

function requireWizardFoe(necromancer: NecromancerState, wizardId: WizardId, label: string): NecromancerWizardFoeState {
  const foe = necromancer.foes.find((candidate) => candidate.subject.kind === "wizard" && candidate.subject.wizardId === wizardId);
  if (foe === undefined || !isNecromancerWizardFoe(foe)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `${label} must identify an existing Wizard Foe`);
  }
  return foe;
}

function normalizeWizardFoeTruths(
  state: CampaignStateV5,
  truths: readonly PowerfulDenizenTruthEntry[],
  wizardId: WizardId,
): PowerfulDenizenTruthEntry[] {
  const existingIds = collectCampaignTruthIds(state, wizardId);
  const seen = new Set<string>();
  return truths.map((truth, index) => {
    if (!isValidPowerfulDenizenTruthId(truth.truthId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `Foe truths[${index}].truthId is invalid: ${JSON.stringify(truth.truthId)}`);
    }
    if (existingIds.has(truth.truthId) || seen.has(truth.truthId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `Duplicate powerful denizen truthId: ${truth.truthId}`);
    }
    seen.add(truth.truthId);
    if (truth.origin !== "source" && truth.origin !== "campaign") {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `Foe truths[${index}].origin is invalid: ${JSON.stringify(truth.origin)}`);
    }
    return {
      truthId: truth.truthId,
      text: normalizeRequiredText(truth.text, "Truth text"),
      origin: truth.origin,
    };
  });
}

function requireDenizen(state: CampaignStateV5, denizenId: DenizenId, label: string) {
  if (!isValidDenizenId(denizenId)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `${label}.denizenId is invalid: ${JSON.stringify(denizenId)}`);
  }
  const denizen = state.world.denizens.find((candidate) => candidate.denizenId === denizenId);
  if (denizen === undefined) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `${label}.denizenId does not resolve: ${denizenId}`);
  }
  return denizen;
}

function requireIndividualDenizen(state: CampaignStateV5, denizenId: DenizenId, label: string) {
  const denizen = requireDenizen(state, denizenId, label);
  if (denizen.representation !== "individual") {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `${label}.denizenId must reference an individual Denizen`);
  }
  return denizen;
}

function validateFoeLocation(necromancer: NecromancerState, location: NecromancerFoeLocation, label: string): void {
  if (location.kind === "escaped") {
    if (!isValidPactSeatId(location.seatId) || location.seatId === "necromancer") {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${label}.seatId must be a non-Necromancer Pact seat`);
    }
    if (!isValidNecromancerAbominationKind(location.abominationKind)) {
      throw new DomainError(
        "INVALID_CAMPAIGN_STATE",
        `${label}.abominationKind is invalid: ${JSON.stringify(location.abominationKind)}`,
      );
    }
    return;
  }
  assertOccupiableResolves(necromancer, location, label);
}

function pathRegionOf(necromancer: NecromancerState, pathSpaceId: NecromancerPathSpaceId): NecromancerPathRegion | undefined {
  if (isBuiltinEdgeOfLifePathSpaceId(pathSpaceId as string)) {
    return "edge_of_life";
  }
  const builtin = NECROMANCER_BUILTIN_PATH_SPACE_DEFINITIONS.find((def) => def.pathSpaceId === pathSpaceId);
  if (builtin !== undefined) {
    return builtin.region;
  }
  const campaign = necromancer.pathSpaces.find(
    (space): space is NecromancerCampaignPathSpaceState =>
      space.origin === "campaign" && space.pathSpaceId === pathSpaceId,
  );
  return campaign?.region;
}

function validateGhoulCallerLocation(
  necromancer: NecromancerState,
  location: NecromancerGhoulCallerState["location"],
  label: string,
): void {
  if (location.kind !== "path") {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `${label} must be an Edge-of-Life path space`);
  }
  assertOccupiableResolves(necromancer, location, label);
  const region = pathRegionOf(necromancer, location.pathSpaceId);
  if (region !== "edge_of_life") {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `${label} must be an Edge-of-Life path space`);
  }
}

function occupiableHasRoleOrSoul(
  foes: readonly NecromancerFoeState[],
  allies: readonly NecromancerAllyState[],
  souls: readonly NecromancerSoulCount[],
  gateId: NecromancerBuiltinGateId,
): boolean {
  const location: NecromancerOccupiableSpaceRef = { kind: "gate", gateId };
  if (soulCountAt(souls, location) > 0) {
    return true;
  }
  if (allies.some((ally) => necromancerOccupiableSpaceRefsEqual(ally.location, location))) {
    return true;
  }
  return foes.some((foe) => foe.location.kind !== "escaped" && necromancerOccupiableSpaceRefsEqual(foe.location, location));
}

function presentNonNecromancerEdgeSoulLocations(state: CampaignStateV5): NecromancerOccupiableSpaceRef[] {
  const locations: NecromancerOccupiableSpaceRef[] = [];
  for (const definition of NECROMANCER_BUILTIN_PATH_SPACE_DEFINITIONS) {
    if (definition.associatedSeatId === undefined || definition.associatedSeatId === "necromancer") {
      continue;
    }
    if (definition.region !== "edge_of_life") {
      continue;
    }
    const seat = state.pactSeats[definition.associatedSeatId];
    if (seat.status === "present") {
      locations.push({ kind: "path", pathSpaceId: definition.pathSpaceId });
    }
  }
  return locations;
}

function requireNearBuiltinGate(gateId: NecromancerBuiltinGateId, label: string): void {
  if (!isValidNecromancerBuiltinGateId(gateId)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `${label} is not a valid built-in Gate`);
  }
  if (necromancerBuiltinGateDefinition(gateId).band !== "near") {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `${label} must be a Near Gate`);
  }
}

function requireFarBuiltinGate(gateId: NecromancerBuiltinGateId, label: string): void {
  if (!isValidNecromancerBuiltinGateId(gateId)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `${label} is not a valid built-in Gate`);
  }
  if (necromancerBuiltinGateDefinition(gateId).band !== "far") {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `${label} must be a Far Gate`);
  }
}

function requireArrangement(arrangementId: NecromancerArrangementId) {
  const arrangement = necromancerArrangementDefinition(arrangementId);
  if (arrangement === undefined) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Unknown Necromancer arrangement: ${arrangementId}`);
  }
  return arrangement;
}

function validateArrangementFoeBindings(
  arrangementId: NecromancerArrangementId,
  foes: readonly NecromancerArrangementFoeBinding[],
): void {
  const arrangement = requireArrangement(arrangementId);
  if (foes.length !== arrangement.foeCount) {
    throw new DomainError(
      "INVALID_CAMPAIGN_STATE",
      `${arrangementId} arrangement requires exactly ${arrangement.foeCount} Foes`,
    );
  }
  for (const foe of foes) {
    if (!isValidNecromancerBuiltinGateId(foe.gateId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `Arrangement Foe gateId is invalid: ${JSON.stringify(foe.gateId)}`);
    }
  }
  uniqueOrThrow(foes.map((foe) => foe.gateId), "arrangement Foe starting gate");
  const remaining = new Set(foes.map((foe) => foe.gateId));
  for (const required of arrangement.requiredFoeGateIds) {
    if (!remaining.delete(required)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${arrangementId} arrangement requires a Foe at ${required}`);
    }
  }
  if (remaining.size !== arrangement.additionalFoeFarGateCount) {
    throw new DomainError(
      "INVALID_CAMPAIGN_STATE",
      `${arrangementId} arrangement requires exactly ${arrangement.additionalFoeFarGateCount} additional Far-Gate Foe(s)`,
    );
  }
  for (const gateId of remaining) {
    requireFarBuiltinGate(gateId, "Arrangement additional Foe gate");
  }
}

function initialDepth(state: CampaignStateV5): NecromancerDepthState | null {
  const wizardId = state.pactSeats.necromancer.wizardId;
  if (wizardId === null) {
    return null;
  }
  if (!isValidWizardId(wizardId) || !state.wizards.some((wizard) => wizard.wizardId === wizardId)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `necromancer.depth.wizardId does not resolve: ${wizardId}`);
  }
  return { wizardId, value: 0 };
}

function pathSpaceIsReferenced(necromancer: NecromancerState, pathSpaceId: NecromancerPathSpaceId): boolean {
  const location: NecromancerOccupiableSpaceRef = { kind: "path", pathSpaceId };
  if (soulCountAt(necromancer.souls, location) > 0) {
    return true;
  }
  if (necromancer.allies.some((ally) => necromancerOccupiableSpaceRefsEqual(ally.location, location))) {
    return true;
  }
  if (
    necromancer.foes.some(
      (foe) => foe.location.kind !== "escaped" && necromancerOccupiableSpaceRefsEqual(foe.location, location),
    )
  ) {
    return true;
  }
  if (necromancer.ghoulCallers.some((ghoul) => necromancerOccupiableSpaceRefsEqual(ghoul.location, location))) {
    return true;
  }
  if (necromancer.wizardTraversals.some((traversal) => necromancerOccupiableSpaceRefsEqual(traversal.location, location))) {
    return true;
  }
  return necromancer.steps.some(
    (step) =>
      (step.from.kind === "path" && step.from.pathSpaceId === pathSpaceId) ||
      (step.to.kind === "path" && step.to.pathSpaceId === pathSpaceId),
  );
}

function allowedGateStatusTransition(from: NecromancerGateStatus, to: NecromancerGateStatus): boolean {
  if (from === "destroyed") {
    return false;
  }
  if (to === "destroyed") {
    return from === "ordinary" || from === "hostile";
  }
  return (from === "ordinary" && to === "hostile") || (from === "hostile" && to === "ordinary");
}

export function applyInitializeNecromancer(
  state: CampaignStateV5,
  rawInput: InitializeNecromancerInput,
): NecromancerTransitionResult {
  const input = canonicalizeInitializeNecromancerInput(rawInput);
  if (!isExactEmptyNecromancer(state.necromancer)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "Necromancer is already initialized");
  }
  if (!isValidNecromancerArrangementId(input.arrangementId)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Unknown Necromancer arrangement: ${input.arrangementId}`);
  }
  const arrangement = requireArrangement(input.arrangementId);
  if (input.selectedLawIds.length !== 2) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "Base Codex initialization requires exactly two Laws of Death");
  }
  uniqueOrThrow(input.selectedLawIds, "selectedLawId");
  for (const lawId of input.selectedLawIds) {
    if (!isValidNecromancerLawOfDeathId(lawId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `Unknown Law of Death id: ${lawId}`);
    }
  }

  validateArrangementFoeBindings(input.arrangementId, input.arrangementFoes);
  requireNearBuiltinGate(input.arrangementAlly.gateId, "Arrangement Ally gate");

  if (arrangement.ghoulCaller === null) {
    if (input.arrangementGhoulCaller !== null) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${input.arrangementId} arrangement must not include a Ghoul-Caller`);
    }
  } else if (input.arrangementGhoulCaller === null) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `${input.arrangementId} arrangement requires a Ghoul-Caller`);
  } else if (!isBuiltinEdgeOfLifePathSpaceId(input.arrangementGhoulCaller.pathSpaceId)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "Arrangement Ghoul-Caller must occupy a built-in Edge-of-Life path space");
  }

  const pieceDenizenIds = [
    ...input.arrangementFoes.map((foe) => foe.denizenId),
    input.arrangementAlly.denizenId,
    ...(input.arrangementGhoulCaller === null ? [] : [input.arrangementGhoulCaller.denizenId]),
  ];
  uniqueOrThrow(pieceDenizenIds, "arrangement starting Denizen");

  const foes: NecromancerFoeState[] = input.arrangementFoes.map((binding, index) => {
    requireDenizenFoeProfile(state, binding.denizenId, `arrangementFoes[${index}]`);
    return {
      subject: { kind: "denizen", denizenId: binding.denizenId },
      location: { kind: "gate", gateId: binding.gateId },
    };
  });
  requireDenizen(state, input.arrangementAlly.denizenId, "arrangementAlly");
  const allies: NecromancerAllyState[] = [{
    denizenId: input.arrangementAlly.denizenId,
    location: { kind: "gate", gateId: input.arrangementAlly.gateId },
  }];

  const ghoulCallers: NecromancerGhoulCallerState[] = [];
  if (input.arrangementGhoulCaller !== null) {
    requireGhoulCallerRoleProfile(state, input.arrangementGhoulCaller.denizenId, "arrangementGhoulCaller", true);
    assertNonNegativeSafeInteger("ageYears", input.arrangementGhoulCaller.ageYears);
    ghoulCallers.push({
      denizenId: input.arrangementGhoulCaller.denizenId,
      location: { kind: "path", pathSpaceId: input.arrangementGhoulCaller.pathSpaceId },
      pettyDeadCount: 0,
      primaryElement: input.arrangementGhoulCaller.primaryElement,
      aesthetic: input.arrangementGhoulCaller.aesthetic,
      strangeQuirk: input.arrangementGhoulCaller.strangeQuirk,
      ageYears: input.arrangementGhoulCaller.ageYears,
    });
  }

  let souls: NecromancerSoulCount[] = [];
  if (input.arrangementId === "quiet") {
    souls = addSoulCounts(souls, NECROMANCER_QUIET_ARRANGEMENT_SOUL_LOCATIONS);
  }
  if (arrangement.soulPerPresentNonNecromancerEdge) {
    souls = addSoulCounts(souls, presentNonNecromancerEdgeSoulLocations(state));
  }
  if (arrangement.soulBeyondEachGateWithFurtherOccupiableSpace) {
    const beyond: NecromancerOccupiableSpaceRef[] = [];
    for (const gateId of NECROMANCER_BUILTIN_GATE_IDS) {
      const outgoing = necromancerDefaultInternalOutgoingTarget(gateId);
      if (outgoing !== undefined) {
        beyond.push(outgoing);
      }
    }
    souls = addSoulCounts(souls, beyond);
  }
  if (arrangement.soulInEachOtherwiseEmptyGate) {
    const emptyGates: NecromancerOccupiableSpaceRef[] = [];
    for (const gateId of NECROMANCER_BUILTIN_GATE_IDS) {
      if (!occupiableHasRoleOrSoul(foes, allies, souls, gateId)) {
        emptyGates.push({ kind: "gate", gateId });
      }
    }
    souls = addSoulCounts(souls, emptyGates);
  }

  const gateStatuses: Partial<Record<NecromancerBuiltinGateId, NecromancerGateStatus>> = {};
  for (const gateId of arrangement.hostileBuiltinGateIds) {
    gateStatuses[gateId] = "hostile";
  }

  const necromancer = buildInitializedDefaultNecromancerState({
    gateStatuses,
    souls,
    foes,
    allies,
    ghoulCallers,
    selectedLaws: input.selectedLawIds.map((lawId) => ({ lawId, visibility: "revealed" })),
    depth: initialDepth(state),
  });

  return commitNecromancer(state, necromancer, [{
    type: "necromancer_initialized",
    version: 1,
    data: {
      arrangementId: input.arrangementId,
      selectedLawIds: [...input.selectedLawIds],
      arrangementFoes: input.arrangementFoes.map((foe) => ({ ...foe })),
      arrangementAlly: { ...input.arrangementAlly },
      arrangementGhoulCaller: input.arrangementGhoulCaller === null ? null : { ...input.arrangementGhoulCaller },
      necromancer,
    },
  }]);
}

export function applySetNecromancerDepth(
  state: CampaignStateV5,
  expectedDepth: NecromancerDepthState | null,
  depth: NecromancerDepthState | null,
): NecromancerTransitionResult {
  const current = requireInitialized(state);
  if (!depthEqual(current.depth, expectedDepth)) {
    throw new DomainError(
      "STALE_COMMAND_PRECONDITION",
      "depth does not match the expected current state",
    );
  }
  if (depthEqual(current.depth, depth)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "Update produces no change");
  }

  const seatWizardId = state.pactSeats.necromancer.wizardId;
  if (depth !== null) {
    if (seatWizardId === null) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", "Necromancer Depth must be null when the Necromancer Pact seat has no Wizard");
    }
    if (depth.wizardId !== seatWizardId) {
      throw new DomainError(
        "INVALID_CAMPAIGN_STATE",
        "Necromancer Depth owner must equal the Wizard currently assigned to the Necromancer Pact seat",
      );
    }
    assertNonNegativeSafeInteger("depth.value", depth.value);
    if (!state.wizards.some((wizard) => wizard.wizardId === depth.wizardId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `necromancer.depth.wizardId does not resolve: ${depth.wizardId}`);
    }
    const currentOwner = current.depth?.wizardId ?? null;
    if (currentOwner !== depth.wizardId && depth.value !== 0) {
      throw new DomainError(
        "INVALID_CAMPAIGN_STATE",
        "Binding Necromancer Depth to the current Wizard must explicitly reset value to 0",
      );
    }
  }

  return commitNecromancer(state, { ...current, depth }, [{
    type: "necromancer_depth_changed",
    version: 1,
    data: { previousDepth: current.depth, newDepth: depth },
  }]);
}

export function applySetNecromancerSelectedLaws(
  state: CampaignStateV5,
  expectedSelectedLaws: readonly NecromancerSelectedLaw[],
  selectedLaws: readonly NecromancerSelectedLaw[],
): NecromancerTransitionResult {
  const current = requireInitialized(state);
  if (!selectedLawsEqual(current.selectedLaws, expectedSelectedLaws)) {
    throw new DomainError(
      "STALE_COMMAND_PRECONDITION",
      "selectedLaws does not match the expected current state",
    );
  }
  uniqueOrThrow(selectedLaws.map((law) => law.lawId), "selectedLawId");
  for (const law of selectedLaws) {
    if (!isValidNecromancerLawOfDeathId(law.lawId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `Unknown Law of Death id: ${law.lawId}`);
    }
    if (!isValidNecromancerLawVisibility(law.visibility)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `selectedLaws visibility is invalid: ${JSON.stringify(law.visibility)}`);
    }
  }
  const nextLaws = selectedLaws.map((law) => ({ lawId: law.lawId, visibility: law.visibility }));
  if (selectedLawsEqual(current.selectedLaws, nextLaws)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "Update produces no change");
  }
  return commitNecromancer(state, { ...current, selectedLaws: nextLaws }, [{
    type: "necromancer_laws_changed",
    version: 1,
    data: {
      previousSelectedLaws: [...current.selectedLaws],
      newSelectedLaws: nextLaws,
    },
  }]);
}

export function applySetNecromancerGateStatus(
  state: CampaignStateV5,
  gateId: NecromancerGateId,
  expectedStatus: NecromancerGateStatus,
  status: NecromancerGateStatus,
): NecromancerTransitionResult {
  const current = requireInitialized(state);
  const idx = current.gates.findIndex((gate) => gate.gateId === gateId);
  if (idx === -1) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Necromancer Gate not found: ${gateId}`);
  }
  const existing = current.gates[idx];
  if (existing.status !== expectedStatus) {
    throw new DomainError(
      "STALE_COMMAND_PRECONDITION",
      `status: expected "${expectedStatus}" but current is "${existing.status}"`,
    );
  }
  if (!isValidNecromancerGateStatus(status)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Gate status is invalid: ${JSON.stringify(status)}`);
  }
  if (existing.status === status) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "Update produces no change");
  }
  if (!allowedGateStatusTransition(existing.status, status)) {
    throw new DomainError(
      "INVALID_CAMPAIGN_STATE",
      `Gate status cannot change from ${existing.status} to ${status}`,
    );
  }
  const updated = { ...existing, status };
  const gates = current.gates.map((gate, i) => (i === idx ? updated : gate));
  return commitNecromancer(state, { ...current, gates }, [{
    type: "necromancer_gate_status_changed",
    version: 1,
    data: { gateId, previousStatus: existing.status, newStatus: status },
  }]);
}

export function applySetNecromancerSoulCount(
  state: CampaignStateV5,
  location: NecromancerOccupiableSpaceRef,
  expectedCount: number,
  count: number,
): NecromancerTransitionResult {
  const current = requireInitialized(state);
  assertOccupiableResolves(current, location, "Soul location");
  assertNonNegativeSafeInteger("expected Soul count", expectedCount);
  assertNonNegativeSafeInteger("Soul count", count);
  const previousCount = soulCountAt(current.souls, location);
  if (previousCount !== expectedCount) {
    throw new DomainError(
      "STALE_COMMAND_PRECONDITION",
      `Soul count: expected "${expectedCount}" but current is "${previousCount}"`,
    );
  }
  if (previousCount === count) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "Update produces no change");
  }
  return commitNecromancer(state, { ...current, souls: setSoulCount(current.souls, location, count) }, [{
    type: "necromancer_soul_count_changed",
    version: 1,
    data: { location, previousCount, newCount: count },
  }]);
}

export function applyMoveNecromancerSouls(
  state: CampaignStateV5,
  from: NecromancerOccupiableSpaceRef,
  to: NecromancerOccupiableSpaceRef,
  amount: number,
  expectedFromCount: number,
  expectedToCount: number,
): NecromancerTransitionResult {
  const current = requireInitialized(state);
  assertOccupiableResolves(current, from, "Soul move source");
  assertOccupiableResolves(current, to, "Soul move destination");
  if (necromancerOccupiableSpaceRefsEqual(from, to)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "Soul move source and destination must differ");
  }
  assertPositiveSafeInteger("Soul move amount", amount);
  assertNonNegativeSafeInteger("expected source Soul count", expectedFromCount);
  assertNonNegativeSafeInteger("expected destination Soul count", expectedToCount);
  const previousFromCount = soulCountAt(current.souls, from);
  const previousToCount = soulCountAt(current.souls, to);
  if (previousFromCount !== expectedFromCount) {
    throw new DomainError(
      "STALE_COMMAND_PRECONDITION",
      `source Soul count: expected "${expectedFromCount}" but current is "${previousFromCount}"`,
    );
  }
  if (previousToCount !== expectedToCount) {
    throw new DomainError(
      "STALE_COMMAND_PRECONDITION",
      `destination Soul count: expected "${expectedToCount}" but current is "${previousToCount}"`,
    );
  }
  if (previousFromCount < amount) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "Soul move source does not contain the requested amount");
  }
  const newFromCount = previousFromCount - amount;
  const newToCount = previousToCount + amount;
  const souls = setSoulCount(setSoulCount(current.souls, from, newFromCount), to, newToCount);
  return commitNecromancer(state, { ...current, souls }, [{
    type: "necromancer_souls_moved",
    version: 1,
    data: {
      from,
      to,
      amount,
      previousFromCount,
      newFromCount,
      previousToCount,
      newToCount,
    },
  }]);
}

export function applyAddNecromancerFoe(
  state: CampaignStateV5,
  foe: NecromancerFoeState,
): NecromancerTransitionResult {
  const current = requireInitialized(state);
  if (findFoeIndex(current, foe.subject) !== -1) {
    throw new DomainError(
      "INVALID_CAMPAIGN_STATE",
      `Duplicate necromancer foe subject: ${necromancerFoeSubjectKey(foe.subject)}`,
    );
  }
  validateFoeLocation(current, foe.location, "Foe location");
  let added: NecromancerFoeState;
    if (isNecromancerDenizenFoe(foe)) {
    requireDenizenFoeProfile(state, foe.subject.denizenId, "Foe");
    added = { subject: { kind: "denizen", denizenId: foe.subject.denizenId }, location: foe.location };
  } else {
    requireWizard(state, foe.subject.wizardId, "Foe");
    if (wizardHasTraversal(current, foe.subject.wizardId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", "Wizard cannot appear in wizardTraversals and as a Wizard Foe");
    }
    added = {
      subject: { kind: "wizard", wizardId: foe.subject.wizardId },
      location: foe.location,
      truths: normalizeWizardFoeTruths(state, foe.truths, foe.subject.wizardId),
    };
  }
  return commitNecromancer(state, { ...current, foes: [...current.foes, added] }, [{
    type: "necromancer_foe_added",
    version: 1,
    data: { foe: added },
  }]);
}

export function applyUpdateNecromancerFoe(
  state: CampaignStateV5,
  subject: NecromancerFoeSubjectRef,
  fields: UpdateNecromancerFoeFields,
): NecromancerTransitionResult {
  const current = requireInitialized(state);
  if (fields.location === undefined) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "Update must specify at least one field");
  }
  const idx = findFoeIndex(current, subject);
  if (idx === -1) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Necromancer Foe not found: ${necromancerFoeSubjectKey(subject)}`);
  }
  const existing = current.foes[idx];
  checkPrecondition("location", existing.location, fields.location, foeLocationsEqual);
  validateFoeLocation(current, fields.location.value, "Foe location");
  if (
    isNecromancerWizardFoe(existing) &&
    existing.location.kind !== "escaped" &&
    fields.location.value.kind === "escaped"
  ) {
    throw new DomainError(
      "INVALID_CAMPAIGN_STATE",
      "Wizard Foe escape must use escape_necromancer_wizard_foe",
    );
  }
  const updated: NecromancerFoeState = isNecromancerWizardFoe(existing)
    ? { subject: existing.subject, location: fields.location.value, truths: existing.truths }
    : { subject: existing.subject, location: fields.location.value };
  if (foeEqual(existing, updated)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "Update produces no change");
  }
  const foes = current.foes.map((foe, i) => (i === idx ? updated : foe));
  return commitNecromancer(state, { ...current, foes }, [{
    type: "necromancer_foe_updated",
    version: 1,
    data: { previous: existing, updated },
  }]);
}

export function applyRemoveNecromancerFoe(
  state: CampaignStateV5,
  subject: NecromancerFoeSubjectRef,
  expectedFoe: NecromancerFoeState,
): NecromancerTransitionResult {
  const current = requireInitialized(state);
  const existing = current.foes.find((foe) => necromancerFoeSubjectsEqual(foe.subject, subject));
  if (existing === undefined) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Necromancer Foe not found: ${necromancerFoeSubjectKey(subject)}`);
  }
  if (!foeEqual(existing, expectedFoe)) {
    throw new DomainError(
      "STALE_COMMAND_PRECONDITION",
      `Necromancer Foe ${necromancerFoeSubjectKey(subject)} does not match the expected current state`,
    );
  }
  return commitNecromancer(
    state,
    { ...current, foes: current.foes.filter((foe) => !necromancerFoeSubjectsEqual(foe.subject, subject)) },
    [{ type: "necromancer_foe_removed", version: 1, data: { foe: existing } }],
  );
}

export function applyEscapeNecromancerWizardFoe(
  state: CampaignStateV5,
  wizardId: WizardId,
  expectedMortalityState: "deceased",
  expectedFoe: NecromancerWizardFoeState,
  destinationSeatId: PactSeatId,
): NecromancerTransitionResult {
  const current = requireInitialized(state);
  const wizard = requireWizard(state, wizardId, "Escape");
  if (wizard.mortalityState !== expectedMortalityState) {
    throw new DomainError(
      "STALE_COMMAND_PRECONDITION",
      `Wizard ${wizardId} mortalityState does not match the expected current state`,
    );
  }
  if (wizard.mortalityState !== "deceased") {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "escape_necromancer_wizard_foe requires a deceased Wizard");
  }
  const existing = requireWizardFoe(current, wizardId, "Escape");
  if (!foeEqual(existing, expectedFoe)) {
    throw new DomainError(
      "STALE_COMMAND_PRECONDITION",
      `Necromancer Foe wizard:${wizardId} does not match the expected current state`,
    );
  }
  if (existing.location.kind === "escaped") {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "Wizard Foe is already escaped");
  }
  const escapedLocation: NecromancerFoeLocation = {
    kind: "escaped",
    seatId: destinationSeatId,
    abominationKind: "occult",
  };
  validateFoeLocation(current, escapedLocation, "Escape destination");
  const updated: NecromancerWizardFoeState = {
    subject: existing.subject,
    location: escapedLocation,
    truths: existing.truths,
  };
  const withMortality: CampaignStateV5 = {
    ...state,
    wizards: state.wizards.map((candidate) =>
      candidate.wizardId === wizardId ? { ...candidate, mortalityState: "not_deceased" } : candidate,
    ),
  };
  return commitNecromancer(withMortality, {
    ...current,
    foes: current.foes.map((foe) => (isNecromancerWizardFoe(foe) && foe.subject.wizardId === wizardId ? updated : foe)),
  }, [{
    type: "necromancer_wizard_foe_escaped",
    version: 1,
    data: {
      wizardId,
      previousMortalityState: wizard.mortalityState,
      newMortalityState: "not_deceased",
      previous: existing,
      updated,
    },
  }]);
}

export function applyAddNecromancerWizardFoeTruth(
  state: CampaignStateV5,
  input: AddNecromancerWizardFoeTruthInput,
): NecromancerTransitionResult {
  const current = requireInitialized(state);
  requireWizard(state, input.wizardId, "Wizard Foe Truth");
  const existing = requireWizardFoe(current, input.wizardId, "Wizard Foe Truth");
  if (!isValidPowerfulDenizenTruthId(input.truthId)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Invalid truthId: ${input.truthId}`);
  }
  const existingIds = collectCampaignTruthIds(state);
  if (existingIds.has(input.truthId) || existing.truths.some((truth) => truth.truthId === input.truthId)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Duplicate powerful denizen truthId: ${input.truthId}`);
  }
  const truth: PowerfulDenizenTruthEntry = {
    truthId: input.truthId,
    text: normalizeRequiredText(input.text, "Truth text"),
    origin: "campaign",
  };
  const updated: NecromancerWizardFoeState = { ...existing, truths: [...existing.truths, truth] };
  return commitNecromancer(state, {
    ...current,
    foes: current.foes.map((foe) => (isNecromancerWizardFoe(foe) && foe.subject.wizardId === input.wizardId ? updated : foe)),
  }, [{
    type: "necromancer_wizard_foe_truth_added",
    version: 1,
    data: { wizardId: input.wizardId, truth },
  }]);
}

export function applyUpdateNecromancerWizardFoeTruth(
  state: CampaignStateV5,
  wizardId: WizardId,
  truthId: PowerfulDenizenTruthId,
  change: ExpectedFieldChange<string>,
): NecromancerTransitionResult {
  const current = requireInitialized(state);
  requireWizard(state, wizardId, "Wizard Foe Truth");
  const existingFoe = requireWizardFoe(current, wizardId, "Wizard Foe Truth");
  const truthIndex = existingFoe.truths.findIndex((truth) => truth.truthId === truthId);
  if (truthIndex === -1) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Wizard Foe truth not found: ${truthId}`);
  }
  const existing = existingFoe.truths[truthIndex];
  checkPrecondition("text", existing.text, change);
  const text = normalizeRequiredText(change.value, "Truth text");
  if (text === existing.text) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "Update produces no change");
  }
  const updatedTruth: PowerfulDenizenTruthEntry = {
    truthId: existing.truthId,
    text,
    origin: existing.origin,
  };
  const updated: NecromancerWizardFoeState = {
    ...existingFoe,
    truths: existingFoe.truths.map((truth, i) => (i === truthIndex ? updatedTruth : truth)),
  };
  return commitNecromancer(state, {
    ...current,
    foes: current.foes.map((foe) => (isNecromancerWizardFoe(foe) && foe.subject.wizardId === wizardId ? updated : foe)),
  }, [{
    type: "necromancer_wizard_foe_truth_updated",
    version: 1,
    data: { wizardId, previous: existing, updated: updatedTruth },
  }]);
}

export function applyRemoveNecromancerWizardFoeTruth(
  state: CampaignStateV5,
  wizardId: WizardId,
  truthId: PowerfulDenizenTruthId,
  expectedTruth: PowerfulDenizenTruthEntry,
): NecromancerTransitionResult {
  const current = requireInitialized(state);
  requireWizard(state, wizardId, "Wizard Foe Truth");
  const existingFoe = requireWizardFoe(current, wizardId, "Wizard Foe Truth");
  const existing = existingFoe.truths.find((truth) => truth.truthId === truthId);
  if (existing === undefined) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Wizard Foe truth not found: ${truthId}`);
  }
  if (canonicalJsonStringify(existing) !== canonicalJsonStringify(expectedTruth)) {
    throw new DomainError(
      "STALE_COMMAND_PRECONDITION",
      `Wizard Foe truth ${truthId} does not match the expected current state`,
    );
  }
  const updated: NecromancerWizardFoeState = {
    ...existingFoe,
    truths: existingFoe.truths.filter((truth) => truth.truthId !== truthId),
  };
  return commitNecromancer(state, {
    ...current,
    foes: current.foes.map((foe) => (isNecromancerWizardFoe(foe) && foe.subject.wizardId === wizardId ? updated : foe)),
  }, [{
    type: "necromancer_wizard_foe_truth_removed",
    version: 1,
    data: { wizardId, truth: existing },
  }]);
}

export function applyAddNecromancerWizardTraversal(
  state: CampaignStateV5,
  traversal: NecromancerWizardTraversalState,
): NecromancerTransitionResult {
  const current = requireInitialized(state);
  requireWizard(state, traversal.wizardId, "Wizard traversal");
  if (wizardHasTraversal(current, traversal.wizardId)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Duplicate wizard traversal: ${traversal.wizardId}`);
  }
  if (wizardIsFoe(current, traversal.wizardId)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "Wizard cannot appear in wizardTraversals and as a Wizard Foe");
  }
  if (!isValidNecromancerWizardTraversalKind(traversal.kind)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Wizard traversal kind is invalid: ${JSON.stringify(traversal.kind)}`);
  }
  assertOccupiableResolves(current, traversal.location, "Wizard traversal location");
  const added: NecromancerWizardTraversalState = {
    wizardId: traversal.wizardId,
    kind: traversal.kind,
    location: traversal.location,
  };
  return commitNecromancer(state, { ...current, wizardTraversals: [...current.wizardTraversals, added] }, [{
    type: "necromancer_wizard_traversal_added",
    version: 1,
    data: { traversal: added },
  }]);
}

export function applyUpdateNecromancerWizardTraversal(
  state: CampaignStateV5,
  wizardId: WizardId,
  fields: UpdateNecromancerWizardTraversalFields,
): NecromancerTransitionResult {
  const current = requireInitialized(state);
  if (fields.kind === undefined && fields.location === undefined) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "Update must specify at least one field");
  }
  const idx = current.wizardTraversals.findIndex((traversal) => traversal.wizardId === wizardId);
  if (idx === -1) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Wizard traversal not found: ${wizardId}`);
  }
  const existing = current.wizardTraversals[idx];
  let kind = existing.kind;
  let location = existing.location;
  if (fields.kind !== undefined) {
    checkPrecondition("kind", existing.kind, fields.kind);
    if (!isValidNecromancerWizardTraversalKind(fields.kind.value)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `Wizard traversal kind is invalid: ${JSON.stringify(fields.kind.value)}`);
    }
    kind = fields.kind.value;
  }
  if (fields.location !== undefined) {
    checkPrecondition("location", existing.location, fields.location, necromancerOccupiableSpaceRefsEqual);
    assertOccupiableResolves(current, fields.location.value, "Wizard traversal location");
    location = fields.location.value;
  }
  const updated: NecromancerWizardTraversalState = { wizardId, kind, location };
  if (traversalEqual(existing, updated)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "Update produces no change");
  }
  return commitNecromancer(state, {
    ...current,
    wizardTraversals: current.wizardTraversals.map((traversal, i) => (i === idx ? updated : traversal)),
  }, [{
    type: "necromancer_wizard_traversal_updated",
    version: 1,
    data: { previous: existing, updated },
  }]);
}

export function applyRemoveNecromancerWizardTraversal(
  state: CampaignStateV5,
  wizardId: WizardId,
  expectedTraversal: NecromancerWizardTraversalState,
): NecromancerTransitionResult {
  const current = requireInitialized(state);
  const existing = current.wizardTraversals.find((traversal) => traversal.wizardId === wizardId);
  if (existing === undefined) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Wizard traversal not found: ${wizardId}`);
  }
  if (!traversalEqual(existing, expectedTraversal)) {
    throw new DomainError(
      "STALE_COMMAND_PRECONDITION",
      `Wizard traversal ${wizardId} does not match the expected current state`,
    );
  }
  return commitNecromancer(
    state,
    { ...current, wizardTraversals: current.wizardTraversals.filter((traversal) => traversal.wizardId !== wizardId) },
    [{ type: "necromancer_wizard_traversal_removed", version: 1, data: { traversal: existing } }],
  );
}

export function applyAddNecromancerAlly(
  state: CampaignStateV5,
  ally: NecromancerAllyState,
): NecromancerTransitionResult {
  const current = requireInitialized(state);
  requireDenizen(state, ally.denizenId, "Ally");
  if (current.allies.some((existing) => existing.denizenId === ally.denizenId)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Duplicate necromancer ally denizenId: ${ally.denizenId}`);
  }
  assertOccupiableResolves(current, ally.location, "Ally location");
  const added: NecromancerAllyState = { denizenId: ally.denizenId, location: ally.location };
  return commitNecromancer(state, { ...current, allies: [...current.allies, added] }, [{
    type: "necromancer_ally_added",
    version: 1,
    data: { ally: added },
  }]);
}

export function applyUpdateNecromancerAlly(
  state: CampaignStateV5,
  denizenId: DenizenId,
  fields: UpdateNecromancerAllyFields,
): NecromancerTransitionResult {
  const current = requireInitialized(state);
  if (fields.location === undefined) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "Update must specify at least one field");
  }
  const idx = current.allies.findIndex((ally) => ally.denizenId === denizenId);
  if (idx === -1) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Necromancer Ally not found: ${denizenId}`);
  }
  const existing = current.allies[idx];
  checkPrecondition("location", existing.location, fields.location, necromancerOccupiableSpaceRefsEqual);
  assertOccupiableResolves(current, fields.location.value, "Ally location");
  const updated: NecromancerAllyState = { denizenId, location: fields.location.value };
  if (allyEqual(existing, updated)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "Update produces no change");
  }
  const allies = current.allies.map((ally, i) => (i === idx ? updated : ally));
  return commitNecromancer(state, { ...current, allies }, [{
    type: "necromancer_ally_updated",
    version: 1,
    data: { previous: existing, updated },
  }]);
}

export function applyRemoveNecromancerAlly(
  state: CampaignStateV5,
  denizenId: DenizenId,
  expectedAlly: NecromancerAllyState,
): NecromancerTransitionResult {
  const current = requireInitialized(state);
  const existing = current.allies.find((ally) => ally.denizenId === denizenId);
  if (existing === undefined) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Necromancer Ally not found: ${denizenId}`);
  }
  if (!allyEqual(existing, expectedAlly)) {
    throw new DomainError(
      "STALE_COMMAND_PRECONDITION",
      `Necromancer Ally ${denizenId} does not match the expected current state`,
    );
  }
  return commitNecromancer(state, { ...current, allies: current.allies.filter((ally) => ally.denizenId !== denizenId) }, [{
    type: "necromancer_ally_removed",
    version: 1,
    data: { ally: existing },
  }]);
}

export function applyAddNecromancerGhoulCaller(
  state: CampaignStateV5,
  rawGhoulCaller: NecromancerGhoulCallerState,
): NecromancerTransitionResult {
  const current = requireInitialized(state);
  const ghoulCaller = canonicalizeNecromancerGhoulCaller(rawGhoulCaller);
  requireGhoulCallerRoleProfile(state, ghoulCaller.denizenId, "Ghoul-Caller");
  if (current.ghoulCallers.some((existing) => existing.denizenId === ghoulCaller.denizenId)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Duplicate necromancer ghoul-caller denizenId: ${ghoulCaller.denizenId}`);
  }
  assertNonNegativeSafeInteger("pettyDeadCount", ghoulCaller.pettyDeadCount);
  assertNonNegativeSafeInteger("ageYears", ghoulCaller.ageYears);
  validateGhoulCallerLocation(current, ghoulCaller.location, "Ghoul-Caller location");
  const added: NecromancerGhoulCallerState = {
    denizenId: ghoulCaller.denizenId,
    location: ghoulCaller.location,
    pettyDeadCount: ghoulCaller.pettyDeadCount,
    primaryElement: ghoulCaller.primaryElement,
    aesthetic: ghoulCaller.aesthetic,
    strangeQuirk: ghoulCaller.strangeQuirk,
    ageYears: ghoulCaller.ageYears,
  };
  return commitNecromancer(state, { ...current, ghoulCallers: [...current.ghoulCallers, added] }, [{
    type: "necromancer_ghoul_caller_added",
    version: 1,
    data: { ghoulCaller: added },
  }]);
}

export function applyUpdateNecromancerGhoulCaller(
  state: CampaignStateV5,
  denizenId: DenizenId,
  rawFields: UpdateNecromancerGhoulCallerFields,
): NecromancerTransitionResult {
  const current = requireInitialized(state);
  const fields = canonicalizeUpdateNecromancerGhoulCallerFields(rawFields);
  if (
    fields.location === undefined &&
    fields.pettyDeadCount === undefined &&
    fields.primaryElement === undefined &&
    fields.aesthetic === undefined &&
    fields.strangeQuirk === undefined &&
    fields.ageYears === undefined
  ) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "Update must specify at least one field");
  }
  const idx = current.ghoulCallers.findIndex((ghoul) => ghoul.denizenId === denizenId);
  if (idx === -1) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Necromancer Ghoul-Caller not found: ${denizenId}`);
  }
  const existing = current.ghoulCallers[idx];
  let location = existing.location;
  let pettyDeadCount = existing.pettyDeadCount;
  let primaryElement = existing.primaryElement;
  let aesthetic = existing.aesthetic;
  let strangeQuirk = existing.strangeQuirk;
  let ageYears = existing.ageYears;
  if (fields.location !== undefined) {
    checkPrecondition("location", existing.location, fields.location, necromancerOccupiableSpaceRefsEqual);
    validateGhoulCallerLocation(current, fields.location.value, "Ghoul-Caller location");
    location = fields.location.value;
  }
  if (fields.pettyDeadCount !== undefined) {
    checkPrecondition("pettyDeadCount", existing.pettyDeadCount, fields.pettyDeadCount);
    assertNonNegativeSafeInteger("pettyDeadCount", fields.pettyDeadCount.value);
    pettyDeadCount = fields.pettyDeadCount.value;
  }
  if (fields.primaryElement !== undefined) {
    checkPrecondition("primaryElement", existing.primaryElement, fields.primaryElement);
    primaryElement = requirePrimaryElement(fields.primaryElement.value, "Primary Element");
  }
  if (fields.aesthetic !== undefined) {
    checkPrecondition("aesthetic", existing.aesthetic, fields.aesthetic);
    aesthetic = fields.aesthetic.value;
  }
  if (fields.strangeQuirk !== undefined) {
    checkPrecondition("strangeQuirk", existing.strangeQuirk, fields.strangeQuirk);
    strangeQuirk = fields.strangeQuirk.value;
  }
  if (fields.ageYears !== undefined) {
    checkPrecondition("ageYears", existing.ageYears, fields.ageYears);
    assertNonNegativeSafeInteger("ageYears", fields.ageYears.value);
    ageYears = fields.ageYears.value;
  }
  const updated: NecromancerGhoulCallerState = {
    denizenId,
    location,
    pettyDeadCount,
    primaryElement,
    aesthetic,
    strangeQuirk,
    ageYears,
  };
  if (ghoulCallerEqual(existing, updated)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "Update produces no change");
  }
  const ghoulCallers = current.ghoulCallers.map((ghoul, i) => (i === idx ? updated : ghoul));
  return commitNecromancer(state, { ...current, ghoulCallers }, [{
    type: "necromancer_ghoul_caller_updated",
    version: 1,
    data: { previous: existing, updated },
  }]);
}

export function applyRemoveNecromancerGhoulCaller(
  state: CampaignStateV5,
  denizenId: DenizenId,
  expectedGhoulCaller: NecromancerGhoulCallerState,
): NecromancerTransitionResult {
  const current = requireInitialized(state);
  const existing = current.ghoulCallers.find((ghoul) => ghoul.denizenId === denizenId);
  if (existing === undefined) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Necromancer Ghoul-Caller not found: ${denizenId}`);
  }
  if (!ghoulCallerEqual(existing, expectedGhoulCaller)) {
    throw new DomainError(
      "STALE_COMMAND_PRECONDITION",
      `Necromancer Ghoul-Caller ${denizenId} does not match the expected current state`,
    );
  }
  return commitNecromancer(
    state,
    { ...current, ghoulCallers: current.ghoulCallers.filter((ghoul) => ghoul.denizenId !== denizenId) },
    [{ type: "necromancer_ghoul_caller_removed", version: 1, data: { ghoulCaller: existing } }],
  );
}

export function applyCreateNecromancerCampaignGate(
  state: CampaignStateV5,
  input: CreateNecromancerCampaignGateInput,
): NecromancerTransitionResult {
  const current = requireInitialized(state);
  if (!isValidNecromancerCampaignGateId(input.gateId)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Invalid campaign Gate id: ${input.gateId}`);
  }
  if (current.gates.some((gate) => gate.gateId === input.gateId)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Duplicate Necromancer Gate id: ${input.gateId}`);
  }
  if (!isValidNecromancerGateBand(input.band)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Gate band is invalid: ${JSON.stringify(input.band)}`);
  }
  const created: NecromancerCampaignGateState = {
    origin: "campaign",
    gateId: input.gateId,
    name: normalizeName(input.name),
    band: input.band,
    status: "ordinary",
  };
  return commitNecromancer(state, { ...current, gates: [...current.gates, created] }, [{
    type: "necromancer_campaign_gate_created",
    version: 1,
    data: { gate: created },
  }]);
}

export function applyUpdateNecromancerCampaignGate(
  state: CampaignStateV5,
  gateId: NecromancerCampaignGateId,
  fields: UpdateNecromancerCampaignGateFields,
): NecromancerTransitionResult {
  const current = requireInitialized(state);
  if (fields.name === undefined && fields.band === undefined) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "Update must specify at least one field");
  }
  const idx = current.gates.findIndex((gate) => gate.gateId === gateId);
  if (idx === -1) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Necromancer Gate not found: ${gateId}`);
  }
  const existing = current.gates[idx];
  if (existing.origin !== "campaign") {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "Built-in Gates cannot update name or band");
  }
  let name = existing.name;
  let band = existing.band;
  if (fields.name !== undefined) {
    checkPrecondition("name", existing.name, fields.name);
    name = normalizeName(fields.name.value);
  }
  if (fields.band !== undefined) {
    checkPrecondition("band", existing.band, fields.band);
    if (!isValidNecromancerGateBand(fields.band.value)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `Gate band is invalid: ${JSON.stringify(fields.band.value)}`);
    }
    band = fields.band.value;
  }
  if (name === existing.name && band === existing.band) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "Update produces no change");
  }
  const updated: NecromancerCampaignGateState = {
    origin: "campaign",
    gateId: existing.gateId,
    name,
    band,
    status: existing.status,
  };
  const gates = current.gates.map((gate, i) => (i === idx ? updated : gate));
  return commitNecromancer(state, { ...current, gates }, [{
    type: "necromancer_campaign_gate_updated",
    version: 1,
    data: { previous: existing, updated },
  }]);
}

export function applyCreateNecromancerCampaignPathSpace(
  state: CampaignStateV5,
  input: CreateNecromancerCampaignPathSpaceInput,
): NecromancerTransitionResult {
  const current = requireInitialized(state);
  if (!isValidNecromancerCampaignPathSpaceId(input.pathSpaceId)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Invalid campaign path-space id: ${input.pathSpaceId}`);
  }
  if (current.pathSpaces.some((space) => space.pathSpaceId === input.pathSpaceId)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Duplicate Necromancer path-space id: ${input.pathSpaceId}`);
  }
  if (!isValidNecromancerPathRegion(input.region)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Path-space region is invalid: ${JSON.stringify(input.region)}`);
  }
  const created: NecromancerCampaignPathSpaceState = {
    origin: "campaign",
    pathSpaceId: input.pathSpaceId,
    region: input.region,
  };
  return commitNecromancer(state, { ...current, pathSpaces: [...current.pathSpaces, created] }, [{
    type: "necromancer_campaign_path_space_created",
    version: 1,
    data: { pathSpace: created },
  }]);
}

export function applyRemoveNecromancerCampaignPathSpace(
  state: CampaignStateV5,
  pathSpaceId: NecromancerCampaignPathSpaceId,
  expectedPathSpace: NecromancerCampaignPathSpaceState,
): NecromancerTransitionResult {
  const current = requireInitialized(state);
  const existing = current.pathSpaces.find((space) => space.pathSpaceId === pathSpaceId);
  if (existing === undefined) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Necromancer path space not found: ${pathSpaceId}`);
  }
  if (existing.origin !== "campaign") {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "Built-in path spaces cannot be removed");
  }
  if (!campaignPathSpaceEqual(existing, expectedPathSpace)) {
    throw new DomainError(
      "STALE_COMMAND_PRECONDITION",
      `Necromancer path space ${pathSpaceId} does not match the expected current state`,
    );
  }
  if (pathSpaceIsReferenced(current, pathSpaceId)) {
    throw new DomainError(
      "INVALID_CAMPAIGN_STATE",
      `Necromancer path space ${pathSpaceId} is still referenced and cannot be removed`,
    );
  }
  return commitNecromancer(
    state,
    { ...current, pathSpaces: current.pathSpaces.filter((space) => space.pathSpaceId !== pathSpaceId) },
    [{ type: "necromancer_campaign_path_space_removed", version: 1, data: { pathSpace: existing } }],
  );
}

export function applyAddNecromancerStep(
  state: CampaignStateV5,
  step: NecromancerDirectedStep,
): NecromancerTransitionResult {
  const current = requireInitialized(state);
  assertOccupiableResolves(current, step.from, "step.from");
  assertOccupiableResolves(current, step.to, "step.to");
  if (necromancerOccupiableSpaceRefsEqual(step.from, step.to)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "Directed Necromancer step must not be a self-loop");
  }
  if (current.steps.some((existing) => necromancerDirectedStepsEqual(existing, step))) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Duplicate directed Necromancer step: ${necromancerDirectedStepKey(step)}`);
  }
  const added: NecromancerDirectedStep = { from: step.from, to: step.to };
  return commitNecromancer(state, { ...current, steps: [...current.steps, added] }, [{
    type: "necromancer_step_added",
    version: 1,
    data: { step: added },
  }]);
}

export function applyRemoveNecromancerStep(
  state: CampaignStateV5,
  expectedStep: NecromancerDirectedStep,
): NecromancerTransitionResult {
  const current = requireInitialized(state);
  const existing = current.steps.find((step) => necromancerDirectedStepsEqual(step, expectedStep));
  if (existing === undefined) {
    throw new DomainError(
      "INVALID_CAMPAIGN_STATE",
      `Directed Necromancer step not found: ${necromancerDirectedStepKey(expectedStep)}`,
    );
  }
  return commitNecromancer(
    state,
    { ...current, steps: current.steps.filter((step) => !necromancerDirectedStepsEqual(step, expectedStep)) },
    [{ type: "necromancer_step_removed", version: 1, data: { step: existing } }],
  );
}
