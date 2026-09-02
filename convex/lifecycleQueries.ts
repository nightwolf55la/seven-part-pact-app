import { v } from "convex/values";
import { query } from "./_generated/server";
import { loadCanonicalRecord } from "./persistence";
import { loadActiveDeletion } from "./deletionBarrier";
import { DomainError } from "../shared/domain";

async function hasAnyOrphanedChildRecords(ctx: any, campaignId?: string): Promise<boolean> {
  const tables = [
    { table: "campaignEvents", index: "by_campaign_revision_index", field: "campaignId" },
    { table: "campaignSnapshots", index: "by_campaign_revision", field: "campaignId" },
    { table: "campaignRevisions", index: "by_campaign_revision", field: "campaignId" },
    { table: "campaignCheckpoints", index: "by_campaignId", field: "campaignId" },
    { table: "campaignHistoryControl", index: "by_campaignId", field: "campaignId" },
  ] as const;

  for (const { table } of tables) {
    const doc = await ctx.db.query(table).first();
    if (doc !== null) return true;
  }
  return false;
}

export const getCampaignLifecycle = query({
  args: {},
  returns: v.union(
    v.object({
      status: v.literal("none"),
    }),
    v.object({
      status: v.literal("deleting"),
      campaignId: v.string(),
      phase: v.string(),
    }),
    v.object({
      status: v.literal("campaign"),
      campaignId: v.string(),
      campaignRevision: v.number(),
    }),
    v.object({
      status: v.literal("corrupt"),
      reason: v.string(),
    }),
  ),
  handler: async (ctx) => {
    const deletion = await loadActiveDeletion(ctx);
    if (deletion !== null) {
      return {
        status: "deleting" as const,
        campaignId: deletion.campaignId,
        phase: deletion.phase,
      };
    }

    const record = await loadCanonicalRecord(ctx);
    if (record !== null) {
      return {
        status: "campaign" as const,
        campaignId: record.campaignId,
        campaignRevision: record.campaignRevision,
      };
    }

    const hasOrphans = await hasAnyOrphanedChildRecords(ctx);
    if (hasOrphans) {
      return {
        status: "corrupt" as const,
        reason: "Campaign-owned records exist without a canonical campaign or deletion marker",
      };
    }

    return { status: "none" as const };
  },
});
