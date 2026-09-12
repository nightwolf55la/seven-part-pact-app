import { describe, expect, it } from "vitest";
import type { DenizenId, IsleId, MarinerBoardIsleId, MarinerRouteOccupancy, MarinerState } from "../shared/domain";
import {
  MARINER_BOARD_ISLE_IDS,
  buildInitializedDefaultMarinerState,
  marinerRouteId,
} from "../shared/domain";
import {
  applyImmediateShippingHazards,
  beastIsEntirelySurrounded,
  immediateHazardRouteIds,
  immediateHazardRouteIdsCausedBy,
  isRouteUnderImmediateHazard,
} from "../shared/domain/mariner-shipping-hazards";

const SHIP = "plc_00000000-0000-0000-0000-0000000000aa" as const;
const DEN_A = "den_00000000-0000-0000-0000-000000000001" as DenizenId;

const THYRIAN_FAR_REACH = marinerRouteId(
  { kind: "board_isle", boardIsleId: "far_reach" },
  { kind: "board_isle", boardIsleId: "thyras" },
);
const THYRIAN_DRUNTYR = marinerRouteId(
  { kind: "board_isle", boardIsleId: "thyras" },
  { kind: "board_isle", boardIsleId: "druntyr" },
);
const THYRIAN_CARAVESSE = marinerRouteId(
  { kind: "board_isle", boardIsleId: "druntyr" },
  { kind: "board_isle", boardIsleId: "caravesse" },
);
const THYRIAN_LOOP = marinerRouteId(
  { kind: "board_isle", boardIsleId: "caravesse" },
  { kind: "board_isle", boardIsleId: "far_reach" },
);
const RUINS_SCUTTLE_THYRAS = marinerRouteId(
  { kind: "board_isle", boardIsleId: "thyras" },
  { kind: "board_isle", boardIsleId: "scuttleport" },
);
const SUNKEN_ORRERY_FAR = marinerRouteId(
  { kind: "board_isle", boardIsleId: "orrery" },
  { kind: "board_isle", boardIsleId: "far_reach" },
);
const ISHANA_TAHV = marinerRouteId(
  { kind: "board_isle", boardIsleId: "ishana" },
  { kind: "board_isle", boardIsleId: "tahv" },
);

function occupancy(
  routes: Partial<Record<string, MarinerRouteOccupancy>>,
): Partial<Record<string, MarinerRouteOccupancy>> {
  return routes;
}

function mariner(overrides: {
  readonly storms?: Partial<Record<string, number>>;
  readonly routes?: Partial<Record<string, MarinerRouteOccupancy>>;
  readonly beasts?: MarinerState["beasts"];
}): MarinerState {
  const worldIsleIds = Object.fromEntries(
    MARINER_BOARD_ISLE_IDS.map((id, index) => [
      id,
      `isl_00000000-0000-0000-0000-${String(index + 1).padStart(12, "0")}`,
    ]),
  ) as Record<MarinerBoardIsleId, IsleId>;
  return buildInitializedDefaultMarinerState({
    shipPlaceId: SHIP as never,
    worldIsleIds: worldIsleIds as never,
    selectedLawOfSeaIds: ["first", "second"],
    seaStormCounts: overrides.storms as never,
    routeOccupancy: occupancy(overrides.routes ?? {}) as never,
    beasts: overrides.beasts ?? [],
  });
}

function beastIn(regionId: "thyrian_sea" | "sunken_fleet" | "ruins_of_old_ishana" | "sidereal_sea") {
  return {
    denizenId: DEN_A,
    element: "water" as const,
    definitionId: "kraken" as const,
    condition: "distrusting" as const,
    location: { kind: "sea_region" as const, regionId },
  };
}

describe("immediate Mariner shipping hazards", () => {
  it("treats 2+ Storms in one region as Typhoon-scale for that region's bounding Routes", () => {
    const state = mariner({
      storms: { thyrian_sea: 2, kings_gulf: 1 },
      routes: {
        [THYRIAN_FAR_REACH]: { kind: "ship" },
        [ISHANA_TAHV]: { kind: "ship" },
      },
    });
    const hazards = immediateHazardRouteIds(state);
    expect(hazards.has(THYRIAN_FAR_REACH)).toBe(true);
    expect(hazards.has(THYRIAN_DRUNTYR)).toBe(true);
    expect(hazards.has(THYRIAN_CARAVESSE)).toBe(true);
    expect(hazards.has(THYRIAN_LOOP)).toBe(true);
    expect(hazards.has(ISHANA_TAHV)).toBe(false);
  });

  it("does not treat a lone Storm as Typhoon-scale", () => {
    const state = mariner({
      storms: { thyrian_sea: 1 },
      routes: { [THYRIAN_FAR_REACH]: { kind: "ship" } },
    });
    expect(immediateHazardRouteIds(state).size).toBe(0);
  });

  it("treats Beast + Storm in the same region as Typhoon-scale even when stormCount is 1", () => {
    const state = mariner({
      storms: { thyrian_sea: 1 },
      beasts: [beastIn("thyrian_sea")],
      routes: { [THYRIAN_FAR_REACH]: { kind: "raider", toward: { kind: "board_isle", boardIsleId: "thyras" } } },
    });
    const hazards = immediateHazardRouteIds(state);
    expect(hazards.has(THYRIAN_FAR_REACH)).toBe(true);
    expect(isRouteUnderImmediateHazard(THYRIAN_FAR_REACH, state)).toBe(true);
  });

  it("does not equate Typhoon-scale solely with stormCount >= 2", () => {
    const oneStormNoBeast = mariner({ storms: { thyrian_sea: 1 } });
    const beastAndStorm = mariner({ storms: { thyrian_sea: 1 }, beasts: [beastIn("thyrian_sea")] });
    expect(immediateHazardRouteIds(oneStormNoBeast).size).toBe(0);
    expect(immediateHazardRouteIds(beastAndStorm).has(THYRIAN_FAR_REACH)).toBe(true);
  });

  it("destroys shipping on a Route that separates a Beast from a Storm", () => {
    const state = mariner({
      storms: { ruins_of_old_ishana: 1 },
      beasts: [beastIn("thyrian_sea")],
      routes: {
        [THYRIAN_DRUNTYR]: { kind: "ship" },
        [RUINS_SCUTTLE_THYRAS]: { kind: "ship" },
      },
    });
    const hazards = immediateHazardRouteIds(state);
    expect(hazards.has(THYRIAN_DRUNTYR)).toBe(true);
    expect(hazards.has(RUINS_SCUTTLE_THYRAS)).toBe(false);
  });

  it("does not treat an ordinary Route between two Storms as an immediate hazard", () => {
    const state = mariner({
      storms: { thyrian_sea: 1, ruins_of_old_ishana: 1 },
      routes: {
        [THYRIAN_DRUNTYR]: { kind: "ship" },
        [THYRIAN_FAR_REACH]: { kind: "ship" },
      },
    });
    expect(immediateHazardRouteIds(state).size).toBe(0);
    expect(isRouteUnderImmediateHazard(THYRIAN_DRUNTYR, state)).toBe(false);
  });

  it("scopes action-caused hazards to the focused region and does not repair an unrelated Typhoon", () => {
    const state = mariner({
      storms: { thyrian_sea: 1, kings_gulf: 2 },
      beasts: [beastIn("thyrian_sea")],
      routes: {
        [THYRIAN_FAR_REACH]: { kind: "ship" },
        [ISHANA_TAHV]: { kind: "ship" },
      },
    });
    const caused = immediateHazardRouteIdsCausedBy(state, {
      focusRegionIds: ["thyrian_sea"],
    });
    expect(caused.has(THYRIAN_FAR_REACH)).toBe(true);
    expect(caused.has(ISHANA_TAHV)).toBe(false);
    expect(immediateHazardRouteIds(state).has(ISHANA_TAHV)).toBe(true);
  });

  it("empties only occupied Routes in the hazard set and reports destroyed Route IDs", () => {
    const state = mariner({
      storms: { thyrian_sea: 2 },
      routes: {
        [THYRIAN_FAR_REACH]: { kind: "ship" },
        [THYRIAN_DRUNTYR]: { kind: "raider", toward: { kind: "board_isle", boardIsleId: "druntyr" } },
        [ISHANA_TAHV]: { kind: "ship" },
      },
    });
    const result = applyImmediateShippingHazards(state.routes, immediateHazardRouteIdsCausedBy(state, {
      focusRegionIds: ["thyrian_sea"],
    }));
    expect(result.destroyedRouteIds).toEqual(expect.arrayContaining([THYRIAN_FAR_REACH, THYRIAN_DRUNTYR]));
    expect(result.destroyedRouteIds).not.toContain(ISHANA_TAHV);
    expect(result.routes.find((route) => route.routeId === THYRIAN_FAR_REACH)?.occupancy).toEqual({ kind: "empty" });
    expect(result.routes.find((route) => route.routeId === ISHANA_TAHV)?.occupancy).toEqual({ kind: "ship" });
  });

  it("does not restore previously empty occupancy when a Typhoon already exists", () => {
    const state = mariner({
      storms: { thyrian_sea: 2 },
      routes: { [THYRIAN_FAR_REACH]: { kind: "empty" } },
    });
    const result = applyImmediateShippingHazards(state.routes, immediateHazardRouteIds(state));
    expect(result.destroyedRouteIds).toEqual([]);
    expect(result.routes.find((route) => route.routeId === THYRIAN_FAR_REACH)?.occupancy).toEqual({ kind: "empty" });
  });

  it("treats a Beast as entirely surrounded only when every bounding Route holds a Ship or Raider", () => {
    const empty = mariner({ routes: {} });
    expect(beastIsEntirelySurrounded("sunken_fleet", empty.routes)).toBe(false);
    const surrounded = mariner({
      routes: {
        [SUNKEN_ORRERY_FAR]: { kind: "ship" },
        [THYRIAN_LOOP]: { kind: "raider", toward: { kind: "board_isle", boardIsleId: "far_reach" } },
        [marinerRouteId(
          { kind: "board_isle", boardIsleId: "caravesse" },
          { kind: "board_isle", boardIsleId: "orrery" },
        )]: { kind: "ship" },
      },
    });
    expect(beastIsEntirelySurrounded("sunken_fleet", surrounded.routes)).toBe(true);
  });
});
