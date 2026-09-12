import { describe, it, expect } from "vitest";
import {
  EMPTY_MARINER_STATE,
  MARINER_BOARD_ISLE_IDS,
  MARINER_EXTERNAL_LAND_IDS,
  MARINER_ROUTE_DEFINITIONS,
  MARINER_SEA_REGION_IDS,
  buildInitializedDefaultMarinerState,
  marinerRouteId,
  type DenizenId,
  type IsleId,
  type MarinerBoardIsleId,
  type MarinerBeastState,
  type PlaceId,
  type SorcererExternalPresence,
} from "../shared/domain";
import {
  MARINER_BOARD_ISLE_MAP_POINTS,
  MARINER_EXTERNAL_LAND_MAP_POINTS,
  MARINER_SEA_REGION_MAP_POINTS,
  arrangementNeedsRarity,
  arrangementNeedsStartingBeast,
  availableIndividualBeastDenizens,
  availableMobileShipPlaces,
  beastLocationLabel,
  boardIsleWorldName,
  buildInitializeMarinerPayload,
  buildSetMarinerRouteOccupancyPayload,
  buildSetMarinerSeaStormCountPayload,
  buildUpdateMarinerBeastFields,
  isMarinerInitialized,
  isTyphoon,
  mapEndpointPoint,
  marinerBeastLocationEqual,
  marinerDomainDisruptiveArcanists,
  marinerSeaResearchers,
  marinerSetupReady,
  researcherOperationalLabel,
  routeOccupancyLabel,
  routePresentationPath,
  setupLawsValid,
  stormPiecePresentation,
  uniqueSelectedLawIds,
  type MarinerSetupDraft,
} from "../src/mariner-view-model";

const SHIP = "plc_00000000-0000-0000-0000-0000000000aa";
const SANCTUM = "plc_00000000-0000-0000-0000-0000000000bb";
const FIXED = "plc_00000000-0000-0000-0000-0000000000cc";
const DEN_A = "den_00000000-0000-0000-0000-000000000001";
const DEN_B = "den_00000000-0000-0000-0000-000000000002";
const DEN_C = "den_00000000-0000-0000-0000-00000000000c";

function isleId(n: number): string {
  return `isl_00000000-0000-0000-0000-${String(n).padStart(12, "0")}`;
}

function worldIsleIds(): Record<MarinerBoardIsleId, IsleId> {
  const bindings = {} as Record<MarinerBoardIsleId, IsleId>;
  MARINER_BOARD_ISLE_IDS.forEach((id, index) => {
    bindings[id] = isleId(index + 1) as IsleId;
  });
  return bindings;
}

function completeBindings(): MarinerSetupDraft["isleBindings"] {
  const bindings: MarinerSetupDraft["isleBindings"] = {};
  MARINER_BOARD_ISLE_IDS.forEach((id, index) => {
    bindings[id] = isleId(index + 1);
  });
  return bindings;
}

function readyDraft(overrides: Partial<MarinerSetupDraft> = {}): MarinerSetupDraft {
  return {
    arrangementId: "quiet",
    selectedLawIds: ["first", "second"],
    isleBindings: completeBindings(),
    shipPlaceId: SHIP,
    startingBeastDenizenId: "",
    startingBeastElement: "",
    startingBeastDefinitionId: "",
    scuttleportRarity: "",
    ...overrides,
  };
}

const places = [
  { placeId: SHIP, name: "The Wave", placement: { kind: "mobile" as const, associatedIsleId: null } },
  { placeId: SANCTUM, name: "Sanctum Hold", placement: { kind: "mobile" as const, associatedIsleId: null } },
  { placeId: FIXED, name: "Stone Hall", placement: { kind: "on_isle" as const, isleId: isleId(1) } },
];

const isles = MARINER_BOARD_ISLE_IDS.map((id, index) => ({
  isleId: isleId(index + 1),
  name: id === "sage_atoll" ? "Moonlit Atoll" : `World ${id}`,
}));

describe("Mariner initialized vs empty", () => {
  it("treats the exact empty state as uninitialized", () => {
    expect(isMarinerInitialized(EMPTY_MARINER_STATE)).toBe(false);
  });

  it("treats a complete default map as initialized", () => {
    const mariner = buildInitializedDefaultMarinerState({
      shipPlaceId: SHIP as PlaceId,
      worldIsleIds: worldIsleIds(),
    });
    expect(isMarinerInitialized(mariner)).toBe(true);
  });
});

describe("schematic map presentation metadata", () => {
  it("has exactly 15 board Isle nodes, four external endpoints, and 16 region points", () => {
    expect(Object.keys(MARINER_BOARD_ISLE_MAP_POINTS)).toHaveLength(15);
    expect(MARINER_BOARD_ISLE_IDS.every((id) => MARINER_BOARD_ISLE_MAP_POINTS[id] !== undefined)).toBe(true);
    expect(Object.keys(MARINER_EXTERNAL_LAND_MAP_POINTS)).toHaveLength(4);
    expect(MARINER_EXTERNAL_LAND_IDS.every((id) => MARINER_EXTERNAL_LAND_MAP_POINTS[id] !== undefined)).toBe(true);
    expect(Object.keys(MARINER_SEA_REGION_MAP_POINTS)).toHaveLength(16);
    expect(MARINER_SEA_REGION_IDS.every((id) => MARINER_SEA_REGION_MAP_POINTS[id] !== undefined)).toBe(true);
  });

  it("resolves every Route to two presentation endpoints", () => {
    for (const route of MARINER_ROUTE_DEFINITIONS) {
      const path = routePresentationPath(route.routeId);
      expect(path).not.toBeNull();
      expect(path!.a).toEqual(mapEndpointPoint(route.endpointA));
      expect(path!.b).toEqual(mapEndpointPoint(route.endpointB));
    }
  });
});

describe("display helpers", () => {
  it("resolves World Isle names for board slots", () => {
    const mariner = buildInitializedDefaultMarinerState({
      shipPlaceId: SHIP as PlaceId,
      worldIsleIds: worldIsleIds(),
    });
    expect(boardIsleWorldName(mariner, isles, "sage_atoll")).toBe("Moonlit Atoll");
  });

  it("filters mobile ship Places only", () => {
    const mobile = availableMobileShipPlaces(places);
    expect(mobile.map((p) => p.placeId)).toEqual([SHIP, SANCTUM]);
  });

  it("filters unused individual Beast Denizens", () => {
    const beastProfile = {
      taxonomies: [{ kind: "builtin" as const, taxonomyId: "beast" as const }],
      status: { kind: "standard" as const, value: "malignant" as const },
      goal: null,
      methods: [],
      truths: [],
    };
    const denizens = [
      { denizenId: DEN_A, name: "A", representation: "individual" as const, powerfulProfile: beastProfile },
      { denizenId: DEN_B, name: "B", representation: "individual" as const, powerfulProfile: beastProfile },
      { denizenId: DEN_C, name: "Choir", representation: "collective" as const },
    ];
    const beasts = [{ denizenId: DEN_A as DenizenId } as MarinerBeastState];
    expect(availableIndividualBeastDenizens(denizens, beasts).map((d) => d.denizenId)).toEqual([DEN_B]);
  });

  it("derives Typhoon at 2+ Storms", () => {
    expect(isTyphoon(0)).toBe(false);
    expect(isTyphoon(1)).toBe(false);
    expect(isTyphoon(2)).toBe(true);
    expect(isTyphoon(6)).toBe(true);
  });

  it("labels Raider direction from the Route endpoint", () => {
    const mariner = buildInitializedDefaultMarinerState({
      shipPlaceId: SHIP as PlaceId,
      worldIsleIds: worldIsleIds(),
    });
    const label = routeOccupancyLabel(
      { kind: "raider", toward: { kind: "board_isle", boardIsleId: "ishana" } },
      mariner,
      isles,
    );
    expect(label).toContain("Raider toward");
    expect(label).toContain("World ishana");
  });

  it("labels Beast locations for sea, Isle, other Domain, and off-map", () => {
    const mariner = buildInitializedDefaultMarinerState({
      shipPlaceId: SHIP as PlaceId,
      worldIsleIds: worldIsleIds(),
    });
    expect(beastLocationLabel({ kind: "sea_region", regionId: "sunken_fleet" }, mariner, isles)).toBe("The Sunken Fleet");
    expect(beastLocationLabel({ kind: "board_isle", boardIsleId: "sage_atoll" }, mariner, isles)).toBe("Moonlit Atoll");
    expect(beastLocationLabel({ kind: "off_map" }, mariner, isles)).toBe("Beyond Isha");
    expect(beastLocationLabel({ kind: "other_domain", seatId: "hierophant" }, mariner, isles)).toBe("Hierophant");
  });
});

describe("setup readiness", () => {
  it("requires arrangement, exactly two Laws, unique bindings, and a mobile ship", () => {
    expect(marinerSetupReady(readyDraft({ arrangementId: "" }), places, null)).toBe(false);
    expect(marinerSetupReady(readyDraft({ selectedLawIds: ["first"] }), places, null)).toBe(false);
    expect(setupLawsValid(["first", "second"])).toBe(true);
    expect(setupLawsValid(["first", "second", "third"])).toBe(false);
    expect(marinerSetupReady(readyDraft({ shipPlaceId: FIXED }), places, null)).toBe(false);
    expect(marinerSetupReady(readyDraft(), places, null)).toBe(true);
  });

  it("applies the exactly-two Law rule only in setup readiness", () => {
    expect(uniqueSelectedLawIds(["third"])).toEqual(["third"]);
    expect(uniqueSelectedLawIds(["first", "second", "third"])).toEqual(["first", "second", "third"]);
    expect(setupLawsValid(["first", "second", "third"])).toBe(false);
  });

  it("requires a Sanctum match only when a Mariner Wizard exists", () => {
    const wizard = { wizardId: "wiz_1", name: "Neris", homeIsleId: isleId(1), sanctumPlaceId: SANCTUM };
    expect(marinerSetupReady(readyDraft(), places, wizard)).toBe(false);
    expect(marinerSetupReady(readyDraft({ shipPlaceId: SANCTUM }), places, wizard)).toBe(true);
    expect(marinerSetupReady(readyDraft(), places, null)).toBe(true);
  });

  it("requires a starting Beast for Dynamic/Explosive and Rarity for Explosive", () => {
    expect(arrangementNeedsStartingBeast("quiet")).toBe(false);
    expect(arrangementNeedsStartingBeast("dynamic")).toBe(true);
    expect(arrangementNeedsRarity("explosive")).toBe(true);
    expect(marinerSetupReady(readyDraft({ arrangementId: "dynamic" }), places, null)).toBe(false);
    expect(marinerSetupReady(readyDraft({
      arrangementId: "dynamic",
      startingBeastDenizenId: DEN_A,
      startingBeastElement: "water",
    }), places, null)).toBe(true);
    expect(marinerSetupReady(readyDraft({
      arrangementId: "explosive",
      startingBeastDenizenId: DEN_A,
      startingBeastElement: "water",
    }), places, null)).toBe(false);
    expect(marinerSetupReady(readyDraft({
      arrangementId: "explosive",
      startingBeastDenizenId: DEN_A,
      startingBeastElement: "water",
      scuttleportRarity: "black pearls",
    }), places, null)).toBe(true);
  });
});

describe("payload builders", () => {
  it("preserves expected-current Route occupancy and Storm count", () => {
    const occupancy = { kind: "ship" as const };
    const next = { kind: "empty" as const };
    const route = buildSetMarinerRouteOccupancyPayload({
      commandId: "cmd_1",
      expectedCampaignId: "cmp_1",
      routeId: "ishana__scuttleport",
      expectedOccupancy: occupancy,
      occupancy: next,
    });
    expect(route.expectedOccupancy).toEqual(occupancy);
    expect(route.occupancy).toEqual(next);
    const storms = buildSetMarinerSeaStormCountPayload({
      commandId: "cmd_1",
      expectedCampaignId: "cmp_1",
      regionId: "sidereal_sea",
      expectedStormCount: 1,
      stormCount: 2,
    });
    expect(storms.expectedStormCount).toBe(1);
    expect(storms.stormCount).toBe(2);
  });

  it("builds Quiet initialize payload without Beast or Rarity", () => {
    const payload = buildInitializeMarinerPayload({
      commandId: "cmd_1",
      expectedCampaignId: "cmp_1",
      draft: readyDraft(),
      places,
      wizard: null,
    });
    expect(payload?.arrangementBeasts).toEqual([]);
    expect(payload?.rarityDescriptions).toEqual([]);
    expect(payload?.selectedLawOfSeaIds).toEqual(["first", "second"]);
    expect(payload?.isleBindings).toHaveLength(15);
  });

  it("emits only changed Beast fields and can change condition+location atomically", () => {
    const current: MarinerBeastState = {
      denizenId: DEN_A as DenizenId,
      element: "water",
      definitionId: "kraken",
      condition: "distrusting",
      location: { kind: "sea_region", regionId: "sunken_fleet" },
    };
    expect(buildUpdateMarinerBeastFields(current, current)).toBeNull();
    const elementOnly = buildUpdateMarinerBeastFields(current, { ...current, element: "air" });
    expect(elementOnly).toEqual({ element: { expected: "water", value: "air" } });
    const atomic = buildUpdateMarinerBeastFields(current, {
      ...current,
      condition: "rampaging",
      location: { kind: "other_domain", seatId: "warlock" },
    });
    expect(atomic).toEqual({
      condition: { expected: "distrusting", value: "rampaging" },
      location: {
        expected: { kind: "sea_region", regionId: "sunken_fleet" },
        value: { kind: "other_domain", seatId: "warlock" },
      },
    });
    expect(marinerBeastLocationEqual(current.location, { kind: "sea_region", regionId: "sunken_fleet" })).toBe(true);
  });

  it("keeps initialize Law order from the caller rather than catalog-sorting", () => {
    const payload = buildInitializeMarinerPayload({
      commandId: "cmd_1",
      expectedCampaignId: "cmp_1",
      draft: readyDraft({ selectedLawIds: ["seventh", "first"] }),
      places,
      wizard: null,
    });
    expect(payload?.selectedLawOfSeaIds).toEqual(["seventh", "first"]);
  });
});

describe("route id helper used by occupancy tests", () => {
  it("builds the Scuttleport–Ishana Route id", () => {
    expect(marinerRouteId(
      { kind: "board_isle", boardIsleId: "scuttleport" },
      { kind: "board_isle", boardIsleId: "ishana" },
    )).toBe("ishana__scuttleport");
  });
});

describe("Mariner piece and Sorcerer presentation helpers", () => {
  it("renders Storm tokens as none / one / Typhoon cluster with accessible count", () => {
    expect(stormPiecePresentation(0)).toEqual({ tokenCount: 0, typhoon: false, accessibleCount: "Storms 0" });
    expect(stormPiecePresentation(1)).toEqual({ tokenCount: 1, typhoon: false, accessibleCount: "Storms 1" });
    expect(stormPiecePresentation(2)).toEqual({ tokenCount: 2, typhoon: true, accessibleCount: "Storms 2 · Typhoon" });
    expect(stormPiecePresentation(5).tokenCount).toBe(3);
    expect(stormPiecePresentation(5).accessibleCount).toBe("Storms 5 · Typhoon");
  });

  it("projects only Mariner-targeted Researchers and Mariner Disruptive Arcanists", () => {
    const presence: readonly SorcererExternalPresence[] = [
      {
        kind: "researcher" as const,
        denizenId: "den_a" as never,
        name: "Tide Reader",
        operationalThisMonth: false,
        positionId: "srp_sea_1" as const,
        target: { kind: "mariner_sea_region" as const, seaRegionId: "sunken_fleet" as const },
      },
      {
        kind: "researcher" as const,
        denizenId: "den_b" as never,
        name: "Temple Seer",
        operationalThisMonth: true,
        positionId: "srp_temple_krolis" as const,
        target: { kind: "hierophant_temple" as const, templeId: "krolis" as const },
      },
      {
        kind: "disruptive_arcanist" as const,
        denizenId: "den_c" as never,
        name: "Salt Vex",
        school: { kind: "source" as const, schoolId: "invocation" as const },
        seatId: "mariner" as const,
      },
      {
        kind: "disruptive_arcanist" as const,
        denizenId: "den_d" as never,
        name: "Other Vex",
        school: { kind: "source" as const, schoolId: "invocation" as const },
        seatId: "hierophant" as const,
      },
    ];
    expect(marinerSeaResearchers(presence, "sunken_fleet").map((entry) => entry.name)).toEqual(["Tide Reader"]);
    expect(marinerSeaResearchers(presence, "bay_of_ishana")).toEqual([]);
    expect(marinerDomainDisruptiveArcanists(presence).map((entry) => entry.name)).toEqual(["Salt Vex"]);
    expect(researcherOperationalLabel(true)).toBe("Working this month");
    expect(researcherOperationalLabel(false)).toBe("Unavailable this month");
  });
});
