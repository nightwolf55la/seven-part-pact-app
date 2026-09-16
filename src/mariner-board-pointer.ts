import type { MarinerRouteEndpoint, MarinerRouteOccupancy } from "../shared/domain";
import { MARINER_ROUTE_CATALOG } from "./mariner-view-model";

/** Pointer movement before a press is treated as drag rather than click. */
export const MARINER_POINTER_DRAG_THRESHOLD_PX = 6;

export function pointerMovementExceedsDragThreshold(dx: number, dy: number): boolean {
  return Math.hypot(dx, dy) >= MARINER_POINTER_DRAG_THRESHOLD_PX;
}

export function endpointKey(endpoint: MarinerRouteEndpoint): string {
  return endpoint.kind === "board_isle"
    ? `board:${endpoint.boardIsleId}`
    : `land:${endpoint.externalLandId}`;
}

export function routesShareBoardIsleEndpoint(routeIdA: string, routeIdB: string): boolean {
  const a = MARINER_ROUTE_CATALOG.find((route) => route.routeId === routeIdA);
  const b = MARINER_ROUTE_CATALOG.find((route) => route.routeId === routeIdB);
  if (a === undefined || b === undefined) return false;
  const keysA = new Set([endpointKey(a.endpointA), endpointKey(a.endpointB)]);
  return [endpointKey(b.endpointA), endpointKey(b.endpointB)].some((key) => keysA.has(key));
}

export function routeOccupancyAt(
  routes: readonly { routeId: string; occupancy: MarinerRouteOccupancy }[],
  routeId: string,
): MarinerRouteOccupancy {
  return routes.find((route) => route.routeId === routeId)?.occupancy ?? { kind: "empty" };
}

export function isEmptyRoute(
  routes: readonly { routeId: string; occupancy: MarinerRouteOccupancy }[],
  routeId: string,
): boolean {
  return routeOccupancyAt(routes, routeId).kind === "empty";
}

export function findSeaDropRegionId(start: Element | null): string | null {
  let node: Element | null = start;
  while (node !== null) {
    if (node instanceof Element && node.getAttribute("data-map-layer") === "sea-hit") {
      return node.getAttribute("data-region-id");
    }
    node = node.parentElement;
  }
  return null;
}

export function findRouteDropId(start: Element | null): string | null {
  let node: Element | null = start;
  while (node !== null) {
    if (node instanceof Element && node.getAttribute("data-map-layer") === "route-hit") {
      return node.getAttribute("data-route-id");
    }
    node = node.parentElement;
  }
  return null;
}

export function raiderTowardAppliesOnRoute(
  toward: MarinerRouteEndpoint,
  destinationRouteId: string,
): boolean {
  const route = MARINER_ROUTE_CATALOG.find((entry) => entry.routeId === destinationRouteId);
  if (route === undefined) return false;
  const key = endpointKey(toward);
  return key === endpointKey(route.endpointA) || key === endpointKey(route.endpointB);
}

export function representableRaiderEndpoints(routeId: string): MarinerRouteEndpoint[] {
  const route = MARINER_ROUTE_CATALOG.find((entry) => entry.routeId === routeId);
  if (route === undefined) return [];
  return [route.endpointA, route.endpointB];
}

/** True when the pointer remains inside the Route hit, occupancy marker, or that Route's quick actions. */
export function relatedTargetOwnsRouteHover(relatedTarget: EventTarget | null, routeId: string): boolean {
  if (!(relatedTarget instanceof Element)) return false;
  const owner = relatedTarget.closest("[data-route-hover-owner]");
  return owner?.getAttribute("data-route-hover-owner") === routeId;
}

/** True when the pointer remains inside the Sea hit, Storm piece, or that region's quick actions. */
export function relatedTargetOwnsSeaHover(relatedTarget: EventTarget | null, regionId: string): boolean {
  if (!(relatedTarget instanceof Element)) return false;
  const owner = relatedTarget.closest("[data-sea-hover-owner]");
  return owner?.getAttribute("data-sea-hover-owner") === regionId;
}
