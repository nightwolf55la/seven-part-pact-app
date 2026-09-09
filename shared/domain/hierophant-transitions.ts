import type { CampaignStateV5 } from "./campaign-state";
import type { DenizenId, PlaceId } from "./ids";
import { isValidDenizenId, isValidPlaceId } from "./ids";
import { DomainError } from "./errors";
import type { PactSeatId } from "./pact-seats";
import { isValidPactSeatId } from "./pact-seats";
import {
  HIEROPHANT_STARTING_TEMPLE_DEFINITIONS,
  HIEROPHANT_STARTING_TEMPLE_IDS,
  isValidHierophantBuiltinBlasphemyId,
  isValidHierophantBuiltinClassId,
  isValidHierophantBuiltinDoctrineId,
  isValidHierophantBuiltinDogmaId,
  isValidHierophantCampaignBlasphemyId,
  isValidHierophantCampaignClassId,
  isValidHierophantCampaignDoctrineId,
  isValidHierophantCampaignTempleId,
  isValidHierophantDogmaCategory,
  isValidHierophantDogmaEntryId,
  isValidHierophantFlameLawId,
  isValidHierophantStartingTempleId,
  isValidHierophantTempleId,
  type HierophantDogmaCategory,
  type HierophantFlameLawId,
  type HierophantStartingTempleId,
  type HierophantTempleId,
} from "./hierophant-catalogs";
import type {
  HierophantBlasphemyId,
  HierophantCampaignClass,
  HierophantCampaignClassId,
  HierophantCampaignDoctrine,
  HierophantCampaignDoctrineId,
  HierophantClassId,
  HierophantCult,
  HierophantCultDogma,
  HierophantDogmaEntryId,
  HierophantProphet,
  HierophantProphetDisposition,
  HierophantProphetHost,
  HierophantState,
  HierophantSupplicant,
  HierophantSupplicantHost,
  HierophantTemple,
  HierophantTempleStatus,
  OrdinaryHierophantTemple,
  HestarHierophantTemple,
  OrdinaryTempleDoctrineState,
} from "./hierophant-state";
import type { HierophantEvent } from "./events";
import type { ExpectedFieldChange } from "./world-subject-transitions";

export interface HierophantTransitionResult {
  readonly nextState: CampaignStateV5;
  readonly events: readonly HierophantEvent[];
}

export interface TemplePlaceBinding {
  readonly templeId: HierophantStartingTempleId;
  readonly placeId: PlaceId;
}

export interface InitializeHierophantInput {
  readonly selectedFlameLawIds: readonly HierophantFlameLawId[];
  readonly templePlaces: readonly TemplePlaceBinding[];
}

export interface AdjustTempleResourcesFields {
  readonly abundance?: ExpectedFieldChange<number>;
  readonly conviction?: ExpectedFieldChange<number>;
}

const MAX_NAME_LENGTH = 200;
const MAX_TEXT_LENGTH = 8000;

function replaceHierophant(state: CampaignStateV5, hierophant: HierophantState): CampaignStateV5 {
  return { ...state, hierophant };
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

function uniqueOrThrow(ids: readonly string[], label: string): void {
  const seen = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `Duplicate ${label}: ${id}`);
    }
    seen.add(id);
  }
}

function flameLawIdsEqual(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((id, i) => id === b[i]);
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

function optionalText(raw: string | null, label: string): string | null {
  if (raw === null) return null;
  const trimmed = raw.trim();
  if (trimmed.length === 0) return null;
  if (trimmed.length > MAX_TEXT_LENGTH) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `${label} exceeds ${MAX_TEXT_LENGTH} characters`);
  }
  return trimmed;
}

function doctrineEqual(a: OrdinaryTempleDoctrineState, b: OrdinaryTempleDoctrineState): boolean {
  if (a.kind !== b.kind) return false;
  if (a.kind === "unset" || b.kind === "unset") return a.kind === b.kind;
  if (a.kind === "doctrine" && b.kind === "doctrine") return a.doctrineId === b.doctrineId;
  if (a.kind === "blasphemy" && b.kind === "blasphemy") return a.blasphemyId === b.blasphemyId;
  return false;
}

function hostEqual(a: HierophantSupplicantHost | HierophantProphetHost, b: HierophantSupplicantHost | HierophantProphetHost): boolean {
  if (a.kind !== b.kind) return false;
  if (a.kind === "temple" && b.kind === "temple") {
    if (a.templeId !== b.templeId) return false;
    if ("area" in a && "area" in b) return a.area === b.area;
    return true;
  }
  if (a.kind === "cult" && b.kind === "cult") return a.cultDenizenId === b.cultDenizenId;
  return false;
}

function findDenizen(state: CampaignStateV5, denizenId: DenizenId) {
  return state.world.denizens.find((d) => d.denizenId === denizenId);
}

function requireIndividual(state: CampaignStateV5, denizenId: DenizenId, label: string) {
  const denizen = findDenizen(state, denizenId);
  if (denizen === undefined) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `${label} does not resolve: ${denizenId}`);
  }
  if (denizen.representation !== "individual") {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `${label} must reference an individual Denizen`);
  }
}

function requireCollective(state: CampaignStateV5, denizenId: DenizenId, label: string) {
  const denizen = findDenizen(state, denizenId);
  if (denizen === undefined) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `${label} does not resolve: ${denizenId}`);
  }
  if (denizen.representation !== "collective") {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `${label} must reference a collective Denizen`);
  }
}

function requirePlace(state: CampaignStateV5, placeId: PlaceId, label: string) {
  if (!state.world.places.some((p) => p.placeId === placeId)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `${label} does not resolve to a World Place: ${placeId}`);
  }
}

function requireTemple(state: CampaignStateV5, templeId: HierophantTempleId): HierophantTemple {
  const temple = state.hierophant.temples.find((t) => t.templeId === templeId);
  if (temple === undefined) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Temple not found: ${templeId}`);
  }
  return temple;
}

function requireCult(state: CampaignStateV5, cultDenizenId: DenizenId): HierophantCult {
  const cult = state.hierophant.cults.find((c) => c.cultDenizenId === cultDenizenId);
  if (cult === undefined) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Cult not found: ${cultDenizenId}`);
  }
  return cult;
}

function assertSupplicantHost(state: CampaignStateV5, host: HierophantSupplicantHost): void {
  if (host.kind === "temple") {
    const temple = requireTemple(state, host.templeId);
    if (host.area !== null && host.area !== "courtyard" && host.area !== "agiary") {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `Invalid Temple area: ${host.area}`);
    }
    if (temple.kind === "hestar" && host.area !== null) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", "Hestar host area must be null");
    }
    return;
  }
  requireCult(state, host.cultDenizenId);
}

function assertProphetHost(state: CampaignStateV5, host: HierophantProphetHost): void {
  if (host.kind === "temple") {
    requireTemple(state, host.templeId);
    return;
  }
  requireCult(state, host.cultDenizenId);
}

function classResolves(state: CampaignStateV5, classId: string): boolean {
  return isValidHierophantBuiltinClassId(classId)
    || state.hierophant.campaignClasses.some((c) => c.classId === classId);
}

function blasphemyResolves(state: CampaignStateV5, blasphemyId: string): boolean {
  return isValidHierophantBuiltinBlasphemyId(blasphemyId)
    || state.hierophant.campaignDoctrines.some((d) => d.blasphemy?.blasphemyId === blasphemyId);
}

function doctrineResolves(state: CampaignStateV5, doctrineId: string): boolean {
  return isValidHierophantBuiltinDoctrineId(doctrineId)
    || state.hierophant.campaignDoctrines.some((d) => d.doctrineId === doctrineId);
}

function assertDoctrineState(state: CampaignStateV5, doctrine: OrdinaryTempleDoctrineState): void {
  if (doctrine.kind === "unset") return;
  if (doctrine.kind === "doctrine") {
    if (!doctrineResolves(state, doctrine.doctrineId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `Doctrine does not resolve: ${doctrine.doctrineId}`);
    }
    return;
  }
  if (!blasphemyResolves(state, doctrine.blasphemyId)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Blasphemy does not resolve: ${doctrine.blasphemyId}`);
  }
}

function buildStartingTemple(
  definition: (typeof HIEROPHANT_STARTING_TEMPLE_DEFINITIONS)[number],
  placeId: PlaceId,
  hostSeatId: PactSeatId,
): HierophantTemple {
  if (definition.kind === "hestar") {
    const temple: HestarHierophantTemple = {
      templeId: definition.templeId,
      kind: "hestar",
      placeId,
      hostSeatId,
      status: definition.status,
      abundance: definition.abundance,
      conviction: definition.conviction,
    };
    return temple;
  }
  const temple: OrdinaryHierophantTemple = {
    templeId: definition.templeId,
    kind: "ordinary",
    placeId,
    hostSeatId,
    status: definition.status,
    abundance: definition.abundance,
    conviction: definition.conviction,
    doctrine: { kind: "doctrine", doctrineId: definition.doctrineId },
  };
  return temple;
}

export function applyInitializeHierophant(
  state: CampaignStateV5,
  input: InitializeHierophantInput,
): HierophantTransitionResult {
  if (state.hierophant.temples.length > 0) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "Hierophant Temples have already been initialized");
  }

  uniqueOrThrow(input.selectedFlameLawIds, "selectedFlameLawId");
  if (input.selectedFlameLawIds.length !== 2) {
    throw new DomainError(
      "INVALID_CAMPAIGN_STATE",
      "Hierophant initialization requires choosing exactly two Laws of the Flame",
    );
  }
  for (const lawId of input.selectedFlameLawIds) {
    if (!isValidHierophantFlameLawId(lawId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `Unknown Flame Law id: ${lawId}`);
    }
  }

  if (input.templePlaces.length !== HIEROPHANT_STARTING_TEMPLE_IDS.length) {
    throw new DomainError(
      "INVALID_CAMPAIGN_STATE",
      `Hierophant initialization requires a Place for each starting Temple (${HIEROPHANT_STARTING_TEMPLE_IDS.length})`,
    );
  }

  uniqueOrThrow(input.templePlaces.map((b) => b.templeId), "starting Temple id");
  uniqueOrThrow(input.templePlaces.map((b) => b.placeId), "Temple placeId");

  const bindingByTemple = new Map<string, TemplePlaceBinding>();
  for (const binding of input.templePlaces) {
    if (!isValidHierophantStartingTempleId(binding.templeId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `Unknown starting Temple id: ${binding.templeId}`);
    }
    if (!isValidPlaceId(binding.placeId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `Invalid Temple placeId: ${binding.placeId}`);
    }
    requirePlace(state, binding.placeId, `Temple ${binding.templeId} placeId`);
    bindingByTemple.set(binding.templeId, binding);
  }

  for (const startingId of HIEROPHANT_STARTING_TEMPLE_IDS) {
    if (!bindingByTemple.has(startingId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `Missing Place binding for starting Temple ${startingId}`);
    }
  }

  const temples: HierophantTemple[] = HIEROPHANT_STARTING_TEMPLE_DEFINITIONS.map((definition) => {
    const binding = bindingByTemple.get(definition.templeId)!;
    return buildStartingTemple(definition, binding.placeId, definition.hostSeatId);
  });

  const hierophant: HierophantState = {
    ...state.hierophant,
    selectedFlameLawIds: [...input.selectedFlameLawIds],
    temples,
  };

  return {
    nextState: replaceHierophant(state, hierophant),
    events: [{
      type: "hierophant_initialized",
      version: 1,
      data: {
        selectedFlameLawIds: hierophant.selectedFlameLawIds,
        temples,
      },
    }],
  };
}

export function applySetSelectedFlameLaws(
  state: CampaignStateV5,
  expectedSelectedFlameLawIds: readonly HierophantFlameLawId[],
  selectedFlameLawIds: readonly HierophantFlameLawId[],
): HierophantTransitionResult {
  const current = state.hierophant.selectedFlameLawIds;
  if (!flameLawIdsEqual(current, expectedSelectedFlameLawIds)) {
    throw new DomainError(
      "STALE_COMMAND_PRECONDITION",
      `selectedFlameLawIds: expected "${expectedSelectedFlameLawIds.join(",")}" but current is "${current.join(",")}"`,
    );
  }
  uniqueOrThrow(selectedFlameLawIds, "selectedFlameLawId");
  for (const lawId of selectedFlameLawIds) {
    if (!isValidHierophantFlameLawId(lawId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `Unknown Flame Law id: ${lawId}`);
    }
  }
  if (flameLawIdsEqual(current, selectedFlameLawIds)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "Update produces no change");
  }
  const hierophant: HierophantState = {
    ...state.hierophant,
    selectedFlameLawIds: [...selectedFlameLawIds],
  };
  return {
    nextState: replaceHierophant(state, hierophant),
    events: [{
      type: "flame_laws_changed",
      version: 1,
      data: {
        previousSelectedFlameLawIds: [...current],
        newSelectedFlameLawIds: [...selectedFlameLawIds],
      },
    }],
  };
}

export function applyAdjustTempleResources(
  state: CampaignStateV5,
  templeId: HierophantTempleId,
  fields: AdjustTempleResourcesFields,
): HierophantTransitionResult {
  if (fields.abundance === undefined && fields.conviction === undefined) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "Update must specify at least one field");
  }
  if (!isValidHierophantTempleId(templeId)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Temple not found: ${templeId}`);
  }

  const idx = state.hierophant.temples.findIndex((t) => t.templeId === templeId);
  if (idx === -1) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Temple not found: ${templeId}`);
  }
  const current = state.hierophant.temples[idx];

  let abundance = current.abundance;
  let conviction = current.conviction;

  if (fields.abundance !== undefined) {
    checkPrecondition("abundance", current.abundance, fields.abundance);
    assertNonNegativeSafeInteger("abundance", fields.abundance.value);
    abundance = fields.abundance.value;
  }
  if (fields.conviction !== undefined) {
    checkPrecondition("conviction", current.conviction, fields.conviction);
    assertNonNegativeSafeInteger("conviction", fields.conviction.value);
    conviction = fields.conviction.value;
  }

  if (abundance === current.abundance && conviction === current.conviction) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "Update produces no change");
  }

  const updated: HierophantTemple = { ...current, abundance, conviction };
  const temples = state.hierophant.temples.map((t, i) => (i === idx ? updated : t));
  const hierophant: HierophantState = { ...state.hierophant, temples };

  return {
    nextState: replaceHierophant(state, hierophant),
    events: [{
      type: "temple_resources_adjusted",
      version: 1,
      data: {
        templeId,
        previousAbundance: current.abundance,
        newAbundance: abundance,
        previousConviction: current.conviction,
        newConviction: conviction,
      },
    }],
  };
}

export interface CreateTempleInput {
  readonly templeId: HierophantTempleId;
  readonly placeId: PlaceId;
  readonly hostSeatId: PactSeatId;
  readonly abundance: number;
  readonly conviction: number;
  readonly status: HierophantTempleStatus;
  readonly doctrine: OrdinaryTempleDoctrineState;
}

export function applyCreateTemple(state: CampaignStateV5, input: CreateTempleInput): HierophantTransitionResult {
  if (!isValidHierophantCampaignTempleId(input.templeId)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Invalid campaign Temple id: ${input.templeId}`);
  }
  if (state.hierophant.temples.some((t) => t.templeId === input.templeId)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Duplicate Temple id: ${input.templeId}`);
  }
  if (!isValidPlaceId(input.placeId)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Invalid Temple placeId: ${input.placeId}`);
  }
  requirePlace(state, input.placeId, "Temple placeId");
  if (state.hierophant.temples.some((t) => t.placeId === input.placeId)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Temple placeId already in use: ${input.placeId}`);
  }
  if (!isValidPactSeatId(input.hostSeatId)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Invalid hostSeatId: ${input.hostSeatId}`);
  }
  if (input.status !== "active" && input.status !== "collapsed") {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Invalid Temple status: ${input.status}`);
  }
  assertNonNegativeSafeInteger("abundance", input.abundance);
  assertNonNegativeSafeInteger("conviction", input.conviction);
  assertDoctrineState(state, input.doctrine);

  const temple: OrdinaryHierophantTemple = {
    templeId: input.templeId as Exclude<HierophantTempleId, "hestar">,
    kind: "ordinary",
    placeId: input.placeId,
    hostSeatId: input.hostSeatId,
    status: input.status,
    abundance: input.abundance,
    conviction: input.conviction,
    doctrine: input.doctrine,
  };
  const hierophant: HierophantState = {
    ...state.hierophant,
    temples: [...state.hierophant.temples, temple],
  };
  return {
    nextState: replaceHierophant(state, hierophant),
    events: [{ type: "temple_created", version: 1, data: { temple } }],
  };
}

export interface UpdateTempleFields {
  readonly placeId?: ExpectedFieldChange<PlaceId>;
  readonly hostSeatId?: ExpectedFieldChange<PactSeatId>;
  readonly status?: ExpectedFieldChange<HierophantTempleStatus>;
  readonly doctrine?: ExpectedFieldChange<OrdinaryTempleDoctrineState>;
}

export function applyUpdateTemple(
  state: CampaignStateV5,
  templeId: HierophantTempleId,
  fields: UpdateTempleFields,
): HierophantTransitionResult {
  if (fields.placeId === undefined && fields.hostSeatId === undefined && fields.status === undefined && fields.doctrine === undefined) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "Update must specify at least one field");
  }
  const idx = state.hierophant.temples.findIndex((t) => t.templeId === templeId);
  if (idx === -1) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Temple not found: ${templeId}`);
  }
  const current = state.hierophant.temples[idx];

  let placeId = current.placeId;
  let hostSeatId = current.hostSeatId;
  let status = current.status;
  if (fields.placeId !== undefined) {
    checkPrecondition("placeId", current.placeId, fields.placeId);
    if (!isValidPlaceId(fields.placeId.value)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `Invalid Temple placeId: ${fields.placeId.value}`);
    }
    requirePlace(state, fields.placeId.value, "Temple placeId");
    if (state.hierophant.temples.some((t, i) => i !== idx && t.placeId === fields.placeId!.value)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `Temple placeId already in use: ${fields.placeId.value}`);
    }
    placeId = fields.placeId.value;
  }
  if (fields.hostSeatId !== undefined) {
    checkPrecondition("hostSeatId", current.hostSeatId, fields.hostSeatId);
    if (!isValidPactSeatId(fields.hostSeatId.value)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `Invalid hostSeatId: ${fields.hostSeatId.value}`);
    }
    hostSeatId = fields.hostSeatId.value;
  }
  if (fields.status !== undefined) {
    checkPrecondition("status", current.status, fields.status);
    if (fields.status.value !== "active" && fields.status.value !== "collapsed") {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `Invalid Temple status: ${fields.status.value}`);
    }
    status = fields.status.value;
  }

  let updated: HierophantTemple;
  if (current.kind === "hestar") {
    if (fields.doctrine !== undefined) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", "Hestar must not have a set Doctrine");
    }
    updated = { ...current, placeId, hostSeatId, status };
  } else {
    let doctrine = current.doctrine;
    if (fields.doctrine !== undefined) {
      checkPrecondition("doctrine", current.doctrine, fields.doctrine, doctrineEqual);
      assertDoctrineState(state, fields.doctrine.value);
      doctrine = fields.doctrine.value;
    }
    updated = { ...current, placeId, hostSeatId, status, doctrine };
  }

  if (
    updated.placeId === current.placeId
    && updated.hostSeatId === current.hostSeatId
    && updated.status === current.status
    && (updated.kind === "hestar" || (current.kind === "ordinary" && doctrineEqual(updated.doctrine, current.doctrine)))
  ) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "Update produces no change");
  }

  const temples = state.hierophant.temples.map((t, i) => (i === idx ? updated : t));
  return {
    nextState: replaceHierophant(state, { ...state.hierophant, temples }),
    events: [{ type: "temple_updated", version: 1, data: { previous: current, updated } }],
  };
}

export function applySetTempleHoliday(
  state: CampaignStateV5,
  templeId: HierophantTempleId,
  marked: boolean,
): HierophantTransitionResult {
  requireTemple(state, templeId);
  const previousMarked = state.hierophant.holidayTempleIds.includes(templeId);
  if (previousMarked === marked) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "Update produces no change");
  }
  const holidayTempleIds = marked
    ? [...state.hierophant.holidayTempleIds, templeId]
    : state.hierophant.holidayTempleIds.filter((id) => id !== templeId);
  return {
    nextState: replaceHierophant(state, { ...state.hierophant, holidayTempleIds }),
    events: [{
      type: "temple_holiday_changed",
      version: 1,
      data: { templeId, previousMarked, newMarked: marked },
    }],
  };
}

export function applyAddSupplicant(state: CampaignStateV5, supplicant: HierophantSupplicant): HierophantTransitionResult {
  if (!isValidDenizenId(supplicant.denizenId)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Invalid denizenId: ${supplicant.denizenId}`);
  }
  requireIndividual(state, supplicant.denizenId, "Supplicant denizenId");
  if (state.hierophant.supplicants.some((s) => s.denizenId === supplicant.denizenId)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Denizen is already a Supplicant: ${supplicant.denizenId}`);
  }
  if (!classResolves(state, supplicant.classId)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Class does not resolve: ${supplicant.classId}`);
  }
  assertNonNegativeSafeInteger("woe", supplicant.woe);
  assertSupplicantHost(state, supplicant.host);
  const hierophant: HierophantState = {
    ...state.hierophant,
    supplicants: [...state.hierophant.supplicants, supplicant],
  };
  return {
    nextState: replaceHierophant(state, hierophant),
    events: [{ type: "supplicant_added", version: 1, data: { supplicant } }],
  };
}

export interface UpdateSupplicantFields {
  readonly classId?: ExpectedFieldChange<HierophantClassId>;
  readonly woe?: ExpectedFieldChange<number>;
  readonly host?: ExpectedFieldChange<HierophantSupplicantHost>;
}

export function applyUpdateSupplicant(
  state: CampaignStateV5,
  denizenId: DenizenId,
  fields: UpdateSupplicantFields,
): HierophantTransitionResult {
  if (fields.classId === undefined && fields.woe === undefined && fields.host === undefined) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "Update must specify at least one field");
  }
  const idx = state.hierophant.supplicants.findIndex((s) => s.denizenId === denizenId);
  if (idx === -1) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Supplicant not found: ${denizenId}`);
  }
  const current = state.hierophant.supplicants[idx];
  let classId = current.classId;
  let woe = current.woe;
  let host = current.host;
  if (fields.classId !== undefined) {
    checkPrecondition("classId", current.classId, fields.classId);
    if (!classResolves(state, fields.classId.value)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `Class does not resolve: ${fields.classId.value}`);
    }
    classId = fields.classId.value;
  }
  if (fields.woe !== undefined) {
    checkPrecondition("woe", current.woe, fields.woe);
    assertNonNegativeSafeInteger("woe", fields.woe.value);
    woe = fields.woe.value;
  }
  if (fields.host !== undefined) {
    checkPrecondition("host", current.host, fields.host, hostEqual);
    assertSupplicantHost(state, fields.host.value);
    host = fields.host.value;
  }
  if (classId === current.classId && woe === current.woe && hostEqual(host, current.host)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "Update produces no change");
  }
  const updated: HierophantSupplicant = { denizenId, classId, woe, host };
  const supplicants = state.hierophant.supplicants.map((s, i) => (i === idx ? updated : s));
  return {
    nextState: replaceHierophant(state, { ...state.hierophant, supplicants }),
    events: [{ type: "supplicant_updated", version: 1, data: { previous: current, updated } }],
  };
}

export function applyRemoveSupplicant(state: CampaignStateV5, denizenId: DenizenId): HierophantTransitionResult {
  if (!state.hierophant.supplicants.some((s) => s.denizenId === denizenId)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Supplicant not found: ${denizenId}`);
  }
  const supplicants = state.hierophant.supplicants.filter((s) => s.denizenId !== denizenId);
  return {
    nextState: replaceHierophant(state, { ...state.hierophant, supplicants }),
    events: [{ type: "supplicant_removed", version: 1, data: { denizenId } }],
  };
}

export function applyAddProphet(state: CampaignStateV5, prophet: HierophantProphet): HierophantTransitionResult {
  if (!isValidDenizenId(prophet.denizenId)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Invalid denizenId: ${prophet.denizenId}`);
  }
  requireIndividual(state, prophet.denizenId, "Prophet denizenId");
  if (state.hierophant.prophets.some((p) => p.denizenId === prophet.denizenId)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Denizen is already a Prophet: ${prophet.denizenId}`);
  }
  if (prophet.disposition !== "reliable" && prophet.disposition !== "disruptive") {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Invalid Prophet disposition: ${prophet.disposition}`);
  }
  assertProphetHost(state, prophet.host);
  return {
    nextState: replaceHierophant(state, {
      ...state.hierophant,
      prophets: [...state.hierophant.prophets, prophet],
    }),
    events: [{ type: "prophet_added", version: 1, data: { prophet } }],
  };
}

export interface UpdateProphetFields {
  readonly disposition?: ExpectedFieldChange<HierophantProphetDisposition>;
  readonly host?: ExpectedFieldChange<HierophantProphetHost>;
}

export function applyUpdateProphet(
  state: CampaignStateV5,
  denizenId: DenizenId,
  fields: UpdateProphetFields,
): HierophantTransitionResult {
  if (fields.disposition === undefined && fields.host === undefined) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "Update must specify at least one field");
  }
  const idx = state.hierophant.prophets.findIndex((p) => p.denizenId === denizenId);
  if (idx === -1) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Prophet not found: ${denizenId}`);
  }
  const current = state.hierophant.prophets[idx];
  let disposition = current.disposition;
  let host = current.host;
  if (fields.disposition !== undefined) {
    checkPrecondition("disposition", current.disposition, fields.disposition);
    if (fields.disposition.value !== "reliable" && fields.disposition.value !== "disruptive") {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `Invalid Prophet disposition: ${fields.disposition.value}`);
    }
    disposition = fields.disposition.value;
  }
  if (fields.host !== undefined) {
    checkPrecondition("host", current.host, fields.host, hostEqual);
    assertProphetHost(state, fields.host.value);
    host = fields.host.value;
  }
  if (disposition === current.disposition && hostEqual(host, current.host)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "Update produces no change");
  }
  const updated: HierophantProphet = { denizenId, disposition, host };
  const prophets = state.hierophant.prophets.map((p, i) => (i === idx ? updated : p));
  return {
    nextState: replaceHierophant(state, { ...state.hierophant, prophets }),
    events: [{ type: "prophet_updated", version: 1, data: { previous: current, updated } }],
  };
}

export function applyRemoveProphet(state: CampaignStateV5, denizenId: DenizenId): HierophantTransitionResult {
  if (!state.hierophant.prophets.some((p) => p.denizenId === denizenId)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Prophet not found: ${denizenId}`);
  }
  const prophets = state.hierophant.prophets.filter((p) => p.denizenId !== denizenId);
  return {
    nextState: replaceHierophant(state, { ...state.hierophant, prophets }),
    events: [{ type: "prophet_removed", version: 1, data: { denizenId } }],
  };
}

export function applyEstablishCult(state: CampaignStateV5, cult: HierophantCult): HierophantTransitionResult {
  if (!isValidDenizenId(cult.cultDenizenId)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Invalid cultDenizenId: ${cult.cultDenizenId}`);
  }
  requireCollective(state, cult.cultDenizenId, "cultDenizenId");
  if (state.hierophant.cults.some((c) => c.cultDenizenId === cult.cultDenizenId)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Denizen is already a Cult: ${cult.cultDenizenId}`);
  }
  if (!isValidPactSeatId(cult.hostSeatId)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Invalid hostSeatId: ${cult.hostSeatId}`);
  }
  if (cult.anchorPlaceId !== null) {
    if (!isValidPlaceId(cult.anchorPlaceId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `Invalid anchorPlaceId: ${cult.anchorPlaceId}`);
    }
    requirePlace(state, cult.anchorPlaceId, "Cult anchorPlaceId");
  }
  if (cult.leaderDenizenId !== null) {
    if (!isValidDenizenId(cult.leaderDenizenId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `Invalid leaderDenizenId: ${cult.leaderDenizenId}`);
    }
    requireIndividual(state, cult.leaderDenizenId, "leaderDenizenId");
  }
  if (!blasphemyResolves(state, cult.blasphemyId)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Blasphemy does not resolve: ${cult.blasphemyId}`);
  }
  assertNonNegativeSafeInteger("abundance", cult.abundance);
  assertNonNegativeSafeInteger("conviction", cult.conviction);
  if (cult.dogmas.length > 0) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "Establish Cult with empty Dogmas; add Dogmas separately");
  }
  const established: HierophantCult = { ...cult, dogmas: [] };
  return {
    nextState: replaceHierophant(state, {
      ...state.hierophant,
      cults: [...state.hierophant.cults, established],
    }),
    events: [{ type: "cult_established", version: 1, data: { cult: established } }],
  };
}

export interface UpdateCultFields {
  readonly hostSeatId?: ExpectedFieldChange<PactSeatId>;
  readonly anchorPlaceId?: ExpectedFieldChange<PlaceId | null>;
  readonly leaderDenizenId?: ExpectedFieldChange<DenizenId | null>;
  readonly blasphemyId?: ExpectedFieldChange<HierophantBlasphemyId>;
  readonly abundance?: ExpectedFieldChange<number>;
  readonly conviction?: ExpectedFieldChange<number>;
}

export function applyUpdateCult(
  state: CampaignStateV5,
  cultDenizenId: DenizenId,
  fields: UpdateCultFields,
): HierophantTransitionResult {
  if (
    fields.hostSeatId === undefined
    && fields.anchorPlaceId === undefined
    && fields.leaderDenizenId === undefined
    && fields.blasphemyId === undefined
    && fields.abundance === undefined
    && fields.conviction === undefined
  ) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "Update must specify at least one field");
  }
  const idx = state.hierophant.cults.findIndex((c) => c.cultDenizenId === cultDenizenId);
  if (idx === -1) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Cult not found: ${cultDenizenId}`);
  }
  const current = state.hierophant.cults[idx];
  let hostSeatId = current.hostSeatId;
  let anchorPlaceId = current.anchorPlaceId;
  let leaderDenizenId = current.leaderDenizenId;
  let blasphemyId = current.blasphemyId;
  let abundance = current.abundance;
  let conviction = current.conviction;

  if (fields.hostSeatId !== undefined) {
    checkPrecondition("hostSeatId", current.hostSeatId, fields.hostSeatId);
    if (!isValidPactSeatId(fields.hostSeatId.value)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `Invalid hostSeatId: ${fields.hostSeatId.value}`);
    }
    hostSeatId = fields.hostSeatId.value;
  }
  if (fields.anchorPlaceId !== undefined) {
    checkPrecondition("anchorPlaceId", current.anchorPlaceId, fields.anchorPlaceId);
    if (fields.anchorPlaceId.value !== null) {
      if (!isValidPlaceId(fields.anchorPlaceId.value)) {
        throw new DomainError("INVALID_CAMPAIGN_STATE", `Invalid anchorPlaceId: ${fields.anchorPlaceId.value}`);
      }
      requirePlace(state, fields.anchorPlaceId.value, "Cult anchorPlaceId");
    }
    anchorPlaceId = fields.anchorPlaceId.value;
  }
  if (fields.leaderDenizenId !== undefined) {
    checkPrecondition("leaderDenizenId", current.leaderDenizenId, fields.leaderDenizenId);
    if (fields.leaderDenizenId.value !== null) {
      if (!isValidDenizenId(fields.leaderDenizenId.value)) {
        throw new DomainError("INVALID_CAMPAIGN_STATE", `Invalid leaderDenizenId: ${fields.leaderDenizenId.value}`);
      }
      requireIndividual(state, fields.leaderDenizenId.value, "leaderDenizenId");
    }
    leaderDenizenId = fields.leaderDenizenId.value;
  }
  if (fields.blasphemyId !== undefined) {
    checkPrecondition("blasphemyId", current.blasphemyId, fields.blasphemyId);
    if (!blasphemyResolves(state, fields.blasphemyId.value)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `Blasphemy does not resolve: ${fields.blasphemyId.value}`);
    }
    blasphemyId = fields.blasphemyId.value;
  }
  if (fields.abundance !== undefined) {
    checkPrecondition("abundance", current.abundance, fields.abundance);
    assertNonNegativeSafeInteger("abundance", fields.abundance.value);
    abundance = fields.abundance.value;
  }
  if (fields.conviction !== undefined) {
    checkPrecondition("conviction", current.conviction, fields.conviction);
    assertNonNegativeSafeInteger("conviction", fields.conviction.value);
    conviction = fields.conviction.value;
  }

  const updated: HierophantCult = {
    ...current,
    hostSeatId,
    anchorPlaceId,
    leaderDenizenId,
    blasphemyId,
    abundance,
    conviction,
  };
  if (
    updated.hostSeatId === current.hostSeatId
    && updated.anchorPlaceId === current.anchorPlaceId
    && updated.leaderDenizenId === current.leaderDenizenId
    && updated.blasphemyId === current.blasphemyId
    && updated.abundance === current.abundance
    && updated.conviction === current.conviction
  ) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "Update produces no change");
  }
  const cults = state.hierophant.cults.map((c, i) => (i === idx ? updated : c));
  return {
    nextState: replaceHierophant(state, { ...state.hierophant, cults }),
    events: [{ type: "cult_updated", version: 1, data: { previous: current, updated } }],
  };
}

export function applyRemoveCult(state: CampaignStateV5, cultDenizenId: DenizenId): HierophantTransitionResult {
  requireCult(state, cultDenizenId);
  const hostedSupplicant = state.hierophant.supplicants.some(
    (s) => s.host.kind === "cult" && s.host.cultDenizenId === cultDenizenId,
  );
  const hostedProphet = state.hierophant.prophets.some(
    (p) => p.host.kind === "cult" && p.host.cultDenizenId === cultDenizenId,
  );
  if (hostedSupplicant || hostedProphet) {
    throw new DomainError(
      "INVALID_CAMPAIGN_STATE",
      "Cannot remove Cult while Supplicants or Prophets still host there",
    );
  }
  const cults = state.hierophant.cults.filter((c) => c.cultDenizenId !== cultDenizenId);
  return {
    nextState: replaceHierophant(state, { ...state.hierophant, cults }),
    events: [{ type: "cult_removed", version: 1, data: { cultDenizenId } }],
  };
}

export function applyAddCultDogma(
  state: CampaignStateV5,
  cultDenizenId: DenizenId,
  dogma: HierophantCultDogma,
): HierophantTransitionResult {
  const idx = state.hierophant.cults.findIndex((c) => c.cultDenizenId === cultDenizenId);
  if (idx === -1) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Cult not found: ${cultDenizenId}`);
  }
  const current = state.hierophant.cults[idx];
  if (!isValidHierophantDogmaEntryId(dogma.dogmaEntryId)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Invalid dogmaEntryId: ${dogma.dogmaEntryId}`);
  }
  if (current.dogmas.some((d) => d.dogmaEntryId === dogma.dogmaEntryId)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Duplicate dogmaEntryId: ${dogma.dogmaEntryId}`);
  }
  if (dogma.kind === "builtin") {
    if (!isValidHierophantBuiltinDogmaId(dogma.dogmaId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `Unknown built-in Dogma: ${dogma.dogmaId}`);
    }
  } else {
    if (!isValidHierophantDogmaCategory(dogma.category)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `Invalid Dogma category: ${dogma.category}`);
    }
    normalizeText(dogma.text, "Dogma text");
  }
  const nextDogma: HierophantCultDogma = dogma.kind === "custom"
    ? { ...dogma, text: normalizeText(dogma.text, "Dogma text") }
    : dogma;
  const updated: HierophantCult = { ...current, dogmas: [...current.dogmas, nextDogma] };
  const cults = state.hierophant.cults.map((c, i) => (i === idx ? updated : c));
  return {
    nextState: replaceHierophant(state, { ...state.hierophant, cults }),
    events: [{ type: "cult_dogma_added", version: 1, data: { cultDenizenId, dogma: nextDogma } }],
  };
}

export interface UpdateCultDogmaFields {
  readonly category?: ExpectedFieldChange<HierophantDogmaCategory>;
  readonly text?: ExpectedFieldChange<string>;
}

export function applyUpdateCultDogma(
  state: CampaignStateV5,
  cultDenizenId: DenizenId,
  dogmaEntryId: HierophantDogmaEntryId,
  fields: UpdateCultDogmaFields,
): HierophantTransitionResult {
  if (fields.category === undefined && fields.text === undefined) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "Update must specify at least one field");
  }
  const cultIdx = state.hierophant.cults.findIndex((c) => c.cultDenizenId === cultDenizenId);
  if (cultIdx === -1) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Cult not found: ${cultDenizenId}`);
  }
  const current = state.hierophant.cults[cultIdx];
  const dogmaIdx = current.dogmas.findIndex((d) => d.dogmaEntryId === dogmaEntryId);
  if (dogmaIdx === -1) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Dogma not found: ${dogmaEntryId}`);
  }
  const previous = current.dogmas[dogmaIdx];
  if (previous.kind !== "custom") {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "Built-in Dogma text cannot be edited");
  }
  let category = previous.category;
  let text = previous.text;
  if (fields.category !== undefined) {
    checkPrecondition("category", previous.category, fields.category);
    if (!isValidHierophantDogmaCategory(fields.category.value)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `Invalid Dogma category: ${fields.category.value}`);
    }
    category = fields.category.value;
  }
  if (fields.text !== undefined) {
    checkPrecondition("text", previous.text, fields.text);
    text = normalizeText(fields.text.value, "Dogma text");
  }
  if (category === previous.category && text === previous.text) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "Update produces no change");
  }
  const updatedDogma: HierophantCultDogma = { ...previous, category, text };
  const updated: HierophantCult = {
    ...current,
    dogmas: current.dogmas.map((d, i) => (i === dogmaIdx ? updatedDogma : d)),
  };
  const cults = state.hierophant.cults.map((c, i) => (i === cultIdx ? updated : c));
  return {
    nextState: replaceHierophant(state, { ...state.hierophant, cults }),
    events: [{
      type: "cult_dogma_updated",
      version: 1,
      data: { cultDenizenId, previous, updated: updatedDogma },
    }],
  };
}

export function applyRemoveCultDogma(
  state: CampaignStateV5,
  cultDenizenId: DenizenId,
  dogmaEntryId: HierophantDogmaEntryId,
): HierophantTransitionResult {
  const idx = state.hierophant.cults.findIndex((c) => c.cultDenizenId === cultDenizenId);
  if (idx === -1) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Cult not found: ${cultDenizenId}`);
  }
  const current = state.hierophant.cults[idx];
  if (!current.dogmas.some((d) => d.dogmaEntryId === dogmaEntryId)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Dogma not found: ${dogmaEntryId}`);
  }
  const updated: HierophantCult = {
    ...current,
    dogmas: current.dogmas.filter((d) => d.dogmaEntryId !== dogmaEntryId),
  };
  const cults = state.hierophant.cults.map((c, i) => (i === idx ? updated : c));
  return {
    nextState: replaceHierophant(state, { ...state.hierophant, cults }),
    events: [{ type: "cult_dogma_removed", version: 1, data: { cultDenizenId, dogmaEntryId } }],
  };
}

export function applyCreateCampaignClass(
  state: CampaignStateV5,
  campaignClass: HierophantCampaignClass,
): HierophantTransitionResult {
  if (!isValidHierophantCampaignClassId(campaignClass.classId)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Invalid campaign Class id: ${campaignClass.classId}`);
  }
  if (isValidHierophantBuiltinClassId(campaignClass.classId)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Class id collides with a built-in Class: ${campaignClass.classId}`);
  }
  if (state.hierophant.campaignClasses.some((c) => c.classId === campaignClass.classId)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Duplicate campaign Class id: ${campaignClass.classId}`);
  }
  const created: HierophantCampaignClass = {
    classId: campaignClass.classId,
    name: normalizeName(campaignClass.name),
  };
  return {
    nextState: replaceHierophant(state, {
      ...state.hierophant,
      campaignClasses: [...state.hierophant.campaignClasses, created],
    }),
    events: [{ type: "campaign_class_created", version: 1, data: { campaignClass: created } }],
  };
}

export function applyUpdateCampaignClass(
  state: CampaignStateV5,
  classId: HierophantCampaignClassId,
  name: ExpectedFieldChange<string>,
): HierophantTransitionResult {
  const idx = state.hierophant.campaignClasses.findIndex((c) => c.classId === classId);
  if (idx === -1) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Campaign Class not found: ${classId}`);
  }
  const current = state.hierophant.campaignClasses[idx];
  checkPrecondition("name", current.name, name);
  const nextName = normalizeName(name.value);
  if (nextName === current.name) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "Update produces no change");
  }
  const updated: HierophantCampaignClass = { classId, name: nextName };
  const campaignClasses = state.hierophant.campaignClasses.map((c, i) => (i === idx ? updated : c));
  return {
    nextState: replaceHierophant(state, { ...state.hierophant, campaignClasses }),
    events: [{ type: "campaign_class_updated", version: 1, data: { previous: current, updated } }],
  };
}

export function applyCreateCampaignDoctrine(
  state: CampaignStateV5,
  campaignDoctrine: HierophantCampaignDoctrine,
): HierophantTransitionResult {
  if (!isValidHierophantCampaignDoctrineId(campaignDoctrine.doctrineId)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Invalid campaign Doctrine id: ${campaignDoctrine.doctrineId}`);
  }
  if (isValidHierophantBuiltinDoctrineId(campaignDoctrine.doctrineId)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Doctrine id collides with a built-in Doctrine: ${campaignDoctrine.doctrineId}`);
  }
  if (state.hierophant.campaignDoctrines.some((d) => d.doctrineId === campaignDoctrine.doctrineId)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Duplicate campaign Doctrine id: ${campaignDoctrine.doctrineId}`);
  }
  const orthodoxText = optionalText(campaignDoctrine.orthodoxText, "orthodoxText");
  let blasphemy = campaignDoctrine.blasphemy;
  if (blasphemy !== null) {
    if (!isValidHierophantCampaignBlasphemyId(blasphemy.blasphemyId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `Invalid campaign Blasphemy id: ${blasphemy.blasphemyId}`);
    }
    if (isValidHierophantBuiltinBlasphemyId(blasphemy.blasphemyId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `Blasphemy id collides with a built-in Blasphemy: ${blasphemy.blasphemyId}`);
    }
    if (state.hierophant.campaignDoctrines.some((d) => d.blasphemy?.blasphemyId === blasphemy!.blasphemyId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `Duplicate campaign Blasphemy id: ${blasphemy.blasphemyId}`);
    }
    blasphemy = { blasphemyId: blasphemy.blasphemyId, text: normalizeText(blasphemy.text, "Blasphemy text") };
  }
  if ((orthodoxText === null || orthodoxText.length === 0) && blasphemy === null) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "Campaign Doctrine must include orthodox or Blasphemy text");
  }
  for (const classId of campaignDoctrine.supportedClassIds) {
    if (!classResolves(state, classId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `Class does not resolve: ${classId}`);
    }
  }
  const created: HierophantCampaignDoctrine = {
    doctrineId: campaignDoctrine.doctrineId,
    orthodoxText,
    blasphemy,
    supportedClassIds: [...campaignDoctrine.supportedClassIds],
  };
  return {
    nextState: replaceHierophant(state, {
      ...state.hierophant,
      campaignDoctrines: [...state.hierophant.campaignDoctrines, created],
    }),
    events: [{ type: "campaign_doctrine_created", version: 1, data: { campaignDoctrine: created } }],
  };
}

export interface UpdateCampaignDoctrineFields {
  readonly orthodoxText?: ExpectedFieldChange<string | null>;
  readonly blasphemy?: ExpectedFieldChange<HierophantCampaignDoctrine["blasphemy"]>;
  readonly supportedClassIds?: ExpectedFieldChange<readonly HierophantClassId[]>;
}

function blasphemyRecordEqual(
  a: HierophantCampaignDoctrine["blasphemy"],
  b: HierophantCampaignDoctrine["blasphemy"],
): boolean {
  if (a === null && b === null) return true;
  if (a === null || b === null) return false;
  return a.blasphemyId === b.blasphemyId && a.text === b.text;
}

function classIdsEqual(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((id, i) => id === b[i]);
}

export function applyUpdateCampaignDoctrine(
  state: CampaignStateV5,
  doctrineId: HierophantCampaignDoctrineId,
  fields: UpdateCampaignDoctrineFields,
): HierophantTransitionResult {
  if (fields.orthodoxText === undefined && fields.blasphemy === undefined && fields.supportedClassIds === undefined) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "Update must specify at least one field");
  }
  const idx = state.hierophant.campaignDoctrines.findIndex((d) => d.doctrineId === doctrineId);
  if (idx === -1) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Campaign Doctrine not found: ${doctrineId}`);
  }
  const current = state.hierophant.campaignDoctrines[idx];
  let orthodoxText = current.orthodoxText;
  let blasphemy = current.blasphemy;
  let supportedClassIds = current.supportedClassIds;
  if (fields.orthodoxText !== undefined) {
    checkPrecondition("orthodoxText", current.orthodoxText, fields.orthodoxText);
    orthodoxText = optionalText(fields.orthodoxText.value, "orthodoxText");
  }
  if (fields.blasphemy !== undefined) {
    checkPrecondition("blasphemy", current.blasphemy, fields.blasphemy, blasphemyRecordEqual);
    if (fields.blasphemy.value !== null) {
      const next = fields.blasphemy.value;
      if (!isValidHierophantCampaignBlasphemyId(next.blasphemyId)) {
        throw new DomainError("INVALID_CAMPAIGN_STATE", `Invalid campaign Blasphemy id: ${next.blasphemyId}`);
      }
      if (isValidHierophantBuiltinBlasphemyId(next.blasphemyId)) {
        throw new DomainError("INVALID_CAMPAIGN_STATE", `Blasphemy id collides with a built-in Blasphemy: ${next.blasphemyId}`);
      }
      if (state.hierophant.campaignDoctrines.some((d, i) => i !== idx && d.blasphemy?.blasphemyId === next.blasphemyId)) {
        throw new DomainError("INVALID_CAMPAIGN_STATE", `Duplicate campaign Blasphemy id: ${next.blasphemyId}`);
      }
      blasphemy = { blasphemyId: next.blasphemyId, text: normalizeText(next.text, "Blasphemy text") };
    } else {
      blasphemy = null;
    }
  }
  if (fields.supportedClassIds !== undefined) {
    checkPrecondition("supportedClassIds", current.supportedClassIds, fields.supportedClassIds, classIdsEqual);
    for (const classId of fields.supportedClassIds.value) {
      if (!classResolves(state, classId)) {
        throw new DomainError("INVALID_CAMPAIGN_STATE", `Class does not resolve: ${classId}`);
      }
    }
    supportedClassIds = [...fields.supportedClassIds.value];
  }
  if ((orthodoxText === null || orthodoxText.length === 0) && blasphemy === null) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "Campaign Doctrine must include orthodox or Blasphemy text");
  }
  const updated: HierophantCampaignDoctrine = { doctrineId, orthodoxText, blasphemy, supportedClassIds };
  if (
    updated.orthodoxText === current.orthodoxText
    && blasphemyRecordEqual(updated.blasphemy, current.blasphemy)
    && classIdsEqual(updated.supportedClassIds, current.supportedClassIds)
  ) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "Update produces no change");
  }
  const campaignDoctrines = state.hierophant.campaignDoctrines.map((d, i) => (i === idx ? updated : d));
  return {
    nextState: replaceHierophant(state, { ...state.hierophant, campaignDoctrines }),
    events: [{ type: "campaign_doctrine_updated", version: 1, data: { previous: current, updated } }],
  };
}
