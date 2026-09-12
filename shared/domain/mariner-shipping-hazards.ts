import {
  MARINER_SEA_REGION_DEFINITIONS,
  type MarinerRouteId,
  type MarinerSeaRegionId,
} from "./mariner-catalogs";
import type {
  MarinerBeastState,
  MarinerRouteState,
  MarinerSeaRegionState,
  MarinerState,
} from "./mariner-state";

export interface MarinerShippingHazardBoard {
  readonly seaRegions: readonly MarinerSeaRegionState[];
  readonly beasts: readonly MarinerBeastState[];
  readonly routes?: readonly MarinerRouteState[];
}

export interface ImmediateHazardFocus {
  readonly focusRegionIds: readonly MarinerSeaRegionId[];
}

export interface AppliedImmediateShippingHazards {
  readonly routes: readonly MarinerRouteState[];
  readonly destroyedRouteIds: readonly MarinerRouteId[];
}

function regionDefinition(regionId: MarinerSeaRegionId) {
  return MARINER_SEA_REGION_DEFINITIONS.find((definition) => definition.regionId === regionId);
}

function stormCount(board: MarinerShippingHazardBoard, regionId: MarinerSeaRegionId): number {
  return board.seaRegions.find((region) => region.regionId === regionId)?.stormCount ?? 0;
}

function seaRegionHasBeast(board: MarinerShippingHazardBoard, regionId: MarinerSeaRegionId): boolean {
  return board.beasts.some(
    (beast) => beast.location.kind === "sea_region" && beast.location.regionId === regionId,
  );
}

function regionIsTyphoonScale(board: MarinerShippingHazardBoard, regionId: MarinerSeaRegionId): boolean {
  const storms = stormCount(board, regionId);
  if (storms >= 2) {
    return true;
  }
  return storms >= 1 && seaRegionHasBeast(board, regionId);
}

function boundingRouteIds(regionId: MarinerSeaRegionId): readonly MarinerRouteId[] {
  return regionDefinition(regionId)?.boundingRouteIds ?? [];
}

function sharedBoundingRouteIds(
  regionA: MarinerSeaRegionId,
  regionB: MarinerSeaRegionId,
): readonly MarinerRouteId[] {
  const other = new Set(boundingRouteIds(regionB));
  return boundingRouteIds(regionA).filter((routeId) => other.has(routeId));
}

function regionsAreAdjacent(regionA: MarinerSeaRegionId, regionB: MarinerSeaRegionId): boolean {
  const definition = regionDefinition(regionA);
  return definition?.adjacentRegionIds.includes(regionB) === true;
}

function addAll(target: Set<MarinerRouteId>, routeIds: readonly MarinerRouteId[]): void {
  for (const routeId of routeIds) {
    target.add(routeId);
  }
}

function addBeastStormAcrossRouteIds(
  target: Set<MarinerRouteId>,
  board: MarinerShippingHazardBoard,
  regionA: MarinerSeaRegionId,
  regionB: MarinerSeaRegionId,
): void {
  if (regionA === regionB || !regionsAreAdjacent(regionA, regionB)) {
    return;
  }
  const aBeast = seaRegionHasBeast(board, regionA);
  const bBeast = seaRegionHasBeast(board, regionB);
  const aStorm = stormCount(board, regionA) >= 1;
  const bStorm = stormCount(board, regionB) >= 1;
  if ((aBeast && bStorm) || (bBeast && aStorm)) {
    addAll(target, sharedBoundingRouteIds(regionA, regionB));
  }
}

function allRegionIds(board: MarinerShippingHazardBoard): MarinerSeaRegionId[] {
  return board.seaRegions.map((region) => region.regionId);
}

export function immediateHazardRouteIds(board: MarinerShippingHazardBoard): Set<MarinerRouteId> {
  return immediateHazardRouteIdsCausedBy(board, { focusRegionIds: allRegionIds(board) });
}

export function immediateHazardRouteIdsCausedBy(
  board: MarinerShippingHazardBoard,
  focus: ImmediateHazardFocus,
): Set<MarinerRouteId> {
  const hazards = new Set<MarinerRouteId>();
  for (const focusRegionId of focus.focusRegionIds) {
    if (regionIsTyphoonScale(board, focusRegionId)) {
      addAll(hazards, boundingRouteIds(focusRegionId));
    }
    for (const otherRegionId of allRegionIds(board)) {
      addBeastStormAcrossRouteIds(hazards, board, focusRegionId, otherRegionId);
    }
  }
  return hazards;
}

export function isRouteUnderImmediateHazard(
  routeId: MarinerRouteId,
  board: MarinerShippingHazardBoard,
): boolean {
  return immediateHazardRouteIds(board).has(routeId);
}

export function applyImmediateShippingHazards(
  routes: readonly MarinerRouteState[],
  hazardRouteIds: ReadonlySet<MarinerRouteId>,
): AppliedImmediateShippingHazards {
  const destroyedRouteIds: MarinerRouteId[] = [];
  const nextRoutes = routes.map((route) => {
    if (!hazardRouteIds.has(route.routeId) || route.occupancy.kind === "empty") {
      return route;
    }
    destroyedRouteIds.push(route.routeId);
    return { ...route, occupancy: { kind: "empty" as const } };
  });
  destroyedRouteIds.sort();
  return { routes: nextRoutes, destroyedRouteIds };
}

export function beastIsEntirelySurrounded(
  regionId: MarinerSeaRegionId,
  routes: readonly MarinerRouteState[],
): boolean {
  const bounding = boundingRouteIds(regionId);
  if (bounding.length === 0) {
    return false;
  }
  return bounding.every((routeId) => {
    const occupancy = routes.find((route) => route.routeId === routeId)?.occupancy;
    return occupancy?.kind === "ship" || occupancy?.kind === "raider";
  });
}

export function shippingHazardBoardFromMariner(mariner: MarinerState): MarinerShippingHazardBoard {
  return {
    seaRegions: mariner.seaRegions,
    beasts: mariner.beasts,
    routes: mariner.routes,
  };
}
