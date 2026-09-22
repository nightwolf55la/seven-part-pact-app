import {
  MARINER_ROUTE_DEFINITIONS,
  MARINER_SEA_REGION_DEFINITIONS,
  type MarinerBoardIsleId,
  type MarinerRouteEndpoint,
  type MarinerRouteId,
  type MarinerRouteOccupancy,
  type MarinerSeaRegionId,
  type MarinerState,
} from "../shared/domain";
import {
  marinerRouteImmediateHazardReasons,
  type MarinerRouteHazardReason,
} from "./mariner-route-hazard-reasons";
import { seaRegionDisplayName } from "./mariner-view-model";
import {
  beastsInRegion,
  isTyphoon,
  nestingBeastsOnIsle,
  occupiedRoutesBorderingIsle,
} from "./mariner-view-model";

export interface MarinerIsleOperationalView {
  readonly boardIsleId: MarinerBoardIsleId;
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
  readonly threatened: boolean;
  readonly hazardReasons: readonly MarinerRouteHazardReason[];
  readonly endpointA: MarinerRouteEndpoint | null;
  readonly endpointB: MarinerRouteEndpoint | null;
  readonly adjacentSeaIds: readonly MarinerSeaRegionId[];
}

export function formatMarinerRouteHazardReason(reason: MarinerRouteHazardReason): string {
  if (reason.kind === "typhoon_scale") {
    return `Typhoon-scale storms in ${seaRegionDisplayName(reason.regionId)}`;
  }
  return `Route between Beast (${seaRegionDisplayName(reason.beastRegionId)}) and Storm (${seaRegionDisplayName(reason.stormRegionId)})`;
}

export interface MarinerSeaOperationalView {
  readonly regionId: MarinerSeaRegionId;
  readonly stormCount: number;
  readonly typhoon: boolean;
  readonly beastCount: number;
  readonly adjacentRegionIds: readonly MarinerSeaRegionId[];
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
  const hazardReasons = marinerRouteImmediateHazardReasons(routeId as MarinerRouteId, hazardBoard(mariner));
  const threatened = occupancy.kind !== "empty" && hazardReasons.length > 0;
  return {
    routeId,
    occupancyKind: occupancy.kind,
    raidToward: occupancy.kind === "raider" ? occupancy.toward : null,
    threatened,
    hazardReasons,
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
    adjacentRegionIds: definition?.adjacentRegionIds ?? [],
  };
}
