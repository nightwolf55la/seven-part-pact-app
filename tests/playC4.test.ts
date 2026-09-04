import { describe, it, expect } from "vitest";
import {
  validateCampaignState,
  applyBeginPlay,
  applyAdvancePhase,
  applyScheduleTime,
  applyRescheduleTime,
  applySpendManualTime,
  applyWasteTime,
  applySpendOrreryTime,
  applyCommitTimeToEngagement,
  applyResolveEngagement,
  applyRescheduleEngagement,
  DomainError,
  rescheduleTimeFingerprint,
  spendManualTimeFingerprint,
  wasteTimeFingerprint,
  spendOrreryTimeFingerprint,
  commitTimeToEngagementFingerprint,
  resolveEngagementFingerprint,
  rescheduleEngagementFingerprint,
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
  movePlanetByArc,
  isLegalPosition,
  asCentidegreePosition,
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
  OrreryMoveDirection,
  CentidegreePosition,
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

const MONTH = 1 as MonthOrdinal;

function buildPlayState(): CurrentCampaignState {
  const setup = buildReadyState("awakening", 0, AWAKENING_INDICES);
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

// --- Helpers ---

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

function getReschedulesUsed(state: CurrentCampaignState, wizardId: WizardId): number {
  if (state.lifecycle.kind !== "play") throw new Error("not play");
  const tp = state.lifecycle.currentMonth.timeParticipants.find((t) => t.participant.wizardId === wizardId);
  if (!tp) throw new Error(`no time participant for ${wizardId}`);
  return tp.reschedulesUsed;
}

// ============================================================
// SPEND MANUAL TIME
// ============================================================

describe("applySpendManualTime", () => {
  it("spends a companion allocation during Story", () => {
    const story = buildStoryState();
    const allocId = firstAllocId(story, wizId(1));
    // Schedule in Planning first
    const planning = buildPlanningState();
    const scheduled = applyScheduleTime(planning, {
      expectedMonthOrdinal: MONTH, allocationId: allocId,
      destination: { kind: "companion", element: "fire" }, note: null,
    });
    const storyFromScheduled = forceAdvancePhase(scheduled.nextState, { expectedMonthOrdinal: MONTH, expectedPhase: "planning" }).nextState;

    const result = applySpendManualTime(storyFromScheduled, {
      expectedMonthOrdinal: MONTH, allocationId: allocId,
    });
    const found = getAlloc(result.nextState, allocId);
    expect(found!.alloc.resolution).toBe("spent");
    expect(result.events[0].type).toBe("time_spent");
    expect(() => validateCampaignState(result.nextState)).not.toThrow();
  });

  it("rejects spending a meeting allocation", () => {
    const planning = buildPlanningState();
    const allocId = firstAllocId(planning, wizId(1));
    const scheduled = applyScheduleTime(planning, {
      expectedMonthOrdinal: MONTH, allocationId: allocId,
      destination: { kind: "meeting" }, note: null,
    });
    const story = forceAdvancePhase(scheduled.nextState, { expectedMonthOrdinal: MONTH, expectedPhase: "planning" }).nextState;

    expect(() => applySpendManualTime(story, {
      expectedMonthOrdinal: MONTH, allocationId: allocId,
    })).toThrow(DomainError);
  });

  it("rejects spending an orrery allocation", () => {
    const planning = buildPlanningState();
    const allocId = firstAllocId(planning, wizId(1));
    const scheduled = applyScheduleTime(planning, {
      expectedMonthOrdinal: MONTH, allocationId: allocId,
      destination: { kind: "orrery" }, note: null,
    });
    const story = forceAdvancePhase(scheduled.nextState, { expectedMonthOrdinal: MONTH, expectedPhase: "planning" }).nextState;

    expect(() => applySpendManualTime(story, {
      expectedMonthOrdinal: MONTH, allocationId: allocId,
    })).toThrow(DomainError);
  });

  it("rejects spending an engagement allocation", () => {
    const planning = buildPlanningState();
    const allocId = firstAllocId(planning, wizId(1));
    const engId = firstEngagementId(planning, wizId(1));
    const scheduled = applyScheduleTime(planning, {
      expectedMonthOrdinal: MONTH, allocationId: allocId,
      destination: { kind: "engagement", engagementId: engId }, note: null,
    });
    const story = forceAdvancePhase(scheduled.nextState, { expectedMonthOrdinal: MONTH, expectedPhase: "planning" }).nextState;

    expect(() => applySpendManualTime(story, {
      expectedMonthOrdinal: MONTH, allocationId: allocId,
    })).toThrow(DomainError);
  });

  it("rejects during Planning phase", () => {
    const planning = buildPlanningState();
    const allocId = firstAllocId(planning, wizId(1));
    expect(() => applySpendManualTime(planning, {
      expectedMonthOrdinal: MONTH, allocationId: allocId,
    })).toThrow(DomainError);
  });
});

// ============================================================
// WASTE TIME
// ============================================================

describe("applyWasteTime", () => {
  it("wastes a pending allocation and preserves destination and note", () => {
    const planning = buildPlanningState();
    const allocId = firstAllocId(planning, wizId(1));
    const scheduled = applyScheduleTime(planning, {
      expectedMonthOrdinal: MONTH, allocationId: allocId,
      destination: { kind: "domain" }, note: "preserve me",
    });
    const story = forceAdvancePhase(scheduled.nextState, { expectedMonthOrdinal: MONTH, expectedPhase: "planning" }).nextState;

    const result = applyWasteTime(story, {
      expectedMonthOrdinal: MONTH, allocationId: allocId,
    });
    const found = getAlloc(result.nextState, allocId);
    expect(found!.alloc.resolution).toBe("wasted");
    expect(found!.alloc.destination).toEqual({ kind: "domain" });
    expect(found!.alloc.note).toBe("preserve me");
    expect(result.events[0].type).toBe("time_wasted");
  });

  it("rejects wasting a meeting allocation during Story", () => {
    const planning = buildPlanningState();
    const allocId = firstAllocId(planning, wizId(1));
    const scheduled = applyScheduleTime(planning, {
      expectedMonthOrdinal: MONTH, allocationId: allocId,
      destination: { kind: "meeting" }, note: null,
    });
    const story = forceAdvancePhase(scheduled.nextState, { expectedMonthOrdinal: MONTH, expectedPhase: "planning" }).nextState;

    expect(() => applyWasteTime(story, {
      expectedMonthOrdinal: MONTH, allocationId: allocId,
    })).toThrow(DomainError);
  });

  it("rejects during Planning phase", () => {
    const planning = buildPlanningState();
    const allocId = firstAllocId(planning, wizId(1));
    expect(() => applyWasteTime(planning, {
      expectedMonthOrdinal: MONTH, allocationId: allocId,
    })).toThrow(DomainError);
  });
});

// ============================================================
// RESCHEDULE TIME (Story)
// ============================================================

describe("applyRescheduleTime", () => {
  it("consumes exactly one reschedule allowance", () => {
    const planning = buildPlanningState();
    const allocId = firstAllocId(planning, wizId(1));
    const scheduled = applyScheduleTime(planning, {
      expectedMonthOrdinal: MONTH, allocationId: allocId,
      destination: { kind: "meeting" }, note: null,
    });
    const story = forceAdvancePhase(scheduled.nextState, { expectedMonthOrdinal: MONTH, expectedPhase: "planning" }).nextState;

    expect(getReschedulesUsed(story, wizId(1))).toBe(0);

    const result = applyRescheduleTime(story, {
      expectedMonthOrdinal: MONTH, allocationId: allocId,
      destination: { kind: "domain" }, note: "switched",
    });

    expect(getReschedulesUsed(result.nextState, wizId(1))).toBe(1);
    expect(result.events[0].type).toBe("time_rescheduled");
    expect(() => validateCampaignState(result.nextState)).not.toThrow();
  });

  it("exhausted allowance rejects", () => {
    const planning = buildPlanningState();
    const allocId = firstAllocId(planning, wizId(1));
    const scheduled = applyScheduleTime(planning, {
      expectedMonthOrdinal: MONTH, allocationId: allocId,
      destination: { kind: "meeting" }, note: null,
    });
    const story = forceAdvancePhase(scheduled.nextState, { expectedMonthOrdinal: MONTH, expectedPhase: "planning" }).nextState;

    // Use the one allowance
    const r1 = applyRescheduleTime(story, {
      expectedMonthOrdinal: MONTH, allocationId: allocId,
      destination: { kind: "domain" }, note: null,
    });

    // Second reschedule should fail (allowance is 1)
    expect(() => applyRescheduleTime(r1.nextState, {
      expectedMonthOrdinal: MONTH, allocationId: allocId,
      destination: { kind: "familiar" }, note: null,
    })).toThrow(DomainError);
  });

  it("engagement link movement remains coherent during Story reschedule", () => {
    const planning = buildPlanningState();
    const allocId = firstAllocId(planning, wizId(1));
    const engId = firstEngagementId(planning, wizId(1));

    // Link to engagement in Planning
    const scheduled = applyScheduleTime(planning, {
      expectedMonthOrdinal: MONTH, allocationId: allocId,
      destination: { kind: "engagement", engagementId: engId }, note: null,
    });
    expect(getEngagement(scheduled.nextState, engId)!.linkedTimeAllocationId).toBe(allocId);

    const story = forceAdvancePhase(scheduled.nextState, { expectedMonthOrdinal: MONTH, expectedPhase: "planning" }).nextState;

    // Reschedule away from engagement to domain
    const result = applyRescheduleTime(story, {
      expectedMonthOrdinal: MONTH, allocationId: allocId,
      destination: { kind: "domain" }, note: null,
    });

    expect(getEngagement(result.nextState, engId)!.linkedTimeAllocationId).toBeNull();
    const found = getAlloc(result.nextState, allocId);
    expect(found!.alloc.destination).toEqual({ kind: "domain" });
    expect(() => validateCampaignState(result.nextState)).not.toThrow();
  });

  it("rejects during Planning phase", () => {
    const planning = buildPlanningState();
    const allocId = firstAllocId(planning, wizId(1));
    expect(() => applyRescheduleTime(planning, {
      expectedMonthOrdinal: MONTH, allocationId: allocId,
      destination: { kind: "domain" }, note: null,
    })).toThrow(DomainError);
  });

  it("stale month rejects", () => {
    const story = buildStoryState();
    const allocId = firstAllocId(story, wizId(1));
    expect(() => applyRescheduleTime(story, {
      expectedMonthOrdinal: 99 as MonthOrdinal, allocationId: allocId,
      destination: { kind: "domain" }, note: null,
    })).toThrow(DomainError);
  });
});

// ============================================================
// SPEND ORRERY TIME
// ============================================================

describe("applySpendOrreryTime", () => {
  it("moves exactly one Arc and spends Time atomically", () => {
    const planning = buildPlanningState();
    const allocId = firstAllocId(planning, wizId(1));
    const scheduled = applyScheduleTime(planning, {
      expectedMonthOrdinal: MONTH, allocationId: allocId,
      destination: { kind: "orrery" }, note: null,
    });
    const story = forceAdvancePhase(scheduled.nextState, { expectedMonthOrdinal: MONTH, expectedPhase: "planning" }).nextState;

    if (story.lifecycle.kind !== "play") throw new Error("unreachable");
    const planetId: MovablePlanetId = "saturn";
    const direction: OrreryMoveDirection = "forward";
    const currentPos = story.lifecycle.orrery[planetId];
    const expectedNewPos = movePlanetByArc(planetId, currentPos, direction);

    const result = applySpendOrreryTime(story, {
      expectedMonthOrdinal: MONTH, allocationId: allocId,
      planetId, direction,
    });

    if (result.nextState.lifecycle.kind !== "play") throw new Error("unreachable");
    expect(result.nextState.lifecycle.orrery[planetId]).toBe(expectedNewPos);
    const found = getAlloc(result.nextState, allocId);
    expect(found!.alloc.resolution).toBe("spent");
    expect(result.events[0].type).toBe("orrery_time_spent");
    expect(() => validateCampaignState(result.nextState)).not.toThrow();
  });

  it("off-grid position does not snap to grid", () => {
    const planning = buildPlanningState();
    const allocId = firstAllocId(planning, wizId(1));
    const scheduled = applyScheduleTime(planning, {
      expectedMonthOrdinal: MONTH, allocationId: allocId,
      destination: { kind: "orrery" }, note: null,
    });
    const story = forceAdvancePhase(scheduled.nextState, { expectedMonthOrdinal: MONTH, expectedPhase: "planning" }).nextState;

    if (story.lifecycle.kind !== "play") throw new Error("unreachable");
    const planetId: MovablePlanetId = "saturn";
    const direction: OrreryMoveDirection = "backward";

    // Inject a valid but clearly off-grid authoritative Saturn Arc-start.
    // Saturn's legal grid positions are 500, 1500, 2500, ... (offset 500, stride 1000).
    // 17623 is a valid centidegree integer in [0, 36000) but is NOT on that grid.
    const offGridStart: CentidegreePosition = asCentidegreePosition(17623);
    expect(isLegalPosition(planetId, offGridStart)).toBe(false);

    const storyWithOffGrid: CurrentCampaignState = {
      ...story,
      lifecycle: {
        ...story.lifecycle,
        orrery: {
          ...story.lifecycle.orrery,
          [planetId]: offGridStart,
        },
      },
    };

    const expectedNewPos = movePlanetByArc(planetId, offGridStart, direction);

    const result = applySpendOrreryTime(storyWithOffGrid, {
      expectedMonthOrdinal: MONTH, allocationId: allocId,
      planetId, direction,
    });

    if (result.nextState.lifecycle.kind !== "play") throw new Error("unreachable");
    const newPos = result.nextState.lifecycle.orrery[planetId];
    expect(newPos).toBe(expectedNewPos);
    expect(isLegalPosition(planetId, newPos)).toBe(false);

    const found = getAlloc(result.nextState, allocId);
    expect(found!.alloc.resolution).toBe("spent");
    expect(() => validateCampaignState(result.nextState)).not.toThrow();
  });

  it("rejects non-orrery allocation", () => {
    const planning = buildPlanningState();
    const allocId = firstAllocId(planning, wizId(1));
    const scheduled = applyScheduleTime(planning, {
      expectedMonthOrdinal: MONTH, allocationId: allocId,
      destination: { kind: "domain" }, note: null,
    });
    const story = forceAdvancePhase(scheduled.nextState, { expectedMonthOrdinal: MONTH, expectedPhase: "planning" }).nextState;

    expect(() => applySpendOrreryTime(story, {
      expectedMonthOrdinal: MONTH, allocationId: allocId,
      planetId: "saturn", direction: "forward",
    })).toThrow(DomainError);
  });

  it("rejects during Planning phase", () => {
    const planning = buildPlanningState();
    const allocId = firstAllocId(planning, wizId(1));
    expect(() => applySpendOrreryTime(planning, {
      expectedMonthOrdinal: MONTH, allocationId: allocId,
      planetId: "saturn", direction: "forward",
    })).toThrow(DomainError);
  });
});

// ============================================================
// COMMIT TIME TO ENGAGEMENT (Story)
// ============================================================

describe("applyCommitTimeToEngagement", () => {
  it("commits allocation to engagement consuming one reschedule", () => {
    const planning = buildPlanningState();
    const allocId = firstAllocId(planning, wizId(1));
    const engId = firstEngagementId(planning, wizId(1));

    // Leave allocation unscheduled in Planning, go to Story
    const story = buildStoryState();

    expect(getReschedulesUsed(story, wizId(1))).toBe(0);

    const result = applyCommitTimeToEngagement(story, {
      expectedMonthOrdinal: MONTH, allocationId: allocId, engagementId: engId,
    });

    expect(getReschedulesUsed(result.nextState, wizId(1))).toBe(1);
    expect(getEngagement(result.nextState, engId)!.linkedTimeAllocationId).toBe(allocId);
    const found = getAlloc(result.nextState, allocId);
    expect(found!.alloc.destination).toEqual({ kind: "engagement", engagementId: engId });
    expect(result.events[0].type).toBe("engagement_time_committed");
    expect(() => validateCampaignState(result.nextState)).not.toThrow();
  });

  it("exhausted allowance rejects with zero writes", () => {
    const planning = buildPlanningState();
    const allocId = firstAllocId(planning, wizId(1));
    const allocId2 = makeAllocationId(2);
    const engId = firstEngagementId(planning, wizId(1));

    // Use the reschedule allowance via rescheduleTime first
    const scheduled = applyScheduleTime(planning, {
      expectedMonthOrdinal: MONTH, allocationId: allocId,
      destination: { kind: "meeting" }, note: null,
    });
    const story = forceAdvancePhase(scheduled.nextState, { expectedMonthOrdinal: MONTH, expectedPhase: "planning" }).nextState;

    // Consume the one allowance
    const r1 = applyRescheduleTime(story, {
      expectedMonthOrdinal: MONTH, allocationId: allocId,
      destination: { kind: "domain" }, note: null,
    });

    // Now commit should fail (allowance exhausted)
    expect(() => applyCommitTimeToEngagement(r1.nextState, {
      expectedMonthOrdinal: MONTH, allocationId: allocId2, engagementId: engId,
    })).toThrow(DomainError);
  });

  it("rejects during Planning phase", () => {
    const planning = buildPlanningState();
    const allocId = firstAllocId(planning, wizId(1));
    const engId = firstEngagementId(planning, wizId(1));
    expect(() => applyCommitTimeToEngagement(planning, {
      expectedMonthOrdinal: MONTH, allocationId: allocId, engagementId: engId,
    })).toThrow(DomainError);
  });

  it("rejects distinct re-commit of an already-coherent link without consuming allowance", () => {
    const planning = buildPlanningState();
    const allocId = firstAllocId(planning, wizId(1));
    const engId = firstEngagementId(planning, wizId(1));

    // Link allocation A to engagement E during Planning via scheduleTime
    const scheduled = applyScheduleTime(planning, {
      expectedMonthOrdinal: MONTH, allocationId: allocId,
      destination: { kind: "engagement", engagementId: engId }, note: null,
    });
    expect(getEngagement(scheduled.nextState, engId)!.linkedTimeAllocationId).toBe(allocId);

    // Advance to Story
    const story = forceAdvancePhase(scheduled.nextState, { expectedMonthOrdinal: MONTH, expectedPhase: "planning" }).nextState;

    expect(getReschedulesUsed(story, wizId(1))).toBe(0);

    // A distinct commitTimeToEngagement request for the same A/E pair must fail
    expect(() => applyCommitTimeToEngagement(story, {
      expectedMonthOrdinal: MONTH, allocationId: allocId, engagementId: engId,
    })).toThrow(DomainError);

    // State remains unchanged: allowance not consumed, link still coherent
    expect(getReschedulesUsed(story, wizId(1))).toBe(0);
    expect(getEngagement(story, engId)!.linkedTimeAllocationId).toBe(allocId);
    const found = getAlloc(story, allocId);
    expect(found!.alloc.destination).toEqual({ kind: "engagement", engagementId: engId });
  });
});

// ============================================================
// RESOLVE ENGAGEMENT
// ============================================================

describe("applyResolveEngagement", () => {
  it("linked resolution spends Time atomically", () => {
    const planning = buildPlanningState();
    const allocId = firstAllocId(planning, wizId(1));
    const engId = firstEngagementId(planning, wizId(1));

    // Link in Planning
    const scheduled = applyScheduleTime(planning, {
      expectedMonthOrdinal: MONTH, allocationId: allocId,
      destination: { kind: "engagement", engagementId: engId }, note: null,
    });
    const story = forceAdvancePhase(scheduled.nextState, { expectedMonthOrdinal: MONTH, expectedPhase: "planning" }).nextState;

    const result = applyResolveEngagement(story, {
      expectedMonthOrdinal: MONTH, engagementId: engId,
    });

    expect(getEngagement(result.nextState, engId)!.resolution).toBe("resolved");
    const found = getAlloc(result.nextState, allocId);
    expect(found!.alloc.resolution).toBe("spent");
    expect(result.events[0].type).toBe("engagement_resolved");
    expect(() => validateCampaignState(result.nextState)).not.toThrow();
  });

  it("unlinked resolution changes only engagement resolution", () => {
    const story = buildStoryState();
    const engId = firstEngagementId(story, wizId(1));

    expect(getEngagement(story, engId)!.linkedTimeAllocationId).toBeNull();

    const result = applyResolveEngagement(story, {
      expectedMonthOrdinal: MONTH, engagementId: engId,
    });

    expect(getEngagement(result.nextState, engId)!.resolution).toBe("resolved");
    // No allocation should have changed
    expect(result.events[0].type).toBe("engagement_resolved");
    expect(() => validateCampaignState(result.nextState)).not.toThrow();
  });

  it("rejects during Planning phase", () => {
    const planning = buildPlanningState();
    const engId = firstEngagementId(planning, wizId(1));
    expect(() => applyResolveEngagement(planning, {
      expectedMonthOrdinal: MONTH, engagementId: engId,
    })).toThrow(DomainError);
  });

  it("rejects already resolved engagement", () => {
    const story = buildStoryState();
    const engId = firstEngagementId(story, wizId(1));

    const r1 = applyResolveEngagement(story, {
      expectedMonthOrdinal: MONTH, engagementId: engId,
    });

    expect(() => applyResolveEngagement(r1.nextState, {
      expectedMonthOrdinal: MONTH, engagementId: engId,
    })).toThrow(DomainError);
  });
});

// ============================================================
// RESCHEDULE ENGAGEMENT (Story)
// ============================================================

describe("applyRescheduleEngagement", () => {
  it("changes target consuming no Time allowance and preserves link", () => {
    const planning = buildPlanningState();
    const allocId = firstAllocId(planning, wizId(1));
    const engId = firstEngagementId(planning, wizId(1));

    // Link in Planning
    const scheduled = applyScheduleTime(planning, {
      expectedMonthOrdinal: MONTH, allocationId: allocId,
      destination: { kind: "engagement", engagementId: engId }, note: null,
    });
    const story = forceAdvancePhase(scheduled.nextState, { expectedMonthOrdinal: MONTH, expectedPhase: "planning" }).nextState;

    expect(getReschedulesUsed(story, wizId(1))).toBe(0);

    const target: EngagementTarget = { kind: "self" };
    const result = applyRescheduleEngagement(story, {
      expectedMonthOrdinal: MONTH, engagementId: engId, target,
    });

    expect(getReschedulesUsed(result.nextState, wizId(1))).toBe(0);
    expect(getEngagement(result.nextState, engId)!.target).toEqual(target);
    // Link preserved
    expect(getEngagement(result.nextState, engId)!.linkedTimeAllocationId).toBe(allocId);
    expect(result.events[0].type).toBe("engagement_rescheduled");
    expect(() => validateCampaignState(result.nextState)).not.toThrow();
  });

  it("rejects during Planning phase", () => {
    const planning = buildPlanningState();
    const engId = firstEngagementId(planning, wizId(1));
    expect(() => applyRescheduleEngagement(planning, {
      expectedMonthOrdinal: MONTH, engagementId: engId,
      target: { kind: "self" },
    })).toThrow(DomainError);
  });
});

// ============================================================
// FINGERPRINTS
// ============================================================

describe("C4 fingerprints distinguish material intents", () => {
  it("rescheduleTime fingerprints differ by destination", () => {
    const fp1 = rescheduleTimeFingerprint(MONTH, "alc_1", { kind: "domain" }, null);
    const fp2 = rescheduleTimeFingerprint(MONTH, "alc_1", { kind: "familiar" }, null);
    expect(fp1).not.toBe(fp2);
  });

  it("spendManualTime fingerprints differ by allocationId", () => {
    const fp1 = spendManualTimeFingerprint(MONTH, "alc_1");
    const fp2 = spendManualTimeFingerprint(MONTH, "alc_2");
    expect(fp1).not.toBe(fp2);
  });

  it("wasteTime fingerprints differ by allocationId", () => {
    const fp1 = wasteTimeFingerprint(MONTH, "alc_1");
    const fp2 = wasteTimeFingerprint(MONTH, "alc_2");
    expect(fp1).not.toBe(fp2);
  });

  it("spendOrreryTime fingerprints differ by planet and direction", () => {
    const fp1 = spendOrreryTimeFingerprint(MONTH, "alc_1", "saturn", "forward");
    const fp2 = spendOrreryTimeFingerprint(MONTH, "alc_1", "saturn", "backward");
    const fp3 = spendOrreryTimeFingerprint(MONTH, "alc_1", "jupiter", "forward");
    expect(fp1).not.toBe(fp2);
    expect(fp1).not.toBe(fp3);
  });

  it("commitTimeToEngagement fingerprints differ by engagementId", () => {
    const fp1 = commitTimeToEngagementFingerprint(MONTH, "alc_1", "eng_1");
    const fp2 = commitTimeToEngagementFingerprint(MONTH, "alc_1", "eng_2");
    expect(fp1).not.toBe(fp2);
  });

  it("resolveEngagement fingerprints differ by engagementId", () => {
    const fp1 = resolveEngagementFingerprint(MONTH, "eng_1");
    const fp2 = resolveEngagementFingerprint(MONTH, "eng_2");
    expect(fp1).not.toBe(fp2);
  });

  it("rescheduleEngagement fingerprints differ by target", () => {
    const fp1 = rescheduleEngagementFingerprint(MONTH, "eng_1", { kind: "self" });
    const fp2 = rescheduleEngagementFingerprint(MONTH, "eng_1", { kind: "familiar" });
    expect(fp1).not.toBe(fp2);
  });
});

// ============================================================
// COMMAND TYPE REGISTRATION
// ============================================================

describe("C4 command types are registered", () => {
  const c4Types = [
    "reschedule_time",
    "spend_manual_time",
    "waste_time",
    "spend_orrery_time",
    "commit_time_to_engagement",
    "resolve_engagement",
    "reschedule_engagement",
  ];

  for (const cmdType of c4Types) {
    it(`${cmdType} is in CAMPAIGN_COMMAND_TYPES`, () => {
      expect(CAMPAIGN_COMMAND_TYPES.includes(cmdType as any)).toBe(true);
    });

    it(`${cmdType} is a logical state command`, () => {
      expect(isLogicalStateCommandType(cmdType as any)).toBe(true);
    });
  }
});
