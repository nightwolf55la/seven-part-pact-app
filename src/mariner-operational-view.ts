import {
  MARINER_ROUTE_DEFINITIONS,
  MARINER_SEA_REGION_DEFINITIONS,
  immediateHazardRouteIds,
  isRouteUnderImmediateHazard,
  type MarinerBoardIsleId,
  type MarinerRouteEndpoint,
  type MarinerRouteOccupancy,
  type MarinerSeaRegionId,
  type MarinerState,
} from "../shared/domain";
import {
  beastsInRegion,
  isTyphoon,
  nestingBeastsOnIsle,
  occupiedRoutesBorderingIsle,
} from "./mariner-view-model";

export interface MarinerIsleOperationalView {
  readonly boardIsleId: MarinerBoardIsleId;
  readonly stability: null;
  readonly stabilityExplanation: null;
  readonly marketPresent: boolean;
  readonly rarity: string | null;
  readonly ravageStormCount: number;
  readonly adjacentOccupiedCount: number;
  readonly nestingBeastCount: number;
}

export interface MarinerRouteOperationalView {
  readonly routeId: string;
  readonly occupancyKind: MarinerRouteOccupancy["kind"];
  readonly raidToward: MarinerRouteEndpoint | null;
  readonly travelDirection: null;
  readonly threatened: boolean;
  readonly endpointA: MarinerRouteEndpoint | null;
  readonly endpointB: MarinerRouteEndpoint | null;
  readonly adjacentSeaIds: readonly MarinerSeaRegionId[];
}

export interface MarinerSeaOperationalView {
  readonly regionId: MarinerSeaRegionId;
  readonly stormCount: number;
  readonly typhoon: boolean;
  readonly beastCount: number;
  readonly legalGuidedDestinations: readonly MarinerSeaRegionId[];
}

export interface MarinerVisionsForecast {
  readonly stormTotal: number;
  readonly typhoonSeaCount: number;
  readonly threatenedOccupiedCount: number;
  readonly ravagedIsleCount: number;
  readonly summary: string;
  readonly prevailingWind: null;
  readonly nextStormDestination: null;
}

function hazardBoard(mariner: MarinerState) {
  return {
    seaRegions: mariner.seaRegions,
    beasts: mariner.beasts,
    routes: mariner.routes,
  };
}

function seasBoundingRoute(routeId: string): MarinerSeaRegionId[] {
  return MARINER_SEA_REGION_DEFINITIONS
    .filter((region) => region.boundingRouteIds.includes(routeId as never))
    .map((region) => region.regionId);
}

export function marinerIsleOperationalView(
  mariner: MarinerState,
  boardIsleId: MarinerBoardIsleId,
): MarinerIsleOperationalView {
  const isle = mariner.boardIsles.find((entry) => entry.boardIsleId === boardIsleId);
  const market = isle?.market;
  return {
    boardIsleId,
    stability: null,
    stabilityExplanation: null,
    marketPresent: market?.present === true,
    rarity: market?.present === true ? market.rarity : null,
    ravageStormCount: isle?.ravageStormCount ?? 0,
    adjacentOccupiedCount: occupiedRoutesBorderingIsle(mariner, boardIsleId).length,
    nestingBeastCount: nestingBeastsOnIsle(mariner.beasts, boardIsleId).length,
  };
}

export function marinerRouteOperationalView(
  mariner: MarinerState,
  routeId: string,
): MarinerRouteOperationalView {
  const definition = MARINER_ROUTE_DEFINITIONS.find((route) => route.routeId === routeId);
  const occupancy = mariner.routes.find((route) => route.routeId === routeId)?.occupancy ?? { kind: "empty" as const };
  return {
    routeId,
    occupancyKind: occupancy.kind,
    raidToward: occupancy.kind === "raider" ? occupancy.toward : null,
    travelDirection: null,
    threatened: occupancy.kind !== "empty" && isRouteUnderImmediateHazard(routeId as never, hazardBoard(mariner)),
    endpointA: definition?.endpointA ?? null,
    endpointB: definition?.endpointB ?? null,
    adjacentSeaIds: seasBoundingRoute(routeId),
  };
}

export function marinerSeaOperationalView(
  mariner: MarinerState,
  regionId: MarinerSeaRegionId,
): MarinerSeaOperationalView {
  const definition = MARINER_SEA_REGION_DEFINITIONS.find((region) => region.regionId === regionId);
  const stormCount = mariner.seaRegions.find((region) => region.regionId === regionId)?.stormCount ?? 0;
  return {
    regionId,
    stormCount,
    typhoon: isTyphoon(stormCount),
    beastCount: beastsInRegion(mariner.beasts, regionId).length,
    legalGuidedDestinations: definition?.adjacentRegionIds ?? [],
  };
}

export function marinerVisionsForecast(mariner: MarinerState): MarinerVisionsForecast {
  const stormTotal = mariner.seaRegions.reduce((sum, region) => sum + region.stormCount, 0);
  const typhoonSeaCount = mariner.seaRegions.filter((region) => isTyphoon(region.stormCount)).length;
  const hazards = immediateHazardRouteIds(hazardBoard(mariner));
  const threatenedOccupiedCount = mariner.routes.filter(
    (route) => route.occupancy.kind !== "empty" && hazards.has(route.routeId),
  ).length;
  const ravagedIsleCount = mariner.boardIsles.filter((isle) => isle.ravageStormCount > 0).length;
  const parts = [
    `${stormTotal} Storm${stormTotal === 1 ? "" : "s"}`,
    `${typhoonSeaCount} Typhoon${typhoonSeaCount === 1 ? "" : "s"}`,
    `${threatenedOccupiedCount} threatened ${threatenedOccupiedCount === 1 ? "Ship" : "Ships"}`,
    `${ravagedIsleCount} Ravaged Isle${ravagedIsleCount === 1 ? "" : "s"}`,
  ];
  return {
    stormTotal,
    typhoonSeaCount,
    threatenedOccupiedCount,
    ravagedIsleCount,
    summary: parts.join(" · "),
    prevailingWind: null,
    nextStormDestination: null,
  };
}
