import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import {
  monthDirectionValidator,
  monthDisplayNameValidator,
  newCampaignRecordValidator,
  campaignRevisionRecordValidator,
  campaignEventRecordValidator,
  campaignSnapshotRecordValidator,
  campaignHistoryControlValidator,
  campaignCheckpointValidator,
} from "./validators";

const legacyCampaignValidator = v.object({
  monthOrdinal: v.number(),
  revision: v.number(),
});

export default defineSchema({
  numbers: defineTable({
    value: v.number(),
  }),

  campaigns: defineTable(
    v.union(legacyCampaignValidator, newCampaignRecordValidator),
  ).index("by_campaignKey", ["campaignKey"]),

  events: defineTable({
    type: v.literal("month_changed"),
    revision: v.number(),
    direction: monthDirectionValidator,
    previousMonthOrdinal: v.number(),
    newMonthOrdinal: v.number(),
    previousMonth: monthDisplayNameValidator,
    newMonth: monthDisplayNameValidator,
  }).index("by_revision", ["revision"]),

  campaignRevisions: defineTable(campaignRevisionRecordValidator)
    .index("by_campaign_revision", ["campaignId", "campaignRevision"])
    .index("by_campaign_commandId", ["campaignId", "commandId"]),

  campaignEvents: defineTable(campaignEventRecordValidator)
    .index("by_campaign_revision_index", [
      "campaignId",
      "campaignRevision",
      "eventIndex",
    ]),

  campaignSnapshots: defineTable(campaignSnapshotRecordValidator)
    .index("by_campaign_revision", ["campaignId", "campaignRevision"]),

  campaignHistoryControl: defineTable(campaignHistoryControlValidator)
    .index("by_campaignId", ["campaignId"]),

  campaignCheckpoints: defineTable(campaignCheckpointValidator)
    .index("by_campaignId", ["campaignId"])
    .index("by_checkpointId", ["checkpointId"]),
});
