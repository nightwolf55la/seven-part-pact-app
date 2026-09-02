import { v } from "convex/values";
import { query } from "./_generated/server";
import { loadCanonicalRecord } from "./persistence";
import { loadActiveDeletion } from "./deletionBarrier";

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
    if (record === null) {
      return { status: "none" as const };
    }

    return {
      status: "campaign" as const,
      campaignId: record.campaignId,
      campaignRevision: record.campaignRevision,
    };
  },
});
