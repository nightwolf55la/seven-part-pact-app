import { describe, it, expect } from "vitest";
import {
  validateCampaignState,
  applyBeginPlay,
  applyAdvancePhase,
  applyScheduleTime,
  applySetEngagementTarget,
  applyResolveEngagement,
  applyCompleteMeeting,
  applyBeginNextMonth,
  normalizeWarningKeys,
  DomainError,
  beginNextMonthFingerprint,
  CAMPAIGN_COMMAND_TYPES,
  isLogicalStateCommandType,
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
  MOVABLE_PLANET_IDS,
  PACT_SEAT_IDS,
  advanceAllPlanets,
  asCentidegreePosition,
  isLegalPosition,
  movePlanetByArc,
  monthIdFromOrdinal,
  sunHouse,
} from "../shared/domain";
import type {
  CurrentCampaignState,
  WizardInitIds,
  AllocationId,
  EngagementId,
  WizardId,
  PlayerId,
  MonthOrdinal,
  LunarPhase,
  TransitionResult,
  WizardmootHistoryEntry,
} from "../shared/domain";
import type { PactSeatId } from "../shared/domain/pact-seats";

// --- ID helpers (reuse C5A patterns) ---

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

function makeWizardInits(wizardIds: WizardId[], startCounter = 1): WizardInitIds[] {
  let counter = startCounter;
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

const AWAKENING_INDICES: Record<string, number> = {
  saturn: 16, jupiter: 1, mars: 18, venus: 14, mercury: 17,
};

function buildReadyState(): CurrentCampaignState {
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
const MONTH = 12 as MonthOrdinal;
const WIZARD_INITS = makeWizardInits(PRESENT_WIZARD_IDS);

function buildPlayState(): CurrentCampaignState {
  const ready = buildReadyState();
  return applyBeginPlay(ready, { wizardInits: WIZARD_INITS }).nextState;
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
  return forceAdvancePhase(planning, { expectedMonthOrdinal: MONTH, expectedPhase: "planning" }).nextState;
}

function buildMeetingState(): CurrentCampaignState {
  const story = buildStoryState();
  return forceAdvancePhase(story, { expectedMonthOrdinal: MONTH, expectedPhase: "story" }).nextState;
}

// Clean quiet: all allocations scheduled to meeting (spent by completeMeeting),
// all engagements targeted and resolved during story.
function buildQuietState(): CurrentCampaignState {
  let planning = buildPlanningState();
  if (planning.lifecycle.kind !== "play") throw new Error("unreachable");

  for (const tp of planning.lifecycle.currentMonth.timeParticipants) {
    for (const alloc of tp.allocations) {
      planning = applyScheduleTime(planning, {
        expectedMonthOrdinal: MONTH,
        allocationId: alloc.allocationId,
        destination: { kind: "meeting" },
        note: null,
      }).nextState;
    }
  }
  if (planning.lifecycle.kind !== "play") throw new Error("unreachable");
  for (const eng of planning.lifecycle.currentMonth.engagements) {
    planning = applySetEngagementTarget(planning, {
      expectedMonthOrdinal: MONTH,
      engagementId: eng.engagementId,
      target: { kind: "self" },
    }).nextState;
  }

  const story = forceAdvancePhase(planning, { expectedMonthOrdinal: MONTH, expectedPhase: "planning" }).nextState;

  if (story.lifecycle.kind !== "play") throw new Error("unreachable");
  let storyState = story;
  for (const eng of story.lifecycle.currentMonth.engagements) {
    storyState = applyResolveEngagement(storyState, {
      expectedMonthOrdinal: MONTH,
      engagementId: eng.engagementId,
    }).nextState;
  }

  const meeting = forceAdvancePhase(storyState, { expectedMonthOrdinal: MONTH, expectedPhase: "story" }).nextState;
  return applyCompleteMeeting(meeting, { expectedMonthOrdinal: MONTH }).nextState;
}

// Quiet with pending Time: schedule only one allocation to meeting (spent),
// leave the rest unscheduled (pending through quiet).
function buildQuietStateWithPendingTime(): CurrentCampaignState {
  let planning = buildPlanningState();
  if (planning.lifecycle.kind !== "play") throw new Error("unreachable");

  const allocId = planning.lifecycle.currentMonth.timeParticipants[0].allocations[0].allocationId;
  planning = applyScheduleTime(planning, {
    expectedMonthOrdinal: MONTH,
    allocationId: allocId,
    destination: { kind: "meeting" },
    note: null,
  }).nextState;

  if (planning.lifecycle.kind !== "play") throw new Error("unreachable");
  for (const eng of planning.lifecycle.currentMonth.engagements) {
    planning = applySetEngagementTarget(planning, {
      expectedMonthOrdinal: MONTH,
      engagementId: eng.engagementId,
      target: { kind: "self" },
    }).nextState;
  }

  const story = forceAdvancePhase(planning, { expectedMonthOrdinal: MONTH, expectedPhase: "planning" }).nextState;

  if (story.lifecycle.kind !== "play") throw new Error("unreachable");
  let storyState = story;
  for (const eng of story.lifecycle.currentMonth.engagements) {
    storyState = applyResolveEngagement(storyState, {
      expectedMonthOrdinal: MONTH,
      engagementId: eng.engagementId,
    }).nextState;
  }

  const meeting = forceAdvancePhase(storyState, { expectedMonthOrdinal: MONTH, expectedPhase: "story" }).nextState;
  return applyCompleteMeeting(meeting, { expectedMonthOrdinal: MONTH }).nextState;
}

// Quiet with unresolved Engagement: all allocations spent (meeting),
// but engagements left pending (targeted but not resolved).
function buildQuietStateWithUnresolvedEngagement(): CurrentCampaignState {
  let planning = buildPlanningState();
  if (planning.lifecycle.kind !== "play") throw new Error("unreachable");

  for (const tp of planning.lifecycle.currentMonth.timeParticipants) {
    for (const alloc of tp.allocations) {
      planning = applyScheduleTime(planning, {
        expectedMonthOrdinal: MONTH,
        allocationId: alloc.allocationId,
        destination: { kind: "meeting" },
        note: null,
      }).nextState;
    }
  }
  if (planning.lifecycle.kind !== "play") throw new Error("unreachable");
  for (const eng of planning.lifecycle.currentMonth.engagements) {
    planning = applySetEngagementTarget(planning, {
      expectedMonthOrdinal: MONTH,
      engagementId: eng.engagementId,
      target: { kind: "self" },
    }).nextState;
  }

  const story = forceAdvancePhase(planning, { expectedMonthOrdinal: MONTH, expectedPhase: "planning" }).nextState;
  const meeting = forceAdvancePhase(story, { expectedMonthOrdinal: MONTH, expectedPhase: "story" }).nextState;
  return applyCompleteMeeting(meeting, { expectedMonthOrdinal: MONTH }).nextState;
}

const NEXT_MONTH_INITS = makeWizardInits(PRESENT_WIZARD_IDS, 100);

// ============================================================
// 1. QUIET WITH PENDING TIME -> unresolved_time warning
// ============================================================

describe("C5B quiet warnings: pending time", () => {
  it("Quiet with pending Time gives exact unresolved_time warning identity", () => {
    const quiet = buildQuietStateWithPendingTime();
    const r = applyBeginNextMonth(quiet, { expectedMonthOrdinal: MONTH }, NEXT_MONTH_INITS);
    if (r.outcome !== "warnings") throw new Error("expected warnings");

    const timeWarnings = r.warnings.filter((w) => w.kind === "unresolved_time");
    expect(timeWarnings.length).toBeGreaterThan(0);
    for (const w of timeWarnings) {
      expect(w.key).toBe(`unresolved_time:${w.resourceId}`);
      expect(w.resourceId).toMatch(/^alc_/);
    }
    expect(r.warnings.filter((w) => w.kind === "unresolved_engagement").length).toBe(0);
  });
});

// ============================================================
// 2. QUIET WITH UNRESOLVED ENGAGEMENT -> unresolved_engagement warning
// ============================================================

describe("C5B quiet warnings: unresolved engagement", () => {
  it("Quiet with unresolved Engagement gives exact unresolved_engagement warning", () => {
    const quiet = buildQuietStateWithUnresolvedEngagement();
    const r = applyBeginNextMonth(quiet, { expectedMonthOrdinal: MONTH }, NEXT_MONTH_INITS);
    if (r.outcome !== "warnings") throw new Error("expected warnings");

    const engWarnings = r.warnings.filter((w) => w.kind === "unresolved_engagement");
    expect(engWarnings.length).toBe(6);
    for (const w of engWarnings) {
      expect(w.key).toBe(`unresolved_engagement:${w.resourceId}`);
      expect(w.resourceId).toMatch(/^eng_/);
    }
    expect(r.warnings.filter((w) => w.kind === "unresolved_time").length).toBe(0);
  });
});

// ============================================================
// 3. EXACT ACKNOWLEDGEMENT PERMITS ROLLOVER
// ============================================================

describe("C5B exact acknowledgement permits rollover", () => {
  it("acknowledging the exact warning set proceeds to new_moon", () => {
    const quiet = buildQuietStateWithPendingTime();
    const r1 = applyBeginNextMonth(quiet, { expectedMonthOrdinal: MONTH }, NEXT_MONTH_INITS);
    if (r1.outcome !== "warnings") throw new Error("expected warnings first");

    const ackKeys = r1.warnings.map((w) => w.key);
    const r2 = applyBeginNextMonth(quiet, {
      expectedMonthOrdinal: MONTH,
      acknowledgedWarningKeys: ackKeys,
    }, NEXT_MONTH_INITS);
    expect(r2.outcome).toBe("applied");
    if (r2.outcome !== "applied") throw new Error("unreachable");
    if (r2.nextState.lifecycle.kind !== "play") throw new Error("unreachable");
    expect(r2.nextState.lifecycle.phase).toBe("new_moon");
  });

  it("clean quiet with no warnings proceeds without acknowledgement", () => {
    const quiet = buildQuietState();
    const r = applyBeginNextMonth(quiet, { expectedMonthOrdinal: MONTH }, NEXT_MONTH_INITS);
    expect(r.outcome).toBe("applied");
  });
});

// ============================================================
// 4. STALE/MISMATCHED ACKNOWLEDGEMENT RETURNS WARNINGS, NO TRANSITION
// ============================================================

describe("C5B stale/mismatched acknowledgement", () => {
  it("no acknowledgement when warnings exist returns warnings", () => {
    const quiet = buildQuietStateWithPendingTime();
    const r = applyBeginNextMonth(quiet, { expectedMonthOrdinal: MONTH }, NEXT_MONTH_INITS);
    expect(r.outcome).toBe("warnings");
  });

  it("stale acknowledgement after warnings changed returns current warnings", () => {
    const quiet = buildQuietStateWithPendingTime();
    const r = applyBeginNextMonth(quiet, {
      expectedMonthOrdinal: MONTH,
      acknowledgedWarningKeys: ["unresolved_time:alc_fake"],
    }, NEXT_MONTH_INITS);
    expect(r.outcome).toBe("warnings");
    if (r.outcome !== "warnings") throw new Error("unreachable");
    expect(r.warnings.length).toBeGreaterThan(0);
    expect(r.warnings.some((w) => w.resourceId !== "alc_fake")).toBe(true);
  });

  it("stale non-empty acknowledgement when current set is empty returns current empty warnings", () => {
    const quiet = buildQuietState();
    const result = applyBeginNextMonth(
      quiet,
      {
        expectedMonthOrdinal: MONTH,
        acknowledgedWarningKeys: ["unresolved_time:alc_fake"],
      },
      NEXT_MONTH_INITS,
    );
  
    expect(result.outcome).toBe("warnings");
    if (result.outcome !== "warnings") throw new Error("unreachable");
    expect(result.warnings).toEqual([]);
  });
});

// ============================================================
// 5. SUCCESSFUL ROLLOVER ATOMICALLY DOES ALL TRANSITIONS
// ============================================================

describe("C5B successful rollover atomicity", () => {
  it("advances month once, planets once, archives history, creates fresh resources, enters new_moon", () => {
    const quiet = buildQuietState();
    if (quiet.lifecycle.kind !== "play") throw new Error("unreachable");
    const oldOrrery = quiet.lifecycle.orrery;
    const expectedAdvancedOrrery = advanceAllPlanets(oldOrrery);

    const r = applyBeginNextMonth(quiet, { expectedMonthOrdinal: MONTH }, NEXT_MONTH_INITS);
    if (r.outcome !== "applied") throw new Error("expected applied");
    const next = r.nextState;
    if (next.lifecycle.kind !== "play") throw new Error("unreachable");

    expect(next.calendar.monthOrdinal).toBe(MONTH + 1);
    expect(next.lifecycle.phase).toBe("new_moon");
    expect(next.lifecycle.orrery).toEqual(expectedAdvancedOrrery);

    expect(next.wizardmootHistory.length).toBe(quiet.wizardmootHistory.length + 1);
    const histEntry = next.wizardmootHistory[next.wizardmootHistory.length - 1];
    expect(histEntry.monthOrdinal).toBe(MONTH);
    expect(histEntry.attendance.length).toBe(6);
    for (const a of histEntry.attendance) {
      expect(a).toHaveProperty("wizardId");
      expect(a).toHaveProperty("attended");
      expect(a).not.toHaveProperty("exceptionReason");
    }

    for (let i = 0; i < quiet.wizardmootHistory.length; i++) {
      expect(next.wizardmootHistory[i]).toEqual(quiet.wizardmootHistory[i]);
    }

    expect(next.lifecycle.currentMonth.timeParticipants.length).toBe(6);
    expect(next.lifecycle.currentMonth.engagements.length).toBe(6);

    for (const tp of next.lifecycle.currentMonth.timeParticipants) {
      expect(tp.allocations.length).toBe(4);
      for (const alloc of tp.allocations) {
        expect(alloc.destination).toBeNull();
        expect(alloc.note).toBeNull();
        expect(alloc.resolution).toBe("pending");
      }
      expect(tp.rescheduleAllowance).toBe(1);
      expect(tp.reschedulesUsed).toBe(0);
      expect(tp.effectiveBudget).toBe(4);
    }

    for (const eng of next.lifecycle.currentMonth.engagements) {
      expect(eng.target).toBeNull();
      expect(eng.resolution).toBe("pending");
      expect(eng.linkedTimeAllocationId).toBeNull();
    }

    expect(next.lifecycle.currentMonth.wizardmootAttendance).toBeNull();
    expect(() => validateCampaignState(next)).not.toThrow();
  });
});

// ============================================================
// 6. EXCEPTIONAL/OFF-GRID PLANET REMAINS EXACT ARC MOVEMENT
// ============================================================

describe("C5B exceptional planet movement", () => {
  it("genuinely off-grid Saturn moves by exact arc without grid snapping", () => {
    const quiet = buildQuietState();
    if (quiet.lifecycle.kind !== "play") throw new Error("unreachable");
  
    const offGridStart = asCentidegreePosition(17623);
    expect(isLegalPosition("saturn", offGridStart)).toBe(false);
  
    const offGridQuiet: CurrentCampaignState = {
      ...quiet,
      lifecycle: {
        ...quiet.lifecycle,
        orrery: {
          ...quiet.lifecycle.orrery,
          saturn: offGridStart,
        },
      },
    };
  
    const r = applyBeginNextMonth(
      offGridQuiet,
      { expectedMonthOrdinal: MONTH },
      NEXT_MONTH_INITS,
    );
  
    if (r.outcome !== "applied") throw new Error("expected applied");
    if (r.nextState.lifecycle.kind !== "play") throw new Error("unreachable");
  
    const saturnAfter = r.nextState.lifecycle.orrery.saturn;
    const expected = movePlanetByArc("saturn", offGridStart, "forward");
  
    expect(saturnAfter).toBe(expected);
    expect(isLegalPosition("saturn", saturnAfter)).toBe(false);
    expect(() => validateCampaignState(r.nextState)).not.toThrow();
  });
});

// ============================================================
// 7. OLD UNRESOLVED OBLIGATIONS NOT REWRITTEN AS SPENT/RESOLVED
// ============================================================

describe("C5B old obligations preserved", () => {
  it("old unresolved obligations are not rewritten as spent/resolved by rollover", () => {
    const quiet = buildQuietStateWithPendingTime();
    if (quiet.lifecycle.kind !== "play") throw new Error("unreachable");

    const oldAllocIds: string[] = [];
    const oldEngIds: string[] = [];
    for (const tp of quiet.lifecycle.currentMonth.timeParticipants) {
      for (const alloc of tp.allocations) {
        if (alloc.resolution === "pending") {
          oldAllocIds.push(alloc.allocationId);
        }
      }
    }
    for (const eng of quiet.lifecycle.currentMonth.engagements) {
      if (eng.resolution === "pending") {
        oldEngIds.push(eng.engagementId);
      }
    }
    expect(oldAllocIds.length).toBeGreaterThan(0);

    const r1 = applyBeginNextMonth(quiet, { expectedMonthOrdinal: MONTH }, NEXT_MONTH_INITS);
    if (r1.outcome !== "warnings") throw new Error("expected warnings");
    const ackKeys = r1.warnings.map((w) => w.key);
    const r2 = applyBeginNextMonth(quiet, {
      expectedMonthOrdinal: MONTH,
      acknowledgedWarningKeys: ackKeys,
    }, NEXT_MONTH_INITS);
    if (r2.outcome !== "applied") throw new Error("expected applied");

    if (r2.nextState.lifecycle.kind !== "play") throw new Error("unreachable");
    for (const tp of r2.nextState.lifecycle.currentMonth.timeParticipants) {
      for (const alloc of tp.allocations) {
        expect(oldAllocIds).not.toContain(alloc.allocationId);
      }
    }
    for (const eng of r2.nextState.lifecycle.currentMonth.engagements) {
      expect(oldEngIds).not.toContain(eng.engagementId);
    }
  });
});

// ============================================================
// 8. WRONG PHASE / WRONG EXPECTED MONTH REJECTS
// ============================================================

describe("C5B wrong phase / wrong month rejects", () => {
  it("rejects during meeting phase", () => {
    const meeting = buildMeetingState();
    expect(() =>
      applyBeginNextMonth(meeting, { expectedMonthOrdinal: MONTH }, NEXT_MONTH_INITS),
    ).toThrow(DomainError);
  });

  it("rejects with stale month", () => {
    const quiet = buildQuietState();
    expect(() =>
      applyBeginNextMonth(quiet, { expectedMonthOrdinal: 99 as MonthOrdinal }, NEXT_MONTH_INITS),
    ).toThrow(DomainError);
  });

  it("rejects during story phase", () => {
    const story = buildStoryState();
    expect(() =>
      applyBeginNextMonth(story, { expectedMonthOrdinal: MONTH }, NEXT_MONTH_INITS),
    ).toThrow(DomainError);
  });
});

// ============================================================
// 9. FINGERPRINT NORMALIZATION IS ORDER-INSENSITIVE
// ============================================================

describe("C5B fingerprint normalization", () => {
  it("fingerprint is order-insensitive", () => {
    const fp1 = beginNextMonthFingerprint(1, ["unresolved_time:alc_2", "unresolved_time:alc_1"]);
    const fp2 = beginNextMonthFingerprint(1, ["unresolved_time:alc_1", "unresolved_time:alc_2"]);
    expect(fp1).toBe(fp2);
  });

  it("different resource sets produce different fingerprints", () => {
    const fp1 = beginNextMonthFingerprint(1, ["unresolved_time:alc_1"]);
    const fp2 = beginNextMonthFingerprint(1, ["unresolved_time:alc_2"]);
    expect(fp1).not.toBe(fp2);
  });

  it("empty ack uses v1 prefix", () => {
    const fp = beginNextMonthFingerprint(1, []);
    expect(fp).toContain("v1");
    expect(fp).not.toContain("ack=");
  });

  it("non-empty ack uses v2 prefix", () => {
    const fp = beginNextMonthFingerprint(1, ["unresolved_time:alc_1"]);
    expect(fp).toContain("v2");
    expect(fp).toContain("ack=");
  });
});

// ============================================================
// 10. RESULTING STATE PASSES validateCampaignState
// ============================================================

describe("C5B state validation", () => {
  it("resulting new_moon state passes validateCampaignState", () => {
    const quiet = buildQuietState();
    const r = applyBeginNextMonth(quiet, { expectedMonthOrdinal: MONTH }, NEXT_MONTH_INITS);
    if (r.outcome !== "applied") throw new Error("expected applied");
    expect(() => validateCampaignState(r.nextState)).not.toThrow();
  });
});

// ============================================================
// COMMAND TYPE REGISTRATION
// ============================================================

describe("C5B command type registration", () => {
  it("begin_next_month is in CAMPAIGN_COMMAND_TYPES", () => {
    expect(CAMPAIGN_COMMAND_TYPES.includes("begin_next_month" as any)).toBe(true);
  });

  it("begin_next_month is a logical state command", () => {
    expect(isLogicalStateCommandType("begin_next_month" as any)).toBe(true);
  });
});

// ============================================================
// EVENT STRUCTURE
// ============================================================

describe("C5B month_begun event", () => {
  it("emits month_begun event with correct audit facts", () => {
    const quiet = buildQuietState();
    const r = applyBeginNextMonth(quiet, { expectedMonthOrdinal: MONTH }, NEXT_MONTH_INITS);
    if (r.outcome !== "applied") throw new Error("expected applied");

    expect(r.events.length).toBe(1);
    const evt = r.events[0];
    expect(evt.type).toBe("month_begun");
    expect(evt.version).toBe(1);
    if (evt.type !== "month_begun") throw new Error("unreachable");
    expect(evt.data.fromMonthOrdinal).toBe(MONTH);
    expect(evt.data.toMonthOrdinal).toBe(MONTH + 1);
    expect(evt.data.acknowledgedWarningKeys).toEqual([]);
    expect(evt.data.eligibleWizardIds.length).toBe(6);
  });
});

// ============================================================
// 11. ANNUAL WIZARDMOOT HISTORY REGRESSION
// ============================================================

describe("C5B annual wizardmoot history regression", () => {
  it("archives absolute monthOrdinal 12 alongside pre-existing 0, both distinct", () => {
    const quiet = buildQuietState();
    if (quiet.lifecycle.kind !== "play") throw new Error("unreachable");

    // Inject a pre-existing history entry for absolute monthOrdinal 0.
    const priorEntry: WizardmootHistoryEntry = {
      monthOrdinal: 0 as MonthOrdinal,
      attendance: PRESENT_WIZARD_IDS.map((wid) => ({
        wizardId: wid,
        attended: true,
        exceptionReason: null,
      })),
    };
    const quietWithHistory: CurrentCampaignState = {
      ...quiet,
      wizardmootHistory: [priorEntry],
    };

    const r = applyBeginNextMonth(quietWithHistory, { expectedMonthOrdinal: MONTH }, NEXT_MONTH_INITS);
    if (r.outcome !== "applied") throw new Error("expected applied");
    const next = r.nextState;

    // History contains BOTH absolute 0 and 12.
    const ordinals = next.wizardmootHistory.map((h) => h.monthOrdinal);
    expect(ordinals).toContain(0);
    expect(ordinals).toContain(12);
    expect(next.wizardmootHistory.length).toBe(2);

    // The two entries remain distinct.
    expect(next.wizardmootHistory[0].monthOrdinal).not.toBe(next.wizardmootHistory[1].monthOrdinal);

    // monthIdFromOrdinal(0) === monthIdFromOrdinal(12) === "april" — same cyclic month.
    expect(monthIdFromOrdinal(0)).toBe("april");
    expect(monthIdFromOrdinal(12)).toBe("april");

    // sunHouse(0) === sunHouse(12) === 0 (Aries/House 0).
    expect(sunHouse(0 as MonthOrdinal)).toBe(0);
    expect(sunHouse(12 as MonthOrdinal)).toBe(0);

    // Resulting state validates.
    expect(() => validateCampaignState(next)).not.toThrow();
  });

  it("rejects out-of-order wizardmoot history (descending)", () => {
    const quiet = buildQuietState();
    if (quiet.lifecycle.kind !== "play") throw new Error("unreachable");

    const badHistory: WizardmootHistoryEntry[] = [
      {
        monthOrdinal: 5 as MonthOrdinal,
        attendance: [],
      },
      {
        monthOrdinal: 3 as MonthOrdinal,
        attendance: [],
      },
    ];
    const bad: CurrentCampaignState = {
      ...quiet,
      wizardmootHistory: badHistory as any,
    };

    expect(() => validateCampaignState(bad)).toThrow(DomainError);
  });
});
