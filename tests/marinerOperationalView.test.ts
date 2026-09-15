import { describe, expect, it } from "vitest";
import {
  buildInitializedDefaultMarinerState,
  marinerRouteId,
  type DenizenId,
  type IsleId,
  type MarinerBoardIsleId,
  type PlaceId,
} from "../shared/domain";
import { MARINER_BOARD_ISLE_IDS } from "../shared/domain";
import {
  marinerIsleOperationalView,
  marinerRouteOperationalView,
  marinerSeaOperationalView,
  marinerVisionsForecast,
} from "../src/mariner-operational-view";
import { isRouteUnderImmediateHazard } from "../shared/domain";

function isleId(n: number): IsleId {
  return `isl_00000000-0000-0000-0000-${String(n).padStart(12, "0")}` as IsleId;
}

function worldIsleIds(): Record<MarinerBoardIsleId, IsleId> {
  const bindings = {} as Record<MarinerBoardIsleId, IsleId>;
  MARINER_BOARD_ISLE_IDS.forEach((id, index) => {
    bindings[id] = isleId(index + 1);
  });
  return bindings;
}

const RAID_ROUTE = marinerRouteId(
  { kind: "board_isle", boardIsleId: "ishana" },
  { kind: "board_isle", boardIsleId: "scuttleport" },
);
const SHIP_ROUTE = marinerRouteId(
  { kind: "board_isle", boardIsleId: "thyras" },
  { kind: "board_isle", boardIsleId: "far_reach" },
);
const THREATENED_SHIP_ROUTE = marinerRouteId(
  { kind: "board_isle", boardIsleId: "halcyon_isles" },
  { kind: "board_isle", boardIsleId: "tahv" },
);

function board() {
  return buildInitializedDefaultMarinerState({
    shipPlaceId: "plc_00000000-0000-0000-0000-0000000000aa" as PlaceId,
    worldIsleIds: worldIsleIds(),
    selectedLawOfSeaIds: ["first"],
    boardIsleOverrides: {
      scuttleport: { market: { present: true, rarity: "amber glass" } },
      druntyr: { ravageStormCount: 3 },
    },
    routeOccupancy: {
      [RAID_ROUTE]: { kind: "raider", toward: { kind: "board_isle", boardIsleId: "ishana" } },
      [SHIP_ROUTE]: { kind: "ship" },
      [THREATENED_SHIP_ROUTE]: { kind: "ship" },
    },
    seaStormCounts: { sidereal_sea: 2, bay_of_ishana: 1 },
    beasts: [{
      denizenId: "den_00000000-0000-0000-0000-000000000001" as DenizenId,
      element: "water",
      definitionId: "kraken",
      condition: "distrusting",
      location: { kind: "sea_region", regionId: "sunken_fleet" },
    }],
  });
}

describe("Mariner operational view (encoded facts only)", () => {
  it("does not invent a Map Stability number", () => {
    const view = marinerIsleOperationalView(board(), "ishana");
    expect(view.stability).toBeNull();
    expect(view.stabilityExplanation).toBeNull();
  });

  it("summarizes Market, Ravage, adjacent occupancy, and nesting from current state", () => {
    const scuttle = marinerIsleOperationalView(board(), "scuttleport");
    expect(scuttle.marketPresent).toBe(true);
    expect(scuttle.rarity).toBe("amber glass");
    expect(scuttle.adjacentOccupiedCount).toBeGreaterThan(0);
    const druntyr = marinerIsleOperationalView(board(), "druntyr");
    expect(druntyr.ravageStormCount).toBe(3);
  });

  it("marks a Raider Route toward its authoritative destination and a Ship Route as undirected", () => {
    const raider = marinerRouteOperationalView(board(), RAID_ROUTE);
    expect(raider.occupancyKind).toBe("raider");
    expect(raider.raidToward?.kind).toBe("board_isle");
    if (raider.raidToward?.kind === "board_isle") {
      expect(raider.raidToward.boardIsleId).toBe("ishana");
    }
    const ship = marinerRouteOperationalView(board(), SHIP_ROUTE);
    expect(ship.occupancyKind).toBe("ship");
    expect(ship.raidToward).toBeNull();
    expect(ship.travelDirection).toBeNull();
  });

  it("uses existing immediate-hazard helpers for threatened occupied Routes", () => {
    const mariner = board();
    const hazardBoard = { seaRegions: mariner.seaRegions, beasts: mariner.beasts, routes: mariner.routes };
    expect(isRouteUnderImmediateHazard(THREATENED_SHIP_ROUTE, hazardBoard)).toBe(true);
    const view = marinerRouteOperationalView(mariner, THREATENED_SHIP_ROUTE);
    expect(view.threatened).toBe(true);
    const quiet = marinerRouteOperationalView(mariner, SHIP_ROUTE);
    expect(quiet.threatened).toBe(false);
  });

  it("labels Typhoon from the existing Storms ≥ 2 presentation rule", () => {
    const typhoon = marinerSeaOperationalView(board(), "sidereal_sea");
    expect(typhoon.stormCount).toBe(2);
    expect(typhoon.typhoon).toBe(true);
    const storm = marinerSeaOperationalView(board(), "bay_of_ishana");
    expect(storm.stormCount).toBe(1);
    expect(storm.typhoon).toBe(false);
    expect(storm.legalGuidedDestinations.length).toBeGreaterThan(0);
  });

  it("builds a Visions forecast from current Storms, Typhoons, threatened occupied Routes, and Ravaged Isles", () => {
    const forecast = marinerVisionsForecast(board());
    expect(forecast.stormTotal).toBe(3);
    expect(forecast.typhoonSeaCount).toBe(1);
    expect(forecast.threatenedOccupiedCount).toBeGreaterThan(0);
    expect(forecast.ravagedIsleCount).toBe(1);
    expect(forecast.summary).toContain("Storms");
    expect(forecast.summary).toContain("Typhoon");
    expect(forecast.prevailingWind).toBeNull();
    expect(forecast.nextStormDestination).toBeNull();
  });
});
