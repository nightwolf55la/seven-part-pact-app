import { describe, it, expect } from "vitest";
import type {
  CampaignStateV5,
  CampaignWizardV5,
  WizardCharacterDataV5,
  MonthOrdinal,
  PlayerId,
  WizardId,
  DenizenId,
  IsleId,
  PlaceId,
  CompanionRelationshipId,
  SharedWorldState,
} from "../shared/domain";
import {
  CURRENT_STATE_SCHEMA_VERSION,
  SEVEN_PART_PACT_DRAFT4_ID,
  SEVEN_PART_PACT_DRAFT4_VERSION,
  DomainError,
  validateCampaignState,
  validateAnyCampaignState,
  validateCampaignStateV5Candidate,
  BLANK_WIZARD_CHARACTER_V5,
  EMPTY_SHARED_WORLD_STATE,
  EMPTY_HIEROPHANT_STATE,
  EMPTY_MARINER_STATE,
} from "../shared/domain";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const WIZ_A = "wiz_00000000-0000-0000-0000-00000000000a" as WizardId;
const PLR_A = "plr_00000000-0000-0000-0000-00000000000a" as PlayerId;
const DEN_1 = "den_00000000-0000-0000-0000-000000000001" as DenizenId;
const ISL_1 = "isl_00000000-0000-0000-0000-000000000001" as IsleId;
const PLC_1 = "plc_00000000-0000-0000-0000-000000000001" as PlaceId;
const CMPREL_1 = "cmprel_00000000-0000-0000-0000-000000000001" as CompanionRelationshipId;

const EMPTY_PACT_SEATS = {
  necromancer: { status: null, wizardId: null, watcherPlayerId: null },
  hierophant: { status: null, wizardId: null, watcherPlayerId: null },
  warlock: { status: null, wizardId: null, watcherPlayerId: null },
  mariner: { status: null, wizardId: null, watcherPlayerId: null },
  faustian: { status: null, wizardId: null, watcherPlayerId: null },
  sage: { status: null, wizardId: null, watcherPlayerId: null },
  sorcerer: { status: null, wizardId: null, watcherPlayerId: null },
} as const;

function blankV5Wizard(overrides?: Partial<CampaignWizardV5>): CampaignWizardV5 {
  return {
    wizardId: WIZ_A,
    name: "Wizard A",
    portrayedByPlayerId: PLR_A,
    character: { ...BLANK_WIZARD_CHARACTER_V5 },
    homeIsleId: null,
    sanctumPlaceId: null,
    ...overrides,
  };
}

function minimalV5Setup(): CampaignStateV5 {
  return {
    schemaVersion: 5,
    ruleset: { id: SEVEN_PART_PACT_DRAFT4_ID, version: SEVEN_PART_PACT_DRAFT4_VERSION },
    calendar: { monthOrdinal: 0 as MonthOrdinal },
    configuration: { ageId: null, facilitatorPlayerId: null },
    players: [{ playerId: PLR_A, name: "Alice" }],
    wizards: [blankV5Wizard()],
    pactSeats: EMPTY_PACT_SEATS,
    lifecycle: {
      kind: "setup",
      orrery: { saturn: null, jupiter: null, mars: null, venus: null, mercury: null },
    },
    wizardmootHistory: [],
    world: { ...EMPTY_SHARED_WORLD_STATE },
    hierophant: { ...EMPTY_HIEROPHANT_STATE },
    mariner: { ...EMPTY_MARINER_STATE },
  };
}

function minimalV5Play(): CampaignStateV5 {
  return {
    ...minimalV5Setup(),
    lifecycle: {
      kind: "play",
      phase: "planning",
      orrery: { saturn: 0, jupiter: 0, mars: 0, venus: 0, mercury: 0 } as any,
      currentMonth: {
        timeParticipants: [],
        engagements: [],
        wizardmootAttendance: null,
      },
    },
  };
}

// =========================================================================
// 1. Minimal valid V5 setup with empty world validates
// =========================================================================

describe("validateCampaignStateV5Candidate", () => {
  it("accepts a minimal V5 Setup state with empty world", () => {
    const state = minimalV5Setup();
    const result = validateCampaignStateV5Candidate(state);
    expect(result.schemaVersion).toBe(5);
  });

  // =========================================================================
  // 2. Blank V5 character has no companionDescriptions
  // =========================================================================

  it("BLANK_WIZARD_CHARACTER_V5 has no companionDescriptions", () => {
    expect(BLANK_WIZARD_CHARACTER_V5).not.toHaveProperty("companionDescriptions");
    expect(BLANK_WIZARD_CHARACTER_V5.elements).toBeNull();
    expect(BLANK_WIZARD_CHARACTER_V5.pactFragmentPersonalForm).toBeNull();
  });

  it("EMPTY_SHARED_WORLD_STATE has all empty arrays", () => {
    expect(EMPTY_SHARED_WORLD_STATE.denizens).toEqual([]);
    expect(EMPTY_SHARED_WORLD_STATE.isles).toEqual([]);
    expect(EMPTY_SHARED_WORLD_STATE.places).toEqual([]);
    expect(EMPTY_SHARED_WORLD_STATE.companionRelationships).toEqual([]);
  });

  // =========================================================================
  // 3. Valid Play V5 state accepts a Denizen Engagement target
  // =========================================================================

  it("accepts a V5 Play state with a denizen engagement target", () => {
    const state: CampaignStateV5 = {
      ...minimalV5Play(),
      world: {
        ...EMPTY_SHARED_WORLD_STATE,
        denizens: [{ denizenId: DEN_1, name: "Elder", representation: "individual", description: null }],
      },
      lifecycle: {
        kind: "play",
        phase: "planning",
        orrery: { saturn: 0, jupiter: 0, mars: 0, venus: 0, mercury: 0 } as any,
        currentMonth: {
          timeParticipants: [],
          engagements: [{
            engagementId: "eng_00000000-0000-0000-0000-000000000001" as any,
            actingWizardId: WIZ_A,
            target: { kind: "denizen", denizenId: DEN_1 },
            resolution: "pending",
            linkedTimeAllocationId: null,
          }],
          wizardmootAttendance: null,
        },
      },
    };
    expect(() => validateCampaignStateV5Candidate(state)).not.toThrow();
  });

  // =========================================================================
  // 4. V4 active validation rejects denizen target and schema V5
  // =========================================================================

  it("V5 validateCampaignState accepts schemaVersion 5", () => {
    expect(() => validateCampaignState(minimalV5Setup())).not.toThrow();
  });

  it("V5 validateAnyCampaignState accepts schemaVersion 5", () => {
    expect(() => validateAnyCampaignState(minimalV5Setup())).not.toThrow();
  });

  it("CURRENT_STATE_SCHEMA_VERSION is 5", () => {
    expect(CURRENT_STATE_SCHEMA_VERSION).toBe(5);
  });

  // =========================================================================
  // 5. Malformed wizard homeIsleId / sanctumPlaceId (table-driven)
  // =========================================================================

  it.each([
    { field: "homeIsleId", value: "not-an-isle-id", reason: "malformed IsleId" },
    { field: "sanctumPlaceId", value: "not-a-place-id", reason: "malformed PlaceId" },
  ])("rejects wizard with $reason ($field)", ({ field, value }) => {
    const state = minimalV5Setup();
    const wizard = { ...state.wizards[0], [field]: value };
    const bad = { ...state, wizards: [wizard] };
    expect(() => validateCampaignStateV5Candidate(bad)).toThrow(DomainError);
  });

  // =========================================================================
  // 6. Representative malformed world subjects (table-driven)
  // =========================================================================

  describe("world structural validation", () => {
    it("rejects non-object world", () => {
      const state: any = { ...minimalV5Setup(), world: "not an object" };
      expect(() => validateCampaignStateV5Candidate(state)).toThrow(DomainError);
    });

    it("rejects world with non-array denizens", () => {
      const state: any = { ...minimalV5Setup(), world: { ...EMPTY_SHARED_WORLD_STATE, denizens: "bad" } };
      expect(() => validateCampaignStateV5Candidate(state)).toThrow(DomainError);
    });

    it.each([
      {
        label: "denizen with blank name",
        world: { ...EMPTY_SHARED_WORLD_STATE, denizens: [{ denizenId: DEN_1, name: "", representation: "individual", description: null }] },
      },
      {
        label: "denizen with invalid representation",
        world: { ...EMPTY_SHARED_WORLD_STATE, denizens: [{ denizenId: DEN_1, name: "X", representation: "group", description: null }] },
      },
      {
        label: "isle with blank name",
        world: { ...EMPTY_SHARED_WORLD_STATE, isles: [{ isleId: ISL_1, name: "", description: null }] },
      },
      {
        label: "place with invalid placement kind",
        world: {
          ...EMPTY_SHARED_WORLD_STATE,
          places: [{ placeId: PLC_1, name: "P", description: null, placement: { kind: "floating" } }],
        },
      },
      {
        label: "on_isle placement with malformed isleId",
        world: {
          ...EMPTY_SHARED_WORLD_STATE,
          places: [{ placeId: PLC_1, name: "P", description: null, placement: { kind: "on_isle", isleId: "bad" } }],
        },
      },
      {
        label: "mobile placement with malformed associatedIsleId",
        world: {
          ...EMPTY_SHARED_WORLD_STATE,
          places: [{ placeId: PLC_1, name: "P", description: null, placement: { kind: "mobile", associatedIsleId: "bad" } }],
        },
      },
      {
        label: "companion with invalid element",
        world: {
          ...EMPTY_SHARED_WORLD_STATE,
          denizens: [{ denizenId: DEN_1, name: "D", representation: "individual", description: null }],
          companionRelationships: [{
            companionRelationshipId: CMPREL_1, wizardId: WIZ_A,
            element: "lightning", denizenId: DEN_1, description: null, status: "current",
          }],
        },
      },
      {
        label: "companion with invalid status",
        world: {
          ...EMPTY_SHARED_WORLD_STATE,
          denizens: [{ denizenId: DEN_1, name: "D", representation: "individual", description: null }],
          companionRelationships: [{
            companionRelationshipId: CMPREL_1, wizardId: WIZ_A,
            element: "fire", denizenId: DEN_1, description: null, status: "dead",
          }],
        },
      },
    ])("rejects $label", ({ world }) => {
      const state = { ...minimalV5Setup(), world };
      expect(() => validateCampaignStateV5Candidate(state)).toThrow(DomainError);
    });
  });

  // =========================================================================
  // 7. Reference integrity is composed into the full validator
  // =========================================================================

  it("rejects dangling denizen reference in companion relationship (composed reference integrity)", () => {
    const state = {
      ...minimalV5Setup(),
      world: {
        ...EMPTY_SHARED_WORLD_STATE,
        companionRelationships: [{
          companionRelationshipId: CMPREL_1, wizardId: WIZ_A,
          element: "fire", denizenId: DEN_1, description: null, status: "current",
        }],
      },
    };
    expect(() => validateCampaignStateV5Candidate(state)).toThrow(DomainError);
  });

  it("rejects duplicate current companion for same wizard+element (composed reference integrity)", () => {
    const DEN_2 = "den_00000000-0000-0000-0000-000000000002" as DenizenId;
    const CMPREL_2 = "cmprel_00000000-0000-0000-0000-000000000002" as CompanionRelationshipId;
    const state = {
      ...minimalV5Setup(),
      world: {
        ...EMPTY_SHARED_WORLD_STATE,
        denizens: [
          { denizenId: DEN_1, name: "A", representation: "individual" as const, description: null },
          { denizenId: DEN_2, name: "B", representation: "individual" as const, description: null },
        ],
        companionRelationships: [
          { companionRelationshipId: CMPREL_1, wizardId: WIZ_A, element: "fire" as const, denizenId: DEN_1, description: null, status: "current" as const },
          { companionRelationshipId: CMPREL_2, wizardId: WIZ_A, element: "fire" as const, denizenId: DEN_2, description: null, status: "current" as const },
        ],
      },
    };
    expect(() => validateCampaignStateV5Candidate(state)).toThrow(DomainError);
  });

  // =========================================================================
  // 8. Common V4 invariants remain enforced
  // =========================================================================

  it("rejects bad ruleset in V5 candidate (shared V4 invariant)", () => {
    const state: any = { ...minimalV5Setup(), ruleset: { id: "bad", version: 1 } };
    expect(() => validateCampaignStateV5Candidate(state)).toThrow(DomainError);
  });

  it("rejects duplicate playerId in V5 candidate (shared V4 invariant)", () => {
    const state = {
      ...minimalV5Setup(),
      players: [
        { playerId: PLR_A, name: "Alice" },
        { playerId: PLR_A, name: "Bob" },
      ],
    };
    expect(() => validateCampaignStateV5Candidate(state)).toThrow(DomainError);
  });
});
