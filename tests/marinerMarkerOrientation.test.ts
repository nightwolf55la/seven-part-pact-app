// @vitest-environment jsdom
import { describe, expect, it, beforeEach } from "vitest";
import { createElement } from "react";
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import { marinerRouteId, type MarinerRouteEndpoint } from "../shared/domain";
import { endpointKey } from "../src/mariner-board-pointer";
import { MARINER_ROUTE_CATALOG } from "../src/mariner-view-model";
import { mapEndpointPoint } from "../src/mariner-map-geometry";
import { marinerOverlayPointToBoard } from "../src/source-board-assets";
import {
  alignHeadingToward,
  associatePathEndsWithRouteEndpoints,
  headingForwardDotToward,
  raiderHeadingTowardRouteEndpoint,
} from "../src/mariner-marker-orientation";
import {
  MARINER_INTERACTION_GEOMETRY_RAW,
  SourceGeometrySprite,
  marinerRouteSymbolId,
  resolveRaiderMarkerHeading,
  sourceRoutePathBoardEnds,
} from "../src/source-interaction-geometry";

const HALCYON_CARAVESSE = marinerRouteId(
  { kind: "board_isle", boardIsleId: "caravesse" },
  { kind: "board_isle", boardIsleId: "halcyon_isles" },
);
const ISHANA_SCUTTLE = marinerRouteId(
  { kind: "board_isle", boardIsleId: "ishana" },
  { kind: "board_isle", boardIsleId: "scuttleport" },
);

function mountMarinerInteractionGeometry(): void {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const root = createRoot(host);
  flushSync(() => {
    root.render(
      createElement(
        "svg",
        { xmlns: "http://www.w3.org/2000/svg" },
        createElement(SourceGeometrySprite, { raw: MARINER_INTERACTION_GEOMETRY_RAW, label: "mariner-test" }),
      ),
    );
  });
}

function overlayEndpointOnNativeBoard(endpoint: MarinerRouteEndpoint) {
  const overlay = mapEndpointPoint(endpoint);
  return marinerOverlayPointToBoard(overlay.x, overlay.y);
}

/** Catalog-only structural helper. Not used as the Halcyon/Caravesse expected answer. */
function physicalEndpoint(routeId: string, toward: MarinerRouteEndpoint) {
  const routeDef = MARINER_ROUTE_CATALOG.find((entry) => entry.routeId === routeId);
  const ends = sourceRoutePathBoardEnds(marinerRouteSymbolId(routeId));
  if (routeDef === undefined || ends === null) throw new Error(`missing route ${routeId}`);
  const associated = associatePathEndsWithRouteEndpoints(
    ends.start,
    ends.end,
    overlayEndpointOnNativeBoard(routeDef.endpointA),
    overlayEndpointOnNativeBoard(routeDef.endpointB),
  );
  return endpointKey(toward) === endpointKey(routeDef.endpointA)
    ? associated.endpointA
    : associated.endpointB;
}

function nearerExactPathEnd(
  ends: { readonly start: { readonly x: number; readonly y: number }; readonly end: { readonly x: number; readonly y: number } },
  nativeTarget: { readonly x: number; readonly y: number },
) {
  const startDist = Math.hypot(ends.start.x - nativeTarget.x, ends.start.y - nativeTarget.y);
  const endDist = Math.hypot(ends.end.x - nativeTarget.x, ends.end.y - nativeTarget.y);
  return startDist <= endDist ? ends.start : ends.end;
}

function acuteSeparationDeg(a: number, b: number): number {
  let delta = Math.abs(a - b) % 360;
  if (delta > 180) delta = 360 - delta;
  return delta;
}

describe("Mariner occupancy marker heading", () => {
  it("keeps the Route tangent when it already points toward the destination", () => {
    const heading = alignHeadingToward(0, { x: 10, y: 10 }, { x: 40, y: 10 });
    expect(heading.reversed).toBe(false);
    expect(heading.headingDeg).toBe(0);
  });

  it("reverses the Route tangent when it points away from the Raider destination", () => {
    const heading = alignHeadingToward(0, { x: 100, y: 50 }, { x: 10, y: 50 });
    expect(heading.reversed).toBe(true);
    expect(heading.headingDeg).toBe(180);
  });

  it("uses exact path ends for heading after associating endpoints once per Route", () => {
    const pose = { x: 50, y: 50, tangentDeg: 90 };
    const pathStart = { x: 50, y: 10 };
    const pathEnd = { x: 50, y: 90 };
    const endpointAApprox = { x: 48, y: 12 };
    const endpointBApprox = { x: 200, y: 400 };
    const aligned = raiderHeadingTowardRouteEndpoint(
      pose,
      pathStart,
      pathEnd,
      endpointAApprox,
      endpointBApprox,
      false,
    );
    expect(headingForwardDotToward(aligned.headingDeg, pose, pathEnd)).toBeGreaterThan(0);
  });
});

describe("Mariner Raider orientation from exact source geometry", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    mountMarinerInteractionGeometry();
  });

  it("points Halcyon Isles <-> Caravesse toward independently transformed native-board ends", () => {
    const towardCaravesse = { kind: "board_isle" as const, boardIsleId: "caravesse" as const };
    const towardHalcyon = { kind: "board_isle" as const, boardIsleId: "halcyon_isles" as const };
    const ends = sourceRoutePathBoardEnds(marinerRouteSymbolId(HALCYON_CARAVESSE));
    expect(ends).not.toBeNull();
    const halcyonNative = overlayEndpointOnNativeBoard(towardHalcyon);
    const caravesseNative = overlayEndpointOnNativeBoard(towardCaravesse);
    const halcyonPhysical = nearerExactPathEnd(ends!, halcyonNative);
    const caravessePhysical = nearerExactPathEnd(ends!, caravesseNative);
    expect(halcyonPhysical).not.toEqual(caravessePhysical);
    const toCaravesse = resolveRaiderMarkerHeading(
      marinerRouteSymbolId(HALCYON_CARAVESSE),
      HALCYON_CARAVESSE,
      towardCaravesse,
    );
    const toHalcyon = resolveRaiderMarkerHeading(
      marinerRouteSymbolId(HALCYON_CARAVESSE),
      HALCYON_CARAVESSE,
      towardHalcyon,
    );
    expect(toCaravesse).not.toBeNull();
    expect(toHalcyon).not.toBeNull();
    expect(headingForwardDotToward(
      toCaravesse!.headingDeg,
      toCaravesse!.pose,
      caravessePhysical,
    )).toBeGreaterThan(0);
    expect(headingForwardDotToward(
      toHalcyon!.headingDeg,
      toHalcyon!.pose,
      halcyonPhysical,
    )).toBeGreaterThan(0);
    expect(acuteSeparationDeg(toCaravesse!.headingDeg, toHalcyon!.headingDeg)).toBeGreaterThan(179);
  });

  it("keeps a representative east-west Route correct", () => {
    const towardIshana = { kind: "board_isle" as const, boardIsleId: "ishana" as const };
    const ends = sourceRoutePathBoardEnds(marinerRouteSymbolId(ISHANA_SCUTTLE));
    expect(ends).not.toBeNull();
    const ishanaPhysical = nearerExactPathEnd(ends!, overlayEndpointOnNativeBoard(towardIshana));
    const resolved = resolveRaiderMarkerHeading(
      marinerRouteSymbolId(ISHANA_SCUTTLE),
      ISHANA_SCUTTLE,
      towardIshana,
    );
    expect(resolved).not.toBeNull();
    expect(headingForwardDotToward(
      resolved!.headingDeg,
      resolved!.pose,
      ishanaPhysical,
    )).toBeGreaterThan(0);
  });

  it("orients every catalog Route with opposite headings 180° apart toward physical ends", () => {
    for (const route of MARINER_ROUTE_CATALOG) {
      const symbolId = marinerRouteSymbolId(route.routeId);
      const headingA = resolveRaiderMarkerHeading(symbolId, route.routeId, route.endpointA);
      const headingB = resolveRaiderMarkerHeading(symbolId, route.routeId, route.endpointB);
      expect(headingA, route.routeId).not.toBeNull();
      expect(headingB, route.routeId).not.toBeNull();
      expect(headingForwardDotToward(
        headingA!.headingDeg,
        headingA!.pose,
        physicalEndpoint(route.routeId, route.endpointA),
      ), route.routeId).toBeGreaterThan(0);
      expect(headingForwardDotToward(
        headingB!.headingDeg,
        headingB!.pose,
        physicalEndpoint(route.routeId, route.endpointB),
      ), route.routeId).toBeGreaterThan(0);
      expect(acuteSeparationDeg(headingA!.headingDeg, headingB!.headingDeg), route.routeId).toBeGreaterThan(179);
    }
  });
});
