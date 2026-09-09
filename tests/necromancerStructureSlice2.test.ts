import { describe, it, expect } from "vitest";
import type {
  CampaignStateV5,
  DenizenId,
  InitializeNecromancerInput,
  MonthOrdinal,
  NecromancerCampaignGateId,
  NecromancerCampaignPathSpaceId,
  NecromancerDirectedStep,
  NecromancerOccupiableSpaceRef,
  PactSeatStatus,
  PlayerId,
  WizardId,
} from "../shared/domain";
import {
  DomainError,
  EMPTY_HIEROPHANT_STATE,
  EMPTY_MARINER_STATE,
  EMPTY_NECROMANCER_STATE,
  EMPTY_SHARED_WORLD_STATE,
  NECROMANCER_BUILTIN_GATE_IDS,
  NECROMANCER_QUIET_ARRANGEMENT_SOUL_LOCATIONS,
  SEVEN_PART_PACT_DRAFT4_ID,
  SEVEN_PART_PACT_DRAFT4_VERSION,
  applyAddNecromancerAlly,
  applyAddNecromancerFoe,
  applyAddNecromancerGhoulCaller,
  applyAddNecromancerStep,
  applyCreateNecromancerCampaignGate,
  applyCreateNecromancerCampaignPathSpace,
  applyInitializeNecromancer,
  applyMoveNecromancerSouls,
  applyRemoveNecromancerAlly,
  applyRemoveNecromancerCampaignPathSpace,
  applyRemoveNecromancerFoe,
  applyRemoveNecromancerGhoulCaller,
  applyRemoveNecromancerStep,
  applySetNecromancerDepth,
  applySetNecromancerGateStatus,
  applySetNecromancerSelectedLaws,
  applySetNecromancerSoulCount,
  applyUpdateNecromancerCampaignGate,
  applyUpdateNecromancerFoe,
  applyUpdateNecromancerGhoulCaller,
  canonicalizeInitializeNecromancerInput,
  canonicalizeNecromancerGhoulCaller,
  canonicalizeUpdateNecromancerGhoulCallerFields,
  necromancerDefaultInternalOutgoingTarget,
  validateCampaignStateV5Candidate,
} from "../shared/domain";
import * as Domain from "../shared/domain";

const PLR_A = "plr_00000000-0000-0000-0000-00000000000a" as PlayerId;
const PLR_B = "plr_00000000-0000-0000-0000-00000000000b" as PlayerId;
const WIZ_A = "wiz_00000000-0000-0000-0000-00000000000a" as WizardId;
const WIZ_B = "wiz_00000000-0000-0000-0000-00000000000b" as WizardId;
const DEN_1 = "den_00000000-0000-0000-0000-000000000001" as DenizenId;
const DEN_2 = "den_00000000-0000-0000-0000-000000000002" as DenizenId;
const DEN_3 = "den_00000000-0000-0000-0000-000000000003" as DenizenId;
const DEN_4 = "den_00000000-0000-0000-0000-000000000004" as DenizenId;
const DEN_5 = "den_00000000-0000-0000-0000-000000000005" as DenizenId;
const DEN_6 = "den_00000000-0000-0000-0000-000000000006" as DenizenId;
const DEN_COLLECTIVE = "den_00000000-0000-0000-0000-0000000000cc" as DenizenId;
const DEN_MISSING = "den_00000000-0000-0000-0000-999999999999" as DenizenId;
const CAMPAIGN_GATE = "ngt_00000000-0000-0000-0000-0000000000ab" as NecromancerCampaignGateId;
const CAMPAIGN_PATH = "nps_00000000-0000-0000-0000-0000000000cd" as NecromancerCampaignPathSpaceId;
const CAMPAIGN_PATH_2 = "nps_00000000-0000-0000-0000-0000000000ce" as NecromancerCampaignPathSpaceId;

const EMPTY_PACT_SEATS = {
  necromancer: { status: null, wizardId: null, watcherPlayerId: null },
  hierophant: { status: null, wizardId: null, watcherPlayerId: null },
  warlock: { status: null, wizardId: null, watcherPlayerId: null },
  mariner: { status: null, wizardId: null, watcherPlayerId: null },
  faustian: { status: null, wizardId: null, watcherPlayerId: null },
  sage: { status: null, wizardId: null, watcherPlayerId: null },
  sorcerer: { status: null, wizardId: null, watcherPlayerId: null },
} as const;

/** Independently transcribed Quiet illustration path spaces. */
const QUIET_SOUL_PATH_IDS = [
  "edge_sage",
  "edge_hierophant",
  "edge_warlock",
  "edge_mariner",
  "far_amber",
  "far_bronze",
  "abyss_marching",
] as const;

const EXPLOSIVE_STEP6_DESTINATIONS: readonly NecromancerOccupiableSpaceRef[] = [
  { kind: "path", pathSpaceId: "far_amber" },
  { kind: "path", pathSpaceId: "far_bronze" },
  { kind: "path", pathSpaceId: "far_lead" },
  { kind: "path", pathSpaceId: "far_ivory" },
  { kind: "path", pathSpaceId: "far_antimony" },
  { kind: "path", pathSpaceId: "abyss_marching" },
  { kind: "path", pathSpaceId: "abyss_churning" },
  { kind: "path", pathSpaceId: "abyss_weeping_upper" },
  { kind: "gate", gateId: "terminus" },
];

function wizard(wizardId: WizardId, name: string, portrayedByPlayerId: PlayerId = PLR_A) {
  return {
    wizardId,
    name,
    portrayedByPlayerId,
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
  };
}

function defaultWorld() {
  return {
    denizens: [
      { denizenId: DEN_1, name: "Deep Foe", representation: "individual" as const, description: null },
      { denizenId: DEN_2, name: "Terminus Foe", representation: "individual" as const, description: null },
      { denizenId: DEN_3, name: "Far Foe One", representation: "individual" as const, description: null },
      { denizenId: DEN_4, name: "Far Foe Two", representation: "individual" as const, description: null },
      { denizenId: DEN_5, name: "Near Ally", representation: "individual" as const, description: null },
      { denizenId: DEN_6, name: "Ghoul-Caller", representation: "individual" as const, description: null },
      { denizenId: DEN_COLLECTIVE, name: "A Host of Dead", representation: "collective" as const, description: null },
    ],
    isles: [],
    places: [],
    companionRelationships: [],
  };
}

function baseV5(overrides?: Partial<CampaignStateV5>): CampaignStateV5 {
  return {
    schemaVersion: 5,
    ruleset: { id: SEVEN_PART_PACT_DRAFT4_ID, version: SEVEN_PART_PACT_DRAFT4_VERSION },
    calendar: { monthOrdinal: 0 as MonthOrdinal },
    configuration: { ageId: null, facilitatorPlayerId: null },
    players: [
      { playerId: PLR_A, name: "Alice" },
      { playerId: PLR_B, name: "Bob" },
    ],
    wizards: [wizard(WIZ_A, "Wizard A")],
    pactSeats: { ...EMPTY_PACT_SEATS },
    lifecycle: {
      kind: "setup",
      orrery: { saturn: null, jupiter: null, mars: null, venus: null, mercury: null },
    },
    wizardmootHistory: [],
    world: defaultWorld(),
    hierophant: { ...EMPTY_HIEROPHANT_STATE },
    mariner: { ...EMPTY_MARINER_STATE },
    necromancer: EMPTY_NECROMANCER_STATE,
    ...overrides,
  };
}

function quietInput(overrides?: Partial<InitializeNecromancerInput>): InitializeNecromancerInput {
  return {
    arrangementId: "quiet",
    selectedLawIds: ["first", "second"],
    arrangementFoes: [
      { denizenId: DEN_1, gateId: "deep" },
      { denizenId: DEN_2, gateId: "terminus" },
    ],
    arrangementAlly: { denizenId: DEN_5, gateId: "amber" },
    arrangementGhoulCaller: null,
    ...overrides,
  };
}

function dynamicInput(overrides?: Partial<InitializeNecromancerInput>): InitializeNecromancerInput {
  return {
    arrangementId: "dynamic",
    selectedLawIds: ["third", "fourth"],
    arrangementFoes: [
      { denizenId: DEN_1, gateId: "deep" },
      { denizenId: DEN_2, gateId: "terminus" },
      { denizenId: DEN_3, gateId: "marching" },
    ],
    arrangementAlly: { denizenId: DEN_5, gateId: "ivory" },
    arrangementGhoulCaller: null,
    ...overrides,
  };
}

function explosiveInput(overrides?: Partial<InitializeNecromancerInput>): InitializeNecromancerInput {
  return {
    arrangementId: "explosive",
    selectedLawIds: ["fifth", "sixth"],
    arrangementFoes: [
      { denizenId: DEN_1, gateId: "deep" },
      { denizenId: DEN_2, gateId: "terminus" },
      { denizenId: DEN_3, gateId: "marching" },
      { denizenId: DEN_4, gateId: "churning" },
    ],
    arrangementAlly: { denizenId: DEN_5, gateId: "amber" },
    arrangementGhoulCaller: {
      denizenId: DEN_6,
      pathSpaceId: "edge_sage",
      primaryElement: "fire",
      aesthetic: "ash-stained funeral silks",
      strangeQuirk: "counts backwards from thirteen",
      ageYears: 47,
    },
    ...overrides,
  };
}

function withSeat(
  state: CampaignStateV5,
  seatId: keyof CampaignStateV5["pactSeats"],
  status: PactSeatStatus | null,
  wizardId: WizardId | null,
): CampaignStateV5 {
  return {
    ...state,
    pactSeats: {
      ...state.pactSeats,
      [seatId]: { ...state.pactSeats[seatId], status, wizardId },
    },
  };
}

function soulAt(state: CampaignStateV5, location: NecromancerOccupiableSpaceRef): number {
  return state.necromancer.souls.find((soul) => JSON.stringify(soul.location) === JSON.stringify(location))?.count ?? 0;
}

function expectCode(fn: () => unknown, code: DomainError["code"]): void {
  try {
    fn();
  } catch (error) {
    expect(error).toBeInstanceOf(DomainError);
    expect((error as DomainError).code).toBe(code);
    return;
  }
  throw new Error(`expected DomainError ${code}`);
}

function snapshotPieces(state: CampaignStateV5) {
  return {
    foes: structuredClone(state.necromancer.foes),
    allies: structuredClone(state.necromancer.allies),
    ghoulCallers: structuredClone(state.necromancer.ghoulCallers),
    gateStatuses: state.necromancer.gates.map((gate) => ({ gateId: gate.gateId, status: gate.status })),
    calendar: structuredClone(state.calendar),
    lifecycle: structuredClone(state.lifecycle),
    wizardmootHistory: structuredClone(state.wizardmootHistory),
    worldDenizenIds: state.world.denizens.map((denizen) => denizen.denizenId),
  };
}

describe("Necromancer Phase 2A transitions", () => {
  describe("initialization", () => {
    it("encodes the Quiet illustration path-space transcription statically", () => {
      expect(NECROMANCER_QUIET_ARRANGEMENT_SOUL_LOCATIONS.map((location) => {
        if (location.kind !== "path") {
          throw new Error("Quiet illustration transcription must use path spaces");
        }
        return location.pathSpaceId;
      })).toEqual([...QUIET_SOUL_PATH_IDS]);
      expect(necromancerDefaultInternalOutgoingTarget("howling")).toBeUndefined();
      expect(necromancerDefaultInternalOutgoingTarget("terminus")).toBeUndefined();
    });

    it("initializes Quiet with exact source fidelity", () => {
      const result = applyInitializeNecromancer(baseV5(), quietInput());
      const n = result.nextState.necromancer;
      expect(() => validateCampaignStateV5Candidate(result.nextState)).not.toThrow();
      expect(result.events.map((event) => event.type)).toEqual(["necromancer_initialized"]);
      expect(n.selectedLaws).toEqual([
        { lawId: "first", visibility: "revealed" },
        { lawId: "second", visibility: "revealed" },
      ]);
      expect(n.depth).toBeNull();
      expect(n.ghoulCallers).toEqual([]);
      expect(n.foes).toEqual([
        { denizenId: DEN_1, location: { kind: "gate", gateId: "deep" } },
        { denizenId: DEN_2, location: { kind: "gate", gateId: "terminus" } },
      ]);
      expect(n.allies).toEqual([{ denizenId: DEN_5, location: { kind: "gate", gateId: "amber" } }]);
      expect(n.gates.filter((gate) => gate.status === "hostile")).toEqual([]);
      expect(n.souls).toHaveLength(7);
      for (const pathSpaceId of QUIET_SOUL_PATH_IDS) {
        expect(soulAt(result.nextState, { kind: "path", pathSpaceId })).toBe(1);
      }
      expect(n.souls.every((soul) => soul.location.kind === "path")).toBe(true);
      expect(result.nextState.world.denizens).toHaveLength(baseV5().world.denizens.length);
    });

    it("initializes Dynamic with Present Edge Souls and otherwise-empty Gates", () => {
      let state = withSeat(baseV5(), "sage", "present", WIZ_B);
      state = withSeat(state, "warlock", "silent", WIZ_A);
      state = withSeat(state, "faustian", "absent", null);
      state = {
        ...state,
        wizards: [...state.wizards, wizard(WIZ_B, "Wizard B", PLR_B)],
      };
      const result = applyInitializeNecromancer(state, dynamicInput());
      const n = result.nextState.necromancer;
      expect(() => validateCampaignStateV5Candidate(result.nextState)).not.toThrow();
      expect(n.gates.find((gate) => gate.gateId === "deep")?.status).toBe("hostile");
      expect(n.gates.filter((gate) => gate.status === "hostile").map((gate) => gate.gateId)).toEqual(["deep"]);
      expect(n.foes.map((foe) => foe.location)).toEqual([
        { kind: "gate", gateId: "deep" },
        { kind: "gate", gateId: "terminus" },
        { kind: "gate", gateId: "marching" },
      ]);
      expect(n.allies).toEqual([{ denizenId: DEN_5, location: { kind: "gate", gateId: "ivory" } }]);
      expect(n.ghoulCallers).toEqual([]);
      expect(soulAt(result.nextState, { kind: "path", pathSpaceId: "edge_sage" })).toBe(1);
      expect(soulAt(result.nextState, { kind: "path", pathSpaceId: "edge_warlock" })).toBe(0);
      expect(soulAt(result.nextState, { kind: "path", pathSpaceId: "edge_faustian" })).toBe(0);
      expect(soulAt(result.nextState, { kind: "path", pathSpaceId: "edge_hierophant" })).toBe(0);
      const occupiedGates = new Set(["deep", "terminus", "marching", "ivory"]);
      for (const gateId of NECROMANCER_BUILTIN_GATE_IDS) {
        const expected = occupiedGates.has(gateId) ? 0 : 1;
        expect(soulAt(result.nextState, { kind: "gate", gateId })).toBe(expected);
      }
    });

    it("initializes Explosive with Howling/Terminus step-6 exclusion and merged sparse rows", () => {
      const result = applyInitializeNecromancer(baseV5(), explosiveInput());
      const n = result.nextState.necromancer;
      expect(() => validateCampaignStateV5Candidate(result.nextState)).not.toThrow();
      expect(n.gates.filter((gate) => gate.status === "hostile").map((gate) => gate.gateId)).toEqual(["deep", "terminus"]);
      expect(n.foes).toHaveLength(4);
      expect(n.ghoulCallers).toEqual([{
        denizenId: DEN_6,
        disposition: "disruptive",
        location: { kind: "path", pathSpaceId: "edge_sage" },
        pettyDeadCount: 0,
        primaryElement: "fire",
        aesthetic: "ash-stained funeral silks",
        strangeQuirk: "counts backwards from thirteen",
        ageYears: 47,
      }]);
      expect(soulAt(result.nextState, { kind: "path", pathSpaceId: "howling" as never })).toBe(0);
      expect(necromancerDefaultInternalOutgoingTarget("howling")).toBeUndefined();
      expect(necromancerDefaultInternalOutgoingTarget("terminus")).toBeUndefined();
      for (const location of EXPLOSIVE_STEP6_DESTINATIONS) {
        expect(soulAt(result.nextState, location)).toBeGreaterThanOrEqual(1);
      }
      expect(soulAt(result.nextState, { kind: "gate", gateId: "howling" })).toBe(1);
      expect(soulAt(result.nextState, { kind: "gate", gateId: "terminus" })).toBe(1);
      expect(n.souls.filter((soul) => JSON.stringify(soul.location) === JSON.stringify({ kind: "gate", gateId: "terminus" }))).toHaveLength(1);
      const occupiedGates = new Set(["deep", "terminus", "marching", "churning", "amber"]);
      for (const gateId of NECROMANCER_BUILTIN_GATE_IDS) {
        if (occupiedGates.has(gateId) && gateId !== "terminus") {
          expect(soulAt(result.nextState, { kind: "gate", gateId })).toBe(0);
        }
      }
    });

    it("stores owned Depth 0 when the Necromancer seat has a Wizard, including Silent", () => {
      const silent = withSeat(baseV5(), "necromancer", "silent", WIZ_A);
      const result = applyInitializeNecromancer(silent, quietInput());
      expect(result.nextState.necromancer.depth).toEqual({ wizardId: WIZ_A, value: 0 });
    });

    it("rejects invalid arrangement bindings and shared Denizen requirements", () => {
      expectCode(() => applyInitializeNecromancer(baseV5(), quietInput({ selectedLawIds: ["first"] })), "INVALID_CAMPAIGN_STATE");
      expectCode(() => applyInitializeNecromancer(baseV5(), quietInput({ selectedLawIds: ["first", "first"] })), "INVALID_CAMPAIGN_STATE");
      expectCode(() => applyInitializeNecromancer(baseV5(), quietInput({
        arrangementFoes: [{ denizenId: DEN_1, gateId: "deep" }],
      })), "INVALID_CAMPAIGN_STATE");
      expectCode(() => applyInitializeNecromancer(baseV5(), quietInput({
        arrangementAlly: { denizenId: DEN_5, gateId: "marching" },
      })), "INVALID_CAMPAIGN_STATE");
      expectCode(() => applyInitializeNecromancer(baseV5(), quietInput({
        arrangementGhoulCaller: {
          denizenId: DEN_6,
          pathSpaceId: "edge_sage",
          primaryElement: "fire",
          aesthetic: "ash-stained funeral silks",
          strangeQuirk: "counts backwards from thirteen",
          ageYears: 47,
        },
      })), "INVALID_CAMPAIGN_STATE");
      expectCode(() => applyInitializeNecromancer(baseV5(), explosiveInput({ arrangementGhoulCaller: null })), "INVALID_CAMPAIGN_STATE");
      expectCode(() => applyInitializeNecromancer(baseV5(), explosiveInput({
        arrangementGhoulCaller: {
          denizenId: DEN_COLLECTIVE,
          pathSpaceId: "edge_sage",
          primaryElement: "fire",
          aesthetic: "ash-stained funeral silks",
          strangeQuirk: "counts backwards from thirteen",
          ageYears: 47,
        },
      })), "INVALID_CAMPAIGN_STATE");
      expectCode(() => applyInitializeNecromancer(baseV5(), quietInput({
        arrangementFoes: [
          { denizenId: DEN_MISSING, gateId: "deep" },
          { denizenId: DEN_2, gateId: "terminus" },
        ],
      })), "INVALID_CAMPAIGN_STATE");
      expectCode(() => applyInitializeNecromancer(baseV5(), quietInput({
        arrangementFoes: [
          { denizenId: DEN_5, gateId: "deep" },
          { denizenId: DEN_2, gateId: "terminus" },
        ],
      })), "INVALID_CAMPAIGN_STATE");
      expectCode(() => applyInitializeNecromancer(baseV5(), dynamicInput({
        arrangementFoes: [
          { denizenId: DEN_1, gateId: "deep" },
          { denizenId: DEN_2, gateId: "terminus" },
          { denizenId: DEN_3, gateId: "amber" },
        ],
      })), "INVALID_CAMPAIGN_STATE");
      const already = applyInitializeNecromancer(baseV5(), quietInput()).nextState;
      expectCode(() => applyInitializeNecromancer(already, quietInput()), "INVALID_CAMPAIGN_STATE");
    });

    it("allows collective Foe and Ally bindings at initialization", () => {
      const result = applyInitializeNecromancer(baseV5(), quietInput({
        arrangementFoes: [
          { denizenId: DEN_COLLECTIVE, gateId: "deep" },
          { denizenId: DEN_2, gateId: "terminus" },
        ],
        arrangementAlly: { denizenId: DEN_1, gateId: "bronze" },
      }));
      expect(result.nextState.necromancer.foes[0]?.denizenId).toBe(DEN_COLLECTIVE);
      expect(result.nextState.necromancer.allies[0]?.denizenId).toBe(DEN_1);
    });
  });

  describe("manual edits and concurrency", () => {
    function initialized(state: CampaignStateV5 = withSeat(baseV5(), "necromancer", "present", WIZ_A)) {
      return applyInitializeNecromancer(state, quietInput()).nextState;
    }

    it("rejects stale Depth and forbids inheriting a predecessor value above 0", () => {
      const state = initialized();
      expectCode(
        () => applySetNecromancerDepth(state, null, { wizardId: WIZ_A, value: 0 }),
        "STALE_COMMAND_PRECONDITION",
      );
      const raised = applySetNecromancerDepth(state, { wizardId: WIZ_A, value: 0 }, { wizardId: WIZ_A, value: 4 }).nextState;
      expect(raised.necromancer.depth).toEqual({ wizardId: WIZ_A, value: 4 });
      const successorState: CampaignStateV5 = {
        ...raised,
        wizards: [...raised.wizards, wizard(WIZ_B, "Wizard B")],
        pactSeats: {
          ...raised.pactSeats,
          necromancer: { ...raised.pactSeats.necromancer, wizardId: WIZ_B, status: "silent" },
        },
      };
      expectCode(
        () => applySetNecromancerDepth(successorState, { wizardId: WIZ_A, value: 4 }, { wizardId: WIZ_B, value: 4 }),
        "INVALID_CAMPAIGN_STATE",
      );
      const reset = applySetNecromancerDepth(
        successorState,
        { wizardId: WIZ_A, value: 4 },
        { wizardId: WIZ_B, value: 0 },
      );
      expect(reset.nextState.necromancer.depth).toEqual({ wizardId: WIZ_B, value: 0 });
      expect(reset.events[0]?.type).toBe("necromancer_depth_changed");
    });

    it("allows Depth above 3 for the current owner and rejects no-op", () => {
      const state = initialized();
      const next = applySetNecromancerDepth(state, { wizardId: WIZ_A, value: 0 }, { wizardId: WIZ_A, value: 7 });
      expect(next.nextState.necromancer.depth?.value).toBe(7);
      expectCode(
        () => applySetNecromancerDepth(next.nextState, { wizardId: WIZ_A, value: 7 }, { wizardId: WIZ_A, value: 7 }),
        "INVALID_CAMPAIGN_STATE",
      );
    });

    it("rejects stale Gate status and forbids restoring a destroyed Gate", () => {
      const state = initialized();
      expectCode(() => applySetNecromancerGateStatus(state, "deep", "hostile", "ordinary"), "STALE_COMMAND_PRECONDITION");
      const hostile = applySetNecromancerGateStatus(state, "deep", "ordinary", "hostile").nextState;
      const destroyed = applySetNecromancerGateStatus(hostile, "deep", "hostile", "destroyed").nextState;
      expect(destroyed.necromancer.gates.find((gate) => gate.gateId === "deep")?.status).toBe("destroyed");
      expectCode(() => applySetNecromancerGateStatus(destroyed, "deep", "destroyed", "ordinary"), "INVALID_CAMPAIGN_STATE");
      expectCode(() => applySetNecromancerGateStatus(destroyed, "deep", "destroyed", "hostile"), "INVALID_CAMPAIGN_STATE");
    });

    it("rejects stale Law selection and permits any unique valid set after init", () => {
      const state = initialized();
      expectCode(
        () => applySetNecromancerSelectedLaws(state, [], [{ lawId: "seventh", visibility: "hidden" }]),
        "STALE_COMMAND_PRECONDITION",
      );
      const empty = applySetNecromancerSelectedLaws(state, state.necromancer.selectedLaws, []);
      expect(empty.nextState.necromancer.selectedLaws).toEqual([]);
      const hidden = applySetNecromancerSelectedLaws(empty.nextState, [], [
        { lawId: "seventh", visibility: "hidden" },
      ]);
      expect(hidden.nextState.necromancer.selectedLaws).toEqual([{ lawId: "seventh", visibility: "hidden" }]);
    });

    it("rejects stale Soul counts and moves Souls atomically with destination merge", () => {
      const state = initialized();
      const from: NecromancerOccupiableSpaceRef = { kind: "path", pathSpaceId: "edge_sage" };
      const to: NecromancerOccupiableSpaceRef = { kind: "path", pathSpaceId: "edge_hierophant" };
      expectCode(() => applySetNecromancerSoulCount(state, from, 0, 2), "STALE_COMMAND_PRECONDITION");
      const two = applySetNecromancerSoulCount(state, from, 1, 2).nextState;
      expectCode(() => applyMoveNecromancerSouls(two, from, to, 1, 1, 1), "STALE_COMMAND_PRECONDITION");
      const moved = applyMoveNecromancerSouls(two, from, to, 2, 2, 1);
      expect(soulAt(moved.nextState, from)).toBe(0);
      expect(soulAt(moved.nextState, to)).toBe(3);
      expect(moved.nextState.necromancer.souls.filter((soul) => JSON.stringify(soul.location) === JSON.stringify(to))).toHaveLength(1);
      expect(moved.events[0]?.type).toBe("necromancer_souls_moved");
    });

    it("uses expected-current role field updates and expected-record removal", () => {
      const state = initialized();
      expectCode(
        () => applyUpdateNecromancerFoe(state, DEN_1, {
          location: { expected: { kind: "gate", gateId: "terminus" }, value: { kind: "gate", gateId: "amber" } },
        }),
        "STALE_COMMAND_PRECONDITION",
      );
      const updated = applyUpdateNecromancerFoe(state, DEN_1, {
        location: { expected: { kind: "gate", gateId: "deep" }, value: { kind: "gate", gateId: "amber" } },
      });
      expect(updated.nextState.necromancer.foes.find((foe) => foe.denizenId === DEN_1)?.location).toEqual({
        kind: "gate",
        gateId: "amber",
      });
      expect(updated.nextState.world.denizens.some((denizen) => denizen.denizenId === DEN_1)).toBe(true);
      expectCode(
        () => applyRemoveNecromancerFoe(updated.nextState, DEN_1, {
          denizenId: DEN_1,
          location: { kind: "gate", gateId: "deep" },
        }),
        "STALE_COMMAND_PRECONDITION",
      );
      const removed = applyRemoveNecromancerFoe(updated.nextState, DEN_1, {
        denizenId: DEN_1,
        location: { kind: "gate", gateId: "amber" },
      });
      expect(removed.nextState.necromancer.foes.some((foe) => foe.denizenId === DEN_1)).toBe(false);
      expect(removed.nextState.world.denizens.some((denizen) => denizen.denizenId === DEN_1)).toBe(true);
      const allyRemoved = applyRemoveNecromancerAlly(removed.nextState, DEN_5, removed.nextState.necromancer.allies[0]);
      expect(allyRemoved.nextState.necromancer.allies).toEqual([]);
    });
  });

  describe("topology", () => {
    function initialized() {
      return applyInitializeNecromancer(withSeat(baseV5(), "necromancer", "present", WIZ_A), quietInput()).nextState;
    }

    it("creates a campaign Gate that has no normal remove transition", () => {
      const created = applyCreateNecromancerCampaignGate(initialized(), {
        gateId: CAMPAIGN_GATE,
        name: "  Ossuary  ",
        band: "far",
      });
      const gate = created.nextState.necromancer.gates.find((candidate) => candidate.gateId === CAMPAIGN_GATE);
      expect(gate).toEqual({
        origin: "campaign",
        gateId: CAMPAIGN_GATE,
        name: "Ossuary",
        band: "far",
        status: "ordinary",
      });
      expect(Domain).not.toHaveProperty("applyRemoveNecromancerGate");
      expect(Domain).not.toHaveProperty("applyRemoveNecromancerCampaignGate");
      const renamed = applyUpdateNecromancerCampaignGate(created.nextState, CAMPAIGN_GATE, {
        name: { expected: "Ossuary", value: "Black Ossuary" },
        band: { expected: "far", value: "near" },
      });
      expect(renamed.nextState.necromancer.gates.find((candidate) => candidate.gateId === CAMPAIGN_GATE)).toMatchObject({
        name: "Black Ossuary",
        band: "near",
        status: "ordinary",
      });
    });

    it("creates and removes an unreferenced campaign path space, but rejects referenced removal", () => {
      const withPath = applyCreateNecromancerCampaignPathSpace(initialized(), {
        pathSpaceId: CAMPAIGN_PATH,
        region: "abyss",
      }).nextState;
      const extra = applyCreateNecromancerCampaignPathSpace(withPath, {
        pathSpaceId: CAMPAIGN_PATH_2,
        region: "edge_of_life",
      }).nextState;
      const stepped = applyAddNecromancerStep(extra, {
        from: { kind: "path", pathSpaceId: CAMPAIGN_PATH },
        to: { kind: "gate", gateId: "terminus" },
      }).nextState;
      expectCode(
        () => applyRemoveNecromancerCampaignPathSpace(stepped, CAMPAIGN_PATH, {
          origin: "campaign",
          pathSpaceId: CAMPAIGN_PATH,
          region: "abyss",
        }),
        "INVALID_CAMPAIGN_STATE",
      );
      const unlinked = applyRemoveNecromancerStep(stepped, {
        from: { kind: "path", pathSpaceId: CAMPAIGN_PATH },
        to: { kind: "gate", gateId: "terminus" },
      }).nextState;
      const removed = applyRemoveNecromancerCampaignPathSpace(unlinked, CAMPAIGN_PATH, {
        origin: "campaign",
        pathSpaceId: CAMPAIGN_PATH,
        region: "abyss",
      });
      expect(removed.nextState.necromancer.pathSpaces.some((space) => space.pathSpaceId === CAMPAIGN_PATH)).toBe(false);
      expect(removed.nextState.necromancer.pathSpaces.some((space) => space.pathSpaceId === CAMPAIGN_PATH_2)).toBe(true);
    });

    it("accepts cycles, rejects self-loops, and never accepts terminal targets", () => {
      const state = initialized();
      const cycle = applyAddNecromancerStep(state, {
        from: { kind: "gate", gateId: "terminus" },
        to: { kind: "path", pathSpaceId: "edge_sage" },
      });
      expect(cycle.events[0]?.type).toBe("necromancer_step_added");
      expectCode(
        () => applyAddNecromancerStep(cycle.nextState, {
          from: { kind: "gate", gateId: "deep" },
          to: { kind: "gate", gateId: "deep" },
        }),
        "INVALID_CAMPAIGN_STATE",
      );
      expectCode(
        () => applyAddNecromancerStep(cycle.nextState, {
          from: { kind: "gate", gateId: "howling" },
          to: { kind: "terminal", terminalId: "void_beyond" },
        } as unknown as NecromancerDirectedStep),
        "INVALID_CAMPAIGN_STATE",
      );
      expect(cycle.nextState.necromancer.steps).not.toEqual(
        expect.arrayContaining([{ from: { kind: "gate", gateId: "howling" }, to: expect.anything() }]),
      );
    });
  });

  describe("anti-automation", () => {
    it("does not run deferred rules from ordinary manual edits", () => {
      const explosive = applyInitializeNecromancer(
        withSeat(baseV5(), "necromancer", "present", WIZ_A),
        explosiveInput(),
      ).nextState;
      const beforeFive = snapshotPieces(explosive);
      const five = applySetNecromancerSoulCount(
        explosive,
        { kind: "gate", gateId: "howling" },
        soulAt(explosive, { kind: "gate", gateId: "howling" }),
        5,
      ).nextState;
      expect(five.necromancer.foes).toEqual(beforeFive.foes);
      expect(snapshotPieces(five).gateStatuses).toEqual(beforeFive.gateStatuses);

      const beforeMove = snapshotPieces(five);
      const moved = applyMoveNecromancerSouls(
        five,
        { kind: "gate", gateId: "howling" },
        { kind: "gate", gateId: "amber" },
        2,
        5,
        soulAt(five, { kind: "gate", gateId: "amber" }),
      ).nextState;
      expect(moved.necromancer.foes).toEqual(beforeMove.foes);
      expect(moved.necromancer.allies).toEqual(beforeMove.allies);
      expect(moved.necromancer.ghoulCallers).toEqual(beforeMove.ghoulCallers);
      expect(snapshotPieces(moved).gateStatuses).toEqual(beforeMove.gateStatuses);

      const beforeFoe = snapshotPieces(moved);
      const addedFoe = applyAddNecromancerFoe(moved, {
        denizenId: DEN_COLLECTIVE,
        location: { kind: "gate", gateId: "bronze" },
      }).nextState;
      expect(addedFoe.necromancer.foes.find((foe) => foe.denizenId === DEN_COLLECTIVE)?.location).toEqual({
        kind: "gate",
        gateId: "bronze",
      });
      expect(addedFoe.necromancer.gates.find((gate) => gate.gateId === "bronze")?.status).toBe(
        beforeFoe.gateStatuses.find((gate) => gate.gateId === "bronze")?.status,
      );
      const escapedAttempt = applyUpdateNecromancerFoe(addedFoe, DEN_COLLECTIVE, {
        location: {
          expected: { kind: "gate", gateId: "bronze" },
          value: { kind: "escaped", seatId: "sage", abominationKind: "occult" },
        },
      }).nextState;
      expect(escapedAttempt.necromancer.foes.find((foe) => foe.denizenId === DEN_COLLECTIVE)?.location).toEqual({
        kind: "escaped",
        seatId: "sage",
        abominationKind: "occult",
      });
      expect(escapedAttempt.necromancer.foes.find((foe) => foe.denizenId === DEN_1)?.location).toEqual({
        kind: "gate",
        gateId: "deep",
      });

      const beforeGhoul = snapshotPieces(escapedAttempt);
      const petty = applyUpdateNecromancerGhoulCaller(escapedAttempt, DEN_6, {
        pettyDeadCount: { expected: 0, value: 4 },
      }).nextState;
      expect(petty.necromancer.souls).toEqual(escapedAttempt.necromancer.souls);
      expect(petty.necromancer.foes).toEqual(beforeGhoul.foes);
      const flipped = applyUpdateNecromancerGhoulCaller(petty, DEN_6, {
        disposition: { expected: "disruptive", value: "reliable" },
      }).nextState;
      expect(flipped.necromancer.ghoulCallers[0]?.location).toEqual(petty.necromancer.ghoulCallers[0]?.location);
      expect(flipped.necromancer.foes).toEqual(petty.necromancer.foes);
      expect(flipped.necromancer.allies).toEqual(petty.necromancer.allies);
      expect(flipped.calendar).toEqual(beforeFive.calendar);
      expect(flipped.lifecycle).toEqual(beforeFive.lifecycle);
      expect(flipped.wizardmootHistory).toEqual([]);
    });

    it("does not add a remove-Gate operation", () => {
      expect(Domain).not.toHaveProperty("applyRemoveNecromancerCampaignGate");
      expect(Domain).not.toHaveProperty("applyRemoveNecromancerGate");
    });
  });

  describe("additional manual overlay operations", () => {
    it("adds an Ally and a Ghoul-Caller without deleting shared Denizens", () => {
      const quiet = applyInitializeNecromancer(withSeat(baseV5(), "necromancer", "present", WIZ_A), quietInput()).nextState;
      const withAlly = applyAddNecromancerAlly(quiet, {
        denizenId: DEN_COLLECTIVE,
        location: { kind: "gate", gateId: "lead" },
      }).nextState;
      const withGhoul = applyAddNecromancerGhoulCaller(withAlly, {
        denizenId: DEN_6,
        disposition: "reliable",
        location: { kind: "path", pathSpaceId: "edge_mariner" },
        pettyDeadCount: 0,
        primaryElement: "water",
        aesthetic: "salt-crusted shroud",
        strangeQuirk: "hums at graves",
        ageYears: 19,
      }).nextState;
      expect(withGhoul.necromancer.allies).toHaveLength(2);
      expect(withGhoul.necromancer.ghoulCallers).toHaveLength(1);
      const removedGhoul = applyRemoveNecromancerGhoulCaller(
        withGhoul,
        DEN_6,
        withGhoul.necromancer.ghoulCallers[0],
      ).nextState;
      expect(removedGhoul.world.denizens.some((denizen) => denizen.denizenId === DEN_6)).toBe(true);
    });
  });

  describe("Ghoul-Caller durable profile", () => {
    const profile = {
      primaryElement: "earth" as const,
      aesthetic: "  moss-eaten vestments  ",
      strangeQuirk: "  speaks only at dusk  ",
      ageYears: 120,
    };

    it("Explosive requires and persists the canonical profile while remaining Disruptive with petty dead 0", () => {
      const padded = explosiveInput({
        arrangementGhoulCaller: {
          denizenId: DEN_6,
          pathSpaceId: "edge_sage",
          ...profile,
        },
      });
      const result = applyInitializeNecromancer(baseV5(), padded);
      const ghoul = result.nextState.necromancer.ghoulCallers[0];
      expect(ghoul).toEqual({
        denizenId: DEN_6,
        disposition: "disruptive",
        location: { kind: "path", pathSpaceId: "edge_sage" },
        pettyDeadCount: 0,
        primaryElement: "earth",
        aesthetic: "moss-eaten vestments",
        strangeQuirk: "speaks only at dusk",
        ageYears: 120,
      });
      const event = result.events[0];
      expect(event.type).toBe("necromancer_initialized");
      if (event.type === "necromancer_initialized") {
        expect(event.data.arrangementGhoulCaller).toEqual({
          denizenId: DEN_6,
          pathSpaceId: "edge_sage",
          primaryElement: "earth",
          aesthetic: "moss-eaten vestments",
          strangeQuirk: "speaks only at dusk",
          ageYears: 120,
        });
      }
      expect(result.nextState.necromancer).not.toHaveProperty("wards");
      expect(ghoul).not.toHaveProperty("wards");
      expect(ghoul).not.toHaveProperty("changesOfMagic");
    });

    it("rejects Explosive profile blanks and invalid Primary Element or age", () => {
      expectCode(() => applyInitializeNecromancer(baseV5(), explosiveInput({
        arrangementGhoulCaller: {
          denizenId: DEN_6,
          pathSpaceId: "edge_sage",
          primaryElement: "void" as never,
          aesthetic: "ok",
          strangeQuirk: "ok",
          ageYears: 12,
        },
      })), "INVALID_CAMPAIGN_STATE");
      expectCode(() => applyInitializeNecromancer(baseV5(), explosiveInput({
        arrangementGhoulCaller: {
          denizenId: DEN_6,
          pathSpaceId: "edge_sage",
          primaryElement: "air",
          aesthetic: "   ",
          strangeQuirk: "ok",
          ageYears: 12,
        },
      })), "INVALID_CAMPAIGN_STATE");
      expectCode(() => applyInitializeNecromancer(baseV5(), explosiveInput({
        arrangementGhoulCaller: {
          denizenId: DEN_6,
          pathSpaceId: "edge_sage",
          primaryElement: "air",
          aesthetic: "ok",
          strangeQuirk: "ok",
          ageYears: -3,
        },
      })), "INVALID_CAMPAIGN_STATE");
    });

    it("adds, updates, and removes a profile-bearing Ghoul-Caller with expected-current semantics", () => {
      const quiet = applyInitializeNecromancer(baseV5(), quietInput()).nextState;
      const added = applyAddNecromancerGhoulCaller(quiet, {
        denizenId: DEN_6,
        disposition: "disruptive",
        location: { kind: "path", pathSpaceId: "edge_sage" },
        pettyDeadCount: 0,
        primaryElement: "air",
        aesthetic: "  pale linen  ",
        strangeQuirk: "  never blinks  ",
        ageYears: 33,
      });
      const ghoul = added.nextState.necromancer.ghoulCallers[0];
      expect(ghoul?.aesthetic).toBe("pale linen");
      expect(ghoul?.strangeQuirk).toBe("never blinks");
      expect(added.events[0]).toMatchObject({
        type: "necromancer_ghoul_caller_added",
        data: { ghoulCaller: ghoul },
      });
      expect(added.nextState.necromancer.souls).toEqual(quiet.necromancer.souls);
      expect(added.nextState.necromancer.foes).toEqual(quiet.necromancer.foes);
      expect(added.nextState.necromancer.gates).toEqual(quiet.necromancer.gates);

      const updated = applyUpdateNecromancerGhoulCaller(added.nextState, DEN_6, {
        primaryElement: { expected: "air", value: "water" },
        aesthetic: { expected: "pale linen", value: "  river silt  " },
        strangeQuirk: { expected: "never blinks", value: "collects moths" },
        ageYears: { expected: 33, value: 900 },
      });
      expect(updated.nextState.necromancer.ghoulCallers[0]).toMatchObject({
        primaryElement: "water",
        aesthetic: "river silt",
        strangeQuirk: "collects moths",
        ageYears: 900,
        location: ghoul?.location,
        disposition: "disruptive",
        pettyDeadCount: 0,
      });
      expect(updated.nextState.necromancer.souls).toEqual(added.nextState.necromancer.souls);

      expectCode(() => applyUpdateNecromancerGhoulCaller(updated.nextState, DEN_6, {
        primaryElement: { expected: "air", value: "fire" },
      }), "STALE_COMMAND_PRECONDITION");
      expectCode(() => applyUpdateNecromancerGhoulCaller(updated.nextState, DEN_6, {
        aesthetic: { expected: "pale linen", value: "new" },
      }), "STALE_COMMAND_PRECONDITION");
      expectCode(() => applyUpdateNecromancerGhoulCaller(updated.nextState, DEN_6, {
        aesthetic: { expected: "river silt", value: "   " },
      }), "INVALID_CAMPAIGN_STATE");
      expectCode(() => applyUpdateNecromancerGhoulCaller(updated.nextState, DEN_6, {
        ageYears: { expected: 900, value: 1.2 },
      }), "INVALID_CAMPAIGN_STATE");
      expectCode(() => applyUpdateNecromancerGhoulCaller(updated.nextState, DEN_6, {
        primaryElement: { expected: "water", value: "water" },
      }), "INVALID_CAMPAIGN_STATE");

      const profileOnly = applyUpdateNecromancerGhoulCaller(updated.nextState, DEN_6, {
        strangeQuirk: { expected: "collects moths", value: "whispers to keys" },
      });
      expect(profileOnly.nextState.necromancer.ghoulCallers[0]?.strangeQuirk).toBe("whispers to keys");

      expectCode(() => applyRemoveNecromancerGhoulCaller(profileOnly.nextState, DEN_6, {
        ...profileOnly.nextState.necromancer.ghoulCallers[0]!,
        aesthetic: "wrong",
      }), "STALE_COMMAND_PRECONDITION");
      const removed = applyRemoveNecromancerGhoulCaller(
        profileOnly.nextState,
        DEN_6,
        profileOnly.nextState.necromancer.ghoulCallers[0]!,
      );
      expect(removed.nextState.necromancer.ghoulCallers).toEqual([]);
      expect(removed.nextState.world.denizens.some((denizen) => denizen.denizenId === DEN_6)).toBe(true);
    });

    it("canonicalizes initialize and add fingerprints to the applied profile text", () => {
      const padded = canonicalizeInitializeNecromancerInput(explosiveInput({
        arrangementGhoulCaller: {
          denizenId: DEN_6,
          pathSpaceId: "edge_sage",
          ...profile,
        },
      }));
      const trimmed = canonicalizeInitializeNecromancerInput(explosiveInput({
        arrangementGhoulCaller: {
          denizenId: DEN_6,
          pathSpaceId: "edge_sage",
          primaryElement: "earth",
          aesthetic: "moss-eaten vestments",
          strangeQuirk: "speaks only at dusk",
          ageYears: 120,
        },
      }));
      expect(padded.arrangementGhoulCaller).toEqual(trimmed.arrangementGhoulCaller);
      expect(canonicalizeNecromancerGhoulCaller({
        denizenId: DEN_6,
        disposition: "reliable",
        location: { kind: "path", pathSpaceId: "edge_sage" },
        pettyDeadCount: 0,
        primaryElement: "air",
        aesthetic: "  pale linen  ",
        strangeQuirk: "  never blinks  ",
        ageYears: 33,
      }).aesthetic).toBe("pale linen");
      const fields = canonicalizeUpdateNecromancerGhoulCallerFields({
        aesthetic: { expected: "pale linen", value: "  river silt  " },
      });
      expect(fields.aesthetic).toEqual({ expected: "pale linen", value: "river silt" });
    });
  });
});
