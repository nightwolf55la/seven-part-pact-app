import { describe, it, expect } from "vitest";
import {
  validateCampaignState,
  applyBeginPlay,
  advanceAllPlanets,
  DomainError,
  beginPlayFingerprint,
  MOVABLE_PLANET_IDS,
  PACT_SEAT_IDS,
  isLogicalStateCommandType,
  CAMPAIGN_COMMAND_TYPES,
  initialCampaignState,
  applyAddPlayer,
  applyCreateWizard,
  applySetCampaignAge,
  applySetFacilitator,
  applySetSetupMonth,
  applySetSetupOrreryPosition,
  applySetPactSeatWizard,
  applySetPactSeatStatus,
  applySetWatcher,
} from "../shared/domain";
import type {
  CurrentCampaignState,
  WizardInitIds,
  AllocationId,
  EngagementId,
  WizardId,
  PlayerId,
  MonthOrdinal,
  MovablePlanetId,
} from "../shared/domain";
import type { PactSeatId } from "../shared/domain/pact-seats";
import type { OrreryState } from "../shared/domain/orrery";

// --- ID helpers ---

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

// --- Awakening preset indices (from C1D) ---
const AWAKENING_INDICES: Record<MovablePlanetId, number> = {
  saturn: 16, jupiter: 1, mars: 18, venus: 14, mercury: 17,
};
const CALAMITY_INDICES: Record<MovablePlanetId, number> = {
  saturn: 31, jupiter: 33, mars: 21, venus: 4, mercury: 20,
};

function buildReadyState(
  ageId: "awakening" | "calamity",
  monthOrdinal: number,
  planetIndices: Record<MovablePlanetId, number>,
): CurrentCampaignState {
  let state = initialCampaignState();
  const players = [P1, P2, P3, P4, P5, P6, P7];
  for (let i = 0; i < players.length; i++) {
    state = applyAddPlayer(state, players[i], `Player ${i + 1}`).nextState;
  }
  state = applySetCampaignAge(state, ageId).nextState;
  state = applySetFacilitator(state, P1).nextState;
  state = applySetSetupMonth(state, monthOrdinal as MonthOrdinal).nextState;

  for (const planetId of MOVABLE_PLANET_IDS) {
    state = applySetSetupOrreryPosition(state, planetId, planetIndices[planetId]).nextState;
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
const SILENT_WIZARD_ID = wizId(7);

// ============================================================
// Pure Transition Tests
// ============================================================

describe("applyBeginPlay", () => {
  describe("Awakening -> Play/new_moon", () => {
    const setup = buildReadyState("awakening", 0, AWAKENING_INDICES);
    const inits = makeWizardInits(PRESENT_WIZARD_IDS);
    const result = applyBeginPlay(setup, { wizardInits: inits });
    const next = result.nextState;

    it("transitions lifecycle to play/new_moon", () => {
      expect(next.lifecycle.kind).toBe("play");
      if (next.lifecycle.kind !== "play") throw new Error("unreachable");
      expect(next.lifecycle.phase).toBe("new_moon");
    });

    it("advances calendar from March (0) to April (1)", () => {
      expect(setup.calendar.monthOrdinal).toBe(0);
      expect(next.calendar.monthOrdinal).toBe(1);
    });

    it("advances all five planets by exactly one arc", () => {
      if (next.lifecycle.kind !== "play") throw new Error("unreachable");
      if (setup.lifecycle.kind !== "setup") throw new Error("unreachable");
      const setupOrrery = setup.lifecycle.orrery as OrreryState;
      const expected = advanceAllPlanets(setupOrrery);
      for (const p of MOVABLE_PLANET_IDS) {
        expect(next.lifecycle.orrery[p]).toBe(expected[p]);
      }
    });

    it("preserves campaign-level state and wizardmootHistory", () => {
      expect(next.configuration).toEqual(setup.configuration);
      expect(next.players).toEqual(setup.players);
      expect(next.wizards).toEqual(setup.wizards);
      expect(next.pactSeats).toEqual(setup.pactSeats);
      expect(next.wizardmootHistory).toEqual(setup.wizardmootHistory);
      expect(next.schemaVersion).toBe(3);
      expect(next.ruleset).toEqual(setup.ruleset);
    });

    it("Present Wizards get monthly state", () => {
      if (next.lifecycle.kind !== "play") throw new Error("unreachable");
      const { timeParticipants, engagements } = next.lifecycle.currentMonth;
      expect(timeParticipants.length).toBe(PRESENT_WIZARD_IDS.length);
      expect(engagements.length).toBe(PRESENT_WIZARD_IDS.length);

      for (const wid of PRESENT_WIZARD_IDS) {
        expect(timeParticipants.find((t) => t.participant.wizardId === wid)).toBeDefined();
        expect(engagements.find((e) => e.actingWizardId === wid)).toBeDefined();
      }
    });

    it("Silent Wizard does not get monthly state", () => {
      if (next.lifecycle.kind !== "play") throw new Error("unreachable");
      const { timeParticipants, engagements } = next.lifecycle.currentMonth;
      expect(timeParticipants.find((t) => t.participant.wizardId === SILENT_WIZARD_ID)).toBeUndefined();
      expect(engagements.find((e) => e.actingWizardId === SILENT_WIZARD_ID)).toBeUndefined();
    });

    it("Time initialization: budget 4, allowance 1, used 0, all unscheduled pending", () => {
      if (next.lifecycle.kind !== "play") throw new Error("unreachable");
      for (const tp of next.lifecycle.currentMonth.timeParticipants) {
        expect(tp.effectiveBudget).toBe(4);
        expect(tp.rescheduleAllowance).toBe(1);
        expect(tp.reschedulesUsed).toBe(0);
        expect(tp.allocations.length).toBe(4);
        for (const alloc of tp.allocations) {
          expect(alloc.destination).toBeNull();
          expect(alloc.note).toBeNull();
          expect(alloc.resolution).toBe("pending");
        }
      }
    });

    it("Engagement: one per Present Wizard, null target, unlinked, pending", () => {
      if (next.lifecycle.kind !== "play") throw new Error("unreachable");
      for (const eng of next.lifecycle.currentMonth.engagements) {
        expect(PRESENT_WIZARD_IDS).toContain(eng.actingWizardId);
        expect(eng.target).toBeNull();
        expect(eng.linkedTimeAllocationId).toBeNull();
        expect(eng.resolution).toBe("pending");
      }
    });

    it("Wizardmoot attendance is null at new_moon", () => {
      if (next.lifecycle.kind !== "play") throw new Error("unreachable");
      expect(next.lifecycle.currentMonth.wizardmootAttendance).toBeNull();
    });

    it("resulting state passes validateCampaignState", () => {
      expect(() => validateCampaignState(next)).not.toThrow();
    });

    it("produces exactly one begin_play event with correct data", () => {
      expect(result.events.length).toBe(1);
      const evt = result.events[0];
      expect(evt.type).toBe("begin_play");
      expect(evt.version).toBe(1);
      if (evt.type !== "begin_play") throw new Error("unreachable");
      expect(evt.data.fromMonthOrdinal).toBe(0);
      expect(evt.data.toMonthOrdinal).toBe(1);
      expect(evt.data.eligibleWizardIds.length).toBe(PRESENT_WIZARD_IDS.length);
    });

    it("all allocation and engagement IDs are distinct", () => {
      if (next.lifecycle.kind !== "play") throw new Error("unreachable");
      const ids = new Set<string>();
      for (const tp of next.lifecycle.currentMonth.timeParticipants) {
        for (const alloc of tp.allocations) {
          expect(ids.has(alloc.allocationId)).toBe(false);
          ids.add(alloc.allocationId);
        }
      }
      for (const eng of next.lifecycle.currentMonth.engagements) {
        expect(ids.has(eng.engagementId)).toBe(false);
        ids.add(eng.engagementId);
      }
    });
  });

  describe("Calamity -> Play/new_moon", () => {
    const setup = buildReadyState("calamity", 9, CALAMITY_INDICES);
    const inits = makeWizardInits(PRESENT_WIZARD_IDS);
    const result = applyBeginPlay(setup, { wizardInits: inits });
    const next = result.nextState;

    it("advances calendar from December (9) to January (10)", () => {
      expect(setup.calendar.monthOrdinal).toBe(9);
      expect(next.calendar.monthOrdinal).toBe(10);
    });

    it("advances all five planets by exactly one arc", () => {
      if (next.lifecycle.kind !== "play") throw new Error("unreachable");
      if (setup.lifecycle.kind !== "setup") throw new Error("unreachable");
      const setupOrrery = setup.lifecycle.orrery as OrreryState;
      const expected = advanceAllPlanets(setupOrrery);
      for (const p of MOVABLE_PLANET_IDS) {
        expect(next.lifecycle.orrery[p]).toBe(expected[p]);
      }
    });

    it("resulting state passes validateCampaignState", () => {
      expect(() => validateCampaignState(next)).not.toThrow();
    });
  });

  // --- Rejection tests ---

  it("rejects non-Setup lifecycle", () => {
    const setup = buildReadyState("awakening", 0, AWAKENING_INDICES);
    const inits = makeWizardInits(PRESENT_WIZARD_IDS);
    const play = applyBeginPlay(setup, { wizardInits: inits }).nextState;
    expect(() => applyBeginPlay(play, { wizardInits: inits })).toThrow(DomainError);
  });

  it("rejects non-ready Setup (missing facilitator)", () => {
    const setup = buildReadyState("awakening", 0, AWAKENING_INDICES);
    const broken: CurrentCampaignState = {
      ...setup,
      configuration: { ...setup.configuration, facilitatorPlayerId: null },
    };
    const inits = makeWizardInits(PRESENT_WIZARD_IDS);
    expect(() => applyBeginPlay(broken, { wizardInits: inits })).toThrow(DomainError);
  });

  it("rejects mismatched wizard init count", () => {
    const setup = buildReadyState("awakening", 0, AWAKENING_INDICES);
    const inits = makeWizardInits(PRESENT_WIZARD_IDS.slice(0, 2));
    expect(() => applyBeginPlay(setup, { wizardInits: inits })).toThrow(DomainError);
  });

  it("rejects duplicate allocation IDs", () => {
    const setup = buildReadyState("awakening", 0, AWAKENING_INDICES);
    const inits = makeWizardInits(PRESENT_WIZARD_IDS);
    const bad: WizardInitIds[] = inits.map((init, i) => {
      if (i === 1) {
        return {
          ...init,
          allocationIds: [
            inits[0].allocationIds[0],
            init.allocationIds[1],
            init.allocationIds[2],
            init.allocationIds[3],
          ] as [AllocationId, AllocationId, AllocationId, AllocationId],
        };
      }
      return init;
    });
    expect(() => applyBeginPlay(setup, { wizardInits: bad })).toThrow(DomainError);
  });

  it("rejects duplicate wizard IDs in input", () => {
    const setup = buildReadyState("awakening", 0, AWAKENING_INDICES);
    const inits = makeWizardInits(PRESENT_WIZARD_IDS);
    const dup = [...inits, inits[0]];
    expect(() => applyBeginPlay(setup, { wizardInits: dup })).toThrow(DomainError);
  });
});

// ============================================================
// Command / Event / Fingerprint
// ============================================================

describe("begin_play command infrastructure", () => {
  it("begin_play is in CAMPAIGN_COMMAND_TYPES", () => {
    expect(CAMPAIGN_COMMAND_TYPES).toContain("begin_play");
  });

  it("begin_play is a logical state command type", () => {
    expect(isLogicalStateCommandType("begin_play")).toBe(true);
  });

  it("beginPlayFingerprint is deterministic", () => {
    expect(beginPlayFingerprint(5)).toBe(beginPlayFingerprint(5));
    expect(beginPlayFingerprint(5)).not.toBe(beginPlayFingerprint(6));
  });

  it("beginPlayFingerprint rejects invalid input", () => {
    expect(() => beginPlayFingerprint(-1)).toThrow();
    expect(() => beginPlayFingerprint(1.5)).toThrow();
  });

  it("event records eligible wizard IDs and excludes silent", () => {
    const setup = buildReadyState("awakening", 0, AWAKENING_INDICES);
    const inits = makeWizardInits(PRESENT_WIZARD_IDS);
    const result = applyBeginPlay(setup, { wizardInits: inits });
    const evt = result.events[0];
    if (evt.type !== "begin_play") throw new Error("unreachable");
    for (const wid of PRESENT_WIZARD_IDS) {
      expect(evt.data.eligibleWizardIds).toContain(wid);
    }
    expect(evt.data.eligibleWizardIds).not.toContain(SILENT_WIZARD_ID);
  });
});
