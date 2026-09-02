import { v } from "convex/values";
import { query, mutation, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import {
  DomainError,
  validateDeletionRequest,
  validateCampaignIdentityMatch,
  DELETION_BATCH_SIZE,
  DELETION_PHASE_ORDER,
  isDeletionChildCleanupPhase,
  nextDeletionPhase,
  CAMPAIGN_OWNED_CHILD_COLLECTIONS,
} from "../shared/domain";
import type { DeletionPhase, CampaignOwnedChildCollection } from "../shared/domain";
import { loadActiveDeletion } from "./deletionBarrier";
import { loadCanonicalRecord } from "./persistence";

// ============================================================
// Request campaign deletion
// ============================================================

export const requestCampaignDeletion = mutation({
  args: {
    expectedCampaignId: v.string(),
    confirmation: v.string(),
  },
  returns: v.object({
    status: v.literal("deleting"),
    campaignId: v.string(),
    phase: v.string(),
  }),
  handler: async (ctx, args) => {
    validateDeletionRequest(args.expectedCampaignId, args.confirmation);

    const existingOp = await loadActiveDeletion(ctx);
    if (existingOp !== null) {
      if (existingOp.campaignId === args.expectedCampaignId) {
        return {
          status: "deleting" as const,
          campaignId: existingOp.campaignId,
          phase: existingOp.phase,
        };
      }
      throw new DomainError(
        "CAMPAIGN_DELETION_IN_PROGRESS",
        `A deletion is already in progress for campaign "${existingOp.campaignId}"`,
      );
    }

    const record = await loadCanonicalRecord(ctx);
    if (record === null) {
      throw new DomainError(
        "CAMPAIGN_NOT_FOUND",
        "No canonical campaign found to delete",
      );
    }

    validateCampaignIdentityMatch(args.expectedCampaignId, record.campaignId);

    const now = Date.now();
    const initialPhase: DeletionPhase = DELETION_PHASE_ORDER[0];

    await ctx.db.insert("campaignDeletionOperations", {
      campaignKey: "default",
      campaignId: record.campaignId,
      status: "deleting" as const,
      phase: initialPhase,
      startedAt: now,
      lastProgressAt: now,
    });

    await ctx.scheduler.runAfter(0, internal.campaignDeletion.processCampaignDeletionBatch, {});

    return {
      status: "deleting" as const,
      campaignId: record.campaignId,
      phase: initialPhase,
    };
  },
});

// ============================================================
// Resume campaign deletion (idempotent)
// ============================================================

export const resumeCampaignDeletion = mutation({
  args: {},
  returns: v.union(
    v.object({
      status: v.literal("deleting"),
      campaignId: v.string(),
      phase: v.string(),
    }),
    v.object({
      status: v.literal("none"),
    }),
  ),
  handler: async (ctx) => {
    const existingOp = await loadActiveDeletion(ctx);
    if (existingOp === null) {
      return { status: "none" as const };
    }

    await ctx.scheduler.runAfter(0, internal.campaignDeletion.processCampaignDeletionBatch, {});

    return {
      status: "deleting" as const,
      campaignId: existingOp.campaignId,
      phase: existingOp.phase,
    };
  },
});

// ============================================================
// Get deletion status (query)
// ============================================================

export const getCampaignDeletionStatus = query({
  args: {},
  returns: v.union(
    v.object({
      status: v.literal("deleting"),
      campaignId: v.string(),
      phase: v.string(),
    }),
    v.object({
      status: v.literal("none"),
    }),
  ),
  handler: async (ctx) => {
    const op = await loadActiveDeletion(ctx);
    if (op === null) {
      return { status: "none" as const };
    }
    return {
      status: "deleting" as const,
      campaignId: op.campaignId,
      phase: op.phase,
    };
  },
});

// ============================================================
// Internal: bounded batch cleanup worker
// ============================================================

async function deleteChildBatch(
  ctx: any,
  collection: CampaignOwnedChildCollection,
  campaignId: string,
): Promise<number> {
  let docs: any[];
  switch (collection) {
    case "campaignEvents":
      docs = await ctx.db
        .query("campaignEvents")
        .withIndex("by_campaign_revision_index", (q: any) =>
          q.eq("campaignId", campaignId),
        )
        .take(DELETION_BATCH_SIZE);
      break;
    case "campaignSnapshots":
      docs = await ctx.db
        .query("campaignSnapshots")
        .withIndex("by_campaign_revision", (q: any) =>
          q.eq("campaignId", campaignId),
        )
        .take(DELETION_BATCH_SIZE);
      break;
    case "campaignRevisions":
      docs = await ctx.db
        .query("campaignRevisions")
        .withIndex("by_campaign_revision", (q: any) =>
          q.eq("campaignId", campaignId),
        )
        .take(DELETION_BATCH_SIZE);
      break;
    case "campaignCheckpoints":
      docs = await ctx.db
        .query("campaignCheckpoints")
        .withIndex("by_campaignId", (q: any) =>
          q.eq("campaignId", campaignId),
        )
        .take(DELETION_BATCH_SIZE);
      break;
    case "campaignHistoryControl":
      docs = await ctx.db
        .query("campaignHistoryControl")
        .withIndex("by_campaignId", (q: any) =>
          q.eq("campaignId", campaignId),
        )
        .take(DELETION_BATCH_SIZE);
      break;
    default: {
      const _exhaustive: never = collection;
      throw new DomainError("CAMPAIGN_STATE_CORRUPT", `Unknown child collection: ${_exhaustive}`);
    }
  }

  for (const doc of docs) {
    await ctx.db.delete(doc._id);
  }

  return docs.length;
}

async function isChildCollectionEmpty(
  ctx: any,
  collection: CampaignOwnedChildCollection,
  campaignId: string,
): Promise<boolean> {
  let doc: any;
  switch (collection) {
    case "campaignEvents":
      doc = await ctx.db
        .query("campaignEvents")
        .withIndex("by_campaign_revision_index", (q: any) =>
          q.eq("campaignId", campaignId),
        )
        .first();
      break;
    case "campaignSnapshots":
      doc = await ctx.db
        .query("campaignSnapshots")
        .withIndex("by_campaign_revision", (q: any) =>
          q.eq("campaignId", campaignId),
        )
        .first();
      break;
    case "campaignRevisions":
      doc = await ctx.db
        .query("campaignRevisions")
        .withIndex("by_campaign_revision", (q: any) =>
          q.eq("campaignId", campaignId),
        )
        .first();
      break;
    case "campaignCheckpoints":
      doc = await ctx.db
        .query("campaignCheckpoints")
        .withIndex("by_campaignId", (q: any) =>
          q.eq("campaignId", campaignId),
        )
        .first();
      break;
    case "campaignHistoryControl":
      doc = await ctx.db
        .query("campaignHistoryControl")
        .withIndex("by_campaignId", (q: any) =>
          q.eq("campaignId", campaignId),
        )
        .first();
      break;
    default: {
      const _exhaustive: never = collection;
      throw new DomainError("CAMPAIGN_STATE_CORRUPT", `Unknown child collection: ${_exhaustive}`);
    }
  }
  return doc === null;
}

export const processCampaignDeletionBatch = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx): Promise<null> => {
    const opDoc = await ctx.db
      .query("campaignDeletionOperations")
      .withIndex("by_campaignKey", (q) => q.eq("campaignKey", "default"))
      .unique();

    if (opDoc === null) {
      return null;
    }

    const campaignId = opDoc.campaignId;
    const currentPhase = opDoc.phase as DeletionPhase;
    const now = Date.now();

    if (isDeletionChildCleanupPhase(currentPhase)) {
      const deleted = await deleteChildBatch(ctx, currentPhase, campaignId);

      if (deleted > 0 && deleted >= DELETION_BATCH_SIZE) {
        await ctx.db.patch(opDoc._id, { lastProgressAt: now });
        await ctx.scheduler.runAfter(0, internal.campaignDeletion.processCampaignDeletionBatch, {});
        return null;
      }

      if (deleted === 0 || deleted < DELETION_BATCH_SIZE) {
        const empty = await isChildCollectionEmpty(ctx, currentPhase, campaignId);
        if (!empty) {
          await ctx.db.patch(opDoc._id, { lastProgressAt: now });
          await ctx.scheduler.runAfter(0, internal.campaignDeletion.processCampaignDeletionBatch, {});
          return null;
        }

        const next = nextDeletionPhase(currentPhase);
        if (next === "complete") {
          await ctx.db.delete(opDoc._id);
          return null;
        }

        await ctx.db.patch(opDoc._id, { phase: next, lastProgressAt: now });
        await ctx.scheduler.runAfter(0, internal.campaignDeletion.processCampaignDeletionBatch, {});
        return null;
      }
    }

    if (currentPhase === "campaign") {
      const canonical = await ctx.db
        .query("campaigns")
        .withIndex("by_campaignKey", (q) => q.eq("campaignKey", "default"))
        .unique();

      if (canonical !== null) {
        if ("campaignId" in canonical && (canonical as any).campaignId === campaignId) {
          await ctx.db.delete(canonical._id);
        }
      }

      const next = nextDeletionPhase("campaign");
      if (next === "complete") {
        await ctx.db.delete(opDoc._id);
        return null;
      }
      await ctx.db.patch(opDoc._id, { phase: next, lastProgressAt: now });
      await ctx.scheduler.runAfter(0, internal.campaignDeletion.processCampaignDeletionBatch, {});
      return null;
    }

    if (currentPhase === "verify") {
      for (const col of CAMPAIGN_OWNED_CHILD_COLLECTIONS) {
        const empty = await isChildCollectionEmpty(ctx, col, campaignId);
        if (!empty) {
          await ctx.db.patch(opDoc._id, { phase: col, lastProgressAt: now });
          await ctx.scheduler.runAfter(0, internal.campaignDeletion.processCampaignDeletionBatch, {});
          return null;
        }
      }

      const canonical = await ctx.db
        .query("campaigns")
        .withIndex("by_campaignKey", (q) => q.eq("campaignKey", "default"))
        .unique();

      if (canonical !== null && "campaignId" in canonical && (canonical as any).campaignId === campaignId) {
        await ctx.db.patch(opDoc._id, { phase: "campaign" as DeletionPhase, lastProgressAt: now });
        await ctx.scheduler.runAfter(0, internal.campaignDeletion.processCampaignDeletionBatch, {});
        return null;
      }

      await ctx.db.delete(opDoc._id);
      return null;
    }

    return null;
  },
});
