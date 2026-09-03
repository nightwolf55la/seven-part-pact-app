import { v } from "convex/values";
import { query } from "./_generated/server";
import { loadCanonicalRecord } from "./persistence";
import { loadActiveDeletion } from "./deletionBarrier";
import { resolveLifecycle } from "../shared/domain/deletion-orchestrator";
import { CAMPAIGN_OWNED_CHILD_COLLECTIONS } from "../shared/domain";

async function hasAnyOrphanedChildRecords(ctx: any): Promise<boolean> {
  for (const table of CAMPAIGN_OWNED_CHILD_COLLECTIONS) {
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
    const record = await loadCanonicalRecord(ctx);
    const canonicalCampaignId = record?.campaignId ?? null;
    const hasOrphans = deletion === null && canonicalCampaignId === null
      ? await hasAnyOrphanedChildRecords(ctx)
      : false;

    const lifecycle = resolveLifecycle(deletion, canonicalCampaignId, hasOrphans);

    switch (lifecycle.status) {
      case "campaign":
        return {
          status: "campaign" as const,
          campaignId: lifecycle.campaignId,
          campaignRevision: record!.campaignRevision,
        };
      case "deleting":
        return {
          status: "deleting" as const,
          campaignId: lifecycle.campaignId,
          phase: lifecycle.phase as string,
        };
      case "corrupt":
        return {
          status: "corrupt" as const,
          reason: lifecycle.reason,
        };
      case "none":
        return { status: "none" as const };
    }
  },
});
