import { describe, expect, it } from "vitest";
import type {
  CampaignStateV5,
  CreateMarinerBeastInput,
  DenizenId,
  IsleId,
  MarinerBeastLocation,
  MarinerBeastState,
  MarinerBoardIsleId,
  MarinerRouteOccupancy,
  MarinerSeaRegionId,
  MonthOrdinal,
  MoveMarinerShipInput,
  MoveMarinerStormInput,
  NestMarinerBeastInput,
  PlaceId,
  PlayerId,
  PowerfulDenizenMethodEntryId,
  RecordMarinerRavageResultInput,
  WizardId,
} from "../shared/domain";
import {
  CAMPAIGN_COMMAND_TYPES,
  DomainError,
  MARINER_SEA_REGION_DEFINITIONS,
  applyCreateMarinerBeast,
  applyInitializeMariner,
  applyMoveMarinerShip,
  applyMoveMarinerStorm,
  applyNestMarinerBeast,
  applyRecordMarinerRavageResult,
  applyAddMarinerBeast,
  applySetMarinerIsleMarket,
  applySetMarinerIsleRavage,
  applySetMarinerRouteOccupancy,
  applySetMarinerSeaStormCount,
  applySetPowerfulDenizenGoal,
  applyUpdateMarinerBeast,
  canonicalizeCreateMarinerBeastInput,
  canonicalizeMoveMarinerShipInput,
  canonicalizeMoveMarinerStormInput,
  canonicalizeNestMarinerBeastInput,
  canonicalizeRecordMarinerRavageResultInput,
  createMarinerBeastFingerprint,
  createMarinerShipFingerprint,
  isLogicalStateCommandType,
  marinerRouteId,
  moveMarinerBeastFingerprint,
  moveMarinerShipFingerprint,
  moveMarinerStormFingerprint,
  nestMarinerBeastFingerprint,
  recordMarinerRavageResultFingerprint,
  validateCampaignStateV5Candidate,
} from "../shared/domain";
import type { CreateMarinerShipInput, MoveMarinerBeastInput } from "../shared/domain/mariner-operability-transitions";
import {
  applyCreateMarinerShip,
  applyMoveMarinerBeast,
  canonicalizeCreateMarinerShipInput,
  canonicalizeMoveMarinerBeastInput,
} from "../shared/domain/mariner-operability-transitions";
import {
  newlyTrappedDistrustingBeastIds,
  requireExactMarinerRampageResolutions,
} from "../shared/domain/mariner-rampage";
import { makeTestCampaignStateV5 } from "./test-state";
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
const NEW_DEN = "den_00000000-0000-0000-0000-000000000064" as DenizenId;
const NEW_DEN_2 = "den_00000000-0000-0000-0000-000000000065" as DenizenId;
const METHOD_1 = "pdmth_00000000-0000-0000-0000-0000000000c1" as PowerfulDenizenMethodEntryId;
const METHOD_2 = "pdmth_00000000-0000-0000-0000-0000000000c2" as PowerfulDenizenMethodEntryId;
const EXISTING_DEN = "den_00000000-0000-0000-0000-000000000001" as DenizenId;

const THYRIAN_DRUNTYR = marinerRouteId(
  { kind: "board_isle", boardIsleId: "thyras" },
  { kind: "board_isle", boardIsleId: "druntyr" },
);
const BAY_CARAVESSE_DRUNTYR = marinerRouteId(
  { kind: "board_isle", boardIsleId: "caravesse" },
  { kind: "board_isle", boardIsleId: "druntyr" },
);
const BAY_ISHANA_HALCYON = marinerRouteId(
  { kind: "board_isle", boardIsleId: "ishana" },
  { kind: "board_isle", boardIsleId: "halcyon_isles" },
);
const SUNKEN_ORRERY_FAR = marinerRouteId(
  { kind: "board_isle", boardIsleId: "orrery" },
  { kind: "board_isle", boardIsleId: "far_reach" },
);
const SUNKEN_CARAVESSE_FAR = marinerRouteId(
  { kind: "board_isle", boardIsleId: "caravesse" },
  { kind: "board_isle", boardIsleId: "far_reach" },
);
const SUNKEN_CARAVESSE_ORRERY = marinerRouteId(
  { kind: "board_isle", boardIsleId: "caravesse" },
  { kind: "board_isle", boardIsleId: "orrery" },
);
const SCUTTLE_ISHANA = marinerRouteId(
  { kind: "board_isle", boardIsleId: "scuttleport" },
  { kind: "board_isle", boardIsleId: "ishana" },
);
const THYRAS_NEBELHEIM = marinerRouteId(
  { kind: "board_isle", boardIsleId: "thyras" },
  { kind: "external_land", externalLandId: "nebelheim" },
);
const IZOR_UR = marinerRouteId(
  { kind: "board_isle", boardIsleId: "izor" },
  { kind: "external_land", externalLandId: "ur" },
);
const TAHV_YERAINE = marinerRouteId(
  { kind: "board_isle", boardIsleId: "tahv" },
  { kind: "board_isle", boardIsleId: "yeraine" },
);
const THYRAS_SCUTTLEPORT = marinerRouteId(
  { kind: "board_isle", boardIsleId: "thyras" },
  { kind: "board_isle", boardIsleId: "scuttleport" },
);
const THYRIAN_FAR_REACH = marinerRouteId(
  { kind: "board_isle", boardIsleId: "far_reach" },
  { kind: "board_isle", boardIsleId: "thyras" },
);

function expectCode(run: () => unknown, code: DomainError["code"], pattern?: RegExp): void {
  expect(run).toThrow(DomainError);
  try {
    run();
  } catch (error) {
    expect((error as DomainError).code).toBe(code);
    if (pattern !== undefined) {
      expect((error as DomainError).message).toMatch(pattern);
    }
  }
}

function isleId(n: number): IsleId {
  return `isl_00000000-0000-0000-0000-${String(n).padStart(12, "0")}` as IsleId;
}

function worldIsleIds(): Record<MarinerBoardIsleId, IsleId> {
  const bindings = {} as Record<MarinerBoardIsleId, IsleId>;
  const ids = [
    "ishana", "scuttleport", "orrery", "far_reach", "halcyon_isles", "sage_atoll",
    "graven_isle", "tahv", "izor", "yeraine", "koire", "thyras", "spyrholm", "druntyr", "caravesse",
  ] as const;
  ids.forEach((id, index) => {
    bindings[id] = isleId(index + 1);
  });
  return bindings;
}

function isleBindings() {
  const ids = worldIsleIds();
  return (Object.keys(ids) as MarinerBoardIsleId[]).map((boardIsleId) => ({
    boardIsleId,
    worldIsleId: ids[boardIsleId],
  }));
}

function baseV5(): CampaignStateV5 {
  const bindings = worldIsleIds();
  return makeTestCampaignStateV5({
    calendar: { monthOrdinal: 0 as MonthOrdinal },
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
      mortalityState: "not_deceased",
    }],
    world: {
      denizens: [{
        denizenId: EXISTING_DEN,
        name: "Existing Beast",
        representation: "individual",
        description: null,
        mortalityState: "not_deceased",
        powerfulProfile: {
          taxonomies: [{ kind: "builtin", taxonomyId: "beast" }],
          status: { kind: "standard", value: "malignant" },
          goal: null,
          methods: [{
            methodEntryId: "pdmth_00000000-0000-0000-0000-0000000000b1" as PowerfulDenizenMethodEntryId,
            definition: { kind: "standard", method: "rampaging" },
            origin: "source",
          }],
          truths: [],
        },
      }],
      isles: (Object.keys(bindings) as MarinerBoardIsleId[]).map((id) => ({
        isleId: bindings[id],
        name: id,
        description: null,
      })),
      places: [{
        placeId: SHIP,
        name: "The Mariner's Ship",
        description: null,
        placement: { kind: "mobile", associatedIsleId: null },
      }],
      companionRelationships: [],
      campaignPowerfulDenizenTaxonomies: [],
      treasures: [],
    },
  });
}

function initializedQuiet(): CampaignStateV5 {
  return applyInitializeMariner(baseV5(), {
    arrangementId: "quiet",
    shipPlaceId: SHIP,
    selectedLawOfSeaIds: ["first", "seventh"],
    isleBindings: isleBindings(),
    arrangementBeasts: [],
    rarityDescriptions: [],
  }).nextState;
}

function regionDef(regionId: MarinerSeaRegionId) {
  return MARINER_SEA_REGION_DEFINITIONS.find((definition) => definition.regionId === regionId);
}

function captureStorms(state: CampaignStateV5, regionIds: readonly MarinerSeaRegionId[]) {
  return regionIds.map((regionId) => ({
    regionId,
    stormCount: state.mariner.seaRegions.find((region) => region.regionId === regionId)?.stormCount ?? 0,
  }));
}

function captureRoutes(state: CampaignStateV5, routeIds: readonly string[]) {
  return routeIds.map((routeId) => ({
    routeId,
    occupancy: state.mariner.routes.find((route) => route.routeId === routeId)?.occupancy ?? { kind: "empty" as const },
  }));
}

function captureBeasts(state: CampaignStateV5, regionIds: readonly MarinerSeaRegionId[]) {
  const relevant = new Set(regionIds);
  return state.mariner.beasts
    .filter((beast) => beast.location.kind === "sea_region" && relevant.has(beast.location.regionId))
    .map((beast) => ({ denizenId: beast.denizenId, location: beast.location }));
}

function captureBeastStates(state: CampaignStateV5, regionIds: readonly MarinerSeaRegionId[]) {
  const relevant = new Set(regionIds);
  return state.mariner.beasts
    .filter((beast) => beast.location.kind === "sea_region" && relevant.has(beast.location.regionId))
    .map((beast) => ({ denizenId: beast.denizenId, location: beast.location, condition: beast.condition }));
}

function boundingRoutesFor(routeIds: readonly string[]): string[] {
  const regionIds = MARINER_SEA_REGION_DEFINITIONS
    .filter((definition) => routeIds.some((routeId) => definition.boundingRouteIds.includes(routeId as never)))
    .map((definition) => definition.regionId);
  return [...new Set(regionIds.flatMap((regionId) => regionDef(regionId)?.boundingRouteIds ?? []))];
}

function createBeastRegions(regionId: MarinerSeaRegionId): MarinerSeaRegionId[] {
  const definition = regionDef(regionId);
  return definition === undefined ? [regionId] : [regionId, ...definition.adjacentRegionIds];
}

function createBeastRoutes(regionId: MarinerSeaRegionId): string[] {
  const focus = regionDef(regionId);
  if (focus === undefined) return [];
  const ids = new Set<string>(focus.boundingRouteIds);
  for (const adjacentId of focus.adjacentRegionIds) {
    const adjacent = regionDef(adjacentId);
    if (adjacent === undefined) continue;
    for (const routeId of focus.boundingRouteIds) {
      if (adjacent.boundingRouteIds.includes(routeId)) ids.add(routeId);
    }
  }
  return [...ids];
}

function createBeastInput(
  state: CampaignStateV5,
  overrides: Partial<CreateMarinerBeastInput> = {},
): CreateMarinerBeastInput {
  const regionId = (overrides.regionId ?? "sunken_fleet") as MarinerSeaRegionId;
  const regions = createBeastRegions(regionId);
  return canonicalizeCreateMarinerBeastInput({
    denizenId: NEW_DEN,
    name: "New Kraken",
    description: null,
    status: { kind: "standard", value: "malignant" },
    element: "water",
    definitionId: "kraken",
    regionId,
    expectedStormCounts: captureStorms(state, regions),
    expectedRouteOccupancies: captureRoutes(state, createBeastRoutes(regionId)),
    expectedRelevantBeasts: captureBeasts(state, regions),
    rampageDestinationSeatId: null,
    rampagingMethodEntryId: null,
    ...overrides,
  });
}

function occupancyOf(state: CampaignStateV5, routeId: string): MarinerRouteOccupancy {
  return state.mariner.routes.find((route) => route.routeId === routeId)?.occupancy ?? { kind: "empty" };
}

function setOccupancy(
  state: CampaignStateV5,
  routeId: ReturnType<typeof marinerRouteId>,
  occupancy: MarinerRouteOccupancy,
): CampaignStateV5 {
  return applySetMarinerRouteOccupancy(state, routeId, occupancyOf(state, routeId), occupancy).nextState;
}

function setStorms(
  state: CampaignStateV5,
  regionId: MarinerSeaRegionId,
  stormCount: number,
): CampaignStateV5 {
  const current = state.mariner.seaRegions.find((region) => region.regionId === regionId)!.stormCount;
  return applySetMarinerSeaStormCount(state, regionId, current, stormCount).nextState;
}

function campaignOf(state: CampaignStateV5, revision = 4): CanonicalCampaign {
  return {
    docId: "dummy" as CanonicalCommitInput["campaignDocId"],
    campaignId: CAMPAIGN_A,
    currentRevision: revision,
    currentState: state,
  };
}

function recordingIo(options: {
  campaign: CanonicalCampaign;
  accepted?: { commandType: string; commandFingerprint: string; campaignRevision: number };
  snapshot?: CampaignStateV5;
}) {
  const commits: CanonicalCommitInput[] = [];
  const io: OrdinaryLogicalCommandIo = {
    async assertNotDeleting() {},
    async loadCanonicalCampaign() {
      return options.campaign;
    },
    async findAcceptedCommand() {
      return options.accepted === undefined ? null : options.accepted;
    },
    async loadCommittedSnapshot() {
      return options.snapshot === undefined ? options.campaign.currentState : options.snapshot;
    },
    async commit(input) {
      commits.push(input);
      return { newRevision: options.campaign.currentRevision + 1, state: input.nextState, alreadyApplied: false };
    },
  };
  return { io, commits };
}

describe("create_mariner_beast", () => {
  it("atomically creates the Denizen, Powerful Beast profile, and Distrusting overlay", () => {
    const before = initializedQuiet();
    const input = createBeastInput(before);
    const result = applyCreateMarinerBeast(before, input);
    const denizen = result.nextState.world.denizens.find((candidate) => candidate.denizenId === NEW_DEN);
    expect(denizen?.name).toBe("New Kraken");
    expect(denizen?.representation).toBe("individual");
    expect(denizen?.powerfulProfile?.taxonomies).toEqual([{ kind: "builtin", taxonomyId: "beast" }]);
    expect(denizen?.powerfulProfile?.status).toEqual({ kind: "standard", value: "malignant" });
    expect(denizen?.powerfulProfile?.goal).toBeNull();
    expect(denizen?.powerfulProfile?.methods).toEqual([]);
    expect(denizen?.powerfulProfile?.truths).toEqual([]);
    expect(result.nextState.mariner.beasts).toEqual([{
      denizenId: NEW_DEN,
      element: "water",
      definitionId: "kraken",
      condition: "distrusting",
      location: { kind: "sea_region", regionId: "sunken_fleet" },
    }]);
    expect(result.events).toEqual([{
      type: "mariner_beast_created",
      version: 1,
      data: expect.objectContaining({
        denizenId: NEW_DEN,
        denizenName: "New Kraken",
        regionId: "sunken_fleet",
        condition: "distrusting",
        destroyedRouteIds: [],
        rampageDestinationSeatId: null,
      }),
    }]);
    expect(() => validateCampaignStateV5Candidate(result.nextState)).not.toThrow();
    expect(before.world.denizens.some((candidate) => candidate.denizenId === NEW_DEN)).toBe(false);
    expect(before.mariner.beasts).toHaveLength(0);
  });

  it("keeps an explicit Powerful status and does not fabricate Reliable, Goal, Methods, or Truths", () => {
    const before = initializedQuiet();
    const disruptive = applyCreateMarinerBeast(before, createBeastInput(before, {
      status: { kind: "standard", value: "disruptive" },
      definitionId: null,
    }));
    expect(disruptive.nextState.world.denizens.find((d) => d.denizenId === NEW_DEN)?.powerfulProfile?.status)
      .toEqual({ kind: "standard", value: "disruptive" });
    expect(disruptive.nextState.world.denizens.find((d) => d.denizenId === NEW_DEN)?.powerfulProfile?.goal).toBeNull();
    const companion = applyCreateMarinerBeast(before, createBeastInput(before, {
      denizenId: NEW_DEN_2,
      status: { kind: "standard", value: "companion" },
    }));
    expect(companion.nextState.world.denizens.find((d) => d.denizenId === NEW_DEN_2)?.powerfulProfile?.status)
      .toEqual({ kind: "standard", value: "companion" });
  });

  it("rejects a built-in Beast whose Element does not agree", () => {
    expectCode(
      () => applyCreateMarinerBeast(initializedQuiet(), createBeastInput(initializedQuiet(), {
        element: "fire",
        definitionId: "kraken",
      })),
      "INVALID_CAMPAIGN_STATE",
      /Element/,
    );
  });

  it("rejects a duplicate Denizen ID and an uninitialized Mariner", () => {
    const initialized = initializedQuiet();
    expectCode(
      () => applyCreateMarinerBeast(initialized, createBeastInput(initialized, { denizenId: EXISTING_DEN })),
      "INVALID_CAMPAIGN_STATE",
      /Duplicate denizenId/,
    );
    expectCode(
      () => applyCreateMarinerBeast(baseV5(), createBeastInput(initializedQuiet())),
      "INVALID_CAMPAIGN_STATE",
      /initialized/,
    );
  });

  it("rejects an invalid target region", () => {
    expectCode(
      () => applyCreateMarinerBeast(initializedQuiet(), createBeastInput(initializedQuiet(), {
        regionId: "not_a_sea" as MarinerSeaRegionId,
      })),
      "INVALID_CAMPAIGN_STATE",
      /region/,
    );
  });

  it("rejects stale target Storm, Route occupancy, and relevant Beast location", () => {
    const before = initializedQuiet();
    const input = createBeastInput(before, { regionId: "bay_of_ishana" });
    const stormChanged = setStorms(before, "bay_of_ishana", 3);
    expectCode(
      () => applyCreateMarinerBeast(stormChanged, input),
      "STALE_COMMAND_PRECONDITION",
      /storm/i,
    );
    const occupancyChanged = setOccupancy(before, BAY_ISHANA_HALCYON, { kind: "empty" });
    expectCode(
      () => applyCreateMarinerBeast(occupancyChanged, input),
      "STALE_COMMAND_PRECONDITION",
      /occupancy/i,
    );
  });

  it("destroys bounding shipping when the arriving Beast shares a Storm region", () => {
    const before = initializedQuiet();
    const result = applyCreateMarinerBeast(before, createBeastInput(before, { regionId: "bay_of_ishana" }));
    expect(occupancyOf(result.nextState, BAY_ISHANA_HALCYON)).toEqual({ kind: "empty" });
    const created = result.events[0];
    expect(created?.type).toBe("mariner_beast_created");
    if (created?.type === "mariner_beast_created") {
      expect(created.data.destroyedRouteIds).toContain(BAY_ISHANA_HALCYON);
    }
  });

  it("destroys shipping on a Route that now separates the arriving Beast from a Storm", () => {
    const seeded = setOccupancy(initializedQuiet(), BAY_CARAVESSE_DRUNTYR, { kind: "ship" });
    const result = applyCreateMarinerBeast(seeded, createBeastInput(seeded, { regionId: "thyrian_sea" }));
    expect(occupancyOf(result.nextState, BAY_CARAVESSE_DRUNTYR)).toEqual({ kind: "empty" });
  });

  it("immediately Rampages a completely surrounded arrival into a non-Mariner Domain", () => {
    let board = initializedQuiet();
    board = setOccupancy(board, SUNKEN_ORRERY_FAR, { kind: "ship" });
    board = setOccupancy(board, SUNKEN_CARAVESSE_FAR, { kind: "ship" });
    board = setOccupancy(board, SUNKEN_CARAVESSE_ORRERY, { kind: "raider", toward: { kind: "board_isle", boardIsleId: "orrery" } });
    const result = applyCreateMarinerBeast(board, createBeastInput(board, {
      rampageDestinationSeatId: "hierophant",
      rampagingMethodEntryId: METHOD_1,
    }));
    const beast = result.nextState.mariner.beasts.find((candidate) => candidate.denizenId === NEW_DEN);
    const profile = result.nextState.world.denizens.find((d) => d.denizenId === NEW_DEN)?.powerfulProfile;
    expect(beast?.condition).toBe("rampaging");
    expect(beast?.location).toEqual({ kind: "other_domain", seatId: "hierophant" });
    expect(profile?.status).toEqual({ kind: "standard", value: "malignant" });
    expect(profile?.goal).toBeNull();
    expect(profile?.methods.filter((method) => method.definition.kind === "standard" && method.definition.method === "rampaging")).toHaveLength(1);
    expect(profile?.methods[0]?.methodEntryId).toBe(METHOD_1);
    const created = result.events[0];
    expect(created?.type).toBe("mariner_beast_created");
    if (created?.type === "mariner_beast_created") {
      expect(created.data.rampageDestinationSeatId).toBe("hierophant");
    }
  });

  it("does not change Powerful Status when Rampaging and rejects a Mariner destination", () => {
    let board = initializedQuiet();
    board = setOccupancy(board, SUNKEN_ORRERY_FAR, { kind: "ship" });
    board = setOccupancy(board, SUNKEN_CARAVESSE_FAR, { kind: "ship" });
    board = setOccupancy(board, SUNKEN_CARAVESSE_ORRERY, { kind: "ship" });
    expectCode(
      () => applyCreateMarinerBeast(board, createBeastInput(board, {
        rampageDestinationSeatId: "mariner",
        rampagingMethodEntryId: METHOD_1,
      })),
      "INVALID_CAMPAIGN_STATE",
      /Mariner/,
    );
  });

  it("does not satisfy Dynamic/Explosive starting-Beast setup by creating a Beast after initialization", () => {
    const quiet = initializedQuiet();
    applyCreateMarinerBeast(quiet, createBeastInput(quiet));
    expect(quiet.mariner.beasts).toHaveLength(0);
  });

  it("rejects creating a Beast into a Sea that already has a Beast located there", () => {
    const occupied = applyCreateMarinerBeast(initializedQuiet(), createBeastInput(initializedQuiet())).nextState;
    expectCode(
      () => applyCreateMarinerBeast(occupied, createBeastInput(occupied, { denizenId: NEW_DEN_2 })),
      "INVALID_CAMPAIGN_STATE",
      /already has a Beast|occupied/,
    );
  });

  it("does not treat an Isle-located or other-Domain Beast as occupying the target Sea", () => {
    const created = applyCreateMarinerBeast(initializedQuiet(), createBeastInput(initializedQuiet())).nextState;
    const nested = applyNestMarinerBeast(created, nestInput(created)).nextState;
    const result = applyCreateMarinerBeast(nested, createBeastInput(nested, { denizenId: NEW_DEN_2 }));
    expect(result.nextState.mariner.beasts.some((beast) => beast.denizenId === NEW_DEN_2)).toBe(true);
  });

  it("rejects as stale when a Beast appears in the target Sea after the draft was captured", () => {
    const before = initializedQuiet();
    const input = createBeastInput(before, { denizenId: NEW_DEN_2 });
    const appeared = applyCreateMarinerBeast(before, createBeastInput(before)).nextState;
    expectCode(
      () => applyCreateMarinerBeast(appeared, input),
      "STALE_COMMAND_PRECONDITION",
      /Beast/,
    );
  });

  it("fingerprints bind campaign and semantic inputs; ordinary retry is canonical", async () => {
    const before = initializedQuiet();
    const input = createBeastInput(before);
    const fingerprint = createMarinerBeastFingerprint(CAMPAIGN_A, input);
    expect(fingerprint).toMatch(/^create_mariner_beast:v1:/);
    expect(createMarinerBeastFingerprint(CAMPAIGN_B, input)).not.toBe(fingerprint);
    expect(createMarinerBeastFingerprint(CAMPAIGN_A, createBeastInput(before, { name: "Other" }))).not.toBe(fingerprint);
    expect(isLogicalStateCommandType("create_mariner_beast")).toBe(true);
    expect(CAMPAIGN_COMMAND_TYPES as readonly string[]).toContain("create_mariner_beast");

    const prepare: () => OrdinaryLogicalCommandPreparation = () => ({
      commandType: "create_mariner_beast",
      commandFingerprint: fingerprint,
      apply: (current) => applyCreateMarinerBeast(current, input),
    });
    const first = recordingIo({ campaign: campaignOf(before) });
    const receipt = await executeOrdinaryLogicalCommand(
      first.io,
      { commandId: COMMAND_1, expectedCampaignId: CAMPAIGN_A },
      prepare,
    );
    expect(receipt).toEqual({ revision: 5 });
    expect(first.commits).toHaveLength(1);
    expect(first.commits[0]?.events[0]?.type).toBe("mariner_beast_created");
    expect(() => validateEventCoherenceForTest(first.commits[0]!, 1)).not.toThrow();

    const replay = recordingIo({
      campaign: campaignOf(first.commits[0]!.nextState, 5),
      accepted: { commandType: "create_mariner_beast", commandFingerprint: fingerprint, campaignRevision: 5 },
      snapshot: first.commits[0]!.nextState,
    });
    const replayReceipt = await executeOrdinaryLogicalCommand(
      replay.io,
      { commandId: COMMAND_1, expectedCampaignId: CAMPAIGN_A },
      prepare,
    );
    expect(replayReceipt).toEqual({ revision: 5 });
    expect(replay.commits).toHaveLength(0);

    const mismatched = recordingIo({
      campaign: campaignOf(first.commits[0]!.nextState, 5),
      accepted: { commandType: "create_mariner_beast", commandFingerprint: fingerprint, campaignRevision: 5 },
      snapshot: first.commits[0]!.nextState,
    });
    const other = createBeastInput(before, { name: "Revised Beast" });
    await expect(executeOrdinaryLogicalCommand(
      mismatched.io,
      { commandId: COMMAND_1, expectedCampaignId: CAMPAIGN_A },
      () => ({
        commandType: "create_mariner_beast",
        commandFingerprint: createMarinerBeastFingerprint(CAMPAIGN_A, other),
        apply: (current) => applyCreateMarinerBeast(current, other),
      }),
    )).rejects.toBeInstanceOf(DomainError);
    expect(mismatched.commits).toHaveLength(0);
  });
});

function moveStormRegions(destinationId: MarinerSeaRegionId, sourceId: MarinerSeaRegionId): MarinerSeaRegionId[] {
  return [...new Set([sourceId, destinationId, ...(regionDef(destinationId)?.adjacentRegionIds ?? [])])];
}

function moveStormRoutes(destinationId: MarinerSeaRegionId): string[] {
  return createBeastRoutes(destinationId);
}

function moveStormInput(
  state: CampaignStateV5,
  overrides: Partial<MoveMarinerStormInput> = {},
): MoveMarinerStormInput {
  const sourceRegionId = (overrides.sourceRegionId ?? "bay_of_ishana") as MarinerSeaRegionId;
  const destinationRegionId = (overrides.destinationRegionId ?? "thyrian_sea") as MarinerSeaRegionId;
  const regions = moveStormRegions(destinationRegionId, sourceRegionId);
  return canonicalizeMoveMarinerStormInput({
    sourceRegionId,
    destinationRegionId,
    confirmedNotAgainstPrevailingWind: true,
    expectedStormCounts: captureStorms(state, regions),
    expectedRouteOccupancies: captureRoutes(state, moveStormRoutes(destinationRegionId)),
    expectedRelevantBeasts: captureBeasts(state, regions),
    ...overrides,
  });
}

describe("move_mariner_storm", () => {
  it("moves exactly one Storm token to an adjacent region", () => {
    const before = initializedQuiet();
    const result = applyMoveMarinerStorm(before, moveStormInput(before));
    expect(before.mariner.seaRegions.find((region) => region.regionId === "bay_of_ishana")?.stormCount).toBe(1);
    expect(result.nextState.mariner.seaRegions.find((region) => region.regionId === "bay_of_ishana")?.stormCount).toBe(0);
    expect(result.nextState.mariner.seaRegions.find((region) => region.regionId === "thyrian_sea")?.stormCount).toBe(1);
    expect(result.events[0]).toEqual({
      type: "mariner_storm_moved",
      version: 1,
      data: expect.objectContaining({
        sourceRegionId: "bay_of_ishana",
        destinationRegionId: "thyrian_sea",
        typhoonScaleAtDestination: false,
        destroyedRouteIds: [],
      }),
    });
  });

  it("rejects a nonadjacent destination, an empty source, and missing Wind confirmation", () => {
    const before = initializedQuiet();
    expectCode(
      () => applyMoveMarinerStorm(before, moveStormInput(before, { destinationRegionId: "southeast_horizon" })),
      "INVALID_CAMPAIGN_STATE",
      /adjacent/,
    );
    expectCode(
      () => applyMoveMarinerStorm(before, moveStormInput(before, { sourceRegionId: "thyrian_sea" })),
      "INVALID_CAMPAIGN_STATE",
      /Storm/,
    );
    expectCode(
      () => applyMoveMarinerStorm(before, moveStormInput(before, { confirmedNotAgainstPrevailingWind: false })),
      "INVALID_CAMPAIGN_STATE",
      /Wind/,
    );
  });

  it("does not infer actual Wind from season", () => {
    const lateMonth = { ...initializedQuiet(), calendar: { monthOrdinal: 8 as MonthOrdinal } };
    const result = applyMoveMarinerStorm(lateMonth, moveStormInput(lateMonth));
    expect(result.nextState.mariner.seaRegions.find((region) => region.regionId === "thyrian_sea")?.stormCount).toBe(1);
    expectCode(
      () => applyMoveMarinerStorm(lateMonth, moveStormInput(lateMonth, { confirmedNotAgainstPrevailingWind: false })),
      "INVALID_CAMPAIGN_STATE",
      /Wind/,
    );
  });

  it("removes destination bounding shipping when the move creates 2+ Storms", () => {
    const before = setStorms(initializedQuiet(), "scuttle_channel", 1);
    const result = applyMoveMarinerStorm(before, moveStormInput(before, {
      sourceRegionId: "bay_of_ishana",
      destinationRegionId: "scuttle_channel",
    }));
    expect(result.nextState.mariner.seaRegions.find((region) => region.regionId === "scuttle_channel")?.stormCount).toBe(2);
    expect(occupancyOf(result.nextState, SCUTTLE_ISHANA)).toEqual({ kind: "empty" });
    const moved = result.events[0];
    if (moved?.type === "mariner_storm_moved") {
      expect(moved.data.typhoonScaleAtDestination).toBe(true);
      expect(moved.data.destroyedRouteIds).toContain(SCUTTLE_ISHANA);
    }
  });

  it("removes bounding shipping when the moved Storm joins a Beast", () => {
    const withBeast = applyCreateMarinerBeast(initializedQuiet(), createBeastInput(initializedQuiet(), {
      regionId: "thyrian_sea",
    })).nextState;
    const withShip = setOccupancy(withBeast, THYRIAN_DRUNTYR, { kind: "ship" });
    const result = applyMoveMarinerStorm(withShip, moveStormInput(withShip));
    expect(occupancyOf(result.nextState, THYRIAN_DRUNTYR)).toEqual({ kind: "empty" });
  });

  it("disrupts a Route that now separates a Beast from the moved Storm", () => {
    const withBeast = applyCreateMarinerBeast(initializedQuiet(), createBeastInput(initializedQuiet(), {
      regionId: "thyrian_sea",
    })).nextState;
    const cleared = setStorms(withBeast, "bay_of_ishana", 0);
    const withShip = setOccupancy(cleared, BAY_CARAVESSE_DRUNTYR, { kind: "ship" });
    const sourced = setStorms(withShip, "scuttle_channel", 1);
    const result = applyMoveMarinerStorm(sourced, moveStormInput(sourced, {
      sourceRegionId: "scuttle_channel",
      destinationRegionId: "bay_of_ishana",
    }));
    expect(occupancyOf(result.nextState, BAY_CARAVESSE_DRUNTYR)).toEqual({ kind: "empty" });
  });

  it("rejects stale source, destination, Route, and Beast values and does not run unrelated Visions cleanup", () => {
    const before = initializedQuiet();
    const input = moveStormInput(before);
    expectCode(
      () => applyMoveMarinerStorm(setStorms(before, "bay_of_ishana", 2), input),
      "STALE_COMMAND_PRECONDITION",
      /storm/i,
    );
    const twoStorms = setStorms(before, "wainways", 1);
    const between = marinerRouteId(
      { kind: "board_isle", boardIsleId: "tahv" },
      { kind: "board_isle", boardIsleId: "yeraine" },
    );
    const withBetween = setOccupancy(twoStorms, between, { kind: "ship" });
    const moved = applyMoveMarinerStorm(withBetween, moveStormInput(withBetween));
    expect(occupancyOf(moved.nextState, between)).toEqual({ kind: "ship" });
    expect(moved.nextState.mariner.boardIsles.find((isle) => isle.boardIsleId === "scuttleport")?.market.present).toBe(true);
  });
});

function moveShipInput(
  state: CampaignStateV5,
  overrides: Partial<MoveMarinerShipInput> = {},
): MoveMarinerShipInput {
  const sourceIsleId = (overrides.sourceIsleId ?? "thyras") as MarinerBoardIsleId;
  const sourceRouteId = overrides.sourceRouteId ?? THYRAS_NEBELHEIM;
  const destinationRouteId = overrides.destinationRouteId ?? TAHV_YERAINE;
  const destDef = MARINER_SEA_REGION_DEFINITIONS.filter((definition) =>
    definition.boundingRouteIds.includes(destinationRouteId as never)
    || definition.boundingRouteIds.includes(sourceRouteId as never),
  ).map((definition) => definition.regionId);
  const adjacent = destDef.flatMap((regionId) => regionDef(regionId)?.adjacentRegionIds ?? []);
  const regions = [...new Set([...destDef, ...adjacent])];
  return canonicalizeMoveMarinerShipInput({
    sourceIsleId,
    sourceRouteId,
    destinationRouteId,
    destinationToward: overrides.destinationToward ?? null,
    expectedSourceOccupancy: occupancyOf(state, sourceRouteId),
    expectedDestinationOccupancy: occupancyOf(state, destinationRouteId),
    expectedStormCounts: captureStorms(state, regions),
    expectedRouteOccupancies: captureRoutes(state, boundingRoutesFor([sourceRouteId, destinationRouteId])),
    expectedRelevantBeasts: captureBeastStates(state, regions),
    rampageResolutions: [],
    ...overrides,
  });
}

describe("move_mariner_ship", () => {
  it("moves a normal Ship to any empty Route, including a nonadjacent one", () => {
    const before = initializedQuiet();
    const result = applyMoveMarinerShip(before, moveShipInput(before));
    expect(occupancyOf(result.nextState, THYRAS_NEBELHEIM)).toEqual({ kind: "empty" });
    expect(occupancyOf(result.nextState, TAHV_YERAINE)).toEqual({ kind: "ship" });
    expect(result.events[0]).toEqual({
      type: "mariner_ship_moved",
      version: 1,
      data: expect.objectContaining({
        sourceRouteId: THYRAS_NEBELHEIM,
        destinationRouteId: TAHV_YERAINE,
        occupancyKind: "ship",
        immediatelyDestroyed: false,
      }),
    });
  });

  it("requires the source Route to border the selected Isle and the destination to be empty and different", () => {
    const before = initializedQuiet();
    expectCode(
      () => applyMoveMarinerShip(before, moveShipInput(before, { sourceIsleId: "ishana" })),
      "INVALID_CAMPAIGN_STATE",
      /endpoint|Isle/,
    );
    expectCode(
      () => applyMoveMarinerShip(before, moveShipInput(before, { destinationRouteId: THYRAS_NEBELHEIM })),
      "INVALID_CAMPAIGN_STATE",
      /different|empty/,
    );
    const destOccupied = setOccupancy(before, TAHV_YERAINE, { kind: "ship" });
    expectCode(
      () => applyMoveMarinerShip(destOccupied, moveShipInput(destOccupied)),
      "INVALID_CAMPAIGN_STATE",
      /empty/,
    );
  });

  it("keeps a Raider a Raider and requires an explicit destination toward endpoint", () => {
    const before = initializedQuiet();
    const result = applyMoveMarinerShip(before, moveShipInput(before, {
      sourceIsleId: "ishana",
      sourceRouteId: SCUTTLE_ISHANA,
      destinationRouteId: TAHV_YERAINE,
      destinationToward: { kind: "board_isle", boardIsleId: "tahv" },
    }));
    expect(occupancyOf(result.nextState, SCUTTLE_ISHANA)).toEqual({ kind: "empty" });
    expect(occupancyOf(result.nextState, TAHV_YERAINE)).toEqual({
      kind: "raider",
      toward: { kind: "board_isle", boardIsleId: "tahv" },
    });
    expectCode(
      () => applyMoveMarinerShip(before, moveShipInput(before, {
        sourceIsleId: "ishana",
        sourceRouteId: SCUTTLE_ISHANA,
        destinationRouteId: TAHV_YERAINE,
        destinationToward: null,
      })),
      "INVALID_CAMPAIGN_STATE",
      /toward/,
    );
    expectCode(
      () => applyMoveMarinerShip(before, moveShipInput(before, {
        sourceIsleId: "ishana",
        sourceRouteId: SCUTTLE_ISHANA,
        destinationRouteId: TAHV_YERAINE,
        destinationToward: { kind: "board_isle", boardIsleId: "ishana" },
      })),
      "INVALID_CAMPAIGN_STATE",
      /endpoint/,
    );
  });

  it("rejects stale source occupancy and can destroy the just-moved Ship on an immediate hazard", () => {
    const before = initializedQuiet();
    const input = moveShipInput(before);
    const emptied = setOccupancy(before, THYRAS_NEBELHEIM, { kind: "empty" });
    expectCode(
      () => applyMoveMarinerShip(emptied, input),
      "STALE_COMMAND_PRECONDITION",
      /occupancy/,
    );
    const typhoonDest = setStorms(before, "thyrian_sea", 2);
    const dest = THYRIAN_DRUNTYR;
    const hazardous = applyMoveMarinerShip(typhoonDest, moveShipInput(typhoonDest, { destinationRouteId: dest }));
    expect(occupancyOf(hazardous.nextState, dest)).toEqual({ kind: "empty" });
    const moved = hazardous.events[0];
    expect(moved?.type).toBe("mariner_ship_moved");
    if (moved?.type === "mariner_ship_moved") {
      expect(moved.data.immediatelyDestroyed).toBe(true);
    }
  });

  it("does not immediately destroy a Ship merely because a Route lies between two ordinary Storms", () => {
    const twoStorms = setStorms(initializedQuiet(), "wainways", 1);
    const between = marinerRouteId(
      { kind: "board_isle", boardIsleId: "tahv" },
      { kind: "board_isle", boardIsleId: "yeraine" },
    );
    const cleared = occupancyOf(twoStorms, between).kind === "empty"
      ? twoStorms
      : setOccupancy(twoStorms, between, { kind: "empty" });
    const result = applyMoveMarinerShip(cleared, moveShipInput(cleared, { destinationRouteId: between }));
    expect(occupancyOf(result.nextState, between)).toEqual({ kind: "ship" });
    const moved = result.events[0];
    if (moved?.type === "mariner_ship_moved") {
      expect(moved.data.immediatelyDestroyed).toBe(false);
    }
  });

  it("does not require or accept Rampage resolution when the final Ship does not trap a Beast", () => {
    const before = initializedQuiet();
    const result = applyMoveMarinerShip(before, moveShipInput(before));
    const moved = result.events[0];
    expect(moved?.type).toBe("mariner_ship_moved");
    if (moved?.type === "mariner_ship_moved") {
      expect(moved.data.rampagedBeasts).toEqual([]);
    }
    expectCode(
      () => applyMoveMarinerShip(before, moveShipInput(before, {
        rampageResolutions: [{
          denizenId: EXISTING_DEN,
          destinationSeatId: "hierophant",
          rampagingMethodEntryId: METHOD_1,
        }],
      })),
      "INVALID_CAMPAIGN_STATE",
      /resolution|trapped|Rampage/,
    );
  });

  it("Rampages exactly the newly trapped Beast and preserves Status, Goal, and Truths", () => {
    let board = applyCreateMarinerBeast(initializedQuiet(), createBeastInput(initializedQuiet(), {
      regionId: "sunken_fleet",
    })).nextState;
    board = applySetPowerfulDenizenGoal(board, NEW_DEN, { expected: null, value: "Sink the fleet" }).nextState;
    board = setOccupancy(board, SUNKEN_ORRERY_FAR, { kind: "ship" });
    board = setOccupancy(board, SUNKEN_CARAVESSE_FAR, { kind: "ship" });
    const result = applyMoveMarinerShip(board, moveShipInput(board, {
      destinationRouteId: SUNKEN_CARAVESSE_ORRERY,
      rampageResolutions: [{
        denizenId: NEW_DEN,
        destinationSeatId: "hierophant",
        rampagingMethodEntryId: METHOD_1,
      }],
    }));
    const beast = result.nextState.mariner.beasts.find((candidate) => candidate.denizenId === NEW_DEN);
    const profile = result.nextState.world.denizens.find((d) => d.denizenId === NEW_DEN)?.powerfulProfile;
    expect(beast?.condition).toBe("rampaging");
    expect(beast?.location).toEqual({ kind: "other_domain", seatId: "hierophant" });
    expect(profile?.status).toEqual({ kind: "standard", value: "malignant" });
    expect(profile?.goal).toBe("Sink the fleet");
    expect(profile?.truths).toEqual([]);
    expect(profile?.methods.filter((method) => method.definition.kind === "standard" && method.definition.method === "rampaging")).toHaveLength(1);
    const moved = result.events[0];
    expect(moved?.type).toBe("mariner_ship_moved");
    if (moved?.type === "mariner_ship_moved") {
      expect(moved.data.immediatelyDestroyed).toBe(false);
      expect(moved.data.rampagedBeasts).toEqual([{
        denizenId: NEW_DEN,
        destinationSeatId: "hierophant",
      }]);
    }
  });

  it("requires exact coverage for one or many newly trapped Beasts and rejects gaps, extras, duplicates, and Mariner destinations", () => {
    let one = applyCreateMarinerBeast(initializedQuiet(), createBeastInput(initializedQuiet(), {
      regionId: "sunken_fleet",
    })).nextState;
    one = setOccupancy(one, SUNKEN_ORRERY_FAR, { kind: "ship" });
    one = setOccupancy(one, SUNKEN_CARAVESSE_FAR, { kind: "ship" });
    const resolution = {
      denizenId: NEW_DEN,
      destinationSeatId: "hierophant" as const,
      rampagingMethodEntryId: METHOD_1,
    };
    expectCode(
      () => applyMoveMarinerShip(one, moveShipInput(one, { destinationRouteId: SUNKEN_CARAVESSE_ORRERY })),
      "INVALID_CAMPAIGN_STATE",
      /resolution|trapped|Rampage/,
    );
    expectCode(
      () => applyMoveMarinerShip(one, moveShipInput(one, {
        destinationRouteId: SUNKEN_CARAVESSE_ORRERY,
        rampageResolutions: [resolution, { ...resolution, denizenId: EXISTING_DEN, destinationSeatId: "warlock" }],
      })),
      "INVALID_CAMPAIGN_STATE",
      /resolution|trapped|Rampage/,
    );
    expectCode(
      () => applyMoveMarinerShip(one, moveShipInput(one, {
        destinationRouteId: SUNKEN_CARAVESSE_ORRERY,
        rampageResolutions: [resolution, { ...resolution, destinationSeatId: "warlock" }],
      })),
      "INVALID_CAMPAIGN_STATE",
      /duplicate/i,
    );
    expectCode(
      () => applyMoveMarinerShip(one, moveShipInput(one, {
        destinationRouteId: SUNKEN_CARAVESSE_ORRERY,
        rampageResolutions: [{ ...resolution, destinationSeatId: "mariner" }],
      })),
      "INVALID_CAMPAIGN_STATE",
      /Mariner/,
    );

    let many = applyCreateMarinerBeast(initializedQuiet(), createBeastInput(initializedQuiet(), {
      regionId: "thyrian_sea",
    })).nextState;
    many = applyCreateMarinerBeast(many, createBeastInput(many, {
      denizenId: NEW_DEN_2,
      name: "Second Beast",
      regionId: "ruins_of_old_ishana",
    })).nextState;
    many = setOccupancy(many, BAY_CARAVESSE_DRUNTYR, { kind: "ship" });
    many = setOccupancy(many, SUNKEN_CARAVESSE_FAR, { kind: "ship" });
    many = setOccupancy(many, THYRAS_SCUTTLEPORT, { kind: "ship" });
    expect(occupancyOf(many, THYRIAN_FAR_REACH).kind === "ship" || occupancyOf(many, THYRIAN_FAR_REACH).kind === "raider").toBe(true);
    const manyResolutions = [
      { denizenId: NEW_DEN, destinationSeatId: "hierophant" as const, rampagingMethodEntryId: METHOD_1 },
      { denizenId: NEW_DEN_2, destinationSeatId: "warlock" as const, rampagingMethodEntryId: METHOD_2 },
    ];
    expectCode(
      () => applyMoveMarinerShip(many, moveShipInput(many, {
        destinationRouteId: THYRIAN_DRUNTYR,
        rampageResolutions: manyResolutions.slice(0, 1),
      })),
      "INVALID_CAMPAIGN_STATE",
      /resolution|trapped|Rampage/,
    );
    const trapped = applyMoveMarinerShip(many, moveShipInput(many, {
      destinationRouteId: THYRIAN_DRUNTYR,
      rampageResolutions: manyResolutions,
    }));
    expect(trapped.nextState.mariner.beasts.find((beast) => beast.denizenId === NEW_DEN)?.condition).toBe("rampaging");
    expect(trapped.nextState.mariner.beasts.find((beast) => beast.denizenId === NEW_DEN_2)?.condition).toBe("rampaging");
  });

  it("does not trap or Rampage when the moved Ship is immediately destroyed", () => {
    let board = applyCreateMarinerBeast(initializedQuiet(), createBeastInput(initializedQuiet(), {
      regionId: "sunken_fleet",
    })).nextState;
    board = setOccupancy(board, SUNKEN_ORRERY_FAR, { kind: "ship" });
    board = setOccupancy(board, SUNKEN_CARAVESSE_FAR, { kind: "ship" });
    board = setStorms(board, "sunken_fleet", 2);
    const result = applyMoveMarinerShip(board, moveShipInput(board, {
      destinationRouteId: SUNKEN_CARAVESSE_ORRERY,
    }));
    expect(occupancyOf(result.nextState, SUNKEN_CARAVESSE_ORRERY)).toEqual({ kind: "empty" });
    expect(result.nextState.mariner.beasts.find((beast) => beast.denizenId === NEW_DEN)?.condition).toBe("distrusting");
    const moved = result.events[0];
    if (moved?.type === "mariner_ship_moved") {
      expect(moved.data.immediatelyDestroyed).toBe(true);
      expect(moved.data.rampagedBeasts).toEqual([]);
    }
    expectCode(
      () => applyMoveMarinerShip(board, moveShipInput(board, {
        destinationRouteId: SUNKEN_CARAVESSE_ORRERY,
        rampageResolutions: [{
          denizenId: NEW_DEN,
          destinationSeatId: "hierophant",
          rampagingMethodEntryId: METHOD_1,
        }],
      })),
      "INVALID_CAMPAIGN_STATE",
      /resolution|trapped|Rampage/,
    );
  });

  it("does not repair or re-Rampage a Beast that was already surrounded", () => {
    let board = sunkenFleetAlmostSurrounded(initializedQuiet());
    board = setOccupancy(board, SUNKEN_CARAVESSE_ORRERY, { kind: "ship" });
    board = applyAddMarinerBeast(board, distrustingBeast(EXISTING_DEN, "sunken_fleet")).nextState;
    const result = applyMoveMarinerShip(board, moveShipInput(board));
    expect(result.nextState.mariner.beasts.find((beast) => beast.denizenId === EXISTING_DEN)).toEqual(
      distrustingBeast(EXISTING_DEN, "sunken_fleet"),
    );
    const moved = result.events[0];
    if (moved?.type === "mariner_ship_moved") {
      expect(moved.data.rampagedBeasts).toEqual([]);
    }
  });

  it("rejects stale relevant Route occupancy and Beast condition or location", () => {
    let board = applyCreateMarinerBeast(initializedQuiet(), createBeastInput(initializedQuiet(), {
      regionId: "sunken_fleet",
    })).nextState;
    board = setOccupancy(board, SUNKEN_ORRERY_FAR, { kind: "ship" });
    const input = moveShipInput(board, { destinationRouteId: SUNKEN_CARAVESSE_ORRERY });
    expectCode(
      () => applyMoveMarinerShip(setOccupancy(board, SUNKEN_CARAVESSE_FAR, { kind: "ship" }), input),
      "STALE_COMMAND_PRECONDITION",
      /occupancy/,
    );
    const conditionChanged: CampaignStateV5 = {
      ...board,
      mariner: {
        ...board.mariner,
        beasts: board.mariner.beasts.map((beast) => (
          beast.denizenId === NEW_DEN ? { ...beast, condition: "rampaging" as const } : beast
        )),
      },
    };
    expectCode(
      () => applyMoveMarinerShip(conditionChanged, input),
      "STALE_COMMAND_PRECONDITION",
      /condition|Beast/,
    );
    const locationChanged = applyUpdateMarinerBeast(board, NEW_DEN, {
      location: {
        expected: { kind: "sea_region", regionId: "sunken_fleet" },
        value: { kind: "sea_region", regionId: "thyrian_sea" },
      },
    }).nextState;
    expectCode(
      () => applyMoveMarinerShip(locationChanged, input),
      "STALE_COMMAND_PRECONDITION",
      /location|Beast/,
    );
  });
});

function nestInput(
  state: CampaignStateV5,
  overrides: Partial<NestMarinerBeastInput> = {},
): NestMarinerBeastInput {
  const denizenId = overrides.denizenId ?? NEW_DEN;
  const beast = state.mariner.beasts.find((candidate) => candidate.denizenId === denizenId);
  const boardIsleId = (overrides.boardIsleId ?? "orrery") as MarinerBoardIsleId;
  const isle = state.mariner.boardIsles.find((candidate) => candidate.boardIsleId === boardIsleId)!;
  const nesting = state.mariner.beasts.find((candidate) =>
    candidate.condition === "friendly_nesting"
    && candidate.location.kind === "board_isle"
    && candidate.location.boardIsleId === boardIsleId,
  );
  return canonicalizeNestMarinerBeastInput({
    denizenId,
    boardIsleId,
    expectedBeastCondition: beast?.condition ?? "distrusting",
    expectedBeastLocation: beast?.location ?? { kind: "sea_region", regionId: "sunken_fleet" },
    expectedMarket: isle.market,
    expectedRavageStormCount: isle.ravageStormCount,
    expectedNestingBeastDenizenId: nesting?.denizenId ?? null,
    ...overrides,
  });
}

describe("nest_mariner_beast", () => {
  it("nests a Distrusting Sea Beast on an adjacent empty Isle without changing Powerful profile fields", () => {
    const created = applyCreateMarinerBeast(initializedQuiet(), createBeastInput(initializedQuiet())).nextState;
    const beforeProfile = created.world.denizens.find((d) => d.denizenId === NEW_DEN)?.powerfulProfile;
    const result = applyNestMarinerBeast(created, nestInput(created));
    expect(result.nextState.mariner.beasts[0]).toEqual({
      denizenId: NEW_DEN,
      element: "water",
      definitionId: "kraken",
      condition: "friendly_nesting",
      location: { kind: "board_isle", boardIsleId: "orrery" },
    });
    expect(result.nextState.world.denizens.find((d) => d.denizenId === NEW_DEN)?.powerfulProfile).toEqual(beforeProfile);
    expect(result.events[0]?.type).toBe("mariner_beast_nested");
  });

  it("rejects a nonadjacent Isle, Market, Ravaged Isle, existing Nest, and non-Distrusting Beast", () => {
    const created = applyCreateMarinerBeast(initializedQuiet(), createBeastInput(initializedQuiet())).nextState;
    expectCode(
      () => applyNestMarinerBeast(created, nestInput(created, { boardIsleId: "ishana" })),
      "INVALID_CAMPAIGN_STATE",
      /adjacent/,
    );
    const nearMarket = applyCreateMarinerBeast(initializedQuiet(), createBeastInput(initializedQuiet(), {
      regionId: "scuttle_channel",
    })).nextState;
    expectCode(
      () => applyNestMarinerBeast(nearMarket, nestInput(nearMarket, { boardIsleId: "scuttleport" })),
      "INVALID_CAMPAIGN_STATE",
      /Market/,
    );
    const ravaged = applySetMarinerIsleRavage(created, "orrery", 0, 6).nextState;
    expectCode(
      () => applyNestMarinerBeast(ravaged, nestInput(ravaged)),
      "INVALID_CAMPAIGN_STATE",
      /Ravage/,
    );
    const nested = applyNestMarinerBeast(created, nestInput(created)).nextState;
    const second = applyCreateMarinerBeast(nested, createBeastInput(nested, {
      denizenId: NEW_DEN_2,
      name: "Second",
      regionId: "sunken_fleet",
    })).nextState;
    expectCode(
      () => applyNestMarinerBeast(second, nestInput(second, { denizenId: NEW_DEN_2 })),
      "INVALID_CAMPAIGN_STATE",
      /Nest/,
    );
    expectCode(
      () => applyNestMarinerBeast(nested, nestInput(nested, { denizenId: NEW_DEN })),
      "INVALID_CAMPAIGN_STATE",
      /Distrusting/,
    );
  });

  it("rejects stale Beast or target Isle state", () => {
    const created = applyCreateMarinerBeast(initializedQuiet(), createBeastInput(initializedQuiet())).nextState;
    const input = nestInput(created);
    const market = applySetMarinerIsleMarket(created, "orrery", { present: false }, { present: true, rarity: null }).nextState;
    expectCode(() => applyNestMarinerBeast(market, input), "STALE_COMMAND_PRECONDITION", /market/i);
  });
});

function ravageInput(
  state: CampaignStateV5,
  overrides: Partial<RecordMarinerRavageResultInput> = {},
): RecordMarinerRavageResultInput {
  const boardIsleId = (overrides.boardIsleId ?? "tahv") as MarinerBoardIsleId;
  const isle = state.mariner.boardIsles.find((candidate) => candidate.boardIsleId === boardIsleId)!;
  const nesting = state.mariner.beasts.find((candidate) =>
    candidate.condition === "friendly_nesting"
    && candidate.location.kind === "board_isle"
    && candidate.location.boardIsleId === boardIsleId,
  );
  const profile = nesting === undefined
    ? null
    : state.world.denizens.find((d) => d.denizenId === nesting.denizenId)?.powerfulProfile ?? null;
  return canonicalizeRecordMarinerRavageResultInput({
    boardIsleId,
    expectedMarket: isle.market,
    expectedRavageStormCount: isle.ravageStormCount,
    expectedNestingBeast: nesting === undefined ? null : {
      denizenId: nesting.denizenId,
      condition: nesting.condition,
      location: nesting.location,
    },
    expectedPowerfulStatus: profile?.status ?? null,
    expectedPowerfulGoal: profile?.goal ?? null,
    expectedHasRampagingMethod: profile === null
      ? false
      : profile.methods.some((method) => method.definition.kind === "standard" && method.definition.method === "rampaging"),
    rampageDestinationSeatId: overrides.rampageDestinationSeatId ?? null,
    rampagingMethodEntryId: overrides.rampagingMethodEntryId ?? null,
    ...overrides,
  });
}

describe("record_mariner_ravage_result", () => {
  it("absorbs a Market without Ravaging and without writing Lore", () => {
    const before = initializedQuiet();
    const result = applyRecordMarinerRavageResult(before, ravageInput(before, { boardIsleId: "scuttleport" }));
    const isle = result.nextState.mariner.boardIsles.find((candidate) => candidate.boardIsleId === "scuttleport");
    expect(isle?.market).toEqual({ present: false });
    expect(isle?.ravageStormCount).toBe(0);
    expect(result.nextState.lore).toEqual(before.lore);
    expect(result.events[0]).toEqual({
      type: "mariner_ravage_result_recorded",
      version: 1,
      data: expect.objectContaining({
        boardIsleId: "scuttleport",
        outcome: "market_absorbed",
        isleBecameRavaged: false,
        destroyedNestingBeastDenizenId: null,
      }),
    });
  });

  it("sets unprotected ravageStormCount to exactly 6 and does not infer from Map Stability", () => {
    const before = initializedQuiet();
    expect(before.mariner.boardIsles.find((isle) => isle.boardIsleId === "tahv")?.ravageStormCount).toBe(0);
    const result = applyRecordMarinerRavageResult(before, ravageInput(before));
    expect(result.nextState.mariner.boardIsles.find((isle) => isle.boardIsleId === "tahv")?.ravageStormCount).toBe(6);
    const recorded = result.events[0];
    if (recorded?.type === "mariner_ravage_result_recorded") {
      expect(recorded.data.outcome).toBe("isle_ravaged");
      expect(recorded.data.isleBecameRavaged).toBe(true);
    }
    expect(result.nextState.lore).toEqual(before.lore);
  });

  it("rejects an already-Ravaged Isle and does not invent repeat-Ravage math", () => {
    const ravaged = applySetMarinerIsleRavage(initializedQuiet(), "tahv", 0, 6).nextState;
    expectCode(
      () => applyRecordMarinerRavageResult(ravaged, ravageInput(ravaged)),
      "INVALID_CAMPAIGN_STATE",
      /already|Ravage/,
    );
  });

  it("Rampages a Nesting Beast into a non-Mariner Domain and adds the standard Method once", () => {
    const created = applyCreateMarinerBeast(initializedQuiet(), createBeastInput(initializedQuiet())).nextState;
    const nested = applyNestMarinerBeast(created, nestInput(created)).nextState;
    const result = applyRecordMarinerRavageResult(nested, ravageInput(nested, {
      boardIsleId: "orrery",
      rampageDestinationSeatId: "warlock",
      rampagingMethodEntryId: METHOD_2,
    }));
    const beast = result.nextState.mariner.beasts.find((candidate) => candidate.denizenId === NEW_DEN);
    const profile = result.nextState.world.denizens.find((d) => d.denizenId === NEW_DEN)?.powerfulProfile;
    expect(beast?.condition).toBe("rampaging");
    expect(beast?.location).toEqual({ kind: "other_domain", seatId: "warlock" });
    expect(profile?.status).toEqual({ kind: "standard", value: "malignant" });
    expect(profile?.goal).toBeNull();
    expect(profile?.methods.filter((method) => method.definition.kind === "standard" && method.definition.method === "rampaging")).toHaveLength(1);
    expectCode(
      () => applyRecordMarinerRavageResult(nested, ravageInput(nested, {
        boardIsleId: "orrery",
        rampageDestinationSeatId: "mariner",
        rampagingMethodEntryId: METHOD_2,
      })),
      "INVALID_CAMPAIGN_STATE",
      /Mariner/,
    );
  });

  it("rejects stale Market, Ravage, Beast, and profile state", () => {
    const before = initializedQuiet();
    const input = ravageInput(before, { boardIsleId: "scuttleport" });
    const changed = applySetMarinerIsleMarket(
      before,
      "scuttleport",
      { present: true, rarity: null },
      { present: true, rarity: "changed" },
    ).nextState;
    expectCode(() => applyRecordMarinerRavageResult(changed, input), "STALE_COMMAND_PRECONDITION", /market/i);
  });
});

function sunkenFleetAlmostSurrounded(state: CampaignStateV5): CampaignStateV5 {
  return setOccupancy(
    setOccupancy(state, SUNKEN_ORRERY_FAR, { kind: "ship" }),
    SUNKEN_CARAVESSE_FAR,
    { kind: "ship" },
  );
}

function distrustingBeast(denizenId: DenizenId, regionId: MarinerSeaRegionId) {
  return {
    denizenId,
    element: "water" as const,
    definitionId: "kraken" as const,
    condition: "distrusting" as const,
    location: { kind: "sea_region" as const, regionId },
  };
}

function withBeastOverlay(state: CampaignStateV5, beast: ReturnType<typeof distrustingBeast> | MarinerBeastState): CampaignStateV5 {
  return {
    ...state,
    mariner: {
      ...state.mariner,
      beasts: [...state.mariner.beasts, beast],
    },
  };
}

function placeOccupancy(
  state: CampaignStateV5,
  routeId: string,
  occupancy: MarinerRouteOccupancy,
): CampaignStateV5 {
  return {
    ...state,
    mariner: {
      ...state.mariner,
      routes: state.mariner.routes.map((route) => (
        route.routeId === routeId ? { ...route, occupancy } : route
      )),
    },
  };
}

describe("Mariner newly-trapped / Rampage helpers", () => {
  it("detects a Distrusting Beast that becomes entirely surrounded after a Ship placement", () => {
    const pre = withBeastOverlay(
      sunkenFleetAlmostSurrounded(initializedQuiet()),
      distrustingBeast(EXISTING_DEN, "sunken_fleet"),
    );
    const post = setOccupancy(pre, SUNKEN_CARAVESSE_ORRERY, { kind: "ship" });
    expect(newlyTrappedDistrustingBeastIds(pre.mariner, post.mariner)).toEqual([EXISTING_DEN]);
  });

  it("does not count a Beast that was already surrounded before the action", () => {
    const surrounded = placeOccupancy(
      sunkenFleetAlmostSurrounded(initializedQuiet()),
      SUNKEN_CARAVESSE_ORRERY,
      { kind: "ship" },
    );
    const pre = withBeastOverlay(surrounded, distrustingBeast(EXISTING_DEN, "sunken_fleet"));
    const post = placeOccupancy(pre, THYRAS_NEBELHEIM, { kind: "empty" });
    expect(newlyTrappedDistrustingBeastIds(pre.mariner, post.mariner)).toEqual([]);
  });

  it("ignores non-Distrusting Beasts and Beasts that left the Sea", () => {
    const preBoard = sunkenFleetAlmostSurrounded(initializedQuiet());
    const nesting: MarinerBeastState = {
      ...distrustingBeast(EXISTING_DEN, "sunken_fleet"),
      condition: "friendly_nesting",
      location: { kind: "board_isle", boardIsleId: "orrery" },
    };
    const pre = withBeastOverlay(preBoard, nesting);
    const post = placeOccupancy(pre, SUNKEN_CARAVESSE_ORRERY, { kind: "ship" });
    expect(newlyTrappedDistrustingBeastIds(pre.mariner, post.mariner)).toEqual([]);

    const movedPre = withBeastOverlay(preBoard, distrustingBeast(EXISTING_DEN, "sunken_fleet"));
    const movedPost = {
      ...placeOccupancy(movedPre, SUNKEN_CARAVESSE_ORRERY, { kind: "ship" }),
      mariner: {
        ...placeOccupancy(movedPre, SUNKEN_CARAVESSE_ORRERY, { kind: "ship" }).mariner,
        beasts: [{
          ...distrustingBeast(EXISTING_DEN, "sunken_fleet"),
          location: { kind: "sea_region" as const, regionId: "thyrian_sea" as MarinerSeaRegionId },
        }],
      },
    };
    expect(newlyTrappedDistrustingBeastIds(movedPre.mariner, movedPost.mariner)).toEqual([]);
  });

  it("supports more than one newly trapped Beast", () => {
    const denB = NEW_DEN;
    let pre = initializedQuiet();
    pre = placeOccupancy(pre, SUNKEN_ORRERY_FAR, { kind: "ship" });
    pre = placeOccupancy(pre, SUNKEN_CARAVESSE_FAR, { kind: "ship" });
    pre = withBeastOverlay(pre, distrustingBeast(EXISTING_DEN, "sunken_fleet"));
    pre = withBeastOverlay(pre, distrustingBeast(denB, "sunken_fleet"));
    const post = placeOccupancy(pre, SUNKEN_CARAVESSE_ORRERY, { kind: "ship" });
    expect([...newlyTrappedDistrustingBeastIds(pre.mariner, post.mariner)].sort()).toEqual(
      [EXISTING_DEN, denB].sort(),
    );
  });

  it("requires exact Rampage resolution coverage and rejects Mariner destinations", () => {
    expect(requireExactMarinerRampageResolutions([], [])).toEqual([]);
    expectCode(
      () => requireExactMarinerRampageResolutions([], [{
        denizenId: EXISTING_DEN,
        destinationSeatId: "hierophant",
        rampagingMethodEntryId: METHOD_1,
      }]),
      "INVALID_CAMPAIGN_STATE",
      /resolution|trapped|Rampage/,
    );
    expectCode(
      () => requireExactMarinerRampageResolutions([EXISTING_DEN], []),
      "INVALID_CAMPAIGN_STATE",
      /resolution|trapped|Rampage/,
    );
    expectCode(
      () => requireExactMarinerRampageResolutions([EXISTING_DEN], [
        { denizenId: EXISTING_DEN, destinationSeatId: "hierophant", rampagingMethodEntryId: METHOD_1 },
        { denizenId: NEW_DEN, destinationSeatId: "warlock", rampagingMethodEntryId: METHOD_2 },
      ]),
      "INVALID_CAMPAIGN_STATE",
      /resolution|trapped|Rampage/,
    );
    expectCode(
      () => requireExactMarinerRampageResolutions([EXISTING_DEN], [
        { denizenId: EXISTING_DEN, destinationSeatId: "hierophant", rampagingMethodEntryId: METHOD_1 },
        { denizenId: EXISTING_DEN, destinationSeatId: "warlock", rampagingMethodEntryId: METHOD_2 },
      ]),
      "INVALID_CAMPAIGN_STATE",
      /duplicate/i,
    );
    expectCode(
      () => requireExactMarinerRampageResolutions([EXISTING_DEN], [{
        denizenId: EXISTING_DEN,
        destinationSeatId: "mariner",
        rampagingMethodEntryId: METHOD_1,
      }]),
      "INVALID_CAMPAIGN_STATE",
      /Mariner/,
    );
    expect(requireExactMarinerRampageResolutions([EXISTING_DEN], [{
      denizenId: EXISTING_DEN,
      destinationSeatId: "hierophant",
      rampagingMethodEntryId: METHOD_1,
    }])).toEqual([{
      denizenId: EXISTING_DEN,
      destinationSeatId: "hierophant",
      rampagingMethodEntryId: METHOD_1,
    }]);
  });
});

function createShipInput(
  state: CampaignStateV5,
  overrides: Partial<CreateMarinerShipInput> = {},
): CreateMarinerShipInput {
  const sourceIsleId = (overrides.sourceIsleId ?? "thyras") as MarinerBoardIsleId;
  const targetRouteId = overrides.targetRouteId ?? THYRIAN_DRUNTYR;
  const destDef = MARINER_SEA_REGION_DEFINITIONS
    .filter((definition) => definition.boundingRouteIds.includes(targetRouteId as never))
    .map((definition) => definition.regionId);
  const adjacent = destDef.flatMap((regionId) => regionDef(regionId)?.adjacentRegionIds ?? []);
  const regions = [...new Set([...destDef, ...adjacent])];
  return canonicalizeCreateMarinerShipInput({
    sourceIsleId,
    targetRouteId,
    expectedTargetOccupancy: occupancyOf(state, targetRouteId),
    expectedStormCounts: captureStorms(state, regions),
    expectedRouteOccupancies: captureRoutes(state, boundingRoutesFor([targetRouteId])),
    expectedRelevantBeasts: captureBeastStates(state, regions),
    rampageResolutions: [],
    ...overrides,
  });
}

describe("create_mariner_ship", () => {
  it("creates a normal Ship on a Route that borders the selected Isle", () => {
    const before = initializedQuiet();
    const result = applyCreateMarinerShip(before, createShipInput(before));
    expect(occupancyOf(result.nextState, THYRIAN_DRUNTYR)).toEqual({ kind: "ship" });
    expect(result.events[0]).toEqual({
      type: "mariner_ship_created",
      version: 1,
      data: expect.objectContaining({
        sourceIsleId: "thyras",
        targetRouteId: THYRIAN_DRUNTYR,
        immediatelyDestroyed: false,
        rampagedBeasts: [],
      }),
    });
  });

  it("rejects a nonadjacent Route and an occupied target", () => {
    const before = initializedQuiet();
    expectCode(
      () => applyCreateMarinerShip(before, createShipInput(before, { targetRouteId: TAHV_YERAINE })),
      "INVALID_CAMPAIGN_STATE",
      /endpoint|adjacent|Isle/,
    );
    expectCode(
      () => applyCreateMarinerShip(before, createShipInput(before, {
        sourceIsleId: "thyras",
        targetRouteId: THYRAS_NEBELHEIM,
      })),
      "INVALID_CAMPAIGN_STATE",
      /empty/,
    );
  });

  it("destroys the created Ship on an immediate hazard and then accepts no trapping", () => {
    const typhoon = setStorms(initializedQuiet(), "thyrian_sea", 2);
    const result = applyCreateMarinerShip(typhoon, createShipInput(typhoon));
    expect(occupancyOf(result.nextState, THYRIAN_DRUNTYR)).toEqual({ kind: "empty" });
    const created = result.events[0];
    expect(created?.type).toBe("mariner_ship_created");
    if (created?.type === "mariner_ship_created") {
      expect(created.data.immediatelyDestroyed).toBe(true);
      expect(created.data.rampagedBeasts).toEqual([]);
    }
  });

  it("Rampages zero, one, or many newly trapped Beasts with exact resolution coverage", () => {
    const none = initializedQuiet();
    expect(applyCreateMarinerShip(none, createShipInput(none)).events[0]).toEqual(
      expect.objectContaining({ type: "mariner_ship_created" }),
    );
    expectCode(
      () => applyCreateMarinerShip(none, createShipInput(none, {
        rampageResolutions: [{
          denizenId: EXISTING_DEN,
          destinationSeatId: "hierophant",
          rampagingMethodEntryId: METHOD_1,
        }],
      })),
      "INVALID_CAMPAIGN_STATE",
      /resolution|trapped|Rampage/,
    );

    let one = applyCreateMarinerBeast(initializedQuiet(), createBeastInput(initializedQuiet(), {
      regionId: "sunken_fleet",
    })).nextState;
    one = setOccupancy(one, SUNKEN_ORRERY_FAR, { kind: "ship" });
    one = setOccupancy(one, SUNKEN_CARAVESSE_FAR, { kind: "ship" });
    expectCode(
      () => applyCreateMarinerShip(one, createShipInput(one, {
        sourceIsleId: "orrery",
        targetRouteId: SUNKEN_CARAVESSE_ORRERY,
      })),
      "INVALID_CAMPAIGN_STATE",
      /resolution|trapped|Rampage/,
    );
    const trappedOne = applyCreateMarinerShip(one, createShipInput(one, {
      sourceIsleId: "orrery",
      targetRouteId: SUNKEN_CARAVESSE_ORRERY,
      rampageResolutions: [{
        denizenId: NEW_DEN,
        destinationSeatId: "hierophant",
        rampagingMethodEntryId: METHOD_1,
      }],
    }));
    expect(trappedOne.nextState.mariner.beasts.find((beast) => beast.denizenId === NEW_DEN)?.condition).toBe("rampaging");

    let many = applyCreateMarinerBeast(initializedQuiet(), createBeastInput(initializedQuiet(), {
      regionId: "thyrian_sea",
    })).nextState;
    many = applyCreateMarinerBeast(many, createBeastInput(many, {
      denizenId: NEW_DEN_2,
      name: "Second Beast",
      regionId: "ruins_of_old_ishana",
    })).nextState;
    many = setOccupancy(many, BAY_CARAVESSE_DRUNTYR, { kind: "ship" });
    many = setOccupancy(many, SUNKEN_CARAVESSE_FAR, { kind: "ship" });
    many = setOccupancy(many, THYRAS_SCUTTLEPORT, { kind: "ship" });
    const trappedMany = applyCreateMarinerShip(many, createShipInput(many, {
      rampageResolutions: [
        { denizenId: NEW_DEN, destinationSeatId: "hierophant", rampagingMethodEntryId: METHOD_1 },
        { denizenId: NEW_DEN_2, destinationSeatId: "warlock", rampagingMethodEntryId: METHOD_2 },
      ],
    }));
    expect(trappedMany.nextState.mariner.beasts.find((beast) => beast.denizenId === NEW_DEN)?.location).toEqual({
      kind: "other_domain",
      seatId: "hierophant",
    });
    expect(trappedMany.nextState.mariner.beasts.find((beast) => beast.denizenId === NEW_DEN_2)?.location).toEqual({
      kind: "other_domain",
      seatId: "warlock",
    });
  });

  it("rejects stale target occupancy and relevant Beast condition", () => {
    const before = initializedQuiet();
    const input = createShipInput(before);
    expectCode(
      () => applyCreateMarinerShip(setOccupancy(before, THYRIAN_DRUNTYR, { kind: "ship" }), input),
      "STALE_COMMAND_PRECONDITION",
      /occupancy/,
    );
    let withBeast = applyCreateMarinerBeast(before, createBeastInput(before, { regionId: "thyrian_sea" })).nextState;
    const stale = createShipInput(withBeast);
    const conditionChanged: CampaignStateV5 = {
      ...withBeast,
      mariner: {
        ...withBeast.mariner,
        beasts: withBeast.mariner.beasts.map((beast) => (
          beast.denizenId === NEW_DEN ? { ...beast, condition: "rampaging" as const } : beast
        )),
      },
    };
    expectCode(
      () => applyCreateMarinerShip(conditionChanged, stale),
      "STALE_COMMAND_PRECONDITION",
      /condition|Beast/,
    );
  });

  it("fingerprints bind campaign and semantic inputs; ordinary retry is canonical", async () => {
    const before = initializedQuiet();
    const input = createShipInput(before);
    const fingerprint = createMarinerShipFingerprint(CAMPAIGN_A, input);
    expect(fingerprint).toMatch(/^create_mariner_ship:v1:/);
    expect(createMarinerShipFingerprint(CAMPAIGN_B, input)).not.toBe(fingerprint);
    expect(createMarinerShipFingerprint(CAMPAIGN_A, createShipInput(before, { sourceIsleId: "druntyr" }))).not.toBe(fingerprint);
    expect(isLogicalStateCommandType("create_mariner_ship")).toBe(true);
    expect(CAMPAIGN_COMMAND_TYPES as readonly string[]).toContain("create_mariner_ship");
    expect(isLogicalStateCommandType("move_mariner_beast")).toBe(true);
    expect(CAMPAIGN_COMMAND_TYPES as readonly string[]).toContain("move_mariner_beast");
    const created = applyCreateMarinerBeast(before, createBeastInput(before)).nextState;
    expect(moveMarinerBeastFingerprint(CAMPAIGN_A, moveBeastInput(created)))
      .toMatch(/^move_mariner_beast:v1:/);
    expect(moveMarinerBeastFingerprint(CAMPAIGN_B, moveBeastInput(created)))
      .not.toBe(moveMarinerBeastFingerprint(CAMPAIGN_A, moveBeastInput(created)));

    const prepare: () => OrdinaryLogicalCommandPreparation = () => ({
      commandType: "create_mariner_ship",
      commandFingerprint: fingerprint,
      apply: (current) => applyCreateMarinerShip(current, input),
    });
    const first = recordingIo({ campaign: campaignOf(before) });
    const receipt = await executeOrdinaryLogicalCommand(
      first.io,
      { commandId: COMMAND_1, expectedCampaignId: CAMPAIGN_A },
      prepare,
    );
    expect(receipt).toEqual({ revision: 5 });
    expect(first.commits).toHaveLength(1);
    expect(first.commits[0]?.events[0]?.type).toBe("mariner_ship_created");
    expect(() => validateEventCoherenceForTest(first.commits[0]!, 1)).not.toThrow();

    const replay = recordingIo({
      campaign: campaignOf(first.commits[0]!.nextState, 5),
      accepted: { commandType: "create_mariner_ship", commandFingerprint: fingerprint, campaignRevision: 5 },
      snapshot: first.commits[0]!.nextState,
    });
    const replayReceipt = await executeOrdinaryLogicalCommand(
      replay.io,
      { commandId: COMMAND_1, expectedCampaignId: CAMPAIGN_A },
      prepare,
    );
    expect(replayReceipt).toEqual({ revision: 5 });
    expect(replay.commits).toHaveLength(0);

    const withBeast = applyCreateMarinerBeast(before, createBeastInput(before)).nextState;
    const moveInput = moveBeastInput(withBeast);
    const moveFingerprint = moveMarinerBeastFingerprint(CAMPAIGN_A, moveInput);
    const moveIo = recordingIo({ campaign: campaignOf(withBeast) });
    await executeOrdinaryLogicalCommand(
      moveIo.io,
      { commandId: COMMAND_1, expectedCampaignId: CAMPAIGN_A },
      () => ({
        commandType: "move_mariner_beast",
        commandFingerprint: moveFingerprint,
        apply: (current) => applyMoveMarinerBeast(current, moveInput),
      }),
    );
    expect(moveIo.commits[0]?.events[0]?.type).toBe("mariner_beast_moved");
    expect(() => validateEventCoherenceForTest(moveIo.commits[0]!, 1)).not.toThrow();
  });
});

function moveBeastRegions(sourceRegionId: MarinerSeaRegionId, destinationRegionId: MarinerSeaRegionId): MarinerSeaRegionId[] {
  return [...new Set([
    sourceRegionId,
    destinationRegionId,
    ...createBeastRegions(destinationRegionId),
  ])];
}

function moveBeastInput(
  state: CampaignStateV5,
  overrides: Partial<MoveMarinerBeastInput> = {},
): MoveMarinerBeastInput {
  const denizenId = overrides.denizenId ?? NEW_DEN;
  const beast = state.mariner.beasts.find((candidate) => candidate.denizenId === denizenId);
  const sourceRegionId = (overrides.sourceRegionId
    ?? (beast?.location.kind === "sea_region" ? beast.location.regionId : "sunken_fleet")) as MarinerSeaRegionId;
  const destinationRegionId = (overrides.destinationRegionId ?? "thyrian_sea") as MarinerSeaRegionId;
  const regions = moveBeastRegions(sourceRegionId, destinationRegionId);
  return canonicalizeMoveMarinerBeastInput({
    denizenId,
    sourceRegionId,
    destinationRegionId,
    expectedBeast: {
      denizenId,
      condition: beast?.condition ?? "distrusting",
      location: beast?.location ?? { kind: "sea_region", regionId: sourceRegionId },
    },
    expectedStormCounts: captureStorms(state, regions),
    expectedRouteOccupancies: captureRoutes(state, createBeastRoutes(destinationRegionId)),
    expectedRelevantBeasts: captureBeastStates(state, regions),
    rampageResolution: null,
    ...overrides,
  });
}

describe("move_mariner_beast", () => {
  it("moves a Distrusting Beast to an adjacent on-map Sea", () => {
    const created = applyCreateMarinerBeast(initializedQuiet(), createBeastInput(initializedQuiet())).nextState;
    const result = applyMoveMarinerBeast(created, moveBeastInput(created));
    expect(result.nextState.mariner.beasts[0]?.location).toEqual({ kind: "sea_region", regionId: "thyrian_sea" });
    expect(result.nextState.mariner.beasts[0]?.condition).toBe("distrusting");
    expect(result.events[0]).toEqual({
      type: "mariner_beast_moved",
      version: 1,
      data: expect.objectContaining({
        denizenId: NEW_DEN,
        sourceRegionId: "sunken_fleet",
        destinationRegionId: "thyrian_sea",
        rampaged: false,
        rampageDestinationSeatId: null,
      }),
    });
  });

  it("rejects a nonadjacent destination, a wrong source, a non-Distrusting Beast, and any off-map destination", () => {
    const created = applyCreateMarinerBeast(initializedQuiet(), createBeastInput(initializedQuiet())).nextState;
    expectCode(
      () => applyMoveMarinerBeast(created, moveBeastInput(created, { destinationRegionId: "chalk_cliffs" })),
      "INVALID_CAMPAIGN_STATE",
      /adjacent/,
    );
    expectCode(
      () => applyMoveMarinerBeast(created, moveBeastInput(created, { sourceRegionId: "thyrian_sea" })),
      "INVALID_CAMPAIGN_STATE",
      /source|location/,
    );
    const nested = applyNestMarinerBeast(created, nestInput(created)).nextState;
    expectCode(
      () => applyMoveMarinerBeast(nested, moveBeastInput(nested, {
        sourceRegionId: "sunken_fleet",
        destinationRegionId: "thyrian_sea",
      })),
      "INVALID_CAMPAIGN_STATE",
      /Distrusting/,
    );
    expectCode(
      () => canonicalizeMoveMarinerBeastInput(moveBeastInput(created, {
        destinationRegionId: "off_map" as MarinerSeaRegionId,
      })),
      "INVALID_CAMPAIGN_STATE",
      /region|destination|off/,
    );
  });

  it("destroys shipping when the moved Beast shares a Storm region or a Route with a Storm", () => {
    const created = applyCreateMarinerBeast(initializedQuiet(), createBeastInput(initializedQuiet(), {
      regionId: "scuttle_channel",
    })).nextState;
    const sameRegion = applyMoveMarinerBeast(created, moveBeastInput(created, {
      sourceRegionId: "scuttle_channel",
      destinationRegionId: "bay_of_ishana",
    }));
    expect(occupancyOf(sameRegion.nextState, BAY_ISHANA_HALCYON)).toEqual({ kind: "empty" });
    const createdEvent = sameRegion.events[0];
    if (createdEvent?.type === "mariner_beast_moved") {
      expect(createdEvent.data.destroyedRouteIds).toContain(BAY_ISHANA_HALCYON);
    }

    const seeded = setOccupancy(initializedQuiet(), BAY_CARAVESSE_DRUNTYR, { kind: "ship" });
    const fromSunken = applyCreateMarinerBeast(seeded, createBeastInput(seeded)).nextState;
    const across = applyMoveMarinerBeast(fromSunken, moveBeastInput(fromSunken));
    expect(occupancyOf(across.nextState, BAY_CARAVESSE_DRUNTYR)).toEqual({ kind: "empty" });
  });

  it("Rampages the moved Beast only when it is surrounded after immediate hazards", () => {
    let board = applyCreateMarinerBeast(initializedQuiet(), createBeastInput(initializedQuiet(), {
      regionId: "thyrian_sea",
    })).nextState;
    board = applySetPowerfulDenizenGoal(board, NEW_DEN, { expected: null, value: "Hunt coasts" }).nextState;
    board = setOccupancy(board, SUNKEN_ORRERY_FAR, { kind: "ship" });
    board = setOccupancy(board, SUNKEN_CARAVESSE_FAR, { kind: "ship" });
    board = setOccupancy(board, SUNKEN_CARAVESSE_ORRERY, { kind: "ship" });
    expectCode(
      () => applyMoveMarinerBeast(board, moveBeastInput(board, {
        sourceRegionId: "thyrian_sea",
        destinationRegionId: "sunken_fleet",
      })),
      "INVALID_CAMPAIGN_STATE",
      /resolution|Rampage|surrounded/,
    );
    const result = applyMoveMarinerBeast(board, moveBeastInput(board, {
      sourceRegionId: "thyrian_sea",
      destinationRegionId: "sunken_fleet",
      rampageResolution: {
        denizenId: NEW_DEN,
        destinationSeatId: "warlock",
        rampagingMethodEntryId: METHOD_1,
      },
    }));
    const beast = result.nextState.mariner.beasts.find((candidate) => candidate.denizenId === NEW_DEN);
    const profile = result.nextState.world.denizens.find((d) => d.denizenId === NEW_DEN)?.powerfulProfile;
    expect(beast?.condition).toBe("rampaging");
    expect(beast?.location).toEqual({ kind: "other_domain", seatId: "warlock" });
    expect(profile?.status).toEqual({ kind: "standard", value: "malignant" });
    expect(profile?.goal).toBe("Hunt coasts");
    expect(profile?.truths).toEqual([]);
    expect(profile?.methods.filter((method) => method.definition.kind === "standard" && method.definition.method === "rampaging")).toHaveLength(1);
    const moved = result.events[0];
    if (moved?.type === "mariner_beast_moved") {
      expect(moved.data.rampaged).toBe(true);
      expect(moved.data.rampageDestinationSeatId).toBe("warlock");
    }

    const open = applyCreateMarinerBeast(initializedQuiet(), createBeastInput(initializedQuiet())).nextState;
    expectCode(
      () => applyMoveMarinerBeast(open, moveBeastInput(open, {
        rampageResolution: {
          denizenId: NEW_DEN,
          destinationSeatId: "hierophant",
          rampagingMethodEntryId: METHOD_1,
        },
      })),
      "INVALID_CAMPAIGN_STATE",
      /resolution|Rampage|surrounded/,
    );
  });

  it("rejects stale moved-Beast state and destination hazard inputs", () => {
    const created = applyCreateMarinerBeast(initializedQuiet(), createBeastInput(initializedQuiet())).nextState;
    const input = moveBeastInput(created);
    const locationChanged = applyUpdateMarinerBeast(created, NEW_DEN, {
      location: {
        expected: { kind: "sea_region", regionId: "sunken_fleet" },
        value: { kind: "sea_region", regionId: "koiran_reef" },
      },
    }).nextState;
    expectCode(
      () => applyMoveMarinerBeast(locationChanged, input),
      "STALE_COMMAND_PRECONDITION",
      /Beast|location|condition/,
    );
    const stormChanged = setStorms(created, "thyrian_sea", 2);
    expectCode(
      () => applyMoveMarinerBeast(stormChanged, input),
      "STALE_COMMAND_PRECONDITION",
      /storm/i,
    );
    const occupancyChanged = setOccupancy(created, SUNKEN_CARAVESSE_FAR, { kind: "ship" });
    expectCode(
      () => applyMoveMarinerBeast(occupancyChanged, input),
      "STALE_COMMAND_PRECONDITION",
      /occupancy/,
    );
  });
});
