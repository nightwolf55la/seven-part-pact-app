import { v } from "convex/values";
import { query, mutation, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import type { MutationCtx } from "./_generated/server";
import {
  DomainError,
  CAMPAIGN_OWNED_CHILD_COLLECTIONS,
  DELETION_BATCH_SIZE,
} from "../shared/domain";
import type { DeletionPhase, CampaignOwnedChildCollection, DeletionOperation } from "../shared/domain";
import {
  requestDeletion,
  processBatch,
} from "../shared/domain/deletion-orchestrator";
import type { DeletionPersistenceAdapter } from "../shared/domain/deletion-orchestrator";
import { loadActiveDeletion } from "./deletionBarrier";
import { loadCanonicalRecord } from "./persistence";

function buildConvexAdapter(ctx: MutationCtx, opDocId: { current: any }): DeletionPersistenceAdapter {
  return {
    async loadActiveDeletion(): Promise<DeletionOperation | null> {
      const op = await ctx.db
        .query("campaignDeletionOperations")
        .withIndex("by_campaignKey", (q) => q.eq("campaignKey", "default"))
        .unique();
      if (op === null) return null;
      opDocId.current = op._id;
      return {
        campaignKey: op.campaignKey,
        campaignId: op.campaignId,
        status: op.status,
        phase: op.phase as DeletionPhase,
        startedAt: op.startedAt,
        lastProgressAt: op.lastProgressAt,
      };
    },

    async loadCanonicalCampaignId(): Promise<string | null> {
      const record = await loadCanonicalRecord(ctx);
      return record?.campaignId ?? null;
    },

    async insertDeletionMarker(op: DeletionOperation): Promise<void> {
      const id = await ctx.db.insert("campaignDeletionOperations", {
        campaignKey: op.campaignKey,
        campaignId: op.campaignId,
        status: op.status,
        phase: op.phase,
        startedAt: op.startedAt,
        lastProgressAt: op.lastProgressAt,
      });
      opDocId.current = id;
    },

    async patchDeletionPhase(phase: DeletionPhase): Promise<void> {
      if (opDocId.current === null) throw new Error("No deletion marker to patch");
      await ctx.db.patch(opDocId.current, { phase, lastProgressAt: Date.now() });
    },

    async removeDeletionMarker(): Promise<void> {
      if (opDocId.current === null) throw new Error("No deletion marker to remove");
      await ctx.db.delete(opDocId.current);
      opDocId.current = null;
    },

    async countChildRecords(collection: CampaignOwnedChildCollection, campaignId: string): Promise<number> {
      const doc = await queryChildByIndex(ctx, collection, campaignId);
      return doc !== null ? 1 : 0;
    },

    async deleteChildBatch(collection: CampaignOwnedChildCollection, campaignId: string, limit: number): Promise<number> {
      const docs = await takeChildByIndex(ctx, collection, campaignId, limit);
      for (const doc of docs) {
        await ctx.db.delete(doc._id);
      }
      return docs.length;
    },

    async deleteCampaignRecord(campaignId: string): Promise<boolean> {
      const canonical = await ctx.db
        .query("campaigns")
        .withIndex("by_campaignKey", (q) => q.eq("campaignKey", "default"))
        .unique();
      if (canonical === null) return false;
      const hasIdentity = "campaignId" in canonical;
      const canonicalCampaignId = hasIdentity ? (canonical as any).campaignId : null;
      if (canonicalCampaignId !== campaignId) return false;
      await ctx.db.delete(canonical._id);
      return true;
    },

    async hasAnyCampaignRecord(): Promise<boolean> {
      const canonical = await ctx.db
        .query("campaigns")
        .withIndex("by_campaignKey", (q) => q.eq("campaignKey", "default"))
        .unique();
      return canonical !== null;
    },

    async getCampaignRecordIdentity(): Promise<string | null> {
      const canonical = await ctx.db
        .query("campaigns")
        .withIndex("by_campaignKey", (q) => q.eq("campaignKey", "default"))
        .unique();
      if (canonical === null) return null;
      const hasIdentity = "campaignId" in canonical;
      return hasIdentity ? (canonical as any).campaignId : null;
    },

    async scheduleNextBatch(): Promise<void> {
      await ctx.scheduler.runAfter(0, internal.campaignDeletion.processCampaignDeletionBatch, {});
    },

    async hasAnyChildRecordsGlobally(): Promise<boolean> {
      for (const table of CAMPAIGN_OWNED_CHILD_COLLECTIONS) {
        const doc = await ctx.db.query(table).first();
        if (doc !== null) return true;
      }
      return false;
    },
  };
}

async function queryChildByIndex(ctx: MutationCtx, collection: CampaignOwnedChildCollection, campaignId: string): Promise<any> {
  switch (collection) {
    case "campaignEvents":
      return ctx.db.query("campaignEvents").withIndex("by_campaign_revision_index", (q: any) => q.eq("campaignId", campaignId)).first();
    case "campaignSnapshots":
      return ctx.db.query("campaignSnapshots").withIndex("by_campaign_revision", (q: any) => q.eq("campaignId", campaignId)).first();
    case "campaignRevisions":
      return ctx.db.query("campaignRevisions").withIndex("by_campaign_revision", (q: any) => q.eq("campaignId", campaignId)).first();
    case "campaignCheckpoints":
      return ctx.db.query("campaignCheckpoints").withIndex("by_campaignId", (q: any) => q.eq("campaignId", campaignId)).first();
    case "campaignHistoryControl":
      return ctx.db.query("campaignHistoryControl").withIndex("by_campaignId", (q: any) => q.eq("campaignId", campaignId)).first();
    default: {
      const _exhaustive: never = collection;
      throw new DomainError("CAMPAIGN_STATE_CORRUPT", `Unknown child collection: ${_exhaustive}`);
    }
  }
}

async function takeChildByIndex(ctx: MutationCtx, collection: CampaignOwnedChildCollection, campaignId: string, limit: number): Promise<any[]> {
  switch (collection) {
    case "campaignEvents":
      return ctx.db.query("campaignEvents").withIndex("by_campaign_revision_index", (q: any) => q.eq("campaignId", campaignId)).take(limit);
    case "campaignSnapshots":
      return ctx.db.query("campaignSnapshots").withIndex("by_campaign_revision", (q: any) => q.eq("campaignId", campaignId)).take(limit);
    case "campaignRevisions":
      return ctx.db.query("campaignRevisions").withIndex("by_campaign_revision", (q: any) => q.eq("campaignId", campaignId)).take(limit);
    case "campaignCheckpoints":
      return ctx.db.query("campaignCheckpoints").withIndex("by_campaignId", (q: any) => q.eq("campaignId", campaignId)).take(limit);
    case "campaignHistoryControl":
      return ctx.db.query("campaignHistoryControl").withIndex("by_campaignId", (q: any) => q.eq("campaignId", campaignId)).take(limit);
    default: {
      const _exhaustive: never = collection;
      throw new DomainError("CAMPAIGN_STATE_CORRUPT", `Unknown child collection: ${_exhaustive}`);
    }
  }
}

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
    const opDocId = { current: null as any };
    const adapter = buildConvexAdapter(ctx, opDocId);
    const result = await requestDeletion(adapter, args.expectedCampaignId, args.confirmation);
    return { status: result.status, campaignId: result.campaignId, phase: result.phase };
  },
});

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

export const processCampaignDeletionBatch = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx): Promise<null> => {
    const opDocId = { current: null as any };
    const adapter = buildConvexAdapter(ctx, opDocId);
    await processBatch(adapter);
    return null;
  },
});
