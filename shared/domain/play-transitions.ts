import type { CurrentCampaignState, LunarPhase, PlayLifecycle, MonthlyPlayState } from "./campaign-state";
import type { MonthOrdinal } from "./calendar";
import type { AllocationId, WizardId, EngagementId } from "./ids";
import { isValidAllocationId, isValidEngagementId, isValidWizardId } from "./ids";
import type { TimeDestination, TimeAllocation, TimeParticipant } from "./time-model";
import type { EngagementRecord, EngagementTarget } from "./engagement";
import type {
  CampaignEvent,
  PhaseAdvancedEventV2,
  TimeAllocationScheduledEventV1,
  EngagementTargetChangedEventV1,
  TimeRescheduledEventV1,
  TimeSpentEventV1,
  TimeWastedEventV1,
  OrreryTimeSpentEventV1,
  EngagementTimeCommittedEventV1,
  EngagementResolvedEventV1,
  EngagementRescheduledEventV1,
  WizardmootAttendanceAdjustedEventV1,
  MeetingCompletedEventV1,
} from "./events";
import type { WizardmootAttendance } from "./wizardmoot";
import type { TransitionResult } from "./m3-transitions";
import { DomainError } from "./errors";
import type { MovablePlanetId, OrreryMoveDirection } from "./orrery";
import { movePlanetByArc } from "./orrery";
import { normalizeWarningKeys } from "./command-ids";

// ============================================================
// 1. ADVANCE PHASE (with C5A warning model)
// ============================================================

const PHASE_ADVANCE_MAP: Record<LunarPhase, LunarPhase | null> = {
  new_moon: "visions",
  visions: "planning",
  planning: "story",
  story: "meeting",
  meeting: null,
  quiet: null,
};

// --- Phase transition warning model ---

export interface PhaseTransitionWarning {
  readonly key: string;
  readonly kind: string;
  readonly resourceId: string;
}

export type AdvancePhaseResult =
  | { readonly outcome: "applied" } & TransitionResult
  | { readonly outcome: "warnings"; readonly warnings: readonly PhaseTransitionWarning[] };

function computePlanningToStoryWarnings(month: MonthlyPlayState): readonly PhaseTransitionWarning[] {
  const warnings: PhaseTransitionWarning[] = [];
  for (const tp of month.timeParticipants) {
    for (const alloc of tp.allocations) {
      if (alloc.resolution === "pending" && alloc.destination === null) {
        warnings.push({
          key: `unscheduled_time:${alloc.allocationId}`,
          kind: "unscheduled_time",
          resourceId: alloc.allocationId,
        });
      }
    }
  }
  for (const eng of month.engagements) {
    if (eng.resolution === "pending" && eng.target === null) {
      warnings.push({
        key: `untargeted_engagement:${eng.engagementId}`,
        kind: "untargeted_engagement",
        resourceId: eng.engagementId,
      });
    }
  }
  return warnings;
}

function computeStoryToMeetingWarnings(month: MonthlyPlayState): readonly PhaseTransitionWarning[] {
  const warnings: PhaseTransitionWarning[] = [];
  for (const tp of month.timeParticipants) {
    for (const alloc of tp.allocations) {
      if (alloc.resolution !== "pending") continue;
      if (alloc.destination !== null && alloc.destination.kind === "meeting") continue;
      warnings.push({
        key: `unresolved_time:${alloc.allocationId}`,
        kind: "unresolved_time",
        resourceId: alloc.allocationId,
      });
    }
  }
  for (const eng of month.engagements) {
    if (eng.resolution === "pending") {
      warnings.push({
        key: `unresolved_engagement:${eng.engagementId}`,
        kind: "unresolved_engagement",
        resourceId: eng.engagementId,
      });
    }
  }
  return warnings;
}

export function computePhaseTransitionWarnings(
  fromPhase: LunarPhase,
  month: MonthlyPlayState,
): readonly PhaseTransitionWarning[] {
  switch (fromPhase) {
    case "planning":
      return computePlanningToStoryWarnings(month);
    case "story":
      return computeStoryToMeetingWarnings(month);
    default:
      return [];
  }
}

function deriveExpectedAttendance(wizardId: WizardId, month: MonthlyPlayState): boolean {
  const tp = month.timeParticipants.find((t) => t.participant.wizardId === wizardId);
  if (!tp) return false;
  return tp.allocations.some((a) => a.destination !== null && a.destination.kind === "meeting");
}

function initializeWizardmootAttendance(
  month: MonthlyPlayState,
): readonly WizardmootAttendance[] {
  return month.timeParticipants.map((tp) => {
    const wizardId = tp.participant.wizardId as WizardId;
    const attended = deriveExpectedAttendance(wizardId, month);
    return { wizardId, attended, exceptionReason: null };
  });
}

export interface AdvancePhaseInput {
  readonly expectedMonthOrdinal: MonthOrdinal;
  readonly expectedPhase: LunarPhase;
  readonly acknowledgedWarningKeys?: readonly string[];
}

export function applyAdvancePhase(
  state: CurrentCampaignState,
  input: AdvancePhaseInput,
): AdvancePhaseResult {
  if (state.lifecycle.kind !== "play") {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "advance_phase requires lifecycle kind 'play'");
  }

  const currentMonth = state.calendar.monthOrdinal;
  if (currentMonth === null || currentMonth !== input.expectedMonthOrdinal) {
    throw new DomainError(
      "INVALID_CAMPAIGN_STATE",
      `Expected month ${input.expectedMonthOrdinal} but current is ${currentMonth}`,
    );
  }

  const currentPhase = state.lifecycle.phase;
  if (currentPhase !== input.expectedPhase) {
    throw new DomainError(
      "INVALID_CAMPAIGN_STATE",
      `Expected phase "${input.expectedPhase}" but current is "${currentPhase}"`,
    );
  }

  const nextPhase = PHASE_ADVANCE_MAP[currentPhase];
  if (nextPhase === null) {
    throw new DomainError(
      "INVALID_CAMPAIGN_STATE",
      `Phase "${currentPhase}" cannot be advanced via advancePhase`,
    );
  }

  const currentWarnings = computePhaseTransitionWarnings(currentPhase, state.lifecycle.currentMonth);
  const currentWarningKeys = normalizeWarningKeys(currentWarnings.map((w) => w.key));
  const ackKeys = normalizeWarningKeys(input.acknowledgedWarningKeys ?? []);

  const keysMatch =
    currentWarningKeys.length === ackKeys.length &&
    currentWarningKeys.every((k, i) => k === ackKeys[i]);

  if (!keysMatch) {
    if (currentWarningKeys.length > 0) {
      return { outcome: "warnings", warnings: currentWarnings };
    }
    if (ackKeys.length > 0) {
      throw new DomainError(
        "INVALID_CAMPAIGN_STATE",
        "Acknowledged warnings but current warning set is empty",
      );
    }
  }

  let nextCurrentMonth = state.lifecycle.currentMonth;
  if (currentPhase === "story" && nextPhase === "meeting") {
    const attendance = initializeWizardmootAttendance(state.lifecycle.currentMonth);
    nextCurrentMonth = { ...nextCurrentMonth, wizardmootAttendance: attendance };
  }

  const lifecycle: PlayLifecycle = {
    ...state.lifecycle,
    phase: nextPhase,
    currentMonth: nextCurrentMonth,
  };

  const nextState: CurrentCampaignState = {
    ...state,
    lifecycle,
  };

  const event: PhaseAdvancedEventV2 = {
    type: "phase_advanced",
    version: 2,
    data: {
      monthOrdinal: currentMonth,
      fromPhase: currentPhase,
      toPhase: nextPhase,
      acknowledgedWarningKeys: [...currentWarningKeys],
    },
  };

  return { outcome: "applied", nextState, events: [event] };
}

// ============================================================
// 2. SCHEDULE TIME
// ============================================================

export interface ScheduleTimeInput {
  readonly expectedMonthOrdinal: MonthOrdinal;
  readonly allocationId: AllocationId;
  readonly destination: TimeDestination | null;
  readonly note: string | null;
}

export function applyScheduleTime(
  state: CurrentCampaignState,
  input: ScheduleTimeInput,
): TransitionResult {
  if (state.lifecycle.kind !== "play") {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "schedule_time requires lifecycle kind 'play'");
  }

  if (state.lifecycle.phase !== "planning") {
    throw new DomainError(
      "INVALID_CAMPAIGN_STATE",
      `schedule_time is only allowed during planning, current phase is "${state.lifecycle.phase}"`,
    );
  }

  const currentMonth = state.calendar.monthOrdinal;
  if (currentMonth === null || currentMonth !== input.expectedMonthOrdinal) {
    throw new DomainError(
      "INVALID_CAMPAIGN_STATE",
      `Expected month ${input.expectedMonthOrdinal} but current is ${currentMonth}`,
    );
  }

  if (!isValidAllocationId(input.allocationId)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Invalid allocationId: ${input.allocationId}`);
  }

  validateTimeDestination(input.destination);

  const { timeParticipants, engagements } = state.lifecycle.currentMonth;

  let tpIndex = -1;
  let allocIndex = -1;
  for (let i = 0; i < timeParticipants.length; i++) {
    const tp = timeParticipants[i];
    for (let j = 0; j < tp.allocations.length; j++) {
      if (tp.allocations[j].allocationId === input.allocationId) {
        tpIndex = i;
        allocIndex = j;
        break;
      }
    }
    if (tpIndex >= 0) break;
  }

  if (tpIndex < 0) {
    throw new DomainError(
      "INVALID_CAMPAIGN_STATE",
      `Allocation ${input.allocationId} not found in current month`,
    );
  }

  const tp = timeParticipants[tpIndex];
  const alloc = tp.allocations[allocIndex];

  if (alloc.resolution !== "pending") {
    throw new DomainError(
      "INVALID_CAMPAIGN_STATE",
      `Allocation ${input.allocationId} is ${alloc.resolution}, not pending`,
    );
  }

  const wizardId = tp.participant.wizardId as WizardId;
  const previousDestination = alloc.destination;

  const newAllocations: TimeAllocation[] = tp.allocations.map((a, j) =>
    j === allocIndex
      ? { ...a, destination: input.destination, note: input.note }
      : a,
  );

  const newTimeParticipants: TimeParticipant[] = timeParticipants.map((t, i) =>
    i === tpIndex ? { ...t, allocations: newAllocations } : t,
  );

  let newEngagements = engagements;

  // Handle engagement linking
  if (previousDestination !== null && previousDestination.kind === "engagement") {
    const oldEngId = previousDestination.engagementId;
    const isStillSameEngagement =
      input.destination !== null &&
      input.destination.kind === "engagement" &&
      input.destination.engagementId === oldEngId;
    if (!isStillSameEngagement) {
      newEngagements = clearEngagementLink(newEngagements, oldEngId, input.allocationId);
    }
  }

  if (input.destination !== null && input.destination.kind === "engagement") {
    const engId = input.destination.engagementId;
    if (!isValidEngagementId(engId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `Invalid engagementId in destination: ${engId}`);
    }
    const engIdx = newEngagements.findIndex((e) => e.engagementId === engId);
    if (engIdx < 0) {
      throw new DomainError(
        "INVALID_CAMPAIGN_STATE",
        `Engagement ${engId} not found in current month`,
      );
    }
    const eng = newEngagements[engIdx];
    if (eng.actingWizardId !== wizardId) {
      throw new DomainError(
        "INVALID_CAMPAIGN_STATE",
        `Engagement ${engId} belongs to wizard ${eng.actingWizardId}, not ${wizardId}`,
      );
    }
    if (eng.resolution !== "pending") {
      throw new DomainError(
        "INVALID_CAMPAIGN_STATE",
        `Engagement ${engId} is ${eng.resolution}, not pending`,
      );
    }
    if (eng.linkedTimeAllocationId !== null && eng.linkedTimeAllocationId !== input.allocationId) {
      throw new DomainError(
        "INVALID_CAMPAIGN_STATE",
        `Engagement ${engId} is already linked to allocation ${eng.linkedTimeAllocationId}`,
      );
    }
    newEngagements = newEngagements.map((e, i) =>
      i === engIdx ? { ...e, linkedTimeAllocationId: input.allocationId } : e,
    );
  }

  const currentMonthState: MonthlyPlayState = {
    ...state.lifecycle.currentMonth,
    timeParticipants: newTimeParticipants,
    engagements: newEngagements,
  };

  const lifecycle: PlayLifecycle = {
    ...state.lifecycle,
    currentMonth: currentMonthState,
  };

  const nextState: CurrentCampaignState = {
    ...state,
    lifecycle,
  };

  const event: TimeAllocationScheduledEventV1 = {
    type: "time_allocation_scheduled",
    version: 1,
    data: {
      monthOrdinal: currentMonth,
      allocationId: input.allocationId,
      previousDestination,
      newDestination: input.destination,
      note: input.note,
    },
  };

  return { nextState, events: [event] };
}

function clearEngagementLink(
  engagements: readonly EngagementRecord[],
  engagementId: string,
  allocationId: AllocationId,
): readonly EngagementRecord[] {
  return engagements.map((e) =>
    e.engagementId === engagementId && e.linkedTimeAllocationId === allocationId
      ? { ...e, linkedTimeAllocationId: null }
      : e,
  );
}

function validateTimeDestination(dest: TimeDestination | null): void {
  if (dest === null) return;

  switch (dest.kind) {
    case "companion":
      if (dest.element.length === 0) {
        throw new DomainError("INVALID_CAMPAIGN_STATE", "companion destination requires non-empty element");
      }
      break;
    case "map_isle_sanctum":
    case "familiar":
    case "orrery":
    case "meeting":
    case "domain":
      break;
    case "engagement":
      if (!isValidEngagementId(dest.engagementId)) {
        throw new DomainError("INVALID_CAMPAIGN_STATE", `Invalid engagementId in destination: ${dest.engagementId}`);
      }
      break;
    case "special_use":
      if (dest.description.trim().length === 0) {
        throw new DomainError("INVALID_CAMPAIGN_STATE", "special_use destination requires non-empty description");
      }
      break;
  }
}

// ============================================================
// 3. SET ENGAGEMENT TARGET
// ============================================================

export interface SetEngagementTargetInput {
  readonly expectedMonthOrdinal: MonthOrdinal;
  readonly engagementId: EngagementId;
  readonly target: EngagementTarget | null;
}

export function applySetEngagementTarget(
  state: CurrentCampaignState,
  input: SetEngagementTargetInput,
): TransitionResult {
  if (state.lifecycle.kind !== "play") {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "set_engagement_target requires lifecycle kind 'play'");
  }

  if (state.lifecycle.phase !== "planning") {
    throw new DomainError(
      "INVALID_CAMPAIGN_STATE",
      `set_engagement_target is only allowed during planning, current phase is "${state.lifecycle.phase}"`,
    );
  }

  const currentMonth = state.calendar.monthOrdinal;
  if (currentMonth === null || currentMonth !== input.expectedMonthOrdinal) {
    throw new DomainError(
      "INVALID_CAMPAIGN_STATE",
      `Expected month ${input.expectedMonthOrdinal} but current is ${currentMonth}`,
    );
  }

  if (!isValidEngagementId(input.engagementId)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Invalid engagementId: ${input.engagementId}`);
  }

  validateEngagementTarget(input.target, state);

  const { engagements } = state.lifecycle.currentMonth;

  const engIdx = engagements.findIndex((e) => e.engagementId === input.engagementId);
  if (engIdx < 0) {
    throw new DomainError(
      "INVALID_CAMPAIGN_STATE",
      `Engagement ${input.engagementId} not found in current month`,
    );
  }

  const eng = engagements[engIdx];
  if (eng.resolution !== "pending") {
    throw new DomainError(
      "INVALID_CAMPAIGN_STATE",
      `Engagement ${input.engagementId} is ${eng.resolution}, not pending`,
    );
  }

  const previousTarget = eng.target;

  const newEngagements: EngagementRecord[] = engagements.map((e, i) =>
    i === engIdx ? { ...e, target: input.target } : e,
  );

  const currentMonthState: MonthlyPlayState = {
    ...state.lifecycle.currentMonth,
    engagements: newEngagements,
  };

  const lifecycle: PlayLifecycle = {
    ...state.lifecycle,
    currentMonth: currentMonthState,
  };

  const nextState: CurrentCampaignState = {
    ...state,
    lifecycle,
  };

  const event: EngagementTargetChangedEventV1 = {
    type: "engagement_target_changed",
    version: 1,
    data: {
      monthOrdinal: currentMonth,
      engagementId: input.engagementId,
      actingWizardId: eng.actingWizardId,
      previousTarget,
      newTarget: input.target,
    },
  };

  return { nextState, events: [event] };
}

function validateEngagementTarget(
  target: EngagementTarget | null,
  state: CurrentCampaignState,
): void {
  if (target === null) return;

  switch (target.kind) {
    case "wizard":
      if (!isValidWizardId(target.wizardId)) {
        throw new DomainError("INVALID_CAMPAIGN_STATE", `Invalid wizardId in target: ${target.wizardId}`);
      }
      const exists = state.wizards.some((w) => w.wizardId === target.wizardId);
      if (!exists) {
        throw new DomainError(
          "INVALID_CAMPAIGN_STATE",
          `Wizard ${target.wizardId} does not exist`,
        );
      }
      break;
    case "self":
    case "familiar":
      break;
    case "named_character":
      if (target.name.trim().length === 0) {
        throw new DomainError("INVALID_CAMPAIGN_STATE", "named_character target requires non-empty name");
      }
      break;
  }
}

// ============================================================
// 4. RESCHEDULE TIME (Story)
// ============================================================

export interface RescheduleTimeInput {
  readonly expectedMonthOrdinal: MonthOrdinal;
  readonly allocationId: AllocationId;
  readonly destination: TimeDestination | null;
  readonly note: string | null;
}

export function applyRescheduleTime(
  state: CurrentCampaignState,
  input: RescheduleTimeInput,
): TransitionResult {
  if (state.lifecycle.kind !== "play") {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "reschedule_time requires lifecycle kind 'play'");
  }

  if (state.lifecycle.phase !== "story") {
    throw new DomainError(
      "INVALID_CAMPAIGN_STATE",
      `reschedule_time is only allowed during story, current phase is "${state.lifecycle.phase}"`,
    );
  }

  const currentMonth = state.calendar.monthOrdinal;
  if (currentMonth === null || currentMonth !== input.expectedMonthOrdinal) {
    throw new DomainError(
      "INVALID_CAMPAIGN_STATE",
      `Expected month ${input.expectedMonthOrdinal} but current is ${currentMonth}`,
    );
  }

  if (!isValidAllocationId(input.allocationId)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Invalid allocationId: ${input.allocationId}`);
  }

  validateTimeDestination(input.destination);

  const { timeParticipants, engagements } = state.lifecycle.currentMonth;

  let tpIndex = -1;
  let allocIndex = -1;
  for (let i = 0; i < timeParticipants.length; i++) {
    const tp = timeParticipants[i];
    for (let j = 0; j < tp.allocations.length; j++) {
      if (tp.allocations[j].allocationId === input.allocationId) {
        tpIndex = i;
        allocIndex = j;
        break;
      }
    }
    if (tpIndex >= 0) break;
  }

  if (tpIndex < 0) {
    throw new DomainError(
      "INVALID_CAMPAIGN_STATE",
      `Allocation ${input.allocationId} not found in current month`,
    );
  }

  const tp = timeParticipants[tpIndex];
  const alloc = tp.allocations[allocIndex];

  if (alloc.resolution !== "pending") {
    throw new DomainError(
      "INVALID_CAMPAIGN_STATE",
      `Allocation ${input.allocationId} is ${alloc.resolution}, not pending`,
    );
  }

  if (tp.reschedulesUsed >= tp.rescheduleAllowance) {
    throw new DomainError(
      "INVALID_CAMPAIGN_STATE",
      `Wizard ${tp.participant.wizardId} has exhausted reschedule allowance (${tp.reschedulesUsed}/${tp.rescheduleAllowance})`,
    );
  }

  const wizardId = tp.participant.wizardId as WizardId;
  const previousDestination = alloc.destination;

  const newAllocations: TimeAllocation[] = tp.allocations.map((a, j) =>
    j === allocIndex
      ? { ...a, destination: input.destination, note: input.note }
      : a,
  );

  const newTimeParticipants: TimeParticipant[] = timeParticipants.map((t, i) =>
    i === tpIndex
      ? { ...t, allocations: newAllocations, reschedulesUsed: t.reschedulesUsed + 1 }
      : t,
  );

  let newEngagements = engagements;

  if (previousDestination !== null && previousDestination.kind === "engagement") {
    const oldEngId = previousDestination.engagementId;
    const isStillSameEngagement =
      input.destination !== null &&
      input.destination.kind === "engagement" &&
      input.destination.engagementId === oldEngId;
    if (!isStillSameEngagement) {
      newEngagements = clearEngagementLink(newEngagements, oldEngId, input.allocationId);
    }
  }

  if (input.destination !== null && input.destination.kind === "engagement") {
    const engId = input.destination.engagementId;
    if (!isValidEngagementId(engId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `Invalid engagementId in destination: ${engId}`);
    }
    const engIdx = newEngagements.findIndex((e) => e.engagementId === engId);
    if (engIdx < 0) {
      throw new DomainError(
        "INVALID_CAMPAIGN_STATE",
        `Engagement ${engId} not found in current month`,
      );
    }
    const eng = newEngagements[engIdx];
    if (eng.actingWizardId !== wizardId) {
      throw new DomainError(
        "INVALID_CAMPAIGN_STATE",
        `Engagement ${engId} belongs to wizard ${eng.actingWizardId}, not ${wizardId}`,
      );
    }
    if (eng.resolution !== "pending") {
      throw new DomainError(
        "INVALID_CAMPAIGN_STATE",
        `Engagement ${engId} is ${eng.resolution}, not pending`,
      );
    }
    if (eng.linkedTimeAllocationId !== null && eng.linkedTimeAllocationId !== input.allocationId) {
      throw new DomainError(
        "INVALID_CAMPAIGN_STATE",
        `Engagement ${engId} is already linked to allocation ${eng.linkedTimeAllocationId}`,
      );
    }
    newEngagements = newEngagements.map((e, i) =>
      i === engIdx ? { ...e, linkedTimeAllocationId: input.allocationId } : e,
    );
  }

  const currentMonthState: MonthlyPlayState = {
    ...state.lifecycle.currentMonth,
    timeParticipants: newTimeParticipants,
    engagements: newEngagements,
  };

  const lifecycle: PlayLifecycle = {
    ...state.lifecycle,
    currentMonth: currentMonthState,
  };

  const nextState: CurrentCampaignState = {
    ...state,
    lifecycle,
  };

  const event: TimeRescheduledEventV1 = {
    type: "time_rescheduled",
    version: 1,
    data: {
      monthOrdinal: currentMonth,
      allocationId: input.allocationId,
      previousDestination,
      newDestination: input.destination,
      note: input.note,
    },
  };

  return { nextState, events: [event] };
}

// ============================================================
// 5. SPEND MANUAL TIME (Story)
// ============================================================

export interface SpendManualTimeInput {
  readonly expectedMonthOrdinal: MonthOrdinal;
  readonly allocationId: AllocationId;
}

const MANUAL_SPEND_KINDS = new Set([
  "companion",
  "map_isle_sanctum",
  "familiar",
  "domain",
  "special_use",
]);

export function applySpendManualTime(
  state: CurrentCampaignState,
  input: SpendManualTimeInput,
): TransitionResult {
  if (state.lifecycle.kind !== "play") {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "spend_manual_time requires lifecycle kind 'play'");
  }

  if (state.lifecycle.phase !== "story") {
    throw new DomainError(
      "INVALID_CAMPAIGN_STATE",
      `spend_manual_time is only allowed during story, current phase is "${state.lifecycle.phase}"`,
    );
  }

  const currentMonth = state.calendar.monthOrdinal;
  if (currentMonth === null || currentMonth !== input.expectedMonthOrdinal) {
    throw new DomainError(
      "INVALID_CAMPAIGN_STATE",
      `Expected month ${input.expectedMonthOrdinal} but current is ${currentMonth}`,
    );
  }

  if (!isValidAllocationId(input.allocationId)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Invalid allocationId: ${input.allocationId}`);
  }

  const { timeParticipants } = state.lifecycle.currentMonth;

  let tpIndex = -1;
  let allocIndex = -1;
  for (let i = 0; i < timeParticipants.length; i++) {
    const tp = timeParticipants[i];
    for (let j = 0; j < tp.allocations.length; j++) {
      if (tp.allocations[j].allocationId === input.allocationId) {
        tpIndex = i;
        allocIndex = j;
        break;
      }
    }
    if (tpIndex >= 0) break;
  }

  if (tpIndex < 0) {
    throw new DomainError(
      "INVALID_CAMPAIGN_STATE",
      `Allocation ${input.allocationId} not found in current month`,
    );
  }

  const tp = timeParticipants[tpIndex];
  const alloc = tp.allocations[allocIndex];

  if (alloc.resolution !== "pending") {
    throw new DomainError(
      "INVALID_CAMPAIGN_STATE",
      `Allocation ${input.allocationId} is ${alloc.resolution}, not pending`,
    );
  }

  if (alloc.destination === null) {
    throw new DomainError(
      "INVALID_CAMPAIGN_STATE",
      `Allocation ${input.allocationId} has no destination; cannot manually spend`,
    );
  }

  if (!MANUAL_SPEND_KINDS.has(alloc.destination.kind)) {
    throw new DomainError(
      "INVALID_CAMPAIGN_STATE",
      `spend_manual_time cannot resolve destination kind "${alloc.destination.kind}"`,
    );
  }

  const newAllocations: TimeAllocation[] = tp.allocations.map((a, j) =>
    j === allocIndex ? { ...a, resolution: "spent" } : a,
  );

  const newTimeParticipants: TimeParticipant[] = timeParticipants.map((t, i) =>
    i === tpIndex ? { ...t, allocations: newAllocations } : t,
  );

  const currentMonthState: MonthlyPlayState = {
    ...state.lifecycle.currentMonth,
    timeParticipants: newTimeParticipants,
  };

  const lifecycle: PlayLifecycle = {
    ...state.lifecycle,
    currentMonth: currentMonthState,
  };

  const nextState: CurrentCampaignState = {
    ...state,
    lifecycle,
  };

  const event: TimeSpentEventV1 = {
    type: "time_spent",
    version: 1,
    data: {
      monthOrdinal: currentMonth,
      allocationId: input.allocationId,
      destination: alloc.destination,
    },
  };

  return { nextState, events: [event] };
}

// ============================================================
// 6. WASTE TIME (Story)
// ============================================================

export interface WasteTimeInput {
  readonly expectedMonthOrdinal: MonthOrdinal;
  readonly allocationId: AllocationId;
}

export function applyWasteTime(
  state: CurrentCampaignState,
  input: WasteTimeInput,
): TransitionResult {
  if (state.lifecycle.kind !== "play") {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "waste_time requires lifecycle kind 'play'");
  }

  if (state.lifecycle.phase !== "story") {
    throw new DomainError(
      "INVALID_CAMPAIGN_STATE",
      `waste_time is only allowed during story, current phase is "${state.lifecycle.phase}"`,
    );
  }

  const currentMonth = state.calendar.monthOrdinal;
  if (currentMonth === null || currentMonth !== input.expectedMonthOrdinal) {
    throw new DomainError(
      "INVALID_CAMPAIGN_STATE",
      `Expected month ${input.expectedMonthOrdinal} but current is ${currentMonth}`,
    );
  }

  if (!isValidAllocationId(input.allocationId)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Invalid allocationId: ${input.allocationId}`);
  }

  const { timeParticipants } = state.lifecycle.currentMonth;

  let tpIndex = -1;
  let allocIndex = -1;
  for (let i = 0; i < timeParticipants.length; i++) {
    const tp = timeParticipants[i];
    for (let j = 0; j < tp.allocations.length; j++) {
      if (tp.allocations[j].allocationId === input.allocationId) {
        tpIndex = i;
        allocIndex = j;
        break;
      }
    }
    if (tpIndex >= 0) break;
  }

  if (tpIndex < 0) {
    throw new DomainError(
      "INVALID_CAMPAIGN_STATE",
      `Allocation ${input.allocationId} not found in current month`,
    );
  }

  const tp = timeParticipants[tpIndex];
  const alloc = tp.allocations[allocIndex];

  if (alloc.resolution !== "pending") {
    throw new DomainError(
      "INVALID_CAMPAIGN_STATE",
      `Allocation ${input.allocationId} is ${alloc.resolution}, not pending`,
    );
  }

  if (alloc.destination !== null && alloc.destination.kind === "meeting") {
    throw new DomainError(
      "INVALID_CAMPAIGN_STATE",
      `Allocation ${input.allocationId} is scheduled for Meeting Time; cannot be manually wasted during Story`,
    );
  }

  const newAllocations: TimeAllocation[] = tp.allocations.map((a, j) =>
    j === allocIndex ? { ...a, resolution: "wasted" } : a,
  );

  const newTimeParticipants: TimeParticipant[] = timeParticipants.map((t, i) =>
    i === tpIndex ? { ...t, allocations: newAllocations } : t,
  );

  const currentMonthState: MonthlyPlayState = {
    ...state.lifecycle.currentMonth,
    timeParticipants: newTimeParticipants,
  };

  const lifecycle: PlayLifecycle = {
    ...state.lifecycle,
    currentMonth: currentMonthState,
  };

  const nextState: CurrentCampaignState = {
    ...state,
    lifecycle,
  };

  const event: TimeWastedEventV1 = {
    type: "time_wasted",
    version: 1,
    data: {
      monthOrdinal: currentMonth,
      allocationId: input.allocationId,
      destination: alloc.destination,
      note: alloc.note,
    },
  };

  return { nextState, events: [event] };
}

// ============================================================
// 7. SPEND ORRERY TIME (Story)
// ============================================================

export interface SpendOrreryTimeInput {
  readonly expectedMonthOrdinal: MonthOrdinal;
  readonly allocationId: AllocationId;
  readonly planetId: MovablePlanetId;
  readonly direction: OrreryMoveDirection;
}

export function applySpendOrreryTime(
  state: CurrentCampaignState,
  input: SpendOrreryTimeInput,
): TransitionResult {
  if (state.lifecycle.kind !== "play") {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "spend_orrery_time requires lifecycle kind 'play'");
  }

  if (state.lifecycle.phase !== "story") {
    throw new DomainError(
      "INVALID_CAMPAIGN_STATE",
      `spend_orrery_time is only allowed during story, current phase is "${state.lifecycle.phase}"`,
    );
  }

  const currentMonth = state.calendar.monthOrdinal;
  if (currentMonth === null || currentMonth !== input.expectedMonthOrdinal) {
    throw new DomainError(
      "INVALID_CAMPAIGN_STATE",
      `Expected month ${input.expectedMonthOrdinal} but current is ${currentMonth}`,
    );
  }

  if (!isValidAllocationId(input.allocationId)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Invalid allocationId: ${input.allocationId}`);
  }

  const { timeParticipants } = state.lifecycle.currentMonth;

  let tpIndex = -1;
  let allocIndex = -1;
  for (let i = 0; i < timeParticipants.length; i++) {
    const tp = timeParticipants[i];
    for (let j = 0; j < tp.allocations.length; j++) {
      if (tp.allocations[j].allocationId === input.allocationId) {
        tpIndex = i;
        allocIndex = j;
        break;
      }
    }
    if (tpIndex >= 0) break;
  }

  if (tpIndex < 0) {
    throw new DomainError(
      "INVALID_CAMPAIGN_STATE",
      `Allocation ${input.allocationId} not found in current month`,
    );
  }

  const tp = timeParticipants[tpIndex];
  const alloc = tp.allocations[allocIndex];

  if (alloc.resolution !== "pending") {
    throw new DomainError(
      "INVALID_CAMPAIGN_STATE",
      `Allocation ${input.allocationId} is ${alloc.resolution}, not pending`,
    );
  }

  if (alloc.destination === null || alloc.destination.kind !== "orrery") {
    throw new DomainError(
      "INVALID_CAMPAIGN_STATE",
      `Allocation ${input.allocationId} destination is not orrery`,
    );
  }

  const currentPos = state.lifecycle.orrery[input.planetId];
  const newPosition = movePlanetByArc(input.planetId, currentPos, input.direction);

  const newOrrery = {
    ...state.lifecycle.orrery,
    [input.planetId]: newPosition,
  };

  const newAllocations: TimeAllocation[] = tp.allocations.map((a, j) =>
    j === allocIndex ? { ...a, resolution: "spent" } : a,
  );

  const newTimeParticipants: TimeParticipant[] = timeParticipants.map((t, i) =>
    i === tpIndex ? { ...t, allocations: newAllocations } : t,
  );

  const currentMonthState: MonthlyPlayState = {
    ...state.lifecycle.currentMonth,
    timeParticipants: newTimeParticipants,
  };

  const lifecycle: PlayLifecycle = {
    ...state.lifecycle,
    orrery: newOrrery,
    currentMonth: currentMonthState,
  };

  const nextState: CurrentCampaignState = {
    ...state,
    lifecycle,
  };

  const event: OrreryTimeSpentEventV1 = {
    type: "orrery_time_spent",
    version: 1,
    data: {
      monthOrdinal: currentMonth,
      allocationId: input.allocationId,
      planetId: input.planetId,
      direction: input.direction,
      previousPosition: currentPos,
      newPosition,
    },
  };

  return { nextState, events: [event] };
}

// ============================================================
// 8. COMMIT TIME TO ENGAGEMENT (Story)
// ============================================================

export interface CommitTimeToEngagementInput {
  readonly expectedMonthOrdinal: MonthOrdinal;
  readonly allocationId: AllocationId;
  readonly engagementId: EngagementId;
}

export function applyCommitTimeToEngagement(
  state: CurrentCampaignState,
  input: CommitTimeToEngagementInput,
): TransitionResult {
  if (state.lifecycle.kind !== "play") {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "commit_time_to_engagement requires lifecycle kind 'play'");
  }

  if (state.lifecycle.phase !== "story") {
    throw new DomainError(
      "INVALID_CAMPAIGN_STATE",
      `commit_time_to_engagement is only allowed during story, current phase is "${state.lifecycle.phase}"`,
    );
  }

  const currentMonth = state.calendar.monthOrdinal;
  if (currentMonth === null || currentMonth !== input.expectedMonthOrdinal) {
    throw new DomainError(
      "INVALID_CAMPAIGN_STATE",
      `Expected month ${input.expectedMonthOrdinal} but current is ${currentMonth}`,
    );
  }

  if (!isValidAllocationId(input.allocationId)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Invalid allocationId: ${input.allocationId}`);
  }

  if (!isValidEngagementId(input.engagementId)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Invalid engagementId: ${input.engagementId}`);
  }

  const { timeParticipants, engagements } = state.lifecycle.currentMonth;

  let tpIndex = -1;
  let allocIndex = -1;
  for (let i = 0; i < timeParticipants.length; i++) {
    const tp = timeParticipants[i];
    for (let j = 0; j < tp.allocations.length; j++) {
      if (tp.allocations[j].allocationId === input.allocationId) {
        tpIndex = i;
        allocIndex = j;
        break;
      }
    }
    if (tpIndex >= 0) break;
  }

  if (tpIndex < 0) {
    throw new DomainError(
      "INVALID_CAMPAIGN_STATE",
      `Allocation ${input.allocationId} not found in current month`,
    );
  }

  const tp = timeParticipants[tpIndex];
  const alloc = tp.allocations[allocIndex];

  if (alloc.resolution !== "pending") {
    throw new DomainError(
      "INVALID_CAMPAIGN_STATE",
      `Allocation ${input.allocationId} is ${alloc.resolution}, not pending`,
    );
  }

  if (tp.reschedulesUsed >= tp.rescheduleAllowance) {
    throw new DomainError(
      "INVALID_CAMPAIGN_STATE",
      `Wizard ${tp.participant.wizardId} has exhausted reschedule allowance (${tp.reschedulesUsed}/${tp.rescheduleAllowance})`,
    );
  }

  const wizardId = tp.participant.wizardId as WizardId;

  const engIdx = engagements.findIndex((e) => e.engagementId === input.engagementId);
  if (engIdx < 0) {
    throw new DomainError(
      "INVALID_CAMPAIGN_STATE",
      `Engagement ${input.engagementId} not found in current month`,
    );
  }

  const eng = engagements[engIdx];
  if (eng.actingWizardId !== wizardId) {
    throw new DomainError(
      "INVALID_CAMPAIGN_STATE",
      `Engagement ${input.engagementId} belongs to wizard ${eng.actingWizardId}, not ${wizardId}`,
    );
  }

  if (eng.resolution !== "pending") {
    throw new DomainError(
      "INVALID_CAMPAIGN_STATE",
      `Engagement ${input.engagementId} is ${eng.resolution}, not pending`,
    );
  }

  if (eng.linkedTimeAllocationId !== null && eng.linkedTimeAllocationId !== input.allocationId) {
    throw new DomainError(
      "INVALID_CAMPAIGN_STATE",
      `Engagement ${input.engagementId} is already linked to allocation ${eng.linkedTimeAllocationId}`,
    );
  }

  // Reject a distinct request that would merely re-consume an already-completed commit.
  // The allocation already points to this engagement and the engagement already points back.
  if (
    eng.linkedTimeAllocationId === input.allocationId &&
    alloc.destination !== null &&
    alloc.destination.kind === "engagement" &&
    alloc.destination.engagementId === input.engagementId
  ) {
    throw new DomainError(
      "INVALID_CAMPAIGN_STATE",
      `Allocation ${input.allocationId} is already coherently linked to engagement ${input.engagementId}`,
    );
  }

  const previousDestination = alloc.destination;

  let newEngagements = engagements;

  // Clear prior engagement link if moving away from a different engagement
  if (previousDestination !== null && previousDestination.kind === "engagement") {
    const oldEngId = previousDestination.engagementId;
    if (oldEngId !== input.engagementId) {
      newEngagements = clearEngagementLink(newEngagements, oldEngId, input.allocationId);
    }
  }

  // Link the target engagement
  const targetIdx = newEngagements.findIndex((e) => e.engagementId === input.engagementId);
  newEngagements = newEngagements.map((e, i) =>
    i === targetIdx ? { ...e, linkedTimeAllocationId: input.allocationId } : e,
  );

  const newDestination: TimeDestination = { kind: "engagement", engagementId: input.engagementId };

  const newAllocations: TimeAllocation[] = tp.allocations.map((a, j) =>
    j === allocIndex
      ? { ...a, destination: newDestination }
      : a,
  );

  const newTimeParticipants: TimeParticipant[] = timeParticipants.map((t, i) =>
    i === tpIndex
      ? { ...t, allocations: newAllocations, reschedulesUsed: t.reschedulesUsed + 1 }
      : t,
  );

  const currentMonthState: MonthlyPlayState = {
    ...state.lifecycle.currentMonth,
    timeParticipants: newTimeParticipants,
    engagements: newEngagements,
  };

  const lifecycle: PlayLifecycle = {
    ...state.lifecycle,
    currentMonth: currentMonthState,
  };

  const nextState: CurrentCampaignState = {
    ...state,
    lifecycle,
  };

  const event: EngagementTimeCommittedEventV1 = {
    type: "engagement_time_committed",
    version: 1,
    data: {
      monthOrdinal: currentMonth,
      allocationId: input.allocationId,
      engagementId: input.engagementId,
      previousDestination,
    },
  };

  return { nextState, events: [event] };
}

// ============================================================
// 9. RESOLVE ENGAGEMENT (Story)
// ============================================================

export interface ResolveEngagementInput {
  readonly expectedMonthOrdinal: MonthOrdinal;
  readonly engagementId: EngagementId;
}

export function applyResolveEngagement(
  state: CurrentCampaignState,
  input: ResolveEngagementInput,
): TransitionResult {
  if (state.lifecycle.kind !== "play") {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "resolve_engagement requires lifecycle kind 'play'");
  }

  if (state.lifecycle.phase !== "story") {
    throw new DomainError(
      "INVALID_CAMPAIGN_STATE",
      `resolve_engagement is only allowed during story, current phase is "${state.lifecycle.phase}"`,
    );
  }

  const currentMonth = state.calendar.monthOrdinal;
  if (currentMonth === null || currentMonth !== input.expectedMonthOrdinal) {
    throw new DomainError(
      "INVALID_CAMPAIGN_STATE",
      `Expected month ${input.expectedMonthOrdinal} but current is ${currentMonth}`,
    );
  }

  if (!isValidEngagementId(input.engagementId)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Invalid engagementId: ${input.engagementId}`);
  }

  const { timeParticipants, engagements } = state.lifecycle.currentMonth;

  const engIdx = engagements.findIndex((e) => e.engagementId === input.engagementId);
  if (engIdx < 0) {
    throw new DomainError(
      "INVALID_CAMPAIGN_STATE",
      `Engagement ${input.engagementId} not found in current month`,
    );
  }

  const eng = engagements[engIdx];
  if (eng.resolution !== "pending") {
    throw new DomainError(
      "INVALID_CAMPAIGN_STATE",
      `Engagement ${input.engagementId} is ${eng.resolution}, not pending`,
    );
  }

  let linkedAllocationId: string | null = eng.linkedTimeAllocationId;
  let newTimeParticipants = timeParticipants;

  if (linkedAllocationId !== null) {
    // Recheck the linked allocation
    let tpIndex = -1;
    let allocIndex = -1;
    for (let i = 0; i < timeParticipants.length; i++) {
      const tp = timeParticipants[i];
      for (let j = 0; j < tp.allocations.length; j++) {
        if (tp.allocations[j].allocationId === linkedAllocationId) {
          tpIndex = i;
          allocIndex = j;
          break;
        }
      }
      if (tpIndex >= 0) break;
    }

    if (tpIndex < 0) {
      throw new DomainError(
        "INVALID_CAMPAIGN_STATE",
        `Linked allocation ${linkedAllocationId} not found for engagement ${input.engagementId}`,
      );
    }

    const tp = timeParticipants[tpIndex];
    const alloc = tp.allocations[allocIndex];

    if (tp.participant.wizardId !== eng.actingWizardId) {
      throw new DomainError(
        "INVALID_CAMPAIGN_STATE",
        `Linked allocation ${linkedAllocationId} belongs to wizard ${tp.participant.wizardId}, not ${eng.actingWizardId}`,
      );
    }

    if (alloc.destination === null || alloc.destination.kind !== "engagement" || alloc.destination.engagementId !== input.engagementId) {
      throw new DomainError(
        "INVALID_CAMPAIGN_STATE",
        `Linked allocation ${linkedAllocationId} does not point back to engagement ${input.engagementId}`,
      );
    }

    if (alloc.resolution !== "pending") {
      throw new DomainError(
        "INVALID_CAMPAIGN_STATE",
        `Linked allocation ${linkedAllocationId} is ${alloc.resolution}, not pending`,
      );
    }

    // Atomically mark spent
    newTimeParticipants = timeParticipants.map((t, i) =>
      i === tpIndex
        ? {
            ...t,
            allocations: t.allocations.map((a, j) =>
              j === allocIndex ? { ...a, resolution: "spent" } : a,
            ),
          }
        : t,
    );
  }

  const newEngagements = engagements.map((e, i) =>
    i === engIdx ? { ...e, resolution: "resolved" as const } : e,
  );

  const currentMonthState: MonthlyPlayState = {
    ...state.lifecycle.currentMonth,
    timeParticipants: newTimeParticipants,
    engagements: newEngagements,
  };

  const lifecycle: PlayLifecycle = {
    ...state.lifecycle,
    currentMonth: currentMonthState,
  };

  const nextState: CurrentCampaignState = {
    ...state,
    lifecycle,
  };

  const event: EngagementResolvedEventV1 = {
    type: "engagement_resolved",
    version: 1,
    data: {
      monthOrdinal: currentMonth,
      engagementId: input.engagementId,
      linkedAllocationId: linkedAllocationId,
    },
  };

  return { nextState, events: [event] };
}

// ============================================================
// 10. RESCHEDULE ENGAGEMENT (Story)
// ============================================================

export interface RescheduleEngagementInput {
  readonly expectedMonthOrdinal: MonthOrdinal;
  readonly engagementId: EngagementId;
  readonly target: EngagementTarget;
}

export function applyRescheduleEngagement(
  state: CurrentCampaignState,
  input: RescheduleEngagementInput,
): TransitionResult {
  if (state.lifecycle.kind !== "play") {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "reschedule_engagement requires lifecycle kind 'play'");
  }

  if (state.lifecycle.phase !== "story") {
    throw new DomainError(
      "INVALID_CAMPAIGN_STATE",
      `reschedule_engagement is only allowed during story, current phase is "${state.lifecycle.phase}"`,
    );
  }

  const currentMonth = state.calendar.monthOrdinal;
  if (currentMonth === null || currentMonth !== input.expectedMonthOrdinal) {
    throw new DomainError(
      "INVALID_CAMPAIGN_STATE",
      `Expected month ${input.expectedMonthOrdinal} but current is ${currentMonth}`,
    );
  }

  if (!isValidEngagementId(input.engagementId)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Invalid engagementId: ${input.engagementId}`);
  }

  validateEngagementTarget(input.target, state);

  const { engagements } = state.lifecycle.currentMonth;

  const engIdx = engagements.findIndex((e) => e.engagementId === input.engagementId);
  if (engIdx < 0) {
    throw new DomainError(
      "INVALID_CAMPAIGN_STATE",
      `Engagement ${input.engagementId} not found in current month`,
    );
  }

  const eng = engagements[engIdx];
  if (eng.resolution !== "pending") {
    throw new DomainError(
      "INVALID_CAMPAIGN_STATE",
      `Engagement ${input.engagementId} is ${eng.resolution}, not pending`,
    );
  }

  const previousTarget = eng.target;

  const newEngagements: EngagementRecord[] = engagements.map((e, i) =>
    i === engIdx ? { ...e, target: input.target } : e,
  );

  const currentMonthState: MonthlyPlayState = {
    ...state.lifecycle.currentMonth,
    engagements: newEngagements,
  };

  const lifecycle: PlayLifecycle = {
    ...state.lifecycle,
    currentMonth: currentMonthState,
  };

  const nextState: CurrentCampaignState = {
    ...state,
    lifecycle,
  };

  const event: EngagementRescheduledEventV1 = {
    type: "engagement_rescheduled",
    version: 1,
    data: {
      monthOrdinal: currentMonth,
      engagementId: input.engagementId,
      previousTarget,
      newTarget: input.target,
    },
  };

  return { nextState, events: [event] };
}

// ============================================================
// 11. ADJUST WIZARDMOOT ATTENDANCE (Meeting)
// ============================================================

export interface AdjustWizardmootAttendanceInput {
  readonly expectedMonthOrdinal: MonthOrdinal;
  readonly wizardId: WizardId;
  readonly attended: boolean;
  readonly exceptionReason: string | null;
}

export function applyAdjustWizardmootAttendance(
  state: CurrentCampaignState,
  input: AdjustWizardmootAttendanceInput,
): TransitionResult {
  if (state.lifecycle.kind !== "play") {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "adjust_wizardmoot_attendance requires lifecycle kind 'play'");
  }

  if (state.lifecycle.phase !== "meeting") {
    throw new DomainError(
      "INVALID_CAMPAIGN_STATE",
      `adjust_wizardmoot_attendance is only allowed during meeting, current phase is "${state.lifecycle.phase}"`,
    );
  }

  const currentMonth = state.calendar.monthOrdinal;
  if (currentMonth === null || currentMonth !== input.expectedMonthOrdinal) {
    throw new DomainError(
      "INVALID_CAMPAIGN_STATE",
      `Expected month ${input.expectedMonthOrdinal} but current is ${currentMonth}`,
    );
  }

  if (!isValidWizardId(input.wizardId)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Invalid wizardId: ${input.wizardId}`);
  }

  const { wizardmootAttendance } = state.lifecycle.currentMonth;
  if (wizardmootAttendance === null) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "Wizardmoot attendance not yet initialized");
  }

  const attIdx = wizardmootAttendance.findIndex((a) => a.wizardId === input.wizardId);
  if (attIdx < 0) {
    throw new DomainError(
      "INVALID_CAMPAIGN_STATE",
      `No attendance entry for wizard ${input.wizardId}`,
    );
  }

  const existing = wizardmootAttendance[attIdx];
  const expected = deriveExpectedAttendance(input.wizardId, state.lifecycle.currentMonth);

  let newExceptionReason: string | null;
  if (input.attended !== expected) {
    if (input.exceptionReason === null || input.exceptionReason.trim().length === 0) {
      throw new DomainError(
        "INVALID_CAMPAIGN_STATE",
        `Wizard ${input.wizardId} attendance differs from expected (${expected}); a nonblank exceptionReason is required`,
      );
    }
    newExceptionReason = input.exceptionReason;
  } else {
    newExceptionReason = null;
  }

  const newAttendance: readonly WizardmootAttendance[] = wizardmootAttendance.map((a, i) =>
    i === attIdx
      ? { ...a, attended: input.attended, exceptionReason: newExceptionReason }
      : a,
  );

  const currentMonthState: MonthlyPlayState = {
    ...state.lifecycle.currentMonth,
    wizardmootAttendance: newAttendance,
  };

  const lifecycle: PlayLifecycle = {
    ...state.lifecycle,
    currentMonth: currentMonthState,
  };

  const nextState: CurrentCampaignState = {
    ...state,
    lifecycle,
  };

  const event: WizardmootAttendanceAdjustedEventV1 = {
    type: "wizardmoot_attendance_adjusted",
    version: 1,
    data: {
      monthOrdinal: currentMonth,
      wizardId: input.wizardId,
      previousAttended: existing.attended,
      previousExceptionReason: existing.exceptionReason,
      newAttended: input.attended,
      newExceptionReason,
    },
  };

  return { nextState, events: [event] };
}

// ============================================================
// 12. COMPLETE MEETING
// ============================================================

export interface CompleteMeetingInput {
  readonly expectedMonthOrdinal: MonthOrdinal;
}

export function applyCompleteMeeting(
  state: CurrentCampaignState,
  input: CompleteMeetingInput,
): TransitionResult {
  if (state.lifecycle.kind !== "play") {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "complete_meeting requires lifecycle kind 'play'");
  }

  if (state.lifecycle.phase !== "meeting") {
    throw new DomainError(
      "INVALID_CAMPAIGN_STATE",
      `complete_meeting is only allowed during meeting, current phase is "${state.lifecycle.phase}"`,
    );
  }

  const currentMonth = state.calendar.monthOrdinal;
  if (currentMonth === null || currentMonth !== input.expectedMonthOrdinal) {
    throw new DomainError(
      "INVALID_CAMPAIGN_STATE",
      `Expected month ${input.expectedMonthOrdinal} but current is ${currentMonth}`,
    );
  }

  const { wizardmootAttendance, timeParticipants } = state.lifecycle.currentMonth;
  if (wizardmootAttendance === null) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "Wizardmoot attendance not yet initialized");
  }

  const meetingAllocationsSpent: string[] = [];
  const newTimeParticipants: TimeParticipant[] = timeParticipants.map((tp) => {
    const newAllocations: TimeAllocation[] = tp.allocations.map((a) => {
      if (a.resolution === "pending" && a.destination !== null && a.destination.kind === "meeting") {
        meetingAllocationsSpent.push(a.allocationId);
        return { ...a, resolution: "spent" as const };
      }
      return a;
    });
    return { ...tp, allocations: newAllocations };
  });

  const currentMonthState: MonthlyPlayState = {
    ...state.lifecycle.currentMonth,
    timeParticipants: newTimeParticipants,
  };

  const lifecycle: PlayLifecycle = {
    ...state.lifecycle,
    phase: "quiet" as LunarPhase,
    currentMonth: currentMonthState,
  };

  const nextState: CurrentCampaignState = {
    ...state,
    lifecycle,
  };

  const event: MeetingCompletedEventV1 = {
    type: "meeting_completed",
    version: 1,
    data: {
      monthOrdinal: currentMonth,
      meetingAllocationsSpent,
    },
  };

  return { nextState, events: [event] };
}
