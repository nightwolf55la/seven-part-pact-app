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
  applySpendOrreryTime,
  deriveUndoTransition,
  deriveRedoTransition,
  validateUndoTransactionCoherence,
  validateRedoTransactionCoherence,
  statesDeepEqual,
  DomainError,
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
  applyAdjustWizardmootAttendance,
  MOVABLE_PLANET_IDS,
  PACT_SEAT_IDS,
  movePlanetByArc,
  advanceAllPlanets,
  asCentidegreePosition,
  buildExportBackup,
  fullyValidateBackup,
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
  OrreryMoveDirection,
  TransitionResult,
  LunarPhase,
  WizardmootHistoryEntry,
} from "../shared/domain";
import type { CampaignHistoryControlV1 } from "../shared/domain/history-control";
import type { PactSeatId } from "../shared/domain/pact-seats";

// ============================================================
// Fixture builders (adapted from C5A/C5B patterns)
// ============================================================

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

const AWAKENING_INDICES: Record<MovablePlanetId, number> = {
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
const NEXT_MONTH_INITS = makeWizardInits(PRESENT_WIZARD_IDS, 100);

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

// --- Helpers ---

function firstAllocId(state: CurrentCampaignState, wizardId: WizardId): AllocationId {
  if (state.lifecycle.kind !== "play") throw new Error("not play");
  const tp = state.lifecycle.currentMonth.timeParticipants.find((t) => t.participant.wizardId === wizardId);
  if (!tp) throw new Error(`no time participant for ${wizardId}`);
  return tp.allocations[0].allocationId;
}

function getAlloc(state: CurrentCampaignState, allocationId: string) {
  if (state.lifecycle.kind !== "play") return null;
  for (const tp of state.lifecycle.currentMonth.timeParticipants) {
    const alloc = tp.allocations.find((a) => a.allocationId === allocationId);
    if (alloc) return { tp, alloc };
  }
  return null;
}

const CAMPAIGN_ID = "cmp_00000000-0000-0000-0000-000000000001";

function makeControl(
  undoStack: number[],
  redoStack: number[] = [],
): CampaignHistoryControlV1 {
  return { historyControlVersion: 1, campaignId: CAMPAIGN_ID, undoStack, redoStack };
}

// ============================================================
// 1. ORRERY TIME — complete-snapshot Undo/Redo
// ============================================================

describe("M4 Recovery D1: Orrery Time Undo/Redo", () => {
  it("Undo restores both planet position and Time allocation together", () => {
    // Build a Story state with one pending Orrery allocation.
    const planning = buildPlanningState();
    const allocId = firstAllocId(planning, wizId(1));
    const scheduled = applyScheduleTime(planning, {
      expectedMonthOrdinal: MONTH, allocationId: allocId,
      destination: { kind: "orrery" }, note: null,
    });
    const priorState = forceAdvancePhase(scheduled.nextState, { expectedMonthOrdinal: MONTH, expectedPhase: "planning" }).nextState;

    if (priorState.lifecycle.kind !== "play") throw new Error("unreachable");
    const planetId: MovablePlanetId = "saturn";
    const direction: OrreryMoveDirection = "forward";
    const priorPos = priorState.lifecycle.orrery[planetId];

    const result = applySpendOrreryTime(priorState, {
      expectedMonthOrdinal: MONTH, allocationId: allocId,
      planetId, direction,
    });
    const acceptedState = result.nextState;

    // Undo: accepted -> prior
    const undoResult = deriveUndoTransition({
      control: makeControl([0, 1]),
      campaignRevision: 1,
      campaignState: acceptedState,
      targetSnapshotState: priorState,
      currentLogicalSnapshotState: acceptedState,
      targetRevisionCommandType: "spend_orrery_time",
    }, CAMPAIGN_ID);

    // Complete snapshot equality
    expect(statesDeepEqual(undoResult.nextState, priorState)).toBe(true);

    // Targeted atomicity assertions
    if (undoResult.nextState.lifecycle.kind !== "play") throw new Error("unreachable");
    expect(undoResult.nextState.lifecycle.orrery[planetId]).toBe(priorPos);
    const undoneAlloc = getAlloc(undoResult.nextState, allocId);
    expect(undoneAlloc!.alloc.resolution).toBe("pending");
  });

  it("Redo restores the complete accepted result (moved planet + spent allocation)", () => {
    const planning = buildPlanningState();
    const allocId = firstAllocId(planning, wizId(1));
    const scheduled = applyScheduleTime(planning, {
      expectedMonthOrdinal: MONTH, allocationId: allocId,
      destination: { kind: "orrery" }, note: null,
    });
    const priorState = forceAdvancePhase(scheduled.nextState, { expectedMonthOrdinal: MONTH, expectedPhase: "planning" }).nextState;

    if (priorState.lifecycle.kind !== "play") throw new Error("unreachable");
    const planetId: MovablePlanetId = "saturn";
    const direction: OrreryMoveDirection = "forward";
    const expectedNewPos = movePlanetByArc(planetId, priorState.lifecycle.orrery[planetId], direction);

    const result = applySpendOrreryTime(priorState, {
      expectedMonthOrdinal: MONTH, allocationId: allocId,
      planetId, direction,
    });
    const acceptedState = result.nextState;

    // Redo: prior -> accepted
    const redoResult = deriveRedoTransition({
      control: makeControl([0], [1]),
      campaignRevision: 2,
      campaignState: priorState,
      targetSnapshotState: acceptedState,
      currentLogicalSnapshotState: priorState,
      targetRevisionCommandType: "spend_orrery_time",
    }, CAMPAIGN_ID);

    expect(statesDeepEqual(redoResult.nextState, acceptedState)).toBe(true);

    if (redoResult.nextState.lifecycle.kind !== "play") throw new Error("unreachable");
    expect(redoResult.nextState.lifecycle.orrery[planetId]).toBe(expectedNewPos);
    const redoneAlloc = getAlloc(redoResult.nextState, allocId);
    expect(redoneAlloc!.alloc.resolution).toBe("spent");
  });
});

// ============================================================
// 2. COMPLETE MEETING — complete-snapshot Undo/Redo
// ============================================================

describe("M4 Recovery D1: Complete Meeting Undo/Redo", () => {
  it("Undo restores phase Meeting, pending Meeting Time, and Wizardmoot attendance together", () => {
    // Build a Meeting state with one pending Meeting Time allocation.
    let planning = buildPlanningState();
    const allocId = firstAllocId(planning, wizId(1));
    planning = applyScheduleTime(planning, {
      expectedMonthOrdinal: MONTH, allocationId: allocId,
      destination: { kind: "meeting" }, note: null,
    }).nextState;

    const story = forceAdvancePhase(planning, { expectedMonthOrdinal: MONTH, expectedPhase: "planning" }).nextState;
    const priorState = forceAdvancePhase(story, { expectedMonthOrdinal: MONTH, expectedPhase: "story" }).nextState;

    // Verify the meeting allocation is still pending before completeMeeting
    const beforeAlloc = getAlloc(priorState, allocId);
    expect(beforeAlloc!.alloc.resolution).toBe("pending");
    expect(beforeAlloc!.alloc.destination).toEqual({ kind: "meeting" });

    // Adjust attendance for a representative participant
    const meetingWithAttendance = applyAdjustWizardmootAttendance(priorState, {
      expectedMonthOrdinal: MONTH,
      wizardId: wizId(1),
      attended: true,
      exceptionReason: "Arrived late",
    }).nextState;

    const result = applyCompleteMeeting(meetingWithAttendance, { expectedMonthOrdinal: MONTH });
    const acceptedState = result.nextState;

    // Undo: accepted -> meeting (with attendance)
    const undoResult = deriveUndoTransition({
      control: makeControl([0, 1]),
      campaignRevision: 1,
      campaignState: acceptedState,
      targetSnapshotState: meetingWithAttendance,
      currentLogicalSnapshotState: acceptedState,
      targetRevisionCommandType: "complete_meeting",
    }, CAMPAIGN_ID);

    expect(statesDeepEqual(undoResult.nextState, meetingWithAttendance)).toBe(true);

    if (undoResult.nextState.lifecycle.kind !== "play") throw new Error("unreachable");
    expect(undoResult.nextState.lifecycle.phase).toBe("meeting");
    const undoneAlloc = getAlloc(undoResult.nextState, allocId);
    expect(undoneAlloc!.alloc.resolution).toBe("pending");
    expect(undoResult.nextState.lifecycle.currentMonth.wizardmootAttendance).not.toBeNull();
    expect(undoResult.nextState.lifecycle.currentMonth.wizardmootAttendance!.length).toBe(6);
  });

  it("Redo restores phase Quiet, spent Meeting Time, and retained attendance", () => {
    let planning = buildPlanningState();
    const allocId = firstAllocId(planning, wizId(1));
    planning = applyScheduleTime(planning, {
      expectedMonthOrdinal: MONTH, allocationId: allocId,
      destination: { kind: "meeting" }, note: null,
    }).nextState;

    const story = forceAdvancePhase(planning, { expectedMonthOrdinal: MONTH, expectedPhase: "planning" }).nextState;
    const meetingState = forceAdvancePhase(story, { expectedMonthOrdinal: MONTH, expectedPhase: "story" }).nextState;

    const result = applyCompleteMeeting(meetingState, { expectedMonthOrdinal: MONTH });
    const acceptedState = result.nextState;

    // Redo: meeting -> accepted (quiet)
    const redoResult = deriveRedoTransition({
      control: makeControl([0], [1]),
      campaignRevision: 2,
      campaignState: meetingState,
      targetSnapshotState: acceptedState,
      currentLogicalSnapshotState: meetingState,
      targetRevisionCommandType: "complete_meeting",
    }, CAMPAIGN_ID);

    expect(statesDeepEqual(redoResult.nextState, acceptedState)).toBe(true);

    if (redoResult.nextState.lifecycle.kind !== "play") throw new Error("unreachable");
    expect(redoResult.nextState.lifecycle.phase).toBe("quiet");
    const redoneAlloc = getAlloc(redoResult.nextState, allocId);
    expect(redoneAlloc!.alloc.resolution).toBe("spent");
    // Attendance is retained (not nullified by completeMeeting)
    expect(redoResult.nextState.lifecycle.currentMonth.wizardmootAttendance).not.toBeNull();
  });
});

// ============================================================
// 3. BEGIN NEXT MONTH — complete-snapshot Undo/Redo
// ============================================================

describe("M4 Recovery D1: Begin Next Month Undo/Redo", () => {
  it("Undo restores the ENTIRE prior Quiet snapshot", () => {
    const priorState = buildQuietState();
    if (priorState.lifecycle.kind !== "play") throw new Error("unreachable");

    // Capture key prior fields for targeted assertions
    const priorMonthOrdinal = priorState.calendar.monthOrdinal;
    const priorOrrery = { ...priorState.lifecycle.orrery };
    const priorHistoryLen = priorState.wizardmootHistory.length;
    const priorAttendance = priorState.lifecycle.currentMonth.wizardmootAttendance;

    const r = applyBeginNextMonth(priorState, { expectedMonthOrdinal: MONTH }, NEXT_MONTH_INITS);
    if (r.outcome !== "applied") throw new Error("expected applied");
    const acceptedState = r.nextState;

    // Undo: accepted -> prior
    const undoResult = deriveUndoTransition({
      control: makeControl([0, 1]),
      campaignRevision: 1,
      campaignState: acceptedState,
      targetSnapshotState: priorState,
      currentLogicalSnapshotState: acceptedState,
      targetRevisionCommandType: "begin_next_month",
    }, CAMPAIGN_ID);

    // Complete snapshot equality
    expect(statesDeepEqual(undoResult.nextState, priorState)).toBe(true);

    // Targeted atomicity assertions
    expect(undoResult.nextState.calendar.monthOrdinal).toBe(priorMonthOrdinal);
    if (undoResult.nextState.lifecycle.kind !== "play") throw new Error("unreachable");
    expect(undoResult.nextState.lifecycle.phase).toBe("quiet");

    // All five movable-planet positions restored
    for (const planetId of MOVABLE_PLANET_IDS) {
      expect(undoResult.nextState.lifecycle.orrery[planetId]).toBe(priorOrrery[planetId]);
    }

    // Prior current-month Time allocations and their resolutions/destinations
    const undoTp = undoResult.nextState.lifecycle.currentMonth.timeParticipants;
    const priorTp = priorState.lifecycle.currentMonth.timeParticipants;
    expect(undoTp.length).toBe(priorTp.length);
    for (let i = 0; i < undoTp.length; i++) {
      expect(undoTp[i].allocations).toEqual(priorTp[i].allocations);
    }

    // Prior Engagement records
    expect(undoResult.nextState.lifecycle.currentMonth.engagements)
      .toEqual(priorState.lifecycle.currentMonth.engagements);

    // Retained current Wizardmoot attendance
    expect(undoResult.nextState.lifecycle.currentMonth.wizardmootAttendance)
      .toEqual(priorAttendance);

    // wizardmootHistory before archival
    expect(undoResult.nextState.wizardmootHistory.length).toBe(priorHistoryLen);
    expect(undoResult.nextState.wizardmootHistory).toEqual(priorState.wizardmootHistory);
  });

  it("Redo restores the ENTIRE accepted next-month snapshot", () => {
    const priorState = buildQuietState();
    if (priorState.lifecycle.kind !== "play") throw new Error("unreachable");

    const priorOrrery = { ...priorState.lifecycle.orrery };
    const expectedAdvancedOrrery = advanceAllPlanets(priorOrrery);

    const r = applyBeginNextMonth(priorState, { expectedMonthOrdinal: MONTH }, NEXT_MONTH_INITS);
    if (r.outcome !== "applied") throw new Error("expected applied");
    const acceptedState = r.nextState;

    // Redo: prior -> accepted
    const redoResult = deriveRedoTransition({
      control: makeControl([0], [1]),
      campaignRevision: 2,
      campaignState: priorState,
      targetSnapshotState: acceptedState,
      currentLogicalSnapshotState: priorState,
      targetRevisionCommandType: "begin_next_month",
    }, CAMPAIGN_ID);

    // Complete snapshot equality
    expect(statesDeepEqual(redoResult.nextState, acceptedState)).toBe(true);

    // Targeted atomicity assertions
    expect(redoResult.nextState.calendar.monthOrdinal).toBe(MONTH + 1);
    if (redoResult.nextState.lifecycle.kind !== "play") throw new Error("unreachable");
    expect(redoResult.nextState.lifecycle.phase).toBe("new_moon");

    // All five advanced planet positions
    for (const planetId of MOVABLE_PLANET_IDS) {
      expect(redoResult.nextState.lifecycle.orrery[planetId]).toBe(expectedAdvancedOrrery[planetId]);
    }

    // Fresh monthly Time participants/allocations
    const redoTp = redoResult.nextState.lifecycle.currentMonth.timeParticipants;
    expect(redoTp.length).toBe(6);
    for (const tp of redoTp) {
      expect(tp.allocations.length).toBe(4);
      for (const alloc of tp.allocations) {
        expect(alloc.destination).toBeNull();
        expect(alloc.resolution).toBe("pending");
      }
      expect(tp.rescheduleAllowance).toBe(1);
      expect(tp.reschedulesUsed).toBe(0);
    }

    // Fresh Engagements
    const redoEng = redoResult.nextState.lifecycle.currentMonth.engagements;
    expect(redoEng.length).toBe(6);
    for (const eng of redoEng) {
      expect(eng.target).toBeNull();
      expect(eng.resolution).toBe("pending");
      expect(eng.linkedTimeAllocationId).toBeNull();
    }

    // Reset reschedule allowances (covered above: rescheduleAllowance=1, reschedulesUsed=0)

    // wizardmootAttendance null
    expect(redoResult.nextState.lifecycle.currentMonth.wizardmootAttendance).toBeNull();

    // Archived prior-month Wizardmoot history
    expect(redoResult.nextState.wizardmootHistory.length).toBe(priorState.wizardmootHistory.length + 1);
    const archivedEntry = redoResult.nextState.wizardmootHistory[redoResult.nextState.wizardmootHistory.length - 1];
    expect(archivedEntry.monthOrdinal).toBe(MONTH);
    expect(archivedEntry.attendance.length).toBe(6);
  });
});

// ============================================================
// 4. HISTORY / ABSOLUTE CHRONOLOGY
// ============================================================

describe("M4 Recovery D1: History / absolute chronology with beginNextMonth", () => {
  it("Undo restores pre-rollover history; Redo restores history with archived absolute ordinal 12", () => {
    const quiet = buildQuietState();
    if (quiet.lifecycle.kind !== "play") throw new Error("unreachable");

    // Inject a pre-existing history entry at absolute ordinal 0.
    const priorEntry: WizardmootHistoryEntry = {
      monthOrdinal: 0 as MonthOrdinal,
      attendance: PRESENT_WIZARD_IDS.map((wid) => ({ wizardId: wid, attended: true })),
    };
    const priorState: CurrentCampaignState = {
      ...quiet,
      wizardmootHistory: [priorEntry],
    };

    // Current Quiet month is absolute 12; accepted next month is 13.
    expect(priorState.calendar.monthOrdinal).toBe(12);

    const r = applyBeginNextMonth(priorState, { expectedMonthOrdinal: MONTH }, NEXT_MONTH_INITS);
    if (r.outcome !== "applied") throw new Error("expected applied");
    const acceptedState = r.nextState;
    expect(acceptedState.calendar.monthOrdinal).toBe(13);

    // Undo: accepted -> prior (history has only ordinal 0)
    const undoResult = deriveUndoTransition({
      control: makeControl([0, 1]),
      campaignRevision: 1,
      campaignState: acceptedState,
      targetSnapshotState: priorState,
      currentLogicalSnapshotState: acceptedState,
      targetRevisionCommandType: "begin_next_month",
    }, CAMPAIGN_ID);

    expect(statesDeepEqual(undoResult.nextState, priorState)).toBe(true);
    const undoOrdinals = undoResult.nextState.wizardmootHistory.map((h) => h.monthOrdinal);
    expect(undoOrdinals).toEqual([0]);
    expect(undoOrdinals).not.toContain(12);

    // Redo: prior -> accepted (history has ordinal 0 AND archived 12)
    const redoResult = deriveRedoTransition({
      control: makeControl([0], [1]),
      campaignRevision: 2,
      campaignState: priorState,
      targetSnapshotState: acceptedState,
      currentLogicalSnapshotState: priorState,
      targetRevisionCommandType: "begin_next_month",
    }, CAMPAIGN_ID);

    expect(statesDeepEqual(redoResult.nextState, acceptedState)).toBe(true);
    const redoOrdinals = redoResult.nextState.wizardmootHistory.map((h) => h.monthOrdinal);
    expect(redoOrdinals).toContain(0);
    expect(redoOrdinals).toContain(12);
    expect(redoResult.nextState.wizardmootHistory.length).toBe(2);
  });
});

// ============================================================
// 5. OPTIONAL: Backup roundtrip of post-beginNextMonth state
// ============================================================

describe("M4 Recovery D1: Optional backup roundtrip of post-beginNextMonth state", () => {
  it("accepted next-month V3 state survives portable backup build/validate roundtrip", async () => {
    const quiet = buildQuietState();
    const r = applyBeginNextMonth(quiet, { expectedMonthOrdinal: MONTH }, NEXT_MONTH_INITS);
    if (r.outcome !== "applied") throw new Error("expected applied");
    const acceptedState = r.nextState;

    const backup = await buildExportBackup(
      {
        sourceCampaignId: CAMPAIGN_ID,
        sourceCampaignRevision: 5,
        sourceLogicalRevision: 3,
        state: acceptedState,
      },
      1700000000000,
    );
    const json = JSON.stringify(backup);
    const result = await fullyValidateBackup(json, acceptedState);
    expect("backup" in result).toBe(true);
    if (!("backup" in result)) return;
    expect(statesDeepEqual(result.backup.state, acceptedState)).toBe(true);
  });
});
