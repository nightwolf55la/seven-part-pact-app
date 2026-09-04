import type { CurrentCampaignState, LunarPhase, PlayLifecycle, MonthlyPlayState } from "./campaign-state";
import type { MonthOrdinal } from "./calendar";
import type { AllocationId, WizardId, EngagementId } from "./ids";
import { isValidAllocationId, isValidEngagementId, isValidWizardId } from "./ids";
import type { TimeDestination, TimeAllocation, TimeParticipant } from "./time-model";
import type { EngagementRecord, EngagementTarget } from "./engagement";
import type {
  CampaignEvent,
  PhaseAdvancedEventV1,
  TimeAllocationScheduledEventV1,
  EngagementTargetChangedEventV1,
} from "./events";
import type { TransitionResult } from "./m3-transitions";
import { DomainError } from "./errors";

// ============================================================
// 1. ADVANCE PHASE
// ============================================================

const PHASE_ADVANCE_MAP: Record<LunarPhase, LunarPhase | null> = {
  new_moon: "visions",
  visions: "planning",
  planning: "story",
  story: null,
  meeting: null,
  quiet: null,
};

export interface AdvancePhaseInput {
  readonly expectedMonthOrdinal: MonthOrdinal;
  readonly expectedPhase: LunarPhase;
}

export function applyAdvancePhase(
  state: CurrentCampaignState,
  input: AdvancePhaseInput,
): TransitionResult {
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
      `Phase "${currentPhase}" cannot be advanced in C3`,
    );
  }

  const lifecycle: PlayLifecycle = {
    ...state.lifecycle,
    phase: nextPhase,
  };

  const nextState: CurrentCampaignState = {
    ...state,
    lifecycle,
  };

  const event: PhaseAdvancedEventV1 = {
    type: "phase_advanced",
    version: 1,
    data: {
      monthOrdinal: currentMonth,
      fromPhase: currentPhase,
      toPhase: nextPhase,
    },
  };

  return { nextState, events: [event] };
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
