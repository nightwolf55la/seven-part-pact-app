import type { CampaignStateV5 } from "./campaign-state";
import { DomainError } from "./errors";
import { isValidDenizenId, isValidIsleId, isValidPlaceId } from "./ids";
import { ELEMENT_IDS } from "./shared-world";
import type {
  MarinerBoardIsleId,
  MarinerRouteEndpoint,
  MarinerRouteId,
} from "./mariner-catalogs";
import {
  MARINER_BOARD_ISLE_IDS,
  MARINER_BUILTIN_BEAST_DEFINITIONS,
  MARINER_ROUTE_DEFINITIONS,
  MARINER_SEA_REGION_IDS,
  isValidMarinerBoardIsleId,
  isValidMarinerBuiltinBeastId,
  isValidMarinerExternalLandId,
  isValidMarinerLawOfSeaId,
  isValidMarinerRouteId,
  isValidMarinerSeaRegionId,
  marinerRouteDefinition,
  marinerRouteHasEndpoint,
} from "./mariner-catalogs";
import type { MarinerBeastLocation, MarinerIsleMarket, MarinerRouteOccupancy, MarinerState } from "./mariner-state";

const ELEMENT_ID_SET = new Set<string>(ELEMENT_IDS);
const BEAST_CONDITIONS = new Set(["distrusting", "friendly_nesting", "rampaging"]);
const BEAST_DEFINITION_BY_ID = new Map(MARINER_BUILTIN_BEAST_DEFINITIONS.map((d) => [d.id, d]));

function assertNonNegativeSafeInteger(path: string, value: unknown): asserts value is number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `${path} must be a non-negative safe integer`);
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

function isExactEmptyMarinerState(m: Record<string, unknown>): boolean {
  return (
    m.shipPlaceId === null &&
    Array.isArray(m.selectedLawOfSeaIds) &&
    m.selectedLawOfSeaIds.length === 0 &&
    Array.isArray(m.boardIsles) &&
    m.boardIsles.length === 0 &&
    Array.isArray(m.routes) &&
    m.routes.length === 0 &&
    Array.isArray(m.seaRegions) &&
    m.seaRegions.length === 0 &&
    Array.isArray(m.beasts) &&
    m.beasts.length === 0
  );
}

function validateRouteEndpoint(path: string, value: unknown): MarinerRouteEndpoint {
  if (value === null || value === undefined || typeof value !== "object") {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `${path} must be an object`);
  }
  const endpoint = value as Record<string, unknown>;
  if (endpoint.kind === "board_isle") {
    if (typeof endpoint.boardIsleId !== "string" || !isValidMarinerBoardIsleId(endpoint.boardIsleId)) {
      throw new DomainError(
        "INVALID_CAMPAIGN_STATE",
        `${path}.boardIsleId is invalid: ${JSON.stringify(endpoint.boardIsleId)}`,
      );
    }
    return { kind: "board_isle", boardIsleId: endpoint.boardIsleId };
  }
  if (endpoint.kind === "external_land") {
    if (typeof endpoint.externalLandId !== "string" || !isValidMarinerExternalLandId(endpoint.externalLandId)) {
      throw new DomainError(
        "INVALID_CAMPAIGN_STATE",
        `${path}.externalLandId is invalid: ${JSON.stringify(endpoint.externalLandId)}`,
      );
    }
    return { kind: "external_land", externalLandId: endpoint.externalLandId };
  }
  throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.kind is invalid: ${JSON.stringify(endpoint.kind)}`);
}

function validateOccupancy(path: string, value: unknown, routeId: MarinerRouteId): MarinerRouteOccupancy {
  if (value === null || value === undefined || typeof value !== "object") {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `${path} must be an object`);
  }
  const occupancy = value as Record<string, unknown>;
  if (Array.isArray(value)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `${path} must be a single occupancy slot`);
  }
  if (occupancy.kind === "empty") {
    if ("toward" in occupancy && occupancy.toward !== undefined) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path} empty occupancy must not include toward`);
    }
    return { kind: "empty" };
  }
  if (occupancy.kind === "ship") {
    if ("toward" in occupancy && occupancy.toward !== undefined) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path} ship occupancy must not include toward`);
    }
    return { kind: "ship" };
  }
  if (occupancy.kind === "raider") {
    const toward = validateRouteEndpoint(`${path}.toward`, occupancy.toward);
    const definition = marinerRouteDefinition(routeId);
    if (definition === undefined || !marinerRouteHasEndpoint(definition, toward)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.toward is not a valid endpoint of ${routeId}`);
    }
    return { kind: "raider", toward };
  }
  throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.kind is invalid: ${JSON.stringify(occupancy.kind)}`);
}

function validateMarket(path: string, value: unknown): MarinerIsleMarket {
  if (value === null || value === undefined || typeof value !== "object") {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `${path} must be an object`);
  }
  const market = value as Record<string, unknown>;
  if (market.present === false) {
    if ("rarity" in market && market.rarity !== undefined) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path} cannot include rarity without a Market`);
    }
    return { present: false };
  }
  if (market.present === true) {
    if (market.rarity !== null && typeof market.rarity !== "string") {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.rarity must be a string or null`);
    }
    return { present: true, rarity: market.rarity as string | null };
  }
  throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.present is invalid: ${JSON.stringify(market.present)}`);
}

function validateBeastLocation(path: string, value: unknown): MarinerBeastLocation {
  if (value === null || value === undefined || typeof value !== "object") {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `${path} must be an object`);
  }
  const location = value as Record<string, unknown>;
  if (location.kind === "sea_region") {
    if (typeof location.regionId !== "string" || !isValidMarinerSeaRegionId(location.regionId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.regionId is invalid: ${JSON.stringify(location.regionId)}`);
    }
    return { kind: "sea_region", regionId: location.regionId };
  }
  if (location.kind === "board_isle") {
    if (typeof location.boardIsleId !== "string" || !isValidMarinerBoardIsleId(location.boardIsleId)) {
      throw new DomainError(
        "INVALID_CAMPAIGN_STATE",
        `${path}.boardIsleId is invalid: ${JSON.stringify(location.boardIsleId)}`,
      );
    }
    return { kind: "board_isle", boardIsleId: location.boardIsleId };
  }
  if (location.kind === "off_map") {
    return { kind: "off_map" };
  }
  throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.kind is invalid: ${JSON.stringify(location.kind)}`);
}

function validateInitializedTopology(m: Record<string, unknown>): void {
  if (typeof m.shipPlaceId !== "string" || !isValidPlaceId(m.shipPlaceId)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `mariner.shipPlaceId is invalid: ${JSON.stringify(m.shipPlaceId)}`);
  }

  const boardIsles = m.boardIsles as unknown[];
  const routes = m.routes as unknown[];
  const seaRegions = m.seaRegions as unknown[];

  if (boardIsles.length !== MARINER_BOARD_ISLE_IDS.length) {
    throw new DomainError(
      "INVALID_CAMPAIGN_STATE",
      `mariner.boardIsles must contain exactly the ${MARINER_BOARD_ISLE_IDS.length} default board Isles`,
    );
  }
  if (routes.length !== MARINER_ROUTE_DEFINITIONS.length) {
    throw new DomainError(
      "INVALID_CAMPAIGN_STATE",
      `mariner.routes must contain exactly the ${MARINER_ROUTE_DEFINITIONS.length} default Routes`,
    );
  }
  if (seaRegions.length !== MARINER_SEA_REGION_IDS.length) {
    throw new DomainError(
      "INVALID_CAMPAIGN_STATE",
      `mariner.seaRegions must contain exactly the ${MARINER_SEA_REGION_IDS.length} default sea/Horizon regions`,
    );
  }

  const seenBoardIsles = new Set<string>();
  const seenWorldIsles = new Set<string>();
  for (let i = 0; i < boardIsles.length; i++) {
    const entry = boardIsles[i];
    const path = `mariner.boardIsles[${i}]`;
    if (entry === null || entry === undefined || typeof entry !== "object") {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path} is not a valid object`);
    }
    const isle = entry as Record<string, unknown>;
    if (typeof isle.boardIsleId !== "string" || !isValidMarinerBoardIsleId(isle.boardIsleId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.boardIsleId is invalid: ${JSON.stringify(isle.boardIsleId)}`);
    }
    if (seenBoardIsles.has(isle.boardIsleId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `Duplicate mariner board Isle: ${isle.boardIsleId}`);
    }
    seenBoardIsles.add(isle.boardIsleId);
    if (typeof isle.worldIsleId !== "string" || !isValidIsleId(isle.worldIsleId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.worldIsleId is invalid: ${JSON.stringify(isle.worldIsleId)}`);
    }
    if (seenWorldIsles.has(isle.worldIsleId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `Duplicate shared-Isle binding: ${isle.worldIsleId}`);
    }
    seenWorldIsles.add(isle.worldIsleId);
    validateMarket(`${path}.market`, isle.market);
    assertNonNegativeSafeInteger(`${path}.ravageStormCount`, isle.ravageStormCount);
  }
  for (const required of MARINER_BOARD_ISLE_IDS) {
    if (!seenBoardIsles.has(required)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `Missing required mariner board Isle: ${required}`);
    }
  }

  const seenRoutes = new Set<string>();
  for (let i = 0; i < routes.length; i++) {
    const entry = routes[i];
    const path = `mariner.routes[${i}]`;
    if (entry === null || entry === undefined || typeof entry !== "object") {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path} is not a valid object`);
    }
    const route = entry as Record<string, unknown>;
    if (typeof route.routeId !== "string" || !isValidMarinerRouteId(route.routeId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.routeId is invalid: ${JSON.stringify(route.routeId)}`);
    }
    if (seenRoutes.has(route.routeId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `Duplicate mariner Route: ${route.routeId}`);
    }
    seenRoutes.add(route.routeId);
    validateOccupancy(`${path}.occupancy`, route.occupancy, route.routeId as MarinerRouteId);
  }
  for (const required of MARINER_ROUTE_DEFINITIONS) {
    if (!seenRoutes.has(required.routeId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `Missing required mariner Route: ${required.routeId}`);
    }
  }

  const seenRegions = new Set<string>();
  for (let i = 0; i < seaRegions.length; i++) {
    const entry = seaRegions[i];
    const path = `mariner.seaRegions[${i}]`;
    if (entry === null || entry === undefined || typeof entry !== "object") {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path} is not a valid object`);
    }
    const region = entry as Record<string, unknown>;
    if (typeof region.regionId !== "string" || !isValidMarinerSeaRegionId(region.regionId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.regionId is invalid: ${JSON.stringify(region.regionId)}`);
    }
    if (seenRegions.has(region.regionId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `Duplicate mariner sea region: ${region.regionId}`);
    }
    seenRegions.add(region.regionId);
    assertNonNegativeSafeInteger(`${path}.stormCount`, region.stormCount);
  }
  for (const required of MARINER_SEA_REGION_IDS) {
    if (!seenRegions.has(required)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `Missing required mariner sea/Horizon region: ${required}`);
    }
  }
}

function validateBeastsAndLaws(m: Record<string, unknown>, initialized: boolean): void {
  const selected = m.selectedLawOfSeaIds as unknown[];
  const selectedIds: string[] = [];
  for (let i = 0; i < selected.length; i++) {
    const id = selected[i];
    if (typeof id !== "string" || !isValidMarinerLawOfSeaId(id)) {
      throw new DomainError(
        "INVALID_CAMPAIGN_STATE",
        `mariner.selectedLawOfSeaIds[${i}] is not a known Law of the Sea: ${JSON.stringify(id)}`,
      );
    }
    selectedIds.push(id);
  }
  uniqueIds(selectedIds, "selectedLawOfSeaId");

  const beasts = m.beasts as unknown[];
  const denizenIds: string[] = [];
  const nestingByIsle = new Map<MarinerBoardIsleId, number>();
  for (let i = 0; i < beasts.length; i++) {
    const entry = beasts[i];
    const path = `mariner.beasts[${i}]`;
    if (entry === null || entry === undefined || typeof entry !== "object") {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path} is not a valid object`);
    }
    const beast = entry as Record<string, unknown>;
    if (typeof beast.denizenId !== "string" || !isValidDenizenId(beast.denizenId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.denizenId is invalid: ${JSON.stringify(beast.denizenId)}`);
    }
    denizenIds.push(beast.denizenId);
    if (typeof beast.element !== "string" || !ELEMENT_ID_SET.has(beast.element)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.element is invalid: ${JSON.stringify(beast.element)}`);
    }
    if (beast.definitionId !== null) {
      if (typeof beast.definitionId !== "string" || !isValidMarinerBuiltinBeastId(beast.definitionId)) {
        throw new DomainError(
          "INVALID_CAMPAIGN_STATE",
          `${path}.definitionId is invalid: ${JSON.stringify(beast.definitionId)}`,
        );
      }
      const definition = BEAST_DEFINITION_BY_ID.get(beast.definitionId);
      if (definition !== undefined && definition.element !== beast.element) {
        throw new DomainError("INVALID_CAMPAIGN_STATE", `${path} built-in Beast Element does not match definition`);
      }
    }
    if (typeof beast.condition !== "string" || !BEAST_CONDITIONS.has(beast.condition)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.condition is invalid: ${JSON.stringify(beast.condition)}`);
    }
    const location = validateBeastLocation(`${path}.location`, beast.location);
    if (beast.condition === "friendly_nesting") {
      if (location.kind !== "board_isle") {
        throw new DomainError("INVALID_CAMPAIGN_STATE", `${path} Friendly/Nesting Beast must occupy a board Isle`);
      }
      nestingByIsle.set(location.boardIsleId, (nestingByIsle.get(location.boardIsleId) ?? 0) + 1);
    }
  }
  uniqueIds(denizenIds, "mariner beast denizenId");

  if (!initialized) {
    if (beasts.length > 0) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", "Empty mariner state must not contain Beasts");
    }
    if (selectedIds.length > 0) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", "Empty mariner state must not contain selected Laws of the Sea");
    }
    return;
  }

  const marketIsles = new Set<MarinerBoardIsleId>();
  for (const isle of m.boardIsles as Array<Record<string, unknown>>) {
    const market = isle.market as MarinerIsleMarket;
    if (market.present) {
      marketIsles.add(isle.boardIsleId as MarinerBoardIsleId);
    }
  }
  for (const [boardIsleId, count] of nestingByIsle) {
    if (count > 1) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `Multiple Friendly/Nesting Beasts occupy board Isle ${boardIsleId}`);
    }
    if (marketIsles.has(boardIsleId)) {
      throw new DomainError(
        "INVALID_CAMPAIGN_STATE",
        `Board Isle ${boardIsleId} cannot have both a Market and a Friendly/Nesting Beast`,
      );
    }
  }
}

export function validateMarinerStructure(mariner: unknown): void {
  if (mariner === null || mariner === undefined || typeof mariner !== "object") {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "Missing or invalid mariner");
  }
  const m = mariner as Record<string, unknown>;
  if (!Array.isArray(m.selectedLawOfSeaIds)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "mariner.selectedLawOfSeaIds must be an array");
  }
  if (!Array.isArray(m.boardIsles)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "mariner.boardIsles must be an array");
  }
  if (!Array.isArray(m.routes)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "mariner.routes must be an array");
  }
  if (!Array.isArray(m.seaRegions)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "mariner.seaRegions must be an array");
  }
  if (!Array.isArray(m.beasts)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "mariner.beasts must be an array");
  }

  if (isExactEmptyMarinerState(m)) {
    validateBeastsAndLaws(m, false);
    return;
  }

  validateInitializedTopology(m);
  validateBeastsAndLaws(m, true);
}

export function validateMarinerReferenceIntegrity(state: CampaignStateV5): void {
  validateMarinerStructure(state.mariner);

  const mariner: MarinerState = state.mariner;
  if (
    mariner.shipPlaceId === null &&
    mariner.boardIsles.length === 0 &&
    mariner.routes.length === 0 &&
    mariner.seaRegions.length === 0 &&
    mariner.beasts.length === 0 &&
    mariner.selectedLawOfSeaIds.length === 0
  ) {
    return;
  }

  const placeById = new Map(state.world.places.map((p) => [p.placeId as string, p]));
  const isleIds = new Set(state.world.isles.map((isle) => isle.isleId as string));
  const denizenById = new Map(state.world.denizens.map((d) => [d.denizenId as string, d]));

  const ship = placeById.get(mariner.shipPlaceId as string);
  if (ship === undefined) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `mariner.shipPlaceId does not resolve: ${mariner.shipPlaceId}`);
  }
  if (ship.placement.kind !== "mobile") {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "mariner.shipPlaceId must reference a mobile Place");
  }

  for (let i = 0; i < mariner.boardIsles.length; i++) {
    const isle = mariner.boardIsles[i];
    if (!isleIds.has(isle.worldIsleId as string)) {
      throw new DomainError(
        "INVALID_CAMPAIGN_STATE",
        `mariner.boardIsles[${i}].worldIsleId does not resolve: ${isle.worldIsleId}`,
      );
    }
  }

  for (let i = 0; i < mariner.beasts.length; i++) {
    const beast = mariner.beasts[i];
    const path = `mariner.beasts[${i}]`;
    const denizen = denizenById.get(beast.denizenId as string);
    if (denizen === undefined) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.denizenId does not resolve: ${beast.denizenId}`);
    }
    if (denizen.representation !== "individual") {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.denizenId must reference an individual Denizen`);
    }
    if (beast.definitionId !== null) {
      const definition = BEAST_DEFINITION_BY_ID.get(beast.definitionId);
      if (definition === undefined) {
        throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.definitionId does not resolve: ${beast.definitionId}`);
      }
      if (definition.element !== beast.element) {
        throw new DomainError("INVALID_CAMPAIGN_STATE", `${path} built-in Beast Element does not match definition`);
      }
    }
  }
}
