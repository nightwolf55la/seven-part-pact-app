import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import type { DenizenId, IsleId, MarinerBoardIsleId, MarinerRouteOccupancy, MarinerState } from "../shared/domain";
import {
  MARINER_BOARD_ISLE_IDS,
  buildInitializedDefaultMarinerState,
  immediateHazardRouteIds,
  isRouteUnderImmediateHazard,
  marinerRouteId,
} from "../shared/domain";
import { marinerRouteImmediateHazardReasons } from "../src/mariner-route-hazard-reasons";

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
const RUINS_SCUTTLE_THYRAS = marinerRouteId(
  { kind: "board_isle", boardIsleId: "thyras" },
  { kind: "board_isle", boardIsleId: "scuttleport" },
);
const ISHANA_TAHV = marinerRouteId(
  { kind: "board_isle", boardIsleId: "ishana" },
  { kind: "board_isle", boardIsleId: "tahv" },
);

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
    routeOccupancy: overrides.routes ?? {},
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

function assertReasonEquivalence(state: MarinerState): void {
  const board = { seaRegions: state.seaRegions, beasts: state.beasts };
  const hazardSet = immediateHazardRouteIds(board);
  for (const route of state.routes) {
    const reasons = marinerRouteImmediateHazardReasons(route.routeId as never, board);
    expect(reasons.length > 0).toBe(hazardSet.has(route.routeId as never));
    expect(isRouteUnderImmediateHazard(route.routeId as never, board)).toBe(reasons.length > 0);
  }
}

describe("marinerRouteImmediateHazardReasons", () => {
  it("derives region attribution from immediateHazardRouteIdsCausedBy only", () => {
    const source = readFileSync(resolve("src/mariner-route-hazard-reasons.ts"), "utf8");
    expect(source).toContain("immediateHazardRouteIdsCausedBy");
    expect(source).toContain("immediateHazardRouteIds");
    expect(source).not.toMatch(/regionIsTyphoonScale|seaRegionHasBeast|sharedBoundingRouteIds|stormCount\(/);
  });

  it("matches the shipping-hazards truth table for Typhoon-scale regions", () => {
    const state = mariner({
      storms: { thyrian_sea: 2, kings_gulf: 1 },
      routes: {
        [THYRIAN_FAR_REACH]: { kind: "ship" },
        [ISHANA_TAHV]: { kind: "ship" },
      },
    });
    assertReasonEquivalence(state);
    expect(marinerRouteImmediateHazardReasons(THYRIAN_FAR_REACH, state).length).toBeGreaterThan(0);
    expect(marinerRouteImmediateHazardReasons(ISHANA_TAHV, state)).toEqual([]);
  });

  it("matches non-threatened lone Storm and two-Storm-without-Beast cases", () => {
    assertReasonEquivalence(mariner({ storms: { thyrian_sea: 1 }, routes: { [THYRIAN_FAR_REACH]: { kind: "ship" } } }));
    assertReasonEquivalence(mariner({
      storms: { thyrian_sea: 1, ruins_of_old_ishana: 1 },
      routes: { [THYRIAN_DRUNTYR]: { kind: "ship" }, [THYRIAN_FAR_REACH]: { kind: "ship" } },
    }));
  });

  it("matches Beast + Storm Typhoon-scale and beast/storm boundary cases", () => {
    const beastStorm = mariner({
      storms: { thyrian_sea: 1 },
      beasts: [beastIn("thyrian_sea")],
      routes: { [THYRIAN_FAR_REACH]: { kind: "raider", toward: { kind: "board_isle", boardIsleId: "thyras" } } },
    });
    assertReasonEquivalence(beastStorm);
    const boundary = mariner({
      storms: { ruins_of_old_ishana: 1 },
      beasts: [beastIn("thyrian_sea")],
      routes: { [THYRIAN_DRUNTYR]: { kind: "ship" }, [RUINS_SCUTTLE_THYRAS]: { kind: "ship" } },
    });
    assertReasonEquivalence(boundary);
    expect(marinerRouteImmediateHazardReasons(THYRIAN_DRUNTYR, boundary).length).toBeGreaterThan(0);
    expect(marinerRouteImmediateHazardReasons(RUINS_SCUTTLE_THYRAS, boundary)).toEqual([]);
  });

  it("returns deterministic concise reason lists", () => {
    const state = mariner({
      storms: { thyrian_sea: 2 },
      routes: { [THYRIAN_FAR_REACH]: { kind: "ship" } },
    });
    const first = marinerRouteImmediateHazardReasons(THYRIAN_FAR_REACH, state);
    const second = marinerRouteImmediateHazardReasons(THYRIAN_FAR_REACH, state);
    expect(first).toEqual(second);
    expect(first.length).toBeLessThanOrEqual(4);
    expect(first.every((reason) => reason.kind === "focus_region")).toBe(true);
  });
});
