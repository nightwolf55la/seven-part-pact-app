import type { MarinerRouteId, MarinerSeaRegionId } from "../shared/domain/mariner-catalogs";
import {
  immediateHazardRouteIds,
  immediateHazardRouteIdsCausedBy,
  type MarinerShippingHazardBoard,
} from "../shared/domain/mariner-shipping-hazards";

export type MarinerRouteHazardReason = {
  readonly kind: "focus_region";
  readonly regionId: MarinerSeaRegionId;
};

export type { MarinerShippingHazardBoard };

/**
 * Region-attributed hazard reasons derived only from the authoritative shared
 * immediate-hazard API (no duplicated hazard rule logic in src/).
 */
export function marinerRouteImmediateHazardReasons(
  routeId: MarinerRouteId,
  board: MarinerShippingHazardBoard,
): readonly MarinerRouteHazardReason[] {
  if (!immediateHazardRouteIds(board).has(routeId)) {
    return [];
  }
  const reasons: MarinerRouteHazardReason[] = [];
  for (const region of board.seaRegions) {
    const caused = immediateHazardRouteIdsCausedBy(board, { focusRegionIds: [region.regionId] });
    if (caused.has(routeId)) {
      reasons.push({ kind: "focus_region", regionId: region.regionId });
    }
  }
  return reasons.sort((a, b) => a.regionId.localeCompare(b.regionId));
}
