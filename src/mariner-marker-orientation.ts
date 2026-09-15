export interface MapPt {
  readonly x: number;
  readonly y: number;
}

export interface AlignedHeading {
  readonly headingDeg: number;
  readonly reversed: boolean;
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
