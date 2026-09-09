import { describe, it, expect } from "vitest";
import type {
  CampaignStateV5,
  DenizenId,
  IsleId,
  MonthOrdinal,
  PlaceId,
  PlayerId,
  WizardId,
} from "../shared/domain";
import {
  CURRENT_STATE_SCHEMA_VERSION,
  DomainError,
  EMPTY_HIEROPHANT_STATE,
  EMPTY_MARINER_STATE,
  EMPTY_SHARED_WORLD_STATE,
  MARINER_ARRANGEMENT_DEFINITIONS,
  MARINER_BOARD_ISLE_DEFINITIONS,
  MARINER_BOARD_ISLE_IDS,
  MARINER_BUILTIN_BEAST_DEFINITIONS,
  MARINER_HORIZON_CARDINAL_GROUPS,
  MARINER_HORIZON_REGION_IDS,
  MARINER_INTERIOR_SEA_REGION_IDS,
  MARINER_LAW_OF_SEA_DEFINITIONS,
  MARINER_LAW_OF_SEA_IDS,
  MARINER_ROUTE_DEFINITIONS,
  MARINER_SEA_REGION_DEFINITIONS,
  MARINER_SEA_REGION_IDS,
  SEVEN_PART_PACT_DRAFT4_ID,
  SEVEN_PART_PACT_DRAFT4_VERSION,
  buildInitializedDefaultMarinerState,
  initialCampaignState,
  marinerRouteId,
  validateCampaignState,
  validateCampaignStateV5Candidate,
  validateMarinerStructure,
} from "../shared/domain";
import type { MarinerBoardIsleId, MarinerBeastState, MarinerState } from "../shared/domain";

const CAMPAIGN_A = "cmp_00000000-0000-0000-0000-000000000001";
const PLR_A = "plr_00000000-0000-0000-0000-00000000000a" as PlayerId;
const WIZ_A = "wiz_00000000-0000-0000-0000-00000000000a" as WizardId;
const SHIP = "plc_00000000-0000-0000-0000-0000000000aa" as PlaceId;
const FIXED_PLACE = "plc_00000000-0000-0000-0000-0000000000bb" as PlaceId;
const DEN_1 = "den_00000000-0000-0000-0000-000000000001" as DenizenId;
const DEN_2 = "den_00000000-0000-0000-0000-000000000002" as DenizenId;
const DEN_COLLECTIVE = "den_00000000-0000-0000-0000-0000000000cc" as DenizenId;

const EMPTY_PACT_SEATS = {
  necromancer: { status: null, wizardId: null, watcherPlayerId: null },
  hierophant: { status: null, wizardId: null, watcherPlayerId: null },
  warlock: { status: null, wizardId: null, watcherPlayerId: null },
  mariner: { status: null, wizardId: null, watcherPlayerId: null },
  faustian: { status: null, wizardId: null, watcherPlayerId: null },
  sage: { status: null, wizardId: null, watcherPlayerId: null },
  sorcerer: { status: null, wizardId: null, watcherPlayerId: null },
} as const;

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

function defaultWorld(options?: {
  shipPlacement?: "mobile" | "on_isle" | "missing";
  omitIsle?: MarinerBoardIsleId;
  extraCollective?: boolean;
}) {
  const bindings = worldIsleIds();
  const isles = MARINER_BOARD_ISLE_IDS.filter((id) => id !== options?.omitIsle).map((id) => ({
    isleId: bindings[id],
    name: id,
    description: null,
  }));
  const places = options?.shipPlacement === "missing"
    ? []
    : [{
      placeId: SHIP,
      name: "The Mariner's Ship",
      description: null,
      placement: options?.shipPlacement === "on_isle"
        ? { kind: "on_isle" as const, isleId: bindings.ishana }
        : { kind: "mobile" as const, associatedIsleId: null },
    }];
  const denizens: Array<{
    denizenId: DenizenId;
    name: string;
    representation: "individual" | "collective";
    description: null;
  }> = [
    { denizenId: DEN_1, name: "Beast One", representation: "individual", description: null },
    { denizenId: DEN_2, name: "Beast Two", representation: "individual", description: null },
  ];
  if (options?.extraCollective) {
    denizens.push({
      denizenId: DEN_COLLECTIVE,
      name: "A Flock",
      representation: "collective",
      description: null,
    });
  }
  return {
    denizens,
    isles,
    places,
    companionRelationships: [],
  };
}

function baseV5(mariner: MarinerState = EMPTY_MARINER_STATE, world = { ...EMPTY_SHARED_WORLD_STATE }): CampaignStateV5 {
  return {
    schemaVersion: 5,
    ruleset: { id: SEVEN_PART_PACT_DRAFT4_ID, version: SEVEN_PART_PACT_DRAFT4_VERSION },
    calendar: { monthOrdinal: 0 as MonthOrdinal },
    configuration: { ageId: null, facilitatorPlayerId: null },
    players: [{ playerId: PLR_A, name: "Alice" }],
    wizards: [{
      wizardId: WIZ_A,
      name: "Wizard A",
      portrayedByPlayerId: PLR_A,
      character: {
        elements: null,
        pactFragmentPersonalForm: null,
        familiarDescription: null,
        ageYears: null,
        publicChangesOfMagic: [],
        importantNotes: null,
      },
      homeIsleId: null,
      sanctumPlaceId: null,
    }],
    pactSeats: EMPTY_PACT_SEATS,
    lifecycle: {
      kind: "setup",
      orrery: { saturn: null, jupiter: null, mars: null, venus: null, mercury: null },
    },
    wizardmootHistory: [],
    world,
    hierophant: { ...EMPTY_HIEROPHANT_STATE },
    mariner,
  };
}

function initializedMariner(overrides?: Partial<Parameters<typeof buildInitializedDefaultMarinerState>[0]>): MarinerState {
  return buildInitializedDefaultMarinerState({
    shipPlaceId: SHIP,
    worldIsleIds: worldIsleIds(),
    ...overrides,
  });
}

describe("Mariner catalog fidelity", () => {
  it("catalogs exactly the 15 default board Isle identities", () => {
    expect(MARINER_BOARD_ISLE_IDS).toHaveLength(15);
    expect([...MARINER_BOARD_ISLE_IDS]).toEqual([
      "ishana",
      "scuttleport",
      "orrery",
      "far_reach",
      "halcyon_isles",
      "sage_atoll",
      "graven_isle",
      "tahv",
      "izor",
      "yeraine",
      "koire",
      "thyras",
      "spyrholm",
      "druntyr",
      "caravesse",
    ]);
    expect(MARINER_BOARD_ISLE_DEFINITIONS.map((d) => d.boardIsleId)).toEqual([...MARINER_BOARD_ISLE_IDS]);
    expect(MARINER_BOARD_ISLE_DEFINITIONS.find((d) => d.boardIsleId === "sage_atoll")?.displayName).toBe("Sage Atoll");
    expect(MARINER_BOARD_ISLE_IDS.join(" ")).not.toMatch(/starlit|moonlit/i);
  });

  it("catalogs all seven Laws of the Sea", () => {
    expect(MARINER_LAW_OF_SEA_IDS).toEqual([
      "first", "second", "third", "fourth", "fifth", "sixth", "seventh",
    ]);
    expect(MARINER_LAW_OF_SEA_DEFINITIONS).toHaveLength(7);
    expect(MARINER_LAW_OF_SEA_DEFINITIONS.map((d) => d.text)).toEqual([
      "Never let a woman walk around aboard a ship, for she'll bring bad luck.",
      "Always sing to the ship each morning and each night, so she'll keep steady.",
      "Never set sail without first shedding blood upon the ship.",
      "Never speak of drowning or wish another goodbye aboard a ship, for it will bring what is spoken of.",
      "Never kill a bird while sailing, for their presence brings wisdom from the gods.",
      "Never whistle aboard a boat, for the nereids find it annoying.",
      "Always sail with a cat aboard, for good fortune.",
    ]);
  });

  it("catalogs built-in Beast names and Elements from the dedicated Beast section", () => {
    expect(MARINER_BUILTIN_BEAST_DEFINITIONS.map((d) => [d.name, d.element])).toEqual([
      ["Griffin", "air"],
      ["Roc", "air"],
      ["Sphinx", "air"],
      ["Phoenix", "fire"],
      ["Chimera", "fire"],
      ["Dragon", "fire"],
      ["Giant", "earth"],
      ["Hydra", "earth"],
      ["Behemoth", "earth"],
      ["Sea Serpent", "water"],
      ["Kraken", "water"],
      ["Leviathan", "water"],
    ]);
    expect(MARINER_BUILTIN_BEAST_DEFINITIONS.map((d) => d.name)).not.toContain("Titan");
    expect(MARINER_BUILTIN_BEAST_DEFINITIONS.map((d) => d.name)).not.toContain("Goliath");
  });

  it("catalogs the 12 interior seas and four Horizon quadrants", () => {
    expect(MARINER_INTERIOR_SEA_REGION_IDS).toHaveLength(12);
    expect(MARINER_HORIZON_REGION_IDS).toEqual([
      "northwest_horizon",
      "northeast_horizon",
      "southeast_horizon",
      "southwest_horizon",
    ]);
    expect(MARINER_SEA_REGION_IDS).toHaveLength(16);
    expect(MARINER_SEA_REGION_DEFINITIONS.map((d) => d.displayName).sort()).toEqual([
      "Bay of Ishana",
      "King's Gulf",
      "Koiran Reef",
      "Northeast Horizon",
      "Northwest Horizon",
      "Ruins of Old Ishana",
      "Scuttle Channel",
      "Southeast Horizon",
      "Southwest Horizon",
      "The Chalk Cliffs",
      "The Devil's Sea",
      "The Sidereal Sea",
      "The Sunken Fleet",
      "The Thyrian Sea",
      "The Wainways",
      "Wizard's Strait",
    ].sort());
  });

  it("keeps Horizon cardinal groupings on the four quadrant regions", () => {
    const byId = Object.fromEntries(MARINER_HORIZON_CARDINAL_GROUPS.map((g) => [g.groupId, g]));
    expect(byId.north.regionIds).toEqual(["northwest_horizon", "northeast_horizon"]);
    expect(byId.east.regionIds).toEqual(["northeast_horizon", "southeast_horizon"]);
    expect(byId.south.regionIds).toEqual(["southeast_horizon", "southwest_horizon"]);
    expect(byId.west.regionIds).toEqual(["northwest_horizon", "southwest_horizon"]);
    const horizons = Object.fromEntries(
      MARINER_SEA_REGION_DEFINITIONS.filter((d) => d.kind === "horizon").map((d) => [d.regionId, d.cardinalGroupIds]),
    );
    expect(horizons.northwest_horizon).toEqual(["north", "west"]);
    expect(horizons.northeast_horizon).toEqual(["north", "east"]);
    expect(horizons.southeast_horizon).toEqual(["south", "east"]);
    expect(horizons.southwest_horizon).toEqual(["south", "west"]);
  });

  it("transcribes the complete primary-source Route topology", () => {
    expect(MARINER_ROUTE_DEFINITIONS).toHaveLength(30);
    const ids = new Set(MARINER_ROUTE_DEFINITIONS.map((d) => d.routeId));
    expect(ids.size).toBe(30);
    expect(ids.has(marinerRouteId({ kind: "board_isle", boardIsleId: "thyras" }, { kind: "external_land", externalLandId: "nebelheim" }))).toBe(true);
    expect(ids.has(marinerRouteId({ kind: "board_isle", boardIsleId: "koire" }, { kind: "external_land", externalLandId: "druj_lands" }))).toBe(true);
    expect(ids.has(marinerRouteId({ kind: "board_isle", boardIsleId: "yeraine" }, { kind: "external_land", externalLandId: "hecares" }))).toBe(true);
    expect(ids.has(marinerRouteId({ kind: "board_isle", boardIsleId: "izor" }, { kind: "external_land", externalLandId: "ur" }))).toBe(true);
    expect(ids.has(marinerRouteId({ kind: "board_isle", boardIsleId: "spyrholm" }, { kind: "board_isle", boardIsleId: "orrery" }))).toBe(true);
    expect(ids.has(marinerRouteId({ kind: "board_isle", boardIsleId: "ishana" }, { kind: "board_isle", boardIsleId: "scuttleport" }))).toBe(true);
    expect(ids.has(marinerRouteId({ kind: "board_isle", boardIsleId: "halcyon_isles" }, { kind: "board_isle", boardIsleId: "tahv" }))).toBe(true);
  });

  it("catalogs Quiet, Dynamic, and Explosive source arrangements", () => {
    expect(MARINER_ARRANGEMENT_DEFINITIONS.map((d) => d.arrangementId)).toEqual(["quiet", "dynamic", "explosive"]);
    const quiet = MARINER_ARRANGEMENT_DEFINITIONS[0];
    expect(quiet.raiders).toEqual([
      { routeId: marinerRouteId({ kind: "board_isle", boardIsleId: "scuttleport" }, { kind: "board_isle", boardIsleId: "ishana" }), toward: null },
    ]);
    expect(quiet.marketBoardIsleIds).toEqual(["scuttleport"]);
    const explosive = MARINER_ARRANGEMENT_DEFINITIONS[2];
    expect(explosive.isleRavageStormCounts).toEqual({ druntyr: 6 });
    expect(explosive.rarityBoardIsleIds).toEqual(["scuttleport"]);
  });
});

describe("Mariner empty-or-complete validation", () => {
  it("accepts the exact empty Mariner state", () => {
    expect(() => validateMarinerStructure(EMPTY_MARINER_STATE)).not.toThrow();
    const state = initialCampaignState();
    expect(state.mariner).toEqual(EMPTY_MARINER_STATE);
    expect(() => validateCampaignState(state)).not.toThrow();
    expect(() => validateCampaignStateV5Candidate(state)).not.toThrow();
  });

  it("accepts a complete initialized default topology", () => {
    const mariner = initializedMariner();
    expect(mariner.boardIsles).toHaveLength(15);
    expect(mariner.routes).toHaveLength(30);
    expect(mariner.seaRegions).toHaveLength(16);
    expect(() => validateMarinerStructure(mariner)).not.toThrow();
    const state = baseV5(mariner, defaultWorld());
    expect(() => validateCampaignStateV5Candidate(state)).not.toThrow();
  });

  it("rejects a partial topology", () => {
    const mariner = initializedMariner();
    const partial = { ...mariner, boardIsles: mariner.boardIsles.slice(0, 14) };
    expect(() => validateMarinerStructure(partial)).toThrow(DomainError);
  });

  it("rejects a duplicate required topology identity", () => {
    const mariner = initializedMariner();
    const duplicate = {
      ...mariner,
      boardIsles: [...mariner.boardIsles.slice(0, 14), mariner.boardIsles[0]],
    };
    expect(() => validateMarinerStructure(duplicate)).toThrow(DomainError);
  });

  it("rejects a missing required Route or sea region", () => {
    const mariner = initializedMariner();
    expect(() => validateMarinerStructure({ ...mariner, routes: mariner.routes.slice(1) })).toThrow(DomainError);
    expect(() => validateMarinerStructure({ ...mariner, seaRegions: mariner.seaRegions.slice(1) })).toThrow(DomainError);
  });
});

describe("Mariner shared references", () => {
  it("fails closed on a dangling board Isle binding", () => {
    const state = baseV5(initializedMariner(), defaultWorld({ omitIsle: "ishana" }));
    expect(() => validateCampaignStateV5Candidate(state)).toThrow(DomainError);
  });

  it("fails closed on duplicate shared-Isle bindings", () => {
    const bindings = worldIsleIds();
    bindings.scuttleport = bindings.ishana;
    const state = baseV5(initializedMariner({ worldIsleIds: bindings }), defaultWorld());
    expect(() => validateCampaignStateV5Candidate(state)).toThrow(DomainError);
  });

  it("fails closed on a dangling ship Place", () => {
    const state = baseV5(initializedMariner(), defaultWorld({ shipPlacement: "missing" }));
    expect(() => validateCampaignStateV5Candidate(state)).toThrow(DomainError);
  });

  it("fails closed on a non-mobile ship Place", () => {
    const state = baseV5(initializedMariner(), defaultWorld({ shipPlacement: "on_isle" }));
    expect(() => validateCampaignStateV5Candidate(state)).toThrow(DomainError);
  });

  it("fails closed on dangling, collective, or duplicate Beast Denizens", () => {
    const beast = (denizenId: DenizenId): MarinerBeastState => ({
      denizenId,
      element: "air",
      definitionId: "griffin",
      condition: "distrusting",
      location: { kind: "sea_region", regionId: "sunken_fleet" },
    });
    expect(() => validateCampaignStateV5Candidate(baseV5(
      initializedMariner({ beasts: [beast("den_00000000-0000-0000-0000-999999999999" as DenizenId)] }),
      defaultWorld(),
    ))).toThrow(DomainError);
    expect(() => validateCampaignStateV5Candidate(baseV5(
      initializedMariner({ beasts: [beast(DEN_COLLECTIVE)] }),
      defaultWorld({ extraCollective: true }),
    ))).toThrow(DomainError);
    expect(() => validateCampaignStateV5Candidate(baseV5(
      initializedMariner({ beasts: [beast(DEN_1), beast(DEN_1)] }),
      defaultWorld(),
    ))).toThrow(DomainError);
  });
});

describe("Mariner structural values", () => {
  it("rejects negative or non-safe Storm and ravage counts", () => {
    const mariner = initializedMariner();
    expect(() => validateMarinerStructure({
      ...mariner,
      seaRegions: mariner.seaRegions.map((r, i) => i === 0 ? { ...r, stormCount: -1 } : r),
    })).toThrow(DomainError);
    expect(() => validateMarinerStructure({
      ...mariner,
      seaRegions: mariner.seaRegions.map((r, i) => i === 0 ? { ...r, stormCount: 1.5 } : r),
    })).toThrow(DomainError);
    expect(() => validateMarinerStructure({
      ...mariner,
      boardIsles: mariner.boardIsles.map((isle, i) => i === 0 ? { ...isle, ravageStormCount: -1 } : isle),
    })).toThrow(DomainError);
  });

  it("rejects a bad Route ID and an invalid Raider direction", () => {
    const mariner = initializedMariner();
    expect(() => validateMarinerStructure({
      ...mariner,
      routes: [{ routeId: "not_a_route" as MarinerState["routes"][number]["routeId"], occupancy: { kind: "empty" } }, ...mariner.routes.slice(1)],
    })).toThrow(DomainError);
    const routeId = marinerRouteId(
      { kind: "board_isle", boardIsleId: "thyras" },
      { kind: "external_land", externalLandId: "nebelheim" },
    );
    expect(() => validateMarinerStructure({
      ...mariner,
      routes: mariner.routes.map((route) => route.routeId === routeId
        ? { ...route, occupancy: { kind: "raider", toward: { kind: "board_isle", boardIsleId: "ishana" } } }
        : route),
    })).toThrow(DomainError);
  });

  it("rejects multiple simultaneous Ship occupancy on one Route", () => {
    const mariner = initializedMariner();
    expect(() => validateMarinerStructure({
      ...mariner,
      routes: mariner.routes.map((route, i) => i === 0
        ? { ...route, occupancy: [{ kind: "ship" }, { kind: "ship" }] as unknown as MarinerState["routes"][number]["occupancy"] }
        : route),
    })).toThrow(DomainError);
  });

  it("rejects unknown or duplicate Laws, but not a non-two Law count", () => {
    const mariner = initializedMariner();
    expect(() => validateMarinerStructure({
      ...mariner,
      selectedLawOfSeaIds: ["not_a_law"] as unknown as MarinerState["selectedLawOfSeaIds"],
    })).toThrow(DomainError);
    expect(() => validateMarinerStructure({
      ...mariner,
      selectedLawOfSeaIds: ["first", "first"],
    })).toThrow(DomainError);
    expect(() => validateMarinerStructure(initializedMariner({ selectedLawOfSeaIds: [] }))).not.toThrow();
    expect(() => validateMarinerStructure(initializedMariner({ selectedLawOfSeaIds: ["third"] }))).not.toThrow();
    expect(() => validateMarinerStructure(initializedMariner({
      selectedLawOfSeaIds: ["first", "second", "seventh"],
    }))).not.toThrow();
  });

  it("rejects rarity without a Market, duplicate nesting, Market+nesting, and Element mismatch", () => {
    const mariner = initializedMariner();
    expect(() => validateMarinerStructure({
      ...mariner,
      boardIsles: mariner.boardIsles.map((isle) => isle.boardIsleId === "scuttleport"
        ? { ...isle, market: { present: false, rarity: "pearl" } as unknown as MarinerState["boardIsles"][number]["market"] }
        : isle),
    })).toThrow(DomainError);

    const nest = (denizenId: DenizenId): MarinerBeastState => ({
      denizenId,
      element: "water",
      definitionId: null,
      condition: "friendly_nesting",
      location: { kind: "board_isle", boardIsleId: "tahv" },
    });
    expect(() => validateMarinerStructure(initializedMariner({ beasts: [nest(DEN_1), nest(DEN_2)] }))).toThrow(DomainError);
    expect(() => validateMarinerStructure(initializedMariner({
      boardIsleOverrides: { tahv: { market: { present: true, rarity: null } } },
      beasts: [nest(DEN_1)],
    }))).toThrow(DomainError);
    expect(() => validateMarinerStructure(initializedMariner({
      beasts: [{
        denizenId: DEN_1,
        element: "fire",
        definitionId: "griffin",
        condition: "distrusting",
        location: { kind: "off_map" },
      }],
    }))).toThrow(DomainError);
  });
});

describe("CampaignState V5 Mariner integration", () => {
  it("accepts V5 with the exact empty Mariner state and keeps Hierophant/World intact", () => {
    const state = baseV5();
    expect(state.schemaVersion).toBe(CURRENT_STATE_SCHEMA_VERSION);
    expect(() => validateCampaignStateV5Candidate(state)).not.toThrow();
    expect(state.hierophant).toEqual(EMPTY_HIEROPHANT_STATE);
    expect(state.world).toEqual(EMPTY_SHARED_WORLD_STATE);
  });

  it("accepts V5 with a complete valid initialized Mariner state", () => {
    const state = baseV5(initializedMariner({ selectedLawOfSeaIds: ["first", "seventh"] }), defaultWorld());
    expect(() => validateCampaignState(state)).not.toThrow();
  });

  it("fails closed on malformed Mariner state", () => {
    const { mariner: _removed, ...rest } = baseV5() as CampaignStateV5 & { mariner?: unknown };
    expect(() => validateCampaignStateV5Candidate(rest)).toThrow(DomainError);
    expect(() => validateCampaignStateV5Candidate(baseV5({
      ...EMPTY_MARINER_STATE,
      boardIsles: initializedMariner().boardIsles,
    }))).toThrow(DomainError);
  });

  it("does not treat shipPlaceId === sanctumPlaceId as a permanent invariant", () => {
    const state = baseV5(initializedMariner(), defaultWorld());
    const withSanctum = {
      ...state,
      wizards: state.wizards.map((wizard) => ({ ...wizard, sanctumPlaceId: FIXED_PLACE })),
      world: {
        ...state.world,
        places: [
          ...state.world.places,
          { placeId: FIXED_PLACE, name: "A later Sanctum", description: null, placement: { kind: "on_isle" as const, isleId: worldIsleIds().ishana } },
        ],
      },
    };
    expect(withSanctum.mariner.shipPlaceId).not.toBe(withSanctum.wizards[0].sanctumPlaceId);
    expect(() => validateCampaignStateV5Candidate(withSanctum)).not.toThrow();
  });
});

void CAMPAIGN_A;
