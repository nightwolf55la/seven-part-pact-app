import {
  MARINER_SEA_REGION_DEFINITIONS,
  type MarinerRouteId,
  type MarinerSeaRegionId,
} from "../shared/domain/mariner-catalogs";
import type {
  MarinerBeastState,
  MarinerSeaRegionState,
} from "../shared/domain/mariner-state";

export interface MarinerShippingHazardBoard {
  readonly seaRegions: readonly MarinerSeaRegionState[];
  readonly beasts: readonly MarinerBeastState[];
}

export type MarinerRouteHazardReason =
  | { readonly kind: "typhoon_scale"; readonly regionId: MarinerSeaRegionId }
  | {
      readonly kind: "beast_storm_boundary";
      readonly beastRegionId: MarinerSeaRegionId;
      readonly stormRegionId: MarinerSeaRegionId;
    };

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

function allRegionIds(board: MarinerShippingHazardBoard): MarinerSeaRegionId[] {
  return board.seaRegions.map((region) => region.regionId);
}

function reasonKey(reason: MarinerRouteHazardReason): string {
  if (reason.kind === "typhoon_scale") {
    return `typhoon:${reason.regionId}`;
  }
  const [a, b] = [reason.beastRegionId, reason.stormRegionId].sort();
  return `beast-storm:${a}:${b}`;
}

export function marinerRouteImmediateHazardReasons(
  routeId: MarinerRouteId,
  board: MarinerShippingHazardBoard,
): readonly MarinerRouteHazardReason[] {
  const reasons: MarinerRouteHazardReason[] = [];
  const seen = new Set<string>();

  function push(reason: MarinerRouteHazardReason): void {
    const key = reasonKey(reason);
    if (seen.has(key)) return;
    seen.add(key);
    reasons.push(reason);
  }

  for (const focusRegionId of allRegionIds(board)) {
    if (regionIsTyphoonScale(board, focusRegionId) && boundingRouteIds(focusRegionId).includes(routeId)) {
      push({ kind: "typhoon_scale", regionId: focusRegionId });
    }
    for (const otherRegionId of allRegionIds(board)) {
      if (focusRegionId === otherRegionId || !regionsAreAdjacent(focusRegionId, otherRegionId)) {
        continue;
      }
      const aBeast = seaRegionHasBeast(board, focusRegionId);
      const bBeast = seaRegionHasBeast(board, otherRegionId);
      const aStorm = stormCount(board, focusRegionId) >= 1;
      const bStorm = stormCount(board, otherRegionId) >= 1;
      if ((aBeast && bStorm) || (bBeast && aStorm)) {
        if (sharedBoundingRouteIds(focusRegionId, otherRegionId).includes(routeId)) {
          if (aBeast && bStorm) {
            push({ kind: "beast_storm_boundary", beastRegionId: focusRegionId, stormRegionId: otherRegionId });
          }
          if (bBeast && aStorm) {
            push({ kind: "beast_storm_boundary", beastRegionId: otherRegionId, stormRegionId: focusRegionId });
          }
        }
      }
    }
  }

  return reasons;
}
