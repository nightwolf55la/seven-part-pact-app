import { describe, it, expect } from "vitest";
import {
  CURRENT_STATE_SCHEMA_VERSION,
  initialCampaignState,
  validateCampaignState,
  validateAnyCampaignState,
  BLANK_WIZARD_CHARACTER,
  PACT_SEAT_IDS,
  MOVABLE_PLANET_IDS,
  applyCreateWizard,
  applyUpdateWizardCharacter,
  applyAddPlayer,
  applySetCampaignAge,
  applySetFacilitator,
  applySetSetupMonth,
  applySetSetupOrreryPosition,
  applySetPactSeatWizard,
  applySetPactSeatStatus,
  applySetWatcher,
  applyBeginPlay,
  applyAdvancePhase,
  applySetEngagementTarget,
  applyRescheduleEngagement,
} from "../shared/domain";
import type { PactSeatId } from "../shared/domain/pact-seats";
import type { AdvancePhaseInput } from "../shared/domain";
import type {
  CampaignStateV4,
  CurrentCampaignState,
  WizardCharacterUpdatedEventV1,
  PlayerId,
  WizardId,
  AllocationId,
  EngagementId,
  WizardInitIds,
  MonthOrdinal,
  DenizenId,
  MovablePlanetId,
} from "../shared/domain";

// ---------------------------------------------------------------------------
// ID helpers (UUID format required by domain validators)
// ---------------------------------------------------------------------------

const P1 = "plr_00000000-0000-0000-0000-000000000001" as PlayerId;
const P2 = "plr_00000000-0000-0000-0000-000000000002" as PlayerId;
const P3 = "plr_00000000-0000-0000-0000-000000000003" as PlayerId;
const P4 = "plr_00000000-0000-0000-0000-000000000004" as PlayerId;
const P5 = "plr_00000000-0000-0000-0000-000000000005" as PlayerId;
const P6 = "plr_00000000-0000-0000-0000-000000000006" as PlayerId;
const P7 = "plr_00000000-0000-0000-0000-000000000007" as PlayerId;

function wizId(n: number): WizardId {
  return `wiz_00000000-0000-0000-0000-00000000000${n}` as WizardId;
}

const D1 = "den_00000000-0000-0000-0000-000000000001" as DenizenId;
const D2 = "den_00000000-0000-0000-0000-000000000002" as DenizenId;

function makeAllocationId(n: number): AllocationId {
  return `alc_00000000-0000-0000-0000-${String(n).padStart(12, "0")}` as AllocationId;
}
function makeEngagementId(n: number): EngagementId {
  return `eng_00000000-0000-0000-0000-${String(n).padStart(12, "0")}` as EngagementId;
}

function makeWizardInits(wizardIds: WizardId[]): WizardInitIds[] {
  let counter = 1;
  return wizardIds.map((wizardId) => {
    const base = counter;
    counter += 5;
    return {
      wizardId,
      allocationIds: [
        makeAllocationId(base),
        makeAllocationId(base + 1),
        makeAllocationId(base + 2),
        makeAllocationId(base + 3),
      ] as [AllocationId, AllocationId, AllocationId, AllocationId],
      engagementId: makeEngagementId(base + 4),
    };
  });
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const AWAKENING_INDICES: Record<MovablePlanetId, number> = {
  saturn: 16, jupiter: 1, mars: 18, venus: 14, mercury: 17,
};

function makeMinimalV4State(): CampaignStateV4 {
  return {
    schemaVersion: 4,
    ruleset: { id: "seven_part_pact_draft4", version: 1 },
    calendar: { monthOrdinal: null },
    configuration: { ageId: null, facilitatorPlayerId: null },
    players: [],
    wizards: [],
    pactSeats: {
      necromancer: { status: null, wizardId: null, watcherPlayerId: null },
      hierophant: { status: null, wizardId: null, watcherPlayerId: null },
      warlock: { status: null, wizardId: null, watcherPlayerId: null },
      mariner: { status: null, wizardId: null, watcherPlayerId: null },
      faustian: { status: null, wizardId: null, watcherPlayerId: null },
      sage: { status: null, wizardId: null, watcherPlayerId: null },
      sorcerer: { status: null, wizardId: null, watcherPlayerId: null },
    },
    lifecycle: {
      kind: "setup",
      orrery: { saturn: null, jupiter: null, mars: null, venus: null, mercury: null },
    },
    wizardmootHistory: [],
  };
}

function buildReadySetup(): CurrentCampaignState {
  let state = initialCampaignState();
  const players = [P1, P2, P3, P4, P5, P6, P7];
  for (let i = 0; i < players.length; i++) {
    state = applyAddPlayer(state, players[i], `Player ${i + 1}`).nextState;
  }
  state = applySetCampaignAge(state, "awakening").nextState;
  state = applySetFacilitator(state, P1).nextState;
  state = applySetSetupMonth(state, 11 as MonthOrdinal).nextState;
  for (const planetId of MOVABLE_PLANET_IDS) {
    state = applySetSetupOrreryPosition(state, planetId, AWAKENING_INDICES[planetId]).nextState;
  }
  const seats: PactSeatId[] = [...PACT_SEAT_IDS];
  for (let i = 0; i < seats.length; i++) {
    state = applyCreateWizard(state, wizId(i + 1), `Wizard ${i + 1}`, players[i], seats[i]).nextState;
    state = applySetPactSeatWizard(state, seats[i], wizId(i + 1)).nextState;
    if (i < 6) {
      state = applySetPactSeatStatus(state, seats[i], "present").nextState;
    } else {
      state = applySetPactSeatStatus(state, seats[i], "silent").nextState;
    }
    state = applySetWatcher(state, seats[i], P1).nextState;
  }
  return state;
}

const PRESENT_WIZARD_IDS: WizardId[] = Array.from({ length: 6 }, (_, i) => wizId(i + 1));

function setupPlayState(): CurrentCampaignState {
  const setup = buildReadySetup();
  const inits = makeWizardInits(PRESENT_WIZARD_IDS);
  return applyBeginPlay(setup, { wizardInits: inits }).nextState;
}

function forceAdvancePhase(state: CurrentCampaignState, input: AdvancePhaseInput): CurrentCampaignState {
  const r = applyAdvancePhase(state, input);
  if (r.outcome === "applied") return r.nextState;
  const ackKeys = r.warnings.map((w: { key: string }) => w.key);
  const r2 = applyAdvancePhase(state, { ...input, acknowledgedWarningKeys: ackKeys });
  if (r2.outcome === "applied") return r2.nextState;
  throw new Error("Unexpected warnings after acknowledgement");
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("V5 Runtime Activation", () => {
  it("1. CURRENT_STATE_SCHEMA_VERSION is 5 and initialCampaignState returns valid V5 with empty world", () => {
    expect(CURRENT_STATE_SCHEMA_VERSION).toBe(5);
    const state = initialCampaignState();
    expect(state.schemaVersion).toBe(5);
    expect(state.world).toEqual({
      denizens: [],
      isles: [],
      places: [],
      companionRelationships: [],
      campaignPowerfulDenizenTaxonomies: [],
      treasures: [],
    });
  });

  it("2. V5 wizard character has no companionDescriptions; fresh wizards have homeIsleId/sanctumPlaceId null", () => {
    expect("companionDescriptions" in BLANK_WIZARD_CHARACTER).toBe(false);
    const state = initialCampaignState();
    const { nextState } = applyCreateWizard(state, wizId(1), "Gandalf", null, "necromancer");
    const wiz = nextState.wizards[0];
    expect(wiz.homeIsleId).toBeNull();
    expect(wiz.sanctumPlaceId).toBeNull();
    expect("companionDescriptions" in wiz.character).toBe(false);
  });

  it("3. validateCampaignState accepts fresh V5 state", () => {
    expect(() => validateCampaignState(initialCampaignState())).not.toThrow();
  });

  it("4. validateCampaignState and validateAnyCampaignState reject V4", () => {
    const v4 = makeMinimalV4State();
    expect(() => validateCampaignState(v4)).toThrow();
    expect(() => validateAnyCampaignState(v4)).toThrow();
  });

  it("5. active wizard character update emits version 2 event", () => {
    let state = initialCampaignState();
    state = applyCreateWizard(state, wizId(1), "Radagast", null, "hierophant").nextState;
    const result = applyUpdateWizardCharacter(state, wizId(1), { ageYears: 200 });
    expect(result.events).toHaveLength(1);
    expect(result.events[0].type).toBe("wizard_character_updated");
    expect((result.events[0] as any).version).toBe(2);
  });

  it("6. set engagement target with denizen emits version 2 event", () => {
    let state = setupPlayState();
    if (state.lifecycle.kind !== "play") throw new Error("unreachable");
    const month = state.calendar.monthOrdinal!;
    state = forceAdvancePhase(state, { expectedMonthOrdinal: month, expectedPhase: "new_moon" });
    state = forceAdvancePhase(state, { expectedMonthOrdinal: month, expectedPhase: "visions" });
    if (state.lifecycle.kind !== "play") throw new Error("unreachable");
    state = {
      ...state,
      world: {
        ...state.world,
        denizens: [{ denizenId: D1, name: "Goblin", representation: "individual" as const, description: null, mortalityState: "not_deceased" as const, powerfulProfile: null }],
      },
    };
    if (state.lifecycle.kind !== "play") throw new Error("Expected play lifecycle");
    const eng = state.lifecycle.currentMonth.engagements[0];
    expect(eng).toBeDefined();
    const result = applySetEngagementTarget(state, {
      expectedMonthOrdinal: state.calendar.monthOrdinal!,
      engagementId: eng.engagementId,
      target: { kind: "denizen", denizenId: D1 },
    });
    expect(result.events).toHaveLength(1);
    expect((result.events[0] as any).version).toBe(2);
    expect(result.events[0].type).toBe("engagement_target_changed");
  });

  it("7. reschedule engagement with denizen target emits version 2 event", () => {
    let state = setupPlayState();
    if (state.lifecycle.kind !== "play") throw new Error("unreachable");
    const month = state.calendar.monthOrdinal!;
    state = forceAdvancePhase(state, { expectedMonthOrdinal: month, expectedPhase: "new_moon" });
    state = forceAdvancePhase(state, { expectedMonthOrdinal: month, expectedPhase: "visions" });
    state = forceAdvancePhase(state, { expectedMonthOrdinal: month, expectedPhase: "planning" });
    state = {
      ...state,
      world: {
        ...state.world,
        denizens: [{ denizenId: D2, name: "Dragon", representation: "individual" as const, description: null, mortalityState: "not_deceased" as const, powerfulProfile: null }],
      },
    };
    if (state.lifecycle.kind !== "play") throw new Error("unreachable");
    const eng = state.lifecycle.currentMonth.engagements[0];
    expect(eng).toBeDefined();
    const result = applyRescheduleEngagement(state, {
      expectedMonthOrdinal: month,
      engagementId: eng.engagementId,
      target: { kind: "denizen", denizenId: D2 },
    });
    expect(result.events).toHaveLength(1);
    expect((result.events[0] as any).version).toBe(2);
    expect(result.events[0].type).toBe("engagement_rescheduled");
  });

  it("8. historical V1 wizard_character_updated event shape remains valid", () => {
    const v1Event: WizardCharacterUpdatedEventV1 = {
      type: "wizard_character_updated",
      version: 1,
      data: {
        wizardId: "wiz_test",
        previousCharacter: {
          elements: null,
          pactFragmentPersonalForm: null,
          familiarDescription: null,
          ageYears: null,
          publicChangesOfMagic: [],
          importantNotes: null,
          companionDescriptions: { air: null, fire: null, earth: null, water: null },
        },
        newCharacter: {
          elements: null,
          pactFragmentPersonalForm: null,
          familiarDescription: null,
          ageYears: null,
          publicChangesOfMagic: [],
          importantNotes: null,
          companionDescriptions: { air: null, fire: null, earth: null, water: null },
        },
      },
    };
    expect(v1Event.version).toBe(1);
    expect(v1Event.type).toBe("wizard_character_updated");
  });

  it("9. V5 state with retired companionDescriptions on wizard is rejected", () => {
    const state = initialCampaignState();
    const bad = {
      ...state,
      players: [{ playerId: P1, name: "BadPlayer" }],
      wizards: [{
        wizardId: wizId(1),
        name: "BadWiz",
        portrayedByPlayerId: P1,
        homeIsleId: null,
        sanctumPlaceId: null,
        character: {
          elements: null,
          pactFragmentPersonalForm: null,
          familiarDescription: null,
          ageYears: null,
          publicChangesOfMagic: [],
          importantNotes: null,
          companionDescriptions: { air: null, fire: null, earth: null, water: null },
        },
      }],
      pactSeats: {
        ...state.pactSeats,
        necromancer: { status: "present" as const, wizardId: wizId(1), watcherPlayerId: null },
      },
    };
    expect(() => validateCampaignState(bad)).toThrow(/companionDescriptions/);
  });
});
