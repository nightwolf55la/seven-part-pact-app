import type { CampaignStateV5 } from "./campaign-state";
import type { DenizenId, IsleId, PlaceId } from "./ids";
import { isValidDenizenId, isValidIsleId, isValidPlaceId } from "./ids";
import { DomainError } from "./errors";
import type { ExpectedFieldChange } from "./world-subject-transitions";
import type { MarinerEvent } from "./events";
import type {
  MarinerArrangementId,
  MarinerBoardIsleId,
  MarinerLawOfSeaId,
  MarinerRouteId,
  MarinerSeaRegionId,
} from "./mariner-catalogs";
import {
  MARINER_BOARD_ISLE_IDS,
  MARINER_ROUTE_DEFINITIONS,
  isValidMarinerArrangementId,
  isValidMarinerBoardIsleId,
  isValidMarinerLawOfSeaId,
  isValidMarinerRouteId,
  isValidMarinerSeaRegionId,
  marinerArrangementDefinition,
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
import { buildInitializedDefaultMarinerState } from "./mariner-state";
import { validateMarinerReferenceIntegrity } from "./mariner-validation";

export interface MarinerTransitionResult {
  readonly nextState: CampaignStateV5;
  readonly events: readonly MarinerEvent[];
}

export interface MarinerIsleBinding {
  readonly boardIsleId: MarinerBoardIsleId;
  readonly worldIsleId: IsleId;
}

export interface MarinerRarityDescription {
  readonly boardIsleId: MarinerBoardIsleId;
  readonly description: string;
}

export interface InitializeMarinerInput {
  readonly arrangementId: MarinerArrangementId;
  readonly shipPlaceId: PlaceId;
  readonly selectedLawOfSeaIds: readonly MarinerLawOfSeaId[];
  readonly isleBindings: readonly MarinerIsleBinding[];
  readonly arrangementBeasts: readonly MarinerBeastState[];
  readonly rarityDescriptions: readonly MarinerRarityDescription[];
}

export interface UpdateMarinerBeastFields {
  readonly element?: ExpectedFieldChange<MarinerBeastState["element"]>;
  readonly definitionId?: ExpectedFieldChange<MarinerBeastState["definitionId"]>;
  readonly condition?: ExpectedFieldChange<MarinerBeastCondition>;
  readonly location?: ExpectedFieldChange<MarinerBeastLocation>;
}

const MAX_TEXT_LENGTH = 8000;

function replaceMariner(state: CampaignStateV5, mariner: MarinerState): CampaignStateV5 {
  return { ...state, mariner };
}

function commitMariner(
  state: CampaignStateV5,
  mariner: MarinerState,
  events: readonly MarinerEvent[],
): MarinerTransitionResult {
  const nextState = replaceMariner(state, mariner);
  validateMarinerReferenceIntegrity(nextState);
  return { nextState, events };
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

function lawIdsEqual(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((id, i) => id === b[i]);
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

function beastEqual(a: MarinerBeastState, b: MarinerBeastState): boolean {
  return (
    a.denizenId === b.denizenId &&
    a.element === b.element &&
    a.definitionId === b.definitionId &&
    a.condition === b.condition &&
    beastLocationEqual(a.location, b.location)
  );
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

export function canonicalizeInitializeMarinerInput(
  input: InitializeMarinerInput,
): InitializeMarinerInput {
  return {
    arrangementId: input.arrangementId,
    shipPlaceId: input.shipPlaceId,
    selectedLawOfSeaIds: [...input.selectedLawOfSeaIds],
    isleBindings: [...input.isleBindings]
      .map((binding) => ({ ...binding }))
      .sort(compareBoardIsleId),
    arrangementBeasts: input.arrangementBeasts.map((beast) => ({ ...beast })),
    rarityDescriptions: [...input.rarityDescriptions]
      .map((entry) => ({
        boardIsleId: entry.boardIsleId,
        description: normalizeText(entry.description, "Rarity"),
      }))
      .sort(compareBoardIsleId),
  };
}

export function normalizeMarinerIsleMarket(market: MarinerIsleMarket): MarinerIsleMarket {
  if (market.present === false) {
    if ("rarity" in market && market.rarity !== undefined) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", "Market cannot include rarity without a Market");
    }
    return { present: false };
  }
  return { present: true, rarity: optionalText(market.rarity, "Rarity") };
}

function compareBoardIsleId(a: { boardIsleId: string }, b: { boardIsleId: string }): number {
  if (a.boardIsleId < b.boardIsleId) {
    return -1;
  }
  if (a.boardIsleId > b.boardIsleId) {
    return 1;
  }
  return 0;
}

function requireMobilePlace(state: CampaignStateV5, placeId: PlaceId, label: string): void {
  const place = state.world.places.find((p) => p.placeId === placeId);
  if (place === undefined) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `${label} does not resolve: ${placeId}`);
  }
  if (place.placement.kind !== "mobile") {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `${label} must reference a mobile Place`);
  }
}

function occupancyFromArrangement(
  arrangementId: MarinerArrangementId,
): Partial<Record<MarinerRouteId, MarinerRouteOccupancy>> {
  const arrangement = marinerArrangementDefinition(arrangementId);
  if (arrangement === undefined) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Unknown arrangement: ${arrangementId}`);
  }
  const ships = new Set(arrangement.shipRouteIds);
  const raiders = new Map(arrangement.raiders.map((raider) => [raider.routeId, raider]));
  const occupancy: Partial<Record<MarinerRouteId, MarinerRouteOccupancy>> = {};
  for (const route of MARINER_ROUTE_DEFINITIONS) {
    const raider = raiders.get(route.routeId);
    if (raider !== undefined) {
      occupancy[route.routeId] = { kind: "raider", toward: raider.toward };
    } else if (ships.has(route.routeId)) {
      occupancy[route.routeId] = { kind: "ship" };
    }
  }
  return occupancy;
}

export function applyInitializeMariner(
  state: CampaignStateV5,
  rawInput: InitializeMarinerInput,
): MarinerTransitionResult {
  const input = canonicalizeInitializeMarinerInput(rawInput);
  if (!isExactEmptyMariner(state.mariner)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "Mariner has already been initialized");
  }

  if (!isValidMarinerArrangementId(input.arrangementId)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Unknown arrangement: ${input.arrangementId}`);
  }
  const arrangement = marinerArrangementDefinition(input.arrangementId);
  if (arrangement === undefined) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Unknown arrangement: ${input.arrangementId}`);
  }

  if (!isValidPlaceId(input.shipPlaceId)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Invalid shipPlaceId: ${input.shipPlaceId}`);
  }
  requireMobilePlace(state, input.shipPlaceId, "shipPlaceId");

  const marinerWizardId = state.pactSeats.mariner.wizardId;
  if (marinerWizardId !== null) {
    const wizard = state.wizards.find((w) => w.wizardId === marinerWizardId);
    if (wizard === undefined) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `Mariner seat wizard does not resolve: ${marinerWizardId}`);
    }
    if (wizard.sanctumPlaceId !== input.shipPlaceId) {
      throw new DomainError(
        "INVALID_CAMPAIGN_STATE",
        "Mariner shipPlaceId must already equal the assigned Mariner Wizard's sanctumPlaceId",
      );
    }
  }

  uniqueOrThrow(input.selectedLawOfSeaIds, "selectedLawOfSeaId");
  if (input.selectedLawOfSeaIds.length !== 2) {
    throw new DomainError(
      "INVALID_CAMPAIGN_STATE",
      "Mariner initialization requires choosing exactly two Laws of the Sea",
    );
  }
  for (const lawId of input.selectedLawOfSeaIds) {
    if (!isValidMarinerLawOfSeaId(lawId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `Unknown Law of the Sea id: ${lawId}`);
    }
  }

  if (input.isleBindings.length !== MARINER_BOARD_ISLE_IDS.length) {
    throw new DomainError(
      "INVALID_CAMPAIGN_STATE",
      `Mariner initialization requires a World Isle for each default board Isle (${MARINER_BOARD_ISLE_IDS.length})`,
    );
  }
  uniqueOrThrow(input.isleBindings.map((b) => b.boardIsleId), "board Isle id");
  uniqueOrThrow(input.isleBindings.map((b) => b.worldIsleId), "shared World Isle id");

  const worldIsleIds = {} as Record<MarinerBoardIsleId, IsleId>;
  for (const binding of input.isleBindings) {
    if (!isValidMarinerBoardIsleId(binding.boardIsleId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `Unknown board Isle id: ${binding.boardIsleId}`);
    }
    if (!isValidIsleId(binding.worldIsleId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `Invalid worldIsleId: ${binding.worldIsleId}`);
    }
    if (!state.world.isles.some((isle) => isle.isleId === binding.worldIsleId)) {
      throw new DomainError(
        "INVALID_CAMPAIGN_STATE",
        `worldIsleId does not resolve: ${binding.worldIsleId}`,
      );
    }
    worldIsleIds[binding.boardIsleId] = binding.worldIsleId;
  }
  for (const boardIsleId of MARINER_BOARD_ISLE_IDS) {
    if (worldIsleIds[boardIsleId] === undefined) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `Missing World Isle binding for board Isle ${boardIsleId}`);
    }
  }

  const requiredBeastRegions = [...arrangement.distrustingBeastRegionIds];
  if (input.arrangementBeasts.length !== requiredBeastRegions.length) {
    throw new DomainError(
      "INVALID_CAMPAIGN_STATE",
      `Arrangement ${arrangement.arrangementId} requires exactly ${requiredBeastRegions.length} starting Beast(s)`,
    );
  }
  const remainingRegions = [...requiredBeastRegions];
  for (const beast of input.arrangementBeasts) {
    if (!isValidDenizenId(beast.denizenId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `Invalid arrangement Beast denizenId: ${beast.denizenId}`);
    }
    if (beast.condition !== "distrusting") {
      throw new DomainError("INVALID_CAMPAIGN_STATE", "Arrangement starting Beast must be distrusting");
    }
    if (beast.location.kind !== "sea_region") {
      throw new DomainError(
        "INVALID_CAMPAIGN_STATE",
        "Arrangement starting Beast must occupy the prescribed sea region",
      );
    }
    const regionIndex = remainingRegions.indexOf(beast.location.regionId);
    if (regionIndex === -1) {
      throw new DomainError(
        "INVALID_CAMPAIGN_STATE",
        `Arrangement starting Beast location is not a prescribed region: ${beast.location.regionId}`,
      );
    }
    remainingRegions.splice(regionIndex, 1);
  }

  uniqueOrThrow(input.rarityDescriptions.map((entry) => entry.boardIsleId), "rarity board Isle id");
  const rarityByIsle = new Map<MarinerBoardIsleId, string>();
  for (const entry of input.rarityDescriptions) {
    if (!isValidMarinerBoardIsleId(entry.boardIsleId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `Unknown rarity board Isle id: ${entry.boardIsleId}`);
    }
    if (!arrangement.rarityBoardIsleIds.includes(entry.boardIsleId)) {
      throw new DomainError(
        "INVALID_CAMPAIGN_STATE",
        `Arrangement ${arrangement.arrangementId} does not start with a Rarity on ${entry.boardIsleId}`,
      );
    }
    rarityByIsle.set(entry.boardIsleId, entry.description);
  }
  for (const boardIsleId of arrangement.rarityBoardIsleIds) {
    if (!rarityByIsle.has(boardIsleId)) {
      throw new DomainError(
        "INVALID_CAMPAIGN_STATE",
        `Arrangement ${arrangement.arrangementId} requires a Rarity description for ${boardIsleId}`,
      );
    }
  }

  const boardIsleOverrides: Partial<Record<MarinerBoardIsleId, Partial<MarinerState["boardIsles"][number]>>> = {};
  for (const boardIsleId of MARINER_BOARD_ISLE_IDS) {
    const hasMarket = arrangement.marketBoardIsleIds.includes(boardIsleId);
    const rarity = rarityByIsle.get(boardIsleId) ?? null;
    boardIsleOverrides[boardIsleId] = {
      market: hasMarket ? { present: true, rarity } : { present: false },
      ravageStormCount: arrangement.isleRavageStormCounts[boardIsleId] ?? 0,
    };
  }

  const mariner = buildInitializedDefaultMarinerState({
    shipPlaceId: input.shipPlaceId,
    worldIsleIds,
    selectedLawOfSeaIds: [...input.selectedLawOfSeaIds],
    beasts: input.arrangementBeasts.map((beast) => ({ ...beast })),
    boardIsleOverrides,
    routeOccupancy: occupancyFromArrangement(arrangement.arrangementId),
    seaStormCounts: arrangement.seaStormCounts,
  });

  return commitMariner(state, mariner, [{
    type: "mariner_initialized",
    version: 1,
    data: {
      arrangementId: arrangement.arrangementId,
      shipPlaceId: input.shipPlaceId,
      selectedLawOfSeaIds: [...input.selectedLawOfSeaIds],
      isleBindings: input.isleBindings.map((binding) => ({ ...binding })),
      arrangementBeasts: input.arrangementBeasts.map((beast) => ({ ...beast })),
      rarityDescriptions: input.rarityDescriptions.map((entry) => ({ ...entry })),
      mariner,
    },
  }]);
}

export function applySetMarinerShip(
  state: CampaignStateV5,
  expectedShipPlaceId: PlaceId,
  shipPlaceId: PlaceId,
): MarinerTransitionResult {
  const current = requireInitialized(state);
  if (current.shipPlaceId === null) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "Initialized Mariner must have a ship Place");
  }
  if (current.shipPlaceId !== expectedShipPlaceId) {
    throw new DomainError(
      "STALE_COMMAND_PRECONDITION",
      `shipPlaceId: expected "${expectedShipPlaceId}" but current is "${current.shipPlaceId}"`,
    );
  }
  if (!isValidPlaceId(shipPlaceId)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Invalid shipPlaceId: ${shipPlaceId}`);
  }
  if (current.shipPlaceId === shipPlaceId) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "Update produces no change");
  }
  requireMobilePlace(state, shipPlaceId, "shipPlaceId");
  return commitMariner(state, { ...current, shipPlaceId }, [{
    type: "mariner_ship_changed",
    version: 1,
    data: {
      previousShipPlaceId: current.shipPlaceId,
      newShipPlaceId: shipPlaceId,
    },
  }]);
}

export function applySetSelectedSeaLaws(
  state: CampaignStateV5,
  expectedSelectedLawOfSeaIds: readonly MarinerLawOfSeaId[],
  selectedLawOfSeaIds: readonly MarinerLawOfSeaId[],
): MarinerTransitionResult {
  const current = requireInitialized(state);
  if (!lawIdsEqual(current.selectedLawOfSeaIds, expectedSelectedLawOfSeaIds)) {
    throw new DomainError(
      "STALE_COMMAND_PRECONDITION",
      `selectedLawOfSeaIds: expected "${expectedSelectedLawOfSeaIds.join(",")}" but current is "${current.selectedLawOfSeaIds.join(",")}"`,
    );
  }
  uniqueOrThrow(selectedLawOfSeaIds, "selectedLawOfSeaId");
  for (const lawId of selectedLawOfSeaIds) {
    if (!isValidMarinerLawOfSeaId(lawId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `Unknown Law of the Sea id: ${lawId}`);
    }
  }
  if (lawIdsEqual(current.selectedLawOfSeaIds, selectedLawOfSeaIds)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "Update produces no change");
  }
  return commitMariner(state, { ...current, selectedLawOfSeaIds: [...selectedLawOfSeaIds] }, [{
    type: "mariner_sea_laws_changed",
    version: 1,
    data: {
      previousSelectedLawOfSeaIds: [...current.selectedLawOfSeaIds],
      newSelectedLawOfSeaIds: [...selectedLawOfSeaIds],
    },
  }]);
}

export function applySetMarinerRouteOccupancy(
  state: CampaignStateV5,
  routeId: MarinerRouteId,
  expectedOccupancy: MarinerRouteOccupancy,
  occupancy: MarinerRouteOccupancy,
): MarinerTransitionResult {
  const current = requireInitialized(state);
  if (!isValidMarinerRouteId(routeId)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Unknown Route id: ${routeId}`);
  }
  const idx = current.routes.findIndex((route) => route.routeId === routeId);
  if (idx === -1) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Unknown Route id: ${routeId}`);
  }
  const route = current.routes[idx];
  if (!occupancyEqual(route.occupancy, expectedOccupancy)) {
    throw new DomainError(
      "STALE_COMMAND_PRECONDITION",
      `occupancy for ${routeId} does not match the expected current value`,
    );
  }
  if (occupancy.kind === "raider") {
    const definition = marinerRouteDefinition(routeId);
    if (definition === undefined || !marinerRouteHasEndpoint(definition, occupancy.toward)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `Raider toward is not an endpoint of ${routeId}`);
    }
  } else if (occupancy.kind !== "empty" && occupancy.kind !== "ship") {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Invalid occupancy kind: ${String((occupancy as { kind: unknown }).kind)}`);
  }
  if (occupancyEqual(route.occupancy, occupancy)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "Update produces no change");
  }
  const routes = current.routes.map((entry, i) => (i === idx ? { ...entry, occupancy } : entry));
  return commitMariner(state, { ...current, routes }, [{
    type: "mariner_route_occupancy_changed",
    version: 1,
    data: {
      routeId,
      previousOccupancy: route.occupancy,
      newOccupancy: occupancy,
    },
  }]);
}

export function applySetMarinerSeaStormCount(
  state: CampaignStateV5,
  regionId: MarinerSeaRegionId,
  expectedStormCount: number,
  stormCount: number,
): MarinerTransitionResult {
  const current = requireInitialized(state);
  if (!isValidMarinerSeaRegionId(regionId)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Unknown sea region: ${regionId}`);
  }
  const idx = current.seaRegions.findIndex((region) => region.regionId === regionId);
  if (idx === -1) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Unknown sea region: ${regionId}`);
  }
  const region = current.seaRegions[idx];
  if (region.stormCount !== expectedStormCount) {
    throw new DomainError(
      "STALE_COMMAND_PRECONDITION",
      `stormCount: expected "${expectedStormCount}" but current is "${region.stormCount}"`,
    );
  }
  assertNonNegativeSafeInteger("stormCount", stormCount);
  if (region.stormCount === stormCount) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "Update produces no change");
  }
  const seaRegions = current.seaRegions.map((entry, i) => (
    i === idx ? { ...entry, stormCount } : entry
  ));
  return commitMariner(state, { ...current, seaRegions }, [{
    type: "mariner_sea_storm_count_changed",
    version: 1,
    data: {
      regionId,
      previousStormCount: region.stormCount,
      newStormCount: stormCount,
    },
  }]);
}

export function applySetMarinerIsleMarket(
  state: CampaignStateV5,
  boardIsleId: MarinerBoardIsleId,
  expectedMarket: MarinerIsleMarket,
  market: MarinerIsleMarket,
): MarinerTransitionResult {
  const current = requireInitialized(state);
  if (!isValidMarinerBoardIsleId(boardIsleId)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Unknown board Isle: ${boardIsleId}`);
  }
  const idx = current.boardIsles.findIndex((isle) => isle.boardIsleId === boardIsleId);
  if (idx === -1) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Unknown board Isle: ${boardIsleId}`);
  }
  const isle = current.boardIsles[idx];
  if (!marketEqual(isle.market, expectedMarket)) {
    throw new DomainError(
      "STALE_COMMAND_PRECONDITION",
      `market for ${boardIsleId} does not match the expected current value`,
    );
  }
  const normalized = normalizeMarinerIsleMarket(market);
  if (marketEqual(isle.market, normalized)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "Update produces no change");
  }
  const boardIsles = current.boardIsles.map((entry, i) => (
    i === idx ? { ...entry, market: normalized } : entry
  ));
  return commitMariner(state, { ...current, boardIsles }, [{
    type: "mariner_isle_market_changed",
    version: 1,
    data: {
      boardIsleId,
      previousMarket: isle.market,
      newMarket: normalized,
    },
  }]);
}

export function applySetMarinerIsleRavage(
  state: CampaignStateV5,
  boardIsleId: MarinerBoardIsleId,
  expectedRavageStormCount: number,
  ravageStormCount: number,
): MarinerTransitionResult {
  const current = requireInitialized(state);
  if (!isValidMarinerBoardIsleId(boardIsleId)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Unknown board Isle: ${boardIsleId}`);
  }
  const idx = current.boardIsles.findIndex((isle) => isle.boardIsleId === boardIsleId);
  if (idx === -1) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Unknown board Isle: ${boardIsleId}`);
  }
  const isle = current.boardIsles[idx];
  if (isle.ravageStormCount !== expectedRavageStormCount) {
    throw new DomainError(
      "STALE_COMMAND_PRECONDITION",
      `ravageStormCount: expected "${expectedRavageStormCount}" but current is "${isle.ravageStormCount}"`,
    );
  }
  assertNonNegativeSafeInteger("ravageStormCount", ravageStormCount);
  if (isle.ravageStormCount === ravageStormCount) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "Update produces no change");
  }
  const boardIsles = current.boardIsles.map((entry, i) => (
    i === idx ? { ...entry, ravageStormCount } : entry
  ));
  return commitMariner(state, { ...current, boardIsles }, [{
    type: "mariner_isle_ravage_changed",
    version: 1,
    data: {
      boardIsleId,
      previousRavageStormCount: isle.ravageStormCount,
      newRavageStormCount: ravageStormCount,
    },
  }]);
}

export function applyAddMarinerBeast(
  state: CampaignStateV5,
  beast: MarinerBeastState,
): MarinerTransitionResult {
  const current = requireInitialized(state);
  if (!isValidDenizenId(beast.denizenId)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Invalid denizenId: ${beast.denizenId}`);
  }
  if (current.beasts.some((existing) => existing.denizenId === beast.denizenId)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Denizen is already a Mariner Beast: ${beast.denizenId}`);
  }
  return commitMariner(state, { ...current, beasts: [...current.beasts, beast] }, [{
    type: "mariner_beast_added",
    version: 1,
    data: { beast },
  }]);
}

export function applyUpdateMarinerBeast(
  state: CampaignStateV5,
  denizenId: DenizenId,
  fields: UpdateMarinerBeastFields,
): MarinerTransitionResult {
  const current = requireInitialized(state);
  if (
    fields.element === undefined &&
    fields.definitionId === undefined &&
    fields.condition === undefined &&
    fields.location === undefined
  ) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "Update must specify at least one field");
  }
  const idx = current.beasts.findIndex((beast) => beast.denizenId === denizenId);
  if (idx === -1) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Mariner Beast not found: ${denizenId}`);
  }
  const existing = current.beasts[idx];
  let element = existing.element;
  let definitionId = existing.definitionId;
  let condition = existing.condition;
  let location = existing.location;
  if (fields.element !== undefined) {
    checkPrecondition("element", existing.element, fields.element);
    element = fields.element.value;
  }
  if (fields.definitionId !== undefined) {
    checkPrecondition("definitionId", existing.definitionId, fields.definitionId);
    definitionId = fields.definitionId.value;
  }
  if (fields.condition !== undefined) {
    checkPrecondition("condition", existing.condition, fields.condition);
    condition = fields.condition.value;
  }
  if (fields.location !== undefined) {
    checkPrecondition("location", existing.location, fields.location, beastLocationEqual);
    location = fields.location.value;
  }
  const updated: MarinerBeastState = { denizenId, element, definitionId, condition, location };
  if (beastEqual(existing, updated)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "Update produces no change");
  }
  const beasts = current.beasts.map((beast, i) => (i === idx ? updated : beast));
  return commitMariner(state, { ...current, beasts }, [{
    type: "mariner_beast_updated",
    version: 1,
    data: { previous: existing, updated },
  }]);
}

export function applyRemoveMarinerBeast(
  state: CampaignStateV5,
  denizenId: DenizenId,
  expectedBeast: MarinerBeastState,
): MarinerTransitionResult {
  const current = requireInitialized(state);
  const existing = current.beasts.find((beast) => beast.denizenId === denizenId);
  if (existing === undefined) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Mariner Beast not found: ${denizenId}`);
  }
  if (!beastEqual(existing, expectedBeast)) {
    throw new DomainError(
      "STALE_COMMAND_PRECONDITION",
      `Mariner Beast ${denizenId} does not match the expected current state`,
    );
  }
  const beasts = current.beasts.filter((beast) => beast.denizenId !== denizenId);
  return commitMariner(state, { ...current, beasts }, [{
    type: "mariner_beast_removed",
    version: 1,
    data: { beast: existing },
  }]);
}
