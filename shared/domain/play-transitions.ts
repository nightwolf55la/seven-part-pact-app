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
  TimeRescheduledEventV1,
  TimeSpentEventV1,
  TimeWastedEventV1,
  OrreryTimeSpentEventV1,
  EngagementTimeCommittedEventV1,
  EngagementResolvedEventV1,
  EngagementRescheduledEventV1,
} from "./events";
import type { TransitionResult } from "./m3-transitions";
import { DomainError } from "./errors";
import type { MovablePlanetId, CentidegreePosition, OrreryMoveDirection } from "./orrery";
import { movePlanetByArc, isLegalPosition } from "./orrery";

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
