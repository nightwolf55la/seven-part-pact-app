import { v } from "convex/values";
import {
  MONTH_DISPLAY_NAMES,
  CAMPAIGN_COMMAND_TYPES,
  SEVEN_PART_PACT_DRAFT4_ID,
  SEVEN_PART_PACT_DRAFT4_VERSION,
  CURRENT_STATE_SCHEMA_VERSION,
  CURRENT_HISTORY_CONTROL_VERSION,
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

export const campaignEventValidator = v.union(
  monthChangedEventV1Validator,
  undoAppliedEventV1Validator,
  redoAppliedEventV1Validator,
);

export const campaignStateV1Validator = v.object({
  schemaVersion: v.literal(CURRENT_STATE_SCHEMA_VERSION),
  ruleset: v.object({
    id: v.literal(SEVEN_PART_PACT_DRAFT4_ID),
    version: v.literal(SEVEN_PART_PACT_DRAFT4_VERSION),
  }),
  calendar: v.object({
    monthOrdinal: v.number(),
  }),
});

export const anyCampaignStateValidator = campaignStateV1Validator;

export const newCampaignRecordValidator = v.object({
  campaignKey: v.literal("default"),
  campaignId: v.string(),
  campaignRevision: v.number(),
  state: campaignStateV1Validator,
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
