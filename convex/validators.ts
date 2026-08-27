import { v } from "convex/values";
import {
  MONTH_DISPLAY_NAMES,
  CAMPAIGN_COMMAND_TYPES,
  SEVEN_PART_PACT_DRAFT4_ID,
  SEVEN_PART_PACT_DRAFT4_VERSION,
  CURRENT_HISTORY_CONTROL_VERSION,
  CURRENT_CHECKPOINT_VERSION,
  PACT_SEAT_IDS,
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
);

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

export const campaignStateV1Validator = v.object({
  schemaVersion: v.literal(1),
  ruleset: v.object({
    id: v.literal(SEVEN_PART_PACT_DRAFT4_ID),
    version: v.literal(SEVEN_PART_PACT_DRAFT4_VERSION),
  }),
  calendar: v.object({
    monthOrdinal: v.number(),
  }),
});

export const campaignStateV2Validator = v.object({
  schemaVersion: v.literal(2),
  ruleset: v.object({
    id: v.literal(SEVEN_PART_PACT_DRAFT4_ID),
    version: v.literal(SEVEN_PART_PACT_DRAFT4_VERSION),
  }),
  calendar: v.object({
    monthOrdinal: v.number(),
  }),
  configuration: v.object({
    ageId: v.union(v.string(), v.null()),
    facilitatorPlayerId: v.union(v.string(), v.null()),
  }),
  players: v.array(playerValidator),
  wizards: v.array(wizardValidator),
  pactSeats: pactSeatsValidator,
});

export const anyCampaignStateValidator = v.union(
  campaignStateV1Validator,
  campaignStateV2Validator,
);

export const currentCampaignStateValidator = campaignStateV2Validator;

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
