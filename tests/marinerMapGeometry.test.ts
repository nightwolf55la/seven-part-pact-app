import { describe, it, expect } from "vitest";
import {
  MARINER_BOARD_ISLE_IDS,
  MARINER_EXTERNAL_LAND_IDS,
  MARINER_ROUTE_DEFINITIONS,
  MARINER_SEA_REGION_IDS,
  marinerRouteDefinition,
} from "../shared/domain";
import {
  MARINER_BOARD_ISLE_MAP_POINTS,
  MARINER_EXTERNAL_LAND_MAP_POINTS,
  MARINER_ISLE_GEOMETRY,
  MARINER_MAP_MIN_WIDTH_PX,
  MARINER_MAP_VIEWBOX,
  MARINER_ROUTE_GEOMETRY,
  MARINER_ROUTE_HIT_STROKE_WIDTH,
  MARINER_SEA_GEOMETRY,
  MARINER_SEA_REGION_MAP_POINTS,
  geometryCoverageReport,
  mapEndpointPoint,
  marinerIsleGeometry,
  marinerRouteGeometry,
  marinerSeaGeometry,
  raiderDirectionDeg,
} from "../src/mariner-map-geometry";

describe("Mariner source-map geometry coverage", () => {
  it("covers every board Isle, Route, Sea/Horizon, and external land without orphans or duplicates", () => {
    const report = geometryCoverageReport();
    expect(report).toEqual({
      missingIsles: [],
      extraIsles: [],
      missingRoutes: [],
      extraRoutes: [],
      missingSeas: [],
      extraSeas: [],
      missingLands: [],
      extraLands: [],
    });
    expect(MARINER_ISLE_GEOMETRY).toHaveLength(MARINER_BOARD_ISLE_IDS.length);
    expect(MARINER_ROUTE_GEOMETRY).toHaveLength(MARINER_ROUTE_DEFINITIONS.length);
    expect(MARINER_SEA_GEOMETRY).toHaveLength(MARINER_SEA_REGION_IDS.length);
    expect(MARINER_EXTERNAL_LAND_IDS.every((id) => MARINER_EXTERNAL_LAND_MAP_POINTS[id] !== undefined)).toBe(true);
  });

  it("gives every Sea/Horizon a label anchor and hit region", () => {
    for (const regionId of MARINER_SEA_REGION_IDS) {
      const sea = marinerSeaGeometry(regionId);
      expect(sea.hitPath.length).toBeGreaterThan(0);
      expect(sea.label.x).toBeGreaterThan(0);
      expect(sea.label.y).toBeGreaterThan(0);
      expect(sea.slots.storm).toEqual({ x: sea.label.x, y: sea.label.y - 20 });
      expect(sea.slots.beast).toEqual({ x: sea.label.x + 18, y: sea.label.y + 12 });
      expect(sea.slots.researcher).toEqual({ x: sea.label.x - 20, y: sea.label.y + 14 });
    }
  });

  it("keeps Route endpoints catalog-driven rather than geometry-derived", () => {
    for (const definition of MARINER_ROUTE_DEFINITIONS) {
      const catalog = marinerRouteDefinition(definition.routeId);
      expect(catalog).toBeDefined();
      expect(catalog!.endpointA).toEqual(definition.endpointA);
      expect(catalog!.endpointB).toEqual(definition.endpointB);
      const geometry = marinerRouteGeometry(definition.routeId);
      expect(geometry).not.toBeNull();
      expect(geometry).not.toHaveProperty("endpointA");
      expect(geometry).not.toHaveProperty("endpointB");
      expect(geometry!.pathD.length).toBeGreaterThan(0);
      expect(mapEndpointPoint(catalog!.endpointA)).toEqual(
        catalog!.endpointA.kind === "board_isle"
          ? MARINER_BOARD_ISLE_MAP_POINTS[catalog!.endpointA.boardIsleId]
          : MARINER_EXTERNAL_LAND_MAP_POINTS[catalog!.endpointA.externalLandId],
      );
      expect(mapEndpointPoint(catalog!.endpointB)).toEqual(
        catalog!.endpointB.kind === "board_isle"
          ? MARINER_BOARD_ISLE_MAP_POINTS[catalog!.endpointB.boardIsleId]
          : MARINER_EXTERNAL_LAND_MAP_POINTS[catalog!.endpointB.externalLandId],
      );
    }
  });
});

describe("Mariner deterministic anchors", () => {
  it("keeps Route piece anchors and tangents stable", () => {
    const route = marinerRouteGeometry("ishana__scuttleport");
    expect(route).not.toBeNull();
    expect(route!.pathD).toMatch(/^M /);
    expect(route!.pieceAnchor).toEqual({ x: 711, y: 370 });
    expect(route!.tangentDeg).toBe(-69);
    expect(MARINER_ROUTE_HIT_STROKE_WIDTH).toBeGreaterThan(route!.tangentDeg === -69 ? 10 : 0);
  });

  it("keeps Isle token slots deterministic", () => {
    const ishana = marinerIsleGeometry("ishana");
    expect(ishana.hit.cx).toBe(656);
    expect(ishana.hit.cy).toBe(530);
    expect(ishana.slots.market).toEqual({ x: 672, y: 520 });
    expect(ishana.slots.ravage).toEqual({ x: 656, y: 530 });
    expect(ishana.slots.beast).toEqual({ x: 640, y: 542 });
    expect(MARINER_BOARD_ISLE_MAP_POINTS.ishana).toEqual({ x: 656, y: 530 });
  });

  it("derives Raider direction from authoritative toward endpoints, not path tangent alone", () => {
    const towardIshana = raiderDirectionDeg("ishana__scuttleport", { kind: "board_isle", boardIsleId: "ishana" });
    const towardScuttleport = raiderDirectionDeg("ishana__scuttleport", { kind: "board_isle", boardIsleId: "scuttleport" });
    expect(towardIshana).not.toBe(towardScuttleport);
    expect(towardIshana).not.toBe(-69);
    expect(MARINER_SEA_REGION_MAP_POINTS.sunken_fleet).toEqual({ x: 289, y: 375 });
  });
});

describe("Mariner map presentation frame", () => {
  it("uses a 1000x1000 viewBox and an intentional minimum board width", () => {
    expect(MARINER_MAP_VIEWBOX).toEqual({ width: 1000, height: 1000 });
    expect(MARINER_MAP_MIN_WIDTH_PX).toBeGreaterThanOrEqual(640);
  });
});
