import { describe, it, expect } from "vitest";
import type {
  CampaignStateV5,
  DenizenId,
  InitializeMarinerInput,
  IsleId,
  MarinerBeastState,
  MarinerBoardIsleId,
  MonthOrdinal,
  PlaceId,
  PlayerId,
  WizardId,
} from "../shared/domain";
import {
  CAMPAIGN_COMMAND_TYPES,
  DomainError,
  EMPTY_HIEROPHANT_STATE,
  EMPTY_MARINER_STATE,
  EMPTY_SHARED_WORLD_STATE,
  MARINER_ARRANGEMENT_DEFINITIONS,
  MARINER_BOARD_ISLE_IDS,
  SEVEN_PART_PACT_DRAFT4_ID,
  SEVEN_PART_PACT_DRAFT4_VERSION,
  addMarinerBeastFingerprint,
  applyAddMarinerBeast,
  applyInitializeMariner,
  applyRemoveMarinerBeast,
  applySetMarinerIsleMarket,
  applySetMarinerIsleRavage,
  applySetMarinerRouteOccupancy,
  applySetMarinerSeaStormCount,
  applySetMarinerShip,
  applySetSelectedSeaLaws,
  applyUpdateMarinerBeast,
  initializeMarinerFingerprint,
  isLogicalStateCommandType,
  marinerRouteId,
  removeMarinerBeastFingerprint,
  setMarinerRouteOccupancyFingerprint,
  setMarinerShipFingerprint,
  setSelectedSeaLawsFingerprint,
  updateMarinerBeastFingerprint,
  validateCampaignStateV5Candidate,
} from "../shared/domain";
import { validateEventCoherenceForTest } from "../convex/canonicalCommit";
import type { CanonicalCommitInput } from "../convex/canonicalCommit";
import {
  executeOrdinaryLogicalCommand,
  type CanonicalCampaign,
  type OrdinaryLogicalCommandIo,
  type OrdinaryLogicalCommandPreparation,
} from "../convex/ordinaryLogicalCommand";

const CAMPAIGN_A = "cmp_00000000-0000-0000-0000-000000000001";
const CAMPAIGN_B = "cmp_00000000-0000-0000-0000-000000000002";
const COMMAND_1 = "cmd_00000000-0000-0000-0000-000000000001";
const PLR_A = "plr_00000000-0000-0000-0000-00000000000a" as PlayerId;
const WIZ_A = "wiz_00000000-0000-0000-0000-00000000000a" as WizardId;
const SHIP = "plc_00000000-0000-0000-0000-0000000000aa" as PlaceId;
const SHIP_2 = "plc_00000000-0000-0000-0000-0000000000ab" as PlaceId;
const FIXED_PLACE = "plc_00000000-0000-0000-0000-0000000000bb" as PlaceId;
const DEN_1 = "den_00000000-0000-0000-0000-000000000001" as DenizenId;
const DEN_2 = "den_00000000-0000-0000-0000-000000000002" as DenizenId;

const EMPTY_PACT_SEATS = {
  necromancer: { status: null, wizardId: null, watcherPlayerId: null },
  hierophant: { status: null, wizardId: null, watcherPlayerId: null },
  warlock: { status: null, wizardId: null, watcherPlayerId: null },
  mariner: { status: null, wizardId: null, watcherPlayerId: null },
  faustian: { status: null, wizardId: null, watcherPlayerId: null },
  sage: { status: null, wizardId: null, watcherPlayerId: null },
  sorcerer: { status: null, wizardId: null, watcherPlayerId: null },
} as const;

const MARINER_COMMAND_TYPES = [
  "initialize_mariner",
  "set_mariner_ship",
  "set_selected_sea_laws",
  "set_mariner_route_occupancy",
  "set_mariner_sea_storm_count",
  "set_mariner_isle_market",
  "set_mariner_isle_ravage",
  "add_mariner_beast",
  "update_mariner_beast",
  "remove_mariner_beast",
] as const;

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

function isleBindings() {
  const ids = worldIsleIds();
  return MARINER_BOARD_ISLE_IDS.map((boardIsleId) => ({
    boardIsleId,
    worldIsleId: ids[boardIsleId],
  }));
}

function sunkenFleetBeast(denizenId: DenizenId = DEN_1): MarinerBeastState {
  return {
    denizenId,
    element: "water",
    definitionId: "kraken",
    condition: "distrusting",
    location: { kind: "sea_region", regionId: "sunken_fleet" },
  };
}

function defaultWorld(options?: { extraShip?: boolean; extraDenizen?: boolean }) {
  const bindings = worldIsleIds();
  return {
    denizens: [
      { denizenId: DEN_1, name: "Beast One", representation: "individual" as const, description: null },
      ...(options?.extraDenizen
        ? [{ denizenId: DEN_2, name: "Beast Two", representation: "individual" as const, description: null }]
        : []),
    ],
    isles: MARINER_BOARD_ISLE_IDS.map((id) => ({
      isleId: bindings[id],
      name: id,
      description: null,
    })),
    places: [
      { placeId: SHIP, name: "The Mariner's Ship", description: null, placement: { kind: "mobile" as const, associatedIsleId: null } },
      ...(options?.extraShip
        ? [{ placeId: SHIP_2, name: "A second ship", description: null, placement: { kind: "mobile" as const, associatedIsleId: null } }]
        : []),
      { placeId: FIXED_PLACE, name: "A hut", description: null, placement: { kind: "on_isle" as const, isleId: bindings.ishana } },
    ],
    companionRelationships: [],
  };
}

function baseV5(world = defaultWorld()): CampaignStateV5 {
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
    pactSeats: { ...EMPTY_PACT_SEATS },
    lifecycle: {
      kind: "setup",
      orrery: { saturn: null, jupiter: null, mars: null, venus: null, mercury: null },
    },
    wizardmootHistory: [],
    world,
    hierophant: { ...EMPTY_HIEROPHANT_STATE },
    mariner: { ...EMPTY_MARINER_STATE },
  };
}

function quietInput(overrides?: Partial<InitializeMarinerInput>): InitializeMarinerInput {
  return {
    arrangementId: "quiet",
    shipPlaceId: SHIP,
    selectedLawOfSeaIds: ["first", "seventh"],
    isleBindings: isleBindings(),
    arrangementBeasts: [],
    rarityDescriptions: [],
    ...overrides,
  };
}

function dynamicInput(overrides?: Partial<InitializeMarinerInput>): InitializeMarinerInput {
  return {
    ...quietInput(),
    arrangementId: "dynamic",
    arrangementBeasts: [sunkenFleetBeast()],
    ...overrides,
  };
}

function explosiveInput(overrides?: Partial<InitializeMarinerInput>): InitializeMarinerInput {
  return {
    ...quietInput(),
    arrangementId: "explosive",
    arrangementBeasts: [sunkenFleetBeast()],
    rarityDescriptions: [{ boardIsleId: "scuttleport", description: "A barnacle-crusted crown" }],
    ...overrides,
  };
}

function initializeQuiet(state: CampaignStateV5 = baseV5()) {
  return applyInitializeMariner(state, quietInput());
}

function scuttleIshanaRouteId() {
  return marinerRouteId(
    { kind: "board_isle", boardIsleId: "scuttleport" },
    { kind: "board_isle", boardIsleId: "ishana" },
  );
}

function occupancyByRoute(state: CampaignStateV5) {
  return Object.fromEntries(state.mariner.routes.map((route) => [route.routeId, route.occupancy]));
}

function expectArrangementApplied(state: CampaignStateV5, arrangementId: InitializeMarinerInput["arrangementId"]) {
  const arrangement = MARINER_ARRANGEMENT_DEFINITIONS.find((d) => d.arrangementId === arrangementId)!;
  const occupancy = occupancyByRoute(state);
  for (const routeId of arrangement.shipRouteIds) {
    expect(occupancy[routeId]).toEqual({ kind: "ship" });
  }
  for (const raider of arrangement.raiders) {
    expect(occupancy[raider.routeId]).toEqual({ kind: "raider", toward: raider.toward });
  }
  for (const region of state.mariner.seaRegions) {
    expect(region.stormCount).toBe(arrangement.seaStormCounts[region.regionId] ?? 0);
  }
  for (const isle of state.mariner.boardIsles) {
    const hasMarket = arrangement.marketBoardIsleIds.includes(isle.boardIsleId);
    const rarity = arrangement.rarityBoardIsleIds.includes(isle.boardIsleId)
      ? (isle.market.present ? isle.market.rarity : null)
      : null;
    if (!hasMarket) {
      expect(isle.market).toEqual({ present: false });
    } else if (arrangement.rarityBoardIsleIds.includes(isle.boardIsleId)) {
      expect(isle.market.present).toBe(true);
      expect(rarity).toBeTruthy();
    } else {
      expect(isle.market).toEqual({ present: true, rarity: null });
    }
    expect(isle.ravageStormCount).toBe(arrangement.isleRavageStormCounts[isle.boardIsleId] ?? 0);
  }
}

describe("initialize_mariner", () => {
  it("initializes Quiet from the exact empty state using the static arrangement catalog", () => {
    const result = initializeQuiet();
    expect(result.events[0]?.type).toBe("mariner_initialized");
    expect(result.nextState.mariner.boardIsles).toHaveLength(15);
    expect(result.nextState.mariner.routes).toHaveLength(30);
    expect(result.nextState.mariner.seaRegions).toHaveLength(16);
    expect(result.nextState.mariner.selectedLawOfSeaIds).toEqual(["first", "seventh"]);
    expect(result.nextState.mariner.beasts).toEqual([]);
    expectArrangementApplied(result.nextState, "quiet");
    expect(result.nextState.mariner.boardIsles.find((isle) => isle.boardIsleId === "scuttleport")?.market)
      .toEqual({ present: true, rarity: null });
    expect(() => validateCampaignStateV5Candidate(result.nextState)).not.toThrow();
  });

  it("initializes Dynamic with exactly one caller-selected Distrusting Beast in the Sunken Fleet", () => {
    const result = applyInitializeMariner(baseV5(), dynamicInput());
    expect(result.nextState.mariner.beasts).toEqual([sunkenFleetBeast()]);
    expectArrangementApplied(result.nextState, "dynamic");
  });

  it("initializes Explosive with the caller-selected Beast and a nonblank Scuttleport Rarity", () => {
    const result = applyInitializeMariner(baseV5(), explosiveInput());
    expect(result.nextState.mariner.beasts).toEqual([sunkenFleetBeast()]);
    expect(result.nextState.mariner.boardIsles.find((isle) => isle.boardIsleId === "scuttleport")?.market)
      .toEqual({ present: true, rarity: "A barnacle-crusted crown" });
    expect(result.nextState.mariner.boardIsles.find((isle) => isle.boardIsleId === "druntyr")?.ravageStormCount)
      .toBe(6);
    expectArrangementApplied(result.nextState, "explosive");
  });

  it("rejects already-initialized Mariner state", () => {
    const initialized = initializeQuiet().nextState;
    expect(() => applyInitializeMariner(initialized, quietInput())).toThrow(DomainError);
  });

  it("requires exactly two unique valid Laws and rejects 1 or 3", () => {
    expect(() => applyInitializeMariner(baseV5(), quietInput({ selectedLawOfSeaIds: ["first"] }))).toThrow(DomainError);
    expect(() => applyInitializeMariner(baseV5(), quietInput({
      selectedLawOfSeaIds: ["first", "second", "seventh"],
    }))).toThrow(DomainError);
    expect(() => applyInitializeMariner(baseV5(), quietInput({
      selectedLawOfSeaIds: ["first", "first"],
    }))).toThrow(DomainError);
  });

  it("rejects missing, duplicate, unknown, or colliding World Isle bindings", () => {
    const bindings = isleBindings();
    expect(() => applyInitializeMariner(baseV5(), quietInput({ isleBindings: bindings.slice(1) }))).toThrow(DomainError);
    expect(() => applyInitializeMariner(baseV5(), quietInput({
      isleBindings: [...bindings.slice(0, 14), bindings[0]],
    }))).toThrow(DomainError);
    const duplicateWorld = bindings.map((binding, i) => i === 1 ? { ...binding, worldIsleId: bindings[0].worldIsleId } : binding);
    expect(() => applyInitializeMariner(baseV5(), quietInput({ isleBindings: duplicateWorld }))).toThrow(DomainError);
    const dangling = bindings.map((binding, i) => i === 0
      ? { ...binding, worldIsleId: "isl_00000000-0000-0000-0000-999999999999" as IsleId }
      : binding);
    expect(() => applyInitializeMariner(baseV5(), quietInput({ isleBindings: dangling }))).toThrow(DomainError);
  });

  it("rejects a missing or non-mobile ship Place", () => {
    const missingShip = baseV5({
      ...defaultWorld(),
      places: defaultWorld().places.filter((place) => place.placeId !== SHIP),
    });
    expect(() => applyInitializeMariner(missingShip, quietInput())).toThrow(DomainError);
    expect(() => applyInitializeMariner(baseV5(), quietInput({ shipPlaceId: FIXED_PLACE }))).toThrow(DomainError);
  });

  it("requires a matching sanctum when the Mariner seat has a Wizard, and allows a vacant seat", () => {
    const vacant = initializeQuiet();
    expect(vacant.nextState.pactSeats.mariner.wizardId).toBeNull();

    const assigned = {
      ...baseV5(),
      pactSeats: {
        ...EMPTY_PACT_SEATS,
        mariner: { status: "present" as const, wizardId: WIZ_A, watcherPlayerId: null },
      },
    };
    expect(() => applyInitializeMariner(assigned, quietInput())).toThrow(DomainError);

    const matching = {
      ...assigned,
      wizards: assigned.wizards.map((wizard) => ({ ...wizard, sanctumPlaceId: SHIP })),
    };
    expect(() => applyInitializeMariner(matching, quietInput())).not.toThrow();
  });

  it("rejects Quiet setup Beasts and Dynamic/Explosive Beasts that are missing or wrongly placed", () => {
    expect(() => applyInitializeMariner(baseV5(), quietInput({
      arrangementBeasts: [sunkenFleetBeast()],
    }))).toThrow(DomainError);
    expect(() => applyInitializeMariner(baseV5(), dynamicInput({ arrangementBeasts: [] }))).toThrow(DomainError);
    expect(() => applyInitializeMariner(baseV5(), dynamicInput({
      arrangementBeasts: [{ ...sunkenFleetBeast(), location: { kind: "sea_region", regionId: "sidereal_sea" } }],
    }))).toThrow(DomainError);
    expect(() => applyInitializeMariner(baseV5(), dynamicInput({
      arrangementBeasts: [{ ...sunkenFleetBeast(), condition: "rampaging" }],
    }))).toThrow(DomainError);
    expect(() => applyInitializeMariner(baseV5(), explosiveInput({
      rarityDescriptions: [{ boardIsleId: "scuttleport", description: "   " }],
    }))).toThrow(DomainError);
  });
});

describe("post-initialization Mariner mutations", () => {
  it("changes ship Place with expected-value concurrency and does not touch Wizard sanctum", () => {
    const assigned = {
      ...baseV5(defaultWorld({ extraShip: true })),
      pactSeats: {
        ...EMPTY_PACT_SEATS,
        mariner: { status: "present" as const, wizardId: WIZ_A, watcherPlayerId: null },
      },
      wizards: baseV5().wizards.map((wizard) => ({ ...wizard, sanctumPlaceId: SHIP })),
    };
    const initialized = applyInitializeMariner(assigned, quietInput()).nextState;
    expect(() => applySetMarinerShip(initialized, SHIP_2, SHIP_2)).toThrow(DomainError);
    expect(() => applySetMarinerShip(initialized, SHIP, FIXED_PLACE)).toThrow(DomainError);
    const changed = applySetMarinerShip(initialized, SHIP, SHIP_2);
    expect(changed.events[0]?.type).toBe("mariner_ship_changed");
    expect(changed.nextState.mariner.shipPlaceId).toBe(SHIP_2);
    expect(changed.nextState.wizards[0].sanctumPlaceId).toBe(SHIP);
  });

  it("lets Sea Laws become 0, 1, or 3+ after initialization and rejects stale/unknown/duplicate IDs", () => {
    const initialized = initializeQuiet().nextState;
    expect(applySetSelectedSeaLaws(initialized, ["first", "seventh"], []).nextState.mariner.selectedLawOfSeaIds)
      .toEqual([]);
    expect(applySetSelectedSeaLaws(initialized, ["first", "seventh"], ["third"]).nextState.mariner.selectedLawOfSeaIds)
      .toEqual(["third"]);
    expect(applySetSelectedSeaLaws(initialized, ["first", "seventh"], ["first", "second", "third"])
      .nextState.mariner.selectedLawOfSeaIds).toEqual(["first", "second", "third"]);
    expect(() => applySetSelectedSeaLaws(initialized, ["first"], ["second"])).toThrow(DomainError);
    expect(() => applySetSelectedSeaLaws(initialized, ["first", "seventh"], ["first", "first"])).toThrow(DomainError);
    expect(() => applySetSelectedSeaLaws(initialized, ["first", "seventh"], ["not_a_law"] as never)).toThrow(DomainError);
    expect(() => applySetSelectedSeaLaws(initialized, ["first", "seventh"], ["first", "seventh"])).toThrow(DomainError);
  });

  it("updates Route occupancy with stale and Raider endpoint checks", () => {
    const initialized = initializeQuiet().nextState;
    const routeId = scuttleIshanaRouteId();
    const current = { kind: "raider" as const, toward: { kind: "board_isle" as const, boardIsleId: "ishana" as const } };
    expect(() => applySetMarinerRouteOccupancy(initialized, routeId, { kind: "empty" }, { kind: "ship" }))
      .toThrow(DomainError);
    expect(() => applySetMarinerRouteOccupancy(initialized, routeId, current, {
      kind: "raider",
      toward: { kind: "board_isle", boardIsleId: "thyras" },
    })).toThrow(DomainError);
    const updated = applySetMarinerRouteOccupancy(initialized, routeId, current, { kind: "empty" });
    expect(updated.events[0]?.type).toBe("mariner_route_occupancy_changed");
    expect(updated.nextState.mariner.routes.find((route) => route.routeId === routeId)?.occupancy)
      .toEqual({ kind: "empty" });
  });

  it("updates Storm and Ravage counts with stale and integer checks", () => {
    const initialized = initializeQuiet().nextState;
    expect(() => applySetMarinerSeaStormCount(initialized, "sidereal_sea", 0, 2)).toThrow(DomainError);
    expect(() => applySetMarinerSeaStormCount(initialized, "sidereal_sea", 1, -1)).toThrow(DomainError);
    expect(applySetMarinerSeaStormCount(initialized, "sidereal_sea", 1, 3)
      .nextState.mariner.seaRegions.find((region) => region.regionId === "sidereal_sea")?.stormCount).toBe(3);
    expect(() => applySetMarinerIsleRavage(initialized, "druntyr", 1, 2)).toThrow(DomainError);
    expect(() => applySetMarinerIsleRavage(initialized, "druntyr", 0, 1.5)).toThrow(DomainError);
    expect(applySetMarinerIsleRavage(initialized, "druntyr", 0, 2)
      .nextState.mariner.boardIsles.find((isle) => isle.boardIsleId === "druntyr")?.ravageStormCount).toBe(2);
  });

  it("updates Markets with rarity normalization and structural invariant failures", () => {
    const initialized = initializeQuiet().nextState;
    expect(() => applySetMarinerIsleMarket(
      initialized,
      "scuttleport",
      { present: false },
      { present: true, rarity: null },
    )).toThrow(DomainError);
    const trimmed = applySetMarinerIsleMarket(
      initialized,
      "scuttleport",
      { present: true, rarity: null },
      { present: true, rarity: "  pearl  " },
    );
    expect(trimmed.nextState.mariner.boardIsles.find((isle) => isle.boardIsleId === "scuttleport")?.market)
      .toEqual({ present: true, rarity: "pearl" });

    const nested = applyAddMarinerBeast(initialized, {
      denizenId: DEN_1,
      element: "water",
      definitionId: null,
      condition: "friendly_nesting",
      location: { kind: "board_isle", boardIsleId: "tahv" },
    }).nextState;
    expect(() => applySetMarinerIsleMarket(
      nested,
      "tahv",
      { present: false },
      { present: true, rarity: null },
    )).toThrow(DomainError);
  });

  it("adds, atomically updates, and removes Beasts, including other_domain Rampaging rules", () => {
    const initialized = initializeQuiet().nextState;
    const added = applyAddMarinerBeast(initialized, sunkenFleetBeast());
    expect(added.events[0]?.type).toBe("mariner_beast_added");
    const updated = applyUpdateMarinerBeast(added.nextState, DEN_1, {
      condition: { expected: "distrusting", value: "rampaging" },
      location: {
        expected: { kind: "sea_region", regionId: "sunken_fleet" },
        value: { kind: "other_domain", seatId: "hierophant" },
      },
    });
    expect(updated.events[0]?.type).toBe("mariner_beast_updated");
    expect(updated.nextState.mariner.beasts[0]).toMatchObject({
      condition: "rampaging",
      location: { kind: "other_domain", seatId: "hierophant" },
    });
    expect(() => applyUpdateMarinerBeast(added.nextState, DEN_1, {
      location: {
        expected: { kind: "sea_region", regionId: "sunken_fleet" },
        value: { kind: "other_domain", seatId: "hierophant" },
      },
    })).toThrow(DomainError);
    expect(() => applyUpdateMarinerBeast(updated.nextState, DEN_1, {
      location: {
        expected: { kind: "other_domain", seatId: "hierophant" },
        value: { kind: "other_domain", seatId: "mariner" },
      },
    })).toThrow(DomainError);
    expect(() => applyUpdateMarinerBeast(added.nextState, DEN_1, {
      element: { expected: "fire", value: "air" },
    })).toThrow(DomainError);
    const removed = applyRemoveMarinerBeast(updated.nextState, DEN_1, updated.nextState.mariner.beasts[0]);
    expect(removed.events[0]).toMatchObject({
      type: "mariner_beast_removed",
      data: { beast: updated.nextState.mariner.beasts[0] },
    });
    expect(() => applyRemoveMarinerBeast(updated.nextState, DEN_1, added.nextState.mariner.beasts[0]))
      .toThrow(DomainError);
  });
});

describe("Mariner anti-automation", () => {
  it("does not cascade Storm, occupancy, Ravage, Beast, or Law edits into unrelated mechanics", () => {
    const initialized = initializeQuiet().nextState;
    const storms = applySetMarinerSeaStormCount(initialized, "sidereal_sea", 1, 4).nextState;
    expect(storms.mariner.seaRegions.find((region) => region.regionId === "bay_of_ishana")?.stormCount).toBe(1);
    expect(occupancyByRoute(storms)).toEqual(occupancyByRoute(initialized));

    const occupancy = applySetMarinerRouteOccupancy(
      initialized,
      scuttleIshanaRouteId(),
      { kind: "raider", toward: { kind: "board_isle", boardIsleId: "ishana" } },
      { kind: "ship" },
    ).nextState;
    expect(occupancy.mariner.boardIsles.map((isle) => isle.market)).toEqual(
      initialized.mariner.boardIsles.map((isle) => isle.market),
    );

    const ravage = applySetMarinerIsleRavage(initialized, "druntyr", 0, 4).nextState;
    expect(ravage.world).toEqual(initialized.world);
    expect(ravage.hierophant).toEqual(initialized.hierophant);

    const withBeast = applyAddMarinerBeast(initialized, sunkenFleetBeast()).nextState;
    const moved = applyUpdateMarinerBeast(withBeast, DEN_1, {
      condition: { expected: "distrusting", value: "rampaging" },
      location: {
        expected: { kind: "sea_region", regionId: "sunken_fleet" },
        value: { kind: "sea_region", regionId: "sidereal_sea" },
      },
    }).nextState;
    expect(moved.mariner.seaRegions).toEqual(initialized.mariner.seaRegions);
    expect(moved.mariner.boardIsles).toEqual(initialized.mariner.boardIsles);

    const laws = applySetSelectedSeaLaws(initialized, ["first", "seventh"], ["second"]).nextState;
    expect(laws.mariner.routes).toEqual(initialized.mariner.routes);
    expect(laws.mariner.boardIsles).toEqual(initialized.mariner.boardIsles);
    expect(laws.mariner.seaRegions).toEqual(initialized.mariner.seaRegions);
    expect(laws.world).toEqual(initialized.world);
  });
});

describe("Mariner command registration and fingerprints", () => {
  it("registers all ten Mariner commands as active logical commands with deterministic fingerprints", () => {
    for (const commandType of MARINER_COMMAND_TYPES) {
      expect(CAMPAIGN_COMMAND_TYPES as readonly string[]).toContain(commandType);
      expect(isLogicalStateCommandType(commandType)).toBe(true);
    }
    const input = quietInput();
    expect(initializeMarinerFingerprint(CAMPAIGN_A, input)).toBe(initializeMarinerFingerprint(CAMPAIGN_A, input));
    expect(initializeMarinerFingerprint(CAMPAIGN_B, input)).not.toBe(initializeMarinerFingerprint(CAMPAIGN_A, input));
    expect(setSelectedSeaLawsFingerprint(CAMPAIGN_A, ["first", "seventh"], ["second"]))
      .not.toBe(setSelectedSeaLawsFingerprint(CAMPAIGN_A, ["first"], ["second"]));
    expect(setMarinerShipFingerprint(CAMPAIGN_A, SHIP, SHIP_2))
      .not.toBe(setMarinerShipFingerprint(CAMPAIGN_A, SHIP_2, SHIP_2));
    const beast = sunkenFleetBeast();
    expect(addMarinerBeastFingerprint(CAMPAIGN_A, beast)).toBe(addMarinerBeastFingerprint(CAMPAIGN_A, beast));
    expect(updateMarinerBeastFingerprint(CAMPAIGN_A, DEN_1, { condition: { expected: "distrusting", value: "rampaging" } }))
      .not.toBe(updateMarinerBeastFingerprint(CAMPAIGN_A, DEN_1, { condition: { expected: "friendly_nesting", value: "rampaging" } }));
    expect(removeMarinerBeastFingerprint(CAMPAIGN_A, DEN_1, beast))
      .not.toBe(removeMarinerBeastFingerprint(CAMPAIGN_A, DEN_1, { ...beast, condition: "rampaging" }));
  });
});

describe("Mariner ordinary command path", () => {
  function campaignOf(campaignId: string, state: CampaignStateV5, revision = 4): CanonicalCampaign {
    return {
      docId: "dummy" as CanonicalCampaign["docId"],
      campaignId,
      currentRevision: revision,
      currentState: state,
    };
  }

  function recordingIo(options: {
    campaign: CanonicalCampaign;
    accepted?: { commandType: string; commandFingerprint: string; campaignRevision: number } | null;
    snapshot?: unknown | null;
  }) {
    const calls: string[] = [];
    const commits: CanonicalCommitInput[] = [];
    const io: OrdinaryLogicalCommandIo = {
      async assertNotDeleting() { calls.push("assertNotDeleting"); },
      async loadCanonicalCampaign() {
        calls.push("loadCanonicalCampaign");
        return options.campaign;
      },
      async findAcceptedCommand() {
        calls.push("findAcceptedCommand");
        return options.accepted === undefined ? null : options.accepted;
      },
      async loadCommittedSnapshot() {
        calls.push("loadCommittedSnapshot");
        return options.snapshot === undefined ? options.campaign.currentState : options.snapshot;
      },
      async commit(input) {
        calls.push("commit");
        commits.push(input);
        return { newRevision: options.campaign.currentRevision + 1, state: input.nextState, alreadyApplied: false };
      },
    };
    return { io, calls, commits };
  }

  it("initializes Mariner through the ordinary executor with campaign protection, snapshot, events, and idempotency", async () => {
    const state = baseV5();
    const input = quietInput();
    const fingerprint = initializeMarinerFingerprint(CAMPAIGN_A, input);
    const prepare: () => OrdinaryLogicalCommandPreparation = () => ({
      commandType: "initialize_mariner",
      commandFingerprint: fingerprint,
      apply: (current) => applyInitializeMariner(current, input),
    });

    const wrongCampaign = recordingIo({ campaign: campaignOf(CAMPAIGN_B, state) });
    await expect(executeOrdinaryLogicalCommand(
      wrongCampaign.io,
      { commandId: COMMAND_1, expectedCampaignId: CAMPAIGN_A },
      prepare,
    )).rejects.toMatchObject({ code: "STALE_COMMAND_PRECONDITION" });
    expect(wrongCampaign.commits).toHaveLength(0);

    const accepted = recordingIo({ campaign: campaignOf(CAMPAIGN_A, state, 4) });
    const receipt = await executeOrdinaryLogicalCommand(
      accepted.io,
      { commandId: COMMAND_1, expectedCampaignId: CAMPAIGN_A },
      prepare,
    );
    expect(receipt).toEqual({ revision: 5 });
    expect(accepted.commits[0]?.nextState.mariner.routes).toHaveLength(30);
    expect(accepted.commits[0]?.events[0]?.type).toBe("mariner_initialized");
    expect(() => validateEventCoherenceForTest(accepted.commits[0]!, 1)).not.toThrow();

    const replay = recordingIo({
      campaign: campaignOf(CAMPAIGN_A, accepted.commits[0]!.nextState, 5),
      accepted: { commandType: "initialize_mariner", commandFingerprint: fingerprint, campaignRevision: 5 },
      snapshot: accepted.commits[0]!.nextState,
    });
    const replayReceipt = await executeOrdinaryLogicalCommand(
      replay.io,
      { commandId: COMMAND_1, expectedCampaignId: CAMPAIGN_A },
      prepare,
    );
    expect(replayReceipt).toEqual({ revision: 5 });
    expect(replay.commits).toHaveLength(0);

    const conflict = recordingIo({
      campaign: campaignOf(CAMPAIGN_A, state),
      accepted: { commandType: "initialize_mariner", commandFingerprint: fingerprint, campaignRevision: 5 },
    });
    await expect(executeOrdinaryLogicalCommand(
      conflict.io,
      { commandId: COMMAND_1, expectedCampaignId: CAMPAIGN_A },
      () => ({
        commandType: "initialize_mariner",
        commandFingerprint: initializeMarinerFingerprint(CAMPAIGN_A, quietInput({ selectedLawOfSeaIds: ["second", "third"] })),
        apply: (current) => applyInitializeMariner(current, quietInput({ selectedLawOfSeaIds: ["second", "third"] })),
      }),
    )).rejects.toMatchObject({ code: "COMMAND_ID_REUSED" });
    expect(conflict.commits).toHaveLength(0);
  });

  it("commits a representative occupancy mutation and refuses a stale occupancy change", async () => {
    const initialized = initializeQuiet().nextState;
    const routeId = scuttleIshanaRouteId();
    const expectedOccupancy = { kind: "raider" as const, toward: { kind: "board_isle" as const, boardIsleId: "ishana" as const } };
    const occupancy = { kind: "ship" as const };
    const fingerprint = setMarinerRouteOccupancyFingerprint(CAMPAIGN_A, routeId, expectedOccupancy, occupancy);
    const { io, commits } = recordingIo({ campaign: campaignOf(CAMPAIGN_A, initialized, 8) });
    const receipt = await executeOrdinaryLogicalCommand(
      io,
      { commandId: COMMAND_1, expectedCampaignId: CAMPAIGN_A },
      () => ({
        commandType: "set_mariner_route_occupancy",
        commandFingerprint: fingerprint,
        apply: (current) => applySetMarinerRouteOccupancy(current, routeId, expectedOccupancy, occupancy),
      }),
    );
    expect(receipt).toEqual({ revision: 9 });
    expect(commits[0]?.events[0]?.type).toBe("mariner_route_occupancy_changed");
    expect(commits[0]?.nextState.mariner.routes.find((route) => route.routeId === routeId)?.occupancy)
      .toEqual({ kind: "ship" });

    const stale = recordingIo({ campaign: campaignOf(CAMPAIGN_A, initialized, 8) });
    await expect(executeOrdinaryLogicalCommand(
      stale.io,
      { commandId: COMMAND_1, expectedCampaignId: CAMPAIGN_A },
      () => ({
        commandType: "set_mariner_route_occupancy",
        commandFingerprint: setMarinerRouteOccupancyFingerprint(CAMPAIGN_A, routeId, { kind: "empty" }, occupancy),
        apply: (current) => applySetMarinerRouteOccupancy(current, routeId, { kind: "empty" }, occupancy),
      }),
    )).rejects.toMatchObject({ code: "STALE_COMMAND_PRECONDITION" });
    expect(stale.commits).toHaveLength(0);
  });

  it("commits a Beast nested-union mutation through the ordinary executor", async () => {
    const withBeast = applyAddMarinerBeast(initializeQuiet().nextState, sunkenFleetBeast()).nextState;
    const fields = {
      condition: { expected: "distrusting" as const, value: "rampaging" as const },
      location: {
        expected: { kind: "sea_region" as const, regionId: "sunken_fleet" as const },
        value: { kind: "other_domain" as const, seatId: "warlock" as const },
      },
    };
    const { io, commits } = recordingIo({ campaign: campaignOf(CAMPAIGN_A, withBeast, 11) });
    const receipt = await executeOrdinaryLogicalCommand(
      io,
      { commandId: COMMAND_1, expectedCampaignId: CAMPAIGN_A },
      () => ({
        commandType: "update_mariner_beast",
        commandFingerprint: updateMarinerBeastFingerprint(CAMPAIGN_A, DEN_1, fields),
        apply: (current) => applyUpdateMarinerBeast(current, DEN_1, fields),
      }),
    );
    expect(receipt).toEqual({ revision: 12 });
    expect(commits[0]?.events[0]?.type).toBe("mariner_beast_updated");
    expect(commits[0]?.nextState.mariner.beasts[0]?.location).toEqual({ kind: "other_domain", seatId: "warlock" });
    expect(() => validateEventCoherenceForTest(commits[0]!, 1)).not.toThrow();
  });
});
