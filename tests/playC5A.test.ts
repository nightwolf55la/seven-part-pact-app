import { describe, it, expect } from "vitest";
import {
  validateCampaignState,
  applyBeginPlay,
  applyAdvancePhase,
  applyScheduleTime,
  applySetEngagementTarget,
  applyAdjustWizardmootAttendance,
  applyCompleteMeeting,
  computePhaseTransitionWarnings,
  normalizeWarningKeys,
  DomainError,
  advancePhaseFingerprint,
  adjustWizardmootAttendanceFingerprint,
  completeMeetingFingerprint,
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
} from "../shared/domain";
import type {
  CurrentCampaignState,
  WizardInitIds,
  AllocationId,
  EngagementId,
  WizardId,
  PlayerId,
  MonthOrdinal,
  TransitionResult,
  TimeDestination,
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
  state = applySetSetupMonth(state, 0 as MonthOrdinal).nextState;
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
const MONTH = 1 as MonthOrdinal;
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

function getAlloc(state: CurrentCampaignState, allocationId: string) {
  if (state.lifecycle.kind !== "play") return null;
  for (const tp of state.lifecycle.currentMonth.timeParticipants) {
    for (const alloc of tp.allocations) {
      if (alloc.allocationId === allocationId) return { tp, alloc };
    }
  }
  return null;
}

function firstAllocId(state: CurrentCampaignState, wizardId: WizardId): AllocationId {
  if (state.lifecycle.kind !== "play") throw new Error("not play");
  const tp = state.lifecycle.currentMonth.timeParticipants.find((t) => t.participant.wizardId === wizardId);
  if (!tp) throw new Error(`no participant for ${wizardId}`);
  return tp.allocations[0].allocationId;
}

function firstEngagementId(state: CurrentCampaignState, wizardId: WizardId): EngagementId {
  if (state.lifecycle.kind !== "play") throw new Error("not play");
  const eng = state.lifecycle.currentMonth.engagements.find((e) => e.actingWizardId === wizardId);
  if (!eng) throw new Error(`no engagement for ${wizardId}`);
  return eng.engagementId;
}

// ============================================================
// PLANNING -> STORY WARNING MODEL
// ============================================================

describe("planning -> story warnings", () => {
  it("returns unscheduled_time warnings for null-destination pending allocations", () => {
    const planning = buildPlanningState();
    const r = applyAdvancePhase(planning, { expectedMonthOrdinal: MONTH, expectedPhase: "planning" });
    expect(r.outcome).toBe("warnings");
    if (r.outcome !== "warnings") throw new Error("unreachable");

    const unscheduledWarnings = r.warnings.filter((w) => w.kind === "unscheduled_time");
    expect(unscheduledWarnings.length).toBeGreaterThan(0);

    for (const w of unscheduledWarnings) {
      expect(w.key).toBe(`unscheduled_time:${w.resourceId}`);
      expect(w.resourceId).toMatch(/^alc_/);
    }
  });

  it("returns untargeted_engagement warnings for null-target pending engagements", () => {
    const planning = buildPlanningState();
    const r = applyAdvancePhase(planning, { expectedMonthOrdinal: MONTH, expectedPhase: "planning" });
    if (r.outcome !== "warnings") throw new Error("unreachable");

    const untargetedWarnings = r.warnings.filter((w) => w.kind === "untargeted_engagement");
    expect(untargetedWarnings.length).toBe(6);

    for (const w of untargetedWarnings) {
      expect(w.key).toBe(`untargeted_engagement:${w.resourceId}`);
      expect(w.resourceId).toMatch(/^eng_/);
    }
  });

  it("no warnings when all allocations scheduled and engagements targeted", () => {
    let state = buildPlanningState();
    if (state.lifecycle.kind !== "play") throw new Error("unreachable");

    for (const tp of state.lifecycle.currentMonth.timeParticipants) {
      for (const alloc of tp.allocations) {
        state = applyScheduleTime(state, {
          expectedMonthOrdinal: MONTH,
          allocationId: alloc.allocationId,
          destination: { kind: "meeting" },
          note: null,
        }).nextState;
      }
    }
    if (state.lifecycle.kind !== "play") throw new Error("unreachable");
    for (const eng of state.lifecycle.currentMonth.engagements) {
      state = applySetEngagementTarget(state, {
        expectedMonthOrdinal: MONTH,
        engagementId: eng.engagementId,
        target: { kind: "self" },
      }).nextState;
    }

    const r = applyAdvancePhase(state, { expectedMonthOrdinal: MONTH, expectedPhase: "planning" });
    expect(r.outcome).toBe("applied");
  });

  it("correct acknowledgement proceeds; mismatched acknowledgement returns warnings", () => {
    const planning = buildPlanningState();
    const r1 = applyAdvancePhase(planning, { expectedMonthOrdinal: MONTH, expectedPhase: "planning" });
    if (r1.outcome !== "warnings") throw new Error("unreachable");

    // Wrong keys
    const r2 = applyAdvancePhase(planning, {
      expectedMonthOrdinal: MONTH,
      expectedPhase: "planning",
      acknowledgedWarningKeys: ["wrong_key:fake"],
    });
    expect(r2.outcome).toBe("warnings");

    // Correct keys
    const correctKeys = r1.warnings.map((w) => w.key);
    const r3 = applyAdvancePhase(planning, {
      expectedMonthOrdinal: MONTH,
      expectedPhase: "planning",
      acknowledgedWarningKeys: correctKeys,
    });
    expect(r3.outcome).toBe("applied");
  });

  it("stale acknowledgement returns the current empty warning set", () => {
    const play = buildPlayState();
    const result = applyAdvancePhase(play, {
      expectedMonthOrdinal: MONTH,
      expectedPhase: "new_moon",
      acknowledgedWarningKeys: ["fake_warning:abc"],
    });
  
    expect(result.outcome).toBe("warnings");
    if (result.outcome !== "warnings") throw new Error("unreachable");
    expect(result.warnings).toEqual([]);
  });
});

// ============================================================
// STORY -> MEETING WARNING MODEL
// ============================================================

describe("story -> meeting warnings", () => {
  it("returns unresolved_time and unresolved_engagement warnings", () => {
    const story = buildStoryState();
    const r = applyAdvancePhase(story, { expectedMonthOrdinal: MONTH, expectedPhase: "story" });
    expect(r.outcome).toBe("warnings");
    if (r.outcome !== "warnings") throw new Error("unreachable");

    const unresolvedTime = r.warnings.filter((w) => w.kind === "unresolved_time");
    const unresolvedEng = r.warnings.filter((w) => w.kind === "unresolved_engagement");

    expect(unresolvedTime.length).toBeGreaterThan(0);
    expect(unresolvedEng.length).toBe(6);

    for (const w of unresolvedTime) {
      expect(w.key).toBe(`unresolved_time:${w.resourceId}`);
    }
    for (const w of unresolvedEng) {
      expect(w.key).toBe(`unresolved_engagement:${w.resourceId}`);
    }
  });

  it("meeting-destination allocations are excluded from unresolved_time warnings", () => {
    let planning = buildPlanningState();
    const allocId = firstAllocId(planning, wizId(1));

    planning = applyScheduleTime(planning, {
      expectedMonthOrdinal: MONTH,
      allocationId: allocId,
      destination: { kind: "meeting" },
      note: null,
    }).nextState;

    const story = forceAdvancePhase(planning, { expectedMonthOrdinal: MONTH, expectedPhase: "planning" }).nextState;

    if (story.lifecycle.kind !== "play") throw new Error("unreachable");
    const warnings = computePhaseTransitionWarnings("story", story.lifecycle.currentMonth);
    const unresolvedTimeIds = warnings.filter((w) => w.kind === "unresolved_time").map((w) => w.resourceId);
    expect(unresolvedTimeIds).not.toContain(allocId);
  });
});

// ============================================================
// NORMALIZE WARNING KEYS
// ============================================================

describe("normalizeWarningKeys", () => {
  it("deduplicates and sorts", () => {
    const result = normalizeWarningKeys(["b:2", "a:1", "b:2", "c:3", "a:1"]);
    expect(result).toEqual(["a:1", "b:2", "c:3"]);
  });

  it("empty input returns empty array", () => {
    expect(normalizeWarningKeys([])).toEqual([]);
  });
});

// ============================================================
// PHASE ADVANCEMENT V2 EVENT
// ============================================================

describe("phase advancement V2 events", () => {
  it("emits V2 event with acknowledgedWarningKeys", () => {
    const planning = buildPlanningState();
    const r1 = applyAdvancePhase(planning, { expectedMonthOrdinal: MONTH, expectedPhase: "planning" });
    if (r1.outcome !== "warnings") throw new Error("unreachable");

    const ackKeys = r1.warnings.map((w) => w.key);
    const r2 = applyAdvancePhase(planning, {
      expectedMonthOrdinal: MONTH,
      expectedPhase: "planning",
      acknowledgedWarningKeys: ackKeys,
    });
    if (r2.outcome !== "applied") throw new Error("unreachable");

    expect(r2.events.length).toBe(1);
    const evt = r2.events[0];
    expect(evt.type).toBe("phase_advanced");
    expect(evt.version).toBe(2);
    if (evt.type !== "phase_advanced") throw new Error("unreachable");
    expect(evt.data.fromPhase).toBe("planning");
    expect(evt.data.toPhase).toBe("story");
    if (evt.version === 2) {
      expect(evt.data.acknowledgedWarningKeys.length).toBeGreaterThan(0);
    }
  });

  it("V2 event with no warnings has empty acknowledgedWarningKeys", () => {
    const play = buildPlayState();
    const r = applyAdvancePhase(play, { expectedMonthOrdinal: MONTH, expectedPhase: "new_moon" });
    if (r.outcome !== "applied") throw new Error("unreachable");

    const evt = r.events[0];
    expect(evt.type).toBe("phase_advanced");
    expect(evt.version).toBe(2);
    if (evt.type !== "phase_advanced" || evt.version !== 2) throw new Error("unreachable");
    expect(evt.data.acknowledgedWarningKeys).toEqual([]);
  });
});

// ============================================================
// STORY -> MEETING INITIALIZES ATTENDANCE
// ============================================================

describe("story -> meeting attendance initialization", () => {
  it("initializes wizardmootAttendance with all wizards", () => {
    const meeting = buildMeetingState();
    if (meeting.lifecycle.kind !== "play") throw new Error("unreachable");
    const attendance = meeting.lifecycle.currentMonth.wizardmootAttendance;

    expect(attendance).not.toBeNull();
    expect(attendance!.length).toBe(6);

    const wizIds = attendance!.map((a) => a.wizardId);
    for (const wiz of PRESENT_WIZARD_IDS) {
      expect(wizIds).toContain(wiz);
    }
  });

  it("attendance defaults to false when no meeting allocation exists", () => {
    const meeting = buildMeetingState();
    if (meeting.lifecycle.kind !== "play") throw new Error("unreachable");

    for (const a of meeting.lifecycle.currentMonth.wizardmootAttendance!) {
      expect(a.attended).toBe(false);
      expect(a.exceptionReason).toBeNull();
    }
  });

  it("attendance defaults to true when wizard has meeting allocation", () => {
    let planning = buildPlanningState();
    const allocId = firstAllocId(planning, wizId(1));

    planning = applyScheduleTime(planning, {
      expectedMonthOrdinal: MONTH,
      allocationId: allocId,
      destination: { kind: "meeting" },
      note: null,
    }).nextState;

    const story = forceAdvancePhase(planning, { expectedMonthOrdinal: MONTH, expectedPhase: "planning" }).nextState;
    const meeting = forceAdvancePhase(story, { expectedMonthOrdinal: MONTH, expectedPhase: "story" }).nextState;

    if (meeting.lifecycle.kind !== "play") throw new Error("unreachable");
    const att = meeting.lifecycle.currentMonth.wizardmootAttendance!;

    const wiz1 = att.find((a) => a.wizardId === wizId(1))!;
    expect(wiz1.attended).toBe(true);
    expect(wiz1.exceptionReason).toBeNull();

    const wiz2 = att.find((a) => a.wizardId === wizId(2))!;
    expect(wiz2.attended).toBe(false);
  });

  it("meeting state passes validateCampaignState", () => {
    const meeting = buildMeetingState();
    expect(() => validateCampaignState(meeting)).not.toThrow();
  });
});

// ============================================================
// ADJUST WIZARDMOOT ATTENDANCE
// ============================================================

describe("applyAdjustWizardmootAttendance", () => {
  it("flips attendance from expected=false to true with exception reason", () => {
    const meeting = buildMeetingState();

    const result = applyAdjustWizardmootAttendance(meeting, {
      expectedMonthOrdinal: MONTH,
      wizardId: wizId(1),
      attended: true,
      exceptionReason: "Wizard arrived late",
    });

    if (result.nextState.lifecycle.kind !== "play") throw new Error("unreachable");
    const att = result.nextState.lifecycle.currentMonth.wizardmootAttendance!;
    const wiz1 = att.find((a) => a.wizardId === wizId(1))!;
    expect(wiz1.attended).toBe(true);
    expect(wiz1.exceptionReason).toBe("Wizard arrived late");
    expect(result.events[0].type).toBe("wizardmoot_attendance_adjusted");
    expect(() => validateCampaignState(result.nextState)).not.toThrow();
  });

  it("setting to expected value clears exception reason", () => {
    const meeting = buildMeetingState();

    // Wizard 1 expected=false. Set to false (matching expected) -> exceptionReason forced to null
    const result = applyAdjustWizardmootAttendance(meeting, {
      expectedMonthOrdinal: MONTH,
      wizardId: wizId(1),
      attended: false,
      exceptionReason: null,
    });

    if (result.nextState.lifecycle.kind !== "play") throw new Error("unreachable");
    const wiz1 = result.nextState.lifecycle.currentMonth.wizardmootAttendance!.find(
      (a) => a.wizardId === wizId(1),
    )!;
    expect(wiz1.attended).toBe(false);
    expect(wiz1.exceptionReason).toBeNull();
  });

  it("rejects differing from expected without exception reason", () => {
    const meeting = buildMeetingState();

    expect(() =>
      applyAdjustWizardmootAttendance(meeting, {
        expectedMonthOrdinal: MONTH,
        wizardId: wizId(1),
        attended: true,
        exceptionReason: null,
      }),
    ).toThrow(DomainError);
  });

  it("rejects blank exception reason when differing from expected", () => {
    const meeting = buildMeetingState();

    expect(() =>
      applyAdjustWizardmootAttendance(meeting, {
        expectedMonthOrdinal: MONTH,
        wizardId: wizId(1),
        attended: true,
        exceptionReason: "   ",
      }),
    ).toThrow(DomainError);
  });

  it("rejects during non-meeting phase", () => {
    const story = buildStoryState();
    expect(() =>
      applyAdjustWizardmootAttendance(story, {
        expectedMonthOrdinal: MONTH,
        wizardId: wizId(1),
        attended: true,
        exceptionReason: "test",
      }),
    ).toThrow(DomainError);
  });

  it("rejects invalid wizard id", () => {
    const meeting = buildMeetingState();
    expect(() =>
      applyAdjustWizardmootAttendance(meeting, {
        expectedMonthOrdinal: MONTH,
        wizardId: "wiz_00000000-0000-0000-0000-000000000099" as WizardId,
        attended: true,
        exceptionReason: "test",
      }),
    ).toThrow(DomainError);
  });

  it("produces correct event data", () => {
    const meeting = buildMeetingState();
    const result = applyAdjustWizardmootAttendance(meeting, {
      expectedMonthOrdinal: MONTH,
      wizardId: wizId(1),
      attended: true,
      exceptionReason: "Override reason",
    });

    const evt = result.events[0];
    expect(evt.type).toBe("wizardmoot_attendance_adjusted");
    if (evt.type !== "wizardmoot_attendance_adjusted") throw new Error("unreachable");
    expect(evt.data.wizardId).toBe(wizId(1));
    expect(evt.data.previousAttended).toBe(false);
    expect(evt.data.newAttended).toBe(true);
    expect(evt.data.newExceptionReason).toBe("Override reason");
  });
});

// ============================================================
// COMPLETE MEETING
// ============================================================

describe("applyCompleteMeeting", () => {
  it("transitions from meeting to quiet", () => {
    const meeting = buildMeetingState();
    const result = applyCompleteMeeting(meeting, { expectedMonthOrdinal: MONTH });

    if (result.nextState.lifecycle.kind !== "play") throw new Error("unreachable");
    expect(result.nextState.lifecycle.phase).toBe("quiet");
    expect(() => validateCampaignState(result.nextState)).not.toThrow();
  });

  it("spends meeting-destination pending allocations", () => {
    let planning = buildPlanningState();
    const allocId = firstAllocId(planning, wizId(1));

    planning = applyScheduleTime(planning, {
      expectedMonthOrdinal: MONTH,
      allocationId: allocId,
      destination: { kind: "meeting" },
      note: null,
    }).nextState;

    const story = forceAdvancePhase(planning, { expectedMonthOrdinal: MONTH, expectedPhase: "planning" }).nextState;
    const meeting = forceAdvancePhase(story, { expectedMonthOrdinal: MONTH, expectedPhase: "story" }).nextState;

    const beforeAlloc = getAlloc(meeting, allocId);
    expect(beforeAlloc!.alloc.resolution).toBe("pending");
    expect(beforeAlloc!.alloc.destination).toEqual({ kind: "meeting" });

    const result = applyCompleteMeeting(meeting, { expectedMonthOrdinal: MONTH });

    const afterAlloc = getAlloc(result.nextState, allocId);
    expect(afterAlloc!.alloc.resolution).toBe("spent");

    if (result.events[0].type !== "meeting_completed") throw new Error("unreachable");
    expect(result.events[0].data.meetingAllocationsSpent).toContain(allocId);
  });

  it("does not spend non-meeting allocations", () => {
    let planning = buildPlanningState();
    const allocId = firstAllocId(planning, wizId(1));

    planning = applyScheduleTime(planning, {
      expectedMonthOrdinal: MONTH,
      allocationId: allocId,
      destination: { kind: "domain" },
      note: null,
    }).nextState;

    const story = forceAdvancePhase(planning, { expectedMonthOrdinal: MONTH, expectedPhase: "planning" }).nextState;
    const meeting = forceAdvancePhase(story, { expectedMonthOrdinal: MONTH, expectedPhase: "story" }).nextState;
    const result = applyCompleteMeeting(meeting, { expectedMonthOrdinal: MONTH });

    const afterAlloc = getAlloc(result.nextState, allocId);
    expect(afterAlloc!.alloc.resolution).toBe("pending");
  });

  it("rejects during non-meeting phase", () => {
    const story = buildStoryState();
    expect(() => applyCompleteMeeting(story, { expectedMonthOrdinal: MONTH })).toThrow(DomainError);
  });

  it("rejects with stale month", () => {
    const meeting = buildMeetingState();
    expect(() => applyCompleteMeeting(meeting, { expectedMonthOrdinal: 99 as MonthOrdinal })).toThrow(DomainError);
  });

  it("produces meeting_completed event", () => {
    const meeting = buildMeetingState();
    const result = applyCompleteMeeting(meeting, { expectedMonthOrdinal: MONTH });

    expect(result.events.length).toBe(1);
    const evt = result.events[0];
    expect(evt.type).toBe("meeting_completed");
    expect(evt.version).toBe(1);
    if (evt.type !== "meeting_completed") throw new Error("unreachable");
    expect(evt.data.monthOrdinal).toBe(MONTH);
  });

  it("meeting -> quiet cannot be done via advancePhase", () => {
    const meeting = buildMeetingState();
    expect(() =>
      applyAdvancePhase(meeting, { expectedMonthOrdinal: MONTH, expectedPhase: "meeting" }),
    ).toThrow(DomainError);
  });
});

// ============================================================
// FINGERPRINTS
// ============================================================

describe("C5A fingerprints", () => {
  it("advancePhaseFingerprint without ack uses v1 prefix", () => {
    const fp = advancePhaseFingerprint(1, "planning");
    expect(fp).toContain("v1");
    expect(fp).not.toContain("ack=");
  });

  it("advancePhaseFingerprint with ack uses v2 prefix", () => {
    const fp = advancePhaseFingerprint(1, "planning", ["unscheduled_time:alc_1", "untargeted_engagement:eng_1"]);
    expect(fp).toContain("v2");
    expect(fp).toContain("ack=");
  });

  it("advancePhaseFingerprint normalizes ack keys order", () => {
    const fp1 = advancePhaseFingerprint(1, "planning", ["b:2", "a:1"]);
    const fp2 = advancePhaseFingerprint(1, "planning", ["a:1", "b:2"]);
    expect(fp1).toBe(fp2);
  });

  it("advancePhaseFingerprint with empty ack uses v1 prefix", () => {
    const fp = advancePhaseFingerprint(1, "planning", []);
    expect(fp).toContain("v1");
  });

  it("adjustWizardmootAttendanceFingerprint varies by wizard and attended", () => {
    const fp1 = adjustWizardmootAttendanceFingerprint(1, "wiz_1", true, "reason");
    const fp2 = adjustWizardmootAttendanceFingerprint(1, "wiz_1", false, "reason");
    const fp3 = adjustWizardmootAttendanceFingerprint(1, "wiz_2", true, "reason");
    expect(fp1).not.toBe(fp2);
    expect(fp1).not.toBe(fp3);
  });

  it("completeMeetingFingerprint varies by month", () => {
    const fp1 = completeMeetingFingerprint(1);
    const fp2 = completeMeetingFingerprint(2);
    expect(fp1).not.toBe(fp2);
  });
});

// ============================================================
// COMMAND TYPE REGISTRATION
// ============================================================

describe("C5A command types are registered", () => {
  const c5aTypes = [
    "adjust_wizardmoot_attendance",
    "complete_meeting",
  ];

  for (const cmdType of c5aTypes) {
    it(`${cmdType} is in CAMPAIGN_COMMAND_TYPES`, () => {
      expect(CAMPAIGN_COMMAND_TYPES.includes(cmdType as any)).toBe(true);
    });

    it(`${cmdType} is a logical state command`, () => {
      expect(isLogicalStateCommandType(cmdType as any)).toBe(true);
    });
  }
});

// ============================================================
// STATE VALIDATION
// ============================================================

describe("C5A state validation", () => {
  it("meeting state with attendance passes validation", () => {
    const meeting = buildMeetingState();
    expect(() => validateCampaignState(meeting)).not.toThrow();
  });

  it("quiet state after completeMeeting passes validation", () => {
    const meeting = buildMeetingState();
    const result = applyCompleteMeeting(meeting, { expectedMonthOrdinal: MONTH });
    expect(() => validateCampaignState(result.nextState)).not.toThrow();
  });

  it("planning state has null attendance", () => {
    const planning = buildPlanningState();
    if (planning.lifecycle.kind !== "play") throw new Error("unreachable");
    expect(planning.lifecycle.currentMonth.wizardmootAttendance).toBeNull();
  });

  it("story state has null attendance", () => {
    const story = buildStoryState();
    if (story.lifecycle.kind !== "play") throw new Error("unreachable");
    expect(story.lifecycle.currentMonth.wizardmootAttendance).toBeNull();
  });
});
