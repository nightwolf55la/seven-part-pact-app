import { v } from "convex/values";
import { query } from "./_generated/server";
import { loadCanonicalRecord } from "./persistence";
import { loadActiveDeletion } from "./deletionBarrier";
import { resolveLifecycle } from "../shared/domain/deletion-orchestrator";
import { CAMPAIGN_OWNED_CHILD_COLLECTIONS } from "../shared/domain";
import { validateCampaignState, displayNameFromOrdinal } from "../shared/domain";
import type { LunarPhase } from "../shared/domain";

async function hasAnyOrphanedChildRecords(ctx: any): Promise<boolean> {
  for (const table of CAMPAIGN_OWNED_CHILD_COLLECTIONS) {
    const doc = await ctx.db.query(table).first();
    if (doc !== null) return true;
  }
  return false;
}

const lifecycleQueryValidator = v.union(
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
    lifecycleKind: v.literal("setup"),
  }),
  v.object({
    status: v.literal("campaign"),
    campaignId: v.string(),
    campaignRevision: v.number(),
    lifecycleKind: v.literal("play"),
    monthOrdinal: v.number(),
    monthDisplayName: v.string(),
    phase: v.string(),
  }),
  v.object({
    status: v.literal("corrupt"),
    reason: v.string(),
  }),
);

export const getCampaignLifecycle = query({
  args: {},
  returns: lifecycleQueryValidator,
  handler: async (ctx) => {
    const deletion = await loadActiveDeletion(ctx);
    const record = await loadCanonicalRecord(ctx);
    const canonicalCampaignId = record?.campaignId ?? null;
    const hasOrphans = deletion === null && canonicalCampaignId === null
      ? await hasAnyOrphanedChildRecords(ctx)
      : false;

    const lifecycle = resolveLifecycle(deletion, canonicalCampaignId, hasOrphans);

    switch (lifecycle.status) {
      case "campaign": {
        const validated = validateCampaignState(record!.rawState);
        if (validated.lifecycle.kind === "setup") {
          return {
            status: "campaign" as const,
            campaignId: lifecycle.campaignId,
            campaignRevision: record!.campaignRevision,
            lifecycleKind: "setup" as const,
          };
        }
        const monthOrdinal = validated.calendar.monthOrdinal;
        if (monthOrdinal === null) {
          throw new Error("Play lifecycle requires non-null monthOrdinal");
        }
        return {
          status: "campaign" as const,
          campaignId: lifecycle.campaignId,
          campaignRevision: record!.campaignRevision,
          lifecycleKind: "play" as const,
          monthOrdinal,
          monthDisplayName: displayNameFromOrdinal(monthOrdinal),
          phase: validated.lifecycle.phase as LunarPhase as string,
        };
      }
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
