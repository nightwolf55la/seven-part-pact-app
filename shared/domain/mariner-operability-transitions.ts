import type { CampaignStateV5 } from "./campaign-state";
import { DomainError } from "./errors";
import type { DenizenId } from "./ids";
import { isValidDenizenId, isValidPowerfulDenizenMethodEntryId } from "./ids";
import type { PowerfulDenizenMethodEntryId } from "./ids";
import type { PactSeatId } from "./pact-seats";
import { isValidPactSeatId } from "./pact-seats";
import type { ElementId } from "./shared-world";
import { ELEMENT_IDS } from "./shared-world";
import type { PowerfulDenizenStatus } from "./powerful-denizen";
import { profileHasStandardRampagingMethod } from "./powerful-denizen-roles";
import { isValidPowerfulDenizenStandardStatus as isStandardStatus } from "./powerful-denizen";
import type {
  MarinerBoardIsleId,
  MarinerBuiltinBeastId,
  MarinerRouteEndpoint,
  MarinerRouteId,
  MarinerSeaRegionId,
} from "./mariner-catalogs";
import {
  MARINER_BUILTIN_BEAST_DEFINITIONS,
  MARINER_SEA_REGION_DEFINITIONS,
  isValidMarinerBoardIsleId,
  isValidMarinerBuiltinBeastId,
  isValidMarinerRouteId,
  isValidMarinerSeaRegionId,
  marinerRouteDefinition,
  marinerRouteEndpointsEqual,
  marinerRouteHasEndpoint,
} from "./mariner-catalogs";
import type {
  MarinerBeastCondition,
  MarinerBeastLocation,
  MarinerBeastState,
  MarinerIsleMarket,
  MarinerRouteOccupancy,
  MarinerState,
} from "./mariner-state";
import type { MarinerEvent } from "./events";
import { applyCreateDenizenV5Candidate } from "./world-subject-transitions";
import {
  applyAddPowerfulDenizenMethod,
  applyCreatePowerfulDenizenProfile,
} from "./shared-state-transitions";
import { validateMarinerReferenceIntegrity } from "./mariner-validation";
import {
  applyImmediateShippingHazards,
  beastIsEntirelySurrounded,
  immediateHazardRouteIdsCausedBy,
  isRouteUnderImmediateHazard,
} from "./mariner-shipping-hazards";
import type { ExpectedBeastState, MarinerRampageResolution } from "./mariner-rampage";
import {
  applyMarinerRampageResolutions,
  newlyTrappedDistrustingBeastIds,
  requireExactMarinerRampageResolutions,
  seaRegionIdsBoundedByRoute,
} from "./mariner-rampage";

const ELEMENT_ID_SET = new Set<string>(ELEMENT_IDS);
const BEAST_DEFINITION_BY_ID = new Map(MARINER_BUILTIN_BEAST_DEFINITIONS.map((d) => [d.id, d]));
const MAX_TEXT_LENGTH = 8000;

export interface MarinerOperabilityTransitionResult {
  readonly nextState: CampaignStateV5;
  readonly events: readonly MarinerEvent[];
}

export interface ExpectedStormCount {
  readonly regionId: MarinerSeaRegionId;
  readonly stormCount: number;
}

export interface ExpectedRouteOccupancy {
  readonly routeId: MarinerRouteId | string;
  readonly occupancy: MarinerRouteOccupancy;
}

export interface ExpectedBeastLocation {
  readonly denizenId: DenizenId;
  readonly location: MarinerBeastLocation;
}

export type { ExpectedBeastState, MarinerRampageResolution };

export interface CreateMarinerBeastInput {
  readonly denizenId: DenizenId;
  readonly name: string;
  readonly description: string | null;
  readonly status: PowerfulDenizenStatus;
  readonly element: ElementId;
  readonly definitionId: MarinerBuiltinBeastId | null;
  readonly regionId: MarinerSeaRegionId;
  readonly expectedStormCounts: readonly ExpectedStormCount[];
  readonly expectedRouteOccupancies: readonly ExpectedRouteOccupancy[];
  readonly expectedRelevantBeasts: readonly ExpectedBeastLocation[];
  readonly rampageDestinationSeatId: PactSeatId | null;
  readonly rampagingMethodEntryId: PowerfulDenizenMethodEntryId | null;
}

export interface MoveMarinerStormInput {
  readonly sourceRegionId: MarinerSeaRegionId;
  readonly destinationRegionId: MarinerSeaRegionId;
  readonly confirmedNotAgainstPrevailingWind: boolean;
  readonly expectedStormCounts: readonly ExpectedStormCount[];
  readonly expectedRouteOccupancies: readonly ExpectedRouteOccupancy[];
  readonly expectedRelevantBeasts: readonly ExpectedBeastLocation[];
}

export interface MoveMarinerShipInput {
  readonly sourceIsleId: MarinerBoardIsleId;
  readonly sourceRouteId: MarinerRouteId | string;
  readonly destinationRouteId: MarinerRouteId | string;
  readonly destinationToward: MarinerRouteEndpoint | null;
  readonly expectedSourceOccupancy: MarinerRouteOccupancy;
  readonly expectedDestinationOccupancy: MarinerRouteOccupancy;
  readonly expectedStormCounts: readonly ExpectedStormCount[];
  readonly expectedRouteOccupancies: readonly ExpectedRouteOccupancy[];
  readonly expectedRelevantBeasts: readonly ExpectedBeastState[];
  readonly rampageResolutions: readonly MarinerRampageResolution[];
}

export interface CreateMarinerShipInput {
  readonly sourceIsleId: MarinerBoardIsleId;
  readonly targetRouteId: MarinerRouteId | string;
  readonly expectedTargetOccupancy: MarinerRouteOccupancy;
  readonly expectedStormCounts: readonly ExpectedStormCount[];
  readonly expectedRouteOccupancies: readonly ExpectedRouteOccupancy[];
  readonly expectedRelevantBeasts: readonly ExpectedBeastState[];
  readonly rampageResolutions: readonly MarinerRampageResolution[];
}

export interface MoveMarinerBeastInput {
  readonly denizenId: DenizenId;
  readonly sourceRegionId: MarinerSeaRegionId;
  readonly destinationRegionId: MarinerSeaRegionId;
  readonly expectedBeast: ExpectedBeastState;
  readonly expectedStormCounts: readonly ExpectedStormCount[];
  readonly expectedRouteOccupancies: readonly ExpectedRouteOccupancy[];
  readonly expectedRelevantBeasts: readonly ExpectedBeastState[];
  readonly rampageResolution: MarinerRampageResolution | null;
}

export interface NestMarinerBeastInput {
  readonly denizenId: DenizenId;
  readonly boardIsleId: MarinerBoardIsleId;
  readonly expectedBeastCondition: MarinerBeastCondition;
  readonly expectedBeastLocation: MarinerBeastLocation;
  readonly expectedMarket: MarinerIsleMarket;
  readonly expectedRavageStormCount: number;
  readonly expectedNestingBeastDenizenId: DenizenId | null;
}

export interface RecordMarinerRavageResultInput {
  readonly boardIsleId: MarinerBoardIsleId;
  readonly expectedMarket: MarinerIsleMarket;
  readonly expectedRavageStormCount: number;
  readonly expectedNestingBeast: {
    readonly denizenId: DenizenId;
    readonly condition: MarinerBeastCondition;
    readonly location: MarinerBeastLocation;
  } | null;
  readonly expectedPowerfulStatus: PowerfulDenizenStatus | null;
  readonly expectedPowerfulGoal: string | null;
  readonly expectedHasRampagingMethod: boolean;
  readonly rampageDestinationSeatId: PactSeatId | null;
  readonly rampagingMethodEntryId: PowerfulDenizenMethodEntryId | null;
}

function isExactEmptyMariner(mariner: MarinerState): boolean {
  return (
    mariner.shipPlaceId === null &&
    mariner.selectedLawOfSeaIds.length === 0 &&
    mariner.boardIsles.length === 0 &&
    mariner.routes.length === 0 &&
    mariner.seaRegions.length === 0 &&
    mariner.beasts.length === 0
  );
}

function requireInitialized(state: CampaignStateV5): MarinerState {
  if (isExactEmptyMariner(state.mariner)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "Mariner is not initialized");
  }
  return state.mariner;
}

function commit(
  nextState: CampaignStateV5,
  events: readonly MarinerEvent[],
): MarinerOperabilityTransitionResult {
  validateMarinerReferenceIntegrity(nextState);
  return { nextState, events };
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
  if (raw === null) {
    return null;
  }
  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    return null;
  }
  if (trimmed.length > MAX_TEXT_LENGTH) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `${label} exceeds ${MAX_TEXT_LENGTH} characters`);
  }
  return trimmed;
}

function occupancyEqual(a: MarinerRouteOccupancy, b: MarinerRouteOccupancy): boolean {
  if (a.kind !== b.kind) {
    return false;
  }
  if (a.kind === "raider" && b.kind === "raider") {
    return marinerRouteEndpointsEqual(a.toward, b.toward);
  }
  return true;
}

function marketEqual(a: MarinerIsleMarket, b: MarinerIsleMarket): boolean {
  if (a.present !== b.present) {
    return false;
  }
  if (a.present && b.present) {
    return a.rarity === b.rarity;
  }
  return true;
}

function beastLocationEqual(a: MarinerBeastLocation, b: MarinerBeastLocation): boolean {
  if (a.kind !== b.kind) {
    return false;
  }
  if (a.kind === "sea_region" && b.kind === "sea_region") {
    return a.regionId === b.regionId;
  }
  if (a.kind === "board_isle" && b.kind === "board_isle") {
    return a.boardIsleId === b.boardIsleId;
  }
  if (a.kind === "other_domain" && b.kind === "other_domain") {
    return a.seatId === b.seatId;
  }
  return a.kind === "off_map" && b.kind === "off_map";
}

function structurallyEqual(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

function seaRegionDefinition(regionId: string) {
  return MARINER_SEA_REGION_DEFINITIONS.find((definition) => definition.regionId === regionId);
}

function normalizeStatus(status: PowerfulDenizenStatus): PowerfulDenizenStatus {
  if (status.kind === "standard") {
    if (!isStandardStatus(status.value)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `Invalid powerful denizen status: ${status.value}`);
    }
    return { kind: "standard", value: status.value };
  }
  if (status.kind !== "other") {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "Powerful status must be chosen explicitly");
  }
  return { kind: "other", label: normalizeText(status.label, "Powerful status label") };
}

function requireNonMarinerSeat(seatId: PactSeatId | null, label: string): PactSeatId {
  if (seatId === null) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `${label} requires a destination Pact Domain other than Mariner`);
  }
  if (!isValidPactSeatId(seatId) || seatId === "mariner") {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `${label} destination must be another Wizard's Domain, not Mariner`);
  }
  return seatId;
}

function ensureRampagingMethod(
  state: CampaignStateV5,
  denizenId: DenizenId,
  methodEntryId: PowerfulDenizenMethodEntryId | null,
): CampaignStateV5 {
  const denizen = state.world.denizens.find((candidate) => candidate.denizenId === denizenId);
  const profile = denizen?.powerfulProfile ?? null;
  if (profile !== null && profileHasStandardRampagingMethod(profile)) {
    return state;
  }
  if (methodEntryId === null || !isValidPowerfulDenizenMethodEntryId(methodEntryId)) {
    throw new DomainError(
      "INVALID_CAMPAIGN_STATE",
      "Rampaging Beast requires a stable standard Rampaging Method identity",
    );
  }
  return applyAddPowerfulDenizenMethod(state, {
    denizenId,
    methodEntryId,
    definition: { kind: "standard", method: "rampaging" },
  }).nextState;
}

function relevantSeaRegions(regionId: MarinerSeaRegionId): MarinerSeaRegionId[] {
  const definition = seaRegionDefinition(regionId);
  if (definition === undefined) {
    return [regionId];
  }
  return [regionId, ...definition.adjacentRegionIds];
}

function relevantBoundingAndSharedRoutes(regionId: MarinerSeaRegionId): MarinerRouteId[] {
  const focus = seaRegionDefinition(regionId);
  if (focus === undefined) {
    return [];
  }
  const ids = new Set<MarinerRouteId>(focus.boundingRouteIds);
  for (const adjacentId of focus.adjacentRegionIds) {
    const adjacent = seaRegionDefinition(adjacentId);
    if (adjacent === undefined) {
      continue;
    }
    for (const routeId of focus.boundingRouteIds) {
      if (adjacent.boundingRouteIds.includes(routeId)) {
        ids.add(routeId);
      }
    }
  }
  return [...ids];
}

function checkExpectedStorms(
  state: CampaignStateV5,
  expected: readonly ExpectedStormCount[],
  requiredRegionIds: readonly MarinerSeaRegionId[],
): void {
  for (const regionId of requiredRegionIds) {
    const current = state.mariner.seaRegions.find((region) => region.regionId === regionId)?.stormCount ?? 0;
    const found = expected.find((entry) => entry.regionId === regionId);
    if (found === undefined) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `Missing expected storm count for ${regionId}`);
    }
    if (found.stormCount !== current) {
      throw new DomainError(
        "STALE_COMMAND_PRECONDITION",
        `stormCount for ${regionId}: expected "${found.stormCount}" but current is "${current}"`,
      );
    }
  }
}

function checkExpectedRoutes(
  state: CampaignStateV5,
  expected: readonly ExpectedRouteOccupancy[],
  requiredRouteIds: readonly string[],
): void {
  for (const routeId of requiredRouteIds) {
    const current = state.mariner.routes.find((route) => route.routeId === routeId)?.occupancy;
    const found = expected.find((entry) => entry.routeId === routeId);
    if (found === undefined || current === undefined) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `Missing expected occupancy for ${routeId}`);
    }
    if (!occupancyEqual(found.occupancy, current)) {
      throw new DomainError(
        "STALE_COMMAND_PRECONDITION",
        `occupancy for ${routeId} does not match the expected current value`,
      );
    }
  }
}

function checkExpectedBeastStates(
  state: CampaignStateV5,
  expected: readonly ExpectedBeastState[],
  requiredRegionIds: readonly MarinerSeaRegionId[],
): void {
  const relevant = new Set(requiredRegionIds);
  const current = state.mariner.beasts.filter(
    (beast) => beast.location.kind === "sea_region" && relevant.has(beast.location.regionId),
  );
  if (current.length !== expected.length) {
    throw new DomainError(
      "STALE_COMMAND_PRECONDITION",
      "relevant Beast locations do not match the expected current identities",
    );
  }
  for (const entry of expected) {
    const found = current.find((beast) => beast.denizenId === entry.denizenId);
    if (
      found === undefined
      || !beastLocationEqual(found.location, entry.location)
      || found.condition !== entry.condition
    ) {
      throw new DomainError(
        "STALE_COMMAND_PRECONDITION",
        `Beast ${entry.denizenId} does not match the expected current condition and location`,
      );
    }
  }
}

function checkExpectedBeasts(
  state: CampaignStateV5,
  expected: readonly ExpectedBeastLocation[],
  requiredRegionIds: readonly MarinerSeaRegionId[],
): void {
  const relevant = new Set(requiredRegionIds);
  const current = state.mariner.beasts.filter(
    (beast) => beast.location.kind === "sea_region" && relevant.has(beast.location.regionId),
  );
  if (current.length !== expected.length) {
    throw new DomainError(
      "STALE_COMMAND_PRECONDITION",
      "relevant Beast locations do not match the expected current identities",
    );
  }
  for (const entry of expected) {
    const found = current.find((beast) => beast.denizenId === entry.denizenId);
    if (found === undefined || !beastLocationEqual(found.location, entry.location)) {
      throw new DomainError(
        "STALE_COMMAND_PRECONDITION",
        `Beast ${entry.denizenId} does not match the expected current location`,
      );
    }
  }
}

function nestingBeastOnIsle(mariner: MarinerState, boardIsleId: MarinerBoardIsleId): MarinerBeastState | undefined {
  return mariner.beasts.find(
    (beast) =>
      beast.condition === "friendly_nesting" &&
      beast.location.kind === "board_isle" &&
      beast.location.boardIsleId === boardIsleId,
  );
}

function replaceBeast(mariner: MarinerState, updated: MarinerBeastState): MarinerState {
  return {
    ...mariner,
    beasts: mariner.beasts.map((beast) => (beast.denizenId === updated.denizenId ? updated : beast)),
  };
}

function typhoonScaleAt(mariner: MarinerState, regionId: MarinerSeaRegionId): boolean {
  const storms = mariner.seaRegions.find((region) => region.regionId === regionId)?.stormCount ?? 0;
  const hasBeast = mariner.beasts.some(
    (beast) => beast.location.kind === "sea_region" && beast.location.regionId === regionId,
  );
  return storms >= 2 || (storms >= 1 && hasBeast);
}

export function canonicalizeCreateMarinerBeastInput(input: CreateMarinerBeastInput): CreateMarinerBeastInput {
  if (!isValidDenizenId(input.denizenId)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Invalid denizenId: ${input.denizenId}`);
  }
  if (!isValidMarinerSeaRegionId(input.regionId)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Unknown sea region: ${input.regionId}`);
  }
  if (typeof input.element !== "string" || !ELEMENT_ID_SET.has(input.element)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Invalid element: ${String(input.element)}`);
  }
  if (input.definitionId !== null && !isValidMarinerBuiltinBeastId(input.definitionId)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Unknown built-in Beast: ${String(input.definitionId)}`);
  }
  if (input.rampageDestinationSeatId !== null && !isValidPactSeatId(input.rampageDestinationSeatId)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Invalid Rampage destination: ${String(input.rampageDestinationSeatId)}`);
  }
  if (input.rampagingMethodEntryId !== null && !isValidPowerfulDenizenMethodEntryId(input.rampagingMethodEntryId)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Invalid rampagingMethodEntryId: ${input.rampagingMethodEntryId}`);
  }
  return {
    denizenId: input.denizenId,
    name: normalizeText(input.name, "Name"),
    description: optionalText(input.description, "Description"),
    status: normalizeStatus(input.status),
    element: input.element,
    definitionId: input.definitionId,
    regionId: input.regionId,
    expectedStormCounts: input.expectedStormCounts.map((entry) => ({ ...entry })),
    expectedRouteOccupancies: input.expectedRouteOccupancies.map((entry) => ({ ...entry })),
    expectedRelevantBeasts: input.expectedRelevantBeasts.map((entry) => ({ ...entry })),
    rampageDestinationSeatId: input.rampageDestinationSeatId,
    rampagingMethodEntryId: input.rampagingMethodEntryId,
  };
}

export function canonicalizeMoveMarinerStormInput(input: MoveMarinerStormInput): MoveMarinerStormInput {
  if (!isValidMarinerSeaRegionId(input.sourceRegionId)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Unknown source sea region: ${input.sourceRegionId}`);
  }
  if (!isValidMarinerSeaRegionId(input.destinationRegionId)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Unknown destination sea region: ${input.destinationRegionId}`);
  }
  if (typeof input.confirmedNotAgainstPrevailingWind !== "boolean") {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "Wind legality confirmation is required");
  }
  return {
    sourceRegionId: input.sourceRegionId,
    destinationRegionId: input.destinationRegionId,
    confirmedNotAgainstPrevailingWind: input.confirmedNotAgainstPrevailingWind,
    expectedStormCounts: input.expectedStormCounts.map((entry) => ({ ...entry })),
    expectedRouteOccupancies: input.expectedRouteOccupancies.map((entry) => ({ ...entry })),
    expectedRelevantBeasts: input.expectedRelevantBeasts.map((entry) => ({ ...entry })),
  };
}

export function canonicalizeMoveMarinerShipInput(input: MoveMarinerShipInput): MoveMarinerShipInput {
  if (!isValidMarinerBoardIsleId(input.sourceIsleId)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Unknown board Isle: ${input.sourceIsleId}`);
  }
  if (!isValidMarinerRouteId(input.sourceRouteId)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Unknown source Route: ${input.sourceRouteId}`);
  }
  if (!isValidMarinerRouteId(input.destinationRouteId)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Unknown destination Route: ${input.destinationRouteId}`);
  }
  return {
    sourceIsleId: input.sourceIsleId,
    sourceRouteId: input.sourceRouteId,
    destinationRouteId: input.destinationRouteId,
    destinationToward: input.destinationToward,
    expectedSourceOccupancy: input.expectedSourceOccupancy,
    expectedDestinationOccupancy: input.expectedDestinationOccupancy,
    expectedStormCounts: input.expectedStormCounts.map((entry) => ({ ...entry })),
    expectedRouteOccupancies: input.expectedRouteOccupancies.map((entry) => ({ ...entry })),
    expectedRelevantBeasts: input.expectedRelevantBeasts.map((entry) => ({ ...entry })),
    rampageResolutions: input.rampageResolutions.map((entry) => ({ ...entry })),
  };
}

export function canonicalizeCreateMarinerShipInput(input: CreateMarinerShipInput): CreateMarinerShipInput {
  if (!isValidMarinerBoardIsleId(input.sourceIsleId)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Unknown board Isle: ${input.sourceIsleId}`);
  }
  if (!isValidMarinerRouteId(input.targetRouteId)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Unknown target Route: ${input.targetRouteId}`);
  }
  return {
    sourceIsleId: input.sourceIsleId,
    targetRouteId: input.targetRouteId,
    expectedTargetOccupancy: input.expectedTargetOccupancy,
    expectedStormCounts: input.expectedStormCounts.map((entry) => ({ ...entry })),
    expectedRouteOccupancies: input.expectedRouteOccupancies.map((entry) => ({ ...entry })),
    expectedRelevantBeasts: input.expectedRelevantBeasts.map((entry) => ({ ...entry })),
    rampageResolutions: input.rampageResolutions.map((entry) => ({ ...entry })),
  };
}

export function canonicalizeMoveMarinerBeastInput(input: MoveMarinerBeastInput): MoveMarinerBeastInput {
  if (!isValidDenizenId(input.denizenId)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Invalid denizenId: ${input.denizenId}`);
  }
  if (!isValidMarinerSeaRegionId(input.sourceRegionId)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Unknown source sea region: ${input.sourceRegionId}`);
  }
  if (!isValidMarinerSeaRegionId(input.destinationRegionId)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Unknown destination sea region: ${input.destinationRegionId}`);
  }
  if (input.rampageResolution !== null && !isValidDenizenId(input.rampageResolution.denizenId)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Invalid Rampage resolution denizenId: ${input.rampageResolution.denizenId}`);
  }
  if (
    input.rampageResolution !== null
    && input.rampageResolution.destinationSeatId !== undefined
    && !isValidPactSeatId(input.rampageResolution.destinationSeatId)
  ) {
    throw new DomainError(
      "INVALID_CAMPAIGN_STATE",
      `Invalid Rampage destination: ${String(input.rampageResolution.destinationSeatId)}`,
    );
  }
  return {
    denizenId: input.denizenId,
    sourceRegionId: input.sourceRegionId,
    destinationRegionId: input.destinationRegionId,
    expectedBeast: { ...input.expectedBeast },
    expectedStormCounts: input.expectedStormCounts.map((entry) => ({ ...entry })),
    expectedRouteOccupancies: input.expectedRouteOccupancies.map((entry) => ({ ...entry })),
    expectedRelevantBeasts: input.expectedRelevantBeasts.map((entry) => ({ ...entry })),
    rampageResolution: input.rampageResolution === null ? null : { ...input.rampageResolution },
  };
}

export function canonicalizeNestMarinerBeastInput(input: NestMarinerBeastInput): NestMarinerBeastInput {
  if (!isValidDenizenId(input.denizenId)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Invalid denizenId: ${input.denizenId}`);
  }
  if (!isValidMarinerBoardIsleId(input.boardIsleId)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Unknown board Isle: ${input.boardIsleId}`);
  }
  return {
    ...input,
    expectedMarket: input.expectedMarket.present
      ? { present: true, rarity: input.expectedMarket.rarity }
      : { present: false },
  };
}

export function canonicalizeRecordMarinerRavageResultInput(
  input: RecordMarinerRavageResultInput,
): RecordMarinerRavageResultInput {
  if (!isValidMarinerBoardIsleId(input.boardIsleId)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Unknown board Isle: ${input.boardIsleId}`);
  }
  if (input.rampageDestinationSeatId !== null && !isValidPactSeatId(input.rampageDestinationSeatId)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Invalid Rampage destination: ${String(input.rampageDestinationSeatId)}`);
  }
  if (input.rampagingMethodEntryId !== null && !isValidPowerfulDenizenMethodEntryId(input.rampagingMethodEntryId)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Invalid rampagingMethodEntryId: ${input.rampagingMethodEntryId}`);
  }
  return {
    ...input,
    expectedMarket: input.expectedMarket.present
      ? { present: true, rarity: input.expectedMarket.rarity }
      : { present: false },
  };
}

export function applyCreateMarinerBeast(
  state: CampaignStateV5,
  rawInput: CreateMarinerBeastInput,
): MarinerOperabilityTransitionResult {
  const input = canonicalizeCreateMarinerBeastInput(rawInput);
  const current = requireInitialized(state);
  if (input.definitionId !== null) {
    const definition = BEAST_DEFINITION_BY_ID.get(input.definitionId);
    if (definition === undefined || definition.element !== input.element) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", "built-in Beast Element does not match definition");
    }
  }
  const requiredRegions = relevantSeaRegions(input.regionId);
  const requiredRoutes = relevantBoundingAndSharedRoutes(input.regionId);
  checkExpectedStorms(state, input.expectedStormCounts, requiredRegions);
  checkExpectedRoutes(state, input.expectedRouteOccupancies, requiredRoutes);
  checkExpectedBeasts(state, input.expectedRelevantBeasts, requiredRegions);
  const occupyingBeast = current.beasts.find(
    (beast) => beast.location.kind === "sea_region" && beast.location.regionId === input.regionId,
  );
  if (occupyingBeast !== undefined) {
    throw new DomainError(
      "INVALID_CAMPAIGN_STATE",
      `Target Sea or Horizon already has a Beast located there: ${occupyingBeast.denizenId}`,
    );
  }

  const created = applyCreateDenizenV5Candidate(state, {
    denizenId: input.denizenId,
    name: input.name,
    representation: "individual",
    description: input.description,
  });
  const withProfile = applyCreatePowerfulDenizenProfile(created.nextState, {
    denizenId: input.denizenId,
    taxonomies: [{ kind: "builtin", taxonomyId: "beast" }],
    status: input.status,
    goal: null,
  }).nextState;

  const arrived: MarinerBeastState = {
    denizenId: input.denizenId,
    element: input.element,
    definitionId: input.definitionId,
    condition: "distrusting",
    location: { kind: "sea_region", regionId: input.regionId },
  };
  let mariner: MarinerState = { ...withProfile.mariner, beasts: [...current.beasts, arrived] };
  const hazards = applyImmediateShippingHazards(
    mariner.routes,
    immediateHazardRouteIdsCausedBy(mariner, { focusRegionIds: [input.regionId] }),
  );
  mariner = { ...mariner, routes: [...hazards.routes] };

  let working = { ...withProfile, mariner };
  let condition: MarinerBeastCondition = "distrusting";
  let location: MarinerBeastLocation = arrived.location;
  let rampageDestinationSeatId: PactSeatId | null = null;
  if (beastIsEntirelySurrounded(input.regionId, mariner.routes)) {
    rampageDestinationSeatId = requireNonMarinerSeat(input.rampageDestinationSeatId, "Create Beast Rampage");
    working = ensureRampagingMethod(working, input.denizenId, input.rampagingMethodEntryId);
    condition = "rampaging";
    location = { kind: "other_domain", seatId: rampageDestinationSeatId };
    mariner = replaceBeast(working.mariner, { ...arrived, condition, location });
    working = { ...working, mariner };
  }

  const denizen = working.world.denizens.find((candidate) => candidate.denizenId === input.denizenId);
  return commit(working, [{
    type: "mariner_beast_created",
    version: 1,
    data: {
      denizenId: input.denizenId,
      denizenName: denizen?.name ?? input.name,
      regionId: input.regionId,
      condition,
      element: input.element,
      definitionId: input.definitionId,
      destroyedRouteIds: [...hazards.destroyedRouteIds],
      rampageDestinationSeatId,
    },
  }]);
}

export function applyMoveMarinerStorm(
  state: CampaignStateV5,
  rawInput: MoveMarinerStormInput,
): MarinerOperabilityTransitionResult {
  const input = canonicalizeMoveMarinerStormInput(rawInput);
  const current = requireInitialized(state);
  if (!input.confirmedNotAgainstPrevailingWind) {
    throw new DomainError(
      "INVALID_CAMPAIGN_STATE",
      "Record Guided Storm Move requires confirmation that the move is not against the actual prevailing Wind",
    );
  }
  if (input.sourceRegionId === input.destinationRegionId) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "Storm source and destination must differ");
  }
  const sourceDef = seaRegionDefinition(input.sourceRegionId);
  if (sourceDef === undefined || !sourceDef.adjacentRegionIds.includes(input.destinationRegionId)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "Destination is not an adjacent sea or Horizon region");
  }
  const requiredRegions = [
    ...new Set([input.sourceRegionId, ...relevantSeaRegions(input.destinationRegionId)]),
  ];
  const requiredRoutes = relevantBoundingAndSharedRoutes(input.destinationRegionId);
  checkExpectedStorms(state, input.expectedStormCounts, requiredRegions);
  checkExpectedRoutes(state, input.expectedRouteOccupancies, requiredRoutes);
  checkExpectedBeasts(state, input.expectedRelevantBeasts, requiredRegions);

  const source = current.seaRegions.find((region) => region.regionId === input.sourceRegionId);
  if (source === undefined || source.stormCount < 1) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "Source region does not currently have a Storm to move");
  }

  const seaRegions = current.seaRegions.map((region) => {
    if (region.regionId === input.sourceRegionId) {
      return { ...region, stormCount: region.stormCount - 1 };
    }
    if (region.regionId === input.destinationRegionId) {
      return { ...region, stormCount: region.stormCount + 1 };
    }
    return region;
  });
  let mariner: MarinerState = { ...current, seaRegions };
  const hazards = applyImmediateShippingHazards(
    mariner.routes,
    immediateHazardRouteIdsCausedBy(mariner, { focusRegionIds: [input.destinationRegionId] }),
  );
  mariner = { ...mariner, routes: [...hazards.routes] };
  return commit({ ...state, mariner }, [{
    type: "mariner_storm_moved",
    version: 1,
    data: {
      sourceRegionId: input.sourceRegionId,
      destinationRegionId: input.destinationRegionId,
      destroyedRouteIds: [...hazards.destroyedRouteIds],
      typhoonScaleAtDestination: typhoonScaleAt(mariner, input.destinationRegionId),
    },
  }]);
}

export function applyMoveMarinerShip(
  state: CampaignStateV5,
  rawInput: MoveMarinerShipInput,
): MarinerOperabilityTransitionResult {
  const input = canonicalizeMoveMarinerShipInput(rawInput);
  const current = requireInitialized(state);
  const sourceDef = marinerRouteDefinition(input.sourceRouteId);
  const destDef = marinerRouteDefinition(input.destinationRouteId);
  if (sourceDef === undefined || destDef === undefined) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "Unknown Route");
  }
  const sourceIsleEndpoint: MarinerRouteEndpoint = { kind: "board_isle", boardIsleId: input.sourceIsleId };
  if (!marinerRouteHasEndpoint(sourceDef, sourceIsleEndpoint)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "Source Route must have the selected Isle as an endpoint");
  }
  if (input.sourceRouteId === input.destinationRouteId) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "Source and destination Routes must be different");
  }
  const sourceRoute = current.routes.find((route) => route.routeId === input.sourceRouteId);
  const destRoute = current.routes.find((route) => route.routeId === input.destinationRouteId);
  if (sourceRoute === undefined || destRoute === undefined) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "Unknown Route");
  }
  if (!occupancyEqual(sourceRoute.occupancy, input.expectedSourceOccupancy)) {
    throw new DomainError(
      "STALE_COMMAND_PRECONDITION",
      `occupancy for ${input.sourceRouteId} does not match the expected current value`,
    );
  }
  if (!occupancyEqual(destRoute.occupancy, input.expectedDestinationOccupancy)) {
    throw new DomainError(
      "STALE_COMMAND_PRECONDITION",
      `occupancy for ${input.destinationRouteId} does not match the expected current value`,
    );
  }
  if (sourceRoute.occupancy.kind !== "ship" && sourceRoute.occupancy.kind !== "raider") {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "Source Route must currently contain a Ship or Raider");
  }
  if (destRoute.occupancy.kind !== "empty") {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "Destination Route must be empty");
  }

  const destRegions = MARINER_SEA_REGION_DEFINITIONS
    .filter((definition) =>
      definition.boundingRouteIds.includes(input.destinationRouteId as MarinerRouteId)
      || definition.boundingRouteIds.includes(input.sourceRouteId as MarinerRouteId),
    )
    .map((definition) => definition.regionId);
  const requiredRegions = [...new Set(destRegions.flatMap((regionId) => relevantSeaRegions(regionId)))];
  const destCandidateRegions = seaRegionIdsBoundedByRoute(input.destinationRouteId);
  const requiredRoutes = [...new Set([
    input.sourceRouteId,
    input.destinationRouteId,
    ...destCandidateRegions.flatMap((regionId) => seaRegionDefinition(regionId)?.boundingRouteIds ?? []),
  ])];
  checkExpectedStorms(state, input.expectedStormCounts, requiredRegions);
  checkExpectedRoutes(state, input.expectedRouteOccupancies, requiredRoutes);
  checkExpectedBeastStates(state, input.expectedRelevantBeasts, requiredRegions);

  let transferred: MarinerRouteOccupancy;
  if (sourceRoute.occupancy.kind === "ship") {
    if (input.destinationToward !== null) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", "A normal Ship move must not include a Raider toward");
    }
    transferred = { kind: "ship" };
  } else {
    if (input.destinationToward === null) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", "Raider move requires an explicit destination toward endpoint");
    }
    if (!marinerRouteHasEndpoint(destDef, input.destinationToward)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", "Raider toward is not an endpoint of the destination Route");
    }
    transferred = { kind: "raider", toward: input.destinationToward };
  }

  let routes = current.routes.map((route) => {
    if (route.routeId === input.sourceRouteId) {
      return { ...route, occupancy: { kind: "empty" as const } };
    }
    if (route.routeId === input.destinationRouteId) {
      return { ...route, occupancy: transferred };
    }
    return route;
  });
  const transferredBoard: MarinerState = { ...current, routes };
  let immediatelyDestroyed = false;
  if (isRouteUnderImmediateHazard(input.destinationRouteId as MarinerRouteId, transferredBoard)) {
    routes = routes.map((route) => (
      route.routeId === input.destinationRouteId ? { ...route, occupancy: { kind: "empty" as const } } : route
    ));
    immediatelyDestroyed = true;
  }
  const postAction: MarinerState = { ...current, routes };
  const { working, rampagedBeasts } = resolveShipCausedRampages(
    state,
    current,
    postAction,
    immediatelyDestroyed,
    destCandidateRegions,
    input.rampageResolutions,
  );
  return commit(working, [{
    type: "mariner_ship_moved",
    version: 1,
    data: {
      sourceIsleId: input.sourceIsleId,
      sourceRouteId: input.sourceRouteId as MarinerRouteId,
      destinationRouteId: input.destinationRouteId as MarinerRouteId,
      occupancyKind: transferred.kind,
      toward: transferred.kind === "raider" ? transferred.toward : null,
      immediatelyDestroyed,
      rampagedBeasts,
    },
  }]);
}

function resolveShipCausedRampages(
  state: CampaignStateV5,
  preAction: MarinerState,
  postAction: MarinerState,
  immediatelyDestroyed: boolean,
  destCandidateRegions: readonly MarinerSeaRegionId[],
  resolutions: readonly MarinerRampageResolution[],
): { working: CampaignStateV5; rampagedBeasts: readonly { denizenId: DenizenId; destinationSeatId: PactSeatId }[] } {
  const newlyTrapped = immediatelyDestroyed
    ? []
    : newlyTrappedDistrustingBeastIds(preAction, postAction, destCandidateRegions);
  const accepted = requireExactMarinerRampageResolutions(newlyTrapped, resolutions);
  return {
    working: applyMarinerRampageResolutions({ ...state, mariner: postAction }, accepted),
    rampagedBeasts: accepted.map((resolution) => ({
      denizenId: resolution.denizenId,
      destinationSeatId: resolution.destinationSeatId,
    })),
  };
}

export function applyCreateMarinerShip(
  state: CampaignStateV5,
  rawInput: CreateMarinerShipInput,
): MarinerOperabilityTransitionResult {
  const input = canonicalizeCreateMarinerShipInput(rawInput);
  const current = requireInitialized(state);
  const targetDef = marinerRouteDefinition(input.targetRouteId);
  if (targetDef === undefined) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "Unknown Route");
  }
  const sourceIsleEndpoint: MarinerRouteEndpoint = { kind: "board_isle", boardIsleId: input.sourceIsleId };
  if (!marinerRouteHasEndpoint(targetDef, sourceIsleEndpoint)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "Target Route must have the selected Isle as an endpoint");
  }
  const targetRoute = current.routes.find((route) => route.routeId === input.targetRouteId);
  if (targetRoute === undefined) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "Unknown Route");
  }
  if (!occupancyEqual(targetRoute.occupancy, input.expectedTargetOccupancy)) {
    throw new DomainError(
      "STALE_COMMAND_PRECONDITION",
      `occupancy for ${input.targetRouteId} does not match the expected current value`,
    );
  }
  if (targetRoute.occupancy.kind !== "empty") {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "Target Route must be empty");
  }

  const destCandidateRegions = seaRegionIdsBoundedByRoute(input.targetRouteId);
  const destRegions = destCandidateRegions;
  const requiredRegions = [...new Set(destRegions.flatMap((regionId) => relevantSeaRegions(regionId)))];
  const requiredRoutes = [...new Set([
    input.targetRouteId,
    ...destCandidateRegions.flatMap((regionId) => seaRegionDefinition(regionId)?.boundingRouteIds ?? []),
  ])];
  checkExpectedStorms(state, input.expectedStormCounts, requiredRegions);
  checkExpectedRoutes(state, input.expectedRouteOccupancies, requiredRoutes);
  checkExpectedBeastStates(state, input.expectedRelevantBeasts, requiredRegions);

  let routes = current.routes.map((route) => (
    route.routeId === input.targetRouteId ? { ...route, occupancy: { kind: "ship" as const } } : route
  ));
  const placedBoard: MarinerState = { ...current, routes };
  let immediatelyDestroyed = false;
  if (isRouteUnderImmediateHazard(input.targetRouteId as MarinerRouteId, placedBoard)) {
    routes = routes.map((route) => (
      route.routeId === input.targetRouteId ? { ...route, occupancy: { kind: "empty" as const } } : route
    ));
    immediatelyDestroyed = true;
  }
  const postAction: MarinerState = { ...current, routes };
  const { working, rampagedBeasts } = resolveShipCausedRampages(
    state,
    current,
    postAction,
    immediatelyDestroyed,
    destCandidateRegions,
    input.rampageResolutions,
  );
  return commit(working, [{
    type: "mariner_ship_created",
    version: 1,
    data: {
      sourceIsleId: input.sourceIsleId,
      targetRouteId: input.targetRouteId as MarinerRouteId,
      immediatelyDestroyed,
      rampagedBeasts,
    },
  }]);
}

export function applyMoveMarinerBeast(
  state: CampaignStateV5,
  rawInput: MoveMarinerBeastInput,
): MarinerOperabilityTransitionResult {
  const input = canonicalizeMoveMarinerBeastInput(rawInput);
  const current = requireInitialized(state);
  const beast = current.beasts.find((candidate) => candidate.denizenId === input.denizenId);
  if (beast === undefined) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Mariner Beast not found: ${input.denizenId}`);
  }
  if (
    beast.condition !== input.expectedBeast.condition
    || !beastLocationEqual(beast.location, input.expectedBeast.location)
    || beast.denizenId !== input.expectedBeast.denizenId
  ) {
    throw new DomainError(
      "STALE_COMMAND_PRECONDITION",
      `Beast ${input.denizenId} does not match the expected current condition and location`,
    );
  }
  const requiredRegions = [...new Set([
    input.sourceRegionId,
    ...relevantSeaRegions(input.destinationRegionId),
  ])];
  const requiredRoutes = relevantBoundingAndSharedRoutes(input.destinationRegionId);
  checkExpectedStorms(state, input.expectedStormCounts, requiredRegions);
  checkExpectedRoutes(state, input.expectedRouteOccupancies, requiredRoutes);
  checkExpectedBeastStates(state, input.expectedRelevantBeasts, requiredRegions);
  if (beast.condition !== "distrusting") {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "Move Distrusting Beast requires a Distrusting Beast");
  }
  if (beast.location.kind !== "sea_region" || beast.location.regionId !== input.sourceRegionId) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "Beast is not currently in the supplied source Sea or Horizon");
  }
  if (input.sourceRegionId === input.destinationRegionId) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "Beast source and destination must differ");
  }
  const sourceDef = seaRegionDefinition(input.sourceRegionId);
  if (sourceDef === undefined || !sourceDef.adjacentRegionIds.includes(input.destinationRegionId)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "Destination is not an adjacent sea or Horizon region");
  }

  const moved: MarinerBeastState = {
    ...beast,
    condition: "distrusting",
    location: { kind: "sea_region", regionId: input.destinationRegionId },
  };
  let mariner: MarinerState = replaceBeast(current, moved);
  const hazards = applyImmediateShippingHazards(
    mariner.routes,
    immediateHazardRouteIdsCausedBy(mariner, { focusRegionIds: [input.destinationRegionId] }),
  );
  mariner = { ...mariner, routes: [...hazards.routes] };
  let working: CampaignStateV5 = { ...state, mariner };
  let rampaged = false;
  let rampageDestinationSeatId: PactSeatId | null = null;
  if (beastIsEntirelySurrounded(input.destinationRegionId, mariner.routes)) {
    if (input.rampageResolution === null || input.rampageResolution.denizenId !== input.denizenId) {
      throw new DomainError(
        "INVALID_CAMPAIGN_STATE",
        "Surrounded Beast move requires an exact Rampage resolution for the moved Beast",
      );
    }
    const accepted = requireExactMarinerRampageResolutions([input.denizenId], [input.rampageResolution]);
    working = applyMarinerRampageResolutions(working, accepted);
    rampaged = true;
    rampageDestinationSeatId = accepted[0]!.destinationSeatId;
  } else if (input.rampageResolution !== null) {
    throw new DomainError(
      "INVALID_CAMPAIGN_STATE",
      "Beast is not surrounded after immediate hazards; Rampage resolution must be absent",
    );
  }

  return commit(working, [{
    type: "mariner_beast_moved",
    version: 1,
    data: {
      denizenId: input.denizenId,
      sourceRegionId: input.sourceRegionId,
      destinationRegionId: input.destinationRegionId,
      destroyedRouteIds: [...hazards.destroyedRouteIds],
      rampaged,
      rampageDestinationSeatId,
    },
  }]);
}

export function applyNestMarinerBeast(
  state: CampaignStateV5,
  rawInput: NestMarinerBeastInput,
): MarinerOperabilityTransitionResult {
  const input = canonicalizeNestMarinerBeastInput(rawInput);
  const current = requireInitialized(state);
  const beast = current.beasts.find((candidate) => candidate.denizenId === input.denizenId);
  if (beast === undefined) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Mariner Beast not found: ${input.denizenId}`);
  }
  if (beast.condition !== input.expectedBeastCondition || !beastLocationEqual(beast.location, input.expectedBeastLocation)) {
    throw new DomainError(
      "STALE_COMMAND_PRECONDITION",
      `Mariner Beast ${input.denizenId} does not match the expected current state`,
    );
  }
  const isle = current.boardIsles.find((candidate) => candidate.boardIsleId === input.boardIsleId);
  if (isle === undefined) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Unknown board Isle: ${input.boardIsleId}`);
  }
  if (!marketEqual(isle.market, input.expectedMarket)) {
    throw new DomainError(
      "STALE_COMMAND_PRECONDITION",
      `market for ${input.boardIsleId} does not match the expected current value`,
    );
  }
  if (isle.ravageStormCount !== input.expectedRavageStormCount) {
    throw new DomainError(
      "STALE_COMMAND_PRECONDITION",
      `ravageStormCount: expected "${input.expectedRavageStormCount}" but current is "${isle.ravageStormCount}"`,
    );
  }
  const existingNest = nestingBeastOnIsle(current, input.boardIsleId);
  if ((existingNest?.denizenId ?? null) !== input.expectedNestingBeastDenizenId) {
    throw new DomainError(
      "STALE_COMMAND_PRECONDITION",
      `Nesting Beast on ${input.boardIsleId} does not match the expected current identity`,
    );
  }
  if (beast.condition !== "distrusting") {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "Help Beast Nest requires a Distrusting Beast");
  }
  if (beast.location.kind !== "sea_region") {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "Help Beast Nest requires a Beast currently in a Sea or Horizon region");
  }
  const region = seaRegionDefinition(beast.location.regionId);
  if (region === undefined || !region.adjacentBoardIsleIds.includes(input.boardIsleId)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "Chosen Isle is not adjacent to the Beast's current region");
  }
  if (isle.market.present) {
    throw new DomainError(
      "INVALID_CAMPAIGN_STATE",
      "Help Beast Nest cannot target an Isle that has a Market; the table must resolve or remove the Market separately",
    );
  }
  if (isle.ravageStormCount > 0) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "Help Beast Nest cannot target a Ravaged Isle");
  }
  if (existingNest !== undefined) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "Chosen Isle already has a Nesting Beast");
  }

  const updated: MarinerBeastState = {
    ...beast,
    condition: "friendly_nesting",
    location: { kind: "board_isle", boardIsleId: input.boardIsleId },
  };
  return commit({ ...state, mariner: replaceBeast(current, updated) }, [{
    type: "mariner_beast_nested",
    version: 1,
    data: {
      denizenId: input.denizenId,
      boardIsleId: input.boardIsleId,
      previousLocation: beast.location,
    },
  }]);
}

export function applyRecordMarinerRavageResult(
  state: CampaignStateV5,
  rawInput: RecordMarinerRavageResultInput,
): MarinerOperabilityTransitionResult {
  const input = canonicalizeRecordMarinerRavageResultInput(rawInput);
  const current = requireInitialized(state);
  const isle = current.boardIsles.find((candidate) => candidate.boardIsleId === input.boardIsleId);
  if (isle === undefined) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Unknown board Isle: ${input.boardIsleId}`);
  }
  if (!marketEqual(isle.market, input.expectedMarket)) {
    throw new DomainError(
      "STALE_COMMAND_PRECONDITION",
      `market for ${input.boardIsleId} does not match the expected current value`,
    );
  }
  if (isle.ravageStormCount !== input.expectedRavageStormCount) {
    throw new DomainError(
      "STALE_COMMAND_PRECONDITION",
      `ravageStormCount: expected "${input.expectedRavageStormCount}" but current is "${isle.ravageStormCount}"`,
    );
  }
  if (isle.ravageStormCount > 0) {
    throw new DomainError(
      "INVALID_CAMPAIGN_STATE",
      "Record Ravage Result cannot be used on an already-Ravaged Isle; repeat-Ravage semantics are unresolved",
    );
  }
  const nesting = nestingBeastOnIsle(current, input.boardIsleId);
  if (input.expectedNestingBeast === null) {
    if (nesting !== undefined) {
      throw new DomainError(
        "STALE_COMMAND_PRECONDITION",
        `Nesting Beast on ${input.boardIsleId} does not match the expected current identity`,
      );
    }
  } else if (
    nesting === undefined
    || nesting.denizenId !== input.expectedNestingBeast.denizenId
    || nesting.condition !== input.expectedNestingBeast.condition
    || !beastLocationEqual(nesting.location, input.expectedNestingBeast.location)
  ) {
    throw new DomainError(
      "STALE_COMMAND_PRECONDITION",
      `Nesting Beast on ${input.boardIsleId} does not match the expected current state`,
    );
  }
  if (nesting !== undefined) {
    const profile = state.world.denizens.find((d) => d.denizenId === nesting.denizenId)?.powerfulProfile ?? null;
    if (profile === null) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", "Nesting Beast requires a Powerful profile");
    }
    if (!structurallyEqual(profile.status, input.expectedPowerfulStatus) || profile.goal !== input.expectedPowerfulGoal) {
      throw new DomainError(
        "STALE_COMMAND_PRECONDITION",
        "Powerful profile does not match the expected current state",
      );
    }
    const hasMethod = profileHasStandardRampagingMethod(profile);
    if (hasMethod !== input.expectedHasRampagingMethod) {
      throw new DomainError(
        "STALE_COMMAND_PRECONDITION",
        "Rampaging Method presence does not match the expected current state",
      );
    }
  }

  let boardIsles = current.boardIsles;
  let outcome: "market_absorbed" | "isle_ravaged";
  let isleBecameRavaged = false;
  if (isle.market.present) {
    boardIsles = current.boardIsles.map((entry) => (
      entry.boardIsleId === input.boardIsleId ? { ...entry, market: { present: false as const } } : entry
    ));
    outcome = "market_absorbed";
  } else {
    boardIsles = current.boardIsles.map((entry) => (
      entry.boardIsleId === input.boardIsleId ? { ...entry, ravageStormCount: 6 } : entry
    ));
    outcome = "isle_ravaged";
    isleBecameRavaged = true;
  }

  let working: CampaignStateV5 = { ...state, mariner: { ...current, boardIsles } };
  let destroyedNestingBeastDenizenId: DenizenId | null = null;
  let rampageDestinationSeatId: PactSeatId | null = null;
  if (nesting !== undefined) {
    rampageDestinationSeatId = requireNonMarinerSeat(input.rampageDestinationSeatId, "Ravage Nest Rampage");
    working = ensureRampagingMethod(working, nesting.denizenId, input.rampagingMethodEntryId);
    const updated: MarinerBeastState = {
      ...nesting,
      condition: "rampaging",
      location: { kind: "other_domain", seatId: rampageDestinationSeatId },
    };
    working = { ...working, mariner: replaceBeast(working.mariner, updated) };
    destroyedNestingBeastDenizenId = nesting.denizenId;
  }

  return commit(working, [{
    type: "mariner_ravage_result_recorded",
    version: 1,
    data: {
      boardIsleId: input.boardIsleId,
      outcome,
      isleBecameRavaged,
      destroyedNestingBeastDenizenId,
      rampageDestinationSeatId,
    },
  }]);
}
