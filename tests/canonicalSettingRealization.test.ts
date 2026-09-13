import { describe, it, expect } from "vitest";
import type {
  CampaignStateV5,
  InitializeHierophantSourceSetupInput,
  InitializeMarinerSourceSetupInput,
  IsleId,
  MarinerBoardIsleId,
  MonthOrdinal,
  PlaceId,
  PlayerId,
  WizardId,
} from "../shared/domain";
import {
  CAMPAIGN_COMMAND_TYPES,
  DomainError,
  HIEROPHANT_STARTING_TEMPLE_IDS,
  MARINER_BOARD_ISLE_IDS,
  applyCreateIsleV5Candidate,
  applyCreatePlaceV5Candidate,
  applyInitializeHierophantSourceSetup,
  applyInitializeMarinerSourceSetup,
  applySetMarinerShip,
  applySetWizardHomeIsleV5Candidate,
  canonicalizeInitializeHierophantSourceSetupInput,
  canonicalizeInitializeMarinerSourceSetupInput,
  initializeHierophantSourceSetupFingerprint,
  initializeMarinerSourceSetupFingerprint,
  isLogicalStateCommandType,
  realizeCanonicalBoardIsles,
  realizeCanonicalTemplePlaces,
  validateCampaignStateV5Candidate,
} from "../shared/domain";
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
const COMMAND_1 = "cmd_00000000-0000-0000-0000-000000000001";
const PLR_A = "plr_00000000-0000-0000-0000-00000000000a" as PlayerId;
const WIZ_MARINER = "wiz_00000000-0000-0000-0000-0000000000aa" as WizardId;
const WIZ_HIEROPHANT = "wiz_00000000-0000-0000-0000-0000000000bb" as WizardId;
const SHIP_2 = "plc_00000000-0000-0000-0000-0000000000ab" as PlaceId;

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

function placeId(n: number): PlaceId {
  return `plc_00000000-0000-0000-0000-${String(n).padStart(12, "0")}` as PlaceId;
}

function proposedIsleIds(): { boardIsleId: MarinerBoardIsleId; worldIsleId: IsleId }[] {
  return MARINER_BOARD_ISLE_IDS.map((boardIsleId, index) => ({
    boardIsleId,
    worldIsleId: isleId(index + 1),
  }));
}

function proposedTemplePlaceIds() {
  return HIEROPHANT_STARTING_TEMPLE_IDS.map((templeId, index) => ({
    templeId,
    placeId: placeId(index + 1),
  }));
}

function wizard(wizardId: WizardId, name: string, homeIsleId: IsleId | null = null, sanctumPlaceId: PlaceId | null = null) {
  return {
    wizardId,
    name,
    portrayedByPlayerId: PLR_A,
    character: {
      elements: null,
      pactFragmentPersonalForm: null,
      familiarDescription: null,
      ageYears: null,
      publicChangesOfMagic: [],
      importantNotes: null,
    },
    homeIsleId,
    sanctumPlaceId,
    mortalityState: "not_deceased" as const,
  };
}

function emptyWorld() {
  return {
    denizens: [],
    isles: [],
    places: [],
    companionRelationships: [],
    campaignPowerfulDenizenTaxonomies: [],
    treasures: [],
  };
}

function baseV5(overrides?: Partial<CampaignStateV5>): CampaignStateV5 {
  return makeTestCampaignStateV5({
    calendar: { monthOrdinal: 0 as MonthOrdinal },
    players: [{ playerId: PLR_A, name: "Alice" }],
    wizards: [wizard(WIZ_MARINER, "Mariner")],
    world: emptyWorld(),
    pactSeats: {
      ...EMPTY_PACT_SEATS,
      mariner: { status: "present", wizardId: WIZ_MARINER, watcherPlayerId: null },
    },
    ...overrides,
  });
}

function quietSourceInput(
  overrides?: Partial<InitializeMarinerSourceSetupInput>,
): InitializeMarinerSourceSetupInput {
  return {
    arrangementId: "quiet",
    selectedLawOfSeaIds: ["first", "seventh"],
    arrangementBeasts: [],
    rarityDescriptions: [],
    proposedIsleIds: proposedIsleIds(),
    proposedShipPlaceId: placeId(90),
    ...overrides,
  };
}

function hierophantSourceInput(
  overrides?: Partial<InitializeHierophantSourceSetupInput>,
): InitializeHierophantSourceSetupInput {
  return {
    selectedFlameLawIds: ["first", "second"],
    proposedTemplePlaceIds: proposedTemplePlaceIds(),
    ...overrides,
  };
}

describe("canonical setting realization — Mariner", () => {
  it("produces canonical board Isle bindings without a caller-created World Isle set", () => {
    const before = baseV5();
    expect(before.world.isles).toHaveLength(0);
    const result = applyInitializeMarinerSourceSetup(before, quietSourceInput());
    expect(result.events[0]?.type).toBe("mariner_initialized");
    expect(result.nextState.mariner.boardIsles).toHaveLength(15);
    expect(result.nextState.world.isles).toHaveLength(15);
    for (const boardIsleId of MARINER_BOARD_ISLE_IDS) {
      const binding = result.nextState.mariner.boardIsles.find((isle) => isle.boardIsleId === boardIsleId);
      expect(binding).toBeDefined();
      expect(result.nextState.world.isles.some((isle) => isle.isleId === binding!.worldIsleId)).toBe(true);
    }
    expect(() => validateCampaignStateV5Candidate(result.nextState)).not.toThrow();
  });

  it("reuses an already-authoritative Wizard home Isle instead of creating a second geography", () => {
    const home = isleId(77);
    let state = applyCreateIsleV5Candidate(baseV5(), {
      isleId: home,
      name: "Far Reach",
      description: null,
    }).nextState;
    state = applySetWizardHomeIsleV5Candidate(state, WIZ_MARINER, {
      expected: null,
      value: home,
    }).nextState;
    const proposed = proposedIsleIds();
    const farReachProposed = proposed.find((entry) => entry.boardIsleId === "far_reach")!;
    expect(farReachProposed.worldIsleId).not.toBe(home);

    const result = applyInitializeMarinerSourceSetup(state, quietSourceInput({ proposedIsleIds: proposed }));
    const farReach = result.nextState.mariner.boardIsles.find((isle) => isle.boardIsleId === "far_reach");
    expect(farReach?.worldIsleId).toBe(home);
    expect(result.nextState.world.isles.some((isle) => isle.isleId === farReachProposed.worldIsleId)).toBe(false);
    expect(result.nextState.wizards[0].homeIsleId).toBe(home);
  });

  it("does not silently create duplicate canonical Isles when realization is repeated with the same proposed IDs", () => {
    const input = quietSourceInput();
    const first = realizeCanonicalBoardIsles(baseV5(), input.proposedIsleIds);
    expect(first.nextState.world.isles).toHaveLength(15);
    const second = realizeCanonicalBoardIsles(first.nextState, input.proposedIsleIds);
    expect(second.nextState.world.isles).toHaveLength(15);
    expect(second.bindings.map((b) => b.worldIsleId)).toEqual(first.bindings.map((b) => b.worldIsleId));

    const initialized = applyInitializeMarinerSourceSetup(baseV5(), input);
    const isleCount = initialized.nextState.world.isles.length;
    expect(() => applyInitializeMarinerSourceSetup(initialized.nextState, input)).toThrow(DomainError);
    expect(initialized.nextState.world.isles).toHaveLength(isleCount);
  });

  it("establishes the starting Ship as the Mariner Wizard Sanctum", () => {
    const result = applyInitializeMarinerSourceSetup(baseV5(), quietSourceInput());
    const shipPlaceId = result.nextState.mariner.shipPlaceId;
    expect(shipPlaceId).toBe(placeId(90));
    expect(result.nextState.wizards[0].sanctumPlaceId).toBe(shipPlaceId);
    const ship = result.nextState.world.places.find((place) => place.placeId === shipPlaceId);
    expect(ship?.placement.kind).toBe("mobile");
    expect(ship?.name).toBe("The Mariner's Ship");
  });

  it("keeps later Ship/Sanctum divergence representable", () => {
    const initialized = applyInitializeMarinerSourceSetup(baseV5(), quietSourceInput()).nextState;
    const withSecondShip = applyCreatePlaceV5Candidate(initialized, {
      placeId: SHIP_2,
      name: "A later Ship",
      description: null,
      placement: { kind: "mobile", associatedIsleId: null },
    }).nextState;
    const changed = applySetMarinerShip(withSecondShip, initialized.mariner.shipPlaceId!, SHIP_2);
    expect(changed.nextState.mariner.shipPlaceId).toBe(SHIP_2);
    expect(changed.nextState.wizards[0].sanctumPlaceId).toBe(initialized.mariner.shipPlaceId);
  });

  it("does not choose a World Isle by display name", () => {
    const decoy = applyCreateIsleV5Candidate(baseV5(), {
      isleId: isleId(200),
      name: "Ishana",
      description: null,
    }).nextState;
    const result = applyInitializeMarinerSourceSetup(decoy, quietSourceInput());
    const ishana = result.nextState.mariner.boardIsles.find((isle) => isle.boardIsleId === "ishana");
    expect(ishana?.worldIsleId).toBe(isleId(1));
    expect(ishana?.worldIsleId).not.toBe(isleId(200));
    expect(result.nextState.world.isles.some((isle) => isle.isleId === isleId(200) && isle.name === "Ishana")).toBe(true);
  });

  it("fails closed when seated Wizard homes contradict one another for distinct board slots", () => {
    const shared = isleId(50);
    let state = applyCreateIsleV5Candidate(baseV5({
      wizards: [
        wizard(WIZ_MARINER, "Mariner"),
        wizard(WIZ_HIEROPHANT, "Hierophant"),
      ],
      pactSeats: {
        ...EMPTY_PACT_SEATS,
        mariner: { status: "present", wizardId: WIZ_MARINER, watcherPlayerId: null },
        hierophant: { status: "present", wizardId: WIZ_HIEROPHANT, watcherPlayerId: null },
      },
    }), { isleId: shared, name: "Shared", description: null }).nextState;
    state = applySetWizardHomeIsleV5Candidate(state, WIZ_MARINER, { expected: null, value: shared }).nextState;
    state = applySetWizardHomeIsleV5Candidate(state, WIZ_HIEROPHANT, { expected: null, value: shared }).nextState;
    expect(() => applyInitializeMarinerSourceSetup(state, quietSourceInput())).toThrow(/contradictory/i);
  });
});

describe("canonical setting realization — Hierophant", () => {
  it("gives starting Temples backing World Places without caller-manufactured Places", () => {
    const before = baseV5({ pactSeats: EMPTY_PACT_SEATS, wizards: [wizard(WIZ_HIEROPHANT, "Hierophant")] });
    expect(before.world.places).toHaveLength(0);
    const result = applyInitializeHierophantSourceSetup(before, hierophantSourceInput());
    expect(result.events[0]?.type).toBe("hierophant_initialized");
    expect(result.nextState.hierophant.temples).toHaveLength(5);
    for (const templeId of HIEROPHANT_STARTING_TEMPLE_IDS) {
      const temple = result.nextState.hierophant.temples.find((entry) => entry.templeId === templeId);
      expect(temple).toBeDefined();
      expect(result.nextState.world.places.some((place) => place.placeId === temple!.placeId)).toBe(true);
    }
    const hestar = result.nextState.hierophant.temples.find((temple) => temple.templeId === "hestar");
    expect(hestar?.kind).toBe("hestar");
    expect(() => validateCampaignStateV5Candidate(result.nextState)).not.toThrow();
  });

  it("does not change starting Temple identity semantics", () => {
    const result = applyInitializeHierophantSourceSetup(
      baseV5({ pactSeats: EMPTY_PACT_SEATS }),
      hierophantSourceInput(),
    );
    expect(result.nextState.hierophant.temples.map((temple) => temple.templeId)).toEqual([
      ...HIEROPHANT_STARTING_TEMPLE_IDS,
    ]);
  });

  it("reuses an already-authoritative Temple Place and does not name-match another Place", () => {
    const first = realizeCanonicalTemplePlaces(
      baseV5({ pactSeats: EMPTY_PACT_SEATS }),
      proposedTemplePlaceIds(),
    );
    expect(first.nextState.world.places).toHaveLength(5);
    const second = realizeCanonicalTemplePlaces(first.nextState, proposedTemplePlaceIds());
    expect(second.nextState.world.places).toHaveLength(5);

    const decoy = applyCreatePlaceV5Candidate(baseV5({ pactSeats: EMPTY_PACT_SEATS }), {
      placeId: placeId(300),
      name: "Temple Krolis",
      description: null,
      placement: { kind: "unspecified" },
    }).nextState;
    const initialized = applyInitializeHierophantSourceSetup(decoy, hierophantSourceInput());
    const krolis = initialized.nextState.hierophant.temples.find((temple) => temple.templeId === "krolis");
    expect(krolis?.placeId).toBe(placeId(1));
    expect(krolis?.placeId).not.toBe(placeId(300));
  });

  it("fails closed when proposed Temple Places collide", () => {
    const colliding = proposedTemplePlaceIds().map((entry, index) => (
      index === 1 ? { ...entry, placeId: placeId(1) } : entry
    ));
    expect(() => applyInitializeHierophantSourceSetup(
      baseV5({ pactSeats: EMPTY_PACT_SEATS }),
      hierophantSourceInput({ proposedTemplePlaceIds: colliding }),
    )).toThrow(DomainError);
  });
});

describe("source-setup command registration", () => {
  it("registers source-shaped initialize commands as logical-state commands", () => {
    expect(CAMPAIGN_COMMAND_TYPES as readonly string[]).toContain("initialize_mariner_source_setup");
    expect(CAMPAIGN_COMMAND_TYPES as readonly string[]).toContain("initialize_hierophant_source_setup");
    expect(isLogicalStateCommandType("initialize_mariner_source_setup")).toBe(true);
    expect(isLogicalStateCommandType("initialize_hierophant_source_setup")).toBe(true);
    expect(initializeMarinerSourceSetupFingerprint(CAMPAIGN_A, quietSourceInput()))
      .toMatch(/^initialize_mariner_source_setup:v1:/);
    expect(initializeHierophantSourceSetupFingerprint(CAMPAIGN_A, hierophantSourceInput()))
      .toMatch(/^initialize_hierophant_source_setup:v1:/);
  });

  it("canonicalizes proposed binding order before fingerprinting", () => {
    const reversed = quietSourceInput({
      proposedIsleIds: [...proposedIsleIds()].reverse(),
    });
    expect(
      initializeMarinerSourceSetupFingerprint(
        CAMPAIGN_A,
        canonicalizeInitializeMarinerSourceSetupInput(reversed),
      ),
    ).toBe(
      initializeMarinerSourceSetupFingerprint(
        CAMPAIGN_A,
        canonicalizeInitializeMarinerSourceSetupInput(quietSourceInput()),
      ),
    );
    const reversedTemples = hierophantSourceInput({
      proposedTemplePlaceIds: [...proposedTemplePlaceIds()].reverse(),
    });
    expect(
      initializeHierophantSourceSetupFingerprint(
        CAMPAIGN_A,
        canonicalizeInitializeHierophantSourceSetupInput(reversedTemples),
      ),
    ).toBe(
      initializeHierophantSourceSetupFingerprint(
        CAMPAIGN_A,
        canonicalizeInitializeHierophantSourceSetupInput(hierophantSourceInput()),
      ),
    );
  });

  it("commits Mariner source setup through the ordinary executor with idempotent replay", async () => {
    const state = baseV5();
    const input = canonicalizeInitializeMarinerSourceSetupInput(quietSourceInput());
    const fingerprint = initializeMarinerSourceSetupFingerprint(CAMPAIGN_A, input);
    const prepare: () => OrdinaryLogicalCommandPreparation = () => ({
      commandType: "initialize_mariner_source_setup",
      commandFingerprint: fingerprint,
      apply: (current) => applyInitializeMarinerSourceSetup(current, input),
    });

    function campaignOf(campaignId: string, currentState: unknown, currentRevision = 4): CanonicalCampaign {
      return { campaignId, currentRevision, currentState } as CanonicalCampaign;
    }

    function recordingIo(options: {
      campaign: CanonicalCampaign;
      accepted?: { commandType: string; commandFingerprint: string; campaignRevision: number } | null;
      snapshot?: unknown | null;
    }) {
      const commits: CanonicalCommitInput[] = [];
      const io: OrdinaryLogicalCommandIo = {
        async assertNotDeleting() {},
        async loadCanonicalCampaign() { return options.campaign; },
        async findAcceptedCommand() {
          return options.accepted === undefined ? null : options.accepted;
        },
        async loadCommittedSnapshot() {
          return options.snapshot === undefined ? options.campaign.currentState : options.snapshot;
        },
        async commit(commitInput) {
          commits.push(commitInput);
          return { newRevision: options.campaign.currentRevision + 1, state: commitInput.nextState, alreadyApplied: false };
        },
      };
      return { io, commits };
    }

    const accepted = recordingIo({ campaign: campaignOf(CAMPAIGN_A, state, 4) });
    const receipt = await executeOrdinaryLogicalCommand(
      accepted.io,
      { commandId: COMMAND_1, expectedCampaignId: CAMPAIGN_A },
      prepare,
    );
    expect(receipt).toEqual({ revision: 5 });
    expect(accepted.commits[0]?.events[0]?.type).toBe("mariner_initialized");
    expect(() => validateEventCoherenceForTest(accepted.commits[0]!, 1)).not.toThrow();

    const replay = recordingIo({
      campaign: campaignOf(CAMPAIGN_A, accepted.commits[0]!.nextState, 5),
      accepted: { commandType: "initialize_mariner_source_setup", commandFingerprint: fingerprint, campaignRevision: 5 },
      snapshot: accepted.commits[0]!.nextState,
    });
    const replayReceipt = await executeOrdinaryLogicalCommand(
      replay.io,
      { commandId: COMMAND_1, expectedCampaignId: CAMPAIGN_A },
      prepare,
    );
    expect(replayReceipt).toEqual({ revision: 5 });
    expect(replay.commits).toHaveLength(0);
  });
});
