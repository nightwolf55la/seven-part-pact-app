import { describe, it, expect } from "vitest";
import {
  validateCampaignState,
  applyBeginPlay,
  applyAdvancePhase,
  applyScheduleTime,
  applySetEngagementTarget,
  computePhaseTransitionWarnings,
  DomainError,
  advancePhaseFingerprint,
  scheduleTimeFingerprint,
  setEngagementTargetFingerprint,
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
  TimeDestination,
  EngagementTarget,
  EngagementRecord,
  AdvancePhaseResult,
  TransitionResult,
  LunarPhase,
} from "../shared/domain";
import type { PactSeatId } from "../shared/domain/pact-seats";

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

const AWAKENING_INDICES: Record<MovablePlanetId, number> = {
  saturn: 16, jupiter: 1, mars: 18, venus: 14, mercury: 17,
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

// --- Build a Play state at new_moon ---

const MONTH = 12 as MonthOrdinal;

function buildPlayState(): CurrentCampaignState {
  const setup = buildReadyState("awakening", 11, AWAKENING_INDICES);
  const inits = makeWizardInits(PRESENT_WIZARD_IDS);
  return applyBeginPlay(setup, { wizardInits: inits }).nextState;
}

function forceAdvancePhase(
  state: CurrentCampaignState,
  input: { expectedMonthOrdinal: MonthOrdinal; expectedPhase: LunarPhase },
): TransitionResult {
  const r = applyAdvancePhase(state, input);
  if (r.outcome === "applied") return r;
  const ackKeys = r.warnings.map((w) => w.key);
  const r2 = applyAdvancePhase(state, { ...input, acknowledgedWarningKeys: ackKeys });
  if (r2.outcome === "applied") return r2;
  throw new Error("Unexpected warnings after acknowledgement");
}

function buildPlanningState(): CurrentCampaignState {
  const play = buildPlayState();
  const r1 = forceAdvancePhase(play, { expectedMonthOrdinal: MONTH, expectedPhase: "new_moon" });
  const r2 = forceAdvancePhase(r1.nextState, { expectedMonthOrdinal: MONTH, expectedPhase: "visions" });
  return r2.nextState;
}

function buildStoryState(): CurrentCampaignState {
  const planning = buildPlanningState();
  const r = forceAdvancePhase(planning, { expectedMonthOrdinal: MONTH, expectedPhase: "planning" });
  return r.nextState;
}

// --- Helpers to extract allocations and engagements ---

function getAlloc(state: CurrentCampaignState, allocationId: string) {
  if (state.lifecycle.kind !== "play") throw new Error("not play");
  for (const tp of state.lifecycle.currentMonth.timeParticipants) {
    const alloc = tp.allocations.find((a) => a.allocationId === allocationId);
    if (alloc) return { tp, alloc };
  }
  return null;
}

function getEngagement(state: CurrentCampaignState, engagementId: string) {
  if (state.lifecycle.kind !== "play") throw new Error("not play");
  return state.lifecycle.currentMonth.engagements.find((e) => e.engagementId === engagementId) ?? null;
}

function firstAllocId(state: CurrentCampaignState, wizardId: WizardId): AllocationId {
  if (state.lifecycle.kind !== "play") throw new Error("not play");
  const tp = state.lifecycle.currentMonth.timeParticipants.find((t) => t.participant.wizardId === wizardId);
  if (!tp) throw new Error(`no time participant for ${wizardId}`);
  return tp.allocations[0].allocationId;
}

function firstEngagementId(state: CurrentCampaignState, wizardId: WizardId): EngagementId {
  if (state.lifecycle.kind !== "play") throw new Error("not play");
  const eng = state.lifecycle.currentMonth.engagements.find((e) => e.actingWizardId === wizardId);
  if (!eng) throw new Error(`no engagement for ${wizardId}`);
  return eng.engagementId;
}

// ============================================================
// PHASE ADVANCEMENT TESTS
// ============================================================

describe("applyAdvancePhase", () => {
  it("new_moon -> visions", () => {
    const play = buildPlayState();
    const result = applyAdvancePhase(play, { expectedMonthOrdinal: MONTH, expectedPhase: "new_moon" });
    expect(result.outcome).toBe("applied");
    if (result.outcome !== "applied") throw new Error("unreachable");
    if (result.nextState.lifecycle.kind !== "play") throw new Error("unreachable");
    expect(result.nextState.lifecycle.phase).toBe("visions");
  });

  it("visions -> planning", () => {
    const play = buildPlayState();
    const r1 = applyAdvancePhase(play, { expectedMonthOrdinal: MONTH, expectedPhase: "new_moon" });
    if (r1.outcome !== "applied") throw new Error("unreachable");
    const r2 = applyAdvancePhase(r1.nextState, { expectedMonthOrdinal: MONTH, expectedPhase: "visions" });
    if (r2.outcome !== "applied") throw new Error("unreachable");
    if (r2.nextState.lifecycle.kind !== "play") throw new Error("unreachable");
    expect(r2.nextState.lifecycle.phase).toBe("planning");
  });

  it("planning -> story with acknowledgement", () => {
    const planning = buildPlanningState();
    const r1 = applyAdvancePhase(planning, { expectedMonthOrdinal: MONTH, expectedPhase: "planning" });
    expect(r1.outcome).toBe("warnings");
    if (r1.outcome !== "warnings") throw new Error("unreachable");
    const ackKeys = r1.warnings.map((w) => w.key);
    const r2 = applyAdvancePhase(planning, { expectedMonthOrdinal: MONTH, expectedPhase: "planning", acknowledgedWarningKeys: ackKeys });
    expect(r2.outcome).toBe("applied");
    if (r2.outcome !== "applied") throw new Error("unreachable");
    if (r2.nextState.lifecycle.kind !== "play") throw new Error("unreachable");
    expect(r2.nextState.lifecycle.phase).toBe("story");
  });

  it("story -> meeting returns warnings when unacknowledged", () => {
    const story = buildStoryState();
    const r = applyAdvancePhase(story, { expectedMonthOrdinal: MONTH, expectedPhase: "story" });
    expect(r.outcome).toBe("warnings");
  });

  it("stale month rejects", () => {
    const play = buildPlayState();
    expect(() => applyAdvancePhase(play, { expectedMonthOrdinal: 99 as MonthOrdinal, expectedPhase: "new_moon" })).toThrow(DomainError);
  });

  it("stale phase rejects", () => {
    const play = buildPlayState();
    expect(() => applyAdvancePhase(play, { expectedMonthOrdinal: MONTH, expectedPhase: "planning" })).toThrow(DomainError);
  });

  it("phase change preserves month, Orrery, and currentMonth exactly", () => {
    const planning = buildPlanningState();
    const result = forceAdvancePhase(planning, { expectedMonthOrdinal: MONTH, expectedPhase: "planning" });
    if (planning.lifecycle.kind !== "play" || result.nextState.lifecycle.kind !== "play") throw new Error("unreachable");
    expect(result.nextState.calendar.monthOrdinal).toBe(planning.calendar.monthOrdinal);
    expect(result.nextState.lifecycle.orrery).toEqual(planning.lifecycle.orrery);
    expect(result.nextState.lifecycle.currentMonth.timeParticipants).toEqual(planning.lifecycle.currentMonth.timeParticipants);
    expect(result.nextState.lifecycle.currentMonth.engagements).toEqual(planning.lifecycle.currentMonth.engagements);
  });

  it("produces phase_advanced V2 event", () => {
    const play = buildPlayState();
    const result = applyAdvancePhase(play, { expectedMonthOrdinal: MONTH, expectedPhase: "new_moon" });
    expect(result.outcome).toBe("applied");
    if (result.outcome !== "applied") throw new Error("unreachable");
    expect(result.events.length).toBe(1);
    const evt = result.events[0];
    expect(evt.type).toBe("phase_advanced");
    expect(evt.version).toBe(2);
    if (evt.type !== "phase_advanced") throw new Error("unreachable");
    expect(evt.data.fromPhase).toBe("new_moon");
    expect(evt.data.toPhase).toBe("visions");
    expect(evt.data.monthOrdinal).toBe(MONTH);
  });

  it("resulting state passes validateCampaignState", () => {
    const planning = buildPlanningState();
    const result = forceAdvancePhase(planning, { expectedMonthOrdinal: MONTH, expectedPhase: "planning" });
    expect(() => validateCampaignState(result.nextState)).not.toThrow();
  });
});

// ============================================================
// SCHEDULE TIME TESTS
// ============================================================

describe("applyScheduleTime", () => {
  it("schedules pending allocation in Planning", () => {
    const planning = buildPlanningState();
    const allocId = firstAllocId(planning, wizId(1));
    const dest: TimeDestination = { kind: "meeting" };
    const result = applyScheduleTime(planning, {
      expectedMonthOrdinal: MONTH,
      allocationId: allocId,
      destination: dest,
      note: "test note",
    });
    const found = getAlloc(result.nextState, allocId);
    expect(found).not.toBeNull();
    expect(found!.alloc.destination).toEqual(dest);
    expect(found!.alloc.note).toBe("test note");
  });

  it("clears allocation back to null", () => {
    const planning = buildPlanningState();
    const allocId = firstAllocId(planning, wizId(1));
    const r1 = applyScheduleTime(planning, {
      expectedMonthOrdinal: MONTH,
      allocationId: allocId,
      destination: { kind: "meeting" },
      note: null,
    });
    const r2 = applyScheduleTime(r1.nextState, {
      expectedMonthOrdinal: MONTH,
      allocationId: allocId,
      destination: null,
      note: null,
    });
    const found = getAlloc(r2.nextState, allocId);
    expect(found!.alloc.destination).toBeNull();
  });

  it("repeated edits do not consume reschedule allowance", () => {
    const planning = buildPlanningState();
    const allocId = firstAllocId(planning, wizId(1));
    let state = planning;
    for (let i = 0; i < 5; i++) {
      const r = applyScheduleTime(state, {
        expectedMonthOrdinal: MONTH,
        allocationId: allocId,
        destination: { kind: "meeting" },
        note: `edit ${i}`,
      });
      state = r.nextState;
    }
    if (state.lifecycle.kind !== "play") throw new Error("unreachable");
    const tp = state.lifecycle.currentMonth.timeParticipants.find((t) => t.participant.wizardId === wizId(1))!;
    expect(tp.reschedulesUsed).toBe(0);
  });

  it("Meeting and Orrery destinations can be scheduled normally", () => {
    const planning = buildPlanningState();
    const a1 = firstAllocId(planning, wizId(1));
    const r1 = applyScheduleTime(planning, {
      expectedMonthOrdinal: MONTH, allocationId: a1,
      destination: { kind: "meeting" }, note: null,
    });
    const a2 = firstAllocId(r1.nextState, wizId(2));
    const r2 = applyScheduleTime(r1.nextState, {
      expectedMonthOrdinal: MONTH, allocationId: a2,
      destination: { kind: "orrery" }, note: null,
    });
    expect(getAlloc(r2.nextState, a1)!.alloc.destination).toEqual({ kind: "meeting" });
    expect(getAlloc(r2.nextState, a2)!.alloc.destination).toEqual({ kind: "orrery" });
  });

  it("valid Special Use accepted", () => {
    const planning = buildPlanningState();
    const allocId = firstAllocId(planning, wizId(1));
    const result = applyScheduleTime(planning, {
      expectedMonthOrdinal: MONTH, allocationId: allocId,
      destination: { kind: "special_use", description: "scrying pool" }, note: null,
    });
    expect(getAlloc(result.nextState, allocId)!.alloc.destination).toEqual({
      kind: "special_use", description: "scrying pool",
    });
  });

  it("invalid Special Use rejected (empty description)", () => {
    const planning = buildPlanningState();
    const allocId = firstAllocId(planning, wizId(1));
    expect(() => applyScheduleTime(planning, {
      expectedMonthOrdinal: MONTH, allocationId: allocId,
      destination: { kind: "special_use", description: "  " }, note: null,
    })).toThrow(DomainError);
  });

  it("non-Planning scheduling rejects", () => {
    const play = buildPlayState();
    const allocId = firstAllocId(play, wizId(1));
    expect(() => applyScheduleTime(play, {
      expectedMonthOrdinal: MONTH, allocationId: allocId,
      destination: { kind: "meeting" }, note: null,
    })).toThrow(DomainError);
  });

  it("spent allocation rejects", () => {
    const planning = buildPlanningState();
    const allocId = firstAllocId(planning, wizId(1));
    if (planning.lifecycle.kind !== "play") throw new Error("unreachable");
    const spentState: CurrentCampaignState = {
      ...planning,
      lifecycle: {
        ...planning.lifecycle,
        currentMonth: {
          ...planning.lifecycle.currentMonth,
          timeParticipants: planning.lifecycle.currentMonth.timeParticipants.map((tp) =>
            tp.participant.wizardId === wizId(1)
              ? {
                  ...tp,
                  allocations: tp.allocations.map((a) =>
                    a.allocationId === allocId ? { ...a, resolution: "spent" as const } : a,
                  ),
                }
              : tp,
          ),
        },
      },
    };
    expect(() => applyScheduleTime(spentState, {
      expectedMonthOrdinal: MONTH, allocationId: allocId,
      destination: { kind: "meeting" }, note: null,
    })).toThrow(DomainError);
  });

  it("wasted allocation rejects", () => {
    const planning = buildPlanningState();
    const allocId = firstAllocId(planning, wizId(1));
    if (planning.lifecycle.kind !== "play") throw new Error("unreachable");
    const wastedState: CurrentCampaignState = {
      ...planning,
      lifecycle: {
        ...planning.lifecycle,
        currentMonth: {
          ...planning.lifecycle.currentMonth,
          timeParticipants: planning.lifecycle.currentMonth.timeParticipants.map((tp) =>
            tp.participant.wizardId === wizId(1)
              ? {
                  ...tp,
                  allocations: tp.allocations.map((a) =>
                    a.allocationId === allocId ? { ...a, resolution: "wasted" as const } : a,
                  ),
                }
              : tp,
          ),
        },
      },
    };
    expect(() => applyScheduleTime(wastedState, {
      expectedMonthOrdinal: MONTH, allocationId: allocId,
      destination: { kind: "meeting" }, note: null,
    })).toThrow(DomainError);
  });

  it("resulting state passes validateCampaignState", () => {
    const planning = buildPlanningState();
    const allocId = firstAllocId(planning, wizId(1));
    const result = applyScheduleTime(planning, {
      expectedMonthOrdinal: MONTH, allocationId: allocId,
      destination: { kind: "meeting" }, note: null,
    });
    expect(() => validateCampaignState(result.nextState)).not.toThrow();
  });
});

// ============================================================
// ENGAGEMENT LINK TESTS
// ============================================================

describe("applyScheduleTime engagement linking", () => {
  it("scheduling allocation to own Engagement creates both sides of link", () => {
    const planning = buildPlanningState();
    const w1 = wizId(1);
    const allocId = firstAllocId(planning, w1);
    const engId = firstEngagementId(planning, w1);
    const result = applyScheduleTime(planning, {
      expectedMonthOrdinal: MONTH, allocationId: allocId,
      destination: { kind: "engagement", engagementId: engId }, note: null,
    });
    const alloc = getAlloc(result.nextState, allocId);
    const eng = getEngagement(result.nextState, engId);
    expect(alloc!.alloc.destination).toEqual({ kind: "engagement", engagementId: engId });
    expect(eng!.linkedTimeAllocationId).toBe(allocId);
  });

  it("changing away from Engagement clears old link", () => {
    const planning = buildPlanningState();
    const w1 = wizId(1);
    const allocId = firstAllocId(planning, w1);
    const engId = firstEngagementId(planning, w1);
    const r1 = applyScheduleTime(planning, {
      expectedMonthOrdinal: MONTH, allocationId: allocId,
      destination: { kind: "engagement", engagementId: engId }, note: null,
    });
    const r2 = applyScheduleTime(r1.nextState, {
      expectedMonthOrdinal: MONTH, allocationId: allocId,
      destination: { kind: "meeting" }, note: null,
    });
    const eng = getEngagement(r2.nextState, engId);
    expect(eng!.linkedTimeAllocationId).toBeNull();
  });

  it("changing Engagement A -> B clears A and links B", () => {
    const planning = buildPlanningState();
    const w1 = wizId(1);
    const allocId = firstAllocId(planning, w1);
    const engA = firstEngagementId(planning, w1);

    // Add a second pending Engagement for the same acting Wizard
    const engBId = makeEngagementId(999);
    const engB: EngagementRecord = {
      engagementId: engBId,
      actingWizardId: w1,
      target: null,
      resolution: "pending",
      linkedTimeAllocationId: null,
    };
    if (planning.lifecycle.kind !== "play") throw new Error("unreachable");
    const planningWithB: CurrentCampaignState = {
      ...planning,
      lifecycle: {
        ...planning.lifecycle,
        currentMonth: {
          ...planning.lifecycle.currentMonth,
          engagements: [...planning.lifecycle.currentMonth.engagements, engB],
        },
      },
    };

    // 1. schedule the allocation to Engagement A
    const r1 = applyScheduleTime(planningWithB, {
      expectedMonthOrdinal: MONTH, allocationId: allocId,
      destination: { kind: "engagement", engagementId: engA }, note: null,
    });
    expect(getEngagement(r1.nextState, engA)!.linkedTimeAllocationId).toBe(allocId);
    expect(getEngagement(r1.nextState, engBId)!.linkedTimeAllocationId).toBeNull();

    // 2. reschedule the same allocation to Engagement B
    const r2 = applyScheduleTime(r1.nextState, {
      expectedMonthOrdinal: MONTH, allocationId: allocId,
      destination: { kind: "engagement", engagementId: engBId }, note: null,
    });

    // 3. A is unlinked
    expect(getEngagement(r2.nextState, engA)!.linkedTimeAllocationId).toBeNull();
    // 4. B is linked to this allocation
    expect(getEngagement(r2.nextState, engBId)!.linkedTimeAllocationId).toBe(allocId);
    // 5. allocation destination identifies B
    expect(getAlloc(r2.nextState, allocId)!.alloc.destination).toEqual({
      kind: "engagement", engagementId: engBId,
    });
    // 6. resulting state validates
    expect(() => validateCampaignState(r2.nextState)).not.toThrow();
  });

  it("different-Wizard Engagement rejects", () => {
    const planning = buildPlanningState();
    const w1 = wizId(1);
    const w2 = wizId(2);
    const allocId = firstAllocId(planning, w1);
    const eng2 = firstEngagementId(planning, w2);
    expect(() => applyScheduleTime(planning, {
      expectedMonthOrdinal: MONTH, allocationId: allocId,
      destination: { kind: "engagement", engagementId: eng2 }, note: null,
    })).toThrow(DomainError);
  });

  it("Engagement already linked to a different allocation rejects", () => {
    const planning = buildPlanningState();
    const w1 = wizId(1);
    const alloc1 = firstAllocId(planning, w1);
    const engId = firstEngagementId(planning, w1);

    // Link alloc1 to engId
    const r1 = applyScheduleTime(planning, {
      expectedMonthOrdinal: MONTH, allocationId: alloc1,
      destination: { kind: "engagement", engagementId: engId }, note: null,
    });

    // Now try to link a different allocation (alloc2) to the same engagement
    if (planning.lifecycle.kind !== "play") throw new Error("unreachable");
    const tp = r1.nextState.lifecycle.kind === "play"
      ? r1.nextState.lifecycle.currentMonth.timeParticipants.find((t) => t.participant.wizardId === w1)!
      : null;
    if (!tp) throw new Error("unreachable");
    const alloc2 = tp.allocations[1].allocationId;

    expect(() => applyScheduleTime(r1.nextState, {
      expectedMonthOrdinal: MONTH, allocationId: alloc2,
      destination: { kind: "engagement", engagementId: engId }, note: null,
    })).toThrow(DomainError);
  });

  it("empty-string note is accepted and preserved", () => {
    const planning = buildPlanningState();
    const allocId = firstAllocId(planning, wizId(1));
    const result = applyScheduleTime(planning, {
      expectedMonthOrdinal: MONTH, allocationId: allocId,
      destination: { kind: "meeting" }, note: "",
    });
    expect(getAlloc(result.nextState, allocId)!.alloc.note).toBe("");
  });

  it("resulting linked states pass validateCampaignState", () => {
    const planning = buildPlanningState();
    const w1 = wizId(1);
    const allocId = firstAllocId(planning, w1);
    const engId = firstEngagementId(planning, w1);
    const result = applyScheduleTime(planning, {
      expectedMonthOrdinal: MONTH, allocationId: allocId,
      destination: { kind: "engagement", engagementId: engId }, note: null,
    });
    expect(() => validateCampaignState(result.nextState)).not.toThrow();
  });
});

// ============================================================
// ENGAGEMENT TARGET TESTS
// ============================================================

describe("applySetEngagementTarget", () => {
  it("sets target to a modeled Wizard", () => {
    const planning = buildPlanningState();
    const engId = firstEngagementId(planning, wizId(1));
    const target: EngagementTarget = { kind: "wizard", wizardId: wizId(3) };
    const result = applySetEngagementTarget(planning, {
      expectedMonthOrdinal: MONTH, engagementId: engId, target,
    });
    const eng = getEngagement(result.nextState, engId);
    expect(eng!.target).toEqual(target);
  });

  it("sets target to self", () => {
    const planning = buildPlanningState();
    const engId = firstEngagementId(planning, wizId(1));
    const result = applySetEngagementTarget(planning, {
      expectedMonthOrdinal: MONTH, engagementId: engId,
      target: { kind: "self" },
    });
    expect(getEngagement(result.nextState, engId)!.target).toEqual({ kind: "self" });
  });

  it("sets target to familiar", () => {
    const planning = buildPlanningState();
    const engId = firstEngagementId(planning, wizId(1));
    const result = applySetEngagementTarget(planning, {
      expectedMonthOrdinal: MONTH, engagementId: engId,
      target: { kind: "familiar" },
    });
    expect(getEngagement(result.nextState, engId)!.target).toEqual({ kind: "familiar" });
  });

  it("sets target to named character", () => {
    const planning = buildPlanningState();
    const engId = firstEngagementId(planning, wizId(1));
    const result = applySetEngagementTarget(planning, {
      expectedMonthOrdinal: MONTH, engagementId: engId,
      target: { kind: "named_character", name: "Old Gerda" },
    });
    expect(getEngagement(result.nextState, engId)!.target).toEqual({
      kind: "named_character", name: "Old Gerda",
    });
  });

  it("clears target to null", () => {
    const planning = buildPlanningState();
    const engId = firstEngagementId(planning, wizId(1));
    const r1 = applySetEngagementTarget(planning, {
      expectedMonthOrdinal: MONTH, engagementId: engId,
      target: { kind: "self" },
    });
    const r2 = applySetEngagementTarget(r1.nextState, {
      expectedMonthOrdinal: MONTH, engagementId: engId,
      target: null,
    });
    expect(getEngagement(r2.nextState, engId)!.target).toBeNull();
  });

  it("empty named character rejects", () => {
    const planning = buildPlanningState();
    const engId = firstEngagementId(planning, wizId(1));
    expect(() => applySetEngagementTarget(planning, {
      expectedMonthOrdinal: MONTH, engagementId: engId,
      target: { kind: "named_character", name: "  " },
    })).toThrow(DomainError);
  });

  it("non-Planning target edit rejects", () => {
    const play = buildPlayState();
    const engId = firstEngagementId(play, wizId(1));
    expect(() => applySetEngagementTarget(play, {
      expectedMonthOrdinal: MONTH, engagementId: engId,
      target: { kind: "self" },
    })).toThrow(DomainError);
  });

  it("target edits do not alter Time linkage or reschedule counters", () => {
    const planning = buildPlanningState();
    const w1 = wizId(1);
    const allocId = firstAllocId(planning, w1);
    const engId = firstEngagementId(planning, w1);

    // Link allocation to engagement
    const r1 = applyScheduleTime(planning, {
      expectedMonthOrdinal: MONTH, allocationId: allocId,
      destination: { kind: "engagement", engagementId: engId }, note: null,
    });

    // Set target on the engagement
    const r2 = applySetEngagementTarget(r1.nextState, {
      expectedMonthOrdinal: MONTH, engagementId: engId,
      target: { kind: "self" },
    });

    // Linkage should be preserved
    expect(getEngagement(r2.nextState, engId)!.linkedTimeAllocationId).toBe(allocId);
    expect(getAlloc(r2.nextState, allocId)!.alloc.destination).toEqual({
      kind: "engagement", engagementId: engId,
    });

    // Reschedule counters should be unchanged
    if (r2.nextState.lifecycle.kind !== "play") throw new Error("unreachable");
    const tp = r2.nextState.lifecycle.currentMonth.timeParticipants.find((t) => t.participant.wizardId === w1)!;
    expect(tp.reschedulesUsed).toBe(0);
  });

  it("resulting state passes validateCampaignState", () => {
    const planning = buildPlanningState();
    const engId = firstEngagementId(planning, wizId(1));
    const result = applySetEngagementTarget(planning, {
      expectedMonthOrdinal: MONTH, engagementId: engId,
      target: { kind: "self" },
    });
    expect(() => validateCampaignState(result.nextState)).not.toThrow();
  });
});

// ============================================================
// INFRASTRUCTURE TESTS
// ============================================================

describe("C3 infrastructure", () => {
  it("advance_phase is a registered logical state command", () => {
    expect(CAMPAIGN_COMMAND_TYPES).toContain("advance_phase");
    expect(isLogicalStateCommandType("advance_phase")).toBe(true);
  });

  it("schedule_time is a registered logical state command", () => {
    expect(CAMPAIGN_COMMAND_TYPES).toContain("schedule_time");
    expect(isLogicalStateCommandType("schedule_time")).toBe(true);
  });

  it("set_engagement_target is a registered logical state command", () => {
    expect(CAMPAIGN_COMMAND_TYPES).toContain("set_engagement_target");
    expect(isLogicalStateCommandType("set_engagement_target")).toBe(true);
  });

  it("advancePhaseFingerprint differs when month differs", () => {
    const a = advancePhaseFingerprint(1, "new_moon");
    const b = advancePhaseFingerprint(2, "new_moon");
    expect(a).not.toBe(b);
  });

  it("advancePhaseFingerprint differs when phase differs", () => {
    const a = advancePhaseFingerprint(1, "new_moon");
    const b = advancePhaseFingerprint(1, "visions");
    expect(a).not.toBe(b);
  });

  it("scheduleTimeFingerprint differs when destination differs", () => {
    const a = scheduleTimeFingerprint(1, "alc_123", { kind: "meeting" }, null);
    const b = scheduleTimeFingerprint(1, "alc_123", { kind: "orrery" }, null);
    expect(a).not.toBe(b);
  });

  it("scheduleTimeFingerprint differs when allocationId differs", () => {
    const a = scheduleTimeFingerprint(1, "alc_123", { kind: "meeting" }, null);
    const b = scheduleTimeFingerprint(1, "alc_456", { kind: "meeting" }, null);
    expect(a).not.toBe(b);
  });

  it("scheduleTimeFingerprint differs when note differs", () => {
    const a = scheduleTimeFingerprint(1, "alc_123", { kind: "meeting" }, null);
    const b = scheduleTimeFingerprint(1, "alc_123", { kind: "meeting" }, "hello");
    expect(a).not.toBe(b);
  });

  it("setEngagementTargetFingerprint differs when target differs", () => {
    const a = setEngagementTargetFingerprint(1, "eng_1", { kind: "self" });
    const b = setEngagementTargetFingerprint(1, "eng_1", { kind: "familiar" });
    expect(a).not.toBe(b);
  });

  it("setEngagementTargetFingerprint differs when engagementId differs", () => {
    const a = setEngagementTargetFingerprint(1, "eng_1", null);
    const b = setEngagementTargetFingerprint(1, "eng_2", null);
    expect(a).not.toBe(b);
  });
});
