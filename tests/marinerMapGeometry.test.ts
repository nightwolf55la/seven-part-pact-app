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
  MARINER_EXTERNAL_LAND_GEOMETRY,
  MARINER_EXTERNAL_LAND_MAP_POINTS,
  MARINER_ISLE_FILLS,
  MARINER_ISLE_GEOMETRY,
  MARINER_ISLE_SELECTION_GLOW,
  MARINER_MAP_CHART_TITLE,
  MARINER_MAP_PALETTE,
  MARINER_MAP_TYPE,
  MARINER_MAP_VIEWBOX,
  MARINER_ROUTE_GEOMETRY,
  MARINER_ROUTE_HIT_STROKE_WIDTH,
  MARINER_SEA_GEOMETRY,
  MARINER_SEA_REGION_MAP_POINTS,
  geometryCoverageReport,
  mapEndpointPoint,
  marinerIsleGeometry,
  marinerMapLabelLines,
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
  it("uses a 1000x1000 viewBox with a source-shaped field and sea palette", () => {
    expect(MARINER_MAP_VIEWBOX).toEqual({ width: 1000, height: 1000 });
    expect(MARINER_MAP_PALETTE.field).toMatch(/^#/);
    expect(MARINER_MAP_PALETTE.sea).toMatch(/^#/);
    expect(MARINER_MAP_PALETTE.seaRim).toMatch(/^#/);
    expect(MARINER_MAP_TYPE.fontFamily).toMatch(/Georgia/);
    expect(MARINER_MAP_CHART_TITLE.text).toBe("The Archipelago of Isha");
    expect(MARINER_MAP_CHART_TITLE.rotate).not.toBe(0);
  });

  it("keeps source-map label placement metadata instead of defaulting every Isle to a centered horizontal name", () => {
    const ishana = marinerIsleGeometry("ishana");
    const scuttleport = marinerIsleGeometry("scuttleport");
    const farReach = marinerIsleGeometry("far_reach");
    const halcyon = marinerIsleGeometry("halcyon_isles");
    const graven = marinerIsleGeometry("graven_isle");
    expect(ishana.label.rotate).not.toBeUndefined();
    expect(scuttleport.label.rotate).not.toBeUndefined();
    expect(farReach.label.wrap).toBe(true);
    expect(halcyon.label.wrap).toBe(true);
    expect(graven.label.wrap).toBe(true);
    expect(marinerMapLabelLines("Far Reach", farReach.label)).toEqual(["FAR", "REACH"]);
    expect(marinerMapLabelLines("Sage Atoll", marinerIsleGeometry("sage_atoll").label)).toEqual(["SAGE", "ATOLL"]);
    expect(MARINER_ISLE_GEOMETRY.filter((isle) => (isle.label.rotate ?? 0) !== 0).length).toBeGreaterThan(3);
  });

  it("frames external destinations and horizon captions separately from route endpoint anchors", () => {
    const druj = MARINER_EXTERNAL_LAND_GEOMETRY.find((land) => land.externalLandId === "druj_lands");
    const ur = MARINER_EXTERNAL_LAND_GEOMETRY.find((land) => land.externalLandId === "ur");
    const hecares = MARINER_EXTERNAL_LAND_GEOMETRY.find((land) => land.externalLandId === "hecares");
    const nebelheim = MARINER_EXTERNAL_LAND_GEOMETRY.find((land) => land.externalLandId === "nebelheim");
    expect(druj?.direction?.text).toBe("to the West");
    expect(ur?.direction?.text).toBe("to the East");
    expect(hecares?.direction?.text).toBe("to the South");
    expect(nebelheim?.direction?.text).toBe("to the North");
    expect(druj?.nameLabel.rotate).toBe(-90);
    expect(MARINER_EXTERNAL_LAND_MAP_POINTS.druj_lands).toEqual({ x: 70, y: 457 });
    expect(marinerSeaGeometry("northwest_horizon").caption?.rotate).not.toBeUndefined();
    expect(marinerSeaGeometry("sunken_fleet").label).toEqual({ x: 289, y: 375 });
  });

  it("keeps Isle selection glow in each Isle fill family instead of a generic dark edge", () => {
    const previousNeutralDark = {
      ishana: "#c45c28",
      far_reach: "#2f6f2c",
      scuttleport: "#9a3d62",
    } as const;
    expect(MARINER_ISLE_SELECTION_GLOW.ishana).not.toBe(previousNeutralDark.ishana);
    expect(MARINER_ISLE_SELECTION_GLOW.far_reach).not.toBe(previousNeutralDark.far_reach);
    expect(MARINER_ISLE_SELECTION_GLOW.scuttleport).not.toBe(previousNeutralDark.scuttleport);
    expect(MARINER_ISLE_SELECTION_GLOW.ishana).not.toBe("#0f172a");
    expect(MARINER_ISLE_SELECTION_GLOW.far_reach).not.toBe("#042f2e");
    for (const isleId of ["ishana", "far_reach", "scuttleport"] as const) {
      const fill = MARINER_ISLE_FILLS[isleId];
      const glow = MARINER_ISLE_SELECTION_GLOW[isleId];
      expect(glow).not.toBe(fill);
      expect(hueDelta(hexHue(fill), hexHue(glow))).toBeLessThan(28);
    }
  });
});

function hexHue(hex: string): number {
  const n = hex.replace("#", "");
  const r = parseInt(n.slice(0, 2), 16) / 255;
  const g = parseInt(n.slice(2, 4), 16) / 255;
  const b = parseInt(n.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  if (delta === 0) return 0;
  let hue = 0;
  if (max === r) hue = ((g - b) / delta) % 6;
  else if (max === g) hue = (b - r) / delta + 2;
  else hue = (r - g) / delta + 4;
  return ((hue * 60) + 360) % 360;
}

function hueDelta(a: number, b: number): number {
  const delta = Math.abs(a - b);
  return Math.min(delta, 360 - delta);
}
