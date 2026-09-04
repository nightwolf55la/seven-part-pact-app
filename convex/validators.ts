import { v } from "convex/values";
import {
  MONTH_DISPLAY_NAMES,
  CAMPAIGN_COMMAND_TYPES,
  SEVEN_PART_PACT_DRAFT4_ID,
  SEVEN_PART_PACT_DRAFT4_VERSION,
  CURRENT_HISTORY_CONTROL_VERSION,
  CURRENT_CHECKPOINT_VERSION,
  PACT_SEAT_IDS,
  MOVABLE_PLANET_IDS,
  LUNAR_PHASES,
} from "../shared/domain";

export const monthDirectionValidator = v.union(
  v.literal("forward"),
  v.literal("backward"),
);

export const monthDisplayNameValidator = v.union(
  ...MONTH_DISPLAY_NAMES.map((name) => v.literal(name)),
);

export const campaignCommandTypeValidator = v.union(
  ...CAMPAIGN_COMMAND_TYPES.map((t) => v.literal(t)),
);

export const monthChangedEventV1Validator = v.object({
  type: v.literal("month_changed"),
  version: v.literal(1),
  data: v.object({
    direction: monthDirectionValidator,
    fromOrdinal: v.number(),
    toOrdinal: v.number(),
  }),
});

export const undoAppliedEventV1Validator = v.object({
  type: v.literal("undo_applied"),
  version: v.literal(1),
  data: v.object({
    fromRevision: v.number(),
    targetRevision: v.number(),
  }),
});

export const redoAppliedEventV1Validator = v.object({
  type: v.literal("redo_applied"),
  version: v.literal(1),
  data: v.object({
    fromRevision: v.number(),
    targetRevision: v.number(),
  }),
});

export const checkpointRestoredEventV1Validator = v.object({
  type: v.literal("checkpoint_restored"),
  version: v.literal(1),
  data: v.object({
    checkpointId: v.string(),
    sourceRevision: v.number(),
    labelAtRestore: v.string(),
  }),
});

export const backupImportedEventV1Validator = v.object({
  type: v.literal("backup_imported"),
  version: v.literal(1),
  data: v.object({
    backupFormatVersion: v.literal(1),
    sourceCampaignId: v.string(),
    sourceCampaignRevision: v.number(),
    sourceLogicalRevision: v.number(),
    exportedAtMs: v.number(),
    payloadDigest: v.string(),
  }),
});

export const playerAddedEventV1Validator = v.object({
  type: v.literal("player_added"),
  version: v.literal(1),
  data: v.object({ playerId: v.string(), name: v.string() }),
});

export const playerRenamedEventV1Validator = v.object({
  type: v.literal("player_renamed"),
  version: v.literal(1),
  data: v.object({ playerId: v.string(), previousName: v.string(), newName: v.string() }),
});

export const playerRemovedEventV1Validator = v.object({
  type: v.literal("player_removed"),
  version: v.literal(1),
  data: v.object({ playerId: v.string(), name: v.string() }),
});

export const campaignAgeChangedEventV1Validator = v.object({
  type: v.literal("campaign_age_changed"),
  version: v.literal(1),
  data: v.object({
    previousAgeId: v.union(v.string(), v.null()),
    newAgeId: v.union(v.string(), v.null()),
  }),
});

export const facilitatorAssignmentChangedEventV1Validator = v.object({
  type: v.literal("facilitator_assignment_changed"),
  version: v.literal(1),
  data: v.object({
    previousPlayerId: v.union(v.string(), v.null()),
    newPlayerId: v.union(v.string(), v.null()),
  }),
});

export const wizardCreatedEventV1Validator = v.object({
  type: v.literal("wizard_created"),
  version: v.literal(1),
  data: v.object({
    wizardId: v.string(),
    name: v.string(),
    portrayedByPlayerId: v.union(v.string(), v.null()),
    assignedToSeatId: v.string(),
  }),
});

export const wizardNameChangedEventV1Validator = v.object({
  type: v.literal("wizard_name_changed"),
  version: v.literal(1),
  data: v.object({ wizardId: v.string(), previousName: v.string(), newName: v.string() }),
});

export const wizardPortrayalChangedEventV1Validator = v.object({
  type: v.literal("wizard_portrayal_changed"),
  version: v.literal(1),
  data: v.object({
    wizardId: v.string(),
    previousPlayerId: v.union(v.string(), v.null()),
    newPlayerId: v.union(v.string(), v.null()),
  }),
});

export const pactSeatWizardChangedEventV1Validator = v.object({
  type: v.literal("pact_seat_wizard_changed"),
  version: v.literal(1),
  data: v.object({
    seatId: v.string(),
    previousWizardId: v.union(v.string(), v.null()),
    newWizardId: v.union(v.string(), v.null()),
  }),
});

export const pactSeatStatusChangedEventV1Validator = v.object({
  type: v.literal("pact_seat_status_changed"),
  version: v.literal(1),
  data: v.object({
    seatId: v.string(),
    previousStatus: v.union(v.string(), v.null()),
    newStatus: v.union(v.string(), v.null()),
  }),
});

export const watcherAssignmentChangedEventV1Validator = v.object({
  type: v.literal("watcher_assignment_changed"),
  version: v.literal(1),
  data: v.object({
    seatId: v.string(),
    previousPlayerId: v.union(v.string(), v.null()),
    newPlayerId: v.union(v.string(), v.null()),
  }),
});

export const setupMonthChangedEventV1Validator = v.object({
  type: v.literal("setup_month_changed"),
  version: v.literal(1),
  data: v.object({
    previousMonthOrdinal: v.union(v.number(), v.null()),
    newMonthOrdinal: v.union(v.number(), v.null()),
  }),
});

export const setupOrreryPositionChangedEventV1Validator = v.object({
  type: v.literal("setup_orrery_position_changed"),
  version: v.literal(1),
  data: v.object({
    planetId: v.string(),
    previousPosition: v.union(v.number(), v.null()),
    newPosition: v.union(v.number(), v.null()),
  }),
});

export const beginPlayEventV1Validator = v.object({
  type: v.literal("begin_play"),
  version: v.literal(1),
  data: v.object({
    fromMonthOrdinal: v.number(),
    toMonthOrdinal: v.number(),
    eligibleWizardIds: v.array(v.string()),
  }),
});

export const phaseAdvancedEventV1Validator = v.object({
  type: v.literal("phase_advanced"),
  version: v.literal(1),
  data: v.object({
    monthOrdinal: v.number(),
    fromPhase: v.string(),
    toPhase: v.string(),
  }),
});

// --- V3 Campaign State Validators ---

const pactSeatStateValidator = v.object({
  status: v.union(v.literal("present"), v.literal("silent"), v.literal("absent"), v.null()),
  wizardId: v.union(v.string(), v.null()),
  watcherPlayerId: v.union(v.string(), v.null()),
});

const playerValidator = v.object({
  playerId: v.string(),
  name: v.string(),
});

const wizardValidator = v.object({
  wizardId: v.string(),
  name: v.string(),
  portrayedByPlayerId: v.union(v.string(), v.null()),
});

const pactSeatsValidator = v.object(
  Object.fromEntries(PACT_SEAT_IDS.map((id) => [id, pactSeatStateValidator])) as Record<string, typeof pactSeatStateValidator>,
);

const participantRefValidator = v.object({
  kind: v.literal("wizard"),
  wizardId: v.string(),
});

const timeDestinationValidator = v.union(
  v.object({ kind: v.literal("companion"), element: v.string() }),
  v.object({ kind: v.literal("map_isle_sanctum") }),
  v.object({ kind: v.literal("familiar") }),
  v.object({ kind: v.literal("orrery") }),
  v.object({ kind: v.literal("meeting") }),
  v.object({ kind: v.literal("domain") }),
  v.object({ kind: v.literal("engagement"), engagementId: v.string() }),
  v.object({ kind: v.literal("special_use"), description: v.string() }),
);

const timeAllocationValidator = v.object({
  allocationId: v.string(),
  destination: v.union(timeDestinationValidator, v.null()),
  note: v.union(v.string(), v.null()),
  resolution: v.union(v.literal("pending"), v.literal("spent"), v.literal("wasted")),
});

const timeParticipantValidator = v.object({
  participant: participantRefValidator,
  effectiveBudget: v.number(),
  rescheduleAllowance: v.number(),
  reschedulesUsed: v.number(),
  allocations: v.array(timeAllocationValidator),
});

const engagementTargetValidator = v.union(
  v.object({ kind: v.literal("wizard"), wizardId: v.string() }),
  v.object({ kind: v.literal("self") }),
  v.object({ kind: v.literal("familiar") }),
  v.object({ kind: v.literal("named_character"), name: v.string() }),
);

const engagementRecordValidator = v.object({
  engagementId: v.string(),
  actingWizardId: v.string(),
  target: v.union(engagementTargetValidator, v.null()),
  resolution: v.union(v.literal("pending"), v.literal("resolved")),
  linkedTimeAllocationId: v.union(v.string(), v.null()),
});

const wizardmootAttendanceValidator = v.object({
  wizardId: v.string(),
  attended: v.boolean(),
  exceptionReason: v.union(v.string(), v.null()),
});

const monthlyPlayStateValidator = v.object({
  timeParticipants: v.array(timeParticipantValidator),
  engagements: v.array(engagementRecordValidator),
  wizardmootAttendance: v.union(v.array(wizardmootAttendanceValidator), v.null()),
});

const centidegreeOrNull = v.union(v.number(), v.null());

const setupOrreryValidator = v.object({
  saturn: centidegreeOrNull,
  jupiter: centidegreeOrNull,
  mars: centidegreeOrNull,
  venus: centidegreeOrNull,
  mercury: centidegreeOrNull,
});

const completeOrreryValidator = v.object({
  saturn: v.number(),
  jupiter: v.number(),
  mars: v.number(),
  venus: v.number(),
  mercury: v.number(),
});

const lunarPhaseValidator = v.union(
  ...LUNAR_PHASES.map((p) => v.literal(p)),
);

const setupLifecycleValidator = v.object({
  kind: v.literal("setup"),
  orrery: setupOrreryValidator,
});

const playLifecycleValidator = v.object({
  kind: v.literal("play"),
  phase: lunarPhaseValidator,
  orrery: completeOrreryValidator,
  currentMonth: monthlyPlayStateValidator,
});

const lifecycleValidator = v.union(setupLifecycleValidator, playLifecycleValidator);

const wizardmootHistoryEntryValidator = v.object({
  monthOrdinal: v.number(),
  attendance: v.array(v.object({
    wizardId: v.string(),
    attended: v.boolean(),
  })),
});

export const campaignStateV3Validator = v.object({
  schemaVersion: v.literal(3),
  ruleset: v.object({
    id: v.literal(SEVEN_PART_PACT_DRAFT4_ID),
    version: v.literal(SEVEN_PART_PACT_DRAFT4_VERSION),
  }),
  calendar: v.object({
    monthOrdinal: v.union(v.number(), v.null()),
  }),
  configuration: v.object({
    ageId: v.union(v.string(), v.null()),
    facilitatorPlayerId: v.union(v.string(), v.null()),
  }),
  players: v.array(playerValidator),
  wizards: v.array(wizardValidator),
  pactSeats: pactSeatsValidator,
  lifecycle: lifecycleValidator,
  wizardmootHistory: v.array(wizardmootHistoryEntryValidator),
});

export const timeAllocationScheduledEventV1Validator = v.object({
  type: v.literal("time_allocation_scheduled"),
  version: v.literal(1),
  data: v.object({
    monthOrdinal: v.number(),
    allocationId: v.string(),
    previousDestination: v.union(timeDestinationValidator, v.null()),
    newDestination: v.union(timeDestinationValidator, v.null()),
    note: v.union(v.string(), v.null()),
  }),
});

export const engagementTargetChangedEventV1Validator = v.object({
  type: v.literal("engagement_target_changed"),
  version: v.literal(1),
  data: v.object({
    monthOrdinal: v.number(),
    engagementId: v.string(),
    actingWizardId: v.string(),
    previousTarget: v.union(engagementTargetValidator, v.null()),
    newTarget: v.union(engagementTargetValidator, v.null()),
  }),
});

export const timeRescheduledEventV1Validator = v.object({
  type: v.literal("time_rescheduled"),
  version: v.literal(1),
  data: v.object({
    monthOrdinal: v.number(),
    allocationId: v.string(),
    previousDestination: v.union(timeDestinationValidator, v.null()),
    newDestination: v.union(timeDestinationValidator, v.null()),
    note: v.union(v.string(), v.null()),
  }),
});

export const timeSpentEventV1Validator = v.object({
  type: v.literal("time_spent"),
  version: v.literal(1),
  data: v.object({
    monthOrdinal: v.number(),
    allocationId: v.string(),
    destination: timeDestinationValidator,
  }),
});

export const timeWastedEventV1Validator = v.object({
  type: v.literal("time_wasted"),
  version: v.literal(1),
  data: v.object({
    monthOrdinal: v.number(),
    allocationId: v.string(),
    destination: v.union(timeDestinationValidator, v.null()),
    note: v.union(v.string(), v.null()),
  }),
});

export const orreryTimeSpentEventV1Validator = v.object({
  type: v.literal("orrery_time_spent"),
  version: v.literal(1),
  data: v.object({
    monthOrdinal: v.number(),
    allocationId: v.string(),
    planetId: v.string(),
    direction: v.string(),
    previousPosition: v.number(),
    newPosition: v.number(),
  }),
});

export const engagementTimeCommittedEventV1Validator = v.object({
  type: v.literal("engagement_time_committed"),
  version: v.literal(1),
  data: v.object({
    monthOrdinal: v.number(),
    allocationId: v.string(),
    engagementId: v.string(),
    previousDestination: v.union(timeDestinationValidator, v.null()),
  }),
});

export const engagementResolvedEventV1Validator = v.object({
  type: v.literal("engagement_resolved"),
  version: v.literal(1),
  data: v.object({
    monthOrdinal: v.number(),
    engagementId: v.string(),
    linkedAllocationId: v.union(v.string(), v.null()),
  }),
});

export const engagementRescheduledEventV1Validator = v.object({
  type: v.literal("engagement_rescheduled"),
  version: v.literal(1),
  data: v.object({
    monthOrdinal: v.number(),
    engagementId: v.string(),
    previousTarget: v.union(engagementTargetValidator, v.null()),
    newTarget: engagementTargetValidator,
  }),
});

export const campaignEventValidator = v.union(
  monthChangedEventV1Validator,
  undoAppliedEventV1Validator,
  redoAppliedEventV1Validator,
  checkpointRestoredEventV1Validator,
  backupImportedEventV1Validator,
  playerAddedEventV1Validator,
  playerRenamedEventV1Validator,
  playerRemovedEventV1Validator,
  campaignAgeChangedEventV1Validator,
  facilitatorAssignmentChangedEventV1Validator,
  wizardCreatedEventV1Validator,
  wizardNameChangedEventV1Validator,
  wizardPortrayalChangedEventV1Validator,
  pactSeatWizardChangedEventV1Validator,
  pactSeatStatusChangedEventV1Validator,
  watcherAssignmentChangedEventV1Validator,
  setupMonthChangedEventV1Validator,
  setupOrreryPositionChangedEventV1Validator,
  beginPlayEventV1Validator,
  phaseAdvancedEventV1Validator,
  timeAllocationScheduledEventV1Validator,
  engagementTargetChangedEventV1Validator,
  timeRescheduledEventV1Validator,
  timeSpentEventV1Validator,
  timeWastedEventV1Validator,
  orreryTimeSpentEventV1Validator,
  engagementTimeCommittedEventV1Validator,
  engagementResolvedEventV1Validator,
  engagementRescheduledEventV1Validator,
);

export const anyCampaignStateValidator = campaignStateV3Validator;
export const currentCampaignStateValidator = campaignStateV3Validator;

export const newCampaignRecordValidator = v.object({
  campaignKey: v.literal("default"),
  campaignId: v.string(),
  campaignRevision: v.number(),
  state: currentCampaignStateValidator,
});

export const campaignRevisionRecordValidator = v.object({
  campaignId: v.string(),
  campaignRevision: v.number(),
  commandId: v.string(),
  commandType: campaignCommandTypeValidator,
  commandFingerprint: v.string(),
});

export const campaignEventRecordValidator = v.object({
  campaignId: v.string(),
  campaignRevision: v.number(),
  eventIndex: v.number(),
  event: campaignEventValidator,
});

export const campaignSnapshotRecordValidator = v.object({
  campaignId: v.string(),
  campaignRevision: v.number(),
  state: anyCampaignStateValidator,
});

export const campaignHistoryControlValidator = v.object({
  historyControlVersion: v.literal(CURRENT_HISTORY_CONTROL_VERSION),
  campaignId: v.string(),
  undoStack: v.array(v.number()),
  redoStack: v.array(v.number()),
});

export const campaignCheckpointValidator = v.object({
  checkpointVersion: v.literal(CURRENT_CHECKPOINT_VERSION),
  checkpointId: v.string(),
  campaignId: v.string(),
  label: v.string(),
  sourceRevision: v.number(),
  createdAtMs: v.number(),
});

export const activityEntryValidator = v.union(
  v.object({
    id: v.string(),
    revision: v.number(),
    type: v.literal("month_changed"),
    previousMonth: v.string(),
    newMonth: v.string(),
  }),
  v.object({
    id: v.string(),
    revision: v.number(),
    type: v.literal("undo_applied"),
    fromRevision: v.number(),
    targetRevision: v.number(),
  }),
  v.object({
    id: v.string(),
    revision: v.number(),
    type: v.literal("redo_applied"),
    fromRevision: v.number(),
    targetRevision: v.number(),
  }),
  v.object({
    id: v.string(),
    revision: v.number(),
    type: v.literal("checkpoint_restored"),
    checkpointId: v.string(),
    labelAtRestore: v.string(),
    sourceRevision: v.number(),
  }),
  v.object({
    id: v.string(),
    revision: v.number(),
    type: v.literal("backup_imported"),
    sourceCampaignRevision: v.number(),
    sourceLogicalRevision: v.number(),
    exportedAtMs: v.number(),
  }),
  v.object({
    id: v.string(),
    revision: v.number(),
    type: v.literal("campaign_configuration"),
    description: v.string(),
  }),
);

// ============================================================
// Campaign Deletion Operation
// ============================================================

const deletionPhaseValidator = v.union(
  v.literal("campaignEvents"),
  v.literal("campaignSnapshots"),
  v.literal("campaignRevisions"),
  v.literal("campaignCheckpoints"),
  v.literal("campaignHistoryControl"),
  v.literal("campaign"),
  v.literal("verify"),
);

export const campaignDeletionOperationValidator = v.object({
  campaignKey: v.string(),
  campaignId: v.string(),
  status: v.literal("deleting"),
  phase: deletionPhaseValidator,
  startedAt: v.number(),
  lastProgressAt: v.number(),
});
