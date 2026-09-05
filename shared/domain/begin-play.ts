import type { CurrentCampaignState, MonthlyPlayState, PlayLifecycle } from "./campaign-state";
import type { WizardId, AllocationId, EngagementId } from "./ids";
import { isValidAllocationId, isValidEngagementId, isValidWizardId } from "./ids";
import type { OrreryState } from "./orrery";
import { advanceAllPlanets, isCompleteOrrery, MOVABLE_PLANET_IDS } from "./orrery";
import type { CampaignEvent, BeginPlayEventV1 } from "./events";
import type { MonthOrdinal } from "./calendar";
import { advanceOrdinal } from "./calendar";
import type { TimeParticipant, TimeAllocation } from "./time-model";
import type { EngagementRecord } from "./engagement";
import type { WizardParticipantRef } from "./participants";
import { PACT_SEAT_IDS } from "./pact-seats";
import { evaluateSetupReadiness } from "./setup-readiness";
import { DomainError } from "./errors";
import type { TransitionResult } from "./m3-transitions";

export interface WizardInitIds {
  readonly wizardId: WizardId;
  readonly allocationIds: readonly [AllocationId, AllocationId, AllocationId, AllocationId];
  readonly engagementId: EngagementId;
}

export interface BeginPlayInput {
  readonly wizardInits: readonly WizardInitIds[];
}

export function collectEligibleWizardIds(state: CurrentCampaignState): WizardId[] {
  const eligible: WizardId[] = [];
  for (const seatId of PACT_SEAT_IDS) {
    const seat = state.pactSeats[seatId];
    if (seat.status === "present" && seat.wizardId !== null) {
      eligible.push(seat.wizardId as WizardId);
    }
  }
  return eligible;
}

const INITIAL_EFFECTIVE_BUDGET = 4;
const INITIAL_RESCHEDULE_ALLOWANCE = 1;

export function buildTimeParticipant(init: WizardInitIds): TimeParticipant {
  const participant: WizardParticipantRef = { kind: "wizard", wizardId: init.wizardId };
  const allocations: TimeAllocation[] = init.allocationIds.map((allocationId) => ({
    allocationId,
    destination: null,
    note: null,
    resolution: "pending" as const,
  }));

  return {
    participant,
    effectiveBudget: INITIAL_EFFECTIVE_BUDGET,
    rescheduleAllowance: INITIAL_RESCHEDULE_ALLOWANCE,
    reschedulesUsed: 0,
    allocations,
  };
}

export function buildEngagement(init: WizardInitIds): EngagementRecord {
  return {
    engagementId: init.engagementId,
    actingWizardId: init.wizardId,
    target: null,
    resolution: "pending",
    linkedTimeAllocationId: null,
  };
}

export function applyBeginPlay(
  state: CurrentCampaignState,
  input: BeginPlayInput,
): TransitionResult {
  if (state.lifecycle.kind !== "setup") {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "begin_play requires lifecycle kind 'setup'");
  }

  const readiness = evaluateSetupReadiness(state);
  if (!readiness.ready) {
    const codes = (readiness as { ready: false; issues: readonly { code: string }[] }).issues.map((i) => i.code);
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Setup is not ready for Begin Play: ${codes.join(", ")}`);
  }

  const monthOrdinal = state.calendar.monthOrdinal;
  if (monthOrdinal === null) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "monthOrdinal must be set (readiness should have caught this)");
  }

  const setupOrrery = state.lifecycle.orrery;
  if (!isCompleteOrrery(setupOrrery)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "Orrery must be complete (readiness should have caught this)");
  }
  const completeOrrery: OrreryState = {
    saturn: setupOrrery.saturn!,
    jupiter: setupOrrery.jupiter!,
    mars: setupOrrery.mars!,
    venus: setupOrrery.venus!,
    mercury: setupOrrery.mercury!,
  };

  const eligibleWizardIds = collectEligibleWizardIds(state);

  const initByWizard = new Map<string, WizardInitIds>();
  for (const init of input.wizardInits) {
    if (!isValidWizardId(init.wizardId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `Invalid wizardId in beginPlay input: ${init.wizardId}`);
    }
    if (init.allocationIds.length !== 4) {
      throw new DomainError(
        "INVALID_CAMPAIGN_STATE",
        `Wizard ${init.wizardId} must have exactly 4 allocationIds, got ${init.allocationIds.length}`,
      );
    }
    if (initByWizard.has(init.wizardId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `Duplicate wizardId in beginPlay input: ${init.wizardId}`);
    }
    initByWizard.set(init.wizardId, init);
  }

  if (initByWizard.size !== eligibleWizardIds.length) {
    throw new DomainError(
      "INVALID_CAMPAIGN_STATE",
      `beginPlay input has ${initByWizard.size} wizard inits but ${eligibleWizardIds.length} eligible wizards`,
    );
  }
  for (const wid of eligibleWizardIds) {
    if (!initByWizard.has(wid)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `Missing init for eligible wizard: ${wid}`);
    }
  }

  const allIds = new Set<string>();
  for (const init of input.wizardInits) {
    if (!isValidEngagementId(init.engagementId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `Invalid engagementId: ${init.engagementId}`);
    }
    if (allIds.has(init.engagementId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `Duplicate ID in beginPlay input: ${init.engagementId}`);
    }
    allIds.add(init.engagementId);

    for (const aid of init.allocationIds) {
      if (!isValidAllocationId(aid)) {
        throw new DomainError("INVALID_CAMPAIGN_STATE", `Invalid allocationId: ${aid}`);
      }
      if (allIds.has(aid)) {
        throw new DomainError("INVALID_CAMPAIGN_STATE", `Duplicate ID in beginPlay input: ${aid}`);
      }
      allIds.add(aid);
    }
  }

  const advancedMonth = advanceOrdinal(monthOrdinal, "forward");
  const advancedOrrery = advanceAllPlanets(completeOrrery);

  const timeParticipants: TimeParticipant[] = [];
  const engagements: EngagementRecord[] = [];

  for (const wid of eligibleWizardIds) {
    const init = initByWizard.get(wid)!;
    timeParticipants.push(buildTimeParticipant(init));
    engagements.push(buildEngagement(init));
  }

  const currentMonth: MonthlyPlayState = {
    timeParticipants,
    engagements,
    wizardmootAttendance: null,
  };

  const lifecycle: PlayLifecycle = {
    kind: "play",
    phase: "new_moon",
    orrery: advancedOrrery,
    currentMonth,
  };

  const nextState: CurrentCampaignState = {
    ...state,
    calendar: { monthOrdinal: advancedMonth },
    lifecycle,
  };

  const event: BeginPlayEventV1 = {
    type: "begin_play",
    version: 1,
    data: {
      fromMonthOrdinal: monthOrdinal,
      toMonthOrdinal: advancedMonth,
      eligibleWizardIds: eligibleWizardIds.map((id) => id as string),
    },
  };

  return { nextState, events: [event] };
}
