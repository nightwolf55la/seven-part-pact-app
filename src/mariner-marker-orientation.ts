export interface MapPt {
  readonly x: number;
  readonly y: number;
}

export interface AlignedHeading {
  readonly headingDeg: number;
  readonly reversed: boolean;
}

/** Dot product of the Raider +X axis with the vector from origin to target. */
export function headingForwardDotToward(headingDeg: number, origin: MapPt, target: MapPt): number {
  const rad = (headingDeg * Math.PI) / 180;
  const dx = target.x - origin.x;
  const dy = target.y - origin.y;
  return Math.cos(rad) * dx + Math.sin(rad) * dy;
}

/** Map authoritative Route endpoints onto exact source-path ends using approximate hit geometry once per Route.
 * Approximate endpoints must already share the path-end coordinate space (native board, not overlay).
 */
export function associatePathEndsWithRouteEndpoints(
  pathStart: MapPt,
  pathEnd: MapPt,
  endpointAApprox: MapPt,
  endpointBApprox: MapPt,
): { readonly endpointA: MapPt; readonly endpointB: MapPt } {
  const startCloserToA =
    Math.hypot(pathStart.x - endpointAApprox.x, pathStart.y - endpointAApprox.y)
    <= Math.hypot(pathStart.x - endpointBApprox.x, pathStart.y - endpointBApprox.y);
  return startCloserToA
    ? { endpointA: pathStart, endpointB: pathEnd }
    : { endpointA: pathEnd, endpointB: pathStart };
}

/** Orient a Raider toward one authoritative Route endpoint using exact source-path ends for heading. */
export function raiderHeadingTowardRouteEndpoint(
  pose: { readonly x: number; readonly y: number; readonly tangentDeg: number },
  pathStart: MapPt,
  pathEnd: MapPt,
  endpointAApprox: MapPt,
  endpointBApprox: MapPt,
  towardMatchesEndpointA: boolean,
): AlignedHeading {
  const associated = associatePathEndsWithRouteEndpoints(
    pathStart,
    pathEnd,
    endpointAApprox,
    endpointBApprox,
  );
  const physicalDestination = towardMatchesEndpointA ? associated.endpointA : associated.endpointB;
  return alignHeadingToward(pose.tangentDeg, pose, physicalDestination);
}

/** Rotate a Route tangent so +X points toward an authoritative destination. */
export function alignHeadingToward(
  tangentDeg: number,
  origin: MapPt,
  toward: MapPt,
): AlignedHeading {
  const rad = (tangentDeg * Math.PI) / 180;
  const dx = toward.x - origin.x;
  const dy = toward.y - origin.y;
  if (dx === 0 && dy === 0) {
    return { headingDeg: tangentDeg, reversed: false };
  }
  const reversed = Math.cos(rad) * dx + Math.sin(rad) * dy < 0;
  return {
    headingDeg: reversed ? tangentDeg + 180 : tangentDeg,
    reversed,
  };
}
